import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, call, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import type { BusRow, FleetRow, MaintenanceRow, RouteRow, SeatMapRow, StationRow, TripRow, VendorRow } from "@/lib/repos/fleet";
import type { ExpiringDoc, FleetAlert, FleetOverview, FleetTab } from "@/lib/repos/fleet-hub";
import { fold } from "@/lib/repos/fleet-hub";
import type { BusStatus, MaintenanceCategory, MaintenanceStatus, TripStatus, VendorKind } from "@/lib/types";

type Names = Map<string, string>;
const nameOf = (names: Names, id: string) => names.get(id) ?? "—";

const BUS_STATUSES = ["active", "maintenance", "retired"] as const;
const TRIP_STATUSES = ["planned", "boarding", "departed", "cancelled"] as const;
const MAINT_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const CATEGORIES = ["PREVENTIVE", "CORRECTIVE", "INSPECTION"] as const;

/** Backend maintenance category (the part that was worked on) as the French label of the "type" column. */
const MAINT_KIND: Record<string, string> = {
  ENGINE: "Moteur", BRAKES: "Freins", TIRES: "Pneus", ELECTRICAL: "Électricité", BODY: "Carrosserie", OIL_CHANGE: "Vidange", GENERAL: "Général",
};
const VENDOR_KIND: Record<string, VendorKind> = { GARAGE: "GARAGE", INSURER: "INSURER", SUPPLIER: "PARTS", GOVERNMENT: "OTHER" };

export function toBusRow(raw: unknown, names: Names, crew: Names): BusRow {
  const b = obj(raw);
  const driverId = strOrNull(b.assignedDriverId);
  return {
    id: str(b.id), busCode: str(b.busCode, "—"), plate: str(b.plateNumber, "—"),
    brandModel: [str(b.brand), str(b.model)].filter(Boolean).join(" ") || "—",
    companyId: str(b.companyId), companyName: nameOf(names, str(b.companyId)), fleetName: strOrNull(b.fleetName),
    routeLabel: strOrNull(b.routeLabel), status: pick<BusStatus>(b.status, BUS_STATUSES, false, "active"),
    seatCapacity: num(b.seatCapacity),
    // The platform holds no employee name: a driver shows as their employee code.
    driverName: driverId ? (crew.get(driverId) ?? "Affecté") : null,
    nextMaintenanceDate: str(b.nextMaintenanceDate),
  };
}

/** A route whose stations have no city comes back as "null → null": show a dash instead. */
const cleanLabel = (v: string): string => (!v || v.includes("null") ? "—" : v);

export function toTripRow(raw: unknown, names: Names): TripRow {
  const t = obj(raw);
  return {
    id: str(t.id), companyId: str(t.companyId), companyName: nameOf(names, str(t.companyId)), routeId: str(t.routeId),
    routeLabel: cleanLabel(str(t.routeLabel)), departure: str(t.departure), arrival: str(t.arrivalEstimate),
    status: pick<TripStatus>(t.status, TRIP_STATUSES, false, "planned"), price: num(t.price), currency: str(t.currency, "XOF"),
    totalSeats: num(t.totalSeats), availableSeats: num(t.availableSeats), busId: str(t.busId), busPlate: str(t.plateNumber, "—"),
  };
}

export function toRouteRow(raw: unknown, names: Names): RouteRow {
  const r = obj(raw);
  const from = str(r.originCity) || str(r.originName), to = str(r.destinationCity) || str(r.destinationName);
  return {
    id: str(r.id), label: from && to ? `${from} → ${to}` : str(r.name, "—"), companyId: str(r.companyId),
    companyName: nameOf(names, str(r.companyId)), distanceKm: num(r.distanceKm), durationMinutes: num(r.estimatedDurationMinutes),
    status: r.active === false ? "inactive" : "active", busCount: num(r.busCount), tripCount: num(r.tripCount),
  };
}

