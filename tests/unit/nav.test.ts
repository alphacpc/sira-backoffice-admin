import { describe, expect, it } from "vitest";
import { NAV, allNavItems, isKnownPath, labelForSegment } from "@/lib/nav";

describe("nav", () => {
  it("has unique hrefs", () => {
    const hrefs = allNavItems().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("marks only lot 1, lot 2 and lot 3 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual([
      "/", "/acces/permissions", "/acces/roles", "/acces/sessions", "/compagnies", "/compagnies/kyc",
      "/facturation/abonnements", "/facturation/factures", "/facturation/impayes", "/facturation/paiements",
      "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/plans", "/offre/types-documents-kyc",
      "/utilisateurs",
    ]);
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

describe("isLinkablePath for lot 2 detail pages", () => {
  it("links the parent list of plan, subscription and invoice details, nothing else", () => {
    expect(isLinkablePath("/offre/plans/abc")).toBe(true);
    expect(isLinkablePath("/facturation/abonnements/abc")).toBe(true);
    expect(isLinkablePath("/facturation/factures/abc")).toBe(true);
    expect(isLinkablePath("/facturation/paiements/abc")).toBe(false);
    expect(isLinkablePath("/facturation")).toBe(false);
  });
});

describe("lot 3 breadcrumbs", () => {
  it("links the user list from an account page, not the bare access prefix", () => {
    expect(isLinkablePath("/utilisateurs")).toBe(true);
    expect(isLinkablePath("/utilisateurs/abc")).toBe(true);
    expect(isLinkablePath("/acces/roles")).toBe(true);
    expect(isLinkablePath("/acces")).toBe(false);
  });
  it("labels the access segments with their accents", () => {
    expect(labelForSegment("acces")).toBe("Accès");
    expect(labelForSegment("roles")).toBe("Rôles");
    expect(labelForSegment("utilisateurs")).toBe("Utilisateurs");
  });
});
