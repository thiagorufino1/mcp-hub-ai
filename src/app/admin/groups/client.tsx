"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroupForm } from "@/components/admin/group-form";
import { deleteGroup } from "./actions";
import type { GroupRow } from "./actions";

type McpOption = { id: string; name: string };
type SkillOption = { id: string; name: string };
type Props = { groups: GroupRow[]; mcpOptions: McpOption[]; skillOptions: SkillOption[] };

export function GroupsAdminClient({ groups, mcpOptions, skillOptions }: Props) {
  const [form, setForm] = useState<{ open: boolean; group?: GroupRow }>({ open: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups & Access Policies</h1>
        <Button onClick={() => setForm({ open: true })}>+ Add Group</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Group Name</th>
              <th className="px-4 py-3 text-left font-medium">Entra ID</th>
              <th className="px-4 py-3 text-left font-medium">MCPs</th>
              <th className="px-4 py-3 text-left font-medium">Skills</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No groups yet.</td>
              </tr>
            )}
            {groups.map((group) => (
              <tr key={group.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{group.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{group.entraGroupId}</td>
                <td className="px-4 py-3">
                  {group.policy?.mcpServers.length
                    ? group.policy.mcpServers.map((m) => (
                        <Badge key={m.id} variant="outline" className="mr-1 text-xs">{m.name}</Badge>
                      ))
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  {group.policy?.skills.length
                    ? group.policy.skills.map((s) => (
                        <Badge key={s.id} variant="outline" className="mr-1 text-xs">{s.name}</Badge>
                      ))
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, group })}>Edit</Button>
                  <form action={async () => { await deleteGroup(group.id); }} style={{ display: "inline" }}>
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">Delete</Button>
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
        mcpOptions={mcpOptions}
        skillOptions={skillOptions}
      />
    </div>
  );
}
