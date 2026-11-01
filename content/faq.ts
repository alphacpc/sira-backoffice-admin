export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Qu'est-ce que Sira ?",
    answer:
      "Sira est une plateforme SaaS multi-tenant destinée aux compagnies de transport interurbain par autocar en Afrique de l'Ouest. Elle unifie la gestion de flotte, la billetterie, l'expédition de colis, les ressources humaines et la facturation SaaS dans un seul espace.",
  },
  {
    question: "À qui s'adresse Sira ?",
    answer:
      "Aux compagnies de transport interurbain de toutes tailles : d'une compagnie avec quelques bus à une flotte importante desservant plusieurs lignes et plusieurs gares. Chaque compagnie active les modules dont elle a besoin.",
  },
  {
    question: "Combien coûte Sira ?",
    answer:
      "Sira est proposée sous forme d'abonnement mensuel, avec plusieurs plans selon la taille de la flotte et le volume d'activité. Consultez la page Tarifs pour les ordres de grandeur, ou demandez une démonstration pour une proposition adaptée.",
  },
  {
    question: "Les données d'une compagnie sont-elles isolées ?",
    answer:
      "Oui. Chaque compagnie est un tenant à part entière, avec son propre sous-domaine et des données strictement séparées. Chaque accès est filtré par compagnie, de sorte qu'aucune donnée d'une autre compagnie ne peut fuiter, par construction.",
  },
  {
    question: "Quels moyens de paiement sont pris en charge ?",
    answer:
      "La billetterie prend en charge le paiement mobile money (Orange Money, Wave…), ainsi que le virement, la carte et les espèces. Les devises gérées incluent le FCFA (XOF), l'euro et le dollar.",
  },
  {
    question: "Comment se fait la réservation en ligne ?",
    answer:
      "Le passager (ou l'agent au guichet) recherche un trajet, choisit un siège, paie par mobile money et reçoit un billet électronique scannable. La disponibilité des places est mise à jour de façon atomique, ce qui évite toute survente.",
  },
  {
    question: "Sira gère-t-elle aussi les colis ?",
    answer:
      "Oui. Un colis est expédié sur le réseau de la compagnie, suivi publiquement par numéro étape par étape, et peut être ré-acheminé sur plusieurs trajets via des hubs. Des documents (facture, déclaration, preuve de livraison) peuvent y être attachés.",
  },
  {
    question: "La plateforme est-elle conforme à la réglementation ?",
    answer:
      "Sira est alignée sur la loi sénégalaise n°2008-12 sur la protection des données personnelles et compatible RGPD. Elle fournit un journal d'audit en ajout seul, une gestion du consentement, et le suivi des droits des personnes concernées.",
  },
  {
    question: "Puis-je personnaliser la plateforme à mon image ?",
    answer:
      "Les plans supérieurs incluent un sous-domaine personnalisé et des fonctionnalités à la carte. Le nom et les paramètres de la compagnie (devise, commission, coordonnées) sont configurables.",
  },
  {
    question: "Comment démarrer ?",
    answer:
      "Commencez par demander une démonstration. Nous établissons ensemble vos besoins (flotte, lignes, volume), vous choisissez un plan, et votre compagnie est configurée avec son espace dédié.",
  },
];
