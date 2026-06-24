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
};

export function SettingsClient({ tokens }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
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

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus tokens pessoais de acesso ao MCP proxy.</p>
      </div>

      {/* Personal Tokens */}
      <section className="portal-section gap-0 p-0">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="font-semibold">Tokens Pessoais</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Tokens para autenticação no MCP proxy.</p>
        </div>

        {tokens.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum token criado ainda.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-muted)]/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{token.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(token.createdAt).toLocaleDateString("pt-BR")}
                    {token.lastUsedAt && <> · Último uso {new Date(token.lastUsedAt).toLocaleDateString("pt-BR")}</>}
                  </p>
                </div>
                <form action={async () => { await deleteToken(token.id); }}>
                  <Button type="submit" variant="ghost" size="sm" className="bg-[var(--color-error-soft)] text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]">
                    Revogar
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <p className="mb-2.5 text-xs font-medium text-muted-foreground">Gerar novo token</p>
          <form ref={formRef} action={handleCreate} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="name" className="sr-only">Nome do token</Label>
              <Input id="name" name="name" placeholder="Ex.: VS Code pessoal" required />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Gerando…" : "Gerar"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>}
        </div>
      </section>

      {/* Token dialog */}
      <Dialog open={!!newToken} onOpenChange={(o) => { if (!o) setNewToken(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Token Gerado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copie este token agora. Ele não será exibido novamente.
          </p>
          <div className="relative rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3">
            <code className="block select-all break-all text-xs text-foreground">{newToken}</code>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => { if (newToken) copy(newToken, "dialog"); }} variant="outline" className="w-full">
              {copied === "dialog" ? "Copiado!" : "Copiar token"}
            </Button>
            <Button onClick={() => setNewToken(null)} className="w-full">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
