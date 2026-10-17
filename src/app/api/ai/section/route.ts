import { aiEnabled, generateStructured } from "@/lib/ai";
import { demoSection } from "@/lib/demo";
import { demoDelay, handleError, parseBody } from "@/lib/http";
import { sectionPrompt } from "@/lib/prompts";
import { sectionRequestSchema, sectionSchemas } from "@/lib/schemas";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await parseBody(request, sectionRequestSchema);
  if ("error" in body) return body.error;
  const { section, profile, context, instructions } = body.data;

  if (!aiEnabled()) {
    await demoDelay();
    return Response.json({ ok: true, mode: "demo", data: demoSection(section, profile) });
  }
  try {
    const effort = section === "financials" || section === "risks" ? "high" : "medium";
    const data = await generateStructured(sectionSchemas[section], sectionPrompt(section, profile, context, instructions), effort);
    return Response.json({ ok: true, mode: "ai", data });
  } catch (error) {
    return handleError(error);
  }
}
