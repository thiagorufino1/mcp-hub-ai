"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ComposedChart,
  RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart as RechartsScatterChart, Scatter,
  Treemap as RcTreemap,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend as RcLegend,
} from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ChartType =
  | "bar" | "line" | "area" | "pie" | "donut"
  | "kpi" | "table" | "funnel" | "gauge"
  | "heatmap" | "radar" | "timeline" | "scatter" | "status" | "step" | "waterfall" | "range"
  | "histogram" | "boxplot" | "treemap" | "bullet"
  | "device-cards" | "info-cards" | "alert-list";

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

export type DeviceMetric = {
  label: string;
  value: string;
  bar?: number;
  barColor?: "default" | "green" | "amber" | "red";
};

export type DeviceCard = {
  label: string;
  status?: "ok" | "warning" | "critical" | "unknown" | "maintenance";
  statusLabel?: string;
  metrics: DeviceMetric[];
  details?: string[];
  note?: string;
};

export type InfoRow = {
  key: string;
  value: string;
  highlight?: "ok" | "warning" | "critical" | "neutral";
};

export type InfoCard = {
  label: string;
  status?: "ok" | "warning" | "critical" | "unknown";
  rows?: InfoRow[];
  metrics?: { label: string; value: string }[];
  footerRows?: InfoRow[];
};

export type CardBanner = { text: string; status: "ok" | "warning" | "critical" };

export type AlertItem = {
  label: string;
  description?: string;
  detail?: string;
  severity?: "critical" | "warning" | "minor" | "info" | "ok";
  badge?: string;
  badgeStatus?: "active" | "resolved" | "acknowledged";
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
  deviceCards?: DeviceCard[];
  infoCards?: InfoCard[];
  cardBanner?: CardBanner;
  alertItems?: AlertItem[];
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const defaultPalette = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const ALL_TYPES: ChartType[] = [
  "bar", "line", "area", "pie", "donut",
  "kpi", "table", "funnel", "gauge",
  "heatmap", "radar", "timeline", "scatter", "status", "step", "waterfall", "range",
  "histogram", "boxplot", "treemap", "bullet",
  "device-cards", "info-cards", "alert-list",
];

const TT = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    padding: "10px 14px",
  },
  labelStyle: { color: "#0f172a", fontWeight: 600, marginBottom: "4px" },
  itemStyle: { color: "#374151" },
};

const TICK = { fontSize: 11, fill: "#6b7280" };
const MARGIN = { top: 10, right: 16, bottom: 40, left: 16 };

function toData(spec: ChartSpec): Record<string, string | number>[] {
  return spec.labels.map((name, i) => {
    const row: Record<string, string | number> = { name };
    spec.series.forEach((s) => { row[s.name] = s.data[i] ?? 0; });
    return row;
  });
}

