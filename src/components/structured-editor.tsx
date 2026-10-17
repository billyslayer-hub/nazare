"use client";

import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Input, Select, Textarea } from "@/components/ui";

/**
 * Schema-driven editor: renders an editable form for any section by walking
 * its zod schema, so every generated field can be edited without bespoke forms.
 */

export const humanize = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bPct\b/, "%")
    .replace(/\bCac\b/, "CAC")
    .replace(/\bLtv\b/, "LTV")
    .replace(/\bCta\b/, "CTA")
    .replace(/\bTam\b|\bSam\b|\bSom\b/, (m) => m.toUpperCase());

function unwrap(schema: z.ZodType): z.ZodType {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodNullable) s = s.unwrap() as z.ZodType;
  return s;
}

export function emptyFor(schema: z.ZodType): unknown {
  const s = unwrap(schema);
  if (s instanceof z.ZodObject) return Object.fromEntries(Object.entries(s.shape).map(([k, v]) => [k, emptyFor(v as z.ZodType)]));
  if (s instanceof z.ZodArray) return [];
  if (s instanceof z.ZodNumber) return 0;
  if (s instanceof z.ZodBoolean) return false;
  if (s instanceof z.ZodEnum) return s.options[0];
  return "";
}

type NodeProps = { schema: z.ZodType; value: unknown; onChange: (v: unknown) => void; label?: string; depth: number };

function Node({ schema, value, onChange, label, depth }: NodeProps) {
  const s = unwrap(schema);

  if (s instanceof z.ZodObject) {
    const obj = (value ?? {}) as Record<string, unknown>;
    const body = (
      <div className={depth === 0 ? "space-y-6" : "grid gap-3 sm:grid-cols-2"}>
        {Object.entries(s.shape).map(([k, child]) => {
          const inner = unwrap(child as z.ZodType);
          const wide = inner instanceof z.ZodObject || inner instanceof z.ZodArray || (inner instanceof z.ZodString && String(obj[k] ?? "").length > 60);
          return (
            <div key={k} className={depth > 0 && wide ? "sm:col-span-2" : undefined}>
              <Node schema={child as z.ZodType} value={obj[k]} label={humanize(k)} depth={depth + 1} onChange={(v) => onChange({ ...obj, [k]: v })} />
            </div>
          );
        })}
      </div>
    );
    if (depth === 0 || !label) return body;
    return (
      <fieldset className="rounded-lg border border-line p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</legend>
        {body}
      </fieldset>
    );
  }

  if (s instanceof z.ZodArray) {
    const items = Array.isArray(value) ? value : [];
    const el = unwrap(s.element as z.ZodType);
    const primitive = el instanceof z.ZodString || el instanceof z.ZodNumber;
    const set = (i: number, v: unknown) => onChange(items.map((x, j) => (j === i ? v : x)));
    const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
    return (
      <div>
        {label && <div className="mb-1.5 text-sm font-medium text-slate-800">{label}</div>}
        <div className={primitive ? "space-y-1.5" : "space-y-3"}>
          {items.map((item, i) =>
            primitive ? (
              <div key={i} className="flex items-center gap-2">
                {el instanceof z.ZodNumber ? (
                  <Input type="number" value={Number(item) || 0} onChange={(e) => set(i, Number(e.target.value))} className="w-28" />
                ) : (
                  <Input value={String(item ?? "")} onChange={(e) => set(i, e.target.value)} />
                )}
                <button type="button" onClick={() => remove(i)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="size-4" /></button>
              </div>
            ) : (
              <div key={i} className="relative rounded-lg border border-line bg-slate-50/50 p-4 pr-12">
                <button type="button" onClick={() => remove(i)} className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove item"><Trash2 className="size-4" /></button>
                <Node schema={el} value={item} depth={depth + 1} onChange={(v) => set(i, v)} />
              </div>
            ),
          )}
        </div>
        <button type="button" onClick={() => onChange([...items, emptyFor(el)])} className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-wave-700 hover:bg-wave-50">
          <Plus className="size-3.5" />Add {label ? label.toLowerCase().replace(/s$/, "") : "item"}
        </button>
      </div>
    );
  }

  const field = (control: React.ReactNode) => (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>}
      {control}
    </label>
  );

  if (s instanceof z.ZodEnum) {
    return field(
      <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        {(s.options as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>,
    );
  }
  if (s instanceof z.ZodNumber) {
    return field(<Input type="number" step="any" value={Number.isFinite(value) ? (value as number) : 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />);
  }
  if (s instanceof z.ZodBoolean) {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-slate-300 accent-wave-600" />
        {label}
      </label>
    );
  }
  const text = String(value ?? "");
  return field(
    text.length > 70 ? (
      <Textarea rows={Math.min(8, Math.max(2, Math.ceil(text.length / 90)))} value={text} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <Input value={text} onChange={(e) => onChange(e.target.value)} />
    ),
  );
}

export function StructuredEditor<S extends z.ZodType>({ schema, value, onChange }: { schema: S; value: z.infer<S>; onChange: (v: z.infer<S>) => void }) {
  return <Node schema={schema} value={value} depth={0} onChange={(v) => onChange(v as z.infer<S>)} />;
}

/** Generic object → Markdown for copy / download. */
export function toMarkdown(value: unknown, depth = 0): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "object" && v !== null ? `${toMarkdown(v, depth + 1).replace(/^/, "- ").replace(/\n(?!$)/g, "\n  ")}` : `- ${String(v)}`))
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .filter(([, v]) => !(Array.isArray(v) && v.length === 0) && v !== "")
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null) return depth === 0 ? `### ${humanize(k)}\n\n${toMarkdown(v, depth + 1)}` : `**${humanize(k)}:**\n${toMarkdown(v, depth + 1)}`;
        return `**${humanize(k)}:** ${String(v)}`;
      })
      .join(depth === 0 ? "\n\n" : "\n");
  }
  return String(value ?? "");
}
