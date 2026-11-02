import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { ApiTrafficChart } from "@/components/monitoring/api-traffic-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { API_WINDOWS, apiRepo } from "@/lib/repos/monitoring";
import { parseCompanyFilter } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

const BASE = "/supervision/api";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];
const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function ApiTrafficPage({
  searchParams,
}: { searchParams: Promise<{ jours?: string; compagnie?: string }> }) {
  const sp = await searchParams;
  const days = Number(parseFilter(sp.jours, API_WINDOWS.map(String))) || 7;
  const companyId = parseCompanyFilter(sp.compagnie);
  const keep = { jours: String(days), compagnie: companyId };
  const summary = apiRepo.summary({ days, companyId }, new Date());
  return (
    <>
      <PageHeader
        title="Trafic API"
        description={`Appels à la plateforme du ${summary.from} au ${summary.to}. Seuls des agrégats sont affichés : jamais d'adresse, d'utilisateur ni de ligne brute.`}
      />
      <StatusFilterNav basePath={BASE} options={WINDOW_OPTIONS} current={String(days)} param="jours" keep={keep} label="Choisir la période" />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="api-requests"><KpiCard label="Requêtes" value={formatNumber(summary.totals.count)} /></div>
        <div data-testid="api-latency">
          <KpiCard label="Latence moyenne" value={`${summary.totals.avgResponseMs} ms`} hint={`Maximum ${formatNumber(summary.totals.maxResponseMs)} ms`} />
        </div>
        <div data-testid="api-4xx"><KpiCard label="Erreurs client (4xx)" value={`${summary.totals.clientErrorPercent} %`} /></div>
        <div data-testid="api-5xx">
          <KpiCard label="Erreurs serveur (5xx)" value={`${summary.totals.serverErrorPercent} %`} tone={summary.totals.serverErrorPercent >= 1 ? "danger" : "default"} />
        </div>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Requêtes par jour</CardTitle></CardHeader>
        <CardContent>
          <ApiTrafficChart points={summary.byDay.map((d) => ({ label: label(d.day), ok: d.ok, clientErrors: d.clientErrors, serverErrors: d.serverErrors }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Par endpoint</CardTitle></CardHeader>
        <CardContent>
          {summary.byEndpoint.length === 0 ? <p className="text-sm text-muted-foreground">Aucun trafic sur cette période.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Méthode</th>
                  <th className="py-1 font-medium">Endpoint</th>
                  <th className="py-1 font-medium">Requêtes</th>
                  <th className="py-1 font-medium">Moyenne</th>
                  <th className="py-1 font-medium">Maximum</th>
                  <th className="py-1 font-medium">4xx</th>
                  <th className="py-1 font-medium">5xx</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEndpoint.map((e) => (
                  <tr key={`${e.method} ${e.endpoint}`} className="border-t border-border">
                    <td className="py-1.5 font-medium">{e.method}</td>
                    <td className="font-mono text-xs">{e.endpoint}</td>
                    <td className="tabular-nums">{formatNumber(e.count)}</td>
                    <td className="tabular-nums">{e.avgResponseMs} ms</td>
                    <td className="tabular-nums">{formatNumber(e.maxResponseMs)} ms</td>
                    <td className="tabular-nums">{e.clientErrorPercent} %</td>
                    <td className={`tabular-nums ${e.serverErrorPercent >= 1 ? "font-medium text-danger" : ""}`}>{e.serverErrorPercent} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Trafic anonyme (sans compagnie) inclus quand aucune compagnie n&apos;est choisie. Sur cette maquette, 30 jours de trafic sont conservés.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
