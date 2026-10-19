"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Circle, Compass, FlaskConical, Megaphone, MessageSquareText, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, ButtonLink, Card, CardHeader, ProgressBar, ScoreRing } from "@/components/ui";
import { generateBlueprint, useGenerating, useStatus } from "@/lib/client";
import { money } from "@/lib/finance";
import { addDays, businessName, completion, formatDate, projectionFor, recommendations, sectionData, taskIsLocked, today } from "@/lib/project";
import { SECTIONS } from "@/lib/schemas";
import { updateProject } from "@/lib/store";

const toneDot = { rose: "bg-rose-500", amber: "bg-amber-500", wave: "bg-wave-500", sky: "bg-sky-500" };
const rank = { low: 1, medium: 2, high: 3 };

export default function Dashboard() {
  const { project, base, openAdvisor } = useWorkspace();
  const status = useStatus();
  const generating = useGenerating(project.id);
  const name = businessName(project);
  const comp = completion(project);
  const proj = projectionFor(project);
  const risks = sectionData(project, "risks");
  const execution = sectionData(project, "execution");
  const company = sectionData(project, "company");
  const cur = project.profile.currency;
  const recs = recommendations(project, base, Boolean(status?.research)).slice(0, 5);
  const hasAny = Object.keys(project.sections).length > 0;
  const t = today();

  const priorityTasks = project.tasks
    .filter((x) => x.status !== "done")
    .sort((a, b) => Number(b.dueDate < t) - Number(a.dueDate < t) || rank[b.priority] - rank[a.priority] || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const milestones = (execution?.milestones ?? [])
    .map((m) => ({ ...m, date: addDays(project.createdAt.slice(0, 10), m.week * 7) }))
    .filter((m) => m.date >= t)
    .slice(0, 4);
  const topRisks = [...(risks?.risks ?? [])].sort((a, b) => rank[b.likelihood] * rank[b.impact] - rank[a.likelihood] * rank[a.impact]).slice(0, 3);

  const toggleTask = (id: string) =>
    updateProject(project.id, (p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === id ? { ...x, status: x.status === "done" ? "todo" : "done" } : x)) }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={name}
        description={company?.overview ?? project.profile.idea}
        actions={
          <>
            <Button variant="secondary" onClick={() => openAdvisor()}><MessageSquareText className="size-4" />Ask your Business Advisor</Button>
            <ButtonLink href={`${base}/plan`} variant="secondary">Export plan</ButtonLink>
          </>
        }
      />

      {!hasAny && (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-xl bg-wave-50 text-wave-700"><Sparkles className="size-6" /></div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-slate-900">{generating.length ? "Writing your business plan…" : "Create your business plan"}</h2>
              <p className="mt-1 text-sm text-slate-500">{generating.length ? "Your company description comes first, then market, competition, marketing, finance and execution in parallel, then risk and the executive summary. This usually takes a few minutes." : "Eight sections built from your profile. Every section can be edited, regenerated or restored later."}</p>
            </div>
            <Button size="lg" loading={generating.length > 0} onClick={() => generateBlueprint(project.id)}>{generating.length ? "Writing your plan" : "Create my business plan"}</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan completion</div>
          <div className="mt-3 flex items-center gap-5">
            <ScoreRing value={comp.overall} progress />
            <div className="flex-1 space-y-2.5">
              {comp.parts.map((p) => (
                <div key={p.label}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{p.label}</span><span className="tabular-nums text-slate-400">{p.total ? `${p.done}/${p.total}` : "—"}</span></div>
                  <ProgressBar value={p.total ? (p.done / p.total) * 100 : 0} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Financial snapshot</div>
            {proj && <Link href={`${base}/financials`} className="text-xs font-medium text-wave-700 hover:underline">Open model</Link>}
          </div>
          {proj ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Metric label="Year 1 revenue" value={money(proj.years[0].revenue, cur)} />
              <Metric label="Break-even" value={proj.breakEvenMonth ? `Month ${proj.breakEvenMonth}` : "Not in 36 mo"} warn={!proj.breakEvenMonth} />
              <Metric label="Startup costs" value={money(proj.startupCosts, cur)} />
              <Metric label="Funding gap" value={proj.fundingGap > 0 ? money(proj.fundingGap, cur) : "None"} warn={proj.fundingGap > 0} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Appears once the Financial Plan section is generated. All figures are computed from editable assumptions.</p>
          )}
          {proj && <p className="mt-3 text-[11px] text-slate-400">Projection from {project.finance?.edited ? "your edited" : project.finance?.basis === "demo" ? "example" : "AI-proposed"} numbers — not a guarantee.</p>}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Launch readiness</div>
          {risks ? (
            <div className="mt-3 flex items-start gap-4">
              <ScoreRing value={risks.readiness.score} size={76} />
              <p className="text-sm leading-relaxed text-slate-600">{risks.readiness.rationale}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">A candid readiness score appears after the Risk &amp; Validation section is generated.</p>
          )}
          <div className="mt-3"><Badge>{project.profile.stage} stage</Badge></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={<Target className="size-4" />} title="Recommended next actions" description="Based on your plan, tasks and numbers." />
          <ul className="divide-y divide-line">
            {recs.length === 0 && <li className="px-5 py-6 text-sm text-slate-500">You&apos;re on track. Ask the advisor what to do next.</li>}
            {recs.map((r) => (
              <li key={r.title}>
                <Link href={r.href} className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                  <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", toneDot[r.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{r.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{r.detail}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <button onClick={() => openAdvisor("Based on my plan, what are the three most important things I should do in the next two weeks, and why?")} className="inline-flex items-center gap-1.5 text-sm font-medium text-wave-700 hover:underline"><MessageSquareText className="size-4" />Get a personalized plan from your advisor</button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={<CheckCircle2 className="size-4" />} title="Priority tasks" action={<Link href={`${base}/roadmap`} className="text-xs font-medium text-wave-700 hover:underline">All tasks</Link>} />
          {priorityTasks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{project.tasks.length ? "All tasks complete. 🎉" : "Tasks are created from your Execution Plan."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {priorityTasks.map((task) => {
                const overdue = task.dueDate < t;
                const locked = taskIsLocked(task, project.tasks);
                return (
                  <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                    <button onClick={() => toggleTask(task.id)} aria-label="Mark complete" className="mt-0.5 text-slate-300 hover:text-wave-600"><Circle className="size-4.5" /></button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">{task.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={overdue ? "font-medium text-rose-600" : "text-slate-500"}>{overdue ? "Overdue · " : ""}{formatDate(task.dueDate)}</span>
                        {task.priority === "high" && <Badge tone="rose">High</Badge>}
                        {task.status === "blocked" && <Badge tone="rose">Blocked</Badge>}
                        {locked && <Badge>Waiting on dependency</Badge>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<AlertTriangle className="size-4" />} title="Key risks" action={risks && <Link href={`${base}/blueprint#risks`} className="text-xs font-medium text-wave-700 hover:underline">View all</Link>} />
          <div className="space-y-3 p-5">
            {topRisks.length === 0 && <p className="text-sm text-slate-500">Generated with the Risk &amp; Validation section.</p>}
            {topRisks.map((r) => (
              <div key={r.risk}>
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-slate-800">{r.risk}</span><Badge tone={r.impact === "high" ? "rose" : "amber"} className="shrink-0">{r.category}</Badge></div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{r.mitigation}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader icon={<FlaskConical className="size-4" />} title="Assumptions to validate" />
          <div className="space-y-3 p-5">
            {!risks && <p className="text-sm text-slate-500">Your riskiest assumptions and cheap experiments to test them appear here.</p>}
            {risks?.criticalAssumptions.slice(0, 3).map((a) => (
              <div key={a.assumption}>
                <div className="text-sm font-medium text-slate-800">{a.assumption}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Test: {a.experiment} · Pass if {a.successMetric}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader icon={<CalendarClock className="size-4" />} title="Upcoming milestones" />
          <div className="space-y-3 p-5">
            {milestones.length === 0 && <p className="text-sm text-slate-500">{execution ? "No upcoming milestones." : "Milestones come from your Execution Plan."}</p>}
            {milestones.map((m) => (
              <div key={m.title} className="flex gap-3">
                <div className="w-12 shrink-0 rounded-md bg-slate-100 py-1 text-center text-xs font-medium tabular-nums text-slate-600">{formatDate(m.date)}</div>
                <div><div className="text-sm font-medium text-slate-800">{m.title}</div><div className="text-xs text-slate-500">{m.successCriteria}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={<Compass className="size-4" />} title="Business plan sections" action={<Link href={`${base}/blueprint`} className="text-xs font-medium text-wave-700 hover:underline">Open plan</Link>} />
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {SECTIONS.map((s) => {
              const done = Boolean(project.sections[s.key]);
              const busy = generating.includes(s.key);
              return (
                <Link key={s.key} href={`${base}/blueprint#${s.key}`} className="bg-white p-4 transition hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-semibold text-slate-400">{s.letter}</span>
                    {busy ? <span className="size-2 animate-pulse rounded-full bg-wave-500" /> : done ? <CheckCircle2 className="size-4 text-wave-600" /> : <Circle className="size-4 text-slate-200" />}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">{s.title}</div>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader icon={<Megaphone className="size-4" />} title="Marketing activity" action={<Link href={`${base}/marketing`} className="text-xs font-medium text-wave-700 hover:underline">Studio</Link>} />
          <div className="p-5">
            {project.assets.length === 0 ? (
              <p className="text-sm text-slate-500">No saved assets yet. Generated content is saved here — nothing is ever published automatically.</p>
            ) : (
              <>
                <div className="font-display text-2xl font-semibold text-slate-900">{project.assets.length}<span className="ml-1.5 text-sm font-normal text-slate-500">saved assets</span></div>
                <ul className="mt-3 space-y-1.5">
                  {project.assets.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate text-slate-700">{a.data.title}</span><Badge className="shrink-0">{a.request.platform}</Badge></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={clsx("mt-0.5 font-display text-lg font-semibold tabular-nums", warn ? "text-amber-600" : "text-slate-900")}>{value}</dd>
    </div>
  );
}
