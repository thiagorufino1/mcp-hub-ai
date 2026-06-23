"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartType =
  | "bar" | "line" | "area" | "pie" | "donut"
  | "kpi" | "table" | "funnel" | "gauge"
  | "heatmap" | "radar" | "timeline" | "scatter" | "status" | "step" | "waterfall" | "range"
  | "histogram" | "boxplot" | "treemap" | "bullet";

type ChartSeries = { name: string; color?: string; data: number[] };

export type KpiItem = {
  icon?: string;
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  sparkline?: number[];
};

export type TimelineEvent = {
  label: string;
  start: string | number;
  end: string | number;
  status?: "critical" | "warning" | "minor" | "info" | "ok";
  detail?: string;
};

export type ScatterPoint = { x: number; y: number; label?: string };
export type ScatterGroup = { name: string; color?: string; points: ScatterPoint[] };

export type StatusItem = {
  label: string;
  status: "ok" | "warning" | "critical" | "unknown" | "maintenance";
  detail?: string;
  group?: string;
};

export type ChartSpec = {
  type: ChartType;
  title?: string;
  description?: string;
  labels: string[];
  series: ChartSeries[];
  yLabel?: string;
  xLabel?: string;
  items?: KpiItem[];
  columns?: string[];
  rows?: string[][];
  orientation?: "vertical" | "horizontal";
  stacked?: boolean;
  min?: number;
  max?: number;
  target?: number;
  events?: TimelineEvent[];
  scatterSeries?: ScatterGroup[];
  statusItems?: StatusItem[];
  boxData?: number[][];
};

const defaultPalette = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const ALL_TYPES: ChartType[] = [
  "bar", "line", "area", "pie", "donut",
  "kpi", "table", "funnel", "gauge",
  "heatmap", "radar", "timeline", "scatter", "status", "step", "waterfall", "range",
  "histogram", "boxplot", "treemap", "bullet",
];

export function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ChartSpec>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!ALL_TYPES.includes(parsed.type as ChartType)) return null;

    const base = {
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
    };

    if (parsed.type === "kpi") {
      if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
      const items = parsed.items.filter(
        (it): it is KpiItem => Boolean(it) && typeof it.label === "string" && typeof it.value === "string",
      );
      if (items.length === 0) return null;
      return { ...base, type: "kpi", labels: [], series: [], items };
    }

    if (parsed.type === "table") {
      if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.rows)) return null;
      return {
        ...base,
        type: "table",
        labels: [],
        series: [],
        columns: parsed.columns.filter((c): c is string => typeof c === "string"),
        rows: (parsed.rows as unknown[]).filter(Array.isArray) as string[][],
      };
    }

    if (parsed.type === "timeline") {
      if (!Array.isArray(parsed.events) || parsed.events.length === 0) return null;
      const events = parsed.events.filter(
        (e): e is TimelineEvent =>
          Boolean(e) && typeof e.label === "string" && e.start !== undefined && e.end !== undefined,
      );
      if (events.length === 0) return null;
      return { ...base, type: "timeline", labels: [], series: [], events };
    }

    if (parsed.type === "scatter") {
      if (!Array.isArray(parsed.scatterSeries) || parsed.scatterSeries.length === 0) return null;
      const scatterSeries = parsed.scatterSeries
        .filter((g): g is ScatterGroup => Boolean(g) && typeof g.name === "string" && Array.isArray(g.points))
        .map((g, i) => ({ ...g, color: g.color ?? defaultPalette[i % defaultPalette.length] }));
      if (scatterSeries.length === 0) return null;
      return {
        ...base,
        type: "scatter",
        labels: [],
        series: [],
        scatterSeries,
        xLabel: typeof parsed.xLabel === "string" ? parsed.xLabel : undefined,
        yLabel: typeof parsed.yLabel === "string" ? parsed.yLabel : undefined,
      };
    }

    if (parsed.type === "status") {
      if (!Array.isArray(parsed.statusItems) || parsed.statusItems.length === 0) return null;
      const statusItems = parsed.statusItems.filter(
        (it): it is StatusItem => Boolean(it) && typeof it.label === "string" && typeof it.status === "string",
      );
      if (statusItems.length === 0) return null;
      return { ...base, type: "status", labels: [], series: [], statusItems };
    }

    if (!Array.isArray(parsed.labels) || parsed.labels.length === 0) return null;
    if (!Array.isArray(parsed.series) || parsed.series.length === 0) return null;

    const series = parsed.series
      .filter(
        (s): s is ChartSeries =>
          Boolean(s) &&
          typeof s.name === "string" &&
          Array.isArray(s.data) &&
          s.data.every((v) => typeof v === "number"),
      )
      .map((s, i) => ({ ...s, color: s.color ?? defaultPalette[i % defaultPalette.length] }));
    if (series.length === 0) return null;

    return {
      ...base,
      type: parsed.type as ChartType,
      labels: parsed.labels.filter((l): l is string => typeof l === "string"),
      series,
      yLabel: typeof parsed.yLabel === "string" ? parsed.yLabel : undefined,
      xLabel: typeof parsed.xLabel === "string" ? parsed.xLabel : undefined,
      orientation: parsed.orientation === "horizontal" ? "horizontal" : "vertical",
      stacked: parsed.stacked === true,
      min: typeof parsed.min === "number" ? parsed.min : undefined,
      max: typeof parsed.max === "number" ? parsed.max : undefined,
      target: typeof parsed.target === "number" ? parsed.target : undefined,
      boxData: Array.isArray(parsed.boxData) ? (parsed.boxData as unknown[]).filter(Array.isArray) as number[][] : undefined,
    };
  } catch {
    return null;
  }
}

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  if (spec.type === "kpi") return <KpiBlock spec={spec} />;
  if (spec.type === "table") return <TableBlock spec={spec} />;
  if (spec.type === "status") return <StatusGrid spec={spec} />;
  if (spec.type === "timeline") return <ChartWrapper spec={spec}><TimelineChart spec={spec} /></ChartWrapper>;
  if (spec.type === "scatter") return <ChartWrapper spec={spec}><ScatterChart spec={spec} /></ChartWrapper>;
  if (spec.type === "gauge") return <ChartWrapper spec={spec}><GaugeChart spec={spec} /></ChartWrapper>;
  if (spec.type === "funnel") return <ChartWrapper spec={spec}><FunnelChart spec={spec} /><Legend spec={spec} /></ChartWrapper>;
  if (spec.type === "heatmap") return <ChartWrapper spec={spec}><HeatmapChart spec={spec} /></ChartWrapper>;
  if (spec.type === "radar") return <ChartWrapper spec={spec}><RadarChart spec={spec} /><Legend spec={spec} /></ChartWrapper>;
  if (spec.type === "waterfall") return <ChartWrapper spec={spec}><WaterfallChart spec={spec} /></ChartWrapper>;
  if (spec.type === "range") return <ChartWrapper spec={spec}><RangeChart spec={spec} /><Legend spec={spec} /></ChartWrapper>;
  if (spec.type === "histogram") return <ChartWrapper spec={spec}><HistogramChart spec={spec} /><Legend spec={spec} /></ChartWrapper>;
  if (spec.type === "boxplot") return <ChartWrapper spec={spec}><BoxplotChart spec={spec} /></ChartWrapper>;
  if (spec.type === "treemap") return <ChartWrapper spec={spec}><TreemapChart spec={spec} /></ChartWrapper>;
  if (spec.type === "bullet") return <ChartWrapper spec={spec}><BulletChart spec={spec} /></ChartWrapper>;

  const isCircular = spec.type === "pie" || spec.type === "donut";
  const isHorizontal = spec.orientation === "horizontal" && spec.type === "bar";

  return (
    <ChartWrapper spec={spec}>
      {isCircular ? (
        <CircularChart spec={spec} />
      ) : isHorizontal ? (
        <>
          <HorizontalBarChart spec={spec} />
          <Legend spec={spec} />
        </>
      ) : (
        <>
          <CartesianChart spec={spec} />
          <Legend spec={spec} />
        </>
      )}
    </ChartWrapper>
  );
}

