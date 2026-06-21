export type LLMConfig =
  | { provider: "openai"; apiKey: string; model: string }
  | {
      provider: "azure";
      endpoint: string;
      apiKey: string;
      deployment: string;
      apiVersion: string;
    }
  | {
      provider: "bedrock";
      accessKeyId: string;
      secretKey: string;
      region: string;
      modelId: string;
    }
  | { provider: "google"; apiKey: string; model: string }
  | { provider: "ollama"; baseUrl: string; model: string }
  | { provider: "anthropic"; apiKey: string; model: string }
  | { provider: "groq"; apiKey: string; model: string }
  | { provider: "xai"; apiKey: string; model: string }
  | { provider: "mistral"; apiKey: string; model: string }
  | { provider: "deepseek"; apiKey: string; model: string };

export const LLM_CONFIG_STORAGE_KEY = "mcp-hub-llm-config";
export const LEGACY_LLM_CONFIG_STORAGE_KEY = "mcp-hub-llm-config";
export const LLM_CONFIGURED_COOKIE = "mcp-hub-configured";
