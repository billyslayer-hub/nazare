"use client";

import clsx from "clsx";
import { BarChart3, Calculator, Download, Info, Plus, RotateCcw, Sparkles, Table2, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Legend, MonthlyLines, SERIES } from "@/components/finance-charts";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Stat } from "@/components/ui";
import { download, generateSection, slug, useSectionJob } from "@/lib/client";
import { applyScenario, breakEven, DEFAULT_SCENARIOS, fundingNeed, money, num, priceForMargin, project as runProjection, projectionCsv, type Scenario } from "@/lib/finance";
import { businessName } from "@/lib/project";
import type { FinancialAssumptions } from "@/lib/schemas";
import { updateProject } from "@/lib/store";
import type { FinanceState } from "@/lib/types";

const TABS = [
  { key: "model", label: "Model & assumptions", icon: TrendingUp },
  { key: "scenarios", label: "Scenarios", icon: BarChart3 },
  { key: "calculators", label: "Calculators", icon: Calculator },
  { key: "statements", label: "Statements", icon: Table2 },
] as const;
type Tab = (typeof TABS)[number]["key"];

const BLANK: FinancialAssumptions = {
  startingCash: 10000,
  revenueStreams: [{ name: "Main product", kind: "transactional", price: 50, startingVolume: 20, monthlyGrowthPct: 5, churnPct: 0, variableCostPct: 30 }],
  startupCosts: [{ item: "Setup", cost: 2000 }],
  fixedCosts: [{ item: "Tools & software", monthly: 100, startMonth: 1 }],
  team: [],
  marketingMonthly: 300,
  marketingGrowthPct: 2,
};

