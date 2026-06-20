import { prisma } from "@/lib/db";
import type { McpServerConfig } from "@/types/mcp";
import type { LLMConfig } from "@/types/llm-config";

export type SkillOption = {
  id: string;
  name: string;
  description: string | null;
  content: string;
};

export type UserContext = {
  mcpServers: McpServerConfig[];
  skills: SkillOption[];
  allowedModels: string[];
  llmConfig: LLMConfig | null;
};

export async function getUserContext(
  entraGroups: string[],
  selectedModel?: string,
): Promise<UserContext> {
  const empty: UserContext = { mcpServers: [], skills: [], allowedModels: [], llmConfig: null };

  if (entraGroups.length === 0) return empty;

  try {
    const [policies, defaultLlm] = await Promise.all([
      prisma.accessPolicy.findMany({
        where: { group: { entraGroupId: { in: entraGroups } } },
        include: {
          mcpServers: { where: { enabled: true } },
          skills: { where: { enabled: true } },
        },
      }),
      prisma.llmConfig.findFirst({
        where: { enabled: true, isDefault: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const mcpMap = new Map<string, (typeof policies)[0]["mcpServers"][0]>();
    const skillMap = new Map<string, SkillOption>();
    const modelSet = new Set<string>();

    for (const policy of policies) {
      for (const mcp of policy.mcpServers) mcpMap.set(mcp.id, mcp);
      for (const skill of policy.skills) {
        skillMap.set(skill.id, {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          content: skill.content,
        });
      }
      for (const model of policy.allowedModels) modelSet.add(model);
    }

    // Validate selectedModel against the union of policy allowedModels AND the LLM's own allowedModels.
    // A model must appear in BOTH to be accepted — prevents clients from requesting arbitrary models
    // against corporate provider credentials.
    const llmAllowedSet = new Set(defaultLlm?.allowedModels ?? []);
    const validatedModel =
      selectedModel &&
      modelSet.has(selectedModel) &&
      llmAllowedSet.has(selectedModel)
        ? selectedModel
        : undefined;

    return {
      mcpServers: [...mcpMap.values()].map(dbMcpToConfig),
      skills: [...skillMap.values()],
      allowedModels: [...modelSet],
      llmConfig: defaultLlm ? buildLlmConfig(defaultLlm, validatedModel) : null,
    };
  } catch (error) {
    console.error("[getUserContext] Failed to resolve user context:", error);
    return empty;
  }
}

function dbMcpToConfig(mcp: {
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
  enabled: boolean;
}): McpServerConfig {
  return {
    id: mcp.id,
    name: mcp.name,
    description: mcp.description ?? undefined,
    transport: mcp.transport as McpServerConfig["transport"],
    command: mcp.command ?? undefined,
    args: mcp.args,
    url: mcp.url ?? undefined,
    env: (mcp.env as Record<string, string>) ?? {},
    headers: (mcp.headers as Record<string, string>) ?? {},
    authMode: "none",
    oauth: undefined,
    tools: [],
    connectionStatus: "pending",
    approvalMode: "always",
    approvedToolNames: [],
    enabled: mcp.enabled,
    lastCheckedAt: undefined,
    errorMessage: undefined,
  };
}

export function buildLlmConfig(
  llm: { provider: string; credentials: unknown; allowedModels: string[] },
  selectedModel?: string,
): LLMConfig | null {
  const creds = (llm.credentials as Record<string, string>) ?? {};
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
