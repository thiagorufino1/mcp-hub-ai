"use client";

import { useState } from "react";

import { LlmConfigSection } from "@/components/chat/llm-config-section";
import { ModelSelector } from "@/components/chat/model-selector";
import { SkillsSelector } from "@/components/chat/skills-selector";
import {
  WorkspaceSelector,
  type WorkspaceOption,
} from "@/components/chat/workspace-selector";
import { SystemPromptSection } from "@/components/chat/system-prompt-section";
import type { SystemPrompt } from "@/components/chat/system-prompt-section";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Cable,
  CheckCircle2,
  ChevronDown,
  Globe,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  TerminalSquare,
  Trash2,
  XCircle,
  Zap,
} from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";
import type { TokenUsage } from "@/types/chat";
import type { McpServerConfig } from "@/types/mcp";


type SidebarToolsContentProps = {
  servers: McpServerConfig[];
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
  workspaces: WorkspaceOption[];
  selectedWorkspaceId: string | null;
  onWorkspaceChange: (id: string | null) => void;
};

function getTransportMeta(server: McpServerConfig) {
  switch (server.transport) {
    case "stdio":
      return { icon: TerminalSquare, detail: server.command, label: "STDIO" };
    case "sse":
      return { icon: Globe, detail: server.url, label: "SSE" };
    default:
      return { icon: Cable, detail: server.url, label: "HTTP" };
  }
}

function ConnectionBadge({
  enabled,
  status,
  isRetesting,
}: {
  enabled: boolean;
  status: McpServerConfig["connectionStatus"];
  isRetesting: boolean;
}) {
  const { t } = useAppPreferences();

  if (!enabled) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: "hsl(var(--border))",
          background: "hsl(var(--muted))",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <XCircle className="size-3" />
        {t("sidebar.disabled")}
      </span>
    );
  }

  if (isRetesting) {
    const label = status === "error" ? t("sidebar.reconnecting") : t("sidebar.validating");

    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: "var(--color-warning)",
          background: "var(--color-warning-soft)",
          color: "var(--color-warning)",
        }}
      >
        <LoaderCircle className="size-3 animate-spin" />
        {label}
      </span>
    );
  }

  if (status === "connected") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: "var(--color-success)",
          background: "var(--color-success-soft)",
          color: "var(--color-success)",
        }}
      >
        <CheckCircle2 className="size-3" />
        {t("sidebar.connected")}
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{
          borderColor: "var(--color-error)",
          background: "var(--color-error-soft)",
          color: "var(--color-error)",
        }}
      >
        <XCircle className="size-3" />
        {t("sidebar.failed")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <LoaderCircle className="size-3" />
      {t("sidebar.pending")}
    </span>
  );
}

const HEADER_GRADIENT = "var(--gradient-action)";

