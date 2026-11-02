import { beforeEach, describe, expect, it } from "vitest";
import {
  analyticsRepo, apiRepo, incidentTransitionBlock, incidentsRepo, STALE_AFTER_MS, servicesRepo,
} from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const serviceNamed = (name: string) => servicesRepo.list().find((r) => r.name === name)!;
const incidentTitled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;

describe("service health", () => {
  it("takes the most recent check of all services as the reference of the poll", () => {
    const latest = getStore().serviceChecks.map((c) => c.checkedAt).sort().at(-1);
    expect(servicesRepo.referenceTime()).toBe(latest);
    expect(NOW.getTime() - Date.parse(latest!)).toBe(20_000);
  });

  it("lists every service once, sorted, with its latest check and no error rate", () => {
    const rows = servicesRepo.list();
    expect(rows.map((r) => r.name)).toEqual([...new Set(getStore().serviceChecks.map((c) => c.serviceName))].sort());
    expect(servicesRepo.names()).toEqual(rows.map((r) => r.name));
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "checkedAt", "errorRatePercent", "lastChangeAt", "name", "openIncidents", "responseTimeMs", "stale", "status", "uptimePercent",
    ]);
    expect(rows.every((r) => r.errorRatePercent === null)).toBe(true);
    expect(serviceNamed("notification-service")).toMatchObject({ status: "down", stale: false });
    expect(serviceNamed("parcel-service")).toMatchObject({ status: "degraded", stale: false });
    expect(serviceNamed("identity-service")).toMatchObject({ status: "healthy", stale: false });
  });

  it("flags a service as stale only when its last check is strictly more than 90 seconds older than the reference", () => {
    expect(serviceNamed("gateway").stale).toBe(true);
    const s = getStore();
    const target = s.serviceChecks.filter((c) => c.serviceName === "hr-service").sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0]!;
    const ref = Date.parse(servicesRepo.referenceTime()!);
    target.checkedAt = new Date(ref - STALE_AFTER_MS).toISOString();
    expect(serviceNamed("hr-service").stale).toBe(false);
    target.checkedAt = new Date(ref - STALE_AFTER_MS - 1).toISOString();
    expect(serviceNamed("hr-service").stale).toBe(true);
  });

  it("computes the 24-hour availability against the reference, nothing for a stale service", () => {
    expect(serviceNamed("identity-service").uptimePercent).toBe(100);
    expect(serviceNamed("gateway").uptimePercent).toBeNull();
    // notification-service: 48 checks in the window, 6 down => 42/48 = 87.5 %
    expect(serviceNamed("notification-service").uptimePercent).toBe(87.5);
    // parcel-service: 4 degraded of 48 => 44/48 = 91.7 %
    expect(serviceNamed("parcel-service").uptimePercent).toBe(91.7);
    // booking-service: one blip of 48 => 97.9 %
    expect(serviceNamed("booking-service").uptimePercent).toBe(97.9);
  });

  it("includes a check exactly 24 hours before the reference in the availability window", () => {
    const s = getStore();
    const ref = Date.parse(servicesRepo.referenceTime()!);
    const template = s.serviceChecks.find((c) => c.serviceName === "identity-service")!;
    s.serviceChecks.push({ ...template, id: "00000000-0000-4000-8000-0000000000aa", status: "down", checkedAt: new Date(ref - 24 * 3_600_000).toISOString() });
    expect(serviceNamed("identity-service").uptimePercent).toBe(98);
  });

  it("finds the most recent state change of a service", () => {
    const s = getStore();
    const checks = s.serviceChecks.filter((c) => c.serviceName === "notification-service").sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    expect(serviceNamed("notification-service").lastChangeAt).toBe(checks.at(-6)!.checkedAt);
    expect(serviceNamed("identity-service").lastChangeAt).toBeNull();
    const booking = s.serviceChecks.filter((c) => c.serviceName === "booking-service").sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    expect(serviceNamed("booking-service").lastChangeAt).toBe(booking[21]!.checkedAt);
  });

  it("counts the open incidents of each service", () => {
    expect(serviceNamed("notification-service").openIncidents).toBe(1);
    expect(serviceNamed("parcel-service").openIncidents).toBe(1);
    expect(serviceNamed("fleet-service").openIncidents).toBe(0);
  });

  it("counts a stale service only as stale", () => {
    expect(servicesRepo.stats()).toEqual({ healthy: 8, degraded: 1, down: 1, stale: 1 });
  });

  it("returns the 48 latest checks of a service, oldest first, and nothing for an unknown one", () => {
    const history = servicesRepo.history("notification-service");
    expect(history).toHaveLength(48);
    for (let i = 1; i < history.length; i++) expect(history[i - 1]!.at < history[i]!.at).toBe(true);
    expect(history.slice(-6).every((p) => p.status === "down")).toBe(true);
    expect(Object.keys(history[0]!).sort()).toEqual(["at", "responseTimeMs", "status"]);
    expect(servicesRepo.history("gateway")).toHaveLength(12);
    expect(servicesRepo.history("inconnu")).toEqual([]);
  });

  it("gives the dashboard the live services only", () => {
    const live = servicesRepo.latestLive();
    expect(live.map((s) => s.name)).not.toContain("gateway");
    expect(live).toHaveLength(10);
    expect(live.find((s) => s.name === "notification-service")).toEqual({ name: "notification-service", status: "down", responseTimeMs: expect.any(Number) });
    expect(live.find((s) => s.name === "notification-service")!.responseTimeMs).toBeGreaterThanOrEqual(8000);
  });
});

