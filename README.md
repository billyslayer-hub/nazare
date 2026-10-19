# Paideia — From idea to launch

Paideia turns a business idea, described in plain English, into a structured business: an eight-section blueprint, a live financial model, a marketing studio, a sourced research workspace, a task-based launch roadmap and a context-aware Business Advisor — in one workspace.

The brand name lives in `src/config/brand.ts` and the logo files in `public/brand/`. Brand colors: maroon `#912F30`, forest `#344840`, gold `#D99A57` (tokens in `src/app/globals.css`).

## Quick start

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for real AI output
npm run dev                  # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the app runs in **offline mode**:

- **Advisor** answers from the business's own saved plan, numbers and tasks, plus a plain-language glossary (labelled "Offline advisor").
- **Ad Creator** writes platform-aware copy from the business details using built-in ad templates and renders downloadable ad images (labelled "Template copy").
- **Money, Tasks, exports** are fully functional (they never needed AI).
- **Business plan sections** are template drafts built from your answers (labelled "Template draft").
- **Live research** is turned off rather than simulated; the research framework and manual finding log still work.

### For a class demo

1. Add an API key (see below) — about $5 of credit covers building and rehearsing.
2. Before class, create the business you'll present so its plan is already generated.
3. During the demo, use **Try an example** or your saved business, then show Money (change the price live), Ad Creator (create and download an ad), Tasks, and ask the Advisor a question.

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | For AI features | Blueprint generation, follow-up questions, marketing studio, live web research, Business Advisor |
| `PAIDEIA_MODEL` | No | Claude model ID. Default `claude-sonnet-5-5` (fast, roughly $0.30–0.80 per full plan); `claude-haiku-5-5` costs a few cents per plan; `claude-opus-5-5` is highest quality (~$1–3) |
| `PAIDEIA_WEB_RESEARCH` | No | Set `off` to disable web research |
| `PAIDEIA_RATE_LIMIT_PER_MIN` | No | Per-IP limit on AI routes (default 150) |

Cost figures are rough estimates; set a monthly spend limit in the Anthropic console.

The key is only read on the server (`src/lib/ai.ts`, marked `server-only`); it never reaches the browser.

## What's in the product

- **Onboarding** — one open prompt, five essentials, optional details, then 2–4 AI follow-up questions. Any field can be marked "I don't know yet"; the AI proposes a labelled assumption instead.
- **Business blueprint (A–H)** — Executive Summary, Company Description, Market Analysis, Competitive Analysis, Execution Plan, Marketing & Sales, Financial Plan, Risk & Validation. Generated in dependency order (company → specialist sections in parallel → risk → executive summary last). Each section can be edited (schema-driven form), regenerated with instructions, copied, and restored from up to 15 versions, without touching other sections.
- **Evidence labels** — claims are tagged *Your input*, *Research-backed*, *Estimate* or *Hypothesis*; competitors not confidently real are marked *Illustrative*; personas and quotes are marked illustrative.
- **Financial workspace** — editable revenue streams (recurring with churn, or transactional), startup costs, fixed costs, payroll and marketing. A deterministic engine (`src/lib/finance.ts`) computes a 36-month P&L and cash flow, break-even, runway and funding gap. Includes conservative/base/optimistic scenarios with editable multipliers, break-even, pricing, margin and funding calculators, annual and monthly statements, and CSV export. The AI only proposes starting assumptions; it never does the arithmetic.
- **Research workspace** — with a key, Claude's web search runs a two-step process: search and notes, then structured findings that must cite the numbered search results. Citations not in the real result set are discarded, so sources cannot be invented. Each finding shows source, published date, access date, why it matters, confidence, limitations and how to validate. Without a key, a research framework and a manual finding log are available. Findings feed back into the Market and Competition sections.
- **Marketing studio** — 11 asset types (social posts, ads, video scripts, emails, landing copy, product descriptions, names & slogans, content calendars, campaign strategies, A/B variations, creative briefs) with platform, tone, goal, audience, budget and variation controls. Every asset includes a creative brief and an image-generation prompt. Save, edit, copy and export to Markdown. Nothing is ever published.
- **Roadmap** — tasks from the Execution Plan across seven stages, with status (to do / in progress / blocked / done), priority, due dates, dependencies (with locks), blocker notes, user-added tasks, milestones and a personalized launch-readiness checklist. Regenerating the plan keeps tasks you created or started.
- **Dashboard** — plan completion, financial snapshot, readiness score, data-driven next actions (overdue tasks, cash shortfalls, untested assumptions, missing sections), priority tasks, milestones, key risks, assumptions to validate and marketing activity.
- **Business Advisor** — streaming chat grounded in the profile, plan, computed financials, tasks and research. History is saved per business.
- **Exports** — printable business plan (Print → Save as PDF), Markdown plan, financial CSV, marketing Markdown, and full project backup/import as JSON.

## Architecture

```
src/
  app/                    Next.js App Router pages and API routes
    api/ai/*              section, followups, studio, research, advisor (server-only AI calls)
    b/[id]/*              workspace: dashboard, blueprint, research, financials, marketing, roadmap, profile, plan
  components/             UI kit, workspace shell, section renderers, schema-driven editor, charts, advisor, ad image preview
  config/brand.ts         product name and copy
  lib/
    schemas.ts            zod schemas: profile, all sections, assets, research, API bodies
    json-schema.ts        zod → structured-output JSON Schema (keeps enums, closes objects)
    ai.ts                 Anthropic SDK calls: structured generation, two-step research, advisor stream
    prompts.ts            system prompt and per-module briefs
    finance.ts            deterministic projection engine and calculators
    project.ts            domain logic: versions, task sync, recommendations, AI context digest
    store.ts              data access layer (localStorage)
    demo.ts               offline template drafts for plan sections
    offline-advisor.ts    offline Advisor answers from saved plan data + glossary
    offline-ads.ts        offline ad/content copywriting templates
```

AI calls use streaming, structured outputs validated with zod on the server, adaptive thinking with per-route effort, typed error handling, and server-side refusal fallbacks (`fallbacks: "default"`).

## Data & privacy

There is no database or login yet. Projects are stored in the browser's `localStorage`, so they are private to that browser and do not sync across devices. Use **Export project backup** to move or keep a copy. Only the business profile and plan context are sent to the AI provider when generating; no personal account data is collected.

To add accounts and cloud persistence (for example Supabase), replace the functions in `src/lib/store.ts` with API calls and add authentication — the UI does not access storage directly.

## Limitations

- No database, authentication or multi-device sync (see above).
- Image generation is not built in; the studio produces image prompts and creative briefs instead.
- The financial model excludes taxes, financing and depreciation.
- Guidance is educational and not legal, tax or financial advice.
