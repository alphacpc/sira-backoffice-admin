# 01 — Compagnies, KYC et catalogue d'offre

Périmètre : écrans `/compagnies`, `/compagnies/[id]` (10 onglets), `/compagnies/kyc`, `/offre/plans`, `/offre/plans/[id]`, `/offre/fonctionnalites`, `/offre/paliers-partenaires`, `/offre/types-documents-kyc` et la partie « offre » du hub `/offre-facturation`. Sources lues : `src/app/(admin)/compagnies/**`, `src/app/(admin)/offre/**`, `src/app/(admin)/offre-facturation/**`, `src/components/company/**`, `src/components/billing/hub/{plans-grid,features-grid,tiers-ladder,kyc-types-list}.tsx`, `src/lib/repos/{companies,billing,billing-hub}.ts`, `src/lib/types/index.ts`, `src/lib/labels.ts`, `src/lib/data/seed.ts`, `tests/unit/{companies-repo,company-actions,offer-repos}.test.ts`.

## Vue d'ensemble

Le backoffice est l'outil de l'équipe plateforme Sira : il voit **toutes** les compagnies (aucun tenant). Il liste les compagnies, instruit leur dossier KYC (revue de documents, Kanban, activation forcée), lit leur abonnement, limites, usage, parrainage, équipe, flotte et journal d'activité, et consulte le catalogue d'offre (plans, fonctionnalités, paliers partenaires, types de documents KYC). **Seule écriture du catalogue : activer/désactiver un type de document KYC.** Aucun écran de création/modification/suspension/fermeture de compagnie ni de création/édition de plan, fonctionnalité ou palier n'existe dans le code actuel (les endpoints d'écriture existent côté API mais ne sont pas requis ici). La page `/compagnies/[id]/modele-facture` (modèle de facture de location) relève du périmètre « ventes/locations » et n'est pas documentée ici. `/offre/*` redirige vers les onglets du hub `/offre-facturation/*` (plans, fonctionnalites, paliers, documents) ; le détail d'un plan reste sur `/offre/plans/[id]`.

### Conventions transverses (valables pour tous les écrans)

- **Appelant** : jeton du backoffice = non restreint côté API (aucun claim `companyId` **et** `RBAC_MANAGE`, cf. `company-service` `PlatformOnlyAuthorizationManager`/`TenantAccessGuard`). Le compte admin porte `COMPANY_MANAGE`, `COMPANY_KYC_REVIEW`, `RBAC_MANAGE`, etc. Les permissions citées plus bas sont celles exigées par `SecurityConfig` (`company-service/.../security/SecurityConfig.java`).
- **Pas de tenant** : on réutilise les chemins existants (un appelant non restreint voit toutes les compagnies) ; les nouveaux endpoints transverses sont proposés sous `/admin/...` (voir Questions ouvertes pour le routage Gateway).
- **Casse des enums** : le backoffice utilise des valeurs minuscules pour `CompanyStatus`, `KycDocumentStatus`, `SubscriptionStatus`, `Plan.status`, `Invoice.status` ; l'API renvoie `CompanyStatus` en minuscules (`@JsonValue`) mais `DocumentStatus`/`SubscriptionStatus`/`PlanStatus`/`InvoiceStatus` en MAJUSCULES : l'adaptateur (BFF) normalise, ce n'est pas un écart bloquant.
- **Champs sensibles** : `contactEmail`/`contactPhone` ne sont jamais envoyés démasqués au navigateur (masqués côté serveur Next.js, `maskEmail`/`maskPhone`) ; la révélation est une action tracée (EP-05). L'API renvoie `supportEmail`/`supportPhone` en clair à l'appelant plateforme.
- **Motifs** : toute action sensible exige un motif texte, trimé, 1–500 caractères (`checkReason`, `MAX_REASON = 500`).
- **Identité des acteurs** : le backoffice enregistre le `sub` de la session admin comme acteur ; l'API doit tirer l'acteur du JWT (jamais du corps).

---

## Écrans

### Liste des compagnies — `/compagnies` (et `/compagnies?statut=<draft|active|suspended|closed>`)

