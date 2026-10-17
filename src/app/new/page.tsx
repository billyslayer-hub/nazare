"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, HelpCircle, Lightbulb, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { AiStatusBadge } from "@/components/status-badge";
import { Badge, Button, Card, ErrorNotice, Field, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { generateBlueprint, postJson } from "@/lib/client";
import { STAGES, profileSchema, type Followups, type Profile, type ProfileField } from "@/lib/schemas";
import { createProject } from "@/lib/store";

const EXAMPLES = [
  "A mobile dog-grooming van serving busy pet owners in suburban Austin",
  "An online tutoring service that pairs college students with high schoolers for SAT math",
  "Plant-based meal prep subscription for shift workers at local hospitals",
  "A Shopify app that writes product descriptions for small fashion boutiques",
];

const CAPITAL = ["Under $1k", "$1k–$10k", "$10k–$50k", "$50k–$250k", "$250k+"];

type Draft = Omit<Profile, "clarifications">;

const initial: Draft = {
  idea: "",
  name: "",
  offering: "",
  industry: "",
  businessModel: "",
  audience: "",
  location: "",
  stage: "Idea",
  capital: "",
  pricing: "",
  goals: "",
  team: "",
  constraints: "",
  currency: "USD",
  unknowns: [],
};

const STEPS = ["Your idea", "The essentials", "A few more details", "Quick questions"];

export default function NewBusiness() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial);
  const [followups, setFollowups] = useState<Followups["questions"] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const [qError, setQError] = useState("");
  const [creating, setCreating] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleUnknown = (k: ProfileField) =>
    setDraft((d) => ({ ...d, unknowns: d.unknowns.includes(k) ? d.unknowns.filter((x) => x !== k) : [...d.unknowns, k], [k]: "" }));

  const ideaValid = draft.idea.trim().length >= 10;

  const loadQuestions = async () => {
    setLoadingQs(true);
    setQError("");
    const res = await postJson<Followups>("/api/ai/followups", { profile: { ...draft, clarifications: [] } });
    setLoadingQs(false);
    if (res.ok) {
      setFollowups(res.data.questions);
      setAnswers(res.data.questions.map(() => ""));
    } else setQError(res.error);
  };

  const next = () => {
    if (step === 2 && !followups) loadQuestions();
    setStep((s) => Math.min(3, s + 1));
  };

  const finish = () => {
    setCreating(true);
    const clarifications = (followups ?? []).map((q, i) => ({ question: q.question, answer: answers[i] ?? "" })).filter((c) => c.answer.trim());
    const profile = profileSchema.parse({ ...draft, clarifications });
    const project = createProject(profile);
    void generateBlueprint(project.id);
    router.push(`/b/${project.id}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <AiStatusBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={clsx("h-1 rounded-full transition-colors", i <= step ? "bg-wave-500" : "bg-slate-200")} />
              <div className={clsx("mt-2 hidden text-xs font-medium sm:block", i === step ? "text-slate-900" : "text-slate-400")}>{s}</div>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="fade-up">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">What&apos;s the business idea you&apos;re ready to bring to life?</h1>
            <p className="mt-3 text-slate-500">Describe it in your own words — what you want to sell, who it&apos;s for, and anything you already know. Rough is fine.</p>
            <Textarea autoFocus rows={6} value={draft.idea} onChange={(e) => set("idea", e.target.value)} placeholder="e.g. I want to start a mobile coffee cart that serves office parks in the mornings…" className="mt-6 text-base" maxLength={4000} />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-xs text-slate-400"><Lightbulb className="size-3.5" />Try:</span>
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => set("idea", e)} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-wave-300 hover:text-wave-700">{e.length > 48 ? `${e.slice(0, 48)}…` : e}</button>
              ))}
            </div>
            <Field label="Business name" hint="Leave blank and we'll suggest some." className="mt-8 max-w-sm">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Optional" maxLength={80} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="fade-up space-y-7">
            <StepTitle title="The essentials" text="Five quick answers. Not sure about something? Choose “I don't know yet” and we'll suggest a starting assumption." />
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-800">Where are you today?</span>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => <Chip key={s} active={draft.stage === s} onClick={() => set("stage", s)}>{s}</Chip>)}
              </div>
            </div>
            <Unknowable field="audience" label="Who is it for?" placeholder="e.g. Dog owners aged 30-55 who work long hours" draft={draft} set={set} toggle={toggleUnknown} />
            <Unknowable field="location" label="Where will you operate?" placeholder="e.g. Austin, TX · Online, US-wide" draft={draft} set={set} toggle={toggleUnknown} />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">How much money can you put in to start?</span>
                <IdkButton active={draft.unknowns.includes("capital")} onClick={() => toggleUnknown("capital")} />
              </div>
              <div className="flex flex-wrap gap-2">
                {CAPITAL.map((c) => <Chip key={c} disabled={draft.unknowns.includes("capital")} active={draft.capital === c} onClick={() => set("capital", c)}>{c}</Chip>)}
              </div>
              <Input className="mt-2 max-w-xs" disabled={draft.unknowns.includes("capital")} value={CAPITAL.includes(draft.capital) ? "" : draft.capital} onChange={(e) => set("capital", e.target.value)} placeholder="Or an exact amount, e.g. 12,000" />
            </div>
            <Unknowable field="pricing" label="Do you know what you'll charge?" placeholder="e.g. $65 per groom · $29/month" draft={draft} set={set} toggle={toggleUnknown} />
          </div>
        )}

        {step === 2 && (
          <div className="fade-up space-y-6">
            <StepTitle title="A few more details" text="All optional — skip anything. You can complete your profile later and regenerate any section." />
            <div className="grid gap-5 sm:grid-cols-2">
              <Unknowable field="industry" label="Industry" placeholder="e.g. Pet services" draft={draft} set={set} toggle={toggleUnknown} />
              <Unknowable field="businessModel" label="Business model" placeholder="e.g. Subscription, per-service, marketplace" draft={draft} set={set} toggle={toggleUnknown} />
              <Unknowable field="team" label="Team & resources" placeholder="e.g. Just me, 15 hrs/week, own a van" draft={draft} set={set} toggle={toggleUnknown} />
              <Field label="Currency">
                <Select value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
                  {["USD", "EUR", "GBP", "CAD", "AUD", "INR", "NGN", "BRL", "MXN", "JPY", "SGD", "ZAR"].map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <Unknowable field="goals" label="What are your goals for the next year?" placeholder="e.g. Replace my salary, reach 100 customers" draft={draft} set={set} toggle={toggleUnknown} textarea />
            <Unknowable field="constraints" label="Any constraints?" placeholder="e.g. Can only work evenings, no debt, must launch by June" draft={draft} set={set} toggle={toggleUnknown} textarea />
          </div>
        )}

        {step === 3 && (
          <div className="fade-up space-y-6">
            <StepTitle title="A few questions from your strategist" text="Answer what you can — these sharpen the plan. Everything is optional." />
            {loadingQs && <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>}
            {qError && <ErrorNotice message={qError} onRetry={loadQuestions} />}
            {followups?.map((q, i) => (
              <Card key={i} className="fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="font-medium text-slate-900">{q.question}</div>
                <div className="mt-1 text-xs text-slate-500">{q.why}</div>
                <Textarea rows={2} className="mt-3" value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Your answer (optional)" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.suggestions.map((s) => (
                    <button key={s} onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? s : x)))} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-wave-50 hover:text-wave-700">{s}</button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="size-4" />Back</Button>
          ) : (
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">Cancel</Link>
          )}
          <div className="flex items-center gap-2">
            {step === 2 && <Button variant="ghost" onClick={next}>Skip</Button>}
            {step < 3 ? (
              <Button size="lg" onClick={next} disabled={!ideaValid}>Continue<ArrowRight className="size-4" /></Button>
            ) : (
              <Button size="lg" onClick={finish} loading={creating} disabled={loadingQs}><Sparkles className="size-4" />Build my blueprint</Button>
            )}
          </div>
        </div>
        {step === 0 && !ideaValid && draft.idea.length > 0 && <p className="mt-2 text-right text-xs text-slate-400">A sentence or two is enough.</p>}
      </main>
    </div>
  );
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-slate-500">{text}</p>
    </div>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={clsx("rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:opacity-40", active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-slate-700 hover:border-slate-300")}>
      {children}
    </button>
  );
}

function IdkButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={clsx("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition", active ? "bg-violet-50 text-violet-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}>
      <HelpCircle className="size-3.5" />
      {active ? "We'll suggest this" : "I don't know yet"}
    </button>
  );
}

function Unknowable({ field, label, placeholder, draft, set, toggle, textarea }: { field: ProfileField; label: string; placeholder: string; draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; toggle: (k: ProfileField) => void; textarea?: boolean }) {
  const unknown = draft.unknowns.includes(field);
  const value = draft[field] as string;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <IdkButton active={unknown} onClick={() => toggle(field)} />
      </div>
      {textarea ? (
        <Textarea rows={2} disabled={unknown} value={value} onChange={(e) => set(field, e.target.value)} placeholder={unknown ? "We'll propose a starting assumption" : placeholder} maxLength={400} />
      ) : (
        <Input disabled={unknown} value={value} onChange={(e) => set(field, e.target.value)} placeholder={unknown ? "We'll propose a starting assumption" : placeholder} maxLength={400} />
      )}
      {unknown && <Badge tone="violet" className="mt-2">Assumption will be clearly labelled</Badge>}
    </div>
  );
}
