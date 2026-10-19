import { aiEnabled, generateStructured } from "@/lib/ai";
import { offlineAsset } from "@/lib/offline-ads";
import { demoDelay, handleError, parseBody } from "@/lib/http";
import { studioPrompt } from "@/lib/prompts";
import { assetSchema, studioBodySchema } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await parseBody(request, studioBodySchema);
  if ("error" in body) return body.error;
  const { profile, context, request: r } = body.data;
  if (!aiEnabled()) {
    await demoDelay();
    return Response.json({ ok: true, mode: "demo", data: offlineAsset(profile, {}, r) });
  }
  try {
    const data = await generateStructured(assetSchema, studioPrompt(profile, context, r), "medium");
    return Response.json({ ok: true, mode: "ai", data });
  } catch (error) {
    return handleError(error);
  }
}
