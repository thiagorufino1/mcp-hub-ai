"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  decryptSecret,
  encryptSecret,
  encryptSecretJson,
} from "@/lib/secret-crypto";
import { resolveMcpServerTools } from "@/lib/mcp-tool-registry";
import { discoverMcpOAuth } from "@/lib/mcp-oauth";
import { dbMcpToConfig } from "@/lib/user-context";

export type McpServerRow = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
  headers: Record<string, string>;
  authType: string;
  sharedSecret: string | null;
  oauthClientId: string | null;
  oauthClientSecret: string | null;
  oauthScopes: string | null;
  enabled: boolean;
  healthStatus: string;
  lastHealthCheckAt: Date | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
  connectionTimeoutMs: number;
  toolTimeoutMs: number;
  maxRetries: number;
  failureThreshold: number;
  circuitCooldownMs: number;
  maxConcurrentCalls: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  circuitState: string;
  circuitOpenedAt: Date | null;
  registryTools: {
    id: string;
    name: string;
    displayName: string | null;
    enabled: boolean;
    permissionMode: string;
    readOnly: boolean;
    destructive: boolean;
  }[];
};

export async function createMcp(formData: FormData): Promise<void> {
  await requireAdmin();

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";
  const authType = normalizeAuthType(transport, formData);

  const mcp = await prisma.mcpServer.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      transport,
      command: transport === "stdio" ? (formData.get("command") as string) : null,
      args: argsRaw ? argsRaw.split("\n").map((a) => a.trim()).filter(Boolean) : [],
      url: transport !== "stdio" ? (formData.get("url") as string) : null,
      env: encryptSecretJson(JSON.parse(envRaw) as Record<string, string>),
      headers: encryptSecretJson(JSON.parse(headersRaw) as Record<string, string>),
      authType,
      sharedSecret: null,
      oauthClientId:
        authType === "oauth_delegated"
          ? (formData.get("oauthClientId") as string | null) || null
          : null,
      oauthClientSecret:
        authType === "oauth_delegated"
          ? optionalEncryptedValue(formData, "oauthClientSecret")
          : null,
      oauthScopes:
        authType === "oauth_delegated"
          ? (formData.get("oauthScopes") as string | null) || null
          : null,
      enabled: formData.get("enabled") === "true",
      ...runtimePolicyFromForm(formData),
    },
  });

  await inspectMcpConfig(mcp.id, false);
  revalidatePath("/admin/mcp");
}

export async function updateMcp(id: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";
  const existing = await prisma.mcpServer.findUnique({
    where: { id },
    select: { oauthClientSecret: true, sharedSecret: true },
  });
  const authType = normalizeAuthType(transport, formData);

  await prisma.$transaction([
    prisma.mcpToolRegistry.deleteMany({ where: { mcpServerId: id } }),
    prisma.mcpServer.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      transport,
      command: transport === "stdio" ? (formData.get("command") as string) : null,
      args: argsRaw ? argsRaw.split("\n").map((a) => a.trim()).filter(Boolean) : [],
      url: transport !== "stdio" ? (formData.get("url") as string) : null,
      env: encryptSecretJson(JSON.parse(envRaw) as Record<string, string>),
      headers: encryptSecretJson(JSON.parse(headersRaw) as Record<string, string>),
      authType,
      sharedSecret: null,
      oauthClientId:
        authType === "oauth_delegated"
          ? (formData.get("oauthClientId") as string | null) || null
          : null,
      oauthClientSecret:
        authType === "oauth_delegated"
          ? optionalEncryptedValue(
              formData,
              "oauthClientSecret",
              decryptSecret(existing?.oauthClientSecret),
            )
          : null,
      oauthScopes:
        authType === "oauth_delegated"
          ? (formData.get("oauthScopes") as string | null) || null
          : null,
      enabled: formData.get("enabled") === "true",
      healthStatus: "unknown",
      lastHealthCheckAt: null,
      lastLatencyMs: null,
      consecutiveFailures: 0,
      circuitState: "closed",
      circuitOpenedAt: null,
      ...runtimePolicyFromForm(formData),
    },
    }),
  ]);

  revalidatePath("/admin/mcp");
}

