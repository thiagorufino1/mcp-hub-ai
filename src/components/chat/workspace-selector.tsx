"use client";

export type WorkspaceOption = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
};

export function WorkspaceSelector({
  onChange,
  selectedId,
  workspaces,
}: {
  onChange: (id: string | null) => void;
  selectedId: string | null;
  workspaces: WorkspaceOption[];
}) {
  if (workspaces.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Workspace
      </p>
      <select
        value={selectedId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Default access policy</option>
        {workspaces.map((workspace) => (
          <option
            key={workspace.id}
            value={workspace.id}
            title={workspace.description ?? undefined}
          >
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
}
