# 06 — Colis et clients

## Vue d'ensemble

Hub `/colis-clients` à 5 onglets (Aperçu, Colis, Clients, Fidélité, Avis) plus 3 fiches de détail (`/colis/[id]`, `/clients/comptes/[id]`, `/clients/avis/[id]`). Les routes `/colis`, `/clients/comptes`, `/clients/fidelite` et `/clients/avis` ne sont que des redirections vers les onglets (aucune donnée). Le backoffice voit **toutes les compagnies** (filtre optionnel `compagnie`), n'affiche **jamais** e-mail ni téléphone (seul le téléphone du destinataire d'un colis est révélable, avec journalisation). Actions d'écriture : **déclarer un colis perdu** (motif obligatoire), **révéler le téléphone du destinataire** (journalisé) et **ignorer un avis** (motif obligatoire). Services propriétaires : `parcel-service` (colis, jambes, historique, documents), `customer-service` (clients, fidélité, parrainage, avis), avec des données jointes de `company-service`, `fleet-service`, `booking-service` et `identity-service`.

**Constat structurel.** Le backoffice lit aujourd'hui un store en mémoire où tout est déjà joint (nom de compagnie, libellé de trajet, nom de l'expéditeur, statut du compte utilisateur, etc.) et où liste, recherche, tri et pagination se font **en mémoire côté serveur Next.js sur le jeu complet** (hormis le pager de l'onglet Avis, 12/page ; les autres listes passent par `DataTable` sans pagination serveur). L'API doit donc offrir pagination, filtres et recherche serveur, et soit renvoyer des projections enrichies, soit laisser le BFF du backoffice agréger plusieurs services (voir Questions ouvertes). Le backend actuel est **scopé par compagnie** (claim `company_id`) ; seul un appelant « plateforme » (sans claim `company_id` **et** avec `RBAC_MANAGE`) voit toutes les compagnies (`TenantAccessGuard.isUnrestricted`), ce qui est le cas du compte `ADMIN` du backoffice.

Conventions utilisées ci-dessous : préfixe proposé `/admin/...` (vue plateforme, via le Gateway) ; pagination `page`/`size` (0-based, défaut 20, plafond 100, tri serveur fixé) ; états de colis `PENDING | IN_TRANSIT | AT_HUB | DELIVERED | CANCELLED | RETURNED | LOST` ; recherche `q` insensible à la casse **et aux accents** (`fold` : NFD sans diacritiques + minuscules), max 80 caractères.

### Index des endpoints requis (référencés E1…E22)

| # | Méthode | Chemin proposé | Écran(s) |
|---|---|---|---|
| E1 | GET | `/admin/parcels` | Hub Colis |
| E2 | GET | `/admin/parcels/stats` | Hub Colis (bandeau) |
| E3 | GET | `/admin/parcels/{id}` | Fiche colis |
| E4 | GET | `/admin/parcels/{id}/legs` | Fiche colis |
| E5 | GET | `/admin/parcels/{id}/history` | Fiche colis |
| E6 | POST | `/admin/parcels/{id}/declare-lost` | Fiche colis |
| E7 | POST | `/admin/parcels/{id}/recipient-phone/reveal` | Fiche colis |
| E8 | GET | `/admin/care/overview` | Hub Aperçu |
| E9 | GET | `/admin/care/search-counts` | Hub (compteurs d'onglets) |
| E10 | GET | `/admin/customers` | Hub Clients |
| E11 | GET | `/admin/customers/stats` | Hub Clients (bandeau) |
| E12 | GET | `/admin/customers/{id}` | Fiche client |
| E13 | GET | `/admin/customers/{id}/loyalty-accounts` | Fiche client |
| E14 | GET | `/admin/customers/{id}/sponsorships` | Fiche client |
| E15 | GET | `/admin/customers/{id}/bookings` | Fiche client |
| E16 | GET | `/admin/customers/{id}/feedbacks` | Fiche client |
| E17 | GET | `/admin/loyalty-programs` | Hub Fidélité |
| E18 | GET | `/admin/loyalty-accounts/tier-distribution` | Hub Fidélité + Aperçu |
| E19 | GET | `/admin/feedbacks` | Hub Avis |
| E20 | GET | `/admin/feedbacks/summary` | Hub Avis (synthèse notes) |
| E21 | GET | `/admin/feedbacks/{id}` | Fiche avis |
| E22 | PATCH | `/admin/feedbacks/{id}/status` | Fiche avis (ignorer) |

Transverse (liste déroulante « Compagnie » de chaque onglet) : `GET /companies` de `company-service` (`CompanyController`, ✅ existe, paginé, scopé tenant ; non compté dans les E ci-dessus car appartient au périmètre « Compagnies »).

---

### Hub — onglet Aperçu — `/colis-clients`
- **Fonctionnalités** :
  - Recherche globale (champ `q`, désactivé de fait sur cet onglet : `q` n'est pas pris en compte par l'aperçu) et filtre **Compagnie** (liste déroulante avec recherche, option « Toutes »).
  - 4 tuiles : « Colis en circulation » (IN_TRANSIT + AT_HUB, avec sous-texte « N colis au total »), « Taux de livraison » (`—` si aucun colis clos ; sous-texte « en moyenne N h » ou « colis clos »), « Clients inscrits » (sous-texte « N nouveaux en 30 j »), « Note moyenne » (`x.y / 5` ou `—` ; sous-texte « N avis · P en attente »).
  - « Flux des colis » : 4 colonnes PENDING / IN_TRANSIT / AT_HUB / DELIVERED (barre proportionnelle au max, min 8 %), ligne d'exceptions (CANCELLED+RETURNED+LOST, RETURNED, LOST en rouge si > 0, frais encaissés en XOF).
  - « Colis en retard » : 5 plus anciens retards (triés par date de livraison prévue croissante), lien vers la fiche, « + N autre(s) » si plus ; état vide « Aucun colis en retard. ».
  - Donut « Ce qu'on transporte » (répartition par `parcelType`, triée décroissante), donut « Paliers de fidélité » (REGULAR/VIP/PREMIUM = nombre de **comptes de fidélité**, pas de clients) avec points moyens par client et nombre d'entreprises.
  - « Meilleurs clients » : top 5 par points cumulés (tie-break nom), lien fiche client.
  - « Voix des clients » : note moyenne, distribution 1→5, 4 derniers avis (lien fiche avis).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `parcels.total` | int | non | — | **Calculé API**, après filtre compagnie |
| `parcels.byStatus` | map ParcelStatus→int | non | les 7 clés toujours présentes (0 si vide) | calculé |
| `parcels.deliveryRate` | int % | oui | `round(DELIVERED / (DELIVERED+RETURNED+LOST) × 100)` ; null si dénominateur 0 | calculé |
| `parcels.avgHours` | int | oui | moyenne arrondie de `(actualDeliveryAt − pickupAt)` des colis DELIVERED ayant `actualDeliveryAt` | calculé |
| `parcels.revenue` | decimal | non | somme de `shippingFee` des colis `paymentStatus=PAID` **et** `currency=XOF` (compagnie filtrée) | calculé ; mono-devise XOF seulement |
| `parcels.lateCount` | int | non | colis non clos (hors DELIVERED/CANCELLED/RETURNED/LOST) avec `expectedDeliveryAt` < now | calculé |
| `parcels.late[]` (≤5) | `TrackedParcel` (voir Hub Colis) | non | tri `expectedAt` asc | calculé |
| `parcels.byType[]` | `{type: ParcelType, value:int}` | non | tri décroissant | calculé |
| `customers.total` / `fresh` / `corporate` | int | non | `fresh` = `createdAt` ≤ 30 j | calculé ; **non filtré par compagnie** (le filtre `compagnie` ne s'applique pas aux clients) |
| `customers.avgPoints` | int | non | moyenne arrondie de `totalPoints` par client (0 si aucun) | calculé ; somme toutes compagnies |
| `customers.tiers[]` | `{tier, value}` | non | REGULAR/VIP/PREMIUM, **filtré par compagnie** (comptes de fidélité) | calculé |
| `customers.top[]` (≤5) | `{id, name, totalPoints, …}` | non | tri points desc puis nom | calculé |
| `reviews.average` | decimal 1 déc. | oui | null si 0 avis | calculé (après filtre compagnie) |
| `reviews.total`, `pending`, `distribution[5]` | int | non | `distribution[i]` = nb d'avis de note i+1 ; `pending` = status PENDING | calculé |
| `reviews.recent[]` (≤4) | `FeedbackRow` | non | plus récents d'abord | voir Hub Avis |

- **Endpoints requis** :

| Méthode | Chemin | Query | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/care/overview` (E8) | `companyId?` | — | objet ci-dessus (`parcels`, `customers`, `reviews`) | plateforme (ex. `PARCEL_MANAGE`+`CUSTOMER_MANAGE`, appelant non restreint) |
| GET | `/admin/care/search-counts` (E9) | `q?`, `companyId?` | — | `{colis, comptes, fidelite, avis}` (entiers) | idem |
| GET | `/admin/loyalty-accounts/tier-distribution` (E18) | `companyId?` | — | `[{tier, value}]` | `CUSTOMER_MANAGE` plateforme |

  E9 sert aux badges de compteur de chaque onglet (et à la suggestion « Mais ça correspond dans : Colis (3), … » quand l'onglet courant est vide) ; `comptes` **ignore** `companyId`.
- **Règles métier** : « en retard » = non clos ET `expectedDeliveryAt < maintenant` ; tout est recalculé à chaque requête (`force-dynamic`, pas de cache). `deliveryRate` ne compte que les colis clos (DELIVERED/RETURNED/LOST), pas CANCELLED.
- **État côté API** :
  - E8 ❌ — aucun agrégat plateforme dans `parcel-service` (`ParcelController` : `GET /parcels` paginé seulement) ni `customer-service`. Service recommandé : agrégation côté BFF/`analytics` ; sinon endpoints de stats dans `parcel-service` (`/parcels/stats`) et `customer-service` (`/customers/stats`, `/feedbacks/summary`).
  - E9 ❌ — pas de comptage par recherche.
  - E18 ❌ — `customer-service` n'expose que `GET /loyalty-accounts` (⚠️ liste complète sans pagination, `LoyaltyAccountController`), de quoi calculer la distribution côté client mais pas efficacement.

---

### Colis — liste — `/colis-clients/colis`
- **Fonctionnalités** :
  - Bandeau de 4 stats (masqué quand `q` est saisi) calculé sur tous les colis de la compagnie filtrée : « Colis » (total), « En circulation » (IN_TRANSIT+AT_HUB), « Livrés », « En retard ».
  - Filtres : Compagnie (`compagnie`), Statut (`statut` ∈ PENDING, IN_TRANSIT, AT_HUB, DELIVERED, CANCELLED, RETURNED, LOST — libellés « En attente, En transit, Au hub, Livrés, Annulés, Retournés, Perdus »), Contenu (`type` ∈ DOCUMENT, PACKAGE, FRAGILE, PERISHABLE, OTHER — « Document, Colis standard, Fragile, Périssable, Autre »), recherche libre `q` (fold, sur code colis, n° de suivi, expéditeur, destinataire, libellé de trajet, nom de compagnie).
  - Tri par défaut : `createdAt` décroissant puis `id`. Colonnes : Colis (code + n° suivi), Expéditeur → Destinataire (+ compagnie), Trajet, Contenu (type + poids kg), Suivi (tracker 4 étapes Enregistré/En transit/Au hub/Livré ou pastille Annulé/Retourné/Perdu + mention « En retard · prévu le <date> »), Frais (montant + « Payé / Remboursé / En attente »). `DataTable` du composant offre tri colonne ; ligne cliquable → `/colis/{id}`.
  - Pagination : aucune côté serveur (jeu complet passé à `DataTable`) → l'API doit paginer. État vide : « Aucun colis pour ces critères. » + liens vers les autres onglets contenant des résultats si `q` ; compteur « Résultats pour « q » : N au total ».
- **Modèle de données attendu** (`TrackedParcel` = `ParcelRow` + retard) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | uuid | non | — | parcel-service `Parcel.id` |
| `parcelCode` | string | non | ex. `PCL-XXXXXXXX` | `Parcel.parcelCode` ✅ |
| `trackingNumber` | string | non | — | ✅ |
| `companyId` | uuid | non | — | ✅ |
| `companyName` | string | non | « — » si inconnue | **jointure company-service** (non fournie par parcel-service) |
| `senderName` | string | non | — | ❌ le backend n'a que `senderId` (uuid, `Parcel.senderId`) : nom à joindre depuis customer-service (`Customer.name`) |
| `senderCustomerId` | uuid | oui | lien fiche client (fiche colis) | `Parcel.senderId` (mappe vers `Customer.id`? à confirmer, cf. Questions) |
| `recipientName` | string | non | — | ✅ `recipientName` |
| `routeLabel` | string | non | « A → B » ou « — » | jointure fleet-service (trip → route → stations) |
| `parcelType` | enum | non | DOCUMENT/PACKAGE/FRAGILE/PERISHABLE/OTHER | ✅ |
| `weightKg` | decimal | non | — | ✅ |
| `shippingFee` | decimal | non | — | ✅ |
| `currency` | string | non | `XOF`… | ✅ `CurrencyCode` |
| `status` | enum | non | 7 valeurs | ✅ |
| `paymentStatus` | enum | non | PENDING (« En attente »/« À payer »), PAID, REFUNDED | ✅ |
| `legCount` | int | non | nb de jambes | **calculé API** (`parcel_trips`) ; absent du DTO actuel |
| `createdAt` | ISO instant | non | — | ✅ |
| `expectedAt` | ISO instant | non | `deliveryDatetimeExpected` | ✅ |
| `deliveredAt` | ISO instant | oui | `deliveryDatetimeActual` | ✅ |
| `late` | bool | non | statut non clos ET expectedAt < now | **calculé API** |

  Le téléphone destinataire n'est **pas** dans la projection liste.
- **Endpoints requis** :

| Méthode | Chemin | Query | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/parcels` (E1) | `companyId?`, `status?`, `parcelType?`, `q?`, `late?`, `page`, `size`, `sort` (défaut `createdAt,desc`) | `Page<TrackedParcel>` | plateforme (`PARCEL_MANAGE`, non restreint) |
| GET | `/admin/parcels/stats` (E2) | `companyId?` | `{total, inCirculation, delivered, late}` | idem |

- **Règles métier** : `q` agit sur 6 champs dont des champs joints (compagnie, trajet, noms) → la recherche doit se faire côté API, sur des colonnes dénormalisées ou une vue agrégée. Les stats ignorent `q`/`status`/`type` (calculées sur le total de la compagnie filtrée).
- **État côté API** :
  - E1 ⚠️ — `GET /parcels` (`ParcelController.list`, `parcel-service/.../controller/ParcelController.java:84`) : paginé (`Pageable`), borné à la compagnie de l'appelant, **tout compagnies pour un appelant non restreint** (`ParcelServiceImpl.list` → `findAll`), mais **aucun filtre** (status/type/q/companyId), pas de `senderName`/`companyName`/`routeLabel`/`legCount`/`late`. Le DTO `ParcelResponse` expose aussi `recipientPhone` en clair et `recipientAddress`, `notes`, `paymentMethodId` (à ne pas relayer au navigateur).
  - E2 ❌.

---

### Colis — fiche — `/colis/[id]` (`?onglet=resume|itineraire|historique`)
- **Fonctionnalités** :
  - En-tête : titre « Colis <parcelCode> », sous-titre « <trajet> · <compagnie> », badge statut (`data-testid=parcel-status`), bouton **« Déclarer le colis perdu »** (danger) affiché seulement si statut non clos ; si non clos mais déclaration impossible (statut PENDING) : message « Déclaration de perte impossible : <raison>. ».
  - Onglet **Résumé** : carte récap (code, n° de suivi, badges statut et paiement « À payer / Payé / Remboursé », frais formatés avec devise, itinéraire origine → destination) ; panneau **Personnes** (compagnie → `/compagnies/{id}`, expéditeur → `/clients/comptes/{senderCustomerId}` si renseigné sinon texte, destinataire, **téléphone destinataire masqué** avec bouton « révéler ») ; panneau **Contenu et dates** (type, poids kg, prise en charge, livraison prévue, livré le ou « — », créé le) ; panneau Description si non vide.
  - Onglet **Itinéraire** (« Itinéraire (N jambe(s)) ») : tableau Jambe (séquence), Trajet (lien `/flotte/trajets/{tripId}`), Départ (ou « — »), Code d'affectation. Pas d'action d'ajout de jambe.
  - Onglet **Historique** (« Historique (N) ») : frise chronologique croissante : badge nouveau statut, auteur (`changedBy` ou « Création du colis »), notes, date.
  - **Déclarer perdu** : boîte de confirmation destructive, motif obligatoire (≤ 500 car.), puis refresh de la page.
  - **Révéler le téléphone** : action serveur journalisée ; le numéro réel ne transite jamais autrement.
  - Les **documents** (ParcelDocument) n'ont **aucun** écran actuellement ; la demande « documents » n'est donc pas couverte par l'UI (voir Questions ouvertes).
- **Modèle de données attendu** (`ParcelDetail`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `parcel.*` | voir `Parcel` ci-dessous | — | — | parcel-service |
| `companyName` | string | non | — | jointure company-service |
| `originName`, `destinationName` | string | non | nom de station, « — » si inconnue | jointure fleet-service (`originStationId`, `destinationStationId`) |
| `routeLabel` | string | non | — | jointure fleet-service via `tripId` |
| `recipientPhoneMasked` | string | non | format `maskPhone` : `+221•••••••34` ou `••••••34` ; « •••• » si < 3 chiffres | **masquage fait par l'API** (le navigateur ne doit jamais recevoir le numéro) |
| `legs[]` | `ParcelLegRow` | non | tri `sequence` asc | voir E4 |
| `history[]` | `ParcelHistoryRow` | non | tri `changedAt` asc puis id | voir E5 |
| `lostBlockedReason` | string | oui | « Ce colis est déjà clos » / « Un colis en attente ne peut pas être déclaré perdu » / null | calculé API (règle ci-dessous) |

  `Parcel` : `id, companyId, parcelCode, trackingNumber, senderName, senderCustomerId|null, recipientName, recipientPhone (non exposé), weightKg, parcelType, description (string, peut être vide), tripId, originStationId, destinationStationId, pickupAt, expectedDeliveryAt, actualDeliveryAt|null, status, shippingFee, currency, paymentStatus, createdAt`.
  `ParcelLegRow` : `id, sequence:int, assignmentCode:string, tripId:uuid, routeLabel:string, departure:ISO|"" , tripStatus:TripStatus` (la colonne Départ n'affiche pas `tripStatus`).
  `ParcelHistoryRow` : `id, previousStatus:ParcelStatus|null, newStatus, notes:string|null, changedBy:string|null (affiché tel quel : e-mail/identifiant du staff, « Création du colis » si null), changedAt`.
- **Endpoints requis** :

| Méthode | Chemin | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/parcels/{id}` (E3) | — | — | `ParcelDetail` sans legs/history, téléphone masqué | `PARCEL_MANAGE` plateforme |
| GET | `/admin/parcels/{id}/legs` (E4) | — | — | `ParcelLegRow[]` | idem |
| GET | `/admin/parcels/{id}/history` (E5) | — | — | `ParcelHistoryRow[]` | idem |
| POST | `/admin/parcels/{id}/declare-lost` (E6) | — | `{reason}` (1–500 car., trim) | `200` colis mis à jour ; `404` inconnu ; `409`+message si bloqué | idem |
| POST | `/admin/parcels/{id}/recipient-phone/reveal` (E7) | — | — | `{value: "<numéro>"}` ; écrit un événement d'audit sans le numéro | idem + `DataAccessLog` |

- **Règles métier** :
  - Ordre des gardes de `declareLost` : colis existe → motif non vide → statut non clos → statut ≠ PENDING. Seuls IN_TRANSIT et AT_HUB passent. Effets : statut LOST, ligne d'historique (`previousStatus`, `newStatus=LOST`, `notes=motif`, `changedBy=acteur`), entrée d'activité compagnie « Colis X déclaré perdu. Motif : … ».
  - Machine à états du backend (alignée) : PENDING→{IN_TRANSIT, CANCELLED} ; IN_TRANSIT→{AT_HUB, DELIVERED, RETURNED, LOST} ; AT_HUB→{DELIVERED, RETURNED, LOST} ; DELIVERED/CANCELLED/RETURNED/LOST terminaux ; AT_HUB→IN_TRANSIT uniquement via `POST /parcels/{id}/legs`.
  - Révélation du téléphone : journalisée dans l'activité de la compagnie (« Donnée personnelle révélée : téléphone du destinataire du colis X »), jamais avec le numéro ; équivalent RGPD `DataAccessLog` (`audit-compliance-service`).
  - Erreurs renvoyées en message lisible : « Colis introuvable », « Un motif est obligatoire », raisons ci-dessus, « Session expirée, reconnecte-toi ».
- **État côté API** :
  - E3 ⚠️ — `GET /parcels/{id}` (`ParcelController:76`) existe mais renvoie le téléphone en clair, pas de noms joints ni de `lostBlockedReason`, et `senderId` au lieu de `senderName`/`senderCustomerId`.
  - E4 ⚠️ — `GET /parcels/{id}/legs` (`ParcelController:116`) renvoie `ParcelLegResponse{id, tripId, companyId, assignmentCode, createdAt}` : **manque `sequence`** (ordre implicite par `createdAt`), `routeLabel`, `departure`, `tripStatus` (jointure fleet-service).
  - E5 ❌ — `ParcelHistory` (entité `parcel-service/.../entity/ParcelHistory.java`: id, parcelId, previousStatus, newStatus, notes, changedBy (UUID), changedAt) n'a **aucun endpoint** (aucun contrôleur/DTO). `changedBy` est un UUID `Employee`/user : le backoffice affiche une chaîne lisible (à résoudre via identity-service).
  - E6 ⚠️ — `PATCH /parcels/{id}/status` `{status, notes}` (`UpdateParcelStatusRequest`; `ParcelController:91`) permet IN_TRANSIT/AT_HUB→LOST avec la même machine à états, mais **`notes` est facultatif** (le backoffice exige un motif) et le `409` de transition est générique. À encapsuler en `declare-lost` côté admin avec motif obligatoire.
  - E7 ❌ — aucun endpoint de révélation journalisée (le DTO expose déjà le numéro). Service : `parcel-service` + événement `DataAccessLog` vers `audit-compliance-service` (règle 6).

---

### Clients — liste — `/colis-clients/comptes`
- **Fonctionnalités** :
  - Pas de filtre Compagnie (clients non rattachés à une compagnie). Filtres : Palier (`palier` ∈ REGULAR/VIP/PREMIUM — « Regular, VIP, Premium » ; un client sans compte de fidélité a `tier = null`, affiché « Aucun compte » et exclu de tout filtre palier), Profil (`profil` ∈ particulier/entreprise → `isCorporate`), Compte (`statut` ∈ active/suspended → statut du `User` identity), recherche `q` (fold, sur nom, palier, « entreprise »/« particulier »).
  - Bandeau (masqué si `q`) : Clients, Entreprises, Points distribués (somme `totalPoints`), Comptes suspendus (calculés sur la liste complète non filtrée).
  - Tri par défaut nom croissant. Colonnes : Client (nom, « Entreprise »/« Particulier », « · Parrainé »), Palier (pastille Regular/VIP/Premium), Points, Activité (icônes : réservations en ligne, colis envoyés, avis), Compte (Actif/Suspendu), Inscrit le. Ligne cliquable → `/clients/comptes/{id}`. Pagination : aucune côté serveur actuellement → à prévoir.
  - État vide « Aucun client pour ces critères. ». Mention : aucun e-mail/téléphone n'est affiché.
- **Modèle de données attendu** (`TieredCustomer`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | uuid | non | — | `Customer.id` (customer-service) |
| `name` | string | non | — | ✅ `CustomerResponse.name` |
| `isCorporate` | bool | non | — | ✅ |
| `accountCount` | int | non | nb de `CustomerLoyaltyAccount` | calculé API |
| `totalPoints` | int | non | somme des `loyaltyPoints` toutes compagnies | calculé API |
| `tier` | enum | oui | REGULAR<VIP<PREMIUM : **le plus élevé** parmi ses comptes ; null si aucun compte | calculé API |
| `onlineBookings` | int | non | réservations dont `userId` = celui du client | booking-service (`Booking.userId`) — jointure inter-service |
| `parcelCount` | int | non | colis dont l'expéditeur = ce client | parcel-service (`senderId`) |
| `feedbackCount` | int | non | — | customer-service |
| `sponsored` | bool | non | `sponsorshipId != null` | ✅ `CustomerResponse.sponsorshipId` |
| `userStatus` | `active\|suspended` | non | statut du compte `User` | identity-service |
| `createdAt` | ISO | non | — | ✅ |

- **Endpoints requis** :

| Méthode | Chemin | Query | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/customers` (E10) | `q?`, `tier?`, `corporate?`, `userStatus?`, `page`, `size`, `sort` (défaut `name,asc`) | `Page<TieredCustomer>` | `CUSTOMER_MANAGE` plateforme |
| GET | `/admin/customers/stats` (E11) | — | `{total, corporate, totalPoints, suspended}` | idem |

- **Règles métier** : les e-mail/téléphone du client ne doivent jamais être renvoyés ; aucun masquage nécessaire car non exposés. Le palier global n'existe pas en base (il est par compagnie) : « palier le plus élevé » est une règle d'affichage à calculer.
- **État côté API** :
  - E10 ❌ — `customer-service` n'expose **aucune liste de clients** : uniquement `POST /customers` (inscription), `GET/PATCH /customers/me` (`CustomerController`) ; la doc dit explicitement « pas de CRUD staff par id » (`docs/services/customer-service.md:173`). À créer : `GET /customers` (staff, `CUSTOMER_MANAGE`, vue plateforme paginée + filtres + jointures agrégées).
  - E11 ❌.

---

### Clients — fiche — `/clients/comptes/[id]` (`?onglet=profil|fidelite|parrainage|reservations|avis`)
- **Fonctionnalités** : lecture seule, 5 onglets.
  - **Profil** : nom, « Entreprise »/« Particulier » (`data-testid=customer-kind`), badge « Compte actif/suspendu », lien « Voir le compte » → `/utilisateurs/{userId}`, colis envoyés, points cumulés (« N pts »), « Client depuis le » (date).
  - **Fidélité** : total de points (`data-testid=loyalty-total`) et nombre de comptes ; une carte par compte de fidélité (un par compagnie, tri nom de compagnie) : titre = nom du programme (ou « Aucun programme »), lien compagnie, badge palier (Standard/VIP/Premium — NB `membershipLabel` affiche **« Standard »** pour REGULAR, alors que le hub affiche « Regular »), points ; tableau des mouvements (Date, Réservation → `/ventes/reservations/{bookingId}`, Points « +N »), plus récents d'abord ; état vide « Aucun compte de fidélité. ».
  - **Parrainage** : « Parrainé par <parrain> avec le code <code> (<compagnie>) le <date> » (`data-testid=sponsored-by`) ou « Ce client n'a pas été parrainé. » ; tableau « Codes générés (N) » (Code, Compagnie, Récompense, Statut Actif/Utilisé/Expiré, Expire le) ; vide « Aucun code de parrainage généré. ».
  - **Réservations** : 10 plus récentes du client (Code → fiche réservation, Trajet + départ, Montant, Statut, Paiement, Créée le) ; note « Les dix réservations les plus récentes. » ; vide « Aucune réservation. ».
  - **Avis** : « Avis (N) » : Titre → `/clients/avis/{id}`, Compagnie, Type, Note (étoiles), Statut.
  - **Consentements liés** : aucun écran n'existe actuellement dans le backoffice pour les consentements d'un client (voir Questions ouvertes).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `customer` | `{id, userId, name, isCorporate, sponsorshipId\|null, sponsoredAt\|null, createdAt}` | non | — | ✅ `CustomerResponse` (`dateSponsorship` = `sponsoredAt`) |
| `userStatus` | active\|suspended | non | — | identity-service |
| `parcelCount`, `totalPoints` | int | non | — | calculés |
| `accounts[]` | `LoyaltyAccountDetail` | non | tri `companyName` | voir E13 |
| `sponsorships[]` | `SponsorshipRow` | non | tri `createdAt` desc | voir E14 |
| `sponsoredBy` | `{code, sponsorName, companyName, at}` | oui | `at = sponsoredAt ?? sponsorship.createdAt` | jointure sponsorship de `Customer.sponsorshipId` |
| `bookings[]` (≤10) | `CustomerBookingRow` | non | tri `createdAt` desc | voir E15 |
| `feedbacks[]` | `FeedbackRow` | non | tri `createdAt` desc | voir E16 |

  `LoyaltyAccountDetail` : `id, companyId, companyName, programName|null, programStatus: ACTIVE|INACTIVE|null, points:int, membershipType: REGULAR|VIP|PREMIUM, movements[{id, bookingId, bookingCode, points:int, createdAt}]`.
  `SponsorshipRow` : `id, companyName, code, rewardType: DISCOUNT|LOYALTY_POINTS|CASH, rewardValue:number, currency (devise de la compagnie, défaut XOF), status: ACTIVE|REDEEMED|EXPIRED, createdAt, expiresAt`. Libellés : DISCOUNT « Réduction de N % », LOYALTY_POINTS « N points », CASH « Remise de <montant><devise> ».
  `CustomerBookingRow` : `id, bookingCode, routeLabel, departure|"" , amount, currency, status: BookingStatus, paymentStatus: BookingPaymentStatus, createdAt`.
- **Endpoints requis** :

| Méthode | Chemin | Query | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/customers/{id}` (E12) | — | `{customer, userStatus, parcelCount, totalPoints, sponsoredBy}` | `CUSTOMER_MANAGE` plateforme |
| GET | `/admin/customers/{id}/loyalty-accounts` (E13) | — | `LoyaltyAccountDetail[]` avec `movements` | idem |
| GET | `/admin/customers/{id}/sponsorships` (E14) | — | `SponsorshipRow[]` | idem |
| GET | `/admin/customers/{id}/bookings` (E15) | `limit=10` | `CustomerBookingRow[]` | `BOOKING_MANAGE` plateforme (booking-service) |
| GET | `/admin/customers/{id}/feedbacks` (E16) | — | `FeedbackRow[]` | `CUSTOMER_MANAGE` plateforme |

- **Règles métier** : lecture seule ; mouvements de points = lignes `LoyaltyPointsTransaction` (crédit sur `payment.completed`, `points = floor(amount × pointsPerCurrencyUnit)`) ; le « code de réservation » d'un mouvement doit être résolu côté booking-service (la table customer stocke seulement `source_event_id`, pas `booking_id`, voir état). Les réservations d'un client sont celles dont `Booking.userId = Customer.userId` (qui est le **créateur** de la réservation, pas forcément le passager — dette connue).
- **État côté API** :
  - E12 ❌ — pas de `GET /customers/{id}` staff (seul `/customers/me`).
  - E13 ⚠️ — `GET /loyalty-accounts` (`LoyaltyAccountController`, `CUSTOMER_MANAGE`) : liste **non paginée**, sans filtre `customerId`, sans `programName`, sans mouvements. `LoyaltyPointsTransaction` (entité `customer-service/.../entity/LoyaltyPointsTransaction.java`: id, customerLoyaltyAccountId, sourceEventId, points, createdAt) n'a **aucun endpoint** et **n'a pas de `bookingId`** (uniquement `sourceEventId`) → le lien « Réservation » du backoffice n'est pas réalisable sans ajouter `booking_id`/`booking_code` à l'événement ou à la table.
  - E14 ⚠️ — `GET /customers/me/sponsorships` (`SponsorshipController:40`) existe mais uniquement pour le client authentifié (`SponsorshipResponse{id, companyId, sponsorCustomerId, sponsorCode, rewardType, rewardValue, status, createdAt, expiresAt}`) ; version staff par `customerId` manquante.
  - E15 ⚠️ — `GET /bookings` (`BookingController:66`) paginé, filtre `tripId` seulement, scopé ; pas de filtre `userId`/`customerId`.
  - E16 ⚠️ — `GET /feedbacks?status=` (`StaffFeedbackController:37`) sans filtre `customerId` ni `companyId`.

---

### Fidélité — programmes — `/colis-clients/fidelite`
- **Fonctionnalités** :
  - Filtre Compagnie + recherche `q` (fold, nom de programme ou compagnie). Pas de pagination ni de bandeau de stats (uniquement 3 cartes de paliers).
  - 3 cartes « Paliers des membres » : Regular / VIP / Premium = nombre de comptes de fidélité (filtré par compagnie) + « N % des comptes de fidélité ».
  - Grille de cartes programmes (tri nom de compagnie) : nom, compagnie, pastille Actif/Inactif (atténuée si INACTIVE), 3 métriques (`pointsPerCurrencyUnit` « point / FCFA », `redemptionRate` « valeur du point », `minPointsForRedemption` « seuil d'échange »), « Comptes » (N) et « Points distribués » (somme des points des comptes de la compagnie).
  - Lecture seule : aucune création/édition de programme dans le backoffice. Aucune vue « transactions de points » globale ; les mouvements ne sont visibles que dans la fiche client.
  - Vide : « Rien à afficher ici. ».
- **Modèle de données attendu** (`LoyaltyProgramRow`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | uuid | non | — | ✅ `LoyaltyProgramResponse.id` |
| `companyId` | uuid | non | — | ✅ |
| `companyName` | string | non | — | jointure company-service |
| `name` | string | non | — | ✅ |
| `pointsPerCurrencyUnit` | decimal | non | — | ✅ |
| `redemptionRate` | decimal | non | — | ✅ |
| `minPointsForRedemption` | int | non | — | ✅ |
| `status` | enum | non | ACTIVE, INACTIVE | ✅ |
| `accounts` | int | non | nb de comptes de fidélité de la compagnie | **calculé API** |
| `pointsIssued` | int | non | somme des `loyaltyPoints` de la compagnie | **calculé API** (somme du solde courant, pas total historique des crédits) |

- **Endpoints requis** :

| Méthode | Chemin | Query | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/loyalty-programs` (E17) | `companyId?`, `q?`, `page`, `size` | `Page<LoyaltyProgramRow>` | `CUSTOMER_MANAGE` plateforme |
| GET | `/admin/loyalty-accounts/tier-distribution` (E18) | `companyId?` | `[{tier, value}]` | idem |

- **Règles métier** : une compagnie a au plus un programme dans le modèle actuel (la fiche client retrouve le programme par `companyId`). Les points s'accumulent sur réservation en ligne payée.
- **État côté API** : E17 ⚠️ — `GET /loyalty-programs` (`LoyaltyProgramController:47`, `CUSTOMER_MANAGE`) : liste non paginée, tout pour un appelant non restreint, sans `companyName`/`accounts`/`pointsIssued`, sans filtre. E18 ❌ (voir Aperçu).

---

### Avis — liste — `/colis-clients/avis`
- **Fonctionnalités** :
  - Filtres : Compagnie, Statut (`statut` ∈ PENDING « En attente », REVIEWED « Examinés », RESOLVED « Résolus », IGNORED « Ignorés »), Note (`note` ∈ 1..5, cliquable depuis la synthèse), recherche `q` (fold, sur titre, nom du client, nom de compagnie).
  - Synthèse « notes » : note moyenne (1 décimale, `—` si aucun), étoiles, nombre d'avis, barres de distribution 5→1 cliquables (re-cliquer retire le filtre). La synthèse est calculée **sans** les filtres `q`/`statut`/`note` (seulement compagnie).
  - Grille de cartes paginée **12 par page** (`page`, `LinkPager` : total, taille, nb de pages), tri `createdAt` desc puis id. Carte : étoiles, badge statut (« En attente/Examiné/Résolu/Ignoré »), titre, « Type · Compagnie » (Trajet, Bus, Gare, Service, Colis), nom du client, badge « Répondu » si une réponse existe, date.
  - Vide : synthèse seule masque la grille ; message « Rien à afficher ici. » / « Aucun résultat dans « Avis » ».
- **Modèle de données attendu** (`FeedbackRow`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `id` | uuid | non | — | ✅ |
| `companyId` | uuid | non | — | ✅ |
| `companyName` | string | non | — | jointure company-service |
| `customerId` | uuid | non | — | ✅ |
| `customerName` | string | non | « — » si inconnu | ✅ `FeedbackStaffResponse.customerName` |
| `feedbackType` | enum | non | TRIP, BUS, STATION, SERVICE, PARCEL | ✅ |
| `rating` | int | non | 1..5 | ✅ |
| `title` | string | non | — | ✅ |
| `status` | enum | non | PENDING, REVIEWED, RESOLVED, IGNORED | ✅ |
| `responded` | bool | non | `response != null` | calculé (dérivable de `response`) |
| `createdAt` | ISO | non | — | ✅ |

  Synthèse : `{average: decimal|null, total:int, distribution:[n1..n5]}`.
- **Endpoints requis** :

| Méthode | Chemin | Query | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/feedbacks` (E19) | `companyId?`, `status?`, `rating?`, `q?`, `page`, `size` (12 attendu par l'écran), tri fixe `createdAt desc,id desc` | `Page<FeedbackRow>` | `CUSTOMER_MANAGE` plateforme |
| GET | `/admin/feedbacks/summary` (E20) | `companyId?` | `{average, total, distribution[5], pending}` | idem |

- **Règles métier** : avis **privés** (auteur + staff compagnie) ; le backoffice plateforme les consulte en lecture + modération.
- **État côté API** :
  - E19 ⚠️ — `GET /feedbacks?status=&page=&size=` (`StaffFeedbackController:37`, `FeedbackStaffResponse` avec `customerName`) : paginé, tri `createdAt desc, id desc`, filtre `status` seulement ; appelant non restreint (sans claim, `RBAC_MANAGE`) voit toutes les compagnies. **Manquent** : `companyId`, `rating`, `q`, `companyName`. `size` plafonné à 100.
  - E20 ❌.

---

### Avis — fiche — `/clients/avis/[id]`
- **Fonctionnalités** :
  - En-tête : titre de l'avis, « <client> · <compagnie> », badge statut (`data-testid=feedback-status`), bouton **« Ignorer l'avis »** (danger) visible seulement si statut PENDING ou REVIEWED ; sinon message « Modération impossible : Cet avis est déjà traité. ».
  - Carte récap : titre, « Type · date/heure », badge statut, note en étoiles (`aria-label` « Note N sur 5 »).
  - « Commentaire du client » (citation) ; « Réponse de la compagnie » (citation + « Répondu le <date> », sinon « Aucune réponse. »). **Le backoffice ne permet pas de répondre** (la réponse est faite par la compagnie via `PATCH /feedbacks/{id}/respond`) ; il ne fait qu'afficher.
  - « Contexte » : liens Client (`/clients/comptes/{customerId}`), Compagnie (`/compagnies/{id}`), Trajet (`/flotte/trajets/{tripId}`, libellé de route), Réservation (`/ventes/reservations/{bookingId}`, code), Colis (`/colis/{parcelId}`, code) — « — » si absent.
  - **Ignorer** : confirmation destructive, motif obligatoire (≤ 500 car.) ; l'avis passe `IGNORED`, activité compagnie « Avis « <titre> » ignoré. Motif : … » ; revalidation des pages avis, client et compagnie.
- **Modèle de données attendu** (`FeedbackDetail`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| `feedback` | `{id, companyId, customerId, tripId\|null, parcelId\|null, bookingId\|null, rating, feedbackType, title, comment, status, response\|null, respondedAt\|null, createdAt}` | non | — | ✅ `FeedbackStaffResponse` (`respondedByUserId` et `updatedAt` aussi fournis, non utilisés) |
| `companyName` | string | non | — | jointure company-service |
| `customerName` | string | non | — | ✅ fourni |
| `tripLabel` | string | oui | libellé de route | jointure fleet-service |
| `bookingCode` | string | oui | — | jointure booking-service |
| `parcelCode` | string | oui | — | jointure parcel-service |
| `ignoreBlockedReason` | string | oui | « Cet avis est déjà traité » si statut ∉ {PENDING, REVIEWED} | calculé |

- **Endpoints requis** :

| Méthode | Chemin | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/feedbacks/{id}` (E21) | — | — | `FeedbackDetail` | `CUSTOMER_MANAGE` plateforme |
| PATCH | `/admin/feedbacks/{id}/status` (E22) | — | `{status: "IGNORED", reason}` (reason 1–500, obligatoire) | `200` avis mis à jour ; `404` ; `409` si déjà traité | idem |

- **Règles métier** : gardes dans l'ordre : avis existe → motif non vide → statut PENDING ou REVIEWED. Le motif est journalisé (activité compagnie) et doit être tracé dans l'audit. Workflow complet du backend (hors backoffice sauf IGNORED) : `PENDING→REVIEWED`, `PENDING|REVIEWED→IGNORED`, `PENDING|REVIEWED→RESOLVED` uniquement via `respond`, `RESOLVED`/`IGNORED` terminaux.
- **État côté API** :
  - E21 ⚠️ — `GET /feedbacks/{id}` (`StaffFeedbackController:47`) existe (compagnie non restreinte OK) ; pas de `companyName`, `tripLabel`, `bookingCode`, `parcelCode`.
  - E22 ⚠️ — `PATCH /feedbacks/{id}/status` (`StaffFeedbackController:55`) accepte `{status}` avec `ModerationStatus ∈ {REVIEWED, IGNORED}` ; **pas de champ `reason`** (aucun motif persisté ni journalisé côté `customer-service`).

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| Filtres `companyId`, `status`, `parcelType`, `q`, `late` sur `GET /parcels` + champs `senderName`, `companyName`, `routeLabel`, `legCount`, `late` | `parcel-service` (+ jointures BFF) | haute | E1 : actuellement page brute sans filtre ; le téléphone y est en clair |
| `GET /parcels/{id}/history` (ParcelHistory) | `parcel-service` | haute | E5 : entité existante, aucun endpoint ; `changedBy` à résoudre en nom lisible |
| `sequence`, `routeLabel`, `departure`, `tripStatus` sur les jambes | `parcel-service` + `fleet-service` | moyenne | E4 : `ParcelLegResponse` incomplet |
| Masquage serveur du téléphone destinataire + endpoint de révélation journalisée | `parcel-service` + `audit-compliance-service` (`DataAccessLog`) | haute | E3/E7 : RGPD, règle 6 |
| `declare-lost` avec motif obligatoire (+ audit) | `parcel-service` | haute | E6 : `PATCH status` existe mais `notes` facultatif |
| Stats colis (`total, inCirculation, delivered, late`) | `parcel-service` | moyenne | E2 |
| Agrégat Aperçu (flux, taux de livraison, délai moyen, revenus XOF, retards, top clients, répartitions, avis) | BFF/`analytics` (ou stats par service) | moyenne | E8 ; pas de service d'agrégation inter-services |
| Compteurs de recherche par onglet | BFF | basse | E9 |
| Liste staff des clients `GET /customers` (+ stats, filtres palier/profil/statut, agrégats réservations/colis/avis/points) | `customer-service` (+ jointures identity/booking/parcel) | haute | E10/E11 : aucune liste de clients n'existe |
| Fiche client staff `GET /customers/{id}` + `sponsoredBy` | `customer-service` | haute | E12 |
| Comptes de fidélité d'un client avec programme et mouvements ; endpoint des `LoyaltyPointsTransaction` | `customer-service` | haute | E13 ; transaction sans `booking_id` ni `booking_code` |
| Parrainages d'un client (vue staff) | `customer-service` | moyenne | E14 ; seulement `/customers/me/sponsorships` |
| Réservations d'un client (`userId`) | `booking-service` | moyenne | E15 ; pas de filtre `userId` sur `GET /bookings` |
| Avis d'un client | `customer-service` | moyenne | E16 ; ajouter `customerId` à `GET /feedbacks` |
| Programmes de fidélité enrichis (`companyName`, `accounts`, `pointsIssued`) paginés | `customer-service` | moyenne | E17 |
| Distribution des paliers | `customer-service` | basse | E18 |
| Filtres `companyId`, `rating`, `q` + `companyName` sur `GET /feedbacks` | `customer-service` | haute | E19 |
| Synthèse des avis (moyenne, distribution, en attente) | `customer-service` | moyenne | E20 |
| Contexte de l'avis (`tripLabel`, `bookingCode`, `parcelCode`, `companyName`) | BFF (fleet/booking/parcel/company) | moyenne | E21 |
| Motif obligatoire sur `PATCH /feedbacks/{id}/status` + audit | `customer-service` | haute | E22 : champ `reason` absent |
| Statut du compte utilisateur (`active`/`suspended`) d'un client | `identity-service` | moyenne | pas d'endpoint de lecture en masse (`/api/users/{id}` seul) |
| Écrans manquants dans le backoffice : documents colis, consentements du client | `parcel-service` ✅ / `audit-compliance-service` | basse | endpoints documents existent mais l'UI ne les consomme pas |

## Questions ouvertes

1. **Vue plateforme vs scopée compagnie** : confirmer que le backoffice appelle les services avec un jeton plateforme (sans `company_id`, avec `RBAC_MANAGE`) et que le préfixe `/admin/...` est un namespace du Gateway/BFF ou s'il faut réutiliser les chemins existants (`/parcels`, `/feedbacks`…) avec des filtres supplémentaires.
2. **Jointures inter-services** : `companyName`, `routeLabel`, `senderName`, `bookingCode`, `userStatus`, nb de réservations… ne vivent pas dans le service propriétaire. Faut-il un BFF d'agrégation (recommandé, pas de FK inter-services) ou de la dénormalisation événementielle (event-carried state) ? La recherche plein texte sur champs joints (colis : compagnie + trajet) pousse vers une projection de lecture dédiée.
3. **Expéditeur d'un colis** : `Parcel.senderId` (UUID) est-il un `Customer.id`, un `User.id` ou un `Employee.id` ? Le backoffice attend `senderName` (texte libre possible pour un expéditeur sans compte) et un lien optionnel `senderCustomerId`. À trancher et à modéliser (champ `sender_name` éventuellement).
4. **Mouvements de points ↔ réservation** : `LoyaltyPointsTransaction` ne porte pas `booking_id`. Ajouter `booking_id`/`booking_code` à `payment.completed`/à la table, ou renoncer au lien « Réservation » ?
5. **Client sans compte vs `userId` créateur** : les « réservations en ligne » et « points » reposent sur `Booking.userId` = créateur de la réservation (pas forcément le passager) — acceptable pour l'affichage ?
6. **Statut du compte** (`active/suspended`) : propriété de `identity-service`; fournir via un endpoint batch ou via un événement ?
7. **Révélation du téléphone** : le backoffice journalise dans une activité interne ; faut-il à la place un `DataAccessLog` `audit-compliance-service` (catégorie CONTACT, motif obligatoire ?) — le backoffice ne demande aujourd'hui aucun motif pour la révélation.
8. **Motif des actions** (perte de colis, avis ignoré) : stocké où ? `ParcelHistory.notes` pour le colis ; pour l'avis, aucune colonne n'existe côté `Feedback` (à ajouter, ou ligne d'audit uniquement).
9. **Réponse aux avis** : le backoffice n'a pas d'action de réponse (réservée à la compagnie). Confirmer qu'elle n'est pas attendue côté plateforme.
10. **Documents de colis et consentements** : la demande initiale les mentionne mais l'UI actuelle ne les affiche pas ; les endpoints documents existent (`GET /parcels/{id}/documents`, `/documents/{documentId}/download-url`, `ParcelController`), les consentements liés à un client sont dans `audit-compliance-service` (`GET /consents/{userId}`, `accessReason` obligatoire). À planifier si ces vues sont voulues.
11. **Libellés de palier** : `REGULAR` s'affiche « Regular » (hub) et « Standard » (fiche client) — normaliser côté UI ; sans impact API.
12. **Revenus** : le calcul n'additionne que les frais payés en XOF ; faut-il une agrégation multi-devises côté API ?
13. **Pagination par onglet** : seul l'onglet Avis pagine (12). Taille de page cible pour Colis/Clients/Fidélité à fixer (défaut 20).
