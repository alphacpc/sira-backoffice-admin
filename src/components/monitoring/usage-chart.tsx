"use client";

import { ChartDataTable } from "./chart-data-table";
import { usageTable } from "@/lib/chart-rows";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of one day of product events: counts per category only. */
export interface UsagePoint { label: string; booking: number; parcel: number; customer: number }

export function UsageChart({ points }: { points: UsagePoint[] }) {
  return (
    <div>
    <div className="h-64" role="img" aria-label="Événements produit par jour, par catégorie">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="booking" name="Réservations" stackId="a" fill="var(--accent)" />
          <Bar dataKey="parcel" name="Colis" stackId="a" fill="var(--info)" />
          <Bar dataKey="customer" name="Clients" stackId="a" fill="var(--success)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ChartDataTable table={usageTable(points)} />
    </div>
  );
}
