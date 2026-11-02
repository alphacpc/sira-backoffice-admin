import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  bookingPaymentBadge, bookingStatusBadge, cancelReasonLabel, channelLabel, ticketStatusBadge, transactionStatusBadge,
} from "@/lib/labels";
import type { BookingDetail } from "@/lib/repos/sales";

const TAB_VALUES = ["resume", "chronologie", "paiements", "billets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BookingTabs({ detail, initialTab }: { detail: BookingDetail; initialTab?: string }) {
  const { booking: b } = detail;
  const status = bookingStatusBadge(b.status);
  const payment = bookingPaymentBadge(b.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Code">{b.bookingCode}</DetailRow>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${b.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Passager">
            {b.userId ? <Link href={`/utilisateurs/${b.userId}`} className="hover:underline">{b.passengerName}</Link> : b.passengerName}
          </DetailRow>
          <DetailRow label="Canal">{channelLabel(b.channel)}</DetailRow>
          <DetailRow label="Trajet">
            <Link href={`/flotte/trajets/${b.tripId}`} className="hover:underline">
              {detail.routeLabel} · {formatDateTime(detail.departure)}
            </Link>
          </DetailRow>
          <DetailRow label="Bus">{detail.busPlate}</DetailRow>
          <DetailRow label="Siège">{b.seatNumber ?? "—"}</DetailRow>
          <DetailRow label="Montant">{formatMoney(b.amount, b.currency)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Paiement"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></DetailRow>
          <DetailRow label="Billet émis">{b.ticketIssued ? "Oui" : "Non"}</DetailRow>
          <DetailRow label="Créée le">{formatDateTime(b.createdAt)}</DetailRow>
          <DetailRow label="Annulée le">{b.cancelledAt ? formatDateTime(b.cancelledAt) : "—"}</DetailRow>
          <DetailRow label="Cause de l'annulation">{b.cancelReason ? cancelReasonLabel(b.cancelReason) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "chronologie", label: "Chronologie",
      content: (
        <Card><CardContent>
          <ol className="space-y-2 text-sm">
            {detail.timeline.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex gap-4 border-b border-border pb-2 last:border-0">
                <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>
                <span>{e.label}</span>
              </li>
            ))}
          </ol>
        </CardContent></Card>
      ),
    },
    {
      value: "paiements", label: "Paiements",
      content: (
        <Card><CardContent>
          {detail.transactions.length === 0 ? <Empty>Aucun paiement pour cette réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Référence</th>
                  <th className="py-1 font-medium">Moyen</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Lancé le</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((t) => {
                  const badge = transactionStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/paiements/${t.id}`} className="font-medium hover:underline">{t.reference}</Link>
                      </td>
                      <td>{t.methodName}</td>
                      <td className="tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "billets", label: "Billets",
      content: (
        <Card><CardContent>
          {detail.tickets.length === 0 ? <Empty>Aucun billet émis pour cette réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Siège</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Émis le</th>
                  <th className="py-1 font-medium">Scans</th>
                </tr>
              </thead>
              <tbody>
                {detail.tickets.map((t) => {
                  const badge = ticketStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/billets/${t.ticketCode}`} className="font-medium hover:underline">{t.ticketCode}</Link>
                      </td>
                      <td>{t.seatNumber ?? "—"}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.issuedAt)}</td>
                      <td className="tabular-nums">{t.scanCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
