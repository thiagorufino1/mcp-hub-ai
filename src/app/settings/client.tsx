"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createToken, deleteToken } from "./actions";
import type { TokenRow } from "./actions";

type Props = { tokens: TokenRow[]; proxyUrl: string };

export function SettingsClient({ tokens, proxyUrl }: Props) {
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
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your personal API tokens for MCP proxy access.</p>
      </div>

      {/* MCP Proxy URL */}
      <div className="rounded-md border p-4 space-y-2">
        <h2 className="font-semibold text-sm">MCP Proxy Endpoint</h2>
        <p className="text-xs text-muted-foreground">
          Connect VS Code, Claude Desktop, or any MCP client to this URL using your personal token.
        </p>
        <code className="block text-xs bg-muted rounded px-3 py-2 break-all">{proxyUrl}</code>
        <p className="text-xs text-muted-foreground">
          Add to your MCP client config:{" "}
          <code className="text-xs">{"Authorization: Bearer <your-token>"}</code>
        </p>
      </div>

      {/* Token list */}
      <div className="space-y-3">
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
      </div>

      {/* Generate token form */}
      <div className="space-y-3">
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
      </div>

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
