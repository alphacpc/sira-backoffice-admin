import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { featureKindLabel, planStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import { plansRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = plansRepo.detail(id);
  if (!detail) notFound();
  const { plan, features, subscriptions } = detail;
  const status = planStatusBadge(plan.status);

  return (
    <>
      <PageHeader
        title={`Plan ${plan.name}`}
        description={`Code : ${plan.code}`}
        actions={<span data-testid="plan-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tarifs</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Prix mensuel">{formatMoney(plan.priceMonthly, plan.currency)}</DetailRow>
              <DetailRow label="Prix annuel">{formatMoney(plan.priceYearly, plan.currency)}</DetailRow>
              <DetailRow label="Frais d'installation">{formatMoney(plan.setupFee, plan.currency)}</DetailRow>
              <DetailRow label="Période d'essai">{plan.trialDays > 0 ? `${plan.trialDays} jours` : "Aucune"}</DetailRow>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Limites</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Utilisateurs maximum">{formatNumber(plan.limits.maxUsers)}</DetailRow>
              <DetailRow label="Bus maximum">{formatNumber(plan.limits.maxBuses)}</DetailRow>
            </dl>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Fonctionnalités incluses ({features.length})</CardTitle></CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fonctionnalité incluse.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {features.map((f) => (
                  <li key={f.code} className="flex items-center justify-between">
                    <span>{f.name} <span className="font-mono text-xs text-muted-foreground">{f.code}</span></span>
                    <StatusBadge tone="info">{featureKindLabel(f.kind)}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Abonnements liés ({subscriptions.length})</CardTitle></CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun abonnement sur ce plan.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Compagnie</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Prix</th>
                    <th className="py-1 font-medium">Prochaine échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => {
                    const b = subscriptionStatusBadge(s.status);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-1.5">
                          <Link href={`/facturation/abonnements/${s.id}`} className="font-medium hover:underline">{s.companyName}</Link>
                        </td>
                        <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                        <td className="tabular-nums">{formatMoney(s.price, s.currency)}</td>
                        <td>{formatDate(s.nextBillingDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
