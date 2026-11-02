import { beforeEach, describe, expect, it } from "vitest";
import { incidentsRepo, type IncidentInput } from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const titled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;
const companyId = () => getStore().companies.find((c) => c.status === "active")!.id;
const valid = (over: Partial<IncidentInput> = {}): IncidentInput => ({
  title: "Lenteur des réservations", serviceName: "booking-service", severity: "HIGH", impactScope: "PLATFORM_WIDE",
  affectedCompanyId: null, description: "Les réservations répondent lentement.", ...over,
});
const declare = (over: Partial<IncidentInput> = {}) => incidentsRepo.declare(valid(over), "tester@sira.app", NOW);
const counts = () => {
  const s = getStore();
  return { incidents: s.systemIncidents.length, audit: s.auditLogs.length, activity: s.activity.length };
};

describe("declaring an incident", () => {
  it("creates it as investigating with a generated code, the actor, and journals it without the description", () => {
    const before = counts();
    const incident = declare();
    expect(incident).toMatchObject({
      status: "INVESTIGATING", severity: "HIGH", impactScope: "PLATFORM_WIDE", affectedCompanyId: null,
      title: "Lenteur des réservations", serviceName: "booking-service", description: "Les réservations répondent lentement.",
      detectedAt: NOW.toISOString(), createdAt: NOW.toISOString(), resolvedAt: null, postmortemUrl: null,
      reportedBy: "tester@sira.app", updatedAt: null,
    });
    expect(incident.incidentCode).toMatch(/^SYS-[0-9A-Z]{8}$/);
    const s = getStore();
    expect(s.systemIncidents.at(-1)).toBe(incident);
    expect(counts()).toEqual({ incidents: before.incidents + 1, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: null, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "CREATE",
      entityType: "SystemIncident", entityId: incident.id, beforeState: null,
      afterState: { status: "INVESTIGATING", severity: "HIGH", impactScope: "PLATFORM_WIDE" },
      sourceService: "monitoring-service", createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ companyId: null, actor: "tester@sira.app", at: NOW.toISOString() });
    expect(s.activity[0]!.action).toBe(`Incident ${incident.incidentCode} déclaré (Haute) sur booking-service`);
    expect(JSON.stringify([s.auditLogs.at(-1), s.activity[0]])).not.toContain("répondent lentement");
  });

  it("attaches a single-company incident to its company and trims text", () => {
    const id = companyId();
    const incident = declare({ title: "  Panne locale  ", serviceName: " fleet-service ", impactScope: "SINGLE_COMPANY", affectedCompanyId: id, description: "   " });
    expect(incident).toMatchObject({ title: "Panne locale", serviceName: "fleet-service", affectedCompanyId: id, description: null });
    expect(getStore().auditLogs.at(-1)!.companyId).toBe(id);
    expect(getStore().activity[0]!.companyId).toBe(id);
  });

  it("generates codes that never collide with an existing one", () => {
    const first = declare();
    const second = declare({ title: "Deuxième incident" });
    expect(first.incidentCode).not.toBe(second.incidentCode);
    const codes = getStore().systemIncidents.map((i) => i.incidentCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("refuses a blank or too long title", () => {
    expect(() => declare({ title: "   " })).toThrow("Un titre est obligatoire");
    expect(() => declare({ title: "x".repeat(201) })).toThrow("Le titre est trop long (200 caractères maximum)");
    expect(() => declare({ title: "x".repeat(200) })).not.toThrow();
  });

  it("refuses a blank or too long service name", () => {
    expect(() => declare({ serviceName: " " })).toThrow("Le service est obligatoire");
    expect(() => declare({ serviceName: "s".repeat(101) })).toThrow("Le nom du service est trop long (100 caractères maximum)");
    expect(() => declare({ serviceName: "s".repeat(100) })).not.toThrow();
  });

  it("refuses an unknown severity or scope", () => {
    expect(() => declare({ severity: "URGENT" as never })).toThrow("Gravité invalide");
    expect(() => declare({ impactScope: "EVERYWHERE" as never })).toThrow("Portée invalide");
  });

  it("requires an existing company for a single-company scope and forbids one otherwise", () => {
    expect(() => declare({ impactScope: "SINGLE_COMPANY", affectedCompanyId: null })).toThrow(
      "Une compagnie est obligatoire pour un incident limité à une compagnie",
    );
    expect(() => declare({ impactScope: "SINGLE_COMPANY", affectedCompanyId: "00000000-0000-4000-8000-000000000000" })).toThrow("Compagnie introuvable");
    expect(() => declare({ impactScope: "PLATFORM_WIDE", affectedCompanyId: companyId() })).toThrow(
      "Une compagnie ne peut être indiquée que pour un incident limité à une compagnie",
    );
    expect(() => declare({ impactScope: "MULTI_COMPANY", affectedCompanyId: companyId() })).toThrow(
      "Une compagnie ne peut être indiquée que pour un incident limité à une compagnie",
    );
  });

  it("limits the description to 10000 characters", () => {
    expect(() => declare({ description: "d".repeat(10_001) })).toThrow("La description est trop longue (10000 caractères maximum)");
    expect(() => declare({ description: "d".repeat(10_000) })).not.toThrow();
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => declare({ title: "" })).toThrow();
    expect(() => declare({ impactScope: "SINGLE_COMPANY" })).toThrow();
    expect(counts()).toEqual(before);
  });

  it("checks the guards in order: title, service, severity, scope, company, description", () => {
    const bad = valid({ title: "", serviceName: "", severity: "X" as never, impactScope: "Y" as never, description: "d".repeat(10_001) });
    expect(() => incidentsRepo.declare(bad)).toThrow("Un titre est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok" })).toThrow("Le service est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s" })).toThrow("Gravité invalide");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW" })).toThrow("Portée invalide");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW", impactScope: "SINGLE_COMPANY" })).toThrow("Une compagnie est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW", impactScope: "PLATFORM_WIDE" })).toThrow("La description est trop longue");
  });
});

