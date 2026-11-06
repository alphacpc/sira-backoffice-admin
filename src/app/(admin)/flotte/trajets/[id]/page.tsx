import { Bus, CalendarBlank, Clock, MapPin, Path } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { liveTripDetail } from "@/lib/api/fleet-live";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { CrewList } from "@/components/fleet/crew-list";
import { TripSeatExplorer } from "@/components/fleet/trip-seat-explorer";
import { formatDateTime, formatMoney } from "@/lib/format";
import { tripStatusBadge } from "@/lib/labels";
import { tripsRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = isLive() ? await liveTripDetail(id) : tripsRepo.detail(id);
  if (!detail) notFound();
  const { trip, seatMap } = detail;
  const badge = tripStatusBadge(trip.status);
  const taken = Math.max(0, trip.totalSeats - trip.availableSeats);
  const pct = trip.totalSeats > 0 ? Math.round((taken / trip.totalSeats) * 100) : 0;
  return (
    <>
      <PageHeader
        title={`Trajet ${trip.routeLabel}`}
        description={`${trip.companyName} · départ le ${formatDateTime(trip.departure)}`}
        actions={<span data-testid="trip-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Bus size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{trip.routeLabel}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(trip.departure)} → {formatDateTime(trip.arrival)}</p>
          </div>
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          <p className="text-4xl font-bold tabular-nums">{formatMoney(trip.price, trip.currency)}</p>
        </section>

        <Section title="Plan de sièges">
          {seatMap ? <TripSeatExplorer map={seatMap} seats={detail.seats} routeLabel={trip.routeLabel} departure={trip.departure} /> : <p className="text-sm text-muted-foreground">Aucun plan de sièges pour ce trajet.</p>}
        </Section>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Section title="Horaires">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={MapPin} label="Ligne"><Link href={`/flotte/lignes/${trip.routeId}`} className="hover:underline">{trip.routeLabel}</Link></Info>
                <Info icon={Path} label="Distance">{detail.distanceKm} km</Info>
                <Info icon={CalendarBlank} label="Départ">{formatDateTime(trip.departure)}</Info>
                <Info icon={CalendarBlank} label="Arrivée">{formatDateTime(trip.arrival)}</Info>
                <Info icon={Clock} label="Durée">{duration(detail.durationMinutes)}</Info>
              </div>
            </Section>
            <Section title="Remplissage">
              <p className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Places libres</span>
                <span className="text-2xl font-bold tabular-nums" data-testid="trip-available">{trip.availableSeats} / {trip.totalSeats}</span>
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={taken} aria-valuemin={0} aria-valuemax={trip.totalSeats} aria-label="Places occupées">
                <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{taken} place{taken > 1 ? "s" : ""} occupée{taken > 1 ? "s" : ""} · {pct} %</p>
            </Section>
          </div>
          <Section title="Bus et équipage">
            <div className="mb-3">
              <Info icon={Bus} label="Bus">
                <Link href={`/flotte/bus/${trip.busId}`} className="hover:underline">{trip.busPlate}</Link>
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{detail.busCode}</span>
              </Info>
            </div>
            <CrewList crew={detail.crew} />
          </Section>
        </div>
      </div>
    </>
  );
}
