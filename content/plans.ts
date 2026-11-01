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
      "Équipes : plannings, congés, incidents, paie",
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
