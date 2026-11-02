import { getStore } from "@/lib/repos/store";
import type { FleetBus, FleetTrip } from "@/lib/types";

/** "Dakar → Thiès": cities of the route's origin and destination stations ("—" when unknown). */
export function routeLabel(routeId: string | null): string {
  if (!routeId) return "—";
  const s = getStore();
  const route = s.routes.find((r) => r.id === routeId);
  if (!route) return "—";
  const city = (stationId: string) => s.stations.find((x) => x.id === stationId)?.city ?? "—";
  return `${city(route.originId)} → ${city(route.destinationId)}`;
}

/** Company page projections: plate and status of each bus, route, departure and status of each trip. */
export function companyFleetSummary(companyId: string): { buses: FleetBus[]; trips: FleetTrip[] } {
  const s = getStore();
  return {
    buses: s.buses
      .filter((b) => b.companyId === companyId)
      .map((b) => ({ id: b.id, companyId: b.companyId, plate: b.plate, status: b.status })),
    trips: s.trips
      .filter((t) => t.companyId === companyId)
      .sort((a, b) => a.departure.localeCompare(b.departure))
      .map((t) => ({
        id: t.id, companyId: t.companyId, route: routeLabel(t.routeId), departure: t.departure, status: t.status,
      })),
  };
}
