import { generateText } from "ai";

import { auth } from "@/lib/auth";
import { getModel } from "@/lib/ai-provider";
import type { LLMConfig } from "@/types/llm-config";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!session.user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("llmConfig" in body) ||
    typeof (body as Record<string, unknown>).llmConfig !== "object" ||
    typeof ((body as Record<string, Record<string, unknown>>).llmConfig).provider !== "string"
  ) {
    return Response.json({ ok: false, error: "Missing llmConfig" }, { status: 400 });
  }

  const llmConfig = (body as { llmConfig: LLMConfig }).llmConfig;

  try {
    const model = getModel(llmConfig);
    const result = await generateText({
      model,
      messages: [{ role: "user", content: 'Say "ok" in exactly one word.' }],
      maxOutputTokens: 16,
    });
    return Response.json({ ok: true, text: result.text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
