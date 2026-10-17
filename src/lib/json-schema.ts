import { z } from "zod";

/**
 * Converts a zod schema into a JSON Schema accepted by Claude structured
 * outputs: enums are kept (so the API enforces them), every object is closed
 * with additionalProperties:false and lists all keys as required, and
 * keywords structured outputs do not support are removed.
 */
const UNSUPPORTED = new Set(["$schema", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "pattern", "default", "minItems", "maxItems"]);
const FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);

type Json = { [k: string]: unknown };

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) {
    if (UNSUPPORTED.has(k)) continue;
    if (k === "format" && !FORMATS.has(String(v))) continue;
    out[k] = k === "properties" ? Object.fromEntries(Object.entries(v as Json).map(([pk, pv]) => [pk, clean(pv)])) : clean(v);
  }
  if (out.type === "object") {
    out.additionalProperties = false;
    out.required = Object.keys((out.properties as Json) ?? {});
  }
  return out;
}

export function toStructuredSchema(schema: z.ZodType): Json {
  return clean(z.toJSONSchema(schema, { reused: "inline", unrepresentable: "any" })) as Json;
}
