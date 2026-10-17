import { DEFAULT_SCENARIOS, money, project as runProjection, type Projection } from "./finance";
import { SECTIONS, type FinancialAssumptions, type SectionData, type SectionKey } from "./schemas";
import { uid } from "./store";
import type { Mode, Project, SectionVersion, Task } from "./types";

/* Pure domain logic over a Project. No storage or network access here. */

const MAX_VERSIONS = 15;

export function currentVersion<K extends SectionKey>(p: Project, key: K): SectionVersion<K> | undefined {
  const s = p.sections[key];
  return s?.versions.find((v) => v.id === s.currentId) as SectionVersion<K> | undefined;
}

export function sectionData<K extends SectionKey>(p: Project, key: K): SectionData[K] | undefined {
  return currentVersion(p, key)?.data;
}

export function businessName(p: Project): string {
  return p.profile.name || sectionData(p, "company")?.suggestedNames[0] || "Untitled business";
}

export function isDemo(p: Project): boolean {
  return Object.values(p.sections).some((s) => s?.versions.find((v) => v.id === s.currentId)?.source === "demo");
}

/** Adds a new version of a section and applies side effects (tasks, finance). */
export function withSectionVersion<K extends SectionKey>(
  p: Project,
  key: K,
  data: SectionData[K],
  source: SectionVersion["source"],
  note?: string,
): Project {
  const version: SectionVersion<K> = { id: uid(), data, createdAt: new Date().toISOString(), source, note };
  const prev = p.sections[key]?.versions ?? [];
  let next: Project = {
    ...p,
    sections: { ...p.sections, [key]: { versions: [version, ...prev].slice(0, MAX_VERSIONS), currentId: version.id } },
  };
  if (key === "execution") next = syncTasks(next, data as SectionData["execution"]);
  if (key === "financials") next = syncFinance(next, (data as SectionData["financials"]).assumptions, source === "demo" ? "demo" : "ai");
  return next;
}

