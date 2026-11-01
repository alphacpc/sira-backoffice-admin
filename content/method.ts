export interface MethodSection {
  title: string;
  icon: string;
  description: string;
  points: string[];
}

export const methodSections: MethodSection[] = [
  {
    title: "Backend-first",
    icon: "code",
    description:
      "L'API stable et documentée est livrée avant le moindre écran. Le contrat OpenAPI devient la référence unique pour les clients web et mobiles.",
    points: [
      "Une API testée et documentée par service, avant toute interface",
      "Pas d'écran refait à chaque évolution de contrat découverte tardivement",
      "Les clients web et mobiles se branchent sur un socle éprouvé",
    ],
  },
  {
    title: "Microservices par domaine",
    icon: "boxes",
    description:
      "La plateforme est découpée en domaines métier indépendants, chacun avec sa propre base de données et son propre cycle de vie.",
    points: [
      "Neuf domaines métier, chacun dans un service dédié",
      "Une base de données par service, aucune base partagée",
      "Pas de clé étrangère entre services : référence par identifiant",
      "Découverte dynamique des services et configuration externalisée",
    ],
  },
  {
    title: "Événementiel & cohérence",
    icon: "zap",
    description:
      "Les services communiquent par événements. L'écriture en base et la publication d'un événement sont garanties cohérentes.",
    points: [
      "Écriture et publication d'événement atomiques (outbox transactionnel)",
      "Copie locale légère des données partagées, mise à jour par événement",
      "Sagas chorégraphiées pour les parcours multi-services",
    ],
  },
  {
    title: "Qualité & tests",
    icon: "check",
    description:
      "Chaque service est testé avant d'être fusionné, y compris sur les cas de sécurité les plus critiques.",
    points: [
      "Tests unitaires et d'intégration par service",
      "Isolation entre compagnies testée en continu",
      "Migrations de base versionnées et incrémentales",
      "Intégration continue automatisée pour chaque service",
    ],
  },
  {
    title: "Observabilité",
    icon: "gauge",
    description:
      "Chaque requête est tracée, chaque service expose ses métriques, chaque log est corrélé à la trace qui l'a produit.",
    points: [
      "Traces distribuées sur chaque requête entrante",
      "Métriques par endpoint (latence, taux d'erreur)",
      "Logs centralisés, corrélés par identifiant de trace",
    ],
  },
];
