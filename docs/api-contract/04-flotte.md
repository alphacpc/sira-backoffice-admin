# 04 — Flotte

## Vue d'ensemble

Module « Flotte » du backoffice Sira (`/flotte/**`), outil de la plateforme : il voit **toutes les compagnies** (aucun tenant). Écrans : hub à 9 onglets (Aperçu, Bus, Trajets, Lignes, Gares, Flottes, Plans de sièges, Maintenance, Fournisseurs), fiches bus / ligne / trajet / équipage. Presque tout est en **lecture seule** ; la seule écriture est « Mettre hors service » (bus). Les données viennent de `fleet-service` (Station, Route, Bus, Trip, Fleet, Vendor, BusMaintenance), `booking-service` (SeatMap, Booking, Ticket) et `hr-service` (équipage = Employee). Aujourd'hui tout est en mémoire (`src/lib/data/seed.ts`) ; **toutes les listes sont filtrées, triées, recherchées et paginées côté client** sur le jeu complet (DataTable : tri par colonne, pages de 15) → l'API doit offrir pagination, tri, filtres et recherche serveur.

Conventions retenues pour le contrat :
- Préfixe proposé `/admin/fleet/...` (vue plateforme, multi-compagnies, paramètre `companyId` optionnel). Réponses paginées `{content[], page, size, totalElements, totalPages}` (format Spring `Page`), paramètres `page` (0-based), `size`, `sort=champ,asc|desc`, `q` (recherche texte insensible à la casse et aux accents, sous-chaîne), `companyId`.
- Permission proposée : `FLEET_MANAGE` + appelant plateforme (aucun claim `company_id` + `RBAC_MANAGE`, cf. `TenantAccessGuard`) ; `FLEET_MAINTENANCE_MANAGE` pour maintenance/fournisseurs ; `BOOKING_MANAGE` pour ce qui vient de booking-service. Une permission de lecture seule dédiée (ex. `FLEET_READ` plateforme) serait préférable (cf. Questions ouvertes).
- Les noms (compagnie, gare, plaque, conducteur…) sont affichés partout : l'API admin doit les fournir déjà résolus (« database per service » : l'agrégation est une responsabilité de l'API admin / BFF, pas du client).

### État du backend, constaté dans le code (valable pour tout le document)
- `fleet-service` : contrôleurs `fleet-service/src/main/java/com/sira/fleet/controller/{Station,Route,Bus,Trip,Fleet,Vendor,BusMaintenance}Controller.java` (+ `PublicTripController`, `InternalTripController`). Listes `GET /stations|/routes|/buses|/trips|/fleets|/vendors` : **paginées (Spring `Pageable`) et scopées à la compagnie du JWT** ; l'appelant « non restreint » (claim `company_id` absent + `RBAC_MANAGE`, `TenantAccessGuard.isUnrestricted`) reçoit `findAll` = **toutes compagnies**. Aucun filtre (ni `status`, `companyId`, `q`) n'existe sur ces listes, hors pagination/tri Spring. Sécurité : `SecurityConfig` — `/vendors/**`, `/maintenance/**`, `/buses/*/maintenance` exigent `FLEET_MAINTENANCE_MANAGE`, le reste `FLEET_MANAGE`.
- Il n'existe **aucun** endpoint de liste de maintenances plateforme (seulement `GET /buses/{busId}/maintenance`), ni `routeCount`/`busCount`/`tripCount`, ni noms résolus.
- Écarts de modèle fleet-service ↔ backoffice : le bus n'a **pas** `insurance_expiry`, `technical_inspection_expiry`, `registration_expiry`, `retiredAt` en base ni dans `BusResponse` (présents dans `sira_schema.dbml` l. 705-707 mais jamais migrés : `V3`, `V7`) ; pas de table `BusDocument` ni `BusAssignment` (dbml l. 763-790, non implémentées) ; `Trip` n'a pas de `totalSeats` (seulement `availableSeats`, `passengerCount`).
- Enums backend : `Bus.status` est une **String libre** (dbml : active, inactive, maintenance, retired) ; `Trip.status` String libre (aucune validation de transition) ; `MaintenanceType {PREVENTIVE,CORRECTIVE,INSPECTION,EMERGENCY}`, `MaintenanceCategory {ENGINE,BRAKES,TIRES,ELECTRICAL,BODY,OIL_CHANGE,GENERAL}`, `MaintenanceStatus {PLANNED,IN_PROGRESS,COMPLETED,CANCELLED}`, `PerformedBy {INTERNAL,EXTERNAL}`, `VendorType {GARAGE,INSURER,GOVERNMENT,SUPPLIER}`, `VendorStatus {ACTIVE,INACTIVE}`, `FleetStatus {ACTIVE,INACTIVE}`.

### Enums du backoffice (valeurs techniques exactes)
| Type | Valeurs | Libellés FR (`src/lib/labels.ts`) |
|---|---|---|
| `BusStatus` | `active` `maintenance` `retired` | En service / Maintenance / Hors service |
| `BusType` | `MINIBUS` `COACH` `STANDARD` `ARTICULATED` | Minibus / Autocar / Bus standard / Bus articulé |
| `FuelType` | `DIESEL` `PETROL` `ELECTRIC` `HYBRID` | Diesel / Essence / Électrique / Hybride |
| `TripStatus` | `planned` `boarding` `departed` `cancelled` | Planifié / Embarquement / Parti / Annulé |
| `RouteStatus` | `active` `inactive` | Active / Inactive |
| `MaintenanceStatus` | `PLANNED` `IN_PROGRESS` `COMPLETED` `CANCELLED` | Planifiée / En cours / Terminée / Annulée |
| `MaintenanceCategory` (backoffice) | `PREVENTIVE` `CORRECTIVE` `INSPECTION` | Préventive / Corrective / Contrôle |
| `VendorKind` | `GARAGE` `INSURER` `PARTS` `OTHER` | Garage / Assureur / Pièces détachées / Autre |
| `CrewRole` | `DRIVER` `DRIVER_ASSISTANT` `CONTROLLER` | Conducteur principal / Conducteur assistant / Contrôleur |
| `SeatState` | `free` `booked` `occupied` `blocked` | libre / réservé / occupé / bloqué |
| `ExpiryState` (calculé) | `expired` `soon` `ok` | Expirée depuis N j / Expire dans N j (≤ 30 j, inclus) / À jour |
| Ticket (explorateur) | `ISSUED` `CHECKED_IN` `USED` `CANCELLED` | Émis / Embarqué / Utilisé / Annulé |
| Paiement réservation | `paid` `pending` `failed` | Payée / Paiement en attente / Paiement échoué |

Attention : `MaintenanceCategory` du backoffice (PREVENTIVE/CORRECTIVE/INSPECTION) correspond au **`MaintenanceType`** backend ; la `MaintenanceCategory` backend (ENGINE, BRAKES…) est une autre notion, et le champ libre « type » (« Vidange… ») du backoffice correspond à `description` ou à la catégorie backend (voir Questions ouvertes).

---

## Hub — Aperçu

