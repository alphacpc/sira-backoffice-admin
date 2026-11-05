# 07 — Communication

## Vue d'ensemble

Module `/communication` du backoffice : un hub à 6 onglets (Aperçu, Notifications, Campagnes, Messages, Segments, Programmations) et 2 fiches de détail (notification, campagne). Il donne à l'équipe Sira une **vue plateforme multi-compagnies** (aucun tenant) de l'envoi de notifications (`notification-service`) et du marketing des compagnies (`customer-service`). Écritures : annuler une campagne, annuler une programmation (motif obligatoire), révéler le contenu d'une notification (donnée personnelle, journalisée). Tout le reste est en lecture.

Constat global : les 4 ressources marketing existent côté `customer-service` mais en listes paginées **sans filtre ni jointure** ; les notifications n'ont **aucune** liste plateforme (la seule liste exige `entityType`+`entityId`). Le backoffice charge aujourd'hui des jeux complets en mémoire (store/seed) puis filtre, cherche, compte et agrège côté serveur Next.js : l'API doit fournir pagination, filtres, recherche et agrégats serveur.

Préfixe proposé : `/admin/communication/...` (agrégats, vues enrichies) ; les ressources de base existantes (`/marketing-*`, `/notifications`) restent la source, et le Gateway doit exposer `/admin/**` avec la règle plateforme (aucun claim `company_id` + `RBAC_MANAGE`, cf. `TenantAccessGuard`).

Constantes de référence du code (à reprendre telles quelles) :
- Canaux `NotificationChannel` (UI) : `EMAIL`, `SMS`, `IN_APP`, `PUSH`, `WHATSAPP` — **le backend n'a que `EMAIL`, `SMS`, `IN_APP`** (`notification-service/.../enums/NotificationChannel.java`, `customer-service/.../enums/MarketingChannel.java`).
- `NotificationStatus` : `PENDING`, `SENT`, `FAILED`.
- `CampaignObjective` : `ACQUISITION`, `RETENTION`, `PROMOTION`, `REACTIVATION`.
- `CampaignStatus` : `DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `CANCELLED`.
- `MarketingMessageStatus` : `DRAFT`, `APPROVED`, `SENT`.
- `ScheduleStatus` : `PENDING`, `SENT`, `FAILED`, `CANCELLED`.
- `currency` : texte (`XOF`/`EUR`/`USD` côté backend, `CurrencyCode`).
- Types de notification connus (libellés `labels.ts`) : `booking_confirmed`, `booking_cancelled`, `payment_completed`, `parcel_created`, `parcel_status_pending|in_transit|at_hub|delivered|cancelled|returned|lost`, `feedback_response`, `marketing_message` ; un type inconnu est affiché tel quel.
- `entityType` résolus en lien : `booking`, `parcel`, `feedback`, `marketing_schedule`.

---

### Hub — Aperçu — `/communication`

- **Fonctionnalités**
  - Barre de recherche globale `q` (80 car. max, insensible casse/accents) et filtre « Compagnie » (liste de toutes les compagnies, recherchable) conservés d'un onglet à l'autre via l'URL (`q`, `compagnie`, `statut`, `canal`).
  - Onglets avec compteurs (hors Aperçu) : Notifications, Campagnes, Messages, Segments, Programmations ; ces compteurs tiennent compte de `q` et `compagnie` (pas de `statut`/`canal`).
  - Quand `q` est saisi : phrase « Résultats pour … : N au total » et, pour un onglet vide, liens vers les autres onglets qui ont des correspondances.
  - Onglet Aperçu : 4 tuiles (Notifications = total + envoyées ; Taux de livraison = `sent/(sent+failed)` arrondi en %, « — » si 0 ; Campagnes = total + nombre `RUNNING` ; Audience éligible = somme des éligibles des segments), pipeline des campagnes (5 compteurs par statut), envoyées/en attente/échouées, pastilles par canal, « Prochains envois » (5 programmations `PENDING` les plus proches, ordre croissant, ou « Aucun envoi en attente. »), donut des canaux, « Campagnes les plus diffusées » (top 5 par destinataires cumulés des programmations `SENT`, ou « Aucun envoi terminé. »), « Échecs récents » (4 notifications `FAILED`, ou « Aucun échec d'envoi. ») avec lien vers `/communication/notifications?statut=FAILED`.
- **Modèle de données attendu** (`CommOverview`, tout calculé par l'API, filtré par `companyId` optionnel)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| notifications.sent / failed / pending | int | non | ≥ 0 | comptage `notification-service` |
| notifications.successRate | int (0–100) | oui | `null` si sent+failed = 0 | à calculer API |
| notifications.byChannel[] | {channel, value} | non | tri décroissant par value | comptage par canal |
| notifications.failures[] | NotificationRow (cf. Notifications) | non | 4 plus récentes `FAILED` | |
| pipeline[] | {status, value} | non | 5 entrées dans l'ordre DRAFT, SCHEDULED, RUNNING, COMPLETED, CANCELLED (y compris à 0) | `customer-service` |
| upcoming[] | ScheduleRow | non | 5 max, `PENDING`, `scheduledAt` croissant | |
| topCampaigns[] | {id, name, companyName, recipients, sends} | non | 5 max, programmations `SENT` ; recipients = Σ `recipientsCount`, sends = nb de programmations, tri par recipients décroissant | |
| audience | int | non | Σ `eligibleNow` de tous les segments | calcul inter-services (cf. Segments) |
| campaigns | int | non | nb total de campagnes | |
| counts | {notifications, campagnes, messages, segments, programmations} | non | compteurs d'onglets après `q`+`companyId` | |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/communication/overview` | `companyId?` | — | `CommOverview` ci-dessus | `NOTIFICATION_MANAGE` + `MARKETING_MANAGE`, appelant plateforme |
| GET | `/admin/communication/counts` | `q?`, `companyId?` | — | `{notifications, campagnes, messages, segments, programmations}` | idem |

