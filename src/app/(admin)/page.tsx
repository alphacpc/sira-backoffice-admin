import Link from "next/link";
import { ServiceLatencyChart } from "@/components/dashboard/service-latency-chart";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { dsrTypeLabel, serviceStatusBadge, severityBadge } from "@/lib/labels";
import { dashboardRepo } from "@/lib/repos/dashboard";

export const dynamic = "force-dynamic";


export default function Vue360Page() {
  const o = dashboardRepo.overview();
  return (
    <>
      <PageHeader title="Vue 360" description="L'état de la plateforme et des compagnies en un coup d'œil." />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard label="Compagnies" value={o.kpis.companies} />
        <KpiCard label="Actives" value={o.kpis.active} tone="success" />
        <KpiCard label="En brouillon" value={o.kpis.draft} />
        <KpiCard label="KYC à revoir" value={o.kpis.pendingKyc} tone="warning" />
        <KpiCard label="Abonnements impayés" value={o.kpis.pastDue} tone={o.kpis.pastDue ? "danger" : "default"} />
        <KpiCard label="Incidents ouverts" value={o.kpis.openIncidents} tone={o.kpis.openIncidents ? "danger" : "default"} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Santé des services</CardTitle></CardHeader>
          <CardContent>
            <ServiceLatencyChart services={o.services} />
            <ul className="mt-3 flex flex-wrap gap-2">
              {o.services.map((s) => {
                const b = serviceStatusBadge(s.status);
                return (
                  <li key={s.name} className="flex items-center gap-1.5 text-xs">
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>{s.name}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Incidents ouverts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {o.incidents.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident ouvert.</p>}
            {o.incidents.map((i) => {
              const b = severityBadge(i.severity);
              return (
                <div key={i.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.code} · {i.serviceName} · {formatDateTime(i.detectedAt)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Impayés</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.pastDue.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <Link href={`/compagnies/${s.companyId}?onglet=abonnement`} className="font-medium hover:underline">
                  {s.companyName}
                </Link>
                <span className="tabular-nums text-muted-foreground">{formatMoney(s.price, s.currency)}</span>
              </div>
            ))}
            {o.pastDue.length === 0 && <p className="text-sm text-muted-foreground">Aucun impayé.</p>}
            <Link href="/facturation/impayes" className="inline-block pt-1 text-sm text-accent-text hover:underline">
              Voir la file des impayés
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Demandes RGPD à traiter</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.dsr.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span>{dsrTypeLabel(d.requestType)} <span className="text-xs text-muted-foreground">({d.requesterName})</span></span>
                <StatusBadge tone={d.daysLeft < 0 ? "danger" : d.daysLeft <= 5 ? "warning" : "neutral"}>
                  {d.daysLeft < 0 ? `En retard de ${-d.daysLeft} j` : `${d.daysLeft} j restants`}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Activité récente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.activity.map((a) => (
              <div key={a.id} className="text-sm">
                <p>{a.action}{a.companyName ? ` · ${a.companyName}` : ""}</p>
                <p className="text-xs text-muted-foreground">{a.actor} · {formatDate(a.at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
