# Sira Backoffice (admin)

Console d'administration de la plateforme Sira, destinée à l'équipe plateforme.
Lot 1 : socle, Vue 360, Compagnies. Lot 2 : offre (plans, fonctionnalités, paliers partenaires, types de documents KYC) et facturation SaaS (abonnements, paiements, factures, impayés). Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Lot 4 : flotte (bus, flottes, gares, lignes, trajets, plans de sièges, maintenance, fournisseurs) en lecture seule, plus la mise hors service d'un bus. Données statiques typées, aucun appel réseau.

## Lancer

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Connexion de démonstration : `admin@sira.app` / `sira-demo`, puis le code `123456`.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | serveur de développement |
| `pnpm build && pnpm start` | build et serveur de production (exige `BACKOFFICE_SESSION_SECRET`, 32 caractères au moins) |
| `pnpm typecheck` | vérification TypeScript |
| `pnpm test` | tests unitaires (Vitest) |
| `pnpm e2e` | parcours de bout en bout (Playwright, serveur `pnpm dev` sur le port 3100 ; `pnpm exec playwright install chromium` une fois) |

## Architecture

- `src/lib/repos` : dépôts adossés à un store en mémoire initialisé par `src/lib/data/seed.ts`. Le branchement aux API remplacera cette seule couche.
- `src/app/(admin)` : pages (Server Components) ; mutations via Server Actions qui vérifient la session et renvoient un résultat (`ok` ou erreur) affiché dans l'interface.
- `src/lib/actions/run.ts` : point d'entrée commun des Server Actions (session vérifiée avant toute lecture ou écriture, résultat `ok`/erreur, motif ≤ 500 caractères). Les actions vivent dans `compagnies/actions.ts`, `facturation/actions.ts`, `offre/actions.ts`, `utilisateurs/actions.ts`, `acces/actions.ts` et `flotte/actions.ts` ; `runReveal` est la variante qui renvoie une donnée personnelle après journalisation.
- `src/lib/repos/billing.ts` : plans, fonctionnalités, paliers, registre des types KYC (source de l'activation automatique), abonnements, factures, paiements et file des impayés. Les composants clients ne reçoivent que des projections (`PlanRow`, `SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `UnpaidRow`).
- `src/lib/repos/access.ts` : comptes de la plateforme, rôles, permissions et sessions (une session est active si elle n'est ni révoquée ni expirée à la date de référence injectée). Changer un rôle révoque toutes les sessions actives du compte ; un compte ne change pas son propre rôle et le dernier administrateur actif ne peut pas être rétrogradé. Les composants clients ne reçoivent que `UserRow` (sans e-mail ni téléphone), `SessionRow` (adresse IP tronquée `a.b.c.0`) et des scalaires.
- `src/lib/repos/fleet.ts` : gares, lignes, flottes, fournisseurs, bus, équipage, trajets, plans de sièges et maintenances. Les échéances (assurance, contrôle technique, carte grise) sont calculées contre la date de référence injectée (« expirée » avant, « bientôt » dans les 30 jours). La mise hors service d'un bus exige un motif et est refusée si le bus l'est déjà, si une maintenance est en cours ou s'il a un trajet planifié ou en embarquement. Les composants clients ne reçoivent que des projections (`BusRow`, `TripRow`, `SeatMapRow`, `MaintenanceRow`, `VendorRow`, `FleetRow`, `StationRow`, `RouteRow`) ou des scalaires ; l'équipage n'y figure que par son nom.
- `src/lib/auth` : jeton HMAC dans un cookie `HttpOnly` `SameSite=Strict` ; `src/middleware.ts` protège toutes les routes sauf l'accès. Le TOTP est limité à 5 essais : au cinquième échec, la session de connexion est supprimée (« Trop de tentatives, reconnecte-toi »).
- Données personnelles : l'e-mail et le téléphone de contact d'une compagnie ou d'un compte ne sont jamais présents dans le HTML de la page, seulement leur forme masquée ; les adresses IP des sessions sont tronquées. La valeur réelle n'est renvoyée que par une Server Action de révélation (session vérifiée, révélation journalisée sans la valeur).
- `docs/sitemap.md` : sitemap complet ; `docs/superpowers/` : spec et plan.

## Lot 5 : ventes et paiements des voyageurs

Huit écrans : réservations (filtres canal, paiement, statut ; détail avec chronologie et billets), paiements voyageurs (avec les incohérences détectées : paiement bloqué, montant différent, billet manquant), billets (détail avec scans), moyens de paiement et tableau de bord du libre-service en ligne (indicateurs et réservations proches de l'expiration). Une seule action : « Annuler la réservation » (motif obligatoire).

## Lot 6 : colis et clients

Sept écrans : colis (filtres de statut, détail avec itinéraire et historique), comptes clients (détail avec fidélité, parrainage et avis), programmes de fidélité et avis clients (filtres de statut, détail). Deux actions : « Déclarer le colis perdu » (motif obligatoire, colis en transit ou au hub uniquement) et « Ignorer l'avis » (motif obligatoire, avis en attente ou examiné). Le téléphone d'un destinataire est masqué ; sa révélation est une Server Action journalisée (sans la valeur).

## Lot 7 : communication

Sept écrans : notifications (filtres de canal et de statut, indicateurs de livraison, détail), campagnes (détail avec segments, messages et programmations), segments (ciblage lisible et comptes éligibles), messages et programmations. Deux actions : « Annuler la campagne » (motif obligatoire, annule en cascade ses programmations en attente) et « Annuler la programmation » (motif obligatoire, programmation en attente uniquement). Le contenu d'une notification n'est jamais dans la page : il n'est renvoyé que par une Server Action de révélation, journalisée sans la valeur.

## Lot 8 : conformité et audit

Huit écrans : journal d'audit (filtres d'action et de compagnie, détail avec tableau avant / après, adresses IP tronquées), accès aux données (filtres de type et de catégorie), demandes RGPD (indicateurs de délai légal, détail), consentements (états courants par type et par compagnie, historique d'un utilisateur), rétention (durée par compagnie et lignes non anonymisées), ainsi que les deux détails (ligne d'audit, demande). Trois actions : traiter une demande (prendre en charge, clôturer ou rejeter, avec notes de résolution obligatoires pour clôturer ou rejeter), modifier la durée de rétention d'une compagnie (90 à 3650 jours, motif obligatoire) et consulter les consentements d'un utilisateur avec un motif d'accès déclaré. Chaque action laisse une trace dans le journal d'audit et le journal d'accès.

## Lot 9 : supervision

Six écrans : santé des services (indicateurs, disponibilité sur 24 h, historique des contrôles en graphique, service obsolète), incidents (filtres de statut et de gravité, recherche) et leur détail, trafic API (indicateurs, graphique quotidien, endpoints, période au choix) et usage produit (événements dérivés, graphique quotidien). Trois actions d'incident : déclarer un incident, changer son statut (en avant seulement) et renseigner ou modifier le postmortem (seule modification possible après résolution). La santé, le trafic et l'usage sont en lecture seule.

## Lot 10 : paramètres du backoffice

Trois écrans : mon profil (compte, état du TOTP, session courante et sessions de l'administrateur), équipe admin (liste filtrable par statut) et journal du backoffice (filtres d'acteur, de période et de révélations de données). Neuf actions : modifier son nom, régénérer ses codes de récupération (affichés une seule fois), révoquer une de ses sessions ou toutes les autres, inviter un administrateur, le suspendre, le réactiver, réinitialiser son TOTP et révoquer ses sessions (motif obligatoire pour les quatre dernières). Le journal est filtrable et retrace les actions du backoffice.

## Lot 11 : recherche globale

Page `/recherche` et palette ⌘K enrichie : recherche d'un nom, d'un code ou d'un identifiant sur 11 types d'enregistrements (compagnies, utilisateurs, réservations, billets, colis, etc.), groupés par type, avec filtre par type. La maquette n'a désormais plus aucune page « bientôt disponible ».

## Limites connues (lots 1 à 11)

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Offre en lecture seule : ni création ni modification de plans, fonctionnalités ou paliers.
- Facturation simulée : la relance de paiement a un résultat déterministe fixé par la graine (Saint-Louis Route échoue, les autres réussissent) ; pas de PDF de facture, pas de proration ni de remboursement.
- Aucune transition automatique dans le temps : la file des impayés affiche un délai dépassé, mais rien ne suspend ni n'expire un abonnement tout seul.
- Désactiver un type de document KYC n'active aucune compagnie rétroactivement : l'activation se déclenche à l'approbation d'un document.
- Accès : ni création, ni suppression, ni suspension de compte, ni réinitialisation de mot de passe ; la matrice des permissions est en lecture seule. L'administrateur connecté au backoffice n'est pas un compte de la plateforme (rôle « administrateur plateforme » distinct, prérequis backend) : la règle « on ne change pas son propre rôle » est appliquée mais ne se déclenche que si l'identité de la session correspond à l'e-mail ou à l'identifiant d'un compte.
- Flotte en lecture seule hors « Mettre hors service » : pas de remise en service d'un bus hors service, affectations d'équipage non modifiables, aucune création ni modification de flotte, bus, ligne, gare ou trajet, ni démarrage, clôture ou annulation de maintenance.
- L'équipage est un registre du backoffice sans compte, sans e-mail ni téléphone (côté plateforme, les affectations pointent des employés de `hr-service`) ; il n'existe pas de fiche employé vers laquelle le lier.
- Les états des sièges sont figés par la graine (pas de réservation en direct) ; aucune alerte d'échéance automatique, pas de GPS ni de suivi en temps réel.
- Ventes : pas de remboursement ni de reprise d'un paiement bloqué (le backend n'en a pas : une transaction `PENDING` reste bloquée jusqu'à intervention en base) ; une réservation payée n'est pas annulable ; l'expiration des réservations en ligne est affichée mais jamais exécutée ; moyens de paiement, billets et scans en lecture seule ; le passager n'a pas de fiche (nom seulement, avec un lien vers le compte pour une réservation en ligne) ; pas de versement aux compagnies ; les incohérences sont calculées à la lecture avec l'horloge du serveur.
- Colis et clients : pas de création ni de modification de colis (le backoffice ne remplace pas le guichet) ; une perte déclarée n'est pas annulable et ne déclenche aucun remboursement ; documents de colis non affichés ; adresse du destinataire absente ; paliers de fidélité affichés tels quels, jamais recalculés ; pas de dépense de points ; un avis ignoré n'est pas restaurable et la plateforme ne répond pas aux avis ; les points sont dérivés des réservations en ligne payées de la graine.
- Communication : pas de création ni d'édition de campagnes, segments, messages ou programmations ; une annulation n'est pas réversible ; aucune relance d'une notification échouée (le backend n'en a pas) ; seul le canal « dans l'application » est réellement envoyé côté backend ; l'expiration d'une réservation n'envoie aucune notification ; le ciblage n'évalue que le palier de fidélité ; la taille estimée d'un segment est saisie par la compagnie et peut différer des éligibles réels ; une campagne « terminée » n'est produite par aucun chemin du backend actuel (valeur semée pour couvrir le statut).
- Conformité : journaux en lecture seule et sans export ; les lectures de pages n'écrivent pas dans le journal d'accès (seules les actions le font), alors que le backend écrit une ligne à chaque lecture d'une demande ; les révélations de données personnelles des lots 3, 6 et 7 sont dans l'activité du backoffice, pas dans le journal d'accès ; le job d'anonymisation n'est pas simulé (les compteurs « non anonymisées » se calculent à la lecture) ; on ne peut pas revenir à la durée de rétention par défaut ; les notes de clôture sont obligatoires (plus strict que le backend) ; aucune alerte de retard n'est émise ; l'acteur des lignes écrites par le backoffice est un libellé, pas un compte de la plateforme ; la consultation de consentements est limitée aux utilisateurs qui en ont.
- Supervision : contrôles de santé échantillonnés toutes les 30 minutes (le backend sonde toutes les 30 secondes) ; taux d'erreur de service jamais calculé ; aucun moyen de relancer un sondage ; un service en panne n'ouvre pas d'incident automatiquement ; un incident ne garde pas l'historique de ses statuts et sa gravité ou sa portée ne sont pas modifiables ; obsolescence mesurée contre le dernier sondage de la plateforme, pas contre l'horloge de l'écran ; trafic API semé sur 30 jours (le backend en garde 90) et usage produit dérivé des données présentes ; aucune limitation de débit ; l'auteur d'un incident est un libellé, pas un compte de la plateforme.
- Paramètres : équipe propre à la maquette (le backend n'a ni rôle « administrateur plateforme » ni TOTP dédiés) ; l'authentification reste celle de démonstration (suspendre, inviter ou réinitialiser le TOTP n'a aucun effet sur la connexion réelle) ; pas de changement de mot de passe ni d'enrôlement TOTP réel ; la session courante est une session semée ; pas d'annulation d'invitation ni de suppression d'administrateur ; connexions et déconnexions non journalisées ; journal borné à 500 entrées, sans export ; un seul niveau de rôle d'administrateur ; codes de récupération non stockés (affichés une fois).
- Recherche : pas de recherche par e-mail ni téléphone (volontaire : une telle requête est refusée et jamais réaffichée) ; pas de recherche dans les noms de passagers, d'expéditeurs, de destinataires ni dans le contenu des messages ; sous-chaîne simple sans tolérance aux fautes ; 25 résultats par type au plus ; pas d'historique ni de filtres sauvegardés ; la palette interroge le serveur à chaque pause de saisie.
- Navigation latérale masquée sous 768 px (outil de bureau).

> **Démonstration seulement : identifiants et TOTP simulés, ne jamais déployer ce lot tel quel.**
