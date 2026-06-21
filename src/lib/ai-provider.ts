import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

import type { LLMConfig } from "@/types/llm-config";

export function getModel(config: LLMConfig): LanguageModel {
  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    case "azure": {
      const azure = createAzure({
        baseURL: normalizeAzureBaseUrl(config.endpoint),
        apiKey: config.apiKey,
        apiVersion: config.apiVersion,
        useDeploymentBasedUrls: true,
      });
      return azure.chat(config.deployment);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      return google(config.model);
    }
    case "bedrock": {
      const bedrock = createAmazonBedrock({
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretKey,
      });
      return bedrock(config.modelId);
    }
    case "ollama": {
      const ollama = createOpenAI({
        baseURL: `${config.baseUrl.replace(/\/$/, "")}/v1`,
        apiKey: "ollama",
      });
      return ollama(config.model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case "groq": {
      const groq = createGroq({ apiKey: config.apiKey });
      return groq(config.model);
    }
    case "xai": {
      const xai = createXai({ apiKey: config.apiKey });
      return xai(config.model);
    }
    case "mistral": {
      const mistral = createMistral({ apiKey: config.apiKey });
      return mistral(config.model);
    }
    case "deepseek": {
      const deepseek = createDeepSeek({ apiKey: config.apiKey });
      return deepseek(config.model);
    }
  }
}

function normalizeAzureBaseUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/openai") ? trimmed : `${trimmed}/openai`;
}
