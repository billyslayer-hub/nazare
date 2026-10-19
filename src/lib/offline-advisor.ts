import { money } from "./finance";
import { businessName, completion, formatDate, projectionFor, recommendations, sectionData, taskIsLocked, today } from "./project";
import type { Project } from "./types";

/**
 * Offline Business Advisor: answers common founder questions from the
 * project's own saved data (plan sections, computed financials, tasks) and a
 * plain-language glossary. Used when no AI key is configured. It never invents
 * facts — if the data isn't there yet, it says which section to create.
 */

const GLOSSARY: { terms: string[]; title: string; text: string }[] = [
  { terms: ["break-even", "break even", "breakeven"], title: "Break-even point", text: "The point where money coming in equals money going out — no profit, no loss. Formula: fixed costs ÷ (price − cost per sale). Every sale after that is profit." },
  { terms: ["cac", "customer acquisition cost"], title: "Customer acquisition cost (CAC)", text: "How much you spend on marketing and sales to win one new customer. If you spend 500 on ads and get 10 customers, your CAC is 50." },
  { terms: ["ltv", "lifetime value", "clv"], title: "Lifetime value (LTV)", text: "The total profit you expect from one customer over the whole time they stay with you. A healthy business earns at least 3× its CAC in LTV." },
  { terms: ["churn"], title: "Churn", text: "The share of customers who stop paying each month. 5% monthly churn means you lose about 1 in 20 subscribers every month." },
  { terms: ["gross margin", "margin"], title: "Gross margin", text: "The percentage of each sale left after paying the direct cost of making it. Sell for 20, it costs 8 to make → 12 profit → 60% gross margin." },
  { terms: ["markup"], title: "Markup", text: "Profit as a percentage of cost (not price). Cost 10, price 15 → 50% markup, but only a 33% margin." },
  { terms: ["tam", "sam", "som", "market size"], title: "TAM, SAM and SOM", text: "TAM = everyone who could ever buy this. SAM = the part you can actually reach with your product and location. SOM = the slice you can realistically win in the first few years." },
  { terms: ["mvp", "minimum viable product"], title: "Minimum viable product (MVP)", text: "The simplest version of your product that real customers will use or pay for. It exists to learn fast, not to be perfect." },
  { terms: ["cash flow", "cashflow"], title: "Cash flow", text: "Money moving in and out of the business each month. You can be profitable on paper and still run out of cash if customers pay late or costs come first." },
  { terms: ["runway", "burn"], title: "Runway and burn rate", text: "Burn rate is how much cash you lose per month. Runway is how many months until the cash runs out at that rate." },
  { terms: ["swot"], title: "SWOT analysis", text: "Strengths and Weaknesses (inside your business) plus Opportunities and Threats (outside it). A quick way to see where you stand." },
  { terms: ["value proposition", "uvp", "usp"], title: "Value proposition", text: "One clear sentence on why a customer should choose you: who it's for, the problem it solves, and why it's better than the alternatives." },
  { terms: ["fixed cost", "variable cost"], title: "Fixed vs. variable costs", text: "Fixed costs stay the same no matter how much you sell (rent, software). Variable costs grow with each sale (ingredients, packaging, shipping)." },
  { terms: ["llc", "sole proprietor", "legal structure"], title: "Legal structure", text: "How the business is registered. A sole proprietorship is simplest; an LLC protects your personal belongings if the business is sued. Rules vary by place — check with a local accountant or business office." },
  { terms: ["pivot"], title: "Pivot", text: "Changing a key part of your plan — customer, product or pricing — because evidence shows the original idea isn't working." },
  { terms: ["persona"], title: "Customer persona", text: "A made-up but realistic profile of your ideal customer, used to make product and marketing decisions concrete." },
];

/** Matches words at a word start, so "ad" matches "ads" but not "ready". */
const has = (q: string, words: string[]) => words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(q));

