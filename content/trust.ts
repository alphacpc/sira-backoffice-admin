export interface TrustSection {
  icon: string;
  title: string;
  description: string;
  points: string[];
}

export const trustSections: TrustSection[] = [
  {
    icon: "lock",
    title: "Isolation entre compagnies",
    description:
      "Chaque compagnie est séparée des autres par construction, pas seulement par convention.",
    points: [
      "Dans les services métier, les accès d'un utilisateur rattaché à une compagnie sont limités à cette compagnie",
      "Une ressource d'une autre compagnie répond comme une ressource inexistante",
      "Les références entre compagnies (ligne, bus, gare) sont refusées",
      "Chaque service a sa propre base de données",
    ],
  },
  {
    icon: "key",
    title: "Accès et rôles",
    description: "Chaque personne n'a que les droits de son rôle.",
    points: [
      "Jeton d'accès de courte durée et jeton de rafraîchissement révocable",
      "Rôles et permissions fins, vérifiés par chaque service",
      "Un changement de rôle ou une suspension révoque les sessions de rafraîchissement de la personne",
      "Les documents confidentiels des employés demandent une permission dédiée et sont chiffrés",
    ],
  },
  {
    icon: "scroll",
    title: "Journal d'audit",
    description:
      "Une trace des actions sensibles, protégée contre la modification et la suppression par le compte applicatif.",
    points: [
      "Création de compte, connexion, changement de rôle, réservation, paiement, maintenance, embauche, dépôt de documents confidentiels…",
      "Écriture en ajout seul : le compte applicatif de la base ne peut ni modifier ni supprimer une ligne",
      "Une action dont la trace ne peut pas être écrite est annulée",
      "Les consultations de données personnelles par l'équipe de conformité sont aussi tracées",
    ],
  },
  {
    icon: "file-check",
    title: "RGPD et données personnelles",
    description: "Les droits des personnes sont suivis, pas seulement affichés.",
    points: [
      "Consentements marketing enregistrés par compagnie, avec historique",
      "Demandes d'accès ou d'effacement suivies avec un délai de 30 jours",
      "Adresses IP et agents de navigation anonymisés après une durée de conservation propre à chaque compagnie",
      "Journaux techniques conçus pour ne pas contenir de données personnelles",
    ],
  },
  {
    icon: "server",
    title: "Robustesse et exploitation",
    description: "Une plateforme qui se surveille elle-même.",
    points: [
      "Comptes de base de données séparés pour les migrations et pour l'exécution, avec un mot de passe distinct par base",
      "Limitation du débit sur les routes publiques sensibles",
      "Écriture en base et publication d'événement toujours cohérentes (outbox transactionnel)",
      "Supervision de la santé des services et suivi des incidents",
    ],
  },
];
