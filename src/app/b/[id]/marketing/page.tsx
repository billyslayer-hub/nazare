"use client";

import { Download, ImageIcon, Megaphone, Pencil, RefreshCw, Save, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import { StructuredEditor } from "@/components/structured-editor";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, CardHeader, ConfirmModal, CopyButton, EmptyState, ErrorNotice, Field, Input, Modal, Select, Skeleton, Textarea } from "@/components/ui";
import { download, postJson, slug } from "@/lib/client";
import { businessName, digest, sectionData } from "@/lib/project";
import { ASSET_TYPES, GOALS, PLATFORMS, TONES, assetSchema, type Asset, type StudioRequest } from "@/lib/schemas";
import { uid, updateProject } from "@/lib/store";
import type { Mode, SavedAsset } from "@/lib/types";

function assetMarkdown(a: Asset, r: StudioRequest) {
  const lines = [`# ${a.title}`, "", `*${r.assetType} · ${r.platform} · ${r.tone} · Goal: ${r.goal}*`, "", a.strategy, ""];
  for (const v of a.variants) {
    lines.push(`## ${v.label}`, "");
    if (v.headline) lines.push(`**${v.headline}**`, "");
    lines.push(v.body, "");
    if (v.cta) lines.push(`CTA: ${v.cta}`, "");
    if (v.hashtags.length) lines.push(v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" "), "");
  }
  lines.push("## Creative brief", "", `**Concept:** ${a.creativeBrief.concept}`, `**Visual direction:** ${a.creativeBrief.visualDirection}`, `**Format:** ${a.creativeBrief.format}`, "", `**Image prompt:** ${a.creativeBrief.imagePrompt}`, "", "## A/B test", "", a.testIdea, "", "## KPIs", "", ...a.kpis.map((k) => `- ${k}`), "");
  return lines.join("\n");
}

