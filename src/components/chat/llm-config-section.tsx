"use client";

import { Bot, CheckCircle2, LoaderCircle, PencilLine, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
import { useCallback, useEffect, useState } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { LlmConfigDialog } from "./llm-config-dialog";
import { ProviderLogo } from "@/components/setup/provider-logo";
import { getProviderMeta } from "@/components/setup/provider-selector";
import { Button } from "@/components/ui/button";
import { removeSessionValue, SESSION_LLM_CONFIG_KEY, writeSessionJson } from "./storage";
import { formatTokenCount } from "@/lib/utils";
import { LLM_CONFIGURED_COOKIE } from "@/types/llm-config";
import type { LLMConfig } from "@/types/llm-config";
import type { TokenUsage } from "@/types/chat";

type ProviderType = LLMConfig["provider"];

type Props = {
  value: LLMConfig | null;
  onChange: (config: LLMConfig | null) => void;
  usageTotals: TokenUsage;
  usageState: "idle" | "available" | "unavailable";
};

const HEADER_GRADIENT = "var(--gradient-action)";

export function LlmConfigSection({ value, onChange, usageTotals, usageState }: Props) {
  const { t } = useAppPreferences();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleDelete() {
    removeSessionValue(SESSION_LLM_CONFIG_KEY);
    document.cookie = `${LLM_CONFIGURED_COOKIE}=; path=/; max-age=0`;
    onChange(null);
  }

  async function handleSave(config: LLMConfig) {
    setIsSaving(true);
    try {
      writeSessionJson(SESSION_LLM_CONFIG_KEY, config);
      document.cookie = `${LLM_CONFIGURED_COOKIE}=1; path=/; max-age=31536000`;
      onChange(config);
    } finally {
      setIsSaving(false);
    }
  }

  const [isRetesting, setIsRetesting] = useState(false);

  const handleRetest = useCallback(async () => {
    if (!value) return;
    setIsRetesting(true);
    try {
      const response = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmConfig: value }),
      });
      const data = await response.json();
      if (!data.ok) {
        console.error("LLM Retest failed:", data.error);
      }
    } catch (e) {
      console.error("LLM Retest network error:", e);
    } finally {
      // Small delay for visual feedback
      setTimeout(() => setIsRetesting(false), 600);
    }
  }, [value]);

  const [hasValidatedOnMount, setHasValidatedOnMount] = useState(false);

  useEffect(() => {
    if (value && !hasValidatedOnMount) {
      setHasValidatedOnMount(true);
      void handleRetest();
    }
  }, [value, hasValidatedOnMount, handleRetest]);

  const providerMeta = getProviderMeta(value?.provider ?? null);
  const tokenItems = [
    { label: t("sidebar.input"), value: formatTokenCount(usageTotals.inputTokens) },
    { label: t("sidebar.output"), value: formatTokenCount(usageTotals.outputTokens) },
    { label: t("sidebar.total"), value: formatTokenCount(usageTotals.totalTokens) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <LlmConfigDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialConfig={value}
        onSave={handleSave}
      />

      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: HEADER_GRADIENT }}>
          <Bot className="size-3.5 text-white" />
        </div>
        <h2 className="flex-1 text-[15px] font-semibold text-foreground">LLM</h2>
        {!value && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
          >
            {t("sidebar.disconnected")}
          </span>
        )}
      </div>

      {value ? (
        <div className="overflow-hidden rounded-lg border border-border bg-[var(--color-surface)]">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-2">
              {providerMeta ? (
                <ProviderLogo provider={providerMeta.id} flat className="size-8 shrink-0 rounded-xl" iconClassName="size-4" />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--color-surface)] text-[10px] font-bold text-foreground shadow-sm">
                  LLM
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{providerMeta?.name ?? "LLM"}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/70">
                  {(value as any).model || (value as any).modelId || (value as any).deployment || t("llm.configured")}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
                  disabled={isRetesting}
                  onClick={() => void handleRetest()}
                >
                  {isRetesting ? <LoaderCircle className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <PencilLine className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              {isRetesting ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    borderColor: "var(--color-warning)",
                    background: "var(--color-warning-soft)",
                    color: "var(--color-warning)",
                  }}
                >
                  <LoaderCircle className="size-3 animate-spin" />
                  {t("sidebar.validating")}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  style={{ borderColor: "var(--color-success)", background: "var(--color-success-soft)", color: "var(--color-success)" }}
                >
                  <CheckCircle2 className="size-3" />
                  {t("sidebar.connected")}
                </span>
              )}
              <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                LLM
              </span>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: HEADER_GRADIENT }}
        >
          <Plus className="size-3.5" />
          {t("llm.addTitle")}
        </Button>
      )}

      {value && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/45 px-3 py-2.5">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {t("llm.tokensUsed")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {tokenItems.map((item) => (
              <div key={item.label} className="metric-chip rounded-lg px-1.5 py-1.5 text-center">
                <p className="text-[9px] text-muted-foreground/70">{item.label}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
          {usageState === "unavailable" ? (
            <div
              className="mt-2 rounded-lg border px-2.5 py-2 text-[11px] leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              style={{
                borderColor: "var(--color-warning)",
                background: "color-mix(in srgb, var(--color-warning-soft) 100%, var(--color-surface) 0%)",
                color: "var(--color-warning)",
              }}
            >
              {t("sidebar.tokensUnavailable")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