- **Règles métier** : lecture seule ; `q` est un filtre texte sur les champs listés dans chaque onglet ; les stats/pipeline sont **toujours sur l'ensemble** (non filtrés par `q`/`statut`/`canal`).
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/communication/overview` | ❌ manquant. Données éparses sur deux services (agrégation `notification-service` pour la partie notifications, `customer-service` pour campagnes/programmations). Recommandé : un BFF/agrégateur plateforme (ou deux endpoints d'agrégats, un par service, composés par le Gateway/BFF). |
| `GET /admin/communication/counts` | ❌ manquant ; faisable en lisant `totalElements` des 5 listes filtrées (si elles supportent `q`/`companyId`). |

---

### Notifications (liste) — `/communication/notifications`

- **Fonctionnalités**
  - Bandeau de 4 statistiques (masqué quand `q` est saisi) : Notifications (total), Envoyées, Échouées, En attente — calculées sur la compagnie sélectionnée, sans `q`/`statut`/`canal`.
  - Filtres : Compagnie, **Canal** (Tous, E-mail, SMS, Dans l'application, Push, WhatsApp), **Statut** (Toutes, En attente, Envoyées, Échouées) ; recherche `q` sur code, destinataire (libellé), compagnie, type.
  - Tableau (DataTable, tri/pagination client sur le jeu complet → l'API doit paginer et trier côté serveur) : colonnes Notification (code mono + libellé du type), Destinataire (libellé + compagnie), Canal (puce icône), Statut (pastille ; icône d'alerte si `FAILED`), Lue (coche pleine/cercle vide), Envoyée (= `createdAt`, date-heure). Tri par défaut : `createdAt` décroissant, départage `id`. Clic de ligne → fiche. État vide : « Aucune notification pour ces critères. ».
  - Le contenu du message n'est jamais présent dans la liste.
- **Modèle de données attendu** (`NotificationRow`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | `Notification.id` |
| notificationCode | string | non | code court (mono) | existe |
| companyId | uuid | non | | existe |
| companyName | string | non | | à joindre (`company-service`), « — » si inconnue |
| notificationType | string | non | cf. types connus | existe |
| entityType | string | non | `booking`/`parcel`/`feedback`/`marketing_schedule`/autre | existe |
| recipientLabel | string | non | nom d'affichage du compte `sentTo` ; « Destinataire sans compte » si `sentTo` nul ; « Compte supprimé » si introuvable | `sentTo` existe ; nom à joindre (`identity-service`) ; **jamais l'identifiant ni le contact** dans la liste |
| channel | enum | non | cf. canaux | existe |
| status | enum | non | PENDING/SENT/FAILED | existe |
| read | bool | non | | existe |
| createdAt | ISO-8601 | non | | existe |
| sentAt | ISO-8601 | oui | | existe |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/notifications` | `companyId?`, `channel?`, `status?`, `q?`, `page`, `size`, `sort` (défaut `createdAt,desc` puis `id`) | `Page<NotificationRow>` | `NOTIFICATION_MANAGE`, appelant plateforme |
| GET | `/admin/notifications/stats` | `companyId?` | `{sent, failed, pending}` | idem |

