import { NextResponse } from "next/server";
import { getFalkorDB } from "@/lib/falkordb";


let graphCache: {
  data: unknown;
  expiresAt: number;
} | null = null;

let graphQueryInFlight: Promise<unknown> | null = null;

export async function GET() {
  if (graphCache && Date.now() < graphCache.expiresAt) {
    return NextResponse.json(graphCache.data);
  }

  try {
    if (graphQueryInFlight) {
      return NextResponse.json(await graphQueryInFlight);
    }

    const loadGraph = async () => {
    const client = await getFalkorDB();

    const graph = client.selectGraph(
      process.env.FALKORDB_GRAPH || "decisiongraph"
    );

    console.time("graph-query");

    const result = await graph.query(`
      MATCH (a)-[r]->(b)
      RETURN
        id(a) AS source_id,
        labels(a)[0] AS source_type,
        a.name AS source_name,
        type(r) AS relationship,
        id(b) AS target_id,
        labels(b)[0] AS target_type,
        b.name AS target_name
      LIMIT 200
    `);

    console.timeEnd("graph-query");

    type GraphRecord = {
      source_id: number;
      source_type: string;
      source_name: string;
      relationship: string;
      target_id: number;
      target_type: string;
      target_name: string;
    };

    const records = (result.data ?? []) as GraphRecord[];

    const nodes = new Map<
      string,
      { id: string; type: string; name: string }
    >();

    const edges = records.map((record, index) => {
      const source = String(record.source_id);
      const target = String(record.target_id);

      nodes.set(source, {
        id: source,
        type: record.source_type,
        name: record.source_name,
      });

      nodes.set(target, {
        id: target,
        type: record.target_type,
        name: record.target_name,
      });

      return {
        id: `edge-${index}`,
        source,
        target,
        label: record.relationship,
      };
    });

    const responseData = {
      nodes: Array.from(nodes.values()),
      edges,
      nodeCount: nodes.size,
      edgeCount: edges.length,
      source: "FalkorDB Cloud",
    };

    graphCache = {
      data: responseData,
      expiresAt: Date.now() + 30_000,
    };

    return responseData;
    };

    const pending = loadGraph();
    graphQueryInFlight = pending;

    try {
      return NextResponse.json(await pending);
    } finally {
      if (graphQueryInFlight === pending) {
        graphQueryInFlight = null;
      }
    }
  } catch (error) {
    console.error(
      "Graph API failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Knowledge graph unavailable" },
      { status: 503 }
    );
  }
}
