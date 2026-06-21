import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { decryptSecretJson } from "@/lib/secret-crypto";
import { LlmAdminClient } from "./client";

export const metadata = { title: "LLM Config — Admin" };

export default async function AdminLlmPage() {
  await requireAdmin();
  const llms = await prisma.llmConfig.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <LlmAdminClient
      llms={llms.map((llm) => {
        const credentials = decryptSecretJson(llm.credentials);
        delete credentials.apiKey;
        delete credentials.secretKey;
        return { ...llm, credentials };
      })}
    />
  );
}
