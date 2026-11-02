import { describe, expect, it } from "vitest";
import { NAV, allNavItems, isKnownPath, isLinkablePath, labelForSegment } from "@/lib/nav";

describe("nav", () => {
  it("has unique hrefs", () => {
    const hrefs = allNavItems().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("marks every page as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual([
      "/", "/acces/permissions", "/acces/roles", "/acces/sessions", "/clients/avis", "/clients/comptes",
      "/clients/fidelite", "/colis", "/communication/campagnes", "/communication/messages", "/communication/notifications",
      "/communication/programmations", "/communication/segments", "/compagnies", "/compagnies/kyc",
      "/conformite/acces-donnees", "/conformite/consentements", "/conformite/demandes-rgpd", "/conformite/journal-audit", "/conformite/retention",
      "/facturation/abonnements", "/facturation/factures", "/facturation/impayes", "/facturation/paiements",
      "/flotte/bus", "/flotte/flottes", "/flotte/fournisseurs", "/flotte/gares", "/flotte/lignes",
      "/flotte/maintenance", "/flotte/plans-de-sieges", "/flotte/trajets",
      "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/plans", "/offre/types-documents-kyc",
      "/parametres/equipe-admin", "/parametres/journal-backoffice", "/parametres/profil",
      "/recherche",
      "/supervision/api", "/supervision/incidents", "/supervision/services", "/supervision/usage",
      "/utilisateurs",
      "/ventes/billets", "/ventes/en-ligne", "/ventes/moyens-de-paiement", "/ventes/paiements", "/ventes/reservations",
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

describe("lot 4 breadcrumbs", () => {
  it("links the bus, route and trip lists from their detail pages, not the bare fleet prefix", () => {
    expect(isLinkablePath("/flotte/bus/abc")).toBe(true);
    expect(isLinkablePath("/flotte/lignes/abc")).toBe(true);
    expect(isLinkablePath("/flotte/trajets/abc")).toBe(true);
    expect(isLinkablePath("/flotte/plans-de-sieges")).toBe(true);
    expect(isLinkablePath("/flotte/gares/abc")).toBe(false);
    expect(isLinkablePath("/flotte")).toBe(false);
  });
  it("labels the fleet segments with their accents", () => {
    expect(["flotte", "bus", "flottes", "gares", "lignes", "trajets", "plans-de-sieges", "maintenance", "fournisseurs"]
      .map(labelForSegment)).toEqual([
      "Flotte", "Bus", "Flottes", "Gares", "Lignes", "Trajets", "Plans de sièges", "Maintenance", "Fournisseurs",
    ]);
  });
});

describe("lot 5 breadcrumbs", () => {
  it("links the parent list of booking, payment and ticket details, nothing else under sales", () => {
    expect(isLinkablePath("/ventes/reservations/abc")).toBe(true);
    expect(isLinkablePath("/ventes/paiements/abc")).toBe(true);
    expect(isLinkablePath("/ventes/billets/TK-ABC12345")).toBe(true);
    expect(isLinkablePath("/ventes/en-ligne")).toBe(true);
    expect(isLinkablePath("/ventes")).toBe(false);
  });
  it("labels the sales segments with their accents", () => {
    expect(labelForSegment("reservations")).toBe("Réservations");
    expect(labelForSegment("en-ligne")).toBe("Libre-service en ligne");
    expect(labelForSegment("moyens-de-paiement")).toBe("Moyens de paiement");
  });
});

describe("lot 6 breadcrumbs", () => {
  it("links the parent list of parcel, customer and review details, nothing else under clients", () => {
    expect(isLinkablePath("/colis/abc")).toBe(true);
    expect(isLinkablePath("/clients/comptes/abc")).toBe(true);
    expect(isLinkablePath("/clients/avis/abc")).toBe(true);
    expect(isLinkablePath("/clients/fidelite")).toBe(true);
    expect(isLinkablePath("/clients")).toBe(false);
  });
  it("labels the client segments with their accents", () => {
    expect(labelForSegment("fidelite")).toBe("Fidélité");
    expect(labelForSegment("comptes")).toBe("Comptes");
    expect(labelForSegment("avis")).toBe("Avis");
  });
});

describe("lot 7 breadcrumbs", () => {
  it("links the parent list of notification and campaign details, nothing else under communication", () => {
    expect(isLinkablePath("/communication/notifications/abc")).toBe(true);
    expect(isLinkablePath("/communication/campagnes/abc")).toBe(true);
    expect(isLinkablePath("/communication/segments")).toBe(true);
    expect(isLinkablePath("/communication")).toBe(false);
  });
  it("labels the communication segments", () => {
    expect(labelForSegment("communication")).toBe("Communication");
    expect(labelForSegment("programmations")).toBe("Programmations");
  });
});

describe("lot 8 breadcrumbs", () => {
  it("links the parent list of audit line and request details, nothing else under compliance", () => {
    expect(isLinkablePath("/conformite/journal-audit/abc")).toBe(true);
    expect(isLinkablePath("/conformite/demandes-rgpd/abc")).toBe(true);
    expect(isLinkablePath("/conformite/retention")).toBe(true);
    expect(isLinkablePath("/conformite")).toBe(false);
  });
  it("labels the compliance segments with their accents", () => {
    expect(labelForSegment("journal-audit")).toBe("Journal d'audit");
    expect(labelForSegment("acces-donnees")).toBe("Accès aux données");
    expect(labelForSegment("demandes-rgpd")).toBe("Demandes RGPD");
    expect(labelForSegment("consentements")).toBe("Consentements");
    expect(labelForSegment("retention")).toBe("Rétention");
  });
});

describe("lot 9 breadcrumbs", () => {
  it("links the parent list of an incident detail, nothing else under supervision", () => {
    expect(isLinkablePath("/supervision/incidents/abc")).toBe(true);
    expect(isLinkablePath("/supervision/services")).toBe(true);
    expect(isLinkablePath("/supervision/api")).toBe(true);
    expect(isLinkablePath("/supervision")).toBe(false);
  });
  it("labels the supervision segments", () => {
    expect(labelForSegment("supervision")).toBe("Supervision");
    expect(labelForSegment("api")).toBe("Trafic API");
    expect(labelForSegment("usage")).toBe("Usage");
    expect(labelForSegment("incidents")).toBe("Incidents");
  });
});

describe("lot 10 breadcrumbs", () => {
  it("labels the settings segments and links the three pages", () => {
    expect(labelForSegment("parametres")).toBe("Paramètres");
    expect(labelForSegment("profil")).toBe("Mon profil");
    expect(labelForSegment("equipe-admin")).toBe("Équipe admin");
    expect(labelForSegment("journal-backoffice")).toBe("Journal du backoffice");
    expect(isLinkablePath("/parametres/profil")).toBe(true);
    expect(isLinkablePath("/parametres")).toBe(false);
  });
  it("has no page left as coming soon", () => {
    expect(allNavItems().filter((i) => !i.implemented)).toEqual([]);
  });
  it("labels the search segment", () => {
    expect(labelForSegment("recherche")).toBe("Recherche");
    expect(isLinkablePath("/recherche")).toBe(true);
  });
});