export function toStationRow(raw: unknown, names: Names): StationRow {
  const s = obj(raw);
  return { id: str(s.id), name: str(s.name, "—"), city: str(s.city, "—"), companyId: str(s.companyId), companyName: nameOf(names, str(s.companyId)), routeCount: num(s.routeCount) };
}

export function toFleetRow(raw: unknown, names: Names, stations: Names): FleetRow {
  const f = obj(raw);
  const depot = strOrNull(f.baseDepotStationId);
  return {
    id: str(f.id), name: str(f.name, "—"), companyId: str(f.companyId), companyName: nameOf(names, str(f.companyId)),
    depotName: depot ? (stations.get(depot) ?? null) : null, busCount: num(f.busCount),
  };
}

export function toMaintenanceRow(raw: unknown, names: Names): MaintenanceRow {
  const m = obj(raw);
  const type = str(m.maintenanceType).toUpperCase();
  return {
    id: str(m.id), code: str(m.maintenanceCode, "—"), busId: str(m.busId), busPlate: str(m.plateNumber, "—"), companyId: str(m.companyId),
    companyName: nameOf(names, str(m.companyId)), type: MAINT_KIND[str(m.maintenanceCategory).toUpperCase()] ?? "Intervention",
    category: (CATEGORIES as readonly string[]).includes(type) ? (type as MaintenanceCategory) : "CORRECTIVE",
    vendorName: strOrNull(m.vendorName), status: pick<MaintenanceStatus>(m.status, MAINT_STATUSES, true, "PLANNED"),
    scheduledDate: str(m.scheduledDate), startedAt: strOrNull(m.startDate), completedAt: strOrNull(m.endDate),
    // Labour and parts are not split in the list: only the total is shown.
    laborCost: 0, partsCost: 0, totalCost: num(m.totalCost), currency: str(m.currency, "XOF"),
  };
}

export function toVendorRow(raw: unknown, names: Names): VendorRow {
  const v = obj(raw);
  return {
    id: str(v.id), name: str(v.name, "—"), kind: VENDOR_KIND[str(v.vendorType).toUpperCase()] ?? "OTHER", companyId: str(v.companyId),
    companyName: nameOf(names, str(v.companyId)), interventions: num(v.interventions), totalCost: num(v.totalCost), currency: "XOF",
  };
}

const ALERTS: Record<string, Pick<FleetAlert, "label" | "hint" | "href" | "tone">> = {
  expired: { label: "Documents expirés", hint: "Assurance, contrôle technique ou carte grise", href: "/flotte/bus", tone: "danger" },
  soon: { label: "Documents à renouveler", hint: "Expirent dans moins de 30 jours", href: "/flotte/bus", tone: "warning" },
  overdue: { label: "Maintenances en retard", hint: "Prochaine maintenance dépassée", href: "/flotte/maintenance", tone: "danger" },
  driver: { label: "Bus sans conducteur", hint: "Aucun conducteur affecté", href: "/flotte/bus?conducteur=sans", tone: "info" },
};

export function toFleetOverview(raw: unknown, names: Names): FleetOverview {
  const o = obj(raw);
  const s = obj(o.byStatus);
  const byStatus = { active: num(s.active ?? s.ACTIVE), maintenance: num(s.maintenance ?? s.MAINTENANCE), retired: num(s.retired ?? s.RETIRED) };
  return {
    total: num(o.total), byStatus, availabilityPercent: num(o.availabilityPercent), withoutDriver: num(o.withoutDriver),
    upcomingTrips: num(o.upcomingTrips), fillPercent: numOrNull(o.fillPercent), maintenanceCost30d: num(o.maintenanceCost30d),
    currency: str(o.currency, "XOF"),
    byCompany: arr(o.byCompany).map((c) => ({
      id: str(c.id), name: nameOf(names, str(c.id)), active: num(c.active), maintenance: num(c.maintenance), retired: num(c.retired), total: num(c.total),
    })),
    alerts: arr(o.alerts).filter((a) => ALERTS[str(a.key)] && num(a.count) > 0).map((a): FleetAlert => ({ key: str(a.key), count: num(a.count), ...ALERTS[str(a.key)]! })),
    departures: arr(o.departures).map((t) => toTripRow(t, names)),
    maintenance: arr(o.maintenance).map((m) => toMaintenanceRow(m, names)),
    documents: arr(o.documents).map((d): ExpiringDoc => ({ busId: str(d.busId), plate: str(d.plate, "—"), companyName: nameOf(names, str(d.companyId)), label: str(d.label), daysLeft: num(d.daysLeft) })),
  };
}

