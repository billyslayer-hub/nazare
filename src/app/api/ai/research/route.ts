import { researchEnabled, runResearch } from "@/lib/ai";
import { fail, handleError, parseBody } from "@/lib/http";
import { researchBodySchema } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await parseBody(request, researchBodySchema);
  if ("error" in body) return body.error;
  // Research is never simulated: without live search there is nothing to cite.
  if (!researchEnabled()) {
    return fail("Live web research is not configured. Add ANTHROPIC_API_KEY to enable it.", 503, "research_disabled");
  }
  try {
    const data = await runResearch(body.data.profile, body.data.question);
    return Response.json({ ok: true, mode: "ai", data });
  } catch (error) {
    return handleError(error);
  }
}
