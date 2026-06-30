"use client";

export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: "var(--color-text-secondary)",
  opacity: 0.6,
} as const;

export const CHART_GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "var(--color-border)",
  strokeOpacity: 0.6,
  vertical: false,
} as const;

export const CHART_TOOLTIP_CURSOR = {
  stroke: "var(--color-border)",
  strokeWidth: 1,
} as const;

type TooltipEntry = { key: string; color: string; name: string; value: string };

export function ChartTooltip({
  active,
  label,
  entries,
}: {
  active?: boolean;
  label?: string;
  entries: TooltipEntry[];
}) {
  if (!active || !entries.length) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_8px_24px_rgba(17,63,124,0.12)]">
      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{label}</p>
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-2 text-[12px]">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--color-text-secondary)]">{entry.name}</span>
          <span className="ml-auto font-semibold text-[var(--color-text-secondary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
