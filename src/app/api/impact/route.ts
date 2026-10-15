import { NextRequest, NextResponse } from "next/server";
import { getFalkorDB } from "@/lib/falkordb";
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
       ORDER BY dependency_depth`,
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