- **Fonctionnalités** :
  - En-tête « Compagnies » + deux onglets de section : « Toutes les compagnies » (compteur = nombre total de compagnies, tous statuts) et « File de revue KYC » (compteur urgent = nombre de **documents KYC en attente** `pending`, tous tenants).
  - Filtre « Statut » (query `statut`), options : Toutes, Brouillon (`draft`), Actives (`active`), Suspendues (`suspended`), Fermées (`closed`), **chacune avec son compteur** (nécessite des comptages par statut). Valeur inconnue = « Toutes ».
  - Tableau (`DataTable`, TanStack) : recherche texte globale sur les colonnes affichées (« Rechercher une compagnie… »), tri par colonne, pagination 15/page (choix 10/15/25/50), visibilité des colonnes, ligne cliquable → `/compagnies/{id}`, état vide « Aucun résultat ». **Tout est filtré/trié/paginé côté client sur le jeu complet** : l'API doit offrir pagination + filtres + tri serveur.
  - Colonnes : Compagnie (avatar = 2 premières lettres du nom, nom, slug), Propriétaire (nom du gestionnaire ou « — »), Statut (badge), Palier (STANDARD/SILVER/GOLD), Bus (nombre), Offre (nom du plan de l'abonnement en cours ou « Aucune offre »), Facturation (Annuelle/Mensuelle ou « — »), Créée le, Activée le, Délai d'activation (calculé : `activatedAt − createdAt` en jours, « Le jour même » si 0 ; pour un brouillon « En attente depuis X » depuis `createdAt` ; sinon « — »).
  - Aucune action en ligne ni export.
- **Modèle de données attendu** (ligne `CompanyRow`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | UUID | non | | company-service |
| `slug` | string | non | `^[a-z0-9]+(-[a-z0-9]+)*$` | |
| `name` | string | non | ≤ 255 | |
| `status` | enum | non | `draft`, `active`, `suspended`, `closed` | |
| `partnerTier` | enum | non | `STANDARD`, `SILVER`, `GOLD` (code de palier) | calculé : `CompanyPartnerStatus.currentTierCode` (écrit à la lecture, EP-04) ; **doit être dans la liste** pour éviter N appels |
| `createdAt` | ISO-8601 | non | | **absent de `CompanyResponse`** |
| `activatedAt` | ISO-8601 | oui | | **absent de `CompanyResponse`** |
| `ownerName` | string | oui | nom du gestionnaire (employé au rôle `MANAGER`) | calculé : hr-service `Employee` (userId) ⨝ identity `User.displayName` ; aucun nom n'est porté par hr-service |
| `busCount` | int | non | | calculé : fleet-service (count buses par compagnie) |
| `planName` | string | oui | nom du plan de la souscription **vivante** (`TRIAL`/`ACTIVE`/`PAST_DUE`/`SUSPENDED`) | calculé : `CompanyPlanSubscription` ⨝ `Plan.name` |
| `billingCycle` | enum | oui | `MONTHLY`, `YEARLY` | idem (`BillingCycle` a aussi `CUSTOM` côté API) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/companies` (EP-01) | `status`, `q` (nom, slug, nom du propriétaire, insensible casse/accents), `page`, `size` (≤100), `sort` (`name`, `status`, `createdAt`, `activatedAt`, `busCount`, `planName`, `partnerTier`) | — | `Page<CompanyRow>` | `COMPANY_MANAGE` (non restreint) |
| GET | `/companies/stats` (EP-02) | — | — | `{ total, byStatus: {draft,active,suspended,closed}, pendingKycDocuments }` | `COMPANY_MANAGE` |

- **Règles métier** : lecture seule. « Délai d'activation » calculé côté client à partir de `createdAt`/`activatedAt` (pas besoin de champ API). Les compteurs de l'onglet et des options de filtre doivent refléter les filtres **de statut uniquement** (pas la recherche).
- **État côté API** :
  - EP-01 ⚠️ partiel : `GET /companies` existe (`company-service/.../controller/CompanyController.java:72`, `Page<CompanyResponse>`, `Pageable` seul). Manque : filtres `status`/`q` (`CompanyServiceImpl.list` fait `findAll(pageable)`), et dans `CompanyResponse` (`dto/response/CompanyResponse.java`) les champs `createdAt`, `activatedAt` (existent sur l'entité `Company`, non exposés), `partnerTier`, `ownerName`, `busCount`, `planName`, `billingCycle`. Service propriétaire recommandé : **company-service** pour la liste (+ `partnerTier`, `planName`, `billingCycle`, `createdAt`, `activatedAt` : données locales) ; `busCount` et `ownerName` sont des données d'autres services (fleet-service, hr-service/identity-service) → soit un endpoint d'agrégation de lecture `/admin/companies/overview` (BFF/aggregator), soit un enrichissement en lot côté BFF (appels par lot `POST /buses/counts`, `/users/lookup`). Pas de FK inter-services (règle 1).
  - EP-02 ❌ manquant : aucun comptage par statut ni nombre de documents en attente. Service : company-service.

---

### Fiche compagnie — `/compagnies/[id]` (`?onglet=<profil|kyc|abonnement|fonctionnalites|utilisation|parrainage|retention|equipe|flotte|activite>`, défaut `profil`)

- **Fonctionnalités communes** : En-tête = nom, description « Identifiant : {slug} », badge de statut (`draft` Brouillon, `active` Active, `suspended` Suspendue, `closed` Fermée). 10 onglets synchronisés avec l'URL (`onglet`). Compagnie inconnue → page 404 dédiée. Toutes les données de la fiche sont chargées en une fois (`CompanyDetail`) : l'API peut les fournir en N appels groupés par le BFF ; voir les EP par onglet.
- Endpoint de base : **EP-03** (voir Profil). Tous les autres onglets s'appuient sur `{id}`.

#### Onglet « Profil » (`profil`)

- **Fonctionnalités** : carte d'identité (avatar, nom, `{slug}.sira.app`, badge statut) ; carte « Gestionnaire de la compagnie » (nom cliquable vers `/utilisateurs/{userId}` si compte plateforme, sinon texte ; mention « Compte plateforme actif » / « Pas encore de compte plateforme » ; e-mail et téléphone **masqués** du gestionnaire — non révélables) ; section « Contact » : e-mail et téléphone de contact **masqués avec bouton « révéler »** (action tracée, EP-05), pays (code ISO-2 → drapeau + nom FR + code), devise ; section « Informations légales » : registre du commerce, NINEA (« — » si vide), identifiant (slug), palier partenaire (badge) ; section « Historique » : créée le, activée le (« — » si null).
- **Modèle de données attendu** (`Company` + gestionnaire) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | UUID | non | | |
| `slug`, `name` | string | non | | ✅ API |
| `status` | enum | non | `draft|active|suspended|closed` | ✅ API |
| `country` | string | non | ISO-3166 alpha-2 (ex. `SN`) | **absent** de `Company`/`CompanyResponse` (aucune colonne `country`) |
| `currency` | string | non | `CurrencyCode` (XOF/EUR/USD…) | ✅ API (nullable côté API) |
| `contactEmail` | string | non | | API : `supportEmail` ✅ (nullable) |
| `contactPhone` | string | non | | API : `supportPhone` ✅ (nullable) |
| `registrationNumber` | string | oui | ≤ 100 | colonne `Company.registration_number` ✅, **non exposée** dans `CompanyResponse`, **non modifiable** (ni Create ni UpdateCompanyRequest) |
| `ninea` | string | oui | ≤ 100 | idem |
| `createdAt` | ISO | non | | colonne ✅, non exposée |
| `activatedAt` | ISO | oui | | colonne ✅, non exposée |
| `forceActivated` | bool | non | | colonne ✅, non exposée (voir dette 13 du lot KYC) |
| `dataRetentionDays` | int | oui | 90–3650 | ✅ API |
| `partnerTier` | enum | non | STANDARD/SILVER/GOLD | EP-04 |
| `manager` | objet | oui | `{ name, userId (UUID|null), email, phone }` — gestionnaire = employé de rôle `MANAGER` | hr-service ⨝ identity-service (voir EP-24/EP-25) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/companies/{id}` (EP-03) | `id` | — | `Company` complet (champs ci-dessus) | `COMPANY_MANAGE` |
| GET | `/companies/{id}/partner-status` (EP-04) | `id` | — | `{ currentTierCode, currentTierName, computedAt }` | `COMPANY_MANAGE` ou `COMPANY_PARTNERSHIP_MANAGE` |
| POST | `/admin/companies/{id}/contact-reveals` (EP-05) | `id` | `{ field: "email"\|"phone" }` | `{ value }` (valeur en clair) **et** écriture d'une trace d'accès | `COMPANY_MANAGE` |

- **Règles métier** : la révélation d'une donnée personnelle doit écrire une ligne de journal d'accès (qui, quelle compagnie, quel champ, motif implicite) ; le backoffice enregistre « Donnée personnelle révélée : e-mail|téléphone » dans l'activité de la compagnie. Le pays s'affiche en `Intl.DisplayNames` FR (côté client). Rien n'est modifiable sur cet onglet.
- **État côté API** :
  - EP-03 ⚠️ : `GET /companies/{id}` existe (`CompanyController.java:51`, `CompanyResponse`) mais n'expose ni `country`, `registrationNumber`, `ninea`, `createdAt`, `activatedAt`, `forceActivated`, `partnerTier`. `country` n'existe pas du tout dans le modèle `Company` (à créer : company-service). `registrationNumber`/`ninea` n'ont aucune API d'écriture (aucun champ dans `CreateCompanyRequest`/`UpdateCompanyRequest`).
  - EP-04 ✅ : `CompanyPartnerStatusController.java:28` → `CompanyPartnerStatusResponse(currentTierCode, currentTierName, computedAt…)`. Note : l'appel écrit (upsert) sur un GET (dette 15 du lot partenariat).
  - EP-05 ❌ : `audit-compliance-service` n'a que `GET /data-access-logs` (lecture) ; aucun service n'écrit de `DataAccessLog` hors lui-même. À créer : endpoint interne d'écriture d'accès (ou événement `audit.events` dédié) dans **audit-compliance-service** ; la valeur claire vient déjà d'EP-03 (`supportEmail`/`supportPhone`).

#### Onglet « Vérification KYC » (`kyc`)

- **Fonctionnalités** :
  - Bandeau d'avancement : « {approuvés} / {obligatoires} documents obligatoires approuvés », barre de progression (% = approuvés/obligatoires), « Dossier complet » ou « Dossier en cours de vérification », badge « Activée de force » si `forceActivated`.
  - Bouton « Forcer l'activation » visible **uniquement si `status === "draft"`** → boîte de confirmation (destructive) avec **motif obligatoire** (≤ 500 car.).
  - Une carte par **type de document actif ou non** (registre complet `kycTypes`) : miniature cliquable (PDF en iframe / image), nom du type, « Déposé le {date} · {nom du fichier remplaçant ou PDF/Image} » ou « Aucun fichier déposé » ; badge de statut (En attente / Approuvé / Rejeté / « Non déposé ») ; badge « Non exigé » si le type est inactif ou non obligatoire ; ligne « Validé|Rejeté par {reviewedBy} · {date} » ; encart « Motif du rejet : … ».
  - Aperçu plein écran (modale) du fichier avec titre, sous-titre « Déposé le … », bouton **Télécharger**.
  - Actions par document : **Approuver** (si `pending`), **Rejeter** (si `pending`, motif obligatoire), **Remplacer** (réservé à l'administrateur backoffice — contrôle de rôle côté serveur —, sélecteur de fichier PDF/JPEG/PNG ≤ 10 Mo ; le document repasse « En attente »).
- **Modèle de données attendu** :

`KycDocument` (un par type de document pour une compagnie ; le backoffice prend le document du type) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | UUID | non | | |
| `companyId` | UUID | non | | |
| `typeCode` | string | non | ex. `REGISTRATION`, `NINEA`, `TAX_CLEARANCE`, `INSURANCE`, `TRANSPORT_LICENSE`, `ID_MANAGER` | API : `documentTypeId` (UUID) → jointure avec le registre des types |
| `typeName` | string | non | ex. « Registre du commerce » | API : `CompanyDocumentType.label` |
| `status` | enum | non | `pending`, `approved`, `rejected` | API `DocumentStatus` PENDING/APPROVED/REJECTED |
| `uploadedAt` | ISO | non | | API : `createdAt` |
| `reviewedAt` | ISO | oui | | ✅ |
| `reviewedBy` | string | oui | **nom/identifiant affichable** du relecteur | API : `reviewedBy` = UUID utilisateur → résoudre le nom (identity) |
| `rejectionReason` | string | oui | ≤ 500 | ✅ |
| `replacedFileName` | string | oui | ≤ 120 | **absent** : l'API ne conserve aucun nom de fichier (`CompanyDocument` : `fileUrl` = clé MinIO, `fileType`) |
| `fileType` (contenu) | string | non | `application/pdf`, `image/jpeg`, `image/png` | ✅ `fileType` |

`KycDocumentType` (registre, y compris inactifs) : `code` (string), `name`, `required` (bool), `active` (bool). Les 6 types seedés sont tous `required = true`, `active = true`.
Fichier : URL de téléchargement/aperçu présignée (iframe + téléchargement).

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/company-document-types` (EP-06) | `includeInactive=true` | — | `[{ id, code, label, required, active }]` | `COMPANY_MANAGE` ou `COMPANY_KYC_SUBMIT` |
| GET | `/companies/{id}/documents` (EP-07) | `id` | — | `[Document]` (cf. modèle) | `COMPANY_MANAGE`/`COMPANY_KYC_SUBMIT`/`COMPANY_KYC_REVIEW` |
| GET | `/companies/{id}/documents/{docId}/download-url` (EP-08) | ids | — | `{ url, expiresAt }` (15 min) | idem |
| PATCH | `/companies/{id}/documents/{docId}/review` (EP-09) | ids | `{ status: "APPROVED"\|"REJECTED", rejectionReason? }` | `Document` | `COMPANY_KYC_REVIEW` |
| POST | `/companies/{id}/force-activate` (EP-10) | `id` | `{ reason }` | `Company` | `COMPANY_KYC_REVIEW` |
| POST | `/companies/{id}/documents` (EP-11, « remplacer ») | `id` | multipart `file` (PDF/JPEG/PNG ≤ 10 Mo), `documentTypeId` | `Document` (statut `PENDING`) | `COMPANY_MANAGE` ou `COMPANY_KYC_SUBMIT` |

- **Règles métier** :
  - Revue : seul un document `pending` peut être revu (sinon « Le document n'est pas en attente de revue ») ; un rejet exige un motif ; l'approbation efface le motif ; l'acteur et la date de revue sont enregistrés ; une ligne d'activité « Document {type} approuvé|rejeté » est produite.
  - **Activation automatique** : à l'approbation d'un document, si la compagnie est `draft` et que **tous les types actifs et obligatoires** ont chacun un document `approved` (et qu'il existe au moins un type obligatoire), la compagnie passe `active`, `activatedAt = now`, `forceActivated = false`, activité « Compagnie activée (KYC complet) ». Une compagnie déjà activée n'est pas rétrogradée.
  - **Activation forcée** : motif obligatoire (≤ 500) ; sans effet si déjà `active` (ne réécrit ni `activatedAt` ni `forceActivated`) ; sinon `status = active`, `activatedAt = now`, `forceActivated = true`, activité « Activation forcée (contournement du KYC) » (le motif doit être **conservé**, voir écarts) ; le bouton n'est proposé qu'en `draft`.
  - **Remplacement** (admin uniquement) : le document repasse `pending`, `uploadedAt = now`, `reviewedAt/reviewedBy/rejectionReason` remis à null, nom de fichier mémorisé (≤ 120 car.), activité « Document {type} remplacé » ; format PDF/JPEG/PNG ; taille ≤ 10 Mo.
  - Un type désactivé n'est plus exigé (badge « Non exigé ») mais reste affiché avec ses documents.
- **État côté API** :
  - EP-06 ⚠️ : `CompanyDocumentTypeController.java:46` renvoie seulement les types **actifs** (`findByActiveTrue`, `CompanyDocumentTypeServiceImpl.list`), au format `CompanyDocumentTypeResponse(id, code, label, required, active, createdAt, updatedAt)`. Manque `includeInactive` (indispensable pour afficher et **réactiver** un type — dette 9 du lot KYC).
  - EP-07 ⚠️ : `CompanyDocumentController.java:65` → `CompanyDocumentResponse(id, companyId, documentTypeId, fileType, status, rejectionReason, uploadedBy, reviewedBy, reviewedAt, createdAt)`, trié `createdAt` croissant, **plusieurs documents possibles par type** (chaque upload crée une ligne). Manque : `typeCode`/`typeName` (jointure BFF avec EP-06), nom du fichier, `reviewedBy` en nom affichable, règle « dernier document par type » (le backoffice affichait le premier ; avec l'API il faut retenir le **plus récent** par `documentTypeId`).
  - EP-08 ✅ : `CompanyDocumentController.java:73` (URL présignée MinIO 15 min, `CompanyDocumentDownloadUrlResponse(url, expiresAt)`). Réserve : l'URL pointe vers `minio:9000` (non résolvable hors réseau Docker, dette 7 du lot ParcelDocument) → endpoint MinIO public à exposer.
  - EP-09 ✅ : `CompanyDocumentController.java:83` (`ReviewCompanyDocumentRequest{status, rejectionReason}` ; règles dans `CompanyDocumentServiceImpl.reviewDocument` : PENDING seulement, motif obligatoire au rejet, activation automatique, audit `audit.events`). Manque : plafond 500 caractères du motif non vérifié côté API ; si aucun type obligatoire actif n'existe, `allMatch` sur liste vide activerait la compagnie à la première approbation (le backoffice exige ≥ 1 type obligatoire).
  - EP-10 ✅ : `CompanyDocumentController.java:95` (`ForceActivateRequest{reason @NotBlank}`, idempotent si `ACTIVE`). Écarts : le motif n'est **pas persisté** (seulement logué, dette 11), pas de borne 500 ; l'API accepte aussi `SUSPENDED`/`CLOSED` alors que l'UI ne propose le bouton qu'en `draft`.
  - EP-11 ⚠️ : l'upload `POST /companies/{id}/documents` existe (`CompanyDocumentController.java:50`, multipart `file` + `documentTypeId`, types `application/pdf|image/jpeg|image/png`), **mais crée un nouveau document** (les anciens restent) au lieu de réinitialiser l'existant, ne mémorise pas le nom du fichier et n'a pas de notion d'« acteur admin remplaçant » (`uploadedBy` = userId du JWT, ✅). Acceptable si la règle « dernier par type » est adoptée ; l'activité « Document remplacé » se déduit de l'audit. Pas de borne explicite des 10 Mo vérifiée ici (config multipart du service).

#### Onglet « Abonnement et paiements » (`abonnement`)

- **Fonctionnalités** : sans abonnement : « Aucun abonnement pour cette compagnie. ». Sinon carte « Plan actuel » : nom du plan, badge statut (`trial` Essai, `active` Actif, `past_due` Impayé, `suspended` Suspendu, `expired` Expiré, `canceled` Annulé), lien « Voir l'abonnement » → `/facturation/abonnements/{subscriptionId}` (autre périmètre), prix `{price} {currency} / mois|an`, prochaine échéance (« — » si annulé/expiré) avec compte à rebours (`dans N j`, `aujourd'hui`, `N j de retard`), cycle (Mensuelle/Annuelle), **total encaissé** (somme des factures `paid`) et nombre de factures ; bandeau rouge « Abonnement suspendu pour impayé »/« Paiement en attente depuis le {pastDueSince} » avec bouton **« Relancer le paiement »** (si `past_due` ou `suspended`, confirmation sans motif) ; bandeau « Période d'essai jusqu'au {trialEndDate} » (statut `trial`) ; liste « Factures » (numéro mono, « Émise le », montant, badge `paid` Payée / `failed` Échouée) ou « Aucune facture émise. ».
- **Modèle de données attendu** :

`Subscription` (un seul affiché : la première de la liste, en pratique la vivante) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id`, `companyId`, `planId` | UUID | non | | ✅ |
| `planName` | string | non | | **absent** de `SubscriptionResponse` (jointure Plan) |
| `status` | enum | non | `trial|active|past_due|suspended|expired|canceled` | ✅ (API MAJUSCULES) |
| `billingCycle` | enum | non | `MONTHLY|YEARLY` | ✅ |
| `price` | decimal | non | prix catalogue (non remisé) | ✅ ; `totalAmount` = net débité |
| `currency` | string | non | | ✅ |
| `nextBillingDate` | date | non | | ✅ (nullable côté API quand annulé) |
| `trialEndDate` | date | oui | | ✅ |
| `pastDueSince` | date | oui | | ✅ |

`Invoice` : `id`, `number` (API `invoiceNumber`), `amount` (API `totalAmount`), `currency`, `status` (`paid|failed`), `issuedAt` (API `invoiceDate`), `subscriptionId`.

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/companies/{id}/subscriptions` (EP-12) | `id`, `status?` | — | `[Subscription]` (+ `planName`) | `COMPANY_MANAGE` |
| GET | `/companies/{id}/invoices` (EP-13) | `id` | — | `[Invoice]` récentes d'abord | `COMPANY_MANAGE` |
| POST | `/companies/{id}/subscriptions/{sid}/retry-payment` (EP-14) | ids | `{}` (sans `simulateOutcome` en production) | `Subscription` ; échec = `402` | `COMPANY_MANAGE` (non restreint pour forcer l'issue) |

- **Règles métier** : relance possible seulement si `past_due` ou `suspended` ; succès → facture payée émise, abonnement `active`, `pastDueSince` effacé, échéance + 1 période ; échec → pas de facture, message « Échec du paiement : {motif} » ; activité « Relance du paiement de l'abonnement : réussie|échec ». L'abonnement affiché = la souscription vivante, sinon la plus récente.
- **État côté API** :
  - EP-12 ⚠️ : `CompanyPlanSubscriptionController.java:57` → `SubscriptionResponse` (champs ci-dessus ✅) mais sans `planName` ; plusieurs lignes (historique) à trier/filtrer.
  - EP-13 ⚠️ : `InvoiceController.java:30` → `InvoiceResponse(id, invoiceNumber, companyId, billingPlanHistoryId, invoiceDate, … totalAmount, currency, status)`. `InvoiceStatus` API = `DRAFT|ISSUED|PAID|OVERDUE|CANCELLED` ; le statut `failed` du backoffice n'existe pas côté facture (un paiement échoué ne produit aucune facture, dette 12 : pas de table de tentative) → à clarifier (Questions). Absence d'`subscriptionId` direct (lien via `billingPlanHistoryId`).
  - EP-14 ✅ : `CompanyPlanSubscriptionController.java:101` (`RetryPaymentRequest{simulateOutcome}` réservé plateforme ; `402` si refusé).

#### Onglet « Fonctionnalités et limites » (`fonctionnalites`)

- **Fonctionnalités** : sans plan souscrit : « Aucun plan souscrit : pas de limites ni de fonctionnalités. ». Sinon : carte « Limites du plan » avec deux jauges (Utilisateurs `used / max`, Bus `used / max` ; % utilisé ; rouge et « limite presque atteinte » à ≥ 90 %), liste « Bus de la compagnie ({n}) » (plaque mono cliquable → `/flotte/bus/{id}`, badge de statut `active` Actif / `maintenance` En maintenance / `retired` Retiré ; lien « Tous les bus » ; « Aucun bus enregistré. ») ; carte « Fonctionnalités » : une vignette par fonctionnalité (nom, « Activée »/« Désactivée », icône selon code : `ONLINE_BOOKING`, `FLEET`, `PARCELS`, `HR`, sinon icône générique).
- **Modèle de données attendu** :

| Objet | Champ | Type | Nullable | Valeurs | Source |
|---|---|---|---|---|---|
| `PlanLimits` | `maxUsers`, `maxBuses` | int | non | | ✅ `PlanLimit` du plan souscrit (autres limites API non affichées : `maxEmployees`, `maxBookingsPerMonth`, `maxParcelsPerMonth`, `maxStorageGb`, `apiRateLimit`) |
| | `usedUsers`, `usedBuses` | int | non | | **calculé** : comptes plateforme liés à la compagnie (identity-service/`UserCompanyLink`) et bus (fleet-service) |
| `FeatureFlag` | `code`, `name` | string | non | | `Feature.code`, `Feature.name` |
| | `enabled` | bool | non | | `CompanyFeature.isEnabled` (et/ou `PlanFeature.isEnabled` du plan) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/plans/{planId}/limit` (EP-15) | `planId` | — | `PlanLimit` | `COMPANY_MANAGE` |
| GET | `/admin/companies/{id}/consumption` (EP-16) | `id` | — | `{ usedUsers, usedBuses }` (+ plus tard réservations/colis du mois) | `COMPANY_MANAGE` |
| GET | `/companies/{id}/features` (EP-17) | `id` | — | `[{ featureId, code, name, isEnabled, value, expiresAt }]` | `COMPANY_MANAGE` |

  (le plan souscrit vient d'EP-12 ; la liste des bus vient d'EP-26.)
- **Règles métier** : pourcentage = `min(100, round(used/max*100))` (calcul client) ; ≥ 90 % = alerte ; les fonctionnalités actives effectives devraient combiner plan + exceptions compagnie (voir Questions). Lecture seule.
- **État côté API** :
  - EP-15 ✅ : `PlanLimitController.java:39` (`GET /plans/{planId}/limit`, `PlanLimitResponse`).
  - EP-16 ❌ : aucun endpoint de consommation ; le `PlanLimit` n'est consulté par aucun service (dette 1 du lot catalogue). `usedBuses` : fleet-service ; `usedUsers` : identity-service. Service d'agrégation recommandé : BFF ou company-service interrogeant les deux (pas de FK).
  - EP-17 ⚠️ : `CompanyFeatureController.java:46` → `CompanyFeatureResponse(id, companyId, featureId, value, isEnabled, expiresAt)` ; manque `code`/`name` (jointure avec EP-35) et il n'y a pas de notion de « fonctionnalités effectives du plan » (seulement les exceptions/additifs de la compagnie).

#### Onglet « Utilisation » (`utilisation`)

- **Fonctionnalités** : 3 compteurs agrégés (cartes) — « Réservations créées » (`bookings_created`), « Colis créés » (`parcels_created`), « Appels API » (`api_calls`) — ; « Aucune donnée d'utilisation. » si vide. Trois tableaux avec totaux dans le titre : **Réservations** (canal En ligne|Guichet, statut Confirmée|Annulée, nombre, montant + devise), **Colis** (badge de statut de colis, nombre, frais d'expédition), **Appels API** (méthode, endpoint, appels, erreurs (rouge si > 0), moyenne ms, max ms) ; « Aucune donnée. » par tableau vide. Triés par nombre décroissant. **Aucun sélecteur de période** : tout est cumulé (à cadrer côté API, voir écarts).
- **Modèle de données attendu** :

| Objet | Champ | Type | Valeurs | Source |
|---|---|---|---|---|
| `UsageMetric` | `metricCode` | string | `bookings_created`, `parcels_created`, `api_calls` | company-service `UsageLog.metricCode` |
| | `label` | string | libellé FR | mapping client/BFF |
| | `value` | number | total | somme `UsageLog.value` par métrique |
| `bookings[]` | `channel` | enum | `counter`, `online` | booking-service `Booking.typeBooking` |
| | `status` | enum | `confirmed`, `cancelled` | `Booking.status` |
| | `count`, `amount`, `currency` | int, decimal, string | | agrégat par (canal, statut) |
| `parcels[]` | `status` | enum | `ParcelStatus` (PENDING, IN_TRANSIT, AT_HUB, DELIVERED, RETURNED, LOST, CANCELLED) | parcel-service |
| | `count`, `fees`, `currency` | | | agrégat sur `shipping_fee` |
| `api[]` | `endpoint`, `method` | string | endpoint normalisé | monitoring-service `ApiUsageLine` |
| | `count`, `errors`, `avgResponseMs`, `maxResponseMs` | | `errors` = lignes dont `statusClass ≠ 2xx` ; moyenne pondérée par `count` | à agréger depuis les lignes par jour |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/companies/{id}/usage-logs` (EP-18) | `from`, `to`, `aggregate=metric` | — | `[{ metricCode, total }]` | `COMPANY_MANAGE` |
| GET | `/admin/companies/{id}/bookings-breakdown` (EP-19) | `from`, `to` | — | `[{ channel, status, count, amount, currency }]` | permission booking plateforme (`BOOKING_MANAGE` non restreint) |
| GET | `/admin/companies/{id}/parcels-breakdown` (EP-20) | `from`, `to` | — | `[{ status, count, fees, currency }]` | `PARCEL_MANAGE` non restreint |
| GET | `/usage/api` (EP-21) | `companyId`, `from`, `to` (≤ 93 j) | — | `[{ day, endpoint, method, statusClass, count, avgResponseMs, maxResponseMs }]` | `MONITORING_READ` + plateforme |

- **Règles métier** : lecture seule ; agrégations côté API (ou BFF) ; `errors` = somme des `count` des lignes de classe ≠ `2xx` ; moyenne = Σ(moy×count)/Σcount.
- **État côté API** :
  - EP-18 ⚠️ : `UsageLogController.java:44` liste brute (`UsageLogResponse(id, companyId, planId, userId, metricCode, value, status, dateCreated)`), sans agrégation ; et aucun producteur ne l'alimente (écriture manuelle, dette 2) → les 3 métriques seraient vides.
  - EP-19 ❌ : booking-service n'a aucun agrégat par canal/statut (`BookingController` : `GET /bookings` paginé avec `tripId` seulement). Service : booking-service.
  - EP-20 ❌ : parcel-service idem (`ParcelController.java:84`). Service : parcel-service.
  - EP-21 ⚠️ : existe (`monitoring-service/.../controller/ApiUsageController.java:37`, filtre `companyId`, plage max 93 jours, `from`/`to` obligatoires, agrégé par jour) ; le backoffice n'a pas de période → à fixer (ex. 30 j) ; agrégation par endpoint côté client.

#### Onglet « Parrainage et crédits » (`parrainage`)

- **Fonctionnalités** : 3 cartes : code de parrainage (mono, « Aucun » si null), crédits disponibles (somme + nombre), crédits utilisés (somme + nombre) ; tableau « Crédits reçus ({n}) » (montant, badge `AVAILABLE` Disponible / `APPLIED` Utilisé) ou « Aucun crédit reçu. ». Lecture seule (pas de génération de code).
- **Modèle de données attendu** : `referral = { code: string|null, credits: [{ id, amount, currency, status: "AVAILABLE"|"APPLIED" }] }`. `code` = code du parrainage `ACTIVE` de la compagnie ; devise des totaux = devise du premier crédit sinon `XOF`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/companies/{id}/referrals` (EP-22) | `id` | — | `[{ referralCode, status, rewardValue, createdAt, redeemedAt }]` | `COMPANY_MANAGE` ou `COMPANY_PARTNERSHIP_MANAGE` |
| GET | `/companies/{id}/credits` (EP-23) | `id` | — | `[{ id, amount, currency, status, source, createdAt }]` | idem |

- **Règles métier** : lecture seule ; plusieurs codes `ACTIVE` peuvent coexister (dette 7) → le backoffice n'en affiche qu'un (règle à fixer : le plus récent `ACTIVE`).
- **État côté API** : EP-22 ✅ (`CompanyReferralController.java:38`, `CompanyReferralResponse`) ; EP-23 ✅ (`CompanyCreditController.java:29`, `CompanyCreditResponse` : `amount`, `currency`, `status` `AVAILABLE|APPLIED`, `source` `REFERRAL|TIER`).

#### Onglet « Rétention des données » (`retention`)

- **Fonctionnalités** : affiche `{dataRetentionDays ?? 730} jours` ; texte « Durée définie pour cette compagnie. » ou « Défaut plateforme : aucune durée propre n'est définie. » ; note : au-delà, IP et user-agents des traces d'audit sont anonymisés, les identifiants d'utilisateur restent. **Lecture seule** (la modification vit dans le module conformité).
- **Modèle de données attendu** : `dataRetentionDays` (int|null, 90–3650) ; défaut plateforme 730 (constante affichée en dur).
- **Endpoints requis** : aucun nouveau (champ de EP-03). Le défaut plateforme (730) vit dans `audit-compliance-service` (`app.retention.default-days`) : à exposer si on veut éviter la constante.
- **Règles métier** : aucune.
- **État côté API** : `dataRetentionDays` ✅ dans `CompanyResponse` ; défaut 730 : ❌ non exposé (basse priorité).

#### Onglet « Équipe » (`equipe`)

- **Fonctionnalités** : cartes de comptage (Employés, Responsable, Agent de vente, Chauffeur) ; tableau « Liste des employés » : nom (lien `/utilisateurs/{userId}` si compte), rôle (Responsable `MANAGER` / Agent de vente `GUICHETIER` / Chauffeur `CHAUFFEUR`), e-mail **masqué**, badge « Compte plateforme » / « Pas de compte » ; « Aucun employé. ». Pas de téléphone ni de révélation ici.
- **Modèle de données attendu** : `Employee = { id, companyId, name, email, phone, role: MANAGER|GUICHETIER|CHAUFFEUR, userId: UUID|null }`. `userId` null tant que la compagnie est brouillon.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/employees` (EP-24) | `companyId`, `page`, `size` | — | `Page<Employee>` | `EMPLOYEE_MANAGE` non restreint |
| GET | `/api/users` ou `POST /api/users/lookup` (EP-25) | `companyId` ou `ids[]` | — | `[{ id, displayName, email, phone, roleCode }]` | `USER_MANAGE` |

- **Règles métier** : lecture seule ; `role` = rôle plateforme du compte (`MANAGER`, `GUICHETIER`, `CHAUFFEUR`) car hr-service ne porte pas de rôle.
- **État côté API** :
  - EP-24 ⚠️ : `EmployeeController.java:98` (`GET /employees`, `Pageable` seul, `EmployeeResponse(id, companyId, employeeCode, userId, status, jobTitle, …)`) : pas de filtre `companyId` (un appelant non restreint les voit tous), pas de nom/e-mail/téléphone/rôle.
  - EP-25 ❌ : identity-service n'expose que `GET /api/users/{id}` et `GET /api/users/{id}/exists` (`UserAdminController.java:35,49`) et `GET /api/roles` ; aucun listing/lookup par compagnie ou par lots. Service : identity-service.

#### Onglet « Flotte et trajets » (`flotte`)

- **Fonctionnalités** : tableau « Bus ({n}) » (plaque → `/flotte/bus/{id}`, badge statut bus ; « Aucun bus. », lien « Tous les bus » → `/flotte/bus`) et tableau « Trajets ({n}) » (libellé de ligne « Origine → Destination » → `/flotte/trajets/{id}`, départ, badge statut `planned` Planifié / `boarding` Embarquement / `departed` Parti / `cancelled` Annulé ; triés par départ croissant ; « Aucun trajet. » ; lien « Tous les trajets »).
- **Modèle de données attendu** : `FleetBus = { id, companyId, plate, status: active|maintenance|retired }` ; `FleetTrip = { id, companyId, route (libellé), departure (ISO), status }`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/buses` (EP-26) | `companyId`, `page`, `size` | — | `Page<Bus>` (`plateNumber`, `status`) | `FLEET_MANAGE` non restreint |
| GET | `/trips` (EP-27) | `companyId`, `page`, `size`, `sort=departureDatetime` | — | `Page<Trip>` avec libellé de ligne (noms des gares) | `FLEET_MANAGE` non restreint |

- **Règles métier** : lecture seule ; libellé de trajet = noms des gares d'origine/destination (jointure fleet-service interne, même service).
- **État côté API** : EP-26 ⚠️ (`BusController.java:66`, `Pageable` seul, pas de filtre `companyId` ; `BusResponse.plateNumber`, `status` ✅). EP-27 ⚠️ (`TripController.java:79`, idem ; `TripResponse` ne porte que `routeId`/`originStationId`/`destinationStationId`/`departureDatetime`/`status`, pas de libellé).

#### Onglet « Activité » (`activite`)

- **Fonctionnalités** : tableau « Activité récente ({n}) » : date/heure, acteur, action (texte français libre), plus récent d'abord ; « Aucune activité. ». Les actions produites par les écrans de cette section : « Document {type} approuvé|rejeté|remplacé », « Compagnie activée (KYC complet) », « Activation forcée (contournement du KYC) », « Donnée personnelle révélée : e-mail|téléphone », « Dossier KYC déplacé vers « {étape} » », « Relance du paiement de l'abonnement : … ». Pas de pagination ni de filtre.
- **Modèle de données attendu** : `ActivityEntry = { id, companyId|null, at (ISO), actor (nom/identifiant), action (texte), userId? }`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/audit-logs` (EP-28) | `companyId`, `from`, `to`, `entityType`, `page`, `size` (≤100) | — | `Page<AuditLog>` | `COMPLIANCE_READ` + plateforme |

- **Règles métier** : journal en ajout seul ; le BFF traduit `(entityType, action, beforeState→afterState)` en libellé français et résout `actorUserId` en nom.
- **État côté API** : EP-28 ⚠️ : `AuditLogController.java:50` (`GET /audit-logs`, filtres `companyId`, `entityType`, `entityId`, `actorUserId`, `action`, `from`, `to`, `sourceService`, pagination ; `AuditLogResponse(id, companyId, actorUserId, actorType, action, entityType, entityId, beforeState, afterState, ipAddress, userAgent, createdAt…)`). Manque : libellés FR et nom d'acteur (BFF), et certaines actions n'émettent aucune ligne (révélation de contact, dépôt de document, étape Kanban — voir écarts).

---

### File de revue KYC (Kanban) — `/compagnies/kyc`

- **Fonctionnalités** :
  - Même en-tête/onglets que la liste (onglet « File de revue KYC » actif, compteur = documents en attente).
  - **Kanban à 5 colonnes** dans cet ordre : `submitted` « Soumis » (« Dossiers reçus, pas encore traités »), `needs_info` « Complément de dossier » (« En attente de pièces du client »), `in_review` « En cours » (« Documents en cours de revue »), `approved` « Validé » (« KYC complet, compagnie activée »), `rejected` « Rejeté » (« Dossiers refusés »). Chaque colonne : compteur total, **pagination serveur par colonne** (8 cartes/page, « a–b sur N », page précédente/suivante), état vide « Aucun dossier · dépose-en un ici ».
  - Barre de filtres, **appliqués côté serveur** (action `fetchKycBoard`, saisie debouncée 300 ms) : recherche texte (nom de compagnie **ou** nom du propriétaire, ≤ 80 car., insensible casse), Ancienneté (Toutes / > 7 / > 14 / > 30 jours : `minAge` ∈ {0,7,14,30}), Palier (Tous/STANDARD/SILVER/GOLD), Tri (`oldest` Plus anciens d'abord — défaut —, `newest`, `name` Nom A→Z, `progress` Plus avancés d'abord) ; bouton « Réinitialiser » dès qu'un filtre s'écarte du défaut ; changer un filtre remet toutes les pages à 1.
  - Ligne de synthèse : « {total} dossier(s) » + « {late} en attente depuis plus de 14 jours » (rouge) ; message d'erreur fermable.
  - Carte de dossier : avatar, nom, propriétaire (« Propriétaire inconnu »), poignée de glissement (sauf `approved`), segments colorés par document obligatoire (approved/pending/rejected/missing) avec infobulle « {type} · {libellé} », « {approuvés} / {requis} documents », âge (« activée il y a … » pour `approved`, rouge si > 14 j hors étapes finales), note (2 lignes) si présente.
  - **Glisser-déposer** d'une carte entre colonnes (souris/clavier) ou boutons du panneau ; déplacement **optimiste** puis confirmation serveur ; refus → message d'erreur + rechargement. Déposer vers `needs_info` ou `rejected` ouvre une confirmation **avec motif obligatoire** (rejeter = destructive).
  - Clic sur une carte → panneau latéral : avatar/nom/propriétaire, badge d'étape, lien « Fiche compagnie » (`/compagnies/{id}?onglet=kyc`), note, liste des documents requis (icône + statut Approuvé / À revoir / Rejeté / Manquant) avec **Approuver/Rejeter** par document en attente, et (si l'étape ≠ `approved`) boutons « Passer en cours » (si ≠ `in_review`), « Demander un complément » (si ≠ `needs_info`), « Rejeter le dossier » (si ≠ `rejected`) ; mention « La validation se fait en approuvant tous les documents. »
- **Modèle de données attendu** (`KycBoard`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `columns[stage].total` | int | non | stage ∈ `submitted|needs_info|in_review|approved|rejected` | calculé |
| `columns[stage].page`, `pageCount` | int | non | page bornée à `[1, pageCount]` | calculé |
| `columns[stage].cards[]` | `KycCard` | | 8 par page | |
| `total` | int | non | cartes correspondant aux filtres, toutes colonnes | calculé |
| `late` | int | non | cartes hors `approved`/`rejected` avec `ageDays > 14` | calculé |
| `card.companyId`, `card.name` | UUID, string | non | | company-service |
| `card.ownerName` | string | oui | | hr-service/identity (voir EP-24/25) |
| `card.stage` | enum | non | cf. ci-dessus | **règle** ci-dessous |
| `card.partnerTier` | enum | non | STANDARD/SILVER/GOLD | EP-04 |
| `card.docs[]` | `{ id (string, vide si manquant), typeName, status: approved|pending|rejected|missing }` | | un élément par **type actif et obligatoire**, dernier document du type | |
| `card.docsApproved`, `card.docsRequired` | int | non | | |
| `card.ageDays` | int | non | jours entiers ≥ 0 | depuis la date du **plus ancien** document déposé (ou `createdAt`) ; pour `approved` depuis `activatedAt` (ou `createdAt`) |
| `card.note` | string | oui | motif de déplacement, ou « Compagnie fermée » | stocké |

  Règle d'appartenance et d'étape : `status = draft` → étape = étape forcée stockée si elle existe, sinon dérivée (un document `rejected` → `needs_info` ; sinon ≥ 2 documents `approved` → `in_review` ; sinon `submitted`) ; `status = closed` → `rejected` (note « Compagnie fermée ») ; `status = active` → `approved` ; `suspended` → **exclue** du tableau.
  Étape forcée stockée : `{ stage ∈ needs_info|in_review|rejected|submitted, note|null, at }`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/kyc/board` (EP-29) | `q`, `minAge` (0/7/14/30), `tier`, `sort` (`oldest|newest|name|progress`), `pageSubmitted`, `pageNeedsInfo`, `pageInReview`, `pageApproved`, `pageRejected` | — | `KycBoard` | `COMPANY_KYC_REVIEW` |
| PATCH | `/admin/companies/{id}/kyc-stage` (EP-30) | `id` | `{ stage: "needs_info"\|"in_review"\|"rejected", note? }` | `{ ok }` | `COMPANY_KYC_REVIEW` |
| PATCH | `/companies/{id}/documents/{docId}/review` | — | — | — | **= EP-09** (approuver/rejeter depuis le panneau) |
| GET | `/company-document-types` | | | | **= EP-06** (types obligatoires actifs) |

- **Règles métier (déplacement d'étape)** : seules les compagnies `draft` peuvent changer d'étape (« Seuls les dossiers en brouillon peuvent changer d'étape ») ; refus : vers `submitted` (« Un dossier ne revient pas à « Soumis » »), vers `approved` (« Pour valider un dossier, approuve tous ses documents : la compagnie est alors activée ») ; motif obligatoire (≤ 500 car.) pour `needs_info` et `rejected` ; `in_review` accepté sans motif ; la carte `approved` n'est pas déplaçable ; chaque déplacement journalise « Dossier KYC déplacé vers « {étape} » » dans l'activité de la compagnie. L'étape forcée **n'est pas effacée** par une approbation/rejet de document (elle prime tant qu'elle existe) ; l'activation (automatique ou forcée) fait basculer vers `approved`.
- **État côté API** :
  - EP-29 ❌ : aucune notion d'étape de dossier KYC ni d'âge de dossier dans company-service (le modèle ne porte que `Company.status` + `CompanyDocument.status`). Service recommandé : **company-service** (calcul sur `Company` ⨝ `CompanyDocument` ⨝ `CompanyDocumentType`, plus le propriétaire via hr/identity).
  - EP-30 ❌ : aucun champ/table de « stage KYC » ni de note ; à créer dans company-service (table `company_kyc_reviews(company_id, stage, note, updated_by, updated_at)` + audit).

---

### Catalogue — Plans — `/offre/plans` (redirige vers `/offre-facturation`, onglet « Plans »)

- **Fonctionnalités** : en-tête « Offre et facturation » ; recherche globale `q` (formulaire GET, ≤ 80 car., insensible à la casse **et aux accents**) qui filtre partout et affiche le nombre de résultats par onglet ; filtre « Statut » (Tous, Actifs, Inactifs) ; bande de 4 indicateurs : Plans, Plans actifs, Abonnements en cours (somme des `liveSubscriptions`), Essai le plus long (max `trialDays`, en jours) — masquée quand une recherche est active ; **grille de cartes** (un plan par carte, lien → `/offre/plans/{id}`) : nom, code mono, badge Actif/Inactif, prix mensuel (FCFA/mois), prix annuel et pourcentage d'économie `round((1 − yearly/(monthly×12))×100)` si > 0, trois pastilles (bus max, utilisateurs, jours d'essai ou « — »), liste des fonctionnalités incluses (« Aucune fonctionnalité incluse » si vide), « N abonnement(s) en cours » ; le plan le plus souscrit (≥ 1) est mis en avant « Le plus souscrit » ; plan inactif atténué. Pagination côté page de 12 plans (`page`, `?statut=`). Vide : « Rien à afficher ici. » ou « Aucun résultat dans « Plans » » + lien vers les onglets où la recherche correspond.
- **Modèle de données attendu** (`PlanCard`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | UUID | non | | ✅ |
| `code` | string | non | ex. `STARTER`, `PRO`, `ENTERPRISE`, `LEGACY` | **absent** de `Plan` (le backoffice affiche et recherche sur `code`) |
| `name` | string | non | ≤ 100 | ✅ |
| `status` | enum | non | `active`, `inactive` | API `PlanStatus` : `ACTIVE`, `INACTIVE`, `ARCHIVED` (ARCHIVED à décider) |
| `priceMonthly`, `priceYearly` | decimal | non | `@Digits(8,2)` | ✅ (nullable côté API) |
| `setupFee` | decimal | non | | ✅ |
| `currency` | string | non | `XOF` | ✅ |
| `trialDays` | int | non | 0 = aucun essai | ✅ (nullable côté API) |
| `maxUsers`, `maxBuses` | int | non | | `PlanLimit` (EP-15) |
| `features[]` | string[] (noms) | non | | `PlanFeature` ⨝ `Feature.name` (EP-33 + EP-35) |
| `liveSubscriptions` | int | non | souscriptions `trial|active|past_due|suspended` | **calculé** par l'API (EP-34) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/plans` (EP-31) | `status`, `q`, `page`, `size`, `include=limit,features,liveSubscriptions` | — | `Page<Plan>` enrichi | `COMPANY_MANAGE` |

- **Règles métier** : lecture seule ; recherche = nom, code, statut en toutes lettres (actif/inactif), prix, noms de fonctionnalités ; ordre d'affichage = ordre de création (stable). Catalogue petit (≤ dizaines) : peut être entièrement chargé et filtré par le BFF.
- **État côté API** : EP-31 ⚠️ : `PlanController.java:52` (`Page<PlanResponse>`, `Pageable` seul) ; `PlanResponse` sans `code`, sans limites, sans fonctionnalités, sans nombre d'abonnements vivants ; pas de filtre `status`/`q`.

---

### Fiche plan — `/offre/plans/[id]`

- **Fonctionnalités** : titre « Plan {name} », « Code : {code} », badge statut. Carte résumé : icône, nom, « N abonnement(s) · revenu mensuel récurrent X » (MRR = somme, sur les abonnements `active`, de `price` si `MONTHLY` sinon `price/12`, arrondi), prix mensuel en grand. Section « Tarifs » : prix annuel, frais d'installation, période d'essai (« N jours » ou « Aucune »). Section « Limites » : utilisateurs max, bus max. Section « Fonctionnalités incluses ({n}) » : nom, code mono, badge type (Activable|Quota) ou « Aucune fonctionnalité incluse. ». Section « Abonnements liés ({n}) » : compagnie (lien → `/facturation/abonnements/{subId}`), statut (badge), prix, prochaine échéance (« — » si annulé/expiré) ou « Aucun abonnement sur ce plan. ». Plan inconnu → 404 dédiée.
- **Modèle de données attendu** : `Plan` (cf. ci-dessus + `setupFee`, `trialDays`, `limits`), `features[]` = `{ code, name, kind: "boolean"|"quota" }`, `subscriptions[]` = `{ id, companyId, companyName, planName, status, billingCycle, price, currency, nextBillingDate }`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/plans/{id}` (EP-32) | `id` | — | `Plan` (+ `code`) | `COMPANY_MANAGE` |
| GET | `/plans/{id}/limit` | | | | **= EP-15** |
| GET | `/plans/{id}/features` (EP-33) | `id` | — | `[{ featureId, value, isEnabled }]` | `COMPANY_MANAGE` |
| GET | `/admin/subscriptions` (EP-34) | `planId`, `status`, `page`, `size` | — | `Page<{ id, companyId, companyName, planId, planName, status, billingCycle, price, currency, nextBillingDate }>` | `COMPANY_MANAGE` non restreint |

- **Règles métier** : MRR calculé côté client à partir des abonnements ; aucune action d'écriture.
- **État côté API** : EP-32 ⚠️ (`PlanController.java:38`, pas de `code`). EP-33 ✅ (`PlanFeatureController.java:40`, `PlanFeatureResponse(id, planId, featureId, value, isEnabled)` ; nom/code/type à joindre avec EP-35). EP-34 ❌ : les souscriptions ne s'énumèrent que **par compagnie** (`CompanyPlanSubscriptionController`, `/companies/{companyId}/subscriptions`) ; aucune vue plateforme filtrable par plan ni nom de compagnie. Service : company-service (le nom de la compagnie est local).

---

### Catalogue — Fonctionnalités — `/offre/fonctionnalites` (redirige vers `/offre-facturation/fonctionnalites`)

- **Fonctionnalités** : recherche globale `q` (nom, code, « activable »/« quota », noms de plans) ; filtre « Type » (Tous, Activables = `boolean`, À quota = `quota`) ; indicateurs : Fonctionnalités, Activables, À quota, Sans plan ; **matrice fonctionnalité × plan** groupée par type (« Fonctionnalités activables — Incluses ou non dans un plan », « Fonctionnalités à quota — Consommation limitée par plan »), une ligne par fonctionnalité (nom, code mono) et une colonne par plan (lien vers la fiche, mention « inactif »), coche si le plan inclut la fonctionnalité, tiret sinon. Groupes vides masqués. Pas de pagination.
- **Modèle de données attendu** : `FeatureWithPlans = { code, name, kind: "boolean"|"quota", plans: [{ id, name, status }] }` ; liste de colonnes = tous les plans (`{ id, name, status }`).
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/features` (EP-35) | `type`, `q`, `page`, `size`, `include=plans` | — | `Page<Feature>` (+ `plans[]`) | `COMPANY_MANAGE` |
| GET | `/plans` | | | | **= EP-31** (colonnes de la matrice) |

- **Règles métier** : lecture seule. Mapping de type : `boolean` ↔ API `FeatureType.BOOLEAN` ; `quota` ↔ `LIMIT` (ou `USAGE`, à trancher). Une fonctionnalité « sans plan » = `plans` vide.
- **État côté API** : EP-35 ⚠️ : `FeatureController.java:53` (`Page<FeatureResponse>` : `id, name, description, code, category, status, featureType (BOOLEAN|LIMIT|USAGE), isCore, isAddon, isPublic, addonPrice…`) ; manque la liste des plans qui incluent la fonctionnalité (inverse de `PlanFeature`), les filtres `type`/`q` ; tri non défini.

---

### Catalogue — Paliers partenaires — `/offre/paliers-partenaires` (redirige vers `/offre-facturation/paliers`)

- **Fonctionnalités** : recherche globale (code, remise, ancienneté) ; pas de filtre ; **section « Parcours d'un partenaire »** (frise : un jalon par palier avec code, « Dès l'activation » ou « {n} mois d'ancienneté », « −{remise} % ») et barre de répartition des compagnies par palier (« Répartition des N compagnies ») ; **cartes par palier** : code (badge), « Niveau {rang} », remise en grand (« {x} % »), ancienneté (« Dès l'activation » ou « {n} mois minimum »), nombre de compagnies et part en % (barre). Ordre = ancienneté minimale croissante. Pas d'édition.
- **Modèle de données attendu** : `TierWithCount = { code: STANDARD|SILVER|GOLD, minMonths: int, discountPercent: number, companies: int }`. Seeds : STANDARD 0 mois / 0 %, SILVER 6 / 5 %, GOLD 12 / 10 %.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/partner-tiers` (EP-36) | `include=companyCount`, `sort=minTenureMonths` | — | `Page<{ id, code, name, minTenureMonths, discountPercentage, companyCount }>` | `COMPANY_MANAGE` |

- **Règles métier** : lecture seule ; pourcentage = `round(companies/total×100)`. Le « palier » d'une compagnie est calculé à la lecture (ancienneté depuis `activatedAt`).
- **État côté API** : EP-36 ⚠️ : `PartnerTierController.java:34` (`Page<PartnerTierResponse>` : `id, code, name, minTenureMonths, discountPercentage, createdAt`) ; manque le nombre de compagnies par palier (aucune agrégation) ; ni édition ni tri imposé. Les compagnies sans ligne `CompanyPartnerStatus` (jamais lues) ne sont pas comptées.

---

### Catalogue — Types de documents KYC — `/offre/types-documents-kyc` (redirige vers `/offre-facturation/documents`)

- **Fonctionnalités** : recherche globale (nom, code, « obligatoire »/« facultatif », « actif »/« inactif ») ; filtre « Type » (Tous, Obligatoires, Facultatifs, Désactivés) ; liste de types avec icône par code (`REGISTRATION`, `NINEA`, `TAX_CLEARANCE`, `INSURANCE`, `TRANSPORT_LICENSE`, `ID_MANAGER`), nom, description (texte FR par code, générique sinon), badge obligatoire/facultatif, **interrupteur actif/inactif**, anneau de synthèse « {actifs obligatoires}/{total} requis ». **Action** : basculer actif/inactif → confirmation avec **motif obligatoire** (désactiver = destructive : « Ce document ne sera plus exigé pour activer une compagnie. Les documents déjà déposés sont conservés. » ; réactiver : « Ce document sera de nouveau exigé… »).
- **Modèle de données attendu** : `KycDocumentType = { code: string, name: string, required: boolean, active: boolean }` (+ `id` UUID côté API).
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/company-document-types` | `includeInactive=true` | — | | **= EP-06** |
| PATCH | `/company-document-types/{id}` (EP-37) | `id` (UUID, le backoffice envoie le `code`) | `{ active: boolean, reason: string }` | `CompanyDocumentType` | plateforme (`COMPANY_MANAGE` non restreint) |

- **Règles métier** : motif obligatoire (1–500) ; **sans effet si l'état ne change pas** (aucune activité) ; **interdit de désactiver le dernier type obligatoire actif** (« Impossible de désactiver le dernier type de document obligatoire actif ») ; type inconnu → « Type de document introuvable » ; effet de bord : une entrée d'activité plateforme « Type de document KYC « {nom} » désactivé|réactivé. Motif : {motif} » (journal sans compagnie) ; **rétroaction sur le KYC** : un type désactivé n'est plus exigé, donc une compagnie `draft` dont tous les autres types obligatoires sont approuvés devient activable (le backoffice recalcule à la lecture ; l'API ne réévalue pas rétroactivement, dette 2 du lot KYC) ; réactiver le rend de nouveau requis.
- **État côté API** : EP-37 ⚠️ : `PATCH /company-document-types/{id}` existe (`CompanyDocumentTypeController.java:39`, `UpdateCompanyDocumentTypeRequest{label, required, active}`, plateforme seulement) ; manque : champ `reason` et audit du changement (aucun `AuditEventWriter` dans `CompanyDocumentTypeServiceImpl`), garde « dernier type obligatoire actif », accès par `code`. La création (`POST`) existe aussi mais n'est pas utilisée par le backoffice.

---

### Hub `/offre-facturation` (partie « offre ») — `/offre-facturation`, `/offre-facturation/{plans(défaut),fonctionnalites,paliers,documents}`

- **Fonctionnalités** : en-tête « Offre et facturation » avec description par onglet ; **8 onglets** dont 4 hors périmètre (Abonnements, Paiements, Factures, Impayés → document facturation) ; ici : Plans, Fonctionnalités, Paliers, Documents KYC avec compteurs (nombre de résultats par onglet, qui tiennent compte de la recherche `q`) ; barre de recherche globale commune (`q`, ≤ 80 car., placeholder dépendant de l'onglet, conservée dans les liens d'onglets) ; bloc « Résultats pour « q » : N dans toute l'offre et la facturation. Effacer » ; état vide avec suggestions « Mais ça correspond dans : … » ; filtre propre à l'onglet via `statut` (valeurs : plans `active|inactive`, fonctionnalités `boolean|quota`, documents `required|optional|inactive`) ; bande d'indicateurs par onglet (cf. écrans ci-dessus). L'onglet Paliers n'a ni filtre ni indicateurs.
- **Modèle de données attendu** : `counts: { plans, fonctionnalites, paliers, documents }` (entiers, filtrés par `q`).
- **Endpoints requis** : aucun nouvel endpoint : les 4 catalogues sont petits ; le BFF charge EP-31/EP-35/EP-36/EP-06 et calcule recherche (sans accents), filtres et compteurs. Si le volume grossit : `GET /admin/offer/search?q=` ❌ (non requis aujourd'hui).
- **Règles métier** : recherche insensible aux accents et à la casse sur les champs listés par onglet ; pagination de 12 pour les plans uniquement.
- **État côté API** : couvert par EP-31, EP-35, EP-36, EP-06.

---

## Index des endpoints requis

| ID | Méthode | Chemin | Service | État |
|---|---|---|---|---|
| EP-01 | GET | `/companies` | company-service | ⚠️ |
| EP-02 | GET | `/companies/stats` | company-service | ❌ |
| EP-03 | GET | `/companies/{id}` | company-service | ⚠️ |
| EP-04 | GET | `/companies/{id}/partner-status` | company-service | ✅ |
| EP-05 | POST | `/admin/companies/{id}/contact-reveals` | audit-compliance-service (+ company-service) | ❌ |
| EP-06 | GET | `/company-document-types` (`includeInactive`) | company-service | ⚠️ |
| EP-07 | GET | `/companies/{id}/documents` | company-service | ⚠️ |
| EP-08 | GET | `/companies/{id}/documents/{docId}/download-url` | company-service | ✅ |
| EP-09 | PATCH | `/companies/{id}/documents/{docId}/review` | company-service | ✅ |
| EP-10 | POST | `/companies/{id}/force-activate` | company-service | ✅ |
| EP-11 | POST | `/companies/{id}/documents` (remplacement) | company-service | ⚠️ |
| EP-12 | GET | `/companies/{id}/subscriptions` | company-service | ⚠️ |
| EP-13 | GET | `/companies/{id}/invoices` | company-service | ⚠️ |
| EP-14 | POST | `/companies/{id}/subscriptions/{sid}/retry-payment` | company-service | ✅ |
| EP-15 | GET | `/plans/{planId}/limit` | company-service | ✅ |
| EP-16 | GET | `/admin/companies/{id}/consumption` | company-service (agrégat) | ❌ |
| EP-17 | GET | `/companies/{id}/features` | company-service | ⚠️ |
| EP-18 | GET | `/companies/{id}/usage-logs` (agrégé) | company-service | ⚠️ |
| EP-19 | GET | `/admin/companies/{id}/bookings-breakdown` | booking-service | ❌ |
| EP-20 | GET | `/admin/companies/{id}/parcels-breakdown` | parcel-service | ❌ |
| EP-21 | GET | `/usage/api` | monitoring-service | ⚠️ |
| EP-22 | GET | `/companies/{id}/referrals` | company-service | ✅ |
| EP-23 | GET | `/companies/{id}/credits` | company-service | ✅ |
| EP-24 | GET | `/employees?companyId=` | hr-service | ⚠️ |
| EP-25 | GET | `/api/users?companyId=` (ou lookup par lots) | identity-service | ❌ |
| EP-26 | GET | `/buses?companyId=` | fleet-service | ⚠️ |
| EP-27 | GET | `/trips?companyId=` | fleet-service | ⚠️ |
| EP-28 | GET | `/audit-logs?companyId=` | audit-compliance-service | ⚠️ |
| EP-29 | GET | `/admin/kyc/board` | company-service | ❌ |
| EP-30 | PATCH | `/admin/companies/{id}/kyc-stage` | company-service | ❌ |
| EP-31 | GET | `/plans` | company-service | ⚠️ |
| EP-32 | GET | `/plans/{id}` | company-service | ⚠️ |
| EP-33 | GET | `/plans/{id}/features` | company-service | ✅ |
| EP-34 | GET | `/admin/subscriptions?planId=` | company-service | ❌ |
| EP-35 | GET | `/features` | company-service | ⚠️ |
| EP-36 | GET | `/partner-tiers` | company-service | ⚠️ |
| EP-37 | PATCH | `/company-document-types/{id}` | company-service | ⚠️ |

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| `CompanyResponse` : `createdAt`, `activatedAt`, `forceActivated`, `registrationNumber`, `ninea`, `country`, `partnerTier` | company-service | haute | colonnes existantes sauf `country` (à créer) ; indispensables à la liste, au profil et au calcul du délai d'activation |
| Filtres `status`, `q`, tri sur `GET /companies` + `planName`/`billingCycle`/`partnerTier` dans la liste | company-service | haute | aujourd'hui `Pageable` seul ; le backoffice filtre/trie/pagine côté client |
| `GET /companies/stats` (par statut + documents KYC en attente) | company-service | haute | compteurs de filtres et d'onglets |
| `ownerName` (gestionnaire) et `busCount` dans la liste ; équipe avec nom/e-mail/téléphone/rôle | identity-service + hr-service + fleet-service | haute | pas de FK ni de listing par compagnie ; agrégation BFF ou endpoints de lookup par lots (`/api/users/lookup`, `/buses/counts`) |
| Filtre `companyId` sur `GET /employees`, `/buses`, `/trips` | hr-service, fleet-service | haute | un appelant non restreint obtient tout, sans filtre |
| `GET /admin/kyc/board` + `PATCH …/kyc-stage` (étape de dossier, note, âge) | company-service | haute | concept absent du modèle ; nécessite une table de revue de dossier |
| `GET /company-document-types?includeInactive=true` | company-service | haute | impossible de réactiver un type sinon |
| `PATCH /company-document-types/{id}` : `reason`, audit, garde « dernier type obligatoire actif », accès par code | company-service | haute | règles testées dans `offer-repos.test.ts` |
| Documents KYC : `typeCode/typeName`, nom de fichier, `reviewedBy` lisible, règle « dernier document par type » | company-service | haute | `CompanyDocument` ne garde pas le nom ; plusieurs documents par type |
| Remplacement de document = nouvelle ligne (pas de réinitialisation) | company-service | moyenne | acceptable avec « dernier par type » ; l'ancien doit rester consultable |
| Motif de `force-activate` non persisté ; plafond 500 car. des motifs non imposé | company-service | moyenne | dette 11 du lot KYC ; traçabilité conformité |
| Journal d'accès à la révélation de contact (`DataAccessLog`) | audit-compliance-service | haute | aucun service n'écrit de `DataAccessLog` hors lui-même |
| Journal d'activité : libellés FR, noms d'acteurs, événements manquants (révélation, étape Kanban, dépôt) | audit-compliance-service + BFF | moyenne | tout le journal d'activité aujourd'hui est du texte libre côté mock |
| Consommation (`usedUsers`, `usedBuses`) vs `PlanLimit` | company-service (agrégat) + identity/fleet | moyenne | aucun service ne consulte `PlanLimit` |
| Agrégats usage : réservations par canal/statut, colis par statut | booking-service, parcel-service | moyenne | aucun agrégat existant ; `UsageLog` jamais alimenté |
| Usage API sur période choisie (le backoffice n'en a pas) | monitoring-service | basse | endpoint existant, plage ≤ 93 jours |
| `code` du plan ; limites et fonctionnalités inclus dans la liste ; `liveSubscriptions` | company-service | haute | `Plan` n'a pas de `code` ; le backoffice recherche et affiche `code` |
| `GET /admin/subscriptions?planId=` (abonnements d'un plan avec nom de compagnie) | company-service | haute | seule énumération existante est par compagnie |
| Plans par fonctionnalité (inverse de `PlanFeature`), type `boolean`/`quota` | company-service | moyenne | mapping `BOOLEAN`/`LIMIT`/`USAGE` à trancher |
| Nombre de compagnies par palier | company-service | moyenne | `CompanyPartnerStatus` calculé à la lecture : lignes manquantes pour les compagnies jamais lues |
| Statut de facture `failed` et tentatives de paiement | company-service | moyenne | n'existe pas (aucune table de tentative, dette 12 du lot facturation) |
| URL présignée non résolvable hors réseau Docker | company-service / infra | moyenne | endpoint MinIO public à exposer pour l'aperçu et le téléchargement |
| Défaut de rétention (730 j) exposé | audit-compliance-service | basse | constante affichée en dur |

## Questions ouvertes

1. **Vue plateforme vs scopée compagnie** : on propose de réutiliser les chemins existants avec un jeton non restreint (aucun claim `companyId` + `RBAC_MANAGE`). Faut-il en plus des routes `/admin/**` dédiées ? Le Gateway ne route aujourd'hui que par préfixe de service (`/companies/**`, `/plans/**`, …) : un préfixe `/admin/**` commun exigerait un routage par sous-chemin ou un BFF d'agrégation. À trancher.
2. **Agrégation cross-service** (propriétaire, nombre de bus, comptes utilisés, usage réservations/colis) : endpoints dédiés dans un service d'agrégation (BFF Next.js ou service « admin ») ou appels par lots depuis le backoffice ? Le BFF Next.js suffit-il (N+1 maîtrisé par endpoints « lookup par lots ») ?
3. **Étapes du Kanban KYC** : doivent-elles être **persistées** (table dédiée) ou **dérivées** des documents ? Le comportement actuel mélange les deux (dérivation + forçage manuel qui prime). Faut-il notifier la compagnie (« complément de dossier ») ? Une compagnie `suspended` reste-t-elle hors tableau ?
4. **Document KYC unique par type** : l'API autorise plusieurs documents par type. Convention proposée : le **plus récent** fait foi, les anciens restent historisés. Le « remplacement » du backoffice doit-il écraser (réinitialiser) ou créer une nouvelle version ? Et conserver le nom de fichier d'origine ?
5. **Activation automatique avec 0 type obligatoire** : le backoffice exige au moins un type obligatoire actif, l'API activerait sur une liste vide. À aligner.
6. **Facture `failed` et paiements échoués** : `Invoice.status` de l'API n'a pas `failed` ; un paiement échoué n'est pas enregistré. Faut-il une table de tentatives (utile au hub facturation) ?
7. **Fonctionnalités effectives d'une compagnie** : somme des `PlanFeature` du plan souscrit + `CompanyFeature` (exceptions/add-ons) ? Quelle règle de priorité, et qui la calcule ?
8. **Type de fonctionnalité** : `quota` du backoffice correspond-il à `LIMIT`, `USAGE`, ou aux deux ?
9. **Statut de plan** `ARCHIVED` : affiché comme « Inactif » ou nouveau filtre ?
10. **Période de l'usage** (onglet Utilisation) : cumulée depuis la création ? 30/90 derniers jours ? Mois courant ? (`monitoring-service` plafonne à 93 jours.)
11. **Pays de la compagnie** (`country`) : n'existe pas dans le modèle ; à créer, ou déduire de la devise ? Idem `registrationNumber`/`ninea` : aucune API d'écriture aujourd'hui (comment sont-ils renseignés ?).
12. **Nom du « propriétaire »** : gestionnaire = employé au rôle plateforme `MANAGER` (le premier ? unique ?). Que faire s'il y en a plusieurs ?
13. **Acteur affiché** (« reviewedBy ») : nom, e-mail masqué ou identifiant ? Données personnelles du relecteur Sira exposées aux autres admins ?
14. **Rôle « administrateur backoffice »** pour le remplacement de fichier : contrôle uniquement côté BFF ou permission dédiée côté API ?
15. **Changement d'état d'une compagnie** (suspendre/fermer/réactiver) : aucun écran aujourd'hui, mais `closed → rejected` dans le Kanban suppose que l'état soit modifiable ailleurs ; prévu dans une version ultérieure ?
