"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BrainCircuit,
  Database,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Evidence = {
  failedSystem: string;
  affectedCount: number;
  dependencyPaths: {
    affected_system: string;
    dependency_depth: number;
    dependency_path: string[];
  }[];
};

type AgentResponse = {
  system: string;
  analysis: string;
  evidence: Evidence;
  source: string;
};

export default function AIImpactAnalyst({
  system,
}: {
  system: string | null;
}) {
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(null);
    setError("");
  }, [system]);

  async function generateAnalysis() {
    if (!system || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ system }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI analysis is temporarily unavailable."
        );
      }

      setResult(data as AgentResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-white/10 p-6">
        <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold">AI Impact Analyst</h3>
          <p className="text-sm text-slate-400">
            Evidence-grounded intelligence powered by Gemini and FalkorDB
          </p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#080c17] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Current scenario
            </p>
            <p className="mt-1 font-semibold text-slate-200">
              {system ? `${system} Outage` : "No simulation selected"}
            </p>
          </div>

          <button
            type="button"
            onClick={generateAnalysis}
            disabled={!system || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading ? "Generating..." : "Generate AI Analysis"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300">
              <CheckCircle2 size={16} />
              <span>
                Grounded in {result.evidence.affectedCount} affected systems
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#080c17] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-300">
                <Sparkles size={17} />
                AI Analysis & Recommendations
              </div>

              <div className="min-w-0 break-words text-sm leading-7 text-slate-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-4 mt-6 text-2xl font-bold text-white">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-3 mt-6 text-xl font-bold text-violet-300">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-3 mt-6 text-lg font-semibold text-violet-300">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="mb-2 mt-4 font-semibold text-white">
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 list-disc space-y-2 pl-6">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 list-decimal space-y-2 pl-6">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="pl-1">{children}</li>
                    ),
                    hr: () => (
                      <hr className="my-6 border-white/10" />
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-violet-200">
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-white/10 bg-white/5 p-3 font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-white/10 p-3">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {result.analysis}
                </ReactMarkdown>
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Database size={14} />
              Source: {result.source} · Recommendations are AI-generated suggestions
            </p>
          </div>
        )}

        {!result && !loading && !error && (
          <p className="text-center text-sm text-slate-500">
            Run a simulation, then generate an evidence-based AI analysis.
          </p>
        )}
      </div>
    </section>
  );
}
