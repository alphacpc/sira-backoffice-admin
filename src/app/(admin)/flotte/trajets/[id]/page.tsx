import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { CrewList } from "@/components/fleet/crew-list";
import { SeatMap } from "@/components/fleet/seat-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { tripStatusBadge } from "@/lib/labels";
import { tripsRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = tripsRepo.detail(id);
  if (!detail) notFound();
  const { trip, seatMap } = detail;
  const badge = tripStatusBadge(trip.status);
  return (
    <>
      <PageHeader
        title={`Trajet ${trip.routeLabel}`}
        description={`${trip.companyName} · départ le ${formatDateTime(trip.departure)}`}
        actions={<span data-testid="trip-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Horaires et prix</CardTitle></CardHeader>
            <CardContent><dl>
              <DetailRow label="Ligne">
                <Link href={`/flotte/lignes/${trip.routeId}`} className="hover:underline">{trip.routeLabel}</Link>
              </DetailRow>
              <DetailRow label="Départ">{formatDateTime(trip.departure)}</DetailRow>
              <DetailRow label="Arrivée">{formatDateTime(trip.arrival)}</DetailRow>
              <DetailRow label="Durée">{duration(detail.durationMinutes)}</DetailRow>
              <DetailRow label="Distance">{detail.distanceKm} km</DetailRow>
              <DetailRow label="Prix">{formatMoney(trip.price, trip.currency)}</DetailRow>
              <DetailRow label="Places libres"><span data-testid="trip-available">{trip.availableSeats} / {trip.totalSeats}</span></DetailRow>
            </dl></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bus et équipage</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <dl>
                <DetailRow label="Bus">
                  <Link href={`/flotte/bus/${trip.busId}`} className="hover:underline">{trip.busPlate}</Link>
                  <span className="ml-1 font-mono text-xs text-muted-foreground">{detail.busCode}</span>
                </DetailRow>
              </dl>
              <CrewList crew={detail.crew} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Plan de sièges</CardTitle></CardHeader>
          <CardContent>
            {seatMap ? <SeatMap map={seatMap} /> : <p className="text-sm text-muted-foreground">Aucun plan de sièges pour ce trajet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
