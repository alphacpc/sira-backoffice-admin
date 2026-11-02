import { ArrowDownRight, ArrowUpRight, Minus } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export const OK = "#16a34a";
export const WARN = "#f59e0b";
export const BAD = "#e11d48";
export const ACCENT = "#ea580c";
export const INFO = "#0ea5e9";
export const VIOLET = "#8b5cf6";

/** A Grafana-style panel: white card, title bar, free content. */
export function Panel({ title, subtitle, right, children, className }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("rounded-2xl bg-white p-5 shadow-card dark:bg-card", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate font-semibold">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Change against the previous period. `inverse`: an increase is bad (errors, latency). */
export function Delta({ value, inverse = false, suffix = "%" }: { value: number | null; inverse?: boolean; suffix?: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground"><Minus size={12} aria-hidden />0{suffix}</span>;
  const bad = inverse ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold", bad ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" : "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300")}>
      <Icon size={12} weight="bold" aria-hidden />{Math.abs(value)}{suffix}
    </span>
  );
}

export function Sparkline({ values, color = ACCENT, height = 36, fill = true }: { values: number[]; color?: string; height?: number; fill?: boolean }) {
  if (values.length < 2) return <div style={{ height }} />;
  const w = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 3 - ((v - min) / span) * (height - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}-${values.length}-${Math.round(max)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      {fill && <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Stat panel with a sparkline underneath, like a Grafana "stat". */
export function StatPanel({ label, value, unit, delta, inverse, hint, spark, color = ACCENT, icon: Icon, tone }: {
  label: string; value: string; unit?: string; delta?: number | null; inverse?: boolean; hint?: string; spark?: number[]; color?: string;
  icon: ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean }>; tone?: "ok" | "warn" | "bad";
}) {
  const ring = tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-card dark:bg-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: `${color}22`, color }}><Icon size={20} weight="duotone" aria-hidden /></span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={cn("text-3xl font-extrabold leading-none tracking-tight tabular-nums", ring)}>{value}{unit && <span className="ml-1 text-base font-semibold text-muted-foreground">{unit}</span>}</p>
        {delta !== undefined && <Delta value={delta} inverse={inverse} />}
      </div>
      {hint && <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p>}
      {spark && <div className="mt-3"><Sparkline values={spark} color={color} /></div>}
    </div>
  );
}

/** Half-circle gauge: `value` out of `max`, coloured by `tone`. */
export function Gauge({ value, max = 100, label, caption, tone = "ok" }: { value: number; max?: number; label: string; caption?: string; tone?: "ok" | "warn" | "bad" }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const R = 52;
  const len = Math.PI * R;
  const color = tone === "bad" ? BAD : tone === "warn" ? WARN : OK;
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label} : ${Math.round(pct * 100)} %`}>
      <svg viewBox="0 0 120 72" className="w-full max-w-60">
        <path d="M8 64 A52 52 0 0 1 112 64" fill="none" stroke="var(--muted)" strokeWidth={11} strokeLinecap="round" />
        <path d="M8 64 A52 52 0 0 1 112 64" fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" strokeDasharray={`${len * pct} ${len}`} />
      </svg>
      <p className="-mt-9 text-3xl font-extrabold tabular-nums">{label}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

const STATE_COLOR = { healthy: OK, degraded: WARN, down: BAD } as const;
const STATE_LABEL = { healthy: "Opérationnel", degraded: "Dégradé", down: "En panne" } as const;

/** One coloured cell per check: the state timeline of a service. */
export function StateTimeline({ states, height = 22 }: { states: { at: string; status: keyof typeof STATE_COLOR; ms: number }[]; height?: number }) {
  return (
    <div className="flex gap-px" role="img" aria-label={`${states.length} contrôles`}>
      {states.map((s) => (
        <span key={s.at} title={`${s.at.slice(11, 16)} UTC · ${STATE_LABEL[s.status]} · ${s.ms} ms`} className="flex-1 rounded-[2px]" style={{ height, background: STATE_COLOR[s.status], opacity: s.status === "healthy" ? 0.85 : 1 }} />
      ))}
    </div>
  );
}

/** Intensity grid: one row per series, one cell per day. */
export function Heatmap({ rows, days, tone = "rose", format }: {
  rows: { label: string; badge?: string; cells: { day: string; value: number; title: string }[] }[]; days: string[]; tone?: "rose" | "accent"; format?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c.value)));
  const base = tone === "rose" ? BAD : ACCENT;
  void format;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <p className="w-44 shrink-0 truncate font-mono text-xs" title={r.label}>{r.badge && <span className="mr-1.5 font-sans font-bold text-muted-foreground">{r.badge}</span>}{r.label}</p>
            <div className="flex flex-1 gap-1">
              {r.cells.map((c) => (
                <span key={c.day} title={c.title} className="h-6 flex-1 rounded-[4px] bg-muted/70"
                  style={c.value > 0 ? { background: `color-mix(in srgb, ${base} ${Math.round(12 + (c.value / max) * 80)}%, transparent)` } : undefined} />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
          <span className="w-44 shrink-0" />
          <div className="flex flex-1 justify-between"><span>{days[0]?.slice(8, 10)}/{days[0]?.slice(5, 7)}</span><span>{days.at(-1)?.slice(8, 10)}/{days.at(-1)?.slice(5, 7)}</span></div>
        </div>
      </div>
    </div>
  );
}
