import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { toStructuredSchema } from "./json-schema";
import { ADVISOR_SYSTEM, SYSTEM_PROMPT, researchPrompt, synthesisPrompt } from "./prompts";
import { researchSynthesisSchema, type Profile, type ResearchResult, type ResearchSource } from "./schemas";

// Sonnet 5.5: fast and affordable for classroom use. Set PAIDEIA_MODEL=claude-opus-5-5 for the highest quality, or claude-haiku-5-5 for the lowest cost.
export const MODEL = process.env.PAIDEIA_MODEL || process.env.NAZARE_MODEL || "claude-sonnet-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Server-side refusal fallbacks ("default" mode) exist only on these models; Haiku does not accept the parameter. */
const SUPPORTS_FALLBACK = /^claude-(opus-5|fable-5|sonnet-5-5)/.test(MODEL);
const fallbackParams: Pick<Anthropic.Beta.MessageCreateParams, "betas" | "fallbacks"> = SUPPORTS_FALLBACK ? { betas: [FALLBACK_BETA], fallbacks: "default" } : {};

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** Live web research uses Claude's server-side web search tool (on by default when AI is enabled). */
export function researchEnabled(): boolean {
  return aiEnabled() && (process.env.PAIDEIA_WEB_RESEARCH || process.env.NAZARE_WEB_RESEARCH) !== "off";
}

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export class AiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new AiError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 401);
  if (error instanceof Anthropic.PermissionDeniedError) return new AiError("This API key does not have access to the configured model.", 403);
  if (error instanceof Anthropic.RateLimitError) return new AiError("The AI service is rate limited right now. Try again in a minute.", 429);
  if (error instanceof Anthropic.BadRequestError) return new AiError(`The AI request was rejected: ${error.message}`, 400);
  if (error instanceof Anthropic.APIConnectionError) return new AiError("Could not reach the AI service. Check the server's network connection.", 502);
  if (error instanceof Anthropic.APIError) return new AiError(`The AI service returned an error (${error.status ?? "unknown"}). Try again.`, 502);
  console.error("[ai]", error);
  return new AiError("Unexpected error while generating. Try again.", 500);
}

function checkStop(message: Anthropic.Beta.BetaMessage) {
  if (message.stop_reason === "refusal") throw new AiError("The AI declined this request. Try rephrasing it.", 422);
  if (message.stop_reason === "max_tokens") throw new AiError("The response was cut off before it finished. Try again.", 502);
}

const textOf = (message: Anthropic.Beta.BetaMessage) =>
  message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

/** One structured-output generation, validated against the zod schema. */
export async function generateStructured<S extends z.ZodType>(
  schema: S,
  prompt: string,
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<S>> {
  const jsonSchema = toStructuredSchema(schema);
  try {
    // Streaming keeps long structured responses clear of HTTP timeouts.
    const message = await anthropic()
      .beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        ...fallbackParams,
        output_config: { effort, format: { type: "json_schema", schema: jsonSchema } },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
      .finalMessage();
    checkStop(message);
    let parsed: unknown;
    try {
      parsed = JSON.parse(textOf(message));
    } catch (error) {
      console.error("[ai] structured output was not valid JSON", error);
      throw new AiError("The AI returned an unexpected format. Try again.", 502);
    }
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    console.error("[ai] structured output failed validation", result.error.issues.slice(0, 5));
    throw new AiError("The AI returned an unexpected format. Try again.", 502);
  } catch (error) {
    throw toAiError(error);
  }
}

/**
 * Two-step research so citations cannot be fabricated:
 * 1. Claude searches the web and writes notes (sources = real search results).
 * 2. A structured pass turns the notes into findings that must cite those
 *    numbered sources; any citation not in the result set is discarded.
 */
export async function runResearch(profile: Profile, question: string): Promise<ResearchResult> {
  try {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: researchPrompt(profile, question) }];
    const sources = new Map<string, ResearchSource>();
    let notes = "";

    for (let turn = 0; turn < 4; turn++) {
      const message = await anthropic()
        .beta.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          ...fallbackParams,
          output_config: { effort: "medium" },
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
          messages,
        })
        .finalMessage();

      if (message.stop_reason === "refusal") throw new AiError("The AI declined this research request.", 422);
      for (const block of message.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) {
            if (!sources.has(r.url)) sources.set(r.url, { id: sources.size + 1, title: r.title, url: r.url, pageAge: r.page_age ?? null });
          }
        }
      }
      notes += textOf(message);
      if (message.stop_reason !== "pause_turn") break;
      // Server-side search loop paused: resend so it resumes where it stopped.
      messages.push({ role: "assistant", content: message.content });
    }

    const list = [...sources.values()];
    if (list.length === 0) throw new AiError("Web search returned no sources for this question. Try a more specific question.", 502);

    const synthesis = await generateStructured(
      researchSynthesisSchema,
      synthesisPrompt(question, notes, list.map((s) => `[${s.id}] ${s.title} — ${s.url}${s.pageAge ? ` (${s.pageAge})` : ""}`).join("\n")),
      "low",
    );

    const byId = new Map(list.map((s) => [s.id, s]));
    const findings = synthesis.findings
      .map(({ sourceIds, ...f }) => ({ ...f, sources: [...new Set(sourceIds)].map((id) => byId.get(id)).filter((s): s is ResearchSource => Boolean(s)) }))
      .filter((f) => f.sources.length > 0);

    const cited = new Set(findings.flatMap((f) => f.sources.map((s) => s.id)));
    return {
      question,
      summary: synthesis.summary,
      findings,
      openQuestions: synthesis.openQuestions,
      sources: list.filter((s) => cited.has(s.id)),
      accessedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw toAiError(error);
  }
}

/** Streams the advisor's reply as plain text chunks. */
export function advisorStream(system: string, messages: Anthropic.MessageParam[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic().beta.messages.stream({
          model: MODEL,
          max_tokens: 8000,
          ...fallbackParams,
          output_config: { effort: "low" },
          system: `${ADVISOR_SYSTEM}\n\n${system}`,
          messages,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_The advisor declined to answer this. Try rephrasing._"));
      } catch (error) {
        controller.enqueue(encoder.encode(`\n\n⚠️ ${toAiError(error).message}`));
      } finally {
        controller.close();
      }
    },
  });
}
