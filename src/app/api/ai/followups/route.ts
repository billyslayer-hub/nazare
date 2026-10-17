import { aiEnabled, generateStructured } from "@/lib/ai";
import { demoFollowups } from "@/lib/demo";
import { demoDelay, handleError, parseBody } from "@/lib/http";
import { followupPrompt } from "@/lib/prompts";
import { followupsBodySchema, followupsSchema } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await parseBody(request, followupsBodySchema);
  if ("error" in body) return body.error;
  const { profile } = body.data;
  if (!aiEnabled()) {
    await demoDelay();
    return Response.json({ ok: true, mode: "demo", data: demoFollowups(profile) });
  }
  try {
    const data = await generateStructured(followupsSchema, followupPrompt(profile), "low");
    return Response.json({ ok: true, mode: "ai", data: { questions: data.questions.slice(0, 4) } });
  } catch (error) {
    return handleError(error);
  }
}
