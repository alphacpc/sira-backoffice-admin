# 03 — Utilisateurs et accès

## Vue d'ensemble

Rubrique « Utilisateurs et accès » du backoffice Sira (outil plateforme, **vue sur toutes les compagnies, aucun tenant**). Un hub unique `/utilisateurs-acces` porte 4 onglets en lecture : utilisateurs, rôles, permissions (matrice rôle × permission), sessions actives. Une fiche `/utilisateurs/[id]` (4 onglets : Profil, Rôle et permissions, Sessions, Activité) porte les 3 actions d'écriture : changer le rôle, révoquer toutes les sessions d'un compte, révéler e-mail/téléphone (action journalisée). La révocation d'une session isolée se fait depuis l'onglet Sessions. Backend de référence : `identity-service` (User, UserSession, Role, Permission, RolePermission, UserCompanyLink) + `audit-compliance-service` (journal). **Constat global : `identity-service` n'expose aujourd'hui aucune vue plateforme** (pas de liste d'utilisateurs, pas de liste de sessions, pas de matrice, pas de révocation unitaire, pas de motif) ; seuls `GET /api/roles`, `GET /api/permissions`, `GET /api/users/{id}` et `PATCH /api/users/{id}/role` existent, tous partiels.

Routes : `/utilisateurs` → redirige vers `/utilisateurs-acces` ; `/acces/roles|permissions|sessions` → redirigent vers `/utilisateurs-acces/{roles|permissions|sessions}` ; `/utilisateurs-acces/[tab]` accepte `roles|permissions|sessions` (`utilisateurs` redirige vers la racine, autre → 404).

Sources lues : `src/app/(admin)/utilisateurs-acces/{hub-page,page,[tab]/page}.tsx`, `src/app/(admin)/utilisateurs/{actions.ts,[id]/page.tsx}`, `src/app/(admin)/acces/actions.ts`, `src/lib/repos/{access,access-hub}.ts`, `src/components/access/**`, `src/lib/types/index.ts`, `src/lib/labels.ts`, `src/lib/mask.ts`, `src/lib/actions/run.ts`, `src/lib/data/seed.ts`. Backend vérifié : `identity-service/src/main/java/com/sira/identity/{controller,service/impl,entity,dto,security}`, `audit-compliance-service/.../controller/AuditLogController.java`.

Conventions du backoffice à respecter : e-mail et téléphone **ne quittent jamais le serveur Next.js** sans révélation journalisée (masquage `maskEmail` → `m•••@domaine`, `maskPhone` → `+221•••••••78`) ; adresse IP des sessions **tronquée au /24** (`a.b.c.0`, `••••` si non IPv4) avant affichage ; tout motif est obligatoire, trimé, **500 caractères max** ; session expirée → « Session expirée, reconnecte-toi ».

Convention proposée pour les endpoints : préfixe `/admin/...` sur `identity-service` (route Gateway `/admin/**` à ajouter), authentifié par JWT staff Sira (aucun claim `companyId`, `RBAC_MANAGE`), même conjonction stricte que `TenantAccessGuard`.

---

## Hub — compteurs, recherche globale et bandeaux de statistiques — `/utilisateurs-acces`

- **Fonctionnalités** :
  - Titre « Utilisateurs et accès », description variable selon l'onglet. Onglets-liens (LinkTabs) : Utilisateurs (racine), Rôles, Permissions, Sessions, chacun avec un **compteur** qui dépend de la recherche `q`.
  - Recherche globale `q` (GET, `trim`, 80 caractères max), insensible à la casse et aux accents (NFD), appliquée aux 4 onglets à la fois. Quand `q` est présent : phrase « Résultats pour « q » : N dans toute la rubrique », lien « Effacer », et si l'onglet courant est vide, suggestion « Mais ça correspond dans : <autres onglets avec compteur> ». Les bandeaux de stats sont masqués quand `q` est présent.
  - Filtres conservés d'un onglet à l'autre via l'URL : `role`, `statut`, `domaine` (valeur inconnue → ignorée = « Tous »).
  - Bandeau de 4 stats (hors recherche) sur Utilisateurs et Sessions (détail dans les sections suivantes).
- **Modèle de données attendu** (résumé global, à calculer par l'API) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| counts.utilisateurs | int | non | nombre de comptes correspondant à `q` (hors filtres rôle/statut) | calculé API |
| counts.roles | int | non | rôles dont nom/code/description/code de permission correspond à `q` | calculé API |
| counts.permissions | int | non | permissions dont code/description/libellé de domaine correspond à `q` | calculé API |
| counts.sessions | int | non | sessions **actives** dont nom/identifiant/appareil/IP (tronquée) correspond à `q` | calculé API |
| stats.users.total / active / suspended | int | non | tous comptes, `status=active`, `status=suspended` (hors `q` et hors filtres) | calculé API |
| stats.users.activeSessions | int | non | somme des sessions actives de tous les comptes | calculé API |
| stats.sessions.active | int | non | nombre de sessions actives | calculé API |
| stats.sessions.connectedUsers | int | non | utilisateurs distincts ayant ≥1 session active | calculé API |
| stats.sessions.mobile | int | non | sessions dont `deviceLabel` correspond à `/iphone|android/i` | calculé API (idéalement via `deviceType=mobile`) |
| stats.sessions.latest | `{displayName, lastSeenAt}` | oui | session active la plus récemment vue | calculé API |

- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/access/summary` | `q?` (≤80 car.) | — | `{counts:{utilisateurs,roles,permissions,sessions}, users:{total,active,suspended,activeSessions}, sessions:{active,connectedUsers,mobile,latest}}` | `USER_MANAGE` + appelant plateforme |

- **Règles métier** : recherche accent/casse-insensible côté serveur ; compteur permissions = nombre de lignes (pas de groupes) ; les compteurs ignorent les filtres `role`/`statut`/`domaine`.
- **État côté API** : `GET /admin/access/summary` ❌ manquant — service `identity-service` (les 4 compteurs de rôles/permissions/utilisateurs/sessions y vivent). Alternative : le backoffice recompose les compteurs à partir des 4 listes ci-dessous si elles acceptent `q` et renvoient `totalElements` (page de taille 1).

---

## Liste des utilisateurs — `/utilisateurs-acces` (onglet Utilisateurs)

- **Fonctionnalités** :
  - Bandeau de 4 stats : « Comptes », « Comptes actifs », « Suspendus », « Sessions actives » (voir Hub).
  - Filtres : **Rôle** (Tous + un par rôle, valeur = code, libellé = nom), **Statut** (Tous / Actifs=`active` / Suspendus=`suspended`) ; recherche globale `q` sur nom affiché, identifiant, nom de rôle, code de rôle, nom de compagnie, libellé de statut (« actif » / « suspendu »).
  - Tableau (DataTable, **tri/pagination côté client**, 15 lignes/page, tailles de page sélectionnables) : colonnes Utilisateur (avatar initiales + nom affiché + identifiant), Rôle (icône par code `ADMIN|MANAGER|GUICHETIER|CHAUFFEUR|USER` + nom), Statut (pastille Actif / Suspendu), Compagnie (nom, ou « Plateforme » si aucun lien), Dernière connexion (date-heure, ou « Jamais »), Sessions (nombre de sessions actives, pastille bleue si >0). Clic sur une ligne → `/utilisateurs/{id}`.
  - Tri par défaut : nom affiché (locale `fr`), puis identifiant. État vide : « Aucun utilisateur. » / « Aucun résultat dans « Utilisateurs » » avec suggestions d'autres onglets si `q`.
  - **Aucun e-mail ni téléphone dans la liste** (projection client sans contact).
  - Aucune action d'écriture depuis la liste (ni création, ni suspension).
- **Modèle de données attendu** (`UserRow`) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | `identity.users.id` |
| username | string | non | ≤50 | `users.username` |
| displayName | string | non | prénom + nom (repli : username) | `users.first_name`+`last_name`, à composer par l'API |
| roleCode | string | non | `ADMIN`,`MANAGER`,`GUICHETIER`,`CHAUFFEUR`,`USER` (extensible) | `roles.role_code` via `users.role_id` |
| roleName | string | non | « Administrateur », « Responsable de compagnie », « Agent de vente », « Chauffeur », « Utilisateur » | `roles.role_name` |
| status | enum | non | `active` \| `suspended` | `users.status` (chaîne en base, valeur `"active"` ; `suspended` non produit aujourd'hui) |
| companyId | uuid | oui | null = compte plateforme/client | `identity.user_company_links.company_id` |
| companyName | string | oui | | **donnée de `company-service`** (pas de FK) : l'API enrichit ou le backoffice résout par `companyId` |
| lastLoginAt | ISO-8601 | oui | null = « Jamais » | `users.last_login_at` |
| activeSessions | int | non | sessions non révoquées et non expirées | calculé API (`user_sessions.is_active` ∧ `expires_at > now`) |

- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/users` | `q?`, `roleCode?`, `status?` (`active`\|`suspended`), `companyId?`, `page`, `size`, `sort` (défaut `displayName,asc`) | — | page de `UserRow` (+ `totalElements`) | `USER_MANAGE` + appelant plateforme |

  Le backoffice trie et pagine aujourd'hui **côté client sur le jeu complet** : l'API doit fournir pagination + filtres + tri serveur (volume attendu : tous les comptes clients B2C).
- **Règles métier** : liste plateforme, pas de borne tenant ; exclure `deleted_at != null` ; n'expose jamais `email`, `phone`, `passwordHash`.
- **État côté API** : `GET /admin/users` ❌ manquant — `identity-service`. Preuve : `UserAdminController.java` n'expose que `GET /api/users/{id}`, `GET /api/users/{id}/exists`, `PATCH /api/users/{id}/role` ; aucun listing dans `UserRepository`/`UserService`. Le nom de compagnie nécessite un appel `company-service` (`GET /companies/{id}`) ou un cache local (event-carried state transfer depuis `CompanyCreated`, non existant aujourd'hui).

---

## Rôles — `/utilisateurs-acces/roles` (alias `/acces/roles`)

- **Fonctionnalités** :
  - Recherche globale `q` sur nom, code, description et codes de permission du rôle. **Pas de filtre propre.**
  - Grille de cartes (pas de pagination, jeu complet attendu : ~5 rôles) : nom, code, icône par code, description, nombre d'utilisateurs, nombre de permissions, **barre « Couverture des permissions » = round(permissions du rôle / total permissions × 100) %**, puces des 5 premiers domaines `Libellé · n` (+`n` restants), « Aucune permission » si vide.
  - Boutons : « Voir les permissions » (modale : permissions regroupées par domaine avec code + description, titre « Permissions · <nom> », désactivé si 0) ; « Voir les utilisateurs » → `/utilisateurs-acces?role=<code>`.
  - Lecture seule : aucune création/édition de rôle ni d'attribution de permission.
- **Modèle de données attendu** (`RoleRow`) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| code | string | non | `ADMIN`,`MANAGER`,`GUICHETIER`,`CHAUFFEUR`,`USER` | `roles.role_code` |
| name | string | non | libellé FR | `roles.role_name` |
| description | string | non | | `roles.description` |
| userCount | int | non | nombre de comptes ayant ce rôle | **calculé API** (`COUNT(users WHERE role_id)`) |
| permissions | liste de `{code, domain, description}` | non (peut être vide) | `domain` ∈ voir enum ci-dessous | jointure `role_permissions`→`permissions`, **tri par ordre de domaine** (`companies, fleet, bookings, parcels, hr, customers, marketing, notifications, compliance, monitoring, platform`) |
| id (utile à la mutation de rôle) | uuid | non | | `roles.id` — requis par `PATCH /api/users/{id}/role` (corps `roleId`) |

  Enum `PermissionDomain` et libellés : `companies` Compagnies, `fleet` Flotte, `bookings` Réservations, `parcels` Colis, `hr` Ressources humaines, `customers` Clients, `marketing` Marketing, `notifications` Notifications, `compliance` Conformité, `monitoring` Supervision, `platform` Plateforme.
- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/roles` | `q?` | — | liste (non paginée) de `RoleRow` (avec `id`, `userCount`, `permissions[]`) | `RBAC_MANAGE` |

- **Règles métier** : couverture calculée sur le total des permissions de la plateforme (le client reçoit `totalPermissions` ou le déduit de `/admin/permissions`). Le rôle `CHAUFFEUR` n'a aucune permission (« rôle métier réservé ») ; `EMPLOYEE_CONFIDENTIAL_ACCESS` n'est accordée à aucun rôle.
- **État côté API** : ⚠️ partiel — `GET /api/roles` (`identity-service/.../controller/RoleController.java`, permission `RBAC_MANAGE`) renvoie `RoleResponse{id, roleCode, roleName, description}` ; **manquent** `userCount`, `permissions[]` (aucun endpoint d'exposition de `role_permissions`), recherche `q`. Noms de champs différents (`roleCode/roleName` vs `code/name`) : mapping à faire côté backoffice.

---

## Permissions (matrice rôle × permission) — `/utilisateurs-acces/permissions` (alias `/acces/permissions`)

- **Fonctionnalités** :
  - Filtre **Domaine** (Tous + 11 domaines, valeur technique = clé d'enum) ; recherche globale `q` sur code, description et libellé de domaine.
  - Matrice : un bloc blanc par domaine non vide (titre « Libellé · n »), en-tête avec une colonne par rôle (nom + code), une ligne par permission (code mono + description), cellule ✓ « Accordée » / — « Non accordée » (`data-granted`). Pas de pagination (≈19 permissions × 5 rôles). Défilement horizontal.
  - Lecture seule : aucune modification d'accord.
  - État vide : « Aucun résultat dans « Permissions » ».
- **Modèle de données attendu** (`PermissionMatrix`) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| roles[] | `{code, name}` | non | dans l'ordre d'affichage des colonnes | `roles` |
| groups[].domain | enum `PermissionDomain` | non | voir enum ci-dessus | **mapping à définir** : le backend porte `permissions.module` (≤50) et `action` (≤20), pas un `domain` normalisé |
| groups[].rows[].code | string | non | ex. `COMPANY_MANAGE`, `RBAC_MANAGE`, `USER_MANAGE`, `FLEET_MAINTENANCE_MANAGE`, `EMPLOYEE_CONFIDENTIAL_ACCESS`, `COMPLIANCE_READ`… (19 au seed) | `permissions.permission_code` |
| groups[].rows[].description | string | non | | `permissions.description` |
| groups[].rows[].grantedTo[] | string[] | non | codes de rôles ayant la permission | `role_permissions` |

- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/permissions` | `q?`, `domain?` | — | liste `{code, name, description, domain, module, action}` | `RBAC_MANAGE` |
| GET | `/admin/role-permissions` (ou `GET /admin/permissions/matrix`) | `q?`, `domain?` | — | `PermissionMatrix` ci-dessus (ou liste de couples `{roleCode, permissionCode}` que le backoffice assemble) | `RBAC_MANAGE` |

- **Règles métier** : un seul rôle par utilisateur ; les domaines vides (après filtre/recherche) sont omis ; ordre des domaines fixe (liste ci-dessus).
- **État côté API** : `GET /admin/permissions` ⚠️ partiel — `GET /api/permissions` (`PermissionController.java`) renvoie `PermissionResponse{id, permissionCode, permissionName, module, action}` ; **manquent** `description` (présente en entité `Permission.description` mais absente du DTO) et un `domain` normalisé (à dériver de `module`, valeurs de `module` non vérifiées : à confirmer). `GET /admin/role-permissions` ❌ manquant — aucune exposition de `RolePermission` ; `identity-service`.

---

## Sessions actives — `/utilisateurs-acces/sessions` (alias `/acces/sessions`)

- **Fonctionnalités** :
  - Bandeau de 4 stats : « Sessions actives », « Utilisateurs connectés » (distincts), « Sur mobile » (appareil iPhone/Android), « Dernière activité » (heure de la session la plus récemment vue + nom de l'utilisateur en indice).
  - Filtre **Rôle** (Tous + rôles) ; recherche globale `q` sur nom, identifiant, appareil, IP tronquée.
  - Tableau (tri/pagination **client**, 15/page) des **seules sessions actives** (non révoquées ET non expirées), tri par défaut `lastSeenAt` décroissant : Utilisateur (lien `/utilisateurs/{userId}` + identifiant), Appareil (icône mobile/portable + libellé), Adresse IP (tronquée `a.b.c.0`), Début, Dernière activité, Expiration, bouton **Révoquer**.
  - Action « Révoquer » : dialogue de confirmation destructif « Révoquer la session <identifiant · appareil> », description « La session est fermée immédiatement : l'utilisateur devra se reconnecter sur cet appareil. », **motif obligatoire (≤500)**, bouton « Révoquer la session ». Après succès : rafraîchissement ; échec → message d'erreur du serveur.
  - État vide : « Aucune session active. ».
- **Modèle de données attendu** (`SessionRow`) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | `user_sessions.id` |
| userId | uuid | non | | `user_sessions.user_id` |
| username | string | non | | jointure `users` (« — » si compte inconnu) |
| displayName | string | non | | jointure `users` |
| deviceLabel | string | non | ex. « iPhone 15 · Safari », « MacBook · Chrome » | dérivé de `device_name`/`device_type`/`user_agent` (aujourd'hui **non renseignés** à la création de session : le constructeur `UserSession` ne fixe que userId, hash, expiration, IP, user-agent) |
| ip | string | non | IPv4 tronquée au /24 (`a.b.c.0`), sinon `••••` | **l'API ne doit renvoyer que l'IP tronquée** (ou le backoffice tronque côté serveur Next ; ne jamais l'exposer au navigateur) |
| createdAt | ISO-8601 | non | | `created_at` |
| lastSeenAt | ISO-8601 | non | | `last_activity_at` |
| expiresAt | ISO-8601 | non | | `expires_at` |
| state | enum | non | `active` \| `revoked` \| `expired` (liste = `active` seul) | calculé : `revokedAt != null` → revoked ; sinon `expiresAt > now` → active, sinon expired |
| revokedAt | ISO-8601 | oui | | `revoked_at` |
| revokedReason | string | oui | ex. « Changement de rôle », motif libre | `revoked_reason` (côté backend la valeur actuelle est le code `role_changed`) |

- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/sessions` | `state=active` (défaut), `q?`, `roleCode?`, `userId?`, `page`, `size`, `sort` (défaut `lastSeenAt,desc`) | — | page de `SessionRow` | `USER_MANAGE` + appelant plateforme |
| POST | `/admin/sessions/{sessionId}/revoke` | path `sessionId` | `{ reason: string (1–500) }` | `200 {id, userId}` ; `404` session inconnue ; `409` déjà révoquée/expirée | `RBAC_MANAGE` (ou `USER_MANAGE`, à trancher) |

- **Règles métier** : motif obligatoire, trimé, ≤500 ; refus (« La session est déjà révoquée ou expirée ») si l'état n'est pas `active` ; effet de bord : **entrée de journal d'audit** « Session de <username> révoquée (<appareil>). Motif : <motif> » rattachée à l'utilisateur (visible dans l'onglet Activité de la fiche) ; le refresh token correspondant doit cesser d'être accepté immédiatement ; l'access token déjà émis reste valide jusqu'à son TTL (≤15 min, limite connue du Lot B).
- **État côté API** : `GET /admin/sessions` ❌ ; `POST /admin/sessions/{id}/revoke` ❌ — `identity-service`. Preuve : le seul code de révocation est `UserSessionRepository.revokeAllActiveForUser(userId, now, reason)` (utilisé par `UserServiceImpl.updateRole` avec la raison figée `"role_changed"`) ; aucun contrôleur de sessions (`controller/` ne contient que Auth, Me, InternalUser, Role, UserAdmin, Permission).

---

## Fiche utilisateur — `/utilisateurs/[id]`

- **Fonctionnalités** :
  - En-tête : nom affiché, « Identifiant : <username> », badges Rôle (nom) et Statut (Actif = succès / Suspendu = avertissement), boutons **Changer le rôle** et **Révoquer toutes les sessions** (ce dernier affiché seulement si ≥1 session active). Compte inconnu → page 404 dédiée. Onglet sélectionnable par `?onglet=profil|role|sessions|activite` (défaut `profil`).
  - **Profil** : avatar initiales, nom, identifiant, rôle, statut ; cartes E-mail et Téléphone **masqués** avec bouton « Révéler » (appel serveur journalisé, la valeur réelle n'est renvoyée qu'après écriture du journal, puis rafraîchissement de l'onglet Activité) ; Compagnie (lien `/compagnies/{companyId}?onglet=equipe` si lien, sinon « — ») ; Identifiant ; « Compte créé le » (date) ; « Dernière connexion » (date-heure ou « Jamais »).
  - **Rôle et permissions** : carte du rôle (nom, description, code, nombre de permissions avec pluriel) ; permissions regroupées par domaine (carte « Libellé (n) », code + description) ; état vide « Ce rôle ne porte aucune permission. ».
  - **Sessions** : titre « Sessions (N) » (toutes, y compris révoquées/expirées), compteur « n session(s) active(s) », tableau Appareil / Adresse IP (tronquée) / Début / Dernière activité / Expiration / État (Active, Révoquée, Expirée) / Motif de révocation (« — » si aucun), tri récent d'abord (`createdAt` décroissant), pas de bouton de révocation unitaire ici ; vide : « Aucune session. ».
  - **Activité** : titre « Activité (N) », chronologie (action libre, acteur · date-heure), la plus récente d'abord ; vide : « Aucune activité enregistrée pour ce compte. ».
  - Dialogue **Changer le rôle** : titre « Changer le rôle de <nom> », mention « Toutes les sessions actives du compte sont révoquées immédiatement : une nouvelle connexion sera nécessaire. », liste déroulante « Nouveau rôle » (tous les rôles **sauf le rôle actuel**, valeur de départ vide, bouton désactivé tant qu'aucun rôle choisi), **motif obligatoire**.
  - Dialogue **Révoquer toutes les sessions** : « <n> session(s) active(s) seront révoquées : l'utilisateur devra se reconnecter. », motif obligatoire, destructif.
  - **Pas de suspension/réactivation, d'édition de profil, de réinitialisation de mot de passe ni de suppression** dans le backoffice actuel (le statut n'est qu'affiché).
- **Modèle de données attendu** (`UserDetail`) :

| champ | type | nullable | valeurs / format | source / commentaire |
|---|---|---|---|---|
| user.id, username, displayName | uuid, string, string | non | | `users` |
| user.email | string | non | **jamais envoyé au navigateur** ; masqué `x•••@domaine` | `users.email` — **non exposable sans journalisation** |
| user.phone | string | oui (nullable en base) | masqué `+221•••••••78` | `users.phone` |
| user.roleCode / role{code,name,description} | string / objet | role: oui | | `roles` |
| user.status | `active`\|`suspended` | non | | `users.status` |
| user.companyId / companyName | uuid / string | oui | | `user_company_links` + `company-service` |
| user.employeeId (non affiché aujourd'hui mais requis pour le lien équipe) | uuid | oui | | `user_company_links.employee_id` (hr-service) |
| user.createdAt | ISO-8601 | non | affiché en date | `users.created_at` |
| user.lastLoginAt | ISO-8601 | oui | | `users.last_login_at` |
| permissions[] | `{code, domain, description}` | non | ordre des domaines fixe | permissions du rôle |
| sessions[] | `SessionRow` (voir Sessions) | non | toutes les sessions du compte, `createdAt` décroissant | `user_sessions` |
| activeSessions | int | non | | calculé |
| activity[] | `{id, at, actor, action, companyId?}` | non | `action` = phrase libre FR, `actor` = identité (e-mail/username), tri `at` décroissant | **journal d'audit** (voir endpoint) |

  Phrases d'activité produites par le backoffice (à reproduire ou remplacer par des lignes structurées) : « Rôle de <u> changé : <ancien> → <nouveau> (<n> session(s) révoquée(s)). Motif : <motif> » ; « <n> session(s) de <u> révoquée(s). Motif : <motif> » ; « Session de <u> révoquée (<appareil>). Motif : <motif> » ; « Donnée personnelle révélée : e-mail|téléphone de <u> ».
- **Endpoints requis** :

| méthode | chemin proposé | paramètres | corps | réponse | permission |
|---|---|---|---|---|---|
| GET | `/admin/users/{id}` | path `id` | — | profil **sans contact** (champs de `UserRow` + `createdAt`, `role{id,code,name,description}`, `emailMasked`, `phoneMasked`, `companyId`, `employeeId`, `permissions[]`, `activeSessions`) ; `404` | `USER_MANAGE` + plateforme |
| GET | `/admin/users/{id}/sessions` | `state?` (`active`\|`revoked`\|`expired`) | — | liste de `SessionRow` (toutes), `createdAt` desc | `USER_MANAGE` + plateforme |
| GET | `/admin/users/{id}/activity` (ou `/audit-logs?entityType=User&entityId={id}` + `/data-access-logs?dataSubjectId={id}`) | `page`, `size` | — | lignes `{id, at, actor, action}` | `COMPLIANCE_READ` |
| POST | `/admin/users/{id}/reveal` | path `id` | `{ field: "email" \| "phone" }` | `200 {value}` ; `400` champ invalide ; `404` | `USER_MANAGE` + plateforme (écrit un `DataAccessLog`) |
| PATCH | `/admin/users/{id}/role` (existant : `/api/users/{id}/role`) | path `id` | `{ roleId: uuid, reason: string (1–500) }` | `{userId, roleId, roleCode, sessionsRevoked}` ; `400` rôle inconnu/déjà ce rôle/motif ; `403` rôle propre ; `409` dernier admin | `RBAC_MANAGE` |
| POST | `/admin/users/{id}/sessions/revoke` | path `id` | `{ reason: string (1–500) }` | `200 {revoked: int}` ; `409` « Aucune session active à révoquer » | `RBAC_MANAGE` |

- **Règles métier** :
  - Changement de rôle : rôle cible doit exister (« Rôle inconnu ») ; motif obligatoire ; refus si le compte a déjà ce rôle (« Le compte a déjà ce rôle ») ; **refus de changer son propre rôle** (acteur = e-mail ou identifiant du compte) ; **refus de rétrograder le dernier administrateur actif** (`roleCode=ADMIN`, `status=active`, un seul admin actif) ; effet : révocation de **toutes** les sessions actives avec la raison « Changement de rôle » ; journal avec ancien/nouveau rôle, nombre de sessions révoquées et motif.
  - Révocation de masse : motif obligatoire, refus s'il n'y a aucune session active (« Aucune session active à révoquer »), journal « n session(s) de <u> révoquée(s). Motif : … ».
  - Révélation de contact : journalisée **avant** de renvoyer la valeur ; champ ∈ {email, phone} sinon « Champ invalide ».
  - Les contacts ne figurent jamais dans le HTML/JSON serveur→client tant qu'ils ne sont pas révélés (masquage côté Next, la valeur brute n'existe que dans l'action serveur).
- **État côté API** :
  - `GET /admin/users/{id}` ⚠️ — `GET /api/users/{id}` existe (`UserAdminController.java`, `USER_MANAGE`, borné par compagnie via `TenantAccessGuard` — un staff sans claim + `RBAC_MANAGE` est non restreint) mais `UserProfileResponse{id, username, email, phone}` ne contient **ni rôle, ni statut, ni nom, ni lastLoginAt, ni createdAt, ni lien compagnie/employé, ni permissions, ni sessions** et renvoie e-mail/téléphone **en clair**, sans journalisation d'accès.
  - `GET /admin/users/{id}/sessions` ❌ — `identity-service` (table `user_sessions` existe, aucune lecture exposée).
  - `GET /admin/users/{id}/activity` ⚠️ — `audit-compliance-service` : `GET /audit-logs` (`AuditLogController.java`, filtres `companyId, entityType, entityId, actorUserId, action, from, to, sourceService, page, size`, permission `COMPLIANCE_READ` + plateforme) couvre `PERMISSION_CHANGE`/`User` écrit par `UserServiceImpl.updateRole` (état avant/après `roleCode`, `sessionsRevoked`) ; **manquent** le motif (n'existe pas à l'entrée), les événements de révocation manuelle et de révélation de contact (`GET /data-access-logs` existe côté audit mais aucun producteur n'y écrit pour identity), et le libellé d'acteur lisible.
  - `POST /admin/users/{id}/reveal` ❌ — `identity-service` (+ écriture d'un `DataAccessLog` vers `audit-compliance-service` via événement `audit.events`). `GET /internal/users/{id}/contact` existe (`InternalUserController`, rôle `SERVICE_CALLER`, `InternalUserContactResponse{id,email,phone}`) mais réservé aux services.
  - `PATCH /api/users/{id}/role` ⚠️ — existe (`RBAC_MANAGE`, `UpdateUserRoleRequest{roleId}`, révoque les sessions avec raison `role_changed`, audit `PERMISSION_CHANGE`) ; **manquent** : champ `reason` (motif), garde « pas son propre rôle », garde « dernier admin actif », réponse sans nombre de sessions révoquées (le nombre est seulement dans l'audit). Le backoffice envoie un `roleCode` : l'API attend `roleId` (uuid).
  - `POST /admin/users/{id}/sessions/revoke` ❌ — `identity-service` (réutiliser `revokeAllActiveForUser` avec le motif fourni).

---

## Synthèse des écarts

| endpoint ou donnée manquante | service recommandé | priorité | commentaire |
|---|---|---|---|
| `GET /admin/users` (liste plateforme paginée/filtrée/triée, avec `roleName`, `status`, `companyId`, `lastLoginAt`, `activeSessions`) | identity-service | haute | Aucune liste d'utilisateurs n'existe ; filtres `q`, `roleCode`, `status`, `companyId` |
| `GET /admin/users/{id}` enrichi, sans contact en clair (rôle, statut, noms, dates, lien compagnie/employé) | identity-service | haute | `GET /api/users/{id}` renvoie email/phone en clair et peu de champs |
| `GET /admin/sessions` (sessions actives plateforme) | identity-service | haute | Table `user_sessions` sans lecture exposée ; IP à tronquer |
| `GET /admin/users/{id}/sessions` | identity-service | haute | Toutes sessions d'un compte |
| `POST /admin/sessions/{id}/revoke` avec motif | identity-service | haute | Aucune révocation unitaire ; raison libre à persister |
| `POST /admin/users/{id}/sessions/revoke` avec motif | identity-service | haute | Révocation de masse hors changement de rôle |
| `PATCH …/role` : champ `reason`, garde auto-modification, garde dernier admin actif, `sessionsRevoked` dans la réponse | identity-service | haute | Règles aujourd'hui seulement dans le mock du backoffice |
| `POST /admin/users/{id}/reveal` (email/phone journalisé) | identity-service (+ audit-compliance) | haute | Obligation RGPD/CDP : journal `DataAccessLog` avant retour |
| `GET /admin/roles` avec `userCount` et `permissions[]` | identity-service | moyenne | `GET /api/roles` ne renvoie que id/code/nom/description |
| `GET /admin/role-permissions` (matrice) | identity-service | moyenne | `RolePermission` non exposé |
| `GET /api/permissions` : ajouter `description` et `domain` normalisé | identity-service | moyenne | Entité a `description`, DTO non ; `module` ≠ `PermissionDomain` |
| `GET /admin/access/summary` (compteurs/stats hub) | identity-service | basse | Peut être recomposé avec `totalElements` des listes |
| `GET /admin/users/{id}/activity` (journal du compte lisible) | audit-compliance-service | moyenne | `GET /audit-logs` partiel : manque motif, révocations, révélations, libellé acteur |
| Nom de compagnie dans la liste/fiche | company-service (via composition) | moyenne | Pas de FK inter-services ; résolution par `companyId` ou cache événementiel |
| Suspension / réactivation de compte (statut `suspended`) | identity-service | basse | Statut affiché mais aucune action ni endpoint ; login filtre déjà `status = "active"` (`AuthServiceImpl`) |
| Route Gateway `/admin/**` | gateway | haute | Aucun routage préfixe admin aujourd'hui |

## Questions ouvertes

1. **Préfixe et sécurité** : valider `/admin/...` sur `identity-service` (vs réutiliser `/api/...`) ; permission exacte par endpoint (`USER_MANAGE` lecture, `RBAC_MANAGE` écriture ?) et exigence « appelant plateforme » (claim `companyId` absent + `RBAC_MANAGE`).
2. **Contacts** : la révélation passe-t-elle par identity (source de vérité) avec écriture d'un `DataAccessLog` côté audit (via `audit.events`) ? Le backoffice masque-t-il côté Next (comme aujourd'hui) ou l'API renvoie-t-elle déjà les valeurs masquées ?
3. **Motif** : où le persister (colonne `user_sessions.revoked_reason` existe ; pour le changement de rôle, seulement l'état d'audit) ? Faut-il l'inclure dans l'événement d'audit ?
4. **Journal d'activité** : source unique `audit-compliance-service` (`/audit-logs` + `/data-access-logs`) avec lignes structurées, ou un journal propre au backoffice (comme l'actuel `addActivity`) ? Format de l'`actor` (e-mail vs username vs id).
5. **Statut `suspended`** : qui peut suspendre/réactiver (aucune action dans le backoffice ni l'API) ? Lien avec `EmployeeSuspended` (supprime seulement le lien compagnie).
6. **Nom d'affichage** : `displayName` = `first_name + last_name` avec repli sur `username` ; confirmer.
7. **Libellé d'appareil** : `deviceLabel` n'est pas alimenté (`device_name`/`device_type` null à la création de session) ; dériver du `user_agent` côté API ? Définir la règle « mobile » (le backoffice teste `iphone|android`).
8. **Compagnie d'un compte** : un compte non lié à un `Employee` n'a pas de compagnie (« Plateforme ») ; les clients B2C sont aussi affichés ainsi. Faut-il distinguer « plateforme (équipe Sira) » et « client final » ?
9. **Volume** : liste des comptes B2C potentiellement très grande → pagination serveur obligatoire ; la recherche `q` doit-elle couvrir `email`/`phone` (le backoffice ne la fait pas aujourd'hui) ?
10. **Édition des rôles/permissions** : hors périmètre actuel (lecture seule) ; confirmer qu'aucune écriture sur `role_permissions` n'est attendue.
11. **Fenêtre de validité de l'access token** après révocation (≤15 min) : acceptable pour le backoffice ou faut-il une liste de révocation ?
