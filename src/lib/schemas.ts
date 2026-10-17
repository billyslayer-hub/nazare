import { z } from "zod";

/* ================================================================== */
/* Business profile — the single source of truth every module reads  */
/* ================================================================== */

export const STAGES = ["Idea", "Validation", "Pre-launch", "Launched", "Growing"] as const;

export const PROFILE_FIELDS = {
  name: "Business name",
  offering: "Product or service",
  industry: "Industry",
  businessModel: "Business model",
  audience: "Target audience",
  location: "Geographic market",
  capital: "Startup capital / budget",
  pricing: "Pricing",
  goals: "Primary goals",
  team: "Team size & resources",
  constraints: "Constraints",
} as const;
export type ProfileField = keyof typeof PROFILE_FIELDS;

const short = (max = 400) => z.string().trim().max(max).default("");

export const profileSchema = z.object({
  idea: z.string().trim().min(10, "Describe the idea in at least a sentence.").max(4000),
  name: short(80),
  offering: short(),
  industry: short(120),
  businessModel: short(160),
  audience: short(),
  location: short(160),
  stage: z.enum(STAGES).default("Idea"),
  capital: short(120),
  pricing: short(),
  goals: short(),
  team: short(),
  constraints: short(),
  currency: z.string().trim().max(3).default("USD"),
  /** Fields the founder marked "I don't know yet" — the AI proposes starting assumptions. */
  unknowns: z.array(z.string().max(40)).max(20).default([]),
  /** Answers to AI follow-up questions asked during onboarding. */
  clarifications: z
    .array(z.object({ question: z.string().max(400), answer: z.string().max(1000) }))
    .max(8)
    .default([]),
});
export type Profile = z.infer<typeof profileSchema>;

/* ================================================================== */
/* Shared enums                                                        */
/* ================================================================== */

const level = z.enum(["low", "medium", "high"]);
/** How a claim is grounded. The UI always shows this next to the claim. */
const evidence = z
  .enum(["founder-provided", "research-backed", "estimate", "hypothesis"])
  .describe(
    "founder-provided = stated in the profile; research-backed = supported by the research findings supplied in the prompt; estimate = reasoned estimate; hypothesis = needs validation",
  );
export type Evidence = z.infer<typeof evidence>;

export const ROADMAP_STAGES = [
  "Validate the idea",
  "Research the market",
  "Develop the offering",
  "Establish the business",
  "Prepare marketing & sales",
  "Launch",
  "Measure & improve",
] as const;
export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

/* ================================================================== */
/* Blueprint sections (sent to Claude as structured-output schemas)   */
/* ================================================================== */

export const companySchema = z.object({
  suggestedNames: z.array(z.string()).describe("3-5 name ideas if the founder has no name; otherwise empty"),
  mission: z.string(),
  vision: z.string(),
  overview: z.string(),
  offerings: z.array(z.object({ name: z.string(), description: z.string(), pricing: z.string() })),
  customerProblem: z.string(),
  uniqueValueProposition: z.string(),
  businessModel: z.object({
    summary: z.string(),
    revenueStreams: z.array(z.object({ name: z.string(), description: z.string(), pricingModel: z.string() })),
  }),
  legalStructure: z.object({
    suggestion: z.string(),
    rationale: z.string(),
    alternatives: z.array(z.string()),
  }),
  shortTermObjectives: z.array(z.string()),
  longTermObjectives: z.array(z.string()),
});