export async function setMcpToolEnabled(
  mcpServerId: string,
  toolId: string,
  enabled: boolean,
): Promise<void> {
  await requireAdmin();
  await prisma.mcpToolRegistry.updateMany({
    where: { id: toolId, mcpServerId },
    data: {
      enabled,
      permissionMode: enabled ? "allow" : "blocked",
    },
  });
  revalidatePath("/admin/mcp");
}

export async function setMcpToolPermission(
  mcpServerId: string,
  toolId: string,
  permissionMode: "allow" | "approval" | "blocked",
): Promise<void> {
  await requireAdmin();
  await prisma.mcpToolRegistry.updateMany({
    where: { id: toolId, mcpServerId },
    data: {
      enabled: permissionMode !== "blocked",
      permissionMode,
    },
  });
  revalidatePath("/admin/mcp");
}

export async function setMcpEnabled(id: string, enabled: boolean): Promise<void> {
  await requireAdmin();
  await prisma.mcpServer.update({
    where: { id },
    data: { enabled },
  });
  revalidatePath("/admin/mcp");
}

export async function refreshMcpConfig(
  id: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  await requireAdmin();
  const result = await inspectMcpConfig(id, true);
  revalidatePath("/admin/mcp");
  return result;
}

export async function deleteMcp(id: string): Promise<void> {
  await requireAdmin();
  await prisma.mcpServer.delete({ where: { id } });
  revalidatePath("/admin/mcp");
}

async function inspectMcpConfig(
  id: string,
  forceRefresh: boolean,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const mcp = await prisma.mcpServer.findUnique({ where: { id } });
  if (!mcp) return { ok: false, error: "MCP server not found." };

  try {
    if (mcp.authType === "oauth_delegated") {
      if (!mcp.url) {
        return { ok: false, error: "OAuth MCP server requires a remote URL." };
      }
      await discoverMcpOAuth(mcp.url);
      await prisma.mcpServer.update({
        where: { id },
        data: {
          healthStatus: "authorization_required",
          lastHealthCheckAt: new Date(),
          lastLatencyMs: null,
        },
      });
      return { ok: true, status: "authorization_required" };
    }

    const inspected = await resolveMcpServerTools(dbMcpToConfig(mcp), {
      forceRefresh,
    });
    if (inspected.connectionStatus !== "connected") {
      return {
        ok: false,
        error: inspected.errorMessage ?? "MCP connection failed.",
      };
    }
    return { ok: true, status: "connected" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "MCP connection failed.",
    };
  }
}

function normalizeAuthType(transport: string, formData: FormData) {
  if (transport === "stdio") return "none";
  return formData.get("authType") === "oauth_delegated"
    ? "oauth_delegated"
    : "none";
}

function optionalEncryptedValue(
  formData: FormData,
  key: string,
  existing = "",
) {
  const submitted = ((formData.get(key) as string | null) ?? "").trim();
  const value = submitted || existing;
  return value ? encryptSecret(value) : null;
}

function runtimePolicyFromForm(formData: FormData) {
  return {
    circuitCooldownMs: integerField(formData, "circuitCooldownMs", 60_000, 1_000, 3_600_000),
    connectionTimeoutMs: integerField(formData, "connectionTimeoutMs", 10_000, 1_000, 120_000),
    failureThreshold: integerField(formData, "failureThreshold", 3, 1, 100),
    maxConcurrentCalls: integerField(formData, "maxConcurrentCalls", 5, 1, 1_000),
    maxRetries: integerField(formData, "maxRetries", 1, 0, 10),
    rateLimitRequests: integerField(formData, "rateLimitRequests", 60, 0, 100_000),
    rateLimitWindowMs: integerField(formData, "rateLimitWindowMs", 60_000, 1_000, 3_600_000),
    toolTimeoutMs: integerField(formData, "toolTimeoutMs", 30_000, 1_000, 600_000),
  };
}

function integerField(
  formData: FormData,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}
