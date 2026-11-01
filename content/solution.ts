export type ChapterId = "flotte" | "billetterie" | "colis" | "equipes" | "pilotage";

export interface Chapter {
  id: ChapterId;
  icon: string;
  title: string;
  tagline: string;
  description: string;
  points: string[];
  pending: string[];
}

export const chapters: Chapter[] = [
  {
    id: "flotte",
    icon: "bus",
    title: "Flotte et trajets",
    tagline: "Savoir où est chaque bus et ce qu'il devient.",
    description:
      "Gares, lignes, bus et départs planifiés au même endroit, avec la maintenance suivie de bout en bout.",
    points: [
      "Gares, lignes, bus et trajets planifiés, avec le nombre de places disponibles",
      "Plan de sièges par trajet",
      "Flottes et sous-flottes, avec un dépôt de rattachement",
      "Maintenance planifiée, en cours, terminée, avec le coût total calculé",
      "Le bus passe en maintenance au démarrage de l'intervention et revient en service à la clôture",
      "Fournisseurs (garages, assureurs) rattachés à la compagnie",
    ],
    pending: ["Alertes d'échéance (assurance, contrôle technique)", "Suivi GPS des bus"],
  },
  {
    id: "billetterie",
    icon: "ticket",
    title: "Billetterie et paiement",
    tagline: "Vendre au guichet et en ligne, sans vendre deux fois le même siège.",
    description:
      "Le guichetier et le voyageur réservent sur le même stock de places, décompté à chaque vente.",
    points: [
      "Réservation au guichet ou en ligne par le voyageur",
      "Choix du siège : un siège vendu ne peut plus l'être",
      "Billet électronique émis dès le paiement confirmé, contrôlé par scan",
      "Annulation avec restitution de la place",
      "Réservations en ligne non payées libérées automatiquement après un délai",
      "Une réservation répétée par erreur (double clic, réseau instable) n'est pas dupliquée",
    ],
    pending: [
      "Paiement mobile money avec les opérateurs (simulé en démonstration)",
      "Remboursements",
    ],
  },
  {
    id: "colis",
    icon: "package",
    title: "Colis",
    tagline: "Un colis suivi à chaque étape, par son expéditeur comme par son destinataire.",
    description:
      "Chaque colis a un numéro de suivi consultable sans compte, et peut changer de bus en route.",
    points: [
      "Expédition avec numéro de suivi public",
      "Statuts stricts : enregistré, en transit, au hub, livré, retourné, perdu",
      "Ré-acheminement sur plusieurs trajets en passant par un hub",
      "Documents joints : facture, déclaration, preuve de livraison",
      "Un message au destinataire à chaque étape",
    ],
    pending: ["Envoi des SMS via un opérateur (simulé aujourd'hui)", "Paiement du colis en ligne"],
  },
  {
    id: "equipes",
    icon: "users",
    title: "Équipes (RH)",
    tagline: "Vos employés, leurs plannings, leurs congés et leur paie.",
    description:
      "Un dossier par employé, avec les démarches RH courantes et des accès strictement limités.",
    points: [
      "Fiche employé et statut (actif, suspendu)",
      "Plannings, congés avec approbation, incidents, avantages",
      "Bulletins de paie : brouillon, traité, payé, annulé",
      "Documents confidentiels chiffrés, accessibles par une permission dédiée",
      "La suspension d'un employé coupe ses accès à la plateforme",
    ],
    pending: ["Calcul automatique des cotisations et de l'impôt", "Bulletin de paie en PDF", "Formations"],
  },
  {
    id: "pilotage",
    icon: "shield",
    title: "Clients, abonnement et conformité",
    tagline: "Fidéliser, facturer et rester en règle.",
    description:
      "Les outils qui entourent l'exploitation : programme clients, abonnement SaaS et obligations de conformité.",
    points: [
      "Programme de fidélité, parrainage et avis clients",
      "Campagnes de messages dans l'application, ciblées par segment",
      "Abonnement avec période d'essai, renouvellement et factures",
      "Vérification des pièces de la compagnie avant l'activation du compte",
      "Consentements par compagnie et demandes RGPD suivies sous 30 jours",
      "Journal d'audit qui ne peut être ni modifié ni effacé",
      "Supervision de la santé des services et suivi des incidents par l'équipe Sira",
    ],
    pending: ["Génération des factures en PDF", "Campagnes par email et SMS"],
  },
];
