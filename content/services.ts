export interface ServiceDomain {
  slug: string;
  icon: string;
  name: string;
  summary: string;
  description: string;
  features: string[];
}

export const services: ServiceDomain[] = [
  {
    slug: "identite-acces",
    icon: "shield",
    name: "Identité & accès",
    summary:
      "Authentification, rôles et permissions pour toute la plateforme.",
    description:
      "Gère les comptes utilisateurs, l'authentification par jeton et un système de rôles et permissions fin (RBAC). Chaque action sensible sur la plateforme s'appuie sur ce socle pour savoir qui a le droit de faire quoi, et sur quelle compagnie.",
    features: [
      "Authentification par jeton (accès de courte durée + rafraîchissement révocable)",
      "Rôles et permissions fins, embarqués dans le jeton à l'émission",
      "Sessions multi-appareils avec révocation immédiate",
      "Authentification multi-facteur et clés API pour les intégrations B2B",
      "Verrouillage progressif des comptes face aux tentatives répétées",
    ],
  },
  {
    slug: "compagnies-facturation",
    icon: "badge-check",
    name: "Compagnies & facturation",
    summary:
      "Onboarding des compagnies clientes, KYC, plans et abonnements SaaS.",
    description:
      "Chaque compagnie de transport est un tenant : ce module gère sa création, la vérification de son identité légale (KYC), le catalogue de plans et fonctionnalités, les abonnements, la facturation récurrente et le programme de partenariat entre compagnies.",
    features: [
      "Onboarding d'une compagnie avec vérification d'identité (KYC)",
      "Multi-tenant par sous-domaine propre à chaque compagnie",
      "Catalogue de plans et fonctionnalités activables à la carte",
      "Abonnements SaaS et facturation récurrente",
      "Programme de parrainage B2B entre compagnies, avec crédits",
    ],
  },
  {
    slug: "flotte",
    icon: "bus",
    name: "Flotte",
    summary: "Gares, lignes, bus et trajets planifiés.",
    description:
      "Centralise le référentiel de flotte d'une compagnie : gares de départ et d'arrivée, lignes desservies, bus affectés et trajets planifiés avec leur disponibilité de places en temps réel.",
    features: [
      "Référentiel des gares, lignes et bus (types, capacités, équipements)",
      "Planification des trajets avec places disponibles en temps réel",
      "Maintenance et suivi des échéances (assurance, contrôle technique)",
      "Suivi du carburant et des positions GPS",
      "Affectation des chauffeurs et contrôleurs",
    ],
  },
  {
    slug: "reservation-billetterie",
    icon: "ticket",
    name: "Réservation & billetterie",
    summary: "Réservation de places, paiement et billets électroniques.",
    description:
      "Permet de réserver une place sur un trajet, de choisir un siège, de payer (mobile money) et de recevoir un billet électronique vérifiable. La disponibilité des places est mise à jour de façon atomique pour éviter toute survente.",
    features: [
      "Réservation de place avec mise à jour atomique (pas de survente)",
      "Choix du siège via le plan du bus",
      "Paiement mobile money (Orange Money, Wave…)",
      "Billet électronique vérifiable par scan",
      "Codes promotionnels",
    ],
  },
  {
    slug: "colis",
    icon: "package",
    name: "Colis",
    summary: "Expédition de colis, suivi public et ré-acheminement.",
    description:
      "Gère l'expédition de colis sur le réseau d'une compagnie, avec un suivi public par numéro de tracking, un ré-acheminement multi-étapes lorsqu'un colis transite par plusieurs trajets, et le dépôt de documents associés (facture, déclaration, preuve de livraison).",
    features: [
      "Expédition de colis sur le réseau de la compagnie",
      "Suivi public par numéro, étape par étape",
      "Ré-acheminement multi-étapes via des hubs",
      "Documents associés : facture, déclaration, preuve de livraison",
      "Notification SMS au destinataire à chaque étape",
    ],
  },
  {
    slug: "ressources-humaines",
    icon: "users",
    name: "Ressources humaines",
    summary: "Employés, plannings, congés, incidents et paie.",
    description:
      "Couvre le cycle de vie complet d'un employé de compagnie : dossier et documents, planning de travail, demandes de congé, incidents disciplinaires, avantages et bulletins de paie — avec un accès strictement limité à sa propre compagnie.",
    features: [
      "Dossiers employés et documents confidentiels chiffrés",
      "Plannings de travail et affectations",
      "Congés, incidents et formations",
      "Avantages et bulletins de paie",
      "Accès strictement restreint aux documents sensibles",
    ],
  },
  {
    slug: "notifications",
    icon: "bell",
    name: "Notifications",
    summary: "Email, SMS et notifications in-app en temps réel.",
    description:
      "Prévient automatiquement à chaque étape clé — confirmation de réservation, paiement, émission de billet, changement de statut d'un colis — par email, SMS ou notification in-app, avec une boîte de réception personnelle.",
    features: [
      "Email, SMS et notifications in-app",
      "Déclenchement automatique à chaque étape clé",
      "Boîte de réception personnelle avec compteur de non-lues",
      "Déduplication contre les envois multiples",
      "Canal de notification unifié pour tous les domaines",
    ],
  },
  {
    slug: "clients-fidelite",
    icon: "heart",
    name: "Clients & fidélité",
    summary: "Profils clients, programme de fidélité, parrainage et avis.",
    description:
      "Donne à chaque passager un profil client, un programme de fidélité par compagnie, un système de parrainage entre clients et la possibilité de laisser un avis privé auquel la compagnie peut répondre.",
    features: [
      "Profils clients en libre-service",
      "Programme de fidélité par compagnie, points automatiques",
      "Parrainage entre clients",
      "Avis privés avec réponse de la compagnie",
      "Campagnes marketing segmentées",
    ],
  },
  {
    slug: "conformite-supervision",
    icon: "activity",
    name: "Conformité & supervision",
    summary:
      "Journal d'audit en ajout seul, consentement RGPD et santé de la plateforme.",
    description:
      "Trace les actions sensibles dans un journal d'audit en ajout seul, gère le consentement RGPD des utilisateurs, suit les droits des personnes concernées, et supervise en continu la disponibilité des services de la plateforme.",
    features: [
      "Journal d'audit en ajout seul (qui, quoi, quand, avant/après)",
      "Consentement explicite et droits des personnes (RGPD)",
      "Traçabilité des accès aux données personnelles",
      "Supervision de la santé des services",
      "Suivi des incidents de plateforme",
    ],
  },
];
