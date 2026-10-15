import { NextResponse } from "next/server";
import { FalkorDB } from "falkordb";


export async function GET() {
  let client: FalkorDB | undefined;

  try {
    const host = process.env.FALKORDB_HOST;
    const port = Number(process.env.FALKORDB_PORT || 6379);
    const username = process.env.FALKORDB_USERNAME;
    const password = process.env.FALKORDB_PASSWORD;
    const graphName = process.env.FALKORDB_GRAPH || "decisiongraph";

    if (!host || !password) {
      throw new Error("FalkorDB environment variables are missing");
    }

    client = await FalkorDB.connect({
      socket: {
        host,
        port,
        tls: process.env.FALKORDB_TLS === "true",
        connectTimeout: 10000,
      },
      username,
      password,
    });

    const graph = client.selectGraph(graphName);
    const result = await graph.query("RETURN 1 AS ok");

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      graph: graphName,
      queryResult: result.data,
    });
  } catch (error) {
    console.error(
      "FalkorDB health check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