export function withRestoredVersion(p: Project, key: SectionKey, versionId: string): Project {
  const v = p.sections[key]?.versions.find((x) => x.id === versionId);
  if (!v) return p;
  return withSectionVersion(p, key, v.data as never, "restore", `Restored version from ${new Date(v.createdAt).toLocaleString()}`);
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Replaces untouched AI tasks with the new plan's tasks while keeping
 * everything the founder created or has started working on.
 */
function syncTasks(p: Project, execution: SectionData["execution"]): Project {
  const kept = p.tasks.filter((t) => t.origin === "user" || t.status !== "todo");
  const keptTitles = new Set(kept.map((t) => t.title.toLowerCase()));
  const start = today();
  const fresh: Task[] = execution.tasks
    .filter((t) => !keptTitles.has(t.title.toLowerCase()))
    .map((t) => ({
      id: uid(),
      title: t.title,
      description: t.description,
      stage: t.stage,
      priority: t.priority,
      status: "todo",
      dueDate: addDays(start, Math.max(0, Math.round(t.week) * 7 - 1)),
      dependsOn: [],
      blocker: "",
      origin: "ai",
      createdAt: new Date().toISOString(),
    }));
  const all = [...kept, ...fresh];
  const byTitle = new Map(all.map((t) => [t.title.toLowerCase(), t.id]));
  for (const t of fresh) {
    const source = execution.tasks.find((x) => x.title === t.title);
    t.dependsOn = (source?.dependsOn ?? []).map((d) => byTitle.get(d.toLowerCase())).filter((id): id is string => Boolean(id) && id !== t.id);
  }
  return { ...p, tasks: all };
}

export function taskIsLocked(task: Task, tasks: Task[]): boolean {
  return task.dependsOn.some((id) => tasks.find((t) => t.id === id && t.status !== "done"));
}

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

function syncFinance(p: Project, assumptions: FinancialAssumptions, basis: Mode): Project {
  if (p.finance?.edited) return { ...p, finance: { ...p.finance, proposed: assumptions, proposalPending: true } };
  return {
    ...p,
    finance: {
      assumptions,
      proposed: assumptions,
      basis,
      edited: false,
      scenarios: p.finance?.scenarios ?? DEFAULT_SCENARIOS,
      bufferMonths: p.finance?.bufferMonths ?? 3,
    },
  };
}

export function projectionFor(p: Project): Projection | undefined {
  return p.finance ? runProjection(p.finance.assumptions) : undefined;
}

/* ------------------------------------------------------------------ */
/* Progress & recommendations                                          */
/* ------------------------------------------------------------------ */

export function completion(p: Project) {
  const sections = SECTIONS.filter((s) => p.sections[s.key]).length;
  const tasksDone = p.tasks.filter((t) => t.status === "done").length;
  const checklistItems = sectionData(p, "execution")?.launchChecklist ?? [];
  const checked = checklistItems.filter((i) => p.checklist[i]).length;
  const parts = [
    { label: "Blueprint", done: sections, total: SECTIONS.length },
    { label: "Tasks", done: tasksDone, total: p.tasks.length },
    { label: "Launch checklist", done: checked, total: checklistItems.length },
  ];
  const weights = [0.4, 0.45, 0.15];
  const overall = parts.reduce((s, part, i) => s + (part.total ? (part.done / part.total) * weights[i] : 0), 0) * 100;
  return { overall: Math.round(overall), parts };
}

export type Recommendation = { title: string; detail: string; href: string; tone: "rose" | "amber" | "wave" | "sky" };

export function recommendations(p: Project, base: string, researchAvailable: boolean): Recommendation[] {
  const out: Recommendation[] = [];
  const missing = SECTIONS.filter((s) => !p.sections[s.key]);
  if (missing.length === SECTIONS.length) {
    out.push({ title: "Generate your business blueprint", detail: "Turn your profile into an eight-section plan.", href: `${base}/blueprint`, tone: "wave" });
    return out;
  }
  const t = today();
  const overdue = p.tasks.filter((x) => x.status !== "done" && x.dueDate < t);
  if (overdue.length)
    out.push({ title: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`, detail: `Start with “${overdue[0].title}” or move its deadline.`, href: `${base}/roadmap`, tone: "rose" });
  const blocked = p.tasks.filter((x) => x.status === "blocked");
  if (blocked.length) out.push({ title: `Unblock “${blocked[0].title}”`, detail: blocked[0].blocker || "Note what's in the way and who can help.", href: `${base}/roadmap`, tone: "rose" });

  const proj = projectionFor(p);
  if (proj && p.finance) {
    const cur = p.profile.currency;
    if (proj.fundingGap > 0)
      out.push({ title: `Cash runs short by ${money(proj.fundingGap, cur)}`, detail: `${proj.lowestCashMonth ? `Balance bottoms out in month ${proj.lowestCashMonth}` : "Startup costs exceed starting cash"}. Review costs, pricing or funding.`, href: `${base}/financials`, tone: "amber" });
    if (proj.breakEvenMonth === null)
      out.push({ title: "No break-even within 36 months", detail: "Adjust price, volume or fixed costs in the financial model.", href: `${base}/financials`, tone: "amber" });
  }
  const assumption = sectionData(p, "risks")?.criticalAssumptions[0];
  if (assumption) out.push({ title: "Test your riskiest assumption", detail: `${assumption.assumption} — ${assumption.experiment}`, href: `${base}/blueprint#risks`, tone: "sky" });
  if (missing.length) out.push({ title: `Complete ${missing.length} remaining section${missing.length > 1 ? "s" : ""}`, detail: missing.map((s) => s.title).join(", "), href: `${base}/blueprint`, tone: "wave" });
  if (researchAvailable && p.research.runs.length === 0)
    out.push({ title: "Verify the market with live research", detail: "Find sourced data on competitors, pricing and demand.", href: `${base}/research`, tone: "sky" });
  if (p.assets.length === 0) out.push({ title: "Create your first launch content", detail: "Generate posts, ads or emails in the Marketing Studio.", href: `${base}/marketing`, tone: "wave" });
  const next = p.tasks.filter((x) => x.status === "todo" && !taskIsLocked(x, p.tasks)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (next) out.push({ title: `Next up: ${next.title}`, detail: `Due ${formatDate(next.dueDate)} · ${next.stage}`, href: `${base}/roadmap`, tone: "wave" });
  if (p.profile.unknowns.length)
    out.push({ title: "Fill the gaps in your profile", detail: `${p.profile.unknowns.length} field(s) marked “I don't know yet” are using AI assumptions.`, href: `${base}/profile`, tone: "sky" });
  return out;
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Context digest sent to the AI so every module stays consistent      */
/* ------------------------------------------------------------------ */

export function digest(p: Project, exclude?: SectionKey): string {
  const out: string[] = [];
  const s = <K extends SectionKey>(k: K) => (k === exclude ? undefined : sectionData(p, k));
  const company = s("company");
  if (company)
    out.push(
      `Company: ${businessName(p)}. ${company.overview} UVP: ${company.uniqueValueProposition}. Offerings: ${company.offerings.map((o) => `${o.name} (${o.pricing})`).join("; ")}. Model: ${company.businessModel.summary}`,
    );
  const market = s("market");
  if (market) out.push(`Market: segments ${market.segments.map((x) => `${x.name} [${x.priority}]`).join("; ")}. Key uncertainties: ${market.uncertainties.join("; ")}`);
  const comp = s("competition");
  if (comp) out.push(`Competition: ${comp.competitors.map((c) => `${c.name} (${c.category}${c.isNamedCompany ? "" : ", illustrative"})`).join("; ")}. Differentiation: ${comp.differentiation.join("; ")}`);
  const mk = s("marketing");
  if (mk) out.push(`Marketing: positioning "${mk.positioning}". Channels: ${mk.channels.map((c) => `${c.channel} ${c.budgetPct}%`).join(", ")}. Monthly budget ${mk.monthlyBudget}. Voice: ${mk.brand.voice}`);
  const ex = s("execution");
  if (ex) out.push(`Execution: milestones ${ex.milestones.map((m) => `${m.title} (wk ${m.week})`).join("; ")}. Launch: ${ex.launchStrategy}`);
  const risks = s("risks");
  if (risks) out.push(`Risks: ${risks.candidAssessment} Critical assumptions: ${risks.criticalAssumptions.map((a) => a.assumption).join("; ")}`);
  const fin = s("financials");
  if (fin) out.push(`Financial plan: ${fin.summary} Pricing rationale: ${fin.pricingRationale}. Funding: ${fin.fundingStrategy.instrument}`);

  const proj = projectionFor(p);
  if (proj && p.finance) {
    const cur = p.profile.currency;
    const [y1, y2, y3] = proj.years;
    out.push(
      `Computed financial snapshot (${p.finance.edited ? "founder-edited" : "AI-proposed"} assumptions, deterministic model): startup costs ${Math.round(proj.startupCosts)}; revenue Y1 ${Math.round(y1.revenue)}, Y2 ${Math.round(y2.revenue)}, Y3 ${Math.round(y3.revenue)} ${cur}; net income Y1 ${Math.round(y1.netIncome)}, Y3 ${Math.round(y3.netIncome)}; break-even month ${proj.breakEvenMonth ?? "not within 36 months"}; funding gap ${Math.round(proj.fundingGap)} ${cur}.`,
    );
  }
  const open = p.tasks.filter((t) => t.status !== "done");
  if (p.tasks.length) out.push(`Roadmap: ${p.tasks.length - open.length}/${p.tasks.length} tasks done. Open: ${open.slice(0, 8).map((t) => `${t.title} [${t.status}, due ${t.dueDate}]`).join("; ")}`);

  const findings = [...p.research.runs.flatMap((r) => r.findings.map((f) => `${f.finding} (source: ${f.sources.map((x) => x.title).join(", ")}; confidence ${f.confidence})`)), ...p.research.manual.map((m) => `${m.finding} (founder-logged source: ${m.sourceTitle || m.sourceUrl})`)];
  if (findings.length) out.push(`Research findings with real sources (claims supported here may be labeled research-backed):\n- ${findings.slice(0, 25).join("\n- ")}`);
  return out.join("\n").slice(0, 38_000);
}
