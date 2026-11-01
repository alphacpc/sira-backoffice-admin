export const underTheHood = {
  principles: [
    { title: "Une base de données par service", text: "Aucune base partagée entre deux services; les références entre services passent par des identifiants." },
    { title: "Événements pour les données partagées", text: "Un service garde une copie légère des données dont il a besoin, mise à jour par événement." },
    { title: "Backend d'abord", text: "Chaque service expose une API stable avant tout écran; ce contrat guide les clients web." },
  ],
  services: [
    { name: "Identité", role: "Comptes, jetons, rôles et permissions" },
    { name: "Compagnies", role: "Compagnies, vérification, plans et facturation" },
    { name: "Flotte", role: "Gares, lignes, bus, trajets et maintenance" },
    { name: "Réservations", role: "Réservations, paiement et billets" },
    { name: "Colis", role: "Colis, suivi et ré-acheminement" },
    { name: "Équipes", role: "Employés, congés, paie et documents" },
    { name: "Clients", role: "Profils, fidélité, avis et marketing" },
    { name: "Notifications", role: "Email, in-app et boîte de réception" },
    { name: "Conformité", role: "Consentements, demandes RGPD et journal d'audit" },
    { name: "Supervision", role: "Santé des services, incidents et analyse d'usage" },
  ],
  components: [
    { name: "Passerelle", role: "Porte d'entrée applicative : routage, limitation du débit, journal des appels" },
    { name: "Registre de services", role: "Découverte dynamique des services" },
    { name: "Serveur de configuration", role: "Configuration externalisée de chaque service" },
    { name: "Bus d'événements", role: "Échanges entre services par événements" },
    { name: "Stockage d'objets", role: "Documents et pièces jointes, accès par liens temporaires" },
    { name: "Cache", role: "Compteurs de limitation du débit" },
  ],
  stack: ["Java et Spring Boot", "Apache Kafka", "PostgreSQL et TimescaleDB", "Redis", "MinIO", "OpenTelemetry"],
};
