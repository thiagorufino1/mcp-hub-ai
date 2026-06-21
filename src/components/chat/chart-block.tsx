"use client";

import { cn } from "@/lib/utils";

type ChartType = "bar" | "line" | "area" | "pie" | "donut";

type ChartSeries = {
  name: string;
  color?: string;
  data: number[];
};

export type ChartSpec = {
  type: ChartType;
  title?: string;
  description?: string;
  labels: string[];
  series: ChartSeries[];
  yLabel?: string;
  xLabel?: string;
};

const defaultPalette = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

export function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ChartSpec>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.labels) || parsed.labels.length === 0) return null;
    if (!Array.isArray(parsed.series) || parsed.series.length === 0) return null;
    if (!["bar", "line", "area", "pie", "donut"].includes(parsed.type ?? "")) return null;

    const series = parsed.series
      .filter(
        (item): item is ChartSeries =>
          Boolean(item) &&
          typeof item.name === "string" &&
          Array.isArray(item.data) &&
          item.data.every((value) => typeof value === "number"),
      )
      .map((item, index) => ({
        ...item,
        color: item.color ?? defaultPalette[index % defaultPalette.length],
      }));

    if (series.length === 0) return null;

    return {
      type: parsed.type as ChartType,
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      labels: parsed.labels.filter((label): label is string => typeof label === "string"),
      series,
      yLabel: typeof parsed.yLabel === "string" ? parsed.yLabel : undefined,
      xLabel: typeof parsed.xLabel === "string" ? parsed.xLabel : undefined,
    };
  } catch {
    return null;
  }
}

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  const isCircular = spec.type === "pie" || spec.type === "donut";

  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          Chart
        </p>
        {spec.title ? <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3> : null}
        {spec.description ? <p className="mt-1 text-[13px] text-muted-foreground">{spec.description}</p> : null}
      </div>

      <div className="px-4 py-4">
        {isCircular ? <CircularChart spec={spec} /> : <CartesianChart spec={spec} />}
        <Legend spec={spec} />
      </div>
    </section>
  );
}

function Legend({ spec }: { spec: ChartSpec }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {spec.series.map((series) => (
        <div key={series.name} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: series.color }} />
          {series.name}
        </div>
      ))}
    </div>
  );
}

