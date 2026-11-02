import {
  busesRepo, daysUntil, expiryState, fleetCompanies, fleetsRepo, maintenanceRepo, routesRepo, seatMapsRepo, stationsRepo,
  tripsRepo, vendorsRepo, EXPIRY_SOON_DAYS,
  type BusRow, type FleetRow, type MaintenanceRow, type RouteRow, type SeatMapRow, type StationRow, type TripRow, type VendorRow,
} from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type { BusStatus, MaintenanceStatus, TripStatus } from "@/lib/types";

export const FLEET_TABS = ["apercu", "bus", "trajets", "lignes", "gares", "flottes", "plans-de-sieges", "maintenance", "fournisseurs"] as const;
export type FleetTab = (typeof FLEET_TABS)[number];
const DAY = 86_400_000;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}

type Co = { companyId?: string };

export interface FleetAlert { key: string; label: string; hint: string; count: number; href: string; tone: "danger" | "warning" | "info" }
export interface ExpiringDoc { busId: string; plate: string; companyName: string; label: string; daysLeft: number }
export interface FleetOverview {
  total: number; byStatus: Record<BusStatus, number>; availabilityPercent: number; withoutDriver: number;
  upcomingTrips: number; fillPercent: number | null; maintenanceCost30d: number; currency: string;
  byCompany: { id: string; name: string; active: number; maintenance: number; retired: number; total: number }[];
  alerts: FleetAlert[]; departures: TripRow[]; maintenance: MaintenanceRow[]; documents: ExpiringDoc[];
}

