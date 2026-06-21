"use client";

import { Anthropic, Aws, AzureAI, DeepSeek, Gemini, Groq, Mistral, Ollama, OpenAI, XAI } from "@lobehub/icons";
import { cn } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";

type ProviderType = LLMConfig["provider"];

type Props = {
  provider: ProviderType;
  className?: string;
  iconClassName?: string;
  flat?: boolean;
};

export function ProviderLogo({ provider, className, iconClassName, flat = false }: Props) {
  const shellClassName =
    flat
      ? "inline-flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-none"
      : "inline-flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-none dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]";

  const sizeMatch = iconClassName?.match(/size-(\d+)/);
  const sizePx = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 24;

  const iconMap: Record<ProviderType, React.ReactNode> = {
    openai: <OpenAI size={sizePx} />,
    azure: <AzureAI.Color size={sizePx} />,
    google: <Gemini.Color size={sizePx} />,
    bedrock: <Aws.Color size={sizePx} />,
    ollama: <Ollama size={sizePx} />,
    anthropic: <Anthropic size={sizePx} />,
    groq: <Groq size={sizePx} />,
    xai: <XAI size={sizePx} />,
    mistral: <Mistral.Color size={sizePx} />,
    deepseek: <DeepSeek.Color size={sizePx} />,
  };

  return <span className={cn(shellClassName, className)}>{iconMap[provider]}</span>;
}
