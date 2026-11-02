import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import {
  completeDataSubjectRequest, consultUserConsents, rejectDataSubjectRequest, setCompanyRetention,
  startDataSubjectRequest,
} from "@/app/(admin)/conformite/actions";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;
const clientNamed = (name: string) => getStore().users.find((u) => u.displayName === name && u.companyId === null)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("request actions", () => {
  it("write nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    const inProgress = dsrOf("Lamine Camara", "ERASURE");
    const n = getStore().auditLogs.length;
    expect(await startDataSubjectRequest(received.id)).toEqual(EXPIRED);
    expect(await completeDataSubjectRequest(inProgress.id, "notes")).toEqual(EXPIRED);
    expect(await rejectDataSubjectRequest(inProgress.id, "notes")).toEqual(EXPIRED);
    expect([received.status, inProgress.status]).toEqual(["RECEIVED", "IN_PROGRESS"]);
    expect(getStore().auditLogs).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("take a request in charge, close it and reject another, journaling the actor and revalidating the pages", async () => {
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    expect(await startDataSubjectRequest(received.id)).toEqual({ ok: true });
    expect(received).toMatchObject({ status: "IN_PROGRESS", handledBy: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/conformite/demandes-rgpd", `/conformite/demandes-rgpd/${received.id}`, "/conformite/journal-audit", "/conformite/acces-donnees",
    ]));

    const toClose = dsrOf("Lamine Camara", "ERASURE");
    expect(await completeDataSubjectRequest(toClose.id, "  Données effacées  ")).toEqual({ ok: true });
    expect(toClose).toMatchObject({ status: "COMPLETED", resolutionNotes: "Données effacées" });

    const toReject = dsrOf("Aïssatou Sarr", "OBJECTION");
    expect(await rejectDataSubjectRequest(toReject.id, "Infondée")).toEqual({ ok: true });
    expect(toReject.status).toBe("REJECTED");
  });

  it("accept notes of exactly 500 characters and refuse 501 without changing anything", async () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    expect(await completeDataSubjectRequest(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(await rejectDataSubjectRequest(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("IN_PROGRESS");
    expect(await completeDataSubjectRequest(target.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("return the rule's message as an error result and revalidate nothing", async () => {
    expect(await completeDataSubjectRequest(dsrOf("Pape Mbaye", "RECTIFICATION").id, "notes")).toEqual({
      ok: false, error: "Une demande reçue doit d'abord être prise en charge",
    });
    expect(await startDataSubjectRequest(dsrOf("Lamine Camara", "ERASURE").id)).toEqual({ ok: false, error: "Cette demande est déjà prise en charge" });
    expect(await rejectDataSubjectRequest(dsrOf("Aïssatou Sarr", "PORTABILITY").id, "notes")).toEqual({ ok: false, error: "Cette demande est déjà close" });
    expect(await startDataSubjectRequest("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Demande introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuse a blank id or blank notes", async () => {
    expect((await startDataSubjectRequest("")).ok).toBe(false);
    expect((await completeDataSubjectRequest("", "notes")).ok).toBe(false);
    expect((await completeDataSubjectRequest(dsrOf("Lamine Camara", "ERASURE").id, "  ")).ok).toBe(false);
    expect(dsrOf("Lamine Camara", "ERASURE").status).toBe("IN_PROGRESS");
  });
});

describe("setCompanyRetention", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, "motif")).toEqual(EXPIRED);
    expect(company.dataRetentionDays).toBeNull();
  });

  it("sets the duration, journals the actor and revalidates the affected pages", async () => {
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, " Demande de la compagnie ")).toEqual({ ok: true });
    expect(company.dataRetentionDays).toBe(90);
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: company.id });
    expect(paths()).toEqual(expect.arrayContaining([
      "/conformite/retention", "/conformite/journal-audit", `/compagnies/${company.id}`,
    ]));
  });

  it("refuses 501 characters, an out-of-range or unchanged duration, an unknown company and blank input", async () => {
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(await setCompanyRetention(company.id, 50, "motif")).toEqual({
      ok: false, error: "La durée doit être un nombre entier de jours compris entre 90 et 3650",
    });
    expect(await setCompanyRetention(company.id, 730, "motif")).toEqual({ ok: false, error: "La durée de rétention est déjà de 730 jours" });
    expect(await setCompanyRetention("00000000-0000-4000-8000-000000000000", 90, "motif")).toEqual({ ok: false, error: "Compagnie introuvable" });
    expect((await setCompanyRetention("", 90, "motif")).ok).toBe(false);
    expect((await setCompanyRetention(company.id, 90, "  ")).ok).toBe(false);
    expect(company.dataRetentionDays).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("consultUserConsents", () => {
  it("returns nothing and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().dataAccessLogs.length;
    expect(await consultUserConsents(clientNamed("Aïssatou Sarr").id, "INVESTIGATION")).toEqual(EXPIRED);
    expect(getStore().dataAccessLogs).toHaveLength(n);
  });

  it("returns the history after logging the access with its reason, and revalidates the access log", async () => {
    const user = clientNamed("Aïssatou Sarr");
    const n = getStore().dataAccessLogs.length;
    const result = await consultUserConsents(user.id, "SUPPORT_REQUEST");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(getStore().consentRecords.filter((r) => r.userId === user.id).length);
      expect(JSON.stringify(result.value)).not.toMatch(/@|\+221/);
    }
    expect(getStore().dataAccessLogs).toHaveLength(n + 1);
    expect(getStore().dataAccessLogs.at(-1)).toMatchObject({ accessedByLabel: "tester@sira.app", accessReason: "SUPPORT_REQUEST", dataCategory: "CONSENT" });
    expect(paths()).toContain("/conformite/acces-donnees");
  });

  it("refuses an invalid reason, an unknown user and blank input without logging", async () => {
    const user = clientNamed("Aïssatou Sarr");
    const n = getStore().dataAccessLogs.length;
    expect(await consultUserConsents(user.id, "CURIOSITY")).toEqual({ ok: false, error: "Motif d'accès invalide" });
    expect(await consultUserConsents("00000000-0000-4000-8000-000000000000", "INVESTIGATION")).toEqual({ ok: false, error: "Utilisateur introuvable" });
    expect((await consultUserConsents("", "INVESTIGATION")).ok).toBe(false);
    expect(getStore().dataAccessLogs).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
