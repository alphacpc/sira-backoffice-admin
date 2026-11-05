import { Buildings, CalendarBlank, CreditCard, Crown, Receipt, Timer, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { formatDate, formatDateTime, formatMoney, nextBillingLabel } from "@/lib/format";
import {
  billingCycleLabel, changeKindLabel, invoiceStatusBadge, paymentStatusBadge, subscriptionStatusBadge,
} from "@/lib/labels";
import type { SubscriptionDetail } from "@/lib/repos/billing";

const TAB_VALUES = ["resume", "historique", "tentatives", "factures"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) {
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function SubscriptionTabs({ detail, initialTab }: { detail: SubscriptionDetail; initialTab?: string }) {
  const { subscription: sub, plan } = detail;
  const status = subscriptionStatusBadge(sub.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Panel title="Vue d'ensemble">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
            <Crown size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">
                {plan ? <Link href={`/offre/plans/${plan.id}`} className="hover:underline">{sub.planName}</Link> : sub.planName}
              </p>
              <p className="text-sm text-muted-foreground">{billingCycleLabel(sub.billingCycle)}</p>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(sub.price, sub.currency)}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Buildings} label="Compagnie">
              <Link href={`/compagnies/${sub.companyId}?onglet=abonnement`} className="hover:underline">{detail.companyName}</Link>
            </Info>
            <Info icon={CalendarBlank} label="Prochaine échéance">{nextBillingLabel(sub.status, sub.nextBillingDate)}</Info>
            <Info icon={Timer} label="Fin de l'essai">{sub.trialEndDate ? formatDate(sub.trialEndDate) : "—"}</Info>
            <Info icon={WarningCircle} label="Impayé depuis">{sub.pastDueSince ? formatDate(sub.pastDueSince) : "—"}</Info>
            <Info icon={Receipt} label="Factures">{detail.invoices.length}</Info>
            <Info icon={CreditCard} label="Tentatives de paiement">{detail.payments.length}</Info>
          </div>
        </Panel>
      ),
    },
    {
      value: "historique", label: "Historique des changements de plan",
      content: (
        <Panel title={`Changements de plan (${detail.history.length})`}>
          {detail.history.length === 0 ? <Empty>Aucun changement enregistré.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Changement</th>
                  <th className={TH}>Ancien plan</th>
                  <th className={TH}>Nouveau plan</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.history.map((h) => (
                  <tr key={h.id} >
                    <td>{formatDate(h.at)}</td>
                    <td>{changeKindLabel(h.kind)}</td>
                    <td>{h.fromPlan ?? "—"}</td>
                    <td>{h.toPlan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
    {
      value: "tentatives", label: "Tentatives de paiement",
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat value={detail.payments.length} label="Tentatives" />
            <Stat value={detail.payments.filter((p) => p.status === "paid").length} label="Réussies" />
            <Stat value={detail.payments.filter((p) => p.status === "failed").length} label="Échouées" />
          </div>
          <Panel title="Tentatives de paiement">
          {detail.payments.length === 0 ? <Empty>Aucune tentative de paiement.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Montant</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Motif</th>
                  <th className={TH}>Facture</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.payments.map((p) => {
                  const b = paymentStatusBadge(p.status);
                  return (
                    <tr key={p.id} >
                      <td>{formatDateTime(p.at)}</td>
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
          </Panel>
        </div>
      ),
    },
    {
      value: "factures", label: "Factures",
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat value={detail.invoices.length} label="Factures" />
            <Stat value={formatMoney(detail.invoices.filter((i) => i.status === "paid").reduce((a, i) => a + i.amount, 0), sub.currency)} label="Total encaissé" />
            <Stat value={formatMoney(detail.invoices.filter((i) => i.status !== "paid").reduce((a, i) => a + i.amount, 0), sub.currency)} label="Impayé" />
          </div>
          <Panel title="Factures">
          {detail.invoices.length === 0 ? <Empty>Aucune facture.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Numéro</th>
                  <th className={TH}>Émise le</th>
                  <th className={TH}>Montant</th>
                  <th className={TH}>Statut</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.invoices.map((i) => {
                  const b = invoiceStatusBadge(i.status);
                  return (
                    <tr key={i.id} >
                      <td>
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
          </Panel>
        </div>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
