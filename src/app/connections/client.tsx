"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Cable, CheckCircle2, Globe, LoaderCircle, TerminalSquare, XCircle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ConnectionItem = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  authType: string;
  connection: { status: string; updatedAt: Date } | null;
};

type OAuthStatus = "connected" | "disconnected" | "expired" | "pending" | "error";

function TransportIcon({ transport }: { transport: string }) {
  const Icon = transport === "stdio" ? TerminalSquare : transport === "sse" ? Globe : Cable;
  return <Icon className="size-4 text-muted-foreground" />;
}

function StatusBadge({ authType, status }: { authType: string; status: OAuthStatus }) {
  if (authType !== "oauth_delegated") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
        <CheckCircle2 className="size-3" /> Configured by admin
      </span>
    );
  }

  const map: Record<OAuthStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    connected: { label: "Connected", cls: "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]", Icon: CheckCircle2 },
    disconnected: { label: "Not connected", cls: "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground", Icon: XCircle },
    expired: { label: "Expired", cls: "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]", Icon: XCircle },
    pending: { label: "Connecting…", cls: "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground", Icon: LoaderCircle },
    error: { label: "Error", cls: "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]", Icon: XCircle },
  };

  const { label, cls, Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium", cls)}>
      <Icon className={cn("size-3", status === "pending" && "animate-spin")} />
      {label}
    </span>
  );
}

export function ConnectionsClient({ items }: { items: ConnectionItem[] }) {
  const [statuses, setStatuses] = useState<Record<string, OAuthStatus>>(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        item.authType !== "oauth_delegated"
          ? "connected"
          : item.connection?.status === "connected"
            ? "connected"
            : item.connection?.status === "expired"
              ? "expired"
              : "disconnected",
      ]),
    ),
  );

  const connect = useCallback(async (mcpId: string) => {
    setStatuses((s) => ({ ...s, [mcpId]: "pending" }));
    const redirectUri = `${window.location.origin}/oauth/callback`;

    try {
      const startRes = await fetch("/api/mcp/corporate-oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcpServerId: mcpId, redirectUri }),
      });
      const startData = await startRes.json() as { authorizationUrl?: string; codeVerifier?: string; state?: string; error?: string };

      if (!startData.authorizationUrl || !startData.codeVerifier || !startData.state) {
        setStatuses((s) => ({ ...s, [mcpId]: "error" }));
        return;
      }

      const pendingData = { codeVerifier: startData.codeVerifier, state: startData.state, mcpServerId: mcpId, redirectUri };
      sessionStorage.setItem(`corp-oauth-${startData.state}`, JSON.stringify(pendingData));

      const popup = window.open(startData.authorizationUrl, "mcp-oauth", "width=600,height=700");
      if (!popup) { sessionStorage.removeItem(`corp-oauth-${startData.state}`); setStatuses((s) => ({ ...s, [mcpId]: "error" })); return; }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if ((event.data as { type?: string } | null)?.type !== "mcp-oauth-callback") return;
        window.removeEventListener("message", handleMessage);
        popup.close();
        const { code, state, error } = event.data as { code?: string; state?: string; error?: string };
        if (error || !code || !state) { setStatuses((s) => ({ ...s, [mcpId]: "error" })); return; }
        const stored = sessionStorage.getItem(`corp-oauth-${state}`);
        if (!stored) { setStatuses((s) => ({ ...s, [mcpId]: "error" })); return; }
        sessionStorage.removeItem(`corp-oauth-${state}`);
        const pending = JSON.parse(stored) as typeof pendingData;
        if (pending.state !== state || pending.mcpServerId !== mcpId) { setStatuses((s) => ({ ...s, [mcpId]: "error" })); return; }
        const exchangeRes = await fetch("/api/mcp/corporate-oauth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcpServerId: pending.mcpServerId, code, codeVerifier: pending.codeVerifier, redirectUri: pending.redirectUri, state }),
        });
        setStatuses((s) => ({ ...s, [mcpId]: exchangeRes.ok ? "connected" : "error" }));
      };

      window.addEventListener("message", handleMessage);
      const monitor = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(monitor);
        window.removeEventListener("message", handleMessage);
        const key = `corp-oauth-${startData.state}`;
        if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); setStatuses((s) => ({ ...s, [mcpId]: "disconnected" })); }
      }, 500);
    } catch {
      setStatuses((s) => ({ ...s, [mcpId]: "error" }));
    }
  }, []);

  const disconnect = useCallback(async (mcpId: string) => {
    setStatuses((s) => ({ ...s, [mcpId]: "pending" }));
    const res = await fetch("/api/mcp/corporate-oauth/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mcpServerId: mcpId }) });
    setStatuses((s) => ({ ...s, [mcpId]: res.ok ? "disconnected" : "error" }));
  }, []);

  return (
    <div className="portal-page max-w-4xl">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Connections</h1>
          <p className="text-sm text-muted-foreground">All MCP tools available to your account.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="portal-table-shell">
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No MCP tools configured for your account yet.
          </p>
        </div>
      ) : (
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--color-text-secondary)]">
            <thead>
              <tr>
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = statuses[item.id] ?? "disconnected";
                const isOAuth = item.authType === "oauth_delegated";
                return (
                  <tr key={item.id} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                          <TransportIcon transport={item.transport} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-text-secondary)]">{item.name}</p>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.transport}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge authType={item.authType} status={status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      {isOAuth && (
                        status === "connected" ? (
                          <Button size="sm" variant="ghost" className="text-[var(--color-error)] hover:bg-[var(--color-error-soft)]" onClick={() => void disconnect(item.id)}>
                            Disconnect
                          </Button>
                        ) : (
                          <Button size="sm" disabled={status === "pending"} onClick={() => void connect(item.id)}>
                            {status === "expired" ? "Reconnect" : "Connect"}
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