function ServerCard({
  isRetesting,
  isToggling,
  onEditServer,
  onRemoveServer,
  onRetestServer,
  onToggleServerEnabled,
  server,
}: {
  isRetesting: boolean;
  isToggling: boolean;
  onEditServer: (serverId: string) => void;
  onRemoveServer: (serverId: string) => void;
  onRetestServer: (serverId: string) => void;
  onToggleServerEnabled: (serverId: string) => void;
  server: McpServerConfig;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useAppPreferences();
  const meta = getTransportMeta(server);
  const TransportIcon = meta.icon;
  const retestLabel = isRetesting && server.connectionStatus === "error"
    ? `${t("sidebar.reconnecting")} ${server.name}`
    : `${t("sidebar.validating")} ${server.name}`;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[var(--color-surface)]">
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-muted-foreground/60">
            <TransportIcon className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{server.name}</p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
              disabled={isRetesting || isToggling || !server.enabled}
              onClick={() => onRetestServer(server.id)}
              aria-label={retestLabel}
            >
              {isRetesting ? <LoaderCircle className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-6 rounded-full hover:text-foreground",
                server.enabled ? "text-[var(--color-success)]/70 hover:bg-[var(--color-success-soft)]" : "text-muted-foreground/40 hover:bg-muted/60",
              )}
              disabled={isRetesting || isToggling}
              onClick={() => onToggleServerEnabled(server.id)}
              aria-label={server.enabled ? t("sidebar.disableServer") : t("sidebar.enableServer")}
            >
              {isToggling ? <LoaderCircle className="size-3 animate-spin" /> : server.enabled ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
              onClick={() => onEditServer(server.id)}
              aria-label={`Edit ${server.name}`}
            >
              <PencilLine className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
              onClick={() => onRemoveServer(server.id)}
              aria-label={`Remove ${server.name}`}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        <p className="mt-1.5 break-all font-mono text-[11px] text-muted-foreground/75" title={meta.detail}>
          {meta.detail || (server.transport === "stdio" ? t("sidebar.localCommand") : t("sidebar.remoteEndpoint"))}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <ConnectionBadge enabled={server.enabled} status={server.connectionStatus} isRetesting={isRetesting} />
          <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {meta.label}
          </span>
          <span className="text-[11px] leading-4 text-muted-foreground/60">
            {server.tools.length} tool{server.tools.length === 1 ? "" : "s"}
          </span>
        </div>

        {server.connectionStatus === "error" && server.errorMessage ? (
          <div className="mt-2.5 rounded-lg border border-[var(--color-error-soft)] bg-[var(--color-error-soft)]/40 px-2.5 py-1.5">
            <p className="text-[11px] leading-snug text-[var(--color-error)]">
              {server.errorMessage === "fetch failed" ? t("sidebar.connectionFailed") : server.errorMessage}
            </p>
          </div>
        ) : null}

        {server.connectionStatus === "connected" && server.tools.length === 0 ? (
          <p className="mt-2.5 text-[11px] italic text-muted-foreground">
            {t("sidebar.noTools")}
          </p>
        ) : null}

        {server.tools.length > 0 ? (
          <>
            <button
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-normal leading-4 text-muted-foreground/60 transition hover:text-muted-foreground"
              onClick={() => setIsExpanded((current) => !current)}
              type="button"
            >
              <ChevronDown className={cn("size-2.5 transition-transform", isExpanded && "rotate-180")} />
              <span className="text-[11px] leading-4">{isExpanded ? t("sidebar.hideTools") : t("sidebar.showTools")}</span>
            </button>

            {isExpanded ? (
              <div className="mt-2 rounded-xl bg-muted/30 p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {server.tools.map((tool) => (
                    <Tooltip key={tool.name}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "cursor-help rounded-full border px-2 py-0.5 font-mono text-[10px]",
                            tool.isDestructive
                              ? "border-red-200 bg-red-50 text-red-600 font-semibold shadow-sm dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                              : "border-border bg-background text-muted-foreground transition-colors hover:bg-muted/50",
                          )}
                        >
                          {tool.name} {tool.isDestructive ? "!" : ""}
                        </span>
                      </TooltipTrigger>
                      {tool.description ? (
                        <TooltipContent
                          side="right"
                          align="center"
                          sideOffset={14}
                          className="z-[999] max-h-[400px] w-max max-w-[520px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-800 p-4 text-[11.5px] font-normal leading-relaxed text-slate-100 shadow-2xl [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5"
                        >
                          {tool.description}
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function SidebarToolsContent({
  servers,
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
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
}: SidebarToolsContentProps) {
  const { t } = useAppPreferences();
  const connectedCount = servers.filter((server) => server.connectionStatus === "connected").length;

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

        {(workspaces.length > 0 || userSkills.length > 0 || allowedModels.length > 0) && (
          <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-black/[0.06] dark:ring-white/[0.06]" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div className="px-4 py-4 space-y-3">
              <WorkspaceSelector
                workspaces={workspaces}
                selectedId={selectedWorkspaceId}
                onChange={onWorkspaceChange}
              />
              <SkillsSelector
                skills={userSkills}
                selectedId={selectedSkillId}
                onChange={onSkillChange}
              />
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

        <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-black/[0.06] dark:ring-white/[0.06]" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: HEADER_GRADIENT }}>
                <Zap className="size-3.5 text-white" />
              </div>
              <h1 className="flex-1 text-[15px] font-semibold text-foreground">MCP Server</h1>
              <div className="flex shrink-0 items-center gap-1.5">
                {connectedCount === 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                  >
                    {t("sidebar.disconnected")}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onAddServer}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
              style={{ background: HEADER_GRADIENT }}
            >
              <Plus className="size-3.5" />
              {t("sidebar.addMcp")}
            </button>

            {servers.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    isRetesting={retestingServerIds.includes(server.id)}
                    isToggling={togglingServerIds.includes(server.id)}
                    onEditServer={onEditServer}
                    onRemoveServer={onRemoveServer}
                    onRetestServer={onRetestServer}
                    onToggleServerEnabled={onToggleServerEnabled}
                    server={server}
                  />
                ))}
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
