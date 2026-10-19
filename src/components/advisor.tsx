"use client";

import clsx from "clsx";
import { ArrowUp, MessageSquareText, RotateCcw, Square, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { useWorkspace } from "@/components/workspace";
import { useStatus } from "@/lib/client";
import { offlineAnswer } from "@/lib/offline-advisor";
import { businessName, digest, sectionData } from "@/lib/project";
import { getProject, uid, updateProject } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

/** The Business Advisor conversation. Uses Claude when configured, otherwise the offline advisor. */
export function AdvisorChat({ initialPrompt, className, page }: { initialPrompt?: string; className?: string; page?: boolean }) {
  const { project } = useWorkspace();
  const status = useStatus();
  const [input, setInput] = useState(initialPrompt ?? "");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = project.advisor;
  const offline = status !== null && !status.ai;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streaming]);

  const risk = sectionData(project, "risks")?.criticalAssumptions[0]?.assumption;
  const suggestions = [
    "What should I focus on this week?",
    risk ? `How do I test this assumption: “${risk}”?` : "What's the biggest risk in my plan?",
    "Explain break-even in simple terms",
    "How can I get my first 10 customers?",
    "How are my numbers looking?",
    "What is CAC?",
  ];

  const save = (msg: Omit<ChatMessage, "id" | "createdAt">) =>
    updateProject(project.id, (p) => ({ ...p, advisor: [...p.advisor, { ...msg, id: uid(), createdAt: new Date().toISOString() }] }));

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setError("");
    setInput("");
    save({ role: "user", content });
    const current = getProject(project.id) ?? project;

    if (offline) {
      // Answer from saved plan data, revealed progressively so it reads like a reply.
      const reply = offlineAnswer(current, content);
      setStreaming("");
      for (let i = 0; i <= reply.length; i += 24) {
        setStreaming(reply.slice(0, i));
        await new Promise((r) => setTimeout(r, 12));
      }
      save({ role: "assistant", content: reply, offline: true });
      setStreaming(null);
      return;
    }

    const history = current.advisor.slice(-20).map(({ role, content }) => ({ role, content }));
    while (history[0]?.role === "assistant") history.shift();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming("");
    let reply = "";
    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: current.profile, context: digest(current), messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `Advisor unavailable (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setStreaming(reply);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (reply.trim()) save({ role: "assistant", content: reply });
      setStreaming(null);
      abortRef.current = null;
    }
  };

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div ref={scrollRef} className={clsx("flex-1 space-y-4 overflow-y-auto", page ? "px-1 py-2" : "px-5 py-5")}>
        {offline && (
          <div className="flex items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-xs leading-relaxed text-gold-600">
            <WifiOff className="mt-0.5 size-3.5 shrink-0" />
            <span><strong className="font-semibold">Offline advisor.</strong> Answers come from your saved plan, numbers and tasks, plus a built-in glossary. Add an AI key for full open-ended conversation.</span>
          </div>
        )}
        {messages.length === 0 && streaming === null && (
          <div>
            <p className="text-sm leading-relaxed text-slate-600">Ask about your business — what to do next, your numbers, risks, finding customers, or what a business term means.</p>
            <div className={clsx("mt-4 grid gap-2", page && "sm:grid-cols-2")}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:border-gold-300 hover:bg-gold-50/60">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => <Bubble key={m.id} message={m} />)}
        {streaming !== null &&
          (streaming ? (
            <Bubble message={{ id: "s", role: "assistant", content: streaming, createdAt: "" }} />
          ) : (
            <div className="flex gap-1 px-1 py-2">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${i * 120}ms` }} />)}</div>
          ))}
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className={clsx("border-t border-line", page ? "pt-4" : "p-4")}>
        {messages.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {suggestions.slice(0, 4).map((s) => (
              <button type="button" key={s} onClick={() => send(s)} disabled={streaming !== null} className="shrink-0 rounded-full border border-line bg-white px-3 py-1 text-xs text-slate-600 hover:border-gold-300 disabled:opacity-50">{s}</button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2 focus-within:border-gold-400 focus-within:ring-3 focus-within:ring-gold-400/20">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask your advisor…"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
            maxLength={4000}
            aria-label="Message"
          />
          {streaming !== null && !offline ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="flex size-9 items-center justify-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Stop"><Square className="size-3.5" /></button>
          ) : (
            <button type="submit" disabled={!input.trim() || streaming !== null} className="flex size-9 items-center justify-center rounded-lg bg-ink-900 text-white transition hover:bg-ink-800 disabled:opacity-30" aria-label="Send"><ArrowUp className="size-4" /></button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">Educational guidance — not legal, tax or financial advice.</p>
      </form>
    </div>
  );
}

/** Slide-over panel version, available from every workspace page. */
export function Advisor({ open, onClose, initialPrompt }: { open: boolean; onClose: () => void; initialPrompt?: string }) {
  const { project } = useWorkspace();
  return (
    <div className={clsx("no-print fixed inset-0 z-[60] transition-[visibility] duration-300", open ? "visible pointer-events-auto" : "invisible pointer-events-none")} aria-hidden={!open}>
      <div className={clsx("absolute inset-0 bg-ink-950/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={clsx("absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")} role="dialog" aria-label="Business Advisor">
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-ink-900 text-gold-300"><MessageSquareText className="size-4" /></div>
            <div>
              <div className="font-display text-[15px] font-semibold text-slate-900">Business Advisor</div>
              <div className="text-xs text-slate-500">Knows {businessName(project)}&apos;s plan</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {project.advisor.length > 0 && (
              <button title="Clear conversation" onClick={() => updateProject(project.id, (p) => ({ ...p, advisor: [] }))} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><RotateCcw className="size-4" /></button>
            )}
            <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close advisor"><X className="size-5" /></button>
          </div>
        </div>
        <AdvisorChat initialPrompt={initialPrompt} className="flex-1" />
      </aside>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") return <div className="ml-10 rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-sm leading-relaxed text-white">{message.content}</div>;
  return (
    <div className="fade-up mr-4 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3">
      <Markdown text={message.content} />
      {message.offline && <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">Offline advisor · from your plan data</div>}
    </div>
  );
}
