import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { bookingPaymentBadge, bookingStatusBadge, transactionStatusBadge } from "@/lib/labels";
import { transactionsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = transactionsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { transaction: t, booking: b } = detail;
  const status = transactionStatusBadge(t.status);
  const bStatus = bookingStatusBadge(b.status);
  const bPayment = bookingPaymentBadge(b.paymentStatus);
  return (
    <>
      <PageHeader
        title={`Paiement ${t.reference}`}
        description={`${t.passengerName} · ${t.companyName}`}
        actions={<span data-testid="transaction-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      {detail.anomalies.length > 0 && (
        <Card className="mb-4 border-danger/40">
          <CardHeader><CardTitle>Incohérences détectées</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {detail.anomalies.map((a) => (
                <li key={a.kind} data-testid={`anomaly-${a.kind}`}>
                  <StatusBadge tone="danger">{a.label}</StatusBadge>
                  <span className="ml-2">{a.explanation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Transaction</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Référence">{t.reference}</DetailRow>
            <DetailRow label="Moyen de paiement">{t.methodName}</DetailRow>
            <DetailRow label="Montant">{formatMoney(t.amount, t.currency)}</DetailRow>
            <DetailRow label="Lancé le">{formatDateTime(t.createdAt)}</DetailRow>
            <DetailRow label="Terminé le">{t.completedAt ? formatDateTime(t.completedAt) : "—"}</DetailRow>
            <DetailRow label="Motif d'échec">{t.failureReason ?? "—"}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Réservation</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Code">
              <Link href={`/ventes/reservations/${b.id}`} className="hover:underline">{b.bookingCode}</Link>
            </DetailRow>
            <DetailRow label="Passager">{b.passengerName}</DetailRow>
            <DetailRow label="Siège">{b.seatNumber ?? "—"}</DetailRow>
            <DetailRow label="Montant de la réservation">{formatMoney(b.amount, b.currency)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={bStatus.tone}>{bStatus.label}</StatusBadge></DetailRow>
            <DetailRow label="Paiement"><StatusBadge tone={bPayment.tone}>{bPayment.label}</StatusBadge></DetailRow>
          </dl></CardContent>
        </Card>
      </div>
    </>
  );
}
