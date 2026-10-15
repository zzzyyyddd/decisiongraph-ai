import { getFalkorDB } from "@/lib/falkordb";

type GraphRow = Record<string, unknown>;

async function getGraph() {
  const client = await getFalkorDB();

  return client.selectGraph(
    process.env.FALKORDB_GRAPH || "decisiongraph"
  );
}

function normalizeRows(rows: unknown): GraphRow[] {
  return JSON.parse(JSON.stringify(rows ?? [])) as GraphRow[];
}

export async function listSystems() {
  const graph = await getGraph();

  const result = await graph.query(`
    MATCH (s:System)
    RETURN s.name AS system
    ORDER BY system
    LIMIT 100
  `);

  return {
    tool: "list_systems",
    systems: normalizeRows(result.data),
  };
}

export async function analyzeImpact(system: string) {
  const graph = await getGraph();

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

  const rows = normalizeRows(result.data);

  return {
    tool: "analyze_impact",
    system,
    affectedCount: new Set(
      rows.map((row) => row.affected_system)
    ).size,
    dependencyPaths: rows,
  };
}

export async function findDependencies(system: string) {
  const graph = await getGraph();

  const result = await graph.query(
    `MATCH (s:System {name: $system})-[:DEPENDS_ON]->(provider)
     RETURN provider.name AS dependency,
            labels(provider)[0] AS dependency_type
     ORDER BY dependency
     LIMIT 100`,
    { params: { system } }
  );

  return {
    tool: "find_dependencies",
    system,
    dependencies: normalizeRows(result.data),
  };
}
