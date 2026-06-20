"use client";

type Props = {
  models: string[];
  selectedModel: string | null;
  onChange: (model: string) => void;
};

export function ModelSelector({ models, selectedModel, onChange }: Props) {
  if (models.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Model
      </p>
      <select
        value={selectedModel ?? models[0] ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </div>
  );
}
