import { beforeEach, describe, expect, it } from "vitest";
import { dashboardRepo } from "@/lib/repos/dashboard";
import { resetStore } from "@/lib/repos/store";

beforeEach(() => resetStore());

describe("dashboardRepo.overview", () => {
  it("derives KPIs from the store", () => {
    const o = dashboardRepo.overview();
    expect(o.kpis.companies).toBe(20);
    expect(o.kpis.active).toBe(12);
    expect(o.kpis.draft).toBe(5);
    expect(o.kpis.openIncidents).toBe(2);
    expect(o.kpis.pastDue).toBe(2);
    expect(o.kpis.pendingKyc).toBeGreaterThan(0);
  });
  it("lists past-due subscriptions with company names", () => {
    const o = dashboardRepo.overview();
    expect(o.pastDue).toHaveLength(2);
    expect(o.pastDue.every((s) => s.companyName.length > 0)).toBe(true);
  });
  it("computes days left for data-subject requests, soonest first", () => {
    const o = dashboardRepo.overview(new Date());
    const days = o.dsr.map((d) => d.daysLeft);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(days[0]).toBeLessThan(0);
  });
  it("returns at most 8 recent activity entries, newest first", () => {
    const o = dashboardRepo.overview();
    expect(o.activity.length).toBeLessThanOrEqual(8);
    const at = o.activity.map((a) => a.at);
    expect([...at].sort().reverse()).toEqual(at);
  });
});
