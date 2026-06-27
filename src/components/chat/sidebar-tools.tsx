"use client";

import { LlmConfigSection } from "@/components/chat/llm-config-section";
import { ModelSelector } from "@/components/chat/model-selector";
import { SystemPromptSection } from "@/components/chat/system-prompt-section";
import type { SystemPrompt } from "@/components/chat/system-prompt-section";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { LLMConfig } from "@/types/llm-config";
import type { TokenUsage } from "@/types/chat";


type SidebarToolsContentProps = {
  systemPrompts: SystemPrompt[];
  activePromptId: string | null;
  onAddPrompt: (prompt: SystemPrompt) => void;
  onEditPrompt: (prompt: SystemPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onSelectPrompt: (id: string | null) => void;
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
  systemPrompts,
  activePromptId,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
  onSelectPrompt,
  llmConfig,
  onChangeLlmConfig,
  usageTotals,
  usageState,
  allowedModels,
  hasCorporateLlm,
  selectedModel,
  onModelChange,
}: SidebarToolsContentProps) {
  const { t: _t } = useAppPreferences();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-black/[0.06] dark:ring-white/[0.06]" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div className="px-4 py-4">
            <SystemPromptSection
              prompts={systemPrompts}
              activePromptId={activePromptId}
              onAdd={onAddPrompt}
              onEdit={onEditPrompt}
              onDelete={onDeletePrompt}
              onSelect={onSelectPrompt}
            />
          </div>
        </div>

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
                <p className="text-xs text-muted-foreground px-1">Configured by admin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

type SidebarToolsProps = SidebarToolsContentProps;

export function SidebarTools(props: SidebarToolsProps) {
  return (
    <div className="sticky top-5 py-6">
      <div
        className="app-scroll max-h-[calc(100dvh-132px)] overflow-y-auto pr-1"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <SidebarToolsContent {...props} />
      </div>
    </div>
  );
}