describe("incident transitions", () => {
  it("allows moving forward, jumps included, and refuses everything else in the documented order", () => {
    const at = (status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED") => ({ status });
    expect(incidentTransitionBlock(at("INVESTIGATING"), "IDENTIFIED")).toBeNull();
    expect(incidentTransitionBlock(at("INVESTIGATING"), "RESOLVED")).toBeNull();
    expect(incidentTransitionBlock(at("IDENTIFIED"), "MONITORING")).toBeNull();
    expect(incidentTransitionBlock(at("MONITORING"), "RESOLVED")).toBeNull();
    expect(incidentTransitionBlock(at("IDENTIFIED"), "IDENTIFIED")).toBe("L'incident est déjà dans cet état");
    expect(incidentTransitionBlock(at("IDENTIFIED"), "INVESTIGATING")).toBe("Un incident ne peut pas revenir en arrière");
    expect(incidentTransitionBlock(at("MONITORING"), "IDENTIFIED")).toBe("Un incident ne peut pas revenir en arrière");
    for (const target of ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const) {
      expect(incidentTransitionBlock(at("RESOLVED"), target)).toBe("Un incident résolu ne peut plus changer de statut");
    }
  });
});

describe("incident list and detail", () => {
  it("lists incidents newest first and filters by status, severity and service", () => {
    const all = incidentsRepo.listRows({});
    expect(all).toHaveLength(8);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.detectedAt >= all[i]!.detectedAt).toBe(true);
    expect(incidentsRepo.listRows({ status: "RESOLVED" })).toHaveLength(5);
    expect(incidentsRepo.listRows({ severity: "HIGH" }).every((r) => r.severity === "HIGH")).toBe(true);
    expect(incidentsRepo.listRows({ serviceName: "parcel-service" }).map((r) => r.title)).toEqual(["Latence élevée sur les colis"]);
    expect(incidentsRepo.listRows({ status: "RESOLVED", severity: "CRITICAL" })).toHaveLength(1);
  });

  it("exposes only client-safe fields (no description) and names the touched company", () => {
    const rows = incidentsRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "companyName", "detectedAt", "hasPostmortem", "id", "impactScope", "incidentCode", "resolvedAt", "serviceName",
      "severity", "status", "title",
    ]);
    const text = JSON.stringify(rows);
    for (const i of getStore().systemIncidents) if (i.description) expect(text).not.toContain(i.description);
    const single = rows.find((r) => r.title === "Échecs de réservation sur une compagnie")!;
    expect(single.companyName).toBe(getStore().companies.find((c) => c.id === incidentTitled(single.title).affectedCompanyId)!.name);
    expect(rows.find((r) => r.title === "Latence élevée sur les colis")!.companyName).toBeNull();
    expect(rows.find((r) => r.title === "Indisponibilité de la flotte")!.hasPostmortem).toBe(true);
  });

  it("returns the detail with an ongoing or final duration, undefined when unknown", () => {
    expect(incidentsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
    const open = incidentsRepo.detail(incidentTitled("Latence élevée sur les colis").id, NOW)!;
    expect(open.durationMinutes).toBe(1440);
    expect(open.companyName).toBeNull();
    const done = incidentsRepo.detail(incidentTitled("Échec de connexion intermittent").id, NOW)!;
    expect(done.durationMinutes).toBe(720);
    const later = incidentsRepo.detail(incidentTitled("Latence élevée sur les colis").id, new Date(NOW.getTime() + DAY))!;
    expect(later.durationMinutes).toBe(2880);
    expect(incidentsRepo.detail(incidentTitled("Échec de connexion intermittent").id, new Date(NOW.getTime() + DAY))!.durationMinutes).toBe(720);
  });
});

