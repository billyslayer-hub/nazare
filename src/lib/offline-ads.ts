import type { Asset, Profile, SectionData, StudioRequest } from "./schemas";

/**
 * Offline ad & content engine. Writes platform-aware copy from the business's
 * own profile and plan (name, offer, audience, pain points, value proposition,
 * price) using a library of copywriting templates. Used when no AI key is set.
 * It never invents testimonials, reviews, statistics or awards.
 */

type Plan = { company?: SectionData["company"]; marketing?: SectionData["marketing"]; market?: SectionData["market"] };

const pick = <T,>(arr: T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const trimEnd = (s: string) => s.trim().replace(/[.!?]+$/, "");
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

function context(p: Profile, plan: Plan, r: StudioRequest) {
  const name = p.name || plan.company?.suggestedNames[0] || "our business";
  const offeringRaw = p.offering || plan.company?.offerings[0]?.name || p.idea.split(/[.!?]/)[0];
  const offering = trimEnd(offeringRaw).replace(/^(i want to|we want to|i'd like to)\s+(start|build|create|open|launch)\s+(a|an)\s+/i, "");
  const audience = trimEnd(r.audience || plan.marketing?.idealCustomerProfiles[0]?.name || p.audience || "people like you");
  const loc = p.location && !/online/i.test(p.location) ? trimEnd(p.location) : "";
  // "at the local farmers market" vs "in Austin, TX"
  const location = !loc ? "" : /^(local|the|a|an|my|our|your)\b/i.test(loc) ? `the ${loc.replace(/^(the|a|an)\s+/i, "").toLowerCase()}` : loc;
  const locPhrase = !loc ? "" : location.startsWith("the ") ? ` at ${location}` : ` in ${location}`;
  // Pain points are used inside sentences ("Tired of …?"), so only accept noun phrases.
  const planPain = trimEnd(plan.market?.segments[0]?.painPoints[0] ?? "");
  const pain = planPain && !/\b(are|is|was|were|has|have|can't|cannot|don't|doesn't|won't)\b/i.test(planPain) ? planPain : "options that weren't made for you";
  const uvp = trimEnd(plan.company?.uniqueValueProposition || plan.marketing?.positioning || `${offering} made simple`);
  const price = p.pricing || plan.company?.offerings[0]?.pricing || "";
  const words = `${p.industry} ${offering} ${location}`.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const tags = [...new Set([name.replace(/\W/g, "").toLowerCase(), ...words.slice(0, 4), location ? location.split(/[ ,]/)[0].toLowerCase() : "smallbusiness", "smallbusiness", "shoplocal"])].filter(Boolean).slice(0, 5);
  return { name, offering, audience, location, locPhrase, pain, uvp, price, tags };
}

const CTA: Record<StudioRequest["goal"], string[]> = {
  Awareness: ["Learn more", "See how it works", "Follow along"],
  "Waitlist signups": ["Join the waitlist", "Get early access", "Save my spot"],
  Leads: ["Book a free call", "Get a free quote", "Talk to us"],
  Sales: ["Shop now", "Order today", "Get yours"],
  "Launch announcement": ["Check it out", "Visit us today", "Be one of the first"],
  Retention: ["Book your next visit", "Claim your reward", "Come back soon"],
  "Event promotion": ["RSVP now", "Save your seat", "Get tickets"],
};

const TONE = {
  Friendly: { open: ["Hey there! 👋", "Good news!", "Hi friends!"], close: ["We'd love to meet you.", "Come say hi!", "See you soon 😊"], emoji: true },
  Professional: { open: ["Introducing", "For", "Designed for"], close: ["Learn how we can help.", "We're ready when you are.", "Let's talk."], emoji: false },
  Bold: { open: ["Stop settling.", "Enough is enough.", "It's time."], close: ["No excuses.", "Don't wait.", "Make the move."], emoji: false },
  Playful: { open: ["Plot twist:", "Okay, real talk:", "Psst…"], close: ["You know you want to 😉", "Your future self says thanks 🙌", "Let's make it fun ✨"], emoji: true },
  Inspirational: { open: ["Big things start small.", "Every great story starts somewhere.", "Imagine this:"], close: ["Your next chapter starts here.", "Let's build something great.", "Take the first step."], emoji: false },
  Luxury: { open: ["Crafted for those who notice the details.", "Elevate your everyday.", "Quietly exceptional."], close: ["Experience the difference.", "By invitation, for you.", "Indulge a little."], emoji: false },
  Urgent: { open: ["Last chance!", "Only a few spots left.", "This week only:"], close: ["Act fast.", "Don't miss out.", "Ends soon."], emoji: true },
} as const;

function headlines(c: ReturnType<typeof context>, goal: StudioRequest["goal"]): string[] {
  const loc = c.locPhrase;
  const byGoal: Record<StudioRequest["goal"], string[]> = {
    Awareness: [`Meet ${c.name}`, `${cap(c.offering)}, made simple`, `Made for ${lower(c.audience)}`, `Hello from ${c.name}`],
    "Waitlist signups": [`Be first in line for ${c.name}`, `Something new is coming${loc}`, `Get early access to ${c.name}`],
    Leads: [`Free consultation for ${lower(c.audience)}`, `Get a quote from ${c.name}`, `Let's solve this together`],
    Sales: [`Get ${lower(c.offering)} today`, `${c.name}: worth every penny`, `Treat yourself to ${c.name}`],
    "Launch announcement": [`${c.name} is officially open!`, `We're live${loc}!`, `Say hello to ${c.name}`],
    Retention: [`Thanks for being part of ${c.name}`, `We saved something for you`, `Ready for your next visit?`],
    "Event promotion": [`You're invited by ${c.name}`, `Join us${loc}`, `Save the date with ${c.name}`],
  };
  return byGoal[goal];
}

function bodies(c: ReturnType<typeof context>, r: StudioRequest, i: number): string {
  const tone = TONE[r.tone];
  const price = c.price ? ` Starting at ${c.price}.` : "";
  const extra = r.instructions ? ` ${cap(trimEnd(r.instructions))}.` : "";
  const forms = [
    `${pick([...tone.open], i)} Tired of ${lower(c.pain)}? ${c.name} offers ${lower(c.offering)} for ${lower(c.audience)}.${price}${extra} ${pick([...tone.close], i)}`,
    `${cap(c.uvp)}.${extra} Whether you're new or have tried everything else, ${c.name} makes it easy.${price} ${pick([...tone.close], i + 1)}`,
    `${lower(c.audience) === "people like you" ? "You" : cap(c.audience)} deserve better than ${lower(c.pain)}. That's why we built ${c.name}: ${lower(c.offering)}${c.locPhrase ? `, right here${c.locPhrase}` : ""}.${price}${extra}`,
    `Here's the deal: ${lower(c.offering)}, without the hassle.${price} ${c.name} is built around one idea — ${lower(c.uvp)}.${extra} ${pick([...tone.close], i + 2)}`,
  ];
  return pick(forms, i);
}

function hashtags(c: ReturnType<typeof context>, r: StudioRequest) {
  return ["Instagram", "TikTok", "X", "Facebook", "LinkedIn"].includes(r.platform) ? c.tags.slice(0, r.platform === "LinkedIn" || r.platform === "X" ? 3 : 5) : [];
}

function platformFit(text: string, r: StudioRequest) {
  if (r.platform === "X") return clip(text, 240);
  if (r.platform === "Google Ads") return clip(text, 90);
  return text;
}

export function offlineAsset(p: Profile, plan: Plan, r: StudioRequest, seed = Math.floor(Math.random() * 1000)): Asset {
  const c = context(p, plan, r);
  const ctas = CTA[r.goal];
  const heads = headlines(c, r.goal);
  const n = r.variations;
  const make = (fn: (i: number) => Asset["variants"][number]) => Array.from({ length: n }, (_, k) => fn(seed + k));
  let variants: Asset["variants"];

  switch (r.assetType) {
    case "Short-form video script":
      variants = make((i) => ({
        label: `Script ${String.fromCharCode(65 + ((i - seed) % 26))} · ~20 sec`,
        headline: `Hook: ${pick([`POV: you finally found ${lower(c.offering)} that works`, `Stop scrolling if you're ${lower(c.audience)}`, `3 seconds to change how you think about ${lower(c.offering)}`], i)}`,
        body: `0–3s — HOOK on screen: "${pick(heads, i)}"\n3–8s — PROBLEM: show the frustration of ${lower(c.pain)}.\n8–15s — SOLUTION: show ${c.name} in action. Voiceover: "${cap(c.uvp)}."\n15–20s — CTA: "${pick(ctas, i)}" + ${c.name} logo${c.price ? ` and price (${c.price})` : ""}.\n\nOn-screen text tip: keep each caption under 6 words.`,
        cta: pick(ctas, i),
        hashtags: hashtags(c, r),
      }));
      break;
    case "Promotional email":
      variants = make((i) => ({
        label: `Email ${String.fromCharCode(65 + ((i - seed) % 26))}`,
        headline: `Subject: ${pick(heads, i)}`,
        body: `Hi there,\n\n${bodies(c, r, i)}\n\nHere's what you get:\n• ${cap(c.uvp)}\n• Made for ${lower(c.audience)}\n• Simple to get started${c.price ? `\n• Pricing from ${c.price}` : ""}\n\n${pick(ctas, i)} — just reply to this email or visit our page.\n\nThanks,\nThe ${c.name} team`,
        cta: pick(ctas, i),
        hashtags: [],
      }));
      break;
    case "Landing page copy":
      variants = make((i) => ({
        label: `Hero section ${String.fromCharCode(65 + ((i - seed) % 26))}`,
        headline: pick(heads, i),
        body: `${cap(c.uvp)}.\n\nWHY ${c.name.toUpperCase()}\n• Built for ${lower(c.audience)}\n• No more ${lower(c.pain)}\n• Easy to start${c.price ? ` — from ${c.price}` : ""}\n\nHOW IT WORKS\n1. Tell us what you need\n2. We take care of the rest\n3. Enjoy the result`,
        cta: pick(ctas, i),
        hashtags: [],
      }));
      break;
    case "Product description":
      variants = make((i) => ({
        label: `Description ${String.fromCharCode(65 + ((i - seed) % 26))}`,
        headline: cap(c.offering),
        body: `${bodies(c, r, i)}\n\nPerfect for: ${lower(c.audience)}.${c.price ? `\nPrice: ${c.price}.` : ""}`,
        cta: pick(ctas, i),
        hashtags: [],
      }));
      break;
    case "Brand names & slogans": {
      const base = (p.offering || p.industry || c.offering).split(/\s+/).find((w) => w.length > 3)?.replace(/\W/g, "") || "Nova";
      const names = [c.name, `${cap(base)}ly`, `The ${cap(base)} Co.`, `${cap(base)} & Co.`, `Good ${cap(base)}`, `${cap(base)}Hub`];
      const slogans = [`${cap(c.offering)}, made simple.`, `Made for ${lower(c.audience)}.`, `Less hassle. More ${lower(base)}.`, `${cap(c.uvp)}.`, `Your ${lower(base)}, your way.`];
      variants = make((i) => ({ label: `Option ${(i - seed) + 1}`, headline: pick(names, i - seed), body: pick(slogans, i), cta: "", hashtags: [] }));
      break;
    }
    case "Content calendar": {
      const themes = ["Meet the founder", "Behind the scenes", "Customer problem we solve", "How it works", "Tip of the week", "Launch countdown", "Ask us anything"];
      variants = Array.from({ length: Math.max(n, 5) }, (_, k) => ({
        label: `Day ${k * 2 + 1} · ${r.platform === "Any" ? pick(["Instagram", "TikTok", "Facebook"], k) : r.platform}`,
        headline: pick(themes, seed + k),
        body: `${pick(themes, seed + k)} post: ${bodies(c, r, seed + k)}`,
        cta: pick(ctas, k),
        hashtags: hashtags(c, r),
      }));
      break;
    }
    case "Campaign strategy":
      variants = [
        { label: "Week 1 · Warm up", headline: "Build curiosity", body: `Share the problem (${lower(c.pain)}) and tease ${c.name}. Post 3×, reply to every comment.`, cta: pick(ctas, 0), hashtags: [] },
        { label: "Week 2 · Launch", headline: pick(heads, seed), body: `Announce ${c.name} on ${r.platform === "Any" ? "your top 2 platforms" : r.platform}. ${r.budget ? `Spend part of your ${r.budget} on a small boosted post.` : "Ask 10 friends to share."}`, cta: pick(ctas, 1), hashtags: hashtags(c, r) },
        { label: "Week 3 · Proof", headline: "Show real results", body: "Share early customers' real experiences (with permission) and behind-the-scenes content. Never post made-up reviews.", cta: pick(ctas, 2), hashtags: [] },
        { label: "Week 4 · Push", headline: "Limited-time offer", body: `Run a founder offer for ${lower(c.audience)}. Measure which post drove the most ${r.goal === "Sales" ? "sales" : "signups"} and repeat it.`, cta: pick(ctas, 0), hashtags: [] },
      ].slice(0, Math.max(n, 3));
      break;
    default:
      // Social media post, Paid ad copy, A/B test variations, Ad creative brief
      variants = make((i) => ({
        label: r.assetType === "A/B test variations" ? `Version ${String.fromCharCode(65 + ((i - seed) % 26))}` : `Variant ${String.fromCharCode(65 + ((i - seed) % 26))}`,
        headline: r.platform === "Google Ads" ? clip(pick(heads, i), 30) : pick(heads, i),
        body: platformFit(bodies(c, r, i), r),
        cta: pick(ctas, i),
        hashtags: hashtags(c, r),
      }));
  }

  const vertical = r.platform === "TikTok" || r.assetType === "Short-form video script";
  return {
    title: `${r.assetType} · ${r.platform === "Any" ? "All platforms" : r.platform}`,
    strategy: `Speaks to ${lower(c.audience)} about ${lower(c.pain)}, then leads with your promise — ${lower(c.uvp)} — and a clear “${ctas[0]}” call to action for your ${r.goal.toLowerCase()} goal.`,
    variants,
    creativeBrief: {
      concept: `Before & after: the frustration of ${lower(c.pain)} versus the ease of ${c.name}.`,
      visualDirection: `${r.tone} mood. Real people who look like ${lower(c.audience)}, natural light, one bold headline, brand colors on the call-to-action button.`,
      imagePrompt: `Photo of ${lower(c.audience)} happily enjoying ${lower(c.offering)}${c.locPhrase}, ${r.tone.toLowerCase()} mood, natural light, warm maroon and gold accents, clean background with space for a headline, high quality, realistic`,
      format: vertical ? "1080×1920 vertical (9:16)" : r.platform === "LinkedIn" || r.platform === "Facebook" ? "1200×628 landscape or 1080×1080 square" : "1080×1080 square",
    },
    testIdea: `Run Variant A against Variant B for the same audience and budget. After about 1,000 views each, keep the one with the higher click or signup rate.`,
    kpis: r.goal === "Sales" ? ["Click-through rate", "Cost per sale", "Revenue from the campaign"] : r.goal === "Awareness" ? ["Reach", "Saves & shares", "Profile visits"] : ["Click-through rate", "Signups or leads", "Cost per signup"],
  };
}
