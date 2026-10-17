"use client";

import { useEffect, useSyncExternalStore } from "react";
import { digest, withSectionVersion } from "./project";
import { SECTION_KEYS, type ApiResult, type SectionData, type SectionKey } from "./schemas";
import { getProject, updateProject } from "./store";

/* ------------------------------------------------------------------ */
/* API helper                                                          */
/* ------------------------------------------------------------------ */

export async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (!json) return { ok: false, error: `Server error (${res.status}).` };
    return json;
  } catch {
    return { ok: false, error: "Network error — check your connection and try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Service status (is AI / research configured on the server?)         */
/* ------------------------------------------------------------------ */

export type Status = { ai: boolean; research: boolean; model: string | null };
let status: Status | null = null;
let statusPromise: Promise<void> | null = null;
const statusListeners = new Set<() => void>();

function loadStatus() {
  statusPromise ??= fetch("/api/status")
    .then((r) => r.json() as Promise<Status>)
    .catch(() => ({ ai: false, research: false, model: null }))
    .then((s) => {
      status = s;
      statusListeners.forEach((l) => l());
    });
}

export function useStatus(): Status | null {
  useEffect(loadStatus, []);
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => null,
  );
}

/* ------------------------------------------------------------------ */
/* Section generation jobs                                             */
/* ------------------------------------------------------------------ */

type Job = { status: "loading" } | { status: "error"; error: string };
const jobs = new Map<string, Job>();
let jobSnapshot = new Map<string, Job>();
const jobListeners = new Set<() => void>();
const EMPTY = new Map<string, Job>();

function setJob(key: string, job: Job | null) {
  if (job) jobs.set(key, job);
  else jobs.delete(key);
  jobSnapshot = new Map(jobs);
  jobListeners.forEach((l) => l());
}

function useJobs() {
  return useSyncExternalStore(
    (l) => {
      jobListeners.add(l);
      return () => jobListeners.delete(l);
    },
    () => jobSnapshot,
    () => EMPTY,
  );
}

export function useSectionJob(projectId: string, key: SectionKey): Job | undefined {
  return useJobs().get(`${projectId}:${key}`);
}

export function useGenerating(projectId: string): SectionKey[] {
  const all = useJobs();
  return SECTION_KEYS.filter((k) => all.get(`${projectId}:${k}`)?.status === "loading");
}

export async function generateSection(projectId: string, key: SectionKey, instructions = ""): Promise<boolean> {
  const jobKey = `${projectId}:${key}`;
  const project = getProject(projectId);
  if (!project || jobs.get(jobKey)?.status === "loading") return false;
  setJob(jobKey, { status: "loading" });
  const res = await postJson<SectionData[SectionKey]>("/api/ai/section", {
    section: key,
    profile: project.profile,
    context: digest(project, key),
    instructions,
  });
  if (!res.ok) {
    setJob(jobKey, { status: "error", error: res.error });
    return false;
  }
  updateProject(projectId, (p) =>
    withSectionVersion(p, key, res.data as never, res.mode, instructions ? `Regenerated: ${instructions}` : undefined),
  );
  setJob(jobKey, null);
  return true;
}

/**
 * Builds the full blueprint in dependency order: the company description
 * anchors name and offer, the specialist sections run in parallel, the risk
 * review reads them, and the executive summary is written last.
 */
export async function generateBlueprint(projectId: string, onlyMissing = true) {
  const has = (k: SectionKey) => Boolean(getProject(projectId)?.sections[k]);
  const run = (keys: SectionKey[]) => Promise.all(keys.filter((k) => !onlyMissing || !has(k)).map((k) => generateSection(projectId, k)));

  await run(["company"]);
  if (!has("company")) return;
  await run(["market", "competition", "marketing", "financials", "execution"]);
  await run(["risks"]);
  await run(["executive"]);
}

/* ------------------------------------------------------------------ */
/* Downloads                                                           */
/* ------------------------------------------------------------------ */

export function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business";
