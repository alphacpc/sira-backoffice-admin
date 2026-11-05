# 05 — Ventes et paiements (réservations, paiements, billets, moyens de paiement, libre-service, locations de bus, factures de location)

## Vue d'ensemble

Le module `/ventes` du backoffice est l'outil de la plateforme Sira pour superviser les ventes de **toutes** les compagnies (aucun tenant, filtre « Compagnie » optionnel). Il comprend un hub à 8 onglets (Aperçu, Réservations, Paiements, Billets, Locations, Factures, Moyens de paiement, Libre-service), 6 fiches de détail (réservation, paiement, billet, location, facture) et l'éditeur de modèle de facture par compagnie (`/compagnies/[id]/modele-facture`).
Tout le module tourne aujourd'hui sur des données en mémoire (`src/lib/repos/sales.ts`, `sales-hub.ts`, `rentals.ts`, `rental-invoices.ts`) ; les actions d'écriture sont dans `src/app/(admin)/ventes/actions.ts` (annulation de réservation, 6 actions de location, paiement de facture, enregistrement du modèle).

Constats structurants (vérifiés dans le code) :
- **Réservations/paiements/billets** : `booking-service` possède les entités `Booking`, `Transaction`, `Ticket`, `PaymentMethod` mais **n'expose que des endpoints par compagnie (tenant)**, sans liste de transactions ni de billets, sans filtres de statut/canal, sans recherche, sans agrégats. Le backoffice a besoin d'une **vue plateforme enrichie** (nom du voyageur, libellé de ligne, plaque du bus, nom de compagnie, anomalies calculées, chronologie).
- **Locations de bus et factures de location** : **aucune trace côté backend** (grep `rental|charter|location de bus` sur tous les services, docs et `sira_schema.dbml` : seul `route_type … charter` apparaît). Domaine entièrement nouveau.
- **Modèle de facture** : `company-service` n'a que `logo_url` sur `Company` ; aucun modèle de facture. Les `/invoices` existantes de `company-service` sont les factures d'**abonnement SaaS** (Sira → compagnie), à ne pas confondre avec les factures de location (compagnie → client).
- **Pagination/tri/filtre** : tout est aujourd'hui fait **côté serveur Next.js sur le jeu complet puis côté client** (`DataTable` TanStack : tri client, pagination client `pageSize = 15`, `searchable={false}` car la recherche est dans l'URL `?q=`). L'API cible doit donc offrir **pagination + tri + filtres + recherche serveur** sur les 6 listes.
- **Pas d'identifiants nominatifs** : le backend ne stocke ni nom de voyageur sur `Booking` (seulement `userId`/`passengerId`), ni nom de compagnie, ni libellé de ligne ; ces champs sont de la **donnée jointe** à fournir par l'API d'admin (agrégation/BFF, voir Questions ouvertes).

Convention de chemin proposée : préfixe **`/admin/...`** exposé par le Gateway, permissions plateforme (appelant sans claim `company_id` + `RBAC_MANAGE`, cf. `TenantAccessGuard.isUnrestricted`) plus une permission de domaine (ex. `BOOKING_MANAGE` pour les ventes, `RENTAL_MANAGE` nouvelle pour les locations). Paramètres de liste communs : `page` (0-based), `size` (défaut 15, max 100), `sort=champ,asc|desc`, `q` (recherche insensible à la casse **et aux accents** — fonction `fold` du hub), `companyId` (optionnel, UUID). Réponse paginée : `{content[], page, size, totalElements, totalPages}`.

---

## Barre commune du hub — `/ventes/*`

- **Fonctionnalités** : champ de recherche global `?q=` (80 caractères max, `trim`) qui s'applique à **tous** les onglets ; filtre « Compagnie » (liste déroulante avec recherche, `?compagnie=<id>`, « Toutes » par défaut) ; onglets avec **compteur** (hors Aperçu) calculé avec `q` + compagnie ; si `q` donne 0 résultat dans l'onglet courant, message listant les autres onglets qui matchent (« Mais ça correspond dans : Réservations (3), … ») ; total « Résultats pour « q » : N dans toutes les ventes ». Les bandeaux de stats (StatStrip) sont masqués quand `q` est présent. État vide : « Rien à afficher ici. » ou « Aucun résultat dans « <onglet> » ».
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/sales/counts` | `q?`, `companyId?` | `{reservations, paiements, billets, locations, factures, moyensDePaiement, enLigne}` (entiers) | BOOKING_MANAGE + plateforme |
| GET | `/admin/companies` | `q?`, `page`, `size` (pour la liste déroulante) | `{id, name}` | COMPANY_MANAGE + plateforme |

  Le compteur `enLigne` = nombre de réservations « qui vont expirer » filtrées par `q` (code, voyageur, compagnie).
- **Règles métier** : la recherche par onglet couvre exactement ces champs — Réservations : `bookingCode, passengerName, companyName, routeLabel, seatNumber, amount` ; Paiements : `reference, bookingCode, passengerName, companyName, methodName, amount` ; Billets : `ticketCode, bookingCode, passengerName, companyName, routeLabel, seatNumber` ; Locations : `rentalCode, customerName, companyName, pickup, destination, busLabel, driverName` ; Factures : `number, rentalCode, customerName, companyName` ; Moyens de paiement : `name, provider, companyName`.
- **État côté API** : `GET /admin/sales/counts` ❌ (service recommandé : un agrégateur « admin » ; voir Questions ouvertes) ; `GET /admin/companies` ✅ via `GET /companies` (`company-service/.../controller/CompanyController.java`, paginé, permission `COMPANY_MANAGE`).

---

### Aperçu des ventes — `/ventes`

- **Fonctionnalités** : sélecteur de période 7 / 30 / 90 jours (`?periode=`, défaut 30) ; 4 tuiles (Chiffre d'affaires + variation %, Réservations + variation %, Panier moyen, Taux de conversion) ; courbe de tendance par jour (réservations + CA) ; encart « Constats » (phrases calculées) et alertes cliquables ; entonnoir (4 étapes avec % par rapport à l'étape précédente) ; top 5 des lignes (par CA puis réservations) ; répartition par canal (Guichet / En ligne) ; carte de chaleur jour de semaine × 4 tranches de 6 h (UTC) ; flux d'activité en direct (8 dernières réservations, lien vers la fiche).
- **Modèle de données attendu** (`SalesOverview`) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| days | int | non | 7, 30, 90 | paramètre |
| revenue | number | non | XOF, somme des réservations `paid` créées dans la période | calculé API ; seule la devise `XOF` est comptée |
| revenueDelta | int % | oui | `null` si période précédente = 0 | vs période de même durée précédente |
| bookings / bookingsDelta | int / int % | oui pour delta | | réservations créées dans la période |
| average | number | non | CA / nb payées (0 si aucune) | calculé API |
| conversion | int % | oui | payées / créées, `null` si 0 réservation | calculé API |
| currency | string | non | `XOF` | |
| series[] | `{day:'YYYY-MM-DD', bookings, revenue}` | non | une entrée par jour (UTC), jours vides inclus | |
| funnel[] | `{label, value}` ×4 | non | « Réservations créées », « Réservations payées », « Billets émis », « Billets utilisés » (billets `CHECKED_IN` ou `USED`) | billets émis dans la période |
| channels[] | `{label, value}` | non | « Guichet », « En ligne » | |
| topRoutes[] | `{label, revenue, bookings}` ≤5 | non | label = « Origine → Destination » | jointure Trip/Route (fleet) |
| heat[] / heatMax | `{day:'Lun'..'Dim', cells:int[4]}` / int | non | cellules = nuit, matin, après-midi, soir (UTC, 6 h) ; `heatMax ≥ 1` | |
| insights[] | string[] | non | meilleure journée, ligne la plus rentable, pic de réservations, % libre-service | textes construits par le client si l'API fournit les données brutes (à décider) |
| feed[] | `{id, at, label, detail, tone, href}` ≤8 | non | tone `success|warning|danger|info` : payée / en attente / échouée | `detail` = nom du voyageur |
| alerts[] | `{key, label, count, href, tone}` | non | clés `stuck`, `mismatch`, `ticket`, `expiring` ; filtrées si `count = 0` | comptes d'anomalies de paiement + réservations en ligne qui expirent |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/sales/overview` | `days` (7/30/90), `companyId?` | `SalesOverview` ci-dessus | BOOKING_MANAGE + plateforme |

