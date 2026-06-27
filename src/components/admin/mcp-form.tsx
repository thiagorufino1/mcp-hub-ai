"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createMcp, updateMcp, type McpServerRow } from "@/app/admin/mcp/actions";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { McpTransport } from "@/types/mcp";

type Props = {
  open: boolean;
  onClose: () => void;
  mcp?: McpServerRow;
};

type ArgItem = { id: string; value: string };
type KeyValueItem = { id: string; key: string; value: string };

function listItems(values: string[]): ArgItem[] {
  return values.map((value) => ({ id: crypto.randomUUID(), value }));
}

function keyValueItems(values: Record<string, string>): KeyValueItem[] {
  return Object.entries(values).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value,
  }));
}

function toRecord(items: KeyValueItem[]) {
  return items.reduce<Record<string, string>>((result, item) => {
    const key = item.key.trim();
    if (key) result[key] = item.value.trim();
    return result;
  }, {});
}

const fieldClass =
  "h-10 rounded-xl border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-muted)] text-[13px] shadow-[0_1px_4px_rgba(15,23,42,0.06)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0";
const labelClass =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function McpForm({ open, onClose, mcp }: Props) {
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [transport, setTransport] = useState<McpTransport>(
    (mcp?.transport as McpTransport | undefined) ?? "streamable-http",
  );
  const [authType, setAuthType] = useState<"none" | "oauth">(
    mcp?.authType === "oauth_delegated" ? "oauth" : "none",
  );
  const [args, setArgs] = useState<ArgItem[]>(() => listItems(mcp?.args ?? []));
  const [envItems, setEnvItems] = useState<KeyValueItem[]>(() =>
    keyValueItems(mcp?.env ?? {}),
  );
  const [headerItems, setHeaderItems] = useState<KeyValueItem[]>(() =>
    keyValueItems(mcp?.headers ?? {}),
  );
  const [enabled, setEnabled] = useState(mcp?.enabled ?? true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  function handleClose() {
    if (!isPending) onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNameError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("transport", transport);
    formData.set(
      "authType",
      transport !== "stdio" && authType === "oauth"
        ? "oauth_delegated"
        : "none",
    );
    formData.set(
      "args",
      args
        .map((item) => item.value.trim())
        .filter(Boolean)
        .join("\n"),
    );
    formData.set("env", JSON.stringify(transport === "stdio" ? toRecord(envItems) : {}));
    formData.set(
      "headers",
      JSON.stringify(transport === "stdio" ? {} : toRecord(headerItems)),
    );
    formData.set("enabled", String(enabled));

    startTransition(async () => {
      try {
        if (mcp) {
          await updateMcp(mcp.id, formData);
        } else {
          await createMcp(formData);
        }
        onClose();
      } catch (submitError) {
        const msg = submitError instanceof Error ? submitError.message : "Failed to save MCP server.";
        if (msg.includes("nome")) {
          setNameError(msg);
        } else {
          setError(msg);
        }
      }
    });
  }

  const transportOptions: Array<{ value: McpTransport; label: string }> = [
    { value: "stdio", label: "STDIO" },
    { value: "sse", label: "SSE (Legacy)" },
    { value: "streamable-http", label: "HTTP" },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
        <DialogHeader className="border-b border-[#dbe4f1] bg-[var(--color-surface)] px-6 py-4">
          <DialogTitle className="text-base font-semibold text-foreground">
            {mcp ? "Editar Servidor MCP" : "Adicionar Servidor MCP"}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px] text-[var(--color-text-secondary)]">
            Configure o nome, o transporte e os parâmetros de conexão do servidor MCP.
          </DialogDescription>
        </DialogHeader>

        <form
          className="app-scroll flex max-h-[calc(90vh-160px)] flex-col gap-5 overflow-y-auto bg-[var(--color-bg)] px-6 py-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-mcp-name" className={labelClass}>Nome</Label>
            <Input
              id="admin-mcp-name"
              ref={firstFieldRef}
              name="name"
              defaultValue={mcp?.name ?? ""}
              className={fieldClass}
              required
            />
            {nameError && (
              <p className="text-xs text-[var(--color-error)]">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>Transporte</Label>
            <div className="flex gap-1 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface-muted)] p-1">
              {transportOptions.map((option) => {
                const selected = transport === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTransport(option.value)}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-1.5 text-center text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                        : "hover:bg-[var(--color-surface)]/60",
                    )}
                  >
                    <span className={cn(
                      "block font-semibold",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {transport === "stdio" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="admin-mcp-command" className={labelClass}>Comando</Label>
                <Input
                  id="admin-mcp-command"
                  name="command"
                  defaultValue={mcp?.command ?? ""}
                  className={fieldClass}
                  required
                />
              </div>

              <DynamicArgs items={args} onChange={setArgs} />
              <KeyValueEditor
                title="Variáveis de ambiente"
                addLabel="Adicionar variável"
                items={envItems}
                onChange={setEnvItems}
              />
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="admin-mcp-url" className={labelClass}>
                  {transport === "sse" ? "URL SSE" : "URL"}
                </Label>
                <Input
                  id="admin-mcp-url"
                  name="url"
                  type="url"
                  defaultValue={mcp?.url ?? ""}
                  className={fieldClass}
                  required
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Cabeçalhos personalizados</p>
                  <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                    Cabeçalhos estáticos opcionais enviados com requisições MCP remotas.
                  </p>
                </div>
                <KeyValueRows
                  addLabel="Adicionar cabeçalho"
                  items={headerItems}
                  onChange={setHeaderItems}
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Autenticação</p>
                  <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                    OAuth será vinculado individualmente pelo usuário que consumir este servidor.
                  </p>
                </div>
                <div className="flex gap-1 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface-muted)] p-1">
                  {[
                    { value: "none", label: "None" },
                    { value: "oauth", label: "OAuth" },
                  ].map((option) => {
                    const selected = authType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAuthType(option.value as "none" | "oauth")}
                        className={cn(
                          "flex-1 rounded-xl px-3 py-1.5 text-center text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                            : "hover:bg-[var(--color-surface)]/60",
                        )}
                      >
                        <span className={cn(
                          "block font-semibold",
                          selected ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {authType === "oauth" ? (
                  <div className="space-y-3 pt-1">
                    <FormField
                      id="admin-mcp-client-id"
                      label="Client ID"
                      name="oauthClientId"
                      defaultValue={mcp?.oauthClientId ?? ""}
                      placeholder="Deixe vazio para registro dinâmico"
                    />
                    <FormField
                      id="admin-mcp-client-secret"
                      label="Client Secret"
                      name="oauthClientSecret"
                      type="password"
                      defaultValue=""
                      placeholder={mcp ? "Deixe vazio para manter o atual" : "Opcional"}
                    />
                    <FormField
                      id="admin-mcp-scopes"
                      label="Scopes"
                      name="oauthScopes"
                      defaultValue={mcp?.oauthScopes ?? ""}
                      placeholder="Ex.: read:user repo"
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}

          <details className="group rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
              Configurações avançadas
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-[#dbe4f1] p-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-mcp-description" className={labelClass}>Descrição</Label>
                <Input
                  id="admin-mcp-description"
                  name="description"
                  defaultValue={mcp?.description ?? ""}
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberField label="Connection timeout (ms)" name="connectionTimeoutMs" value={mcp?.connectionTimeoutMs ?? 10000} min={1000} />
                <NumberField label="Tool timeout (ms)" name="toolTimeoutMs" value={mcp?.toolTimeoutMs ?? 30000} min={1000} />
                <NumberField label="Read-only retries" name="maxRetries" value={mcp?.maxRetries ?? 1} min={0} />
                <NumberField label="Failure threshold" name="failureThreshold" value={mcp?.failureThreshold ?? 3} min={1} />
                <NumberField label="Circuit cooldown (ms)" name="circuitCooldownMs" value={mcp?.circuitCooldownMs ?? 60000} min={1000} />
                <NumberField label="Max concurrent calls" name="maxConcurrentCalls" value={mcp?.maxConcurrentCalls ?? 5} min={1} />
                <NumberField label="Rate limit requests" name="rateLimitRequests" value={mcp?.rateLimitRequests ?? 60} min={0} />
                <NumberField label="Rate window (ms)" name="rateLimitWindowMs" value={mcp?.rateLimitWindowMs ?? 60000} min={1000} />
              </div>
            </div>
          </details>

          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] px-4 py-3">
            <Switch
              id="admin-mcp-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Enabled"
            />
            <Label
              htmlFor="admin-mcp-enabled"
              className="cursor-pointer text-sm font-medium normal-case tracking-normal text-muted-foreground"
            >
              Enabled
            </Label>
          </div>

          {error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-error-soft)] bg-[var(--color-error-soft)] p-3 text-[13px] text-[var(--color-error)]">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-error)]" />
              <div className="app-scroll max-h-[120px] flex-1 overflow-y-auto break-all font-mono text-[11px] leading-5">
                {error}
              </div>
            </div>
          ) : null}

          <DialogFooter className="items-center justify-end gap-3 border-t border-[#dbe4f1] pt-4 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-lg text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-lg text-white shadow-none hover:opacity-90"
              style={{ background: "var(--gradient-action)" }}
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : mcp ? (
                <PencilLine className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {isPending ? "Validando..." : mcp ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DynamicArgs({
  items,
  onChange,
}: {
  items: ArgItem[];
  onChange: (items: ArgItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className={labelClass}>Argumentos</Label>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.value}
              onChange={(event) =>
                onChange(items.map((entry) =>
                  entry.id === item.id ? { ...entry, value: event.target.value } : entry,
                ))
              }
              className={fieldClass}
            />
            <DeleteButton onClick={() => onChange(items.filter((entry) => entry.id !== item.id))} />
          </div>
        ))}
        <AddButton
          label="Adicionar argumento"
          onClick={() => onChange([...items, { id: crypto.randomUUID(), value: "" }])}
        />
      </div>
    </div>
  );
}

function KeyValueEditor({
  addLabel,
  items,
  onChange,
  title,
}: {
  addLabel: string;
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  title: string;
}) {
  return (
    <div className="space-y-2 border-t border-[#dbe4f1] pt-2">
      <Label className={labelClass}>{title}</Label>
      <KeyValueRows addLabel={addLabel} items={items} onChange={onChange} />
    </div>
  );
}

function KeyValueRows({
  addLabel,
  items,
  onChange,
}: {
  addLabel: string;
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col items-center gap-2 sm:flex-row">
          <Input
            aria-label="Key"
            value={item.key}
            onChange={(event) =>
              onChange(items.map((entry) =>
                entry.id === item.id ? { ...entry, key: event.target.value } : entry,
              ))
            }
            className={cn(fieldClass, "font-mono text-[12px] sm:w-[190px]")}
          />
          <span className="hidden text-muted-foreground sm:inline">=</span>
          <Input
            aria-label="Value"
            value={item.value}
            onChange={(event) =>
              onChange(items.map((entry) =>
                entry.id === item.id ? { ...entry, value: event.target.value } : entry,
              ))
            }
            className={cn(fieldClass, "flex-1 font-mono text-[12px]")}
          />
          <DeleteButton onClick={() => onChange(items.filter((entry) => entry.id !== item.id))} />
        </div>
      ))}
      <AddButton
        label={addLabel}
        onClick={() =>
          onChange([...items, { id: crypto.randomUUID(), key: "", value: "" }])
        }
      />
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full rounded-xl border-dashed border-[#dbe4f1] text-[12px] text-muted-foreground hover:bg-muted/50"
    >
      <Plus className="mr-1 size-3.5" />
      {label}
    </Button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="size-10 shrink-0 rounded-xl text-muted-foreground hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
      aria-label="Remover"
    >
      <Trash2 className="size-[14px]" />
    </Button>
  );
}

function FormField({
  defaultValue,
  id,
  label,
  name,
  placeholder,
  type = "text",
}: {
  defaultValue: string;
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClass}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(fieldClass, "bg-[var(--color-surface-muted)]")}
      />
    </div>
  );
}

function NumberField({
  label,
  min,
  name,
  value,
}: {
  label: string;
  min: number;
  name: string;
  value: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className={labelClass}>{label}</Label>
      <Input
        id={name}
        min={min}
        name={name}
        type="number"
        defaultValue={value}
        className={fieldClass}
        required
      />
    </div>
  );
}
