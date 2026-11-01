export interface Audience {
  id: "dirigeant" | "guichet" | "terrain" | "voyageur";
  icon: string;
  title: string;
  role: string;
  goal: string;
  does: string[];
}

export const audiences: Audience[] = [
  {
    id: "dirigeant",
    icon: "building",
    title: "Le dirigeant de compagnie",
    role: "Responsable de compagnie",
    goal: "Garder la main sur toute l'exploitation, sans être au guichet.",
    does: [
      "Suit la flotte, les trajets, les ventes et les colis de sa compagnie",
      "Gère les équipes : employés, plannings, congés, paie",
      "Pilote le programme de fidélité, les avis et les campagnes",
      "Suit son abonnement, ses factures et la vérification de sa compagnie",
      "Est limité à sa propre compagnie : les données des autres compagnies lui sont inaccessibles",
    ],
  },
  {
    id: "guichet",
    icon: "ticket",
    title: "L'agent de guichet",
    role: "Agent de guichet",
    goal: "Vendre vite, sans erreur de siège.",
    does: [
      "Cherche un trajet et réserve pour un passager",
      "Choisit le siège sur le plan du bus",
      "Encaisse et remet un billet électronique",
      "Annule une réservation et rend la place",
      "N'a accès ni à la paie ni aux dossiers des employés",
    ],
  },
  {
    id: "terrain",
    icon: "package",
    title: "Le personnel de terrain",
    role: "Selon les droits accordés",
    goal: "Contrôler les billets et suivre les colis à chaque étape.",
    does: [
      "Scanne le billet à l'embarquement : un billet ne sert qu'une fois",
      "Fait avancer le statut d'un colis : en transit, au hub, livré",
      "Reprend un colis au hub pour un autre trajet",
      "Joint une preuve de livraison",
      "Des rôles dédiés au personnel de terrain sont à venir",
    ],
  },
  {
    id: "voyageur",
    icon: "user",
    title: "Le voyageur",
    role: "Client",
    goal: "Réserver sans se déplacer et voyager avec son billet.",
    does: [
      "Cherche un trajet sans compte, puis réserve avec son compte",
      "Choisit son siège et paie",
      "Retrouve ses billets et peut annuler une réservation non payée",
      "Cumule des points de fidélité et parraine un proche",
      "Suit un colis par son numéro, sans compte",
    ],
  },
];
