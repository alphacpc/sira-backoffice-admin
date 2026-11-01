export interface ReservationStep {
  title: string;
  description: string;
  details: string[];
}

export const reservationSteps: ReservationStep[] = [
  {
    title: "Rechercher un trajet",
    description:
      "Choisissez votre gare de départ, votre destination et votre date pour voir les trajets disponibles.",
    details: [
      "Gares de départ et d'arrivée",
      "Horaires et places disponibles en temps réel",
      "Lignes desservies par la compagnie",
    ],
  },
  {
    title: "Choisir son siège",
    description:
      "Sélectionnez une place sur le plan du bus, et indiquez le nombre de passagers.",
    details: [
      "Plan du bus avec les sièges disponibles",
      "Sièges déjà réservés grisés",
      "Tarif par trajet et par type de siège",
    ],
  },
  {
    title: "Payer",
    description:
      "Réglez par mobile money ou par un autre moyen de paiement accepté par la compagnie.",
    details: [
      "Paiement mobile money (Orange Money, Wave…)",
      "Virement, carte ou espèces selon la compagnie",
      "Confirmation immédiate de la transaction",
    ],
  },
  {
    title: "Recevoir son billet",
    description:
      "Un billet électronique est émis et envoyé par email, SMS ou notification in-app.",
    details: [
      "Billet électronique avec code de réservation",
      "Envoi par email, SMS et in-app",
      "Notifications à chaque étape clé",
    ],
  },
  {
    title: "Embarquer",
    description:
      "Présentez votre billet à l'embarquement : il est scanné et vérifié en un geste.",
    details: [
      "Scan du billet par le contrôleur",
      "Vérification instantanée de validité",
      "Statut du billet mis à jour (embarqué, utilisé)",
    ],
  },
];
