"use client";

import { BookOpen, ExternalLink, Globe, KeyRound, Loader2, NotebookPen, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, CardHeader, ConfirmModal, ErrorNotice, Field, Input, Modal, Select, Textarea, levelTone } from "@/components/ui";
import { generateSection, postJson, useStatus } from "@/lib/client";
import { businessName } from "@/lib/project";
import type { ResearchResult } from "@/lib/schemas";
import { uid, updateProject } from "@/lib/store";
import type { ManualFinding } from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function frameworkFor(industry: string, offering: string, location: string, audience: string) {
  const what = offering || industry || "this business";
  const where = location || "your market";
  return [
    { area: "Market size & demand", question: `How many potential customers for ${what} exist in ${where}, and how much do they spend today?`, sources: "Government statistics offices and census data, industry association reports, public filings of larger players, search-volume tools", validate: "Count reachable customers in one neighbourhood or niche and multiply up; compare with search volume trends." },
    { area: "Competitors & pricing", question: `Who already sells ${what} in ${where}, and what do they charge?`, sources: "Competitor websites and pricing pages, marketplace listings, local directories, app stores", validate: "Mystery-shop 3-5 competitors and record actual prices, packages and response times." },
    { area: "Customer pain points", question: `What do ${audience || "customers"} complain about with current options?`, sources: "Public reviews of competitors, community forums and subreddits, social media comments, Q&A sites", validate: "Run 10-15 customer interviews; ask about the last time they had the problem, not hypotheticals." },
    { area: "Trends", question: `What changes are shaping ${industry || what} over the next 2-3 years?`, sources: "Trade publications, industry association outlooks, reputable news coverage, search-trend data", validate: "Look for the same trend in at least two independent sources before relying on it." },
    { area: "Regulation", question: `What licenses, permits, taxes or rules apply to ${what} in ${where}?`, sources: "Official government business portals, local licensing offices, small-business development centres", validate: "Confirm with the issuing authority or a local professional before launching." },
  ];
}

