# 08 — Conformité, audit et supervision

## Vue d'ensemble

Deux hubs à onglets réservés à l'équipe Sira (vue plateforme, **toutes les compagnies**, aucun tenant) :

- **Conformité** (`/conformite`) : aperçu, journal d'audit (+ fiche), accès aux données, demandes RGPD (+ fiche, workflow), consentements (agrégats + consultation d'une personne avec motif), rétention (durée par compagnie). Backend : `audit-compliance-service` (+ `company-service` pour `dataRetentionDays`).
- **Supervision** (`/supervision`) : aperçu style Grafana, santé des services, incidents (+ fiche, workflow, postmortem), trafic API, usage produit. Backend : `monitoring-service`.

État actuel du backoffice : tout tourne sur le store mémoire (`src/lib/data/seed.ts`), **les listes sont filtrées, triées, paginées et agrégées côté client/serveur Next sur le jeu complet**. L'API doit donc fournir pagination + filtres serveur + agrégats (aucune ligne brute en masse côté navigateur). Les écritures passent par des server actions (`conformite/actions.ts`, `supervision/actions.ts`) qui appellent les repos ; elles deviendront des appels API avec le JWT de l'admin (appelant plateforme : aucun claim `company_id` + `RBAC_MANAGE`).

Convention des chemins ci-dessous : « chemin proposé » = préfixe `/admin/...` quand l'endpoint est nouveau/plateforme ; quand l'endpoint existe déjà, le chemin réel du service est donné (le Gateway expose `/audit-logs/**`, `/data-access-logs/**`, `/data-subject-requests/**`, `/consents/**`, `/health/**`, `/incidents/**`, `/usage/**`, `/analytics/**`, `/companies/**`).