describe("changing the status of an incident", () => {
  it("moves it forward, stamps the update, journals the transition and nothing else", () => {
    const target = titled("Échecs de réservation sur une compagnie");
    const before = counts();
    const result = incidentsRepo.advance(target.id, "MONITORING", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("MONITORING");
    expect(target.updatedAt).toBe(NOW.toISOString());
    expect(target.resolvedAt).toBeNull();
    const s = getStore();
    expect(counts()).toEqual({ incidents: before.incidents, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: target.affectedCompanyId, actorLabel: "tester@sira.app", action: "UPDATE", entityType: "SystemIncident",
      entityId: target.id, beforeState: { status: "IDENTIFIED" }, afterState: { status: "MONITORING" },
      sourceService: "monitoring-service",
    });
    expect(s.activity[0]!.action).toBe(`Incident ${target.incidentCode} : identifié → sous surveillance`);
  });

  it("resolves an incident and sets its resolution date, jumping over statuses", () => {
    const target = titled("Latence élevée sur les colis");
    incidentsRepo.advance(target.id, "RESOLVED", "tester@sira.app", NOW);
    expect(target.status).toBe("RESOLVED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    const fresh = declare();
    incidentsRepo.advance(fresh.id, "RESOLVED", "tester@sira.app", NOW);
    expect(fresh.status).toBe("RESOLVED");
  });

  it("refuses an unknown incident and an unknown status", () => {
    expect(() => incidentsRepo.advance("00000000-0000-4000-8000-000000000000", "RESOLVED")).toThrow("Incident introuvable");
    expect(() => incidentsRepo.advance(titled("Latence élevée sur les colis").id, "ARCHIVED" as never)).toThrow("Statut invalide");
  });

  it("refuses to go back or stay put, and leaves the incident and the journals untouched", () => {
    const target = titled("Échecs de réservation sur une compagnie");
    const before = counts();
    expect(() => incidentsRepo.advance(target.id, "INVESTIGATING", "tester@sira.app", NOW)).toThrow("Un incident ne peut pas revenir en arrière");
    expect(() => incidentsRepo.advance(target.id, "IDENTIFIED", "tester@sira.app", NOW)).toThrow("L'incident est déjà dans cet état");
    expect(target.status).toBe("IDENTIFIED");
    expect(target.updatedAt).not.toBe(NOW.toISOString());
    expect(counts()).toEqual(before);
  });

  it("refuses any change on a resolved incident and keeps its resolution date", () => {
    const target = titled("Retard de synchronisation RH");
    const resolvedAt = target.resolvedAt;
    for (const to of ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const) {
      expect(() => incidentsRepo.advance(target.id, to)).toThrow("Un incident résolu ne peut plus changer de statut");
    }
    expect(target.resolvedAt).toBe(resolvedAt);
  });

  it("checks the guards in order: unknown, status, resolved, same, backwards", () => {
    expect(() => incidentsRepo.advance("00000000-0000-4000-8000-000000000000", "ARCHIVED" as never)).toThrow("Incident introuvable");
    expect(() => incidentsRepo.advance(titled("Retard de synchronisation RH").id, "ARCHIVED" as never)).toThrow("Statut invalide");
    expect(() => incidentsRepo.advance(titled("Retard de synchronisation RH").id, "RESOLVED")).toThrow("Un incident résolu");
  });
});

describe("setting a postmortem", () => {
  it("records the address on a resolved incident and audits only the first time", () => {
    const target = titled("Échec de connexion intermittent");
    const before = counts();
    incidentsRepo.setPostmortem(target.id, "  https://status.sira.app/postmortems/2026-10-28  ", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("https://status.sira.app/postmortems/2026-10-28");
    expect(target.updatedAt).toBe(NOW.toISOString());
    const s = getStore();
    expect(counts()).toEqual({ incidents: before.incidents, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      action: "UPDATE", entityType: "SystemIncident", beforeState: { postmortem: "false" }, afterState: { postmortem: "true" },
    });
    expect(s.activity[0]!.action).toBe(`Postmortem de l'incident ${target.incidentCode} ajouté`);
    expect(JSON.stringify([s.auditLogs.at(-1), s.activity[0]])).not.toContain("status.sira.app");

    incidentsRepo.setPostmortem(target.id, "http://status.sira.app/v2", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("http://status.sira.app/v2");
    expect(s.auditLogs).toHaveLength(before.audit + 1);
    expect(s.activity[0]!.action).toBe(`Postmortem de l'incident ${target.incidentCode} mis à jour`);
  });

  it("works on an open incident too", () => {
    const target = titled("Latence élevée sur les colis");
    incidentsRepo.setPostmortem(target.id, "https://status.sira.app/p", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("https://status.sira.app/p");
    expect(target.status).toBe("MONITORING");
  });

  it("refuses an unknown incident and a blank address", () => {
    expect(() => incidentsRepo.setPostmortem("00000000-0000-4000-8000-000000000000", "https://x.org")).toThrow("Incident introuvable");
    expect(() => incidentsRepo.setPostmortem(titled("Latence élevée sur les colis").id, "   ")).toThrow("L'adresse du postmortem est obligatoire");
  });

  it("refuses an address that is not an http or https link, or that contains a space", () => {
    const target = titled("Échec de connexion intermittent");
    for (const bad of ["ftp://x.org/p", "javascript:alert(1)", "status.sira.app/p", "https://", "https://a b.org"]) {
      expect(() => incidentsRepo.setPostmortem(target.id, bad), bad).toThrow("L'adresse du postmortem doit commencer par http:// ou https://");
    }
    expect(target.postmortemUrl).toBeNull();
  });

  it("limits the address to 2048 characters", () => {
    const target = titled("Échec de connexion intermittent");
    const url = (n: number) => `https://x.org/${"a".repeat(n - "https://x.org/".length)}`;
    expect(() => incidentsRepo.setPostmortem(target.id, url(2049))).toThrow("L'adresse du postmortem est trop longue (2048 caractères maximum)");
    incidentsRepo.setPostmortem(target.id, url(2048), "tester@sira.app", NOW);
    expect(target.postmortemUrl).toHaveLength(2048);
  });

  it("changes nothing when a guard refuses", () => {
    const target = titled("Échec de connexion intermittent");
    const before = counts();
    expect(() => incidentsRepo.setPostmortem(target.id, "ftp://x.org")).toThrow();
    expect(target.postmortemUrl).toBeNull();
    expect(counts()).toEqual(before);
  });
});
