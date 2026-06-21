// src/components/setup/provider-selector.tsx
"use client";

import { ProviderLogo } from "@/components/setup/provider-logo";
import { cn } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";

type ProviderType = LLMConfig["provider"];

export type Provider = {
  id: ProviderType;
  name: string;
  shortName: string;
  label: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    label: "Claude 3.5, Opus...",
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    shortName: "Bedrock",
    label: "Claude, Titan, Llama...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    label: "V3, R1...",
  },
  {
    id: "google",
    name: "Google Gemini",
    shortName: "Gemini",
    label: "Gemini 2.0, 1.5 Pro...",
  },
  {
    id: "groq",
    name: "Groq",
    shortName: "Groq",
    label: "Llama, Mixtral...",
  },
  {
    id: "azure",
    name: "Microsoft Foundry",
    shortName: "Foundry",
    label: "Endpoint corporativo",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    shortName: "Mistral",
    label: "Large, Codestral...",
  },
  {
    id: "ollama",
    name: "Ollama",
    shortName: "Ollama",
    label: "Modelos locais",
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    label: "GPT-4o, o3-mini...",
  },
  {
    id: "xai",
    name: "xAI",
    shortName: "xAI",
    label: "Grok 2, Grok Vision...",
  },
];

export function getProviderMeta(providerId: ProviderType | null) {
  return PROVIDERS.find((provider) => provider.id === providerId) ?? null;
}

type Props = {
  selected: ProviderType | null;
  onSelect: (provider: ProviderType) => void;
};

export function ProviderSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PROVIDERS.map((provider) => {
        const isSelected = selected === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={cn(
              "flex min-h-[92px] flex-col justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
              isSelected
                ? "border-sky-400 bg-sky-50/80 shadow-[0_8px_24px_rgba(0,155,222,0.12)] dark:border-sky-600 dark:bg-sky-950/35"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-sky-200 hover:bg-sky-50/30 dark:hover:bg-sky-950/20",
            )}
          >
            <div className="flex items-center gap-3">
              <ProviderLogo provider={provider.id} className="size-10 rounded-2xl" iconClassName="size-5" />
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Provider
                </span>
                <span
                  className={cn(
                    "block text-[15px] font-semibold tracking-[-0.02em]",
                    isSelected ? "text-blue-700" : "text-[var(--color-text-primary)]",
                  )}
                >
                  {provider.name}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="block text-[12px] leading-5 text-[var(--color-text-secondary)]">
                {provider.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
