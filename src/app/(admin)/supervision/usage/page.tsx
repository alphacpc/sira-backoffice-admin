import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { UsageChart } from "@/components/monitoring/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { API_WINDOWS, analyticsRepo } from "@/lib/repos/monitoring";
import { parseCompanyFilter } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

const BASE = "/supervision/usage";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];
const CATEGORY = { booking: "Réservations", parcel: "Colis", customer: "Clients" } as const;
const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function UsagePage({
  searchParams,
}: { searchParams: Promise<{ jours?: string; compagnie?: string }> }) {
  const sp = await searchParams;
  const days = Number(parseFilter(sp.jours, API_WINDOWS.map(String))) || 7;
  const companyId = parseCompanyFilter(sp.compagnie);
  const keep = { jours: String(days), compagnie: companyId };
  const summary = analyticsRepo.summary({ days, companyId }, new Date());
  return (
    <>
      <PageHeader
        title="Usage"
        description={`Événements produit du ${summary.from} au ${summary.to}, par jour UTC. Un événement de colis ne porte pas d'utilisateur.`}
      />
      <StatusFilterNav basePath={BASE} options={WINDOW_OPTIONS} current={String(days)} param="jours" keep={keep} label="Choisir la période" />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div data-testid="usage-events"><KpiCard label="Événements" value={formatNumber(summary.totals.events)} /></div>
        <div data-testid="usage-users"><KpiCard label="Utilisateurs distincts" value={formatNumber(summary.totals.distinctUsers)} hint="Comptes ayant déclenché au moins un événement" /></div>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Événements par jour</CardTitle></CardHeader>
        <CardContent>
          <UsageChart points={summary.byDay.map((d) => ({ label: label(d.day), booking: d.booking, parcel: d.parcel, customer: d.customer }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Par événement</CardTitle></CardHeader>
        <CardContent>
          {summary.byEvent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement sur cette période.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Événement</th>
                  <th className="py-1 font-medium">Catégorie</th>
                  <th className="py-1 font-medium">Total</th>
                  <th className="py-1 font-medium">Jours actifs</th>
                  <th className="py-1 font-medium">Utilisateurs distincts</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEvent.map((e) => (
                  <tr key={e.eventName} className="border-t border-border">
                    <td className="py-1.5 font-mono text-xs font-medium">{e.eventName}</td>
                    <td>{CATEGORY[e.eventCategory]}</td>
                    <td className="tabular-nums">{formatNumber(e.count)}</td>
                    <td className="tabular-nums">{e.activeDays}</td>
                    <td className="tabular-nums">{e.distinctUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Ces chiffres sont calculés à partir des réservations, paiements, billets, colis et avis déjà présents. Le service conserve les événements 395 jours.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
