import { ArrowRight, CalendarBlank, Crown, Receipt, Repeat, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney, nextBillingLabel } from "@/lib/format";
import { invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import type { CompanyDetail } from "@/lib/types";

type IconType = ComponentType<{ size?: number; weight?: "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}

export function SubscriptionPanel({ detail }: { detail: CompanyDetail }) {
  const { subscription: sub, invoices } = detail;
  const paid = invoices.filter((i) => i.status === "paid");
  const total = paid.reduce((n, i) => n + i.amount, 0);
  const currency = invoices[0]?.currency ?? sub?.currency ?? "XOF";

  if (!sub) {
    return <div className="rounded-card border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Aucun abonnement pour cette compagnie.</div>;
  }
  const badge = subscriptionStatusBadge(sub.status);
  const ended = sub.status === "canceled" || sub.status === "expired";
  const days = Math.ceil((Date.parse(sub.nextBillingDate) - Date.now()) / 86_400_000);
  const retryable = sub.status === "past_due" || sub.status === "suspended";
  const cycle = sub.billingCycle === "MONTHLY" ? "mois" : "an";

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Crown size={40} weight="duotone" aria-hidden className="text-orange-500" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan actuel</p>
              <h2 className="text-2xl font-semibold tracking-tight">{sub.planName}</h2>
            </div>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </div>
          <Link href={`/facturation/abonnements/${sub.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
            Voir l&apos;abonnement <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <p className="mt-6 text-4xl font-bold tracking-tight tabular-nums">
          {formatMoney(sub.price, sub.currency)}<span className="ml-1.5 text-base font-medium text-muted-foreground">/ {cycle}</span>
        </p>

        <dl className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
          <Info icon={CalendarBlank} label="Prochaine échéance">
            {nextBillingLabel(sub.status, sub.nextBillingDate)}
            {!ended && Number.isFinite(days) && <span className="ml-2 text-xs font-normal text-muted-foreground">{days < 0 ? `${-days} j de retard` : days === 0 ? "aujourd'hui" : `dans ${days} j`}</span>}
          </Info>
          <Info icon={Repeat} label="Facturation">{sub.billingCycle === "MONTHLY" ? "Mensuelle" : "Annuelle"}</Info>
          <Info icon={Receipt} label="Total encaissé">{formatMoney(total, currency)}<span className="ml-2 text-xs font-normal text-muted-foreground">{paid.length} facture{paid.length > 1 ? "s" : ""}</span></Info>
        </dl>

        {(sub.pastDueSince || retryable) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-danger">
              <Warning size={18} weight="fill" aria-hidden />
              {sub.status === "suspended" ? "Abonnement suspendu pour impayé" : "Paiement en attente"}
              {sub.pastDueSince ? ` depuis le ${formatDate(sub.pastDueSince)}` : ""}
            </p>
            {retryable && <RetryPaymentButton subscriptionId={sub.id} label={detail.company.name} />}
          </div>
        )}
        {sub.trialEndDate && sub.status === "trial" && (
          <p className="mt-5 flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-info">
            <CalendarBlank size={18} weight="fill" aria-hidden />Période d&apos;essai jusqu&apos;au {formatDate(sub.trialEndDate)}
          </p>
        )}
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 text-sm font-semibold">Factures</h3>
        {invoices.length === 0 ? <p className="text-sm text-muted-foreground">Aucune facture émise.</p> : (
          <ul className="divide-y divide-border">
            {invoices.map((i) => {
              const b = invoiceStatusBadge(i.status);
              return (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <Receipt size={26} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{i.number}</p>
                    <p className="text-xs text-muted-foreground">Émise le {formatDate(i.issuedAt)}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatMoney(i.amount, i.currency)}</p>
                  <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
