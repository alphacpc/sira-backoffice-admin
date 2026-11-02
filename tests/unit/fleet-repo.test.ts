import { beforeEach, describe, expect, it } from "vitest";
import {
  busesRepo, daysUntil, expiryState, fleetCompanies, fleetsRepo, maintenanceRepo, parseCompanyFilter, routesRepo,
  seatCounts, seatMapsRepo, stationsRepo, tripsRepo, vendorsRepo,
} from "@/lib/repos/fleet";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const companyId = (name: string) => getStore().companies.find((c) => c.name === name)!.id;
const busId = (plate: string) => getStore().buses.find((b) => b.plate === plate)!.id;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe("company filter", () => {
  it("offers the twelve companies that own a fleet", () => {
    const companies = fleetCompanies();
    expect(companies).toHaveLength(12);
    expect(companies[0]).toEqual({ id: companyId("Sahel Express"), name: "Sahel Express" });
    expect(Object.keys(companies[0]!).sort()).toEqual(["id", "name"]);
  });
  it("keeps a fleet company id and drops a company without a fleet or an unknown value", () => {
    expect(parseCompanyFilter(companyId("Casamance Trans"))).toBe(companyId("Casamance Trans"));
    expect(parseCompanyFilter(companyId("Kolda Voyages"))).toBeUndefined();
    expect(parseCompanyFilter("nope")).toBeUndefined();
    expect(parseCompanyFilter(undefined)).toBeUndefined();
  });
});

describe("busesRepo.listRows", () => {
  it("returns a projection field by field, without any crew or employee identifier", () => {
    const rows = busesRepo.listRows();
    expect(rows).toHaveLength(42);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual([
        "brandModel", "busCode", "companyId", "companyName", "driverName", "fleetName", "id", "nextMaintenanceDate",
        "plate", "routeLabel", "seatCapacity", "status",
      ]);
    }
  });
  it("filters by company, sorted by plate, and names the driver", () => {
    const rows = busesRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => r.plate)).toEqual(["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]);
    expect(rows.map((r) => r.driverName)).toEqual(["Saliou Sané", "Serigne Mbaye", null]);
    expect(rows[1]).toMatchObject({
      busCode: "BUS-0602", brandModel: "BYD K9", companyName: "Casamance Trans", fleetName: "Flotte principale",
      routeLabel: "Dakar → Touba", status: "active", seatCapacity: 41,
    });
  });
  it("filters by status", () => {
    expect(busesRepo.listRows({ status: "retired" }).map((r) => r.plate)).toEqual(["DK-1023-AB"]);
    expect(busesRepo.listRows({ status: "maintenance" }).map((r) => r.plate).sort())
      .toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    expect(busesRepo.listRows({ status: "active" })).toHaveLength(38);
  });
  it("lists the buses without a driver, one per company at least, combinable with the company filter", () => {
    const rows = busesRepo.listRows({ withoutDriver: true });
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.driverName === null)).toBe(true);
    expect(busesRepo.listRows({ withoutDriver: true, companyId: companyId("Casamance Trans") }).map((r) => r.plate))
      .toEqual(["DK-1052-AB"]);
  });
  it("shows no fleet and no route as null (retired bus, bus outside the fleet)", () => {
    const retired = busesRepo.listRows({ status: "retired" })[0]!;
    expect(retired.routeLabel).toBeNull();
    expect(busesRepo.listRows().filter((r) => r.fleetName === null).map((r) => r.plate).sort())
      .toEqual(["DK-1012-AB", "DK-1041-AB", "DK-1074-AB", "DK-1103-AB"]);
  });
});

describe("busesRepo.detail", () => {
  it("returns undefined for an unknown bus", () => {
    expect(busesRepo.detail("nope", NOW)).toBeUndefined();
  });
  it("lists the three crew assignments by name, in role order, with null when unassigned", () => {
    expect(busesRepo.detail(busId("DK-1050-AB"), NOW)!.crew).toEqual([
      { role: "DRIVER", name: "Saliou Sané" },
      { role: "DRIVER_ASSISTANT", name: "Alioune Lo" },
      { role: "CONTROLLER", name: "Mamadou Diagne" },
    ]);
    expect(busesRepo.detail(busId("DK-1052-AB"), NOW)!.crew.map((c) => c.name)).toEqual([null, null, null]);
  });
  it("computes the expiries against the injected date", () => {
    const d = busesRepo.detail(busId("DK-1051-AB"), NOW)!;
    expect(d.expiries.map((e) => [e.key, e.state, e.daysLeft])).toEqual([
      ["insurance", "soon", 15], ["inspection", "expired", -5], ["registration", "ok", 500],
    ]);
    const later = busesRepo.detail(busId("DK-1051-AB"), new Date(NOW.getTime() + 20 * DAY))!;
    expect(later.expiries.map((e) => e.state)).toEqual(["expired", "expired", "ok"]);
  });
  it("names the company, fleet, route and depot, and lists maintenances and trips newest first", () => {
    const d = busesRepo.detail(busId("DK-1051-AB"), NOW)!;
    expect(d).toMatchObject({
      companyName: "Casamance Trans", currency: "XOF", fleetName: "Flotte principale", routeLabel: "Dakar → Touba",
      depotName: "Gare routière de Ziguinchor",
    });
    expect(d.maintenances.map((m) => [m.code, m.status])).toEqual([["MNT-1016", "CANCELLED"], ["MNT-1014", "COMPLETED"]]);
    expect(d.trips.map((t) => t.status)).toEqual(["cancelled", "departed"]);
  });
});

