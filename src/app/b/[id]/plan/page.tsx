"use client";

import { Download, FileText, Printer } from "lucide-react";
import { SectionView } from "@/components/sections";
import { toMarkdown } from "@/components/structured-editor";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, EmptyState } from "@/components/ui";
import { brand } from "@/config/brand";
import { download, slug } from "@/lib/client";
import { money, projectionCsv } from "@/lib/finance";
import { businessName, currentVersion, formatDate, isDemo, projectionFor } from "@/lib/project";
import { ROADMAP_STAGES, SECTIONS } from "@/lib/schemas";

export default function PlanExport() {
  const { project } = useWorkspace();
  const name = businessName(project);
  const proj = projectionFor(project);
  const cur = project.profile.currency;
  const available = SECTIONS.filter((s) => project.sections[s.key]);
  const tagline = currentVersion(project, "company")?.data.uniqueValueProposition;
  const date = new Date().toLocaleDateString(undefined, { dateStyle: "long" });

  const markdown = () => {
    const md = [`# ${name}`, `## Business Plan`, "", `Prepared ${date} with ${brand.name}.`, ""];
    if (isDemo(project)) md.push("> Contains template drafts written offline — not AI analysis.", "");
    for (const s of available) md.push(`## ${s.letter}. ${s.title}`, "", toMarkdown(currentVersion(project, s.key)!.data), "");
    if (proj) {
      md.push("## Financial Projections (computed)", "", "| | Year 1 | Year 2 | Year 3 |", "|---|---|---|---|");
      md.push(`| Revenue | ${proj.years.map((y) => money(y.revenue, cur, false)).join(" | ")} |`);
      md.push(`| Gross profit | ${proj.years.map((y) => money(y.grossProfit, cur, false)).join(" | ")} |`);
      md.push(`| Operating expenses | ${proj.years.map((y) => money(y.operatingExpenses, cur, false)).join(" | ")} |`);
      md.push(`| Net income | ${proj.years.map((y) => money(y.netIncome, cur, false)).join(" | ")} |`);
      md.push(`| Ending cash | ${proj.years.map((y) => money(y.endingCash, cur, false)).join(" | ")} |`, "");
    }
    if (project.tasks.length) {
      md.push("## Launch Roadmap", "");
      for (const st of ROADMAP_STAGES) {
        const ts = project.tasks.filter((t) => t.stage === st);
        if (ts.length) md.push(`### ${st}`, ...ts.map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.title} (due ${t.dueDate}, ${t.priority})`), "");
      }
    }
    md.push("---", "This plan is for planning and discussion. Projections are estimates based on stated assumptions, not guarantees. It is not legal, tax or financial advice.");
    return md.join("\n");
  };

  if (available.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Export" title="Business plan" />
        <EmptyState icon={<FileText className="size-5" />} title="Nothing to export yet" description="Generate your blueprint first. The exported plan combines every section, the computed financials and your roadmap into one document." />
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          eyebrow="Export"
          title="Business plan"
          description="A formatted document combining your blueprint, computed financial projections and roadmap. Use Print to save it as a PDF."
          actions={
            <>
              {proj && <Button variant="secondary" onClick={() => download(`${slug(name)}-projections.csv`, projectionCsv(proj), "text/csv")}><Download className="size-4" />Financials CSV</Button>}
              <Button variant="secondary" onClick={() => download(`${slug(name)}-business-plan.md`, markdown(), "text/markdown")}><Download className="size-4" />Markdown</Button>
              <Button onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button>
            </>
          }
        />
        {available.length < SECTIONS.length && <p className="mb-4 text-sm text-amber-700">{SECTIONS.length - available.length} section(s) not generated yet and will be omitted.</p>}
      </div>

      <article className="mx-auto max-w-[820px] rounded-xl border border-line bg-white px-6 py-10 shadow-sm sm:px-14 sm:py-14 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-line pb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-wave-700">Business plan</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-900">{name}</h1>
          {tagline && <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">{tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
            <span>{date}</span><span>Stage: {project.profile.stage}</span>{project.profile.location && <span>{project.profile.location}</span>}
          </div>
          {isDemo(project) && <Badge tone="amber" className="mt-4">Includes offline template drafts</Badge>}
          <nav className="mt-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contents</div>
            <ol className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
              {available.map((s) => <li key={s.key}>{s.letter}. {s.title}</li>)}
              {proj && <li>Financial projections</li>}
              {project.tasks.length > 0 && <li>Launch roadmap</li>}
            </ol>
          </nav>
        </header>

        {available.map((s) => (
          <section key={s.key} className="border-b border-line py-10 print:break-before-page">
            <h2 className="mb-6 font-display text-2xl font-semibold text-slate-900"><span className="mr-2 text-wave-600">{s.letter}.</span>{s.title}</h2>
            <SectionView section={s.key} data={currentVersion(project, s.key)!.data} currency={cur} projection={s.key === "financials" ? proj : undefined} />
          </section>
        ))}

        {proj && (
          <section className="border-b border-line py-10 print:break-before-page">
            <h2 className="mb-2 font-display text-2xl font-semibold text-slate-900">Financial projections</h2>
            <p className="mb-6 text-sm text-slate-500">Computed from {project.finance?.edited ? "founder-edited" : "AI-proposed"} assumptions. No historical financials are included. Taxes and financing are not modelled.</p>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr className="border-b border-line"><th className="py-2 text-left font-medium" />{proj.years.map((y) => <th key={y.year} className="py-2 text-right font-medium">Year {y.year}</th>)}</tr></thead>
              <tbody>
                {([["Revenue", "revenue"], ["Variable costs", "variableCosts"], ["Gross profit", "grossProfit"], ["Operating expenses", "operatingExpenses"], ["Net income", "netIncome"], ["Ending cash", "endingCash"]] as const).map(([label, k]) => (
                  <tr key={k} className="border-b border-line">
                    <td className="py-2 text-slate-700">{label}</td>
                    {proj.years.map((y) => <td key={y.year} className={`py-2 text-right tabular-nums ${y[k] < 0 ? "text-rose-600" : "text-slate-900"}`}>{money(y[k], cur, false)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div><div className="text-xs text-slate-500">Startup costs</div><div className="font-display text-lg font-semibold">{money(proj.startupCosts, cur, false)}</div></div>
              <div><div className="text-xs text-slate-500">Break-even month</div><div className="font-display text-lg font-semibold">{proj.breakEvenMonth ?? "Beyond 36"}</div></div>
              <div><div className="text-xs text-slate-500">Funding gap</div><div className="font-display text-lg font-semibold">{proj.fundingGap > 0 ? money(proj.fundingGap, cur, false) : "None"}</div></div>
            </div>
          </section>
        )}

        {project.tasks.length > 0 && (
          <section className="py-10 print:break-before-page">
            <h2 className="mb-6 font-display text-2xl font-semibold text-slate-900">Launch roadmap</h2>
            <div className="space-y-6">
              {ROADMAP_STAGES.map((st) => {
                const ts = project.tasks.filter((t) => t.stage === st).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                if (!ts.length) return null;
                return (
                  <div key={st} className="print:break-inside-avoid">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">{st}</h3>
                    <ul className="space-y-1 text-sm">
                      {ts.map((t) => <li key={t.id} className="flex gap-3"><span className="w-14 shrink-0 text-slate-400">{formatDate(t.dueDate)}</span><span className={t.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}>{t.title}</span></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="mt-6 border-t border-line pt-6 text-xs leading-relaxed text-slate-500">
          Prepared with {brand.name}. This plan is for planning and discussion. Projections are estimates based on stated assumptions and are not guarantees of results. Market information is labelled by evidence level; verify important figures independently. Nothing here is legal, tax or financial advice.
        </footer>
      </article>
    </div>
  );
}
