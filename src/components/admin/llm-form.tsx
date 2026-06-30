"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { LlmConfigRow } from "@/app/admin/llm/actions";
import { createLlm, updateLlm } from "@/app/admin/llm/actions";
import { ProviderForm, buildLLMConfig } from "@/components/setup/provider-form";
import { ProviderLogo } from "@/components/setup/provider-logo";
import { PROVIDERS, getProviderMeta } from "@/components/setup/provider-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, LoaderCircle, PencilLine, RefreshCw } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LLMConfig } from "@/types/llm-config";

type ProviderType = LLMConfig["provider"];
type Props = { open: boolean; onClose: () => void; llm?: LlmConfigRow };

export function LlmForm({ open, onClose, llm }: Props) {
  const initialProvider = (llm?.provider as ProviderType | undefined) ?? null;
  const [provider, setProvider] = useState<ProviderType | null>(initialProvider);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(llm?.enabled ?? true);
  const [isDefault, setIsDefault] = useState(llm?.isDefault ?? false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstModel = llm?.allowedModels[0] ?? "";
    setProvider(initialProvider);
    setEnabled(llm?.enabled ?? true);
    setIsDefault(llm?.isDefault ?? false);
    setFieldValues({
      ...llm?.credentials,
      model: firstModel,
      modelId: firstModel,
      deployment: llm?.credentials.deployment ?? firstModel,
    });
    setError(null);
    setTestSuccess(false);
  }, [initialProvider, llm, open]);

  const testConfig = useMemo(
    () => (provider ? buildLLMConfig(provider, fieldValues) : null),
    [fieldValues, provider],
  );

  function selectProvider(nextProvider: ProviderType) {
    setProvider(nextProvider);
    setFieldValues({});
    setTestSuccess(false);
    setError(null);
  }

  function changeField(key: string, value: string) {
    setFieldValues((current) => ({ ...current, [key]: value }));
    setTestSuccess(false);
    setError(null);
  }

  async function testConnection() {
    if (!testConfig) {
      setError("Preencha as credenciais do provedor e o modelo antes de testar.");
      return;
    }
    setIsTesting(true);
    setError(null);
    setTestSuccess(false);
    try {
      const response = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmConfig: testConfig }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Falha no teste de conexão.");
      setTestSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no teste de conexão.");
    } finally {
      setIsTesting(false);
    }
  }

  function submit() {
    const model =
      fieldValues.model ||
      fieldValues.modelId ||
      fieldValues.deployment ||
      llm?.allowedModels[0] ||
      "";
    if (!provider || !model.trim()) {
      setError("Escolha um provedor e preencha o modelo ou deployment.");
      return;
    }
    const formData = new FormData();
    formData.set("provider", provider);
    formData.set("displayName", getProviderMeta(provider)?.name ?? provider);
    formData.set("allowedModels", model);
    formData.set("enabled", String(enabled));
    formData.set("isDefault", String(isDefault));
    for (const [key, value] of Object.entries(fieldValues)) formData.set(key, value);

    startTransition(async () => {
      try {
        if (llm) await updateLlm(llm.id, formData);
        else await createLlm(formData);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !isPending) onClose(); }}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 shadow-[0_24px_64px_rgba(4,22,61,0.28)]">
        <DialogHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            {llm ? "Editar LLM" : "Adicionar LLM"}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px]">
            Escolha o provedor, informe as credenciais e teste a conexão antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="app-scroll max-h-[calc(90vh-145px)] overflow-y-auto bg-[var(--color-bg)] px-6 py-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Provedor</Label>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 sm:grid-cols-5">
                {PROVIDERS.map((item) => {
                  const selected = provider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectProvider(item.id)}
                      className={cn(
                        "flex min-h-[96px] flex-col items-center justify-center rounded-2xl border px-2 py-3 transition",
                        selected
                          ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[0_4px_14px_rgba(15,75,155,0.1)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]",
                      )}
                    >
                      <ProviderLogo provider={item.id} className="mb-2 size-12 rounded-2xl" iconClassName="size-6" />
                      <span className={cn("text-xs font-semibold", selected ? "text-[var(--color-primary)]" : "text-muted-foreground")}>
                        {item.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {provider ? (
              <>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <ProviderForm provider={provider} values={fieldValues} onChange={changeField} />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id="llm-enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      aria-label="Habilitado"
                    />
                    <Label htmlFor="llm-enabled" className="cursor-pointer text-sm text-muted-foreground">
                      Habilitado
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id="llm-default-provider"
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                      aria-label="Provedor padrão"
                    />
                    <Label htmlFor="llm-default-provider" className="cursor-pointer text-sm text-muted-foreground">
                      Provedor padrão
                    </Label>
                  </div>
                </div>
              </>
            ) : null}

            {error ? <div className="rounded-xl border border-[var(--color-error-soft)] bg-[var(--color-error-soft)] p-3 text-xs text-[var(--color-error)]">{error}</div> : null}
            {testSuccess ? <div className="flex items-center gap-2 rounded-xl border border-[var(--color-success-soft)] bg-[var(--color-success-soft)] p-3 text-xs text-[var(--color-success)]"><CheckCircle2 className="size-4" />Conexão bem-sucedida.</div> : null}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => void testConnection()} disabled={isTesting || !provider}>
            {isTesting ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            Testar
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={isPending || !provider}>
            {isPending ? <LoaderCircle className="animate-spin" /> : llm ? <PencilLine /> : <CheckCircle2 />}
            {llm ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
