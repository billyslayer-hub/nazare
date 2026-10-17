import { aiEnabled, MODEL, researchEnabled } from "@/lib/ai";

export async function GET() {
  return Response.json({ ai: aiEnabled(), research: researchEnabled(), model: aiEnabled() ? MODEL : null });
}
