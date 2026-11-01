export interface BenefitGroup {
  title: string;
  description: string;
  points: string[];
}

export const benefitGroups: BenefitGroup[] = [
  {
    title: "Unifier l'exploitation",
    description:
      "Remplacer les outils disjoints par un seul espace, pour que chaque information n'existe qu'à un seul endroit.",
    points: [
      "Flotte, ventes, colis, personnel et facturation au même endroit",
      "Des modules activés progressivement, selon les besoins réels",
      "Moins de ressaisie, moins d'erreurs, moins de papier",
    ],
  },
  {
    title: "Vendre plus, sans survente",
    description:
      "Une billetterie qui protège la compagnie des places vendues deux fois et encaisse par mobile money.",
    points: [
      "Réservation avec mise à jour atomique des places disponibles",
      "Choix du siège et paiement mobile money",
      "Billet électronique vérifiable, codes promotionnels",
    ],
  },
  {
    title: "Gagner en visibilité",
    description:
      "Savoir, à tout moment, où sont les bus, qui conduit quoi, et ce qui arrive à échéance.",
    points: [
      "Position des bus et consommation de carburant suivies",
      "Échéances de maintenance, d'assurance et de contrôle technique",
      "Affectation des chauffeurs et contrôleurs par trajet",
    ],
  },
  {
    title: "Fidéliser et informer",
    description:
      "Garder le contact avec les passagers à chaque étape, et récompenser leur fidélité.",
    points: [
      "Notifications automatiques par email, SMS et in-app",
      "Programme de fidélité et parrainage entre passagers",
      "Avis privés avec réponse de la compagnie",
    ],
  },
  {
    title: "Rester conforme",
    description:
      "Manipuler des données personnelles sans risque, avec la traçabilité exigée par la réglementation.",
    points: [
      "Journal d'audit en ajout seul, infalsifiable",
      "Consentement explicite et droits des personnes",
      "Durée de rétention des données définie par compagnie",
    ],
  },
  {
    title: "Gérer les RH de bout en bout",
    description:
      "Du dossier d'embauche au bulletin de paie, en passant par les plannings et les congés.",
    points: [
      "Dossiers employés et documents confidentiels chiffrés",
      "Plannings, congés, incidents et avantages",
      "Bulletins de paie et affectations",
    ],
  },
];
