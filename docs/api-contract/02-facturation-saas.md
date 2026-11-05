# Facturation SaaS (abonnements, factures, impayés, paiements)

## Vue d'ensemble

Périmètre : la facturation que **Sira facture aux compagnies** (abonnements aux plans, factures d'abonnement, tentatives de paiement, recouvrement). Tout vit dans l'onglet « Offre et facturation » (`/offre-facturation/{abonnements|paiements|factures|impayes}`) ; les anciennes routes `/facturation/abonnements`, `/facturation/factures`, `/facturation/paiements`, `/facturation/impayes` ne font que **rediriger** vers ces onglets. Seules les fiches `/facturation/abonnements/[id]` et `/facturation/factures/[id]` sont de vraies pages. Les onglets du hub qui concernent le catalogue (plans, fonctionnalités, paliers, documents KYC) sont hors périmètre (autre document).

Le backoffice voit **toutes** les compagnies (aucun tenant). Aujourd'hui toutes les données sont chargées en mémoire et filtrées/triées/paginées **côté client** (`DataTable` : tri par colonne, page de 15, choix 10/15/25/50 ; recherche et filtres via les paramètres d'URL côté serveur Next sur le jeu complet). L'API doit donc offrir pagination, tri et filtres serveur.

Convention proposée : préfixe `/admin/billing/...`, exposé via le Gateway, réservé aux appelants plateforme (aucun claim `company_id` **et** `RBAC_MANAGE`, cf. `TenantAccessGuard.isUnrestricted` de `company-service`). Permissions proposées : lecture et actions = `COMPANY_MANAGE` + appelant plateforme (seule permission aujourd'hui de la facturation, règle `anyRequest()` de `company-service/.../security/SecurityConfig.java`) ; révélation de contact = permission dédiée (voir Q10).

Écart global à traiter dans toute l'API : le backoffice utilise des statuts en **minuscules** (`trial`, `active`, `past_due`, `suspended`, `expired`, `canceled`), le backend en **MAJUSCULES** (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, `EXPIRED` — `company-service/.../enums/SubscriptionStatus.java`). Mapping 1:1 trivial côté client ; les noms de champs divergent aussi (voir les tableaux).

Barème de présentation commun (à ne pas recalculer différemment) : libellés `subscriptionStatusBadge` : trial = « Essai » (info), active = « Active » (success), past_due = « Impayée » (danger), suspended = « Suspendue » (warning), expired = « Expirée » (neutral), canceled = « Annulée » (neutral). Facture : paid = « Payée », failed = « Échouée ». Paiement : paid = « Payé », failed = « Échoué ». Cycle : MONTHLY = « Mensuel/Mensuelle », YEARLY = « Annuel/Annuelle ». Types de changement : ACTIVATION « Activation », UPGRADE « Montée en gamme », DOWNGRADE « Descente en gamme », PLAN_CHANGE « Changement de plan », CANCELLATION « Annulation».

---

### Hub « Offre et facturation » (transversal à 4 onglets de ce périmètre) — `/offre-facturation`, `/offre-facturation/[tab]`

Fichiers : `src/app/(admin)/offre-facturation/hub-page.tsx`, `src/lib/repos/billing-hub.ts`.

- **Fonctionnalités**
  - Onglets (ordre) : `plans`, `fonctionnalites`, `paliers`, `documents` | `abonnements`, `paiements`, `factures`, `impayes` (séparateur après le 4ᵉ). Chaque onglet affiche un **compteur** ; l'onglet `impayes` est marqué « urgent ».
  - **Recherche globale** (`q`, tronquée à 80 caractères, insensible aux accents et à la casse, sous-chaîne) appliquée à tous les onglets : les compteurs de **chaque** onglet reflètent le nombre de correspondances ; bandeau « Résultats pour « q » : N dans toute l'offre et la facturation » ; si l'onglet courant est vide, liste des autres onglets qui contiennent des résultats (lien + compte).
  - Bande de statistiques (`StatStrip`) en haut de l'onglet quand il n'y a pas de recherche (voir chaque onglet).
  - Pagination par liens (`page`, taille fixe 12) uniquement pour `plans` (hors périmètre) ; les 4 onglets de ce périmètre utilisent la pagination du `DataTable` (15 par défaut).
- **Modèle de données attendu** : compteurs.

| champ | type | nullable | valeurs | source/commentaire |
|---|---|---|---|---|
| counts.abonnements | int | non | ≥ 0 | nb d'abonnements correspondant à `q` (tous statuts) |
| counts.paiements | int | non | ≥ 0 | nb de tentatives de paiement correspondant à `q` |
| counts.factures | int | non | ≥ 0 | nb de factures correspondant à `q` |
| counts.impayes | int | non | ≥ 0 | nb d'abonnements `past_due`/`suspended` correspondant à `q` |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E2 | GET | `/admin/billing/search-counts` | `q` (≤ 80 car., recherche pliée accents/casse) | `{abonnements, paiements, factures, impayes}` (les 4 autres onglets sont couverts par les documents du catalogue) | COMPANY_MANAGE + plateforme |

  Les stats de bandeau sont servies par les endpoints de liste (champ `summary`, voir plus bas) afin d'éviter des appels supplémentaires.
- **Règles métier** : la recherche ne porte jamais sur des e-mails ni téléphones (non indexés). Champs interrogés par onglet : voir chaque section.
- **État côté API** : E2 ❌ (aucun endpoint de recherche cross-compagnies ; `company-service` n'expose que des listes par compagnie).

---

### Abonnements (liste) — `/offre-facturation/abonnements`

- **Fonctionnalités**
  - Bande de stats (hors recherche) : « Abonnements » (total), « Actifs » (`active`), « En essai » (`trial`), « Impayés ou suspendus » (`past_due`+`suspended`).
  - Filtre **Statut** (`statut`) : Tous / Essai / Actifs / Impayés / Suspendus / Expirés / Annulés (valeurs `trial|active|past_due|suspended|expired|canceled`). Une valeur invalide est ignorée.
  - Recherche `q` sur : nom de compagnie, nom du propriétaire, nom du plan, libellé du statut sans accent (`essai`, `actif`, `impaye`, `suspendu`, `expire`, `annule`), `mensuel`/`annuel`, prix.
  - Colonnes (toutes triables sauf Action) : Compagnie (avatar + nom), Propriétaire (nom + e-mail masqué + téléphone masqué, bouton « œil » pour révéler, accès journalisé), Offre (nom du plan), Statut (pastille), Facturation (Mensuelle/Annuelle), Prix (formaté devise), Volume de paiements (montant cumulé payé + « N paiement(s) » + « · N échec(s) » en rouge), Prochaine échéance (date ; « — » si `canceled` ou `expired`), Action (bouton « Relancer » → dialogue de relance).
  - Ligne cliquable → `/facturation/abonnements/{id}`.
  - Pagination/tri client (15/page). État vide : « Aucun abonnement. » ; si recherche sans résultat : message + autres onglets.
  - Dialogue **Relance** (bouton de ligne, désactivé si abonnement `canceled`/`expired` ou propriétaire absent) : canal radio EMAIL (défaut) / SMS, message obligatoire (≤ 500 caractères, compteur « n / 500 »), envoi → toast de confirmation « {propriétaire} a été relancé par e-mail|SMS ». Voir E9.
- **Modèle de données attendu** (ligne de liste)

| champ | type | nullable | valeurs/format | source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| companyId | uuid | non | | |
| companyName | string | non | | à fournir par l'API (jointure `Company`) |
| planId | uuid | non | | |
| planName | string | non | | à fournir par l'API (jointure `Plan`) |
| status | enum | non | `trial|active|past_due|suspended|expired|canceled` | |
| billingCycle | enum | non | `MONTHLY|YEARLY` | |
| price | number | non | décimal | prix catalogue du cycle |
| currency | string | non | `XOF` (code ISO) | |
| nextBillingDate | date/datetime ISO | non | | non affiché si canceled/expired |
| ownerName | string | oui | | propriétaire = employé de rôle `MANAGER` de la compagnie |
| ownerEmail / ownerPhone | string | oui | **masqués** par l'API (`a•••@d.com`, `+221•••••12`) | clair uniquement via E15 |
| paidVolume | number | non | somme des paiements `paid` de la **compagnie** | calculé par l'API (attention : agrégé par compagnie, pas par abonnement) |
| paidCount / failedCount | int | non | | calculés par l'API |
| lastReminderAt | datetime | oui | dernier envoi de relance | issu du journal d'activité |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E1 | GET | `/admin/billing/subscriptions` | `q`, `status` (enum), `companyId` (optionnel), `page`, `size` (10/15/25/50), `sort` (`companyName|ownerName|planName|status|billingCycle|price|paidVolume|nextBillingDate`, `asc|desc`) | `{content: Row[], page, size, totalElements, summary:{total, active, trial, unpaidOrSuspended}}` | COMPANY_MANAGE + plateforme |
| E9 | POST | `/admin/billing/subscriptions/{id}/reminders` | corps `{channel: "EMAIL"|"SMS", message: string(1..500)}` | `204` ; `400` canal/message invalide ; `409` abonnement `canceled`/`expired` ; `404` abonnement ou propriétaire introuvable | COMPANY_MANAGE + plateforme |
| E15 | GET | `/admin/billing/companies/{companyId}/owner-contact` | `field=email|phone` | `{value: string}` ; accès journalisé (DataAccessLog) | permission dédiée (Q10) |

- **Règles métier** : relance interdite si statut `canceled`/`expired` ; message trim, non vide, ≤ 500 ; effet de bord = envoi réel e-mail/SMS au propriétaire + trace d'activité de la compagnie (« Relance de paiement envoyée à {nom} (e-mail|SMS) », sans texte du message ni coordonnées) ; la démo ne stocke pas le message, il faut décider si l'API le stocke (Q6). Le propriétaire = employé `MANAGER` de la compagnie (premier trouvé).
- **État côté API**
  - E1 ⚠️ partiel : `GET /companies/{companyId}/subscriptions` existe (`company-service/.../controller/CompanyPlanSubscriptionController.java`, DTO `dto/response/SubscriptionResponse.java`) mais : **scopé à une compagnie**, liste non paginée, sans filtre de statut, et le DTO n'a ni `companyName`, ni `planName`, ni propriétaire, ni `paidVolume`. Champs backend utiles : `status`, `billingCycle`, `price`, `currency`, `nextBillingDate` (LocalDate), `trialEndDate`, `pastDueSince`, `suspendedSince`, `totalAmount` (prix net après crédits de parrainage), `paymentMethod`, `paymentStatus`, `lastPaymentDate`, `paymentReference`. Service propriétaire : `company-service` (Company/Plan dans la même base ; `ownerName` et contacts viennent de `hr-service` → voir Q1).
  - E9 ❌ : aucun envoi de relance cross-compagnie. `notification-service` n'a que `GET /notifications`, `PATCH /notifications/{id}/read` et la boîte `/notifications/me/**` (`notification-service/.../controller`), aucun envoi staff, et ni `company-service` ni `notification-service` ne détiennent e-mail/téléphone (cf. CLAUDE.md, dette lot marketing). Service recommandé : `notification-service` (envoi) alimenté par `company-service` (événement `PaymentReminderRequested` avec contact résolu en amont, event-carried state).
  - E15 ❌ : pas de lecture du contact propriétaire par un outil plateforme avec journalisation ; owner = `hr-service` (`GET /employees`, `EmployeeController.java`, scopé compagnie) / contact brut dans `identity-service`.

---

### Fiche abonnement — `/facturation/abonnements/[id]`

Paramètre d'URL `onglet` ∈ `resume|historique|tentatives|factures` (défaut `resume`).

- **Fonctionnalités**
  - En-tête : titre « Abonnement de {compagnie} », description « Plan {plan} · {Mensuel|Annuel} », pastille de statut, boutons d'action :
    - **Relancer le paiement** (visible si `canRetry` : statut `past_due` ou `suspended`) : dialogue de confirmation « Une nouvelle tentative de prélèvement est simulée immédiatement. En cas de succès, une facture payée est émise et l'abonnement redevient actif. ». Succès → l'abonnement passe `active`, `pastDueSince` effacé, `nextBillingDate` + 1 mois, facture `paid` créée, tentative `paid`. Échec → tentative `failed` enregistrée (motif), abonnement inchangé, message d'erreur « Échec du paiement : {motif} ».
    - **Annuler l'abonnement** (visible si `canCancel` : statut ≠ `canceled` et ≠ `expired`) : dialogue destructif avec **motif obligatoire**, « L'abonnement passe à l'état « Annulée ». Le motif est enregistré dans l'activité de la compagnie. ».
    - Aucun bouton si ni l'un ni l'autre.
  - Onglet **Résumé** : plan (lien vers `/offre/plans/{planId}`), cycle, pastille de statut, prix ; infos : Compagnie (lien `/compagnies/{id}?onglet=abonnement`), Prochaine échéance (« — » si canceled/expired), Fin de l'essai (`trialEndDate` ou « — »), Impayé depuis (`pastDueSince` ou « — »), nb de factures, nb de tentatives de paiement.
  - Onglet **Historique des changements de plan** : tableau Date, Changement, Ancien plan, Nouveau plan ; « — » si absent ; vide : « Aucun changement enregistré. » ; tri chronologique croissant.
  - Onglet **Tentatives de paiement** : 3 stats (Tentatives, Réussies, Échouées) + tableau Date/heure, Montant, Statut, Motif (« — »), Facture (lien `/facturation/factures/{invoiceId}` avec numéro) ; plus récente d'abord ; vide : « Aucune tentative de paiement. ».
  - Onglet **Factures** : 3 stats (Factures, Total encaissé = somme des `paid`, Impayé = somme des non `paid`, dans la devise de l'abonnement) + tableau Numéro (lien), Émise le, Montant, Statut ; plus récente d'abord ; vide : « Aucune facture. ».
  - 404 si l'abonnement n'existe pas.
  - Après chaque action : rafraîchissement de la fiche, de la fiche compagnie et des listes du hub.
- **Modèle de données attendu**

| objet.champ | type | nullable | valeurs/format | source/commentaire |
|---|---|---|---|---|
| subscription.* | cf. ligne de liste + `trialEndDate` (date, nullable), `pastDueSince` (date, nullable) | | | |
| companyName | string | non | | à fournir |
| plan | `{id, name, ...}` | oui | | `null` si le plan a disparu |
| canRetry | bool | non | `status ∈ {past_due, suspended}` | peut être calculé côté client, mieux côté API |
| canCancel | bool | non | `status ∉ {canceled, expired}` | idem |
| history[].id | uuid | non | | |
| history[].kind | enum | non | `ACTIVATION|UPGRADE|DOWNGRADE|PLAN_CHANGE|CANCELLATION` | le backend a aussi `TRIAL_START`, `RENEWAL` (non gérés par l'UI : libellés à ajouter) |
| history[].fromPlan / toPlan | string | oui | nom du plan | l'API doit renvoyer le **nom**, pas seulement l'id |
| history[].at | datetime | non | | |
| payments[] | PaymentAttempt | | cf. écran Paiements | |
| invoices[] | InvoiceRow | | cf. écran Factures | |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E3 | GET | `/admin/billing/subscriptions/{id}` | | abonnement + `companyName` + `plan` + `canRetry` + `canCancel` + compteurs `invoiceCount`, `paymentAttemptCount` | COMPANY_MANAGE + plateforme |
| E4 | GET | `/admin/billing/subscriptions/{id}/history` | | liste `history[]` triée par date croissante | idem |
| E5 | GET | `/admin/billing/subscriptions/{id}/payment-attempts` | `page`,`size` | tentatives, plus récente d'abord | idem |
| (E10) | GET | `/admin/billing/invoices?subscriptionId={id}` | cf. E10 | factures de l'abonnement | idem |
| E7 | POST | `/admin/billing/subscriptions/{id}/retry-payment` | corps vide | `200` tentative `{id, status, amount, currency, at, invoiceId, reason}` ; l'échec de prélèvement doit être distinguable (statut `failed` + motif, pas une erreur technique) ; `409` si statut non relançable | idem |
| E8 | POST | `/admin/billing/subscriptions/{id}/cancel` | corps `{reason: string}` obligatoire non vide | `200` abonnement `canceled` ; idempotent ; `409` si déjà `expired` | idem |

- **Règles métier**
  - Retry : seulement `past_due`/`suspended`. Succès : abonnement `active`, `pastDueSince = null`, `nextBillingDate` avancé d'un mois, facture `paid` (numéro `INV-{année}-{NNNN}` séquentiel) + tentative `paid` liée. Échec : tentative `failed` + raison, rien d'autre ne change. Trace d'activité compagnie dans les deux cas.
  - Cancel : refusé si `canceled` ou `expired` ; motif obligatoire (trim) ; écrit une ligne d'historique `CANCELLATION` (fromPlan = plan courant, toPlan = null) et une trace d'activité « Abonnement annulé. Motif : … » ; `pastDueSince` remis à `null`.
  - Les deux actions sont des actions sensibles → événement `audit.events` (acteur = utilisateur backoffice).
  - Le **changement de plan** (upgrade/downgrade) n'est **pas** déclenché depuis le backoffice : seul l'historique est affiché (voir Q4).
  - Aucun PDF de facture (« n'est pas disponible dans ce lot »).
- **État côté API**
  - E3 ⚠️ : `GET /companies/{companyId}/subscriptions/{id}` (CompanyPlanSubscriptionController) ; manque `companyName`, `planName`/plan, flags, compteurs ; exige `companyId` dans le chemin (le backoffice ne l'a pas toujours à l'ouverture d'une fiche depuis la liste : il l'a via la ligne, mais l'ID d'abonnement seul est préférable).
  - E4 ⚠️ : `GET /companies/{companyId}/billing-history` (`BillingPlanHistoryController.java`, DTO `BillingPlanHistoryResponse` : `oldPlanId`, `newPlanId`, `changeType` ∈ `TRIAL_START|ACTIVATION|UPGRADE|DOWNGRADE|RENEWAL|PLAN_CHANGE|CANCELLATION`, `changeSource` ∈ `USER|ADMIN|SYSTEM`, `approvedBy`, `changeRequestedAt`, `effectiveChangeDate`, `companySubscriptionId`) : par compagnie, ids de plans sans noms, pas de filtre par abonnement (filtrer sur `companySubscriptionId`).
  - E5 ❌ : **il n'existe aucune table de tentatives de paiement** (aucune occurrence de `PaymentAttempt` dans `company-service` ; cf. dette n°12 du lot facturation : un échec de débit ne laisse aucune trace). L'abonnement ne porte que `paymentStatus` (`PENDING|PAID|FAILED|REFUNDED`), `lastPaymentDate`, `paymentReference`. Service : `company-service` (nouvelle table `subscription_payment_attempts`).
  - E7 ⚠️ : `POST /companies/{companyId}/subscriptions/{id}/retry-payment` existe (`RetryPaymentRequest{paymentMethod, simulateOutcome}`, réponse `SubscriptionResponse`, statut `402` si débit refusé, `409` hors PAST_DUE/SUSPENDED, `simulateOutcome` réservé aux appelants non restreints). Manque : renvoyer/persister la tentative (statut, motif, facture), chemin sans `companyId`. Le « mock » de paiement est `MockSubscriptionPaymentProvider`.
  - E8 ⚠️ : `POST /companies/{companyId}/subscriptions/{id}/cancel` existe, **sans corps** (aucun motif accepté ni stocké) ; idempotent. Il faut ajouter `reason` (journal d'historique/audit).

---

### Factures (liste) — `/offre-facturation/factures`

- **Fonctionnalités**
  - Barre de filtres : **Statut** (Toutes / Payées / Échouées → `statut=paid|failed`), **période** `du`/`au` (dates `YYYY-MM-DD`, bornes inclusives, comparées à la date d'émission en UTC), recherche `q` (numéro de facture, compagnie, nom du plan, montant). Pas de filtre canal pour cet onglet.
  - Bande de **totaux sur les lignes affichées** (calculée sur le jeu filtré, pas la page) : Factures (nombre), Encaissé (somme des `paid` + « N payée(s) »), En échec (somme des `failed` + « N échouée(s) »), Total facturé (somme de tout). Devise = celle de la première ligne, `XOF` si vide.
  - Colonnes : Facture (numéro monospace, copiable dans la modale), Client (compagnie), Offre (plan), Montant, Statut, Action (boutons « Voir la facture » → modale d'aperçu, « Renvoyer » → dialogue de renvoi).
  - Plus récente d'abord par défaut ; tri client sur les colonnes triables ; 15/page.
  - **Modale d'aperçu** (ouverte par `getInvoicePreview`) : numéro, compagnie, montant, devise, statut, date d'émission, plan (« Abonnement {plan|Sira} »), cycle, abonnement lié, date et statut du paiement lié ; aucune donnée de contact.
  - **Renvoi de facture** (désactivé si pas de propriétaire) : canal radio EMAIL/SMS, confirmation « {numéro} a été envoyée à {propriétaire} par e-mail|SMS » ; colonne/indice « dernier envoi » (`lastSentAt`).
  - État vide : « Aucune facture pour ces critères. »
- **Modèle de données attendu** (ligne)

| champ | type | nullable | valeurs/format | source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| number | string | non | `INV-AAAA-NNNN` | backend : `invoiceNumber` |
| companyId / companyName | uuid / string | non | | nom à fournir par l'API |
| subscriptionId | uuid | non | | **absent** du modèle backend (lien indirect via `billingPlanHistoryId` → `BillingPlanHistory.companySubscriptionId`) |
| planName | string | oui | | à fournir |
| amount | number | non | | backend : `totalAmount` |
| currency | string | non | `XOF` | |
| status | enum | non | UI : `paid|failed` | **écart** : backend `InvoiceStatus` = `DRAFT|ISSUED|PAID|OVERDUE|CANCELLED` (Q3) |
| issuedAt | datetime | non | | backend : `invoiceDate` |
| ownerName | string | oui | | propriétaire compagnie |
| ownerEmail | string | oui | masqué | |
| lastSentAt | datetime | oui | | dernier renvoi |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E10 | GET | `/admin/billing/invoices` | `q`, `status`, `from`, `to` (YYYY-MM-DD), `companyId`, `subscriptionId`, `page`, `size`, `sort` (`number|companyName|planName|amount|status|issuedAt`), défaut `issuedAt desc` | `{content, page, size, totalElements, summary:{count, paidAmount, paidCount, failedAmount, failedCount, totalAmount, currency}}` (summary sur le jeu filtré complet) | COMPANY_MANAGE + plateforme |
| E12 | POST | `/admin/billing/invoices/{id}/resend` | corps `{channel: "EMAIL"|"SMS"}` | `204` ; `404` facture/propriétaire introuvable ; `400` canal invalide | idem |

- **Règles métier** : recherche pliée accents ; période sur le jour UTC de `issuedAt` ; renvoi = envoi réel + trace d'activité « Facture renvoyée {numéro} à {nom} (canal) », aucun contenu ni contact stocké dans la trace.
- **État côté API**
  - E10 ⚠️ : `GET /companies/{companyId}/invoices` (`InvoiceController.java`, `InvoiceResponse` : `invoiceNumber`, `invoiceDate`, `dueDate`, `periodStart/End`, `invoiceType` ∈ `SUBSCRIPTION|ADDON|SETUP_FEE|PENALTY`, `subtotalAmount`, `totalAmount`, `currency`, `billingName`, `status`, `billingPlanHistoryId`) — par compagnie, liste simple, pas de pagination ni filtre, pas de `subscriptionId`/nom de plan/propriétaire. L'entité a aussi `discountAmount`, `taxRate`, `taxAmount`, `description`, `pdfUrl` non exposés.
  - E12 ❌ : aucun envoi de facture (ni `GET /invoices/{id}/pdf`, planifié dans `docs/services/company-service.md` mais non livré). Service : `company-service` + `notification-service`.

---

### Fiche facture — `/facturation/factures/[id]`

- **Fonctionnalités** : titre « Facture {numéro} », « Émise le {date} », pastille de statut. Bandeau : numéro, compagnie, statut, montant. Bloc **Détails** : Compagnie (lien `/compagnies/{id}`), Date d'émission, Plan (« — » si absent), Abonnement (lien « Voir l'abonnement » vers `/facturation/abonnements/{id}`). Bloc **Paiement associé** : statut, montant, date/heure, motif éventuel ; sinon « Aucune tentative enregistrée. ». Mention : « Le PDF des factures n'est pas disponible dans ce lot. ». 404 si inconnue. Les mêmes données alimentent la modale d'aperçu de la liste.
- **Modèle de données attendu** : facture (cf. liste) + `subscription` (`{id, planName, ...}`, nullable) + `payment` (tentative liée, nullable : `{status: paid|failed, amount, currency, at, reason}`) + `billingCycle` (pour la modale).
- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E11 | GET | `/admin/billing/invoices/{id}` | | facture + `companyName` + `subscription` + `payment` | COMPANY_MANAGE + plateforme |

- **Règles métier** : lecture seule ; aucun contact dans la réponse.
- **État côté API** : E11 ⚠️ — `GET /invoices/{id}` existe (`InvoiceController.getById`, accès non restreint autorisé pour l'admin plateforme) mais sans nom de compagnie, abonnement lié ni paiement lié (pas de table de tentatives, cf. E5).

---

### Impayés — `/offre-facturation/impayes`

- **Fonctionnalités**
  - **Vue de synthèse « Recouvrement »** (sur le jeu `q` complet, non filtré par statut/urgence) : « À recouvrer » (somme des montants dus + nombre d'abonnements en retard, devise de la 1ʳᵉ ligne ou XOF), barre de répartition par urgence (parts en montant) et décompte par urgence (Critique « 2 jours ou moins », Bientôt « 3 à 5 jours », À surveiller « plus de 5 jours »), « Impayés » (nombre + somme, « suspension après 7 jours »), « Suspendus » (nombre + somme, « expiration après 30 jours »), « Le plus urgent » (daysLeft min, compagnie, « avant la suspension|l'expiration », montant).
  - Filtres : **Statut** (Tous / Impayés / Suspendus → `past_due|suspended`), **Urgence** (Toutes / Critique / Bientôt / À surveiller → `critical|soon|normal`), recherche `q` (compagnie, propriétaire, plan, montant).
  - Tableau : Compagnie (lien vers la fiche abonnement + « Offre {plan} »), Propriétaire (nom + contacts masqués révélables), Montant dû (prix + « depuis le {pastDueSince} »), Statut (Impayé/Suspendu), Échéance (daysLeft avec pastille d'urgence, ex. « 3 j avant suspension », « Suspension dépassée de N j » si négatif, « aujourd'hui » si 0), Actions : **Relancer le paiement** (E7) et **Relancer** le propriétaire (E9).
  - Tri par défaut : `daysLeft` croissant puis nom de compagnie ; 15/page.
  - États vides : aucun impayé → « Rien à afficher ici. » ; filtre sans résultat → « Aucun dossier pour ces critères. » ; table : « Aucun dossier à recouvrer pour ces critères. ».
- **Modèle de données attendu** (ligne)

| champ | type | nullable | valeurs/format | source/commentaire |
|---|---|---|---|---|
| id | uuid | non | id de l'abonnement | |
| companyId / companyName | uuid / string | non | | |
| planName | string | non | | |
| status | enum | non | `past_due|suspended` | |
| price / currency | number / string | non | | montant dû |
| pastDueSince | datetime | non | | `now` si null dans la démo |
| nextBillingDate | datetime | non | | |
| deadline | enum | non | `suspension` (si past_due) \| `expiration` (si suspended) | calculé par l'API |
| delayDays | int | non | 7 (suspension) \| 30 (expiration) | constantes `SUSPENSION_DELAY_DAYS` / `EXPIRATION_DELAY_DAYS` à fournir par l'API |
| daysLeft | int | non | peut être négatif | past_due : 7 − jours écoulés depuis `pastDueSince` ; suspended : (7+30) − jours écoulés depuis `pastDueSince` |
| urgency | enum | non | `critical` (≤ 2) \| `soon` (≤ 5) \| `normal` | calculé |
| ownerName / ownerEmail / ownerPhone | string | oui | contacts masqués | |
| lastReminderAt | datetime | oui | | |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E14 | GET | `/admin/billing/unpaid` | `q`, `status` (`past_due|suspended`), `urgency`, `page`, `size`, `sort` (`companyName|ownerName|price|status|daysLeft`), défaut `daysLeft asc, companyName asc` | `{content, page, size, totalElements, summary:{totalAmount, currency, pastDue:{count,amount}, suspended:{count,amount}, byUrgency:{critical:{count,amount}, soon:{...}, normal:{...}}, mostUrgent: Row|null}}` — `summary` calculé sur tout le jeu `q` (ignore `status`/`urgency`) | COMPANY_MANAGE + plateforme |
| E7 | POST | `/admin/billing/subscriptions/{id}/retry-payment` | cf. fiche abonnement | | idem |
| E9 | POST | `/admin/billing/subscriptions/{id}/reminders` | cf. liste abonnements | | idem |
| E15 | GET | `/admin/billing/companies/{companyId}/owner-contact` | `field` | | cf. Q10 |

- **Règles métier** : ne contient que les abonnements `past_due`/`suspended` ; l'urgence se calcule à partir de `daysLeft` avec la date de référence « maintenant » (UTC) ; l'API peut renvoyer `daysLeft` et le client en déduire l'urgence, mais les seuils doivent venir de la config (Q5).
- **État côté API**
  - E14 ❌ : pas de vue cross-compagnies. Données de base présentes : `SubscriptionStatus.PAST_DUE/SUSPENDED`, `pastDueSince`, `suspendedSince` dans `SubscriptionResponse`, délais configurables `app.billing.grace-days` (7) et `app.billing.suspension-days` (30) pour le job `SubscriptionLifecycleJob` (`company-service/.../billing/SubscriptionLifecycleJob.java`). Le calcul « jours restants » est à créer ; vérifier la base exacte des 30 jours (depuis `suspendedSince` côté backend alors que l'UI les décompte depuis `pastDueSince`, Q5).
  - E7 ⚠️, E9 ❌, E15 ❌ : voir plus haut.

---

### Paiements d'abonnement — `/offre-facturation/paiements`

- **Fonctionnalités**
  - Bande de stats (hors recherche, sur tout le jeu) : « Tentatives », « Payées », « Échouées », « Montant encaissé » (somme des `paid`, formatée en `XOF` en dur).
  - Filtres : **Statut** (Tous/Payés/Échoués → `paid|failed`), **Canal** (`canal` ∈ `WAVE|ORANGE_MONEY|VISA|MASTERCARD`, libellés Wave, Orange Money, Visa, Mastercard), **Période** `du`/`au` (`YYYY-MM-DD` inclus, jour UTC de `at`), recherche `q` (compagnie, motif, numéro de facture, montant, libellé du canal).
  - Colonnes : Date (date + heure), Compagnie, Canal (logo + libellé), « Numéro / Carte » (mobile money : numéro masqué du payeur ; carte : titulaire en majuscules + 4 derniers chiffres), Montant, Statut, Motif (« — »), Facture (lien vers la fiche facture avec le numéro), Abonnement (lien vers la fiche abonnement). Plus récent d'abord ; tri client ; 15/page ; vide : « Aucun paiement pour ces critères. ».
- **Modèle de données attendu** (tentative)

| champ | type | nullable | valeurs/format | source/commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| subscriptionId / companyId / companyName | uuid / uuid / string | non | | |
| amount / currency | number / string | non | | |
| status | enum | non | `paid|failed` | (backend `PaymentStatus` : `PENDING|PAID|FAILED|REFUNDED`) |
| at | datetime | non | | |
| invoiceId / invoiceNumber | uuid / string | oui | | facture émise si `paid` |
| reason | string | oui | motif d'échec (démo : « Paiement refusé par l'opérateur (simulation) ») | |
| channel | enum | non | `WAVE|ORANGE_MONEY|VISA|MASTERCARD` | **fabriqué par hash de l'id dans la démo** ; backend = `PaymentMethodType` `MOBILE_MONEY|BANK_TRANSFER|CARD` (Q2) |
| payerPhone | string | oui | masqué, mobile money seulement | inexistant côté backend |
| cardHolder / cardLast4 | string | oui | carte seulement, 4 chiffres | idem ; jamais de PAN complet |

- **Endpoints requis**

| # | méthode | chemin proposé | paramètres | réponse | permission |
|---|---|---|---|---|---|
| E13 | GET | `/admin/billing/payment-attempts` | `q`, `status`, `channel`, `from`, `to`, `companyId`, `subscriptionId`, `page`, `size`, `sort` (`at|companyName|channel|amount|status|reason|invoiceNumber`), défaut `at desc` | `{content, page, size, totalElements, summary:{count, paidCount, failedCount, paidAmount, currency}}` | COMPANY_MANAGE + plateforme |

- **Règles métier** : lecture seule ; données de paiement strictement masquées (numéro mobile masqué, 4 derniers chiffres de carte seulement) ; le motif d'échec doit être une valeur lisible fournie par l'opérateur.
- **État côté API** : E13 ❌ — pas de table ni d'endpoint de tentatives de paiement d'abonnement (voir E5) ; le canal fin (Wave/Orange/Visa/Mastercard), le payeur et la carte n'existent nulle part (le mock `MockSubscriptionPaymentProvider.charge(amount, currency, paymentMethod, ...)` ne les conserve pas). Service : `company-service`.

---

## Synthèse des écarts

| endpoint ou donnée manquante | service recommandé | priorité | commentaire |
|---|---|---|---|
| E1 liste abonnements plateforme (pagination, filtres, tri, `planName`, `companyName`, owner, `paidVolume`, summary) | company-service | haute | l'existant `GET /companies/{id}/subscriptions` est scopé compagnie, non paginé |
| E3 détail abonnement par id seul (+ plan, companyName, flags) | company-service | haute | |
| E4 historique par abonnement avec noms de plans | company-service | moyenne | `billing-history` existe par compagnie ; ajouter noms et types `TRIAL_START`/`RENEWAL` aux libellés UI |
| E5/E13 table et endpoints des tentatives de paiement (statut, motif, facture, canal) | company-service | haute | aucune table aujourd'hui ; débloque fiche abonnement, paiements et échecs de retry |
| E7 retry-payment : renvoyer la tentative + chemin sans companyId | company-service | haute | existe (⚠️), `402` à transformer en tentative `failed` lisible |
| E8 cancel avec `reason` obligatoire (+ historique/audit) | company-service | haute | endpoint sans corps aujourd'hui |
| E10/E11 factures plateforme (filtres statut/période, `subscriptionId`, `planName`, summary) | company-service | haute | enum de statuts différent (Q3) |
| E14 file des impayés + `daysLeft`/urgence/summary | company-service | haute | calcul à créer à partir de `pastDueSince`/`suspendedSince` |
| E9 relance du propriétaire (e-mail/SMS) | notification-service (+ company-service pour le déclencheur) | haute | nécessite résolution du contact en amont |
| E12 renvoi de facture (+ PDF `pdfUrl`) | company-service + notification-service | moyenne | PDF non livré |
| E15 révélation journalisée du contact propriétaire | hr-service / identity-service via agrégateur admin | moyenne | accès → `DataAccessLog` (audit-compliance) |
| E2 compteurs de recherche par onglet | company-service | basse | peut être composé côté BFF par appels paginés `size=1` |
| Propriétaire de compagnie (nom, e-mail, tél) dans les lignes | hr-service (source) → agrégateur ou snapshot | haute | cross-service ; Q1 |
| `lastReminderAt` / `lastSentAt` | audit/activité compagnie | basse | dérivés du journal d'activité |

## Questions ouvertes

1. **Propriétaire de compagnie** : défini dans le backoffice comme l'employé de rôle `MANAGER` (premier trouvé). Qui le porte côté API (`hr-service` `Employee`, scopé compagnie) et comment l'agréger dans les listes (jointure côté BFF/gateway admin, ou snapshot événementiel dans `company-service`) ? Un seul propriétaire ou plusieurs MANAGER ?
2. **Canal de paiement** : le backoffice affiche Wave / Orange Money / Visa / Mastercard (et numéro payeur / titulaire + 4 derniers chiffres), inventés par hash dans la démo. Le backend n'a que `MOBILE_MONEY|BANK_TRANSFER|CARD`. Faut-il enrichir le modèle (opérateur, masque du payeur) ou réduire l'UI aux 3 types ?
3. **Statuts de facture** : UI `paid|failed` vs backend `DRAFT|ISSUED|PAID|OVERDUE|CANCELLED`. Faut-il aligner l'UI (ajouter émise/en retard/annulée) ou dériver `failed` du paiement associé ? Une facture « échouée » existe-t-elle réellement (le retry n'émet une facture qu'en cas de succès) ?
4. **Changement de plan** depuis le backoffice : le périmètre le mentionne mais l'UI n'a aucun bouton (historique en lecture seule). L'endpoint `PATCH /companies/{id}/subscriptions/{id}` existe (`ChangePlanRequest{newPlanId, billingCycle}`) : à exposer côté admin dans un lot futur ?
5. **Calcul des échéances d'impayé** : l'UI compte 7 jours (impayé → suspension) puis 30 jours (suspension → expiration) mais décomptés tous deux depuis `pastDueSince` (37 jours au total). Le job backend utilise `grace-days`=7 et `suspension-days`=30 (probablement depuis `suspendedSince`). Qui est la source de vérité, et l'API renvoie-t-elle `daysLeft`/`urgency` ou seulement les dates + seuils ?
6. **Relances/renvois** : stocker ou non le texte envoyé et le canal (la démo n'enregistre qu'une ligne d'activité sans message) ; limitation de fréquence ; qui envoie réellement (notification-service sans endpoint staff aujourd'hui) ?
7. **`paidVolume`/`paidCount`/`failedCount`** sont calculés par **compagnie** (pas par abonnement) dans la liste des abonnements : conserver cette sémantique ou passer à l'abonnement ?
8. **Devise** : le bandeau « Montant encaissé » est en `XOF` en dur et les résumés prennent la devise de la 1ʳᵉ ligne. Multi-devises (EUR/USD existent côté `CurrencyCode`) : sommes à séparer par devise côté API ?
9. **Prix net vs catalogue** : le backend distingue `price` (catalogue) et `totalAmount` (net après crédits de parrainage). L'UI n'affiche que `price` ; la colonne « Montant dû » des impayés doit-elle montrer `totalAmount` ? Les crédits de parrainage (`/companies/{id}/credits`) ne sont pas visibles dans ces écrans.
10. **Permissions** : toute la facturation tombe sous `COMPANY_MANAGE` (qui peut aussi être détenu par un responsable de compagnie borné). Faut-il de nouvelles permissions plateforme (`BILLING_READ`, `BILLING_MANAGE`, `BILLING_CONTACT_REVEAL`) et le garde « appelant plateforme » sur ces routes `/admin` ?
11. **Pagination et tri** : confirmer le contrat unique (`page`/`size`/`sort=champ,dir`) des listes admin et la taille maximale (le DataTable propose 10/15/25/50) ; les totaux de bandeau (factures, paiements, impayés) doivent-ils couvrir le jeu filtré complet (comportement actuel) ?
12. **Heure de référence** : les `daysLeft` utilisent une horloge injectée côté serveur Next ; l'API doit-elle fournir son propre `now` (UTC) pour éviter les dérives de fuseau ?
