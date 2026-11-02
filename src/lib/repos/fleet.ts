import { parseFilter } from "@/lib/filters";
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  Bus, BusMaintenance, BusStatus, CrewRole, FleetBus, FleetTrip, MaintenanceCategory, MaintenanceStatus,
  RouteStatus, SeatMap, SeatState, Trip, TripStatus, VendorKind,
} from "@/lib/types";

const DAY = 86_400_000;

/** A document expires "soon" when its date falls within this many days of the reference date. */
export const EXPIRY_SOON_DAYS = 30;

export type ExpiryState = "expired" | "soon" | "ok";

/** Trip statuses that still need the bus: a bus with such a trip cannot be retired. */
export const UPCOMING_TRIP_STATUSES: readonly TripStatus[] = ["planned", "boarding"];

/** Display order of the three crew assignments of a bus. */
export const CREW_ROLES: readonly CrewRole[] = ["DRIVER", "DRIVER_ASSISTANT", "CONTROLLER"];

const CREW_FIELD: Record<CrewRole, "driverId" | "driverAssistantId" | "controllerId"> = {
  DRIVER: "driverId", DRIVER_ASSISTANT: "driverAssistantId", CONTROLLER: "controllerId",
};

/** One crew assignment of a bus: the member's name only, never an identifier. */
export interface CrewAssignment { role: CrewRole; name: string | null }

export interface SeatCounts { total: number; free: number; booked: number; occupied: number; blocked: number }

/** Client-safe projection of a bus: names, never an employee or crew identifier. */
export interface BusRow {
  id: string;
  busCode: string;
  plate: string;
  brandModel: string;
  companyId: string;
  companyName: string;
  fleetName: string | null;
  routeLabel: string | null;
  status: BusStatus;
  seatCapacity: number;
  driverName: string | null;
  nextMaintenanceDate: string;
}

export interface BusExpiry {
  key: "insurance" | "inspection" | "registration";
  label: string;
  date: string;
  state: ExpiryState;
  daysLeft: number;
}

/** Client-safe projection of a trip. */
export interface TripRow {
  id: string;
  companyId: string;
  companyName: string;
  routeId: string;
  routeLabel: string;
  departure: string;
  arrival: string;
  status: TripStatus;
  price: number;
  currency: string;
  totalSeats: number;
  availableSeats: number;
  busId: string;
  busPlate: string;
}

export interface SeatView { code: string; row: number; column: number; state: SeatState }

export interface SeatMapView { id: string; rows: number; columns: number; seats: SeatView[]; counts: SeatCounts }

/** Client-safe projection of a seat map (counts only, no seat list). */
export interface SeatMapRow {
  id: string;
  tripId: string;
  busId: string;
  busPlate: string;
  companyId: string;
  companyName: string;
  routeLabel: string;
  departure: string;
  total: number;
  free: number;
  booked: number;
  occupied: number;
}

/** Client-safe projection of a maintenance. */
export interface MaintenanceRow {
  id: string;
  code: string;
  busId: string;
  busPlate: string;
  companyId: string;
  companyName: string;
  type: string;
  category: MaintenanceCategory;
  vendorName: string | null;
  status: MaintenanceStatus;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  currency: string;
}

/** Client-safe projection of a vendor: interventions exclude cancelled ones, the cost sums completed ones. */
export interface VendorRow {
  id: string;
  name: string;
  kind: VendorKind;
  companyId: string;
  companyName: string;
  interventions: number;
  totalCost: number;
  currency: string;
}

export interface FleetRow {
  id: string; name: string; companyId: string; companyName: string; depotName: string | null; busCount: number;
}

export interface StationRow {
  id: string; name: string; city: string; companyId: string; companyName: string; routeCount: number;
}

export interface RouteRow {
  id: string;
  label: string;
  companyId: string;
  companyName: string;
  distanceKm: number;
  durationMinutes: number;
  status: RouteStatus;
  busCount: number;
  tripCount: number;
}

/** Server-only detail of a bus (Server Components only; it carries the raw `Bus`). */
export interface BusDetail {
  bus: Bus;
  companyName: string;
  /** Currency of the owning company (purchase price). */
  currency: string;
  fleetName: string | null;
  routeLabel: string | null;
  depotName: string | null;
  crew: CrewAssignment[];
  expiries: BusExpiry[];
  maintenances: MaintenanceRow[];
  trips: TripRow[];
}

export interface TripDetail {
  trip: TripRow;
  distanceKm: number;
  durationMinutes: number;
  busCode: string;
  crew: CrewAssignment[];
  seatMap: SeatMapView | null;
}