Permissions backend de référence : `COMPLIANCE_READ` (journaux, consentements d'un utilisateur), `COMPLIANCE_MANAGE` (demandes), `MONITORING_READ` / `MONITORING_MANAGE`, `COMPANY_MANAGE` ; en plus, garde « appelant plateforme » (`PlatformAccessGuard` : aucun claim `company_id` **et** `RBAC_MANAGE`, `403` sinon) sur tous les endpoints sauf `/health/services`.

---

## Valeurs et enums (repris du code)

| Domaine | Valeurs | Source |
|---|---|---|
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGIN_FAILED`, `EXPORT`, `PERMISSION_CHANGE` | `src/lib/repos/compliance.ts` ; backend `enums/AuditAction.java` (mêmes 7) |
| `AuditActorType` | `USER`, `EMPLOYEE`, `SYSTEM`, `API_KEY` | `types/index.ts` ; backend `ActorType` |
| `AccessType` | `VIEW`, `EXPORT`, `MODIFY`, `DELETE` | idem |
| `DataCategory` | `IDENTITY`, `FINANCIAL`, `LOCATION`, `HEALTH`, `CONTACT`, `CONSENT` | idem |
| `DataSubjectType` | `CUSTOMER`, `EMPLOYEE`, `USER` | idem |
| `AccessReason` | `SUPPORT_REQUEST`, `LEGAL_OBLIGATION`, `SERVICE_DELIVERY`, `INVESTIGATION` | idem |
| `DsrType` | `ACCESS`, `RECTIFICATION`, `ERASURE`, `PORTABILITY`, `RESTRICTION`, `OBJECTION` | idem |
| `DsrStatus` | `RECEIVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED` | idem |
| `ConsentType` | `MARKETING_EMAIL`, `MARKETING_SMS` (portée compagnie), `DATA_SHARING_PARTNERS`, `COOKIES_ANALYTICS`, `GEOLOCATION` (portée plateforme) | idem |
| `ConsentStatus` / `ConsentSource` | `GRANTED`, `WITHDRAWN` / `SIGNUP`, `SETTINGS_PAGE`, `BOOKING_FLOW` | idem |
| `ServiceStatus` (frontend) | `healthy`, `degraded`, `down` — **le backend renvoie `HEALTHY`/`DEGRADED`/`DOWN`** (`HealthStatus.java`) : mapping à faire (minuscules) | `types/index.ts` |
| `IncidentSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | idem |
| `IncidentStatus` | `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED` | idem |
| `ImpactScope` | `SINGLE_COMPANY`, `MULTI_COMPANY`, `PLATFORM_WIDE` | idem |
| `ApiStatusClass` | `2xx`, `4xx`, `5xx` (le frontend ne type que `GET`/`POST`/`PATCH` pour la méthode ; l'API peut renvoyer toute méthode) | `types/index.ts` |
| Catégories d'événement produit | `booking`, `parcel`, `customer` (frontend) | `monitoring.ts` |

Constantes frontend à reprendre côté contrat : rétention par défaut **730 j**, min **90**, max **3650** ; seuil « échéance proche » **7 j** ; délai légal DSR **30 j** ; `STALE_AFTER_MS` **90 000 ms** ; SLO API **99,5 %** ; SLO service 24 h **99,5 %** ; budget de latence **500 ms** ; fenêtres de période **7 / 14 / 30 jours** ; chronologie incidents **90 jours** ; motif d'action max **500 caractères** (`MAX_REASON`).

---

# PARTIE A — CONFORMITÉ

Éléments communs aux 6 onglets du hub (`hub-page.tsx`, `compliance-hub.ts`) :

- Barre de recherche globale `q` (trim, 80 caractères max, insensible à la casse **et aux accents** — `fold`), appliquée à l'onglet courant ; **les compteurs des 5 onglets sont recalculés pour la même requête** (affiche « Mais ça correspond dans : Journal (3), Demandes (1) »). L'API doit donc soit supporter `q` + renvoyer `total`, soit offrir un endpoint de comptage.
- Filtre `compagnie` (liste de toutes les compagnies, recherchable) : appliqué à aperçu, journal, demandes, rétention ; **ignoré** pour accès aux données et consentements.
- Bandeau de 4 statistiques par onglet (masqué quand `q` est saisi), toujours calculé sur le jeu non filtré par `q`.
- Rôle : lecture seule pour journal, accès, consentements ; actions d'écriture uniquement sur demandes RGPD (workflow) et rétention (durée).
- Les adresses IP sont **tronquées côté backoffice** à `a.b.c.0` (IPv4 /24 ; autre format → `••••` ; `null` → `—`) : voir Questions ouvertes.

## Appel de données partagé : liste des compagnies (filtres)

Tous les sélecteurs « Compagnie » (conformité et supervision) ont besoin de `id`, `name`, `status`, `dataRetentionDays`.

| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/companies` | `page`, `size`, `sort` (Pageable) | `Page<CompanyResponse>` incl. `dataRetentionDays` | `COMPANY_MANAGE`, non restreint |

État : ✅ `company-service/.../controller/CompanyController.java:72` (`@GetMapping("/companies")`, `Pageable`, DTO `CompanyResponse` avec `dataRetentionDays`). Réserve : il faudra lire toutes les pages (ou `size` élevé) pour peupler le sélecteur et la page rétention ; pas de filtre `q`/`status` serveur.

---

### Aperçu conformité — `/conformite`

- **Fonctionnalités** :
  - Filtre `compagnie` (filtre l'audit, les demandes, la rétention ; **pas** l'accès aux données ni les consentements, qui restent globaux).
  - 4 tuiles : Actions journalisées (total + « N sur 7 jours »), Demandes RGPD ouvertes (+ « N en retard » / « aucune en retard »), Taux de consentement (% + « N retrait(s) »), À anonymiser (lignes + « N durée(s) personnalisée(s) »).
  - « Demandes à traiter » : les 5 demandes ouvertes les plus urgentes (échéance la plus proche d'abord) avec nom, type, compagnie, badge « N j restants » / « N j de retard » (lien vers la fiche).
  - « Consentements par type » : barre granted/withdrawn par type, taux %, longueur proportionnelle au volume.
  - Donut « Journal par type d'action » (comptes par `AuditAction`, trié décroissant).
  - Donut « Accès aux données » par `DataCategory` + « N sur 7 jours · N export(s) ».
  - « Échecs de connexion » : 4 derniers `LOGIN_FAILED` (acteur, date/heure, IP tronquée, lien fiche) + total ; état vide « Aucun échec récent ».
- **Modèle de données attendu** (objet `ComplianceOverview`, tout calculé par l'API) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| audit.total / last7 / failedLogins | int | non | | Sur le périmètre `companyId` si fourni. `last7` = `created_at ≥ now-7j` |
| audit.byAction[] | {action: AuditAction, value:int} | non | | trié décroissant |
| audit.recentFailures[] | AuditRow (4) | non | | cf. journal |
| access.total / last7 / exports | int | non | | global (pas de filtre compagnie) |
| access.byCategory[] | {category, value} | non | | trié décroissant |
| access.recent[] | AccessRow (4) | non | | |
| requests.open / overdue / dueSoon / closed | int | non | | ouvertes = RECEIVED+IN_PROGRESS ; overdue = `daysLeft<0` ; dueSoon = `0≤daysLeft≤7` |
| requests.urgent[] | DsrRow (≤5) | non | | ouvertes seulement, `daysLeft` croissant |
| consents.granted / withdrawn / rate | int / int / int\|null | rate nullable | % arrondi | sur les **états courants** |
| consents.byType[] | ConsentCardData | non | | cf. onglet consentements |
| retention.custom / pending / defaultDays | int | non | | `pending` = somme `pendingRows` |
| retention.shortest | RetentionRow\|null | oui | | durée effective minimale |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/compliance/overview` | `companyId?` | `ComplianceOverview` ci-dessus | `COMPLIANCE_READ` + plateforme |

  (alternative : composer l'aperçu à partir des endpoints stats des onglets ci-dessous ; l'agrégat unique est recommandé pour éviter 6 aller-retours.)
- **Règles métier** : lecture seule. « 7 jours » = fenêtre glissante UTC. Le filtre compagnie ne s'applique pas aux accès/consentements (jeux sans dimension compagnie fiable).
- **État côté API** : ❌ `/admin/compliance/overview` manquant ; il se décompose en endpoints stats (journal, accès, demandes, consentements, rétention) eux-mêmes ❌ — voir onglets. Service propriétaire : `audit-compliance-service` (la partie rétention s'appuie sur sa table locale `company_retention_policies`, alimentée par l'événement `company.retention.changed`).

---

### Journal d'audit — `/conformite/journal-audit`

- **Fonctionnalités** :
  - Table (DataTable, non triable côté UI, `searchable=false`) : **Acteur** (avatar, nom, type d'acteur), **Action** (pastille), **Objet** (type d'entité + 8 premiers caractères de l'id), **Compagnie** (« Plateforme » si `companyId` nul, « — » si inconnue), **Service** (`sourceService` ou « — »), **IP** (tronquée), **Date** (date+heure). Clic sur une ligne → fiche.
  - Tri imposé : plus récent d'abord, départage par `id`.
  - Filtres : `compagnie`, `action` (options exposées dans l'UI : Création, Modification, Connexion, Échec de connexion, Changement de permission ; le code accepte aussi `DELETE`, `EXPORT`), recherche `q` sur : acteur, compagnie, type d'entité, ref d'entité (8 car.), service source, libellé d'action.
  - Bandeau : Lignes (total), Connexions (`LOGIN`), Échecs de connexion (`LOGIN_FAILED`), Permissions modifiées (`PERMISSION_CHANGE`) — comptes sur le jeu non filtré par `q`/`action` mais filtré par compagnie.
  - Pagination : **aucune actuellement** (tout le jeu en une page) → l'API doit paginer.
  - État vide : « Aucune ligne de journal. » / « Aucun résultat dans « Journal d'audit » ».
  - Journal en lecture seule, jamais modifié depuis le backoffice.
- **Modèle de données attendu** (`AuditRow`, liste) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| createdAt | datetime ISO | non | heure de réception | |
| companyId | uuid | oui | nul = plateforme | |
| companyName | string | non | « Plateforme » / nom / « — » | **Enrichissement** : jointure `company-service` (ou cache) — à faire par l'API ou le BFF |
| actorLabel | string | non | libellé affiché | = nom d'affichage de `actorUserId` (identity-service) ; « Système » si nul. Le backoffice écrit aussi des lignes dont l'acteur est un libellé (admin backoffice), non un user id |
| actorType | AuditActorType | non | | |
| action | AuditAction | non | | |
| entityType | string | non | ex. `Company`, `DataSubjectRequest`, `SystemIncident` | |
| entityRef / entityId | string | non | 8 premiers car. de l'id | calcul d'affichage |
| sourceService | string | oui | ex. `audit-compliance-service` | nul pour les lignes écrites par le service d'audit lui-même |
| ipTruncated | string | non | `a.b.c.0`, « — » | voir Questions ouvertes (troncature) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/audit-logs` | `companyId?`, `action?`, `entityType?`, `entityId?`, `actorUserId?`, `sourceService?`, `from?`, `to?`, **`q?`**, `page`, `size` (≤100) | `Page<AuditLog>` ; tri fixe `created_at desc, id desc` | `COMPLIANCE_READ` + plateforme |
| GET | `/admin/audit-logs/stats` | `companyId?` | `{total, last7, byAction[], failedLogins, login, permissionChange}` | idem |

- **Règles métier** : journal en ajout seul (trigger PostgreSQL), IP/user-agent anonymisés (`NULL`) par le job de rétention après la durée de la compagnie (03:15 UTC) → l'UI affiche « — ». Le backoffice produit lui-même des lignes d'audit lors de ses actions (changement de statut de demande, durée de rétention, déclaration/avancement d'incident) : à terme elles viendront de l'événement `audit.events` émis par les services concernés (règle 6 du CLAUDE.md), pas d'une écriture directe.
- **État côté API** :
  - `GET /audit-logs` : ⚠️ partiel — ✅ `audit-compliance-service/.../controller/AuditLogController.java` (`@GetMapping("/audit-logs")`, filtres `companyId, entityType, entityId, actorUserId, action, from, to, sourceService`, pagination `page/size`, tri fixe, DTO `AuditLogResponse`). ❌ manquent : recherche texte `q` (sur acteur/compagnie/service/action), noms enrichis (`actorLabel`, `companyName` — l'API ne renvoie que `actorUserId`/`companyId`), IP déjà tronquée.
  - `GET /admin/audit-logs/stats` : ❌ (aucun comptage agrégé ; `Page.totalElements` donne un total par filtre mais pas `last7`/`byAction`).

---

### Fiche d'une ligne d'audit — `/conformite/journal-audit/[id]`

- **Fonctionnalités** : titre `<Action> · <entityType>` + sous-titre `<compagnie> · <date-heure>` ; carte « Origine » (Acteur, Type d'acteur, Compagnie avec lien `/compagnies/{id}`, Service source, Adresse IP tronquée, Agent utilisateur, Reçue le, Survenue le — horloge du producteur, Entité, Identifiant complet) ; carte « Avant / après » : tableau Champ | Avant | Après sur l'**union triée** des clés de `beforeState`/`afterState`, lignes dont la valeur diffère surlignées (`changed`), « — » pour absent ; message « Cette action n'enregistre aucun état. » si les deux états sont vides ; 404 propre (`not-found.tsx`) si l'id est inconnu.
- **Modèle de données attendu** (`AuditDetail`) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| row | AuditRow | non | cf. liste |
| entityId | string | non | id complet (≤100 car.) |
| userAgent | string | oui | « — » si anonymisé/absent |
| occurredAt | datetime | oui | horloge du producteur ; nul pour lignes locales |
| beforeState / afterState | object<string,string> | oui | paires clé → **texte** uniquement (jamais de texte libre / PII par construction) |
| changes[] | {key, before\|null, after\|null, changed:boolean} | non | calculé (union des clés, tri alphabétique, `changed = before !== after`) — peut être calculé par le client à partir des deux états |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/audit-logs/{id}` | id (uuid) | `AuditLogResponse` complet | `COMPLIANCE_READ` + plateforme |

- **Règles métier** : lecture seule ; la consultation d'une fiche n'est aujourd'hui pas journalisée dans `DataAccessLog` (voir Questions ouvertes).
- **État côté API** : `GET /audit-logs/{id}` ❌ — le contrôleur n'expose que la recherche (`AuditLogController.java` : un seul `@GetMapping`). Contournement possible : `GET /audit-logs?entityId=…` ne cible pas l'id de **ligne**. Le DTO `AuditLogResponse` contient déjà `beforeState`/`afterState` (JsonNode), `userAgent`, `occurredAt`, `sourceService`.

---

### Accès aux données — `/conformite/acces-donnees`

- **Fonctionnalités** :
  - Table : **Consulté par** (avatar + libellé de l'agent), **Accès** (pastille `VIEW`/`EXPORT`/`MODIFY`/`DELETE`), **Personne concernée** (nom + sous-libellé « Client » / « Employé » / « Utilisateur » ; « Compte supprimé » si le compte n'existe plus), **Donnée** (pastille de catégorie), **Motif** (libellé de `accessReason`), **IP** (tronquée), **Date**. Non cliquable, pas de fiche. Tri : plus récent d'abord.
  - Filtres : `type` (Consultations/Exports/Modifications → `VIEW`/`EXPORT`/`MODIFY`), `categorie` (options UI : Identité, Consentement → `IDENTITY`/`CONSENT`) ; recherche `q` sur : agent, personne, libellé de catégorie, libellé de motif, libellé de type. Pas de filtre compagnie.
  - Bandeau : Accès (total), Consultations, Exports, Modifications.
  - Pagination : aucune actuellement → à ajouter.
  - Vide : « Aucun accès enregistré. »
  - Les accès sont créés par les actions du backoffice : lecture d'un consentement d'utilisateur (`VIEW`/`CONSENT`/motif choisi), traitement d'une demande (`MODIFY`/`IDENTITY`/`LEGAL_OBLIGATION`), et par `audit-compliance-service` lors de la lecture staff d'une demande (`VIEW`/`IDENTITY`/`LEGAL_OBLIGATION`).
- **Modèle de données attendu** (`AccessRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| createdAt | datetime | non | | |
| accessedByLabel | string | non | « — » si inconnu | nom de `accessedByUserId` (identity) — enrichissement |
| subjectType | DataSubjectType | non | | |
| subjectName | string | non | « Compte supprimé » | nom de `dataSubjectId` (identity/customer) — enrichissement |
| dataCategory | DataCategory | non | | |
| accessReason | AccessReason | non | | |
| accessType | AccessType | non | | |
| ipTruncated | string | non | | |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/data-access-logs` | `accessedByUserId?`, `dataSubjectType?`, `dataSubjectId?`, **`accessType?`, `dataCategory?`, `accessReason?`**, `from?`, `to?`, **`q?`**, `page`, `size` | `Page<DataAccessLog>` tri fixe récent d'abord | `COMPLIANCE_READ` + plateforme |
| GET | `/admin/data-access-logs/stats` | — | `{total, last7, byType{VIEW,EXPORT,MODIFY,DELETE}, byCategory[]}` | idem |

- **Règles métier** : journal en ajout seul ; la lecture staff est elle-même la source de nouvelles lignes ; IP anonymisée après rétention (`DataAccessLog` n'a pas de user-agent).
- **État côté API** :
  - `GET /data-access-logs` : ⚠️ partiel — ✅ `audit-compliance-service/.../controller/DataAccessLogController.java` (filtres `accessedByUserId, dataSubjectType, dataSubjectId, from, to`, pagination, DTO `DataAccessLogResponse`). ❌ manquent les filtres `accessType`, `dataCategory`, `accessReason`, la recherche `q` et les noms enrichis (`accessedByLabel`, `subjectName`).
  - `…/stats` : ❌.

---

### Demandes RGPD (liste) — `/conformite/demandes-rgpd`

- **Fonctionnalités** :
  - Grille de cartes (3 colonnes xl) : initiales + nom du demandeur, compagnie (ou « — »), badge de statut (Reçue/En cours/Clôturée/Rejetée), type (Accès, Rectification, Effacement, Portabilité, Limitation, Opposition), **barre de délai** (progression `(30 - daysLeft)/30`, rouge si en retard, ambre si ≤7 j, verte si close), échéance (date) + « N j restants » / « N j de retard » / « Clôturée », « Traité par X ». Clic → fiche.
  - Ordre : **demandes ouvertes d'abord par `daysLeft` croissant (les plus en retard en tête)**, puis demandes closes par `createdAt` décroissant.
  - Filtres : `compagnie`, `statut`, `type`, `retard=oui` (en retard uniquement), recherche `q` sur : demandeur, compagnie, libellé de type, `handledBy`.
  - Bandeau : Ouvertes, En retard, Sous 7 jours, Closes (sur le jeu complet, non filtré).
  - Badge « urgent » sur l'onglet.
  - Vide : « Rien à afficher ici. ».
- **Modèle de données attendu** (`DsrRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| requesterName | string | non | « — » | nom du `requesterUserId` — **enrichissement** (identity) |
| companyId / companyName | uuid / string | companyId oui | « — » si plateforme | enrichissement compagnie |
| requestType | DsrType | non | | |
| status | DsrStatus | non | | |
| dueDate | date | non | `createdAt + 30 j` | calculé et figé à la création par le backend |
| daysLeft | int | oui | nul si close | `ceil((dueDate − now)/jour)` ; négatif = en retard — **calculé** (serveur ou client à partir de `dueDate`) |
| overdue | bool | non | `daysLeft < 0` | idem |
| handledBy | string | oui | libellé | = nom du `handledByUserId` (le backend stocke un user id) |
| createdAt | datetime | non | | |

  Jamais exposés dans la liste : `reason`, `resolutionNotes`, identifiant du demandeur.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/data-subject-requests` | `status?`, `companyId?`, **`requestType?`, `overdue?` (bool), `q?`, `sort=openFirst`**, `page`, `size` | `Page<DsrStaff>` | `COMPLIANCE_MANAGE` + plateforme |
| GET | `/admin/data-subject-requests/stats` | `companyId?` | `{open, overdue, dueSoon, closed}` | idem |

- **Règles métier** : ouverte = `RECEIVED` ou `IN_PROGRESS` ; « sous 7 jours » = `0 ≤ daysLeft ≤ 7` ; un `daysLeft` de `-0` est ramené à `0`.
- **État côté API** :
  - `GET /data-subject-requests` : ⚠️ partiel — ✅ `audit-compliance-service/.../controller/StaffDataSubjectRequestController.java` (`@GetMapping("/data-subject-requests")`, filtres `status`, `companyId`, pagination, DTO `DataSubjectRequestStaffResponse` : `id, requesterUserId, companyId, requestType, status, reason, handledByUserId, dueDate, resolvedAt, resolutionNotes, createdAt, updatedAt`). ❌ manquent : filtres `requestType`, `overdue`, recherche `q`, tri « ouvertes par échéance » (le backend trie du plus récent), noms enrichis (`requesterName`, `companyName`, `handledBy`). ⚠️ la DTO staff renvoie aussi `reason`/`resolutionNotes` dans la liste (le backoffice ne les utilise pas en liste).
  - `…/stats` : ❌. Note : chaque lecture staff de la liste écrit une ligne `DataAccessLog` par demande renvoyée (dette connue du service, 1 ligne par ligne lue) → un stats/overview basé sur la liste complète serait très coûteux en traces ; prévoir un endpoint stats sans effet de bord.

---

### Fiche d'une demande RGPD — `/conformite/demandes-rgpd/[id]`

- **Fonctionnalités** :
  - Titre `<Type> · <demandeur>`, sous-titre « Demande reçue le <date> », badge de statut, compte à rebours « N j restants » / « En retard de N j » (rouge) / « — » si close, « Échéance légale : <date> ».
  - Blocs : « Motif du demandeur » (texte libre de la personne), « Notes de résolution » (ou « Aucune note pour le moment. »), « Détails » : Demandeur (lien `/utilisateurs/{requesterUserId}`), Compagnie (lien `/compagnies/{id}` ou « Niveau plateforme »), Traitée par, Résolue le.
  - Actions (visibles seulement si la demande est ouverte) : **Prendre en charge** (si `RECEIVED`, confirmation sans motif), **Clôturer la demande** (motif/notes **obligatoire**, ≤500 car.), **Rejeter la demande** (notes obligatoires, bouton destructif). Demande close : note « Cette demande est close : elle ne peut plus être modifiée. » et plus d'actions. 404 propre si inconnue.
  - Après action : rafraîchissement de la fiche, de la liste, du journal d'audit, du journal d'accès et de la fiche compagnie.
- **Modèle de données attendu** (`DsrDetail`) : tous les champs de `DsrRow` + :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| requesterUserId | uuid | non | lien vers la fiche utilisateur |
| reason | string | non | texte libre de la personne |
| resolutionNotes | string | oui | |
| resolvedAt | datetime | oui | posé quand `COMPLETED`/`REJECTED` |
| updatedAt | datetime | oui | (non affiché) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/data-subject-requests/{id}` | id | `DataSubjectRequestStaffResponse` | `COMPLIANCE_MANAGE` + plateforme |
| PATCH | `/data-subject-requests/{id}` | `{status: IN_PROGRESS\|COMPLETED\|REJECTED, resolutionNotes?}` | demande mise à jour (`200`) ; `409` transition interdite ; `400` rejet sans notes ; `404` | idem |

- **Règles métier (workflow)** :
  - Transitions autorisées : `RECEIVED → IN_PROGRESS`, `IN_PROGRESS → COMPLETED`, `IN_PROGRESS → REJECTED`. **Refusées** : `RECEIVED → COMPLETED|REJECTED` (« Une demande reçue doit d'abord être prise en charge »), `IN_PROGRESS → IN_PROGRESS` (« déjà prise en charge »), toute transition depuis un état clos (« Cette demande est déjà close »).
  - Ordre des gardes côté repo : demande existe → notes (obligatoires pour `COMPLETED` **et** `REJECTED`, vides refusées) → transition permise.
  - Effets : `handledBy` = admin courant ; `resolvedAt` et `resolutionNotes` posés à la clôture/rejet ; ligne d'audit `UPDATE`/`DataSubjectRequest` (`{status}` avant → après) ; ligne d'accès `MODIFY`/`IDENTITY`/`LEGAL_OBLIGATION` sur le demandeur ; entrée d'activité sur la compagnie. L'exécution réelle du droit (export, effacement…) **n'est pas** dans le périmètre (suivi de statut uniquement).
  - Le traitement est toujours plateforme (jamais délégué à une compagnie).
- **État côté API** :
  - `GET /data-subject-requests/{id}` : ✅ `StaffDataSubjectRequestController.java` (`@GetMapping("/data-subject-requests/{id}")` ; trace l'accès). ⚠️ mineur : pas de `requesterName`/`companyName`/nom du `handledBy` (enrichissement à faire côté BFF).
  - `PATCH /data-subject-requests/{id}` : ✅ même fichier (`@PatchMapping`), DTO `TransitionDataSubjectRequestRequest {status @NotNull, resolutionNotes}` ; transitions et `409` conformes ; audit `UPDATE` et `DataAccessLog` `MODIFY` écrits par le service. Écart : le backend n'impose `resolutionNotes` (`@AssertTrue`) que pour `REJECTED`, le backoffice l'exige aussi pour `COMPLETED` (à aligner côté API ou à garder côté BFF).

---

### Consentements — `/conformite/consentements`

- **Fonctionnalités** :
  - Grille de cartes **par type de consentement** : icône, libellé, **taux % (granted / (granted + withdrawn))** ou « — », barre verte/rouge, « N accordés / N retirés », puis jusqu'à 4 **portées** (compagnie, ou « Plateforme », ou « Sans compagnie (ancien) » pour les lignes marketing historiques sans compagnie) avec `granted / total` ; « + N autres portées » si > 4 (portées affichées seulement si > 1). Les cartes n'existent que pour les types ayant au moins une ligne.
  - Recherche `q` sur libellé de type et noms de portée. Pas de filtre compagnie ni pagination (au plus 5 cartes).
  - Section « Consulter l'historique d'une personne » : liste déroulante des utilisateurs ayant au moins un consentement (`Nom (Compagnie | client)`, tri alphabétique), liste déroulante **motif d'accès** (`SUPPORT_REQUEST`, `LEGAL_OBLIGATION`, `SERVICE_DELIVERY`, `INVESTIGATION`), bouton « Consulter » → tableau : Date, Consentement, Compagnie (ou « — »), Statut (Accordé/Retiré), Version, Source (Inscription/Page de réglages/Parcours de réservation), État **Courant** (ligne la plus récente du triplet utilisateur/type/compagnie) ou **Remplacé**. Tri : plus récent d'abord. Erreur affichée en `role="alert"` (motif invalide, utilisateur introuvable).
  - Mention : « Les lignes « Sans compagnie (ancien) » n'autorisent aucun envoi ».
  - **Aucune écriture** : le journal de consentement est en ajout seul, le backoffice ne peut ni accorder ni retirer.
- **Modèle de données attendu** :

`ConsentCardData` (agrégat) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| consentType | ConsentType | non | |
| granted / withdrawn | int | non | nombre d'**états courants** `GRANTED` / `WITHDRAWN` (dernière ligne par (user, type, compagnie)) |
| rate | int\|null | oui | `round(granted/(granted+withdrawn)·100)` — calculé |
| scopes[] | {name, granted, withdrawn} | non | `name` = nom de compagnie, « Plateforme » (types plateforme), « Sans compagnie (ancien) » (marketing sans `companyId`) ; trié par volume décroissant |

`ConsentEntryView` (historique d'une personne) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| id | uuid | non | |
| consentType | ConsentType | non | |
| companyName | string | oui | nul pour un type plateforme |
| status | ConsentStatus | non | |
| consentVersion | string | non | |
| source | ConsentSource | non | |
| at | datetime | non | = `createdAt` |
| isCurrent | bool | non | vrai si la ligne appartient à `current[]` |

`ConsentUserOption {id, label}` : label = `Nom (Compagnie|client)`.

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/consents/summary` | `q?` (optionnel) | `ConsentCardData[]` (par type, avec portées par compagnie) | `COMPLIANCE_READ` + plateforme |
| GET | `/admin/consents/subjects` | `q?`, `page`, `size` | utilisateurs ayant ≥1 consentement `{id, label}` | idem |
| GET | `/consents/{userId}` | `accessReason` (**obligatoire**) | `{current:[ConsentResponse], history:[ConsentResponse]}` | `COMPLIANCE_READ` + plateforme |

- **Règles métier** : motif obligatoire et validé (`400` sinon, **aucune ligne écrite** en cas de refus) ; un succès écrit une ligne `DataAccessLog` `VIEW`/`CONSENT`/<motif> ; `isCurrent` = présence de l'id dans `current` ; le lookup d'un utilisateur inconnu renvoie des listes vides côté backend (le backoffice actuel répond « Utilisateur introuvable » — à reproduire en vérifiant l'existence de l'utilisateur via identity-service).
- **État côté API** :
  - `GET /consents/{userId}?accessReason=` : ✅ `audit-compliance-service/.../controller/ConsentController.java` (`@GetMapping("/{userId}")`, exige `COMPLIANCE_READ` + plateforme + `userId` du jeton, trace dans `DataAccessLog`) ; réponse `ConsentSummaryResponse(current, history)`, `ConsentResponse(id, consentType, companyId, status, consentVersion, source, grantedAt, withdrawnAt, createdAt)`. ⚠️ pas de `companyName` (enrichissement) ; `isCurrent` se déduit de `current`.
  - `GET /admin/consents/summary` : ❌ — aucun agrégat plateforme (le contrôleur n'expose que `POST /consents`, `GET /consents/me`, `GET /consents/{userId}`).
  - `GET /admin/consents/subjects` : ❌ (pas de liste des personnes ayant consenti ; l'alternative est une recherche utilisateurs d'identity-service, hors périmètre de ce service).

---

### Rétention — `/conformite/retention`

- **Fonctionnalités** :
  - Texte d'en-tête : un job quotidien (03:15 UTC) **efface l'IP et l'agent utilisateur** des lignes plus anciennes que la durée de leur compagnie ; les lignes ne sont jamais supprimées ; raccourcir une durée est **irréversible**.
  - Grille de cartes par compagnie : avatar + nom, badge de statut compagnie, durée effective en jours (« Durée personnalisée » / « Durée par défaut »), jauge (durée / 3650), repères « 90 j » / « 10 ans », « N à anonymiser sur M » (lignes d'audit plus vieilles que la durée dont l'IP est encore présente / total plus vieilles), bouton **Modifier**. Tri : nom de compagnie A→Z.
  - Filtres : `compagnie`, `duree` (Personnalisée / Par défaut), recherche `q` sur nom de compagnie. Bandeau : Compagnies, Durée personnalisée, Lignes anciennes (Σ `olderRows`), À anonymiser (Σ `pendingRows`).
  - Dialogue « Modifier la durée de rétention de <compagnie> » : champ numérique « Nouvelle durée (jours) » (pré-rempli avec la durée effective), **motif obligatoire** (≤500 car.), bouton destructif « Enregistrer la durée », avertissement d'irréversibilité.
  - Pagination : aucune (une carte par compagnie) → paginer.
- **Modèle de données attendu** (`RetentionRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| companyId / companyName | uuid / string | non | | company-service |
| status | CompanyStatus | non | statut compagnie | company-service (badge) |
| configuredDays | int | oui | 90–3650 ; nul = défaut | `Company.dataRetentionDays` |
| effectiveDays | int | non | `configuredDays ?? 730` | calculé |
| isCustom | bool | non | `configuredDays != null` | calculé |
| olderRows | int | non | | **calculé par l'API** : lignes de `audit_logs` de la compagnie avec `created_at < now − effectiveDays` |
| pendingRows | int | non | | parmi elles, celles dont `ip_address IS NOT NULL` (restent à anonymiser) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/retention/policies` | `companyId?`, `custom?`, `q?`, `page`, `size` | `RetentionRow[]` | `COMPLIANCE_READ` + plateforme |
| PATCH | `/companies/{id}` | `{dataRetentionDays: int (90..3650)}` (+ motif) | `CompanyResponse` | `COMPANY_MANAGE` + non restreint |

- **Règles métier (`retentionRepo.set`)** : ordre des gardes — compagnie existe → motif non vide → entier entre 90 et 3650 (« La durée doit être un nombre entier de jours compris entre 90 et 3650 ») → **différent de la durée effective courante** (« La durée de rétention est déjà de N jours »). Effet : écrit `dataRetentionDays` ; ligne d'audit `UPDATE`/`Company` (`{dataRetentionDays: "null"|ancien}` → `{dataRetentionDays: nouveau}`, source `company-service`) ; entrée d'activité avec le motif ; l'anonymisation réelle a lieu au prochain passage du job (non simulé). Défaut plateforme 730 j appliqué aux compagnies sans durée (et aux lignes sans compagnie). Le motif n'est pas stocké sur la compagnie.
- **État côté API** :
  - `PATCH /companies/{id}` : ⚠️ — ✅ `company-service/.../controller/CompanyController.java:58` (`@PatchMapping`), `UpdateCompanyRequest.dataRetentionDays` `@Min(90) @Max(3650)` ; le changement est audité (`audit.events`, `{dataRetentionDays}` avant/après) et publié sur `company.retention.changed` (topic compacté consommé par `audit-compliance-service`, table `company_retention_policies`). ❌ manquent : champ **motif** (le backoffice l'exige ; aucun champ de requête ne le porte) ; impossible de repasser à « par défaut » (`null` non accepté par PATCH).
  - `GET /admin/retention/policies` : ⚠️ — la durée configurée existe via `GET /companies` (`CompanyResponse.dataRetentionDays`, ✅ `CompanyController.java:72`) mais **`olderRows`/`pendingRows` n'existent nulle part** : `audit-compliance-service/.../retention/RetentionPurger.java` ne fait que anonymiser (compte retourné par exécution) ; aucun endpoint de comptage ni de « dernier passage du job ». Service recommandé : `audit-compliance-service` (il possède les lignes et la copie locale des politiques).

---

# PARTIE B — SUPERVISION

Éléments communs aux 5 onglets (`supervision/hub-page.tsx`) :

- Recherche globale `q` (80 car., insensible aux accents), compteurs par onglet recalculés pour `q` (Services = nb de services, API = nb d'endpoints agrégés, Incidents = nb de lignes, Usage = nb d'événements distincts).
- Filtres : `jours` (7/14/30, défaut 7, ignoré pour services et incidents), `compagnie` (API, usage, aperçu seulement), `service` (nom de service parmi ceux connus), `statut`, `gravite`.
- Tous les chiffres sont des **agrégats** ; jamais de ligne brute, d'adresse IP ni d'identifiant utilisateur.
- L'onglet Incidents porte un badge « urgent ».

---

### Aperçu supervision — `/supervision`

- **Fonctionnalités** (vue style Grafana, comparaison à la période précédente de même longueur) :
  - Filtres : période (7/14/30 j), compagnie.
  - 4 panneaux : **Disponibilité API** (% = `(1 − 5xx/total)·100`, delta vs période précédente en points, objectif 99,5 %), **Requêtes** (total, delta %, req/s moyen), **Latence moyenne** (ms, delta %, inversé = baisse favorable ; badge budget 500 ms), **Taux d'erreur 5xx** (%, delta).
  - « Trafic et erreurs » : requêtes par jour (ok/4xx/5xx) + taux d'erreur serveur (graphe) ; **jauge du budget d'erreur** (`budgetUsedPct = 5xx / (total·(1 − 0,995))·100`, plafonnée à 100 pour la jauge ; < 70 vert/ambre/rouge ≥ 100 « Budget épuisé : geler les mises en production ») ; compteurs 5xx total, pic de requêtes (jour max), latence max.
  - Panneau **Santé des services** : une ligne par service non obsolète avec frise des états (`StateTimeline`, jusqu'à 48 contrôles), % de disponibilité 24 h (rouge si < 99,5 %), état.
  - **Carte de chaleur** des erreurs 5xx : 10 endpoints les plus appelés × jours de la période (valeur = % de 5xx du jour, infobulle « date · N appels · x % de 5xx »).
  - Graphe flotte : latence moyenne/max et disponibilité de tous les services en ligne sur les 48 derniers contrôles.
  - Graphe « Latence de l'API » : moyenne quotidienne vs budget 500 ms.
  - Liens vers les onglets détaillés, incidents ouverts, etc.
- **Modèle de données attendu** (`MonOverview`) : `services{total, healthy, degraded, down, stale, availability24h, slowest}`, `api: ApiDash` (voir onglet API), `incidents: IncidentDash` (voir onglet incidents), `fleet: FleetPoint[]`, `metrics: ServiceMetric[]` (voir onglet services).
- **Endpoints requis** : composition de ceux des onglets ; endpoint d'agrégat recommandé :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/monitoring/overview` | `days` (7\|14\|30), `companyId?` | `MonOverview` | `MONITORING_READ` + plateforme |

- **Règles métier** : disponibilité API = part des appels hors 5xx ; budget d'erreur = 5xx consommés / 5xx autorisés par le SLO de 99,5 % ; période précédente = fenêtre immédiatement antérieure de même taille (delta `null` si aucune donnée) ; les services obsolètes (`stale`) sont exclus des moyennes de flotte.
- **État côté API** : ❌ endpoint d'aperçu absent ; tout se calcule à partir des endpoints des onglets (✅/⚠️/❌ selon eux). Percentiles p50/p95 : voir onglet Services ; **aucun p99 n'est affiché ni calculé nulle part dans le backoffice** (grep `p99` sans résultat).

---

### Services — `/supervision/services`

- **Fonctionnalités** :
  - Bandeau : Opérationnels (« sur N services »), Dégradés, En panne, **Obsolètes** (« plus sondés ») — un service obsolète est exclu des trois premiers.
  - Filtres : `service` (nom), `statut` (Opérationnels/Dégradés/En panne/Obsolètes), `q` (nom).
  - Une carte par service : nom, état (Opérationnel/Dégradé/En panne ; « obsolète » si `stale`), latence courante, **p50, p95, Max, Moy.** (sur les ≤48 derniers contrôles), disponibilité 24 h `uptimePercent` (vert si ≥ SLO 99,5 %, rouge sinon, « — » si aucun contrôle sur 24 h), frise des états des 48 derniers contrôles (chaque case = état + ms), compteurs de contrôles en panne/dégradés, dernier changement d'état (`lastChangeAt`), lien « N incident(s) ouvert(s) » → `/supervision/incidents?service=<nom>`, dernier contrôle (« il y a N min »).
  - Graphes : chronologie de flotte (moyenne/max + disponibilité) ; courbes de latence multi-séries (une série par service non obsolète, valeurs plafonnées à 2000 ms pour l'affichage).
  - Pas de pagination (≈10 services).
- **Modèle de données attendu** (`ServiceMetric` = `ServiceRow` + métriques) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| name | string | non | nom Eureka | |
| status | ServiceStatus | non | healthy\|degraded\|down | **dernier** statut observé |
| responseTimeMs | int | non | | dernier contrôle |
| errorRatePercent | decimal | oui | toujours `null` | jamais calculé par le backend |
| checkedAt | datetime | non | | dernier contrôle |
| stale | bool | non | | vrai si `checkedAt` plus vieux que 90 s (backend, vs horloge) — le frontend le calcule actuellement vs le contrôle le plus récent de tous les services |
| uptimePercent | decimal(1) | oui | 0–100 | % de contrôles `healthy` sur les 24 h ; nul si aucun |
| lastChangeAt | datetime | oui | | dernier changement de statut |
| openIncidents | int | non | | incidents non `RESOLVED` du service |
| p50 / p95 / max / avg | int | non | ms | calculés sur les ≤48 derniers contrôles : rang supérieur `ceil(p·n)` pour les percentiles |
| downChecks / degradedChecks | int | non | | sur les mêmes contrôles |
| sloOk | bool | non | `uptimePercent ≥ 99,5` | |
| states[] | {at, status, ms} | non | ≤48 | historique ordonné |

  `FleetPoint {at, avg, max, healthy, degraded, down, availability}` par instant, 48 derniers.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/health/services` | — | dernier contrôle par service | `MONITORING_READ` |
| GET | `/admin/health/services/summary` | `windowHours=24` | `[{name, uptimePercent, lastChangeAt, p50, p95, max, avg, downChecks, degradedChecks}]` | `MONITORING_READ` |
| GET | `/admin/health/services/{name}/history` | `limit=48` ou `from`,`to` | `[{at, status, responseTimeMs}]` | idem |
| GET | `/admin/health/fleet-timeline` | `limit=48` | `[FleetPoint]` | idem |

- **Règles métier** : `stale` = plus actualisé (service sorti d'Eureka) ; le statut n'est **jamais inventé** (dernière valeur observée conservée) ; `openIncidents` vient des incidents (jointure par `serviceName`) ; pas d'écriture.
- **État côté API** :
  - `GET /health/services` : ✅ `monitoring-service/.../controller/ServiceHealthController.java` (`@GetMapping("/health/services")`, DTO `ServiceHealthCheckResponse(serviceName, environment, status, responseTimeMs, errorRatePercent, checkedAt, stale)`) ; `MONITORING_READ` seul, sans garde plateforme (aucune donnée tenant). Seul écart : casse des statuts (`HEALTHY` vs `healthy`) et `stale` calculé par le backend (90 s, `app.monitoring.stale-after-ms`).
  - `/summary`, `/history`, `/fleet-timeline` : ❌ — le service ne stocke un historique (`monitoring.service_health_checks`, sondage toutes les 30 s) mais **aucun endpoint ne l'expose** ; percentiles, uptime et dernier changement sont à calculer côté `monitoring-service`. Attention : le seed du backoffice suppose 1 contrôle / 30 min (48 points = 24 h) alors que le poller réel produit 1 contrôle / 30 s ; l'API doit donc **ré-échantillonner** (buckets) plutôt que renvoyer les 48 derniers contrôles bruts (qui ne couvriraient que 24 minutes).

---

### Incidents (liste) — `/supervision/incidents`

- **Fonctionnalités** :
  - Bouton **Déclarer un incident** (en-tête de page) → dialogue : Titre (obligatoire, ≤200), Service (liste des services connus, ≤100), Gravité (Faible/Moyenne/Haute/Critique, défaut Moyenne), Portée (Une compagnie / Plusieurs compagnies / Toute la plateforme, défaut Toute la plateforme), Compagnie touchée (visible si « Une compagnie », liste des compagnies **actives**), Description (≤10 000). Message : « L'incident est créé « en investigation », détecté maintenant, à votre nom. »
  - Bandeau : Ouverts, Résolus, **MTTR** (délai moyen de résolution, `«—»` si aucun résolu), 30 derniers jours (incidents détectés).
  - Filtres : `service`, `statut`, `gravite`, `q` (code, titre, service, compagnie).
  - **Chronologie 90 jours** : une barre par incident (de la détection à la résolution ou à maintenant) positionnée sur 90 j, bornée.
  - Répartition par gravité (CRITICAL/HIGH/MEDIUM/LOW), top 5 services (nb d'incidents, ouverts), tuiles MTTR/Ouverts/Résolus/30 j.
  - Liste paginée **par 8** : code, titre, service, gravité, statut, portée, compagnie, détecté le, durée/résolu, indicateur de postmortem. Tri : `detectedAt` décroissant, départage `id`. Clic → fiche.
  - Statistiques (open/resolved/MTTR/bySeverity/byService/last30) **calculées sur l'ensemble des incidents, indépendamment des filtres et de `q`** ; la liste et la chronologie, elles, sont filtrées.
  - Vide : « Rien à afficher ici. » / « Aucun résultat dans « Incidents » ».
- **Modèle de données attendu** (`IncidentRow`, liste) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| incidentCode | string | non | `SYS-` + 8 car. A-Z0-9 | généré par le backend |
| title | string | non | ≤200 | |
| serviceName | string | non | ≤100 | texte libre côté backend |
| severity | IncidentSeverity | non | | |
| status | IncidentStatus | non | | |
| impactScope | ImpactScope | non | | |
| companyName | string | oui | | nom de `affectedCompanyId` (enrichissement) |
| detectedAt | datetime | non | | |
| resolvedAt | datetime | oui | posé ssi `RESOLVED` | |
| hasPostmortem | bool | non | `postmortemUrl != null` | la liste ne renvoie pas la description |

  Agrégats (`IncidentDash`) : `open`, `resolved`, `mttrMinutes` (moyenne de `resolvedAt − detectedAt` sur les résolus, arrondie), `last30`, `bySeverity[4]`, `byService[{name,count,open}]` trié décroissant, `timeline[{row,startPct,endPct}]` (calculable côté client).
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/incidents` | `status?`, `severity?`, `serviceName?`, **`q?`**, `page`, `size` | `Page<SystemIncident>` tri `detectedAt desc, id desc` | `MONITORING_READ` + plateforme |
| GET | `/admin/incidents/stats` | — | `{open, resolved, mttrMinutes, last30, bySeverity[], byService[]}` | idem |
| POST | `/incidents` | `{serviceName, severity, title, description?, impactScope, affectedCompanyId?, detectedAt}` | `201` incident (`INVESTIGATING`) | `MONITORING_MANAGE` + plateforme |

- **Règles métier (`declare`)** : gardes dans l'ordre — titre (non vide, ≤200), service (non vide, ≤100), gravité valide, portée valide, compagnie (obligatoire et existante si `SINGLE_COMPANY` ; **interdite** sinon), description ≤10 000. Statut initial `INVESTIGATING`, `detectedAt` = maintenant (le backend exige le champ `@NotNull detectedAt`, pas plus de 1 min dans le futur), `reportedBy` = admin courant, `resolvedAt` nul. Effets : ligne d'audit `CREATE`/`SystemIncident` (`{status, severity, impactScope}`) ; activité compagnie si concernée.
- **État côté API** :
  - `GET /incidents` : ⚠️ — ✅ `monitoring-service/.../controller/SystemIncidentController.java` (`@GetMapping`, filtres `status, severity, serviceName`, pagination `page/size`, tri fixe `detectedAt desc, id desc`, DTO `SystemIncidentResponse`). ❌ manquent : recherche `q`, `companyName`, agrégats.
  - `POST /incidents` : ✅ même contrôleur (`@PostMapping`, `CreateSystemIncidentRequest` : `serviceName @Size(100)`, `title @Size(200)`, `description @Size(10000)`, `impactScope`, `affectedCompanyId`, `detectedAt @NotNull`) ; règle SINGLE_COMPANY ⇔ compagnie appliquée par le service ; audit `CREATE` émis (`audit.events`). Le backoffice doit envoyer `detectedAt = now`.
  - `GET /admin/incidents/stats` : ❌ (MTTR, comptes par gravité/service, `last30` à calculer côté `monitoring-service`).

---

### Fiche d'un incident — `/supervision/incidents/[id]`

- **Fonctionnalités** :
  - Titre = titre de l'incident, sous-titre `<code> · <service>`, badges de statut et de gravité, **durée** (« Ouvert depuis » si non résolu, « Durée » si résolu ; format `N min`, `N h M min`, `N j N h`).
  - Actions : **Changer le statut** (visible si non résolu ; liste = les 3 autres statuts), **Renseigner / Modifier le postmortem** (toujours visible).
  - Blocs : Description (ou « Aucune description. »), note « Seul l'état courant est conservé : l'historique des changements de statut n'existe pas. » ; Postmortem (lien « Ouvrir le compte rendu » `target=_blank rel=noreferrer noopener`, ou « Aucun ») ; Détails : Service (lien vers `/supervision/services?service=…`), Portée, Compagnie touchée (lien `/compagnies/{id}`), Détecté le, Résolu le, Déclaré par.
  - Incident résolu : note « Incident résolu : seul le postmortem peut encore être renseigné ou modifié. » ; plus de bouton de statut.
  - 404 propre si inconnu.
- **Modèle de données attendu** (`SystemIncident`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id, incidentCode, serviceName, title | | non | | |
| description | string | oui | ≤10 000 | |
| severity, status, impactScope | enums | non | | |
| affectedCompanyId | uuid | oui | ssi `SINGLE_COMPANY` | |
| detectedAt | datetime | non | | |
| resolvedAt | datetime | oui | ssi `RESOLVED` | |
| reportedBy | string | non | libellé admin | le backend stocke `reportedByUserId` (uuid) → nom à résoudre |
| postmortemUrl | string | oui | `^https?://\S+$`, ≤2048 | |
| createdAt / updatedAt | datetime | non / oui | | |
| durationMinutes | int | non | `max(0, round((resolvedAt ?? now) − detectedAt) / 60 s)` | calculé |
| companyName | string | oui | | enrichissement |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/incidents/{id}` | id | `SystemIncidentResponse` | `MONITORING_READ` + plateforme |
| PATCH | `/incidents/{id}` | `{status?}` **ou** `{postmortemUrl?}` | incident mis à jour ; `409` transition/champ interdit ; `400` URL invalide ; `404` | `MONITORING_MANAGE` + plateforme |

- **Règles métier (workflow)** :
  - Statuts ordonnés `INVESTIGATING(0) → IDENTIFIED(1) → MONITORING(2) → RESOLVED(3)` ; **en avant uniquement, sauts autorisés** ; messages : « Un incident résolu ne peut plus changer de statut », « L'incident est déjà dans cet état », « Un incident ne peut pas revenir en arrière ». `RESOLVED` : `resolvedAt` posé, terminal.
  - Gardes de `advance` : incident existe → statut valide → pas résolu → différent → pas en arrière. Audit `UPDATE`/`SystemIncident` `{status}` avant → après ; activité compagnie.
  - Postmortem (`setPostmortem`) : modifiable **à tout statut, y compris après résolution** ; URL non vide, ≤2048 car., `http://` ou `https://` sans espace ; l'audit (`{postmortem:"false"}→{postmortem:"true"}`) n'est écrit **qu'à la première saisie** (une modification ultérieure n'écrit pas de ligne d'audit).
  - Une fois résolu, tout autre champ que `postmortemUrl` est refusé (`409`).
- **État côté API** :
  - `GET /incidents/{id}` : ✅ `SystemIncidentController.java` (`@GetMapping("/{id}")`) ; ⚠️ `reportedByUserId` à transformer en libellé, `companyName` à joindre.
  - `PATCH /incidents/{id}` : ✅ même fichier (`UpdateSystemIncidentRequest` : `status`, `severity`, `title`, `description`, `serviceName`, `impactScope`, `affectedCompanyId`, `postmortemUrl @Pattern ^https?://\S+$ @Size(2048)`), workflow avant seulement + restriction après résolution + verrou optimiste (`409` pour la requête perdante) conformes à la doc du service (CLAUDE.md, lot SystemIncident). Le backoffice n'utilise que `status` et `postmortemUrl`.

---

### Trafic API — `/supervision/api`

- **Fonctionnalités** :
  - Filtres : période (7/14/30 j), compagnie, `q` (endpoint ou méthode).
  - Bandeau : Requêtes (+ req/s), Latence moyenne (+ max), Erreurs client 4xx %, Erreurs serveur 5xx % (+ disponibilité `xx,xx %`).
  - Graphe « Requêtes par jour » ok/4xx/5xx ; **jauge de budget d'erreur** + liste (disponibilité mesurée, débit moyen, jour le plus chargé, appels lents > 500 ms en %) ; graphe de latence moyenne quotidienne vs budget ; **top consommateurs** (6 premiers : compagnie ou « Anonyme (public) », volume, part %, 5xx %, latence moyenne) ; répartition par méthode (`GET`/`POST`/`PATCH`).
  - Tableaux « Endpoints les plus lents » (top 5 par latence moyenne) et « Endpoints les plus en erreur » (top 5 par % de 5xx, seulement > 0).
  - Tableau principal par endpoint, **paginé par 12** : méthode, endpoint, volume, part %, latence moy./max, 4xx %, 5xx %, mini-courbe quotidienne (sparkline), variation % vs période précédente (`deltaPct`, nul si aucune donnée précédente), indicateur « lent » si moy. > 500 ms. Tri : volume décroissant puis endpoint.
  - **Deux cartes de chaleur** (10 endpoints × jours) : une sur le % de 5xx, une sur le volume.
  - Vide : « Rien à afficher ici. » si aucun endpoint dans la fenêtre.
- **Modèle de données attendu** (`ApiDash`, tout dérivé de lignes jour × endpoint × méthode × classe de statut [× compagnie]) :

Ligne source (`ApiUsageRow`) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| day | date (UTC) | non | |
| companyId | uuid | oui | nul = appel anonyme/public ou utilisateur sans compagnie |
| endpoint | string | non | chemin **normalisé** (`/bookings/{id}/payment`) |
| method | string | non | `GET`/`POST`/`PATCH` (+ autres) |
| statusClass | `2xx`\|`4xx`\|`5xx` | non | |
| count | int | non | |
| avgResponseMs | decimal | non | |
| maxResponseMs | int | non | |

Agrégats dérivés (calculables côté client à partir des lignes, **moyenne pondérée par `count`**) : `totals{count, avgResponseMs, maxResponseMs, clientErrorPercent (4xx), serverErrorPercent (5xx), rps = count/(jours·86400), availability = (1−5xx/count)·100, budgetUsedPct = round(5xx/(count·0,005)·100), slowShare = % d'appels dont avgResponseMs>500}`, `prev{count, avgMs, err5, availability}`, `byDay[{day,total,ok,c4,c5,err4,err5,avgMs,maxMs}]`, `endpoints[{method,endpoint,count,share,avgMs,maxMs,err4,err5,spark[],deltaPct,slow}]`, `heat[10 × jours]`, `consumers[{companyId,name,count,err5,avgMs,share}]`, `methods[{method,count}]`, `peak`. **Latence : seulement moyenne et maximum** — ni p50, ni p95, ni p99 dans cet écran (percentiles d'API non utilisés).
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/usage/api` | `from`, `to` (≤93 j), `companyId?`, `endpoint?`, `method?` | lignes `{day, endpoint, method, statusClass, count, avgResponseMs, maxResponseMs}` | `MONITORING_READ` + plateforme |
| GET | `/admin/usage/api/consumers` | `from`, `to`, `companyId?` | `[{companyId\|null, count, count5xx, avgResponseMs}]` | idem |

  La période précédente s'obtient avec un second appel `/usage/api` (60 jours max ≤ 93 pour la fenêtre 30 j). Heatmap, sparkline, top lents/erreurs, par méthode : dérivables des mêmes lignes.
- **Règles métier** : budget d'erreur = consommation du SLO 99,5 % ; jauge plafonnée à 100 % ; seuil « lent » 500 ms ; période précédente = fenêtre antérieure de même taille ; recherche `q` filtre les lignes avant agrégation. Le backend ne renvoie jamais IP ni identifiant utilisateur.
- **État côté API** :
  - `GET /usage/api` : ⚠️ — ✅ `monitoring-service/.../controller/ApiUsageController.java` (`@GetMapping("/usage/api")`, `from`/`to` obligatoires, plage ≤ 93 j, `companyId`, `endpoint`, `method`, DTO `ApiUsageLine(day, endpoint, method, statusClass, count, avgResponseMs, maxResponseMs)`, agrégation `GROUP BY jour, endpoint, méthode, classe` dans `ApiRequestLogStore.java:82`). ❌ manquent : `companyId` **dans les lignes** (impossible de produire le panneau « top consommateurs » ; le filtre `companyId` existe mais pas la ventilation), pas de `q` serveur (le filtre `endpoint` existe, comportement exact/partiel à vérifier).
  - `GET /admin/usage/api/consumers` : ❌ (ou ajouter `companyId` aux lignes).
  - Alimentation : ✅ le Gateway publie `api.request.logged` (`gateway`, `ApiRequestLogFilter`), consommé et stocké (TimescaleDB, rétention 90 j par défaut).

---

### Usage produit — `/supervision/usage`

- **Fonctionnalités** :
  - Filtres : période (7/14/30 j), compagnie, `q` (nom d'événement).
  - Panneaux : **Événements** (total, delta % vs période précédente, sparkline quotidienne), **Utilisateurs distincts** (total sur la période, delta %), courbes/aires par catégorie et par jour (`booking`, `parcel`, `customer`), tableau par événement : nom, catégorie, volume, jours actifs (`activeDays`), utilisateurs distincts ; tri volume décroissant puis nom.
  - Mention : « Un événement de colis ne porte pas d'utilisateur » (les colis n'ont pas de `user_id`).
  - Vide : message générique si aucun événement.
- **Modèle de données attendu** (`UsageSummary`/`UsageDash`) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| days, from, to | | non | fenêtre |
| totals.events | int | non | |
| totals.distinctUsers | int | non | **distincts sur toute la fenêtre** (non additionnable jour par jour) |
| byDay[] | {day, booking, parcel, customer} | non | comptes par catégorie |
| byEvent[] | {eventName, eventCategory, count, activeDays, distinctUsers} | non | `distinctUsers` = distincts sur la fenêtre pour cet événement ; `activeDays` = nb de jours avec ≥1 occurrence |
| deltaEvents / deltaUsers | int\|null | oui | `(cur−prev)/prev·100` arrondi, nul si prev = 0 |
| prev | UsageSummary | non | même calcul sur la fenêtre antérieure |

  Noms d'événements observés dans le seed : `booking_created`, `payment_completed`, `ticket_issued`, `parcel_created`, `parcel_status_changed`, `feedback_responded` (catégories `booking`/`parcel`/`customer`).
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/analytics/events/counts` | `from`, `to` (≤366 j), `eventName?`, `eventCategory?`, `companyId?` | `[{day, eventName, eventCategory, count, distinctUsers}]` | `MONITORING_READ` + plateforme |
| GET | `/admin/analytics/events/summary` | `from`, `to`, `companyId?` | `{distinctUsers (fenêtre), byEvent[{eventName, distinctUsers, activeDays}]}` | idem |

- **Règles métier** : jamais de ligne brute ni d'identifiant ; le `user_id` des réservations est le **créateur** de la réservation (souvent un agent), pas le passager.
- **État côté API** :
  - `GET /analytics/events/counts` : ⚠️ — ✅ `monitoring-service/.../controller/AnalyticsController.java` (`@GetMapping("/analytics/events/counts")`, DTO `AnalyticsCount(day, eventName, eventCategory, count, distinctUsers)`, `GROUP BY jour, événement, catégorie`, plage ≤366 j, filtre `companyId`). ❌ `distinctUsers` y est **par jour** : on ne peut pas en déduire les distincts sur la fenêtre ni par événement sur la fenêtre ; `activeDays` se déduit du nombre de jours présents. Alimentation : ✅ consommateur Kafka sur 14 topics métier (liste blanche de champs).
  - `…/events/summary` : ❌.

---

## Actions d'écriture du périmètre (récapitulatif des server actions)

| Server action | Fichier | Appelle | Garde / motif |
|---|---|---|---|
| `startDataSubjectRequest(id)` | `conformite/actions.ts` | PATCH demande → `IN_PROGRESS` | aucune note |
| `completeDataSubjectRequest(id, notes)` | idem | PATCH → `COMPLETED` | notes obligatoires (≤500) |
| `rejectDataSubjectRequest(id, notes)` | idem | PATCH → `REJECTED` | notes obligatoires (≤500) |
| `setCompanyRetention(companyId, days, reason)` | idem | PATCH `/companies/{id}` | motif obligatoire, 90–3650, ≠ effectif |
| `consultUserConsents(userId, accessReason)` | idem | GET `/consents/{userId}` | motif d'accès valide |
| `declareIncident(input)` | `supervision/actions.ts` | POST `/incidents` | cf. règles |
| `advanceIncident(id, target)` | idem | PATCH `/incidents/{id}` `{status}` | avant seulement |
| `setIncidentPostmortem(id, url)` | idem | PATCH `/incidents/{id}` `{postmortemUrl}` | http(s), ≤2048 |

Toutes exigent une session valide (`requireSession`) ; l'acteur (`sub` de la session) est journalisé. Effet transverse du backoffice actuel : chaque action ajoute des lignes dans le journal d'audit/d'accès locaux — avec l'API réelle ces lignes sont produites **par les services** (audit-compliance, company, monitoring) via `audit.events`, le backoffice ne doit pas les écrire.

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| `GET /audit-logs/{id}` | audit-compliance-service | haute | fiche d'une ligne ; le DTO list contient déjà tout |
| Recherche `q` + noms enrichis (`actorLabel`, `companyName`) sur `/audit-logs`, `/data-access-logs`, `/data-subject-requests`, `/incidents` | audit-compliance-service / monitoring-service (+ BFF pour la jointure identity/company) | haute | l'UI cherche sur des noms que les services ne stockent pas |
| Filtres `accessType`, `dataCategory`, `accessReason` sur `/data-access-logs` | audit-compliance-service | haute | filtres de l'onglet |
| Filtres `requestType`, `overdue` + tri « ouvertes par échéance » sur `/data-subject-requests` | audit-compliance-service | haute | ordre d'affichage de la grille |
| `GET /admin/audit-logs/stats` | audit-compliance-service | moyenne | bandeau + aperçu (total, last7, byAction) |
| `GET /admin/data-access-logs/stats` | audit-compliance-service | moyenne | idem |
| `GET /admin/data-subject-requests/stats` | audit-compliance-service | haute | ouvertes/en retard/sous 7 j/closes, sans effet de bord (la liste staff trace 1 accès par ligne) |
| `GET /admin/consents/summary` | audit-compliance-service | haute | cartes par type/portée, aucun agrégat plateforme n'existe |
| `GET /admin/consents/subjects` | audit-compliance-service (ou identity-service) | basse | liste déroulante du lookup |
| `GET /admin/retention/policies` avec `olderRows`/`pendingRows` | audit-compliance-service | haute | compteurs de lignes à anonymiser inexistants |
| Motif sur `PATCH /companies/{id}` + remise à `null` (« par défaut ») | company-service | moyenne | l'UI exige un motif ; le PATCH ne peut pas effacer la durée |
| `GET /admin/compliance/overview` | audit-compliance-service | moyenne | agrégat unique pour l'aperçu |
| `GET /admin/health/services/summary` (uptime 24 h, p50/p95/max/avg, lastChangeAt) | monitoring-service | haute | métriques de carte de service |
| `GET /admin/health/services/{name}/history` | monitoring-service | haute | frise de 48 états ; ré-échantillonnage nécessaire (poller 30 s vs seed 30 min) |
| `GET /admin/health/fleet-timeline` | monitoring-service | moyenne | graphe flotte et disponibilité |
| `GET /admin/incidents/stats` (MTTR, open/resolved, bySeverity, byService, last30) | monitoring-service | haute | bandeau + panneaux incidents |
| `companyId` dans les lignes de `/usage/api` ou `GET /admin/usage/api/consumers` | monitoring-service | moyenne | panneau « top consommateurs » |
| `distinctUsers` sur la fenêtre (total et par événement) | monitoring-service | moyenne | `AnalyticsCount.distinctUsers` est par jour |
| `GET /admin/monitoring/overview` | monitoring-service | basse | agrégat unique de l'aperçu (sinon composition) |
| Mapping casse des statuts (`HEALTHY`→`healthy`) et résolution `reportedByUserId`/`handledByUserId` → libellé | BFF backoffice | moyenne | |
| Percentiles d'API (p50/p95/p99) | monitoring-service | basse | non utilisés par l'UI actuelle ; exigeraient histogrammes dans `api_request_logs` |

## Questions ouvertes

1. **Vue plateforme vs scopée compagnie** : tous les endpoints existants exigent déjà « appelant plateforme » (aucun claim `company_id` + `RBAC_MANAGE`). Faut-il un préfixe `/admin/...` distinct pour les nouveaux endpoints, ou rester au niveau racine du service comme les existants ? Et un représentant de compagnie (rôle `MANAGER`) doit-il un jour voir ses propres journaux/consentements (« preuve de consentement » d'une compagnie, dette ouverte) ?
2. **Troncature des IP** : le backoffice tronque en `/24` côté serveur Next. L'API renvoie l'IP complète (`AuditLogResponse.ipAddress`). Doit-on tronquer côté API (donnée minimale par défaut), côté BFF, ou exposer l'IP complète sous une permission renforcée ? Rappel : l'IP est falsifiable par un accès direct au Gateway et anonymisée après rétention.
3. **Jointures de noms** (acteur, personne concernée, demandeur, compagnie, `reportedBy`, `handledBy`) : `audit-compliance-service` et `monitoring-service` n'ont que des UUID (règle « pas de FK / pas de copie »). Le BFF fait-il N appels identity/company (cache) ou les services dénormalisent-ils un libellé ? Impact direct sur la recherche `q` (qui porte sur des noms) : recherche côté serveur impossible sans libellé indexé.
4. **Lecture du journal et traçabilité** : consulter une fiche d'audit, la liste d'accès ou les consentements agrégés doit-il écrire un `DataAccessLog` ? Aujourd'hui seule la lecture d'une demande et des consentements d'un utilisateur le fait ; la liste staff écrit une ligne **par demande renvoyée** (volume), ce qui rend risqué l'usage de cette liste pour calculer des stats.
5. **Backoffice comme producteur d'audit** : le backoffice écrit lui-même des lignes (`UPDATE`/`DataSubjectRequest`, `Company`, `SystemIncident`) avec un acteur « libellé admin ». Avec l'API réelle, `actorUserId` sera l'utilisateur plateforme qui a appelé ; faut-il un `actorType` dédié et un identifiant d'admin backoffice (les `backofficeAdmins` sont aujourd'hui locaux au backoffice) ?
6. **Délai DSR** : `dueDate` est figé à 30 j à la création (RGPD permet une prolongation à 3 mois) ; `daysLeft`/`overdue` calculés côté client ou serveur ? Fuseau (jours UTC) ? L'alerte de retard publiée par le backend (`DataSubjectRequestOverdue`) doit-elle alimenter un indicateur du backoffice ?
7. **Notes de clôture** : backend n'impose `resolutionNotes` que pour `REJECTED`, le backoffice aussi pour `COMPLETED` ; aligner où ? Les notes sont visibles du demandeur côté API self-service (décision documentée du service).
8. **Rétention** : le motif de changement de durée n'est stocké nulle part (seulement journal d'activité local) ; faut-il un champ `reason` sur la ligne d'audit/`company.retention.changed` ? Faut-il permettre de revenir au défaut (`null`) ? Les compteurs `olderRows`/`pendingRows` doivent-ils inclure `data_access_logs` (le backoffice ne compte que `audit_logs`) ? Quid d'un affichage « dernier passage du job » ?
9. **Consentements** : le backoffice compte les « états courants » par (utilisateur, type, compagnie) ; confirmer que le backend peut calculer ce comptage à grande échelle (index sur `(user_id, consent_type, company_id, created_at desc)` existe). Faut-il exposer `current[]` agrégé par compagnie pour le futur « preuve de consentement » ?
10. **Santé des services** : cadence (backend 30 s, seed 30 min) — quelle fenêtre et quel pas pour « 48 points » ? `errorRatePercent` reste `null` (jamais calculé) : à supprimer de l'UI ou à calculer ? Le Gateway est exclu du sondage (exclusion `gateway`) — l'écran doit-il l'afficher autrement ? `stale` : le frontend le calcule vs le contrôle le plus récent de la flotte, le backend vs l'horloge — quelle règle fait foi ?
11. **Incidents** : `affectedCompanyId` limité aux compagnies actives dans le formulaire ; `serviceName` est un texte libre côté backend (l'UI propose la liste des services sondés) — restreindre côté API ? Pas d'historique de statut (« seul l'état courant est conservé ») : acceptable pour le postmortem ?
12. **Agrégats API** : lignes jour × endpoint avec moyenne pondérée — la moyenne par ligne est-elle bien celle des appels du jour (et non une moyenne de moyennes de lots) ? Les percentiles de latence (p95/p99) sont-ils souhaités pour la supervision API ? Le filtre `endpoint` de `/usage/api` est-il exact ou partiel (recherche `q` de l'UI porte sur endpoint **ou** méthode) ? Les méthodes autres que GET/POST/PATCH (PUT/DELETE) doivent-elles apparaître (le type frontend les exclut) ?
13. **Usage produit** : la catégorie (`booking`/`parcel`/`customer`) vient-elle du backend (`eventCategory`) ou est-elle déduite du nom ? Les événements RH (`employee_*`) et marketing existent côté backend mais pas dans l'UI — à inclure (nouvelle catégorie) ? Durée de conservation : 395 j côté backend vs fenêtre 30 j max côté UI.
14. **Pagination** : toutes les listes du backoffice sont aujourd'hui non paginées côté UI (journal, accès, demandes, rétention) ou paginées côté serveur Next (API 12/page, incidents 8/page). Taille de page cible et plafond (`size ≤ 100` côté services) ?
