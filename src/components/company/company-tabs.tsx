import Link from "next/link";
import { ContactField } from "@/components/company/contact-field";
import { KycPanel } from "@/components/company/kyc-panel";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney, formatNumber, nextBillingLabel } from "@/lib/format";
import { busStatusBadge, companyStatusBadge, invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import type { CompanyDetail } from "@/lib/types";

const TAB_VALUES = ["profil", "kyc", "abonnement", "fonctionnalites", "utilisation", "parrainage", "retention", "equipe", "flotte", "activite"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums">{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CompanyTabs({ detail, initialTab }: { detail: CompanyDetail; initialTab?: string }) {
  const { company: c, subscription: sub } = detail;
  const status = companyStatusBadge(c.status);

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Card><CardContent>
          <dl>
            <Row label="Nom">{c.name}</Row>
            <Row label="Identifiant">{c.slug}</Row>
            <Row label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></Row>
            <Row label="Pays / devise">{c.country} · {c.currency}</Row>
            <Row label="E-mail de contact"><ContactField companyId={c.id} field="email" masked={maskEmail(c.contactEmail)} /></Row>
            <Row label="Téléphone"><ContactField companyId={c.id} field="phone" masked={maskPhone(c.contactPhone)} /></Row>
            <Row label="Registre du commerce">{c.registrationNumber || "—"}</Row>
            <Row label="NINEA">{c.ninea || "—"}</Row>
            <Row label="Palier partenaire">{c.partnerTier || "—"}</Row>
            <Row label="Créée le">{formatDate(c.createdAt)}</Row>
            <Row label="Activée le">{c.activatedAt ? formatDate(c.activatedAt) : "—"}</Row>
          </dl>
        </CardContent></Card>
      ),
    },
    { value: "kyc", label: "Vérification KYC", content: <KycPanel company={{ id: c.id, name: c.name, status: c.status, forceActivated: c.forceActivated }} documents={detail.documents} kycTypes={detail.kycTypes.map((t) => ({ code: t.code, name: t.name, required: t.required, active: t.active }))} /> },
    {
      value: "abonnement", label: "Abonnement et paiements",
      content: (
        <div className="space-y-4">
          {sub ? (
            <Card><CardContent><dl>
              <Row label="Plan">{sub.planName}</Row>
              <Row label="Statut">{(() => { const b = subscriptionStatusBadge(sub.status); return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>; })()}</Row>
              <Row label="Prix">{formatMoney(sub.price, sub.currency)} / {sub.billingCycle === "MONTHLY" ? "mois" : "an"}</Row>
              <Row label="Prochaine échéance">{nextBillingLabel(sub.status, sub.nextBillingDate)}</Row>
              <Row label="Détail"><Link href={`/facturation/abonnements/${sub.id}`} className="text-accent hover:underline">Voir l&apos;abonnement</Link></Row>
            </dl></CardContent></Card>
          ) : <Empty>Aucun abonnement.</Empty>}
          {detail.invoices.length > 0 && (
            <Card><CardContent>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Facture</th><th className="py-1 font-medium">Émise le</th><th className="py-1 font-medium">Montant</th><th className="py-1 font-medium">Statut</th></tr></thead>
                <tbody>
                  {detail.invoices.map((i) => {
                    const b = invoiceStatusBadge(i.status);
                    return (
                      <tr key={i.id} className="border-t border-border">
                        <td className="py-1.5">{i.number}</td><td>{formatDate(i.issuedAt)}</td>
                        <td className="tabular-nums">{formatMoney(i.amount, i.currency)}</td>
                        <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </div>
      ),
    },
    {
      value: "fonctionnalites", label: "Fonctionnalités et limites",
      content: detail.limits ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="space-y-4">
            <Meter label="Utilisateurs" used={detail.limits.usedUsers} max={detail.limits.maxUsers} />
            <Meter label="Bus" used={detail.limits.usedBuses} max={detail.limits.maxBuses} />
          </CardContent></Card>
          <Card><CardContent>
            <ul className="space-y-2 text-sm">
              {detail.features.map((f) => (
                <li key={f.code} className="flex items-center justify-between">
                  {f.name}<StatusBadge tone={f.enabled ? "success" : "neutral"}>{f.enabled ? "Activée" : "Désactivée"}</StatusBadge>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </div>
      ) : <Empty>Aucun plan souscrit : pas de limites ni de fonctionnalités.</Empty>,
    },
    {
      value: "utilisation", label: "Utilisation",
      content: (
        <Card><CardContent>
          {detail.usage.length === 0 ? <Empty>Aucune donnée d&apos;utilisation.</Empty> : (
            <dl>
              {detail.usage.map((u) => <Row key={u.metricCode} label={u.label}>{formatNumber(u.value)}</Row>)}
            </dl>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "parrainage", label: "Parrainage et crédits",
      content: (
        <Card><CardContent className="space-y-3">
          <p className="text-sm">Code de parrainage : <span className="font-mono font-medium">{detail.referral.code ?? "aucun"}</span></p>
          {detail.referral.credits.length === 0 ? <Empty>Aucun crédit reçu.</Empty> : (
            <ul className="space-y-2 text-sm">
              {detail.referral.credits.map((cr) => (
                <li key={cr.id} className="flex items-center justify-between">
                  {formatMoney(cr.amount, cr.currency)}
                  <StatusBadge tone={cr.status === "AVAILABLE" ? "info" : "neutral"}>{cr.status === "AVAILABLE" ? "Disponible" : "Utilisé"}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "retention", label: "Rétention des données",
      content: (
        <Card><CardContent>
          <p className="text-sm">
            Durée de conservation des traces d&apos;audit (adresses IP et agents) :{" "}
            <span className="font-medium">{c.dataRetentionDays ? `${c.dataRetentionDays} jours` : "défaut plateforme (730 jours)"}</span>
          </p>
        </CardContent></Card>
      ),
    },
    {
      value: "equipe", label: "Équipe",
      content: (
        <Card><CardContent>
          {detail.employees.length === 0 ? <Empty>Aucun employé.</Empty> : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Nom</th><th className="py-1 font-medium">Rôle</th><th className="py-1 font-medium">E-mail</th><th className="py-1 font-medium">Compte</th></tr></thead>
            <tbody>
              {detail.employees.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-1.5 font-medium">
                    {e.userId ? <Link href={`/utilisateurs/${e.userId}`} className="hover:underline">{e.name}</Link> : e.name}
                  </td>
                  <td>{e.role}</td>
                  <td className="text-muted-foreground">{maskEmail(e.email)}</td>
                  <td className="text-muted-foreground">{e.userId ? "Compte plateforme" : "Pas encore de compte"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "flotte", label: "Flotte et trajets",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent>
            <h3 className="mb-2 text-sm font-semibold">Bus ({detail.buses.length})</h3>
            {detail.buses.length === 0 ? <Empty>Aucun bus.</Empty> : (
              <ul className="space-y-1 text-sm">
                {detail.buses.map((b) => (
                  <li key={b.id} className="flex justify-between">
                    <Link href={`/flotte/bus/${b.id}`} className="hover:underline">{b.plate}</Link>
                    {(() => { const badge = busStatusBadge(b.status); return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>; })()}
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
          <Card><CardContent>
            <h3 className="mb-2 text-sm font-semibold">Trajets ({detail.trips.length})</h3>
            {detail.trips.length === 0 ? <Empty>Aucun trajet.</Empty> : (
              <ul className="space-y-1 text-sm">
                {detail.trips.map((t) => (
                  <li key={t.id} className="flex justify-between">
                    <Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{t.route}</Link>
                    <span className="text-muted-foreground">{formatDateTime(t.departure)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </div>
      ),
    },
    {
      value: "activite", label: "Activité",
      content: (
        <Card><CardContent>
          {detail.activity.length === 0 ? <Empty>Aucune activité.</Empty> : (
            <ul className="space-y-2 text-sm">
              {detail.activity.map((a) => (
                <li key={a.id}><p>{a.action}</p><p className="text-xs text-muted-foreground">{a.actor} · {formatDateTime(a.at)}</p></li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
