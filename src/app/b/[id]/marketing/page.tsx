"use client";

import clsx from "clsx";
import { ChevronDown, Download, ImageIcon, Mail, Megaphone, Pencil, RefreshCw, Save, Smartphone, Trash2, Video, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AD_THEMES, AdPreview, adSvg, downloadPng, type AdTheme } from "@/components/ad-preview";
import { StructuredEditor } from "@/components/structured-editor";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, CardHeader, ConfirmModal, CopyButton, EmptyState, ErrorNotice, Field, Input, Modal, Select, Skeleton } from "@/components/ui";
import { download, postJson, slug, useStatus } from "@/lib/client";
import { offlineAsset } from "@/lib/offline-ads";
import { businessName, digest, sectionData } from "@/lib/project";
import { ASSET_TYPES, GOALS, PLATFORMS, TONES, assetSchema, type Asset, type StudioRequest } from "@/lib/schemas";
import { uid, updateProject } from "@/lib/store";
import type { Mode, Project, SavedAsset } from "@/lib/types";

const QUICK_TYPES: { type: StudioRequest["assetType"]; label: string; icon: typeof Megaphone; platform: StudioRequest["platform"] }[] = [
  { type: "Social media post", label: "Social post", icon: Smartphone, platform: "Instagram" },
  { type: "Paid ad copy", label: "Ad", icon: Megaphone, platform: "Facebook" },
  { type: "Short-form video script", label: "Video script", icon: Video, platform: "TikTok" },
  { type: "Promotional email", label: "Email", icon: Mail, platform: "Email" },
];
const VISUAL_TYPES: StudioRequest["assetType"][] = ["Social media post", "Paid ad copy", "A/B test variations", "Ad creative brief", "Brand names & slogans", "Content calendar", "Short-form video script"];
const SOCIAL = ["Instagram", "TikTok", "Facebook", "LinkedIn", "X"] as const;

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

function planFor(p: Project) {
  return { company: sectionData(p, "company"), marketing: sectionData(p, "marketing"), market: sectionData(p, "market") };
}

