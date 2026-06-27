"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import {
  decryptSecret,
  encryptSecret,
  encryptSecretJson,
} from "@/lib/secret-crypto";
import { resolveMcpServerTools } from "@/lib/mcp-tool-registry";
import { syncNamespaceToolsForMcpServer } from "@/lib/namespace-tool-sync";
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
  const user = await requireAdmin();

  const nameValue = formData.get("name") as string;
  const existing = await prisma.mcpServer.findUnique({ where: { name: nameValue }, select: { id: true } });
  if (existing) {
    throw new Error("Já existe um MCP Server cadastrado com este nome.");
  }

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";
  const authType = normalizeAuthType(transport, formData);
  const headers = sanitizeMcpHeaders(
    JSON.parse(headersRaw) as Record<string, string>,
    authType,
  );

  let mcp: Awaited<ReturnType<typeof prisma.mcpServer.create>>;
  try {
    mcp = await prisma.mcpServer.create({
      data: {
        name: formData.get("name") as string,
        description: (formData.get("description") as string | null) || null,
        transport,
        command: transport === "stdio" ? (formData.get("command") as string) : null,
        args: argsRaw ? argsRaw.split("\n").map((a) => a.trim()).filter(Boolean) : [],
        url: transport !== "stdio" ? (formData.get("url") as string) : null,
        env: encryptSecretJson(JSON.parse(envRaw) as Record<string, string>),
        headers: encryptSecretJson(headers),
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Já existe um MCP Server cadastrado com este nome.");
    }
    throw e;
  }

  await inspectMcpConfig(mcp.id, false);
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "mcp.create", resource: "McpServer", resourceId: mcp.id, metadata: { name: mcp.name } });
  revalidatePath("/admin/mcp");
}

export async function updateMcp(id: string, formData: FormData): Promise<void> {
  const user = await requireAdmin();

  const nameValue = formData.get("name") as string;
  const conflict = await prisma.mcpServer.findFirst({
    where: { name: nameValue, NOT: { id } },
    select: { id: true },
  });
  if (conflict) {
    throw new Error("Já existe um MCP Server cadastrado com este nome.");
  }

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";
  const existing = await prisma.mcpServer.findUnique({
    where: { id },
    select: { oauthClientSecret: true, sharedSecret: true },
  });
  const authType = normalizeAuthType(transport, formData);
  const headers = sanitizeMcpHeaders(
    JSON.parse(headersRaw) as Record<string, string>,
    authType,
  );

  try {
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
          headers: encryptSecretJson(headers),
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Já existe um MCP Server cadastrado com este nome.");
    }
    throw e;
  }

  await inspectMcpConfig(id, false);

  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "mcp.update", resource: "McpServer", resourceId: id, metadata: { name: formData.get("name") as string } });
  revalidatePath("/admin/mcp");
}

export async function setMcpToolEnabled(
  mcpServerId: string,
  toolId: string,
  enabled: boolean,
): Promise<void> {
  const user = await requireAdmin();
  await prisma.mcpToolRegistry.updateMany({
    where: { id: toolId, mcpServerId },
    data: {
      enabled,
      permissionMode: enabled ? "allow" : "blocked",
    },
  });
  await syncNamespaceToolsForMcpServer(mcpServerId);
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: enabled ? "mcp.tool.enable" : "mcp.tool.disable", resource: "McpToolRegistry", resourceId: toolId, metadata: { mcpServerId } });
  revalidatePath("/admin/mcp");
}

export async function setMcpToolPermission(
  mcpServerId: string,
  toolId: string,
  permissionMode: "allow" | "blocked",
): Promise<void> {
  const user = await requireAdmin();
  await prisma.mcpToolRegistry.updateMany({
    where: { id: toolId, mcpServerId },
    data: {
      enabled: permissionMode !== "blocked",
      permissionMode,
    },
  });
  await syncNamespaceToolsForMcpServer(mcpServerId);
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "mcp.tool.permission", resource: "McpToolRegistry", resourceId: toolId, metadata: { mcpServerId, permissionMode } });
  revalidatePath("/admin/mcp");
}

export async function setMcpEnabled(id: string, enabled: boolean): Promise<void> {
  const user = await requireAdmin();
  await prisma.mcpServer.update({
    where: { id },
    data: { enabled },
  });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: enabled ? "mcp.enable" : "mcp.disable", resource: "McpServer", resourceId: id });
  revalidatePath("/admin/mcp");
}

export async function refreshMcpConfig(
  id: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const user = await requireAdmin();
  const result = await inspectMcpConfig(id, true);
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "mcp.refresh",
    resource: "McpServer",
    resourceId: id,
    metadata: { ok: result.ok },
  });
  revalidatePath("/admin/mcp");
  return result;
}

