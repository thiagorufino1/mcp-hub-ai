import { prisma } from "@/lib/db";
import type { McpServerConfig } from "@/types/mcp";
import type { LLMConfig } from "@/types/llm-config";
import {
  decryptSecret,
  decryptSecretJson,
} from "@/lib/secret-crypto";
import { resolveDelegatedAuthorizationHeaders } from "@/lib/delegated-oauth";

export type UserContext = {
  mcpServers: McpServerConfig[];
  allowedModels: string[];
  llmConfig: LLMConfig | null;
  llmConfigId: string | null;
};

export async function getUserContext(
  entraGroups: string[],
  selectedModel?: string,
  userId?: string,
): Promise<UserContext> {
  const empty: UserContext = { mcpServers: [], allowedModels: [], llmConfig: null, llmConfigId: null };

  try {
    const [accessibleNamespaces, defaultLlm] = await Promise.all([
      prisma.mcpNamespace.findMany({
        where: {
          enabled: true,
          published: true,
          OR: [
            ...(userId ? [{ users: { some: { id: userId } } }] : []),
            ...(entraGroups.length > 0 ? [{ groups: { some: { entraGroupId: { in: entraGroups } } } }] : []),
            { AND: [{ groups: { none: {} } }, { users: { none: {} } }] },
          ],
        },
        include: {
          servers: {
            where: { enabled: true },
            include: { mcpServer: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      }),
      prisma.llmConfig.findFirst({
        where: { enabled: true, isDefault: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const mcpMap = new Map<string, {
      id: string; name: string; description: string | null; transport: string;
      command: string | null; args: string[]; url: string | null;
      env: unknown; headers: unknown; authType: string; sharedSecret: string | null; enabled: boolean;
    }>();
    const modelSet = new Set<string>();

    for (const ns of accessibleNamespaces) {
      for (const entry of ns.servers) {
        mcpMap.set(entry.mcpServer.id, entry.mcpServer);
      }
    }

    const resolvedLlm = defaultLlm;
    if (resolvedLlm) {
      for (const m of resolvedLlm.allowedModels) modelSet.add(m);
    }

    // Filter out MCPs the user has explicitly disabled
    if (userId && mcpMap.size > 0) {
      const prefs = await prisma.userMcpPreference.findMany({
        where: { userId, mcpServerId: { in: [...mcpMap.keys()] }, enabled: false },
        select: { mcpServerId: true },
      });
      for (const { mcpServerId } of prefs) mcpMap.delete(mcpServerId);
    }

    const delegatedHeaders =
      userId && mcpMap.size > 0
        ? await resolveDelegatedAuthorizationHeaders(userId, [...mcpMap.keys()])
        : new Map<string, string>();

    const llmAllowedSet = new Set(resolvedLlm?.allowedModels ?? []);
    const validatedModel =
      selectedModel &&
      modelSet.has(selectedModel) &&
      llmAllowedSet.has(selectedModel)
        ? selectedModel
        : undefined;

    return {
      mcpServers: [...mcpMap.values()].map((mcp) =>
        dbMcpToConfig(mcp, delegatedHeaders.get(mcp.id)),
      ),
      allowedModels: [...modelSet],
      llmConfig: resolvedLlm ? buildLlmConfig(resolvedLlm, validatedModel) : null,
      llmConfigId: resolvedLlm?.id ?? null,
    };
  } catch (error) {
    console.error("[getUserContext] Failed to resolve user context:", error);
    return empty;
  }
}

export function dbMcpToConfig(mcp: {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
  env: unknown;
  headers: unknown;
  authType: string;
  sharedSecret: string | null;
  enabled: boolean;
}, delegatedAuthorization?: string): McpServerConfig {
  const storedHeaders = decryptSecretJson(mcp.headers);
  const baseHeaders =
    mcp.authType === "oauth_delegated"
      ? withoutAuthorizationHeader(storedHeaders)
      : storedHeaders;
  const resolvedDelegatedAuthorization = delegatedAuthorization?.trim();
  const resolvedHeaders =
    mcp.authType === "oauth_delegated" && resolvedDelegatedAuthorization
      ? {
          ...baseHeaders,
          Authorization: resolvedDelegatedAuthorization,
        }
      : mcp.authType === "shared_key" && mcp.sharedSecret
      ? {
          ...baseHeaders,
          Authorization: `Bearer ${decryptSecret(mcp.sharedSecret)}`,
        }
      : baseHeaders;

  return {
    id: mcp.id,
    name: mcp.name,
    description: mcp.description ?? undefined,
    transport: mcp.transport as McpServerConfig["transport"],
    command: mcp.command ?? undefined,
    args: mcp.args,
    url: mcp.url ?? undefined,
    env: decryptSecretJson(mcp.env),
    headers: resolvedHeaders,
    authMode: mcp.authType === "oauth_delegated" ? "oauth" : "none",
    oauth: undefined,
    tools: [],
    connectionStatus: "pending",
    approvalMode: "always",
    enabled:
      mcp.enabled &&
      (mcp.authType !== "oauth_delegated" || Boolean(resolvedDelegatedAuthorization)),
    requiresUserAuthorization: mcp.authType === "oauth_delegated",
    userAuthorizationStatus: resolvedDelegatedAuthorization ? "connected" : "required",
    lastCheckedAt: undefined,
    errorMessage: undefined,
  };
}

function withoutAuthorizationHeader(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== "authorization"),
  );
}

export function buildLlmConfig(
  llm: { provider: string; credentials: unknown; allowedModels: string[] },
  selectedModel?: string,
): LLMConfig | null {
  const creds = decryptSecretJson(llm.credentials);
  // selectedModel is already validated upstream in getUserContext; enforce again as defense-in-depth
  if (selectedModel && !llm.allowedModels.includes(selectedModel)) return null;
  const model = selectedModel || llm.allowedModels[0] || "";

  if (!model) return null;

  switch (llm.provider) {
    case "openai":
      return { provider: "openai", apiKey: creds["apiKey"] ?? "", model };
    case "anthropic":
      return { provider: "anthropic", apiKey: creds["apiKey"] ?? "", model };
    case "google":
      return { provider: "google", apiKey: creds["apiKey"] ?? "", model };
    case "azure":
      return {
        provider: "azure",
        apiKey: creds["apiKey"] ?? "",
        endpoint: creds["endpoint"] ?? "",
        deployment: creds["deployment"] ?? model,
        apiVersion: creds["apiVersion"] ?? "2024-02-01",
      };
    case "bedrock":
      return {
        provider: "bedrock",
        accessKeyId: creds["accessKeyId"] ?? "",
        secretKey: creds["secretKey"] ?? "",
        region: creds["region"] ?? "us-east-1",
        modelId: model,
      };
    case "ollama":
      return { provider: "ollama", baseUrl: creds["baseUrl"] ?? "http://localhost:11434", model };
    case "groq":
      return { provider: "groq", apiKey: creds["apiKey"] ?? "", model };
    case "xai":
      return { provider: "xai", apiKey: creds["apiKey"] ?? "", model };
    case "mistral":
      return { provider: "mistral", apiKey: creds["apiKey"] ?? "", model };
    case "deepseek":
      return { provider: "deepseek", apiKey: creds["apiKey"] ?? "", model };
    default:
      return null;
  }
}
