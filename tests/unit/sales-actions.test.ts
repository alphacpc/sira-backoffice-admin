import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelBooking } from "@/app/(admin)/ventes/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const named = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;

describe("cancelBooking", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = named("Rokhaya Thiaw");
    const n = getStore().activity.length;
    expect(await cancelBooking(target.id, "motif")).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(target.status).toBe("confirmed");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cancels the booking, journals the actor and revalidates the affected pages", async () => {
    const target = named("Rokhaya Thiaw");
    expect(await cancelBooking(target.id, "  Demande du passager ")).toEqual({ ok: true });
    expect(target.status).toBe("cancelled");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining([
      "/", "/ventes/reservations", `/ventes/reservations/${target.id}`, "/ventes/en-ligne",
      `/flotte/trajets/${target.tripId}`, "/flotte/plans-de-sieges", `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = named("Rokhaya Thiaw");
    expect(await cancelBooking(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("confirmed");
    expect(await cancelBooking(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("cancelled");
  });

  it("returns the rule's message as an error result, never an exception", async () => {
    expect(await cancelBooking(named("Coumba Lô").id, "motif")).toEqual({
      ok: false, error: "Une réservation payée ne peut pas être annulée",
    });
    expect(await cancelBooking(named("Samba Kébé").id, "motif")).toEqual({
      ok: false, error: "Un paiement est en cours sur cette réservation",
    });
    expect(await cancelBooking("00000000-0000-4000-8000-000000000000", "motif")).toEqual({
      ok: false, error: "Réservation introuvable",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank booking id or a blank reason", async () => {
    expect((await cancelBooking("", "motif")).ok).toBe(false);
    expect((await cancelBooking(named("Rokhaya Thiaw").id, "   ")).ok).toBe(false);
    expect(named("Rokhaya Thiaw").status).toBe("confirmed");
  });
});