- **Règles métier** : variations en % arrondies, `null` si dénominateur 0 ; seules les réservations `XOF` sont sommées ; heures en UTC ; période = `]now - days, now]`.
- **État côté API** : ❌ — aucun agrégat dans `booking-service`. Nécessite une jointure Booking × Ticket × Trip/Route (fleet-service) : service recommandé `booking-service` (endpoints `/admin/...`) alimenté par un snapshot de trajet/ligne (event-carried state) ou un appel fleet.

---

### Réservations (liste) — `/ventes/reservations`

- **Fonctionnalités** : bandeau de 4 stats (Réservations, Payées, En ligne, Montant payé XOF — calculés sur le jeu complet filtré par compagnie seulement, pas par `q`/statut) ; filtres `?statut=` (confirmed/cancelled), `?paiement=` (pending/paid/failed), `?canal=` (counter/online), compagnie, recherche `q` ; colonnes : Réservation (code + date de création), Voyageur (nom + compagnie), Trajet (origine → destination, départ, siège), Canal, Montant, Paiement (Payé/Échoué/En attente), Statut (Confirmée/Annulée) ; tri client sur colonnes, pagination 15/page ; ligne cliquable → fiche ; ordre par défaut : `createdAt` décroissant puis `id` croissant ; vide : « Aucune réservation pour ces critères. »
- **Modèle de données attendu** (`BookingRow`) :