export async function deleteMcp(id: string): Promise<void> {
  const user = await requireAdmin();
  const existing = await prisma.mcpServer.findUnique({ where: { id }, select: { name: true } });
  await prisma.mcpServer.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "mcp.delete", resource: "McpServer", resourceId: id, metadata: { name: existing?.name } });
  revalidatePath("/admin/mcp");
  redirect("/admin/mcp");
}

export async function exportMcpServers(): Promise<string> {
  await requireAdmin();

  const servers = await prisma.mcpServer.findMany({
    select: {
      name: true,
      description: true,
      transport: true,
      command: true,
      args: true,
      url: true,
      env: true,
      headers: true,
      authType: true,
      enabled: true,
    },
    orderBy: { name: "asc" },
  });

  const result: Record<string, unknown> = {};
  for (const server of servers) {
    const env =
      typeof server.env === "object" && server.env !== null
        ? (server.env as Record<string, string>)
        : {};
    const redactedEnv: Record<string, string> = {};
    for (const key of Object.keys(env)) {
      redactedEnv[key] = "[REDACTED]";
    }

    const headers =
      typeof server.headers === "object" && server.headers !== null
        ? (server.headers as Record<string, string>)
        : {};
    const redactedHeaders: Record<string, string> = {};
    for (const key of Object.keys(headers)) {
      redactedHeaders[key] = "[REDACTED]";
    }

    result[server.name] = {
      command: server.command ?? undefined,
      args: server.args,
      url: server.url ?? undefined,
      transport: server.transport,
      env: redactedEnv,
      headers: redactedHeaders,
      description: server.description ?? undefined,
      enabled: server.enabled,
      authType: server.authType,
    };
  }

  return JSON.stringify({ mcpServers: result }, null, 2);
}

type ImportMcpEntry = {
  command?: string;
  args?: string[];
  url?: string;
  transport?: string;
  env?: Record<string, string>;
  description?: string;
  enabled?: boolean;
  authType?: string;
};

export async function importMcpServers(
  json: string,
): Promise<{ imported: string[]; skipped: string[]; errors: string[] }> {
  const user = await requireAdmin();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Arquivo JSON inválido.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("mcpServers" in parsed)
  ) {
    throw new Error("Estrutura JSON inválida. Esperado campo 'mcpServers'.");
  }

  const rawMcpServers = (parsed as { mcpServers: unknown }).mcpServers;
  if (typeof rawMcpServers !== "object" || rawMcpServers === null || Array.isArray(rawMcpServers)) {
    throw new Error("Campo 'mcpServers' deve ser um objeto.");
  }
  const mcpServers = rawMcpServers as Record<string, unknown>;
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const [name, entryRaw] of Object.entries(mcpServers)) {
    const entry = (typeof entryRaw === "object" && entryRaw !== null ? entryRaw : {}) as ImportMcpEntry;
    try {
      const existing = await prisma.mcpServer.findUnique({
        where: { name },
        select: { id: true },
      });
      if (existing) {
        skipped.push(name);
        continue;
      }

      const transport = (
        entry.transport ?? (entry.command ? "stdio" : "streamable-http")
      ) as string;

      if (transport === "stdio" && !entry.command) {
        errors.push(
          `${name}: campo 'command' obrigatório para transport stdio.`,
        );
        continue;
      }
      if (transport !== "stdio" && !entry.url) {
        errors.push(
          `${name}: campo 'url' obrigatório para transport ${transport}.`,
        );
        continue;
      }

      const created = await prisma.mcpServer.create({
        data: {
          name,
          description: entry.description ?? null,
          transport,
          command: entry.command ?? null,
          args: entry.args ?? [],
          url: entry.url ?? null,
          env: entry.env ?? {},
          headers: {},
          authType: entry.authType ?? "none",
          enabled: entry.enabled ?? true,
        },
      });

      logAudit({
        userId: user.id,
        userEmail: user.email ?? undefined,
        action: "mcp.create",
        resource: "McpServer",
        resourceId: created.id,
        metadata: { name, source: "import" },
      });

      imported.push(name);
    } catch (err) {
      errors.push(
        `${name}: ${err instanceof Error ? err.message : "Erro desconhecido."}`,
      );
    }
  }

  revalidatePath("/admin/mcp");
  return { imported, skipped, errors };
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
    await syncNamespaceToolsForMcpServer(id);
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

function sanitizeMcpHeaders(
  headers: Record<string, string>,
  authType: string,
) {
  if (authType !== "oauth_delegated") return headers;
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== "authorization"),
  );
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
