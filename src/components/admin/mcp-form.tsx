"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { McpServerRow } from "@/app/admin/mcp/actions";
import { createMcp, updateMcp } from "@/app/admin/mcp/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  mcp?: McpServerRow;
};

export function McpForm({ open, onClose, mcp }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [transport, setTransport] = useState(mcp?.transport ?? "streamable-http");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mcp) {
          await updateMcp(mcp.id, formData);
        } else {
          await createMcp(formData);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mcp ? "Edit MCP Server" : "Add MCP Server"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={mcp?.name} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={mcp?.description ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="transport">Transport *</Label>
            <select
              id="transport"
              name="transport"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="streamable-http">Streamable HTTP</option>
              <option value="sse">SSE</option>
              <option value="stdio">STDIO</option>
            </select>
          </div>

          {transport === "stdio" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="command">Command *</Label>
                <Input id="command" name="command" defaultValue={mcp?.command ?? ""} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="args">Args (one per line)</Label>
                <textarea
                  id="args"
                  name="args"
                  defaultValue={mcp?.args.join("\n") ?? ""}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="url">URL *</Label>
              <Input id="url" name="url" defaultValue={mcp?.url ?? ""} required />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="authType">Auth Type</Label>
            <select
              id="authType"
              name="authType"
              defaultValue={mcp?.authType ?? "none"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="shared_key">Shared Key (header)</option>
              <option value="oauth_shared">OAuth Shared (admin connects once)</option>
              <option value="oauth_delegated">OAuth Delegated (per user)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sharedSecret">Shared Secret / API Key</Label>
            <Input
              id="sharedSecret"
              name="sharedSecret"
              type="password"
              defaultValue={mcp?.sharedSecret ?? ""}
              placeholder="Leave blank to keep existing"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="env">Env vars (JSON)</Label>
            <textarea
              id="env"
              name="env"
              defaultValue={JSON.stringify(mcp?.env ?? {}, null, 2)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="headers">Headers (JSON)</Label>
            <textarea
              id="headers"
              name="headers"
              defaultValue={JSON.stringify(mcp?.headers ?? {}, null, 2)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="enabled"
              name="enabled"
              type="checkbox"
              value="true"
              defaultChecked={mcp?.enabled ?? true}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
