export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Qu'est-ce que Sira ?",
    answer:
      "Sira est une plateforme pour les compagnies de transport interurbain par autocar en Afrique de l'Ouest. Elle réunit la flotte, la billetterie, les colis, les équipes, la fidélité clients et la conformité, et chaque compagnie y dispose de son propre espace.",
  },
  {
    question: "À qui s'adresse Sira ?",
    answer:
      "Aux compagnies d'autocars, des petites flottes aux réseaux de plusieurs lignes et de plusieurs gares. Les fonctions activées dépendent du plan de chaque compagnie.",
  },
  {
    question: "Combien coûte Sira ?",
    answer:
      "Les tarifs sont établis sur devis, selon la taille de la flotte et les fonctions retenues. La page Tarifs décrit les trois niveaux ; une démonstration permet de cadrer le vôtre.",
  },
  {
    question: "Les données d'une compagnie sont-elles séparées de celles des autres ?",
    answer:
      "Les accès sont filtrés par compagnie dans les services métier : un utilisateur rattaché à une compagnie ne peut ni lire ni modifier les données d'une autre. Les administrateurs de la plateforme, eux, ne sont pas restreints à une compagnie.",
  },
  {
    question: "Quels moyens de paiement sont pris en charge ?",
    answer:
      "Le parcours de paiement est en place avec les moyens mobile money, carte et espèces, et les devises XOF, EUR et USD. L'intégration avec les opérateurs mobile money est à venir : elle est simulée dans la démonstration.",
  },
  {
    question: "Comment la plateforme évite-t-elle la survente ?",
    answer:
      "Les places disponibles sont décomptées à chaque vente, au guichet comme en ligne. Lorsqu'un plan de sièges existe pour le trajet, un siège déjà pris est refusé. Une réservation répétée par erreur n'est pas dupliquée.",
  },
  {
    question: "Sira gère-t-elle les colis ?",
    answer:
      "Oui. Un colis reçoit un numéro de suivi consultable sans compte, suit des statuts stricts, peut être ré-acheminé sur plusieurs trajets via un hub et peut porter des documents joints.",
  },
  {
    question: "Y a-t-il une application mobile ?",
    answer:
      "Pas encore. Les fonctions sont disponibles dans l'application web ; des applications mobiles sont à venir.",
  },
];
