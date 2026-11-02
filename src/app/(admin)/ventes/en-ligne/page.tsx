import Link from "next/link";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber } from "@/lib/format";
import { ONLINE_UNPAID_TTL_MINUTES, onlineRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default function OnlineSalesPage() {
  const stats = onlineRepo.stats(new Date());
  return (
    <>
      <PageHeader
        title="Libre-service en ligne"
        description={`Réservations faites par les voyageurs eux-mêmes. Une réservation non payée expire ${ONLINE_UNPAID_TTL_MINUTES} minutes après sa création.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div data-testid="online-total"><KpiCard label="Réservations en ligne" value={formatNumber(stats.total)} hint={`${formatNumber(stats.paid)} payées`} /></div>
        <div data-testid="online-conversion">
          <KpiCard label="Taux de conversion" value={stats.conversionPercent === null ? "—" : `${stats.conversionPercent} %`} hint="Réservations payées / réservations créées" />
        </div>
        <div data-testid="online-failed">
          <KpiCard label="Paiements échoués" value={formatNumber(stats.failedPayments)} tone={stats.failedPayments > 0 ? "warning" : "default"} />
        </div>
        <div data-testid="online-expired">
          <KpiCard label="Réservations expirées" value={formatNumber(stats.expired)} hint="Non payées à temps" />
        </div>
        <div data-testid="online-stuck">
          <KpiCard label="Paiements bloqués" value={formatNumber(stats.stuck)} tone={stats.stuck > 0 ? "danger" : "default"} hint="En attente depuis plus de 30 minutes" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Réservations non payées qui vont expirer</CardTitle></CardHeader>
        <CardContent>
          {stats.expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune réservation en attente de paiement.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Passager</th>
                  <th className="py-1 font-medium">Compagnie</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {stats.expiring.map((e) => (
                  <tr key={e.id} data-testid="expiring-row" className="border-t border-border">
                    <td className="py-1.5">
                      <Link href={`/ventes/reservations/${e.id}`} className="font-medium hover:underline">{e.bookingCode}</Link>
                    </td>
                    <td>{e.passengerName}</td>
                    <td>{e.companyName}</td>
                    <td className="tabular-nums">{formatMoney(e.amount, e.currency)}</td>
                    <td>{e.minutesLeft <= 0 ? "Expiration imminente" : `Dans ${e.minutesLeft} min`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
