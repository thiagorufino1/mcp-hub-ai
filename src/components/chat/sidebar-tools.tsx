"use client";

import { LlmConfigSection } from "@/components/chat/llm-config-section";
import { ModelSelector } from "@/components/chat/model-selector";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { LLMConfig } from "@/types/llm-config";
import type { TokenUsage } from "@/types/chat";

type SidebarToolsContentProps = {
  llmConfig: LLMConfig | null;
  onChangeLlmConfig: (config: LLMConfig | null) => void;
  usageTotals: TokenUsage;
  usageState: "idle" | "available" | "unavailable";
  allowedModels: string[];
  hasCorporateLlm: boolean;
  selectedModel: string | null;
  onModelChange: (model: string) => void;
};

export function SidebarToolsContent({
  llmConfig,
  onChangeLlmConfig,
  usageTotals,
  usageState,
  allowedModels,
  hasCorporateLlm,
  selectedModel,
  onModelChange,
}: SidebarToolsContentProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-3">
        {allowedModels.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-black/[0.06] dark:ring-white/[0.06]" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div className="px-4 py-4 space-y-3">
              <ModelSelector
                models={allowedModels}
                selectedModel={selectedModel}
                onChange={onModelChange}
              />
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-black/[0.06] dark:ring-white/[0.06]" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div className="px-4 py-4">
            {!hasCorporateLlm && (
              <LlmConfigSection
                value={llmConfig}
                onChange={onChangeLlmConfig}
                usageTotals={usageTotals}
                usageState={usageState}
              />
            )}
            {hasCorporateLlm && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">LLM</p>
                <p className="text-xs text-muted-foreground px-1">Configurado pelo admin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
