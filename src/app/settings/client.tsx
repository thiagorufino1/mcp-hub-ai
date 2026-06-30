"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createToken, deleteToken } from "./actions";
import type { TokenRow } from "./actions";

type Props = {
  tokens: TokenRow[];
};

function tokenStatus(expiresAt: Date | null): {
  label: string;
  daysLeft: number | null;
  color: "green" | "yellow" | "red";
} {
  if (!expiresAt) return { label: "Sem expiração", daysLeft: null, color: "green" };
  const now = Date.now();
  const msLeft = new Date(expiresAt).getTime() - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { label: "Expirado", daysLeft: 0, color: "red" };
  if (daysLeft <= 30) return { label: `Expira em ${daysLeft}d`, daysLeft, color: "yellow" };
  return { label: `${daysLeft}d restantes`, daysLeft, color: "green" };
}

const statusStyles = {
  green:  "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  yellow: "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  red:    "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]",
};

export function SettingsClient({ tokens }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isRevoking, startRevoke] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<TokenRow | null>(null);
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
        setError(err instanceof Error ? err.message : "Falha ao criar token.");
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
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus tokens de acesso aos endpoints.</p>
      </div>

      <section className="portal-section gap-0 p-0">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="font-semibold">Tokens</h2>
        </div>

        {tokens.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum token criado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[var(--color-text-secondary)]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Criado em</th>
                  <th className="px-4 py-3 text-left font-medium">Expira em</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Último uso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => {
                  const status = tokenStatus(token.expiresAt);
                  return (
                    <tr key={token.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/50">
                      <td className="px-4 py-3 font-medium text-foreground">{token.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(token.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {token.expiresAt
                          ? new Date(token.expiresAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[status.color]}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {token.lastUsedAt
                          ? new Date(token.lastUsedAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" className="bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90" onClick={() => setRevokeTarget(token)}>
                          Revogar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-[var(--color-border)] px-4 py-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Gerar novo token</p>
          <form ref={formRef} action={handleCreate} className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-40">
              <Label htmlFor="name" className="sr-only">Nome do token</Label>
              <Input id="name" name="name" placeholder="Ex.: vscode" required />
            </div>
            <div>
              <Label htmlFor="expiry" className="sr-only">Expiração</Label>
              <select
                id="expiry"
                name="expiry"
                required
                defaultValue=""
                className="h-9 rounded-xl border border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-muted)] px-3 text-sm text-[var(--color-text-secondary)] shadow-[0_1px_4px_rgba(15,23,42,0.06)] focus-visible:border-[var(--color-primary)] focus-visible:outline-none"
              >
                <option value="" disabled>Expiração</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
                <option value="180d">180 dias</option>
                <option value="365d">1 ano</option>
              </select>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Gerando…" : "Gerar"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>}
        </div>
      </section>

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

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar token</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja revogar o token <strong>{revokeTarget?.name}</strong>? Qualquer cliente usando este token perderá o acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={isRevoking}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isRevoking}
              onClick={() => {
                if (!revokeTarget) return;
                startRevoke(async () => {
                  await deleteToken(revokeTarget.id);
                  setRevokeTarget(null);
                });
              }}
            >
              {isRevoking ? "Revogando..." : "Revogar token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
