export interface Differentiator {
  title: string;
  icon: string;
  description: string;
}

export const differentiators: Differentiator[] = [
  {
    title: "Pensée pour l'Afrique de l'Ouest",
    icon: "globe",
    description:
      "Devises locales (FCFA, EUR, USD), paiement mobile money (Orange Money, Wave…), et un modèle adapté aux compagnies de transport interurbain de la région.",
  },
  {
    title: "Tout-en-un, mais modulaire",
    icon: "boxes",
    description:
      "Flotte, billetterie, colis, ressources humaines et facturation SaaS dans un seul espace — chaque compagnie active les modules dont elle a réellement besoin.",
  },
  {
    title: "Isolation stricte entre compagnies",
    icon: "lock",
    description:
      "Chaque compagnie est un tenant à part entière, avec son propre sous-domaine et des données strictement séparées des autres. Aucun accès inter-compagnie n'est possible par construction.",
  },
  {
    title: "Robuste par construction",
    icon: "shield",
    description:
      "Une approche backend-first : chaque service expose une API testée et documentée avant tout écran, et l'isolation entre compagnies est vérifiée en continu.",
  },
  {
    title: "Conformité intégrée",
    icon: "scroll",
    description:
      "Journal d'audit en ajout seul, gestion du consentement et des droits des personnes, durée de rétention définie par compagnie — aligné sur la loi sénégalaise et compatible RGPD.",
  },
  {
    title: "Évolutive",
    icon: "zap",
    description:
      "Architecture en microservices et déploiement conteneurisé : la plateforme grandit avec la compagnie, sans refonte.",
  },
];

export const beforeAfter = [
  {
    before: "Cahiers de guichet, tableurs de flotte et outils de paie qui ne se parlent pas",
    after: "Un seul espace pour piloter flotte, ventes, colis, personnel et facturation",
  },
  {
    before: "Survente de sièges et billets papier difficiles à vérifier",
    after: "Réservation sans survente et billet électronique scannable",
  },
  {
    before: "Colis suivis au téléphone, sans traçabilité fiable",
    after: "Suivi public par numéro, étape par étape, avec notifications",
  },
  {
    before: "Données dispersées et accès difficile à contrôler",
    after: "Données isolées par compagnie, tracées et conformes",
  },
];
