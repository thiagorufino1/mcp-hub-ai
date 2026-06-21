"use client";

import { CheckCircle2, LoaderCircle, PencilLine, Plus, Trash2 } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { McpServerConfig, McpTransport } from "@/types/mcp";

type Props = {
  initialServer?: McpServerConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (server: McpServerConfig) => Promise<void>;
};

type ArgItem = { id: string; value: string };
type KVItem = { id: string; key: string; value: string };

function createDraft(server?: McpServerConfig | null) {
  return {
    authMode: server?.authMode ?? "none",
    args: (server?.args ?? []).map((v) => ({ id: crypto.randomUUID(), value: v })),
    approvedToolNames: server?.approvedToolNames ?? [],
    command: server?.command ?? "",
    env: Object.entries(server?.env ?? {}).map(([k, v]) => ({ id: crypto.randomUUID(), key: k, value: v })),
    headers: Object.entries(server?.headers ?? {}).map(([k, v]) => ({ id: crypto.randomUUID(), key: k, value: v })),
    oauth: server?.oauth,
    name: server?.name ?? "",
    transport: server?.transport ?? ("streamable-http" satisfies McpTransport),
    url: server?.url ?? "",
  };
}

export function McpServerDialog({ initialServer, isOpen, onClose, onSave }: Props) {
  const { t } = useAppPreferences();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [draft] = useState(() => createDraft(initialServer));
  const [name, setName] = useState(draft.name);
  const [transport, setTransport] = useState<McpTransport>(draft.transport);
  const [authMode, setAuthMode] = useState(draft.authMode);
  const [command, setCommand] = useState(draft.command);
  const [args, setArgs] = useState<ArgItem[]>(draft.args);
  const [url, setUrl] = useState(draft.url);
  const [envItems, setEnvItems] = useState<KVItem[]>(draft.env);
  const [headerItems, setHeaderItems] = useState<KVItem[]>(draft.headers);
  const [clientName, setClientName] = useState(draft.oauth?.clientName ?? "MCP Hub");
  const [clientId, setClientId] = useState(draft.oauth?.clientId ?? "");
  const [scope, setScope] = useState(draft.oauth?.scope ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const transportOptions: Array<{ value: McpTransport; label: string; hint: string }> = [
    { value: "stdio", label: "STDIO", hint: t("mcp.stdio.hint") },
    { value: "sse", label: "SSE (Legacy)", hint: t("mcp.sse.hint") },
    { value: "streamable-http", label: "HTTP", hint: t("mcp.http.hint") },
  ];
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  function handleClose() {
    if (isSaving) {
      return;
    }

    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCommand = command.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName) {
      setError(t("mcp.errorName"));
      return;
    }

    if (transport === "stdio" && !trimmedCommand) {
      setError(t("mcp.errorCommand"));
      return;
    }

    if (transport !== "stdio" && !trimmedUrl) {
      setError(t("mcp.errorUrl"));
      return;
    }

    setIsSaving(true);
    setError(null);

    const safeArgs = args.map(a => a.value.trim()).filter(Boolean);
    const safeEnv = envItems.reduce((acc, item) => {
      const k = item.key.trim();
      if (k) acc[k] = item.value.trim();
      return acc;
    }, {} as Record<string, string>);
    const safeHeaders = headerItems.reduce((acc, item) => {
      const k = item.key.trim();
      if (k) acc[k] = item.value.trim();
      return acc;
    }, {} as Record<string, string>);
    const safeScope = scope.trim() || undefined;

    try {
      await onSave({
        authMode: transport === "stdio" ? "none" : authMode,
        args: safeArgs,
        approvalMode: "always",
        approvedToolNames: [],
        command: transport === "stdio" ? trimmedCommand : undefined,
        connectionStatus: initialServer?.connectionStatus ?? "pending",
        enabled: initialServer?.enabled ?? true,
        env: transport === "stdio" ? safeEnv : {},
        errorMessage: initialServer?.errorMessage,
        headers: transport === "stdio" ? {} : safeHeaders,
        id: initialServer?.id ?? `mcp-${crypto.randomUUID()}`,
        lastCheckedAt: initialServer?.lastCheckedAt,
        name: trimmedName,
        oauth:
          transport === "stdio"
            ? undefined
            : authMode === "oauth"
              ? {
                  ...initialServer?.oauth,
                  clientId: clientId.trim() || initialServer?.oauth?.clientId,
                  clientName: clientName.trim() || "MCP Hub",
                  scope: safeScope,
                }
              : undefined,
        tools: initialServer?.tools ?? [],
        transport,
        url: transport === "stdio" ? undefined : trimmedUrl,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("mcp.saveFailed"),
      );
      setIsSaving(false);
    }
  }

  const isEditing = Boolean(initialServer);

  function getUrlLabel() {
    return transport === "sse" ? t("mcp.sseUrlLabel") : "URL";
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
        <DialogHeader className="border-b border-[#dbe4f1] bg-[var(--color-surface)] px-6 py-4">
          <DialogTitle className="text-base font-semibold text-foreground">
            {isEditing ? t("mcp.editTitle") : t("mcp.addTitle")}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px] text-[var(--color-text-secondary)]">
            {t("mcp.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="app-scroll flex max-h-[calc(90vh-160px)] flex-col gap-5 overflow-y-auto bg-[var(--color-bg)] px-6 py-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mcp.name")}</Label>
            <Input
              id="mcp-name"
              ref={firstFieldRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mcp.transport")}</Label>
            <div className="flex rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface-muted)] p-1 gap-1">
              {transportOptions.map((option) => {
                const isSelected = transport === option.value;
                return (
                  <button
                    key={option.value}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-1.5 text-center text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                        : "hover:bg-[var(--color-surface)]/60",
                    )}
                    onClick={() => setTransport(option.value)}
                    type="button"
                  >
                    <span className={cn("block font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
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
                <Label htmlFor="mcp-command" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mcp.command")}</Label>
                <Input
                  id="mcp-command"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                />
              </div>

              {/* Args List */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mcp.args")}</Label>
                <div className="space-y-2">
                  {args.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.value}
                        onChange={(e) => {
                          const newArgs = [...args];
                          newArgs[index].value = e.target.value;
                          setArgs(newArgs);
                        }}
                        className="h-10 rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-muted-foreground hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] rounded-xl"
                        onClick={() => setArgs(args.filter(a => a.id !== item.id))}
                      >
                        <Trash2 className="size-[14px]" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setArgs([...args, { id: crypto.randomUUID(), value: "" }])}
                    className="w-full rounded-xl border-dashed border-[#dbe4f1] text-[12px] text-muted-foreground hover:bg-muted/50"
                  >
                    <Plus className="mr-1 size-3.5" /> {t("mcp.addArg")}
                  </Button>
                </div>
              </div>

              {/* Env Variables List */}
              <div className="space-y-2 pt-2 border-t border-[#dbe4f1]">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mcp.env")}</Label>
                <div className="space-y-2">
                  {envItems.map((item, index) => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-center gap-2">
                      <Input
                        value={item.key}
                        onChange={(e) => {
                          const newEnv = [...envItems];
                          newEnv[index].key = e.target.value;
                          setEnvItems(newEnv);
                        }}
                        className="h-10 font-mono text-[12px] sm:w-[160px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                      <span className="hidden sm:inline text-muted-foreground">=</span>
                      <Input
                        value={item.value}
                        onChange={(e) => {
                          const newEnv = [...envItems];
                          newEnv[index].value = e.target.value;
                          setEnvItems(newEnv);
                        }}
                        className="h-10 font-mono text-[12px] flex-1 rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-muted-foreground hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] rounded-xl"
                        onClick={() => setEnvItems(envItems.filter(e => e.id !== item.id))}
                      >
                        <Trash2 className="size-[14px]" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEnvItems([...envItems, { id: crypto.randomUUID(), key: "", value: "" }])}
                    className="w-full rounded-xl border-dashed border-[#dbe4f1] text-[12px] text-muted-foreground hover:bg-muted/50"
                  >
                    <Plus className="mr-1 size-3.5" /> {t("mcp.addEnv")}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-url" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{getUrlLabel()}</Label>
                <Input
                  id="mcp-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">{t("mcp.customHeaders")}</div>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {t("mcp.customHeadersHint")}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {headerItems.map((item, index) => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-center gap-2">
                      <Input
                        value={item.key}
                        onChange={(e) => {
                          const newHeaders = [...headerItems];
                          newHeaders[index].key = e.target.value;
                          setHeaderItems(newHeaders);
                        }}
                        className="h-10 font-mono text-[12px] sm:w-[200px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                      <span className="hidden sm:inline text-muted-foreground">=</span>
                      <Input
                        value={item.value}
                        onChange={(e) => {
                          const newHeaders = [...headerItems];
                          newHeaders[index].value = e.target.value;
                          setHeaderItems(newHeaders);
                        }}
                        className="h-10 font-mono text-[12px] flex-1 rounded-xl border-[#dbe4f1] bg-[var(--color-surface)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-muted-foreground hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] rounded-xl"
                        onClick={() => setHeaderItems(headerItems.filter(h => h.id !== item.id))}
                      >
                        <Trash2 className="size-[14px]" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setHeaderItems([...headerItems, { id: crypto.randomUUID(), key: "", value: "" }])}
                    className="w-full rounded-xl border-dashed border-[#dbe4f1] text-[12px] text-muted-foreground hover:bg-muted/50"
                  >
                    <Plus className="mr-1 size-3.5" /> {t("mcp.addHeader")}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">{t("mcp.authentication")}</div>
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {t("mcp.authenticationHint")}
                  </p>
                </div>
                <div className="flex rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface-muted)] p-1 gap-1">
                  {[
                    { value: "none", label: "None" },
                    { value: "oauth", label: "OAuth" },
                  ].map((option) => {
                    const selected = authMode === option.value;
                    return (
                      <button
                        key={option.value}
                        className={cn(
                          "flex-1 rounded-xl px-3 py-1.5 text-center text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                            : "hover:bg-[var(--color-surface)]/60",
                        )}
                        onClick={() => setAuthMode(option.value as "none" | "oauth")}
                        type="button"
                      >
                        <span className={cn("block font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {authMode === "oauth" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="mcp-client-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t("mcp.appName")}
                      </Label>
                      <Input
                        id="mcp-client-name"
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface-muted)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mcp-client-id" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Client ID
                      </Label>
                      <Input
                        id="mcp-client-id"
                        value={clientId}
                        onChange={(event) => setClientId(event.target.value)}
                        placeholder={t("mcp.clientIdPlaceholder")}
                        className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface-muted)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mcp-scope" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Scope
                      </Label>
                      <Input
                        id="mcp-scope"
                        value={scope}
                        onChange={(event) => setScope(event.target.value)}
                        placeholder={t("mcp.scopePlaceholder")}
                        className="h-10 text-[13px] rounded-xl border-[#dbe4f1] bg-[var(--color-surface-muted)] shadow-[0_1px_4px_rgba(15,23,42,0.04)] focus-visible:border-[var(--color-primary)] focus-visible:ring-0"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}

          {error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-error-soft)] bg-[var(--color-error-soft)] p-3 text-[13px] text-[var(--color-error)]">
              <span className="mt-1.5 flex-none size-1.5 shrink-0 rounded-full bg-[var(--color-error)]" />
              <div className="app-scroll max-h-[120px] flex-1 overflow-y-auto break-all font-mono text-[11px] leading-5">
                {error}
              </div>
            </div>
          ) : null}

          <DialogFooter className="items-center justify-end gap-3 border-t border-[#dbe4f1] pt-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSaving}
                className="rounded-lg text-muted-foreground hover:text-foreground"
              >
                {t("sidebar.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-lg text-white shadow-none hover:opacity-90"
                style={{ background: "var(--gradient-action)" }}
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : isEditing ? (
                  <PencilLine className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isSaving
                  ? t("mcp.validating")
                  : isEditing
                    ? t("sidebar.save")
                    : t("sidebar.add")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
