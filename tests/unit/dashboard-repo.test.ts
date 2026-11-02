import { beforeEach, describe, expect, it } from "vitest";
import { dashboardRepo } from "@/lib/repos/dashboard";
import { getStore, resetStore } from "@/lib/repos/store";

beforeEach(() => resetStore());

describe("dashboardRepo.overview", () => {
  it("derives KPIs from the store", () => {
    const o = dashboardRepo.overview();
    expect(o.kpis.companies).toBe(20);
    expect(o.kpis.active).toBe(12);
    expect(o.kpis.draft).toBe(5);
    expect(o.kpis.openIncidents).toBe(getStore().systemIncidents.filter((i) => i.status !== "RESOLVED").length);
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
  it("lists only open data-subject requests with the requester's name", () => {
    const s = getStore();
    const o = dashboardRepo.overview(new Date());
    const open = s.dataSubjectRequests.filter((d) => d.status === "RECEIVED" || d.status === "IN_PROGRESS");
    expect(o.dsr).toHaveLength(open.length);
    expect(o.dsr.length).toBeGreaterThan(0);
    for (const d of o.dsr) {
      const source = open.find((x) => x.id === d.id)!;
      expect(d.requesterName).toBe(s.users.find((u) => u.id === source.requesterUserId)!.displayName);
      expect(Object.keys(d).sort()).toEqual(["daysLeft", "dueDate", "id", "requestType", "requesterName"]);
    }
  });
  it("shows the live services and the open incidents of the monitoring data", () => {
    const o = dashboardRepo.overview(new Date());
    expect(o.services).toHaveLength(10);
    expect(o.services.map((s) => s.name)).not.toContain("gateway");
    expect(o.services.find((s) => s.name === "notification-service")!.status).toBe("down");
    expect(o.incidents.length).toBe(o.kpis.openIncidents);
    expect(o.incidents.every((i) => i.status !== "RESOLVED")).toBe(true);
    const at = o.incidents.map((i) => i.detectedAt);
    expect([...at].sort().reverse()).toEqual(at);
  });
});

describe("backoffice-scoped activity", () => {
  it("is left out of the Vue 360 recent activity but still listed by the journal", async () => {
    const { journalRepo, adminsRepo } = await import("@/lib/repos/backoffice");
    const seeded = getStore().activity.filter((a) => a.scope === "backoffice");
    expect(seeded.length).toBeGreaterThan(0);
    adminsRepo.invite({ identifier: "nouveau.admin@sira.app", displayName: "Nouveau Admin" }, "admin@sira.app");
    const ids = new Set(dashboardRepo.overview().activity.map((a) => a.id));
    const scoped = getStore().activity.filter((a) => a.scope === "backoffice");
    expect(scoped.length).toBe(seeded.length + 1);
    expect(scoped.some((a) => ids.has(a.id))).toBe(false);
    const journalIds = new Set(journalRepo.list({}, new Date()).map((r) => r.id));
    expect(scoped.filter((a) => journalIds.has(a.id)).length).toBeGreaterThan(0);
    expect(journalRepo.list({}, new Date()).some((r) => r.action.includes("nouveau.admin@sira.app"))).toBe(true);
  });
});
