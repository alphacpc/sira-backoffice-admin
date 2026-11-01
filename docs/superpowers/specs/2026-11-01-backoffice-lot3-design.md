# Backoffice Sira, lot 3 : utilisateurs et accès

Date : 2026-11-01. Statut : rédigé pour relecture (l'utilisateur a demandé d'enchaîner jusqu'au plan puis de s'arrêter). Référence : `docs/sitemap.md` (section 4), spec et plan des lots 1 et 2 (même socle, mêmes décisions).

## Décisions héritées des lots 1 et 2

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components lisant des dépôts (`src/lib/repos`) ; mutations = Server Actions qui passent par le `run()` partagé de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Actions sensibles : confirmation et motif obligatoire, rogné, **500 caractères au plus** (refus au-delà), tracées dans l'activité.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts ; le test E2E `@prod` (build de production, port 3101) vérifie l'absence d'e-mails, téléphones et adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute utilise des entités qu'aucun autre ne mute.

## Périmètre

Cinq écrans, aujourd'hui en « Bientôt disponible » dans la navigation (section « Utilisateurs et accès »).

- `/utilisateurs` : liste de tous les comptes de la plateforme (nom d'utilisateur, nom affiché, rôle, statut, compagnie liée si elle existe, dernière connexion, nombre de sessions actives), filtrable par rôle et par statut (`active`, `suspended`) ; recherche côté client sur le nom affiché et le nom d'utilisateur.
- `/utilisateurs/[id]` : fiche avec onglets Profil (e-mail et téléphone **masqués**, bouton « révéler » journalisé via une action qui renvoie la valeur à la demande, comme `revealContact` du lot 1), Rôle et permissions (rôle courant, permissions héritées), Sessions (sessions de l'utilisateur), Activité (journal filtré sur l'utilisateur) ; actions « Changer le rôle » et « Révoquer toutes les sessions », chacune avec motif obligatoire.
- `/acces/roles` : liste des rôles avec leur nombre d'utilisateurs et de permissions ; détail repliable des permissions de chaque rôle ; lecture seule.
- `/acces/permissions` : matrice permissions × rôles (case cochée si le rôle porte la permission), regroupée par domaine (compagnies, flotte, réservations, colis, RH, clients, marketing, notifications, conformité, supervision, plateforme) ; lecture seule.
- `/acces/sessions` : sessions actives de toute la plateforme (utilisateur, appareil, adresse IP **tronquée** `a.b.c.0`, début, dernière activité, expiration), filtrables ; action « Révoquer » par session, avec motif obligatoire.

## Modèle de données (types alignés sur `identity-service`)

Nouveaux types : `PlatformUser` (`id`, `username`, `displayName`, `email`, `phone`, `roleCode`, `status: "active" | "suspended"`, `companyId: string | null`, `lastLoginAt: string | null`, `createdAt`), `Role` (`code`, `name`, `description`), `PermissionDef` (`code`, `domain`, `description`), `RolePermission` (`roleCode`, `permissionCode`), `UserSession` (`id`, `userId`, `deviceLabel`, `ipAddress`, `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt: string | null`, `revokedReason: string | null`).

Rôles de la graine (alignés sur la plateforme) : `ADMIN` (toutes les permissions de plateforme), `MANAGER` (responsable de compagnie : 11 permissions de domaine, jamais `RBAC_MANAGE`, `COMPANY_KYC_REVIEW`, `COMPLIANCE_*`, `MONITORING_*`), `GUICHETIER` (`BOOKING_MANAGE`, `FLEET_MANAGE`, `USER_MANAGE`), `CHAUFFEUR` (aucune), `USER` (aucune). Permissions : au moins les 20 codes réels de la plateforme (`RBAC_MANAGE`, `USER_MANAGE`, `COMPANY_MANAGE`, `COMPANY_KYC_SUBMIT`, `COMPANY_KYC_REVIEW`, `COMPANY_PARTNERSHIP_MANAGE`, `FLEET_MANAGE`, `FLEET_MAINTENANCE_MANAGE`, `BOOKING_MANAGE`, `PARCEL_MANAGE`, `EMPLOYEE_MANAGE`, `EMPLOYEE_CONFIDENTIAL_ACCESS`, `CUSTOMER_MANAGE`, `MARKETING_MANAGE`, `NOTIFICATION_MANAGE`, `COMPLIANCE_READ`, `COMPLIANCE_MANAGE`, `MONITORING_READ`, `MONITORING_MANAGE`, `ANALYTICS_READ` ou équivalent déjà utilisé dans le code), chacune rattachée à un domaine.

Graine : environ 40 utilisateurs cohérents avec les employés et compagnies existants (un compte par employé du lot 1, plus quelques comptes clients `USER` et 2 administrateurs de plateforme), dont 2 suspendus ; 1 à 3 sessions par utilisateur actif, dont quelques-unes révoquées ; e-mails et téléphones alignés sur les mêmes formats que `Employee` (mais sans jamais être envoyés au client).

## Règles métier (alignées sur le backend)

- **Changer le rôle** : réservé aux administrateurs de plateforme ; le rôle cible doit exister ; refusé si identique ; **un administrateur ne peut pas changer son propre rôle** ; **le dernier compte `ADMIN` actif ne peut pas être rétrogradé** ; le motif est obligatoire ; un changement de rôle **révoque immédiatement toutes les sessions actives** de la cible (comme `PATCH /api/users/{id}/role` côté backend), avec le motif « Changement de rôle » ; une ligne d'activité plateforme est écrite (sans e-mail ni téléphone).
- **Révoquer toutes les sessions d'un utilisateur / une session** : refusé s'il n'y a rien à révoquer (aucune session active / session déjà révoquée ou expirée) ; motif obligatoire ; `revokedAt` et `revokedReason` renseignés ; la session de l'administrateur courant n'est pas modélisée (aucune session « courante » dans ce lot : l'action est donc toujours permise sur toute session de la graine).
- **Révéler un contact** : action `revealUserContact(userId, field)` calquée sur `revealContact` du lot 1 : session d'abord, journalisation (« Donnée personnelle révélée : e-mail/téléphone », sans la valeur), la valeur n'est renvoyée qu'en cas de succès.
- Une session expirée n'est jamais comptée comme active (la référence temporelle est injectée dans les dépôts, pas d'horloge cachée).

