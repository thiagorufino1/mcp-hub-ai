"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GroupForm } from "@/components/admin/group-form";
import { deleteGroup } from "./actions";
import type { GroupRow } from "./actions";

export function GroupsAdminClient({ groups }: { groups: GroupRow[] }) {
  const [form, setForm] = useState<{ open: boolean; group?: GroupRow }>({ open: false });

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entra Groups</h1>
          <p className="text-sm text-muted-foreground">
            Register Entra ID groups. Assign them to Workspaces to control access.
          </p>
        </div>
        <Button onClick={() => setForm({ open: true })}>+ Add Group</Button>
      </div>

      <div className="portal-table-shell">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Display Name</th>
              <th className="px-4 py-3 text-left font-medium">Entra Object ID</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No groups yet. Add an Entra group to use it in Workspace access control.
                </td>
              </tr>
            )}
            {groups.map((group) => (
              <tr key={group.id} className="border-b last:border-0 hover:bg-[var(--color-surface-muted)]/50">
                <td className="px-4 py-3 font-medium">{group.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{group.entraGroupId}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, group })}>
                    Edit
                  </Button>
                  <form action={async () => { await deleteGroup(group.id); }} style={{ display: "inline" }}>
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Delete
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GroupForm
        open={form.open}
        group={form.group}
        onClose={() => setForm({ open: false })}
      />
    </div>
  );
}