function CartesianChart({ spec }: { spec: ChartSpec }) {
  const width = 720;
  const height = 320;
  const padding = { top: 18, right: 18, bottom: 52, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = spec.series.flatMap((series) => series.data);
  const maxValue = Math.max(...allValues, 0);
  const safeMaxValue = maxValue === 0 ? 1 : maxValue * 1.1;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => (safeMaxValue / tickCount) * index);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[620px] w-full">
        {ticks.map((tick, index) => {
          const y = padding.top + chartHeight - (tick / safeMaxValue) * chartHeight;
          return (
            <g key={index}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="#94a3b8" />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="#94a3b8" />

        {spec.type === "bar" ? renderBarSeries(spec, { width, height, padding, chartWidth, chartHeight, safeMaxValue }) : null}
        {spec.type === "line" ? renderLineSeries(spec, { width, height, padding, chartWidth, chartHeight, safeMaxValue }, false) : null}
        {spec.type === "area" ? renderLineSeries(spec, { width, height, padding, chartWidth, chartHeight, safeMaxValue }, true) : null}

        {spec.labels.map((label, index) => {
          const x = padding.left + ((index + 0.5) / spec.labels.length) * chartWidth;
          return (
            <text key={label + index} x={x} y={height - 18} textAnchor="middle" fontSize="11" fill="#6b7280">
              {truncateLabel(label)}
            </text>
          );
        })}

        {spec.yLabel ? (
          <text x={16} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 16 ${padding.top + chartHeight / 2})`}>
            {spec.yLabel}
          </text>
        ) : null}
        {spec.xLabel ? (
          <text x={padding.left + chartWidth / 2} y={height - 2} textAnchor="middle" fontSize="11" fill="#6b7280">
            {spec.xLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function renderBarSeries(
  spec: ChartSpec,
  dimensions: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number }; chartWidth: number; chartHeight: number; safeMaxValue: number },
) {
  const { padding, chartWidth, chartHeight, safeMaxValue } = dimensions;
  const groupWidth = chartWidth / spec.labels.length;
  const innerGap = 8;
  const barWidth = Math.max((groupWidth - innerGap * 2) / spec.series.length, 12);

  return spec.series.map((series, seriesIndex) =>
    series.data.map((value, valueIndex) => {
      const x = padding.left + valueIndex * groupWidth + innerGap + seriesIndex * barWidth;
      const barHeight = (value / safeMaxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      return (
        <rect
          key={`${series.name}-${valueIndex}`}
          x={x}
          y={y}
          width={barWidth - 4}
          height={barHeight}
          rx="8"
          fill={series.color}
          opacity={0.9}
        />
      );
    }),
  );
}

function renderLineSeries(
  spec: ChartSpec,
  dimensions: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number }; chartWidth: number; chartHeight: number; safeMaxValue: number },
  fillArea: boolean,
) {
  const { padding, chartWidth, chartHeight, safeMaxValue } = dimensions;

  return spec.series.map((series) => {
    const points = series.data.map((value, index) => {
      const x = padding.left + (index / Math.max(spec.labels.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - (value / safeMaxValue) * chartHeight;
      return { x, y, value };
    });

    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const areaPath = `${path} L ${points.at(-1)?.x ?? padding.left} ${padding.top + chartHeight} L ${points[0]?.x ?? padding.left} ${padding.top + chartHeight} Z`;

    return (
      <g key={series.name}>
        {fillArea ? <path d={areaPath} fill={series.color} opacity="0.16" /> : null}
        <path d={path} fill="none" stroke={series.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle key={`${series.name}-${index}`} cx={point.x} cy={point.y} r="4.5" fill="white" stroke={series.color} strokeWidth="2.5" />
        ))}
      </g>
    );
  });
}

function CircularChart({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0]?.data ?? [];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const size = 260;
  const center = size / 2;
  const radius = 88;
  const innerRadius = spec.type === "donut" ? 52 : 0;
  const segments = values.map((value) => value / total).reduce<Array<{ startAngle: number; endAngle: number; value: number; index: number }>>((acc, ratio, index) => {
    const startAngle = index === 0 ? -Math.PI / 2 : acc[index - 1].endAngle;
    const endAngle = startAngle + ratio * Math.PI * 2;
    acc.push({ startAngle, endAngle, value: values[index] ?? 0, index });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[260px] w-[260px] shrink-0">
        {segments.map((segment) => {
          const path = describeArc(center, center, radius, innerRadius, segment.startAngle, segment.endAngle);
          const label = spec.labels[segment.index];
          const fill = spec.series[segment.index]?.color ?? defaultPalette[segment.index % defaultPalette.length];
          return <path key={`${label}-${segment.index}`} d={path} fill={fill} opacity="0.92" />;
        })}
        {spec.type === "donut" ? (
          <circle cx={center} cy={center} r={innerRadius - 2} fill="white" />
        ) : null}
        <text x={center} y={center - 2} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">
          {formatTick(total)}
        </text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize="11" fill="#64748b">
          Total
        </text>
      </svg>

      <div className="w-full space-y-2">
        {spec.labels.map((label, index) => {
          const value = values[index] ?? 0;
          const color = spec.series[index]?.color ?? defaultPalette[index % defaultPalette.length];
          const percentage = `${Math.round((value / total) * 100)}%`;

          return (
            <div key={label + index} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-[12px] font-medium text-foreground">{label}</span>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div className="font-semibold text-foreground">{formatTick(value)}</div>
                <div>{percentage}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angle: number) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function describeArc(centerX: number, centerY: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(centerX, centerY, radius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${centerX} ${centerY}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      "Z",
    ].join(" ");
  }

  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function formatTick(value: number) {
  if (Math.abs(value) >= 1000) {
    return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function truncateLabel(label: string) {
  return label.length > 10 ? `${label.slice(0, 9)}…` : label;
}
