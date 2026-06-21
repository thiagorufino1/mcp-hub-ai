"use client";

import { useState, useTransition } from "react";

import { saveNamespace, type NamespaceRow } from "@/app/admin/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type McpOption = { id: string; name: string; description: string | null; transport: string };

export function NamespaceForm({
  groups,
  mcpServers,
  namespace,
  onClose,
  open,
  users,
}: {
  groups: Array<{ id: string; displayName: string }>;
  mcpServers: McpOption[];
  namespace?: NamespaceRow;
  onClose: () => void;
  open: boolean;
  users: Array<{ id: string; name: string | null; email: string | null }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState(namespace?.allUsers ?? false);

  const selectedGroups = new Set(namespace?.groups.map((g) => g.id) ?? []);
  const selectedUsers = new Set(namespace?.users.map((u) => u.id) ?? []);
  const selectedMcps = new Set(namespace?.mcpServerIds ?? []);

  function submit(formData: FormData) {
    setError(null);
    if (allUsers) formData.set("allUsers", "true");
    startTransition(async () => {
      try {
        await saveNamespace(formData);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to save namespace.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="admin-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle>{namespace ? "Edit namespace" : "Add namespace"}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={namespace?.id ?? ""} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ns-name">Name</Label>
              <Input id="ns-name" name="name" defaultValue={namespace?.name ?? ""} required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ns-slug">Slug</Label>
              <Input id="ns-slug" name="slug" defaultValue={namespace?.slug ?? ""} required />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="ns-desc">Description</Label>
            <Textarea id="ns-desc" name="description" defaultValue={namespace?.description ?? ""} rows={2} />
          </div>

          <fieldset className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">MCP Servers</legend>
            {mcpServers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No MCP servers configured.</p>
            ) : (
              mcpServers.map((mcp) => (
                <label key={mcp.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="mcpServerIds"
                    value={mcp.id}
                    defaultChecked={selectedMcps.has(mcp.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">{mcp.name}</span>
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {mcp.transport}
                    </span>
                    {mcp.description && (
                      <span className="block text-xs text-muted-foreground">{mcp.description}</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Access</legend>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="allUsers"
                value="true"
                checked={allUsers}
                onChange={(e) => setAllUsers(e.target.checked)}
              />
              Available to all authenticated users
            </label>
            {!allUsers && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups</p>
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No groups configured.</p>
                  ) : (
                    groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="groupIds" value={g.id} defaultChecked={selectedGroups.has(g.id)} />
                        {g.displayName}
                      </label>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Individual users</p>
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users yet.</p>
                  ) : (
                    users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="userIds" value={u.id} defaultChecked={selectedUsers.has(u.id)} />
                        {u.name ?? u.email ?? u.id}
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" name="enabled" value="true" defaultChecked={namespace?.enabled ?? true} />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" name="published" value="true" defaultChecked={namespace?.published ?? false} />
              Published endpoint
            </label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="admin-form-footer">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}