export const marketSchema = z.object({
  industryOverview: z.string(),
  segments: z.array(
    z.object({
      name: z.string(),
      priority: z.enum(["primary", "secondary", "future"]),
      description: z.string(),
      needs: z.array(z.string()),
      painPoints: z.array(z.string()),
    }),
  ),
  demandHypotheses: z.array(z.object({ hypothesis: z.string(), evidence, howToValidate: z.string() })),
  marketSize: z.object({
    approach: z.string().describe("How the sizing was reasoned, step by step"),
    tam: z.object({ value: z.number(), label: z.string() }),
    sam: z.object({ value: z.number(), label: z.string() }),
    som: z.object({ value: z.number(), label: z.string() }),
    evidence,
    caveats: z.string(),
  }),
  trends: z.array(z.object({ trend: z.string(), relevance: z.string(), evidence })),
  geographicConsiderations: z.array(z.string()),
  barriersToEntry: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export const competitionSchema = z.object({
  landscape: z.string(),
  competitors: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["direct", "indirect", "substitute"]),
      isNamedCompany: z
        .boolean()
        .describe("true only for a real company you are confident exists; false for an illustrative category such as 'Local independent bakeries'"),
      positioning: z.string(),
      pricing: z.string().describe("Use 'Unknown — verify' when not reliably known"),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }),
  ),
  matrix: z.object({
    criteria: z.array(z.string()).describe("4-6 buying criteria"),
    rows: z.array(
      z.object({
        name: z.string().describe("Competitor name, plus one row named exactly 'You'"),
        scores: z.array(z.number()).describe("1-5 per criterion, same order as criteria"),
      }),
    ),
  }),
  marketGaps: z.array(z.string()),
  differentiation: z.array(z.string()),
});

export const executionSchema = z.object({
  setupRequirements: z.array(
    z.object({ item: z.string(), details: z.string(), needsProfessionalAdvice: z.boolean() }),
  ),
  productDevelopment: z.string(),
  operations: z.string(),
  suppliersAndResources: z.array(z.string()),
  staffing: z.string(),
  distribution: z.string(),
  customerAcquisition: z.string(),
  launchStrategy: z.string(),
  milestones: z.array(z.object({ title: z.string(), week: z.number(), successCriteria: z.string() })),
  dependencies: z.array(z.string()),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      stage: z.enum(ROADMAP_STAGES),
      priority: level,
      week: z.number().describe("Target week from today, 1-26"),
      dependsOn: z.array(z.string()).describe("Exact titles of earlier tasks this depends on"),
    }),
  ),
  launchChecklist: z.array(z.string()).describe("8-12 launch-readiness checks specific to this business"),
});

export const marketingPlanSchema = z.object({
  idealCustomerProfiles: z.array(z.object({ name: z.string(), description: z.string() })),
  personas: z.array(
    z.object({
      name: z.string(),
      age: z.string(),
      occupation: z.string(),
      goals: z.array(z.string()),
      frustrations: z.array(z.string()),
      buyingTriggers: z.array(z.string()),
      quote: z.string().describe("Illustrative, not a real quote"),
    }),
  ),
  positioning: z.string(),
  messagingPillars: z.array(z.string()),
  brand: z.object({
    personality: z.array(z.string()),
    voice: z.string(),
    visualDirection: z.string(),
    palette: z.array(z.object({ name: z.string(), hex: z.string().describe("#RRGGBB") })),
  }),
  channels: z.array(
    z.object({
      channel: z.string(),
      type: z.enum(["organic", "paid", "partnership", "direct sales"]),
      rationale: z.string(),
      budgetPct: z.number(),
      kpi: z.string(),
    }),
  ),
  organicStrategy: z.string(),
  paidStrategy: z.string(),
  funnel: z.array(z.object({ stage: z.string(), goal: z.string(), tactics: z.array(z.string()), metric: z.string() })),
  salesProcess: z.array(z.string()),
  retention: z.array(z.string()),
  monthlyBudget: z.number(),
  budgetRationale: z.string(),
  campaignObjectives: z.array(z.object({ objective: z.string(), kpi: z.string(), target: z.string() })),
});

