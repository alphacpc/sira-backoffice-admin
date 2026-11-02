import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { searchEverywhere } from "@/app/(admin)/recherche/actions";
import { resetStore } from "@/lib/repos/store";

beforeEach(() => {
  resetStore();
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "admin@sira.app", stage: "full", exp: 9999999999 });
});

describe("searchEverywhere", () => {
  it("reads nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    expect(await searchEverywhere("bk-")).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
  });

  it("returns at most four hits per type, flattened, without companies", async () => {
    const r = await searchEverywhere("bk-");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.length).toBeGreaterThan(0);
    expect(r.value.length).toBeLessThanOrEqual(4);
    expect(r.value.every((h) => h.type === "booking")).toBe(true);
    const names = await searchEverywhere("trans");
    expect(names.ok && names.value.every((h) => h.type !== "company")).toBe(true);
  });

  it("returns an empty list, not an error, for an unusable query", async () => {
    expect(await searchEverywhere("a")).toEqual({ ok: true, value: [] });
    expect(await searchEverywhere("someone@example.sn")).toEqual({ ok: true, value: [] });
  });

  it("returns an empty list for a value that is not a string", async () => {
    expect(await searchEverywhere(42 as unknown as string)).toEqual({ ok: true, value: [] });
  });
});
