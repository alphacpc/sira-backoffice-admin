import Link from "next/link";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { StatusFilterNav } from "@/components/data/status-filter-nav";
import { ServiceHistoryChart } from "@/components/monitoring/service-history-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import { serviceFilterHref } from "@/lib/filters";
import { serviceStatusBadge } from "@/lib/labels";
import { servicesRepo } from "@/lib/repos/monitoring";

export const dynamic = "force-dynamic";

const utcTime = (iso: string) => new Date(iso).toISOString().slice(11, 16);

export default async function ServicesPage({
  searchParams,
}: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const rows = servicesRepo.list();
  const stats = servicesRepo.stats();
  const reference = servicesRepo.referenceTime();
  const names = rows.map((r) => r.name);
  const chosen =
    names.find((n) => n === service) ?? rows.find((r) => !r.stale && r.status !== "healthy")?.name ?? names[0] ?? "";
  const points = servicesRepo.history(chosen).map((p) => ({ label: utcTime(p.at), ms: p.responseTimeMs, status: p.status }));
  return (
    <>
      <PageHeader
        title="Santé des services"
        description="Contrôles de santé de la plateforme. Un service est obsolète quand son dernier contrôle précède de plus de 90 secondes le dernier sondage."
      />
      <p data-testid="svc-reference" className="mb-4 text-sm text-muted-foreground">
        Dernier sondage : {reference ? formatDateTime(reference) : "—"} (UTC)
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="svc-healthy"><KpiCard label="Opérationnels" value={formatNumber(stats.healthy)} tone="success" /></div>
        <div data-testid="svc-degraded"><KpiCard label="Dégradés" value={formatNumber(stats.degraded)} tone={stats.degraded > 0 ? "warning" : "default"} /></div>
        <div data-testid="svc-down"><KpiCard label="En panne" value={formatNumber(stats.down)} tone={stats.down > 0 ? "danger" : "default"} /></div>
        <div data-testid="svc-stale"><KpiCard label="Obsolètes" value={formatNumber(stats.stale)} hint="Plus sondés" /></div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Réponse</th>
                <th className="px-3 py-2 font-medium">Taux d&apos;erreur</th>
                <th className="px-3 py-2 font-medium">Disponibilité 24 h</th>
                <th className="px-3 py-2 font-medium">Dernier changement</th>
                <th className="px-3 py-2 font-medium">Incidents ouverts</th>
                <th className="px-3 py-2 font-medium">Dernier contrôle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = serviceStatusBadge(r.status);
                return (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link href={serviceFilterHref("/supervision/services", r.name)} className="font-medium hover:underline">{r.name}</Link>
                    </td>
                    <td className="px-3 py-2">
                      {r.stale ? <StatusBadge tone="neutral">Obsolète</StatusBadge> : <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.responseTimeMs} ms</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.errorRatePercent === null ? "—" : `${r.errorRatePercent} %`}</td>
                    <td className="px-3 py-2 tabular-nums">{r.uptimePercent === null ? "—" : `${r.uptimePercent} %`}</td>
                    <td className="px-3 py-2">{r.lastChangeAt ? formatDateTime(r.lastChangeAt) : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.openIncidents > 0
                        ? <Link href={serviceFilterHref("/supervision/incidents", r.name)} className="text-accent hover:underline">{r.openIncidents}</Link>
                        : 0}
                    </td>
                    <td className="px-3 py-2">{formatDateTime(r.checkedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique de {chosen}</CardTitle></CardHeader>
        <CardContent>
          <StatusFilterNav
            basePath="/supervision/services" param="service" current={chosen} label="Choisir un service"
            options={names.map((n) => ({ value: n, label: n }))}
          />
          <ServiceHistoryChart service={chosen} points={points} />
          <p className="mt-2 text-xs text-muted-foreground">
            Un contrôle toutes les 30 minutes dans cette maquette (le service sonde toutes les 30 secondes). Vert : opérationnel, orange : dégradé, rouge : en panne.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
