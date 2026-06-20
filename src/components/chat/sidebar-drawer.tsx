"use client";

import { X } from "@/components/ui/icons";
import { useEffect, useId, useRef } from "react";

import { SidebarToolsContent } from "@/components/chat/sidebar-tools";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { LLMConfig } from "@/types/llm-config";
import type { McpServerConfig } from "@/types/mcp";
import type { SystemPrompt } from "@/components/chat/system-prompt-section";
import type { TokenUsage } from "@/types/chat";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  systemPrompts: SystemPrompt[];
  activePromptId: string | null;
  onAddPrompt: (prompt: SystemPrompt) => void;
  onEditPrompt: (prompt: SystemPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onSelectPrompt: (id: string | null) => void;
  onAddServer: () => void;
  onEditServer: (serverId: string) => void;
  onRemoveServer: (serverId: string) => void;
  onRetestServer: (serverId: string) => void;
  onToggleServerEnabled: (serverId: string) => void;
  retestingServerIds: string[];
  togglingServerIds: string[];
  servers: McpServerConfig[];
  llmConfig: LLMConfig | null;
  onChangeLlmConfig: (config: LLMConfig | null) => void;
  usageTotals: TokenUsage;
  usageState: "idle" | "available" | "unavailable";
  userSkills: { id: string; name: string; description: string | null }[];
  allowedModels: string[];
  hasCorporateLlm: boolean;
  selectedSkillId: string | null;
  selectedModel: string | null;
  onSkillChange: (id: string | null) => void;
  onModelChange: (model: string) => void;
};

export function SidebarDrawer({
  isOpen,
  onClose,
  systemPrompts,
  activePromptId,
  onAddPrompt,
  onEditPrompt,
  onDeletePrompt,
  onSelectPrompt,
  onAddServer,
  onEditServer,
  onRemoveServer,
  onRetestServer,
  onToggleServerEnabled,
  retestingServerIds,
  togglingServerIds,
  servers,
  llmConfig,
  onChangeLlmConfig,
  usageTotals,
  usageState,
  userSkills,
  allowedModels,
  hasCorporateLlm,
  selectedSkillId,
  selectedModel,
  onSkillChange,
  onModelChange,
}: Props) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useAppPreferences();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] dark:bg-black/55"
        onClick={onClose}
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="app-scroll absolute right-0 top-0 h-full w-[360px] max-w-[92vw] overflow-y-auto overscroll-contain border-l border-border bg-[color-mix(in_srgb,var(--color-surface)_96%,white_4%)] shadow-[0_24px_80px_rgba(16,38,79,0.22)] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--color-surface)_94%,black_6%)] dark:shadow-[0_24px_90px_rgba(0,0,0,0.48)]"
        role="dialog"
      >
        <div className="px-5 py-6">
          <div className="mb-3 flex justify-end">
            <button
              aria-label={t("sidebar.closeMenu")}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-[var(--color-surface-muted)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <SidebarToolsContent
            systemPrompts={systemPrompts}
            activePromptId={activePromptId}
            onAddPrompt={onAddPrompt}
            onEditPrompt={onEditPrompt}
            onDeletePrompt={onDeletePrompt}
            onSelectPrompt={onSelectPrompt}
            onAddServer={onAddServer}
            onEditServer={onEditServer}
            onRemoveServer={onRemoveServer}
            onRetestServer={onRetestServer}
            onToggleServerEnabled={onToggleServerEnabled}
            retestingServerIds={retestingServerIds}
            togglingServerIds={togglingServerIds}
            servers={servers}
            llmConfig={llmConfig}
            onChangeLlmConfig={onChangeLlmConfig}
            usageTotals={usageTotals}
            usageState={usageState}
            userSkills={userSkills}
            allowedModels={allowedModels}
            hasCorporateLlm={hasCorporateLlm}
            selectedSkillId={selectedSkillId}
            selectedModel={selectedModel}
            onSkillChange={onSkillChange}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  );
}