export const fleetHubRepo = {
  buses(q?: string, f: Co & { status?: BusStatus; withoutDriver?: boolean } = {}): BusRow[] {
    const hit = matcher(q);
    return busesRepo.listRows(f).filter((b) => hit(b.plate, b.busCode, b.brandModel, b.companyName, b.fleetName, b.routeLabel, b.driverName));
  },
  trips(q?: string, f: Co & { status?: TripStatus } = {}): TripRow[] {
    const hit = matcher(q);
    return tripsRepo.listRows(f).filter((t) => hit(t.routeLabel, t.busPlate, t.companyName, t.price));
  },
  routes(q?: string, f: Co = {}): RouteRow[] {
    const hit = matcher(q);
    return routesRepo.listRows(f).filter((r) => hit(r.label, r.companyName));
  },
  stations(q?: string, f: Co = {}): StationRow[] {
    const hit = matcher(q);
    return stationsRepo.listRows(f).filter((s) => hit(s.name, s.city, s.companyName));
  },
  fleets(q?: string, f: Co = {}): FleetRow[] {
    const hit = matcher(q);
    return fleetsRepo.listRows(f).filter((x) => hit(x.name, x.companyName, x.depotName));
  },
  seatMaps(q?: string, f: Co = {}): SeatMapRow[] {
    const hit = matcher(q);
    return seatMapsRepo.listRows(f).filter((m) => hit(m.busPlate, m.routeLabel, m.companyName));
  },
  maintenance(q?: string, f: Co & { status?: MaintenanceStatus } = {}): MaintenanceRow[] {
    const hit = matcher(q);
    return maintenanceRepo.listRows(f).filter((m) => hit(m.code, m.busPlate, m.companyName, m.type, m.vendorName));
  },
  vendors(q?: string, f: Co = {}): VendorRow[] {
    const hit = matcher(q);
    return vendorsRepo.listRows(f).filter((v) => hit(v.name, v.companyName));
  },

  counts(q?: string, f: Co = {}): Record<FleetTab, number> {
    return {
      apercu: 0,
      bus: fleetHubRepo.buses(q, f).length, trajets: fleetHubRepo.trips(q, f).length, lignes: fleetHubRepo.routes(q, f).length,
      gares: fleetHubRepo.stations(q, f).length, flottes: fleetHubRepo.fleets(q, f).length,
      "plans-de-sieges": fleetHubRepo.seatMaps(q, f).length, maintenance: fleetHubRepo.maintenance(q, f).length,
      fournisseurs: fleetHubRepo.vendors(q, f).length,
    };
  },

  companies: fleetCompanies,

  overview(f: Co = {}, now: Date = new Date()): FleetOverview {
    const s = getStore();
    const buses = s.buses.filter((b) => !f.companyId || b.companyId === f.companyId);
    const byStatus: Record<BusStatus, number> = { active: 0, maintenance: 0, retired: 0 };
    for (const b of buses) byStatus[b.status] += 1;
    const inService = buses.filter((b) => b.status !== "retired");
    const upcoming = s.trips.filter((t) => (t.status === "planned" || t.status === "boarding") && Date.parse(t.departure) >= now.getTime() && (!f.companyId || t.companyId === f.companyId));
    const seats = upcoming.reduce((n, t) => n + t.totalSeats, 0);
    const sold = upcoming.reduce((n, t) => n + (t.totalSeats - t.availableSeats), 0);
    const nameOf = (id: string) => s.companies.find((c) => c.id === id)?.name ?? "—";
    const currency = s.companies.find((c) => c.id === (f.companyId ?? buses[0]?.companyId))?.currency ?? "XOF";

    const docs: ExpiringDoc[] = [];
    for (const b of buses.filter((x) => x.status !== "retired")) {
      for (const [label, date] of [["Assurance", b.insuranceExpiry], ["Contrôle technique", b.technicalInspectionExpiry], ["Carte grise", b.registrationExpiry]] as const) {
        if (expiryState(date, now) !== "ok") docs.push({ busId: b.id, plate: b.plate, companyName: nameOf(b.companyId), label, daysLeft: daysUntil(date, now) });
      }
    }
    docs.sort((a, b) => a.daysLeft - b.daysLeft || a.plate.localeCompare(b.plate));
    const overdue = inService.filter((b) => Date.parse(b.nextMaintenanceDate) < now.getTime()).length;
    const withoutDriver = inService.filter((b) => b.driverId === null).length;

    const companyIds = [...new Set(buses.map((b) => b.companyId))];
    const byCompany = companyIds.map((id) => {
      const own = buses.filter((b) => b.companyId === id);
      return { id, name: nameOf(id), active: own.filter((b) => b.status === "active").length, maintenance: own.filter((b) => b.status === "maintenance").length, retired: own.filter((b) => b.status === "retired").length, total: own.length };
    }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, 6);

    return {
      total: buses.length, byStatus, withoutDriver, upcomingTrips: upcoming.length, currency,
      availabilityPercent: buses.length ? Math.round((byStatus.active / buses.length) * 100) : 0,
      fillPercent: seats ? Math.round((sold / seats) * 100) : null,
      maintenanceCost30d: s.maintenances.filter((m) => m.status === "COMPLETED" && (!f.companyId || m.companyId === f.companyId) && m.completedAt && now.getTime() - Date.parse(m.completedAt) <= 30 * DAY).reduce((n, m) => n + m.totalCost, 0),
      byCompany,
      alerts: [
        { key: "expired", label: "Documents expirés", hint: "Assurance, contrôle technique ou carte grise", count: docs.filter((d) => d.daysLeft < 0).length, href: "/flotte/bus", tone: "danger" as const },
        { key: "soon", label: "Documents à renouveler", hint: `Expirent dans moins de ${EXPIRY_SOON_DAYS} jours`, count: docs.filter((d) => d.daysLeft >= 0).length, href: "/flotte/bus", tone: "warning" as const },
        { key: "overdue", label: "Maintenances en retard", hint: "Prochaine maintenance dépassée", count: overdue, href: "/flotte/maintenance", tone: "danger" as const },
        { key: "driver", label: "Bus sans conducteur", hint: "Aucun conducteur affecté", count: withoutDriver, href: "/flotte/bus?conducteur=sans", tone: "info" as const },
      ].filter((a) => a.count > 0),
      departures: upcoming.sort((a, b) => a.departure.localeCompare(b.departure)).slice(0, 5).map((t) => tripsRepo.listRows({ companyId: t.companyId }).find((r) => r.id === t.id)!).filter(Boolean),
      maintenance: maintenanceRepo.listRows(f).filter((m) => m.status === "IN_PROGRESS" || m.status === "PLANNED").sort((a, b) => (a.status === b.status ? a.scheduledDate.localeCompare(b.scheduledDate) : a.status === "IN_PROGRESS" ? -1 : 1)).slice(0, 5),
      documents: docs.slice(0, 6),
    };
  },
};