export const financialAssumptionsSchema = z.object({
  startingCash: z.number().describe("Cash available in month 1 before startup costs"),
  revenueStreams: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["recurring", "transactional"]).describe(
        "recurring = subscribers billed monthly; transactional = units/orders sold each month",
      ),
      price: z.number().describe("Monthly price per subscriber, or average order value"),
      startingVolume: z.number().describe("New subscribers or orders in month 1"),
      monthlyGrowthPct: z.number().describe("Month-over-month growth in new volume (%)"),
      churnPct: z.number().describe("Monthly churn % (recurring only; 0 for transactional)"),
      variableCostPct: z.number().describe("Variable cost / COGS as % of revenue"),
    }),
  ),
  startupCosts: z.array(z.object({ item: z.string(), cost: z.number() })),
  fixedCosts: z.array(z.object({ item: z.string(), monthly: z.number(), startMonth: z.number() })),
  team: z.array(z.object({ role: z.string(), monthly: z.number(), startMonth: z.number() })),
  marketingMonthly: z.number(),
  marketingGrowthPct: z.number(),
});
export type FinancialAssumptions = z.infer<typeof financialAssumptionsSchema>;

export const financialPlanSchema = z.object({
  summary: z.string(),
  assumptions: financialAssumptionsSchema,
  assumptionNotes: z.array(z.object({ assumption: z.string(), basis: evidence, note: z.string() })),
  pricingRationale: z.string(),
  unitEconomics: z.object({ cac: z.number(), ltv: z.number(), notes: z.string() }),
  fundingStrategy: z.object({
    instrument: z.string(),
    useOfFunds: z.array(z.object({ category: z.string(), pct: z.number() })),
    rationale: z.string(),
  }),
});

export const riskSchema = z.object({
  candidAssessment: z.string().describe("Honest 3-5 sentence verdict, including the biggest weakness"),
  readiness: z.object({
    score: z.number().describe("0-100 readiness to invest significant money"),
    rationale: z.string(),
  }),
  risks: z.array(
    z.object({
      category: z.enum(["demand", "competitive", "operational", "financial", "regulatory", "team"]),
      risk: z.string(),
      likelihood: level,
      impact: level,
      mitigation: z.string(),
    }),
  ),
  criticalAssumptions: z.array(
    z.object({
      assumption: z.string(),
      whyItMatters: z.string(),
      experiment: z.string(),
      successMetric: z.string(),
      estimatedCost: z.string(),
    }),
  ),
  regulatory: z.array(z.object({ area: z.string(), note: z.string() })),
  priorityActions: z.array(z.string()),
  professionalAdvice: z.array(z.string()).describe("When to involve a lawyer, accountant, insurer, etc."),
});

export const executiveSchema = z.object({
  concept: z.string(),
  problem: z.string(),
  solution: z.string(),
  targetMarket: z.string(),
  valueProposition: z.string(),
  revenueModel: z.string(),
  competitiveAdvantage: z.string(),
  keyObjectives: z.array(z.string()),
  fundingRequirement: z.string(),
  milestones: z.array(z.object({ milestone: z.string(), timeframe: z.string() })),
});

export const sectionSchemas = {
  company: companySchema,
  market: marketSchema,
  competition: competitionSchema,
  execution: executionSchema,
  marketing: marketingPlanSchema,
  financials: financialPlanSchema,
  risks: riskSchema,
  executive: executiveSchema,
} as const;

export type SectionKey = keyof typeof sectionSchemas;
export type SectionData = { [K in SectionKey]: z.infer<(typeof sectionSchemas)[K]> };

export const SECTIONS: { key: SectionKey; letter: string; title: string; blurb: string }[] = [
  { key: "executive", letter: "A", title: "Executive Summary", blurb: "The whole plan on one page." },
  { key: "company", letter: "B", title: "Company Description", blurb: "Mission, offering, model and structure." },
  { key: "market", letter: "C", title: "Market Analysis", blurb: "Segments, demand, sizing and trends." },
  { key: "competition", letter: "D", title: "Competitive Analysis", blurb: "Who else solves this, and your edge." },
  { key: "execution", letter: "E", title: "Execution Plan", blurb: "Setup, operations, milestones and tasks." },
  { key: "marketing", letter: "F", title: "Marketing & Sales", blurb: "Customers, positioning, channels, funnel." },
  { key: "financials", letter: "G", title: "Financial Plan", blurb: "Assumptions, unit economics and funding." },
  { key: "risks", letter: "H", title: "Risk & Validation", blurb: "What could go wrong and how to test it." },
];
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