// ─── SHARED WRAPPER ──────────────────────────────────────────────────────────

function ChartWrapper({ spec, children }: { spec: ChartSpec; children: ReactNode }) {
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          {spec.type.toUpperCase()}
        </p>
        {spec.title ? <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3> : null}
        {spec.description ? <p className="mt-1 text-[13px] text-muted-foreground">{spec.description}</p> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

function KpiBlock({ spec }: { spec: ChartSpec }) {
  const items = spec.items ?? [];
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
              {spec.description}
            </p>
          ) : null}
          {spec.title ? <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3> : null}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {items.map((item, i) => <KpiCard key={`${item.label}-${i}`} item={item} />)}
      </div>
    </section>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  const trendColor = item.trend === "up" ? "text-emerald-500" : item.trend === "down" ? "text-red-500" : "text-muted-foreground";
  const trendArrow = item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→";
  const sparkColor = item.trend === "up" ? "#10b981" : item.trend === "down" ? "#ef4444" : "#6b7280";
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4">
      {item.icon ? <span className="text-[18px] leading-none">{item.icon}</span> : null}
      <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
      <p className="text-[22px] font-bold leading-tight tracking-tight text-foreground">{item.value}</p>
      {item.sparkline && item.sparkline.length >= 2 ? <Sparkline data={item.sparkline} color={sparkColor} /> : null}
      {item.change ? (
        <div className={cn("flex flex-wrap items-center gap-1 text-[11px] font-semibold", trendColor)}>
          <span>{trendArrow} {item.change}</span>
          {item.changeLabel ? <span className="font-normal text-muted-foreground">{item.changeLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80; const h = 26;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 4) - 2 }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${pts.at(-1)!.x} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="mt-0.5">
      <path d={area} fill={color} opacity="0.15" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── TABLE ───────────────────────────────────────────────────────────────────

function TableBlock({ spec }: { spec: ChartSpec }) {
  const columns = spec.columns ?? []; const rows = spec.rows ?? [];
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p> : null}
          {spec.title ? <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3> : null}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50">
              {columns.map((col, i) => <th key={i} className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={cn("border-b border-[var(--color-border)]/40 transition-colors hover:bg-[var(--color-surface-muted)]/40", ri % 2 === 1 && "bg-[var(--color-surface-muted)]/20")}>
                {row.map((cell, ci) => <td key={ci} className="px-4 py-2.5 text-foreground whitespace-nowrap">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── STATUS GRID ─────────────────────────────────────────────────────────────

const statusConfig = {
  ok:          { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "OK" },
  warning:     { color: "#f59e0b", bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Alerta" },
  critical:    { color: "#ef4444", bg: "bg-red-500/10",     border: "border-red-500/30",     label: "Crítico" },
  unknown:     { color: "#94a3b8", bg: "bg-slate-500/10",   border: "border-slate-500/30",   label: "Desconhecido" },
  maintenance: { color: "#3b82f6", bg: "bg-blue-500/10",    border: "border-blue-500/30",    label: "Manutenção" },
} as const;

function StatusGrid({ spec }: { spec: ChartSpec }) {
  const items = spec.statusItems ?? [];
  const groups = items.reduce<Record<string, StatusItem[]>>((acc, it) => {
    const g = it.group ?? "";
    (acc[g] ??= []).push(it);
    return acc;
  }, {});

  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p> : null}
          {spec.title ? <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3> : null}
        </div>
      )}
      <div className="p-4 space-y-4">
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group}>
            {group && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {groupItems.map((item, i) => {
                const cfg = statusConfig[item.status] ?? statusConfig.unknown;
                return (
                  <div key={i} className={cn("flex flex-col gap-1 rounded-xl border p-3", cfg.bg, cfg.border)}>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="text-[11px] font-semibold text-foreground truncate">{item.label}</span>
                    </div>
                    {item.detail ? <p className="text-[10px] text-muted-foreground leading-snug">{item.detail}</p> : null}
                    <p className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────

function parseTime(t: string | number): number {
  if (typeof t === "number") return t;
  const parts = t.split(":");
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const timelineColors: Record<string, string> = {
  critical: "#ef4444", warning: "#f59e0b", minor: "#fb923c", info: "#3b82f6", ok: "#10b981",
};

function TimelineChart({ spec }: { spec: ChartSpec }) {
  const events = spec.events ?? [];
  const starts = events.map((e) => parseTime(e.start));
  const ends = events.map((e) => parseTime(e.end));
  const timeMin = Math.min(...starts) - 10;
  const timeMax = Math.max(...ends) + 10;
  const timeRange = timeMax - timeMin || 1;

  const rowH = 36; const labelW = 180; const padR = 16; const padT = 8; const padB = 30;
  const w = 680; const chartW = w - labelW - padR;
  const h = padT + events.length * rowH + padB;

  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => timeMin + (timeRange / tickCount) * i);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[480px] w-full">
        {ticks.map((t, i) => {
          const x = labelW + ((t - timeMin) / timeRange) * chartW;
          return (
            <g key={i}>
              <line x1={x} y1={padT} x2={x} y2={padT + events.length * rowH} stroke="#d6deea" strokeDasharray="3 3" />
              <text x={x} y={h - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{fmtTime(Math.round(t))}</text>
            </g>
          );
        })}

        {events.map((ev, i) => {
          const startMin = starts[i] ?? 0;
          const endMin = ends[i] ?? startMin + 30;
          const x1 = labelW + ((startMin - timeMin) / timeRange) * chartW;
          const x2 = labelW + ((endMin - timeMin) / timeRange) * chartW;
          const y = padT + i * rowH + rowH * 0.2;
          const bh = rowH * 0.6;
          const color = timelineColors[ev.status ?? "info"] ?? timelineColors.info;
          const dur = endMin - startMin;

          return (
            <g key={i}>
              <text x={labelW - 8} y={y + bh / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {truncateLabel(ev.label, 22)}
              </text>
              <rect x={x1} y={y} width={Math.max(x2 - x1, 4)} height={bh} rx="6" fill={color} opacity="0.85" />
              {x2 - x1 > 40 && (
                <text x={(x1 + x2) / 2} y={y + bh / 2 + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                  {dur < 60 ? `${dur}min` : `${(dur / 60).toFixed(1)}h`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SCATTER ─────────────────────────────────────────────────────────────────

function ScatterChart({ spec }: { spec: ChartSpec }) {
  const groups = spec.scatterSeries ?? [];
  const allX = groups.flatMap((g) => g.points.map((p) => p.x));
  const allY = groups.flatMap((g) => g.points.map((p) => p.y));
  const xMin = Math.min(...allX); const xMax = Math.max(...allX);
  const yMin = Math.min(...allY); const yMax = Math.max(...allY);
  const xRange = xMax - xMin || 1; const yRange = yMax - yMin || 1;

  const w = 640; const h = 320;
  const pad = { t: 18, r: 18, b: 48, l: 52 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const tickCount = 4;
  const xTicks = Array.from({ length: tickCount + 1 }, (_, i) => xMin + (xRange / tickCount) * i);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (yRange / tickCount) * i);

  const px = (x: number) => pad.l + ((x - xMin) / xRange) * cw;
  const py = (y: number) => pad.t + ch - ((y - yMin) / yRange) * ch;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[500px] w-full">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={py(t)} x2={pad.l + cw} y2={py(t)} stroke="#d6deea" strokeDasharray="4 4" />
            <text x={pad.l - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={px(t)} y1={pad.t} x2={px(t)} y2={pad.t + ch} stroke="#d6deea" strokeDasharray="4 4" />
            <text x={px(t)} y={h - 14} textAnchor="middle" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
          </g>
        ))}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {groups.map((g) =>
          g.points.map((p, i) => (
            <circle key={`${g.name}-${i}`} cx={px(p.x)} cy={py(p.y)} r="5" fill={g.color ?? defaultPalette[0]} opacity="0.8" stroke="white" strokeWidth="1.5" />
          )),
        )}

        {spec.xLabel ? <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fontSize="11" fill="#6b7280">{spec.xLabel}</text> : null}
        {spec.yLabel ? <text x={14} y={pad.t + ch / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 14 ${pad.t + ch / 2})`}>{spec.yLabel}</text> : null}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <div key={g.name} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
            {g.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────

function HeatmapChart({ spec }: { spec: ChartSpec }) {
  const allValues = spec.series.flatMap((s) => s.data);
  const minVal = Math.min(...allValues); const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const labelW = 56; const padB = 60; const padT = 8; const padR = 12;
  const w = 680; const h = 320;
  const cw = w - labelW - padR; const ch = h - padT - padB;
  const cellW = cw / spec.labels.length; const cellH = ch / spec.series.length;

  const getColor = (v: number) => {
    const t = (v - minVal) / range;
    return `rgba(37,99,235,${(0.07 + t * 0.88).toFixed(2)})`;
  };
  const getTextColor = (v: number) => ((v - minVal) / range) > 0.55 ? "white" : "#1e3a8a";

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[480px] w-full">
        {spec.series.map((row, ri) => (
          <text key={row.name} x={labelW - 6} y={padT + ri * cellH + cellH / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">
            {truncateLabel(row.name, 8)}
          </text>
        ))}
        {spec.labels.map((label, li) => {
          const x = labelW + li * cellW + cellW / 2;
          return (
            <text key={label + li} x={x} y={padT + ch + 16} textAnchor="middle" fontSize="10" fill="#6b7280" transform={`rotate(-40 ${x} ${padT + ch + 16})`}>
              {truncateLabel(label, 6)}
            </text>
          );
        })}
        {spec.series.map((row, ri) =>
          row.data.map((val, li) => {
            const x = labelW + li * cellW; const y = padT + ri * cellH;
            const color = getColor(val); const textColor = getTextColor(val);
            return (
              <g key={`${ri}-${li}`}>
                <rect x={x + 1} y={y + 1} width={cellW - 2} height={cellH - 2} rx="4" fill={color} />
                {cellW > 30 && cellH > 18 && (
                  <text x={x + cellW / 2} y={y + cellH / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={textColor}>
                    {formatTick(val)}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}

// ─── RADAR ───────────────────────────────────────────────────────────────────

function RadarChart({ spec }: { spec: ChartSpec }) {
  const n = spec.labels.length;
  const cx = 200; const cy = 200; const maxR = 140; const levels = 4;
  const allValues = spec.series.flatMap((s) => s.data);
  const maxVal = spec.max ?? Math.max(...allValues, 1);

  const axisAngle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (r: number, i: number) => ({
    x: cx + r * Math.cos(axisAngle(i)),
    y: cy + r * Math.sin(axisAngle(i)),
  });

  const polyPts = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 400 400" className="w-full max-w-[380px]">
        {Array.from({ length: levels }, (_, l) => {
          const r = ((l + 1) / levels) * maxR;
          const pts = Array.from({ length: n }, (__, i) => pt(r, i));
          return <polygon key={l} points={polyPts(pts)} fill="none" stroke="#d6deea" strokeWidth="1" />;
        })}
        {Array.from({ length: n }, (_, i) => {
          const outer = pt(maxR, i);
          const labelPt = pt(maxR + 22, i);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#d6deea" strokeWidth="1" />
              <text x={labelPt.x} y={labelPt.y + 4} textAnchor="middle" fontSize="11" fill="#6b7280">
                {truncateLabel(spec.labels[i] ?? "", 12)}
              </text>
            </g>
          );
        })}
        {spec.series.map((series, si) => {
          const pts = spec.labels.map((_, i) => {
            const v = series.data[i] ?? 0;
            const r = Math.min(Math.max((v / maxVal), 0), 1) * maxR;
            return pt(r, i);
          });
          return (
            <g key={series.name}>
              <polygon points={polyPts(pts)} fill={series.color ?? defaultPalette[si]} fillOpacity="0.15" stroke={series.color ?? defaultPalette[si]} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={series.color ?? defaultPalette[si]} />)}
            </g>
          );
        })}
        {Array.from({ length: levels }, (_, l) => {
          const r = ((l + 1) / levels) * maxR;
          const v = ((l + 1) / levels) * maxVal;
          return <text key={l} x={cx + 4} y={cy - r + 4} fontSize="9" fill="#94a3b8">{formatTick(v)}</text>;
        })}
      </svg>
    </div>
  );
}

// ─── WATERFALL ───────────────────────────────────────────────────────────────

function WaterfallChart({ spec }: { spec: ChartSpec }) {
  const w = 680; const h = 320;
  const pad = { t: 18, r: 18, b: 52, l: 58 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;

  const data = spec.series[0]?.data ?? [];
  const n = data.length;

  // Compute bar positions: first and last are totals, middle are deltas
  type WBar = { base: number; top: number; value: number; type: "base" | "delta" | "total" };
  const bars: WBar[] = [];
  let running = 0;
  data.forEach((v, i) => {
    if (i === 0) {
      bars.push({ base: 0, top: v, value: v, type: "base" });
      running = v;
    } else if (i === n - 1) {
      bars.push({ base: 0, top: running, value: running, type: "total" });
    } else {
      const newRunning = running + v;
      bars.push({ base: Math.min(running, newRunning), top: Math.max(running, newRunning), value: v, type: "delta" });
      running = newRunning;
    }
  });

  const allPositions = bars.flatMap((b) => [b.base, b.top]);
  const minY = Math.min(...allPositions, 0);
  const maxY = Math.max(...allPositions) * 1.1;
  const yRange = maxY - minY || 1;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minY + (yRange / tickCount) * i);
  const toY = (v: number) => pad.t + ch - ((v - minY) / yRange) * ch;
  const groupW = cw / n;
  const barW = Math.max(groupW - 12, 16);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[480px] w-full">
        {ticks.map((t, i) => {
          const y = toY(t);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {bars.map((bar, i) => {
          const x = pad.l + i * groupW + (groupW - barW) / 2;
          const y1 = toY(bar.top); const y2 = toY(bar.base);
          const bh = Math.max(y2 - y1, 2);
          const color = bar.type === "base" || bar.type === "total" ? "#2563eb" : bar.value >= 0 ? "#10b981" : "#ef4444";

          // Connector line to next bar
          let connector = null;
          if (i < bars.length - 1) {
            const nextX = pad.l + (i + 1) * groupW + (groupW - barW) / 2;
            const connY = bar.type === "base" || bar.value >= 0 ? toY(bar.top) : toY(bar.base);
            connector = <line x1={x + barW} y1={connY} x2={nextX} y2={connY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />;
          }

          return (
            <g key={i}>
              <rect x={x} y={y1} width={barW} height={bh} rx="6" fill={color} opacity="0.88" />
              {connector}
              <text x={x + barW / 2} y={h - 18} textAnchor="middle" fontSize="11" fill="#6b7280">
                {truncateLabel(spec.labels[i] ?? "", 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── RANGE ───────────────────────────────────────────────────────────────────

function RangeChart({ spec }: { spec: ChartSpec }) {
  const w = 720; const h = 320;
  const pad = { t: 18, r: 18, b: 52, l: 50 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;

  // Convention: series[0]=max, series[1]=avg or middle, series[2]=min
  // If 2 series: series[0]=max, series[1]=min
  const maxSeries = spec.series[0];
  const avgSeries = spec.series.length >= 3 ? spec.series[1] : undefined;
  const minSeries = spec.series.length >= 3 ? spec.series[2] : spec.series[1];

  const allVals = spec.series.flatMap((s) => s.data);
  const maxVal = Math.max(...allVals, 0) * 1.1 || 1;
  const minVal = Math.min(...allVals, 0);
  const yRange = maxVal - minVal || 1;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minVal + (yRange / tickCount) * i);

  const px = (i: number) => pad.l + (i / Math.max(spec.labels.length - 1, 1)) * cw;
  const py = (v: number) => pad.t + ch - ((v - minVal) / yRange) * ch;

  const linePath = (series: ChartSeries) =>
    series.data.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");

  // Range area between min and max
  const rangeArea = maxSeries && minSeries
    ? [
        ...maxSeries.data.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`),
        ...[...minSeries.data].reverse().map((v, i) => `L ${px(minSeries.data.length - 1 - i)} ${py(v)}`),
        "Z",
      ].join(" ")
    : null;

  const rangeColor = maxSeries?.color ?? defaultPalette[0];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[580px] w-full">
        {ticks.map((t, i) => {
          const y = py(t);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {rangeArea && <path d={rangeArea} fill={rangeColor} opacity="0.12" />}
        {maxSeries && <path d={linePath(maxSeries)} fill="none" stroke={maxSeries.color ?? defaultPalette[0]} strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />}
        {avgSeries && <path d={linePath(avgSeries)} fill="none" stroke={avgSeries.color ?? defaultPalette[1]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {minSeries && !avgSeries && <path d={linePath(minSeries)} fill="none" stroke={minSeries.color ?? defaultPalette[1]} strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />}
        {minSeries && avgSeries && <path d={linePath(minSeries)} fill="none" stroke={minSeries.color ?? defaultPalette[2]} strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />}

        {spec.labels.map((label, i) => (
          <text key={label + i} x={px(i)} y={h - 18} textAnchor="middle" fontSize="11" fill="#6b7280">
            {truncateLabel(label, 10)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── FUNNEL ──────────────────────────────────────────────────────────────────

function FunnelChart({ spec }: { spec: ChartSpec }) {
  const data = spec.series[0]?.data ?? [];
  const maxValue = Math.max(...data, 1);
  const w = 520; const stageH = 52; const gap = 6;
  const totalH = spec.labels.length * (stageH + gap) + 10;
  const maxBarW = w * 0.88; const cx = w / 2;
  const stageWidths = data.map((v) => Math.max((v / maxValue) * maxBarW, 40));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${totalH}`} className="h-auto min-w-[320px] w-full">
        {spec.labels.map((label, i) => {
          const value = data[i] ?? 0;
          const thisW = stageWidths[i] ?? maxBarW;
          const nextW = stageWidths[i + 1] ?? thisW;
          const y = i * (stageH + gap) + 5;
          const color = defaultPalette[i % defaultPalette.length];
          const isLast = i === spec.labels.length - 1;
          const tl = cx - thisW / 2; const tr = cx + thisW / 2;
          const bl = cx - nextW / 2; const br = cx + nextW / 2;
          const pts = isLast ? `${tl},${y} ${tr},${y} ${tr},${y + stageH} ${tl},${y + stageH}` : `${tl},${y} ${tr},${y} ${br},${y + stageH} ${bl},${y + stageH}`;
          const convPct = i > 0 && (data[0] ?? 0) > 0 ? Math.round((value / (data[0] ?? 1)) * 100) : null;

          return (
            <g key={label + i}>
              <polygon points={pts} fill={color} opacity={0.88} />
              <text x={tl + 12} y={y + stageH / 2 + 5} fontSize="12" fontWeight="600" fill="white">{label}</text>
              <text x={tr - 10} y={y + stageH / 2 + 5} textAnchor="end" fontSize="12" fontWeight="600" fill="white">
                {formatTick(value)}{convPct !== null ? ` (${convPct}%)` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── GAUGE ───────────────────────────────────────────────────────────────────

function GaugeChart({ spec }: { spec: ChartSpec }) {
  const value = spec.series[0]?.data[0] ?? 0;
  const min = spec.min ?? 0; const max = spec.max ?? 100;
  const color = spec.series[0]?.color ?? defaultPalette[0];
  const p = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const cx = 150; const cy = 130; const r = 100; const strokeW = 18;

  const arcPt = (pct: number) => {
    const rad = ((180 + pct * 180) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const left = arcPt(0); const right = arcPt(1); const vpt = arcPt(p);
  const largeArc = p > 0.5 ? 1 : 0;
  const bgPath = `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`;
  const valPath = p <= 0 ? null : p >= 1 ? bgPath : `M ${left.x} ${left.y} A ${r} ${r} 0 ${largeArc} 1 ${vpt.x} ${vpt.y}`;

  const tickEl = (pct: number, tc: string) => {
    const innerR = r - strokeW - 5; const outerR = r + 7;
    const rad = ((180 + pct * 180) * Math.PI) / 180;
    return <line x1={cx + innerR * Math.cos(rad)} y1={cy + innerR * Math.sin(rad)} x2={cx + outerR * Math.cos(rad)} y2={cy + outerR * Math.sin(rad)} stroke={tc} strokeWidth="3" strokeLinecap="round" />;
  };
  const targetPct = spec.target !== undefined ? Math.min(Math.max((spec.target - min) / (max - min), 0), 1) : undefined;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 170" className="w-full max-w-[300px]">
        <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} strokeLinecap="round" />
        {valPath && <path d={valPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />}
        {targetPct !== undefined && tickEl(targetPct, "#f59e0b")}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="34" fontWeight="700" fill="#0f172a">{formatTick(value)}</text>
        {spec.labels[0] && <text x={cx} y={cy + 18} textAnchor="middle" fontSize="13" fill="#64748b">{spec.labels[0]}</text>}
        <text x={left.x} y={left.y + 22} textAnchor="middle" fontSize="11" fill="#94a3b8">{formatTick(min)}</text>
        <text x={right.x} y={right.y + 22} textAnchor="middle" fontSize="11" fill="#94a3b8">{formatTick(max)}</text>
        {spec.target !== undefined && <text x={cx} y={cy + 40} textAnchor="middle" fontSize="11" fill="#f59e0b">Meta: {formatTick(spec.target)}</text>}
      </svg>
    </div>
  );
}

// ─── HORIZONTAL BAR ──────────────────────────────────────────────────────────

function HorizontalBarChart({ spec }: { spec: ChartSpec }) {
  const rowH = 32; const groupGap = 10; const padL = 110; const padR = 24; const padT = 10; const padB = 30;
  const w = 640;
  const groupH = rowH * spec.series.length + groupGap;
  const h = padT + spec.labels.length * groupH + padB;
  const cw = w - padL - padR; const ch = h - padT - padB;
  const allVals = spec.series.flatMap((s) => s.data);
  const safeMax = Math.max(...allVals, 0) * 1.1 || 1;
  const ticks = Array.from({ length: 5 }, (_, i) => (safeMax / 4) * i);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[400px] w-full">
        {ticks.map((t, i) => {
          const x = padL + (t / safeMax) * cw;
          return (
            <g key={i}>
              <line x1={x} y1={padT} x2={x} y2={padT + ch} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={x} y={padT + ch + 16} textAnchor="middle" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        {spec.labels.map((label, li) => {
          const gy = padT + li * groupH;
          return (
            <g key={label + li}>
              <text x={padL - 8} y={gy + rowH * spec.series.length / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {truncateLabel(label, 15)}
              </text>
              {spec.series.map((series, si) => {
                const value = series.data[li] ?? 0;
                const barW = Math.max((value / safeMax) * cw, 0);
                return <rect key={`${series.name}-${li}`} x={padL} y={gy + si * rowH + 4} width={barW} height={rowH - 8} rx="6" fill={series.color} opacity={0.9} />;
              })}
            </g>
          );
        })}
        <line x1={padL} y1={padT} x2={padL} y2={padT + ch} stroke="#94a3b8" />
      </svg>
    </div>
  );
}

// ─── CARTESIAN (bar vertical / line / area / step) ────────────────────────────

function CartesianChart({ spec }: { spec: ChartSpec }) {
  const w = 720; const h = 320;
  const pad = { t: 18, r: 18, b: 52, l: 50 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;

  let maxValue: number;
  if (spec.stacked && spec.type === "bar") {
    const totals = spec.labels.map((_, i) => spec.series.reduce((s, ser) => s + (ser.data[i] ?? 0), 0));
    maxValue = Math.max(...totals, 0);
  } else {
    maxValue = Math.max(...spec.series.flatMap((s) => s.data), 0);
  }
  const safeMax = maxValue === 0 ? 1 : maxValue * 1.1;
  const ticks = Array.from({ length: 5 }, (_, i) => (safeMax / 4) * i);
  const dims = { w, h, pad, cw, ch, safeMax };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[580px] w-full">
        {ticks.map((t, i) => {
          const y = pad.t + ch - (t / safeMax) * ch;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {spec.type === "bar" && spec.stacked ? renderStackedBar(spec, dims) : spec.type === "bar" ? renderBar(spec, dims) : null}
        {(spec.type === "line" || spec.type === "step") ? renderLine(spec, dims, false) : null}
        {spec.type === "area" ? renderLine(spec, dims, true) : null}

        {spec.labels.map((label, i) => (
          <text key={label + i} x={pad.l + ((i + 0.5) / spec.labels.length) * cw} y={h - 18} textAnchor="middle" fontSize="11" fill="#6b7280">
            {truncateLabel(label, 10)}
          </text>
        ))}
        {spec.yLabel && <text x={14} y={pad.t + ch / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 14 ${pad.t + ch / 2})`}>{spec.yLabel}</text>}
        {spec.xLabel && <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fontSize="11" fill="#6b7280">{spec.xLabel}</text>}
      </svg>
    </div>
  );
}

type Dims = { w: number; h: number; pad: { t: number; r: number; b: number; l: number }; cw: number; ch: number; safeMax: number };

function renderBar(spec: ChartSpec, { pad, cw, ch, safeMax }: Dims) {
  const gw = cw / spec.labels.length;
  const bw = Math.max((gw - 16) / spec.series.length, 10);
  return spec.series.map((s, si) =>
    s.data.map((v, vi) => {
      const bh = (v / safeMax) * ch;
      return <rect key={`${s.name}-${vi}`} x={pad.l + vi * gw + 8 + si * bw} y={pad.t + ch - bh} width={bw - 3} height={bh} rx="6" fill={s.color} opacity={0.9} />;
    }),
  );
}

function renderStackedBar(spec: ChartSpec, { pad, cw, ch, safeMax }: Dims) {
  const gw = cw / spec.labels.length;
  const bw = Math.max(gw - 16, 10);
  return spec.labels.map((_, li) => {
    let cum = 0;
    return spec.series.map((s, si) => {
      const v = s.data[li] ?? 0;
      const bh = (v / safeMax) * ch;
      const y = pad.t + ch - ((cum + v) / safeMax) * ch;
      cum += v;
      return <rect key={`${s.name}-${li}`} x={pad.l + li * gw + (gw - bw) / 2} y={y} width={bw} height={bh} rx={si === spec.series.length - 1 ? 6 : 0} fill={s.color} opacity={0.9} />;
    });
  });
}

function renderLine(spec: ChartSpec, { pad, cw, ch, safeMax, h }: Dims & { h: number }, fillArea: boolean) {
  const step = spec.type === "step";
  return spec.series.map((s) => {
    const pts = s.data.map((v, i) => ({
      x: pad.l + (i / Math.max(spec.labels.length - 1, 1)) * cw,
      y: pad.t + ch - (v / safeMax) * ch,
    }));
    const path = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      return step ? `${acc} H ${p.x} V ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");
    const area = `${path} L ${pts.at(-1)!.x} ${pad.t + ch} L ${pts[0]!.x} ${pad.t + ch} Z`;
    return (
      <g key={s.name}>
        {fillArea && <path d={area} fill={s.color} opacity="0.15" />}
        <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {!step && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={s.color} strokeWidth="2" />)}
      </g>
    );
  });
}

// ─── CIRCULAR (pie / donut) ───────────────────────────────────────────────────

function CircularChart({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0]?.data ?? [];
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const size = 260; const c = size / 2; const r = 88; const ir = spec.type === "donut" ? 52 : 0;
  const segs = values.reduce<{ sa: number; ea: number; v: number; i: number }[]>((acc, v, i) => {
    const sa = i === 0 ? -Math.PI / 2 : acc[i - 1]!.ea;
    acc.push({ sa, ea: sa + (v / total) * Math.PI * 2, v, i });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[260px] w-[260px] shrink-0">
        {segs.map((seg) => {
          const fill = spec.series[seg.i]?.color ?? defaultPalette[seg.i % defaultPalette.length];
          return <path key={`${spec.labels[seg.i]}-${seg.i}`} d={describeArc(c, c, r, ir, seg.sa, seg.ea)} fill={fill} opacity="0.92" />;
        })}
        {spec.type === "donut" && <circle cx={c} cy={c} r={ir - 2} fill="white" />}
        <text x={c} y={c - 2} textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">{formatTick(total)}</text>
        <text x={c} y={c + 18} textAnchor="middle" fontSize="11" fill="#64748b">Total</text>
      </svg>
      <div className="w-full space-y-2">
        {spec.labels.map((label, i) => {
          const v = values[i] ?? 0;
          const color = spec.series[i]?.color ?? defaultPalette[i % defaultPalette.length];
          return (
            <div key={label + i} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-[12px] font-medium text-foreground">{label}</span>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div className="font-semibold text-foreground">{formatTick(v)}</div>
                <div>{Math.round((v / total) * 100)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HISTOGRAM ───────────────────────────────────────────────────────────────

function HistogramChart({ spec }: { spec: ChartSpec }) {
  const w = 680; const h = 300;
  const pad = { t: 18, r: 18, b: 52, l: 50 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const n = spec.labels.length;
  const binW = cw / n;

  const allVals = spec.series.flatMap((s) => s.data);
  const safeMax = Math.max(...allVals, 0) * 1.1 || 1;
  const ticks = Array.from({ length: 5 }, (_, i) => (safeMax / 4) * i);
  const px = (i: number) => pad.l + i * binW;
  const py = (v: number) => pad.t + ch - (v / safeMax) * ch;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[480px] w-full">
        {ticks.map((t, i) => {
          const y = py(t);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {spec.series.map((s, si) => {
          const offset = si * (binW / spec.series.length);
          const bw = binW / spec.series.length;
          return s.data.map((v, bi) => {
            const x = px(bi) + offset;
            const bh = (v / safeMax) * ch;
            const y = pad.t + ch - bh;
            return (
              <rect
                key={`${s.name}-${bi}`}
                x={x + 0.5}
                y={y}
                width={bw - 1}
                height={bh}
                rx={spec.series.length === 1 ? "4 4 0 0" : "2"}
                fill={s.color}
                opacity={0.88}
              />
            );
          });
        })}

        {spec.labels.map((label, i) => (
          <text key={label + i} x={px(i) + binW / 2} y={h - 16} textAnchor="middle" fontSize="10" fill="#6b7280">
            {label}
          </text>
        ))}
        {spec.xLabel && <text x={pad.l + cw / 2} y={h - 2} textAnchor="middle" fontSize="11" fill="#6b7280">{spec.xLabel}</text>}
        {spec.yLabel && <text x={14} y={pad.t + ch / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 14 ${pad.t + ch / 2})`}>{spec.yLabel}</text>}
      </svg>
    </div>
  );
}

// ─── BOXPLOT ─────────────────────────────────────────────────────────────────

function BoxplotChart({ spec }: { spec: ChartSpec }) {
  // boxData: [[min,Q1,median,Q3,max], ...] per label
  // fallback: series[0..4] = min, Q1, median, Q3, max
  const getData = (labelIdx: number): [number, number, number, number, number] | null => {
    if (spec.boxData?.[labelIdx]) {
      const d = spec.boxData[labelIdx]!;
      if (d.length >= 5) return [d[0]!, d[1]!, d[2]!, d[3]!, d[4]!];
    }
    if (spec.series.length >= 5) {
      return [
        spec.series[0]!.data[labelIdx] ?? 0,
        spec.series[1]!.data[labelIdx] ?? 0,
        spec.series[2]!.data[labelIdx] ?? 0,
        spec.series[3]!.data[labelIdx] ?? 0,
        spec.series[4]!.data[labelIdx] ?? 0,
      ];
    }
    return null;
  };

  const allVals = spec.labels.flatMap((_, i) => getData(i) ?? []);
  const w = 640; const h = 320;
  const pad = { t: 24, r: 18, b: 52, l: 50 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 0) * 1.08;
  const yRange = maxVal - minVal || 1;
  const ticks = Array.from({ length: 5 }, (_, i) => minVal + (yRange / 4) * i);
  const py = (v: number) => pad.t + ch - ((v - minVal) / yRange) * ch;
  const groupW = cw / spec.labels.length;
  const boxW = Math.min(groupW * 0.5, 48);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[400px] w-full">
        {ticks.map((t, i) => {
          const y = py(t);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#d6deea" strokeDasharray="4 4" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{formatTick(t)}</text>
            </g>
          );
        })}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ch} stroke="#94a3b8" />
        <line x1={pad.l} y1={pad.t + ch} x2={pad.l + cw} y2={pad.t + ch} stroke="#94a3b8" />

        {spec.labels.map((label, i) => {
          const box = getData(i);
          if (!box) return null;
          const [mn, q1, med, q3, mx] = box;
          const cx = pad.l + i * groupW + groupW / 2;
          const color = defaultPalette[i % defaultPalette.length];

          return (
            <g key={label + i}>
              {/* Whisker lines */}
              <line x1={cx} y1={py(mn)} x2={cx} y2={py(q1)} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1={cx} y1={py(q3)} x2={cx} y2={py(mx)} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
              {/* Whisker caps */}
              <line x1={cx - boxW * 0.3} y1={py(mn)} x2={cx + boxW * 0.3} y2={py(mn)} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <line x1={cx - boxW * 0.3} y1={py(mx)} x2={cx + boxW * 0.3} y2={py(mx)} stroke={color} strokeWidth="2" strokeLinecap="round" />
              {/* IQR box */}
              <rect
                x={cx - boxW / 2}
                y={py(q3)}
                width={boxW}
                height={Math.max(py(q1) - py(q3), 2)}
                rx="4"
                fill={color}
                fillOpacity="0.18"
                stroke={color}
                strokeWidth="1.5"
              />
              {/* Median line */}
              <line x1={cx - boxW / 2} y1={py(med)} x2={cx + boxW / 2} y2={py(med)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              {/* Label */}
              <text x={cx} y={h - 16} textAnchor="middle" fontSize="11" fill="#6b7280">{truncateLabel(label, 12)}</text>
              {/* Median value */}
              <text x={cx + boxW / 2 + 4} y={py(med) + 4} fontSize="9" fill={color} fontWeight="600">{formatTick(med)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── TREEMAP ─────────────────────────────────────────────────────────────────

type TRect = { x: number; y: number; w: number; h: number; i: number };

function treemapLayout(values: number[], x: number, y: number, w: number, h: number, offset = 0): TRect[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x, y, w, h, i: offset }];
  const total = values.reduce((s, v) => s + v, 0);
  let sum = 0; let split = 1;
  for (let k = 0; k < values.length - 1; k++) {
    sum += values[k]!;
    if (sum >= total / 2) { split = k + 1; break; }
  }
  const leftVals = values.slice(0, split);
  const rightVals = values.slice(split);
  const leftRatio = leftVals.reduce((s, v) => s + v, 0) / total;
  if (w >= h) {
    const lw = leftRatio * w;
    return [...treemapLayout(leftVals, x, y, lw, h, offset), ...treemapLayout(rightVals, x + lw, y, w - lw, h, offset + split)];
  }
  const th = leftRatio * h;
  return [...treemapLayout(leftVals, x, y, w, th, offset), ...treemapLayout(rightVals, x, y + th, w, h - th, offset + split)];
}

function TreemapChart({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0]?.data ?? [];
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const w = 640; const h = 340; const pad = 4;

  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const sortedVals = sorted.map((s) => s.v);
  const rects = treemapLayout(sortedVals, pad, pad, w - pad * 2, h - pad * 2);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[400px] w-full">
        {rects.map((r, ri) => {
          const orig = sorted[ri]!;
          const label = spec.labels[orig.i] ?? "";
          const color = defaultPalette[orig.i % defaultPalette.length];
          const pct = Math.round((orig.v / total) * 100);
          const showLabel = r.w > 48 && r.h > 28;
          const showPct = r.w > 60 && r.h > 44;
          return (
            <g key={ri}>
              <rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} rx="6" fill={color} fillOpacity="0.82" />
              {showLabel && (
                <text x={r.x + r.w / 2} y={r.y + r.h / 2 + (showPct ? -6 : 4)} textAnchor="middle" fontSize={Math.min(13, r.w / 6)} fontWeight="600" fill="white">
                  {truncateLabel(label, Math.floor(r.w / 7))}
                </text>
              )}
              {showPct && (
                <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10} textAnchor="middle" fontSize="10" fill="white" opacity="0.85">
                  {formatTick(orig.v)} · {pct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── BULLET ──────────────────────────────────────────────────────────────────

function BulletChart({ spec }: { spec: ChartSpec }) {
  // series[0] = actual, series[1] = target, series[2] = good threshold (optional)
  const actualS = spec.series[0];
  const targetS = spec.series[1];
  const goodS = spec.series[2];

  if (!actualS || !targetS) return null;

  const allVals = spec.series.flatMap((s) => s.data);
  const globalMax = spec.max ?? (Math.max(...allVals, 0) * 1.15 || 1);

  const w = 600; const rowH = 44; const labelW = 130; const padR = 20; const padT = 10;
  const barW = w - labelW - padR;
  const h = padT + spec.labels.length * rowH + 20;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (globalMax / tickCount) * i);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[400px] w-full">
        {/* Tick lines */}
        {ticks.map((t, i) => {
          const x = labelW + (t / globalMax) * barW;
          return (
            <g key={i}>
              <line x1={x} y1={padT} x2={x} y2={padT + spec.labels.length * rowH} stroke="#e2e8f0" strokeWidth="1" />
              <text x={x} y={padT + spec.labels.length * rowH + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">{formatTick(t)}</text>
            </g>
          );
        })}

        {spec.labels.map((label, i) => {
          const actual = actualS.data[i] ?? 0;
          const target = targetS.data[i] ?? 0;
          const good = goodS?.data[i];
          const color = actualS.color ?? defaultPalette[0];
          const y = padT + i * rowH;
          const barH = 16; const barY = y + (rowH - barH) / 2;

          const toX = (v: number) => labelW + Math.min((v / globalMax), 1) * barW;

          return (
            <g key={label + i}>
              <text x={labelW - 8} y={barY + barH / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {truncateLabel(label, 18)}
              </text>
              {/* Good range band */}
              {good !== undefined && (
                <rect x={labelW} y={barY - 2} width={(good / globalMax) * barW} height={barH + 4} rx="4" fill="#10b981" opacity="0.08" />
              )}
              {/* Background track */}
              <rect x={labelW} y={barY} width={barW} height={barH} rx="4" fill="#f1f5f9" />
              {/* Actual value bar */}
              <rect x={labelW} y={barY + 3} width={toX(actual) - labelW} height={barH - 6} rx="3" fill={color} opacity="0.9" />
              {/* Target marker */}
              <line x1={toX(target)} y1={barY - 4} x2={toX(target)} y2={barY + barH + 4} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              {/* Value labels */}
              <text x={toX(actual) + 4} y={barY + barH / 2 + 4} fontSize="10" fill={color} fontWeight="700">{formatTick(actual)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── LEGEND ──────────────────────────────────────────────────────────────────

function Legend({ spec }: { spec: ChartSpec }) {
  if (!spec.series.length || spec.type === "pie" || spec.type === "donut") return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {spec.series.map((s) => (
        <div key={s.name} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.name}
        </div>
      ))}
    </div>
  );
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function describeArc(cx: number, cy: number, r: number, ir: number, sa: number, ea: number) {
  const os = polarToCartesian(cx, cy, r, sa); const oe = polarToCartesian(cx, cy, r, ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  if (ir <= 0) return [`M ${cx} ${cy}`, `L ${os.x} ${os.y}`, `A ${r} ${r} 0 ${large} 1 ${oe.x} ${oe.y}`, "Z"].join(" ");
  const ie = polarToCartesian(cx, cy, ir, sa); const is_ = polarToCartesian(cx, cy, ir, ea);
  return [`M ${os.x} ${os.y}`, `A ${r} ${r} 0 ${large} 1 ${oe.x} ${oe.y}`, `L ${is_.x} ${is_.y}`, `A ${ir} ${ir} 0 ${large} 0 ${ie.x} ${ie.y}`, "Z"].join(" ");
}

function formatTick(v: number) {
  if (Math.abs(v) >= 1_000_000) return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (Math.abs(v) >= 1000) return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v);
}

function truncateLabel(label: string, max = 10) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
