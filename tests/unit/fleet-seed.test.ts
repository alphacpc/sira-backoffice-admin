import { beforeEach, describe, expect, it } from "vitest";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore, resetStore } from "@/lib/repos/store";
import type { CrewRole } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const companyOf = (name: string) => getStore().companies.find((c) => c.name === name)!;
const busByPlate = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;

describe("fleet seed: volumes", () => {
  it("gives each active company as many buses as its plan's usedBuses, capped by maxBuses, never fewer than 2", () => {
    const s = getStore();
    for (const c of s.companies) {
      const count = s.buses.filter((b) => b.companyId === c.id).length;
      if (c.status !== "active") { expect(count).toBe(0); continue; }
      const limits = s.limits[c.id]!;
      expect(count).toBe(Math.max(2, Math.min(limits.maxBuses, limits.usedBuses)));
    }
    expect(s.buses).toHaveLength(42);
  });

  it("has 2 to 4 stations, 2 to 3 routes, one fleet and 1 to 2 vendors per active company, nothing for the others", () => {
    const s = getStore();
    for (const c of s.companies) {
      const of = <T extends { companyId: string }>(list: T[]) => list.filter((x) => x.companyId === c.id).length;
      if (c.status !== "active") {
        expect([of(s.stations), of(s.routes), of(s.fleets), of(s.vendors)]).toEqual([0, 0, 0, 0]);
        continue;
      }
      expect(of(s.stations)).toBeGreaterThanOrEqual(2);
      expect(of(s.stations)).toBeLessThanOrEqual(4);
      expect(of(s.routes)).toBeGreaterThanOrEqual(2);
      expect(of(s.routes)).toBeLessThanOrEqual(3);
      expect(of(s.fleets)).toBe(1);
      expect(of(s.vendors)).toBeGreaterThanOrEqual(1);
      expect(of(s.vendors)).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the counts pinned by lots 1 to 3", () => {
    const s = getStore();
    expect(s.companies).toHaveLength(20);
    expect(s.employees).toHaveLength(50);
    expect(s.users).toHaveLength(51);
    expect(s.subscriptions).toHaveLength(15);
  });
});

describe("fleet seed: references", () => {
  it("only references entities that exist in the same company", () => {
    const s = getStore();
    const same = <T extends { id: string; companyId: string }>(list: T[], id: string | null, companyId: string) => {
      if (id === null) return;
      expect(list.find((x) => x.id === id)?.companyId).toBe(companyId);
    };
    for (const r of s.routes) {
      same(s.stations, r.originId, r.companyId);
      same(s.stations, r.destinationId, r.companyId);
      expect(r.originId).not.toBe(r.destinationId);
    }
    for (const f of s.fleets) same(s.stations, f.depotId, f.companyId);
    for (const b of s.buses) {
      same(s.fleets, b.fleetId, b.companyId);
      same(s.routes, b.routeId, b.companyId);
      same(s.stations, b.depotId, b.companyId);
      same(s.crew, b.driverId, b.companyId);
      same(s.crew, b.driverAssistantId, b.companyId);
      same(s.crew, b.controllerId, b.companyId);
    }
    for (const t of s.trips) {
      same(s.buses, t.busId, t.companyId);
      same(s.routes, t.routeId, t.companyId);
      expect(s.buses.find((b) => b.id === t.busId)!.routeId).toBe(t.routeId);
    }
    for (const m of s.seatMaps) {
      same(s.buses, m.busId, m.companyId);
      same(s.trips, m.tripId, m.companyId);
      expect(s.trips.find((t) => t.id === m.tripId)!.busId).toBe(m.busId);
    }
    for (const m of s.maintenances) {
      same(s.buses, m.busId, m.companyId);
      same(s.vendors, m.vendorId, m.companyId);
    }
    expect(s.maintenances.length).toBeGreaterThan(0);
  });

  it("assigns each crew member to at most one bus, in the role of the field", () => {
    const s = getStore();
    const fields: [keyof Pick<typeof s.buses[number], "driverId" | "driverAssistantId" | "controllerId">, CrewRole][] = [
      ["driverId", "DRIVER"], ["driverAssistantId", "DRIVER_ASSISTANT"], ["controllerId", "CONTROLLER"],
    ];
    const assigned: string[] = [];
    for (const b of s.buses) {
      for (const [field, role] of fields) {
        const id = b[field];
        if (id === null) continue;
        expect(s.crew.find((c) => c.id === id)!.role).toBe(role);
        assigned.push(id);
      }
    }
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.length).toBeGreaterThan(0);
  });

  it("leaves at least one bus per company without a driver and gives the others 1 to 3 assignments", () => {
    const s = getStore();
    const counts = s.buses.map((b) => [b.driverId, b.driverAssistantId, b.controllerId].filter((x) => x !== null).length);
    expect(new Set(counts)).toEqual(new Set([0, 1, 2, 3]));
    for (const companyId of new Set(s.buses.map((b) => b.companyId))) {
      expect(s.buses.some((b) => b.companyId === companyId && b.driverId === null)).toBe(true);
    }
    expect(s.buses.filter((b) => b.driverId === null)).toHaveLength(12);
  });

  it("keeps crew members free of personal data", () => {
    for (const c of getStore().crew) {
      expect(Object.keys(c).sort()).toEqual(["companyId", "id", "name", "role"]);
      expect(c.name).not.toMatch(/@|\+221|\d/);
    }
  });
});