function gradId(name: string) {
  return `grad-${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

// ─── PARSE ───────────────────────────────────────────────────────────────────

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
        ...base, type: "table", labels: [], series: [],
        columns: parsed.columns.filter((c): c is string => typeof c === "string"),
        rows: (parsed.rows as unknown[]).filter(Array.isArray) as string[][],
      };
    }

    if (parsed.type === "timeline") {
      if (!Array.isArray(parsed.events) || parsed.events.length === 0) return null;
      const events = parsed.events.filter(
        (e): e is TimelineEvent => Boolean(e) && typeof e.label === "string" && e.start !== undefined && e.end !== undefined,
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
        ...base, type: "scatter", labels: [], series: [], scatterSeries,
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

    if (parsed.type === "alert-list") {
      if (!Array.isArray(parsed.alertItems) || parsed.alertItems.length === 0) return null;
      return { ...base, type: "alert-list", labels: [], series: [], alertItems: parsed.alertItems as AlertItem[] };
    }

    if (parsed.type === "device-cards") {
      if (!Array.isArray(parsed.deviceCards) || parsed.deviceCards.length === 0) return null;
      return { ...base, type: "device-cards", labels: [], series: [], deviceCards: parsed.deviceCards as DeviceCard[], cardBanner: parsed.cardBanner as CardBanner | undefined };
    }

    if (parsed.type === "info-cards") {
      if (!Array.isArray(parsed.infoCards) || parsed.infoCards.length === 0) return null;
      return { ...base, type: "info-cards", labels: [], series: [], infoCards: parsed.infoCards as InfoCard[], cardBanner: parsed.cardBanner as CardBanner | undefined };
    }

    if (!Array.isArray(parsed.labels) || parsed.labels.length === 0) return null;
    if (!Array.isArray(parsed.series) || parsed.series.length === 0) return null;

    const series = parsed.series
      .filter(
        (s): s is ChartSeries =>
          Boolean(s) && typeof s.name === "string" &&
          Array.isArray(s.data) && s.data.every((v) => typeof v === "number"),
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

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  if (spec.type === "kpi")           return <KpiBlock spec={spec} />;
  if (spec.type === "table")         return <TableBlock spec={spec} />;
  if (spec.type === "status")        return <StatusGrid spec={spec} />;
  if (spec.type === "device-cards")  return <DeviceCardsBlock spec={spec} />;
  if (spec.type === "info-cards")    return <InfoCardsBlock spec={spec} />;
  if (spec.type === "alert-list")    return <AlertListBlock spec={spec} />;

  // Recharts
  if (spec.type === "bar")       return <ChartWrapper spec={spec}><RcBarChart spec={spec} /></ChartWrapper>;
  if (spec.type === "line")      return <ChartWrapper spec={spec}><RcLineChart spec={spec} /></ChartWrapper>;
  if (spec.type === "step")      return <ChartWrapper spec={spec}><RcLineChart spec={spec} /></ChartWrapper>;
  if (spec.type === "area")      return <ChartWrapper spec={spec}><RcAreaChart spec={spec} /></ChartWrapper>;
  if (spec.type === "histogram") return <ChartWrapper spec={spec}><RcHistogramChart spec={spec} /></ChartWrapper>;
  if (spec.type === "pie" || spec.type === "donut") return <ChartWrapper spec={spec}><RcPieChart spec={spec} /></ChartWrapper>;
  if (spec.type === "radar")     return <ChartWrapper spec={spec}><RcRadarChart spec={spec} /></ChartWrapper>;
  if (spec.type === "scatter")   return <ChartWrapper spec={spec}><RcScatterChart spec={spec} /></ChartWrapper>;
  if (spec.type === "treemap")   return <ChartWrapper spec={spec}><RcTreemapChart spec={spec} /></ChartWrapper>;
  if (spec.type === "range")     return <ChartWrapper spec={spec}><RcRangeChart spec={spec} /></ChartWrapper>;

  // Custom SVG (no good Recharts equivalent)
  if (spec.type === "timeline")  return <ChartWrapper spec={spec}><TimelineChart spec={spec} /></ChartWrapper>;
  if (spec.type === "gauge")     return <ChartWrapper spec={spec}><GaugeChart spec={spec} /></ChartWrapper>;
  if (spec.type === "funnel")    return <ChartWrapper spec={spec}><FunnelChart spec={spec} /></ChartWrapper>;
  if (spec.type === "heatmap")   return <ChartWrapper spec={spec}><HeatmapChart spec={spec} /></ChartWrapper>;
  if (spec.type === "waterfall") return <ChartWrapper spec={spec}><WaterfallChart spec={spec} /></ChartWrapper>;
  if (spec.type === "boxplot")   return <ChartWrapper spec={spec}><BoxplotChart spec={spec} /></ChartWrapper>;
  if (spec.type === "bullet")    return <ChartWrapper spec={spec}><BulletChart spec={spec} /></ChartWrapper>;

  return null;
}

// ─── WRAPPER ─────────────────────────────────────────────────────────────────

function ChartWrapper({ spec, children }: { spec: ChartSpec; children: ReactNode }) {
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
          {spec.type.toUpperCase()}
        </p>
        {spec.title && <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3>}
        {spec.description && <p className="mt-1 text-[13px] text-muted-foreground">{spec.description}</p>}
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
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3>}
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
      {item.icon && <span className="text-[18px] leading-none">{item.icon}</span>}
      <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
      <p className="text-[22px] font-bold leading-tight tracking-tight text-foreground">{item.value}</p>
      {item.sparkline && item.sparkline.length >= 2 && <Sparkline data={item.sparkline} color={sparkColor} />}
      {item.change && (
        <div className={cn("flex flex-wrap items-center gap-1 text-[11px] font-semibold", trendColor)}>
          <span>{trendArrow} {item.change}</span>
          {item.changeLabel && <span className="font-normal text-muted-foreground">{item.changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80; const h = 26;
  const mn = Math.min(...data); const mx = Math.max(...data); const range = mx - mn || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - mn) / range) * (h - 4) - 2 }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="mt-0.5">
      <path d={`${path} L ${pts.at(-1)!.x} ${h} L 0 ${h} Z`} fill={color} opacity="0.15" />
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
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3>}
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
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[16px] font-semibold text-foreground">{spec.title}</h3>}
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
                    {item.detail && <p className="text-[10px] text-muted-foreground leading-snug">{item.detail}</p>}
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

// ─── ALERT LIST ──────────────────────────────────────────────────────────────

const alertSeverityCfg = {
  critical:    { border: "border-l-red-500",    bg: "hover:bg-red-50/50",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500"    },
  warning:     { border: "border-l-amber-500",  bg: "hover:bg-amber-50/50",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  minor:       { border: "border-l-orange-400", bg: "hover:bg-orange-50/50", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400" },
  info:        { border: "border-l-blue-400",   bg: "hover:bg-blue-50/50",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-400"   },
  ok:          { border: "border-l-emerald-400",bg: "hover:bg-emerald-50/50",badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
} as const;

const badgeStatusCfg = {
  active:       "bg-red-100 text-red-700",
  resolved:     "bg-emerald-100 text-emerald-700",
  acknowledged: "bg-amber-100 text-amber-700",
} as const;

function AlertListBlock({ spec }: { spec: ChartSpec }) {
  const items = spec.alertItems ?? [];
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[15px] font-semibold text-foreground">{spec.title}</h3>}
        </div>
      )}
      <div className="divide-y divide-[var(--color-border)]/50">
        {items.map((item, i) => {
          const sev = item.severity ?? "info";
          const cfg = alertSeverityCfg[sev] ?? alertSeverityCfg.info;
          const badgeCls = item.badgeStatus
            ? badgeStatusCfg[item.badgeStatus]
            : item.badge
              ? (sev === "critical" ? badgeStatusCfg.active : sev === "ok" ? badgeStatusCfg.resolved : badgeStatusCfg.acknowledged)
              : null;

          return (
            <div key={i} className={cn("flex items-center gap-3 border-l-4 px-4 py-3 transition-colors", cfg.border, cfg.bg)}>
              <span className={cn("size-2 shrink-0 rounded-full", cfg.dot)} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-foreground truncate">{item.label}</p>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description}
                    {item.detail && <span className="text-[var(--color-text-secondary)]"> · {item.detail}</span>}
                  </p>
                )}
              </div>
              {item.badge && badgeCls && (
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold", badgeCls)}>
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── DEVICE CARDS ────────────────────────────────────────────────────────────

const deviceStatusCfg = {
  ok:          { label: "Normal",      bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200",  dot: "#10b981" },
  warning:     { label: "CPU elevada", bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    dot: "#f59e0b" },
  critical:    { label: "Crítico",     bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",      dot: "#ef4444" },
  unknown:     { label: "Desconhecido",bg: "bg-slate-50",    text: "text-slate-600",    border: "border-slate-200",    dot: "#94a3b8" },
  maintenance: { label: "Manutenção",  bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200",     dot: "#3b82f6" },
} as const;

const barColorMap = {
  default: "#2563eb",
  green:   "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
} as const;

function DeviceCardsBlock({ spec }: { spec: ChartSpec }) {
  const cards = spec.deviceCards ?? [];
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[15px] font-semibold text-foreground">{spec.title}</h3>}
        </div>
      )}
      {spec.cardBanner && <CardBannerBar banner={spec.cardBanner} />}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {cards.map((card, i) => <DeviceCard key={`${card.label}-${i}`} card={card} />)}
      </div>
    </section>
  );
}

function DeviceCard({ card }: { card: DeviceCard }) {
  const status = card.status ?? "ok";
  const cfg = deviceStatusCfg[status] ?? deviceStatusCfg.unknown;
  const statusLabel = card.statusLabel ?? cfg.label;
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", cfg.border, cfg.bg)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-foreground tracking-tight">{card.label}</span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text, "border", cfg.border)}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
          {statusLabel}
        </span>
      </div>
      {/* Metrics row */}
      <div className={cn("grid gap-3", card.metrics.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
        {card.metrics.map((m, i) => (
          <DeviceMetricCell key={i} metric={m} />
        ))}
      </div>
      {/* Detail lines */}
      {card.details && card.details.length > 0 && (
        <div className="space-y-0.5">
          {card.details.map((d, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">{d}</p>
          ))}
        </div>
      )}
      {/* Note */}
      {card.note && (
        <p className="rounded-lg bg-black/5 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">{card.note}</p>
      )}
    </div>
  );
}

function DeviceMetricCell({ metric }: { metric: DeviceMetric }) {
  const barColor = barColorMap[metric.barColor ?? "default"];
  const barPct = metric.bar !== undefined ? Math.min(Math.max(metric.bar, 0), 100) : undefined;
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground leading-tight">{metric.label}</p>
      <p className="text-[16px] font-bold text-foreground leading-none">{metric.value}</p>
      {barPct !== undefined && (
        <div className="h-1.5 w-full rounded-full bg-black/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  );
}

// ─── INFO CARDS ───────────────────────────────────────────────────────────────

const highlightCfg = {
  ok:       "text-emerald-600 font-medium",
  warning:  "text-amber-600 font-medium",
  critical: "text-red-600 font-medium",
  neutral:  "text-muted-foreground",
} as const;

function InfoCardsBlock({ spec }: { spec: ChartSpec }) {
  const cards = spec.infoCards ?? [];
  return (
    <section className="my-4 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(spec.title || spec.description) && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-4 py-3">
          {spec.description && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{spec.description}</p>}
          {spec.title && <h3 className="mt-1 text-[15px] font-semibold text-foreground">{spec.title}</h3>}
        </div>
      )}
      {spec.cardBanner && <CardBannerBar banner={spec.cardBanner} />}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {cards.map((card, i) => <InfoCardItem key={`${card.label}-${i}`} card={card} />)}
      </div>
    </section>
  );
}

function InfoCardItem({ card }: { card: InfoCard }) {
  const status = card.status ?? "ok";
  const cfg = deviceStatusCfg[status] ?? deviceStatusCfg.unknown;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Card header */}
      <div className={cn("flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--color-border)]", cfg.bg)}>
        <span className="text-[13px] font-bold text-foreground">{card.label}</span>
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.text, cfg.border, "bg-white/60")}>
          {cfg.label.toUpperCase()}
        </span>
      </div>
      {/* Key-value rows */}
      {card.rows && card.rows.length > 0 && (
        <div className="divide-y divide-[var(--color-border)]/50">
          {card.rows.map((row, i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-4 py-1.5">
              <span className="text-[11px] text-muted-foreground shrink-0">{row.key}</span>
              <span className={cn("text-[11px] text-right", row.highlight ? highlightCfg[row.highlight] : "text-foreground")}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Metrics grid */}
      {card.metrics && card.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]/30 border-t border-[var(--color-border)]/50">
          {card.metrics.map((m, i) => (
            <div key={i} className="bg-[var(--color-surface)] px-4 py-2.5">
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-[15px] font-bold text-foreground mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      )}
      {/* Footer rows */}
      {card.footerRows && card.footerRows.length > 0 && (
        <div className="divide-y divide-[var(--color-border)]/50 border-t border-[var(--color-border)]/50">
          {card.footerRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-1.5">
              <span className="text-[11px] text-muted-foreground">{row.key}</span>
              <span className={cn("text-[11px]", row.highlight ? highlightCfg[row.highlight] : "text-foreground")}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardBannerBar({ banner }: { banner: CardBanner }) {
  const cfg = {
    ok:       { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "✓" },
    warning:  { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   icon: "⚠" },
    critical: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     icon: "✕" },
  }[banner.status];
  return (
    <div className={cn("mx-4 mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5", cfg.bg)}>
      <span className={cn("text-[13px] font-bold", cfg.text)}>{cfg.icon}</span>
      <p className={cn("text-[12px] font-medium", cfg.text)}>{banner.text}</p>
    </div>
  );
}

// ─── RECHARTS: BAR ───────────────────────────────────────────────────────────

function RcBarChart({ spec }: { spec: ChartSpec }) {
  const data = toData(spec);
  const n = spec.series.length;
  const isHorizontal = spec.orientation === "horizontal";
  const isStacked = spec.stacked;
  const rotateX = spec.labels.length > 7;

  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(spec.labels.length * 52, 240)}>
        <BarChart layout="vertical" data={data} margin={{ top: 10, right: 30, bottom: 10, left: 120 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={TICK} tickFormatter={formatTick} />
          <YAxis type="category" dataKey="name" tick={TICK} width={110} />
          <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
          {n > 1 && <RcLegend wrapperStyle={{ fontSize: 11 }} />}
          {spec.series.map((s) => (
            <Bar key={s.name} dataKey={s.name} fill={s.color} opacity={0.9} radius={[0, 6, 6, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ ...MARGIN, bottom: rotateX ? 60 : 40 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={TICK} angle={rotateX ? -35 : 0} textAnchor={rotateX ? "end" : "middle"} height={rotateX ? 60 : 40} interval={0} />
        <YAxis tick={TICK} tickFormatter={formatTick} label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#6b7280" } } : undefined} />
        <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
        {n > 1 && <RcLegend wrapperStyle={{ fontSize: 11 }} />}
        {spec.series.map((s, si) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={s.color}
            opacity={0.9}
            radius={isStacked ? (si === n - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]) : [6, 6, 0, 0]}
            stackId={isStacked ? "stack" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: HISTOGRAM ─────────────────────────────────────────────────────

function RcHistogramChart({ spec }: { spec: ChartSpec }) {
  const data = toData(spec);
  const n = spec.series.length;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={MARGIN} barCategoryGap={0} barGap={0}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={TICK} label={spec.xLabel ? { value: spec.xLabel, position: "bottom", style: { fontSize: 11, fill: "#6b7280" } } : undefined} />
        <YAxis tick={TICK} tickFormatter={formatTick} label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#6b7280" } } : undefined} />
        <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
        {n > 1 && <RcLegend wrapperStyle={{ fontSize: 11 }} />}
        {spec.series.map((s) => (
          <Bar key={s.name} dataKey={s.name} fill={s.color} opacity={0.88} radius={[0, 0, 0, 0]} stroke="white" strokeWidth={n > 1 ? 1 : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: LINE / STEP ────────────────────────────────────────────────────

function RcLineChart({ spec }: { spec: ChartSpec }) {
  const data = toData(spec);
  const isStep = spec.type === "step";
  const n = spec.series.length;
  const rotateX = spec.labels.length > 8;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ ...MARGIN, bottom: rotateX ? 60 : 40 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={TICK} angle={rotateX ? -35 : 0} textAnchor={rotateX ? "end" : "middle"} height={rotateX ? 60 : 40} interval={0} />
        <YAxis tick={TICK} tickFormatter={formatTick} label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#6b7280" } } : undefined} />
        <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
        {n > 1 && <RcLegend wrapperStyle={{ fontSize: 11 }} />}
        {spec.series.map((s) => (
          <Line
            key={s.name}
            type={isStep ? "stepAfter" : "monotone"}
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: "white", stroke: s.color, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: AREA ──────────────────────────────────────────────────────────

function RcAreaChart({ spec }: { spec: ChartSpec }) {
  const data = toData(spec);
  const n = spec.series.length;
  const rotateX = spec.labels.length > 8;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ ...MARGIN, bottom: rotateX ? 60 : 40 }}>
        <defs>
          {spec.series.map((s) => (
            <linearGradient key={s.name} id={gradId(s.name)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={TICK} angle={rotateX ? -35 : 0} textAnchor={rotateX ? "end" : "middle"} height={rotateX ? 60 : 40} interval={0} />
        <YAxis tick={TICK} tickFormatter={formatTick} label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#6b7280" } } : undefined} />
        <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
        {n > 1 && <RcLegend wrapperStyle={{ fontSize: 11 }} />}
        {spec.series.map((s) => (
          <Area key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2.5} fill={`url(#${gradId(s.name)})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: RANGE ─────────────────────────────────────────────────────────

function RcRangeChart({ spec }: { spec: ChartSpec }) {
  const data = toData(spec);
  const [maxS, midS, minS] = spec.series.length >= 3
    ? [spec.series[0], spec.series[1], spec.series[2]]
    : [spec.series[0], undefined, spec.series[1]];
  const rotateX = spec.labels.length > 8;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ ...MARGIN, bottom: rotateX ? 60 : 40 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={TICK} angle={rotateX ? -35 : 0} textAnchor={rotateX ? "end" : "middle"} height={rotateX ? 60 : 40} interval={0} />
        <YAxis tick={TICK} tickFormatter={formatTick} />
        <Tooltip {...TT} formatter={(v) => formatTick(Number(v))} />
        <RcLegend wrapperStyle={{ fontSize: 11 }} />
        {maxS && <Line type="monotone" dataKey={maxS.name} stroke={maxS.color} strokeDasharray="6 3" strokeWidth={1.5} dot={false} />}
        {midS && <Line type="monotone" dataKey={midS.name} stroke={midS.color} strokeWidth={2.5} dot={false} />}
        {minS && <Line type="monotone" dataKey={minS.name} stroke={minS.color} strokeDasharray="6 3" strokeWidth={1.5} dot={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: PIE / DONUT ───────────────────────────────────────────────────

function RcPieChart({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0]?.data ?? [];
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const pieData = spec.labels.map((name, i) => ({ name, value: values[i] ?? 0 }));
  const colors = pieData.map((_, i) => spec.series[i]?.color ?? defaultPalette[i % defaultPalette.length]);
  const isDonut = spec.type === "donut";
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="shrink-0 md:w-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={isDonut ? "42%" : 0}
              outerRadius="80%"
              paddingAngle={isDonut ? 2 : 0}
              strokeWidth={0}
            >
              {pieData.map((_, i) => <Cell key={i} fill={colors[i]} opacity={0.92} />)}
            </Pie>
            <Tooltip {...TT} formatter={(v) => [formatTick(Number(v)), ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full space-y-2">
        {pieData.map((item, i) => (
          <div key={item.name + i} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: colors[i] }} />
              <span className="truncate text-[12px] font-medium text-foreground">{item.name}</span>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div className="font-semibold text-foreground">{formatTick(item.value)}</div>
              <div>{Math.round((item.value / total) * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RECHARTS: RADAR ─────────────────────────────────────────────────────────

function RcRadarChart({ spec }: { spec: ChartSpec }) {
  const data = spec.labels.map((subject, i) => {
    const row: Record<string, string | number> = { subject };
    spec.series.forEach((s) => { row[s.name] = s.data[i] ?? 0; });
    return row;
  });
  const maxVal = spec.max ?? Math.max(...spec.series.flatMap((s) => s.data), 1);
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RechartsRadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={90} domain={[0, maxVal]} tick={{ fontSize: 9, fill: "#94a3b8" }} tickCount={5} />
        {spec.series.map((s, i) => (
          <Radar
            key={s.name}
            name={s.name}
            dataKey={s.name}
            stroke={s.color ?? defaultPalette[i]}
            fill={s.color ?? defaultPalette[i]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip {...TT} />
        <RcLegend wrapperStyle={{ fontSize: 11 }} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: SCATTER ───────────────────────────────────────────────────────

function RcScatterChart({ spec }: { spec: ChartSpec }) {
  const groups = spec.scatterSeries ?? [];
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RechartsScatterChart margin={{ top: 10, right: 20, bottom: 50, left: 20 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
        <XAxis
          dataKey="x"
          name={spec.xLabel ?? "X"}
          tick={TICK}
          type="number"
          label={spec.xLabel ? { value: spec.xLabel, position: "bottom", offset: 0, style: { fontSize: 11, fill: "#6b7280" } } : undefined}
        />
        <YAxis
          dataKey="y"
          name={spec.yLabel ?? "Y"}
          tick={TICK}
          type="number"
          label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#6b7280" } } : undefined}
        />
        <Tooltip {...TT} cursor={{ strokeDasharray: "3 3" }} />
        <RcLegend wrapperStyle={{ fontSize: 11 }} />
        {groups.map((g, i) => (
          <Scatter key={g.name} name={g.name} data={g.points} fill={g.color ?? defaultPalette[i]} opacity={0.82} />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}

// ─── RECHARTS: TREEMAP ───────────────────────────────────────────────────────

function RcTreemapChart({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0]?.data ?? [];
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const data = spec.labels.map((name, i) => ({
    name,
    value: values[i] ?? 0,
    fill: defaultPalette[i % defaultPalette.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RcTreemap
        data={data}
        dataKey="value"
        nameKey="name"
        aspectRatio={4 / 3}
        content={(props: Record<string, unknown>) => {
          const { x, y, width, height, name, value, fill } = props as {
            x: number; y: number; width: number; height: number;
            name: string; value: number; fill: string;
          };
          const pct = Math.round((value / total) * 100);
          const showLabel = width > 50 && height > 30;
          const showPct = width > 60 && height > 46;
          return (
            <g>
              <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={6} fill={fill} fillOpacity={0.82} />
              {showLabel && (
                <text x={x + width / 2} y={y + height / 2 + (showPct ? -6 : 4)} textAnchor="middle" fontSize={Math.min(13, width / 6)} fontWeight={600} fill="white">
                  {truncateLabel(String(name), Math.floor(width / 7))}
                </text>
              )}
              {showPct && (
                <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fontSize={10} fill="white" opacity={0.85}>
                  {formatTick(value)} · {pct}%
                </text>
              )}
            </g>
          );
        }}
      />
    </ResponsiveContainer>
  );
}

// ─── CUSTOM SVG: TIMELINE ────────────────────────────────────────────────────

function parseTime(t: string | number): number {
  if (typeof t === "number") return t;
  const parts = t.split(":"); return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
}
function fmtTime(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
const timelineColors: Record<string, string> = { critical: "#ef4444", warning: "#f59e0b", minor: "#fb923c", info: "#3b82f6", ok: "#10b981" };

function TimelineChart({ spec }: { spec: ChartSpec }) {
  const events = spec.events ?? [];
  const starts = events.map((e) => parseTime(e.start));
  const ends = events.map((e) => parseTime(e.end));
  const timeMin = Math.min(...starts) - 10; const timeMax = Math.max(...ends) + 10;
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
          const startMin = starts[i] ?? 0; const endMin = ends[i] ?? startMin + 30;
          const x1 = labelW + ((startMin - timeMin) / timeRange) * chartW;
          const x2 = labelW + ((endMin - timeMin) / timeRange) * chartW;
          const y = padT + i * rowH + rowH * 0.2; const bh = rowH * 0.6;
          const color = timelineColors[ev.status ?? "info"] ?? timelineColors.info;
          const dur = endMin - startMin;
          return (
            <g key={i}>
              <text x={labelW - 8} y={y + bh / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">{truncateLabel(ev.label, 22)}</text>
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

// ─── CUSTOM SVG: GAUGE ───────────────────────────────────────────────────────

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
    const ir2 = r - strokeW - 5; const or2 = r + 7;
    const rad = ((180 + pct * 180) * Math.PI) / 180;
    return <line x1={cx + ir2 * Math.cos(rad)} y1={cy + ir2 * Math.sin(rad)} x2={cx + or2 * Math.cos(rad)} y2={cy + or2 * Math.sin(rad)} stroke={tc} strokeWidth="3" strokeLinecap="round" />;
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

// ─── CUSTOM SVG: FUNNEL ──────────────────────────────────────────────────────

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

// ─── CUSTOM SVG: HEATMAP ─────────────────────────────────────────────────────

function HeatmapChart({ spec }: { spec: ChartSpec }) {
  const allValues = spec.series.flatMap((s) => s.data);
  const minVal = Math.min(...allValues); const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;
  const labelW = 56; const padB = 60; const padT = 8; const padR = 12;
  const w = 680; const h = 320;
  const cw = w - labelW - padR; const ch = h - padT - padB;
  const cellW = cw / spec.labels.length; const cellH = ch / spec.series.length;
  const getColor = (v: number) => `rgba(37,99,235,${(0.07 + ((v - minVal) / range) * 0.88).toFixed(2)})`;
  const getTextColor = (v: number) => ((v - minVal) / range) > 0.55 ? "white" : "#1e3a8a";
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[480px] w-full">
        {spec.series.map((row, ri) => (
          <text key={row.name} x={labelW - 6} y={padT + ri * cellH + cellH / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">{truncateLabel(row.name, 8)}</text>
        ))}
        {spec.labels.map((label, li) => {
          const x = labelW + li * cellW + cellW / 2;
          return <text key={label + li} x={x} y={padT + ch + 16} textAnchor="middle" fontSize="10" fill="#6b7280" transform={`rotate(-40 ${x} ${padT + ch + 16})`}>{truncateLabel(label, 6)}</text>;
        })}
        {spec.series.map((row, ri) =>
          row.data.map((val, li) => {
            const x = labelW + li * cellW; const y = padT + ri * cellH;
            return (
              <g key={`${ri}-${li}`}>
                <rect x={x + 1} y={y + 1} width={cellW - 2} height={cellH - 2} rx="4" fill={getColor(val)} />
                {cellW > 30 && cellH > 18 && <text x={x + cellW / 2} y={y + cellH / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={getTextColor(val)}>{formatTick(val)}</text>}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}

// ─── CUSTOM SVG: WATERFALL ───────────────────────────────────────────────────

function WaterfallChart({ spec }: { spec: ChartSpec }) {
  const w = 680; const h = 320;
  const pad = { t: 18, r: 18, b: 52, l: 58 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const data = spec.series[0]?.data ?? [];
  const n = data.length;
  type WBar = { base: number; top: number; value: number; type: "base" | "delta" | "total" };
  const bars: WBar[] = [];
  let running = 0;
  data.forEach((v, i) => {
    if (i === 0) { bars.push({ base: 0, top: v, value: v, type: "base" }); running = v; }
    else if (i === n - 1) { bars.push({ base: 0, top: running, value: running, type: "total" }); }
    else { const nr = running + v; bars.push({ base: Math.min(running, nr), top: Math.max(running, nr), value: v, type: "delta" }); running = nr; }
  });
  const allPos = bars.flatMap((b) => [b.base, b.top]);
  const minY = Math.min(...allPos, 0); const maxY = Math.max(...allPos) * 1.1;
  const yRange = maxY - minY || 1;
  const ticks = Array.from({ length: 5 }, (_, i) => minY + (yRange / 4) * i);
  const toY = (v: number) => pad.t + ch - ((v - minY) / yRange) * ch;
  const groupW = cw / n; const barW = Math.max(groupW - 12, 16);
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
          let connector = null;
          if (i < bars.length - 1) {
            const nx = pad.l + (i + 1) * groupW + (groupW - barW) / 2;
            const cy2 = bar.type === "base" || bar.value >= 0 ? toY(bar.top) : toY(bar.base);
            connector = <line x1={x + barW} y1={cy2} x2={nx} y2={cy2} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />;
          }
          return (
            <g key={i}>
              <rect x={x} y={y1} width={barW} height={bh} rx="6" fill={color} opacity="0.88" />
              {connector}
              <text x={x + barW / 2} y={h - 18} textAnchor="middle" fontSize="11" fill="#6b7280">{truncateLabel(spec.labels[i] ?? "", 10)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── CUSTOM SVG: BOXPLOT ─────────────────────────────────────────────────────

function BoxplotChart({ spec }: { spec: ChartSpec }) {
  const getData = (li: number): [number, number, number, number, number] | null => {
    if (spec.boxData?.[li]) { const d = spec.boxData[li]!; if (d.length >= 5) return [d[0]!, d[1]!, d[2]!, d[3]!, d[4]!]; }
    if (spec.series.length >= 5) return [spec.series[0]!.data[li] ?? 0, spec.series[1]!.data[li] ?? 0, spec.series[2]!.data[li] ?? 0, spec.series[3]!.data[li] ?? 0, spec.series[4]!.data[li] ?? 0];
    return null;
  };
  const allVals = spec.labels.flatMap((_, i) => getData(i) ?? []);
  const w = 640; const h = 320;
  const pad = { t: 24, r: 18, b: 52, l: 50 };
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b;
  const minVal = Math.min(...allVals, 0); const maxVal = Math.max(...allVals, 0) * 1.08;
  const yRange = maxVal - minVal || 1;
  const ticks = Array.from({ length: 5 }, (_, i) => minVal + (yRange / 4) * i);
  const py = (v: number) => pad.t + ch - ((v - minVal) / yRange) * ch;
  const groupW = cw / spec.labels.length; const boxW = Math.min(groupW * 0.5, 48);
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
          const box = getData(i); if (!box) return null;
          const [mn, q1, med, q3, mx] = box;
          const cx2 = pad.l + i * groupW + groupW / 2;
          const color = defaultPalette[i % defaultPalette.length];
          return (
            <g key={label + i}>
              <line x1={cx2} y1={py(mn)} x2={cx2} y2={py(q1)} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1={cx2} y1={py(q3)} x2={cx2} y2={py(mx)} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1={cx2 - boxW * 0.3} y1={py(mn)} x2={cx2 + boxW * 0.3} y2={py(mn)} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <line x1={cx2 - boxW * 0.3} y1={py(mx)} x2={cx2 + boxW * 0.3} y2={py(mx)} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <rect x={cx2 - boxW / 2} y={py(q3)} width={boxW} height={Math.max(py(q1) - py(q3), 2)} rx="4" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.5" />
              <line x1={cx2 - boxW / 2} y1={py(med)} x2={cx2 + boxW / 2} y2={py(med)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <text x={cx2} y={h - 18} textAnchor="middle" fontSize="11" fill="#6b7280">{truncateLabel(label, 12)}</text>
              <text x={cx2 + boxW / 2 + 4} y={py(med) + 4} fontSize="9" fill={color} fontWeight="600">{formatTick(med)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── CUSTOM SVG: BULLET ──────────────────────────────────────────────────────

function BulletChart({ spec }: { spec: ChartSpec }) {
  const actualS = spec.series[0]; const targetS = spec.series[1]; const goodS = spec.series[2];
  if (!actualS || !targetS) return null;
  const allVals = spec.series.flatMap((s) => s.data);
  const globalMax = spec.max ?? (Math.max(...allVals, 0) * 1.15 || 1);
  const w = 600; const rowH = 44; const labelW = 130; const padR = 20; const padT = 10;
  const barW = w - labelW - padR;
  const h = padT + spec.labels.length * rowH + 20;
  const ticks = Array.from({ length: 6 }, (_, i) => (globalMax / 5) * i);
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto min-w-[400px] w-full">
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
          const actual = actualS.data[i] ?? 0; const target = targetS.data[i] ?? 0;
          const good = goodS?.data[i];
          const color = actualS.color ?? defaultPalette[0];
          const y = padT + i * rowH; const barH = 16; const barY = y + (rowH - barH) / 2;
          const toX = (v: number) => labelW + Math.min((v / globalMax), 1) * barW;
          return (
            <g key={label + i}>
              <text x={labelW - 8} y={barY + barH / 2 + 4} textAnchor="end" fontSize="11" fill="#6b7280">{truncateLabel(label, 18)}</text>
              {good !== undefined && <rect x={labelW} y={barY - 2} width={(good / globalMax) * barW} height={barH + 4} rx="4" fill="#10b981" opacity="0.08" />}
              <rect x={labelW} y={barY} width={barW} height={barH} rx="4" fill="#f1f5f9" />
              <rect x={labelW} y={barY + 3} width={toX(actual) - labelW} height={barH - 6} rx="3" fill={color} opacity="0.9" />
              <line x1={toX(target)} y1={barY - 4} x2={toX(target)} y2={barY + barH + 4} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              <text x={toX(actual) + 4} y={barY + barH / 2 + 4} fontSize="10" fill={color} fontWeight="700">{formatTick(actual)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function formatTick(v: number) {
  if (Math.abs(v) >= 1_000_000) return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (Math.abs(v) >= 1000) return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v);
}

function truncateLabel(label: string, max = 10) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