export default function FinancialsPage() {
  const { project } = useWorkspace();
  const toast = useToast();
  const job = useSectionJob(project.id, "financials");
  const [tab, setTab] = useState<Tab>("model");
  const finance = project.finance;
  const cur = project.profile.currency;

  const setFinance = (update: (f: FinanceState) => FinanceState) => updateProject(project.id, (p) => (p.finance ? { ...p, finance: update(p.finance) } : p));
  const setAssumptions = (a: FinancialAssumptions) => setFinance((f) => ({ ...f, assumptions: a, edited: true }));

  if (!finance) {
    return (
      <div>
        <PageHeader eyebrow="Money" title="Your numbers" description="A 36-month model computed in your browser from assumptions you control." />
        <EmptyState
          icon={<BarChart3 className="size-5" />}
          title="No financial model yet"
          description="Generate the Financial Plan section to get AI-proposed starting assumptions based on your profile, or start from a blank model and enter your own numbers."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => generateSection(project.id, "financials")} loading={job?.status === "loading"} disabled={!project.sections.company}><Sparkles className="size-4" />Generate assumptions</Button>
              <Button variant="secondary" onClick={() => updateProject(project.id, (p) => ({ ...p, finance: { assumptions: { ...BLANK }, proposed: { ...BLANK }, basis: "manual", edited: true, scenarios: DEFAULT_SCENARIOS, bufferMonths: 3 } }))}>Start blank model</Button>
            </div>
          }
        />
        {!project.sections.company && <p className="mt-3 text-center text-xs text-slate-500">Generate the Company Description on the Business Plan page first.</p>}
        {job?.status === "error" && <p className="mt-3 text-center text-sm text-rose-600">{job.error}</p>}
      </div>
    );
  }

  const a = finance.assumptions;
  const proj = runProjection(a);
  const funding = fundingNeed(proj, finance.bufferMonths);
  const proposalPending = Boolean(finance.proposalPending);
  const sourceBadge = finance.edited ? <Badge tone="sky">Edited by you</Badge> : finance.basis === "demo" ? <Badge tone="amber">Example numbers</Badge> : finance.basis === "manual" ? <Badge tone="ink">Your numbers</Badge> : <Badge tone="violet">AI-estimated assumptions</Badge>;

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Your numbers"
        description="Every figure is calculated from the assumptions below — change any input and the projections, break-even and funding needs update instantly."
        actions={
          <>
            {finance.edited && finance.basis !== "manual" && (
              <Button variant="ghost" onClick={() => { setFinance((f) => ({ ...f, assumptions: f.proposed, edited: false, proposalPending: false })); toast("Reset to the plan's assumptions."); }}><RotateCcw className="size-4" />Reset to plan</Button>
            )}
            <Button variant="secondary" onClick={() => { download(`${slug(businessName(project))}-projections.csv`, projectionCsv(proj), "text/csv"); toast("CSV downloaded."); }}><Download className="size-4" />Export CSV</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {sourceBadge}
        <span>No historical financials provided — figures are projections, not results or guarantees.</span>
      </div>

      {proposalPending && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 sm:flex-row sm:items-center">
          <Info className="size-4 shrink-0" />
          <span className="flex-1">The Financial Plan section has newer AI-proposed assumptions. Your edited numbers are being used.</span>
          <Button size="sm" variant="secondary" onClick={() => { setFinance((f) => ({ ...f, assumptions: f.proposed, edited: false, proposalPending: false })); toast("New assumptions applied."); }}>Use new assumptions</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Startup costs" value={money(proj.startupCosts, cur)} />
        <Stat label="Year 1 revenue" value={money(proj.years[0].revenue, cur)} />
        <Stat label="Y1 gross margin" value={`${proj.years[0].grossMarginPct.toFixed(0)}%`} />
        <Stat label="Break-even" value={proj.breakEvenMonth ? `Month ${proj.breakEvenMonth}` : "> 36 mo"} hint="First month with profit" />
        <Stat label="Lowest cash" value={money(proj.lowestCash, cur)} hint={proj.lowestCashMonth ? `Month ${proj.lowestCashMonth}` : "At start"} className={proj.lowestCash < 0 ? "border-rose-200 bg-rose-50/40" : ""} />
        <Stat label="Funding needed" value={funding.total > 0 ? money(funding.total, cur) : "None"} hint={funding.total > 0 ? `Incl. ${finance.bufferMonths}-mo buffer` : "Cash stays positive"} />
      </div>

      <div className="no-print mt-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={clsx("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition", tab === t.key ? "border-ink-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "model" && <ModelTab a={a} onChange={setAssumptions} currency={cur} capitalProvided={Boolean(project.profile.capital)} />}
        {tab === "scenarios" && <ScenariosTab a={a} scenarios={finance.scenarios} currency={cur} onChange={(s) => setFinance((f) => ({ ...f, scenarios: s }))} />}
        {tab === "calculators" && <CalculatorsTab a={a} currency={cur} bufferMonths={finance.bufferMonths} onBuffer={(n) => setFinance((f) => ({ ...f, bufferMonths: n }))} />}
        {tab === "statements" && <StatementsTab a={a} currency={cur} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NumInput({ value, onChange, suffix, className, step = "any" }: { value: number; onChange: (v: number) => void; suffix?: string; className?: string; step?: string }) {
  return (
    <div className={clsx("relative", className)}>
      <Input type="number" step={step} inputMode="decimal" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className={clsx("h-9 tabular-nums", suffix && "pr-8")} />
      {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}

function ListEditor<T extends Record<string, unknown>>({ title, rows, columns, onChange, blank, total, currency }: {
  title: string;
  rows: T[];
  columns: { key: keyof T & string; label: string; type: "text" | "money" | "month" }[];
  onChange: (rows: T[]) => void;
  blank: T;
  total?: (rows: T[]) => number;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader title={title} action={total && <span className="font-display text-sm font-semibold tabular-nums text-slate-900">{money(total(rows), currency, false)}{columns.some((c) => c.key === "monthly") ? "/mo" : ""}</span>} />
      <div className="space-y-2 p-4">
        {rows.length === 0 && <p className="py-2 text-sm text-slate-400">None yet.</p>}
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {columns.map((c) =>
              c.type === "text" ? (
                <Input key={c.key} aria-label={c.label} value={String(row[c.key] ?? "")} onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)))} className="h-9 min-w-0 flex-1" />
              ) : (
                <NumInput key={c.key} value={Number(row[c.key])} onChange={(v) => onChange(rows.map((r, j) => (j === i ? { ...r, [c.key]: v } : r)))} className={c.type === "month" ? "w-24" : "w-28"} suffix={c.type === "month" ? "mo" : undefined} />
              ),
            )}
            <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${title} row`}><Trash2 className="size-4" /></button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => onChange([...rows, { ...blank }])} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-wave-700 hover:bg-wave-50"><Plus className="size-3.5" />Add row</button>
          {columns.some((c) => c.type === "month") && <span className="text-[11px] text-slate-400">Amount · start month</span>}
        </div>
      </div>
    </Card>
  );
}

function ModelTab({ a, onChange, currency, capitalProvided }: { a: FinancialAssumptions; onChange: (a: FinancialAssumptions) => void; currency: string; capitalProvided: boolean }) {
  const proj = useMemo(() => runProjection(a), [a]);
  const data = proj.months.map((m) => ({ month: m.month, revenue: m.revenue, costs: m.variableCosts + m.operatingExpenses, cash: m.cash }));
  const set = <K extends keyof FinancialAssumptions>(k: K, v: FinancialAssumptions[K]) => onChange({ ...a, [k]: v });
  const setStream = (i: number, patch: Partial<FinancialAssumptions["revenueStreams"][number]>) => set("revenueStreams", a.revenueStreams.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const revSeries = [{ key: "revenue", label: "Revenue", color: SERIES.blue }, { key: "costs", label: "Total costs", color: SERIES.orange }];
  const cashSeries = [{ key: "cash", label: "Cash balance", color: SERIES.aqua }];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-[15px] font-semibold text-slate-900">Revenue vs. costs</h3><Legend series={revSeries} /></div>
          <MonthlyLines data={data} series={revSeries} currency={currency} />
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-[15px] font-semibold text-slate-900">Cash balance</h3><span className="text-xs text-slate-500">Dashed line = zero</span></div>
          <MonthlyLines data={data} series={cashSeries} currency={currency} zeroLine />
        </Card>
      </div>

      <Card>
        <CardHeader title="Revenue streams" description="Recurring = subscribers billed monthly (with churn). Transactional = orders per month at an average order value." action={<Button size="sm" variant="ghost" onClick={() => set("revenueStreams", [...a.revenueStreams, { ...BLANK.revenueStreams[0], name: "New stream" }])}><Plus className="size-3.5" />Add stream</Button>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Name</th><th className="px-2 py-2 font-medium">Type</th><th className="px-2 py-2 font-medium">Price / AOV</th><th className="px-2 py-2 font-medium" title="New subscribers or orders in month 1">Month-1 volume</th><th className="px-2 py-2 font-medium">Growth / mo</th><th className="px-2 py-2 font-medium">Churn / mo</th><th className="px-2 py-2 font-medium" title="Cost of goods sold as % of revenue">Variable cost</th><th />
              </tr>
            </thead>
            <tbody>
              {a.revenueStreams.map((s, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-4 py-2"><Input className="h-9 min-w-36" value={s.name} onChange={(e) => setStream(i, { name: e.target.value })} /></td>
                  <td className="px-2 py-2"><Select className="h-9 w-36" value={s.kind} onChange={(e) => setStream(i, { kind: e.target.value as "recurring" | "transactional", churnPct: e.target.value === "transactional" ? 0 : s.churnPct })}><option value="recurring">Recurring</option><option value="transactional">Transactional</option></Select></td>
                  <td className="px-2 py-2"><NumInput className="w-28" value={s.price} onChange={(v) => setStream(i, { price: v })} suffix={currency} /></td>
                  <td className="px-2 py-2"><NumInput className="w-28" value={s.startingVolume} onChange={(v) => setStream(i, { startingVolume: v })} /></td>
                  <td className="px-2 py-2"><NumInput className="w-24" value={s.monthlyGrowthPct} onChange={(v) => setStream(i, { monthlyGrowthPct: v })} suffix="%" /></td>
                  <td className="px-2 py-2"><NumInput className="w-24" value={s.churnPct} onChange={(v) => setStream(i, { churnPct: v })} suffix="%" /></td>
                  <td className="px-2 py-2"><NumInput className="w-24" value={s.variableCostPct} onChange={(v) => setStream(i, { variableCostPct: v })} suffix="%" /></td>
                  <td className="px-2 py-2"><button onClick={() => set("revenueStreams", a.revenueStreams.filter((_, j) => j !== i))} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove stream"><Trash2 className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-display text-[15px] font-semibold text-slate-900">Cash & marketing</h3>
          <div className="mt-4 space-y-4">
            <Field label={<span className="flex items-center gap-2">Starting cash {capitalProvided ? <Badge tone="ink">From your profile</Badge> : <Badge tone="amber">Estimate</Badge>}</span>}><NumInput value={a.startingCash} onChange={(v) => set("startingCash", v)} suffix={currency} /></Field>
            <Field label="Marketing spend / month"><NumInput value={a.marketingMonthly} onChange={(v) => set("marketingMonthly", v)} suffix={currency} /></Field>
            <Field label="Marketing growth / month"><NumInput value={a.marketingGrowthPct} onChange={(v) => set("marketingGrowthPct", v)} suffix="%" /></Field>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <ListEditor title="Startup costs (one-time)" currency={currency} rows={a.startupCosts} onChange={(r) => set("startupCosts", r)} blank={{ item: "New item", cost: 0 }} total={(r) => r.reduce((s, x) => s + x.cost, 0)} columns={[{ key: "item", label: "Item", type: "text" }, { key: "cost", label: "Cost", type: "money" }]} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListEditor title="Fixed monthly expenses" currency={currency} rows={a.fixedCosts} onChange={(r) => set("fixedCosts", r)} blank={{ item: "New expense", monthly: 0, startMonth: 1 }} total={(r) => r.reduce((s, x) => s + x.monthly, 0)} columns={[{ key: "item", label: "Expense", type: "text" }, { key: "monthly", label: "Monthly", type: "money" }, { key: "startMonth", label: "Start month", type: "month" }]} />
        <ListEditor title="Team & payroll" currency={currency} rows={a.team} onChange={(r) => set("team", r)} blank={{ role: "New role", monthly: 0, startMonth: 1 }} total={(r) => r.reduce((s, x) => s + x.monthly, 0)} columns={[{ key: "role", label: "Role", type: "text" }, { key: "monthly", label: "Monthly cost", type: "money" }, { key: "startMonth", label: "Start month", type: "month" }]} />
      </div>
    </div>
  );
}

function ScenariosTab({ a, scenarios, currency, onChange }: { a: FinancialAssumptions; scenarios: Scenario[]; currency: string; onChange: (s: Scenario[]) => void }) {
  const results = scenarios.map((s) => ({ s, p: runProjection(applyScenario(a, s)) }));
  const colors = { conservative: SERIES.orange, base: SERIES.blue, optimistic: SERIES.aqua };
  const series = scenarios.map((s) => ({ key: s.key, label: s.label, color: colors[s.key] }));
  const data = Array.from({ length: 36 }, (_, i) => ({ month: i + 1, ...Object.fromEntries(results.map((r) => [r.s.key, r.p.months[i].cash])) }));
  const setS = (key: Scenario["key"], patch: Partial<Scenario>) => onChange(scenarios.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-[15px] font-semibold text-slate-900">Cash balance by scenario</h3><Legend series={series} /></div>
        <MonthlyLines data={data} series={series} currency={currency} height={280} zeroLine />
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {results.map(({ s, p }) => (
          <Card key={s.key} className="p-5">
            <div className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full" style={{ background: colors[s.key] }} /><h3 className="font-display text-[15px] font-semibold text-slate-900">{s.label}</h3></div>
            <dl className="mt-4 space-y-2 text-sm">
              {[["Year 1 revenue", money(p.years[0].revenue, currency)], ["Year 3 revenue", money(p.years[2].revenue, currency)], ["Year 3 net income", money(p.years[2].netIncome, currency)], ["Break-even", p.breakEvenMonth ? `Month ${p.breakEvenMonth}` : "> 36 months"], ["Funding gap", p.fundingGap > 0 ? money(p.fundingGap, currency) : "None"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium tabular-nums text-slate-900">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {(["volume", "growth", "price", "costs"] as const).map((k) => (
                <label key={k} className="text-xs text-slate-500">
                  <span className="capitalize">{k} ×</span>
                  <NumInput className="mt-1" value={s[k]} step="0.05" onChange={(v) => setS(s.key, { [k]: Math.max(0, v) })} />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">Scenarios multiply your base assumptions: volume and growth scale starting volume and growth rates, price scales all prices, costs scale startup, fixed and payroll costs. Illustrative ranges — not predictions.</p>
    </div>
  );
}

function CalcCard({ title, description, children, result }: { title: string; description: string; children: ReactNode; result: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-3">{children}</div>
        <div className="rounded-lg bg-slate-50 p-4">{result}</div>
      </div>
    </Card>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-2 py-1 text-sm"><span className="text-slate-500">{k}</span><span className={clsx("tabular-nums", strong ? "font-display text-base font-semibold text-slate-900" : "font-medium text-slate-800")}>{v}</span></div>;
}

function CalculatorsTab({ a, currency, bufferMonths, onBuffer }: { a: FinancialAssumptions; currency: string; bufferMonths: number; onBuffer: (n: number) => void }) {
  const first = a.revenueStreams[0];
  const fixedDefault = Math.round(a.fixedCosts.reduce((s, c) => s + c.monthly, 0) + a.team.reduce((s, t) => s + t.monthly, 0) + a.marketingMonthly);
  const [be, setBe] = useState({ fixed: fixedDefault, price: first?.price ?? 50, variable: Math.round(((first?.price ?? 50) * (first?.variableCostPct ?? 30)) / 100) });
  const [pc, setPc] = useState({ cost: Math.round(((first?.price ?? 50) * (first?.variableCostPct ?? 30)) / 100) || 10, margin: 60, competitor: 0 });
  const [pm, setPm] = useState({ price: first?.price ?? 50, cost: Math.round(((first?.price ?? 50) * (first?.variableCostPct ?? 30)) / 100) });
  const beR = breakEven(be.fixed, be.price, be.variable);
  const pcR = priceForMargin(pc.cost, pc.margin);
  const pmProfit = pm.price - pm.cost;
  const proj = runProjection(a);
  const fund = fundingNeed(proj, bufferMonths);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CalcCard title="Break-even calculator" description="How many sales per month cover your fixed costs?" result={
        <>
          <Row k="Contribution per sale" v={money(beR.contribution, currency, false)} />
          <Row k="Contribution margin" v={`${beR.marginPct.toFixed(0)}%`} />
          <Row k="Sales needed / month" v={beR.units === null ? "Price must exceed variable cost" : num(beR.units)} strong />
          <Row k="Revenue needed / month" v={beR.revenue === null ? "—" : money(beR.revenue, currency, false)} />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Break-even = fixed costs ÷ (price − variable cost per sale). Every sale beyond this is profit.</p>
        </>
      }>
        <Field label="Fixed costs / month" hint="Pre-filled from your model: fixed costs + payroll + marketing"><NumInput value={be.fixed} onChange={(v) => setBe({ ...be, fixed: v })} suffix={currency} /></Field>
        <Field label="Price per sale"><NumInput value={be.price} onChange={(v) => setBe({ ...be, price: v })} suffix={currency} /></Field>
        <Field label="Variable cost per sale"><NumInput value={be.variable} onChange={(v) => setBe({ ...be, variable: v })} suffix={currency} /></Field>
      </CalcCard>

      <CalcCard title="Pricing calculator" description="What should you charge to hit a target margin?" result={
        <>
          <Row k="Suggested price" v={money(pcR.price, currency, false)} strong />
          <Row k="Profit per unit" v={money(pcR.profitPerUnit, currency, false)} />
          <Row k="Markup on cost" v={`${pcR.markupPct.toFixed(0)}%`} />
          {pc.competitor > 0 && <Row k="vs. competitor" v={`${pcR.price > pc.competitor ? "+" : ""}${(((pcR.price - pc.competitor) / pc.competitor) * 100).toFixed(0)}%`} />}
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Margin is profit as a share of price; markup is profit as a share of cost. A 50% margin equals a 100% markup.</p>
        </>
      }>
        <Field label="Cost to deliver one unit"><NumInput value={pc.cost} onChange={(v) => setPc({ ...pc, cost: v })} suffix={currency} /></Field>
        <Field label="Target gross margin"><NumInput value={pc.margin} onChange={(v) => setPc({ ...pc, margin: v })} suffix="%" /></Field>
        <Field label="Competitor price (optional)" hint="Use a price you've verified"><NumInput value={pc.competitor} onChange={(v) => setPc({ ...pc, competitor: v })} suffix={currency} /></Field>
      </CalcCard>

      <CalcCard title="Profit margin calculator" description="What do you keep from each sale?" result={
        <>
          <Row k="Gross profit per sale" v={money(pmProfit, currency, false)} strong />
          <Row k="Gross margin" v={pm.price > 0 ? `${((pmProfit / pm.price) * 100).toFixed(1)}%` : "—"} />
          <Row k="Markup" v={pm.cost > 0 ? `${((pmProfit / pm.cost) * 100).toFixed(1)}%` : "—"} />
          {pmProfit < 0 && <p className="mt-2 text-xs font-medium text-rose-600">You lose money on every sale at this price.</p>}
        </>
      }>
        <Field label="Selling price"><NumInput value={pm.price} onChange={(v) => setPm({ ...pm, price: v })} suffix={currency} /></Field>
        <Field label="Cost per sale"><NumInput value={pm.cost} onChange={(v) => setPm({ ...pm, cost: v })} suffix={currency} /></Field>
      </CalcCard>

      <CalcCard title="Funding needs estimator" description="How much cash should you raise or set aside?" result={
        <>
          <Row k="Deepest cash shortfall" v={fund.gap > 0 ? money(fund.gap, currency, false) : "None"} />
          <Row k="Average monthly burn" v={money(fund.avgBurn, currency, false)} />
          <Row k={`Safety buffer (${bufferMonths} mo)`} v={fund.gap > 0 ? money(fund.buffer, currency, false) : "—"} />
          <Row k="Recommended funding" v={fund.total > 0 ? money(fund.total, currency, false) : "None needed in model"} strong />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Based on your model&apos;s cash flow plus a buffer for things taking longer than planned. It is not a guarantee you can raise this amount.</p>
        </>
      }>
        <Field label="Safety buffer" hint="Months of average burn to hold in reserve"><NumInput value={bufferMonths} onChange={(v) => onBuffer(Math.max(0, Math.min(24, Math.round(v))))} suffix="mo" step="1" /></Field>
        <Row k="Starting cash" v={money(a.startingCash, currency, false)} />
        <Row k="Startup costs" v={money(proj.startupCosts, currency, false)} />
      </CalcCard>
    </div>
  );
}

function StatementsTab({ a, currency }: { a: FinancialAssumptions; currency: string }) {
  const p = runProjection(a);
  const [view, setView] = useState<"annual" | "monthly">("annual");
  const m = (v: number) => <span className={v < 0 ? "text-rose-600" : undefined}>{money(v, currency, false)}</span>;
  const pl: [string, (y: (typeof p.years)[number]) => ReactNode, boolean?][] = [
    ["Revenue", (y) => m(y.revenue), true],
    ["Cost of goods / variable costs", (y) => m(-y.variableCosts)],
    ["Gross profit", (y) => m(y.grossProfit), true],
    ["Gross margin", (y) => `${y.grossMarginPct.toFixed(1)}%`],
    ["Operating expenses", (y) => m(-y.operatingExpenses)],
    ["Net income (before tax)", (y) => m(y.netIncome), true],
    ["Ending cash", (y) => m(y.endingCash), true],
  ];
  return (
    <Card>
      <CardHeader
        title={view === "annual" ? "Projected profit & loss" : "Monthly cash-flow forecast"}
        description="Taxes, financing and depreciation are not modelled. Consult an accountant before relying on these figures."
        action={
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(["annual", "monthly"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={clsx("rounded-md px-3 py-1.5 capitalize", view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{v}</button>)}
          </div>
        }
      />
      <div className="overflow-x-auto">
        {view === "annual" ? (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-xs text-slate-500"><tr className="border-b border-line"><th className="px-5 py-2.5 text-left font-medium" />{p.years.map((y) => <th key={y.year} className="px-5 py-2.5 text-right font-medium">Year {y.year}</th>)}</tr></thead>
            <tbody>
              {pl.map(([label, fn, strong]) => (
                <tr key={label} className={clsx("border-b border-line last:border-0", strong && "bg-slate-50/50")}>
                  <td className={clsx("px-5 py-2.5", strong ? "font-medium text-slate-900" : "text-slate-600")}>{label}</td>
                  {p.years.map((y) => <td key={y.year} className={clsx("px-5 py-2.5 text-right tabular-nums", strong && "font-medium")}>{fn(y)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[900px] text-xs">
            <thead className="sticky top-0 bg-white text-slate-500"><tr className="border-b border-line">{["Month", "Revenue", "Variable costs", "Gross profit", "Payroll", "Fixed costs", "Marketing", "Net cash flow", "Ending cash", "Subscribers", "Orders"].map((h) => <th key={h} className="px-3 py-2.5 text-right font-medium first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {p.months.map((r) => (
                <tr key={r.month} className={clsx("border-b border-line", r.month % 12 === 0 && "border-b-slate-300")}>
                  <td className="px-3 py-2 font-medium text-slate-700">{r.month}</td>
                  {[r.revenue, -r.variableCosts, r.grossProfit, -r.payroll, -r.fixedCosts, -r.marketing, r.netIncome, r.cash].map((v, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{m(v)}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{num(r.customers)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{num(r.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
