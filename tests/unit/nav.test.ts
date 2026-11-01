import { describe, expect, it } from "vitest";
import { NAV, allNavItems, isKnownPath, labelForSegment } from "@/lib/nav";

describe("nav", () => {
  it("has unique hrefs", () => {
    const hrefs = allNavItems().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("marks only lot 1 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual(["/", "/compagnies", "/compagnies/kyc"]);
  });
  it("covers every sitemap section", () => {
    expect(NAV.map((s) => s.label)).toEqual([
      "Vue 360", "Compagnies", "Offre et facturation", "Utilisateurs et accès",
      "Flotte", "Ventes et paiements", "Colis et clients", "Communication",
      "Conformité et audit", "Supervision", "Paramètres",
    ]);
  });
  it("recognises known paths and rejects unknown ones", () => {
    expect(isKnownPath("/facturation/factures")).toBe(true);
    expect(isKnownPath("/n-importe-quoi")).toBe(false);
  });
  it("labels a segment", () => {
    expect(labelForSegment("compagnies")).toBe("Compagnies");
    expect(labelForSegment("inconnu-xyz")).toBe("Inconnu xyz");
  });
});

import { isLinkablePath } from "@/lib/nav";
describe("isLinkablePath", () => {
  it("links known pages and company routes, not bare section prefixes", () => {
    expect(isLinkablePath("/")).toBe(true);
    expect(isLinkablePath("/compagnies")).toBe(true);
    expect(isLinkablePath("/compagnies/kyc")).toBe(true);
    expect(isLinkablePath("/compagnies/abc")).toBe(true);
    expect(isLinkablePath("/offre/plans")).toBe(true);
    expect(isLinkablePath("/offre")).toBe(false);
    expect(isLinkablePath("/facturation")).toBe(false);
    expect(isLinkablePath("/flotte")).toBe(false);
  });
});
