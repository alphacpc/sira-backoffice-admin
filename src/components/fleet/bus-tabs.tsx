import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { CrewList } from "@/components/fleet/crew-list";
import { ExpiryBadge } from "@/components/fleet/expiry-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  busStatusBadge, busTypeLabel, fuelTypeLabel, maintenanceCategoryLabel, maintenanceStatusBadge, tripStatusBadge,
} from "@/lib/labels";
import type { BusDetail } from "@/lib/repos/fleet";

const TAB_VALUES = ["caracteristiques", "equipage", "maintenance", "trajets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

const yesNo = (value: boolean) => (value ? "Oui" : "Non");

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BusTabs({ detail, initialTab }: { detail: BusDetail; initialTab?: string }) {
  const { bus } = detail;
  const status = busStatusBadge(bus.status);

  const items = [
    {
      value: "caracteristiques", label: "Caractéristiques",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent><dl>
            <DetailRow label="Code">{bus.busCode}</DetailRow>
            <DetailRow label="Plaque">{bus.plate}</DetailRow>
            <DetailRow label="Marque et modèle">{bus.brand} {bus.model}</DetailRow>
            <DetailRow label="Année">{bus.year}</DetailRow>
            <DetailRow label="Type">{busTypeLabel(bus.busType)}</DetailRow>
            <DetailRow label="Carburant">{fuelTypeLabel(bus.fuelType)}</DetailRow>
            <DetailRow label="Numéro de moteur">{bus.engineNumber}</DetailRow>
            <DetailRow label="Couleur">{bus.color}</DetailRow>
            <DetailRow label="Places assises">{bus.seatCapacity}</DetailRow>
            <DetailRow label="Places debout">{bus.standingCapacity}</DetailRow>
            <DetailRow label="Soute à bagages">{bus.luggageCapacity} m³</DetailRow>
            <DetailRow label="Accessible en fauteuil roulant">{yesNo(bus.wheelchairAccessible)}</DetailRow>
            <DetailRow label="Climatisation">{yesNo(bus.airConditioned)}</DetailRow>
            <DetailRow label="GPS">{bus.gpsEnabled ? `Oui · ${bus.gpsDeviceId ?? "boîtier inconnu"}` : "Non"}</DetailRow>
            <DetailRow label="Caméra">{yesNo(bus.cameraInstalled)}</DetailRow>
            <DetailRow label="Capteur de carburant">{yesNo(bus.fuelSensorInstalled)}</DetailRow>
          </dl></CardContent></Card>
          <div className="space-y-4">
            <Card><CardContent><dl>
              <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
              <DetailRow label="Compagnie">
                <Link href={`/compagnies/${bus.companyId}?onglet=flotte`} className="hover:underline">{detail.companyName}</Link>
              </DetailRow>
              <DetailRow label="Flotte">{detail.fleetName ?? "—"}</DetailRow>
              <DetailRow label="Ligne">
                {bus.routeId && detail.routeLabel ? (
                  <Link href={`/flotte/lignes/${bus.routeId}`} className="hover:underline">{detail.routeLabel}</Link>
                ) : "—"}
              </DetailRow>
              <DetailRow label="Dépôt">{detail.depotName ?? "—"}</DetailRow>
              <DetailRow label="Date d'achat">{formatDate(bus.purchaseDate)}</DetailRow>
              <DetailRow label="Prix d'achat">{formatMoney(bus.purchasePrice, detail.currency)}</DetailRow>
              <DetailRow label="Hors service depuis le">{bus.retiredAt ? formatDate(bus.retiredAt) : "—"}</DetailRow>
            </dl></CardContent></Card>
            <Card>
              <CardHeader><CardTitle>Échéances</CardTitle></CardHeader>
              <CardContent><dl>
                {detail.expiries.map((e) => (
                  <DetailRow key={e.key} label={e.label}>
                    <span className="inline-flex items-center gap-2" data-testid={`expiry-${e.key}`}>
                      {formatDate(e.date)} <ExpiryBadge state={e.state} daysLeft={e.daysLeft} />
                    </span>
                  </DetailRow>
                ))}
                <DetailRow label="Dernière maintenance">{formatDate(bus.lastMaintenanceDate)}</DetailRow>
                <DetailRow label="Prochaine maintenance">{formatDate(bus.nextMaintenanceDate)}</DetailRow>
              </dl></CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      value: "equipage", label: "Équipage",
      content: (
        <Card><CardContent className="space-y-2">
          <CrewList crew={detail.crew} />
          <p className="text-xs text-muted-foreground">
            Registre d&apos;équipage du backoffice : sans compte ni coordonnées. Les affectations ne sont pas modifiables ici.
          </p>
        </CardContent></Card>
      ),
    },
    {
      value: "maintenance", label: "Maintenance",
      content: (
        <Card><CardContent>
          {detail.maintenances.length === 0 ? <Empty>Aucune maintenance enregistrée.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">Catégorie</th>
                  <th className="py-1 font-medium">Fournisseur</th>
                  <th className="py-1 font-medium">Prévue le</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Coût total</th>
                </tr>
              </thead>
              <tbody>
                {detail.maintenances.map((m) => {
                  const b = maintenanceStatusBadge(m.status);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-1.5 font-mono text-xs">{m.code}</td>
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
        </CardContent></Card>
      ),
    },
    {
      value: "trajets", label: "Trajets et sièges",
      content: (
        <Card><CardContent>
          {detail.trips.length === 0 ? <Empty>Aucun trajet pour ce bus.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Départ</th>
                  <th className="py-1 font-medium">Ligne</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Places libres</th>
                </tr>
              </thead>
              <tbody>
                {detail.trips.map((t) => {
                  const b = tripStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
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
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "caracteristiques";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
