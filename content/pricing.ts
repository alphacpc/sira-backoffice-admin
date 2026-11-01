export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  missing: string[];
}

export const plans: PricingPlan[] = [
  {
    name: "Démarrage",
    price: "25 000",
    period: "FCFA / mois",
    tagline: "Pour une compagnie qui démarre sa digitalisation.",
    features: [
      "1 gare et jusqu'à 5 bus",
      "200 réservations par mois",
      "Billetterie sans survente",
      "Expédition de colis de base",
      "Notifications email et SMS",
      "Support standard",
    ],
    missing: [
      "Ré-acheminement de colis multi-étapes",
      "Module ressources humaines",
      "Programme de fidélité",
    ],
  },
  {
    name: "Croissance",
    price: "75 000",
    period: "FCFA / mois",
    tagline: "Pour une compagnie qui se développe sur plusieurs lignes.",
    highlight: true,
    features: [
      "Jusqu'à 20 bus et 10 gares",
      "2 000 réservations par mois",
      "Colis avec ré-acheminement multi-étapes",
      "Ressources humaines (employés, plannings, congés)",
      "Programme de fidélité et parrainage",
      "Support prioritaire",
    ],
    missing: [
      "Bulletins de paie",
      "Campagnes marketing",
      "API B2B et sous-domaine personnalisé",
    ],
  },
  {
    name: "Entreprise",
    price: "180 000",
    period: "FCFA / mois",
    tagline: "Pour les flottes importantes et les exigences avancées.",
    features: [
      "Bus, gares et réservations à grande échelle",
      "Ressources humaines complètes, paie incluse",
      "Campagnes marketing segmentées",
      "Clés API B2B et sous-domaine personnalisé",
      "Support dédié",
    ],
    missing: [
      "Tarifs dégressifs au volume (nous consulter)",
    ],
  },
];

export const addons: string[] = [
  "Fonctionnalités à la carte, activables selon le plan",
  "Suivi GPS temps réel",
  "Facturation SaaS multi-devises",
  "Accès API pour intégrations B2B",
];

export const pricingNote =
  "Tarifs indicatifs, susceptibles d'évoluer. Le prix final dépend du nombre de bus, de gares et du volume d'activité. Une démonstration permet d'établir une proposition adaptée.";
