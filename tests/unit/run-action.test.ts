import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { errorMessage, requireReason, run, runReveal } from "@/lib/actions/run";

beforeEach(() => {
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "tester@sira.app", stage: "full", exp: 9999999999 });
});

describe("run", () => {
  it("never runs the body without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn();
    expect(await run(body)).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(body).not.toHaveBeenCalled();
  });

  it("passes the session subject as the actor", async () => {
    const body = vi.fn();
    expect(await run(body)).toEqual({ ok: true });
    expect(body).toHaveBeenCalledWith("tester@sira.app");
  });

  it("turns a thrown error into an error result instead of throwing", async () => {
    expect(await run(() => { throw new Error("Refusé"); })).toEqual({ ok: false, error: "Refusé" });
    expect(await run(() => { throw "boom"; })).toEqual({ ok: false, error: "Action impossible" });
  });
});

describe("requireReason", () => {
  it("trims, accepts 500 characters and refuses blank or longer reasons", () => {
    expect(requireReason("  ok  ")).toBe("ok");
    expect(requireReason("x".repeat(500))).toHaveLength(500);
    expect(() => requireReason("   ")).toThrow("Motif invalide");
    expect(() => requireReason(42)).toThrow("Motif invalide");
    expect(() => requireReason("x".repeat(501))).toThrow("Motif trop long (500 caractères maximum)");
  });
});

describe("errorMessage", () => {
  it("falls back to a generic message", () => {
    expect(errorMessage(new Error(""))).toBe("Action impossible");
    expect(errorMessage(new Error("Précis"))).toBe("Précis");
  });
});

describe("runReveal", () => {
  it("never runs the body nor returns a value without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn(() => "secret@example.sn");
    const r = await runReveal(body);
    expect(r).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect("value" in r).toBe(false);
    expect(body).not.toHaveBeenCalled();
  });

  it("returns the value with the session subject as the actor", async () => {
    const body = vi.fn(() => "valeur");
    expect(await runReveal(body)).toEqual({ ok: true, value: "valeur" });
    expect(body).toHaveBeenCalledWith("tester@sira.app");
  });

  it("turns a thrown error into an error result without a value", async () => {
    const r = await runReveal(() => { throw new Error("Utilisateur introuvable"); });
    expect(r).toEqual({ ok: false, error: "Utilisateur introuvable" });
  });
});
