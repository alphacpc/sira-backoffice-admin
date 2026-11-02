"use client";

import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };
const TIP = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 } as const;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const SERIES_COLORS = ["#ea580c", "#0ea5e9", "#16a34a", "#8b5cf6", "#e11d48", "#f59e0b", "#14b8a6", "#64748b", "#d946ef", "#84cc16"];

/** Calls per day (stacked by class) and the 5xx rate as a line on the right axis. */
export function TrafficChart({ data, height = 280 }: { data: { day: string; ok: number; c4: number; c5: number; err5: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Requêtes par jour et taux d'erreur serveur">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={dm} tick={AXIS} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatNumber(v)} />
          <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip labelFormatter={(l) => dm(String(l))} contentStyle={TIP} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="l" dataKey="ok" name="2xx" stackId="a" fill="#0ea5e9" />
          <Bar yAxisId="l" dataKey="c4" name="4xx" stackId="a" fill="#f59e0b" />
          <Bar yAxisId="l" dataKey="c5" name="5xx" stackId="a" fill="#e11d48" radius={[3, 3, 0, 0]} />
          <Line yAxisId="r" dataKey="err5" name="Taux 5xx" type="monotone" stroke="#8b5cf6" strokeWidth={2.2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily average and maximum latency, with the latency budget as a reference line. */
export function LatencyChart({ data, budget, height = 260 }: { data: { day: string; avgMs: number; maxMs: number }[]; budget?: number; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Latence moyenne par jour">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lat-avg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ea580c" stopOpacity={0.4} /><stop offset="100%" stopColor="#ea580c" stopOpacity={0} /></linearGradient>
            
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={dm} tick={AXIS} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v} ms`} />
          <Tooltip labelFormatter={(l) => dm(String(l))} formatter={(v) => `${formatNumber(Number(v))} ms`} contentStyle={TIP} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {budget && <ReferenceLine y={budget} stroke="#e11d48" strokeDasharray="5 4" label={{ value: `Budget ${budget} ms`, fill: "#e11d48", fontSize: 10, position: "insideTopRight" }} />}
          <Area type="monotone" dataKey="avgMs" name="Moyenne" stroke="#ea580c" strokeWidth={2.4} fill="url(#lat-avg)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Response time of several services over the last 24 hours. */
export function ServiceLinesChart({ data, series, height = 300 }: { data: Record<string, number | string>[]; series: string[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Temps de réponse des services sur 24 heures">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v} ms`} />
          <Tooltip contentStyle={TIP} formatter={(v) => `${v} ms`} labelFormatter={(l) => `${l} UTC`} />
          <ReferenceLine y={1000} stroke="#e11d48" strokeDasharray="5 4" label={{ value: "Seuil dégradé 1 s", fill: "#e11d48", fontSize: 10, position: "insideTopRight" }} />
          {series.map((s, i) => <Line key={s} type="monotone" dataKey={s} name={s} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={1.8} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Fleet-wide availability and average latency across the last 24 hours. */
export function FleetChart({ data, height = 240 }: { data: { at: string; avg: number; max: number; availability: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, t: d.at.slice(11, 16) }));
  return (
    <div style={{ height }} role="img" aria-label="Latence moyenne et disponibilité de la flotte sur 24 heures">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs><linearGradient id="fleet-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v} ms`} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip contentStyle={TIP} labelFormatter={(l) => `${l} UTC`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area yAxisId="l" type="monotone" dataKey="avg" name="Latence moyenne" stroke="#0ea5e9" strokeWidth={2.2} fill="url(#fleet-fill)" />
          <Line yAxisId="r" type="stepAfter" dataKey="availability" name="Disponibilité" stroke="#16a34a" strokeWidth={2.2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Product events per day, stacked by category. */
export function UsageAreaChart({ data, height = 280 }: { data: { day: string; booking: number; parcel: number; customer: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Événements produit par jour">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            {[["u-b", "#ea580c"], ["u-p", "#0ea5e9"], ["u-c", "#16a34a"]].map(([id, c]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.5} /><stop offset="100%" stopColor={c} stopOpacity={0.05} /></linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={dm} tick={AXIS} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={36} />
          <Tooltip labelFormatter={(l) => dm(String(l))} contentStyle={TIP} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="booking" name="Réservations" stackId="1" stroke="#ea580c" strokeWidth={2} fill="url(#u-b)" />
          <Area type="monotone" dataKey="parcel" name="Colis" stackId="1" stroke="#0ea5e9" strokeWidth={2} fill="url(#u-p)" />
          <Area type="monotone" dataKey="customer" name="Clients" stackId="1" stroke="#16a34a" strokeWidth={2} fill="url(#u-c)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
