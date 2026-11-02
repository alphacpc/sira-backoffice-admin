import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { retireBus } from "@/app/(admin)/flotte/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
const TOO_LONG = { ok: false, error: "Motif trop long (500 caractères maximum)" };

beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const bus = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("retireBus", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = bus("DK-1051-AB");
    const n = getStore().activity.length;
    expect(await retireBus(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("active");
    expect(target.retiredAt).toBeNull();
    expect(getStore().activity.length).toBe(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("retires the bus as the session actor with the trimmed reason, and revalidates the pages", async () => {
    const target = bus("DK-1051-AB");
    expect(await retireBus(target.id, "  Accident  ")).toEqual({ ok: true });
    expect(target.status).toBe("retired");
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", action: "Bus DK-1051-AB mis hors service. Motif : Accident",
    });
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/flotte/bus", `/flotte/bus/${target.id}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("refuses a blank reason and 501 characters, accepts exactly 500", async () => {
    const target = bus("DK-1051-AB");
    expect(await retireBus(target.id, "   ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await retireBus(target.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(target.status).toBe("active");
    expect(await retireBus(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("retired");
  });

  it("refuses an invalid identifier and returns the repository refusals as results", async () => {
    expect(await retireBus("", "x")).toEqual({ ok: false, error: "Bus invalide" });
    expect(await retireBus(42 as never, "x")).toEqual({ ok: false, error: "Bus invalide" });
    expect(await retireBus("nope", "x")).toEqual({ ok: false, error: "Bus introuvable" });
    expect(await retireBus(bus("DK-1023-AB").id, "x")).toEqual({ ok: false, error: "Ce bus est déjà hors service" });
    expect(await retireBus(bus("DK-1040-AB").id, "x")).toEqual({ ok: false, error: "Une maintenance est en cours sur ce bus" });
    expect(await retireBus(bus("DK-1050-AB").id, "x")).toEqual({ ok: false, error: "Ce bus a des trajets à venir" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