- **Règles métier** : `q` = recherche sans accents/casse sur `notificationCode`, `recipientLabel`, `companyName`, `notificationType` (le type sur sa valeur technique ou son libellé : à trancher). Pas d'écriture. L'API ne doit pas renvoyer `messageContent` ni `sentTo` dans la liste.
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/notifications` | ⚠️ partiel. `GET /notifications?entityType=&entityId=&page&size` existe (`notification-service/.../controller/NotificationController.java`), `NOTIFICATION_MANAGE`, non restreint = toutes compagnies **mais pour une entité donnée uniquement** (paramètres obligatoires) ; retourne `messageContent` et `sentTo` en clair. Manquent : liste sans entité, filtres `companyId`/`channel`/`status`/`q`, tri, `companyName`, `recipientLabel`, projection sans contenu. Service : `notification-service` (le repository a déjà `JpaSpecificationExecutor`). |
| `GET /admin/notifications/stats` | ❌ manquant (`notification-service`). |

---

### Fiche notification — `/communication/notifications/[id]`

- **Fonctionnalités**
  - Titre « Notification {code} », sous-titre « {libellé du type} · {compagnie} », pastille de statut (`PENDING` En attente / `SENT` Envoyée / `FAILED` Échouée). `404` dédié si l'id est inconnu.
  - Carte « Envoi » : Canal (libellé), Statut, **Tentatives de renvoi** (`retryCount`), Lue (Oui/Non), Créée le, Envoyée le (« — » si nul), Compagnie (lien `/compagnies/{id}`), Destinataire (lien `/utilisateurs/{id}` si compte, sinon texte brut « Destinataire sans compte »/« Compte supprimé »), Objet lié (lien vers réservation `/ventes/reservations/{id}` libellé = `bookingCode` ; colis `/colis/{id}` libellé = `parcelCode` ; avis `/clients/avis/{id}` libellé = titre ; programmation `/communication/campagnes/{campaignId}` libellé = nom de campagne ; « — » sinon).
  - Carte « Contenu » : masqué par défaut avec la mention « donnée personnelle … son affichage est journalisé » ; bouton « Afficher le contenu » → appelle l'action serveur, journalise la révélation, affiche le texte ; bouton « Masquer le contenu » ; erreur affichée en `role="alert"`.
- **Modèle de données attendu** (`NotificationDetail`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| notification.id, companyId, entityType, entityId, notificationCode, notificationType, channel, status, read, createdAt, sentAt | cf. liste | | | existent |
| notification.sentTo | uuid | oui | `null` pour le SMS d'un destinataire de colis sans compte | existe |
| notification.retryCount | int | non | ≥ 0 | existe en base (`retry_count`), **absent du DTO `NotificationResponse`** |
| notification.scheduledAt | ISO-8601 | oui | | colonne `scheduled_at` du dbml ; absent du DTO ; affiché nulle part aujourd'hui mais présent dans le type |
| companyName | string | non | | à joindre |
| recipientName | string | non | cf. `recipientLabel` | à joindre |
| recipientUserId | uuid | oui | = `sentTo` | |
| entity | {href, label} | oui | libellé de l'objet lié | l'API doit renvoyer `entityLabel` (booking code / parcel code / titre d'avis / nom de campagne) ou le client résout via les autres services |
| messageContent | string | non | **non renvoyé par la fiche** ; uniquement via l'endpoint de révélation | donnée personnelle |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/notifications/{id}` | path `id` | `NotificationDetail` sans `messageContent` ; `404` si inconnu | `NOTIFICATION_MANAGE`, plateforme |
| POST | `/admin/notifications/{id}/reveal-content` | path `id` | `{ "messageContent": "…" }` ; écrit une ligne `DataAccessLog` (acteur = `userId` du JWT, `data_subject_id` = `sentTo`, catégorie `CONTACT`/à créer, motif, `VIEW`) et une activité compagnie « Donnée personnelle révélée : contenu de la notification {code} » ; `404` si inconnu | `NOTIFICATION_MANAGE` + `COMPLIANCE_READ`, plateforme |

