"use client";

type SkillOption = { id: string; name: string; description: string | null };

type Props = {
  skills: SkillOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
};

export function SkillsSelector({ skills, selectedId, onChange }: Props) {
  if (skills.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Skill
      </p>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">No skill</option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id} title={skill.description ?? undefined}>
            {skill.name}
          </option>
        ))}
      </select>
    </div>
  );
}