### Aperçu de la flotte — `/flotte`
- **Fonctionnalités**
  - Barre de recherche globale (paramètre `?q=`, max 80 caractères, insensible casse/accents) valable pour tous les onglets, avec **compteurs par onglet** (Bus, Trajets, Lignes, Gares, Flottes, Plans de sièges, Maintenance, Fournisseurs) recalculés selon `q` + `compagnie` ; message « Résultats pour « q » : N dans toute la flotte » et, sur onglet vide, suggestion des onglets où ça correspond.
  - Filtre compagnie (`?compagnie=<id>`, liste des **compagnies qui possèdent une flotte** = au moins une gare ; recherchable) commun à tous les onglets.
  - Cartes KPI : Flotte totale (+ « N hors service »), Taux de remplissage (% ou « — », + « N trajet(s) à venir »), En maintenance (nombre), Maintenance (30 j) (coût des interventions terminées dans les 30 derniers jours, en devise de la compagnie filtrée ou de la première compagnie).
  - « État de la flotte » : anneau de disponibilité (% de bus `active` sur le total), répartition En service / En maintenance / Hors service, bus sans conducteur ; lien « Tous les bus ».
  - Barres par compagnie : top 6 compagnies par nombre de bus (active/maintenance/retired/total).
  - « Alertes de flotte » (masquées si compteur = 0) : Documents expirés (danger → `/flotte/bus`), Documents à renouveler (< 30 j, warning → `/flotte/bus`), Maintenances en retard (prochaine maintenance dépassée, danger → `/flotte/maintenance`), Bus sans conducteur (info → `/flotte/bus?conducteur=sans`).
  - « Prochains départs » : 5 prochains trajets `planned`/`boarding` dont le départ est ≥ maintenant (liens vers la fiche trajet).
  - « Maintenance » : 5 interventions `IN_PROGRESS` puis `PLANNED` (tri : IN_PROGRESS d'abord, puis date prévue croissante), lien vers `/flotte/bus/{id}?onglet=maintenance`.
  - « Documents à renouveler » : 6 documents (assurance, contrôle technique, carte grise) expirés ou ≤ 30 j des bus **non retirés**, tri par jours restants croissants puis plaque.
- **Modèle de données attendu** — `FleetOverview` (tout calculé par l'API, filtrable par `companyId`) :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| total | int | non | | bus de la portée (retirés inclus) |
| byStatus | {active, maintenance, retired: int} | non | | |
| availabilityPercent | int | non | 0-100, arrondi `active/total` | calculé API, 0 si total = 0 |
| withoutDriver | int | non | bus non retirés avec `driverId` nul | |
| upcomingTrips | int | non | trajets `planned`/`boarding` avec départ ≥ now | |
| fillPercent | int | oui | `round(places vendues / places totales)` sur ces trajets ; null si 0 place | places vendues = totalSeats − availableSeats |
| maintenanceCost30d | decimal | non | somme `totalCost` des maintenances `COMPLETED` dont `completedAt` ≥ now−30 j | |
| currency | string | non | code devise | compagnie filtrée, sinon première compagnie (ambigu en multi-compagnies, cf. Questions) |
| byCompany[] | {id, name, active, maintenance, retired, total} | non | top 6, tri `total` desc puis nom | |
| alerts[] | {key: expired|soon|overdue|driver, label, hint, count, href, tone: danger|warning|info} | non | uniquement count > 0 | libellés/liens peuvent rester côté client ; l'API fournit les `count` |
| departures[] | `TripRow` (voir Trajets) ×5 | non | | |
| maintenance[] | `MaintenanceRow` (voir Maintenance) ×5 | non | | |
| documents[] | {busId, plate, companyName, label: Assurance|Contrôle technique|Carte grise, daysLeft: int} ×6 | non | `daysLeft` négatif = expiré ; arrondi au jour le plus proche | |
  Compteurs d'onglets : `{bus, trajets, lignes, gares, flottes, plans-de-sieges, maintenance, fournisseurs: int}`.
- **Endpoints requis**
| Méthode | Chemin proposé | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/fleet/overview` | `companyId?` | — | `FleetOverview` | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/search-counts` | `q?`, `companyId?` | — | compteurs d'onglets | idem |
| GET | `/admin/fleet/companies` | — | — | `[{id, name}]` des compagnies ayant ≥ 1 gare, ordre d'inscription | idem |
- **Règles métier** : disponibilité = bus `active` / total (retirés comptés au dénominateur) ; « bus sans conducteur » et « maintenances en retard » (`nextMaintenanceDate` < now) ne comptent que les bus **non retirés** ; seuil d'alerte document : `soon` = 0 ≤ diff ≤ 30 j (30 j inclus), `expired` = date < now ; `daysLeft` arrondi au jour entier, jamais `-0`. Le filtre `compagnie` inconnu ou sans flotte est ignoré (équivaut à « toutes »).
- **État côté API**
  - `GET /admin/fleet/overview` : ❌ manquant — service recommandé `fleet-service` (bus, trajets, maintenance sont chez lui ; seuls les noms de compagnie viennent de `company-service`, à enrichir par l'API admin/BFF). Les documents d'expiration exigent en plus des champs absents de `Bus` (voir fiche bus).
  - `GET /admin/fleet/search-counts` : ❌ manquant — `fleet-service`.
  - `GET /admin/fleet/companies` : ⚠️ partiel — `company-service` expose `GET /companies` (toutes compagnies, scopé `COMPANY_MANAGE`), mais pas le filtre « possède une flotte » (à calculer côté fleet : `SELECT DISTINCT company_id FROM stations`).

---

## Bus

### Liste des bus — `/flotte/bus`
- **Fonctionnalités**
  - Table (DataTable, 15 lignes/page, colonnes triables) : **Bus** (plaque + code), **Modèle** (marque + modèle), **Compagnie**, **Affectation** (libellé de ligne « Ville → Ville » ou vide), **Statut** (pastille), **Capacité** (« N places »), **Conducteur** (nom ou « Aucun »), **Prochaine maintenance** (date, mise en évidence si dépassée). Clic ligne → `/flotte/bus/{id}`.
  - Filtres : Compagnie (`?compagnie`), Statut (`?statut` = `active|maintenance|retired`), Équipage (`?conducteur=sans` → bus sans conducteur), recherche `?q` (plaque, code, marque+modèle, compagnie, flotte, ligne, conducteur).
  - Bandeau de stats (hors recherche, sur le jeu non filtré par statut/q mais filtré par compagnie) : Bus, En service, En maintenance, Sans conducteur.
  - Tri par défaut : nom de compagnie (fr) puis plaque.
  - État vide : « Aucun bus pour ces critères. ».
- **Modèle de données attendu** — `BusRow` :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | fleet.buses.id |
| busCode | string | non | | `busCode` (✅) |
| plate | string | non | | backend : `plateNumber` |
| brandModel | string | non | « Marque Modèle » | calculé |
| companyId / companyName | uuid / string | non | | nom : company-service |
| fleetName | string | oui | | `fleetId` → Fleet.name |
| routeLabel | string | oui | « Ville → Ville » | `assignedRouteId` → Route → villes des gares |
| status | `BusStatus` | non | active/maintenance/retired | backend String libre |
| seatCapacity | int | non | | ✅ |
| driverName | string | oui | nom de l'employé affecté | `assignedDriverId` → hr-service Employee + identity User (le nom n'est pas dans Employee) |
| nextMaintenanceDate | date | oui (backoffice l'affiche toujours) | ISO | ✅ `nextMaintenanceDate` |
  Stats : `{total, active, maintenance, withoutDriver}` pour la portée compagnie.
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/buses` | `companyId?`, `status?` (active\|maintenance\|retired), `withoutDriver?` (bool), `q?`, `page`, `size`, `sort` (plate, busCode, brandModel, companyName, routeLabel, status, seatCapacity, driverName, nextMaintenanceDate ; défaut companyName,plate) | `Page<BusRow>` + `summary {total, active, maintenance, withoutDriver}` | `FLEET_MANAGE` plateforme |
- **Règles métier** : lecture seule ; « sans conducteur » = `driverId` nul ; recherche multi-champs insensible aux accents.
- **État côté API**
  - ⚠️ partiel — `GET /buses` (`fleet-service/.../controller/BusController.java:66`) : paginé, **toutes compagnies pour l'appelant non restreint**, `BusResponse` complet mais **sans** `status` filtrable, `companyId`, `q`, `withoutDriver`, ni noms résolus (compagnie, flotte, ligne, conducteur), ni `summary`. Manque aussi le tri sur champs calculés. Propriétaire : `fleet-service` (+ enrichissement noms côté API admin).

### Fiche bus — `/flotte/bus/[id]` (`?onglet=caracteristiques|equipage|maintenance|trajets`)
- **Fonctionnalités**
  - En-tête : plaque, « code · marque modèle · compagnie », pastille de statut, bouton **« Mettre hors service »** (masqué si `retired`) ouvrant une confirmation destructive avec **motif obligatoire** (≤ 500 caractères, trim).
  - Onglet **Caractéristiques** : bandeau (plaque, code, marque modèle année, statut, places assises) ; « Rattachement » (Compagnie → `/compagnies/{id}?onglet=flotte`, Flotte, Ligne → `/flotte/lignes/{id}`, Dépôt, Date d'achat, Prix d'achat en devise de la compagnie, « Hors service depuis le » si retiré) ; « Échéances » (Assurance, Contrôle technique, Carte grise avec badge expirée/bientôt/à jour + jours restants ; Dernière et Prochaine maintenance) ; « Caractéristiques » (Type, Carburant, Places debout, Soute à bagages en m³, Numéro de moteur, Couleur) ; « Équipements » (Climatisation, Accès fauteuil roulant, GPS (+ identifiant du boîtier ou « boîtier inconnu »), Caméra, Capteur de carburant).
  - Onglet **Équipage** (affectations) : 3 lignes Conducteur principal / Conducteur assistant / Contrôleur (nom + lien `/flotte/equipage/{id}` ou « Aucun »). Lecture seule (« registre d'équipage sans compte ni coordonnées »).
  - Onglet **Maintenance** : tableau Code, Type, Catégorie, Fournisseur (« Interne » si aucun), Prévue le, Statut, Coût total ; tri plus récent d'abord (`scheduledDate` desc) ; vide : « Aucune maintenance enregistrée. ».
  - Onglet **Trajets et sièges** : « Plan de sièges (N) » — un plan de sièges par trajet de ce bus (plus récent d'abord) avec la grille colorée par état + lien trajet ; « Trajets (N) » : Départ (lien), Ligne, Statut, Places libres « x / y » ; vides : « Aucun plan de sièges pour ce bus. » / « Aucun trajet pour ce bus. ».
  - Pas d'onglet « Documents » ni « Affectations » séparés : les « documents » se limitent aux 3 dates d'expiration ; les affectations = les 3 membres d'équipage.
- **Modèle de données attendu** — `BusDetail` :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id, companyId, fleetId | uuid | fleetId oui | | ✅ |
| busCode, plate (backend `plateNumber`), brand, model | string | non | | ✅ |
| year | int | non | | backend `yearOfManufacture` ✅ |
| busType | BusType | non | | backend String libre |
| fuelType | FuelType | non | | backend String libre |
| engineNumber, color | string | non | | ✅ |
| seatCapacity, standingCapacity | int | non | | ✅ |
| luggageCapacity | int | non | affiché « N m³ » | ✅ (unité à confirmer) |
| wheelchairAccessible, airConditioned, gpsEnabled, cameraInstalled, fuelSensorInstalled | bool | non | | ✅ |
| gpsDeviceId | string | oui | | ✅ |
| status | BusStatus | non | | ✅ (libre) |
| routeId, depotId | uuid | oui | | ✅ `assignedRouteId`, `currentDepotId` |
| driverId, driverAssistantId, controllerId | uuid | oui | id Employee hr-service | ✅ `assignedDriverId` etc. |
| lastMaintenanceDate, nextMaintenanceDate | date | oui | | ✅ |
| insuranceExpiry, technicalInspectionExpiry, registrationExpiry | date | non (backoffice) | ISO | ❌ absent du modèle fleet-service |
| purchaseDate | date | oui | | ✅ |
| purchasePrice | decimal | oui | devise = celle de la compagnie | ✅ |
| retiredAt | timestamp | oui | instant de la mise hors service | ❌ absent |
| companyName, currency, fleetName, routeLabel, depotName | string | oui sauf company | | enrichis (noms de gare, compagnie, devise `Company.currency`) |
| crew[3] | {role, name?, id?} | | toujours 3 entrées dans l'ordre DRIVER, DRIVER_ASSISTANT, CONTROLLER | noms via hr-service + identity-service |
| expiries[3] | {key: insurance|inspection|registration, label, date, state, daysLeft} | | état calculé (cf. règle) | calculé API **ou** client à partir des dates (référence = now) |
| maintenances[] | `MaintenanceRow` | | scheduledDate desc | voir Maintenance |
| trips[] | `TripRow` | | départ desc | voir Trajets |
| seatMaps[] | {tripId, routeLabel, departure, map: SeatMapView} | | départ desc, uniquement trajets existants | booking-service |
  `SeatMapView` : `{id, rows, columns, seats[{code (« 12A »), row, column, state}], counts{total, free, booked, occupied, blocked}}`.
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Corps | Réponse | Permission |
|---|---|---|---|---|---|
| GET | `/admin/fleet/buses/{id}` | — | — | `BusDetail` sans les listes imbriquées | `FLEET_MANAGE` plateforme |
| POST | `/admin/fleet/buses/{id}/retire` | — | `{reason: string (1-500, trim)}` | `BusDetail` (status retired, retiredAt = now) | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/buses/{id}/maintenance` | `page,size,sort` | — | `Page<MaintenanceRow>` | `FLEET_MAINTENANCE_MANAGE` |
| GET | `/admin/fleet/trips` | `busId=…` (voir Trajets) | | trajets du bus | |
| GET | `/admin/fleet/seat-maps` | `busId=…` (voir Plans de sièges) | | plans + sièges avec états | |
- **Règles métier**
  - `retire` : (1) bus existe sinon 404 « Bus introuvable » ; (2) motif non vide après trim sinon 400 « Un motif est obligatoire » ; (3) déjà `retired` → 409 « Ce bus est déjà hors service » ; (4) une maintenance `IN_PROGRESS` → 409 « Une maintenance est en cours sur ce bus » ; (5) un trajet `planned` ou `boarding` (même passé) sur ce bus → 409 « Ce bus a des trajets à venir ». Ordre des gardes à respecter. Effets : `status=retired`, `retiredAt=now` ; `nextMaintenanceDate` et l'équipage affecté sont **conservés** ; **trace d'activité** sur la compagnie « Bus {plaque} mis hors service. Motif : {motif} » (acteur = admin Sira connecté, horodatage) → événement vers `audit-compliance-service` (règle 6 CLAUDE.md) ; le motif doit être persisté/relayé (aujourd'hui le service d'audit ne reçoit jamais de texte libre : décision à prendre).
  - Transition autorisée : `active|maintenance → retired` ; pas de réactivation dans l'UI. Un bus `retired` n'a plus de ligne (`routeId` nul) dans le jeu de démo.
  - État d'échéance : `expired` si date < now ; `soon` si 0 ≤ (date − now) ≤ 30 j ; sinon `ok`. `daysLeft` = jours arrondis, ni `-0`.
  - Équipage : `driverId/driverAssistantId/controllerId` pointent des Employee ; pas modifiable depuis le backoffice.
- **État côté API**
  - `GET /admin/fleet/buses/{id}` : ⚠️ partiel — `GET /buses/{id}` (`BusController.java:48`, scopé tenant ; non restreint = ok) ; **manquent** `insuranceExpiry`/`technicalInspectionExpiry`/`registrationExpiry`, `retiredAt`, et les noms résolus. Le modèle `Bus` n'a pas ces colonnes (migrations `V3`, `V7`) : ajouter les 3 dates (dbml) ou implémenter `BusDocument` (dbml l. 780, `expiry_date`, `document_type`). Propriétaire `fleet-service`.
  - `POST /admin/fleet/buses/{id}/retire` : ❌ manquant — `PATCH /buses/{id}` (`BusController.java:55`) change `status` en texte libre **sans aucune garde** (ni maintenance en cours, ni trajets à venir, ni motif). Propriétaire `fleet-service` ; audit via `audit.events` (le bus est déjà audité en `UPDATE`, `BusServiceImpl.java:108`, sans motif).
  - `GET .../maintenance` : ⚠️ — `GET /buses/{busId}/maintenance` (`BusMaintenanceController.java:50`, paginé, `FLEET_MAINTENANCE_MANAGE`) ; `BusMaintenanceResponse` n'inclut pas le nom du fournisseur ni la devise résolus, ni le champ « type » libre.
  - Trajets du bus / plans de sièges du bus : voir Trajets (❌ filtre `busId` absent de `GET /trips`) et Plans de sièges (⚠️ `GET /seat-maps` filtre seulement `tripId`).

---

## Flottes

### Flottes — `/flotte/flottes`
- **Fonctionnalités** : grille de cartes (3 colonnes) : nom de la flotte, compagnie, **nombre de bus**, **dépôt de base** (« Aucun » si nul) ; filtre compagnie ; recherche `q` (nom, compagnie, dépôt) ; tri compagnie puis nom ; vide : « Rien à afficher ici. ». Pas de page de détail.
- **Modèle de données attendu** — `FleetRow` :
| Champ | Type | Nullable | Source / commentaire |
|---|---|---|---|
| id | uuid | non | ✅ |
| name | string | non | ✅ |
| companyId / companyName | uuid / string | non | nom : company-service |
| depotName | string | oui | `baseDepotStationId` → Station.name |
| busCount | int | non | comptage `buses.fleet_id` (calculé API) |
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/fleets` | `companyId?`, `q?`, `page,size,sort` | `Page<FleetRow>` | `FLEET_MANAGE` plateforme |
- **Règles métier** : lecture seule.
- **État côté API** : ⚠️ partiel — `GET /fleets` (`FleetController.java:62`, `FleetResponse(id, companyId, name, description, baseDepotStationId, status, …)`), paginé, toutes compagnies pour l'appelant non restreint ; manque `busCount`, noms résolus (compagnie, dépôt), filtres `companyId`/`q`. `fleet-service`.

---

## Gares

### Gares (liste + carte) — `/flotte/gares` (`?affichage=carte|liste`, `?ville=`)
- **Fonctionnalités**
  - Vue **carte** par défaut (Leaflet) : une épingle par gare dont la ville a des coordonnées ; l'icône dépend du nombre de lignes ; panneau latéral listant les gares (nom, « ville · compagnie », badge nombre de lignes) ; clic épingle → fiche (nom, ville, lignes desservies, bouton vers `/flotte/lignes?compagnie={id}&q={ville}`). Vue **liste** (DataTable) : Gare, Ville, Compagnie, Lignes desservies.
  - Filtres : Compagnie, Ville (liste des villes distinctes, recherchable), `q` (nom, ville, compagnie). Bascule Carte/Liste conservant les filtres.
  - **Positionnement actuel (démo)** : le backoffice **ne reçoit aucune coordonnée** : il place chaque gare au centre de sa ville (`src/lib/geo.ts`, 16 villes du Sénégal) avec un décalage en anneau pour les gares multiples. Les gares dont la ville n'est pas connue n'apparaissent pas sur la carte. À remplacer par les vraies `latitude`/`longitude`.
- **Modèle de données attendu** — `StationRow` / `StationPin` :
| Champ | Type | Nullable | Source / commentaire |
|---|---|---|---|
| id | uuid | non | ✅ |
| name | string | non | ✅ |
| city | string | non | ✅ `city` |
| companyId / companyName | uuid / string | non | nom : company-service |
| routeCount | int | non | nombre de lignes dont la gare est origine **ou** destination (calculé API) |
| latitude, longitude | decimal | oui | ✅ `Station.latitude/longitude` (`NUMERIC(9,6)`) ; nécessaires à la carte |
  Villes distinctes (options du filtre) : `string[]` trié (fr).
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/stations` | `companyId?`, `city?`, `q?`, `page,size,sort`; pour la carte `size` élevé ou `unpaged=true` | `Page<StationRow>` (avec lat/lng) | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/stations/cities` | `companyId?` | `string[]` | idem |
- **Règles métier** : lecture seule ; une gare sans coordonnées n'est pas affichée sur la carte (mais reste dans la liste).
- **État côté API**
  - `GET /admin/fleet/stations` : ⚠️ partiel — `GET /stations` (`StationController.java:64`, `StationResponse` contient `name`, `city`, `latitude`, `longitude`, `stationType`, contacts, etc.), paginé, toutes compagnies si non restreint ; manquent `routeCount`, `companyName`, filtres `companyId`/`city`/`q`. Les coordonnées GPS **existent bien** côté `fleet-service` (colonne nullable ; non renseignées dans le backoffice actuel).
  - `GET /admin/fleet/stations/cities` : ❌ manquant (distinct `city`).

---

## Lignes

### Lignes — `/flotte/lignes`
- **Fonctionnalités** : table Ligne (« Ville → Ville »), Distance (km), Durée (« H h MM »), Compagnie, Statut (Active/Inactive), Bus (nombre affectés, centré), Trajets (nombre, centré) ; filtre compagnie, `q` (libellé, compagnie) ; tri compagnie puis libellé ; clic → `/flotte/lignes/{id}` ; vide : « Aucune ligne pour ces critères. ». Lien depuis la carte des gares : `?compagnie=&q=ville`.
- **Modèle de données attendu** — `RouteRow` :
| Champ | Type | Nullable | Source / commentaire |
|---|---|---|---|
| id | uuid | non | ✅ |
| label | string | non | « VilleOrigine → VilleDestination » construit depuis les villes des gares origine/destination (backend a aussi `name`) |
| companyId / companyName | uuid / string | non | |
| distanceKm | number | non | ✅ `distanceKm` |
| durationMinutes | int | non | backend `estimatedDurationMinutes` |
| status | `RouteStatus` | non | backend booléen `active` → active/inactive |
| busCount | int | non | bus avec `assignedRouteId` = ligne (calculé) |
| tripCount | int | non | trajets de la ligne (calculé) |
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/routes` | `companyId?`, `q?`, `page,size,sort` | `Page<RouteRow>` | `FLEET_MANAGE` plateforme |
- **Règles métier** : lecture seule.
- **État côté API** : ⚠️ partiel — `GET /routes` (`RouteController.java:62`, `RouteResponse(routeCode, name, originStationId, destinationStationId, distanceKm, estimatedDurationMinutes, active, …)`), paginé ; manquent libellé de villes résolu, `busCount`, `tripCount`, noms compagnie, filtres.

### Fiche ligne — `/flotte/lignes/[id]`
- **Fonctionnalités** : en-tête « Ligne X → Y » + compagnie + pastille statut ; bandeau origine → destination (noms des **gares**) ; 4 infos : Compagnie (lien `/compagnies/{id}?onglet=flotte`), Distance (km), Durée, « Bus · Trajets » (compteurs) ; tableau « Bus affectés (N) » (Plaque → fiche bus, Marque et modèle, Statut, Conducteur ou « Aucun conducteur ») ; tableau « Trajets (N) » (Départ → fiche trajet, Bus (plaque), Statut, Places libres « x / y »), plus récent d'abord ; 404 si inconnue ; vides : « Aucun bus affecté à cette ligne. » / « Aucun trajet sur cette ligne. ».
- **Modèle de données attendu** — `RouteDetail` : `route: RouteRow` + `originName`, `destinationName` (noms de gares, « — » si inconnu) + `buses: BusRow[]` (tri plaque) + `trips: TripRow[]` (tri départ desc).
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/routes/{id}` | — | `RouteDetail` (route, noms de gares) | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/buses` | `routeId=…` | bus de la ligne | idem |
| GET | `/admin/fleet/trips` | `routeId=…` | trajets de la ligne | idem |
- **Règles métier** : lecture seule.
- **État côté API** : `GET /routes/{id}` ✅ existe (`RouteController.java:46`, `RouteResponse` avec ids de gares) mais ⚠️ pour l'usage admin : pas de noms de gares/compagnie ni compteurs ; filtres `routeId` sur `GET /buses` (❌) et `GET /trips` (❌) absents.

---

## Trajets

### Trajets (liste + carte) — `/flotte/trajets` (`?affichage=carte|liste`)
- **Fonctionnalités**
  - Vue **carte** par défaut (Leaflet) : un tracé par trajet entre les villes d'origine/destination (route réelle depuis `src/lib/data/road-routes.json`, ou arc si inconnue) ; limité aux **300 premiers** trajets de la liste filtrée ; un véhicule animé : progression réelle = (now − départ)/(arrivée − départ) bornée à [0,1] pour un trajet `departed`, **simulation en boucle de 3 min** sinon ; panneau détails (ligne, compagnie, plaque, départ/arrivée, prix, places). Les trajets `planned`/`cancelled` n'ont pas de progression. Vue **liste** (DataTable) : Trajet (« Ville → Ville »), Départ, Statut, Remplissage (places libres/total + barre), Prix, Bus (plaque), Compagnie.
  - Filtres : Compagnie, Statut (`planned|boarding|departed|cancelled`), `q` (ligne, plaque, compagnie, prix) ; tri plus récent d'abord (départ desc) ; clic → `/flotte/trajets/{id}`.
  - Bandeau de stats (hors recherche, jeu filtré par compagnie) : Trajets, Planifiés, Partis, Remplissage moyen (somme(totalSeats − availableSeats)/somme(totalSeats), % ou « — »).
  - Vide : « Aucun trajet pour ces critères. ».
- **Modèle de données attendu** — `TripRow` :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | ✅ |
| companyId / companyName | uuid / string | non | | |
| routeId / routeLabel | uuid / string | non | « Ville → Ville » | `routeId` ✅, libellé calculé |
| departure | instant | non | ISO | ✅ `departureDatetime` |
| arrival | instant | non | ISO | backend `arrivalDatetimeEstimate` (+ `actualArrivalDatetime`) |
| status | `TripStatus` | non | | backend String libre |
| price | decimal | non | | ✅ `price` (nullable côté backend) |
| currency | string | non | code | ✅ `currency` (enum `CurrencyCode`) |
| totalSeats | int | non | capacité | ❌ `Trip` n'a pas `totalSeats` ; à fournir (capacité du bus ou taille du plan) |
| availableSeats | int | non | | ✅ |
| busId / busPlate | uuid / string | non | | ✅ `busId`, plaque enrichie |
  Pour la carte : `fromCity`, `toCity`, coordonnées gare origine/destination (lat/lng) et, optionnellement, géométrie de route (km, minutes, points `[lat,lng][]`) — aujourd'hui fichier statique du backoffice.
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/trips` | `companyId?`, `status?`, `busId?`, `routeId?`, `q?`, `departureFrom?`, `departureTo?`, `page,size,sort` (défaut departure,desc) | `Page<TripRow>` + `summary {total, planned, departed, fillPercent}` | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/roads` | `from=Ville&to=Ville` ou liste de clés | `{key → {km, minutes, points[]}}` | à décider (sinon fichier statique client) |
- **Règles métier** : lecture seule ; remplissage = (total − libres)/total ; statut libre côté backend → l'API admin doit normaliser aux 4 valeurs ci-dessus (ou le backend doit les imposer).
- **État côté API**
  - `GET /admin/fleet/trips` : ⚠️ partiel — `GET /trips` (`TripController.java:79`, `TripResponse(…departureDatetime, arrivalDatetimeEstimate, status, availableSeats, price, currency, busId, routeId, originStationId, destinationStationId…)`), paginé, tri Spring, toutes compagnies si non restreint ; **manquent** filtres `status`/`companyId`/`busId`/`routeId`/`q`/dates, `totalSeats`, noms résolus, `summary`.
  - `GET /admin/fleet/roads` : ❌ manquant — pas de notion de géométrie routière côté backend ; hors périmètre fleet-service (voir Questions).

### Fiche trajet — `/flotte/trajets/[id]`
- **Fonctionnalités**
  - En-tête « Trajet X → Y », compagnie, date de départ, pastille statut ; bandeau (ligne, départ → arrivée, statut, prix).
  - **Plan de sièges / explorateur de places** : carte de bus interactive ; 4 stats (Passagers = sièges avec réservation confirmée, Billets émis, Billets contrôlés = au moins un scan, À contrôler = billet non annulé sans scan) ; clic siège (ou ligne de la liste des passagers) → panneau : siège + état, passager (nom ; lien fiche client `/clients/comptes/{customerId}` sinon `/utilisateurs/{userId}` sinon aucun lien ; mention « Réservé en ligne » ou « Vente au guichet, sans compte »), billet (code → `/ventes/billets/{code}`, statut, émis le), statut paiement de la réservation, lien réservation, chronologie des contrôles (date + nom du contrôleur → `/flotte/equipage/{id}`) ; siège sans réservation : « Aucune réservation sur ce siège. » ou « Siège bloqué : il ne peut pas être vendu. » ; vide : « Aucun plan de sièges pour ce trajet. ».
  - Horaires : Ligne (lien), Distance, Départ, Arrivée, Durée (« H h MM »).
  - Remplissage : « Places libres x / y », barre (rouge ≥ 90 %), « N place(s) occupée(s) · P % ».
  - « Bus et équipage » : bus (plaque → fiche, code) ; équipage (3 rôles, voir fiche bus).
  - 404 si trajet inconnu.
- **Modèle de données attendu** — `TripDetail` :
| Champ | Type | Nullable | Source / commentaire |
|---|---|---|---|
| trip | `TripRow` | non | |
| distanceKm | number | non | `Route.distanceKm` (0 si inconnue) |
| durationMinutes | int | non | `Route.estimatedDurationMinutes` (la durée affichée est celle de la **ligne**, pas arrivée − départ) |
| busCode | string | non | « — » si bus inconnu |
| crew[3] | `{role, name?, id?}` | | équipage du **bus** (pas du trajet) ; backend a aussi `Trip.driverId` |
| seatMap | `SeatMapView` | oui | booking-service SeatMap ; `counts` free/booked/occupied/blocked |
| seats | map `code → SeatOccupant` | | uniquement sièges avec réservation `confirmed` ayant un `seatNumber` |
  `SeatOccupant` : `{bookingId, bookingCode, passengerName, channel: counter|online, paymentStatus: paid|pending|failed, customerId?, userId?, ticket?: {code, status, issuedAt, scans: [{at, controllerId?, controllerName?}]}}`. Le passager n'a **qu'un nom** (ni e-mail ni téléphone). `customerId` = fiche `Customer` (customer-service) du `userId` de la réservation. Le plan de sièges est dérivé : `rows`, `columns`, sièges nommés « 12A » (rangée numérique + colonne lettre A=1) ; `state`: free/booked/occupied/blocked où `free` des sièges d'un plan doit être cohérent avec `availableSeats` du trajet (invariant testé).
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/trips/{id}` | — | `TripDetail` sans `seats` | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/trips/{id}/seats` | — | `{seatMap, seats{}}` (explorateur) | `FLEET_MANAGE` + `BOOKING_MANAGE` plateforme |
- **Règles métier** : lecture seule ; sièges `booked` = réservé non encore contrôlé, `occupied` = billet scanné (à confirmer, cf. Questions) ; `blocked` ne compte dans aucun des trois autres compteurs ; passager sans compte (guichet) → pas de lien ; pas de données de contact exposées.
- **État côté API**
  - `GET /admin/fleet/trips/{id}` : ⚠️ — `GET /trips/{id}` ✅ (`TripController.java:49`) mais manquent `totalSeats`, `distanceKm`/durée de la ligne, nom de compagnie/bus/plaque/code, équipage du bus.
  - `GET /admin/fleet/trips/{id}/seats` : ❌ manquant — ressources éparpillées : `SeatMapResponse` booking-service (`GET /seat-maps?tripId=`, `SeatMapController.java:54` : `rows`, `seatsPerRow`, `seats[]` codes, `unavailable[]`, **pas d'état par siège**) ; réservations par trajet `GET /bookings?tripId=` (✅ `BookingController.java:66`) ; billets `GET /bookings/{id}/tickets` (N appels) ; le billet n'a **qu'un seul** `scannedAt`/`scannedBy` (`Ticket.java:43-47`), pas une liste de scans ; pas de lien billet→trajet direct. Propriétaire recommandé : `booking-service` (endpoint dédié « sièges d'un trajet » qui calcule états et occupants), enrichi (clients, nom du contrôleur) par l'API admin.

---

## Plans de sièges

### Plans de sièges — `/flotte/plans-de-sieges`
- **Fonctionnalités** : grille de cartes (3 colonnes) cliquables vers `/flotte/trajets/{tripId}` : ligne « Ville → Ville », date de départ, plaque + compagnie, barre empilée libres/réservés/occupés (+ bloqués = total − libres − réservés − occupés), 4 compteurs Sièges/Libres/Réservés/Occupés ; filtre compagnie ; `q` (plaque, ligne, compagnie) ; tri départ desc ; vide : « Rien à afficher ici. ». Un plan par trajet (le plan est rattaché à `busId` + `tripId`).
- **Modèle de données attendu** — `SeatMapRow` : `{id, tripId, busId, busPlate, companyId, companyName, routeLabel, departure (peut être vide), total, free, booked, occupied}` (bloqués dérivés). Tous les compteurs doivent être calculés par l'API (pas la liste des sièges).
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/seat-maps` | `companyId?`, `busId?`, `tripId?`, `q?`, `page,size,sort` | `Page<SeatMapRow>` (compteurs agrégés) | `BOOKING_MANAGE` plateforme |
- **Règles métier** : lecture seule ; plan unique par (bus, trip).
- **État côté API** : ⚠️ partiel — `GET /seat-maps` (booking-service, `SeatMapController.java:54`) : **non paginé**, filtre `tripId` seulement, scopé compagnie (non restreint = toutes) ; réponse sans états par siège, sans compteurs, sans plaque/ligne/départ/compagnie. Propriétaire `booking-service` (SeatMap) ; libellés via fleet-service.

---

## Maintenance

### Maintenance — `/flotte/maintenance`
- **Fonctionnalités** : table Intervention (code + type + catégorie), Bus (plaque), Compagnie, Fournisseur (nom ou « Interne »), Statut (Planifiée/En cours/Terminée/Annulée), Calendrier (prévue le / démarrée le / terminée le), Coût (total, devise de la compagnie) ; filtres Compagnie, Statut, `q` (code, plaque, compagnie, type, fournisseur) ; tri date prévue desc ; clic → `/flotte/bus/{busId}?onglet=maintenance` ; stats : En cours, Planifiées, Terminées, Coût cumulé (somme des `COMPLETED`, devise de la première ligne) ; vide : « Aucune maintenance pour ces critères. ». **Le workflow (PLANNED → IN_PROGRESS → COMPLETED, annulation) n'est pas pilotable depuis le backoffice** : affichage seul des statuts.
- **Modèle de données attendu** — `MaintenanceRow` :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | ✅ |
| code | string | non | | ✅ `maintenanceCode` (« MNT-… ») |
| busId / busPlate | uuid / string | non | | plaque enrichie |
| companyId / companyName | uuid / string | non | | |
| type | string | non | libellé libre (« Vidange… ») | ⚠️ pas d'équivalent exact (`description` ou catégorie backend) |
| category | `MaintenanceCategory` (PREVENTIVE/CORRECTIVE/INSPECTION) | non | | backend `maintenanceType` (+ EMERGENCY non géré par le backoffice) |
| vendorName | string | oui | « Interne » si nul | `vendorId` → Vendor.name |
| status | `MaintenanceStatus` | non | | ✅ |
| scheduledDate, startedAt, completedAt | instant | startedAt/completedAt oui | | ✅ `scheduledDate`, `startDate`, `endDate` |
| laborCost, partsCost, totalCost | decimal | non | totalCost = main d'œuvre + pièces | ✅ calculé côté serveur |
| currency | string | non | devise de la compagnie | ✅ `currency` |
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/maintenance` | `companyId?`, `status?`, `busId?`, `q?`, `page,size,sort` (défaut scheduledDate,desc) | `Page<MaintenanceRow>` + `summary {inProgress, planned, completed, completedCostTotal}` | `FLEET_MAINTENANCE_MANAGE` plateforme |
- **Règles métier** (backend, utiles pour l'affichage) : `start` met le bus en `maintenance` (refusé 409 si `retired` ou si une autre maintenance est en cours) ; `complete`/`cancel` ne remettent `active` que si le bus est exactement en `maintenance` ; `complete` renseigne `last_maintenance_date` et éventuellement `next_maintenance_date`. Non utilisé par l'UI actuelle.
- **État côté API** : ❌ manquant — aucune liste plateforme : seulement `GET /buses/{busId}/maintenance` (✅, `BusMaintenanceController.java:50`), `GET /maintenance/{id}`, et les transitions `PATCH /maintenance/{id}/start|complete|cancel` (✅ existent mais non requises par l'UI). `fleet-service`.

---

## Fournisseurs

### Fournisseurs — `/flotte/fournisseurs`
- **Fonctionnalités** : table Fournisseur (nom), Type (Garage/Assureur/Pièces détachées/Autre), Compagnie, Interventions (nombre d'interventions **non annulées**), Coût cumulé (somme des interventions `COMPLETED`, devise de la compagnie) ; filtre compagnie, `q` (nom, compagnie) ; tri compagnie puis nom ; vide : « Aucun fournisseur pour ces critères. ». Pas de détail.
- **Modèle de données attendu** — `VendorRow` : `{id, name, kind: VendorKind, companyId, companyName, interventions: int, totalCost: decimal, currency}` ; `interventions` et `totalCost` calculés par l'API à partir de BusMaintenance.
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/vendors` | `companyId?`, `q?`, `page,size,sort` | `Page<VendorRow>` | `FLEET_MAINTENANCE_MANAGE` plateforme |
- **Règles métier** : lecture seule. Mapping de type : backoffice `GARAGE/INSURER/PARTS/OTHER` ↔ backend `VendorType {GARAGE, INSURER, GOVERNMENT, SUPPLIER}` (PARTS ≈ SUPPLIER, OTHER ≈ GOVERNMENT ?) à trancher.
- **État côté API** : ⚠️ partiel — `GET /vendors` (`VendorController.java:62`, `VendorResponse(name, vendorType, contactPhone, contactEmail, address, status…)`, paginé, `FLEET_MAINTENANCE_MANAGE`) ; manquent `interventions`, `totalCost`, `companyName`, devise, filtres. Le backoffice n'affiche pas les contacts (présents côté backend).

---

## Équipage

### Fiche équipage — `/flotte/equipage/[id]`
- **Fonctionnalités** : en-tête nom + « rôle · compagnie » ; carte avec nom, rôle, badge « Registre d'équipage » ; 3 infos : Compagnie (→ `/compagnies/{id}?onglet=equipe`), Bus affectés (nombre), Billets contrôlés (nombre **uniquement pour un `CONTROLLER`**, « — » sinon) ; liste « Bus affectés (N) » (plaque + code, liens fiche bus) — bus où le membre est conducteur principal / assistant / contrôleur selon son rôle ; tableau « Trajets (N) » : les **15** trajets les plus récents des bus affectés (Départ, Ligne, Statut) ; pour un contrôleur, tableau « Billets contrôlés (N) » : les **30** derniers scans (Contrôlé le, Billet → `/ventes/billets/{code}`, Passager, Trajet) tri date desc ; vides : « Aucun bus affecté. » / « Aucun trajet. » / « Aucun contrôle enregistré. » ; 404 si inconnu. Aucun e-mail ni téléphone : le registre d'équipage est volontairement sans coordonnées.
- **Modèle de données attendu** — `CrewDetail` :
| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| member.id | uuid | non | | Employee.id (hr-service) |
| member.name | string | non | | ❌ pas dans Employee : vient du `User` (identity-service) via `userId`, ou profil |
| member.role | CrewRole | non | DRIVER / DRIVER_ASSISTANT / CONTROLLER | ❌ Employee n'a pas de rôle d'équipage (voir ci-dessous) |
| companyId / companyName | uuid / string | non | | `Employee.companyId` ✅ |
| buses[] | {id, plate, busCode} | | bus dont le champ d'affectation du rôle = id | fleet-service (`assignedDriverId`…) |
| trips[] | `TripRow` ×15 | | départ desc | fleet-service |
| scans[] | {ticketCode, at, tripId, routeLabel, passengerName} ×30 | | contrôleurs seulement ; at desc | booking-service Ticket |
- **Correspondance CrewMember ↔ Employee (hr-service)** : le `CrewMember` du backoffice (« stands in for the hr-service employees », `types/index.ts`) est **conceptuellement un `Employee`** (UUID référencé par `Bus.assignedDriverId` / `assignedDriverAssistantId` / `assignedControllerId` et `Trip.driverId`, dbml : « ref: > Employee.uuid »). Manques constatés dans `hr-service` (`EmployeeResponse`, `Employee.java`) : (1) **pas de rôle équipage** : seulement `jobTitle` (texte libre) + `employmentType` ; l'`Employee` du backoffice « Employee » (écran compagnie) a `role: MANAGER|GUICHETIER|CHAUFFEUR` côté identity (rôle du compte), pas `DRIVER/DRIVER_ASSISTANT/CONTROLLER` ; il faut un champ/enum `crewRole` (ou convention sur `jobTitle`) ; (2) **pas de nom** : `name` n'existe ni dans `Employee` ni dans `EmployeeResponse` (il est dans le `User` identity ; `userId` est nullable côté démo) ; (3) pas de liste filtrée par rôle ni par compagnie (`GET /employees` paginé sans filtre, `EmployeeController.java:98`) ; (4) rien n'indique les affectations inverses (« quels bus / trajets pour cet employé ») ; (5) aucune notion « registre sans compte » : un `Employee` peut ne pas avoir de `userId`. Les contrôles de billets ne sont pas liés à l'employé mais à l'`userId` du JWT du scanneur (`Ticket.scannedBy`, `TicketController.java:54`) → à rapprocher de `Employee.userId`.
- **Endpoints requis**
| Méthode | Chemin | Paramètres | Réponse | Permission |
|---|---|---|---|---|
| GET | `/admin/fleet/crew/{id}` | — | `{member{id,name,role}, companyId, companyName}` | `FLEET_MANAGE` + `EMPLOYEE_MANAGE` plateforme |
| GET | `/admin/fleet/crew/{id}/assignments` | — | `{buses[], trips[≤15]}` | `FLEET_MANAGE` plateforme |
| GET | `/admin/fleet/crew/{id}/scans` | `limit=30` | `scans[]` | `BOOKING_MANAGE` plateforme |
| GET | `/admin/fleet/crew` | `companyId?`, `role?` | liste/résolution de noms en lot (pour les noms d'équipage affichés dans listes et fiches) | optionnel |
- **Règles métier** : bus d'un membre = bus dont le champ du rôle (`driverId`/`driverAssistantId`/`controllerId`) vaut son id ; trajets = trajets de ces bus (pas de lien trajet↔équipage direct, hors `Trip.driverId`) ; scans = billets scannés par ce contrôleur ; données personnelles minimales (pas de contact).
- **État côté API**
  - `GET /admin/fleet/crew/{id}` : ⚠️ partiel — `GET /employees/{id}` (hr-service, `EmployeeController.java:91`, scopé tenant, non restreint ok) renvoie id, companyId, jobTitle, statut… sans nom ni rôle d'équipage.
  - `.../assignments` : ❌ manquant — nécessite filtre `GET /buses?assignedDriverId|assignedControllerId=` (`fleet-service`) et `GET /trips?busId=`.
  - `.../scans` : ❌ manquant — `Ticket` (booking-service) n'a que `scannedBy` (userId) + `scannedAt`, pas de requête par scanneur, et un seul scan par billet.
  - `/admin/fleet/crew` : ❌ manquant (résolution de noms en lot nécessaire pour éviter le N+1 sur les listes de bus).

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| Filtres serveur sur `GET /buses|/trips|/routes|/stations|/fleets|/vendors` (`companyId`, `status`, `q`, `busId`, `routeId`…) + tri sur champs calculés | fleet-service | haute | listes actuelles sans filtre ; tout est filtré côté client sur jeu complet |
| Noms résolus (compagnie, gare/ville, ligne, plaque, flotte, fournisseur) et compteurs (`routeCount`, `busCount`, `tripCount`, `interventions`, `totalCost`) | API admin / BFF + fleet-service | haute | « database per service » : agrégation côté API admin ; noms de compagnie via company-service |
| Liste plateforme des maintenances (`GET /admin/fleet/maintenance`) | fleet-service | haute | n'existe que par bus |
| Dates d'expiration du bus (assurance, contrôle technique, carte grise) + alertes dérivées | fleet-service | haute | colonnes absentes (dbml les prévoit) ou `BusDocument` |
| `retiredAt` + `POST /buses/{id}/retire` (gardes + motif + audit) | fleet-service (+ audit-compliance via `audit.events`) | haute | `PATCH /buses/{id}` actuel sans garde ni motif |
| `GET /admin/fleet/overview` (KPI, alertes, top compagnies, prochains départs) | fleet-service | haute | agrégats absents |
| `GET /admin/fleet/search-counts` (compteurs d'onglets avec `q`) | fleet-service | moyenne | peut se dériver d'appels paginés (`totalElements`) |
| `GET /admin/fleet/trips/{id}/seats` (plan + occupants + billets + scans) | booking-service | haute | état par siège inexistant ; billet avec 1 seul scan |
| Plans de sièges : états par siège, compteurs agrégés, pagination, filtres `busId`/`companyId` | booking-service | moyenne | `GET /seat-maps` non paginé |
| `totalSeats` d'un trajet | fleet-service | moyenne | `Trip` n'a que `availableSeats` |
| Équipage : nom + rôle `DRIVER/DRIVER_ASSISTANT/CONTROLLER` sur Employee ; résolution de noms en lot | hr-service (+ identity-service) | haute | Employee sans nom ni rôle d'équipage |
| Affectations d'un membre (bus/trajets) et historique des scans d'un contrôleur | fleet-service / booking-service | moyenne | filtres `assignedDriverId…` et `scannedBy` absents |
| Statuts `Bus.status`/`Trip.status` en String libre | fleet-service | moyenne | aucune validation de valeurs/transitions |
| Mapping des enums (`VendorKind`↔`VendorType`, catégorie/type de maintenance, `RouteStatus`↔`active` booléen) | fleet-service | basse | contrat à figer |
| Coordonnées GPS des gares : colonnes présentes, à renseigner (la carte actuelle devine par ville) | fleet-service | moyenne | à fournir via `latitude/longitude` ; villes inconnues non placées |
| Géométrie routière entre villes (`road-routes.json`) | à décider (client statique ou service cartographique) | basse | hors domaine métier |
| Permission de lecture seule plateforme (`FLEET_READ`) | identity-service + fleet-service | moyenne | aujourd'hui `FLEET_MANAGE` = écriture |
| Liste des compagnies possédant une flotte | fleet-service | basse | option du filtre compagnie |

## Questions ouvertes

1. **Vue plateforme vs scopée compagnie** : confirmer que le backoffice appelle les endpoints existants avec un jeton « non restreint » (aucun claim `company_id` + `RBAC_MANAGE`) ou si on crée un préfixe `/admin/fleet/*` dédié avec une permission de lecture seule (`FLEET_READ`) ; l'écriture admin (retire) doit-elle exiger `FLEET_MANAGE` ?
2. **Qui agrège** : API admin/BFF (jointures compagnie, gare, employé, utilisateur, client) ou endpoints enrichis dans chaque service ? Les compteurs (`routeCount`, `busCount`, `interventions`…) sont-ils calculés à la volée ?
3. **Équipage** : ajouter un `crewRole` (enum) sur `hr-service` Employee ? D'où vient le `name` (User identity) ? Un `CrewMember` sans compte est-il un `Employee` avec `userId` nul ? Faut-il une table `BusAssignment` (dbml l. 763) pour l'historique des affectations plutôt que trois colonnes sur `Bus` ?
4. **Documents du bus** : trois dates d'expiration sur `Bus` (rapide) ou `BusDocument` complet (dbml l. 780, fichiers MinIO, rappels) ? Le backoffice n'a aujourd'hui que les 3 dates.
5. **Mise hors service** : le motif doit-il être stocké (colonne) ou seulement dans la trace d'audit ? Faut-il pouvoir réactiver un bus ? Les gardes (maintenance en cours, trajets planned/boarding) vivent-elles dans `fleet-service` (oui recommandé, avec 409 + messages) ?
6. **Statut de bus/trajet** : imposer des enums et des transitions côté `fleet-service` ? Le backoffice suppose exactement `active|maintenance|retired` et `planned|boarding|departed|cancelled` (le dbml parle aussi de `inactive`).
7. **Capacité d'un trajet** : `totalSeats` = capacité du bus (`seatCapacity`) ou taille du plan de sièges ? Un trajet sans plan de sièges est-il possible (la fiche gère « Aucun plan ») ?
8. **États de siège** : comment dériver `booked` / `occupied` / `blocked` ? (`booked` = réservation confirmée non scannée, `occupied` = billet scanné `CHECKED_IN`/`USED`, `blocked` = `SeatMap.unavailable` ?) Un billet peut-il avoir plusieurs scans (l'UI affiche une chronologie) alors que le backend n'en garde qu'un ?
9. **Maintenance** : l'UI affiche un champ libre « type » (ex. Vidange) et une catégorie PREVENTIVE/CORRECTIVE/INSPECTION ; le backend a `maintenanceType` (+ EMERGENCY) et `maintenanceCategory` (ENGINE, BRAKES…) + `description`. Quel mapping ? Le backoffice doit-il piloter le workflow (start/complete/cancel) plus tard ?
10. **Devise** : `currency` de l'aperçu (coût maintenance 30 j) est ambigu en multi-compagnies (aujourd'hui : compagnie filtrée ou première) ; prévoir une agrégation par devise ou refuser le total toutes compagnies ?
11. **Pagination de la carte** : la carte des gares / trajets charge tout (trajets limités à 300) ; prévoir un mode `unpaged` ou une vue bbox/agrégée.
12. **Géométrie des routes et simulation d'avancement** : progression « réelle » = fonction du temps ; faut-il une vraie position GPS (`GPSLog` fleet-service, hors périmètre actuel) pour la carte des trajets ?
13. **Données de contact** : l'équipage et les passagers sont affichés sans e-mail/téléphone ; confirmer que l'API admin ne doit jamais les exposer ici (cohérent avec la règle de masquage des fiches clients).
14. **Audit** : les consultations de cet écran (données de passagers dans l'explorateur de places) doivent-elles produire des `DataAccessLog` côté `audit-compliance-service` ?