/* ================================================================== */
/* Marketing studio, research, follow-ups                             */
/* ================================================================== */

export const ASSET_TYPES = [
  "Social media post",
  "Paid ad copy",
  "Short-form video script",
  "Promotional email",
  "Landing page copy",
  "Product description",
  "Brand names & slogans",
  "Content calendar",
  "Campaign strategy",
  "A/B test variations",
  "Ad creative brief",
] as const;
export const PLATFORMS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "X", "Google Ads", "YouTube", "Email", "Website", "Any"] as const;
export const TONES = ["Friendly", "Professional", "Bold", "Playful", "Inspirational", "Luxury", "Urgent"] as const;
export const GOALS = ["Awareness", "Waitlist signups", "Leads", "Sales", "Launch announcement", "Retention", "Event promotion"] as const;

export const studioRequestSchema = z.object({
  assetType: z.enum(ASSET_TYPES),
  platform: z.enum(PLATFORMS),
  tone: z.enum(TONES),
  goal: z.enum(GOALS),
  audience: z.string().trim().max(300).default(""),
  budget: z.string().trim().max(80).default(""),
  variations: z.number().int().min(1).max(5).default(3),
  instructions: z.string().trim().max(1000).default(""),
});
export type StudioRequest = z.infer<typeof studioRequestSchema>;

export const assetSchema = z.object({
  title: z.string(),
  strategy: z.string().describe("1-2 sentences on why this approach fits the audience and goal"),
  variants: z.array(
    z.object({
      label: z.string().describe("e.g. 'Variant A', 'Day 3 — Instagram Reel', 'Scene 1'"),
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
      hashtags: z.array(z.string()),
    }),
  ),
  creativeBrief: z.object({
    concept: z.string(),
    visualDirection: z.string(),
    imagePrompt: z.string().describe("A detailed prompt for an external image-generation tool"),
    format: z.string().describe("e.g. 1080x1350 carousel, 9:16 video"),
  }),
  testIdea: z.string().describe("What to A/B test and how to judge the winner"),
  kpis: z.array(z.string()),
});
export type Asset = z.infer<typeof assetSchema>;

export const followupsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      why: z.string().describe("One short line on why this matters"),
      suggestions: z.array(z.string()).describe("2-4 short example answers"),
    }),
  ),
});
export type Followups = z.infer<typeof followupsSchema>;

/** What the model returns in the research structuring step. */
export const researchSynthesisSchema = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      finding: z.string(),
      sourceIds: z.array(z.number()).describe("IDs from the numbered source list that support this finding"),
      whyItMatters: z.string(),
      confidence: level,
      limitations: z.string(),
      howToValidate: z.string(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

export type ResearchSource = { id: number; title: string; url: string; pageAge: string | null };
export type ResearchFinding = {
  finding: string;
  sources: ResearchSource[];
  whyItMatters: string;
  confidence: "low" | "medium" | "high";
  limitations: string;
  howToValidate: string;
};
export type ResearchResult = {
  question: string;
  summary: string;
  findings: ResearchFinding[];
  openQuestions: string[];
  sources: ResearchSource[];
  accessedAt: string;
};

/* ================================================================== */
/* API request bodies                                                  */
/* ================================================================== */

export const contextSchema = z.string().max(40_000).default("");

export const sectionRequestSchema = z.object({
  section: z.enum(SECTION_KEYS as [SectionKey, ...SectionKey[]]),
  profile: profileSchema,
  context: contextSchema,
  instructions: z.string().trim().max(1000).default(""),
});

export const studioBodySchema = z.object({ profile: profileSchema, context: contextSchema, request: studioRequestSchema });
export const researchBodySchema = z.object({
  profile: profileSchema,
  question: z.string().trim().min(5).max(500),
});
export const followupsBodySchema = z.object({ profile: profileSchema });
export const advisorBodySchema = z.object({
  profile: profileSchema,
  context: contextSchema,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(40),
});

export type ApiResult<T> = { ok: true; mode: "ai" | "demo"; data: T } | { ok: false; error: string; code?: string };
