export interface NavItem { label: string; href: string; implemented: boolean }
export interface NavSection { label: string; items: NavItem[] }

const todo = (label: string, href: string): NavItem => ({ label, href, implemented: false });

export const NAV: NavSection[] = [
  { label: "Vue 360", items: [
    { label: "Vue d'ensemble", href: "/", implemented: true },
    todo("Recherche globale", "/recherche"),
  ] },
  { label: "Compagnies", items: [
    { label: "Toutes les compagnies", href: "/compagnies", implemented: true },
    { label: "File de revue KYC", href: "/compagnies/kyc", implemented: true },
  ] },
  { label: "Offre et facturation", items: [
    { label: "Plans", href: "/offre/plans", implemented: true },
    { label: "Fonctionnalités", href: "/offre/fonctionnalites", implemented: true },
    { label: "Paliers partenaires", href: "/offre/paliers-partenaires", implemented: true },
    { label: "Types de documents KYC", href: "/offre/types-documents-kyc", implemented: true },
    { label: "Abonnements", href: "/facturation/abonnements", implemented: true },
    { label: "Paiements", href: "/facturation/paiements", implemented: true },
    { label: "Factures", href: "/facturation/factures", implemented: true },
    { label: "Impayés", href: "/facturation/impayes", implemented: true },
  ] },
  { label: "Utilisateurs et accès", items: [
    { label: "Utilisateurs", href: "/utilisateurs", implemented: true },
    { label: "Rôles", href: "/acces/roles", implemented: true },
    { label: "Permissions", href: "/acces/permissions", implemented: true },
    { label: "Sessions", href: "/acces/sessions", implemented: true },
  ] },
  { label: "Flotte", items: [
    { label: "Bus", href: "/flotte/bus", implemented: true },
    { label: "Flottes", href: "/flotte/flottes", implemented: true },
    { label: "Gares", href: "/flotte/gares", implemented: true },
    { label: "Lignes", href: "/flotte/lignes", implemented: true },
    { label: "Trajets", href: "/flotte/trajets", implemented: true },
    { label: "Plans de sièges", href: "/flotte/plans-de-sieges", implemented: true },
    { label: "Maintenance", href: "/flotte/maintenance", implemented: true },
    { label: "Fournisseurs", href: "/flotte/fournisseurs", implemented: true },
  ] },
  { label: "Ventes et paiements", items: [
    todo("Réservations", "/ventes/reservations"),
    todo("Paiements voyageurs", "/ventes/paiements"),
    todo("Billets", "/ventes/billets"),
    todo("Moyens de paiement", "/ventes/moyens-de-paiement"),
    todo("Libre-service en ligne", "/ventes/en-ligne"),
  ] },
  { label: "Colis et clients", items: [
    todo("Colis", "/colis"),
    todo("Comptes clients", "/clients/comptes"),
    todo("Fidélité", "/clients/fidelite"),
    todo("Avis", "/clients/avis"),
  ] },
  { label: "Communication", items: [
    todo("Notifications", "/communication/notifications"),
    todo("Campagnes", "/communication/campagnes"),
    todo("Segments", "/communication/segments"),
    todo("Messages", "/communication/messages"),
    todo("Programmations", "/communication/programmations"),
  ] },
  { label: "Conformité et audit", items: [
    todo("Journal d'audit", "/conformite/journal-audit"),
    todo("Accès aux données", "/conformite/acces-donnees"),
    todo("Demandes RGPD", "/conformite/demandes-rgpd"),
    todo("Consentements", "/conformite/consentements"),
    todo("Rétention", "/conformite/retention"),
  ] },
  { label: "Supervision", items: [
    todo("Services", "/supervision/services"),
    todo("Incidents", "/supervision/incidents"),
    todo("Trafic API", "/supervision/api"),
    todo("Usage", "/supervision/usage"),
  ] },
  { label: "Paramètres", items: [
    todo("Mon profil", "/parametres/profil"),
    todo("Équipe admin", "/parametres/equipe-admin"),
    todo("Journal du backoffice", "/parametres/journal-backoffice"),
  ] },
];

export function allNavItems(): NavItem[] {
  return NAV.flatMap((s) => s.items);
}

export function isKnownPath(path: string): boolean {
  return allNavItems().some((i) => i.href === path);
}

const SEGMENT_LABELS: Record<string, string> = {
  compagnies: "Compagnies", kyc: "File de revue KYC", offre: "Offre",
  facturation: "Facturation", flotte: "Flotte", ventes: "Ventes", clients: "Clients",
  communication: "Communication", conformite: "Conformité", supervision: "Supervision",
  parametres: "Paramètres", acces: "Accès", utilisateurs: "Utilisateurs", colis: "Colis",
  recherche: "Recherche", roles: "Rôles", bus: "Bus", flottes: "Flottes", gares: "Gares", lignes: "Lignes",
  trajets: "Trajets", "plans-de-sieges": "Plans de sièges", maintenance: "Maintenance", fournisseurs: "Fournisseurs",
};

export function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]!;
  const text = segment.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const ROUTE_PREFIXES = [
  "/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures", "/utilisateurs",
  "/flotte/bus", "/flotte/lignes", "/flotte/trajets",
];

/** True when a breadcrumb path leads to a real screen (a nav item or a company route), so it may be a link. */
export function isLinkablePath(path: string): boolean {
  return path === "/" || isKnownPath(path) || ROUTE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
