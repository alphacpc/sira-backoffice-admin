import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const rows = () => getStore().apiUsage;
const sum = (list: { count: number }[]) => list.reduce((n, r) => n + r.count, 0);

describe("API traffic seed", () => {
  it("covers the last 30 UTC days, today included, and nothing else", () => {
    const days = [...new Set(rows().map((r) => r.day))].sort();
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-10-04");
    expect(days.at(-1)).toBe("2026-11-02");
  });

  it("uses normalised endpoints, three status classes and the three methods", () => {
    expect(rows().length).toBeGreaterThan(2000);
    for (const r of rows()) {
      expect(r.endpoint).toMatch(/^\/[a-z\-/{}]+$/);
      expect(r.endpoint).not.toMatch(/[0-9a-f]{8}-/);
    }
    expect(new Set(rows().map((r) => r.statusClass))).toEqual(new Set(["2xx", "4xx", "5xx"]));
    expect(new Set(rows().map((r) => r.method))).toEqual(new Set(["GET", "POST", "PATCH"]));
    expect(new Set(rows().map((r) => r.endpoint)).size).toBe(14);
  });

  it("keeps counts positive, a maximum never below the average, and no duplicate aggregate key", () => {
    const keys = new Set<string>();
    for (const r of rows()) {
      expect(r.count).toBeGreaterThan(0);
      expect(r.avgResponseMs).toBeGreaterThan(0);
      expect(r.maxResponseMs).toBeGreaterThanOrEqual(r.avgResponseMs);
      const key = [r.day, r.companyId, r.method, r.endpoint, r.statusClass].join("|");
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  });

  it("attributes traffic to four active companies and to anonymous callers on public endpoints only", () => {
    const s = getStore();
    const companies = new Set(rows().map((r) => r.companyId).filter((c) => c !== null));
    expect(companies.size).toBe(4);
    for (const id of companies) expect(s.companies.find((c) => c.id === id)!.status).toBe("active");
    const anonymousEndpoints = new Set(rows().filter((r) => r.companyId === null).map((r) => r.endpoint));
    expect([...anonymousEndpoints].sort()).toEqual(["/auth/login", "/parcels/track/{id}", "/public/trips/search"]);
  });

  it("shows the parcel incident: more server errors and slower answers during the last two days", () => {
    const recent = new Set(["2026-11-01", "2026-11-02"]);
    const parcel = rows().filter((r) => r.endpoint === "/parcels/track/{id}");
    const share = (list: typeof parcel) => sum(list.filter((r) => r.statusClass === "5xx")) / sum(list);
    const during = parcel.filter((r) => recent.has(r.day));
    const before = parcel.filter((r) => !recent.has(r.day));
    expect(share(during)).toBeGreaterThan(share(before) * 3);
    const ok = (list: typeof parcel) => list.filter((r) => r.statusClass === "2xx");
    const mean = (list: typeof parcel) => list.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / sum(list);
    expect(mean(ok(during))).toBeGreaterThan(mean(ok(before)) * 2);
  });

  it("leaves the other endpoints healthy during the same days", () => {
    const login = rows().filter((r) => r.endpoint === "/auth/login");
    const recent = login.filter((r) => ["2026-11-01", "2026-11-02"].includes(r.day));
    const fiveXx = (list: typeof login) => sum(list.filter((r) => r.statusClass === "5xx")) / sum(list);
    expect(fiveXx(recent)).toBeLessThan(0.02);
  });

  it("holds no address, no user and no identifier of a person", () => {
    expect(JSON.stringify(rows())).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