export default function AdCreator() {
  const { project } = useWorkspace();
  const status = useStatus();
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
  const [more, setMore] = useState(false);
  const [theme, setTheme] = useState<AdTheme>("maroon");
  const [draft, setDraft] = useState<{ data: Asset; mode: Mode; request: StudioRequest } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<SavedAsset | null>(null);
  const [deleting, setDeleting] = useState<SavedAsset | null>(null);
  const offline = status !== null && !status.ai;
  const set = (patch: Partial<StudioRequest>) => setReq((r) => ({ ...r, ...patch }));

  const generate = async () => {
    setLoading(true);
    setError("");
    if (offline) {
      await new Promise((r) => setTimeout(r, 450));
      setDraft({ data: offlineAsset(project.profile, planFor(project), req), mode: "demo", request: req });
      setLoading(false);
      return;
    }
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
    toast("Saved to your library.");
  };

  const exportAll = () => download(`${slug(businessName(project))}-marketing.md`, project.assets.map((a) => assetMarkdown(a.data, a.request)).join("\n---\n\n"), "text/markdown");
  const isQuick = QUICK_TYPES.some((q) => q.type === req.assetType);

  return (
    <div>
      <PageHeader
        eyebrow="Ad Creator"
        title="Make ads and posts in seconds"
        description="Pick what you want to make, where it will go, and your goal. You'll get ready-to-use copy plus an ad image you can download. Nothing is posted for you."
        actions={project.assets.length > 0 && <Button variant="secondary" onClick={exportAll}><Download className="size-4" />Export all</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-5 lg:sticky lg:top-6">
          <div className="space-y-5">
            <Group label="1. What do you want to make?">
              <div className="grid grid-cols-2 gap-2">
                {QUICK_TYPES.map((q) => (
                  <button key={q.type} onClick={() => set({ assetType: q.type, platform: q.platform })} className={clsx("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition", req.assetType === q.type ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-slate-700 hover:border-slate-300")}>
                    <q.icon className="size-4" />{q.label}
                  </button>
                ))}
              </div>
              <Select className={clsx("mt-2 h-9 text-sm", !isQuick && "border-ink-900")} value={isQuick ? "" : req.assetType} onChange={(e) => e.target.value && set({ assetType: e.target.value as StudioRequest["assetType"] })} aria-label="More content types">
                <option value="">More types…</option>
                {ASSET_TYPES.filter((t) => !QUICK_TYPES.some((q) => q.type === t)).map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Group>
            <Group label="2. Where will it go?">
              <Chips options={req.assetType === "Promotional email" ? ["Email"] : req.assetType === "Landing page copy" ? ["Website"] : [...SOCIAL, "Google Ads", "YouTube", "Any"]} value={req.platform} onChange={(v) => set({ platform: v as StudioRequest["platform"] })} />
            </Group>
            <Group label="3. What's the goal?">
              <Chips options={[...GOALS]} value={req.goal} onChange={(v) => set({ goal: v as StudioRequest["goal"] })} />
            </Group>
            <Group label="4. Pick a tone">
              <Chips options={[...TONES]} value={req.tone} onChange={(v) => set({ tone: v as StudioRequest["tone"] })} />
            </Group>
            <Field label="Anything to mention? (optional)"><Input value={req.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="e.g. 20% off opening week" maxLength={300} /></Field>
            <button onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"><ChevronDown className={clsx("size-3.5 transition", !more && "-rotate-90")} />More options</button>
            {more && (
              <div className="space-y-4">
                <Field label="Audience"><Input value={req.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="Defaults to your main customer" maxLength={300} /></Field>
                <Field label="Budget"><Input value={req.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="e.g. 100/month for ads" maxLength={80} /></Field>
                <Field label="How many versions?"><Select value={req.variations} onChange={(e) => set({ variations: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
                <Field label="Platform (all options)"><Select value={req.platform} onChange={(e) => set({ platform: e.target.value as StudioRequest["platform"] })}>{PLATFORMS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              </div>
            )}
            <Button className="w-full" size="lg" onClick={generate} loading={loading}>{!loading && <Wand2 className="size-4" />}Create {QUICK_TYPES.find((q) => q.type === req.assetType)?.label.toLowerCase() ?? "content"}</Button>
            {offline && <p className="text-xs leading-relaxed text-slate-500">Offline mode: copy is written from your business details using built-in ad templates. Add an AI key for fully custom AI copy.</p>}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {error && <ErrorNotice message={error} onRetry={generate} />}
          {loading && !draft && (
            <Card className="space-y-3 p-5"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-2/3" /><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="aspect-square" /><Skeleton className="aspect-square" /><Skeleton className="aspect-square" /></div></Card>
          )}
          {draft && (
            <div className="fade-up">
              <AssetView asset={draft.data} request={draft.request} mode={draft.mode} dim={loading} theme={theme} onTheme={setTheme} brand={businessName(project)}
                actions={
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
                    <Button size="sm" variant="secondary" onClick={generate} loading={loading}><RefreshCw className="size-3.5" />Try again</Button>
                    <Button size="sm" onClick={save}><Save className="size-3.5" />Save</Button>
                  </>
                }
              />
            </div>
          )}
          {!draft && !loading && project.assets.length === 0 && (
            <EmptyState icon={<Megaphone className="size-5" />} title="Your first ad is one click away" description="Choose a type, platform and goal on the left, then press Create. Save the ones you like — they'll appear here." />
          )}

          {project.assets.length > 0 && (
            <Card>
              <CardHeader title="Your library" description={`${project.assets.length} saved`} />
              <ul className="divide-y divide-line">
                {project.assets.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => setOpen(a)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium text-slate-900 hover:text-ink-900">{a.data.variants[0]?.headline || a.data.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5"><Badge>{a.request.assetType}</Badge><Badge>{a.request.platform}</Badge>{a.mode === "demo" && <Badge tone="amber">Template</Badge>}</div>
                    </button>
                    <span className="hidden text-xs text-slate-400 sm:block">{new Date(a.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => setDeleting(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {open && <SavedAssetModal asset={project.assets.find((a) => a.id === open.id) ?? open} theme={theme} onTheme={setTheme} onClose={() => setOpen(null)} />}
      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this item?" body={`“${deleting?.data.title}” will be removed from your library.`} onConfirm={() => { if (deleting) updateProject(project.id, (p) => ({ ...p, assets: p.assets.filter((x) => x.id !== deleting.id) })); toast("Deleted."); }} />
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-800">{label}</div>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={clsx("rounded-full border px-3 py-1 text-xs font-medium transition", value === o ? "border-gold-400 bg-gold-400 text-ink-950" : "border-line bg-white text-slate-600 hover:border-gold-300")}>{o}</button>
      ))}
    </div>
  );
}

function ThemePicker({ theme, onTheme }: { theme: AdTheme; onTheme: (t: AdTheme) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Ad colors">
      <span className="mr-1 text-xs text-slate-500">Colors</span>
      {(Object.keys(AD_THEMES) as AdTheme[]).map((k) => (
        <button key={k} role="radio" aria-checked={theme === k} aria-label={k} onClick={() => onTheme(k)} className={clsx("size-6 rounded-full ring-1 ring-black/10 transition", theme === k && "ring-2 ring-slate-900 ring-offset-2")} style={{ background: AD_THEMES[k].bg }} />
      ))}
    </div>
  );
}

function AssetView({ asset, request, mode, actions, dim, theme, onTheme, brand }: { asset: Asset; request: StudioRequest; mode: Mode; actions?: ReactNode; dim?: boolean; theme: AdTheme; onTheme: (t: AdTheme) => void; brand: string }) {
  const visual = VISUAL_TYPES.includes(request.assetType);
  const size = request.platform === "TikTok" || request.assetType === "Short-form video script" ? "story" : "square";
  const downloadAll = async () => {
    for (const [i, v] of asset.variants.entries()) await downloadPng(adSvg({ headline: v.headline, body: v.body, cta: v.cta, brand, theme, size }), `${slug(brand)}-ad-${i + 1}.png`);
  };
  return (
    <Card className={clsx("transition-opacity", dim && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900">{asset.title}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5"><Badge>{request.tone}</Badge><Badge>{request.goal}</Badge>{mode === "demo" ? <Badge tone="amber">Template copy</Badge> : <Badge tone="wave">AI written</Badge>}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
      </div>
      <div className="space-y-5 p-5">
        <p className="text-sm leading-relaxed text-slate-600">{asset.strategy}</p>
        {visual && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ThemePicker theme={theme} onTheme={onTheme} />
            <Button size="sm" variant="ghost" onClick={downloadAll}><ImageIcon className="size-3.5" />Download all images</Button>
          </div>
        )}
        <div className={clsx("grid gap-4", visual ? (size === "story" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3") : "md:grid-cols-2")}>
          {asset.variants.map((v, i) => (
            <div key={i} className="flex flex-col rounded-xl border border-line bg-white p-3">
              {visual && <AdPreview headline={v.headline} body={v.body} cta={v.cta} brand={brand} theme={theme} size={size} filename={`${slug(brand)}-ad-${i + 1}.png`} />}
              <div className={clsx("flex flex-1 flex-col", visual && "mt-3")}>
                <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{v.label}</span><CopyButton text={variantText(v)} /></div>
                {v.headline && <div className="font-display text-[15px] font-semibold text-slate-900">{v.headline}</div>}
                <p className="mt-1 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{v.body}</p>
                {v.cta && <div className="mt-2"><span className="inline-block rounded-md bg-ink-900 px-2.5 py-1 text-xs font-medium text-white">{v.cta}</span></div>}
                {v.hashtags.length > 0 && <div className="mt-2 text-xs text-forest-900">{v.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</div>}
              </div>
            </div>
          ))}
        </div>
        <details className="rounded-lg bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Creative brief, image prompt & A/B test</summary>
          <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Concept: </span>{asset.creativeBrief.concept}</p>
          <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Look & feel: </span>{asset.creativeBrief.visualDirection}</p>
          <p className="mt-1 text-sm text-slate-700"><span className="font-medium">Size: </span>{asset.creativeBrief.format}</p>
          <div className="mt-3 rounded-md border border-line bg-white p-3">
            <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Prompt for an image generator</span><CopyButton text={asset.creativeBrief.imagePrompt} /></div>
            <p className="font-mono text-xs leading-relaxed text-slate-700">{asset.creativeBrief.imagePrompt}</p>
          </div>
          <p className="mt-3 text-sm text-slate-700"><span className="font-medium">A/B test: </span>{asset.testIdea}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{asset.kpis.map((k) => <Badge key={k}>{k}</Badge>)}</div>
        </details>
      </div>
    </Card>
  );
}

function SavedAssetModal({ asset, onClose, theme, onTheme }: { asset: SavedAsset; onClose: () => void; theme: AdTheme; onTheme: (t: AdTheme) => void }) {
  const { project } = useWorkspace();
  const toast = useToast();
  const [editing, setEditing] = useState<Asset | null>(null);
  const [err, setErr] = useState("");
  const save = () => {
    const parsed = assetSchema.safeParse(editing);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    updateProject(project.id, (p) => ({ ...p, assets: p.assets.map((a) => (a.id === asset.id ? { ...a, data: parsed.data } : a)) }));
    setEditing(null);
    toast("Changes saved.");
  };
  return (
    <Modal open wide onClose={onClose} title={editing ? "Edit" : asset.data.title}
      footer={editing ? <><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save changes</Button></> : <>
        <CopyButton text={assetMarkdown(asset.data, asset.request)} label="Copy all" />
        <Button variant="secondary" onClick={() => download(`${slug(asset.data.title)}.md`, assetMarkdown(asset.data, asset.request), "text/markdown")}><Download className="size-4" />Text file</Button>
        <Button onClick={() => setEditing(structuredClone(asset.data))}><Pencil className="size-4" />Edit</Button>
      </>}>
      {editing ? (
        <>
          <StructuredEditor schema={assetSchema} value={editing} onChange={setEditing} />
          {err && <div className="mt-3"><ErrorNotice message={err} /></div>}
        </>
      ) : (
        <div className="-mx-5 -my-4"><AssetView asset={asset.data} request={asset.request} mode={asset.mode} theme={theme} onTheme={onTheme} brand={businessName(project)} /></div>
      )}
    </Modal>
  );
}

