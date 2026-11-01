export interface TechService {
  name: string;
  responsibility: string;
}

export const technicalServices: TechService[] = [
  { name: "identity-service", responsibility: "Authentification, jetons et RBAC" },
  {
    name: "company-service",
    responsibility: "Compagnies, KYC, plans et facturation SaaS",
  },
  { name: "fleet-service", responsibility: "Gares, lignes, bus et trajets" },
  {
    name: "booking-service",
    responsibility: "Réservations, paiement et billetterie",
  },
  { name: "parcel-service", responsibility: "Colis, suivi et ré-acheminement" },
  { name: "hr-service", responsibility: "Employés, RH et paie" },
  { name: "customer-service", responsibility: "Clients, fidélité et marketing" },
  {
    name: "notification-service",
    responsibility: "Email, SMS et notifications in-app",
  },
  {
    name: "audit-compliance-service & monitoring-service",
    responsibility: "Journal d'audit en ajout seul, RGPD et supervision plateforme",
  },
];

export interface PlatformComponent {
  name: string;
  role: string;
}

export const platformComponents: PlatformComponent[] = [
  {
    name: "Nginx",
    role: "Point d'entrée réseau : résolution des sous-domaines et terminaison TLS",
  },
  {
    name: "Gateway",
    role: "Porte d'entrée applicative : résolution du tenant, authentification, routage",
  },
  {
    name: "Eureka",
    role: "Registre de services pour une découverte dynamique",
  },
  {
    name: "Config Server",
    role: "Configuration externalisée de chaque service",
  },
  {
    name: "Kafka",
    role: "Bus d'événements entre services (pattern outbox transactionnel)",
  },
  {
    name: "MinIO",
    role: "Stockage objet S3-compatible, URLs pré-signées",
  },
  {
    name: "Redis",
    role: "Cache et sessions, avec un espace dédié par service",
  },
];

export interface StackItem {
  category: string;
  items: string[];
}

export const stack: StackItem[] = [
  { category: "Backend", items: ["Spring Boot", "Java 17"] },
  { category: "Messagerie événementielle", items: ["Apache Kafka"] },
  {
    category: "Données",
    items: ["PostgreSQL (par service)", "TimescaleDB (séries temporelles)", "Redis"],
  },
  { category: "Stockage objet", items: ["MinIO"] },
  { category: "Déploiement cible", items: ["Kubernetes"] },
  { category: "Observabilité", items: ["OpenTelemetry", "Prometheus", "Grafana"] },
];

export interface Principle {
  title: string;
  description: string;
}

export const principles: Principle[] = [
  {
    title: "Une base de données par service",
    description:
      "Chaque microservice possède sa propre base — aucune base partagée entre deux services applicatifs, aucune contrainte de clé étrangère SQL entre services.",
  },
  {
    title: "Isolation par compagnie",
    description:
      "Chaque compagnie accède à la plateforme via son propre sous-domaine, résolu au niveau de la passerelle d'entrée. Chaque service filtre ses données par compagnie : aucun accès inter-compagnie n'est possible par construction.",
  },
  {
    title: "Événements pour la donnée partagée",
    description:
      "Quand un service a besoin d'un aperçu de données d'un autre service, il maintient une copie locale légère mise à jour par événement, plutôt qu'un appel bloquant à chaque requête.",
  },
  {
    title: "Backend-first",
    description:
      "Chaque service expose une API stable et documentée (OpenAPI) avant le moindre écran. C'est ce contrat qui guide les clients web et mobiles, pas une maquette.",
  },
  {
    title: "Sécurité par conception",
    description:
      "Authentification par jeton et permissions fines par rôle, isolation tenant vérifiée service par service, et un durcissement continu de la gestion des secrets.",
  },
  {
    title: "Traçabilité RGPD",
    description:
      "Les actions sensibles sont journalisées dans un journal d'audit en ajout seul, avec gestion du consentement et des droits des personnes concernées.",
  },
];
