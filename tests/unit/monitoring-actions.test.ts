import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { advanceIncident, declareIncident, setIncidentPostmortem } from "@/app/(admin)/supervision/actions";
import type { IncidentInput } from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const titled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;
const input = (over: Partial<IncidentInput> = {}): IncidentInput => ({
  title: "Incident de test", serviceName: "booking-service", severity: "LOW", impactScope: "PLATFORM_WIDE",
  affectedCompanyId: null, description: "", ...over,
});
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("declareIncident", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().systemIncidents.length;
    expect(await declareIncident(input())).toEqual(EXPIRED);
    expect(getStore().systemIncidents).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("declares the incident as the session actor and revalidates the affected pages", async () => {
    expect(await declareIncident(input({ title: "  Incident de test  " }))).toEqual({ ok: true });
    const created = getStore().systemIncidents.at(-1)!;
    expect(created).toMatchObject({ title: "Incident de test", reportedBy: "tester@sira.app", status: "INVESTIGATING" });
    expect(paths()).toEqual(expect.arrayContaining(["/", "/supervision/incidents", "/supervision/services", "/conformite/journal-audit"]));
  });

  it("returns the rule's message as an error result and revalidates nothing", async () => {
    expect(await declareIncident(input({ title: " " }))).toEqual({ ok: false, error: "Un titre est obligatoire" });
    expect(await declareIncident(input({ impactScope: "SINGLE_COMPANY" }))).toEqual({
      ok: false, error: "Une compagnie est obligatoire pour un incident limité à une compagnie",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("advanceIncident", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "MONITORING")).toEqual(EXPIRED);
    expect(target.status).toBe("IDENTIFIED");
  });

  it("moves the incident forward and revalidates the incident, the list and the dashboard", async () => {
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "MONITORING")).toEqual({ ok: true });
    expect(target.status).toBe("MONITORING");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining(["/", "/supervision/incidents", `/supervision/incidents/${target.id}`]));
  });

  it("returns the rule's message for a backward move, an unknown incident and a blank id", async () => {
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "INVESTIGATING")).toEqual({ ok: false, error: "Un incident ne peut pas revenir en arrière" });
    expect(await advanceIncident(titled("Retard de synchronisation RH").id, "RESOLVED")).toEqual({
      ok: false, error: "Un incident résolu ne peut plus changer de statut",
    });
    expect(await advanceIncident("00000000-0000-4000-8000-000000000000", "RESOLVED")).toEqual({ ok: false, error: "Incident introuvable" });
    expect((await advanceIncident("", "RESOLVED")).ok).toBe(false);
    expect(target.status).toBe("IDENTIFIED");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setIncidentPostmortem", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "https://status.sira.app/p")).toEqual(EXPIRED);
    expect(target.postmortemUrl).toBeNull();
  });

  it("records the address and revalidates the incident", async () => {
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "https://status.sira.app/p")).toEqual({ ok: true });
    expect(target.postmortemUrl).toBe("https://status.sira.app/p");
    expect(paths()).toEqual(expect.arrayContaining([`/supervision/incidents/${target.id}`, "/supervision/incidents"]));
  });

  it("returns the rule's message for a bad address, an unknown incident and a blank id", async () => {
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "ftp://x.org")).toEqual({
      ok: false, error: "L'adresse du postmortem doit commencer par http:// ou https://",
    });
    expect(await setIncidentPostmortem("00000000-0000-4000-8000-000000000000", "https://x.org")).toEqual({ ok: false, error: "Incident introuvable" });
    expect((await setIncidentPostmortem("", "https://x.org")).ok).toBe(false);
    expect(target.postmortemUrl).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("blank incident ids", () => {
  it("are refused by the action itself, before any rule runs", async () => {
    expect(await advanceIncident("", "RESOLVED")).toEqual({ ok: false, error: "Incident invalide" });
    expect(await setIncidentPostmortem("  ", "https://x.org")).toEqual({ ok: false, error: "Incident invalide" });
  });
});