## Architecture

- `src/lib/repos/access.ts` : `usersRepo`, `rolesRepo`, `permissionsRepo`, `sessionsRepo` (listes en projections ; mutations avec règles ci-dessus). Les actions vivent dans `src/app/(admin)/utilisateurs/actions.ts` et `src/app/(admin)/acces/actions.ts` via `run()`.
- Projections client : `UserRow` (sans e-mail ni téléphone), `SessionRow` (IP tronquée), `RoleRow`, `PermissionMatrix` (données de matrice sans PII). La fiche utilisateur reçoit côté client uniquement des chaînes masquées et des scalaires.
- Navigation : les 4 entrées de la section (Utilisateurs, Rôles, Permissions, Sessions) passent à `implemented: true` ; `nav.test.ts` mis à jour ; les liens depuis la fiche compagnie (onglet Équipe) vers `/utilisateurs/[id]` lorsqu'un compte existe pour l'employé (lecture seule).
- Vue 360 : aucune modification.

## Tests

- Vitest : dépôts (filtres, projections avec `Object.keys`, comptes actifs/sessions actives avec horloge injectée), règles de changement de rôle (auto-modification refusée, dernier administrateur protégé, révocation en cascade, rôle inconnu, identique), révocation de sessions (rien à révoquer, motif), IP tronquée, actions (session d'abord, `ActionResult`, motif ≤ 500, aucune écriture sans session), cohérence de la graine (chaque session a un utilisateur, chaque utilisateur un rôle existant, la matrice reflète bien les permissions de chaque rôle, aucun e-mail/téléphone n'apparaît dans les journaux d'activité).
- Playwright : changer le rôle d'un utilisateur avec motif obligatoire puis constater la révocation des sessions ; révoquer une session depuis `/acces/sessions` ; tentative de rétrograder le dernier administrateur refusée avec un message ; la matrice des permissions affiche les bonnes cases pour `MANAGER` ; révélation d'un contact depuis la fiche utilisateur ; test `@prod` étendu aux 5 écrans (aucune adresse e-mail, aucun téléphone, aucune IP complète).

## Hors périmètre

Création et suppression de comptes, modification des permissions d'un rôle (la matrice est en lecture seule), suspension et réactivation d'un compte, réinitialisation de mot de passe, authentification à deux facteurs de l'équipe admin (lot « Paramètres »), rôle « administrateur plateforme » distinct (prérequis backend du sitemap), branchement aux API.