describe("expiries", () => {
  it("is expired one millisecond before the reference date and soon from the reference date", () => {
    expect(expiryState(at(-1), NOW)).toBe("expired");
    expect(expiryState(at(0), NOW)).toBe("soon");
  });
  it("is soon up to exactly 30 days, ok one millisecond after", () => {
    expect(expiryState(at(30 * DAY), NOW)).toBe("soon");
    expect(expiryState(at(30 * DAY + 1), NOW)).toBe("ok");
  });
  it("rounds to the nearest whole day, negative once past, and never returns -0", () => {
    expect(daysUntil(at(15 * DAY), NOW)).toBe(15);
    expect(daysUntil(at(-5 * DAY), NOW)).toBe(-5);
    expect(daysUntil(at(-12 * DAY - 60_000), NOW)).toBe(-12);
    expect(Object.is(daysUntil(at(-1), NOW), 0)).toBe(true);
    expect(daysUntil(at(DAY / 2), NOW)).toBe(1);
  });
});

describe("seats", () => {
  it("counts free, booked and occupied seats; a blocked seat counts in none", () => {
    expect(seatCounts([
      { code: "1A", state: "blocked" }, { code: "1B", state: "free" }, { code: "1C", state: "booked" },
      { code: "1D", state: "occupied" }, { code: "2A", state: "free" },
    ])).toEqual({ total: 5, free: 2, booked: 1, occupied: 1, blocked: 1 });
  });
  it("places each seat of a trip's map on its row and column, and its free seats equal availableSeats", () => {
    const trip = tripsRepo.listRows({ status: "boarding" }).find((t) => t.busPlate === "DK-1022-AB")!;
    const map = seatMapsRepo.forTrip(trip.id)!;
    expect(map.rows).toBe(8);
    expect(map.columns).toBe(4);
    expect(map.seats.slice(0, 5)).toEqual([
      { code: "1A", state: "blocked", row: 1, column: 1 }, { code: "1B", state: "booked", row: 1, column: 2 },
      { code: "1C", state: "free", row: 1, column: 3 }, { code: "1D", state: "occupied", row: 1, column: 4 },
      { code: "2A", state: "booked", row: 2, column: 1 },
    ]);
    expect(map.counts).toEqual({ total: 29, free: 9, booked: 10, occupied: 9, blocked: 1 });
    expect(map.counts.free).toBe(trip.availableSeats);
    expect(seatMapsRepo.forTrip("nope")).toBeNull();
  });
  it("lists the seat maps as counts only, filterable by company", () => {
    const rows = seatMapsRepo.listRows();
    expect(rows).toHaveLength(56);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "booked", "busId", "busPlate", "companyId", "companyName", "departure", "free", "id", "occupied", "routeLabel",
      "total", "tripId",
    ]);
    const casamance = seatMapsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(casamance).toHaveLength(4);
    for (const r of casamance) {
      const trip = getStore().trips.find((t) => t.id === r.tripId)!;
      expect(r.free).toBe(trip.availableSeats);
      expect(r.free + r.booked + r.occupied).toBeLessThan(r.total);
    }
  });
});

