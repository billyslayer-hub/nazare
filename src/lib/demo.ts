import type { Asset, Followups, Profile, SectionData, SectionKey, StudioRequest } from "./schemas";

/**
 * Demo mode: used only when no Anthropic credentials are configured.
 * Content is templated from the founder's profile so every screen can be
 * explored, and the UI labels it "Sample content" everywhere it appears.
 * It contains no real market data, no named competitors and no sources.
 */

function words(idea: string) {
  const stop = new Set(["that", "with", "which", "help", "helps", "want", "build", "from", "their", "they", "this", "into", "your", "for", "and", "the"]);
  return idea.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
}

export function demoName(p: Profile) {
  if (p.name) return p.name;
  const w = words(p.idea)[0] ?? "venture";
  return w.charAt(0).toUpperCase() + w.slice(1, 7) + ["ly", "hub", "wise", "nest", "co"][w.length % 5];
}

function c(p: Profile) {
  return {
    name: demoName(p),
    audience: p.audience || "early adopters in your niche",
    industry: p.industry || "your industry",
    location: p.location || "your launch market",
    offering: p.offering || p.idea.split(/[.!?]/)[0],
  };
}

/** Reads the first amount in strings like "12,000", "$10k–$50k" or "Under $1k" (lower bound, to stay conservative). */
function parseCapital(capital: string): number {
  const m = /([0-9][0-9,]*(?:\.[0-9]+)?)\s*([km])?/i.exec(capital);
  if (!m) return 15000;
  const value = Number(m[1].replace(/,/g, "")) * (m[2]?.toLowerCase() === "k" ? 1000 : m[2]?.toLowerCase() === "m" ? 1_000_000 : 1);
  if (/under|less than|</i.test(capital)) return value / 2;
  return value || 15000;
}