// ---------------------------------------------------------------------------------------------------------

type Co = { companyId?: string };

/** Employee codes of the crew, by registry id (names live nowhere on the platform). */
async function crewCodes(companyId?: string): Promise<Names> {
  try {
    const rows = await loadAll("/admin/crew", withFilters({ companyId }));
    return new Map(rows.map(obj).filter((r) => str(r.id)).map((r) => [str(r.id), str(r.employeeCode, "Affecté")]));
  } catch (e) {
    if (e instanceof ApiError) return new Map();
    throw e;
  }
}

export async function liveBuses(f: Co & { q?: string; status?: string; withoutDriver?: boolean }): Promise<BusRow[]> {
  const [rows, n, crew] = await Promise.all([
    loadAll("/admin/fleet/buses", withFilters({ ...f, withoutDriver: f.withoutDriver ? "true" : undefined })), companyNames(), crewCodes(f.companyId),
  ]);
  return rows.map((r) => toBusRow(r, n, crew));
}

export async function liveTrips(f: Co & { q?: string; status?: string }): Promise<TripRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/fleet/trips", withFilters(f)), companyNames()]);
  return rows.map((r) => toTripRow(r, n));
}

export async function liveRoutes(f: Co & { q?: string }): Promise<RouteRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/fleet/routes", withFilters(f)), companyNames()]);
  return rows.map((r) => toRouteRow(r, n));
}

export async function liveStations(f: Co & { q?: string; city?: string }): Promise<StationRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/fleet/stations", withFilters(f)), companyNames()]);
  return rows.map((r) => toStationRow(r, n));
}

export async function liveStationCities(companyId?: string): Promise<string[]> {
  const raw = await soft<unknown>(`/admin/fleet/stations/cities?${withFilters({ companyId })}`);
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === "string") : [];
}

export async function liveFleets(f: Co & { q?: string }): Promise<FleetRow[]> {
  const [rows, n, stations] = await Promise.all([loadAll("/admin/fleet/fleets", withFilters(f)), companyNames(), liveStations({ companyId: f.companyId })]);
  return rows.map((r) => toFleetRow(r, n, new Map(stations.map((s) => [s.id, s.name]))));
}

export async function liveMaintenance(f: Co & { q?: string; status?: string }): Promise<MaintenanceRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/fleet/maintenance", withFilters(f)), companyNames()]);
  return rows.map((r) => toMaintenanceRow(r, n));
}

export async function liveVendors(f: Co & { q?: string }): Promise<VendorRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/fleet/vendors", withFilters(f)), companyNames()]);
  return rows.map((r) => toVendorRow(r, n));
}