export interface RouteDetail {
  route: RouteRow;
  originName: string;
  destinationName: string;
  buses: BusRow[];
  trips: TripRow[];
}

/** Days from `now` to `date`, rounded to the nearest whole day (negative once the date is more than half a day past). */
export function daysUntil(date: string, now: Date): number {
  return Math.round((new Date(date).getTime() - now.getTime()) / DAY) || 0;
}

/** Expired before `now`, "soon" within the next 30 days (inclusive), "ok" after. */
export function expiryState(date: string, now: Date): ExpiryState {
  const diff = new Date(date).getTime() - now.getTime();
  if (diff < 0) return "expired";
  return diff <= EXPIRY_SOON_DAYS * DAY ? "soon" : "ok";
}

/** Free, booked and occupied seats; a blocked seat counts in none of the three. */
export function seatCounts(seats: SeatMap["seats"]): SeatCounts {
  const count = (state: SeatState) => seats.filter((x) => x.state === state).length;
  return {
    total: seats.length, free: count("free"), booked: count("booked"), occupied: count("occupied"), blocked: count("blocked"),
  };
}

/** "Dakar → Thiès": cities of the route's origin and destination stations ("—" when unknown). */
export function routeLabel(routeId: string | null): string {
  if (!routeId) return "—";
  const s = getStore();
  const route = s.routes.find((r) => r.id === routeId);
  if (!route) return "—";
  const city = (stationId: string) => s.stations.find((x) => x.id === stationId)?.city ?? "—";
  return `${city(route.originId)} → ${city(route.destinationId)}`;
}