- **Règles métier** : la révélation est **journalisée avant** de rendre le contenu ; le contenu n'est jamais écrit dans le journal ; chaque clic « Afficher » journalise (pas de cache côté serveur). Aucune action d'écriture sur la notification (pas de « marquer lue » côté backoffice).
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/notifications/{id}` | ❌ manquant. Il n'existe **aucun** `GET /notifications/{id}` ; seuls `GET /notifications` (par entité) et `PATCH /notifications/{id}/read` existent (`NotificationController.java`). `retryCount` et `scheduledAt` ne sont pas dans `NotificationResponse`. |
| `POST …/reveal-content` | ❌ manquant. Aujourd'hui `messageContent` est renvoyé en clair par la liste, sans journal. `DataAccessLog` existe dans `audit-compliance-service` (table + enums `DataCategory`/`AccessReason`/`AccessType`, écrite directement par ce service) mais **aucun producteur externe** : il faudrait soit un événement `audit.events`/`DataAccess` dédié, soit un endpoint d'ingestion d'accès ; le contrat `audit.events` actuel ne le porte pas. |

---

### Campagnes (liste) — `/communication/campagnes`

- **Fonctionnalités**
  - Bandeau de 4 stats (masqué si `q`) : Campagnes (total), En cours (`RUNNING`), Programmées (`SCHEDULED`), Terminées (`COMPLETED`), sur la compagnie sélectionnée.
  - Filtres : Compagnie ; Statut (Toutes, Brouillons, Programmées, En cours, Terminées, Annulées) ; recherche `q` sur nom, compagnie, objectif.
  - Grille de cartes, tri `createdAt` décroissant (départage `id`) : nom, compagnie, pastille de statut (Brouillon/Programmée/En cours/Terminée/Annulée), objectif (Acquisition/Fidélisation/Promotion/Réactivation), barre de progression entre `startDate` et `endDate` (100 % si `COMPLETED`, sinon calculée à l'instant), budget formaté avec devise, nombre de programmations. Carte cliquable → fiche. États vides : « Rien à afficher ici. » / « Aucun résultat dans « Campagnes » » avec renvois vers les autres onglets.
- **Modèle de données attendu** (`CampaignRow`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | `MarketingCampaignResponse.id` |
| companyId | uuid | non | | existe |
| companyName | string | non | | à joindre (`company-service`) |
| name | string | non | ≤ 150 | existe |
| objective | enum | non | ACQUISITION/RETENTION/PROMOTION/REACTIVATION | existe |
| status | enum | non | CampaignStatus | existe |
| startDate, endDate | ISO-8601 (dates affichées jour) | non côté UI | | `Instant` **nullable** côté backend (`CreateMarketingCampaignRequest`) : l'UI suppose non nul pour la barre de progression → décider (cf. Questions) |
| budget | number | non côté UI | `NUMERIC(…,2)` ≥ 0 | nullable côté backend (budget et devise ensemble ou aucun) |
| currency | string | non côté UI | XOF/EUR/USD | idem |
| scheduleCount | int | non | nb de programmations de la campagne, tous statuts | **calculé** (agrégat à fournir) |
| createdAt | ISO-8601 | non | | existe |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/marketing-campaigns` (ou `/marketing-campaigns` enrichi) | `companyId?`, `status?`, `q?`, `page`, `size`, `sort` (défaut `createdAt,desc`) | `Page<CampaignRow>` | `MARKETING_MANAGE`, plateforme |
| GET | `/admin/marketing-campaigns/stats` | `companyId?` | `{total, running, scheduled, completed}` (ou comptes par statut) | idem |

- **Règles métier** : lecture seule dans la liste ; pas de création/édition depuis le backoffice (les compagnies créent via leur propre outil).
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/marketing-campaigns` | ⚠️ partiel. `GET /marketing-campaigns?page&size` existe (`customer-service/.../controller/MarketingCampaignController.java`, `MARKETING_MANAGE`, non restreint = toutes compagnies, `PageRequests` : tri fixé `createdAt,id` décroissants — vérifié pour la boîte de réception, repris par les repositories). Manquent : filtres `companyId`/`status`/`q`, `companyName`, `scheduleCount`. |
| stats | ❌ manquant (comptes par statut ; `customer-service`). |

---

### Fiche campagne — `/communication/campagnes/[id]` (query `?onglet=`)

- **Fonctionnalités**
  - Titre = nom, sous-titre = compagnie, pastille de statut ; bouton « Annuler la campagne » (visible tant que le statut n'est pas `CANCELLED`) ; si annulation impossible (`RUNNING`/`COMPLETED`) : texte « Annulation impossible : {raison}. ».
  - Dialogue de confirmation destructif, **motif obligatoire**, texte : « Les programmations en attente de la campagne sont annulées avec elle. Une campagne en cours ou terminée ne peut pas être annulée. ». Après confirmation : rafraîchissement ; l'erreur éventuelle est affichée dans le dialogue.
  - 4 onglets (URL `?onglet=resume|segments|messages|programmations`, défaut `resume`) :
    - **Résumé** : nom, objectif, statut, budget ; tuiles Compagnie (lien `/compagnies/{id}`), Objectif, Budget, Début, Fin, Créée par (nom d'affichage de `createdByUserId`, « — » si inconnu), Créée le, Modifiée le (« — » si nul).
    - **Segments (n)** : tableau Nom, Ciblage (libellé), Taille estimée, Éligibles aujourd'hui ; vide : « Aucun segment propre à cette campagne. » (seuls les segments dont `campaignId` = la campagne ; les segments réutilisables ne sont pas listés).
    - **Messages (n)** : cartes Objet, pastille de statut (Brouillon/Approuvé/Envoyé), canal, contenu ; vide : « Aucun message. ».
    - **Programmations (n)** : tableau Prévue le, Message (objet), Segment (nom), Statut (En attente/Envoyée/Échouée/Annulée), Destinataires, Envoyée le ; tri `scheduledAt` décroissant ; vide : « Aucune programmation. ». Pas de bouton d'annulation dans cet onglet.
  - `404` dédié si id inconnu.
- **Modèle de données attendu** (`CampaignDetail`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| campaign | `MarketingCampaign` (id, companyId, name, objective, status, startDate, endDate, budget, currency, createdByUserId, createdAt, updatedAt) | `createdByUserId`, `updatedAt` nullables | | `MarketingCampaignResponse` : identique (record), existe |
| companyName | string | non | | à joindre |
| createdByName | string | non | « — » si compte inconnu | à joindre (`identity-service`) |
| segments[] | SegmentRow | | segments dont `campaignId` = id | cf. Segments |
| messages[] | MessageRow | | | cf. Messages |
| schedules[] | ScheduleRow | | tri `scheduledAt` décroissant | cf. Programmations |
| cancelBlockedReason | string | oui | « Cette campagne est déjà annulée » / « Une campagne en cours ou terminée ne peut pas être annulée » / `null` | règle à exposer par l'API (ou dupliquée côté client) |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/marketing-campaigns/{id}` | path | `MarketingCampaignResponse` | `MARKETING_MANAGE` |
| GET | `/admin/marketing-segments` | `campaignId` | cf. Segments | idem |
| GET | `/admin/marketing-messages` | `campaignId` | cf. Messages | idem |
| GET | `/admin/marketing-schedules` | `campaignId` | cf. Programmations | idem |
| PATCH | `/admin/marketing-campaigns/{id}/cancel` | corps `{ "reason": string (1–500, trim) }` | campagne mise à jour ; `404` inconnu ; `400` motif vide/trop long ; `409` si déjà annulée ou `RUNNING`/`COMPLETED` | `MARKETING_MANAGE` (+ audit) |

