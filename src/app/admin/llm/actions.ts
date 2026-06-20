"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type LlmConfigRow = {
  id: string;
  displayName: string;
  provider: string;
  credentials: Record<string, string>;
  allowedModels: string[];
  enabled: boolean;
  isDefault: boolean;
};

export async function createLlm(formData: FormData): Promise<void> {
  await requireAdmin();

  const provider = formData.get("provider") as string;
  const credentials = buildCredentials(provider, formData);
  const modelsRaw = (formData.get("allowedModels") as string | null) ?? "";

  await prisma.llmConfig.create({
    data: {
      displayName: formData.get("displayName") as string,
      provider,
      credentials,
      allowedModels: modelsRaw.split("\n").map((m) => m.trim()).filter(Boolean),
      enabled: formData.get("enabled") === "true",
      isDefault: formData.get("isDefault") === "true",
    },
  });

  revalidatePath("/admin/llm");
}

export async function updateLlm(id: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const provider = formData.get("provider") as string;
  const credentials = buildCredentials(provider, formData);
  const modelsRaw = (formData.get("allowedModels") as string | null) ?? "";

  await prisma.llmConfig.update({
    where: { id },
    data: {
      displayName: formData.get("displayName") as string,
      provider,
      credentials,
      allowedModels: modelsRaw.split("\n").map((m) => m.trim()).filter(Boolean),
      enabled: formData.get("enabled") === "true",
      isDefault: formData.get("isDefault") === "true",
    },
  });

  revalidatePath("/admin/llm");
}

export async function deleteLlm(id: string): Promise<void> {
  await requireAdmin();
  await prisma.llmConfig.delete({ where: { id } });
  revalidatePath("/admin/llm");
}

function buildCredentials(provider: string, formData: FormData): Record<string, string> {
  const get = (key: string) => (formData.get(key) as string | null) ?? "";

  switch (provider) {
    case "azure":
      return {
        endpoint: get("endpoint"),
        apiKey: get("apiKey"),
        deployment: get("deployment"),
        apiVersion: get("apiVersion") || "2024-02-01",
      };
    case "bedrock":
      return {
        accessKeyId: get("accessKeyId"),
        secretKey: get("secretKey"),
        region: get("region"),
      };
    case "ollama":
      return { baseUrl: get("baseUrl") };
    default:
      return { apiKey: get("apiKey") };
  }
}
