"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupForm } from "@/components/admin/group-form";
import { deleteGroup, syncAllGroups } from "./actions";
import type { GroupRow } from "./actions";
import { RefreshCw, Search, Trash2, User } from "@/components/ui/icons";

export function GroupsAdminClient({ groups }: { groups: GroupRow[] }) {
  const [form, setForm] = useState<{ open: boolean; group?: GroupRow }>({ open: false });
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) =>
      [
        group.displayName,
        group.entraGroupId,
        group.isActive ? "active" : "inactive",
        String(group.memberCount),
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [groups, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Register Entra ID groups to control namespace access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={syncAllGroups}>
            <Button type="submit" variant="outline" className="rounded-lg">
              <RefreshCw className="size-4" aria-hidden="true" />
              Sync groups
            </Button>
          </form>
          <Button onClick={() => setForm({ open: true })}>+ Add Group</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search groups..."
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[27%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 text-center font-medium">Entra Object ID</th>
              <th className="px-4 py-3 text-center font-medium">Members</th>
              <th className="px-4 py-3 text-center font-medium">Last sync</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-semibold text-[var(--color-text-secondary)]">
                    {groups.length === 0 ? "No groups yet" : "No groups found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {groups.length === 0
                      ? "Add a group to use it in namespace access control."
                      : "Try a different search term."}
                  </p>
                </td>
              </tr>
            )}
            {filteredGroups.map((group) => (
              <tr
                key={group.id}
                className={`border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55 ${
                  group.isActive ? "" : "opacity-65"
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                      <User className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-text-secondary)]">
                        {group.displayName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-block max-w-full truncate font-mono text-xs text-muted-foreground">
                    {group.entraGroupId}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-xs text-muted-foreground">
                    {group.memberCount} members
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                  {group.lastSyncedAt
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(group.lastSyncedAt))
                    : "-"}
                </td>
                <td className="px-4 py-4 text-center">
                  <Badge
                    variant="outline"
                    className={
                      group.isActive
                        ? "rounded-md border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-green-800"
                        : "rounded-md border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-red-800"
                    }
                  >
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center">
                    <form action={async () => { await deleteGroup(group.id); }} style={{ display: "inline" }}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
                        aria-label={`Delete ${group.displayName}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </form>
                  </div>
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
