import { Package, Pulse, Ticket } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType, ReactNode } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { formatMoney, formatNumber } from "@/lib/format";
import { parcelStatusBadge } from "@/lib/labels";
import type { CompanyDetail } from "@/lib/types";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;
const METRIC_ICON: Record<string, IconType> = { bookings_created: Ticket, parcels_created: Package, api_calls: Pulse };

function Table({ title, head, children, empty }: { title: string; head: { label: string; right?: boolean }[]; children: ReactNode; empty: boolean }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {empty ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {head.map((h) => <th key={h.label} className={`py-2 font-medium ${h.right ? "text-right" : "text-left"}`}>{h.label}</th>)}
              </tr>
            </thead>
            <tbody className="[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">{children}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const num = "text-right tabular-nums";

export function UsagePanel({ detail }: { detail: CompanyDetail }) {
  const { usage, usageBreakdown: u } = detail;
  const totalBookings = u.bookings.reduce((a, r) => a + r.count, 0);
  const totalParcels = u.parcels.reduce((a, r) => a + r.count, 0);
  const totalApi = u.api.reduce((a, r) => a + r.count, 0);
  return (
    <div className="space-y-5">
      {usage.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée d&apos;utilisation.</p> : (
        <div className="grid gap-4 sm:grid-cols-3">
          {usage.map((m) => {
            const Icon = METRIC_ICON[m.metricCode] ?? Pulse;
            return (
              <div key={m.metricCode} className="rounded-card border border-border bg-card p-5 shadow-card">
                <Icon size={28} weight="duotone" aria-hidden className="text-orange-500" />
                <p className="mt-3 text-3xl font-bold tabular-nums">{formatNumber(m.value)}</p>
                <p className="text-sm text-muted-foreground">{m.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <Table title={`Réservations (${formatNumber(totalBookings)})`} empty={u.bookings.length === 0}
        head={[{ label: "Canal" }, { label: "Statut" }, { label: "Nombre", right: true }, { label: "Montant", right: true }]}>
        {u.bookings.map((r) => (
          <tr key={`${r.channel}${r.status}`}>
            <td>{r.channel === "online" ? "En ligne" : "Guichet"}</td>
            <td><StatusBadge tone={r.status === "confirmed" ? "success" : "neutral"}>{r.status === "confirmed" ? "Confirmée" : "Annulée"}</StatusBadge></td>
            <td className={num}>{formatNumber(r.count)}</td>
            <td className={num}>{formatMoney(r.amount, r.currency)}</td>
          </tr>
        ))}
      </Table>

      <Table title={`Colis (${formatNumber(totalParcels)})`} empty={u.parcels.length === 0}
        head={[{ label: "Statut" }, { label: "Nombre", right: true }, { label: "Frais d'expédition", right: true }]}>
        {u.parcels.map((r) => {
          const b = parcelStatusBadge(r.status);
          return (
            <tr key={r.status}>
              <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
              <td className={num}>{formatNumber(r.count)}</td>
              <td className={num}>{formatMoney(r.fees, r.currency)}</td>
            </tr>
          );
        })}
      </Table>

      <Table title={`Appels API (${formatNumber(totalApi)})`} empty={u.api.length === 0}
        head={[{ label: "Méthode" }, { label: "Endpoint" }, { label: "Appels", right: true }, { label: "Erreurs", right: true }, { label: "Moy. (ms)", right: true }, { label: "Max (ms)", right: true }]}>
        {u.api.map((r) => (
          <tr key={`${r.method}${r.endpoint}`}>
            <td className="font-mono text-xs">{r.method}</td>
            <td className="font-mono text-xs">{r.endpoint}</td>
            <td className={num}>{formatNumber(r.count)}</td>
            <td className={num}>{r.errors > 0 ? <span className="text-danger">{formatNumber(r.errors)}</span> : "0"}</td>
            <td className={num}>{formatNumber(r.avgResponseMs)}</td>
            <td className={num}>{formatNumber(r.maxResponseMs)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