export function offlineAnswer(p: Project, question: string): string {
  const q = question.toLowerCase();
  const name = businessName(p);
  const cur = p.profile.currency;
  const proj = projectionFor(p);
  const risks = sectionData(p, "risks");
  const mk = sectionData(p, "marketing");
  const comp = sectionData(p, "competition");
  const company = sectionData(p, "company");
  const fin = sectionData(p, "financials");
  const t = today();
  const parts: string[] = [];

  // 1. Explain a term
  const term = GLOSSARY.find((g) => has(q, g.terms));
  const wantsExplain = has(q, ["what is", "what's", "what does", "explain", "mean", "define", "meaning"]);
  if (term && (wantsExplain || q.split(" ").length <= 4)) {
    parts.push(`**${term.title}** — ${term.text}`);
    if (term.terms.includes("break-even") && proj) {
      parts.push(proj.breakEvenMonth ? `For ${name}, the model shows your first profitable month is **month ${proj.breakEvenMonth}**.` : `For ${name}, the current model **doesn't break even within 36 months** — try raising your price or lowering fixed costs on the Money page.`);
    }
    if (term.terms.includes("cac") && fin) parts.push(`Your plan estimates a CAC of about **${money(fin.unitEconomics.cac, cur, false)}**.`);
    if (term.terms.includes("ltv") && fin) parts.push(`Your plan estimates an LTV of about **${money(fin.unitEconomics.ltv, cur, false)}**${fin.unitEconomics.cac ? ` — that's ${(fin.unitEconomics.ltv / fin.unitEconomics.cac).toFixed(1)}× your CAC` : ""}.`);
    return parts.join("\n\n");
  }

  // 2. Money questions
  if (has(q, ["number", "numbers", "earn", "income", "money", "profit", "revenue", "break", "cash", "price", "pricing", "charge", "cost", "expens", "financ", "fund", "invest", "loan", "raise", "afford", "budget"])) {
    if (!proj) return `I don't have numbers for ${name} yet. Open **Money** and either generate the Financial Plan or start a blank model — then ask me again.`;
    const y1 = proj.years[0];
    parts.push(`**${name}'s numbers (from your model):**`);
    parts.push(
      [
        `- Startup costs: **${money(proj.startupCosts, cur, false)}**`,
        `- Year 1 revenue: **${money(y1.revenue, cur)}** with a ${y1.grossMarginPct.toFixed(0)}% gross margin`,
        `- Year 1 profit/loss: **${money(y1.netIncome, cur)}**`,
        `- Break-even: ${proj.breakEvenMonth ? `**month ${proj.breakEvenMonth}**` : "**not within 36 months**"}`,
        `- Funding gap: ${proj.fundingGap > 0 ? `**${money(proj.fundingGap, cur)}** — cash dips lowest in month ${proj.lowestCashMonth || 1}` : "**none** — cash stays positive"}`,
      ].join("\n"),
    );
    if (has(q, ["price", "pricing", "charge"])) {
      const s = p.finance?.assumptions.revenueStreams[0];
      if (s) parts.push(`Your main price is **${money(s.price, cur, false)}** (${s.kind === "recurring" ? "per month" : "per order"}). Use the **Pricing calculator** on the Money page to test a target margin, and compare with competitor prices you've verified.`);
      if (fin?.pricingRationale) parts.push(`Plan reasoning: ${fin.pricingRationale}`);
    }
    if (has(q, ["fund", "invest", "loan", "raise"]) && fin) parts.push(`Suggested funding approach: **${fin.fundingStrategy.instrument}** — ${fin.fundingStrategy.rationale}`);
    parts.push(proj.fundingGap > 0 || !proj.breakEvenMonth ? "**Next step:** on the Money page, try a higher price, fewer early fixed costs, or a slower hiring plan and watch the cash line recover." : "**Next step:** test the riskiest number — usually how many customers you'll win each month — with a small real-world experiment.");
    return parts.join("\n\n");
  }

  // 3. Risk questions
  if (has(q, ["risk", "wrong", "fail", "weak", "worry", "danger", "assumption", "validate", "test"])) {
    if (!risks) return `Generate the **Risk & Validation** section in your Business Plan first — then I can walk you through ${name}'s biggest risks and how to test them cheaply.`;
    parts.push(`**Honest take:** ${risks.candidAssessment}`);
    const top = [...risks.risks].sort((a, b) => (b.impact === "high" ? 2 : 1) - (a.impact === "high" ? 2 : 1)).slice(0, 3);
    parts.push(`**Top risks:**\n${top.map((r) => `- **${r.risk}** (${r.likelihood} likelihood) — ${r.mitigation}`).join("\n")}`);
    const a = risks.criticalAssumptions[0];
    if (a) parts.push(`**Test this first:** “${a.assumption}”\n- Experiment: ${a.experiment}\n- You pass if: ${a.successMetric}\n- Rough cost: ${a.estimatedCost}`);
    return parts.join("\n\n");
  }

  // 4. Customers & marketing
  if (has(q, ["customer", "market", "ad", "ads", "advertis", "social", "instagram", "tiktok", "promot", "sell", "sales", "audience", "brand", "grow", "first 10"])) {
    const audience = mk?.idealCustomerProfiles[0]?.name || p.profile.audience;
    if (audience) parts.push(`**Who to target first:** ${audience}.`);
    if (mk) {
      parts.push(`**Your positioning:** ${mk.positioning}`);
      parts.push(`**Best channels in your plan:**\n${[...mk.channels].sort((a, b) => b.budgetPct - a.budgetPct).slice(0, 3).map((c) => `- **${c.channel}** (${c.budgetPct}% of budget) — ${c.rationale} Track: ${c.kpi}.`).join("\n")}`);
    }
    parts.push("**Getting your first 10 customers:**\n- Make a list of 30 people who fit your target customer and contact them personally\n- Offer a small founder discount in exchange for honest feedback\n- Ask every happy customer for one referral\n- Post where your customers already spend time, at least twice a week");
    parts.push("Open the **Ad Creator** to make ready-to-post ads and social content for any platform.");
    return parts.join("\n\n");
  }

  // 5. Competition
  if (has(q, ["compet", "rival", "different", "unique", "better than", "stand out"])) {
    if (!comp) return `Generate the **Competitive Analysis** section in your Business Plan and I'll summarize who you're up against.`;
    parts.push(comp.landscape);
    parts.push(`**How to stand out:**\n${comp.differentiation.map((d) => `- ${d}`).join("\n")}`);
    if (company) parts.push(`**Your value proposition:** ${company.uniqueValueProposition}`);
    if (comp.competitors.some((c) => !c.isNamedCompany)) parts.push("Some competitors are illustrative categories — confirm real local competitors and their prices in **Research**.");
    return parts.join("\n\n");
  }

  // 6. What to do next (default)
  const recs = recommendations(p, `/b/${p.id}`, false).slice(0, 3);
  const next = p.tasks
    .filter((x) => x.status !== "done" && !taskIsLocked(x, p.tasks))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  const { overall } = completion(p);
  parts.push(`**Where ${name} stands:** your plan is **${overall}%** complete.`);
  if (recs.length) parts.push(`**Most important right now:**\n${recs.map((r) => `- **${r.title}** — ${r.detail}`).join("\n")}`);
  if (next.length) parts.push(`**Next tasks:**\n${next.map((x) => `- ${x.title} — due ${formatDate(x.dueDate)}${x.dueDate < t ? " (overdue)" : ""}`).join("\n")}`);
  if (!recs.length && !next.length) parts.push("Start by generating your Business Plan — everything else builds on it.");
  parts.push("You can also ask me about **your numbers**, **your biggest risks**, **finding customers**, **competitors**, or to **explain a term** like break-even, CAC or churn.");
  return parts.join("\n\n");
}