describe("tripsRepo", () => {
  it("projects trips field by field and filters by status and company", () => {
    const rows = tripsRepo.listRows();
    expect(rows).toHaveLength(56);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "arrival", "availableSeats", "busId", "busPlate", "companyId", "companyName", "currency", "departure", "id",
      "price", "routeId", "routeLabel", "status", "totalSeats",
    ]);
    const departures = rows.map((r) => r.departure);
    expect(departures).toEqual([...departures].sort().reverse());
    expect(tripsRepo.listRows({ status: "boarding" }).map((r) => r.busPlate))
      .toEqual(["DK-1022-AB", "DK-1031-AB", "DK-1062-AB", "DK-1071-AB", "DK-1102-AB", "DK-1111-AB"]);
    const casamance = tripsRepo.listRows({ companyId: companyId("Casamance Trans"), status: "departed" });
    expect(casamance.map((r) => r.busPlate).sort()).toEqual(["DK-1051-AB", "DK-1052-AB"]);
  });
  it("details a trip with its route, bus crew and seat map", () => {
    const row = tripsRepo.listRows({ status: "boarding" }).find((t) => t.busPlate === "DK-1022-AB")!;
    const d = tripsRepo.detail(row.id)!;
    expect(d.trip).toMatchObject({ routeLabel: "Saint-Louis → Ziguinchor", price: 6000, currency: "XOF", totalSeats: 29 });
    expect(d.busCode).toBe("BUS-0303");
    expect(d.crew.map((c) => c.name)).toEqual(["Babacar Seck", "Modou Cissé", null]);
    expect(d.seatMap!.counts.free).toBe(d.trip.availableSeats);
    expect(tripsRepo.detail("nope")).toBeUndefined();
  });
});

describe("maintenanceRepo and vendorsRepo", () => {
  it("projects maintenances with labor plus parts, the vendor name, and filters by status and company", () => {
    const rows = maintenanceRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.code, r.busPlate, r.status, r.vendorName, r.totalCost])).toEqual([
      ["MNT-1015", "DK-1050-AB", "PLANNED", "Garage Central Ziguinchor", 70000],
      ["MNT-1016", "DK-1051-AB", "CANCELLED", null, 175000],
      ["MNT-1014", "DK-1051-AB", "COMPLETED", "Garage Central Ziguinchor", 175000],
    ]);
    for (const r of maintenanceRepo.listRows()) expect(r.totalCost).toBe(r.laborCost + r.partsCost);
    expect(maintenanceRepo.listRows({ status: "IN_PROGRESS" }).map((r) => r.busPlate).sort())
      .toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    expect(Object.keys(rows[0]!)).toHaveLength(17);
  });
  it("counts a vendor's non-cancelled interventions and sums the cost of the completed ones", () => {
    const rows = vendorsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows).toEqual([{
      id: rows[0]!.id, name: "Garage Central Ziguinchor", kind: "GARAGE", companyId: companyId("Casamance Trans"),
      companyName: "Casamance Trans", interventions: 2, totalCost: 175000, currency: "XOF",
    }]);
    const insurer = vendorsRepo.listRows({ companyId: companyId("Sahel Express") }).find((v) => v.kind === "INSURER")!;
    expect([insurer.interventions, insurer.totalCost]).toEqual([0, 0]);
    expect(vendorsRepo.listRows()).toHaveLength(18);
  });
});

describe("fleets, stations and routes", () => {
  it("counts the buses of each fleet and names its depot", () => {
    expect(fleetsRepo.listRows({ companyId: companyId("Casamance Trans") })).toEqual([{
      id: getStore().fleets.find((f) => f.companyId === companyId("Casamance Trans"))!.id, name: "Flotte principale",
      companyId: companyId("Casamance Trans"), companyName: "Casamance Trans", depotName: "Gare routière de Ziguinchor",
      busCount: 3,
    }]);
    expect(fleetsRepo.listRows({ companyId: companyId("Baobab Lines") })[0]!.busCount).toBe(1);
  });
  it("counts the routes that serve each station", () => {
    const rows = stationsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.city, r.routeCount])).toEqual([["Dakar", 2], ["Mbour", 1], ["Touba", 2], ["Ziguinchor", 1]]);
    expect(stationsRepo.listRows()).toHaveLength(36);
  });
  it("labels routes by cities and counts their buses and trips", () => {
    const rows = routesRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.label, r.busCount, r.tripCount])).toEqual([
      ["Dakar → Touba", 1, 2], ["Touba → Mbour", 1, 1], ["Ziguinchor → Dakar", 1, 1],
    ]);
    expect(routesRepo.listRows().filter((r) => r.status === "inactive")).toHaveLength(2);
  });
  it("details a route with its stations, buses and trips", () => {
    const route = routesRepo.listRows({ companyId: companyId("Casamance Trans") })[0]!;
    const d = routesRepo.detail(route.id)!;
    expect([d.originName, d.destinationName]).toEqual(["Gare routière de Dakar", "Gare routière de Touba"]);
    expect(d.buses.map((b) => b.plate)).toEqual(["DK-1051-AB"]);
    expect(d.trips).toHaveLength(2);
    expect(routesRepo.detail("nope")).toBeUndefined();
  });
});
