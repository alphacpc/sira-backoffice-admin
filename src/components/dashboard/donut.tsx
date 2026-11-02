"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";

const COLOR = {
  success: "var(--success)", info: "var(--info)", warning: "var(--warning)", danger: "var(--danger)",
  neutral: "var(--muted-foreground)", accent: "var(--accent)",
} as const;
export type DonutTone = keyof typeof COLOR;
type Slice = { label: string; value: number; tone?: DonutTone };

export function Donut({ data, centerLabel }: { data: Slice[]; centerLabel: string }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  const slices = data.map((d, i) => ({ ...d, color: COLOR[d.tone ?? (i === 0 ? "accent" : "info")] }));
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-36 shrink-0" role="img" aria-label={`${centerLabel} : ${slices.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius={46} outerRadius={64} paddingAngle={total ? 2 : 0} stroke="none">
              {slices.map((d) => <Cell key={d.label} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums">{formatNumber(total)}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
              {d.label}
            </span>
            <span className="tabular-nums text-muted-foreground">{formatNumber(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
