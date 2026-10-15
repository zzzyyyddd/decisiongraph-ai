import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getFalkorDB } from "@/lib/falkordb";
import {
  generateLimitedContent,
  GeminiRateLimitError,
} from "@/lib/limited-gemini";
import { checkVisitorLimit } from "@/lib/rate-limit";
import { getVisitorId } from "@/lib/visitor-id";


type ImpactRecord = {
  affected_system: string;
  dependency_depth: number;
  dependency_path: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const system = body?.system;

    if (
      typeof system !== "string" ||
      !system.trim() ||
      system.length > 100
    ) {
      return NextResponse.json(
        { error: "Valid system name is required" },
        { status: 400 }
      );
    }

    const systemName = system.trim();

    const client = await getFalkorDB();
    const graph = client.selectGraph(
      process.env.FALKORDB_GRAPH || "decisiongraph"
    );

    const existence = await graph.query(
      "MATCH (s:System {name: $system}) RETURN s.name AS name LIMIT 1",
      { params: { system: systemName } }
    );

    if (!existence.data?.length) {
      return NextResponse.json(
        { error: "System not found in knowledge graph" },
        { status: 404 }
      );
    }

    const result = await graph.query(
      `MATCH p=(affected:System)-[:DEPENDS_ON*1..8]->
       (provider:System {name: $system})
       RETURN affected.name AS affected_system,
              length(p) AS dependency_depth,
              [n IN nodes(p) | n.name] AS dependency_path
       ORDER BY dependency_depth`,
      { params: { system: systemName } }
    );

    const affectedSystems = (result.data ?? []) as ImpactRecord[];

    const evidence = {
      failedSystem: systemName,
      affectedCount: new Set(
        affectedSystems.map((item) => item.affected_system)
      ).size,
      dependencyPaths: affectedSystems,
    };

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured", evidence },
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

    const response = await generateLimitedContent(ai, {
      model: "gemini-3.8-flash",
      contents: `
You are DecisionGraph AI, an enterprise dependency impact analyst.

Analyze the following verified knowledge graph evidence:
${JSON.stringify(evidence, null, 2)}

Instructions:
- Write in clear professional English.
- Explain the impact of the failed system.
- Identify affected systems and dependency chains.
- Provide prioritized mitigation recommendations.
- Use only the supplied graph facts.
- Do not invent business metrics, incidents, or dependencies.
- Clearly label recommendations as suggestions, not verified facts.
- Keep the answer concise and structured.
`,
    });

    return NextResponse.json({
      system: systemName,
      analysis: response.text ?? "No analysis generated.",
      evidence,
      source: "FalkorDB + Gemini",
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
      "AI Agent failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "AI Agent temporarily unavailable" },
      { status: 503 }
    );
  }
}