/** Companies that own a fleet (at least one station), in seed order: options of the company filters. */
export function fleetCompanies(): { id: string; name: string }[] {
  const s = getStore();
  const owners = new Set(s.stations.map((x) => x.companyId));
  return s.companies.filter((c) => owners.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
}

/** Keeps `?compagnie=` only when it names a company that owns a fleet. */
export function parseCompanyFilter(raw: string | undefined): string | undefined {
  return parseFilter(raw, fleetCompanies().map((c) => c.id));
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

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function companyCurrency(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.currency ?? "XOF";
}

function stationName(stationId: string | null): string | null {
  if (!stationId) return null;
  return getStore().stations.find((x) => x.id === stationId)?.name ?? null;
}

function crewName(crewId: string | null): string | null {
  if (!crewId) return null;
  return getStore().crew.find((c) => c.id === crewId)?.name ?? null;
}

function crewOf(bus: Bus): CrewAssignment[] {
  return CREW_ROLES.map((role) => ({ role, name: crewName(bus[CREW_FIELD[role]]) }));
}

function busRow(bus: Bus): BusRow {
  return {
    id: bus.id, busCode: bus.busCode, plate: bus.plate, brandModel: `${bus.brand} ${bus.model}`,
    companyId: bus.companyId, companyName: companyName(bus.companyId),
    fleetName: getStore().fleets.find((f) => f.id === bus.fleetId)?.name ?? null,
    routeLabel: bus.routeId ? routeLabel(bus.routeId) : null, status: bus.status, seatCapacity: bus.seatCapacity,
    driverName: crewName(bus.driverId), nextMaintenanceDate: bus.nextMaintenanceDate,
  };
}

function tripRow(trip: Trip): TripRow {
  return {
    id: trip.id, companyId: trip.companyId, companyName: companyName(trip.companyId), routeId: trip.routeId,
    routeLabel: routeLabel(trip.routeId), departure: trip.departure, arrival: trip.arrival, status: trip.status,
    price: trip.price, currency: trip.currency, totalSeats: trip.totalSeats, availableSeats: trip.availableSeats,
    busId: trip.busId, busPlate: getStore().buses.find((b) => b.id === trip.busId)?.plate ?? "—",
  };
}

function maintenanceRow(m: BusMaintenance): MaintenanceRow {
  const s = getStore();
  return {
    id: m.id, code: m.code, busId: m.busId, busPlate: s.buses.find((b) => b.id === m.busId)?.plate ?? "—",
    companyId: m.companyId, companyName: companyName(m.companyId), type: m.type, category: m.category,
    vendorName: s.vendors.find((v) => v.id === m.vendorId)?.name ?? null, status: m.status,
    scheduledDate: m.scheduledDate, startedAt: m.startedAt, completedAt: m.completedAt,
    laborCost: m.laborCost, partsCost: m.partsCost, totalCost: m.totalCost, currency: companyCurrency(m.companyId),
  };
}

function seatMapView(map: SeatMap): SeatMapView {
  return {
    id: map.id, rows: map.rows, columns: map.columns,
    seats: map.seats.map((seat) => {
      const m = /^(\d+)([A-Z])$/.exec(seat.code);
      return {
        code: seat.code, state: seat.state,
        row: m ? Number(m[1]) : 0, column: m ? m[2]!.charCodeAt(0) - 64 : 0,
      };
    }),
    counts: seatCounts(map.seats),
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

function byCompanyThen<T extends { companyName: string }>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => a.companyName.localeCompare(b.companyName, "fr") || key(a).localeCompare(key(b), "fr");
}

export const busesRepo = {
  listRows(filter: { companyId?: string; status?: BusStatus; withoutDriver?: boolean } = {}): BusRow[] {
    return getStore().buses
      .filter((b) =>
        (!filter.companyId || b.companyId === filter.companyId) &&
        (!filter.status || b.status === filter.status) &&
        (!filter.withoutDriver || b.driverId === null))
      .map(busRow)
      .sort(byCompanyThen((r) => r.plate));
  },

  get(id: string): Bus | undefined {
    return getStore().buses.find((b) => b.id === id);
  },

  detail(id: string, now: Date = new Date()): BusDetail | undefined {
    const s = getStore();
    const bus = s.buses.find((b) => b.id === id);
    if (!bus) return undefined;
    const expiry = (key: BusExpiry["key"], label: string, date: string): BusExpiry =>
      ({ key, label, date, state: expiryState(date, now), daysLeft: daysUntil(date, now) });
    return {
      bus,
      companyName: companyName(bus.companyId),
      currency: companyCurrency(bus.companyId),
      fleetName: s.fleets.find((f) => f.id === bus.fleetId)?.name ?? null,
      routeLabel: bus.routeId ? routeLabel(bus.routeId) : null,
      depotName: stationName(bus.depotId),
      crew: crewOf(bus),
      expiries: [
        expiry("insurance", "Assurance", bus.insuranceExpiry),
        expiry("inspection", "Contrôle technique", bus.technicalInspectionExpiry),
        expiry("registration", "Carte grise", bus.registrationExpiry),
      ],
      maintenances: s.maintenances.filter((m) => m.busId === id).sort(byNewest((m) => m.scheduledDate)).map(maintenanceRow),
      trips: s.trips.filter((t) => t.busId === id).sort(byNewest((t) => t.departure)).map(tripRow),
    };
  },

  /**
   * Takes a bus out of service (`active` or `maintenance` → `retired`). Guards, in this order: bus exists,
   * reason, not already retired, no maintenance in progress, no planned or boarding trip.
   */
  retire(busId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Bus {
    const s = getStore();
    const bus = s.buses.find((b) => b.id === busId);
    if (!bus) throw new Error("Bus introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (bus.status === "retired") throw new Error("Ce bus est déjà hors service");
    if (s.maintenances.some((m) => m.busId === bus.id && m.status === "IN_PROGRESS")) {
      throw new Error("Une maintenance est en cours sur ce bus");
    }
    if (s.trips.some((t) => t.busId === bus.id && UPCOMING_TRIP_STATUSES.includes(t.status))) {
      throw new Error("Ce bus a des trajets à venir");
    }
    bus.status = "retired";
    bus.retiredAt = now.toISOString();
    addActivity(bus.companyId, actor, `Bus ${bus.plate} mis hors service. Motif : ${motif}`, now);
    return bus;
  },
};

export const fleetsRepo = {
  listRows(filter: { companyId?: string } = {}): FleetRow[] {
    const s = getStore();
    return s.fleets
      .filter((f) => !filter.companyId || f.companyId === filter.companyId)
      .map((f) => ({
        id: f.id, name: f.name, companyId: f.companyId, companyName: companyName(f.companyId),
        depotName: stationName(f.depotId), busCount: s.buses.filter((b) => b.fleetId === f.id).length,
      }))
      .sort(byCompanyThen((r) => r.name));
  },
};

export const stationsRepo = {
  listRows(filter: { companyId?: string } = {}): StationRow[] {
    const s = getStore();
    return s.stations
      .filter((x) => !filter.companyId || x.companyId === filter.companyId)
      .map((x) => ({
        id: x.id, name: x.name, city: x.city, companyId: x.companyId, companyName: companyName(x.companyId),
        routeCount: s.routes.filter((r) => r.originId === x.id || r.destinationId === x.id).length,
      }))
      .sort(byCompanyThen((r) => r.name));
  },
};

function routeRow(routeId: string): RouteRow | undefined {
  const s = getStore();
  const r = s.routes.find((x) => x.id === routeId);
  if (!r) return undefined;
  return {
    id: r.id, label: routeLabel(r.id), companyId: r.companyId, companyName: companyName(r.companyId),
    distanceKm: r.distanceKm, durationMinutes: r.durationMinutes, status: r.status,
    busCount: s.buses.filter((b) => b.routeId === r.id).length,
    tripCount: s.trips.filter((t) => t.routeId === r.id).length,
  };
}

export const routesRepo = {
  listRows(filter: { companyId?: string } = {}): RouteRow[] {
    return getStore().routes
      .filter((r) => !filter.companyId || r.companyId === filter.companyId)
      .map((r) => routeRow(r.id)!)
      .sort(byCompanyThen((r) => r.label));
  },

  detail(id: string): RouteDetail | undefined {
    const s = getStore();
    const route = s.routes.find((r) => r.id === id);
    if (!route) return undefined;
    return {
      route: routeRow(id)!,
      originName: stationName(route.originId) ?? "—",
      destinationName: stationName(route.destinationId) ?? "—",
      buses: s.buses.filter((b) => b.routeId === id).map(busRow).sort((a, b) => a.plate.localeCompare(b.plate)),
      trips: s.trips.filter((t) => t.routeId === id).sort(byNewest((t) => t.departure)).map(tripRow),
    };
  },
};

export const tripsRepo = {
  listRows(filter: { companyId?: string; status?: TripStatus } = {}): TripRow[] {
    return getStore().trips
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(byNewest((t) => t.departure))
      .map(tripRow);
  },

  detail(id: string): TripDetail | undefined {
    const s = getStore();
    const trip = s.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    const route = s.routes.find((r) => r.id === trip.routeId);
    const bus = s.buses.find((b) => b.id === trip.busId);
    const map = s.seatMaps.find((m) => m.tripId === id);
    return {
      trip: tripRow(trip),
      distanceKm: route?.distanceKm ?? 0,
      durationMinutes: route?.durationMinutes ?? 0,
      busCode: bus?.busCode ?? "—",
      crew: bus ? crewOf(bus) : CREW_ROLES.map((role) => ({ role, name: null })),
      seatMap: map ? seatMapView(map) : null,
    };
  },
};

export const seatMapsRepo = {
  listRows(filter: { companyId?: string } = {}): SeatMapRow[] {
    const s = getStore();
    return s.seatMaps
      .filter((m) => !filter.companyId || m.companyId === filter.companyId)
      .map((m) => {
        const trip = s.trips.find((t) => t.id === m.tripId);
        const counts = seatCounts(m.seats);
        return {
          id: m.id, tripId: m.tripId, busId: m.busId, busPlate: s.buses.find((b) => b.id === m.busId)?.plate ?? "—",
          companyId: m.companyId, companyName: companyName(m.companyId),
          routeLabel: trip ? routeLabel(trip.routeId) : "—", departure: trip?.departure ?? "",
          total: counts.total, free: counts.free, booked: counts.booked, occupied: counts.occupied,
        };
      })
      .sort(byNewest((r) => r.departure));
  },

  forTrip(tripId: string): SeatMapView | null {
    const map = getStore().seatMaps.find((m) => m.tripId === tripId);
    return map ? seatMapView(map) : null;
  },
};

export const maintenanceRepo = {
  listRows(filter: { companyId?: string; status?: MaintenanceStatus } = {}): MaintenanceRow[] {
    return getStore().maintenances
      .filter((m) => (!filter.companyId || m.companyId === filter.companyId) && (!filter.status || m.status === filter.status))
      .sort(byNewest((m) => m.scheduledDate))
      .map(maintenanceRow);
  },
};

export const vendorsRepo = {
  listRows(filter: { companyId?: string } = {}): VendorRow[] {
    const s = getStore();
    return s.vendors
      .filter((v) => !filter.companyId || v.companyId === filter.companyId)
      .map((v) => {
        const done = s.maintenances.filter((m) => m.vendorId === v.id && m.status !== "CANCELLED");
        return {
          id: v.id, name: v.name, kind: v.kind, companyId: v.companyId, companyName: companyName(v.companyId),
          interventions: done.length,
          totalCost: done.filter((m) => m.status === "COMPLETED").reduce((sum, m) => sum + m.totalCost, 0),
          currency: companyCurrency(v.companyId),
        };
      })
      .sort(byCompanyThen((r) => r.name));
  },
};
