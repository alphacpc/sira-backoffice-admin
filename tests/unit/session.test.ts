import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (store.has(k) ? { value: store.get(k)! } : undefined) }),
}));

import { requireSession } from "@/lib/auth/session";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { signToken } from "@/lib/auth/token";

const exp = () => Math.floor(Date.now() / 1000) + 300;
beforeEach(() => store.clear());

describe("requireSession", () => {
  it("rejects a missing cookie", async () => {
    await expect(requireSession()).rejects.toThrow("Non authentifié");
  });
  it("rejects a validly signed pre-stage token", async () => {
    store.set(SESSION_COOKIE, await signToken({ sub: "a", stage: "pre", exp: exp() }, getSecret()));
    await expect(requireSession()).rejects.toThrow("Non authentifié");
  });
  it("accepts a full-stage token", async () => {
    store.set(SESSION_COOKIE, await signToken({ sub: "a", stage: "full", exp: exp() }, getSecret()));
    expect((await requireSession()).sub).toBe("a");
  });
});
