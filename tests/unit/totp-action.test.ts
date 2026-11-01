import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (store.has(k) ? { value: store.get(k)! } : undefined),
    set: (k: string, v: string) => void store.set(k, v),
    delete: (k: string) => void store.delete(k),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { login, verifyTotp } from "@/app/(auth)/actions";
import { DEMO_ID, DEMO_PASSWORD, DEMO_TOTP, PRE_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants";

beforeEach(async () => {
  store.clear();
  await login({ identifiant: DEMO_ID, motDePasse: DEMO_PASSWORD });
});

describe("verifyTotp attempt limit", () => {
  it("allows 4 wrong codes then locks on the 5th", async () => {
    for (let i = 0; i < 4; i++) {
      expect(await verifyTotp("000000")).toEqual({ ok: false, error: "Code incorrect" });
    }
    expect(await verifyTotp("000000")).toEqual({
      ok: false, error: "Trop de tentatives, reconnecte-toi",
    });
    expect(store.has(PRE_COOKIE)).toBe(false);
  });
  it("still succeeds with the right code before the limit", async () => {
    await verifyTotp("000000");
    await verifyTotp("000000");
    expect(await verifyTotp(DEMO_TOTP)).toEqual({ ok: true });
    expect(store.has(SESSION_COOKIE)).toBe(true);
    expect(store.has(PRE_COOKIE)).toBe(false);
  });
});
