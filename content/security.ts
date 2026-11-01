export interface SecuritySection {
  title: string;
  icon: string;
  description: string;
  points: string[];
}

export const securitySections: SecuritySection[] = [
  {
    title: "Authentification & autorisation",
    icon: "key",
    description:
      "Chaque accès est vérifié à la fois à la porte d'entrée et au cœur de chaque service.",
    points: [
      "Jeton d'accès de courte durée et rafraîchissement révocable, jamais stocké en clair",
      "Rôles et permissions fins (RBAC), vérifiés service par service",
      "Authentification multi-facteur pour les rôles sensibles",
      "Clés API pour les intégrations B2B, stockées hashées avec des périmètres explicites",
      "Verrouillage progressif des comptes face aux tentatives répétées",
    ],
  },
  {
    title: "Isolation entre compagnies",
    icon: "lock",
    description:
      "Chaque compagnie cliente est strictement séparée des autres, par construction et pas seulement par convention.",
    points: [
      "Un sous-domaine propre à chaque compagnie, résolu à la porte d'entrée",
      "Filtrage systématique des données par compagnie au niveau de l'accès aux données",
      "Vérification croisée entre le jeton et le tenant : tout écart est rejeté",
      "Tentatives d'accès inter-compagnie systématiquement testées en continu",
    ],
  },
  {
    title: "Protection des données personnelles",
    icon: "shield",
    description:
      "Alignée sur la loi sénégalaise n°2008-12 et compatible RGPD, pour les données des passagers comme des employés.",
    points: [
      "Journal d'audit en ajout seul : qui, quoi, quand, avant/après",
      "Consentement explicite, suivi par type et par version des conditions",
      "Droits des personnes : accès, rectification, effacement, portabilité",
      "Durée de rétention des données définie par compagnie, purge planifiée",
      "Documents confidentiels chiffrés, accès restreint par permission dédiée",
    ],
  },
  {
    title: "Secrets & infrastructure",
    icon: "fingerprint",
    description:
      "Aucun secret en clair dans le code, aucune porte dérobée dans l'infrastructure.",
    points: [
      "Aucun secret en dur dans le code ni la configuration versionnée",
      "Gestionnaire de secrets dédié et rotation documentée",
      "Chiffrement des échanges entre services",
      "Stockage objet par URLs pré-signées à durée limitée",
      "Un compte de base de données dédié par service, aux droits minimaux",
    ],
  },
];
