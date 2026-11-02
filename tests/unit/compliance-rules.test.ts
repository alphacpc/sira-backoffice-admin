import { beforeEach, describe, expect, it } from "vitest";
import { consentsRepo, dsrRepo, retentionRepo } from "@/lib/repos/compliance";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const userNamed = (name: string) => getStore().users.find((u) => u.displayName === name && u.roleCode === "USER" && u.companyId === null)!;
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;
const counts = () => {
  const s = getStore();
  return { audit: s.auditLogs.length, access: s.dataAccessLogs.length, activity: s.activity.length };
};

describe("taking a request in charge", () => {
  it("moves a received request to in progress, records the handler and writes the three journals", () => {
    const target = dsrOf("Ndèye Diouf", "ACCESS");
    const before = counts();
    const result = dsrRepo.transition(target.id, "IN_PROGRESS", "", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("IN_PROGRESS");
    expect(target.handledBy).toBe("tester@sira.app");
    expect(target.resolvedAt).toBeNull();
    expect(target.resolutionNotes).toBeNull();
    const s = getStore();
    expect(counts()).toEqual({ audit: before.audit + 1, access: before.access + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: target.companyId, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "UPDATE",
      entityType: "DataSubjectRequest", entityId: target.id, beforeState: { status: "RECEIVED" },
      afterState: { status: "IN_PROGRESS" }, ipAddress: null, userAgent: null, sourceService: "audit-compliance-service",
      occurredAt: NOW.toISOString(), createdAt: NOW.toISOString(),
    });
    expect(s.dataAccessLogs.at(-1)).toMatchObject({
      accessedByUserId: null, accessedByLabel: "tester@sira.app", dataSubjectType: "CUSTOMER",
      dataSubjectId: target.requesterUserId, dataCategory: "IDENTITY", accessReason: "LEGAL_OBLIGATION",
      accessType: "MODIFY", ipAddress: null, createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ actor: "tester@sira.app", at: NOW.toISOString(), companyId: target.companyId });
    expect(s.activity[0]!.action).toBe("Demande RGPD (Accès) : reçue → en cours");
  });
});

describe("closing and rejecting a request", () => {
  it("closes an in-progress request with trimmed notes and a resolution date", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    dsrRepo.transition(target.id, "COMPLETED", "  Données effacées.  ", "tester@sira.app", NOW);
    expect(target.status).toBe("COMPLETED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    expect(target.resolutionNotes).toBe("Données effacées.");
    expect(target.handledBy).toBe("tester@sira.app");
    expect(getStore().auditLogs.at(-1)).toMatchObject({ beforeState: { status: "IN_PROGRESS" }, afterState: { status: "COMPLETED" } });
  });

  it("rejects an in-progress request with notes", () => {
    const target = dsrOf("Aïssatou Sarr", "OBJECTION");
    dsrRepo.transition(target.id, "REJECTED", "Demande infondée.", "tester@sira.app", NOW);
    expect(target.status).toBe("REJECTED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    expect(getStore().auditLogs.at(-1)!.afterState).toEqual({ status: "REJECTED" });
  });

  it("keeps the notes out of the journals", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    dsrRepo.transition(target.id, "COMPLETED", "NOTE-CONFIDENTIELLE", "tester@sira.app", NOW);
    const s = getStore();
    expect(JSON.stringify([s.auditLogs.at(-1), s.dataAccessLogs.at(-1), s.activity[0]])).not.toContain("NOTE-CONFIDENTIELLE");
  });

  it("refuses an unknown request", () => {
    expect(() => dsrRepo.transition("00000000-0000-4000-8000-000000000000", "COMPLETED", "n")).toThrow("Demande introuvable");
  });

  it("refuses blank notes for a closing or a rejection and changes nothing", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    const before = counts();
    expect(() => dsrRepo.transition(target.id, "COMPLETED", "   ")).toThrow("Des notes de résolution sont obligatoires");
    expect(() => dsrRepo.transition(target.id, "REJECTED", "")).toThrow("Des notes de résolution sont obligatoires");
    expect(target.status).toBe("IN_PROGRESS");
    expect(counts()).toEqual(before);
  });

  it("does not need notes to take a request in charge", () => {
    expect(() => dsrRepo.transition(dsrOf("Ndèye Diouf", "ACCESS").id, "IN_PROGRESS", "", "tester@sira.app", NOW)).not.toThrow();
  });

  it("refuses to close or reject a request that was only received, and changes nothing", () => {
    const target = dsrOf("Pape Mbaye", "RECTIFICATION");
    const before = counts();
    expect(() => dsrRepo.transition(target.id, "COMPLETED", "notes")).toThrow("Une demande reçue doit d'abord être prise en charge");
    expect(() => dsrRepo.transition(target.id, "REJECTED", "notes")).toThrow("Une demande reçue doit d'abord être prise en charge");
    expect(target.status).toBe("RECEIVED");
    expect(target.handledBy).toBeNull();
    expect(counts()).toEqual(before);
  });

  it("refuses to take an already handled request in charge again", () => {
    expect(() => dsrRepo.transition(dsrOf("Lamine Camara", "ERASURE").id, "IN_PROGRESS", "")).toThrow("Cette demande est déjà prise en charge");
  });

  it("refuses any move on a closed request and keeps its resolution", () => {
    const target = dsrOf("Aïssatou Sarr", "PORTABILITY");
    const resolvedAt = target.resolvedAt;
    for (const to of ["IN_PROGRESS", "COMPLETED", "REJECTED"] as const) {
      expect(() => dsrRepo.transition(target.id, to, "notes")).toThrow("Cette demande est déjà close");
    }
    expect(target.status).toBe("COMPLETED");
    expect(target.resolvedAt).toBe(resolvedAt);
  });

  it("checks the guards in order: unknown, notes, transition", () => {
    const received = dsrOf("Pape Mbaye", "RECTIFICATION");
    expect(() => dsrRepo.transition(received.id, "COMPLETED", "")).toThrow("Des notes de résolution sont obligatoires");
    const closed = dsrOf("Aïssatou Sarr", "PORTABILITY");
    expect(() => dsrRepo.transition(closed.id, "COMPLETED", "")).toThrow("Des notes de résolution sont obligatoires");
  });
});

