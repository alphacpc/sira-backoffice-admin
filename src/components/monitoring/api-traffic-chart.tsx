"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of one day of aggregated traffic: counts only. */
export interface ApiTrafficPoint { label: string; ok: number; clientErrors: number; serverErrors: number }

export function ApiTrafficChart({ points }: { points: ApiTrafficPoint[] }) {
  return (
    <div className="h-64" role="img" aria-label="Requêtes par jour, par classe de statut">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ok" name="2xx" stackId="a" fill="var(--success)" />
          <Bar dataKey="clientErrors" name="4xx" stackId="a" fill="var(--warning)" />
          <Bar dataKey="serverErrors" name="5xx" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
