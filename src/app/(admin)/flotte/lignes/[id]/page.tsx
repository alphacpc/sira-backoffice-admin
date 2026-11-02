import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { busStatusBadge, routeStatusBadge, tripStatusBadge } from "@/lib/labels";
import { routesRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = routesRepo.detail(id);
  if (!detail) notFound();
  const { route } = detail;
  const badge = routeStatusBadge(route.status);
  return (
    <>
      <PageHeader
        title={`Ligne ${route.label}`}
        description={route.companyName}
        actions={<span data-testid="route-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <div className="space-y-4">
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${route.companyId}?onglet=flotte`} className="hover:underline">{route.companyName}</Link>
          </DetailRow>
          <DetailRow label="Origine">{detail.originName}</DetailRow>
          <DetailRow label="Destination">{detail.destinationName}</DetailRow>
          <DetailRow label="Distance">{route.distanceKm} km</DetailRow>
          <DetailRow label="Durée">{Math.floor(route.durationMinutes / 60)} h {String(route.durationMinutes % 60).padStart(2, "0")}</DetailRow>
        </dl></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Bus affectés ({detail.buses.length})</CardTitle></CardHeader>
          <CardContent>
            {detail.buses.length === 0 ? <Empty>Aucun bus affecté à cette ligne.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Plaque</th>
                    <th className="py-1 font-medium">Marque et modèle</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Conducteur</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.buses.map((b) => {
                    const s = busStatusBadge(b.status);
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="py-1.5"><Link href={`/flotte/bus/${b.id}`} className="font-medium hover:underline">{b.plate}</Link></td>
                        <td>{b.brandModel}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td>{b.driverName ?? <span className="text-muted-foreground">Aucun conducteur</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trajets ({detail.trips.length})</CardTitle></CardHeader>
          <CardContent>
            {detail.trips.length === 0 ? <Empty>Aucun trajet sur cette ligne.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Départ</th>
                    <th className="py-1 font-medium">Bus</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Places libres</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.trips.map((t) => {
                    const s = tripStatusBadge(t.status);
                    return (
                      <tr key={t.id} className="border-t border-border">
                        <td className="py-1.5"><Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{formatDateTime(t.departure)}</Link></td>
                        <td>{t.busPlate}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td className="tabular-nums">{t.availableSeats} / {t.totalSeats}</td>
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
