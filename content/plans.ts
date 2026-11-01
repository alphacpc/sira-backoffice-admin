export interface Plan {
  name: string;
  summary: string;
  features: string[];
  highlight?: boolean;
}

export const plans: Plan[] = [
  {
    name: "Essentiel",
    summary: "Pour vendre et exploiter ses lignes.",
    features: [
      "Gares, lignes, bus et trajets",
      "Plan de sièges",
      "Billetterie au guichet et en ligne",
      "Billets électroniques et contrôle par scan",
      "Notifications par email et dans l'application",
    ],
  },
  {
    name: "Exploitation",
    summary: "Pour une compagnie qui gère aussi ses colis et ses équipes.",
    highlight: true,
    features: [
      "Tout l'Essentiel",
      "Colis : suivi public, ré-acheminement, documents",
      "Maintenance des bus, flottes et fournisseurs",
      "Location de bus : lien de réservation, devis et factures",
      "Équipes : plannings, congés, incidents, bulletins de paie",
      "Programme de fidélité et parrainage",
    ],
  },
  {
    name: "Pilotage",
    summary: "Pour un réseau qui veut piloter ses clients et sa conformité.",
    features: [
      "Tout l'Exploitation",
      "Avis clients et campagnes dans l'application",
      "Partenariat entre compagnies : parrainage et paliers",
      "Consentements et demandes RGPD",
    ],
  },
];

/** Niveau minimal qui inclut la fonction : 0 Essentiel, 1 Exploitation, 2 Pilotage. Chaque niveau inclut les précédents. */
export interface ComparisonRow {
  label: string;
  from: 0 | 1 | 2;
}
export interface ComparisonGroup {
  code: string;
  title: string;
  rows: ComparisonRow[];
}

export const comparison: ComparisonGroup[] = [
  {
    code: "FLO",
    title: "Flotte",
    rows: [
      { label: "Gares, lignes, bus et trajets", from: 0 },
      { label: "Plan de sièges", from: 0 },
      { label: "Flottes et fournisseurs", from: 1 },
      { label: "Maintenance des bus", from: 1 },
    ],
  },
  {
    code: "BIL",
    title: "Billetterie",
    rows: [
      { label: "Billetterie au guichet et en ligne", from: 0 },
      { label: "Billets électroniques et contrôle par scan", from: 0 },
      { label: "Notifications par email et dans l'application", from: 0 },
    ],
  },
  {
    code: "LOC",
    title: "Location",
    rows: [{ label: "Lien de réservation, devis et factures", from: 1 }],
  },
  {
    code: "COL",
    title: "Colis",
    rows: [{ label: "Suivi public, ré-acheminement, documents", from: 1 }],
  },
  {
    code: "EQP",
    title: "Équipes",
    rows: [{ label: "Plannings, congés, incidents, bulletins de paie", from: 1 }],
  },
  {
    code: "PIL",
    title: "Clients et conformité",
    rows: [
      { label: "Programme de fidélité et parrainage", from: 1 },
      { label: "Avis clients", from: 2 },
      { label: "Campagnes dans l'application", from: 2 },
      { label: "Partenariat entre compagnies", from: 2 },
      { label: "Consentements et demandes RGPD", from: 2 },
    ],
  },
];
