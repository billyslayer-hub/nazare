"use client";

import clsx from "clsx";
import { Download, HelpCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Button, Card, CardHeader, ConfirmModal, ErrorNotice, Field, Input, Select, Textarea } from "@/components/ui";
import { download, generateBlueprint, slug } from "@/lib/client";
import { businessName } from "@/lib/project";
import { PROFILE_FIELDS, STAGES, profileSchema, type Profile, type ProfileField } from "@/lib/schemas";
import { deleteProject, exportProjectJson, updateProject } from "@/lib/store";

const LONG: ProfileField[] = ["offering", "audience", "goals", "team", "constraints"];

export default function ProfilePage() {
  const { project } = useWorkspace();
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<Profile>(project.profile);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(project.profile);
  const hasSections = Object.keys(project.sections).length > 0;

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleUnknown = (k: ProfileField) => setDraft((d) => ({ ...d, unknowns: d.unknowns.includes(k) ? d.unknowns.filter((x) => x !== k) : [...d.unknowns, k] }));

  const save = () => {
    const parsed = profileSchema.safeParse(draft);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError("");
    updateProject(project.id, (p) => ({ ...p, profile: parsed.data }));
    setSaved(true);
    toast("Profile saved. Every module now uses the updated details.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business profile"
        title="The facts every module uses"
        description="This profile is the single source of truth for your blueprint, marketing, research and advisor. Update it any time, then regenerate the sections you want refreshed."
        actions={<Button onClick={save} disabled={!dirty}><Save className="size-4" />Save profile</Button>}
      />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {saved && !dirty && hasSections && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-wave-200 bg-wave-50 px-4 py-3 text-sm text-wave-900 sm:flex-row sm:items-center">
          <span className="flex-1">Existing sections were written with your previous profile. Regenerate to apply your changes — earlier versions stay in each section&apos;s history.</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirmRegen(true)}><RefreshCw className="size-3.5" />Regenerate blueprint</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Business details" description="Mark anything you're unsure about as “I don't know yet” — the AI will propose a labelled assumption." />
          <div className="space-y-5 p-5">
            <Field label="The idea, in your words"><Textarea rows={4} value={draft.idea} onChange={(e) => set("idea", e.target.value)} maxLength={4000} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Stage"><Select value={draft.stage} onChange={(e) => set("stage", e.target.value as Profile["stage"])}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
              <Field label="Currency"><Select value={draft.currency} onChange={(e) => set("currency", e.target.value)}>{["USD", "EUR", "GBP", "CAD", "AUD", "INR", "NGN", "BRL", "MXN", "JPY", "SGD", "ZAR"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {(Object.entries(PROFILE_FIELDS) as [ProfileField, string][]).map(([key, label]) => {
                const unknown = draft.unknowns.includes(key);
                const long = LONG.includes(key);
                return (
                  <div key={key} className={long ? "sm:col-span-2" : undefined}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <button type="button" onClick={() => toggleUnknown(key)} className={clsx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", unknown ? "bg-violet-50 text-violet-700" : "text-slate-400 hover:bg-slate-100")}>
                        <HelpCircle className="size-3.5" />{unknown ? "AI will suggest" : "I don't know yet"}
                      </button>
                    </div>
                    {long ? (
                      <Textarea rows={2} disabled={unknown} value={draft[key]} onChange={(e) => set(key, e.target.value)} maxLength={400} />
                    ) : (
                      <Input disabled={unknown} value={draft[key]} onChange={(e) => set(key, e.target.value)} maxLength={key === "name" ? 80 : 160} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Clarifications" description="Answers from onboarding. Edit or add more context." />
            <div className="space-y-4 p-5">
              {draft.clarifications.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
              {draft.clarifications.map((c, i) => (
                <div key={i} className="space-y-1.5">
                  <Input value={c.question} onChange={(e) => set("clarifications", draft.clarifications.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} className="h-9 text-xs font-medium" maxLength={400} />
                  <div className="flex gap-2">
                    <Textarea rows={2} value={c.answer} onChange={(e) => set("clarifications", draft.clarifications.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} maxLength={1000} />
                    <button onClick={() => set("clarifications", draft.clarifications.filter((_, j) => j !== i))} className="self-start rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
              {draft.clarifications.length < 8 && (
                <button onClick={() => set("clarifications", [...draft.clarifications, { question: "Additional context", answer: "" }])} className="text-xs font-medium text-wave-700 hover:underline">+ Add context</button>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Your data" description="Stored only in this browser. Back it up or move it with an export." />
            <div className="space-y-2 p-5">
              <Button variant="secondary" className="w-full" onClick={() => { download(`${slug(businessName(project))}.nazare.json`, exportProjectJson(project), "application/json"); toast("Backup downloaded."); }}><Download className="size-4" />Export project backup</Button>
              <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete this business</Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal open={confirmRegen} onClose={() => setConfirmRegen(false)} title="Regenerate the blueprint?" confirmLabel="Regenerate" body="All eight sections will be rewritten with your updated profile. Current versions, including edits, remain in each section's history." onConfirm={() => { generateBlueprint(project.id, false); toast("Regenerating your blueprint…", "info"); }} />
      <ConfirmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${businessName(project)}?`} body="This permanently deletes the plan, financial model, assets, research and tasks from this browser." onConfirm={() => { deleteProject(project.id); router.push("/"); }} />
    </div>
  );
}
