"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ServiceHealth } from "@/lib/types";

const COLOR = { healthy: "var(--success)", degraded: "var(--warning)", down: "var(--danger)" } as const;

export function ServiceLatencyChart({ services }: { services: ServiceHealth[] }) {
  const data = services.map((s) => ({
    name: s.name.replace("-service", ""),
    ms: s.status === "down" ? 0 : s.responseTimeMs,
    status: s.status,
  }));
  return (
    <div className="h-56" role="img" aria-label="Temps de réponse par service, en millisecondes">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip
            formatter={(v) => [`${v} ms`, "Réponse"]}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.name} fill={COLOR[d.status]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
