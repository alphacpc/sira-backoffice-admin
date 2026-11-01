import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { invoiceStatusBadge, paymentStatusBadge } from "@/lib/labels";
import { invoicesRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = invoicesRepo.detail(id);
  if (!detail) notFound();
  const { invoice, subscription, payment } = detail;
  const status = invoiceStatusBadge(invoice.status);
  const paymentBadge = payment ? paymentStatusBadge(payment.status) : null;

  return (
    <>
      <PageHeader
        title={`Facture ${invoice.number}`}
        description={`Émise le ${formatDate(invoice.issuedAt)}`}
        actions={<span data-testid="invoice-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <Card>
        <CardContent>
          <dl>
            <DetailRow label="Numéro">{invoice.number}</DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${invoice.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Abonnement">
              {subscription ? (
                <Link href={`/facturation/abonnements/${subscription.id}`} className="text-accent hover:underline">
                  Voir l&apos;abonnement
                </Link>
              ) : "—"}
            </DetailRow>
            <DetailRow label="Plan">{subscription?.planName ?? "—"}</DetailRow>
            <DetailRow label="Montant">{formatMoney(invoice.amount, invoice.currency)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Paiement associé">
              {payment && paymentBadge ? (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge tone={paymentBadge.tone}>{paymentBadge.label}</StatusBadge>
                  {formatDateTime(payment.at)}
                </span>
              ) : "Aucune tentative enregistrée"}
            </DetailRow>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Le PDF des factures n&apos;est pas disponible dans ce lot.</p>
        </CardContent>
      </Card>
    </>
  );
}