- **Règles métier**
  - Machine à états côté backend (`MarketingCampaignServiceImpl.isAllowed`) : `DRAFT→SCHEDULED`, `DRAFT|SCHEDULED→CANCELLED`, tout autre mouvement (dont vers `RUNNING`/`COMPLETED`/`DRAFT`) refusé en `409`. Le backoffice n'utilise que `→CANCELLED`.
  - Ordre des gardes attendu par l'écran : campagne inconnue → motif obligatoire → déjà annulée → `RUNNING`/`COMPLETED` (messages exacts ci-dessus).
  - **Cascade** : passer à `CANCELLED` annule dans la même transaction toutes les programmations `PENDING` de la campagne ; l'activité/audit doit mentionner le nombre : « Campagne « {nom} » annulée ({n} programmation(s) annulée(s)). Motif : {motif} » rattaché à la compagnie.
  - Effets de bord : journal d'activité compagnie + événement d'audit (`audit.events`, `UPDATE`/`MarketingCampaign`, avant→après `status`) ; le motif est du texte libre → à ne pas mettre dans l'état d'audit (cf. convention du dépôt), seulement dans l'activité.
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /marketing-campaigns/{id}` | ✅ `customer-service/.../MarketingCampaignController.java` (`MARKETING_MANAGE`, non restreint = toute compagnie, `404` hors portée). Champs de `MarketingCampaignResponse` = ceux du type `MarketingCampaign` du backoffice. Manque `companyName`/`createdByName` (jointures). |
| sous-listes par `campaignId` | ⚠️ messages et programmations : filtre `campaignId` ✅ (`MarketingMessageController`, `MarketingScheduleController`) ; segments : ❌ pas de filtre `campaignId` (`MarketingSegmentController.list(page,size)`). |
| `PATCH …/cancel` | ⚠️ partiel. `PATCH /marketing-campaigns/{id}` avec `{"status":"CANCELLED"}` existe, workflow et **cascade** ✅ (`cancelPendingSchedules`). Manquent : paramètre `reason` (non reçu ni journalisé), refus `409` aussi pour campagne déjà `CANCELLED` (le backend refuse déjà `CANCELLED→CANCELLED` via `isAllowed`, OK), audit : `customer-service` n'écrit aucune trace d'audit pour le marketing (périmètre audit : profil, parrainage, fidélité). Reste à ajouter le motif + l'audit. |

---

### Segments — `/communication/segments`

- **Fonctionnalités**
  - Bandeau de 4 stats (masqué si `q`) : Segments (nb), Taille estimée (Σ `estimatedSize`), Éligibles aujourd'hui (Σ `eligibleNow`), Réutilisables (segments sans campagne).
  - Filtre Compagnie ; recherche `q` sur nom, compagnie, nom de campagne, libellé de ciblage. **Pas de filtre de statut** (un segment n'en a pas).
  - Grille de cartes triées par nom de compagnie puis nom : nom, compagnie, **Ciblage** (libellé), jauge Taille estimée, jauge Éligibles aujourd'hui (largeur relative au max des deux), pied « Campagne : {nom} » ou « Réutilisable », « créé le {date} ». Non cliquable (pas de fiche).
  - Libellé de ciblage (`describeCriteria`) : critères vides → « Tous les clients » ; `membershipType` = `REGULAR|VIP|PREMIUM` (insensible à la casse) → « Palier : VIP » ; valeur inconnue → « Palier inconnu « x » (aucun client) » ; toute autre clé → « {clé} : {valeur} (non évalué) » ; parties jointes par « · ».
- **Modèle de données attendu** (`SegmentRow`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | existe |
| companyId | uuid | non | | existe |
| companyName | string | non | | à joindre |
| campaignId | uuid | oui | `null` = segment réutilisable | existe |
| campaignName | string | oui | | à joindre |
| name | string | non | ≤ 150 | existe |
| criteria | objet JSON `Record<string,string>` | non | seule `membershipType` est évaluée par le backend | existe (`JsonNode`) ; les valeurs sont des chaînes dans le type UI |
| estimatedSize | int | non | ≥ 0 | existe (`Integer`, nullable côté DTO) |
| eligibleNow | int | non | nb de comptes de fidélité de la compagnie correspondant à `membershipType` (tous si pas de critère) ; recalculé à **chaque lecture** | **à calculer** (`customer-service` détient `CustomerLoyaltyAccount`) |
| createdAt | ISO-8601 | non | | existe |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/marketing-segments` | `companyId?`, `campaignId?`, `q?`, `page`, `size`, `sort` (défaut `companyName,name`) | `Page<SegmentRow>` avec `eligibleNow`, `campaignName`, `companyName`, `criteriaLabel` (optionnel, sinon calculé client) | `MARKETING_MANAGE`, plateforme |
| GET | `/admin/marketing-segments/stats` | `companyId?` | `{count, estimatedSizeTotal, eligibleNowTotal, reusableCount}` | idem |