const variantText = (v: Asset["variants"][number]) => [v.headline, v.body, v.cta, v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")].filter(Boolean).join("\n\n");

export default function MarketingStudio() {
  const { project } = useWorkspace();
  const toast = useToast();
  const plan = sectionData(project, "marketing");
  const [req, setReq] = useState<StudioRequest>({
    assetType: "Social media post",
    platform: "Instagram",
    tone: "Friendly",
    goal: "Awareness",
    audience: plan?.idealCustomerProfiles[0]?.name ?? project.profile.audience,
    budget: plan ? `${plan.monthlyBudget} ${project.profile.currency}/month` : "",
    variations: 3,
    instructions: "",
  });
  const [draft, setDraft] = useState<{ data: Asset; mode: Mode; request: StudioRequest } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<SavedAsset | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<SavedAsset | null>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    const res = await postJson<Asset>("/api/ai/studio", { profile: project.profile, context: digest(project), request: req });
    setLoading(false);
    if (res.ok) setDraft({ data: res.data, mode: res.mode, request: req });
    else setError(res.error);
  };

  const save = () => {
    if (!draft) return;
    const asset: SavedAsset = { id: uid(), createdAt: new Date().toISOString(), request: draft.request, data: draft.data, mode: draft.mode };
    updateProject(project.id, (p) => ({ ...p, assets: [asset, ...p.assets] }));
    setDraft(null);
    toast("Saved to your asset library.");
  };

  const library = project.assets.filter((a) => typeFilter === "all" || a.request.assetType === typeFilter);
  const exportAll = () => download(`${slug(businessName(project))}-marketing.md`, project.assets.map((a) => assetMarkdown(a.data, a.request)).join("\n---\n\n"), "text/markdown");

  return (
    <div>
      <PageHeader
        eyebrow="Marketing studio"
        title="Create on-brand marketing"
        description="Generate posts, ads, scripts, emails and creative briefs grounded in your positioning, audience and budget. Nothing is published — copy what you like to your own channels."
        actions={project.assets.length > 0 && <Button variant="secondary" onClick={exportAll}><Download className="size-4" />Export library</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit p-5 lg:sticky lg:top-6">
          <div className="space-y-4">
            <Field label="Asset type"><Select value={req.assetType} onChange={(e) => setReq({ ...req, assetType: e.target.value as StudioRequest["assetType"] })}>{ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform"><Select value={req.platform} onChange={(e) => setReq({ ...req, platform: e.target.value as StudioRequest["platform"] })}>{PLATFORMS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Tone"><Select value={req.tone} onChange={(e) => setReq({ ...req, tone: e.target.value as StudioRequest["tone"] })}>{TONES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Campaign goal"><Select value={req.goal} onChange={(e) => setReq({ ...req, goal: e.target.value as StudioRequest["goal"] })}>{GOALS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Variations"><Select value={req.variations} onChange={(e) => setReq({ ...req, variations: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            </div>
            <Field label="Audience"><Input value={req.audience} onChange={(e) => setReq({ ...req, audience: e.target.value })} placeholder="Defaults to your primary segment" maxLength={300} /></Field>
            <Field label="Budget"><Input value={req.budget} onChange={(e) => setReq({ ...req, budget: e.target.value })} placeholder="e.g. 300/month for ads" maxLength={80} /></Field>
            <Field label="Extra direction"><Textarea rows={3} value={req.instructions} onChange={(e) => setReq({ ...req, instructions: e.target.value })} placeholder="e.g. Mention the spring launch offer, avoid jargon" maxLength={1000} /></Field>
            <Button className="w-full" size="lg" onClick={generate} loading={loading}><Wand2 className="size-4" />Generate</Button>
            {!plan && <p className="text-xs text-slate-500">Tip: generate the Marketing & Sales section first so content matches your positioning and voice.</p>}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {error && <ErrorNotice message={error} onRetry={generate} />}
          {loading && !draft && (
            <Card className="space-y-3 p-5"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-2/3" /><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div></Card>
          )}
          {draft && (
            <div className="fade-up">
              <AssetView asset={draft.data} request={draft.request} mode={draft.mode} dim={loading}
                actions={
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
                    <Button size="sm" variant="secondary" onClick={generate} loading={loading}><RefreshCw className="size-3.5" />Regenerate</Button>
                    <Button size="sm" onClick={save}><Save className="size-3.5" />Save</Button>
                  </>
                }
              />
            </div>
          )}
          {!draft && !loading && project.assets.length === 0 && (
            <EmptyState icon={<Megaphone className="size-5" />} title="Your asset library is empty" description="Pick an asset type and platform, then generate. Save the results you like — they appear here for editing, copying and export." />
          )}

          {project.assets.length > 0 && (
            <Card>
              <CardHeader title="Asset library" description={`${project.assets.length} saved`} action={
                <Select className="h-8 w-48 text-xs" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter assets">
                  <option value="all">All types</option>{ASSET_TYPES.filter((t) => project.assets.some((a) => a.request.assetType === t)).map((t) => <option key={t}>{t}</option>)}
                </Select>
              } />
              <ul className="divide-y divide-line">
                {library.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => setOpen(a)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium text-slate-900 hover:text-wave-700">{a.data.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5"><Badge>{a.request.assetType}</Badge><Badge>{a.request.platform}</Badge><Badge>{a.request.goal}</Badge>{a.mode === "demo" && <Badge tone="amber">Sample</Badge>}</div>
                    </button>
                    <span className="hidden text-xs text-slate-400 sm:block">{new Date(a.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => setDeleting(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete asset"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {open && <SavedAssetModal asset={project.assets.find((a) => a.id === open.id) ?? open} onClose={() => setOpen(null)} />}
      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete asset?" body={`“${deleting?.data.title}” will be removed from your library.`} onConfirm={() => { if (deleting) updateProject(project.id, (p) => ({ ...p, assets: p.assets.filter((x) => x.id !== deleting.id) })); toast("Asset deleted."); }} />
    </div>
  );
}

function AssetView({ asset, request, mode, actions, dim }: { asset: Asset; request: StudioRequest; mode: Mode; actions?: React.ReactNode; dim?: boolean }) {
  return (
    <Card className={dim ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900">{asset.title}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5"><Badge>{request.platform}</Badge><Badge>{request.tone}</Badge><Badge>{request.goal}</Badge>{mode === "demo" ? <Badge tone="amber">Sample content</Badge> : <Badge tone="wave">AI generated</Badge>}</div>
        </div>
        <div className="flex items-center gap-1.5">{actions}</div>
      </div>
      <div className="space-y-5 p-5">
        <p className="text-sm leading-relaxed text-slate-600">{asset.strategy}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {asset.variants.map((v, i) => (
            <div key={i} className="flex flex-col rounded-lg border border-line p-4">
              <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{v.label}</span><CopyButton text={variantText(v)} /></div>
              {v.headline && <div className="font-display text-[15px] font-semibold text-slate-900">{v.headline}</div>}
              <p className="mt-1.5 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{v.body}</p>
              {v.cta && <div className="mt-3"><span className="inline-block rounded-md bg-ink-900 px-2.5 py-1 text-xs font-medium text-white">{v.cta}</span></div>}
              {v.hashtags.length > 0 && <div className="mt-2 text-xs text-sky-700">{v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</div>}
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ImageIcon className="size-4 text-slate-400" />Creative brief</div>
            <Badge>{asset.creativeBrief.format}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Concept: </span>{asset.creativeBrief.concept}</p>
          <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Visual direction: </span>{asset.creativeBrief.visualDirection}</p>
          <div className="mt-3 rounded-md border border-line bg-white p-3">
            <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Image-generation prompt</span><CopyButton text={asset.creativeBrief.imagePrompt} /></div>
            <p className="font-mono text-xs leading-relaxed text-slate-700">{asset.creativeBrief.imagePrompt}</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">Image generation isn&apos;t built in — paste this prompt into the image tool of your choice.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">A/B test</div><p className="text-sm text-slate-700">{asset.testIdea}</p></div>
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">KPIs to track</div><div className="flex flex-wrap gap-1.5">{asset.kpis.map((k) => <Badge key={k}>{k}</Badge>)}</div></div>
        </div>
      </div>
    </Card>
  );
}

function SavedAssetModal({ asset, onClose }: { asset: SavedAsset; onClose: () => void }) {
  const { project } = useWorkspace();
  const toast = useToast();
  const [editing, setEditing] = useState<Asset | null>(null);
  const [err, setErr] = useState("");
  const save = () => {
    const parsed = assetSchema.safeParse(editing);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    updateProject(project.id, (p) => ({ ...p, assets: p.assets.map((a) => (a.id === asset.id ? { ...a, data: parsed.data } : a)) }));
    setEditing(null);
    toast("Asset updated.");
  };
  return (
    <Modal open wide onClose={onClose} title={editing ? "Edit asset" : asset.data.title}
      footer={editing ? <><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save changes</Button></> : <>
        <CopyButton text={assetMarkdown(asset.data, asset.request)} label="Copy all" />
        <Button variant="secondary" onClick={() => download(`${slug(asset.data.title)}.md`, assetMarkdown(asset.data, asset.request), "text/markdown")}><Download className="size-4" />Download</Button>
        <Button onClick={() => setEditing(structuredClone(asset.data))}><Pencil className="size-4" />Edit</Button>
      </>}>
      {editing ? (
        <>
          <StructuredEditor schema={assetSchema} value={editing} onChange={setEditing} />
          {err && <div className="mt-3"><ErrorNotice message={err} /></div>}
        </>
      ) : (
        <div className="-mx-5 -my-4"><AssetView asset={asset.data} request={asset.request} mode={asset.mode} /></div>
      )}
    </Modal>
  );
}

