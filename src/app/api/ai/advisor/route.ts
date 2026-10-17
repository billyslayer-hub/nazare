import { advisorStream, aiEnabled } from "@/lib/ai";
import { fail, parseBody } from "@/lib/http";
import { profileBlock } from "@/lib/prompts";
import { advisorBodySchema } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await parseBody(request, advisorBodySchema);
  if ("error" in body) return body.error;
  // The advisor is never simulated; canned answers would ignore the founder's business.
  if (!aiEnabled()) return fail("The Business Advisor needs an AI key. Add ANTHROPIC_API_KEY to enable it.", 503, "ai_disabled");

  const { profile, context, messages } = body.data;
  if (messages[0].role !== "user") return fail("Conversation must start with a user message.", 400);
  const system = `${profileBlock(profile)}${context ? `\n\n<plan_context>\n${context}\n</plan_context>` : ""}`;
  return new Response(advisorStream(system, messages), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
