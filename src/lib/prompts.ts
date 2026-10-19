import { PROFILE_FIELDS, type Profile, type ProfileField, type SectionKey, type StudioRequest } from "./schemas";

export const SYSTEM_PROMPT = `You are the strategy team inside Paideia, a workspace that helps first-time entrepreneurs and small business owners turn ideas into businesses. You act as a candid startup strategist, market analyst, CFO and growth marketer.

How you work:
- Be specific to this business: its customers, location, budget, stage and constraints. Generic advice that would fit any company is a failure.
- Be candid. Do not cheerlead. Name the weakest parts of the idea and how to test them before the founder spends real money. Never promise success, profitability, funding or demand.
- Never fabricate facts. You have no live web access unless research findings are supplied in the prompt. Do not invent statistics, studies, survey results, customer reviews, quotes from real people, or citations. When you give a number that is not from the founder or the supplied research, it is an estimate: show the reasoning and label it as such.
- Only name a real company as a competitor when you are confident it exists and operates in this space. Otherwise describe a competitor category (for example "Independent local gyms") and mark it as illustrative.
- When the founder marked a field "I don't know yet", propose a sensible starting assumption, say it is an assumption, and explain it simply.
- Explain business terms in plain language a motivated teenager could follow, without talking down to experienced owners.
- Legal, tax, regulatory and insurance points are general educational guidance, not professional advice; say when a professional should be consulted.
- Monetary values are plain numbers in the business's currency (no symbols or separators). Keep each string tight and skimmable.`;

export function profileBlock(p: Profile): string {
  const lines = [`<business_profile>`, `Idea (founder's words): ${p.idea}`, `Stage: ${p.stage}`, `Currency: ${p.currency}`];
  for (const [key, label] of Object.entries(PROFILE_FIELDS) as [ProfileField, string][]) {
    if (p.unknowns.includes(key)) lines.push(`${label}: I don't know yet — propose an assumption`);
    else if (p[key]) lines.push(`${label}: ${p[key]}`);
  }
  for (const c of p.clarifications) {
    if (c.answer.trim()) lines.push(`Q: ${c.question}\nA: ${c.answer}`);
  }
  lines.push(`</business_profile>`);
  return lines.join("\n");
}

const SECTION_BRIEFS: Record<SectionKey, string> = {
  company: `Write the Company Description. If the founder has no business name, suggest 3-5 brandable names and use the strongest one throughout; otherwise leave suggestedNames empty. Cover mission, vision, overview, 1-4 offerings with pricing, the customer problem, the unique value proposition, the business model with 1-4 revenue streams, a suggested legal structure for the stated location (general guidance, with alternatives), and 3-5 short-term (next 6 months) and 3-5 long-term objectives.`,
  market: `Write the Market Analysis: an industry overview; 2-4 customer segments with needs and pain points; 3-5 demand hypotheses with evidence labels and how to validate each; TAM/SAM/SOM with a transparent step-by-step approach, an evidence label and caveats; 3-5 trends; geographic considerations for the stated location; barriers to entry; and the biggest uncertainties that need validation. Use "research-backed" only for claims supported by supplied research findings.`,
  competition: `Write the Competitive Analysis: a landscape summary; 4-7 competitors across direct, indirect and substitute categories (set isNamedCompany honestly, and use "Unknown — verify" for pricing you do not reliably know); a comparison matrix with 4-6 buying criteria, one row per competitor plus a row named exactly "You", scored 1-5; market gaps; and concrete differentiation opportunities.`,
  execution: `Write the Execution Plan: setup requirements (flag those needing professional advice); product/service development; initial operations; suppliers and resources; staffing; distribution and delivery; customer acquisition; launch strategy; 4-6 milestones with target weeks and success criteria; key dependencies; 14-22 concrete tasks spread across all seven roadmap stages, sized for this budget and team, each with a priority, target week and dependencies (by exact task title); and a launch-readiness checklist specific to this business.`,
  marketing: `Write the Marketing & Sales Plan: 1-3 ideal customer profiles; 2-3 personas (quotes are illustrative); a positioning statement; 3-4 messaging pillars; brand direction (personality, voice, visual direction, 5-colour palette); 4-7 channels with type, rationale, budget % summing to 100 and a KPI; organic and paid strategies; a 4-5 stage acquisition funnel; the sales process; retention tactics; a realistic monthly marketing budget for this capital level with rationale; and 3-5 campaign objectives with KPIs and targets.`,
  financials: `Write the Financial Plan inputs. A deterministic engine computes all projections from your assumptions, so make them realistic, coherent and conservative for this stage:
- startingCash reflects the stated capital (if unknown, assume a modest bootstrapped amount and say so).
- 1-3 revenue streams. "recurring" = subscribers (startingVolume = new subscribers in month 1, with churnPct). "transactional" = orders (startingVolume = orders in month 1, price = average order value, churnPct 0). Growth is month-over-month growth in new volume, typically 2-12%.
- 3-7 one-time startup costs, 3-7 monthly fixed costs with start months, a lean team plan (founder pay may be 0), and marketing spend consistent with the marketing plan.
Then: a summary; an assumption note for each important assumption with its evidence basis; pricing rationale; unit economics (CAC, LTV, with a plain-language explanation); and a funding strategy with instrument, use of funds (% summing to 100) and rationale. The company has no historical financials unless the founder said otherwise — do not invent any.`,
  risks: `Write the Risk Assessment & Validation section. Start with a candid assessment that names the single biggest weakness. Give a readiness score (0-100) for investing significant money now, with rationale. List 6-10 risks across demand, competitive, operational, financial, regulatory and team categories with likelihood, impact and mitigation. List 3-6 critical assumptions that could invalidate the model, each with a low-cost experiment, a success metric and estimated cost. Add regulatory considerations for this industry and location, 3-5 priority actions, and when to involve professionals.`,
  executive: `Write the Executive Summary last, as a faithful synthesis of the plan sections supplied below — do not introduce new claims or numbers that are not in them. Use the computed financial snapshot for any figures. Cover concept, problem, solution, target market, value proposition, revenue model, competitive advantage, 3-5 key objectives, the funding requirement, and 4-6 major milestones with timeframes.`,
};

