"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  migrateLocalJsonToSession,
  SESSION_LLM_CONFIG_KEY,
  writeSessionJson,
} from "@/lib/client-storage";
import { LEGACY_LLM_CONFIG_STORAGE_KEY, LLM_CONFIGURED_COOKIE } from "@/types/llm-config";
import type { LLMConfig } from "@/types/llm-config";
import { buildLLMConfig, ProviderForm } from "./provider-form";
import { PROVIDERS, ProviderSelector } from "./provider-selector";

type ProviderType = LLMConfig["provider"];

export function LlmSetupShell() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const config = migrateLocalJsonToSession<LLMConfig>(
      LEGACY_LLM_CONFIG_STORAGE_KEY,
      SESSION_LLM_CONFIG_KEY,
    );
    if (!config) {
      return;
    }

    try {
      setSelectedProvider(config.provider);
      setFieldValues(config as unknown as Record<string, string>);
    } catch {
      // No existing config.
    }
  }, []);

  function handleProviderSelect(provider: ProviderType) {
    setSelectedProvider(provider);
    setFieldValues({});
    setTestResult(null);
  }

  function handleFieldChange(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  }

  async function handleTest() {
    if (!selectedProvider) return;
    const llmConfig = buildLLMConfig(selectedProvider, fieldValues);
    if (!llmConfig) {
      setTestResult({ ok: false, message: "Preencha todos os campos antes de testar." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llmConfig }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setTestResult({ ok: true, message: "Conexao validada com sucesso." });
      } else {
        setTestResult({ ok: false, message: data.error ?? "Falha ao conectar." });
      }
    } catch {
      setTestResult({ ok: false, message: "Erro de rede ao testar a conexao." });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave() {
    if (!selectedProvider) return;
    const llmConfig = buildLLMConfig(selectedProvider, fieldValues);
    if (!llmConfig) {
      setTestResult({ ok: false, message: "Preencha todos os campos antes de salvar." });
      return;
    }

    setIsSaving(true);

    try {
      writeSessionJson(SESSION_LLM_CONFIG_KEY, llmConfig);
      document.cookie = `${LLM_CONFIGURED_COOKIE}=1; path=/; max-age=31536000`;
      router.push("/chat");
    } catch {
      setTestResult({ ok: false, message: "Erro ao salvar a configuracao." });
      setIsSaving(false);
    }
  }

  const providerName = PROVIDERS.find((provider) => provider.id === selectedProvider)?.name ?? "";
  const llmConfig = selectedProvider ? buildLLMConfig(selectedProvider, fieldValues) : null;
  const canSave = llmConfig !== null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,155,222,0.14),transparent_30%),radial-gradient(ellipse_at_bottom_right,rgba(0,48,135,0.10),transparent_32%)]" />

      <header
        className="relative z-10 flex h-16 items-center border-b border-white/55 px-5 backdrop-blur sm:px-8"
        style={{ background: "linear-gradient(135deg, hsl(207, 100%, 35%), hsl(213, 100%, 19%))" }}
      >
        <p className="text-[18px] font-semibold tracking-[-0.03em] text-white">mcp-hub</p>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-col gap-8 px-4 py-8 sm:px-6 lg:grid lg:min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,520px)] lg:items-center lg:px-8">
        <section className="surface-panel surface-subtle rounded-[32px] px-6 py-7 sm:px-8 sm:py-9 lg:min-h-[640px] lg:px-10 lg:py-10">
          <div className="max-w-[560px] space-y-8">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-secondary)]">
                LLM workspace setup
              </p>
              <h1 className="max-w-[10ch] text-4xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)] sm:text-5xl">
                Configure motor do portal sem sair do fluxo.
              </h1>
              <p className="max-w-[48ch] text-[15px] leading-7 text-[var(--color-text-secondary)]">
                Escolha provedor, valide credenciais e entre no chat com contexto persistido apenas durante esta sessao do navegador.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  Step 1
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Escolha provider</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  OpenAI, Foundry, Gemini, Bedrock ou Ollama.
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  Step 2
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Teste conexao</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Valide endpoint, chave e modelo antes de salvar.
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  Step 3
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Entrar no chat</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Continue com configuracao salva localmente.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-900/8 bg-slate-950 px-5 py-5 text-slate-100 shadow-[0_24px_64px_rgba(15,23,42,0.20)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Security note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Credenciais nao vao para banco. Estado sensivel fica so na sessao atual do navegador e segue para teste via API local.
                  </p>
                </div>
                <div className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: "var(--color-success)", background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                  Local only
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[32px] border border-white/70 bg-white/92 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Configurar provedor LLM
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[var(--color-text-secondary)]">
              Escolha provedor e preencha credenciais. Configuracao sensivel fica apenas nesta sessao do navegador.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <ProviderSelector selected={selectedProvider} onSelect={handleProviderSelect} />

            {selectedProvider && (
              <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                    {providerName}
                  </p>
                  <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>
                    Active selection
                  </span>
                </div>
                <ProviderForm provider={selectedProvider} values={fieldValues} onChange={handleFieldChange} />
              </div>
            )}

            {testResult && (
              <div
                role="alert"
                className={`rounded-2xl border px-4 py-3 text-[12px] leading-6 ${
                  testResult.ok
                    ? "border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/60 text-[var(--color-success)]"
                    : "border-[var(--color-error-soft)] bg-[var(--color-error-soft)]/30 text-[var(--color-error)]"
                }`}
              >
                {testResult.message}
              </div>
            )}

            {selectedProvider && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-[var(--color-border)] bg-white"
                  onClick={() => void handleTest()}
                  disabled={isTesting || !canSave}
                >
                  {isTesting ? "Testando..." : "Testar conexao"}
                </Button>
                <Button
                  className="h-11 flex-1 rounded-xl text-white shadow-[0_8px_24px_rgba(9,105,218,0.22)] hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, hsl(207, 100%, 35%), hsl(213, 100%, 19%))" }}
                  onClick={() => void handleSave()}
                  disabled={isSaving || !canSave}
                >
                  {isSaving ? "Salvando..." : "Salvar e continuar"}
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