- **Règles métier** : l'évaluation réelle du segment à l'envoi ne gère que `membershipType` (CLAUDE.md, lot envoi marketing) ; `eligibleNow` doit utiliser **la même règle** (clé `membershipType`, comparaison insensible à la casse, valeur inconnue = 0 destinataire, autres clés ignorées). Compter par compagnie du segment.
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/marketing-segments` | ⚠️ partiel. `GET /marketing-segments?page&size` (`MarketingSegmentController.java`, `MARKETING_MANAGE`) renvoie `id, companyId, campaignId, name, criteria, estimatedSize, createdAt`. Manquent : filtres `companyId`/`campaignId`/`q`, `eligibleNow` (aucun compteur de comptes de fidélité par palier n'est exposé ; `GET /loyalty-accounts` existe mais en `CUSTOMER_MANAGE`, paginé, non agrégé), noms de compagnie/campagne, tri par compagnie/nom. |
| stats | ❌ manquant. |

---

### Messages — `/communication/messages`

- **Fonctionnalités**
  - Pas de bandeau de stats ; filtres Compagnie et Statut (Tous, Brouillons, Approuvés, Envoyés) ; recherche `q` sur objet, nom de campagne, compagnie, contenu.
  - Grille de cartes `createdAt` décroissant : puce du canal, pastille de statut (Brouillon/Approuvé/Envoyé), bulle avec l'objet et le contenu (4 lignes), « {campagne} · {compagnie} ». Clic → fiche campagne, onglet messages (`/communication/campagnes/{campaignId}?onglet=messages`).
  - Description de l'onglet : « Seul le canal « dans l'application » est réellement envoyé ».
  - Lecture seule : le backoffice n'approuve ni ne rédige (le circuit brouillon → approuvé reste côté compagnie).
- **Modèle de données attendu** (`MessageRow`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | existe |
| companyId | uuid | non | | existe |
| companyName | string | non | | à joindre |
| campaignId | uuid | non | | existe |
| campaignName | string | non | « — » si introuvable | à joindre |
| channel | enum | non | EMAIL/SMS/IN_APP (UI connaît aussi PUSH/WHATSAPP) | existe |
| subject | string | non côté UI | ≤ 200 | **nullable** côté backend (`@Size(max=200)` sans `@NotBlank`) |
| content | string | non | texte long | existe |
| status | enum | non | DRAFT/APPROVED/SENT | existe |
| createdAt | ISO-8601 | non | | existe |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/marketing-messages` | `companyId?`, `campaignId?`, `status?`, `q?`, `page`, `size`, `sort` (défaut `createdAt,desc`) | `Page<MessageRow>` | `MARKETING_MANAGE`, plateforme |