export function sectionPrompt(section: SectionKey, profile: Profile, context: string, instructions: string): string {
  return [
    profileBlock(profile),
    context && `<plan_context>\n${context}\n</plan_context>\nStay consistent with this context (same name, customers, pricing and numbers).`,
    SECTION_BRIEFS[section],
    instructions && `The founder asked for these changes to the previous draft of this section: ${instructions}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function followupPrompt(profile: Profile): string {
  return `${profileBlock(profile)}

Before building the plan, ask the founder 2-4 short follow-up questions that would most change the quality of the blueprint. Focus on genuinely missing or ambiguous information (for example who exactly buys, how they will deliver, pricing intuition, unfair advantages, constraints). Do not ask about anything already answered. Keep questions friendly and jargon-free, and give 2-4 short example answers for each.`;
}

export function studioPrompt(profile: Profile, context: string, r: StudioRequest): string {
  return `${profileBlock(profile)}
${context ? `\n<plan_context>\n${context}\n</plan_context>\n` : ""}
Create marketing content for this business.
- Asset type: ${r.assetType}
- Platform: ${r.platform}
- Tone: ${r.tone}
- Campaign goal: ${r.goal}
- Audience: ${r.audience || "the primary customer segment from the plan"}
- Budget: ${r.budget || "not specified — keep recommendations lean"}
- Number of variations: ${r.variations}
${r.instructions ? `- Extra direction: ${r.instructions}` : ""}

Write ${r.variations} distinct variants that follow the platform's conventions and length limits. For a content calendar, each variant is one scheduled post (label it with day and platform). For a video script, each variant is a complete script with hook, scenes and on-screen text in the body. For brand names & slogans, put the name in headline and slogan in body. Leave cta or hashtags empty when they do not apply. Include a creative brief with a detailed image-generation prompt, an A/B test idea and KPIs. Do not invent testimonials, reviews, statistics or awards.`;
}

export function researchPrompt(profile: Profile, question: string): string {
  return `${profileBlock(profile)}

Research question: ${question}

Use web search to investigate this question for the business above. Prefer primary and reputable sources: government statistics, industry associations, established research firms, company websites and pricing pages, and genuine customer discussions. Run several focused searches. Then write concise research notes: what you found, which source each fact came from (by title and URL), how recent it is, and where the evidence is thin or conflicting. Do not state anything as fact that the sources do not support.`;
}

export function synthesisPrompt(question: string, notes: string, sourceList: string): string {
  return `Research question: ${question}

<research_notes>
${notes}
</research_notes>

<sources>
${sourceList}
</sources>

Turn these notes into structured findings. Every finding must be directly supported by one or more of the numbered sources above — cite them by ID. Leave out anything the sources do not support. Rate confidence honestly (single weak source = low), state limitations, and suggest how the founder could validate each finding further. List the questions the research could not answer.`;
}

export const ADVISOR_SYSTEM = `${SYSTEM_PROMPT}

You are now the founder's Business Advisor in a chat. Answer using their saved business profile and plan context. Reference their actual numbers, customers and tasks. Prefer short, practical answers with a clear next step; use short lists when helpful. If they ask you to change the plan, tell them exactly which section to regenerate and what instruction to give. If you lack information, say what you would need.`;
