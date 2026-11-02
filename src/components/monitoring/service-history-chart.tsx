"use client";

import { ChartDataTable } from "./chart-data-table";
import { serviceHistoryTable } from "@/lib/chart-rows";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of a check: a UTC time label, the response time and the status. */
export interface ServiceHistoryPoint { label: string; ms: number; status: "healthy" | "degraded" | "down" }

const COLOR = { healthy: "var(--success)", degraded: "var(--warning)", down: "var(--danger)" } as const;

export function ServiceHistoryChart({ service, points }: { service: string; points: ServiceHistoryPoint[] }) {
  return (
    <div>
    <div className="h-64" role="img" aria-label={`Temps de réponse des ${points.length} derniers contrôles de ${service}, en millisecondes`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={5} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip
            formatter={(v) => [`${v} ms`, "Réponse"]}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="ms" radius={[2, 2, 0, 0]}>
            {points.map((p, i) => <Cell key={i} fill={COLOR[p.status]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ChartDataTable table={serviceHistoryTable(points)} />
    </div>
  );
}
