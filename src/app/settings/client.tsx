"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createToken, deleteToken } from "./actions";
import type { TokenRow } from "./actions";

type Props = {
  tokens: TokenRow[];
  proxyUrl: string;
  namespaceEndpoints: Array<{ name: string; slug: string; url: string }>;
};

export function SettingsClient({ namespaceEndpoints, tokens, proxyUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createToken(formData);
        setNewToken(result.rawToken);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create token.");
      }
    });
  }

  return (
    <div className="portal-page max-w-4xl">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your personal API tokens for MCP proxy access.</p>
      </div>

      {namespaceEndpoints.length > 0 ? (
        <section className="portal-section">
          <h2 className="font-semibold">Published namespaces</h2>
          {namespaceEndpoints.map((namespace) => {
            const config = JSON.stringify({
              mcpServers: {
                [namespace.slug]: {
                  type: "http",
                  url: namespace.url,
                  headers: { Authorization: "Bearer <your-token>" },
                },
              },
            }, null, 2);
            const vscodeConfig = JSON.stringify({
              inputs: [{
                id: "mcpHubToken",
                type: "promptString",
                description: "MCP Hub personal token",
                password: true,
              }],
              servers: {
                [namespace.slug]: {
                  type: "http",
                  url: namespace.url,
                  headers: { Authorization: "Bearer ${input:mcpHubToken}" },
                },
              },
            }, null, 2);
            return (
              <details key={namespace.slug} className="rounded-md border p-4">
                <summary className="cursor-pointer text-sm font-medium">{namespace.name}</summary>
                <div className="mt-3 flex flex-col gap-2">
                  <code className="break-all rounded bg-muted px-3 py-2 text-xs">
                    {namespace.url}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Claude Desktop and Cursor configuration:
                  </p>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{config}</pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void navigator.clipboard.writeText(config)}
                  >
                    Copy configuration
                  </Button>
                  <p className="text-xs text-muted-foreground">VS Code `.vscode/mcp.json`:</p>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{vscodeConfig}</pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void navigator.clipboard.writeText(vscodeConfig)}
                  >
                    Copy VS Code configuration
                  </Button>
                </div>
              </details>
            );
          })}
        </section>
      ) : null}

      {/* MCP Proxy URL */}
      <section className="portal-section">
        <h2 className="font-semibold text-sm">MCP Proxy Endpoint</h2>
        <p className="text-xs text-muted-foreground">
          Connect VS Code, Claude Desktop, or any MCP client to this URL using your personal token.
        </p>
        <code className="block text-xs bg-muted rounded px-3 py-2 break-all">{proxyUrl}</code>
        <p className="text-xs text-muted-foreground">
          Add to your MCP client config:{" "}
          <code className="text-xs">{"Authorization: Bearer <your-token>"}</code>
        </p>
      </section>

      {/* Token list */}
      <section className="portal-section">
        <h2 className="font-semibold">Personal Tokens</h2>
        {tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">No tokens yet. Generate one below.</p>
        )}
        <div className="rounded-md border divide-y">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt && (
                    <> · Last used {new Date(token.lastUsedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <form action={async () => { await deleteToken(token.id); }}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  Revoke
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* Generate token form */}
      <section className="portal-section">
        <h2 className="font-semibold">Generate New Token</h2>
        <form ref={formRef} action={handleCreate} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="name" className="sr-only">Token name</Label>
            <Input id="name" name="name" placeholder="e.g. VS Code personal" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Generating…" : "Generate"}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {/* Show-once dialog */}
      <Dialog open={!!newToken} onOpenChange={(o) => { if (!o) setNewToken(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Token Generated</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy this token now. It will not be shown again.
          </p>
          <code className="block text-xs bg-muted rounded px-3 py-3 break-all select-all">
            {newToken}
          </code>
          <Button
            onClick={() => {
              if (newToken) void navigator.clipboard.writeText(newToken);
            }}
            variant="outline"
            className="w-full"
          >
            Copy to clipboard
          </Button>
          <Button onClick={() => setNewToken(null)} className="w-full">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
