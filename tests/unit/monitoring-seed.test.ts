import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const checksOf = (name: string) =>
  getStore().serviceChecks.filter((c) => c.serviceName === name).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
const incidentTitled = (title: string) => {
  const found = getStore().systemIncidents.filter((i) => i.title === title);
  expect(found, title).toHaveLength(1);
  return found[0]!;
};

describe("service checks seed", () => {
  it("polls ten live services 48 times each, every 30 minutes, plus a retired gateway", () => {
    const s = getStore();
    const names = [...new Set(s.serviceChecks.map((c) => c.serviceName))].sort();
    expect(names).toEqual([
      "audit-compliance-service", "booking-service", "company-service", "customer-service", "fleet-service", "gateway",
      "hr-service", "identity-service", "monitoring-service", "notification-service", "parcel-service",
    ]);
    for (const name of names.filter((n) => n !== "gateway")) {
      const checks = checksOf(name);
      expect(checks, name).toHaveLength(48);
      for (let i = 1; i < checks.length; i++) {
        expect(Date.parse(checks[i]!.checkedAt) - Date.parse(checks[i - 1]!.checkedAt), name).toBe(30 * MINUTE);
      }
    }
    expect(checksOf("gateway")).toHaveLength(12);
    expect(new Set(s.serviceChecks.map((c) => c.id)).size).toBe(s.serviceChecks.length);
  });

  it("ends the live services 20 seconds before the seed date and the gateway two days earlier", () => {
    for (const name of ["identity-service", "notification-service", "monitoring-service"]) {
      expect(NOW.getTime() - Date.parse(checksOf(name).at(-1)!.checkedAt)).toBe(20_000);
    }
    expect(NOW.getTime() - Date.parse(checksOf("gateway").at(-1)!.checkedAt)).toBeGreaterThan(2 * DAY - 31 * MINUTE);
    for (const c of getStore().serviceChecks) expect(Date.parse(c.checkedAt)).toBeLessThan(NOW.getTime());
  });

  it("puts notification-service down, parcel-service degraded and booking-service through a single blip", () => {
    const tail = (name: string, n: number) => checksOf(name).slice(-n).map((c) => c.status);
    expect(tail("notification-service", 6)).toEqual(Array(6).fill("down"));
    expect(checksOf("notification-service").at(-7)!.status).toBe("healthy");
    expect(tail("parcel-service", 4)).toEqual(Array(4).fill("degraded"));
    expect(checksOf("parcel-service").at(-5)!.status).toBe("healthy");
    const booking = checksOf("booking-service");
    expect(booking.filter((c) => c.status !== "healthy")).toHaveLength(1);
    expect(booking.at(-1)!.status).toBe("healthy");
    for (const name of ["identity-service", "company-service", "fleet-service", "hr-service", "gateway"]) {
      expect(checksOf(name).every((c) => c.status === "healthy"), name).toBe(true);
    }
  });

  it("gives a response time coherent with the status and never computes an error rate", () => {
    for (const c of getStore().serviceChecks) {
      expect(c.environment).toBe("production");
      expect(c.errorRatePercent).toBeNull();
      if (c.status === "healthy") expect(c.responseTimeMs).toBeLessThan(1000);
      if (c.status === "degraded") expect(c.responseTimeMs).toBeGreaterThanOrEqual(1000);
      if (c.status === "down") expect(c.responseTimeMs).toBeGreaterThanOrEqual(8000);
    }
  });
});

describe("system incidents seed", () => {
  it("has eight incidents with unique codes covering the four statuses, four severities and three scopes", () => {
    const list = getStore().systemIncidents;
    expect(list).toHaveLength(8);
    expect(new Set(list.map((i) => i.incidentCode)).size).toBe(8);
    for (const i of list) expect(i.incidentCode).toMatch(/^SYS-[0-9A-Z]{8}$/);
    expect(new Set(list.map((i) => i.status))).toEqual(new Set(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]));
    expect(new Set(list.map((i) => i.severity))).toEqual(new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]));
    expect(new Set(list.map((i) => i.impactScope))).toEqual(new Set(["SINGLE_COMPANY", "MULTI_COMPANY", "PLATFORM_WIDE"]));
    expect(list.filter((i) => i.status !== "RESOLVED")).toHaveLength(3);
  });

  it("keeps the incident invariants: company iff single-company scope, resolution date iff resolved", () => {
    const s = getStore();
    for (const i of s.systemIncidents) {
      expect(i.affectedCompanyId !== null, i.incidentCode).toBe(i.impactScope === "SINGLE_COMPANY");
      if (i.affectedCompanyId) expect(s.companies.some((c) => c.id === i.affectedCompanyId)).toBe(true);
      expect(i.resolvedAt !== null, i.incidentCode).toBe(i.status === "RESOLVED");
      if (i.resolvedAt) expect(i.resolvedAt > i.detectedAt).toBe(true);
      expect(Date.parse(i.detectedAt)).toBeLessThan(NOW.getTime());
      expect(i.createdAt).toBe(i.detectedAt);
      expect(i.reportedBy).toBe("admin@sira.app");
      expect(i.title.length).toBeGreaterThan(5);
      if (i.postmortemUrl) expect(i.postmortemUrl).toMatch(/^https:\/\//);
    }
    expect(new Set(s.systemIncidents.map((i) => i.id)).size).toBe(8);
  });

  it("names the four scenarios in the expected states", () => {
    expect(incidentTitled("Échecs de réservation sur une compagnie")).toMatchObject({ status: "IDENTIFIED", impactScope: "SINGLE_COMPANY" });
    expect(incidentTitled("Latence élevée sur les colis")).toMatchObject({ status: "MONITORING", serviceName: "parcel-service" });
    const noPostmortem = incidentTitled("Échec de connexion intermittent");
    expect(noPostmortem).toMatchObject({ status: "RESOLVED", postmortemUrl: null });
    expect(incidentTitled("Retard de synchronisation RH")).toMatchObject({ status: "RESOLVED", postmortemUrl: null, impactScope: "SINGLE_COMPANY" });
    expect(getStore().systemIncidents.filter((i) => i.postmortemUrl !== null)).toHaveLength(2);
  });

  it("matches the open incidents to the services that are currently unhealthy", () => {
    const open = getStore().systemIncidents.filter((i) => i.status !== "RESOLVED").map((i) => i.serviceName);
    expect(open).toEqual(expect.arrayContaining(["notification-service", "parcel-service"]));
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().systemIncidents.map(({ reportedBy: _r, ...rest }) => rest))).not.toMatch(/@|\+221/);
  });
});
