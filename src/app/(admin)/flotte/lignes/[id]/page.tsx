import { ArrowRight, Buildings, Bus, Clock, MapPin, Path } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { liveRouteDetail } from "@/lib/api/fleet-live";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { busStatusBadge, routeStatusBadge, tripStatusBadge } from "@/lib/labels";
import { routesRepo } from "@/lib/repos/fleet";

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

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";
const duration = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = isLive() ? await liveRouteDetail(id) : routesRepo.detail(id);
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
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <MapPin size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-lg font-bold">
            <span>{detail.originName}</span>
            <ArrowRight size={20} aria-hidden className="text-muted-foreground" />
            <span>{detail.destinationName}</span>
          </div>
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${route.companyId}?onglet=flotte`} className="hover:underline">{route.companyName}</Link></Info>
          <Info icon={Path} label="Distance">{route.distanceKm} km</Info>
          <Info icon={Clock} label="Durée">{duration(route.durationMinutes)}</Info>
          <Info icon={Bus} label="Bus · Trajets">{detail.buses.length} · {detail.trips.length}</Info>
        </div>

        <Section title={`Bus affectés (${detail.buses.length})`}>
          {detail.buses.length === 0 ? <Empty>Aucun bus affecté à cette ligne.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr><th className={TH}>Plaque</th><th className={TH}>Marque et modèle</th><th className={TH}>Statut</th><th className={TH}>Conducteur</th></tr></thead>
                <tbody className={BODY}>
                  {detail.buses.map((b) => {
                    const s = busStatusBadge(b.status);
                    return (
                      <tr key={b.id}>
                        <td><Link href={`/flotte/bus/${b.id}`} className="font-mono font-semibold hover:underline">{b.plate}</Link></td>
                        <td>{b.brandModel}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td>{b.driverName ?? <span className="text-muted-foreground">Aucun conducteur</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Trajets (${detail.trips.length})`}>
          {detail.trips.length === 0 ? <Empty>Aucun trajet sur cette ligne.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr><th className={TH}>Départ</th><th className={TH}>Bus</th><th className={TH}>Statut</th><th className={`${TH} text-right`}>Places libres</th></tr></thead>
                <tbody className={BODY}>
                  {detail.trips.map((t) => {
                    const s = tripStatusBadge(t.status);
                    return (
                      <tr key={t.id}>
                        <td><Link href={`/flotte/trajets/${t.id}`} className="font-medium hover:underline">{formatDateTime(t.departure)}</Link></td>
                        <td className="font-mono text-xs">{t.busPlate}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td className="text-right tabular-nums">{t.availableSeats} / {t.totalSeats}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
