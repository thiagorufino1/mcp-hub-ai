import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { LlmAdminClient } from "./client";

export const metadata = { title: "LLM Config — Admin" };

export default async function AdminLlmPage() {
  await requireAdmin();
  const llms = await prisma.llmConfig.findMany({ orderBy: { createdAt: "asc" } });
  return <LlmAdminClient llms={llms as Parameters<typeof LlmAdminClient>[0]["llms"]} />;
}
