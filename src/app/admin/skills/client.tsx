"use client";

import { useMemo, useState } from "react";

import { SkillForm } from "@/components/admin/skill-form";
import { Button } from "@/components/ui/button";
import { BookText, PencilLine, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deleteSkill, type SkillRow } from "./actions";

type Props = { skills: SkillRow[] };

export function SkillsAdminClient({ skills }: Props) {
  const [form, setForm] = useState<{ open: boolean; skill?: SkillRow }>({ open: false });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? skills.filter((s) => [s.name, s.description].some((v) => v?.toLowerCase().includes(q)))
      : skills;
  }, [skills, search]);

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground">Reusable instructions available to agents and groups.</p>
        </div>
        <Button onClick={() => setForm({ open: true })}>+ Add Skill</Button>
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills..."
          className="pl-9 text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="portal-table-shell overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm text-[var(--color-text-secondary)]">
          <thead>
            <tr>
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((skill) => (
              <tr
                key={skill.id}
                className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]/55"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                      <BookText className="size-4 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-[var(--color-text-secondary)]">{skill.name}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {skill.description ?? <span className="italic">No description</span>}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      skill.enabled
                        ? "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
                    )}
                  >
                    {skill.enabled ? "enabled" : "disabled"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-muted-foreground"
                      onClick={() => setForm({ open: true, skill })}
                      title="Edit"
                    >
                      <PencilLine />
                    </Button>
                    <form action={async () => { await deleteSkill(skill.id); }}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)]"
                        title="Delete"
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <p className="font-semibold">
                    {skills.length === 0 ? "No skills configured" : "No skills found"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {skills.length === 0
                      ? "Add the first skill to enable prompt customization."
                      : "Try a different search term."}
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SkillForm open={form.open} skill={form.skill} onClose={() => setForm({ open: false })} />
    </div>
  );
}
