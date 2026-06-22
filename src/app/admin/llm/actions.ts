"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
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
  const user = await requireAdmin();

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

  const result = await verifyLlmConfig(llm.id);
  if (result.latencyMs != null) {
    logAudit({
      userId: user.id,
      userEmail: user.email ?? undefined,
      action: "llm.test",
      resource: "LlmConfig",
      resourceId: llm.id,
      metadata: {
        ok: result.ok,
        latencyMs: result.latencyMs,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      },
    });
  }
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "llm.create", resource: "LlmConfig", resourceId: llm.id, metadata: { provider, displayName: formData.get("displayName") as string } });
  revalidatePath("/admin/llm");
}

export async function updateLlm(id: string, formData: FormData): Promise<void> {
  const user = await requireAdmin();

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

  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "llm.update", resource: "LlmConfig", resourceId: id, metadata: { provider } });
  revalidatePath("/admin/llm");
}

export async function setDefaultLlm(id: string, isDefault: boolean): Promise<void> {
  const user = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.llmConfig.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    await tx.llmConfig.update({
      where: { id },
      data: { isDefault },
    });
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "llm.default",
    resource: "LlmConfig",
    resourceId: id,
    metadata: { isDefault },
  });
  revalidatePath("/admin/llm");
}

export async function deleteLlm(id: string): Promise<void> {
  const user = await requireAdmin();
  const existing = await prisma.llmConfig.findUnique({ where: { id }, select: { displayName: true } });
  await prisma.llmConfig.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "llm.delete", resource: "LlmConfig", resourceId: id, metadata: { displayName: existing?.displayName } });
  revalidatePath("/admin/llm");
}

export async function testLlmConfig(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin();
  const result = await verifyLlmConfig(id);
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "llm.test",
    resource: "LlmConfig",
    resourceId: id,
    metadata: {
      ok: result.ok,
      latencyMs: result.latencyMs ?? 0,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
    },
  });
  revalidatePath("/admin/llm");
  return result;
}

async function verifyLlmConfig(
  id: string,
): Promise<{ ok: boolean; error?: string; latencyMs?: number; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }> {
  const llm = await prisma.llmConfig.findUnique({ where: { id } });
  if (!llm) return { ok: false, error: "LLM configuration not found." };

  const config = buildLlmConfig(llm);
  if (!config) return { ok: false, error: "LLM configuration is incomplete." };

  try {
    const startedAt = Date.now();
    const result = await generateText({
      model: getModel(config),
      messages: [{ role: "user", content: 'Say "ok" in exactly one word.' }],
      maxOutputTokens: 16,
    });
    const usage = result.usage;
    await prisma.llmConfig.update({
      where: { id },
      data: { lastTestAt: new Date(), lastTestStatus: "connected" },
    });
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      usage: usage
        ? {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    await prisma.llmConfig.update({
      where: { id },
      data: { lastTestAt: new Date(), lastTestStatus: "error" },
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection test failed.",
      latencyMs: 0,
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
