"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  decryptSecretJson,
  encryptSecretJson,
} from "@/lib/secret-crypto";
import { generateText } from "ai";
import { getModel } from "@/lib/ai-provider";
import { buildLlmConfig } from "@/lib/user-context";

export type LlmConfigRow = {
  id: string;
  displayName: string;
  provider: string;
  credentials: Record<string, string>;
  allowedModels: string[];
  enabled: boolean;
  isDefault: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastTestAt: Date | null;
  lastTestStatus: string;
};

export async function createLlm(formData: FormData): Promise<void> {
  await requireAdmin();

  const provider = formData.get("provider") as string;
  const credentials = buildCredentials(provider, formData);
  const modelsRaw = (formData.get("allowedModels") as string | null) ?? "";
  const isDefault = formData.get("isDefault") === "true";

  const llm = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.llmConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.llmConfig.create({
      data: {
        displayName: formData.get("displayName") as string,
        provider,
        credentials: encryptSecretJson(credentials),
        allowedModels: modelsRaw.split("\n").map((m) => m.trim()).filter(Boolean),
        enabled: formData.get("enabled") === "true",
        isDefault,
      },
    });
  });

  await verifyLlmConfig(llm.id);
  revalidatePath("/admin/llm");
}

export async function updateLlm(id: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const provider = formData.get("provider") as string;
  const existing = await prisma.llmConfig.findUnique({
    where: { id },
    select: { credentials: true },
  });
  const credentials = buildCredentials(
    provider,
    formData,
    decryptSecretJson(existing?.credentials),
  );
  const modelsRaw = (formData.get("allowedModels") as string | null) ?? "";
  const isDefault = formData.get("isDefault") === "true";

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.llmConfig.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    await tx.llmConfig.update({
      where: { id },
      data: {
        displayName: formData.get("displayName") as string,
        provider,
        credentials: encryptSecretJson(credentials),
        allowedModels: modelsRaw.split("\n").map((m) => m.trim()).filter(Boolean),
        enabled: formData.get("enabled") === "true",
        isDefault,
      },
    });
  });

  revalidatePath("/admin/llm");
}

export async function deleteLlm(id: string): Promise<void> {
  await requireAdmin();
  await prisma.llmConfig.delete({ where: { id } });
  revalidatePath("/admin/llm");
}

export async function testLlmConfig(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const result = await verifyLlmConfig(id);
  revalidatePath("/admin/llm");
  return result;
}

async function verifyLlmConfig(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const llm = await prisma.llmConfig.findUnique({ where: { id } });
  if (!llm) return { ok: false, error: "LLM configuration not found." };

  const config = buildLlmConfig(llm);
  if (!config) return { ok: false, error: "LLM configuration is incomplete." };

  try {
    await generateText({
      model: getModel(config),
      messages: [{ role: "user", content: 'Say "ok" in exactly one word.' }],
      maxOutputTokens: 16,
    });
    await prisma.llmConfig.update({
      where: { id },
      data: { lastTestAt: new Date(), lastTestStatus: "connected" },
    });
    return { ok: true };
  } catch (error) {
    await prisma.llmConfig.update({
      where: { id },
      data: { lastTestAt: new Date(), lastTestStatus: "error" },
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection test failed.",
    };
  }
}

function buildCredentials(
  provider: string,
  formData: FormData,
  existing: Record<string, string> = {},
): Record<string, string> {
  const get = (key: string, preserveWhenBlank = false) => {
    const value = ((formData.get(key) as string | null) ?? "").trim();
    return preserveWhenBlank && !value ? existing[key] ?? "" : value;
  };

  switch (provider) {
    case "azure":
      return {
        endpoint: get("endpoint"),
        apiKey: get("apiKey", true),
        deployment: get("deployment"),
        apiVersion: get("apiVersion") || "2024-02-01",
      };
    case "bedrock":
      return {
        accessKeyId: get("accessKeyId"),
        secretKey: get("secretKey", true),
        region: get("region"),
      };
    case "ollama":
      return { baseUrl: get("baseUrl") };
    default:
      return { apiKey: get("apiKey", true) };
  }
}
