import { ArrowRight, Buildings, CalendarBlank, CreditCard, Crown, Receipt } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { liveInvoiceDetail } from "@/lib/api/billing-live";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { invoiceStatusBadge, paymentStatusBadge } from "@/lib/labels";
import { invoicesRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = isLive() ? await liveInvoiceDetail(id) : invoicesRepo.detail(id);
  if (!detail) notFound();
  const { invoice, subscription, payment } = detail;
  const status = invoiceStatusBadge(invoice.status);
  const paymentBadge = payment ? paymentStatusBadge(payment.status) : null;
  const link = "text-accent-text hover:underline";

  return (
    <>
      <PageHeader
        title={`Facture ${invoice.number}`}
        description={`Émise le ${formatDate(invoice.issuedAt)}`}
        actions={<span data-testid="invoice-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Receipt size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-bold">{invoice.number}</p>
            <p className="text-sm text-muted-foreground">{detail.companyName}</p>
          </div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <p className="text-4xl font-bold tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</p>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-card border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-sm font-semibold">Détails</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={Buildings} label="Compagnie">
                <Link href={`/compagnies/${invoice.companyId}`} className={link}>{detail.companyName}</Link>
              </Info>
              <Info icon={CalendarBlank} label="Date d'émission">{formatDate(invoice.issuedAt)}</Info>
              <Info icon={Crown} label="Plan">{subscription?.planName ?? "—"}</Info>
              <Info icon={ArrowRight} label="Abonnement">
                {subscription ? <Link href={`/facturation/abonnements/${subscription.id}`} className={link}>Voir l&apos;abonnement</Link> : "—"}
              </Info>
            </div>
          </section>

          <section className="rounded-card border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-sm font-semibold">Paiement associé</h3>
            {payment && paymentBadge ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CreditCard size={28} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                  <StatusBadge tone={paymentBadge.tone}>{paymentBadge.label}</StatusBadge>
                  <span className="ml-auto text-lg font-bold tabular-nums">{formatMoney(payment.amount, payment.currency)}</span>
                </div>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex justify-between py-2"><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{formatDateTime(payment.at)}</dd></div>
                  {payment.reason && <div className="flex justify-between py-2"><dt className="text-muted-foreground">Motif</dt><dd className="font-medium">{payment.reason}</dd></div>}
                </dl>
              </div>
            ) : <p className="text-sm text-muted-foreground">Aucune tentative enregistrée.</p>}
          </section>
        </div>
        <p className="text-xs text-muted-foreground">Le PDF des factures n&apos;est pas disponible dans ce lot.</p>
      </div>
    </>
  );
}
