"use client";

import { useSyncExternalStore } from "react";
import type { Profile } from "./schemas";
import type { Project } from "./types";

/**
 * Data access layer. Projects are persisted in the browser's localStorage so
 * the app works with zero infrastructure. Every read and write goes through
 * this module, so swapping in a database (e.g. Supabase) means replacing
 * these functions with API calls — the UI does not touch storage directly.
 */

const KEY = "nazare.projects.v1";
const listeners = new Set<() => void>();
let cache: Project[] | null = null;
const EMPTY: Project[] = [];

export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function read(): Project[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

let storageWarning = false;
function write(next: Project[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    storageWarning = false;
  } catch {
    // Quota exceeded or storage blocked: keep working in memory for this session.
    storageWarning = true;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useProject(id: string): Project | undefined {
  return useProjects().find((p) => p.id === id);
}

/** False during server render and hydration, true once client storage can be read. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export const storageFailed = () => storageWarning;

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}

export function createProject(profile: Profile): Project {
  const t = now();
  const project: Project = {
    id: uid(),
    version: 1,
    createdAt: t,
    updatedAt: t,
    profile,
    sections: {},
    tasks: [],
    assets: [],
    research: { runs: [], manual: [] },
    advisor: [],
    checklist: {},
  };
  write([project, ...read()]);
  return project;
}

export function updateProject(id: string, update: (p: Project) => Project) {
  write(read().map((p) => (p.id === id ? { ...update(p), updatedAt: now() } : p)));
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

/* ------------------------------------------------------------------ */
/* Backup: export / import whole projects as JSON                      */
/* ------------------------------------------------------------------ */

export function exportProjectJson(project: Project): string {
  return JSON.stringify({ app: "paideia", exportedAt: now(), project }, null, 2);
}

export function importProjectJson(text: string): Project {
  const parsed = JSON.parse(text) as { app?: string; project?: Project };
  const p = parsed.project;
  if (!(parsed.app === "paideia" || parsed.app === "nazare") || !p || typeof p !== "object" || !p.profile?.idea) {
    throw new Error("This file is not a Paideia project export.");
  }
  const project: Project = {
    ...p,
    id: uid(),
    updatedAt: now(),
    sections: p.sections ?? {},
    tasks: p.tasks ?? [],
    assets: p.assets ?? [],
    research: p.research ?? { runs: [], manual: [] },
    advisor: p.advisor ?? [],
    checklist: p.checklist ?? {},
  };
  write([project, ...read()]);
  return project;
}
