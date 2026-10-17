"use client";

import { ArrowRight, BarChart3, Compass, Download, FileUp, LayoutGrid, Megaphone, MoreHorizontal, Plus, Route, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { AiStatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Badge, ButtonLink, Button, Card, ConfirmModal, ProgressBar, Skeleton } from "@/components/ui";
import { brand } from "@/config/brand";
import { download, slug } from "@/lib/client";
import { businessName, completion, isDemo } from "@/lib/project";
import { deleteProject, exportProjectJson, importProjectJson, useHydrated, useProjects } from "@/lib/store";
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
              <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { download(`${slug(name)}.nazare.json`, exportProjectJson(project), "application/json"); setMenu(false); toast("Project backup downloaded."); }}><Download className="size-4" />Export backup</button>
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
        {isDemo(project) && <Badge tone="amber">Sample content</Badge>}
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Plan progress</span><span className="tabular-nums">{overall}%</span></div>
        <ProgressBar value={overall} />
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} title={`Delete ${name}?`} body="This permanently removes the plan, financial model, marketing assets, research and tasks from this browser. Export a backup first if you might need it." onConfirm={() => { deleteProject(project.id); toast("Project deleted."); }} />
    </Card>
  );
}

function Welcome() {
  const features = [
    { icon: Compass, title: "Business blueprint", text: "An eight-section plan — market, competition, execution, marketing, finance and risk — built from your own words." },
    { icon: BarChart3, title: "Live financial model", text: "Edit prices, volumes and costs; projections, break-even and funding needs recalculate instantly." },
    { icon: Megaphone, title: "Marketing studio", text: "On-brand posts, ads, emails, scripts and creative briefs for every platform." },
    { icon: Route, title: "Launch roadmap", text: "Your plan becomes prioritized tasks with deadlines, dependencies and a readiness checklist." },
  ];
  return (
    <div className="fade-up">
      <section className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.15] invert" />
        <svg className="pointer-events-none absolute -bottom-6 right-0 w-[640px] max-w-none opacity-30" viewBox="0 0 640 160" fill="none" aria-hidden>
          <path d="M0 120c80 0 100-80 190-80 70 0 80 60 150 60 60 0 80-40 150-40 70 0 110 30 150 30" stroke="#33cab4" strokeWidth="2" />
          <path d="M0 140c80 0 110-60 200-60 70 0 80 50 150 50 60 0 80-30 150-30 70 0 100 20 140 20" stroke="#33cab4" strokeOpacity=".5" strokeWidth="2" />
        </svg>
        <div className="relative max-w-2xl">
          <Badge tone="ink" className="bg-white/10 text-wave-200"><LayoutGrid className="size-3.5" />Entrepreneur command center</Badge>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Turn your idea into a business you can actually launch.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">{brand.description} No MBA required — plain-English guidance, honest feedback, and numbers you control.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/new" size="lg" className="bg-wave-400 text-ink-950 hover:bg-wave-300">Start with your idea<ArrowRight className="size-4" /></ButtonLink>
            <span className="text-sm text-slate-400">Takes about 2 minutes</span>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-wave-50 text-wave-700"><f.icon className="size-5" /></div>
            <h3 className="mt-4 font-display text-[15px] font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
          </Card>
        ))}
      </section>
      <p className="mt-6 text-center text-xs text-slate-400">Guidance is educational and not a substitute for legal, tax or financial advice. Your projects stay in this browser.</p>
    </div>
  );
}
