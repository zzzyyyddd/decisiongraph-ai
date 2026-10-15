import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
} from "@google/genai";
import {
  listSystems,
  analyzeImpact,
  findDependencies,
} from "@/lib/graph-tools";
import {
  generateLimitedContent,
  GeminiRateLimitError,
} from "@/lib/limited-gemini";
import { checkVisitorLimit } from "@/lib/rate-limit";
import { getVisitorId } from "@/lib/visitor-id";

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "list_systems",
    description: "List available systems in the knowledge graph.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "analyze_impact",
    description:
      "Find systems affected when a specified system fails, including dependency paths.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          description: "Exact system name, such as Stripe.",
        },
      },
      required: ["system"],
    },
  },
  {
    name: "find_dependencies",
    description:
      "Find direct upstream dependencies of a specified system.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        system: {
          type: Type.STRING,
          description: "Exact system name.",
        },
      },
      required: ["system"],
    },
  },
];

type ToolTrace = {
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
};


async function generateWithRetry(
  ai: GoogleGenAI,
  options: Parameters<GoogleGenAI["models"]["generateContent"]>[0]
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generateLimitedContent(ai, options);
    } catch (error) {
      if (error instanceof GeminiRateLimitError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : String(error);

      const retryable =
        /"code":\s*(429|503)/.test(message) ||
        /"status":\s*"(UNAVAILABLE|RESOURCE_EXHAUSTED)"/.test(message);

      if (!retryable || attempt === 2) {
        throw error;
      }

      const delay = 1500 * (attempt + 1);

      console.warn(
        `Gemini temporarily unavailable. Retry ${attempt + 1}/2`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini retry limit reached.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body?.question;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 500
    ) {
      return NextResponse.json(
        { error: "Question must contain 1–500 characters." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 503 }
      );
    }

    const visitor = await checkVisitorLimit(
      getVisitorId(request)
    );

    if (!visitor.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((visitor.reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          error: "Question limit reached. Please try again later.",
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const contents: {
      role: string;
      parts: Array<Record<string, unknown>>;
    }[] = [
      {
        role: "user",
        parts: [{ text: question.trim() }],
      },
    ];

    const trace: ToolTrace[] = [];

    for (let round = 0; round < 3; round++) {
      const response = await generateWithRetry(ai, {
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction: `
You are DecisionGraph AI, an enterprise knowledge graph agent.

Use the available tools to answer questions about systems,
dependencies, and outage impact.

Rules:
- Always consult graph tools for factual system questions.
- Never invent systems or dependency relationships.
- Distinguish verified graph facts from recommendations.
- Explain dependency chains clearly.
- If the graph does not provide enough evidence, say so.
- Respond in professional English.
`,
          tools: [{ functionDeclarations: toolDeclarations }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
      });

      const calls = response.functionCalls ?? [];

      if (calls.length === 0) {
        return NextResponse.json({
          question,
          answer: response.text ?? "No answer generated.",
          trace,
          source: "Gemini + FalkorDB",
        });
      }

      const modelParts = response.candidates?.[0]?.content?.parts;

      if (!modelParts?.length) {
        throw new Error("Model returned no content parts.");
      }

      contents.push({
        role: "model",
        parts: modelParts as Array<Record<string, unknown>>,
      });

      const toolResults: Array<Record<string, unknown>> = [];

      for (const call of calls) {
        const name = call.name ?? "";
        const args = (call.args ?? {}) as Record<string, unknown>;
        const system = args.system;

        let result: unknown;

        if (name === "list_systems") {
          result = await listSystems();
        } else if (
          (name === "analyze_impact" ||
            name === "find_dependencies") &&
          typeof system === "string" &&
          system.trim().length > 0 &&
          system.length <= 100
        ) {
          result =
            name === "analyze_impact"
              ? await analyzeImpact(system.trim())
              : await findDependencies(system.trim());
        } else {
          result = { error: "Invalid tool call or arguments." };
        }

        trace.push({
          tool: name,
          arguments: args,
          result,
        });

        toolResults.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }

      contents.push({
        role: "user",
        parts: toolResults,
      });
    }

    return NextResponse.json({
      question,
      answer:
        "Tool execution limit reached. Review the evidence trace.",
      trace,
      source: "Gemini + FalkorDB",
    });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        {
          error: "AI capacity temporarily reached. Please try again shortly.",
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        }
      );
    }

    console.error(
      "Ask Agent failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Graph agent temporarily unavailable." },
      { status: 503 }
    );
  }
}