- **Règles métier** : côté backend, un message ne s'édite qu'en `DRAFT`, `DRAFT→APPROVED` seule transition (hors périmètre écran). `SENT` n'est produit par aucun chemin identifié du lot noyau (à confirmer par le dispatcher).
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/marketing-messages` | ⚠️ partiel. `GET /marketing-messages?campaignId&page&size` (`MarketingMessageController.java`) renvoie `id, companyId, campaignId, channel, subject, content, status, createdAt, updatedAt`. Manquent : filtres `companyId`/`status`/`q`, `companyName`, `campaignName`. |

---

### Programmations — `/communication/programmations`

- **Fonctionnalités**
  - Bandeau de 4 stats (masqué si `q`) : Programmations (total), En attente, Envoyées, Échouées.
  - Filtres : Compagnie ; Statut (Toutes, En attente, Envoyées, Échouées, Annulées) ; recherche `q` sur nom de campagne, objet du message, compagnie, nom du segment.
  - Agenda groupé par jour (UTC, libellé long fr), jours triés **décroissant**, programmations d'un jour triées par heure décroissante : heure (`HH:mm` UTC) avec barre colorée selon le statut, campagne, « {objet} · {segment} · {compagnie} », puce du canal, nb de destinataires, pastille de statut, bouton **Annuler** (visible si `status ≠ CANCELLED` : le serveur refuse ce qu'il doit) ou espace vide.
  - Annuler : dialogue destructif, motif obligatoire, « Seule une programmation en attente peut être annulée. Cette décision est définitive. ».
  - Même composant utilisé pour « Prochains envois » (Aperçu).
- **Modèle de données attendu** (`ScheduleRow`)

| Champ | Type | Nullable | Valeurs/format | Source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | existe |
| companyId | uuid | non | | existe |
| companyName | string | non | | à joindre |
| campaignId | uuid | non | | existe |
| campaignName | string | non | | à joindre |
| messageSubject | string | non | « — » si introuvable | à joindre (via `messageId`) |
| channel | enum | non | canal du message | à joindre (via `messageId`) |
| segmentName | string | non | « — » si introuvable | à joindre (via `segmentId`) |
| scheduledAt | ISO-8601 | non | | existe |
| sentAt | ISO-8601 | oui | | existe |
| status | enum | non | PENDING/SENT/FAILED/CANCELLED | existe |
| recipientsCount | int | non | 0 tant que non envoyée | existe (`Integer`) |
| cancellable | bool | non | `status ≠ CANCELLED` | calculé (règle UI ; la règle réelle est `status = PENDING`) |

- **Endpoints requis**

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/marketing-schedules` | `companyId?`, `campaignId?`, `status?`, `q?`, `page`, `size`, `sort` (`scheduledAt,desc`) | `Page<ScheduleRow>` | `MARKETING_MANAGE`, plateforme |
| GET | `/admin/marketing-schedules/stats` | `companyId?` | `{total, pending, sent, failed}` | idem |
| PATCH | `/admin/marketing-schedules/{id}/cancel` | `{ "reason": string (1–500) }` | programmation `CANCELLED` ; `404` inconnue ; `400` motif vide ; `409` si pas `PENDING` (« Cette programmation n'est plus en attente ») | `MARKETING_MANAGE` |

- **Règles métier** : ordre des gardes : programmation introuvable → motif → `status = PENDING`. Effet de bord : activité compagnie « Programmation de la campagne « {nom} » annulée. Motif : {motif} » + audit. Un envoi réel `IN_APP` part automatiquement à l'échéance (job 30 s) ; une programmation annulée n'est jamais envoyée.
- **État côté API**

| Endpoint | État |
|---|---|
| `GET /admin/marketing-schedules` | ⚠️ partiel. `GET /marketing-schedules?campaignId&page&size` (`MarketingScheduleController.java`) → `id, companyId, campaignId, messageId, segmentId, scheduledAt, sentAt, status, recipientsCount, createdAt, updatedAt`. Manquent filtres `companyId`/`status`/`q`, noms (compagnie, campagne, objet, segment), canal. |
| stats | ❌ manquant. |
| `PATCH …/cancel` | ⚠️ `PATCH /marketing-schedules/{id}` `{"status":"CANCELLED"}` existe, n'accepte que `PENDING→CANCELLED` (`409` sinon) ; manque le paramètre `reason` et l'audit/activité. |

---

### Actions serveur (`src/app/(admin)/communication/actions.ts`)

| Action | Entrée | Validation | Effet attendu côté API |
|---|---|---|---|
| `cancelCampaign(campaignId, reason)` | id string non vide, motif ≤ 500 car. non vide | `requireString`, `requireReason` | `PATCH …/campaigns/{id}/cancel` + cascade programmations `PENDING` |
| `cancelSchedule(scheduleId, reason)` | idem | idem | `PATCH …/schedules/{id}/cancel` |
| `revealNotificationContent(notificationId)` | id | `requireString`, notification existante | `POST …/notifications/{id}/reveal-content` |

Toutes exigent une session (`SESSION_EXPIRED` : « Session expirée, reconnecte-toi ») ; les erreurs attendues reviennent sous forme `{ok:false,error}` avec le message de la règle métier ; revalidation des pages campagne, programmations, compagnie après succès. Les champs de l'acteur (`actor`) = identité de la session (e-mail), à remplacer par le `userId` du JWT.

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| Liste plateforme des notifications avec filtres `companyId`/`channel`/`status`/`q`, tri, projection sans contenu | notification-service | haute | Seule liste existante : par `entityType`+`entityId`. Renvoie `messageContent`/`sentTo` en clair. |
| `GET /notifications/{id}` (détail) incl. `retryCount`, `scheduledAt` | notification-service | haute | N'existe pas ; les champs ne sont pas dans `NotificationResponse`. |
| Révélation journalisée du contenu (`reveal-content`) + écriture `DataAccessLog` | notification-service + audit-compliance-service | haute | Exigence RGPD du backoffice ; aucun producteur externe de `DataAccessLog`. |
| Statistiques notifications (sent/failed/pending, par canal, échecs récents, taux de livraison) | notification-service | haute | Aperçu + bandeau. |
| Filtres `companyId`/`status`/`q` sur les 4 listes marketing (campagnes, messages, segments, programmations) | customer-service | haute | Listes paginées sans filtre. |
| Filtre `campaignId` sur segments | customer-service | haute | Existe sur messages et programmations seulement. |
| Motif (`reason`) + audit sur annulation campagne / programmation | customer-service | haute | PATCH statut existe, le motif n'est ni reçu ni tracé ; le marketing n'est pas audité. |
| `eligibleNow` (comptes de fidélité éligibles) et total d'audience | customer-service | moyenne | Calcul par `membershipType` sur `CustomerLoyaltyAccount`. |
| `scheduleCount` par campagne ; stats par statut des campagnes/programmations/segments | customer-service | moyenne | Agrégats. |
| Noms joints : compagnie, campagne, objet de message, segment, créateur, destinataire | company-service / customer-service / identity-service | moyenne | Via BFF `/admin/...` ou jointures client. |
| Libellé de l'objet lié à une notification (code réservation, code colis, titre d'avis) | BFF (booking/parcel/customer) | basse | `entityType`+`entityId` suffisent à construire le lien ; le libellé demande un appel par service. |
| Overview agrégé du hub + compteurs d'onglets | BFF `/admin/communication` | moyenne | Composition de deux services. |
| Canaux `PUSH`, `WHATSAPP` | notification-service / customer-service | basse | Présents dans l'UI (libellés, filtre, puces) mais absents des enums backend. |
| Règle plateforme sur `/admin/**` et accès staff aux endpoints `/marketing-*` | gateway / identity-service | moyenne | `MARKETING_MANAGE` est accordée à `ADMIN` et `MANAGER` ; un `MANAGER` est borné à sa compagnie par claim. |

