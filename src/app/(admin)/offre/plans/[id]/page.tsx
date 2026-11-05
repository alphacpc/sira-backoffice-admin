import { Bus, CheckCircle, Crown, Gift, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatMoney, formatNumber, nextBillingLabel } from "@/lib/format";
import { featureKindLabel, planStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import { plansRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ icon: Icon, label, children }: { icon?: IconType; label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      {Icon && <Icon size={24} weight="duotone" aria-hidden className="mb-2 text-orange-500" />}
      <p className="text-xl font-bold tabular-nums">{children}</p>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = plansRepo.detail(id);
  if (!detail) notFound();
  const { plan, features, subscriptions } = detail;
  const status = planStatusBadge(plan.status);
  const mrr = subscriptions.filter((s) => s.status === "active").reduce((a, s) => a + (s.billingCycle === "MONTHLY" ? s.price : s.price / 12), 0);

  return (
    <>
      <PageHeader
        title={`Plan ${plan.name}`}
        description={`Code : ${plan.code}`}
        actions={<span data-testid="plan-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Crown size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{plan.name}</p>
            <p className="text-sm text-muted-foreground">{subscriptions.length} abonnement{subscriptions.length > 1 ? "s" : ""} · revenu mensuel récurrent {formatMoney(Math.round(mrr), plan.currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums">{formatMoney(plan.priceMonthly, plan.currency)}</p>
            <p className="text-sm text-muted-foreground">par mois</p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Tarifs">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Prix annuel">{formatMoney(plan.priceYearly, plan.currency)}</Stat>
              <Stat label="Frais d'installation">{formatMoney(plan.setupFee, plan.currency)}</Stat>
              <Stat icon={Gift} label="Période d'essai">{plan.trialDays > 0 ? `${plan.trialDays} jours` : "Aucune"}</Stat>
            </div>
          </Section>
          <Section title="Limites">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={UsersThree} label="Utilisateurs maximum">{formatNumber(plan.limits.maxUsers)}</Stat>
              <Stat icon={Bus} label="Bus maximum">{formatNumber(plan.limits.maxBuses)}</Stat>
            </div>
          </Section>
        </div>

        <Section title={`Fonctionnalités incluses (${features.length})`}>
          {features.length === 0 ? <p className="text-sm text-muted-foreground">Aucune fonctionnalité incluse.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.code} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <CheckCircle size={22} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{f.code}</p>
                  </div>
                  <StatusBadge tone="info">{featureKindLabel(f.kind)}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Abonnements liés (${subscriptions.length})`}>
          {subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">Aucun abonnement sur ce plan.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr><th className={TH}>Compagnie</th><th className={TH}>Statut</th><th className={`${TH} text-right`}>Prix</th><th className={TH}>Prochaine échéance</th></tr>
                </thead>
                <tbody className="[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">
                  {subscriptions.map((s) => {
                    const b = subscriptionStatusBadge(s.status);
                    return (
                      <tr key={s.id}>
                        <td><Link href={`/facturation/abonnements/${s.id}`} className="font-medium hover:underline">{s.companyName}</Link></td>
                        <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                        <td className="text-right tabular-nums">{formatMoney(s.price, s.currency)}</td>
                        <td>{nextBillingLabel(s.status, s.nextBillingDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
