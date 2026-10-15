import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export function getVisitorId(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  // On Vercel, this header is supplied by the hosting proxy.
  // Global Gemini limiting remains the primary protection.
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return createHash("sha256")
    .update(ip)
    .digest("hex");
}