describe("API traffic summary", () => {
  it("totals the window with weighted averages and error shares", () => {
    const s = getStore();
    const summary = apiRepo.summary({ days: 7 }, NOW);
    const window = s.apiUsage.filter((r) => r.day >= "2026-10-27");
    const count = window.reduce((n, r) => n + r.count, 0);
    expect(summary.days).toBe(7);
    expect(summary.from).toBe("2026-10-27");
    expect(summary.to).toBe("2026-11-02");
    expect(summary.totals.count).toBe(count);
    expect(summary.totals.avgResponseMs).toBe(Math.round(window.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / count));
    expect(summary.totals.maxResponseMs).toBe(Math.max(...window.map((r) => r.maxResponseMs)));
    expect(summary.totals.serverErrorPercent).toBe(Math.round((window.filter((r) => r.statusClass === "5xx").reduce((n, r) => n + r.count, 0) / count) * 1000) / 10);
    expect(summary.totals.clientErrorPercent).toBeGreaterThan(0);
  });

  it("returns one row per day of the window, oldest first, with counts that add up", () => {
    const summary = apiRepo.summary({ days: 14 }, NOW);
    expect(summary.byDay).toHaveLength(14);
    expect(summary.byDay[0]!.day).toBe("2026-10-20");
    expect(summary.byDay.at(-1)!.day).toBe("2026-11-02");
    const total = summary.byDay.reduce((n, d) => n + d.ok + d.clientErrors + d.serverErrors, 0);
    expect(total).toBe(summary.totals.count);
    expect(Object.keys(summary.byDay[0]!).sort()).toEqual(["clientErrors", "day", "ok", "serverErrors"]);
  });

  it("groups by method and endpoint, busiest first", () => {
    const summary = apiRepo.summary({ days: 30 }, NOW);
    expect(summary.byEndpoint).toHaveLength(14);
    for (let i = 1; i < summary.byEndpoint.length; i++) expect(summary.byEndpoint[i - 1]!.count >= summary.byEndpoint[i]!.count).toBe(true);
    expect(Object.keys(summary.byEndpoint[0]!).sort()).toEqual([
      "avgResponseMs", "clientErrorPercent", "count", "endpoint", "maxResponseMs", "method", "serverErrorPercent",
    ]);
    const parcel = summary.byEndpoint.find((e) => e.endpoint === "/parcels/track/{id}")!;
    expect(parcel.method).toBe("GET");
    expect(parcel.clientErrorPercent).toBeGreaterThan(5);
    expect(summary.byEndpoint.reduce((n, e) => n + e.count, 0)).toBe(summary.totals.count);
  });

  it("filters by company and rejects nothing: an unknown company simply has no traffic", () => {
    const s = getStore();
    const id = s.apiUsage.find((r) => r.companyId)!.companyId!;
    const mine = apiRepo.summary({ days: 30, companyId: id }, NOW);
    expect(mine.totals.count).toBe(s.apiUsage.filter((r) => r.companyId === id).reduce((n, r) => n + r.count, 0));
    expect(mine.totals.count).toBeLessThan(apiRepo.summary({ days: 30 }, NOW).totals.count);
    const none = apiRepo.summary({ days: 30, companyId: "00000000-0000-4000-8000-000000000000" }, NOW);
    expect(none.totals).toEqual({ count: 0, avgResponseMs: 0, maxResponseMs: 0, clientErrorPercent: 0, serverErrorPercent: 0 });
    expect(none.byEndpoint).toEqual([]);
    expect(none.byDay).toHaveLength(30);
  });

  it("moves with the injected clock", () => {
    const later = apiRepo.summary({ days: 7 }, new Date(NOW.getTime() + 3 * DAY));
    expect(later.to).toBe("2026-11-05");
    expect(later.totals.count).toBeLessThan(apiRepo.summary({ days: 7 }, NOW).totals.count);
  });
});

