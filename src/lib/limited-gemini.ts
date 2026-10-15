import { GoogleGenAI } from "@google/genai";
import { checkGeminiCapacity } from "@/lib/rate-limit";

type GenerateOptions =
  Parameters<GoogleGenAI["models"]["generateContent"]>[0];

export class GeminiRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Gemini capacity temporarily reached.");
    this.name = "GeminiRateLimitError";
  }
}

export async function generateLimitedContent(
  ai: GoogleGenAI,
  options: GenerateOptions
) {
  // Fail closed: if Redis is unavailable, do not call Gemini.
  const capacity = await checkGeminiCapacity();

  if (!capacity.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((capacity.reset - Date.now()) / 1000)
    );

    throw new GeminiRateLimitError(retryAfterSeconds);
  }

  return ai.models.generateContent(options);
}
