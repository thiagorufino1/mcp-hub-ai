"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LlmDayData = Record<string, string | number>;

const MODEL_COLORS = [
  "#2563eb", "#7c3aed", "#0f766e", "#dc2626", "#f59e0b", "#0891b2", "#ec4899",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function shortModel(model: string) {
  // e.g. "anthropic:claude-sonnet-4-6" → "claude-sonnet-4-6"
  const parts = model.split(":");
  return parts.at(-1) ?? model;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const nonZero = payload.filter((e) => e.value > 0);
  if (!nonZero.length) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_8px_24px_rgba(17,63,124,0.12)]">
      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{label}</p>
      {nonZero.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-[12px]">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--color-text-secondary)]">{shortModel(entry.name)}</span>
          <span className="ml-auto font-semibold text-[var(--color-text-secondary)]">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function LlmUsageChart({ data, models }: { data: LlmDayData[]; models: string[] }) {
  const hasData = data.some((d) => models.some((m) => (d[m] as number) > 0));

  if (!hasData) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Nenhum uso de LLM nos últimos 14 dias.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-text-secondary)", opacity: 0.6 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-text-secondary)", opacity: 0.6 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmt}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{shortModel(value)}</span>
          )}
          wrapperStyle={{ paddingTop: 12 }}
        />
        {models.map((model, i) => (
          <Line
            key={model}
            type="monotone"
            dataKey={model}
            name={model}
            stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
