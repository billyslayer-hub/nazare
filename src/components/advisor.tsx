"use client";

import clsx from "clsx";
import { ArrowUp, KeyRound, MessageSquareText, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { useWorkspace } from "@/components/workspace";
import { useStatus } from "@/lib/client";
import { businessName, digest, sectionData } from "@/lib/project";
import { getProject, uid, updateProject } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

export function Advisor({ open, onClose, initialPrompt }: { open: boolean; onClose: () => void; initialPrompt?: string }) {
  const { project } = useWorkspace();
  const status = useStatus();
  const [input, setInput] = useState(initialPrompt ?? "");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = project.advisor;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streaming, open]);

  const risk = sectionData(project, "risks")?.criticalAssumptions[0]?.assumption;
  const suggestions = [
    "What should I focus on this week?",
    risk ? `How do I test this assumption: “${risk}”?` : "What's the biggest risk in my plan?",
    "Explain my break-even point in simple terms.",
    "How can I get my first 10 customers on my budget?",
  ];

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setError("");
    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: new Date().toISOString() };
    updateProject(project.id, (p) => ({ ...p, advisor: [...p.advisor, userMsg] }));
    const current = getProject(project.id) ?? project;
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
      if (reply.trim()) {
        const msg: ChatMessage = { id: uid(), role: "assistant", content: reply, createdAt: new Date().toISOString() };
        updateProject(project.id, (p) => ({ ...p, advisor: [...p.advisor, msg] }));
      }
      setStreaming(null);
      abortRef.current = null;
    }
  };

  const disabled = status !== null && !status.ai;

  return (
    <div className={clsx("no-print fixed inset-0 z-[60] transition-[visibility] duration-300", open ? "visible pointer-events-auto" : "invisible pointer-events-none")} aria-hidden={!open}>
      <div className={clsx("absolute inset-0 bg-ink-950/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={clsx("absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")} role="dialog" aria-label="Business Advisor">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-ink-900 text-wave-300"><MessageSquareText className="size-4" /></div>
            <div>
              <div className="font-display text-[15px] font-semibold text-slate-900">Business Advisor</div>
              <div className="text-xs text-slate-500">Knows {businessName(project)}&apos;s profile and plan</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button title="Clear conversation" onClick={() => updateProject(project.id, (p) => ({ ...p, advisor: [] }))} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><RotateCcw className="size-4" /></button>
            )}
            <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close advisor"><X className="size-5" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {disabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold"><KeyRound className="size-4" />The advisor needs an AI key</div>
              <p className="mt-1.5 leading-relaxed">The Business Advisor gives answers grounded in your saved plan, so it is not simulated. Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the server to enable it.</p>
            </div>
          ) : messages.length === 0 && streaming === null ? (
            <div>
              <p className="text-sm leading-relaxed text-slate-600">Ask anything about your business — priorities, pricing, a confusing term, or how to improve a section. Answers use your profile, plan, numbers and tasks.</p>
              <div className="mt-4 space-y-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border border-line px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:border-wave-300 hover:bg-wave-50/50">{s}</button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
          {streaming !== null && (streaming ? <Bubble role="assistant" content={streaming} /> : <div className="flex gap-1 px-1 py-2">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: `${i * 120}ms` }} />)}</div>)}
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-4">
          <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2 focus-within:border-wave-500 focus-within:ring-3 focus-within:ring-wave-500/15">
            <textarea
              rows={1}
              value={input}
              disabled={disabled}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={disabled ? "Advisor unavailable in demo mode" : "Ask your advisor…"}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
              maxLength={4000}
            />
            {streaming !== null ? (
              <button type="button" onClick={() => abortRef.current?.abort()} className="flex size-9 items-center justify-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Stop"><Square className="size-3.5" /></button>
            ) : (
              <button type="submit" disabled={!input.trim() || disabled} className="flex size-9 items-center justify-center rounded-lg bg-ink-900 text-white transition hover:bg-ink-800 disabled:opacity-30" aria-label="Send"><ArrowUp className="size-4" /></button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">Educational guidance — not legal, tax or financial advice.</p>
        </form>
      </aside>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") return <div className="ml-10 rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-sm leading-relaxed text-white">{content}</div>;
  return <div className="fade-up mr-4"><Markdown text={content} /></div>;
}
