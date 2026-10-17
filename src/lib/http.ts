import "server-only";
import type { z } from "zod";
import { AiError } from "./ai";

/** Very small in-memory rate limiter to protect the API key on a shared deployment. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.NAZARE_RATE_LIMIT_PER_MIN || 30);

export function rateLimited(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export function fail(error: string, status: number, code?: string) {
  return Response.json({ ok: false, error, code }, { status });
}

/** Parses and validates a JSON body; returns either data or an error Response. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { error: Response }> {
  if (rateLimited(request)) return { error: fail("Too many requests. Wait a minute and try again.", 429) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: fail("Request body must be JSON.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: fail(`Invalid request: ${issue.path.join(".") || "body"} — ${issue.message}`, 400) };
  }
  return { data: parsed.data };
}

export function handleError(error: unknown) {
  if (error instanceof AiError) return fail(error.message, error.status);
  console.error(error);
  return fail("Unexpected server error.", 500);
}

/** Short pause in demo mode so loading states are visible rather than flashing. */
export const demoDelay = () => new Promise((r) => setTimeout(r, 500 + Math.random() * 700));
