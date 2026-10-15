import { NextResponse } from "next/server";
import { getFalkorDB } from "@/lib/falkordb";

let healthCache: {
  healthy: boolean;
  expiresAt: number;
} | null = null;

export async function GET() {
  if (healthCache && Date.now() < healthCache.expiresAt) {
    return NextResponse.json(
      {
        status: healthCache.healthy ? "healthy" : "unhealthy",
        database: healthCache.healthy ? "connected" : "unavailable",
      },
      { status: healthCache.healthy ? 200 : 503 }
    );
  }

  try {
    const client = await getFalkorDB();

    const graph = client.selectGraph(
      process.env.FALKORDB_GRAPH || "decisiongraph"
    );

    await graph.query("RETURN 1 AS ok");

    healthCache = {
      healthy: true,
      expiresAt: Date.now() + 30_000,
    };

    return NextResponse.json({
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    healthCache = {
      healthy: false,
      expiresAt: Date.now() + 5_000,
    };

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unavailable",
      },
      { status: 503 }
    );
  }
}