describe("derived product usage", () => {
  it("counts the events of the window from the data the other screens show", () => {
    const s = getStore();
    const summary = analyticsRepo.summary({ days: 30 }, NOW);
    const byName = new Map(summary.byEvent.map((e) => [e.eventName, e]));
    const inWindow = (iso: string) => Date.parse(iso) >= Date.UTC(2026, 9, 4) && Date.parse(iso) < Date.UTC(2026, 10, 3);
    expect(byName.get("booking_created")!.count).toBe(s.bookings.filter((b) => inWindow(b.createdAt)).length);
    expect(byName.get("payment_completed")!.count).toBe(s.transactions.filter((t) => t.status === "COMPLETED" && t.completedAt && inWindow(t.completedAt)).length);
    expect(byName.get("ticket_issued")!.count).toBe(s.tickets.filter((t) => inWindow(t.issuedAt)).length);
    expect(byName.get("parcel_created")!.count).toBe(s.parcelHistory.filter((h) => h.previousStatus === null && inWindow(h.changedAt)).length);
    expect(byName.get("parcel_status_changed")!.count).toBe(s.parcelHistory.filter((h) => h.previousStatus !== null && inWindow(h.changedAt)).length);
    expect(byName.get("feedback_responded")!.count).toBe(s.feedbacks.filter((f) => f.respondedAt && inWindow(f.respondedAt)).length);
    expect(summary.totals.events).toBe(summary.byEvent.reduce((n, e) => n + e.count, 0));
  });

  it("assigns categories, counts distinct users per event and never counts a parcel user", () => {
    const summary = analyticsRepo.summary({ days: 30 }, NOW);
    const byName = new Map(summary.byEvent.map((e) => [e.eventName, e]));
    expect(byName.get("booking_created")!.eventCategory).toBe("booking");
    expect(byName.get("parcel_created")!.eventCategory).toBe("parcel");
    expect(byName.get("feedback_responded")!.eventCategory).toBe("customer");
    expect(byName.get("parcel_created")!.distinctUsers).toBe(0);
    expect(byName.get("booking_created")!.distinctUsers).toBeGreaterThan(0);
    expect(byName.get("booking_created")!.distinctUsers).toBeLessThanOrEqual(4);
    expect(byName.get("booking_created")!.activeDays).toBeGreaterThan(0);
    expect(summary.totals.distinctUsers).toBeGreaterThanOrEqual(byName.get("booking_created")!.distinctUsers);
    expect(Object.keys(summary.byEvent[0]!).sort()).toEqual(["activeDays", "count", "distinctUsers", "eventCategory", "eventName"]);
  });

  it("returns one row per day of the window with the three categories", () => {
    const summary = analyticsRepo.summary({ days: 7 }, NOW);
    expect(summary.byDay).toHaveLength(7);
    expect(summary.byDay.at(-1)!.day).toBe("2026-11-02");
    expect(Object.keys(summary.byDay[0]!).sort()).toEqual(["booking", "customer", "day", "parcel"]);
    const total = summary.byDay.reduce((n, d) => n + d.booking + d.parcel + d.customer, 0);
    expect(total).toBe(summary.totals.events);
  });

  it("filters by company and shrinks the window when asked for fewer days", () => {
    const s = getStore();
    const companyId = s.bookings[0]!.companyId;
    const mine = analyticsRepo.summary({ days: 30, companyId }, NOW);
    expect(mine.totals.events).toBeLessThan(analyticsRepo.summary({ days: 30 }, NOW).totals.events);
    expect(analyticsRepo.summary({ days: 7 }, NOW).totals.events).toBeLessThanOrEqual(analyticsRepo.summary({ days: 30 }, NOW).totals.events);
    expect(analyticsRepo.summary({ days: 30, companyId: "00000000-0000-4000-8000-000000000000" }, NOW).totals).toEqual({ events: 0, distinctUsers: 0 });
  });
});
