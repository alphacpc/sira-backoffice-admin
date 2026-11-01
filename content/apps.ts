export interface MobileApp {
  name: string;
  audience: string;
  description: string;
  features: string[];
}

export const mobileApps: MobileApp[] = [
  {
    name: "Sira Chauffeur & Contrôleur",
    audience: "Personnel terrain",
    description:
      "L'application de terrain pour les chauffeurs et contrôleurs : scan des billets, suivi des trajets et de l'état du véhicule.",
    features: [
      "Scan des billets et contrôle des passagers",
      "Trajets planifiés et places disponibles",
      "Position GPS et suivi du carburant",
      "Échéances de maintenance et de contrôle technique",
      "Fonctionnement hors-ligne, synchronisé au retour du réseau",
    ],
  },
  {
    name: "Sira Passager",
    audience: "Client final",
    description:
      "L'application des passagers : réserver, payer, suivre un colis et recevoir ses notifications.",
    features: [
      "Recherche de trajets et réservation de siège",
      "Paiement mobile money",
      "Billet électronique et programme de fidélité",
      "Suivi de colis par numéro",
      "Boîte de réception des notifications",
    ],
  },
];
