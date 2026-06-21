"use client";

import { useMemo, useState, useTransition } from "react";

import { LlmForm } from "@/components/admin/llm-form";
import { ProviderLogo } from "@/components/setup/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, LoaderCircle, PencilLine, RefreshCw, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn, formatTokenCount } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";
import { deleteLlm, testLlmConfig, type LlmConfigRow } from "./actions";

type Props = { llms: LlmConfigRow[] };

export function LlmAdminClient({ llms }: Props) {
  const [form, setForm] = useState<{ open: boolean; llm?: LlmConfigRow }>({ open: false });
  const [search, setSearch] = useState("");
  const filteredLlms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    if (!query) {
      return llms;
    }

    return llms.filter((llm) =>
      [llm.displayName, llm.provider, ...llm.allowedModels].some((value) =>
        value.toLocaleLowerCase("pt-BR").includes(query),
      ),
    );
  }, [llms, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Config</h1>
          <p className="text-sm text-muted-foreground">Corporate model providers and token usage.</p>
        </div>
        <Button onClick={() => setForm({ open: true })}>+ Add Provider</Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search LLMs..."
          aria-label="Search LLMs"
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm text-[var(--color-text-secondary)]">
          <thead>
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tokens used</th>
              <th className="px-4 py-3">Last check</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLlms.map((llm) => (
              <LlmRow
                key={llm.id}
                llm={llm}
                onEdit={() => setForm({ open: true, llm })}
              />
            ))}
            {filteredLlms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {llms.length === 0 ? "No LLM providers configured" : "No LLMs found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {llms.length === 0
                      ? "Add the first provider to enable corporate chat."
                      : "Try searching by provider name or model."}
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <LlmForm open={form.open} llm={form.llm} onClose={() => setForm({ open: false })} />
    </div>
  );
}

function LlmRow({ llm, onEdit }: { llm: LlmConfigRow; onEdit: () => void }) {
  const [testing, startTesting] = useTransition();
  const [status, setStatus] = useState(llm.lastTestStatus);
  const [lastTestAt, setLastTestAt] = useState<Date | null>(llm.lastTestAt);
  const [error, setError] = useState<string | null>(null);
  const model = llm.allowedModels[0] || "No model";

  function retest() {
    setError(null);
    startTesting(async () => {
      const result = await testLlmConfig(llm.id);
      setStatus(result.ok ? "connected" : "error");
      setLastTestAt(new Date());
      setError(result.error ?? null);
    });
  }

  return (
    <tr className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55">
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProviderLogo
            provider={llm.provider as LLMConfig["provider"]}
            flat
            className="size-10 shrink-0 rounded-xl"
            iconClassName="size-5"
          />
          <div className="min-w-0">
            <p className="max-w-[220px] truncate font-semibold text-[var(--color-text-secondary)]">
              {llm.displayName}
            </p>
            <p className="mt-0.5 max-w-[280px] truncate font-mono text-xs text-muted-foreground">{model}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex max-w-[230px] flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              status === "connected" &&
                "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
              status === "error" &&
                "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]",
              status !== "connected" &&
                status !== "error" &&
                "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
            )}
          >
            {testing ? <LoaderCircle className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
            {testing ? "Validating" : status === "connected" ? "Connected" : status === "error" ? "Error" : "Not tested"}
          </span>
          {llm.isDefault ? (
            <Badge variant="info" className="rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-normal">
              default
            </Badge>
          ) : null}
          {!llm.enabled ? <Badge variant="secondary" className="text-muted-foreground">disabled</Badge> : null}
        </div>
        {error ? (
          <p className="mt-2 max-w-[230px] truncate text-xs text-[var(--color-error)]" title={error}>
            {error}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <div className="grid min-w-[235px] grid-cols-3 gap-2">
          <TokenMetric label="Entrada" value={llm.inputTokens} />
          <TokenMetric label="Saída" value={llm.outputTokens} />
          <TokenMetric label="Total" value={llm.totalTokens} />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar aria-hidden="true" className="size-3.5" />
          <span>
            {lastTestAt
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(lastTestAt))
              : "Never tested"}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground"
            onClick={retest}
            disabled={testing}
            aria-label="Test connection"
            title="Test connection"
          >
            {testing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground"
            onClick={onEdit}
            aria-label="Edit"
            title="Edit"
          >
            <PencilLine />
          </Button>
          <form action={async () => deleteLlm(llm.id)}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function TokenMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-chip rounded-lg px-2 py-1.5 text-center">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{formatTokenCount(value)}</p>
    </div>
  );
}