/** Seat maps come from the booking service; the route, plate and departure are joined from the trip list. */
export async function liveSeatMaps(f: Co & { q?: string }): Promise<SeatMapRow[]> {
  const [maps, trips] = await Promise.all([loadAll("/admin/seat-maps", withFilters({ companyId: f.companyId })), liveTrips({ companyId: f.companyId })]);
  const byTrip = new Map(trips.map((t) => [t.id, t]));
  const q = fold((f.q ?? "").trim());
  const rows = maps.map(obj).map((m): SeatMapRow => {
    const t = byTrip.get(str(m.tripId));
    const c = obj(m.counters);
    return {
      id: str(m.id), tripId: str(m.tripId), busId: str(m.busId), busPlate: t?.busPlate ?? "—", companyId: str(m.companyId),
      companyName: t?.companyName ?? "—", routeLabel: t?.routeLabel ?? "—", departure: t?.departure ?? "",
      total: num(c.total), free: num(c.free), booked: num(c.booked), occupied: num(c.occupied),
    };
  });
  return q ? rows.filter((m) => [m.busPlate, m.routeLabel, m.companyName].some((x) => fold(x).includes(q))) : rows;
}

/** Null counter = its source failed, so the tab shows no badge. */
export async function liveFleetCounts(q?: string, companyId?: string): Promise<Record<FleetTab, number | null>> {
  // Seat maps have no server-side search: with a query they are counted after the join, otherwise from the page total.
  const [raw, maps] = await Promise.all([
    soft<unknown>(`/admin/fleet/search-counts?${withFilters({ q, companyId })}`),
    q ? liveSeatMaps({ q, companyId }).then((r) => ({ totalElements: r.length })).catch(() => null)
      : soft<unknown>(`/admin/seat-maps?${withFilters({ companyId, size: "1" })}`),
  ]);
  const c = obj(raw);
  return {
    apercu: 0, bus: numOrNull(c.bus), trajets: numOrNull(c.trajets), lignes: numOrNull(c.lignes), gares: numOrNull(c.gares),
    flottes: numOrNull(c.flottes), "plans-de-sieges": maps && typeof maps === "object" ? numOrNull(obj(maps).totalElements) : null,
    maintenance: numOrNull(c.maintenance), fournisseurs: numOrNull(c.fournisseurs),
  };
}

export async function liveFleetOverview(companyId?: string): Promise<FleetOverview> {
  const [raw, n] = await Promise.all([call<unknown>(`/admin/fleet/overview?${withFilters({ companyId })}`), companyNames()]);
  return toFleetOverview(raw, n);
}

// --- bus detail ---------------------------------------------------------------------------------------------

import type { BusDetail, BusExpiry, CrewAssignment, SeatMapView } from "@/lib/repos/fleet";
import type { Bus, BusType, FuelType, SeatState } from "@/lib/types";

const SEAT_STATES = ["free", "booked", "occupied", "blocked"] as const;

/** Seat codes look like "3B": the digits are the row, the letter is the column. Only the state is read, never the occupant. */
export function toSeatMapView(raw: unknown): SeatMapView {
  const m = obj(raw);
  const seats = Object.entries(obj(m.seats)).map(([code, v]) => {
    const row = Number(/\d+/.exec(code)?.[0] ?? 0);
    const column = Math.max(0, (code.replace(/\d+/g, "").toUpperCase().charCodeAt(0) || 65) - 64);
    return { code, row, column, state: pick<SeatState>(obj(v).state, SEAT_STATES, false, "free") };
  });
  const c = obj(m.counters);
  return {
    id: str(m.seatMapId), rows: num(m.rows), columns: num(m.seatsPerRow), seats,
    counts: { total: num(c.total), free: num(c.free), booked: num(c.booked), occupied: num(c.occupied), blocked: num(c.blocked) },
  };
}

function toExpiries(b: Record<string, unknown>): BusExpiry[] {
  const out: BusExpiry[] = [];
  for (const [key, label, field] of [["insurance", "Assurance", "insurance"], ["inspection", "Contrôle technique", "technicalInspection"], ["registration", "Carte grise", "registration"]] as const) {
    const d = obj(b[field]);
    const date = strOrNull(d.expiry);
    if (!date) continue;
    out.push({ key, label, date, state: pick(d.state, ["expired", "soon", "ok"] as const, false, "ok"), daysLeft: num(d.daysLeft) });
  }
  return out;
}