export default function ResearchPage() {
  const { project } = useWorkspace();
  const status = useStatus();
  const toast = useToast();
  const p = project.profile;
  const framework = frameworkFor(p.industry, p.offering, p.location, p.audience);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const enabled = Boolean(status?.research);

  const run = async (q: string) => {
    if (q.trim().length < 5) return;
    setLoading(true);
    setError("");
    const res = await postJson<ResearchResult>("/api/ai/research", { profile: project.profile, question: q.trim() });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    updateProject(project.id, (pr) => ({ ...pr, research: { ...pr.research, runs: [{ ...res.data, id: uid() }, ...pr.research.runs] } }));
    setQuestion("");
    toast(`Research complete: ${res.data.findings.length} sourced finding${res.data.findings.length === 1 ? "" : "s"}.`);
  };

  const hasResearch = project.research.runs.length + project.research.manual.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Market & competitor research"
        title="Research workspace"
        description={`Check whether ${businessName(project)} has a credible opportunity. Every finding shows its source, date, confidence and how to validate it further.`}
        actions={<Button variant="secondary" onClick={() => setLogOpen(true)}><NotebookPen className="size-4" />Log a finding</Button>}
      />

      {status && !enabled && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">Live web research is not configured</div>
            <p className="mt-1 leading-relaxed">Research is never simulated — without live search there is nothing real to cite. Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to enable sourced web research (it uses Claude&apos;s web search tool). Until then, use the framework below and log findings you verify yourself.</p>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Globe className="size-4 text-wave-600" />Ask a research question</div>
        <form onSubmit={(e) => { e.preventDefault(); run(question); }} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What do mobile dog groomers in Austin charge?" disabled={!enabled || loading} maxLength={500} />
          <Button type="submit" disabled={!enabled || question.trim().length < 5} loading={loading} className="sm:w-36"><Search className="size-4" />Research</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {framework.map((f) => (
            <button key={f.area} disabled={!enabled || loading} onClick={() => setQuestion(f.question)} className="rounded-full border border-line px-3 py-1 text-xs text-slate-600 transition hover:border-wave-300 hover:text-wave-700 disabled:opacity-50">{f.area}</button>
          ))}
        </div>
        {loading && <div className="mt-4 flex items-center gap-2 rounded-lg bg-wave-50 px-3 py-2.5 text-sm text-wave-800"><Loader2 className="size-4 animate-spin" />Searching the web and checking sources — this can take a minute or two.</div>}
        {error && <div className="mt-4"><ErrorNotice message={error} onRetry={() => run(question)} /></div>}
      </Card>

      {hasResearch && (project.sections.market || project.sections.competition) && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center">
          <BookOpen className="size-4 shrink-0 text-wave-600" />
          <span className="flex-1">Your findings are shared with the AI as sourced context. Regenerate the analysis sections to incorporate them.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { generateSection(project.id, "market", "Incorporate the latest research findings and label supported claims research-backed."); toast("Regenerating Market Analysis…", "info"); }}><RefreshCw className="size-3.5" />Market</Button>
            <Button size="sm" variant="secondary" onClick={() => { generateSection(project.id, "competition", "Incorporate the latest research findings, including verified competitors and pricing."); toast("Regenerating Competitive Analysis…", "info"); }}><RefreshCw className="size-3.5" />Competition</Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {project.research.runs.map((r) => (
          <Card key={r.id} className="fade-up">
            <CardHeader
              icon={<Search className="size-4" />}
              title={r.question}
              description={`Accessed ${new Date(r.accessedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · ${r.sources.length} source${r.sources.length === 1 ? "" : "s"} cited`}
              action={<button onClick={() => setDeleting(r.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete research"><Trash2 className="size-4" /></button>}
            />
            <div className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-slate-700">{r.summary}</p>
              {r.findings.length === 0 && <p className="text-sm text-slate-500">No findings could be tied to a source, so none are shown.</p>}
              {r.findings.map((f, i) => (
                <div key={i} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed text-slate-900">{f.finding}</p>
                    <Badge tone={levelTone[f.confidence === "high" ? "low" : f.confidence === "low" ? "high" : "medium"]} className="shrink-0">{f.confidence} confidence</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                    <div><div className="font-semibold text-slate-700">Why it matters</div><p className="mt-0.5 text-slate-600">{f.whyItMatters}</p></div>
                    <div><div className="font-semibold text-slate-700">Limitations</div><p className="mt-0.5 text-slate-600">{f.limitations}</p></div>
                    <div><div className="font-semibold text-slate-700">Validate further</div><p className="mt-0.5 text-slate-600">{f.howToValidate}</p></div>
                  </div>
                  <ul className="mt-3 space-y-1 border-t border-line pt-3">
                    {f.sources.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-wave-700 hover:underline">{s.title || s.url}<ExternalLink className="size-3" /></a>
                        <span className="text-slate-400">{hostname(s.url)}{s.pageAge ? ` · published ${s.pageAge}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {r.openQuestions.length > 0 && (
                <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Still unanswered</div><ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-600">{r.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul></div>
              )}
            </div>
          </Card>
        ))}

        {project.research.manual.length > 0 && (
          <Card>
            <CardHeader icon={<NotebookPen className="size-4" />} title="Findings you logged" description="Your own verified research, shared with the AI as context." />
            <ul className="divide-y divide-line">
              {project.research.manual.map((m) => (
                <li key={m.id} className="flex gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{m.finding}</div>
                    {m.whyItMatters && <p className="mt-0.5 text-sm text-slate-600">{m.whyItMatters}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={levelTone[m.confidence === "high" ? "low" : m.confidence === "low" ? "high" : "medium"]}>{m.confidence} confidence</Badge>
                      {m.sourceUrl ? <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-wave-700 hover:underline">{m.sourceTitle || m.sourceUrl}<ExternalLink className="size-3" /></a> : <span className="text-slate-500">{m.sourceTitle}</span>}
                      {m.sourceDate && <span className="text-slate-400">{m.sourceDate}</span>}
                    </div>
                  </div>
                  <button onClick={() => updateProject(project.id, (pr) => ({ ...pr, research: { ...pr.research, manual: pr.research.manual.filter((x) => x.id !== m.id) } }))} className="self-start rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete finding"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader icon={<BookOpen className="size-4" />} title="Research framework" description="What to investigate, where to look, and how to confirm it yourself." />
          <div className="divide-y divide-line">
            {framework.map((f) => (
              <div key={f.area} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]">
                <div className="text-sm font-semibold text-slate-900">{f.area}</div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-800">{f.question}</p>
                  <p className="text-xs text-slate-500"><span className="font-medium text-slate-600">Where to look: </span>{f.sources}</p>
                  <p className="text-xs text-slate-500"><span className="font-medium text-slate-600">Validate: </span>{f.validate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <LogFindingModal open={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this research?" body="The findings and their sources will be removed from this project." onConfirm={() => updateProject(project.id, (pr) => ({ ...pr, research: { ...pr.research, runs: pr.research.runs.filter((r) => r.id !== deleting) } }))} />
    </div>
  );
}

function LogFindingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project } = useWorkspace();
  const toast = useToast();
  const empty = { finding: "", sourceTitle: "", sourceUrl: "", sourceDate: "", whyItMatters: "", confidence: "medium" as ManualFinding["confidence"] };
  const [f, setF] = useState(empty);
  const urlOk = !f.sourceUrl || /^https?:\/\/\S+\.\S+/.test(f.sourceUrl);
  const valid = f.finding.trim() && (f.sourceTitle.trim() || f.sourceUrl.trim()) && urlOk;
  const save = () => {
    if (!valid) return;
    updateProject(project.id, (p) => ({ ...p, research: { ...p.research, manual: [{ ...f, id: uid(), createdAt: new Date().toISOString() }, ...p.research.manual] } }));
    setF(empty);
    onClose();
    toast("Finding logged.");
  };
  return (
    <Modal open={open} onClose={onClose} title="Log a finding" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!valid}><Plus className="size-4" />Add finding</Button></>}>
      <div className="space-y-4">
        <Field label="Finding"><Textarea rows={2} value={f.finding} onChange={(e) => setF({ ...f, finding: e.target.value })} placeholder="e.g. Three local competitors charge 70-95 per groom" maxLength={600} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source"><Input value={f.sourceTitle} onChange={(e) => setF({ ...f, sourceTitle: e.target.value })} placeholder="e.g. Competitor pricing pages" maxLength={200} /></Field>
          <Field label="Date"><Input type="date" value={f.sourceDate} onChange={(e) => setF({ ...f, sourceDate: e.target.value })} /></Field>
        </div>
        <Field label="Source URL" hint={!urlOk ? "Enter a full URL starting with https://" : "Optional, but recommended"}><Input value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} placeholder="https://" maxLength={500} /></Field>
        <Field label="Why it matters"><Input value={f.whyItMatters} onChange={(e) => setF({ ...f, whyItMatters: e.target.value })} maxLength={400} /></Field>
        <Field label="Confidence"><Select value={f.confidence} onChange={(e) => setF({ ...f, confidence: e.target.value as ManualFinding["confidence"] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
      </div>
    </Modal>
  );
}
