export type ChapterId = "flotte" | "billetterie" | "location" | "colis" | "equipes" | "pilotage";

export interface Chapter {
  id: ChapterId;
  stop: { code: string; name: string };
  icon: string;
  title: string;
  tagline: string;
  description: string;
  points: string[];
}

export const chapters: Chapter[] = [
  {
    id: "flotte",
    stop: { code: "FLO", name: "Flotte" },
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
      "Suivi GPS des bus en temps réel",
      "Alertes d'échéance : assurance, contrôle technique, maintenance",
    ],
  },
  {
    id: "billetterie",
    stop: { code: "BIL", name: "Billetterie" },
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
      "Paiement par mobile money, carte ou espèces",
    ],
  },
  {
    id: "location",
    stop: { code: "LOC", name: "Location" },
    icon: "bus",
    title: "Location de bus",
    tagline: "Louer vos bus sur demande, avec un devis prêt à partager.",
    description:
      "Chaque compagnie met ses bus en location depuis un lien de réservation qu'elle partage. Le client choisit un bus et envoie sa demande ; la compagnie la traite, puis établit le devis ou la facture à lui transmettre.",
    points: [
      "Mise en location des bus de la compagnie, bus par bus",
      "Un lien de réservation à partager : le client y découvre les bus de la compagnie",
      "Demande de réservation du client : dates, trajet, nombre de passagers",
      "Traitement de la demande par la compagnie : acceptation, ajustement ou refus",
      "Devis ou facture établis pour le client, partageables par lien",
      "Suivi de chaque demande, de la réception jusqu'au document remis au client",
    ],
  },
  {
    id: "colis",
    stop: { code: "COL", name: "Colis" },
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
      "Un message SMS au destinataire à chaque étape",
    ],
  },
  {
    id: "equipes",
    stop: { code: "EQP", name: "Équipes" },
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
  },
  {
    id: "pilotage",
    stop: { code: "PIL", name: "Pilotage" },
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
      "Journal d'audit protégé contre la modification et la suppression",
      "Supervision de la santé des services et suivi des incidents par l'équipe Sira",
    ],
  },
];
