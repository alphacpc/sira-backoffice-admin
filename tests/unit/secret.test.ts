import { afterEach, describe, expect, it, vi } from "vitest";
import { getSecret } from "@/lib/auth/constants";

afterEach(() => vi.unstubAllEnvs());

describe("getSecret", () => {
  it("falls back in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", "");
    expect(getSecret().length).toBeGreaterThan(0);
  });
  it("throws in production without the variable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", "");
    expect(() => getSecret()).toThrow();
  });
  it("throws in production with a short variable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", "short");
    expect(() => getSecret()).toThrow();
  });
  it("returns a 32+ char secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const s = "x".repeat(32);
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", s);
    expect(getSecret()).toBe(s);
  });
});