const builders: { [K in SectionKey]: (p: Profile) => SectionData[K] } = {
  company: (p) => {
    const x = c(p);
    return {
      suggestedNames: p.name ? [] : [x.name, `${x.name} Studio`, `${x.name} Labs`],
      mission: `Help ${x.audience} get better results with less time, cost and guesswork.`,
      vision: `Become the go-to choice for ${x.audience} in ${x.location}, then expand to adjacent markets.`,
      overview: `${x.name} offers ${x.offering.charAt(0).toLowerCase() + x.offering.slice(1)} for ${x.audience}. It starts lean in ${x.location}, proves demand with a small group of paying customers, then grows through referrals and partnerships.`,
      offerings: [
        { name: "Core offer", description: x.offering, pricing: p.pricing || "Sample: 39 per month" },
        { name: "Premium package", description: "Done-for-you setup and priority support", pricing: "Sample: 249 one-time" },
      ],
      customerProblem: `${x.audience} rely on fragmented, manual or expensive options that were not designed for them.`,
      uniqueValueProposition: `Built specifically for ${x.audience}: simpler, faster to start, and priced for small budgets.`,
      businessModel: {
        summary: "Recurring revenue from the core offer, plus one-time premium packages.",
        revenueStreams: [
          { name: "Core subscription", description: "Monthly access to the core offer", pricingModel: "Monthly subscription" },
          { name: "Premium setup", description: "Optional onboarding service", pricingModel: "One-time fee" },
        ],
      },
      legalStructure: {
        suggestion: "Sole proprietorship or single-member LLC to start",
        rationale: "Low setup cost and simple administration while revenue is small; an LLC adds liability protection. Rules differ by location — confirm with a local accountant or lawyer.",
        alternatives: ["Partnership (if co-founders)", "Corporation (if raising equity)"],
      },
      shortTermObjectives: ["Interview 20 potential customers", "Sign 10 paying pilot customers", "Reach a repeatable acquisition channel"],
      longTermObjectives: ["Reach profitability", "Expand to a second customer segment", "Build a small, focused team"],
    };
  },
  market: (p) => {
    const x = c(p);
    return {
      industryOverview: `Sample content. The ${x.industry} market should be researched with live sources before decisions are made. This section shows the structure the analysis will follow.`,
      segments: [
        { name: x.audience, priority: "primary", description: "The first group to target — most pain, easiest to reach.", needs: ["Save time", "Predictable cost"], painPoints: ["Current options are complex", "Hard to see results"] },
        { name: "Small teams and businesses", priority: "secondary", description: "Buyers with a shared budget and more complex needs.", needs: ["Collaboration", "Reporting"], painPoints: ["Coordination overhead"] },
      ],
      demandHypotheses: [
        { hypothesis: `${x.audience} will pay for a simpler solution`, evidence: "hypothesis", howToValidate: "Pre-sell to 10 people from customer interviews" },
        { hypothesis: "Word-of-mouth can drive a large share of early signups", evidence: "hypothesis", howToValidate: "Track referral source on every signup" },
      ],
      marketSize: {
        approach: "Sample only. Real sizing multiplies the number of reachable customers by realistic annual spend, using cited data from the Research workspace.",
        tam: { value: 0, label: "Not estimated in demo mode" },
        sam: { value: 0, label: "Not estimated in demo mode" },
        som: { value: 0, label: "Not estimated in demo mode" },
        evidence: "hypothesis",
        caveats: "No market data is shown in demo mode. Connect an AI key and run research to estimate market size.",
      },
      trends: [{ trend: "Trends require live research", relevance: "Use the Research workspace to find sourced trends.", evidence: "hypothesis" }],
      geographicConsiderations: [`Check licensing, taxes and customer habits specific to ${x.location}.`],
      barriersToEntry: ["Building trust as a new brand", "Customer switching costs"],
      uncertainties: ["How many customers will pay, and how much", "Which channel acquires customers most cheaply"],
    };
  },
  competition: () => ({
    landscape: "Sample content. Competitors below are illustrative categories, not real companies. Use the Research workspace to identify actual competitors.",
    competitors: [
      { name: "Established all-in-one providers", category: "direct", isNamedCompany: false, positioning: "Broad feature set for larger customers", pricing: "Unknown — verify", strengths: ["Brand trust", "Breadth"], weaknesses: ["Complex", "Costly for small buyers"] },
      { name: "Niche specialists", category: "direct", isNamedCompany: false, positioning: "Focused tools for adjacent niches", pricing: "Unknown — verify", strengths: ["Modern experience"], weaknesses: ["Not tailored to this audience"] },
      { name: "Freelancers and agencies", category: "indirect", isNamedCompany: false, positioning: "Done-for-you services", pricing: "Unknown — verify", strengths: ["Hands-off for the customer"], weaknesses: ["Expensive", "Slow"] },
      { name: "DIY with spreadsheets and email", category: "substitute", isNamedCompany: false, positioning: "Free, manual workaround", pricing: "Free", strengths: ["Familiar"], weaknesses: ["Time-consuming", "Error-prone"] },
    ],
    matrix: {
      criteria: ["Ease of use", "Price", "Fit for audience", "Support", "Speed to results"],
      rows: [
        { name: "Established all-in-one providers", scores: [2, 2, 2, 4, 3] },
        { name: "Niche specialists", scores: [4, 3, 3, 3, 3] },
        { name: "Freelancers and agencies", scores: [4, 1, 3, 4, 2] },
        { name: "DIY with spreadsheets and email", scores: [3, 5, 2, 1, 1] },
        { name: "You", scores: [4, 4, 5, 4, 4] },
      ],
    },
    marketGaps: ["No option designed specifically for this audience", "Affordable support for beginners"],
    differentiation: ["Own one narrow niche deeply before broadening", "Make onboarding take minutes, not days"],
  }),
  execution: (p) => {
    const x = c(p);
    return {
      setupRequirements: [
        { item: "Register the business", details: `Choose a structure and register in ${x.location}.`, needsProfessionalAdvice: true },
        { item: "Business bank account", details: "Keep business and personal money separate.", needsProfessionalAdvice: false },
        { item: "Licenses, permits and insurance", details: "Requirements depend on industry and location.", needsProfessionalAdvice: true },
      ],
      productDevelopment: "Build the smallest version that solves the core problem, test it with pilot customers, and improve weekly.",
      operations: "Founder handles delivery and support at first, using simple tools and documented checklists.",
      suppliersAndResources: ["Payment processor", "Website builder", "Customer support inbox", "Accounting software"],
      staffing: "Founder-led to start; add part-time help once revenue covers it.",
      distribution: "Online, direct to customer.",
      customerAcquisition: "Founder-led outreach, community partnerships and content, then paid ads once conversion is proven.",
      launchStrategy: "Soft launch with pilot customers, then a public launch backed by a waitlist and referral offer.",
      milestones: [
        { title: "Problem validated", week: 3, successCriteria: "15+ interviews, clear top pain" },
        { title: "First paying customer", week: 6, successCriteria: "1+ customer pays full price" },
        { title: "Public launch", week: 10, successCriteria: "Launch campaign live" },
        { title: "25 customers", week: 16, successCriteria: "25 paying customers, churn < 5%" },
      ],
      dependencies: ["Business registration before taking payments", "MVP ready before public launch"],
      tasks: [
        { title: "Interview 15 potential customers", description: "Use a consistent script; record pains and current spending.", stage: "Validate the idea", priority: "high", week: 1, dependsOn: [] },
        { title: "Write down your riskiest assumptions", description: "List the 3 beliefs that would break the plan if wrong.", stage: "Validate the idea", priority: "high", week: 1, dependsOn: [] },
        { title: "Map 5 alternatives customers use today", description: "Note price, strengths and complaints for each.", stage: "Research the market", priority: "medium", week: 2, dependsOn: [] },
        { title: "Run a waitlist landing page test", description: "Measure visitor-to-signup conversion.", stage: "Research the market", priority: "high", week: 2, dependsOn: ["Interview 15 potential customers"] },
        { title: "Define the MVP scope", description: "Choose must-have features from interview insights.", stage: "Develop the offering", priority: "high", week: 3, dependsOn: ["Interview 15 potential customers"] },
        { title: "Build the MVP", description: "Ship the smallest usable version.", stage: "Develop the offering", priority: "high", week: 5, dependsOn: ["Define the MVP scope"] },
        { title: "Register the business", description: `Register in ${x.location}; ask an accountant about the right structure.`, stage: "Establish the business", priority: "medium", week: 3, dependsOn: [] },
        { title: "Open a business bank account", description: "Separate business and personal finances.", stage: "Establish the business", priority: "medium", week: 4, dependsOn: ["Register the business"] },
        { title: "Set up payments", description: "Connect a payment processor and test checkout.", stage: "Establish the business", priority: "medium", week: 5, dependsOn: ["Open a business bank account"] },
        { title: "Create launch content", description: "Prepare posts, emails and visuals in the Marketing Studio.", stage: "Prepare marketing & sales", priority: "medium", week: 7, dependsOn: [] },
        { title: "Recruit 5 pilot customers", description: "Offer founder pricing in exchange for feedback.", stage: "Prepare marketing & sales", priority: "high", week: 6, dependsOn: ["Build the MVP"] },
        { title: "Public launch", description: "Announce to the waitlist and partner communities.", stage: "Launch", priority: "high", week: 10, dependsOn: ["Recruit 5 pilot customers", "Set up payments"] },
        { title: "Start a referral offer", description: "Reward customers who bring a friend.", stage: "Launch", priority: "low", week: 11, dependsOn: ["Public launch"] },
        { title: "Review weekly metrics", description: "Track signups, conversion, churn and cash.", stage: "Measure & improve", priority: "medium", week: 12, dependsOn: ["Public launch"] },
      ],
      launchChecklist: ["Business registered", "Bank account open", "Payments tested end to end", "Terms and privacy policy published", "Website live with clear pricing", "Analytics installed", "Support email set up", "Waitlist announcement drafted", "Pilot feedback addressed"],
    };
  },
  marketing: (p) => {
    const x = c(p);
    return {
      idealCustomerProfiles: [{ name: x.audience, description: "Actively looking for a better option and able to decide quickly." }],
      personas: [
        { name: "Sample persona: Alex", age: "28-40", occupation: "Owner-operator", goals: ["Save time", "Grow steadily"], frustrations: ["Tools that need training"], buyingTriggers: ["A bad week with the current solution"], quote: "Illustrative: “I just want something that works on day one.”" },
      ],
      positioning: `For ${x.audience} who are frustrated by complex options, ${x.name} is the simple, affordable choice that delivers results quickly.`,
      messagingPillars: ["Simple from day one", "Built for you", "Fair, transparent pricing"],
      brand: {
        personality: ["Trustworthy", "Warm", "Practical"],
        voice: "Clear and encouraging — like a knowledgeable friend.",
        visualDirection: "Clean layouts, generous whitespace, one confident accent colour.",
        palette: [
          { name: "Ink", hex: "#0A1730" },
          { name: "Wave", hex: "#14AE9B" },
          { name: "Foam", hex: "#ECFDF9" },
          { name: "Sand", hex: "#F4E9D8" },
          { name: "Coral", hex: "#F2795B" },
        ],
      },
      channels: [
        { channel: "Founder-led outreach", type: "direct sales", rationale: "Fastest learning loop for the first customers.", budgetPct: 10, kpi: "Calls booked per week" },
        { channel: "Community partnerships", type: "partnership", rationale: "Borrow trust from groups customers already belong to.", budgetPct: 25, kpi: "Referred signups" },
        { channel: "Short-form social content", type: "organic", rationale: "Low-cost reach while learning which messages resonate.", budgetPct: 30, kpi: "Profile visits to signups" },
        { channel: "Search ads", type: "paid", rationale: "Captures existing demand once the offer converts.", budgetPct: 35, kpi: "Cost per signup" },
      ],
      organicStrategy: "Publish two pieces of helpful content a week answering real customer questions.",
      paidStrategy: "Start with a small test budget on one channel; scale only what beats your target cost per customer.",
      funnel: [
        { stage: "Awareness", goal: "Get discovered", tactics: ["Social content", "Partner posts"], metric: "Reach" },
        { stage: "Interest", goal: "Earn a visit", tactics: ["Clear landing page"], metric: "Visitors" },
        { stage: "Conversion", goal: "Start a trial or purchase", tactics: ["Founder pricing"], metric: "Conversion rate" },
        { stage: "Retention", goal: "Keep customers", tactics: ["Onboarding emails", "Check-ins"], metric: "Monthly churn" },
      ],
      salesProcess: ["Book a short call", "Understand the problem", "Demo the core workflow", "Offer pilot pricing", "Follow up within 48 hours"],
      retention: ["Personal onboarding", "Monthly results summary", "Ask for feedback at day 30"],
      monthlyBudget: 500,
      budgetRationale: "Sample: a small, testable budget appropriate for an early-stage business.",
      campaignObjectives: [{ objective: "Build a launch waitlist", kpi: "Signups", target: "200 in 6 weeks" }],
    };
  },
  financials: (p) => {
    const cash = parseCapital(p.capital);
    return {
      summary: "Sample model with illustrative assumptions. Edit any number in the Financial workspace to see the projections recalculate.",
      assumptions: {
        startingCash: cash,
        revenueStreams: [
          { name: "Core subscription", kind: "recurring", price: 39, startingVolume: 8, monthlyGrowthPct: 8, churnPct: 5, variableCostPct: 15 },
          { name: "Premium setup", kind: "transactional", price: 249, startingVolume: 2, monthlyGrowthPct: 5, churnPct: 0, variableCostPct: 30 },
        ],
        startupCosts: [
          { item: "Registration & legal", cost: 800 },
          { item: "Website & branding", cost: 1500 },
          { item: "Initial product build", cost: 3000 },
        ],
        fixedCosts: [
          { item: "Software & hosting", monthly: 150, startMonth: 1 },
          { item: "Accounting & insurance", monthly: 120, startMonth: 1 },
          { item: "Workspace", monthly: 300, startMonth: 9 },
        ],
        team: [
          { role: "Founder pay", monthly: 0, startMonth: 1 },
          { role: "Part-time assistant", monthly: 1200, startMonth: 7 },
        ],
        marketingMonthly: 500,
        marketingGrowthPct: 3,
      },
      assumptionNotes: [
        { assumption: "Starting cash", basis: p.capital ? "founder-provided" : "estimate", note: p.capital ? "Based on the capital you entered." : "Assumed modest bootstrapped budget." },
        { assumption: "Prices and volumes", basis: "hypothesis", note: "Illustrative sample values — replace with your own." },
      ],
      pricingRationale: "Sample: priced below typical all-in-one options to attract early adopters.",
      unitEconomics: { cac: 60, ltv: 663, notes: "LTV ≈ monthly price × gross margin ÷ monthly churn. Aim for LTV at least 3× CAC." },
      fundingStrategy: {
        instrument: "Bootstrapped from savings and early revenue",
        useOfFunds: [
          { category: "Product", pct: 40 },
          { category: "Marketing", pct: 40 },
          { category: "Operations & buffer", pct: 20 },
        ],
        rationale: "Sample: keep costs low until demand is proven.",
      },
    };
  },
  risks: () => ({
    candidAssessment: "Sample content. A real assessment weighs your specific idea; in demo mode this shows the structure. The most common weakness for early ventures is unproven demand — test willingness to pay before building much.",
    readiness: { score: 40, rationale: "Sample score: demand and pricing are not yet validated." },
    risks: [
      { category: "demand", risk: "Customers like the idea but won't pay", likelihood: "medium", impact: "high", mitigation: "Pre-sell before building" },
      { category: "competitive", risk: "Established players add the same feature", likelihood: "medium", impact: "medium", mitigation: "Own a narrow niche and build relationships" },
      { category: "financial", risk: "Cash runs out before break-even", likelihood: "medium", impact: "high", mitigation: "Keep fixed costs low; review runway monthly" },
      { category: "operational", risk: "Founder becomes the bottleneck", likelihood: "high", impact: "medium", mitigation: "Document processes early" },
      { category: "regulatory", risk: "Missing a required license or permit", likelihood: "low", impact: "high", mitigation: "Check local requirements with a professional" },
    ],
    criticalAssumptions: [
      { assumption: "Target customers will pay the planned price", whyItMatters: "Revenue projections depend on it", experiment: "Pre-sale page with real checkout", successMetric: "5+ pre-orders from 100 visitors", estimatedCost: "Under 100" },
      { assumption: "You can reach customers cheaply", whyItMatters: "High acquisition cost erases profit", experiment: "Small ad test with two messages", successMetric: "Cost per signup under target", estimatedCost: "100-200" },
    ],
    regulatory: [{ area: "Business registration & tax", note: "Requirements vary by location; confirm with a local accountant." }],
    priorityActions: ["Run 15 customer interviews", "Pre-sell to 5 customers", "Confirm legal requirements"],
    professionalAdvice: ["An accountant for structure and tax registration", "A lawyer for contracts and terms if handling customer data"],
  }),
  executive: (p) => {
    const x = c(p);
    return {
      concept: `${x.name}: ${x.offering}.`,
      problem: `${x.audience} lack a simple, affordable option built for them.`,
      solution: "A focused offer that is quick to start and easy to use.",
      targetMarket: `${x.audience} in ${x.location}.`,
      valueProposition: "Simpler, faster and more affordable than the alternatives.",
      revenueModel: "Monthly subscription plus optional premium setup.",
      competitiveAdvantage: "Deep focus on one audience and a faster onboarding experience.",
      keyObjectives: ["Validate demand within 30 days", "Reach 25 paying customers", "Break even"],
      fundingRequirement: "See the Financial workspace for the computed funding requirement.",
      milestones: [
        { milestone: "Problem validated", timeframe: "Week 3" },
        { milestone: "First paying customer", timeframe: "Week 6" },
        { milestone: "Public launch", timeframe: "Week 10" },
      ],
    };
  },
};