describe("fleet seed: statuses, seats, costs and expiries", () => {
  it("has one retired bus with a retirement date and no trip, and every bus in maintenance has an in-progress maintenance", () => {
    const s = getStore();
    const retired = s.buses.filter((b) => b.status === "retired");
    expect(retired.map((b) => b.plate)).toEqual(["DK-1023-AB"]);
    expect(retired[0]!.retiredAt).not.toBeNull();
    expect(s.trips.filter((t) => t.busId === retired[0]!.id)).toHaveLength(0);
    expect(s.buses.filter((b) => b.status !== "retired").every((b) => b.retiredAt === null)).toBe(true);
    const inMaintenance = s.buses.filter((b) => b.status === "maintenance");
    expect(inMaintenance.map((b) => b.plate)).toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    for (const b of inMaintenance) {
      expect(s.maintenances.some((m) => m.busId === b.id && m.status === "IN_PROGRESS")).toBe(true);
      expect(s.trips.some((t) => t.busId === b.id && (t.status === "planned" || t.status === "boarding"))).toBe(false);
    }
  });

  it("covers the four maintenance statuses and computes totalCost as labor plus parts", () => {
    const s = getStore();
    expect(new Set(s.maintenances.map((m) => m.status))).toEqual(new Set(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
    for (const m of s.maintenances) {
      expect(m.totalCost).toBe(m.laborCost + m.partsCost);
      expect(m.code).toMatch(/^MNT-\d+$/);
      expect(m.completedAt !== null).toBe(m.status === "COMPLETED");
      expect(m.startedAt !== null).toBe(m.status === "COMPLETED" || m.status === "IN_PROGRESS");
    }
  });

  it("gives every trip one seat map whose seats match totalSeats and whose free seats equal availableSeats", () => {
    const s = getStore();
    expect(s.seatMaps).toHaveLength(s.trips.length);
    for (const t of s.trips) {
      const map = s.seatMaps.filter((m) => m.tripId === t.id);
      expect(map).toHaveLength(1);
      const seats = map[0]!.seats;
      expect(seats).toHaveLength(t.totalSeats);
      expect(new Set(seats.map((x) => x.code)).size).toBe(seats.length);
      expect(map[0]!.rows * map[0]!.columns).toBeGreaterThanOrEqual(seats.length);
      expect(t.availableSeats).toBe(seats.filter((x) => x.state === "free").length);
    }
    const states = new Set(s.seatMaps.flatMap((m) => m.seats.map((x) => x.state)));
    expect(states).toEqual(new Set(["free", "booked", "occupied", "blocked"]));
    expect(new Set(s.trips.map((t) => t.status))).toEqual(new Set(["planned", "boarding", "departed", "cancelled"]));
  });

  it("spreads the expiries around the reference date: some expired, some within 30 days, some later", () => {
    const days = getStore().buses.flatMap((b) => [b.insuranceExpiry, b.technicalInspectionExpiry, b.registrationExpiry])
      .map((d) => (new Date(d).getTime() - NOW.getTime()) / DAY);
    expect(days.some((d) => d < 0)).toBe(true);
    expect(days.some((d) => d >= 0 && d <= 30)).toBe(true);
    expect(days.some((d) => d > 30)).toBe(true);
  });
});

describe("company page fleet projections", () => {
  it("hands the company page plates, statuses, route labels and departures only, trips by departure", () => {
    const detail = companiesRepo.detail(companyOf("Casamance Trans").id)!;
    expect(detail.buses.map((b) => b.plate)).toEqual(["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]);
    for (const b of detail.buses) expect(Object.keys(b).sort()).toEqual(["companyId", "id", "plate", "status"]);
    expect(detail.trips.length).toBeGreaterThan(1);
    for (const t of detail.trips) {
      expect(Object.keys(t).sort()).toEqual(["companyId", "departure", "id", "route", "status"]);
      expect(t.route).toMatch(/^[A-Za-zÀ-ÿ' -]+ → [A-Za-zÀ-ÿ' -]+$/);
    }
    const departures = detail.trips.map((t) => t.departure);
    expect(departures).toEqual([...departures].sort());
    expect(busByPlate("DK-1051-AB").companyId).toBe(companyOf("Casamance Trans").id);
  });
});
