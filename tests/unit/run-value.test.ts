import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { runValue } from "@/lib/actions/run";

beforeEach(() => {
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "tester@sira.app", stage: "full", exp: 9999999999 });
});

describe("runValue", () => {
  it("runs the body with the session actor and returns its structured value", async () => {
    const body = vi.fn((actor: string) => ({ actor, items: [1, 2] }));
    expect(await runValue(body)).toEqual({ ok: true, value: { actor: "tester@sira.app", items: [1, 2] } });
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("never runs the body without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn(() => "secret");
    expect(await runValue(body)).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(body).not.toHaveBeenCalled();
  });

  it("turns an expected failure into an error result carrying its message", async () => {
    expect(await runValue(() => { throw new Error("Utilisateur introuvable"); })).toEqual({
      ok: false, error: "Utilisateur introuvable",
    });
    expect(await runValue(() => { throw "boom"; })).toEqual({ ok: false, error: "Action impossible" });
  });
});
