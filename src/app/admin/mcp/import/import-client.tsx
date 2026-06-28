"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload } from "@/components/ui/icons";
import { importMcpServers } from "../actions";
import {
  parseMcpImportJson,
  resolveMcpImportTransport,
  validateMcpImportEntry,
} from "@/lib/mcp-import";

const exampleJson = `{
  "mcpServers": {
    "Everything MCP Server": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything"
      ]
    },
    "Microsoft Learn": {
      "url": "https://learn.microsoft.com/api/mcp",
      "type": "http"
    },
    "http-example-token": {
      "url": "https://localhost:8000/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    },
    "http-example-oauth": {
      "url": "https://localhost:8000/mcp",
      "type": "http",
      "authType": "oauth_delegated"
    },
    "http-example-sse": {
      "url": "https://localhost:8000/mcp",
      "type": "sse"
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp"
      ]
    }
  }
}`;

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

export function McpImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [json, setJson] = useState(exampleJson);
  const [result, setResult] = useState<{
    imported: string[];
    skipped: string[];
    errors: string[];
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validation = useMemo(() => {
    if (!json.trim()) {
      return { ok: false, error: "Adicione o JSON.", entries: [] as Array<{ name: string; transport: string }> };
    }

    const parsed = parseMcpImportJson(json);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, entries: [] as Array<{ name: string; transport: string }> };
    }

    const issues: string[] = [];
    const entries = Object.entries(parsed.data.mcpServers).map(([name, entry]) => {
      const transport = resolveMcpImportTransport(entry);
      const entryError = validateMcpImportEntry(name, entry);
      if (entryError) {
        issues.push(entryError);
      }
      return { name, transport };
    });

    if (issues.length > 0) {
      return { ok: false, error: issues.join(" "), entries };
    }

    return { ok: true, error: null, entries };
  }, [json]);

  function handleImport() {
    setSubmitError(null);
    setResult(null);
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }

    startTransition(async () => {
      try {
        const imported = await importMcpServers(json);
        setResult(imported);
        onImported?.();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Import failed.");
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSubmitError(null);
      setResult(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[98vh] gap-0 overflow-hidden rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-0 shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
        <DialogHeader className="border-b border-[#dbe4f1] bg-[var(--color-surface)] px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Import Servers from JSON
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
            <Textarea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              className="min-h-[750px] font-mono !text-[13px] !leading-[1.4]"
              style={{ fontSize: "13px", lineHeight: "1.4" }}
              spellCheck={false}
              aria-label="Server configuration JSON"
              placeholder='{"mcpServers":{}}'
            />

            {submitError && (
              <p className="mt-3 text-sm text-[var(--color-error)]">{submitError}</p>
            )}

          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
              <h2 className="text-sm font-semibold">Validation</h2>
              {validation.ok ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-medium text-[var(--color-success)]">JSON is valid.</p>
                  <p className="text-muted-foreground">{validation.entries.length} server(s) detected.</p>
                  <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                    {validation.entries.map((entry) => (
                      <li key={entry.name} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2">
                        <span className="truncate">{entry.name}</span>
                        <span className="shrink-0 font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          {entry.transport}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{validation.error}</p>
              )}
            </section>

            {result && (
              <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_24px_rgba(17,63,124,0.04)]">
                <h2 className="text-sm font-semibold">Import result</h2>
                <div className="mt-3 space-y-3 text-sm">
                  <p className="text-[var(--color-success)]">{result.imported.length} imported</p>
                  {result.skipped.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[var(--color-warning)]">
                        {result.skipped.length} skipped, already exists
                      </p>
                      <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                        {result.skipped.map((name) => (
                          <li key={name} className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2">
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.errors.length > 0 && <p className="text-[var(--color-error)]">{result.errors.length} errors</p>}
                </div>
              </section>
            )}
          </aside>
        </div>

        <DialogFooter className="items-center justify-end gap-3 border-t border-[#dbe4f1] px-6 py-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setJson(exampleJson)}
          >
            <Download className="size-4" />
            Load example
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!validation.ok || isPending}
            className="gap-1.5 rounded-lg"
          >
            <Upload className="size-4" />
            {isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function McpImportPageClient() {
  const router = useRouter();

  return (
    <McpImportDialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          router.push("/admin/mcp");
        }
      }}
    />
  );
}
