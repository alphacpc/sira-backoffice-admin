import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";

describe("isPublicPath", () => {
  it.each(["/connexion", "/connexion/x", "/session-expiree", "/acces-refuse", "/favicon.ico"])(
    "%s is public", (p) => expect(isPublicPath(p)).toBe(true));
  it.each(["/connexion-admin", "/connexionx", "/session-expiree/x", "/", "/compagnies", "/facturation/factures"])(
    "%s is not public", (p) => expect(isPublicPath(p)).toBe(false));
});
