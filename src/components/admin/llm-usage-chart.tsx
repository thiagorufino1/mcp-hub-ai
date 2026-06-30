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
import {
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CURSOR,
  ChartEmptyState,
  ChartTooltip,
} from "./chart-shared";

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
  return model.split(":").at(-1) ?? model;
}

type RawEntry = { value: number; name: string; color: string };

function LlmTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: RawEntry[];
  label?: string;
}) {
  const entries = (payload ?? [])
    .filter((e) => e.value > 0)
    .map((e) => ({
      key: e.name,
      color: e.color,
      name: shortModel(e.name),
      value: fmt(e.value),
    }));
  return <ChartTooltip active={active} label={label} entries={entries} />;
}

export function LlmUsageChart({ data, models }: { data: LlmDayData[]; models: string[] }) {
  const hasData = data.some((d) => models.some((m) => (d[m] as number) > 0));

  if (!hasData) {
    return <ChartEmptyState message="Nenhum uso de LLM nos últimos 14 dias." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="date" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmt} />
        <Tooltip content={<LlmTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{shortModel(value)}</span>
          )}
          wrapperStyle={{ paddingTop: 12 }}
        />
        {models.map((model, i) => (
          <Line key={model} type="monotone" dataKey={model} name={model} stroke={MODEL_COLORS[i % MODEL_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