| Champ | Type | Nullable | Valeurs | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | booking-service |
| bookingCode | string | non | `BK-XXXXXXXX` | |
| companyId / companyName | uuid / string | non | « — » si inconnue | nom = company-service (jointure) |
| passengerName | string | non | | **absent du backend** (voir écarts) |
| routeLabel | string | non | « A → B » | trajet → ligne (fleet-service) |
| departure | ISO datetime | oui (vide si trajet inconnu) | | fleet-service |
| seatNumber | string | oui | | |
| amount / currency | number / string | non | `XOF` etc. | |
| channel | enum | non | `counter`, `online` | `Booking.typeBooking` (backend : texte libre `online`/…) |
| status | enum | non | `confirmed`, `cancelled` | |
| paymentStatus | enum | non | `pending`, `paid`, `failed` | |
| createdAt | ISO datetime | non | | |

  Stats (calcul API ou client sur page entière — préférer l'API) : total, payées, en ligne, somme `amount` des `paid`.
- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/bookings` | `q`, `companyId`, `status`, `paymentStatus`, `channel`, `page`, `size`, `sort` (défaut `createdAt,desc`) | page de `BookingRow` | BOOKING_MANAGE + plateforme |
| GET | `/admin/bookings/summary` | `companyId?` | `{total, paid, online, paidAmount, currency}` | idem |

- **Règles métier** : `canal` = `online` ⇔ libre-service (B16) ; la plateforme voit tout. Les montants affichés par `Intl` (devise du booking).
- **État côté API** :
  - `GET /admin/bookings` ⚠️ — `GET /bookings` existe (`booking-service/.../controller/BookingController.java`), paginé (`Pageable`) et borné par compagnie, mais **seul le filtre `tripId`** existe ; pas de `status/paymentStatus/channel/q/companyId` ; `BookingResponse` (`dto/response/BookingResponse.java`) n'a ni `passengerName`, ni `companyName`, ni `routeLabel`, ni `departure`. L'accès non restreint (admin sans claim) renvoie bien toutes les compagnies (`findAll`).
  - `GET /admin/bookings/summary` ❌.

---

### Réservation (fiche) — `/ventes/reservations/[id]`

- **Fonctionnalités** : en-tête (code, passager · compagnie, badges Statut et Paiement) ; bouton rouge « Annuler la réservation » (visible si `confirmed`) avec dialogue de confirmation et **motif obligatoire** ; message « Annulation impossible : <raison> » si `cancelBlockedReason` non nul ; 4 onglets (`?onglet=` resume | chronologie | paiements | billets) ; **Résumé** : code, passager (lien `/utilisateurs/{userId}` si compte), canal, montant, statut, paiement, compagnie (lien), trajet (lien `/flotte/trajets/{tripId}` + départ), bus (plaque), siège, billet émis (Oui/Non), créée le, annulation (date + cause) ; **Chronologie** : événements triés par date croissante ; **Paiements** : tableau Référence (lien fiche paiement), Moyen, Montant, Statut, Lancé le ; **Billets** : tableau Code (lien), Siège, Statut, Émis le (+ scans) ; états vides « Aucun paiement pour cette réservation. » / « Aucun billet émis pour cette réservation. » ; 404 `not-found.tsx` si introuvable.
- **Modèle de données attendu** (`BookingDetail`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| booking | `Booking` | non | `id, companyId, tripId, userId?, passengerName, bookingCode, seatNumber?, status, paymentStatus, channel, amount, currency, ticketIssued, createdAt, cancelledAt?, cancelReason?` | |
| booking.userId | uuid | oui | `null` au guichet | |
| booking.cancelReason | enum | oui | `EXPIRED`, `CLIENT`, `PLATFORM` | libellés : « Expirée (non payée à temps) », « Annulée par le client », « Annulée par l'équipe Sira » ; **absent du backend** |
| booking.cancelledAt | ISO datetime | oui | | **absent du backend** |
| companyName, routeLabel, departure, busPlate | string | non (« — ») | | jointures |
| tripStatus | enum | non | `TripStatus` (fleet : planned, boarding, …) | |
| transactions[] | `TransactionRow` (voir Paiements) | non | tri `createdAt` décroissant | |
| tickets[] | `TicketRow` (voir Billets) | non | | |
| timeline[] | `{at, label}` | non | libellés : « Réservation créée en ligne » / « … au guichet », « Paiement lancé (<moyen>) », « Paiement réussi » / « Paiement échoué : <motif ou 'motif inconnu'> », « Billet <code> émis », « Billet <code> scanné », « Réservation annulée : <cause> » | à calculer par l'API (source : audit/outbox ou reconstruction) |
| cancelBlockedReason | string | oui | « Cette réservation est déjà annulée », « Une réservation payée ne peut pas être annulée », « Un paiement est en cours sur cette réservation » | ordre des gardes |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/bookings/{id}` | — | `BookingDetail` (sans transactions/billets si séparés) | BOOKING_MANAGE + plateforme |
| GET | `/admin/bookings/{id}/transactions` | — | `TransactionRow[]` (tri `createdAt desc`) | idem |
| GET | `/bookings/{id}/tickets` (existant) | — | `TicketRow[]` | idem |
| PATCH | `/admin/bookings/{id}/cancel` | corps `{reason: string}` (obligatoire, `trim` non vide) | `Booking` mis à jour ; `404` inconnue ; `409` + message de garde | BOOKING_MANAGE + plateforme |

- **Règles métier** : gardes d'annulation dans cet ordre — réservation existe → motif non vide (« Un motif est obligatoire ») → pas déjà annulée → **pas payée** → **aucune transaction `PENDING`** (un paiement `FAILED` ne bloque pas). Effets : `status=cancelled`, `cancelledAt=now`, `cancelReason=PLATFORM`, siège rendu (plan de sièges `booked→free`, `availableSeats +1` côté trajet), **audit** (`Réservation <code> annulée. Motif : <motif>`, acteur = admin) et journal d'activité de la compagnie ; revalidation des fiches trajet/plan de sièges.
- **État côté API** :
  - `GET /admin/bookings/{id}` ⚠️ — `GET /bookings/{id}` existe (`BookingController`), mais sans nom de passager/compagnie/ligne/bus, sans `cancelReason`/`cancelledAt`, sans chronologie ni `cancelBlockedReason`.
  - `GET /admin/bookings/{id}/transactions` ❌ — seul `GET /transactions/{id}` existe (`TransactionController.java`), aucune liste par réservation.
  - `GET /bookings/{id}/tickets` ✅ — `booking-service/.../controller/TicketController.java` (`TicketResponse` : sans voyageur/trajet/bus/montant/`scanCount`).
  - `PATCH /admin/bookings/{id}/cancel` ⚠️ — `PATCH /bookings/{id}/cancel` existe (`BookingController`, libération de siège best-effort + audit) mais **sans corps `reason`**, **sans garde « payée / paiement en cours »** (l'annulation est conditionnée uniquement par `cancelIfNotAlreadyCancelled`) et sans `cancelReason`/`cancelledAt`.

---

### Paiements (liste) — `/ventes/paiements`

- **Fonctionnalités** : stats (Transactions, Réussies, Échouées, Avec incohérence) ; filtres `?statut=` (PENDING « En attente », COMPLETED « Réussis », FAILED « Échoués »), `?anomalie=oui` (« Avec incohérence »), compagnie, `q` ; colonnes : Transaction (référence + date), Voyageur (+ code réservation · compagnie), Moyen (logo de l'opérateur déduit du nom), Montant (barré si FAILED), Statut, Contrôle (« RAS » ou pastilles « Bloqué », « Montant différent », « Billet manquant ») ; ligne → fiche ; tri `createdAt` décroissant ; vide « Aucun paiement pour ces critères. »
- **Modèle de données attendu** (`TransactionRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| reference | string | non | | backend : `transactionCode` / `paymentReference` |
| bookingId / bookingCode | uuid / string | non | « — » si inconnue | |
| companyId / companyName | uuid / string | non | | |
| passengerName | string | non | | jointure Booking |
| methodName | string | non | « — » | `PaymentMethod.name` (le logo est choisi côté client par le nom) |
| amount / currency | number / string | non | | |
| status | enum | non | `PENDING`, `COMPLETED`, `FAILED` (le backend ajoute `REFUNDED`) | |
| failureReason | string | oui | | **absent du backend** |
| createdAt / completedAt | ISO datetime | non / oui | | backend : `transactionDate` ; pas de `completedAt` |
| anomalies | `AnomalyKind[]` | non | `STUCK`, `AMOUNT_MISMATCH`, `MISSING_TICKET` | calculées à la volée, jamais stockées |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/transactions` | `q`, `companyId`, `status`, `anomalyOnly` (bool), `page`, `size`, `sort` (défaut `createdAt,desc`) | page de `TransactionRow` | BOOKING_MANAGE + plateforme |
| GET | `/admin/transactions/summary` | `companyId?` | `{total, completed, failed, withAnomaly}` | idem |

- **Règles métier** (anomalies, évaluées à l'instant de la requête) : `STUCK` = `PENDING` depuis **strictement plus de 30 min** (`STUCK_AFTER_MINUTES`) ; `AMOUNT_MISMATCH` = montant transaction ≠ montant réservation ; `MISSING_TICKET` = `COMPLETED` sans aucun billet pour la réservation. Le filtre `anomalyOnly` doit être appliqué **côté serveur** (donc anomalies calculables en base/requête).
- **État côté API** : `GET /admin/transactions` ❌ (aucune liste de transactions dans `booking-service` : `TransactionController` n'a que `GET /transactions/{id}`) ; `…/summary` ❌.

---

### Paiement (fiche) — `/ventes/paiements/[id]`

- **Fonctionnalités** : badge de statut ; bloc rouge « Incohérences détectées » (une ligne par anomalie : libellé + explication) ; carte Transaction (Référence, Moyen de paiement, Montant, Lancé le, Terminé le, Motif d'échec) ; carte Réservation (code → fiche, Passager, Siège, Montant de la réservation, Statut, Paiement). Aucune action d'écriture.
- **Modèle de données attendu** : `TransactionDetail = {transaction: TransactionRow, booking: {id, bookingCode, passengerName, seatNumber?, amount, currency, status, paymentStatus}, anomalies: [{kind, label, explanation}]}`. Libellés : STUCK « Paiement bloqué » — « Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur. » ; AMOUNT_MISMATCH « Montant différent » — « Le montant de la transaction ne correspond pas à celui de la réservation. » ; MISSING_TICKET « Billet manquant » — « Le paiement est réussi mais aucun billet n'a été émis pour cette réservation. » (les libellés peuvent rester côté client ; l'API ne doit fournir que `kind`).
- **Endpoints requis** :

| Méthode | Chemin proposé | Réponse | Permission |
|---|---|---|---|
| GET | `/admin/transactions/{id}` | `TransactionDetail` ; `404` si absente | BOOKING_MANAGE + plateforme |

- **État côté API** : ⚠️ — `GET /transactions/{id}` existe (`TransactionController.java`, `TransactionResponse` : `transactionCode, transactionDate, amount, currency, paymentMethodId, status, paymentReference, verified`) mais sans nom de moyen, passager, siège, motif d'échec, `completedAt`, anomalies ni bloc réservation.

---

### Billets (liste) — `/ventes/billets`

- **Fonctionnalités** : stats (Billets, Émis, Utilisés = `USED` + `CHECKED_IN`, Annulés) ; filtre `?statut=` (ISSUED « Émis », CHECKED_IN « Enregistrés », USED « Utilisés », CANCELLED « Annulés »), compagnie, `q` ; colonnes : Billet (code + « Émis le »), Voyageur (+ réservation · compagnie), Trajet (route + départ), Siège, Montant, Scans (nombre), Statut ; ligne → `/ventes/billets/<code>` ; tri `issuedAt` décroissant ; vide « Aucun billet pour ces critères. » Une vue « carte d'embarquement » (`TicketsGrid`) existe mais n'est pas branchée à la liste.
- **Modèle de données attendu** (`TicketRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id, ticketCode | uuid, string | non | | |
| bookingId, bookingCode | uuid, string | non | | |
| companyId, companyName | uuid, string | non | | |
| passengerName | string | non | | jointure Booking |
| routeLabel | string | non | « A → B » ou « — » | |
| departure | ISO datetime | oui | | |
| seatNumber | string | oui | | |
| status | enum | non | `ISSUED`, `CHECKED_IN`, `USED`, `CANCELLED` (backend ajoute `EXPIRED`) | |
| issuedAt | ISO datetime | non | | backend : `createdAt` |
| scanCount | int | non | | **nombre de scans** (historique) |
| amount, currency | number, string | non | de la réservation | |
| channel | enum | non | `counter`, `online` | |
| paymentStatus | enum | non | `pending|paid|failed` | |
| busPlate | string | non | « — » | |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/tickets` | `q`, `companyId`, `status`, `page`, `size`, `sort` (défaut `issuedAt,desc`) | page de `TicketRow` | BOOKING_MANAGE + plateforme |
| GET | `/admin/tickets/summary` | `companyId?` | `{total, issued, used, cancelled}` | idem |

- **État côté API** : ❌ — `booking-service` n'a ni liste de billets ni agrégat (`TicketController` : `GET /bookings/{id}/tickets`, `GET /tickets/{code}`, `POST /tickets/{code}/scan`).

---

### Billet (détail par code) — `/ventes/billets/[code]`

- **Fonctionnalités** : bandeau trajet (origine → destination, départ), montant du billet + état du paiement ; 8 tuiles (Voyageur, Siège, Bus, Compagnie, Réservation → fiche, Canal de vente, Émis le, Paiement) ; carte « Scans à l'embarquement » : liste de `{date, scanné par <contrôleur>}` (lien `/flotte/equipage/{id}` si le contrôleur est connu, sinon « un contrôleur inconnu »), état vide « Ce billet n'a pas encore été scanné. » ; `404` si le code est inconnu. Lecture seule.
- **Modèle de données attendu** : `TicketDetail = {ticket: TicketRow, scans: string[], scanLog: [{at, byId?, byName?}], tripId}` (`scanLog` aligné sur `scans`, plus ancien d'abord ; `byId` = membre d'équipage CONTROLLER de `hr-service`/`fleet`).
- **Endpoints requis** :

| Méthode | Chemin proposé | Réponse | Permission |
|---|---|---|---|
| GET | `/admin/tickets/{code}` | `TicketDetail` | BOOKING_MANAGE + plateforme |

- **Règles métier** : le code est décodé (`decodeURIComponent`). Un billet peut avoir plusieurs scans.
- **État côté API** : ⚠️ — `GET /tickets/{code}` existe (`TicketController.java`) mais `TicketResponse` ne porte qu'**un seul** `scannedAt` (entité `Ticket` : `scannedBy`, `scannedAt`, `validatedAt`, `lastCheckedAt`) : **pas d'historique de scans** (table de scans manquante), pas de nom de contrôleur, pas de jointures (voyageur, trajet, bus, montant).

---

### Moyens de paiement — `/ventes/moyens-de-paiement`

- **Fonctionnalités** : stats (Moyens de paiement, Actifs, Transactions, Échecs) ; compagnie + recherche ; grille de cartes (nom, compagnie, type, opérateur, actif/inactif, jauge de taux de réussite, compteurs transactions/réussies/échouées) ; tri par compagnie puis nom ; vide « Rien à afficher ici. »
- **Modèle de données attendu** (`PaymentMethodRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| id, companyId, companyName | uuid, uuid, string | non | | |
| name | string | non | | |
| kind | enum | non | `MOBILE_MONEY`, `CARD`, `CASH` (libellés « Mobile money », « Carte bancaire », « Espèces ») | backend : `methodType` ∈ `MOBILE_MONEY, BANK_TRANSFER, CARD, CASH` → prévoir `BANK_TRANSFER` |
| provider | string | oui | opérateur | **absent du backend** (`PaymentMethod` n'a ni `provider`) |
| active | bool | non | | backend : `status` `ACTIVE|INACTIVE` |
| transactions, completed, failed | int | non | | agrégats sur `Transaction` |
| successRate | int % | oui | `completed/(completed+failed)` arrondi ; `null` si aucun terminé | |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/payment-methods` | `q`, `companyId`, `page`, `size` | page de `PaymentMethodRow` (+ totaux pour le StatStrip) | BOOKING_MANAGE + plateforme |

- **État côté API** : ⚠️ — `GET /payment-methods` existe (`PaymentMethodController.java`) mais **non paginé** (liste), sans filtre, sans `companyName`, sans statistiques de transactions, sans `provider`.

---

### Libre-service — `/ventes/en-ligne`

- **Fonctionnalités** : entonnoir (Créées, Payées, Expirées, Paiements échoués) ; tuile « Taux de conversion » (payées/créées, « — » si aucune) et nombre de paiements bloqués ; liste « Réservations non payées qui vont expirer » (carte par réservation : code, voyageur, compagnie, montant, compte à rebours « Dans N min » / « Expiration imminente », barre rouge ≤ 5 min) ; sous-titre : « Une réservation non payée expire **30** minutes après sa création » (TTL) ; pas de filtre compagnie sur cet onglet (`toolbar = null`) ; vide « Aucune réservation en attente de paiement. »
- **Modèle de données attendu** (`OnlineStats`) :

| Champ | Type | Nullable | Commentaire |
|---|---|---|---|
| total | int | non | réservations `channel=online` |
| paid | int | non | `paymentStatus=paid` |
| conversionPercent | int % | oui | `null` si total = 0 |
| failedPayments | int | non | transactions `FAILED` d'une réservation en ligne |
| expired | int | non | réservations en ligne avec `cancelReason=EXPIRED` |
| stuck | int | non | transactions `STUCK` d'une réservation en ligne |
| expiring[] | `{id, bookingCode, companyName, passengerName, amount, currency, minutesLeft}` | non | réservations en ligne `confirmed`, non `paid`, sans transaction `PENDING` ; `minutesLeft = ceil((createdAt + TTL − now)/1min)` (peut être ≤ 0) ; tri `minutesLeft` croissant |
| ttlMinutes | int | non | 30 (constante `ONLINE_UNPAID_TTL_MINUTES`, à lire dans la config du service : `sira.bookings.unpaid-ttl-minutes`) |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/sales/online/stats` | `q?` (filtre de `expiring`) | `OnlineStats` (+ `ttlMinutes`) | BOOKING_MANAGE + plateforme |

- **État côté API** : ❌ pour l'endpoint ; la **mécanique existe** : `BookingExpiryJob` (`booking-service/.../service/impl/BookingExpiryJob.java`, TTL `sira.bookings.unpaid-ttl-minutes`, défaut 30, mini 5, intervalle 60 s) annule les réservations en ligne impayées. En revanche `cancelReason`/`cancelledAt` ne sont pas persistés (donc `expired` non calculable aujourd'hui) et `BookingResponse.typeBooking` porte le canal.

---

### Locations de bus (liste) — `/ventes/locations`

- **Fonctionnalités** : stats (Locations, Demandes et devis = REQUESTED+QUOTED, Confirmées, Encaissé XOF = somme `paidAmount`) ; filtre `?statut=` (REQUESTED « Demandes », QUOTED « Devis envoyés », CONFIRMED « Confirmées », COMPLETED « Terminées », CANCELLED « Annulées »), compagnie, `q` ; colonnes : Location (code + motif · passagers), Client (+ compagnie), Itinéraire (retrait → destination, départ, « aller-retour » / « aller simple »), Bus (libellé ou « À affecter »), Devis (« — » si nul), Solde (« — » si pas de devis), Statut (+ pastille rouge « Conflit » si `conflicts` non vide, infobulle « Chevauche LOC-… ») ; ligne → fiche ; tri `departure` décroissant ; vide « Aucune location pour ces critères. »
- **Modèle de données attendu** (`RentalRow`, **domaine nouveau**) :

| Champ | Type | Nullable | Valeurs / format | Commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| rentalCode | string | non | `LOC-…` (unique) | généré par l'API |
| companyId / companyName | uuid / string | non | | |
| customerName | string | non | | |
| customerPhone | string | non | **masqué** par l'API (`+221•••••••12`) ; le numéro complet ne quitte jamais le serveur | RGPD |
| purpose | enum | non | `WEDDING` « Mariage », `SCHOOL` « Sortie scolaire », `SPORT` « Équipe sportive », `BUSINESS` « Entreprise », `PILGRIMAGE` « Pèlerinage », `OTHER` « Autre » | |
| passengers | int | non | > 0 | |
| pickup / destination | string | non | texte libre (lieux) | |
| departure | ISO datetime | non | | |
| returnAt | ISO datetime | oui | `null` = aller simple (bloque 1 jour) | |
| estimatedKm | int | non | | |
| busId / busLabel | uuid / string | oui | « <plaque> · <marque> <modèle> » | fleet-service |
| driverId / driverName | uuid / string | oui | | hr-service (ou registre d'équipage) |
| status | enum | non | `REQUESTED`, `QUOTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` | |
| quoteAmount | number | oui | entier arrondi | `null` tant que REQUESTED |
| currency | string | non | défaut `XOF` | |
| depositRequired | number | non | 30 % du devis (arrondi) | calculé à l'envoi du devis |
| cautionAmount | number | non | 10 % du devis (arrondi) | idem |
| paidAmount | number | non | cumul des paiements | |
| balance | number | non | `max(quote − paid, 0)` | calculé API |
| payment | enum | non | `none` (aucun paiement), `deposit` (acompte versé), `settled` (soldée : `paid ≥ quote > 0`) | calculé API |
| conflicts | string[] | non | codes des autres locations *actives* (QUOTED/CONFIRMED) qui partagent bus ou chauffeur sur une plage de dates qui se chevauche | calculé API ; vide si la location elle-même n'est pas QUOTED/CONFIRMED |
| invoiceNumber | string | oui | `FAC-LOC-0001`… | émise à l'envoi du devis |
| createdAt, cancelledAt | ISO datetime | non / oui | | |
| cancelReason | string | oui | texte libre saisi | |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/rentals` | `q`, `companyId`, `status`, `page`, `size`, `sort` (défaut `departure,desc`) | page de `RentalRow` | RENTAL_MANAGE (nouvelle) + plateforme |
| GET | `/admin/rentals/summary` | `companyId?` | `{total, requestedOrQuoted, confirmed, collected, currency}` | idem |

- **Règles métier** : fenêtre d'une location = `[departure, returnAt ?? departure + 24 h)` ; deux fenêtres se chevauchent si `a1 < b2 && b1 < a2`. Téléphone masqué côté API.
- **État côté API** : ❌ **tout** (domaine inexistant, voir Synthèse).

---

### Location (fiche) — `/ventes/locations/[id]`

- **Fonctionnalités** : en-tête (code, client · compagnie, badge statut) ; alerte rouge de conflit « Le bus ou le chauffeur est aussi pris par X, Y aux mêmes dates. » ; bandeau itinéraire + dates + montant du devis (« En attente » si nul) + état de paiement (« Aucun paiement », « Acompte versé », « Soldée ») ; 12 tuiles (Client, Téléphone masqué, Motif, Passagers, Bus ou « À affecter », Chauffeur (lien `/flotte/equipage/{id}`) ou « À affecter », Distance estimée, Compagnie, Acompte à verser, Déjà payé, Solde restant, Caution — « — » si pas de devis) ; carte Facture (numéro → `/ventes/factures/<n>`, total, reste à payer, badge, bouton « Ouvrir la facture » ; sinon « Aucune facture pour l'instant : elle est émise avec le lien de paiement quand le devis est envoyé. ») ; carte Actions (formulaires selon `nextActions`) ; carte Historique (journal du plus récent au plus ancien : libellé, date, acteur) + liste des paiements (date, montant) ; location clôturée : « Cette location est clôturée : plus aucune action possible. »
- **Actions** (formulaires de `RentalActions`) :
  - **Envoyer le devis** (REQUESTED) : champ « Montant du devis (devise) », numérique, requis.
  - **Affecter** (QUOTED/CONFIRMED) : listes déroulantes Bus et Chauffeur (obligatoires).
  - **Enregistrer le paiement** (QUOTED/CONFIRMED et solde > 0) : montant prérempli avec le solde.
  - **Confirmer la location** (QUOTED), **Terminer la location** (CONFIRMED).
  - **Annuler la location** (REQUESTED/QUOTED/CONFIRMED) : dialogue destructif avec motif obligatoire ; texte : « La location ne pourra plus être modifiée. Les paiements déjà reçus restent à rembourser hors de Sira. »
- **Modèle de données attendu** (`RentalDetail`) :

| Champ | Type | Commentaire |
|---|---|---|
| rental | `RentalRow` | voir ci-dessus |
| payments[] | `{at: ISO, amount: number}` | ordre chronologique |
| history[] | `{at: ISO, label: string, actor: string}` | `actor` = e-mail de l'admin ; libellés : « Devis et facture FAC-LOC-0001 envoyés (250000 XOF) », « Bus et chauffeur affectés », « Paiement de N XOF enregistré », « Location confirmée », « Location terminée », « Location annulée. Motif : … » |
| buses[] | `{id, label, seats}` | bus de la **compagnie** non `retired` avec `seatCapacity ≥ passengers` |
| drivers[] | `{id, name}` | membres d'équipage `DRIVER` de la compagnie |
| nextActions[] | `quote|assign|pay|confirm|complete|cancel` | calculé API : REQUESTED→quote ; QUOTED/CONFIRMED→assign,pay ; QUOTED→confirm ; CONFIRMED→complete ; ouvert (≠COMPLETED/CANCELLED)→cancel |

- **Endpoints requis** :

| Méthode | Chemin proposé | Corps | Réponse / erreurs | Permission |
|---|---|---|---|---|
| GET | `/admin/rentals/{id}` | — | `RentalDetail` ; `404` « Location introuvable » | RENTAL_MANAGE |
| POST | `/admin/rentals/{id}/quote` | `{amount: number}` | location mise à jour | RENTAL_MANAGE |
| PUT | `/admin/rentals/{id}/assignment` | `{busId, driverId}` | location mise à jour | RENTAL_MANAGE |
| POST | `/admin/rentals/{id}/payments` | `{amount: number}` | location mise à jour | RENTAL_MANAGE |
| POST | `/admin/rentals/{id}/confirm` | — | location | RENTAL_MANAGE |
| POST | `/admin/rentals/{id}/complete` | — | location | RENTAL_MANAGE |
| POST | `/admin/rentals/{id}/cancel` | `{reason: string}` | location | RENTAL_MANAGE |
| POST | `/rentals` (création, non utilisée par le backoffice mais nécessaire à la source des données) | `{companyId?, customerName, customerPhone, purpose, passengers, pickup, destination, departure, returnAt?, estimatedKm}` | `201 Rental` ; origine : formulaire public client / saisie guichet | public ou RENTAL_MANAGE |

- **Règles métier** (machine à états ; toute action hors état autorisé → `409` « Cette action n'est pas possible dans l'état actuel de la location ») :
  - `quote` : REQUESTED → QUOTED ; `amount` fini et > 0 (« Le montant du devis doit être positif ») ; arrondi ; `depositRequired = round(30 % × devis)`, `cautionAmount = round(10 % × devis)` ; **émet la facture** `FAC-LOC-NNNN` (numéro = max des numéros existants + 1, 4 chiffres, **séquence globale à garantir unique et atomique côté serveur**) avec `invoiceIssuedAt = now` ; historique « Devis et facture … envoyés ».
  - `assign` : états QUOTED ou CONFIRMED ; le bus doit appartenir à la compagnie, ne pas être `retired` (« Bus introuvable pour cette compagnie »), avoir `seatCapacity ≥ passengers` (« Ce bus a N places pour M passagers ») ; le chauffeur doit être un `DRIVER` de la compagnie (« Chauffeur introuvable pour cette compagnie ») ; **refus** si une autre location **CONFIRMED** chevauche les dates avec le même bus ou chauffeur (« Bus ou chauffeur déjà pris par la location LOC-… à ces dates ») — les conflits entre locations QUOTED sont seulement *signalés* (champ `conflicts`), pas bloqués.
  - `pay` : états QUOTED/CONFIRMED ; montant > 0 (« Le montant doit être positif ») et ≤ solde (« Le montant dépasse le solde restant (N XOF) ») ; entier arrondi ; ajoute au journal des paiements.
  - `confirm` : QUOTED → CONFIRMED ; exige bus **et** chauffeur affectés (« Affectez un bus et un chauffeur avant de confirmer ») et `paidAmount ≥ depositRequired` (« L'acompte de N XOF n'est pas encore versé »).
  - `complete` : CONFIRMED → COMPLETED ; exige `paidAmount ≥ quote` (« Le solde doit être payé avant de terminer la location »).
  - `cancel` : REQUESTED/QUOTED/CONFIRMED → CANCELLED ; motif obligatoire (« Un motif est obligatoire ») ; refusé si `departure ≤ now` (« Une location déjà partie ne peut plus être annulée ») ; renseigne `cancelledAt`/`cancelReason` ; le remboursement est hors Sira (aucun flux de remboursement).
  - Chaque action écrit une ligne d'historique (acteur = admin) **et** une activité de compagnie (« Location LOC-… : <libellé> ») ; **audit** vers `audit-compliance-service` (règle 6 du projet) à prévoir.
- **État côté API** : ❌ tous (domaine à créer). Dépendances : lecture des bus (`fleet-service` `GET /buses`, `capacité`, `status`) ✅ existe mais scopé compagnie/`FLEET_MANAGE` ; chauffeurs `DRIVER` (hr-service `Employee`/équipage : à vérifier, le backoffice utilise un registre `CrewMember{id, companyId, name, role: DRIVER|DRIVER_ASSISTANT|CONTROLLER}`).

---

### Factures de location (liste) — `/ventes/factures`

- **Fonctionnalités** : stats (Factures, À encaisser = somme des `balance` hors annulées, Payées, En retard) ; filtre `?statut=` (TO_PAY « À payer », PARTIAL « Acompte reçu », PAID « Payées », OVERDUE « En retard », CANCELLED « Annulées »), compagnie, `q` ; colonnes : Facture (numéro + « Émise le »), Client (+ code location · compagnie), Échéance, Total, Reste à payer, Statut ; ligne → `/ventes/factures/<numéro>` ; tri `issuedAt` décroissant ; seules les locations ayant une facture (devis envoyé) apparaissent ; vide « Aucune facture pour ces critères. »
- **Modèle de données attendu** (`RentalInvoiceRow`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| number | string | non | `FAC-LOC-0001` | clé d'URL, unique |
| rentalId / rentalCode | uuid / string | non | | |
| companyId / companyName | uuid / string | non | | |
| customerName | string | non | | |
| issuedAt, dueAt | ISO datetime | non | `dueAt = issuedAt + paymentTermsDays` (délai du modèle de la compagnie) | |
| total / balance | number | non | `total = quoteAmount` (TTC) | |
| currency | string | non | | |
| status | enum | non | `TO_PAY`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED` | calculé : location CANCELLED→CANCELLED ; `paid ≥ total`→PAID ; `dueAt < now`→OVERDUE ; `paid > 0`→PARTIAL ; sinon TO_PAY |

- **Endpoints requis** :

| Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/rental-invoices` | `q`, `companyId`, `status`, `page`, `size`, `sort` (défaut `issuedAt,desc`) | page de `RentalInvoiceRow` | RENTAL_MANAGE + plateforme |
| GET | `/admin/rental-invoices/summary` | `companyId?` | `{total, toCollect, paid, overdue, currency}` | idem |

  Le filtre `status=OVERDUE` doit être évalué avec l'horloge serveur (statut non stocké ou rafraîchi par job).
- **État côté API** : ❌. Attention au nommage : `GET /invoices` de `company-service` (`InvoiceController.java`) = factures d'**abonnement SaaS** ; utiliser un chemin distinct (`/rental-invoices`).

---

### Facture de location (fiche) — `/ventes/factures/[number]`

- **Fonctionnalités** : en-tête (« Facture N », client · émetteur, badge) ; **feuille de facture** imprimable (`InvoiceSheet`) aux couleurs/logo/textes du modèle de la compagnie, avec QR code du lien de paiement affiché seulement si `balance > 0` et `template.showQr` ; panneau « Règlement » : bouton « Payer <solde> » (visible si `balance > 0` et non annulée ; **simule le règlement du client par le lien de paiement et solde la facture**), « Copier le lien de paiement », « Imprimer ou enregistrer en PDF » (`window.print`), « Personnaliser le modèle » (→ `/compagnies/{id}/modele-facture`), lien vers la location. Erreur affichée en rouge si le paiement échoue.
- **Modèle de données attendu** (`RentalInvoice`) :

| Champ | Type | Nullable | Valeurs | Commentaire |
|---|---|---|---|---|
| number, rentalId, rentalCode, companyId | string/uuid | non | | |
| issuer | `{name, lines[], ninea, registration}` | non | `lines` = [email, téléphone, pays] de la compagnie (vides filtrés) | company-service `Company` (`contactEmail`, `contactPhone`, `country`, `ninea`, `registrationNumber`) |
| customer | `{name, lines[]}` | non | `lines` = [téléphone masqué, libellé du motif] | |
| lines[] | `{label, detail, amount}` | non | 1 ligne : « Location d'un bus avec chauffeur · <pickup> → <destination> » ; détail « aller-retour|aller simple · N passagers · environ K km · départ le YYYY-MM-DD[, retour le YYYY-MM-DD] » ; `amount` = HT | généré par l'API |
| subtotal | number | non | `taxRate > 0 ? round(total / (1+taxRate/100)) : total` | HT |
| taxRate | number % | non | 0–30 (0 masque les lignes de TVA) | du modèle |
| taxAmount | number | non | `total − subtotal` | |
| total, paid, balance, cautionAmount | number | non | `balance = max(total − paid, 0)` | |
| currency | string | non | | |
| issuedAt, dueAt | ISO datetime | non | | |
| status | enum | non | `RentalInvoiceStatus` | |
| payLink | string | non | `https://pay.sira.app/f/<numéro>` | URL publique de paiement |
| template | `InvoiceTemplate` | non | fusion de défaut + modèle de la compagnie | voir écran modèle |
| qr (calculé) | data URL PNG | oui | encodage de `payLink`, 320 px, correction « M », couleur = couleur principale **si assez sombre** (texte blanc lisible) sinon `#111827` | généré côté serveur Next aujourd'hui (lib `qrcode`) ; peut rester côté client |

- **Endpoints requis** :

| Méthode | Chemin proposé | Corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/rental-invoices/{number}` | — | `RentalInvoice` ; `404` | RENTAL_MANAGE |
| POST | `/admin/rental-invoices/{number}/payments` | — (règle le solde en entier) | facture mise à jour ; `409` « Cette facture est déjà payée » | RENTAL_MANAGE |
| GET | `/pay/{number}` (public) | — | page/API de paiement client (lien du QR) | public + signature |
| GET | `/admin/rental-invoices/{number}/qr` (optionnel) | — | PNG du QR | RENTAL_MANAGE |

- **Règles métier** : `payInFull` = enregistrement d'un paiement de location du montant exact du solde ; refus si solde ≤ 0 ; la facture évolue avec le paiement de la location (même source de vérité). La génération PDF côté serveur n'existe pas (impression navigateur).
- **État côté API** : ❌ tous (aucune facture de location ; le lien `pay.sira.app` n'existe pas). Hors périmètre : intégration d'un vrai fournisseur de paiement (mock aujourd'hui).

---

### Modèle de facture d'une compagnie — `/compagnies/[id]/modele-facture`

- **Fonctionnalités** : éditeur à gauche + **aperçu en direct** d'une facture d'exemple (`FAC-LOC-0000`, `LOC-EXEMPLE`, total 236 000, acompte 70 800, caution 23 600, client « Famille Ndiaye ») aux identités de la compagnie ; palettes prédéfinies (Marine et ambre `#1b2a41/#f59e0b`, Vert forêt `#14532d/#eab308`, Bordeaux `#7f1d1d/#d97706`, Ardoise et ciel `#1e293b/#0ea5e9`, Prune `#4c1d95/#f97316`, Océan `#0c4a6e/#14b8a6`) ; sélecteurs couleur principale et d'accent ; import du logo (fichier PNG/JPEG/WebP/SVG → data URL) ; champs : sous-titre d'en-tête (120 car. max), message de pied de page (300), mentions légales (600), TVA % (0–30, pas 0,5), délai de paiement en jours (0–90), case « Afficher le QR code de paiement » ; avertissement de contraste (fonction `contrast`/`readableOn` de `invoice-style.ts`) ; lien « Retour à la compagnie » ; enregistrement ; `404` si la compagnie est inconnue.
- **Modèle de données attendu** (`InvoiceTemplate`) :

| Champ | Type | Nullable | Valeurs / validation | Défaut |
|---|---|---|---|---|
| logoDataUrl | string | oui | `^data:image/(png\|jpeg\|webp\|svg+xml);base64,[A-Za-z0-9+/=]+$`, ≤ 400 000 car. (« 300 Ko maximum ») ; `null` = monogramme de la compagnie | `null` |
| primaryColor / accentColor | string | non | `^#[0-9a-fA-F]{6}$` (« Les couleurs doivent être au format #rrggbb ») | `#1b2a41` / `#f59e0b` |
| headerNote | string | non | ≤ 120 (« Le sous-titre est limité à 120 caractères »), `trim` | `""` |
| footerNote | string | non | ≤ 300, `trim` | « Merci de votre confiance. » |
| legalMentions | string | non | ≤ 600, `trim` | `""` |
| taxRate | number | non | fini, 0–30 (« Le taux de TVA doit être compris entre 0 et 30 % ») | 18 |
| paymentTermsDays | int | non | entier 0–90 (« Le délai de paiement doit être compris entre 0 et 90 jours ») | 7 |
| showQr | bool | non | | true |

  Le modèle lu = défaut fusionné avec l'enregistrement de la compagnie (champs absents → défaut).
- **Endpoints requis** :

| Méthode | Chemin proposé | Corps | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/companies/{id}/invoice-template` | — | `InvoiceTemplate` (fusionné avec les défauts) ; `404` « Compagnie introuvable » | COMPANY_MANAGE + plateforme |
| PUT | `/admin/companies/{id}/invoice-template` | `InvoiceTemplate` | modèle nettoyé ; `400` + message de validation | COMPANY_MANAGE + plateforme |

- **Règles métier** : validation identique côté serveur (ne pas se fier au client) ; effet de bord : activité de compagnie « Modèle de facture personnalisé » (acteur admin) et **audit** ; la mise à jour s'applique à toutes les factures de la compagnie, y compris déjà émises (l'échéance `dueAt` est recalculée avec le délai courant — à trancher : figer ou non, voir Questions ouvertes). Le TVA du modèle recalcule `subtotal/taxAmount` de factures existantes.
- **État côté API** : ❌ — `company-service` (`Company.logo_url`, `V1__create_companies_table.sql`) n'a pas de modèle de facture ; service propriétaire recommandé : `company-service` (nouvelle table `invoice_templates(company_id PK, …)`, logo idéalement stocké sur MinIO au lieu d'une data URL en base).

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| Domaine **Location de bus** complet (`Rental`, paiements, historique, workflow REQUESTED→QUOTED→CONFIRMED→COMPLETED/CANCELLED, conflits de dates, 30 %/10 % acompte/caution) + création | **booking-service** (nouveau lot « rentals » : la location est une vente de capacité, voisin de `Booking`/`Transaction`) ; alternative : nouveau service `rental-service` | haute | Aucune trace actuelle. Références bus/chauffeur par UUID nu (règle 1), vérification de disponibilité via `fleet-service` (bus) et `hr-service` (chauffeurs) |
| Factures de location (`RentalInvoice`, numérotation `FAC-LOC-NNNN` atomique, statut calculé, lien de paiement public + QR, paiement) | booking-service (même lot) | haute | À distinguer des `/invoices` SaaS de company-service |
| Modèle de facture par compagnie (+ logo) | company-service | moyenne | Table dédiée ; logo en MinIO ; validations du `InvoiceTemplate` |
| Vue plateforme des réservations (filtres `status/paymentStatus/channel/companyId/q`, `passengerName`, `companyName`, `routeLabel`, `departure`, `busPlate`) | booking-service (`/admin/bookings`) | haute | `GET /bookings` n'a que `tripId` ; données jointes via snapshots (event-carried) ou BFF |
| Liste des transactions (filtres, `anomalyOnly`) + anomalies STUCK/AMOUNT_MISMATCH/MISSING_TICKET calculées | booking-service | haute | Pas de liste de transactions aujourd'hui ; `failureReason`, `completedAt` à ajouter |
| Liste des billets + `scanCount` + **journal de scans** (qui, quand) | booking-service (nouvelle table `ticket_scans`) | haute | `Ticket` ne garde qu'un `scannedAt`/`scannedBy` |
| `cancelReason` (`EXPIRED|CLIENT|PLATFORM`) + `cancelledAt` sur `Booking`, motif d'annulation staff | booking-service | haute | Nécessaires à la chronologie, aux stats « expirées » et à l'audit |
| Annulation staff avec motif + gardes (déjà payée, paiement en cours) | booking-service | haute | `PATCH /bookings/{id}/cancel` actuel sans corps ni garde |
| Chronologie d'une réservation | booking-service | moyenne | Reconstruction depuis Booking/Transaction/Ticket(+scans) ; pas de table d'événements |
| Statistiques/agrégats (overview, summaries, online stats, counts) | booking-service (+ jointure fleet pour lignes) | haute pour overview/online, moyenne pour summaries | Calcul serveur indispensable si listes paginées |
| Moyens de paiement : liste plateforme paginée avec stats et `provider` ; type `BANK_TRANSFER` | booking-service | moyenne | `GET /payment-methods` non paginé, sans stats ni `provider` |
| Nom du voyageur sur la réservation/le billet | booking-service (snapshot depuis identity/customer) | haute | Le backend ne stocke que `userId`/`passengerId` |
| Nom de compagnie dans toutes les réponses | via company-service (agrégateur) | moyenne | Éviter N appels |
| Permissions : `RENTAL_MANAGE` (et lecture plateforme) | identity-service | haute | Nouvelle permission + rôle ; conjonction stricte plateforme (aucun claim `company_id` + `RBAC_MANAGE`) |
| Audit des actions (annulation staff, devis, affectation, paiement, confirmation, annulation de location, modèle de facture) | audit-compliance-service via `audit.events` | moyenne | Règle 6 du projet |
| Paiement réel des factures (lien public `pay.sira.app`) | booking-service / provider | basse | Mock aujourd'hui |

## Questions ouvertes

1. **Propriétaire des locations** : `booking-service` (lot « rentals ») ou nouveau microservice ? Impacte aussi les déploiements/CI et le périmètre de `PaymentMethod`/`Transaction` (les paiements de location réutilisent-ils `Transaction` ?).
2. **Vue plateforme** : implémenter `/admin/...` dans chaque service avec jointures par snapshots (event-carried state) ou via un BFF/agrégateur dédié dans le Gateway ? Les champs `passengerName`, `companyName`, `routeLabel`, `busPlate` imposent l'un des deux.
3. **Voyageur sans compte (guichet)** : où est stocké le nom d'un passager (`Booking` n'a que `passengerId`) ? Le backoffice affiche un nom pour chaque réservation, y compris guichet.
4. **Calculs des anomalies** : colonnes dérivées stockées (job) ou calculées à la requête ? Le filtre `anomalyOnly` exige un calcul serveur ; seuil de 30 min configurable ?
5. **Statut `OVERDUE` de facture et `conflicts` de location** : calculés à la lecture (horloge serveur) — acceptable pour le tri/filtre serveur ?
6. **Factures déjà émises vs modèle modifié** : le modèle (TVA, délai, logo) doit-il être figé à l'émission (recommandé légalement) ou appliqué dynamiquement comme aujourd'hui ?
7. **Numérotation `FAC-LOC-NNNN`** : séquence globale (comme aujourd'hui) ou par compagnie/année ? Unicité et absence de trous (obligation comptable) à définir.
8. **Chauffeurs** : source de vérité des conducteurs affectables (`hr-service Employee` vs registre d'équipage du backoffice) et vérification de disponibilité (congés, plannings) ?
9. **Conflits de dates** : seul un chevauchement avec une location CONFIRMED bloque l'affectation ; faut-il aussi bloquer contre les trajets réguliers (`Trip`) du même bus/chauffeur ?
10. **Remboursement** : l'annulation d'une location payée ne rembourse rien (« hors de Sira ») ; besoin d'un flux de remboursement/caution ? Statut `REFUNDED` existe côté `Transaction`.
11. **Devise** : le CA de l'aperçu ne compte que `XOF` ; stratégie multi-devises ?
12. **Insights textuels de l'aperçu** : l'API renvoie-t-elle des données brutes (meilleur jour, pic) ou des phrases ? Fuseau des tranches horaires (UTC aujourd'hui, Afrique de l'Ouest = UTC+0).
13. **Création de locations** : qui crée une demande (formulaire public, client connecté, guichet, backoffice) ? Le backoffice actuel ne crée pas de location.
14. **Valeurs des enums non couvertes par l'UI** : `Ticket.EXPIRED`, `Transaction.REFUNDED`, `PaymentMethod BANK_TRANSFER` existent côté backend mais pas dans les types du backoffice — à ajouter au front ou à filtrer à l'API.
15. Le tri client sur colonnes (Voyageur, Montant, Statut…) nécessitera des champs `sort` autorisés côté API ; liste exacte à valider.
