"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ConnectionItem = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  connection: { status: string; updatedAt: Date } | null;
};

type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "pending"
  | "error";

export function ConnectionsClient({ items }: { items: ConnectionItem[] }) {
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        item.connection?.status === "connected"
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
      const startData = await startRes.json() as {
        authorizationUrl?: string;
        codeVerifier?: string;
        state?: string;
        error?: string;
      };

      if (!startData.authorizationUrl || !startData.codeVerifier || !startData.state) {
        setStatuses((s) => ({ ...s, [mcpId]: "error" }));
        return;
      }

      // Store only what's needed — no sensitive creds
      const pendingData = {
        codeVerifier: startData.codeVerifier,
        state: startData.state,
        mcpServerId: mcpId,
        redirectUri,
      };
      sessionStorage.setItem(`corp-oauth-${startData.state}`, JSON.stringify(pendingData));

      const popup = window.open(startData.authorizationUrl, "mcp-oauth", "width=600,height=700");
      if (!popup) {
        sessionStorage.removeItem(`corp-oauth-${startData.state}`);
        setStatuses((s) => ({ ...s, [mcpId]: "error" }));
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if ((event.data as { type?: string } | null)?.type !== "mcp-oauth-callback") return;

        window.removeEventListener("message", handleMessage);
        popup.close();

        const { code, state, error } = event.data as { code?: string; state?: string; error?: string };
        if (error || !code || !state) {
          setStatuses((s) => ({ ...s, [mcpId]: "error" }));
          return;
        }

        const stored = sessionStorage.getItem(`corp-oauth-${state}`);
        if (!stored) {
          setStatuses((s) => ({ ...s, [mcpId]: "error" }));
          return;
        }
        sessionStorage.removeItem(`corp-oauth-${state}`);
        const pending = JSON.parse(stored) as typeof pendingData;
        if (pending.state !== state || pending.mcpServerId !== mcpId) {
          setStatuses((s) => ({ ...s, [mcpId]: "error" }));
          return;
        }

        // Exchange body — server fetches client credentials from DB
        const exchangeRes = await fetch("/api/mcp/corporate-oauth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mcpServerId: pending.mcpServerId,
            code,
            codeVerifier: pending.codeVerifier,
            redirectUri: pending.redirectUri,
            state,
          }),
        });

        if (exchangeRes.ok) {
          setStatuses((s) => ({ ...s, [mcpId]: "connected" }));
        } else {
          setStatuses((s) => ({ ...s, [mcpId]: "error" }));
        }
      };

      window.addEventListener("message", handleMessage);

      const popupMonitor = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(popupMonitor);
        window.removeEventListener("message", handleMessage);
        const pendingKey = `corp-oauth-${startData.state}`;
        if (sessionStorage.getItem(pendingKey)) {
          sessionStorage.removeItem(pendingKey);
          setStatuses((s) => ({ ...s, [mcpId]: "disconnected" }));
        }
      }, 500);
    } catch {
      setStatuses((s) => ({ ...s, [mcpId]: "error" }));
    }
  }, []);

  const disconnect = useCallback(async (mcpId: string) => {
    setStatuses((s) => ({ ...s, [mcpId]: "pending" }));
    const res = await fetch("/api/mcp/corporate-oauth/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mcpServerId: mcpId }),
    });
    setStatuses((s) => ({ ...s, [mcpId]: res.ok ? "disconnected" : "error" }));
  }, []);

  return (
    <div className="portal-page max-w-4xl">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">My Connections</h1>
        <p className="text-sm text-muted-foreground">
          Connect your accounts for tools that require your personal authorization.
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No delegated tools available for your group.
        </p>
      )}

      {items.length > 0 && (
        <div className="portal-section divide-y p-0">
          {items.map((item) => {
            const status = statuses[item.id] ?? "disconnected";
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      status === "connected"
                        ? "default"
                        : status === "pending"
                          ? "secondary"
                          : status === "error"
                            ? "destructive"
                            : status === "expired"
                              ? "secondary"
                              : "outline"
                    }
                  >
                    {status === "pending" ? "Connecting…" : status}
                  </Badge>
                  {status === "connected" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void disconnect(item.id)}
                    >
                      Desvincular
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={status === "pending"}
                      onClick={() => void connect(item.id)}
                    >
                      {status === "expired" ? "Vincular novamente" : "Vincular"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
