import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/auth/token";

const SECRET = "test-secret";
const NOW = 1_000_000;

describe("token", () => {
  it("round-trips a valid token", async () => {
    const t = await signToken({ sub: "admin@sira.app", stage: "full", exp: NOW + 60 }, SECRET);
    expect(await verifyToken(t, SECRET, NOW * 1000)).toEqual({
      sub: "admin@sira.app", stage: "full", exp: NOW + 60,
    });
  });
  it("rejects an expired token", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: NOW - 1 }, SECRET);
    expect(await verifyToken(t, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects a token signed with another secret", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: NOW + 60 }, "other");
    expect(await verifyToken(t, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects a tampered payload", async () => {
    const t = await signToken({ sub: "a", stage: "pre", exp: NOW + 60 }, SECRET);
    const [, sig] = t.split(".");
    const forged = `${btoa(JSON.stringify({ sub: "a", stage: "full", exp: NOW + 60 }))}.${sig}`;
    expect(await verifyToken(forged, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects malformed input", async () => {
    expect(await verifyToken("", SECRET)).toBeNull();
    expect(await verifyToken("abc", SECRET)).toBeNull();
    expect(await verifyToken("a.b.c", SECRET)).toBeNull();
  });
  it("round-trips attempts and rejects invalid attempts", async () => {
    const t = await signToken({ sub: "a", stage: "pre", exp: NOW + 60, attempts: 2 }, SECRET);
    expect((await verifyToken(t, SECRET, NOW * 1000))?.attempts).toBe(2);
    for (const bad of [-1, 1.5, "2" as unknown as number]) {
      const x = await signToken({ sub: "a", stage: "pre", exp: NOW + 60, attempts: bad }, SECRET);
      expect(await verifyToken(x, SECRET, NOW * 1000)).toBeNull();
    }
  });
  it("cannot turn a pre token into full by swapping the payload", async () => {
    const t = await signToken({ sub: "a", stage: "pre", exp: NOW + 60 }, SECRET);
    const [, sig] = t.split(".");
    const body = btoa(JSON.stringify({ sub: "a", stage: "full", exp: NOW + 60 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifyToken(`${body}.${sig}`, SECRET, NOW * 1000)).toBeNull();
  });
});
