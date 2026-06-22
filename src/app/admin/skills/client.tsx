"use client";

import { useMemo, useState } from "react";

import { SkillForm } from "@/components/admin/skill-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BookText, PencilLine, Search, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { deleteSkill, setSkillEnabled, type SkillRow } from "./actions";

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
        <table className="w-full min-w-[980px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[42%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Skill</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
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
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-text-secondary)]">{skill.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  <span className="block max-w-full truncate">
                    {skill.description ?? <span className="italic">No description</span>}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={async (enabled) => {
                        await setSkillEnabled(skill.id, enabled);
                      }}
                      aria-label={`${skill.enabled ? "Disable" : "Enable"} ${skill.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-muted-foreground transition-[background-color,color] duration-150 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:bg-[var(--color-primary-soft)] focus-visible:text-[var(--color-primary)]"
                      onClick={() => setForm({ open: true, skill })}
                      title="Edit"
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </Button>
                    <form action={async () => { await deleteSkill(skill.id); }}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="inline-flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-[var(--color-error)] transition-[background-color,color] duration-150 hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] focus-visible:bg-[var(--color-error-soft)] focus-visible:text-[var(--color-error)]"
                        title="Delete"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
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
