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
