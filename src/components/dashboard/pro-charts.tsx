"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };
const TIP = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 } as const;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const compact = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".0", "")} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v));

/** Revenue as an area, bookings and paid bookings as lines on the right axis. */
export function SalesChart({ data, height = 300 }: { data: { day: string; revenue: number; bookings: number; paid: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Chiffre d'affaires et réservations par jour">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ea580c" stopOpacity={0.42} /><stop offset="100%" stopColor="#ea580c" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={dm} tick={AXIS} tickLine={false} axisLine={false} minTickGap={22} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={compact} />
          <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={32} />
          <Tooltip labelFormatter={(l) => dm(String(l))} contentStyle={TIP} formatter={(v, n) => (n === "Chiffre d'affaires" ? `${formatNumber(Number(v))} XOF` : formatNumber(Number(v)))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area yAxisId="l" type="monotone" dataKey="revenue" name="Chiffre d'affaires" stroke="#ea580c" strokeWidth={2.4} fill="url(#sales-fill)" />
          <Line yAxisId="r" type="monotone" dataKey="bookings" name="Réservations" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="paid" name="Payées" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Pareto: bars sorted by weight, cumulative share as a line, 80 % reference. */
export function ParetoChart({ items, unit = "", valueLabel = "Valeur", height = 300, color = "#ea580c" }: {
  items: { label: string; value: number; cumPct: number }[]; unit?: string; valueLabel?: string; height?: number; color?: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Diagramme de Pareto : ${items.map((i) => `${i.label} ${i.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={items} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} height={46}
            tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} angle={-18} textAnchor="end" />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={46} tickFormatter={compact} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 80, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip contentStyle={TIP} formatter={(v, n) => (n === "Cumul" ? `${v} %` : `${formatNumber(Number(v))}${unit}`)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="r" y={80} stroke="#e11d48" strokeDasharray="5 4" label={{ value: "80 %", fill: "#e11d48", fontSize: 10, position: "insideTopLeft" }} />
          <Bar yAxisId="l" dataKey="value" name={valueLabel} fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumul" stroke="#8b5cf6" strokeWidth={2.4} dot={{ r: 3, fill: "#8b5cf6" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