describe("changing a company's retention", () => {
  it("sets the duration, journals the change and keeps the old value in the audit line", () => {
    const company = companyNamed("Casamance Trans");
    expect(company.dataRetentionDays).toBeNull();
    const before = counts();
    const result = retentionRepo.set(company.id, 90, "  Demande de la compagnie  ", "tester@sira.app", NOW);
    expect(result).toBe(company);
    expect(company.dataRetentionDays).toBe(90);
    const s = getStore();
    expect(counts()).toEqual({ audit: before.audit + 1, access: before.access, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: company.id, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "UPDATE",
      entityType: "Company", entityId: company.id, beforeState: { dataRetentionDays: "null" },
      afterState: { dataRetentionDays: "90" }, ipAddress: null, sourceService: "company-service", createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ companyId: company.id, actor: "tester@sira.app", at: NOW.toISOString() });
    expect(s.activity[0]!.action).toBe("Durée de rétention de Casamance Trans : 730 → 90 jours. Motif : Demande de la compagnie");
  });

  it("records an explicit previous value and shows the lines that become pending", () => {
    const company = getStore().companies.find((c) => c.dataRetentionDays === 365)!;
    retentionRepo.set(company.id, 180, "Alignement", "tester@sira.app", NOW);
    expect(getStore().auditLogs.at(-1)!.beforeState).toEqual({ dataRetentionDays: "365" });
    const row = retentionRepo.listRows(NOW).find((r) => r.companyId === company.id)!;
    expect(row.effectiveDays).toBe(180);
    expect(row.pendingRows).toBeGreaterThan(0);
  });

  it("accepts the two bounds and refuses just outside them", () => {
    const company = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(company.id, 89, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    expect(() => retentionRepo.set(company.id, 3651, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    expect(company.dataRetentionDays).toBeNull();
    retentionRepo.set(company.id, 90, "motif", "tester@sira.app", NOW);
    retentionRepo.set(company.id, 3650, "motif", "tester@sira.app", NOW);
    expect(company.dataRetentionDays).toBe(3650);
  });

  it("refuses a non-integer or non-finite duration", () => {
    const company = companyNamed("Casamance Trans");
    for (const bad of [100.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => retentionRepo.set(company.id, bad, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    }
  });

  it("refuses an unknown company and a blank reason without writing anything", () => {
    const company = companyNamed("Casamance Trans");
    const before = counts();
    expect(() => retentionRepo.set("00000000-0000-4000-8000-000000000000", 100, "motif")).toThrow("Compagnie introuvable");
    expect(() => retentionRepo.set(company.id, 100, "   ")).toThrow("Un motif est obligatoire");
    expect(company.dataRetentionDays).toBeNull();
    expect(counts()).toEqual(before);
  });

  it("refuses the current effective duration, explicit or default", () => {
    const custom = getStore().companies.find((c) => c.dataRetentionDays === 365)!;
    expect(() => retentionRepo.set(custom.id, 365, "motif")).toThrow("La durée de rétention est déjà de 365 jours");
    const byDefault = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(byDefault.id, 730, "motif")).toThrow("La durée de rétention est déjà de 730 jours");
  });

  it("checks the guards in order: unknown, reason, range, unchanged", () => {
    const company = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(company.id, 10, "")).toThrow("Un motif est obligatoire");
    expect(() => retentionRepo.set(company.id, 10, "motif")).toThrow("La durée doit être un nombre entier");
    expect(() => retentionRepo.set(company.id, 730, "motif")).toThrow("déjà de 730 jours");
  });
});

describe("consulting a user's consents", () => {
  it("returns the full history newest first, flags the current states and logs the access with its reason", () => {
    const user = userNamed("Aïssatou Sarr");
    const records = getStore().consentRecords.filter((r) => r.userId === user.id);
    const before = counts();
    const entries = consentsRepo.consult(user.id, "INVESTIGATION", "tester@sira.app", NOW);
    expect(entries).toHaveLength(records.length);
    for (let i = 1; i < entries.length; i++) expect(entries[i - 1]!.at >= entries[i]!.at).toBe(true);
    expect(entries.filter((e) => e.isCurrent).length).toBeGreaterThan(0);
    expect(entries.filter((e) => e.isCurrent).length).toBeLessThan(entries.length);
    expect(Object.keys(entries[0]!).sort()).toEqual(["at", "companyName", "consentType", "consentVersion", "id", "isCurrent", "source", "status"]);
    expect(counts()).toEqual({ audit: before.audit, access: before.access + 1, activity: before.activity });
    expect(getStore().dataAccessLogs.at(-1)).toMatchObject({
      accessedByUserId: null, accessedByLabel: "tester@sira.app", dataSubjectType: "CUSTOMER", dataSubjectId: user.id,
      dataCategory: "CONSENT", accessReason: "INVESTIGATION", accessType: "VIEW", ipAddress: null, createdAt: NOW.toISOString(),
    });
  });

  it("types an employee's data subject accordingly and works for every valid reason", () => {
    const s = getStore();
    const employee = s.users.find((u) => u.companyId !== null && s.consentRecords.some((r) => r.userId === u.id))!;
    for (const reason of ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"]) {
      consentsRepo.consult(employee.id, reason, "tester@sira.app", NOW);
    }
    const rows = s.dataAccessLogs.slice(-4);
    expect(rows.map((r) => r.accessReason)).toEqual(["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"]);
    expect(rows.every((r) => r.dataSubjectType === "EMPLOYEE")).toBe(true);
  });

  it("refuses an invalid reason and an unknown user without writing a line", () => {
    const user = userNamed("Aïssatou Sarr");
    const before = counts();
    expect(() => consentsRepo.consult(user.id, "CURIOSITY")).toThrow("Motif d'accès invalide");
    expect(() => consentsRepo.consult(user.id, "")).toThrow("Motif d'accès invalide");
    expect(() => consentsRepo.consult("00000000-0000-4000-8000-000000000000", "INVESTIGATION")).toThrow("Utilisateur introuvable");
    expect(counts()).toEqual(before);
  });

  it("checks the reason before the user", () => {
    expect(() => consentsRepo.consult("00000000-0000-4000-8000-000000000000", "CURIOSITY")).toThrow("Motif d'accès invalide");
  });

  it("never rewrites the consent history it reads", () => {
    const user = userNamed("Aïssatou Sarr");
    const snapshot = JSON.stringify(getStore().consentRecords);
    consentsRepo.consult(user.id, "INVESTIGATION", "tester@sira.app", NOW);
    expect(JSON.stringify(getStore().consentRecords)).toBe(snapshot);
  });
});
