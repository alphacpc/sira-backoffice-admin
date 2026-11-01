export interface SolutionProfile {
  slug: string;
  icon: string;
  name: string;
  audience: string;
  summary: string;
  benefits: string[];
  serviceSlugs: string[];
}

export const profiles: SolutionProfile[] = [
  {
    slug: "compagnie",
    icon: "building",
    name: "Pour la compagnie",
    audience: "Direction & exploitation",
    summary:
      "Un seul espace pour piloter toute l'activité — flotte, ventes, colis, personnel et facturation — isolé des autres compagnies.",
    benefits: [
      "Piloter la flotte, les ventes, les colis et le personnel depuis un seul espace",
      "Activer les modules progressivement, selon les besoins réels",
      "Facturation SaaS et abonnements gérés nativement",
      "Isolation stricte : les données d'une compagnie ne sont jamais visibles des autres",
      "Conformité intégrée : audit, consentement et rétention des données",
    ],
    serviceSlugs: [
      "compagnies-facturation",
      "flotte",
      "ressources-humaines",
      "conformite-supervision",
    ],
  },
  {
    slug: "guichet",
    icon: "store",
    name: "Pour le guichet & la billetterie",
    audience: "Vente au comptoir & en agence",
    summary:
      "Vendre des billets sans survente, encaisser par mobile money et émettre un billet vérifiable en un geste.",
    benefits: [
      "Réservation avec mise à jour atomique des places : pas de survente",
      "Choix du siège via le plan du bus",
      "Paiement mobile money (Orange Money, Wave…)",
      "Billet électronique scannable et vérifiable",
      "Codes promotionnels applicables à la vente",
    ],
    serviceSlugs: ["reservation-billetterie", "flotte", "notifications"],
  },
  {
    slug: "terrain",
    icon: "navigation",
    name: "Pour le personnel terrain",
    audience: "Chauffeurs & contrôleurs",
    summary:
      "Suivre les trajets, scanner les billets et connaître l'état du véhicule et de la ligne.",
    benefits: [
      "Scan des billets et contrôle des passagers",
      "Trajets planifiés et places disponibles en temps réel",
      "Suivi de la position GPS et du carburant",
      "Échéances de maintenance, d'assurance et de contrôle technique",
      "Affectation des chauffeurs et contrôleurs par trajet",
    ],
    serviceSlugs: ["flotte", "reservation-billetterie", "ressources-humaines"],
  },
  {
    slug: "passager",
    icon: "user",
    name: "Pour les passagers",
    audience: "Client final",
    summary:
      "Réserver, payer, suivre un colis et être prévenu à chaque étape du voyage ou de l'expédition.",
    benefits: [
      "Profil client et programme de fidélité par compagnie",
      "Parrainage entre passagers",
      "Suivi public des colis par numéro",
      "Notifications email, SMS et in-app à chaque étape clé",
      "Avis privés avec réponse de la compagnie",
    ],
    serviceSlugs: [
      "clients-fidelite",
      "reservation-billetterie",
      "colis",
      "notifications",
    ],
  },
];