## Questions ouvertes

1. **Vue plateforme vs scopée** : confirmer que l'`ADMIN` sans claim `company_id` + `RBAC_MANAGE` obtient bien toutes les compagnies sur `/marketing-*` et `/notifications` (comportement actuel de `TenantAccessGuard`), et si on crée un préfixe `/admin/...` ou si on enrichit les endpoints existants par paramètres.
2. **Où calculer les jointures** (noms de compagnie, de campagne, de segment, de destinataire) : réponses enrichies côté API (couplage entre services, à éviter par la règle « pas de FK entre services » mais admissible dans un BFF) ou jointures par le backoffice avec appels batch ?
3. **Agrégats de l'Aperçu** : un BFF unique ou deux endpoints par service ? Fraîcheur acceptable (le backoffice recalcule à chaque requête) ?
4. **Journalisation de la révélation de contenu** : quel mécanisme (événement `audit.events`, nouvel endpoint d'ingestion `DataAccessLog`) et quelle `DataCategory`/`AccessReason` ? Qui possède la permission (`NOTIFICATION_MANAGE` seule ou aussi `COMPLIANCE_READ`) ?
5. **`messageContent` dans la liste existante** : doit-on retirer le contenu de `GET /notifications` pour le staff (le backoffice l'exige masqué) ?
6. **Canaux `PUSH`/`WHATSAPP`** : à ajouter au backend ou à retirer de l'UI ?
7. **Dates et budget nullables** : `startDate`/`endDate`/`budget`/`currency` d'une campagne sont facultatifs côté backend alors que l'UI les suppose renseignés (barre de progression, budget). Rendre obligatoire ou gérer `null` côté UI ?
8. **Statuts jamais produits** : `RUNNING`/`COMPLETED` (campagne), `FAILED` (programmation), `SENT` (message) ne sont écrits par aucun chemin connu du backend ; confirmer qui les produira (pipeline et « Campagnes les plus diffusées » en dépendent).
9. **Projection du retry** : `retryCount` est affiché mais le backend ne fait aucun retry ; garder le champ à 0 ?
10. **Recherche `q`** : sur le type de notification, recherche sur la valeur technique, le libellé français, ou les deux ? Sémantique (préfixe, contient) ?
11. **Consentements (audit-compliance-service)** : non utilisés par ces écrans ; confirmer qu'aucun affichage de consentement marketing n'est attendu (ex. nombre de destinataires exclus faute de consentement) — le canal envoyé aujourd'hui est `IN_APP` seul, sans contrôle de consentement.
12. **Identité de l'acteur** : l'`actor` du journal d'activité est un e-mail de session ; l'API attend un `userId` (claim JWT). Mapping à définir.