export function demoSection<K extends SectionKey>(key: K, profile: Profile): SectionData[K] {
  return builders[key](profile);
}

export function demoFollowups(p: Profile): Followups {
  const q: Followups["questions"] = [];
  if (!p.audience || p.unknowns.includes("audience"))
    q.push({ question: "Who would be the very first person to pay for this?", why: "A narrow first customer makes every other decision easier.", suggestions: ["Busy parents", "Local small businesses", "College students"] });
  if (!p.pricing || p.unknowns.includes("pricing"))
    q.push({ question: "Roughly what would you charge, and how often?", why: "Pricing drives the financial model.", suggestions: ["Under 20 / month", "50-100 per order", "Not sure yet"] });
  q.push({ question: "What do you have that others don't — skills, access, or experience?", why: "Your unfair advantage shapes the strategy.", suggestions: ["Industry experience", "An existing audience", "Technical skills"] });
  if (!p.constraints)
    q.push({ question: "Any constraints we should plan around?", why: "Time, money or location limits change the roadmap.", suggestions: ["Only evenings and weekends", "Must stay under budget", "None"] });
  return { questions: q.slice(0, 4) };
}

export function demoAsset(p: Profile, r: StudioRequest): Asset {
  const x = c(p);
  const variants = Array.from({ length: r.variations }, (_, i) => ({
    label: `Variant ${String.fromCharCode(65 + i)}`,
    headline: [`Meet ${x.name}`, `Built for ${x.audience}`, "Less hassle. Better results.", "Your shortcut starts here", "Try it this week"][i % 5],
    body: `[Sample ${r.assetType.toLowerCase()} for ${r.platform}, ${r.tone.toLowerCase()} tone, goal: ${r.goal.toLowerCase()}.] ${x.offering} — designed for ${r.audience || x.audience}. Connect an AI key to generate real, tailored copy.`,
    cta: r.goal === "Sales" ? "Shop now" : r.goal === "Leads" ? "Book a call" : "Join the waitlist",
    hashtags: r.platform === "Instagram" || r.platform === "TikTok" ? ["smallbusiness", "startup"] : [],
  }));
  return {
    title: `${r.assetType} — ${r.platform} (sample)`,
    strategy: "Sample strategy: lead with the customer's main frustration, then show the simplest path to the outcome.",
    variants,
    creativeBrief: {
      concept: "Before-and-after: the old frustrating way versus the simple new way.",
      visualDirection: "Bright natural light, real-looking people, brand accent colour on the call to action.",
      imagePrompt: `Photorealistic image of a ${x.audience.replace(/s$/, "")} smiling while using ${x.name}, clean modern setting, soft natural light, teal accent colour, shallow depth of field`,
      format: r.platform === "TikTok" ? "9:16 vertical video" : "1080x1350 portrait",
    },
    testIdea: "Test a problem-focused headline against an outcome-focused headline; pick the one with the higher click-through rate after 1,000 impressions each.",
    kpis: ["Click-through rate", "Cost per signup", "Signup conversion rate"],
  };
}
