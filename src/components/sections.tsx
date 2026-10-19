"use client";

import clsx from "clsx";
import { AlertTriangle, Info, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, BulletList, EvidenceBadge, levelTone } from "@/components/ui";
import { money, type Projection } from "@/lib/finance";
import type { SectionData, SectionKey } from "@/lib/schemas";

/* Read-only renderers for each blueprint section. Shared by the blueprint workspace and the printable plan. */

function Sub({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</h4>;
}
function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-sm leading-relaxed text-slate-700", className)}>{children}</p>;
}
function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Sub>{title}</Sub>
      {children}
    </div>
  );
}
function Tile({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-line bg-slate-50/50 p-4 print:break-inside-avoid", className)}>
      {title && <div className="mb-1.5 text-sm font-semibold text-slate-900">{title}</div>}
      {children}
    </div>
  );
}
function Callout({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : Info;
  return (
    <div className={clsx("flex gap-2.5 rounded-lg px-3.5 py-2.5 text-xs leading-relaxed", tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600")}>
      <Icon className="mt-px size-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
const Grid = ({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) => (
  <div className={clsx("grid gap-4", cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>{children}</div>
);

function Executive({ d }: { d: SectionData["executive"] }) {
  const rows: [string, string][] = [
    ["Concept", d.concept],
    ["Problem", d.problem],
    ["Solution", d.solution],
    ["Target market", d.targetMarket],
    ["Value proposition", d.valueProposition],
    ["Revenue model", d.revenueModel],
    ["Competitive advantage", d.competitiveAdvantage],
    ["Funding requirement", d.fundingRequirement],
  ];
  return (
    <div className="space-y-6">
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
      <Grid>
        <Block title="Key objectives"><BulletList items={d.keyObjectives} /></Block>
        <Block title="Major milestones">
          <ol className="space-y-2">
            {d.milestones.map((m, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="w-24 shrink-0 font-medium text-slate-500">{m.timeframe}</span><span className="text-slate-700">{m.milestone}</span></li>
            ))}
          </ol>
        </Block>
      </Grid>
    </div>
  );
}

function Company({ d }: { d: SectionData["company"] }) {
  return (
    <div className="space-y-6">
      {d.suggestedNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Name ideas:</span>
          {d.suggestedNames.map((n) => <Badge key={n} tone="wave">{n}</Badge>)}
        </div>
      )}
      <Grid>
        <Tile title="Mission"><Prose>{d.mission}</Prose></Tile>
        <Tile title="Vision"><Prose>{d.vision}</Prose></Tile>
      </Grid>
      <Block title="Business overview"><Prose>{d.overview}</Prose></Block>
      <Block title="Products & services">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {d.offerings.map((o, i) => (
                <tr key={i}><td className="w-1/4 px-4 py-3 align-top font-medium text-slate-900">{o.name}</td><td className="px-4 py-3 align-top text-slate-600">{o.description}</td><td className="whitespace-nowrap px-4 py-3 text-right align-top font-medium text-slate-900">{o.pricing}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
      <Grid>
        <Block title="Customer problem"><Prose>{d.customerProblem}</Prose></Block>
        <Block title="Unique value proposition"><Prose>{d.uniqueValueProposition}</Prose></Block>
      </Grid>
      <Block title="Business model">
        <Prose>{d.businessModel.summary}</Prose>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {d.businessModel.revenueStreams.map((r, i) => (
            <Tile key={i} title={r.name}><Prose className="text-slate-600">{r.description}</Prose><div className="mt-2"><Badge>{r.pricingModel}</Badge></div></Tile>
          ))}
        </div>
      </Block>
      <Tile title={<span className="flex items-center gap-2"><Scale className="size-4 text-slate-400" />Suggested legal structure: {d.legalStructure.suggestion}</span>}>
        <Prose className="text-slate-600">{d.legalStructure.rationale}</Prose>
        {d.legalStructure.alternatives.length > 0 && <p className="mt-2 text-xs text-slate-500">Alternatives: {d.legalStructure.alternatives.join(" · ")}</p>}
        <p className="mt-2 text-xs italic text-slate-500">General educational guidance, not legal advice. Confirm with a qualified professional in your jurisdiction.</p>
      </Tile>
      <Grid>
        <Block title="Short-term objectives"><BulletList items={d.shortTermObjectives} /></Block>
        <Block title="Long-term objectives"><BulletList items={d.longTermObjectives} /></Block>
      </Grid>
    </div>
  );
}

function Market({ d, currency }: { d: SectionData["market"]; currency: string }) {
  const sizes = [
    { k: "TAM", v: d.marketSize.tam, w: 100 },
    { k: "SAM", v: d.marketSize.sam, w: 62 },
    { k: "SOM", v: d.marketSize.som, w: 30 },
  ];
  return (
    <div className="space-y-6">
      <Block title="Industry overview"><Prose>{d.industryOverview}</Prose></Block>
      <Block title="Customer segments">
        <Grid cols={3}>
          {d.segments.map((s, i) => (
            <Tile key={i} title={<span className="flex items-center justify-between gap-2">{s.name}<Badge tone={s.priority === "primary" ? "wave" : "slate"}>{s.priority}</Badge></span>}>
              <Prose className="text-slate-600">{s.description}</Prose>
              <div className="mt-3 text-xs font-medium text-slate-500">Needs</div>
              <BulletList items={s.needs} className="mt-1" />
              <div className="mt-3 text-xs font-medium text-slate-500">Pain points</div>
              <BulletList items={s.painPoints} className="mt-1" />
            </Tile>
          ))}
        </Grid>
      </Block>
      <Block title="Market size">
        <div className="rounded-lg border border-line p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2"><EvidenceBadge value={d.marketSize.evidence} /><span className="text-xs text-slate-500">Not verified market data unless marked research-backed.</span></div>
          <div className="space-y-2.5">
            {sizes.map((s) => (
              <div key={s.k} className="flex items-center gap-3">
                <span className="w-10 text-xs font-semibold text-slate-500">{s.k}</span>
                <div className="relative h-8 flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center rounded-md bg-wave-500/15 px-3" style={{ width: `${s.w}%` }}>
                    <span className="font-display text-sm font-semibold tabular-nums text-slate-900">{s.v.value > 0 ? money(s.v.value, currency) : "—"}</span>
                  </div>
                </div>
                <span className="hidden w-2/5 text-xs text-slate-500 sm:block">{s.v.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-600"><span className="font-medium text-slate-700">Approach: </span>{d.marketSize.approach}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500"><span className="font-medium">Caveats: </span>{d.marketSize.caveats}</p>
        </div>
      </Block>
      <Block title="Demand hypotheses">
        <div className="space-y-2">
          {d.demandHypotheses.map((h, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-start">
              <div className="flex-1"><div className="text-sm font-medium text-slate-800">{h.hypothesis}</div><div className="mt-0.5 text-xs text-slate-500">Validate: {h.howToValidate}</div></div>
              <EvidenceBadge value={h.evidence} />
            </div>
          ))}
        </div>
      </Block>
      <Block title="Trends">
        <div className="space-y-2">
          {d.trends.map((t, i) => (
            <div key={i} className="flex items-start gap-3"><div className="flex-1"><div className="text-sm font-medium text-slate-800">{t.trend}</div><div className="text-sm text-slate-600">{t.relevance}</div></div><EvidenceBadge value={t.evidence} /></div>
          ))}
        </div>
      </Block>
      <Grid cols={3}>
        <Block title="Geographic considerations"><BulletList items={d.geographicConsiderations} /></Block>
        <Block title="Barriers to entry"><BulletList items={d.barriersToEntry} /></Block>
        <Block title="Uncertainties to validate"><BulletList items={d.uncertainties} /></Block>
      </Grid>
    </div>
  );
}

function Competition({ d }: { d: SectionData["competition"] }) {
  const illustrative = d.competitors.some((c) => !c.isNamedCompany);
  return (
    <div className="space-y-6">
      <Prose>{d.landscape}</Prose>
      {illustrative && <Callout>Entries marked <strong>Illustrative</strong> describe a type of competitor rather than a specific company. Named companies come from the model&apos;s general knowledge — verify details such as pricing in the Research workspace.</Callout>}
      <Grid cols={3}>
        {d.competitors.map((c, i) => (
          <Tile key={i}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-auto text-sm font-semibold text-slate-900">{c.name}</span>
              <Badge tone={c.category === "direct" ? "rose" : c.category === "indirect" ? "amber" : "sky"}>{c.category}</Badge>
              {!c.isNamedCompany && <Badge tone="violet">Illustrative</Badge>}
            </div>
            <Prose className="mt-2 text-slate-600">{c.positioning}</Prose>
            <div className="mt-2 text-xs text-slate-500">Pricing: <span className="font-medium text-slate-700">{c.pricing}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><div className="mb-1 font-medium text-wave-700">Strengths</div><ul className="space-y-1 text-slate-600">{c.strengths.map((s, j) => <li key={j}>+ {s}</li>)}</ul></div>
              <div><div className="mb-1 font-medium text-rose-600">Weaknesses</div><ul className="space-y-1 text-slate-600">{c.weaknesses.map((s, j) => <li key={j}>− {s}</li>)}</ul></div>
            </div>
          </Tile>
        ))}
      </Grid>
      <Block title="Comparison matrix (1 = weak, 5 = strong)">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-4 py-2.5 text-left font-medium">Competitor</th>{d.matrix.criteria.map((c) => <th key={c} className="px-3 py-2.5 text-center font-medium">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.matrix.rows.map((r, i) => {
                const you = r.name.trim().toLowerCase() === "you";
                return (
                  <tr key={i} className={you ? "bg-wave-50/60" : ""}>
                    <td className={clsx("px-4 py-2.5", you ? "font-semibold text-wave-800" : "text-slate-700")}>{you ? "You" : r.name}</td>
                    {d.matrix.criteria.map((_, j) => {
                      const s = Math.max(0, Math.min(5, Math.round(r.scores[j] ?? 0)));
                      return (
                        <td key={j} className="px-3 py-2.5">
                          <div className="flex justify-center gap-0.5" title={`${s}/5`}>{[1, 2, 3, 4, 5].map((k) => <span key={k} className={clsx("size-1.5 rounded-full", k <= s ? (you ? "bg-wave-500" : "bg-slate-500") : "bg-slate-200")} />)}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Block>
      <Grid>
        <Block title="Market gaps"><BulletList items={d.marketGaps} /></Block>
        <Block title="Differentiation opportunities"><BulletList items={d.differentiation} /></Block>
      </Grid>
    </div>
  );
}

function Execution({ d }: { d: SectionData["execution"] }) {
  const prose: [string, string][] = [
    ["Product / service development", d.productDevelopment],
    ["Initial operations", d.operations],
    ["Staffing", d.staffing],
    ["Distribution & delivery", d.distribution],
    ["Customer acquisition", d.customerAcquisition],
    ["Launch strategy", d.launchStrategy],
  ];
  return (
    <div className="space-y-6">
      <Block title="Business setup requirements">
        <div className="divide-y divide-line rounded-lg border border-line">
          {d.setupRequirements.map((r, i) => (
            <div key={i} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="text-sm font-medium text-slate-900 sm:w-1/3">{r.item}</div>
              <div className="flex-1 text-sm text-slate-600">{r.details}</div>
              {r.needsProfessionalAdvice && <Badge tone="amber" className="self-start">Consult a professional</Badge>}
            </div>
          ))}
        </div>
      </Block>
      <Grid>{prose.map(([k, v]) => <Block key={k} title={k}><Prose>{v}</Prose></Block>)}</Grid>
      <Block title="Milestones">
        <ol className="relative space-y-4 border-l border-line pl-5">
          {d.milestones.map((m, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-white bg-wave-500 ring-1 ring-wave-500" />
              <div className="text-sm font-medium text-slate-900">{m.title} <span className="font-normal text-slate-400">· Week {m.week}</span></div>
              <div className="text-sm text-slate-600">{m.successCriteria}</div>
            </li>
          ))}
        </ol>
      </Block>
      <Grid>
        <Block title="Suppliers & resources"><BulletList items={d.suppliersAndResources} /></Block>
        <Block title="Dependencies & risks"><BulletList items={d.dependencies} /></Block>
      </Grid>
      <Callout>{d.tasks.length} tasks and {d.launchChecklist.length} launch-readiness checks from this plan are on the Tasks page, where you can edit them, set status and adjust deadlines.</Callout>
    </div>
  );
}

function Marketing({ d, currency }: { d: SectionData["marketing"]; currency: string }) {
  return (
    <div className="space-y-6">
      <Tile title="Positioning"><Prose>{d.positioning}</Prose></Tile>
      <Grid>
        <Block title="Ideal customer profiles">
          <div className="space-y-2">{d.idealCustomerProfiles.map((c, i) => <div key={i}><div className="text-sm font-medium text-slate-900">{c.name}</div><Prose className="text-slate-600">{c.description}</Prose></div>)}</div>
        </Block>
        <Block title="Messaging pillars"><BulletList items={d.messagingPillars} /></Block>
      </Grid>
      <Block title="Customer personas">
        <Grid cols={3}>
          {d.personas.map((p, i) => (
            <Tile key={i}>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">{p.name.charAt(0)}</div>
                <div><div className="text-sm font-semibold text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.occupation} · {p.age}</div></div>
              </div>
              <p className="mt-3 text-sm italic text-slate-600">{p.quote}</p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div><span className="font-medium text-slate-700">Goals: </span>{p.goals.join("; ")}</div>
                <div><span className="font-medium text-slate-700">Frustrations: </span>{p.frustrations.join("; ")}</div>
                <div><span className="font-medium text-slate-700">Buying triggers: </span>{p.buyingTriggers.join("; ")}</div>
              </div>
            </Tile>
          ))}
        </Grid>
        <p className="mt-2 text-xs text-slate-400">Personas and quotes are illustrative composites, not real people.</p>
      </Block>
      <Block title="Brand direction">
        <div className="rounded-lg border border-line p-4">
          <div className="flex flex-wrap gap-1.5">{d.brand.personality.map((p) => <Badge key={p}>{p}</Badge>)}</div>
          <Prose className="mt-3"><span className="font-medium">Voice: </span>{d.brand.voice}</Prose>
          <Prose className="mt-1"><span className="font-medium">Visual direction: </span>{d.brand.visualDirection}</Prose>
          <div className="mt-4 flex flex-wrap gap-3">
            {d.brand.palette.map((c) => (
              <div key={c.hex + c.name} className="w-24">
                <div className="h-12 rounded-lg ring-1 ring-black/5" style={{ background: /^#[0-9a-f]{3,8}$/i.test(c.hex) ? c.hex : "#e2e8f0" }} />
                <div className="mt-1.5 text-xs font-medium text-slate-700">{c.name}</div>
                <div className="font-mono text-[11px] uppercase text-slate-400">{c.hex}</div>
              </div>
            ))}
          </div>
        </div>
      </Block>
      <Block title={`Channels · recommended budget ${money(d.monthlyBudget, currency)}/month`}>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <tbody className="divide-y divide-line">
              {d.channels.map((c, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 align-top"><div className="font-medium text-slate-900">{c.channel}</div><Badge className="mt-1">{c.type}</Badge></td>
                  <td className="px-4 py-3 align-top text-slate-600">{c.rationale}<div className="mt-1 text-xs text-slate-500">KPI: {c.kpi}</div></td>
                  <td className="w-36 px-4 py-3 align-top"><div className="text-right text-xs font-medium tabular-nums text-slate-700">{c.budgetPct}%</div><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-wave-500" style={{ width: `${Math.min(100, c.budgetPct)}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{d.budgetRationale}</p>
      </Block>
      <Grid>
        <Block title="Organic growth"><Prose>{d.organicStrategy}</Prose></Block>
        <Block title="Paid advertising"><Prose>{d.paidStrategy}</Prose></Block>
      </Grid>
      <Block title="Acquisition funnel">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {d.funnel.map((f, i) => (
            <div key={i} className="rounded-lg border border-line p-3" style={{ opacity: 1 - i * 0.04 }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-wave-700">{i + 1}. {f.stage}</div>
              <div className="mt-1 text-sm text-slate-800">{f.goal}</div>
              <div className="mt-2 text-xs text-slate-500">{f.tactics.join(" · ")}</div>
              <div className="mt-2 text-xs font-medium text-slate-600">Metric: {f.metric}</div>
            </div>
          ))}
        </div>
      </Block>
      <Grid>
        <Block title="Sales process"><ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">{d.salesProcess.map((s, i) => <li key={i}>{s}</li>)}</ol></Block>
        <Block title="Retention"><BulletList items={d.retention} /></Block>
      </Grid>
      <Block title="Campaign objectives">
        <div className="grid gap-3 sm:grid-cols-3">{d.campaignObjectives.map((o, i) => <Tile key={i} title={o.objective}><div className="text-xs text-slate-500">{o.kpi}</div><div className="mt-1 font-display text-base font-semibold text-slate-900">{o.target}</div></Tile>)}</div>
      </Block>
    </div>
  );
}

function Financials({ d, currency, projection }: { d: SectionData["financials"]; currency: string; projection?: Projection }) {
  const ratio = d.unitEconomics.cac > 0 ? d.unitEconomics.ltv / d.unitEconomics.cac : 0;
  return (
    <div className="space-y-6">
      <Callout>No historical financials have been provided, so none are shown. Everything below is a forward-looking projection from assumptions — not a forecast of guaranteed results.</Callout>
      <Prose>{d.summary}</Prose>
      {projection && (
        <div className="grid gap-3 sm:grid-cols-4">
          {projection.years.map((y) => <Tile key={y.year} title={`Year ${y.year} revenue`}><div className="font-display text-lg font-semibold tabular-nums">{money(y.revenue, currency)}</div><div className={clsx("text-xs", y.netIncome < 0 ? "text-rose-600" : "text-wave-700")}>Net {money(y.netIncome, currency)}</div></Tile>)}
          <Tile title="Break-even"><div className="font-display text-lg font-semibold">{projection.breakEvenMonth ? `Month ${projection.breakEvenMonth}` : "Not within 36 months"}</div><div className="text-xs text-slate-500">First profitable month</div></Tile>
        </div>
      )}
      <Block title="Key assumptions">
        <div className="space-y-2">
          {d.assumptionNotes.map((a, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-line p-3 sm:flex-row sm:items-start sm:gap-3">
              <div className="flex-1"><div className="text-sm font-medium text-slate-900">{a.assumption}</div><div className="text-sm text-slate-600">{a.note}</div></div>
              <EvidenceBadge value={a.basis} />
            </div>
          ))}
        </div>
      </Block>
      <Block title="Pricing rationale"><Prose>{d.pricingRationale}</Prose></Block>
      <Grid>
        <Tile title="Unit economics">
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-xs text-slate-500">CAC</div><div className="font-display font-semibold tabular-nums">{money(d.unitEconomics.cac, currency, false)}</div></div>
            <div><div className="text-xs text-slate-500">LTV</div><div className="font-display font-semibold tabular-nums">{money(d.unitEconomics.ltv, currency, false)}</div></div>
            <div><div className="text-xs text-slate-500">LTV : CAC</div><div className={clsx("font-display font-semibold tabular-nums", ratio >= 3 ? "text-wave-700" : "text-amber-600")}>{ratio ? `${ratio.toFixed(1)}×` : "—"}</div></div>
          </div>
          <Prose className="mt-3 text-slate-600">{d.unitEconomics.notes}</Prose>
        </Tile>
        <Tile title={`Funding: ${d.fundingStrategy.instrument}`}>
          <div className="flex h-2.5 overflow-hidden rounded-full">{d.fundingStrategy.useOfFunds.map((u, i) => <div key={i} style={{ width: `${u.pct}%`, background: ["#912f30", "#d99a57", "#344840", "#e5b682", "#94a3b8"][i % 5] }} />)}</div>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-600">{d.fundingStrategy.useOfFunds.map((u, i) => <li key={i} className="flex justify-between"><span>{u.category}</span><span className="tabular-nums">{u.pct}%</span></li>)}</ul>
          <Prose className="mt-2 text-slate-600">{d.fundingStrategy.rationale}</Prose>
          {projection && <p className="mt-2 text-xs font-medium text-slate-700">Computed funding gap: {projection.fundingGap > 0 ? money(projection.fundingGap, currency) : "none — cash stays positive"}</p>}
        </Tile>
      </Grid>
    </div>
  );
}

function Risks({ d }: { d: SectionData["risks"] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Candid assessment</div>
        <Prose className="mt-1.5 text-slate-800">{d.candidAssessment}</Prose>
        <div className="mt-2 text-xs text-slate-600">Readiness to invest significant money: <span className="font-semibold">{Math.round(d.readiness.score)}/100</span> — {d.readiness.rationale}</div>
      </div>
      <Block title="Risk register">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2.5 text-left font-medium">Risk</th><th className="px-3 py-2.5 text-left font-medium">Likelihood</th><th className="px-3 py-2.5 text-left font-medium">Impact</th><th className="px-4 py-2.5 text-left font-medium">Mitigation</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.risks.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 align-top"><div className="font-medium text-slate-900">{r.risk}</div><div className="mt-0.5 text-xs capitalize text-slate-500">{r.category}</div></td>
                  <td className="px-3 py-3 align-top"><Badge tone={levelTone[r.likelihood]}>{r.likelihood}</Badge></td>
                  <td className="px-3 py-3 align-top"><Badge tone={levelTone[r.impact]}>{r.impact}</Badge></td>
                  <td className="px-4 py-3 align-top text-slate-600">{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
      <Block title="Critical assumptions & low-cost experiments">
        <Grid>
          {d.criticalAssumptions.map((a, i) => (
            <Tile key={i} title={a.assumption}>
              <Prose className="text-slate-600">{a.whyItMatters}</Prose>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div><dt className="inline font-semibold text-slate-700">Experiment: </dt><dd className="inline text-slate-600">{a.experiment}</dd></div>
                <div><dt className="inline font-semibold text-slate-700">Success looks like: </dt><dd className="inline text-slate-600">{a.successMetric}</dd></div>
                <div><dt className="inline font-semibold text-slate-700">Estimated cost: </dt><dd className="inline text-slate-600">{a.estimatedCost}</dd></div>
              </dl>
            </Tile>
          ))}
        </Grid>
      </Block>
      <Grid cols={3}>
        <Block title="Regulatory considerations"><div className="space-y-2">{d.regulatory.map((r, i) => <div key={i}><div className="text-sm font-medium text-slate-800">{r.area}</div><div className="text-sm text-slate-600">{r.note}</div></div>)}</div></Block>
        <Block title="Priority actions"><BulletList items={d.priorityActions} /></Block>
        <Block title="When to get professional advice"><BulletList items={d.professionalAdvice} /></Block>
      </Grid>
      <Callout>Regulatory notes are general information, not legal or tax advice. Requirements vary by location and change over time.</Callout>
    </div>
  );
}

export function SectionView<K extends SectionKey>({ section, data, currency, projection }: { section: K; data: SectionData[K]; currency: string; projection?: Projection }) {
  switch (section) {
    case "executive": return <Executive d={data as SectionData["executive"]} />;
    case "company": return <Company d={data as SectionData["company"]} />;
    case "market": return <Market d={data as SectionData["market"]} currency={currency} />;
    case "competition": return <Competition d={data as SectionData["competition"]} />;
    case "execution": return <Execution d={data as SectionData["execution"]} />;
    case "marketing": return <Marketing d={data as SectionData["marketing"]} currency={currency} />;
    case "financials": return <Financials d={data as SectionData["financials"]} currency={currency} projection={projection} />;
    case "risks": return <Risks d={data as SectionData["risks"]} />;
    default: return null;
  }
}
