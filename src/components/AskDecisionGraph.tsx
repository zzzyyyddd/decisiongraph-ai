"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Loader2,
  Database,
  ChevronDown,
  Sparkles,
} from "lucide-react";

type ToolTrace = {
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
};

type Exchange = {
  question: string;
  answer: string;
  trace: ToolTrace[];
};

const examples = [
  "What happens if Stripe goes down?",
  "What are the direct dependencies of Checkout Service?",
  "List all systems in the knowledge graph.",
];

export default function AskDecisionGraph() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event?: FormEvent<HTMLFormElement>, suggested?: string) {
    event?.preventDefault();

    const text = (suggested ?? question).trim();

    if (!text || loading || text.length > 500) return;

    setLoading(true);
    setError("");
    setQuestion("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number(
            response.headers.get("Retry-After") ??
              data.retryAfterSeconds
          );

          const waitMessage =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? ` Please try again in approximately ${Math.ceil(retryAfter)} seconds.`
              : " Please try again shortly.";

          throw new Error(
            "AI is temporarily busy." + waitMessage
          );
        }

        throw new Error(
          data.error || "Unable to complete the request."
        );
      }

      setHistory((previous) => [
        ...previous,
        {
          question: text,
          answer: data.answer ?? "No answer generated.",
          trace: Array.isArray(data.trace) ? data.trace : [],
        },
      ]);
    } catch (err) {
      setQuestion(text);
      setError(
        err instanceof Error ? err.message : "Unexpected error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-white/10 p-6">
        <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold">Ask DecisionGraph AI</h3>
          <p className="text-sm text-slate-400">
            Ask questions backed by FalkorDB knowledge graph tools
          </p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {history.length === 0 && (
          <div className="rounded-xl border border-dashed border-violet-500/20 bg-violet-500/5 p-6">
            <div className="mb-3 flex items-center gap-2 text-violet-300">
              <Sparkles size={18} />
              <span className="font-semibold">
                Explore your knowledge graph
              </span>
            </div>

            <p className="mb-5 text-sm text-slate-400">
              Gemini selects read-only graph tools to retrieve
              dependency evidence before answering.
            </p>

            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={loading}
                  onClick={() => void ask(undefined, example)}
                  className="rounded-lg border border-white/10 bg-[#080c17] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-violet-500/50 hover:text-white disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((exchange, index) => (
          <div key={index} className="space-y-4">
            <div className="ml-auto max-w-3xl rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
              <p className="text-sm font-medium text-violet-100">
                {exchange.question}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#080c17] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-300">
                <Bot size={17} />
                DecisionGraph AI
              </div>

              <div className="space-y-3 break-words text-sm leading-7 text-slate-300 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:my-2 [&_strong]:text-white [&_strong]:font-semibold [&_code]:break-all [&_code]:text-violet-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {exchange.answer}
                </ReactMarkdown>
              </div>

              <details className="mt-5 rounded-xl border border-white/10 bg-[#111827]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-medium text-slate-300">
                  <span className="flex items-center gap-2">
                    <Database size={16} className="text-emerald-400" />
                    Tool Execution Trace
                    <span className="text-xs text-slate-500">
                      ({exchange.trace.length} calls)
                    </span>
                  </span>
                  <ChevronDown size={16} />
                </summary>

                <div className="space-y-3 border-t border-white/10 p-4">
                  {exchange.trace.length === 0 ? (
                    <p className="text-xs text-amber-300">
                      No graph tool calls recorded for this answer.
                    </p>
                  ) : (
                    exchange.trace.map((item, traceIndex) => (
                      <div
                        key={traceIndex}
                        className="rounded-lg border border-white/10 bg-[#080c17] p-3"
                      >
                        <p className="mb-2 text-sm font-semibold text-emerald-300">
                          {item.tool}
                        </p>

                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-slate-400">
                          {JSON.stringify(
                            {
                              arguments: item.arguments,
                              result: item.result,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-300">
            <Loader2 size={18} className="animate-spin" />
            Consulting knowledge graph tools...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={(event) => void ask(event)} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about systems, dependencies, or outage impact..."
            maxLength={500}
            disabled={loading}
            aria-label="Question for DecisionGraph AI"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080c17] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
            Ask
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Answers are AI-generated. Inspect the tool execution trace
          to verify graph evidence.
        </p>
      </div>
    </section>
  );
}
