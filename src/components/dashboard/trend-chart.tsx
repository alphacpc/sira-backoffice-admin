"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Point = { day: string; bookings: number; revenue: number };
const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };

export function TrendChart({ data }: { data: Point[] }) {
  const [metric, setMetric] = useState<"revenue" | "bookings">("revenue");
  const label = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
  return (
    <div>
      <div role="tablist" aria-label="Indicateur" className="mb-3 inline-flex rounded-lg bg-muted p-1 text-xs font-medium">
        {([["revenue", "Chiffre d'affaires"], ["bookings", "Réservations"]] as const).map(([key, text]) => (
          <button
            key={key} role="tab" type="button" aria-selected={metric === key} onClick={() => setMetric(key)}
            className={cn("rounded-md px-3 py-1.5 transition-colors", metric === key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="h-64" role="img" aria-label="Évolution sur 14 jours">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tickFormatter={label} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={AXIS} tickLine={false} axisLine={false} width={44}
              tickFormatter={(v: number) => (metric === "revenue" ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              labelFormatter={(l) => label(String(l))}
              formatter={(v) => [metric === "revenue" ? formatMoney(Number(v), "XOF") : formatNumber(Number(v)), metric === "revenue" ? "CA" : "Réservations"]}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
            />
            <Area type="monotone" dataKey={metric} stroke="var(--accent)" strokeWidth={2.5} fill="url(#trend-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
