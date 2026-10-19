"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  BarChart3,
  Compass,
  FileText,
  Gauge,
  Loader2,
  Megaphone,
  Menu,
  MessageSquareText,
  Route,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { LogoLockup } from "@/components/logo";
import { AiStatusBadge } from "@/components/status-badge";
import { Advisor } from "@/components/advisor";
import { ButtonLink, EmptyState, Skeleton } from "@/components/ui";
import { useGenerating } from "@/lib/client";
import { businessName, isDemo } from "@/lib/project";
import { SECTIONS } from "@/lib/schemas";
import { useHydrated, useProject } from "@/lib/store";
import type { Project } from "@/lib/types";

const ProjectContext = createContext<{ project: Project; base: string; openAdvisor: (prompt?: string) => void } | null>(null);

export function useWorkspace() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useWorkspace must be used inside the workspace");
  return ctx;
}

const NAV = [
  { href: "", label: "Dashboard", icon: Gauge },
  { href: "/blueprint", label: "Business Plan", icon: Compass },
  { href: "/financials", label: "Money", icon: BarChart3 },
  { href: "/marketing", label: "Ad Creator", icon: Megaphone },
  { href: "/roadmap", label: "Tasks", icon: Route },
  { href: "/advisor", label: "Advisor", icon: MessageSquareText },
  { href: "/research", label: "Research", icon: Search },
];
const NAV_SECONDARY = [
  { href: "/profile", label: "Business profile", icon: UserRound },
  { href: "/plan", label: "Export plan", icon: FileText },
];

export function WorkspaceShell({ id, children }: { id: string; children: ReactNode }) {
  const project = useProject(id);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [advisor, setAdvisor] = useState<{ open: boolean; prompt?: string; key: number }>({ open: false, key: 0 });
  const generating = useGenerating(id);
  const base = `/b/${id}`;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 bg-ink-900 lg:block" />
        <div className="flex-1 space-y-4 p-8"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <EmptyState icon={<Compass className="size-5" />} title="Business not found" description="It may have been deleted, or it was created in a different browser. Projects are stored locally in the browser where they were created." action={<ButtonLink href="/">Go to your businesses</ButtonLink>} />
      </div>
    );
  }

  const name = businessName(project);
  const active = (href: string) => (href === "" ? pathname === base : pathname.startsWith(base + href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between px-5">
        <Link href="/"><LogoLockup inverted /></Link>
        <button className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="size-5" /></button>
      </div>
      <div className="mx-3 rounded-xl bg-black/15 px-3 py-3 ring-1 ring-gold-400/20">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-400 font-display text-sm font-semibold text-ink-950">{name.charAt(0)}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="text-xs text-white/60">{project.profile.stage} stage</div>
          </div>
        </div>
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3" aria-label="Workspace" onClick={() => setDrawer(false)}>
        {NAV.map((item) => <NavLink key={item.href} href={base + item.href} label={item.label} icon={item.icon} active={active(item.href)} />)}
        <div className="my-3 border-t border-gold-400/20" />
        {NAV_SECONDARY.map((item) => <NavLink key={item.href} href={base + item.href} label={item.label} icon={item.icon} active={active(item.href)} small />)}
      </nav>
      <div className="space-y-3 border-t border-gold-400/20 p-4">
        <AiStatusBadge dark />
        <Link href="/" className="flex items-center gap-2 text-xs text-white/60 hover:text-white"><ArrowLeft className="size-3.5" />All businesses</Link>
      </div>
    </div>
  );

  return (
    <ProjectContext.Provider value={{ project, base, openAdvisor: (prompt) => setAdvisor((a) => ({ open: true, prompt, key: prompt ? a.key + 1 : a.key })) }}>
      <div className="min-h-screen lg:pl-64 print:pl-0">
        <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 overflow-hidden bg-ink-900 lg:block"><div className="brand-pattern pointer-events-none absolute inset-0" /><div className="relative h-full">{sidebar}</div></aside>
        {drawer && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/50" onClick={() => setDrawer(false)} />
            <aside className="fade-up absolute inset-y-0 left-0 w-72 overflow-hidden bg-ink-900"><div className="brand-pattern pointer-events-none absolute inset-0" /><div className="relative h-full">{sidebar}</div></aside>
          </div>
        )}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Open menu"><Menu className="size-5" /></button>
          <span className="truncate px-2 font-display text-sm font-semibold text-slate-900">{name}</span>
          <button onClick={() => setAdvisor((a) => ({ ...a, open: true, prompt: undefined }))} className="rounded-md p-1.5 text-ink-900 hover:bg-gold-50" aria-label="Ask your Business Advisor"><MessageSquareText className="size-5" /></button>
        </header>

        {generating.length > 0 && (
          <div className="no-print sticky top-14 z-20 border-b border-gold-200 bg-gold-50/95 px-4 py-2.5 backdrop-blur lg:top-0 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-800">
              <Loader2 className="size-4 animate-spin" />
              <span className="font-medium">Working on {generating.length} section{generating.length > 1 ? "s" : ""}:</span>
              <span className="text-ink-700">{generating.map((k) => SECTIONS.find((s) => s.key === k)?.title).join(" · ")}</span>
              <span className="ml-auto hidden text-xs text-ink-700/80 sm:inline">You can keep working while this runs.</span>
            </div>
          </div>
        )}
        {isDemo(project) && (
          <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:px-8">
            <strong className="font-semibold">Offline mode.</strong> Plan sections are template drafts built from your answers, not AI analysis. Everything else works. Add an AI key and press “Regenerate” for full AI results.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <Advisor key={advisor.key} open={advisor.open} initialPrompt={advisor.prompt} onClose={() => setAdvisor((a) => ({ ...a, open: false }))} />
    </ProjectContext.Provider>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-wave-700">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active, small }: { href: string; label: string; icon: typeof Gauge; active: boolean; small?: boolean }) {
  return (
    <Link href={href} className={clsx("flex items-center gap-3 rounded-lg px-3 font-medium transition", small ? "py-1.5 text-[13px]" : "py-2 text-sm", active ? "bg-black/20 text-gold-300 ring-1 ring-gold-400/25" : "text-white/75 hover:bg-black/10 hover:text-white")}>
      <Icon className={clsx("size-4", active && "text-gold-400")} />
      {label}
    </Link>
  );
}
