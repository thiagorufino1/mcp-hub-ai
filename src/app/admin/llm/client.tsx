"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { LlmForm } from "@/components/admin/llm-form";
import { ProviderLogo } from "@/components/setup/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, LoaderCircle, PencilLine, RefreshCw, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, formatTokenCount } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";
import { deleteLlm, setDefaultLlm, testLlmConfig, type LlmConfigRow } from "./actions";

type Props = { llms: LlmConfigRow[] };

export function LlmAdminClient({ llms }: Props) {
  const [form, setForm] = useState<{ open: boolean; llm?: LlmConfigRow }>({ open: false });
  const [search, setSearch] = useState("");
  const filteredLlms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    if (!query) return llms;

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
          <h1 className="text-2xl font-bold">LLM</h1>
          <p className="text-sm text-muted-foreground">Gerencie provedores de modelos corporativos e acompanhe o consumo de tokens.</p>
        </div>
        <Button onClick={() => setForm({ open: true })}>+ Adicionar provedor</Button>
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
          placeholder="Buscar LLMs..."
          aria-label="Buscar LLMs"
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Provedor</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center">Padrão</th>
              <th className="px-4 py-3 text-center font-medium">Tokens usados</th>
              <th className="px-4 py-3 text-center font-medium">Última verificação</th>
              <th className="px-4 py-3 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredLlms.map((llm) => (
              <LlmRow
                key={`${llm.id}-${llm.isDefault ? "default" : "regular"}`}
                llm={llm}
                onEdit={() => setForm({ open: true, llm })}
              />
            ))}
            {filteredLlms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {llms.length === 0 ? "Nenhum provedor LLM configurado" : "Nenhum LLM encontrado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {llms.length === 0
                      ? "Adicione o primeiro provedor para habilitar o chat corporativo."
                      : "Tente buscar pelo nome do provedor ou modelo."}
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
  const [defaulting, startDefaulting] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState(llm.lastTestStatus);
  const [lastTestAt, setLastTestAt] = useState<Date | null>(llm.lastTestAt);
  const [isDefault, setIsDefault] = useState(llm.isDefault);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const model = llm.allowedModels[0] || "Sem modelo";

  function retest() {
    setError(null);
    startTesting(async () => {
      const result = await testLlmConfig(llm.id);
      setStatus(result.ok ? "connected" : "error");
      setLastTestAt(new Date());
      setError(result.error ?? null);
    });
  }

  function toggleDefault(nextValue: boolean) {
    setError(null);
    setIsDefault(nextValue);
    startDefaulting(async () => {
      try {
        await setDefaultLlm(llm.id, nextValue);
        router.refresh();
      } catch (cause) {
        setIsDefault(!nextValue);
        setError(
          cause instanceof Error ? cause.message : "Não foi possível atualizar o provedor padrão.",
        );
      }
    });
  }

  return (
    <>
      <tr
        className={cn(
          "border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55",
          !llm.enabled && "opacity-65",
        )}
      >
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
        <td className="px-4 py-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
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
              {testing ? "Validando" : status === "connected" ? "Conectado" : status === "error" ? "Erro" : "Não testado"}
            </span>
            {!llm.enabled ? <Badge variant="secondary" className="text-muted-foreground">desabilitado</Badge> : null}
          </div>
          {error ? (
            <p className="mt-2 truncate text-center text-xs text-[var(--color-error)]" title={error}>
              {error}
            </p>
          ) : null}
        </td>
        <td className="px-4 py-4">
          <div className="flex justify-center">
            <Switch
              checked={isDefault}
              onCheckedChange={toggleDefault}
              disabled={testing || defaulting}
              aria-label={`Definir ${llm.displayName} como padrão`}
            />
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-2">
            <TokenMetric label="Entrada" value={llm.inputTokens} />
            <TokenMetric label="Saída" value={llm.outputTokens} />
            <TokenMetric label="Total" value={llm.totalTokens} />
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar aria-hidden="true" className="size-3.5" />
            <span>
              {lastTestAt
                ? new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(lastTestAt))
                : "Nunca testado"}
            </span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground"
              onClick={retest}
              disabled={testing}
              aria-label="Testar conexão"
              title="Testar conexão"
            >
              {testing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground"
              onClick={onEdit}
              aria-label="Editar"
              title="Editar"
            >
              <PencilLine />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
              aria-label="Excluir"
              title="Excluir"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </td>
      </tr>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir configuração LLM</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{llm.displayName}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => startDelete(async () => { await deleteLlm(llm.id); setDeleteOpen(false); router.refresh(); })}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TokenMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
        {formatTokenCount(value)}
      </p>
    </div>
  );
}
