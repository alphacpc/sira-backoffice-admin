import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  billingCycleLabel, changeKindLabel, invoiceStatusBadge, paymentStatusBadge, subscriptionStatusBadge,
} from "@/lib/labels";
import type { SubscriptionDetail } from "@/lib/repos/billing";

const TAB_VALUES = ["resume", "historique", "tentatives", "factures"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function SubscriptionTabs({ detail, initialTab }: { detail: SubscriptionDetail; initialTab?: string }) {
  const { subscription: sub, plan } = detail;
  const status = subscriptionStatusBadge(sub.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${sub.companyId}?onglet=abonnement`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Plan">
            {plan ? <Link href={`/offre/plans/${plan.id}`} className="hover:underline">{sub.planName}</Link> : sub.planName}
          </DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Cycle de facturation">{billingCycleLabel(sub.billingCycle)}</DetailRow>
          <DetailRow label="Prix">{formatMoney(sub.price, sub.currency)}</DetailRow>
          <DetailRow label="Prochaine échéance">{formatDate(sub.nextBillingDate)}</DetailRow>
          <DetailRow label="Fin de l'essai">{sub.trialEndDate ? formatDate(sub.trialEndDate) : "—"}</DetailRow>
          <DetailRow label="Impayé depuis">{sub.pastDueSince ? formatDate(sub.pastDueSince) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "historique", label: "Historique des changements de plan",
      content: (
        <Card><CardContent>
          {detail.history.length === 0 ? <Empty>Aucun changement enregistré.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Changement</th>
                  <th className="py-1 font-medium">Ancien plan</th>
                  <th className="py-1 font-medium">Nouveau plan</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-1.5">{formatDate(h.at)}</td>
                    <td>{changeKindLabel(h.kind)}</td>
                    <td>{h.fromPlan ?? "—"}</td>
                    <td>{h.toPlan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "tentatives", label: "Tentatives de paiement",
      content: (
        <Card><CardContent>
          {detail.payments.length === 0 ? <Empty>Aucune tentative de paiement.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Motif</th>
                  <th className="py-1 font-medium">Facture</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((p) => {
                  const b = paymentStatusBadge(p.status);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(p.at)}</td>
                      <td className="tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="text-muted-foreground">{p.reason ?? "—"}</td>
                      <td>
                        {p.invoiceId && p.invoiceNumber ? (
                          <Link href={`/facturation/factures/${p.invoiceId}`} className="hover:underline">{p.invoiceNumber}</Link>
                        ) : "—"}
                      </td>
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
      value: "factures", label: "Factures",
      content: (
        <Card><CardContent>
          {detail.invoices.length === 0 ? <Empty>Aucune facture.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Numéro</th>
                  <th className="py-1 font-medium">Émise le</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {detail.invoices.map((i) => {
                  const b = invoiceStatusBadge(i.status);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/facturation/factures/${i.id}`} className="font-medium hover:underline">{i.number}</Link>
                      </td>
                      <td>{formatDate(i.issuedAt)}</td>
                      <td className="tabular-nums">{formatMoney(i.amount, i.currency)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
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
