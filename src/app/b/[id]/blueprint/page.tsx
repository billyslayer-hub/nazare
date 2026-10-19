"use client";

import clsx from "clsx";
import { CheckCircle2, Circle, Download, History, Loader2, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { SectionView } from "@/components/sections";
import { StructuredEditor, toMarkdown } from "@/components/structured-editor";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, ConfirmModal, CopyButton, ErrorNotice, Modal, Skeleton, Textarea } from "@/components/ui";
import { download, generateBlueprint, generateSection, slug, useGenerating, useSectionJob } from "@/lib/client";
import { businessName, currentVersion, projectionFor, withRestoredVersion, withSectionVersion } from "@/lib/project";
import { SECTIONS, sectionSchemas, type SectionData, type SectionKey } from "@/lib/schemas";
import { updateProject } from "@/lib/store";

const sourceLabel = { ai: "AI generated", demo: "Template draft", edit: "Edited by you", restore: "Restored" } as const;

export default function BlueprintPage() {
  const { project } = useWorkspace();
  const generating = useGenerating(project.id);
  const [confirmAll, setConfirmAll] = useState(false);
  const missing = SECTIONS.filter((s) => !project.sections[s.key]).length;
  const name = businessName(project);

  const downloadMd = () => {
    const md = [`# ${name} — Business Plan`, ""];
    for (const s of SECTIONS) {
      const v = currentVersion(project, s.key);
      if (v) md.push(`## ${s.letter}. ${s.title}`, "", toMarkdown(v.data), "");
    }
    download(`${slug(name)}-blueprint.md`, md.join("\n"), "text/markdown");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business plan"
        title="Your business plan"
        description="Every section is generated from your business profile. Edit anything, regenerate a single section with instructions, or restore an earlier version — other sections are never touched."
        actions={
          <>
            {missing > 0 ? (
              <Button onClick={() => generateBlueprint(project.id)} loading={generating.length > 0}><Sparkles className="size-4" />{missing === SECTIONS.length ? "Create my business plan" : `Create ${missing} missing`}</Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmAll(true)} disabled={generating.length > 0}><RefreshCw className="size-4" />Regenerate all</Button>
            )}
            <Button variant="secondary" onClick={downloadMd} disabled={missing === SECTIONS.length}><Download className="size-4" />Markdown</Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="no-print hidden lg:block" aria-label="Sections">
          <ul className="sticky top-6 space-y-0.5">
            {SECTIONS.map((s) => {
              const done = Boolean(project.sections[s.key]);
              const busy = generating.includes(s.key);
              return (
                <li key={s.key}>
                  <a href={`#${s.key}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900">
                    {busy ? <Loader2 className="size-3.5 animate-spin text-wave-600" /> : done ? <CheckCircle2 className="size-3.5 text-wave-600" /> : <Circle className="size-3.5 text-slate-300" />}
                    <span className="font-display text-xs font-semibold text-slate-400">{s.letter}</span>
                    <span className="truncate">{s.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          {SECTIONS.map((s) => <SectionCard key={s.key} sectionKey={s.key} />)}
        </div>
      </div>
      <ConfirmModal open={confirmAll} onClose={() => setConfirmAll(false)} title="Regenerate every section?" confirmLabel="Regenerate all" body="Each section gets a new version. Your current versions — including your edits — stay in each section's history and can be restored. Tasks you created or started are kept." onConfirm={() => generateBlueprint(project.id, false)} />
    </div>
  );
}

function SectionCard({ sectionKey }: { sectionKey: SectionKey }) {
  const { project } = useWorkspace();
  const toast = useToast();
  const meta = SECTIONS.find((s) => s.key === sectionKey)!;
  const job = useSectionJob(project.id, sectionKey);
  const state = project.sections[sectionKey];
  const version = currentVersion(project, sectionKey);
  const [editing, setEditing] = useState<SectionData[SectionKey] | null>(null);
  const [editError, setEditError] = useState("");
  const [regen, setRegen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [history, setHistory] = useState(false);
  const loading = job?.status === "loading";
  const needsCompany = sectionKey !== "company" && !project.sections.company;

  const save = () => {
    if (!editing) return;
    const parsed = sectionSchemas[sectionKey].safeParse(editing);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setEditError(`Check “${issue.path.join(" › ")}”: ${issue.message}`);
      return;
    }
    updateProject(project.id, (p) => withSectionVersion(p, sectionKey, parsed.data as never, "edit"));
    setEditing(null);
    setEditError("");
    toast(`${meta.title} saved as a new version.`);
  };

  const runRegen = async () => {
    setRegen(false);
    const ok = await generateSection(project.id, sectionKey, instructions.trim());
    setInstructions("");
    if (ok) toast(`${meta.title} regenerated. The previous version is in History.`);
  };

  return (
    <Card id={sectionKey} className="scroll-mt-24 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink-900 font-display text-sm font-semibold text-white">{meta.letter}</span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-slate-900">{meta.title}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {version ? (
                <>
                  <Badge tone={version.source === "demo" ? "amber" : version.source === "edit" ? "sky" : "wave"}>{sourceLabel[version.source]}</Badge>
                  <span>{new Date(version.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                  {state && state.versions.length > 1 && <span>· {state.versions.length} versions</span>}
                </>
              ) : (
                <span>{meta.blurb}</span>
              )}
            </div>
          </div>
        </div>
        {version && !editing && (
          <div className="no-print flex items-center gap-1">
            <CopyButton text={`## ${meta.letter}. ${meta.title}\n\n${toMarkdown(version.data)}`} />
            <Button variant="ghost" size="sm" onClick={() => setHistory(true)}><History className="size-3.5" />History</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(structuredClone(version.data)); setEditError(""); }} disabled={loading}><Pencil className="size-3.5" />Edit</Button>
            <Button variant="secondary" size="sm" onClick={() => setRegen(true)} loading={loading}><RefreshCw className="size-3.5" />Regenerate</Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {job?.status === "error" && <div className="mb-4"><ErrorNotice message={job.error} onRetry={() => generateSection(project.id, sectionKey)} /></div>}
        {loading && !version ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-wave-700"><Loader2 className="size-4 animate-spin" />Writing {meta.title.toLowerCase()}…</div>
            <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-24 w-full" />
          </div>
        ) : editing ? (
          <div>
            <StructuredEditor schema={sectionSchemas[sectionKey]} value={editing} onChange={setEditing} />
            {editError && <div className="mt-4"><ErrorNotice message={editError} /></div>}
            <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex justify-end gap-2 rounded-b-xl border-t border-line bg-white/95 px-5 py-3 backdrop-blur">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save as new version</Button>
            </div>
          </div>
        ) : version ? (
          <div className={clsx("transition-opacity", loading && "opacity-50")}>
            <SectionView section={sectionKey} data={version.data} currency={project.profile.currency} projection={sectionKey === "financials" ? projectionFor(project) : undefined} />
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">{needsCompany ? "Generate the Company Description first — other sections build on it." : "Not generated yet."}</p>
            <Button size="sm" variant="secondary" onClick={() => generateSection(project.id, sectionKey)} disabled={needsCompany}><Sparkles className="size-3.5" />Generate section</Button>
          </div>
        )}
      </div>

      <Modal open={regen} onClose={() => setRegen(false)} title={`Regenerate ${meta.title}`} footer={<><Button variant="secondary" onClick={() => setRegen(false)}>Cancel</Button><Button onClick={runRegen}><RefreshCw className="size-4" />Regenerate</Button></>}>
        <p className="text-sm text-slate-600">Tell the AI what to change, or leave blank for a fresh take. Only this section is replaced; the current version is kept in History{version?.source === "edit" ? " — including your edits" : ""}.</p>
        <Textarea rows={3} className="mt-3" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Assume a premium price point · Focus on B2B customers · Be more conservative" maxLength={1000} />
        {sectionKey === "execution" && <p className="mt-2 text-xs text-slate-500">Roadmap tasks you created or already started are kept; untouched AI tasks are replaced.</p>}
        {sectionKey === "financials" && project.finance?.edited && <p className="mt-2 text-xs text-slate-500">You&apos;ve edited the financial model, so new assumptions will be offered for review rather than overwriting your numbers.</p>}
      </Modal>

      <Modal open={history} onClose={() => setHistory(false)} title={`${meta.title} — version history`}>
        <ul className="divide-y divide-line">
          {state?.versions.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {new Date(v.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {v.id === state.currentId && <Badge tone="wave">Current</Badge>}
                  {i === 0 && v.id !== state.currentId && <Badge>Latest</Badge>}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{sourceLabel[v.source]}{v.note ? ` · ${v.note}` : ""}</div>
              </div>
              {v.id !== state.currentId && (
                <Button size="sm" variant="secondary" onClick={() => { updateProject(project.id, (p) => withRestoredVersion(p, sectionKey, v.id)); setHistory(false); toast("Version restored."); }}>Restore</Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">Up to 15 versions are kept per section.</p>
      </Modal>
    </Card>
  );
}
