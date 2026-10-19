"use client";

import { ArrowRight, BarChart3, Compass, Download, FileUp, Megaphone, MessageSquareText, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { AiStatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Badge, ButtonLink, Button, Card, ConfirmModal, ProgressBar, Skeleton } from "@/components/ui";
import { brand } from "@/config/brand";
import { download, generateBlueprint, slug } from "@/lib/client";
import { profileSchema, type Profile } from "@/lib/schemas";
import { businessName, completion, isDemo } from "@/lib/project";
import { createProject, deleteProject, exportProjectJson, importProjectJson, useHydrated, useProjects } from "@/lib/store";
import type { Project } from "@/lib/types";

export default function Home() {
  const projects = useProjects();
  const hydrated = useHydrated();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    try {
      const p = importProjectJson(await file.text());
      toast(`Imported “${businessName(p)}”.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not import that file.", "error");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            <AiStatusBadge className="hidden sm:inline-flex" />
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><FileUp className="size-4" /><span className="hidden sm:inline">Import</span></Button>
            <ButtonLink href="/new" size="sm"><Plus className="size-4" />New business</ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : projects.length === 0 ? (
          <Welcome />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Your businesses</h1>
                <p className="mt-1 text-sm text-slate-500">{projects.length} project{projects.length > 1 ? "s" : ""} · saved in this browser</p>
              </div>
              <ExampleButton />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
              <Link href="/new" className="group flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm font-medium text-slate-500 transition hover:border-wave-400 hover:bg-white hover:text-wave-700">
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 transition group-hover:bg-wave-50"><Plus className="size-5" /></span>
                <span className="mt-3">Start another business</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ExampleButton() {
  const startExample = useStartExample();
  return <Button variant="secondary" size="sm" onClick={startExample}><Sparkles className="size-4" />Try an example</Button>;
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const name = businessName(project);
  const { overall } = completion(project);
  return (
    <Card className="fade-up group relative flex flex-col p-5 transition hover:border-slate-300 hover:shadow-md" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-ink-900 font-display text-base font-semibold text-white">{name.charAt(0)}</div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Project actions"><MoreHorizontal className="size-5" /></button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-line bg-white p-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
              <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { download(`${slug(name)}.paideia.json`, exportProjectJson(project), "application/json"); setMenu(false); toast("Project backup downloaded."); }}><Download className="size-4" />Export backup</button>
              <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={() => { setConfirm(true); setMenu(false); }}><Trash2 className="size-4" />Delete</button>
            </div>
          )}
        </div>
      </div>
      <Link href={`/b/${project.id}`} className="mt-4 flex flex-1 flex-col after:absolute after:inset-0 after:content-['']">
        <h2 className="font-display text-lg font-semibold text-slate-900">{name}</h2>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{project.profile.idea}</p>
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge>{project.profile.stage}</Badge>
        {project.profile.industry && <Badge>{project.profile.industry}</Badge>}
        {isDemo(project) && <Badge tone="amber">Template drafts</Badge>}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Plan progress</span><span className="tabular-nums">{overall}%</span></div>
        <ProgressBar value={overall} />
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} title={`Delete ${name}?`} body="This permanently removes the plan, financial model, marketing assets, research and tasks from this browser. Export a backup first if you might need it." onConfirm={() => { deleteProject(project.id); toast("Project deleted."); }} />
    </Card>
  );
}

const EXAMPLE: Profile = profileSchema.parse({
  idea: "A weekend bakery stand selling homemade cookies and cupcakes at the local farmers market, with custom orders for birthdays.",
  name: "Sweet Crumbs",
  offering: "Homemade cookies, cupcakes and custom birthday orders",
  industry: "Food & bakery",
  businessModel: "Per-item sales plus custom orders",
  audience: "Families and teens shopping at the Saturday farmers market",
  location: "Local farmers market",
  stage: "Idea",
  capital: "$500",
  pricing: "$3 per cookie, $25 per dozen cupcakes",
  goals: "Sell out every Saturday and take 4 custom orders a month",
  team: "Two students, weekends only",
  constraints: "Must follow local food-sale rules",
});

function useStartExample() {
  const router = useRouter();
  return () => {
    const p = createProject(EXAMPLE);
    void generateBlueprint(p.id);
    router.push(`/b/${p.id}`);
  };
}

function Welcome() {
  const startExample = useStartExample();
  const features = [
    { icon: Compass, title: "Business Plan", text: "A full plan — customers, competitors, marketing, money and risks — written from your own words." },
    { icon: BarChart3, title: "Money", text: "Change your price or costs and instantly see profit, break-even and how much money you need." },
    { icon: Megaphone, title: "Ad Creator", text: "Ready-to-post ads, social posts, video scripts and emails — with images you can download." },
    { icon: MessageSquareText, title: "Advisor", text: "Ask questions about your business and get answers based on your own plan and numbers." },
  ];
  return (
    <div className="fade-up">
      <section className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-12 text-white sm:px-12 sm:py-14">
        <div className="brand-pattern pointer-events-none absolute inset-0" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_380px]">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Turn your idea into a real business plan.</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/new" size="lg" className="bg-gold-400 text-ink-950 hover:bg-gold-300">Start with your idea<ArrowRight className="size-4" /></ButtonLink>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={startExample}><Sparkles className="size-4" />Try an example</Button>
            </div>
            <p className="mt-3 text-sm text-white/60">Takes about 2 minutes. No business experience needed.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand artwork */}
          <img src="/brand/paideia-logo.png" alt="Paideia" className="hidden w-full lg:block" />
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gold-50 text-ink-900"><f.icon className="size-5" /></div>
            <h3 className="mt-4 font-display text-[15px] font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
          </Card>
        ))}
      </section>
      <p className="mt-6 text-center text-xs text-slate-400">Guidance is educational and not a substitute for legal, tax or financial advice. Your projects stay in this browser.</p>
    </div>
  );
}
