import { Buildings, Bus, CalendarBlank, CheckCircle, GasPump, MapPin, MinusCircle, Wrench } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { CrewList } from "@/components/fleet/crew-list";
import { SeatMap } from "@/components/fleet/seat-map";
import { ExpiryBadge } from "@/components/fleet/expiry-badge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  busStatusBadge, busTypeLabel, fuelTypeLabel, maintenanceCategoryLabel, maintenanceStatusBadge, tripStatusBadge,
} from "@/lib/labels";
import type { BusDetail } from "@/lib/repos/fleet";

const TAB_VALUES = ["caracteristiques", "equipage", "maintenance", "trajets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Equip({ label, on, detail }: { label: string; on: boolean; detail?: string }) {
  const Icon = on ? CheckCircle : MinusCircle;
  return (
    <li className={`flex items-center gap-3 rounded-xl border border-border p-3 ${on ? "" : "opacity-60"}`}>
      <Icon size={22} weight="duotone" aria-hidden className={`shrink-0 ${on ? "text-orange-500" : "text-muted-foreground"}`} />
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </li>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BusTabs({ detail, initialTab }: { detail: BusDetail; initialTab?: string }) {
  const { bus } = detail;
  const status = busStatusBadge(bus.status);

  const items = [
    {
      value: "caracteristiques", label: "Caractéristiques",
      content: (
        <div className="space-y-5">
          <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Bus size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-lg font-bold">{bus.plate}</p>
              <p className="text-sm text-muted-foreground">{bus.busCode} · {[bus.brand, bus.model].filter(Boolean).join(" ") || "—"}{bus.year ? ` · ${bus.year}` : ""}</p>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums">{bus.seatCapacity || "—"}</p>
              <p className="text-sm text-muted-foreground">places assises</p>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Rattachement">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${bus.companyId}?onglet=flotte`} className="hover:underline">{detail.companyName}</Link></Info>
                <Info icon={Bus} label="Flotte">{detail.fleetName ?? "—"}</Info>
                <Info icon={MapPin} label="Ligne">
                  {bus.routeId && detail.routeLabel ? <Link href={`/flotte/lignes/${bus.routeId}`} className="hover:underline">{detail.routeLabel}</Link> : "—"}
                </Info>
                <Info icon={MapPin} label="Dépôt">{detail.depotName ?? "—"}</Info>
                {!detail.partial && <Info icon={CalendarBlank} label="Date d'achat">{formatDate(bus.purchaseDate)}</Info>}
                {!detail.partial && <Info icon={CalendarBlank} label="Prix d'achat">{formatMoney(bus.purchasePrice, detail.currency)}</Info>}
                {bus.retiredAt && <Info icon={CalendarBlank} label="Hors service depuis le">{formatDate(bus.retiredAt)}</Info>}
              </div>
            </Panel>

            <Panel title="Échéances">
              <ul className="space-y-2">
                {detail.expiries.map((e) => (
                  <li key={e.key} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm" data-testid={`expiry-${e.key}`}>
                    <span className="font-semibold">{e.label}</span>
                    <span className="inline-flex items-center gap-2">{formatDate(e.date)} <ExpiryBadge state={e.state} daysLeft={e.daysLeft} /></span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold"><Wrench size={18} weight="duotone" aria-hidden className="text-orange-500" />Dernière maintenance</span>
                  {formatDate(bus.lastMaintenanceDate)}
                </li>
                <li className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold"><Wrench size={18} weight="duotone" aria-hidden className="text-orange-500" />Prochaine maintenance</span>
                  {formatDate(bus.nextMaintenanceDate)}
                </li>
              </ul>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Caractéristiques">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Bus} label="Type">{busTypeLabel(bus.busType)}</Info>
                <Info icon={GasPump} label="Carburant">{fuelTypeLabel(bus.fuelType)}</Info>
                <Info icon={Bus} label="Places debout">{bus.standingCapacity || "—"}</Info>
                <Info icon={Bus} label="Soute à bagages">{bus.luggageCapacity ? `${bus.luggageCapacity} m³` : "—"}</Info>
                {!detail.partial && <Info icon={Bus} label="Numéro de moteur"><span className="font-mono">{bus.engineNumber}</span></Info>}
                <Info icon={Bus} label="Couleur">{bus.color || "—"}</Info>
              </div>
            </Panel>
            <Panel title="Équipements">
              <ul className="grid gap-2 sm:grid-cols-2">
                <Equip label="Climatisation" on={bus.airConditioned} />
                <Equip label="Accès fauteuil roulant" on={bus.wheelchairAccessible} />
                {!detail.partial && <Equip label="GPS" on={bus.gpsEnabled} detail={bus.gpsEnabled ? bus.gpsDeviceId ?? "boîtier inconnu" : undefined} />}
                {!detail.partial && <Equip label="Caméra" on={bus.cameraInstalled} />}
                {!detail.partial && <Equip label="Capteur de carburant" on={bus.fuelSensorInstalled} />}
              </ul>
            </Panel>
          </div>
        </div>
      ),
    },
    {
      value: "equipage", label: "Équipage",
      content: (
        <Panel title="Équipage">
          <CrewList crew={detail.crew} />
          <p className="mt-3 text-xs text-muted-foreground">
            Registre d&apos;équipage du backoffice : sans compte ni coordonnées. Les affectations ne sont pas modifiables ici.
          </p>
        </Panel>
      ),
    },
    {
      value: "maintenance", label: "Maintenance",
      content: (
        <Panel title={`Maintenance (${detail.maintenances.length})`}>
          {detail.maintenances.length === 0 ? <Empty>Aucune maintenance enregistrée.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Catégorie</th>
                  <th className={TH}>Fournisseur</th>
                  <th className={TH}>Prévue le</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Coût total</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.maintenances.map((m) => {
                  const b = maintenanceStatusBadge(m.status);
                  return (
                    <tr key={m.id}>
                      <td className="font-mono text-xs">{m.code}</td>
                      <td>{m.type}</td>
                      <td>{maintenanceCategoryLabel(m.category)}</td>
                      <td>{m.vendorName ?? "Interne"}</td>
                      <td>{formatDate(m.scheduledDate)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="tabular-nums">{formatMoney(m.totalCost, m.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
    {
      value: "trajets", label: "Trajets et sièges",
      content: (
        <div className="space-y-5">
          <Panel title={`Plan de sièges (${detail.seatMaps.length})`}>
            {detail.seatMaps.length === 0 ? <Empty>Aucun plan de sièges pour ce bus.</Empty> : (
              <div className="grid gap-5 lg:grid-cols-2">
                {detail.seatMaps.map((m) => (
                  <div key={m.tripId} className="rounded-xl border border-border p-4">
                    <Link href={`/flotte/trajets/${m.tripId}`} className="text-sm font-semibold hover:underline">{m.routeLabel}</Link>
                    <p className="mb-3 text-xs text-muted-foreground">{formatDateTime(m.departure)}</p>
                    <SeatMap map={m.map} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        <Panel title={`Trajets (${detail.trips.length})`}>
          {detail.trips.length === 0 ? <Empty>Aucun trajet pour ce bus.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Départ</th>
                  <th className={TH}>Ligne</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Places libres</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.trips.map((t) => {
                  const b = tripStatusBadge(t.status);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{formatDateTime(t.departure)}</Link>
                      </td>
                      <td>{t.routeLabel}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="tabular-nums">{t.availableSeats} / {t.totalSeats}</td>
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

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "caracteristiques";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