export async function liveBusDetail(id: string): Promise<BusDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/fleet/buses/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const d = obj(raw);
  const b = obj(d.bus);
  const companyId = str(b.companyId);
  const [names, crew, maintRaw, tripRows, stations, mapsRaw] = await Promise.all([
    companyNames(), crewCodes(companyId), soft<unknown>(`/admin/fleet/buses/${encodeURIComponent(id)}/maintenance?size=100`),
    liveTrips({ companyId }).then((t) => t.filter((x) => x.busId === id)), liveStations({ companyId }),
    soft<unknown>(`/admin/seat-maps?${withFilters({ busId: id, size: "10" })}`),
  ]);
  const row = toBusRow(b, names, crew);
  const maintenances = arr(obj(maintRaw).content).map((m) => toMaintenanceRow(m, names));
  const byTrip = new Map(tripRows.map((t) => [t.id, t]));
  const maps = await Promise.all(arr(obj(mapsRaw).content).map(async (m) => {
    const seats = await soft<unknown>(`/admin/seat-maps/trips/${str(m.tripId)}`);
    const t = byTrip.get(str(m.tripId));
    return seats ? { tripId: str(m.tripId), routeLabel: t?.routeLabel ?? "—", departure: t?.departure ?? "", map: toSeatMapView(seats) } : null;
  }));
  const person = (role: CrewAssignment["role"], idv: string | null): CrewAssignment => ({ role, id: idv, name: idv ? (crew.get(idv) ?? "Affecté") : null });
  const depot = strOrNull(d.currentDepotId);
  const bus: Bus = {
    id: str(b.id), companyId, fleetId: strOrNull(b.fleetId), busCode: str(b.busCode, "—"), plate: str(b.plateNumber, "—"), brand: str(b.brand), model: str(b.model),
    year: num(d.yearOfManufacture), busType: str(b.busType) as BusType, fuelType: str(b.fuelType) as FuelType, engineNumber: "", color: str(d.color),
    seatCapacity: num(b.seatCapacity), standingCapacity: num(d.standingCapacity), luggageCapacity: num(d.luggageCapacity),
    wheelchairAccessible: d.wheelchairAccessible === true, airConditioned: d.airConditioned === true, gpsEnabled: false, gpsDeviceId: null,
    cameraInstalled: false, fuelSensorInstalled: false, status: row.status, routeId: strOrNull(b.assignedRouteId), depotId: depot,
    driverId: strOrNull(b.assignedDriverId), driverAssistantId: strOrNull(d.assignedDriverAssistantId), controllerId: strOrNull(d.assignedControllerId),
    lastMaintenanceDate: str(b.lastMaintenanceDate), nextMaintenanceDate: str(b.nextMaintenanceDate), insuranceExpiry: "", technicalInspectionExpiry: "",
    registrationExpiry: "", purchaseDate: "", purchasePrice: 0, retiredAt: strOrNull(b.retiredAt),
  };
  return {
    partial: true, bus, companyName: row.companyName, currency: "XOF", fleetName: row.fleetName, routeLabel: row.routeLabel,
    depotName: depot ? (stations.find((s) => s.id === depot)?.name ?? null) : null,
    crew: [person("DRIVER", bus.driverId), person("DRIVER_ASSISTANT", bus.driverAssistantId), person("CONTROLLER", bus.controllerId)],
    expiries: toExpiries(b), maintenances, trips: tripRows.sort((x, y) => y.departure.localeCompare(x.departure)),
    seatMaps: maps.filter((m): m is NonNullable<typeof m> => m !== null),
  };
}

// --- trip and route detail ----------------------------------------------------------------------------------

import { userNames } from "@/lib/api/comp-live";
import type { RouteDetail, SeatOccupant, TripDetail } from "@/lib/repos/fleet";

