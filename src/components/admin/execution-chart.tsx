"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

export type ExecDayData = {
  date: string;
  success: number;
  error: number;
  total: number;
};

type RawEntry = { value: number; name: string; color: string };

function ExecTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: RawEntry[];
  label?: string;
}) {
  const entries = (payload ?? []).map((e) => ({
    key: e.name,
    color: e.color,
    name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
    value: String(e.value),
  }));
  return <ChartTooltip active={active} label={label} entries={entries} />;
}

export function ExecutionChart({ data }: { data: ExecDayData[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const yMax = Math.ceil(max * 1.2);

  if (data.every((d) => d.total === 0)) {
    return <ChartEmptyState message="No executions in the last 14 days." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-error)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-error)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="date" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, yMax]} tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ExecTooltip />} cursor={CHART_TOOLTIP_CURSOR} />
        <Area type="monotone" dataKey="success" name="success" stroke="var(--color-primary)" strokeWidth={2} fill="url(#gradSuccess)" dot={false} activeDot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }} />
        <Area type="monotone" dataKey="error" name="error" stroke="var(--color-error)" strokeWidth={2} fill="url(#gradError)" dot={false} activeDot={{ r: 4, fill: "var(--color-error)", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
