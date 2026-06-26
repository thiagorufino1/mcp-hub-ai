"use client";

import Link from "next/link";
import {
  Cable,
  CheckCircle2,
  Globe,
  LoaderCircle,
  MessageSquarePlus,
  PencilLine,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  TerminalSquare,
  Trash2,
  XCircle,
  Zap,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { McpServerConfig } from "@/types/mcp";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  devMode: boolean;
  onDevModeToggle: (value: boolean) => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onNewConversation: () => void;
  onSessionSwitch: (id: string) => void;
  onSessionDelete: (id: string) => void;
  servers: McpServerConfig[];
  retestingServerIds: string[];
  togglingServerIds: string[];
  onAddServer: () => void;
  onEditServer: (id: string) => void;
  onRemoveServer: (id: string) => void;
  onRetestServer: (id: string) => void;
  onToggleServerEnabled: (id: string) => void;
};

function getTransportIcon(transport: string) {
  if (transport === "stdio") return TerminalSquare;
  if (transport === "sse") return Globe;
  return Cable;
}

function McpStatusBadge({
  enabled,
  isRetesting,
  status,
}: {
  enabled: boolean;
  isRetesting: boolean;
  status: McpServerConfig["connectionStatus"];
}) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Desativado
      </span>
    );
  }
  if (isRetesting) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: "var(--color-warning)", background: "var(--color-warning-soft)", color: "var(--color-warning)" }}>
        <LoaderCircle className="size-3 animate-spin" />
        Validando
      </span>
    );
  }
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: "var(--color-success)", background: "var(--color-success-soft)", color: "var(--color-success)" }}>
        <CheckCircle2 className="size-3" />
        Conectado
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ borderColor: "var(--color-error)", background: "var(--color-error-soft)", color: "var(--color-error)" }}>
        <XCircle className="size-3" />
        Desconectado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <LoaderCircle className="size-3" />
      Pendente
    </span>
  );
}

// portal-sidebar is sticky top:80px (60px header + 20px py-5 padding).
// This component is used inside the same mx-auto flex max-w-[1500px] gap-5 px-4 py-5 container as admin.
export function ChatNavigation({
  activeSessionId,
  devMode,
  isAdmin,
  onAddServer,
  onDevModeToggle,
  onEditServer,
  onNewConversation,
  onRemoveServer,
  onRetestServer,
  onSessionDelete,
  onSessionSwitch,
  onToggleServerEnabled,
  retestingServerIds,
  servers,
  sessions,
  togglingServerIds,
}: Props) {
  return (
    <aside className="portal-sidebar">
      {/* Header — identical structure to AdminNavigation */}
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]" translate="no">
            MCP Hub
          </p>
          <p className="text-xs text-muted-foreground">AI Chat</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="app-scroll flex flex-1 flex-col overflow-y-auto">
        {/* Primary nav — same <nav> pattern as admin */}
        <nav className="flex flex-col gap-1 p-3">
          <button
            type="button"
            onClick={onNewConversation}
            className="portal-nav-item w-full text-left"
          >
            <MessageSquarePlus className="size-4" />
            <span>Nova Conversa</span>
          </button>

          <Link href="/connections" className="portal-nav-item">
            <Cable className="size-4" />
            <span>My Connections</span>
          </Link>

          <Link href="/settings" className="portal-nav-item">
            <Settings className="size-4" />
            <span>Settings</span>
          </Link>
        </nav>

        {isAdmin && (
          <>
            <div className="mx-3 border-t border-border/50" />
            <nav className="flex flex-col gap-1 p-3">
              <Link href="/admin" className="portal-nav-item">
                <Shield className="size-4" />
                <span>Administration</span>
              </Link>
            </nav>
          </>
        )}

        {/* Dev Mode */}
        <div className="mx-3 border-t border-border/50" />
        <div className="p-3">
          <div
            className="portal-nav-item cursor-pointer justify-between"
            role="button"
            tabIndex={0}
            onClick={() => onDevModeToggle(!devMode)}
            onKeyDown={(e) => e.key === "Enter" && onDevModeToggle(!devMode)}
          >
            <div className="flex items-center gap-3">
              <Zap className="size-4" />
              <span>Dev Mode</span>
            </div>
            <Switch
              checked={devMode}
              onCheckedChange={onDevModeToggle}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {devMode && (
            <div className="mt-2 flex flex-col gap-2">
              {servers.length === 0 && (
                <p className="px-1 text-[11px] text-muted-foreground">
                  Nenhum MCP Server adicionado.
                </p>
              )}
              {servers.map((server) => {
                const Icon = getTransportIcon(server.transport);
                const isRetesting = retestingServerIds.includes(server.id);
                const isToggling = togglingServerIds.includes(server.id);
                return (
                  <div key={server.id} className="overflow-hidden rounded-xl border border-border bg-[var(--color-surface)]">
                    <div className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-muted-foreground/60">
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-foreground">{server.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
                            disabled={isRetesting || isToggling || !server.enabled}
                            onClick={() => onRetestServer(server.id)} aria-label={`Retest ${server.name}`}>
                            {isRetesting ? <LoaderCircle className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6 rounded-full text-muted-foreground/40 hover:text-foreground"
                            onClick={() => onEditServer(server.id)} aria-label={`Edit ${server.name}`}>
                            <PencilLine className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                            onClick={() => onRemoveServer(server.id)} aria-label={`Remove ${server.name}`}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground/70">
                        {server.url ?? server.command ?? ""}
                      </p>
                      <div className="mt-2">
                        <McpStatusBadge enabled={server.enabled} isRetesting={isRetesting} status={server.connectionStatus} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={onAddServer}
                className="portal-nav-item w-full justify-center"
                style={{ background: "var(--gradient-action)", color: "white" }}
              >
                <Plus className="size-4" />
                <span>Adicionar MCP</span>
              </button>
            </div>
          )}
        </div>

        {/* Sessions */}
        {sessions.length > 0 && (
          <>
            <div className="mx-3 border-t border-border/50" />
            <div className="p-3">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sessões
              </p>
              <div className="flex flex-col gap-0.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-xl px-3 py-2 transition-colors",
                      session.id === activeSessionId
                        ? "bg-[var(--color-primary-soft)]"
                        : "hover:bg-[var(--color-primary-soft)]/60",
                    )}
                  >
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSessionSwitch(session.id)}>
                      <p className={cn("truncate text-[12px] font-medium leading-snug",
                        session.id === activeSessionId ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")}>
                        {session.title}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground/50">#{session.id.slice(-8)}</p>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-1 text-muted-foreground/30 opacity-0 transition-opacity hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] group-hover:opacity-100"
                      onClick={() => onSessionDelete(session.id)}
                      aria-label={`Excluir sessão #${session.id.slice(-8)}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
