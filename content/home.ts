export interface JourneyStep {
  title: string;
  text: string;
}

export const journeySteps: JourneyStep[] = [
  {
    title: "Le voyageur choisit un trajet",
    text: "Il cherche par ville et par date, sans avoir besoin de compte, parmi les trajets ouverts à la réservation.",
  },
  {
    title: "Il choisit son siège",
    text: "Le plan des places est celui du bus. Un siège pris disparaît pour tous les autres : pas de survente.",
  },
  {
    title: "Il paie",
    text: "Le paiement confirme la réservation. L'intégration des opérateurs mobile money est à venir : elle est simulée en démonstration.",
  },
  {
    title: "Il reçoit son billet",
    text: "Un billet électronique avec son code, contrôlé par scan à l'embarquement. Une notification confirme chaque étape.",
  },
];

export interface TrustPoint {
  icon: string;
  title: string;
  text: string;
}

export const trustPoints: TrustPoint[] = [
  {
    icon: "lock",
    title: "Chaque compagnie ne voit que ses données",
    text: "Les accès sont filtrés par compagnie dans chaque service. Une donnée d'une autre compagnie répond comme si elle n'existait pas.",
  },
  {
    icon: "scroll",
    title: "Un journal d'audit qui ne se réécrit pas",
    text: "Les actions sensibles sont tracées en ajout seul. Le compte applicatif ne peut ni les modifier ni les supprimer.",
  },
  {
    icon: "file-check",
    title: "RGPD pris en compte",
    text: "Consentements par compagnie, demandes des personnes suivies sous 30 jours, adresses IP anonymisées après la durée de conservation.",
  },
];

export const planPreview = [
  { name: "Essentiel", text: "Flotte, trajets et billetterie au guichet et en ligne." },
  { name: "Exploitation", text: "Ajoute les colis, la maintenance, les équipes et la fidélité." },
  { name: "Pilotage", text: "Ajoute les campagnes, les avis, le partenariat et le suivi de conformité." },
];