export async function liveRouteDetail(id: string): Promise<RouteDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/fleet/routes/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const r = obj(raw);
  const companyId = str(r.companyId);
  const [names, crew, busRaw, tripRaw] = await Promise.all([
    companyNames(), crewCodes(companyId),
    loadAll("/admin/fleet/buses", withFilters({ companyId, routeId: id })), loadAll("/admin/fleet/trips", withFilters({ companyId, routeId: id })),
  ]);
  return {
    route: toRouteRow(r, names), originName: str(r.originName, "—"), destinationName: str(r.destinationName, "—"),
    buses: busRaw.map((b) => toBusRow(b, names, crew)), trips: tripRaw.map((t) => toTripRow(t, names)),
  };
}

export async function liveTripDetail(id: string): Promise<TripDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/fleet/trips/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const d = obj(raw);
  const t = obj(d.trip);
  const companyId = str(t.companyId);
  const [names, seatsRaw, busRaw, routes] = await Promise.all([
    companyNames(), soft<unknown>(`/admin/seat-maps/trips/${encodeURIComponent(id)}`),
    strOrNull(t.busId) ? soft<unknown>(`/admin/fleet/buses/${str(t.busId)}`) : Promise.resolve(null), soft<unknown>(`/admin/fleet/routes/${str(t.routeId)}`),
  ]);
  const crew = await crewCodes(companyId);
  const trip = toTripRow(t, names);
  const seatMap = seatsRaw ? toSeatMapView(seatsRaw) : null;
  const seatEntries = Object.entries(obj(obj(seatsRaw).seats)).filter(([, v]) => obj(v).occupant);
  const people = await userNames(seatEntries.flatMap(([, v]) => [str(obj(obj(v).occupant).passengerId), str(obj(obj(v).occupant).userId)]));
  const seats: Record<string, SeatOccupant> = {};
  for (const [code, v] of seatEntries) {
    const o = obj(obj(v).occupant);
    const tk = o.ticket && typeof o.ticket === "object" ? obj(o.ticket) : null;
    const who = strOrNull(o.passengerId) ?? strOrNull(o.userId);
    seats[code] = {
      bookingId: str(o.bookingId), bookingCode: str(o.bookingCode, "—"), passengerName: who ? (people.get(who) ?? "—") : "—",
      channel: pick<BookingChannelLite>(o.channel, ["counter", "online"], false, "counter"),
      paymentStatus: pick<PaymentLite>(o.paymentStatus, ["pending", "paid", "failed"], false, "pending"), customerId: null, userId: strOrNull(o.userId),
      ticket: tk ? { code: str(tk.code), status: str(tk.status), issuedAt: str(tk.issuedAt), scans: arr(tk.scans).map((s) => ({ at: str(s.at), controllerId: null, controllerName: null })) } : null,
    };
  }
  const bus = obj(busRaw);
  const b = obj(bus.bus);
  const driver = strOrNull(t.driverId) ?? strOrNull(b.assignedDriverId);
  return {
    trip, distanceKm: num(obj(d).distanceKm ?? obj(routes).distanceKm), durationMinutes: num(obj(routes).estimatedDurationMinutes),
    busCode: str(b.busCode, "—"),
    crew: [
      { role: "DRIVER", id: driver, name: driver ? (crew.get(driver) ?? "Affecté") : null },
      { role: "DRIVER_ASSISTANT", id: strOrNull(bus.assignedDriverAssistantId), name: strOrNull(bus.assignedDriverAssistantId) ? (crew.get(str(bus.assignedDriverAssistantId)) ?? "Affecté") : null },
      { role: "CONTROLLER", id: strOrNull(bus.assignedControllerId), name: strOrNull(bus.assignedControllerId) ? (crew.get(str(bus.assignedControllerId)) ?? "Affecté") : null },
    ],
    seatMap, seats,
  };
}
type BookingChannelLite = "counter" | "online";
type PaymentLite = "pending" | "paid" | "failed";
