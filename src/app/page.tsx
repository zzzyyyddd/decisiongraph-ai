"use client";

import { useState } from "react";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import AIImpactAnalyst from "@/components/AIImpactAnalyst";
import AskDecisionGraph from "@/components/AskDecisionGraph";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  GitBranch,
  Layers3,
  Loader2,
  Play,
  ShieldCheck,
  Workflow,
} from "lucide-react";

type AffectedSystem = {
  affected_system: string;
  dependency_depth: number;
  dependency_path: string[];
};

type ImpactResult = {
  scenario: string;
  affectedCount: number;
  affectedSystems: AffectedSystem[];
  source: string;
};

export default function Home() {
  const [system, setSystem] = useState("Stripe");
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSimulation() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/impact?system=${encodeURIComponent(system)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Simulation failed. Check database connection.");
      }

      const data: ImpactResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c17] text-slate-100">
      <header className="border-b border-white/10 bg-[#0d1322]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5">
              <BrainCircuit size={25} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                DecisionGraph AI
              </h1>
              <p className="text-xs text-slate-400">
                Connected Intelligence Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
            <Database size={14} />
            FalkorDB Powered
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs text-violet-300">
            <Activity size={14} />
            Graph-Native Decision Intelligence
          </div>

          <h2 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Understand connections.
            <br />
            <span className="text-violet-400">
              Predict the impact.
            </span>
          </h2>

          <p className="mt-5 max-w-2xl text-slate-400">
            Explore system dependencies and simulate operational
            disruptions using real knowledge graph relationships.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: GitBranch,
              title: "Knowledge Graph",
              desc: "Connected entities and dependencies",
            },
            {
              icon: Workflow,
              title: "Impact Analysis",
              desc: "Multi-hop dependency tracing",
            },
            {
              icon: ShieldCheck,
              title: "Evidence-Based",
              desc: "Traceable paths from graph data",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-[#111827] p-6"
            >
              <item.icon className="mb-4 text-violet-400" size={25} />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
          <div className="flex items-center gap-3 border-b border-white/10 p-6">
            <div className="rounded-xl bg-orange-500/10 p-3 text-orange-400">
              <AlertTriangle size={23} />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                What-If Impact Simulator
              </h3>
              <p className="text-sm text-slate-400">
                Simulate a system outage and trace downstream impact
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="system"
                  className="mb-2 block text-sm text-slate-400"
                >
                  Select system to simulate
                </label>
                <select
                  id="system"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080c17] px-4 py-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="Stripe">Stripe</option>
                  <option value="Payment Service">
                    Payment Service
                  </option>
                  <option value="Checkout Service">
                    Checkout Service
                  </option>
                </select>
              </div>

              <button
                onClick={runSimulation}
                disabled={loading}
                className="flex items-center justify-center gap-2 self-end rounded-xl bg-violet-600 px-7 py-3 font-semibold transition hover:bg-violet-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                {loading ? "Analyzing..." : "Run Simulation"}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-5">
                    <p className="text-sm text-orange-300">
                      Simulated Outage
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {system}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
                    <p className="text-sm text-red-300">
                      Affected Systems
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {result.affectedCount}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#080c17] p-5">
                  <h4 className="mb-5 flex items-center gap-2 font-semibold">
                    <Layers3 size={18} className="text-violet-400" />
                    Dependency Impact Paths
                  </h4>

                  {result.affectedSystems.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle2 size={17} className="text-emerald-400" />
                      No downstream dependencies found in the current graph.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {result.affectedSystems.map((item, index) => (
                        <div
                          key={`${item.affected_system}-${index}`}
                          className="rounded-xl border border-white/10 bg-[#111827] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-medium">
                              {item.affected_system}
                            </span>
                            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-300">
                              Depth {item.dependency_depth}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {[...item.dependency_path]
                              .reverse()
                              .map((node, nodeIndex) => (
                                <span
                                  key={`${node}-${nodeIndex}`}
                                  className="flex items-center gap-2"
                                >
                                  {nodeIndex > 0 && (
                                    <ArrowRight size={14} />
                                  )}
                                  <span className="rounded-lg border border-white/10 px-3 py-2">
                                    {node}
                                  </span>
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Database size={14} />
                  Source: {result.source}
                </p>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
                <Workflow
                  size={36}
                  className="mx-auto mb-4 text-slate-500"
                />
                <p className="font-medium text-slate-300">
                  Ready to simulate
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Select a system and run an impact analysis.
                </p>
              </div>
            )}
          </div>
        </section>

        <AIImpactAnalyst
          system={result ? system : null}
        />

        <AskDecisionGraph />

        <KnowledgeGraph
          failedSystem={result ? system : null}
          affectedSystems={result?.affectedSystems ?? []}
        />

        <footer className="flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <span>DecisionGraph AI · Graph-Native Intelligence</span>
          <span>Powered by FalkorDB</span>
        </footer>
      </main>
    </div>
  );
}
