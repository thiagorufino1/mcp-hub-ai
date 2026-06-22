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

export type ExecDayData = {
  date: string;
  success: number;
  error: number;
  total: number;
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_8px_24px_rgba(17,63,124,0.12)]">
      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-[12px]">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--color-text-secondary)] capitalize">{entry.name}</span>
          <span className="ml-auto font-semibold text-[var(--color-text-secondary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ExecutionChart({ data }: { data: ExecDayData[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const yMax = Math.ceil(max * 1.2);

  if (data.every((d) => d.total === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No executions in the last 14 days.</p>
      </div>
    );
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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-text-secondary)", opacity: 0.6 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, yMax]}
          tick={{ fontSize: 10, fill: "var(--color-text-secondary)", opacity: 0.6 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="success"
          name="success"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#gradSuccess)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="error"
          name="error"
          stroke="var(--color-error)"
          strokeWidth={2}
          fill="url(#gradError)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-error)", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
