export interface NavItem { label: string; href: string; implemented: boolean }
export type NavIcon =
  | "billing" | "access" | "fleet" | "sales"
  | "parcels" | "communication" | "compliance" | "monitoring" | "settings";
export interface NavSection { label: string; icon: NavIcon; items: NavItem[] }

export const NAV: NavSection[] = [
];

/** Standalone entry above the sections of the sidebar. */
export const HOME_ITEM: NavItem = { label: "Tableau de bord", href: "/", implemented: true };
/** Pages reached from the dashboard rather than from a menu entry. */
const HIDDEN_ITEMS: NavItem[] = [
  { label: "Recherche globale", href: "/recherche", implemented: true },
  { label: "File de revue KYC", href: "/compagnies/kyc", implemented: true },
];
export const COMPANIES_ITEM: NavItem = { label: "Compagnies", href: "/compagnies", implemented: true };
/** Standalone entries (no submenu) shown above the sections. */
export const BILLING_ITEM: NavItem = { label: "Offre et facturation", href: "/offre-facturation", implemented: true };
export const ACCESS_ITEM: NavItem = { label: "Utilisateurs et accès", href: "/utilisateurs-acces", implemented: true };
export const FLEET_ITEM: NavItem = { label: "Flotte", href: "/flotte", implemented: true };
export const SALES_ITEM: NavItem = { label: "Ventes et paiements", href: "/ventes", implemented: true };
export const CARE_ITEM: NavItem = { label: "Colis et clients", href: "/colis-clients", implemented: true };
export const COMM_ITEM: NavItem = { label: "Communication", href: "/communication", implemented: true };
export const COMPLIANCE_ITEM: NavItem = { label: "Conformité et audit", href: "/conformite", implemented: true };
export const MONITORING_ITEM: NavItem = { label: "Supervision", href: "/supervision", implemented: true };
export const SETTINGS_ITEM: NavItem = { label: "Paramètres", href: "/parametres", implemented: true };
export const TOP_ITEMS: { item: NavItem; icon: "home" | "companies" | "billing" | "access" | "fleet" | "sales" | "care" | "comm" | "compliance" | "monitoring" | "settings" }[] = [
  { item: HOME_ITEM, icon: "home" },
  { item: COMPANIES_ITEM, icon: "companies" },
  { item: BILLING_ITEM, icon: "billing" },
  { item: ACCESS_ITEM, icon: "access" },
  { item: FLEET_ITEM, icon: "fleet" },
  { item: SALES_ITEM, icon: "sales" },
  { item: CARE_ITEM, icon: "care" },
  { item: COMM_ITEM, icon: "comm" },
  { item: COMPLIANCE_ITEM, icon: "compliance" },
  { item: MONITORING_ITEM, icon: "monitoring" },
  { item: SETTINGS_ITEM, icon: "settings" },
];

export function allNavItems(): NavItem[] {
  return [HOME_ITEM, COMPANIES_ITEM, BILLING_ITEM, ACCESS_ITEM, FLEET_ITEM, SALES_ITEM, CARE_ITEM, COMM_ITEM, COMPLIANCE_ITEM, MONITORING_ITEM, SETTINGS_ITEM, ...HIDDEN_ITEMS, ...NAV.flatMap((s) => s.items)];
}

export function isKnownPath(path: string): boolean {
  return allNavItems().some((i) => i.href === path);
}

const SEGMENT_LABELS: Record<string, string> = {
  compagnies: "Compagnies", kyc: "File de revue KYC", "offre-facturation": "Offre et facturation", "utilisateurs-acces": "Utilisateurs et accès", "colis-clients": "Colis et clients", communication: "Communication", notifications: "Notifications", campagnes: "Campagnes", messages: "Messages", segments: "Segments", programmations: "Programmations", comptes: "Clients", avis: "Avis", "moyens-de-paiement": "Moyens de paiement", billets: "Billets",
  plans: "Plans", fonctionnalites: "Fonctionnalités", paliers: "Paliers", documents: "Documents KYC",
  abonnements: "Abonnements", paiements: "Paiements", factures: "Factures", impayes: "Impayés", offre: "Offre",
  facturation: "Facturation", flotte: "Flotte", ventes: "Ventes", clients: "Clients",
  conformite: "Conformité et audit", supervision: "Supervision",
  parametres: "Paramètres", securite: "Sécurité", preferences: "Préférences", acces: "Accès", utilisateurs: "Utilisateurs", colis: "Colis",
  recherche: "Recherche", roles: "Rôles", bus: "Bus", flottes: "Flottes", gares: "Gares", lignes: "Lignes",
  trajets: "Trajets", "plans-de-sieges": "Plans de sièges", maintenance: "Maintenance", fournisseurs: "Fournisseurs",
  reservations: "Réservations", fidelite: "Fidélité", "en-ligne": "Libre-service en ligne",
  "journal-audit": "Journal d'audit", "acces-donnees": "Accès aux données", "demandes-rgpd": "Demandes RGPD",
  consentements: "Consentements", retention: "Rétention", api: "Trafic API",
  profil: "Mon profil", "equipe-admin": "Équipe admin", "journal-backoffice": "Journal du backoffice",
};

export function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]!;
  const text = segment.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const ROUTE_PREFIXES = [
  "/offre-facturation", "/utilisateurs-acces", "/ventes", "/colis-clients", "/communication", "/conformite", "/supervision", "/parametres",
  "/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures", "/utilisateurs",
  "/flotte/bus", "/flotte/lignes", "/flotte/trajets",
  "/ventes/reservations", "/ventes/paiements", "/ventes/billets", "/ventes/locations",
  "/colis", "/clients/comptes", "/clients/avis",
  "/communication/notifications", "/communication/campagnes",
  "/conformite/journal-audit", "/conformite/demandes-rgpd",
  "/supervision/incidents",
];

/** True when a breadcrumb path leads to a real screen (a nav item or a company route), so it may be a link. */
export function isLinkablePath(path: string): boolean {
  return path === "/" || isKnownPath(path) || ROUTE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
