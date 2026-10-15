import { NextRequest, NextResponse } from "next/server";
import { getFalkorDB } from "@/lib/falkordb";
import {
  checkDatabaseLimit,
  checkGlobalDatabaseLimit,
} from "@/lib/rate-limit";
import { getVisitorId } from "@/lib/visitor-id";
import { unstable_rethrow } from "next/navigation";

export async function GET(request: NextRequest) {
  try {
    const system = request.nextUrl.searchParams.get("system")?.trim();

    if (!system || system.length > 100) {
      return NextResponse.json(
        { error: "Valid system name is required" },
        { status: 400 }
      );
    }

    const visitor = await checkDatabaseLimit(
      getVisitorId(request)
    );

    if (!visitor.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((visitor.reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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

    const globalLimit = await checkGlobalDatabaseLimit();

    if (!globalLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((globalLimit.reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          error: "Service is temporarily busy. Please try again later.",
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

    const client = await getFalkorDB();

    const graph = client.selectGraph(
      process.env.FALKORDB_GRAPH || "decisiongraph"
    );

    const result = await graph.query(
      `MATCH p=(affected:System)-[:DEPENDS_ON*1..8]->
       (provider:System {name: $system})
       RETURN affected.name AS affected_system,
              length(p) AS dependency_depth,
              [n IN nodes(p) | n.name] AS dependency_path
       ORDER BY dependency_depth
       LIMIT 100`,
      { params: { system } }
    );

    const affectedSystems = result.data ?? [];

    return NextResponse.json({
      scenario: `${system} outage`,
      affectedCount: affectedSystems.length,
      affectedSystems,
      source: "FalkorDB Knowledge Graph",
    });
  } catch (error) {
    unstable_rethrow(error);

    console.error(
      "Impact simulation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Impact simulation unavailable" },
      { status: 503 }
    );
  }
}
