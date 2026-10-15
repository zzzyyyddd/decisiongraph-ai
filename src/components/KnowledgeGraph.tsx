"use client";

import dagre from "@dagrejs/dagre";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  type Node,
  type Edge,
  useReactFlow,
  useNodesInitialized,
  useNodes,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type GraphNode = {
  id: string;
  name: string;
  type: string;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount: number;
  edgeCount: number;
};

const colors: Record<string, string> = {
  System: "#7c3aed",
  Team: "#0891b2",
  Project: "#2563eb",
  Decision: "#d97706",
};

type ImpactProps = {
  failedSystem: string | null;
  affectedSystems: {
    affected_system: string;
    dependency_depth: number;
    dependency_path: string[];
  }[];
};


function AutoFitGraph() {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (!nodesInitialized) return;

    const frame = requestAnimationFrame(() => {
      void fitView({
        padding: 0.12,
        minZoom: 0.01,
        maxZoom: 0.9,
        duration: 500,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitView, nodesInitialized]);

  return null;
}

export default function KnowledgeGraph({
  failedSystem,
  affectedSystems,
}: ImpactProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusImpact, setFocusImpact] = useState(false);

  const highlightedNames = new Set([
    ...(failedSystem ? [failedSystem] : []),
    ...affectedSystems.flatMap((item) => item.dependency_path),
  ]);

  const highlightedNodeIds = new Set(
    nodes
      .filter((node) =>
        highlightedNames.has(String(node.data.label))
      )
      .map((node) => node.id)
  );

  const highlightedEdges = new Set<string>();

  for (const item of affectedSystems) {
    const path = item.dependency_path;

    for (let i = 0; i < path.length - 1; i++) {
      const sourceNode = nodes.find(
        (node) => node.data.label === path[i]
      );
      const targetNode = nodes.find(
        (node) => node.data.label === path[i + 1]
      );

      if (!sourceNode || !targetNode) continue;

      for (const edge of edges) {
        if (
          edge.source === sourceNode.id &&
          edge.target === targetNode.id
        ) {
          highlightedEdges.add(edge.id);
        }
      }
    }
  }

  const displayNodes = nodes.map((node) => {
    const active = highlightedNodeIds.has(node.id);
    const hasSimulation = failedSystem !== null;

    return {
      ...node,
      style: {
        ...node.style,
        opacity: hasSimulation && !active ? 0.3 : 1,
        boxShadow:
          hasSimulation && active
            ? "0 0 24px rgba(239,68,68,0.45)"
            : "none",
        border:
          hasSimulation && active
            ? "2px solid #ef4444"
            : node.style?.border,
      },
    };
  });

  const displayEdges = edges.map((edge) => {
    const active = highlightedEdges.has(edge.id);
    const hasSimulation = failedSystem !== null;

    return {
      ...edge,
      animated: hasSimulation && active,
      style: {
        ...edge.style,
        stroke: hasSimulation && active
          ? "#ef4444"
          : "#94a3b8",
        strokeWidth: hasSimulation && active ? 4 : 2,
        opacity: hasSimulation && !active ? 0.2 : 1,
      },
    };
  });
  const visibleNodes =
    focusImpact && failedSystem
      ? displayNodes.filter((node) =>
          highlightedNodeIds.has(node.id)
        )
      : displayNodes;

  const visibleNodeIds = new Set(
    visibleNodes.map((node) => node.id)
  );

  const visibleEdges =
    focusImpact && failedSystem
      ? displayEdges.filter(
          (edge) =>
            visibleNodeIds.has(edge.source) &&
            visibleNodeIds.has(edge.target) &&
            highlightedEdges.has(edge.id)
        )
      : displayEdges;

  const focusLayoutNodes =
    focusImpact && failedSystem
      ? (() => {
          const graph = new dagre.graphlib.Graph();

          graph.setDefaultEdgeLabel(() => ({}));
          graph.setGraph({
            rankdir: "RL",
            ranksep: 95,
            nodesep: 45,
            marginx: 25,
            marginy: 25,
          });

          for (const node of visibleNodes) {
            graph.setNode(node.id, {
              width: 210,
              height: 80,
            });
          }

          for (const edge of visibleEdges) {
            graph.setEdge(edge.source, edge.target);
          }

          dagre.layout(graph);

          return visibleNodes.map((node) => {
            const position = graph.node(node.id);

            return {
              ...node,
              position: {
                x: position.x - 105,
                y: position.y - 40,
              },
            };
          });
        })()
      : visibleNodes;

  const [error, setError] = useState("");

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/graph", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load knowledge graph");
      }

      const data: GraphResponse = await response.json();

      const flowNodes: Node[] = data.nodes.map((node, index) => ({
        id: node.id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
        data: {
          label: node.name,
          entityType: node.type,
        },
        style: {
          background: "#111827",
          color: "#ffffff",
          border: `2px solid ${colors[node.type] ?? "#64748b"}`,
          borderRadius: 12,
          padding: 14,
          width: 210,
          fontSize: 15,
          fontWeight: 600,
          textAlign: "center",
        },
      }));

      const flowEdges: Edge[] = data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label.replaceAll("_", " "),
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#94a3b8",
        },
        style: {
          stroke: "#94a3b8",
          strokeWidth: 2,
        },
        labelStyle: {
          fill: "#cbd5e1",
          fontSize: 10,
        },
        labelBgStyle: {
          fill: "#111827",
          fillOpacity: 0.9,
        },
      }));


      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({
        rankdir: "LR",
        ranksep: 130,
        nodesep: 90,
        marginx: 40,
        marginy: 40,
      });

      for (const node of flowNodes) {
        dagreGraph.setNode(node.id, {
          width: 210,
          height: 80,
        });
      }

      for (const edge of flowEdges) {
        dagreGraph.setEdge(edge.source, edge.target);
      }

      dagre.layout(dagreGraph);

      const layoutedNodes = flowNodes.map((node) => {
        const position = dagreGraph.node(node.id);

        return {
          ...node,
          position: {
            x: position.x - 105,
            y: position.y - 40,
          },
        };
      });

      setNodes(layoutedNodes);

      setEdges(flowEdges);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 p-6">
        <div>
          <h3 className="text-xl font-bold">Knowledge Graph Explorer</h3>
          <p className="mt-1 text-sm text-slate-400">
            Live entities and relationships from FalkorDB Cloud
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusImpact(false)}
            className={`rounded-lg px-4 py-2 text-sm ${
              !focusImpact
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-slate-300"
            }`}
          >
            Show All
          </button>

          <button
            onClick={() => setFocusImpact(true)}
            disabled={!failedSystem}
            className={`rounded-lg px-4 py-2 text-sm ${
              focusImpact
                ? "bg-red-600 text-white"
                : "border border-white/10 text-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Focus Impact
          </button>

        <button
          onClick={() => void loadGraph()}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
          Refresh
        </button>
        </div>
      </div>

      <div className="relative h-[550px] bg-[#080c17]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080c17]/80 text-slate-400">
            Loading graph...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-red-400">
            {error}
          </div>
        )}

        <ReactFlowProvider>
        <ReactFlow
          key={focusImpact && failedSystem ? "impact" : "all"}
          nodes={focusLayoutNodes}
          edges={visibleEdges}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.01, maxZoom: 0.9 }}
          minZoom={0.01}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          colorMode="dark"
        >
          <AutoFitGraph />
          <Background color="#334155" gap={24} />
          <Controls />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            style={{
              width: 140,
              height: 90,
              backgroundColor: "#0f172a",
              opacity: 0.65,
            }}
            nodeColor={(node) =>
              colors[
                dataNodeType(node.id, nodes)
              ] ?? "#7c3aed"
            }
            maskColor="rgba(8,12,23,0.7)"
          />
        </ReactFlow>
        </ReactFlowProvider>
      </div>
    </section>
  );
}

function dataNodeType(id: string, nodes: Node[]) {
  const node = nodes.find((n) => n.id === id);
  return String(node?.data?.entityType ?? "System");
}
