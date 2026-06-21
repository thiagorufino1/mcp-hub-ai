"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillForm } from "@/components/admin/skill-form";
import { deleteSkill } from "./actions";
import type { SkillRow } from "./actions";

type Props = { skills: SkillRow[] };

export function SkillsAdminClient({ skills }: Props) {
  const [form, setForm] = useState<{ open: boolean; skill?: SkillRow }>({ open: false });

  return (
    <div className="portal-page">
      <div className="portal-page-heading flex-row items-center justify-between">
        <div><h1 className="text-2xl font-bold">Skills</h1><p className="text-sm text-muted-foreground">Reusable instructions available to agents and groups.</p></div>
        <Button onClick={() => setForm({ open: true })}>+ Add Skill</Button>
      </div>

      <div className="portal-table-shell">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {skills.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No skills yet.</td>
              </tr>
            )}
            {skills.map((skill) => (
              <tr key={skill.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{skill.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{skill.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={skill.enabled ? "default" : "secondary"}>
                    {skill.enabled ? "enabled" : "disabled"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, skill })}>Edit</Button>
                  <form action={async () => { await deleteSkill(skill.id); }} style={{ display: "inline" }}>
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SkillForm open={form.open} skill={form.skill} onClose={() => setForm({ open: false })} />
    </div>
  );
}
