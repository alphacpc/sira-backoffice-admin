import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { signToken } from "@/lib/auth/token";

const now = () => Math.floor(Date.now() / 1000);
function req(path: string, token?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
  });
}
const isNext = (r: Response) => r.headers.get("x-middleware-next") === "1";
const location = (r: Response) => new URL(r.headers.get("location") ?? "http://x/").pathname;

describe("middleware", () => {
  it("redirects to /connexion without a cookie", async () => {
    const r = await middleware(req("/compagnies"));
    expect(r.status).toBe(307);
    expect(location(r)).toBe("/connexion");
  });
  it("refuses a validly signed pre-stage token", async () => {
    const t = await signToken({ sub: "a", stage: "pre", exp: now() + 300 }, getSecret());
    const r = await middleware(req("/compagnies", t));
    expect(isNext(r)).toBe(false);
    expect(r.status).toBe(307);
    expect(location(r)).toBe("/session-expiree");
  });
  it("lets a valid full-stage token through", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: now() + 300 }, getSecret());
    const r = await middleware(req("/compagnies", t));
    expect(isNext(r)).toBe(true);
    expect(r.status).toBe(200);
  });
  it("redirects an expired full-stage token to /session-expiree", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: now() - 10 }, getSecret());
    const r = await middleware(req("/compagnies", t));
    expect(r.status).toBe(307);
    expect(location(r)).toBe("/session-expiree");
  });
  it("lets public paths through without a cookie", async () => {
    const r = await middleware(req("/connexion"));
    expect(isNext(r)).toBe(true);
  });
});
