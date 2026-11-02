# Backoffice Sira, lot 4 : flotte

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 5a), spec et plan des lots 1 à 3 (même socle, mêmes décisions).

## Décisions héritées des lots 1 à 3

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts (`src/lib/repos`) ; mutations = Server Actions via `run()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Action sensible : confirmation et motif obligatoire, rogné, **500 caractères au plus**, tracée dans l'activité.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage (validés avec l'utilisateur)

- **Lecture seule plus une action** : la flotte appartient aux compagnies ; la plateforme observe. Seule action : **« Mettre hors service »** un bus.
- Les affectations de personnel (conducteur principal, conducteur assistant, contrôleur) et les caractéristiques complètes d'un bus sont affichées.
- Hors périmètre : création et modification de flottes, bus, lignes, gares ou trajets ; démarrage, clôture ou annulation d'une maintenance ; alertes d'échéance automatiques ; GPS et suivi en temps réel ; branchement aux API.

## Périmètre : 8 écrans

Les 8 entrées de la section « Flotte » passent à `implemented: true`. Toutes les listes sont filtrables par compagnie (`?compagnie=<id>`) et ont une recherche côté client ; chaque lien de filtre conserve les autres filtres (helper `filterHref` du lot 3).

| Écran | Contenu |
|---|---|
| `/flotte/bus` | Liste : plaque, code, marque et modèle, compagnie, flotte, ligne, statut, capacité, **équipage** (conducteur principal), prochaine maintenance. Filtres : compagnie, statut (`active`, `maintenance`, `retired`), « sans conducteur affecté ». |
| `/flotte/bus/[id]` | Onglets : **Caractéristiques**, **Équipage**, **Maintenance**, **Trajets et sièges**. Action « Mettre hors service ». |
| `/flotte/flottes` | Liste : nom, compagnie, dépôt de base, nombre de bus. |
| `/flotte/gares` | Liste : nom, ville, compagnie, nombre de lignes qui la desservent. |
| `/flotte/lignes`, `/flotte/lignes/[id]` | Liste (origine → destination, distance, durée, compagnie, nombre de bus et de trajets) ; fiche avec les bus affectés et les trajets de la ligne. |
| `/flotte/trajets`, `/flotte/trajets/[id]` | Liste (ligne, départ, statut, prix, places libres, bus, compagnie) filtrable par statut ; fiche avec horaires, prix, places, bus, équipage du bus et **plan de sièges visuel**. |
| `/flotte/plans-de-sieges` | Liste : bus, trajet, nombre de sièges, libres, réservés, occupés ; lien vers le trajet. |
| `/flotte/maintenance` | Liste : code `MNT-…`, bus, compagnie, type, fournisseur, statut, dates, coût total (main d'œuvre + pièces). Filtres : compagnie, statut. |
| `/flotte/fournisseurs` | Liste : nom, type (garage, assureur…), compagnie, nombre d'interventions, coût cumulé. |

## Modèle de données (types alignés sur `fleet-service` et `sira_schema.dbml`)

Les types `FleetBus` et `FleetTrip` actuels (plaque et statut seulement) sont **remplacés**. Ils ne servent qu'à l'onglet « Flotte » de la fiche compagnie et à `companiesRepo.detail`, qui reçoivent des projections compatibles (plaque, statut, ligne, départ) pour ne rien changer visuellement.

- `Station` : `id`, `companyId`, `name`, `city`.
- `Route` : `id`, `companyId`, `originId`, `destinationId`, `distanceKm`, `durationMinutes`, `status`.
- `Fleet` : `id`, `companyId`, `name`, `depotId | null`.
- `Vendor` : `id`, `companyId`, `name`, `kind` (`GARAGE`, `INSURER`, `PARTS`, `OTHER`).
- `Bus` : `id`, `companyId`, `fleetId | null`, `busCode`, `plate`, `brand`, `model`, `year`, `busType` (`MINIBUS`, `COACH`, `STANDARD`, `ARTICULATED`), `fuelType` (`DIESEL`, `PETROL`, `ELECTRIC`, `HYBRID`), `engineNumber`, `color`, `seatCapacity`, `standingCapacity`, `luggageCapacity`, `wheelchairAccessible`, `airConditioned`, `gpsEnabled`, `gpsDeviceId | null`, `cameraInstalled`, `fuelSensorInstalled`, `status` (`active`, `maintenance`, `retired`), `routeId | null`, `depotId | null`, `driverId | null`, `driverAssistantId | null`, `controllerId | null`, `lastMaintenanceDate`, `nextMaintenanceDate`, `insuranceExpiry`, `technicalInspectionExpiry`, `registrationExpiry`, `purchaseDate`, `purchasePrice`, `retiredAt | null`.
- `Trip` : `id`, `companyId`, `routeId`, `busId`, `departure`, `arrival`, `price`, `currency`, `totalSeats`, `availableSeats`, `status` (`planned`, `boarding`, `departed`, `cancelled`).
- `SeatMap` : `id`, `companyId`, `busId`, `tripId`, `rows`, `columns`, `seats: { code; state: "free" | "booked" | "occupied" | "blocked" }[]`.
- `BusMaintenance` : `id`, `companyId`, `busId`, `vendorId | null`, `code`, `type`, `category`, `status` (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `scheduledDate`, `startedAt | null`, `completedAt | null`, `laborCost`, `partsCost`, `totalCost` (= main d'œuvre + pièces, calculé à la graine).
- `CrewMember` : `id`, `companyId`, `name`, `role` (`DRIVER`, `DRIVER_ASSISTANT`, `CONTROLLER`). **Divergence assumée** : côté plateforme, les trois affectations pointent des `Employee` de `hr-service`. Dans le backoffice, les `Employee` existants (1 responsable, 1 agent de vente, 1 chauffeur par compagnie) sont épinglés par les tests des lots 1 à 3 (50 employés, 51 comptes) et ne suffisent pas à équiper 2 à 4 bus ; `CrewMember` est donc un registre d'équipage **sans compte, sans e-mail ni téléphone**, qui se substitue aux `Employee` pour cette vue. Il remplace ce que je proposais d'abord (contrôleur tiré des agents de vente), impossible avec un seul agent par compagnie.

### Graine

Compagnies concernées : celles dont le statut est `active` (comme aujourd'hui). Par compagnie : 2 à 4 gares, 2 à 3 lignes, 1 flotte, 1 à 2 fournisseurs, **autant de bus que `usedBuses` du plan** (au plus `maxBuses`, jamais moins de 2), 2 trajets par bus au plus, un plan de sièges par trajet. Le premier bus de certaines compagnies est en maintenance (et possède une maintenance `IN_PROGRESS`), un bus de la graine est `retired`. Chaque bus a 0 à 3 affectations : au moins un bus par compagnie sans conducteur (alimente le filtre « sans conducteur affecté »), les autres avec conducteur, parfois assistant, parfois contrôleur. Un membre d'équipage n'est affecté qu'à un seul bus. Les maintenances couvrent les quatre statuts. Les échéances (assurance, contrôle technique, carte grise) sont réparties autour de la date de référence, dont quelques-unes dépassées et quelques-unes à moins de 30 jours.

## Règles métier

- **Mettre hors service** (`active` ou `maintenance` → `retired`) : motif obligatoire, rogné, 500 caractères au plus. Ordre des gardes : bus existant → motif → bus non déjà `retired` (« Ce bus est déjà hors service ») → aucune maintenance `IN_PROGRESS` (« Une maintenance est en cours sur ce bus ») → aucun trajet `planned` ou `boarding` à venir (« Ce bus a des trajets à venir »). Effets : `status = "retired"`, `retiredAt` renseigné, une ligne d'activité rattachée à la compagnie (« Bus <plaque> mis hors service », motif), `nextMaintenanceDate` conservée, l'équipage reste affiché.
- **Échéances** : une date est « expirée » si elle est antérieure à la date de référence, « bientôt » si elle tombe dans les 30 jours. La date de référence (`now`) est injectée dans tous les dépôts : aucune horloge cachée.
- **Plan de sièges** : les compteurs libres, réservés et occupés sont calculés depuis `seats` ; `Trip.availableSeats` doit égaler le nombre de sièges libres (test de cohérence de la graine). Un siège `blocked` n'est compté dans aucun des trois états.
- Les listes de bus et de trajets ne montrent jamais d'identifiant d'employé, seulement le nom de l'équipage.

## Architecture

- `src/lib/repos/fleet.ts` : `busesRepo`, `fleetsRepo`, `stationsRepo`, `routesRepo`, `tripsRepo`, `seatMapsRepo`, `maintenanceRepo`, `vendorsRepo`, projections (`BusRow`, `BusDetail` côté serveur, `TripRow`, `SeatMapView`, `MaintenanceRow`, `VendorRow`…) et la mutation `retire`. Le store gagne `stations`, `routes`, `fleets`, `vendors`, `seatMaps`, `maintenances`, `crew` ; `buses` et `trips` changent de type.
- Action `retireBus(busId, reason)` dans `src/app/(admin)/flotte/actions.ts`, via `run()` ; bouton `RetireBusButton` (composant client, `ConfirmDialog` avec motif) qui ne reçoit que des scalaires.
- Pages dans `src/app/(admin)/flotte/…` ; composants dans `src/components/fleet/` (`bus-tabs`, `seat-map`, `retire-bus-button`, `expiry-badge`). Pas de `rowHref` sur une table dont les lignes contiennent un bouton ouvrant un `ConfirmDialog` (aucune ici : le bouton est sur la fiche).
- **Plan de sièges visuel** : composant serveur, grille CSS (`rows` × `columns`), chaque siège est un élément avec `data-seat`, `data-state`, un libellé accessible (« Siège 3B, réservé ») et un symbole en plus de la couleur ; légende affichée sous la grille.
- Navigation : les 8 entrées passent à `implemented: true` ; `nav.test.ts` mis à jour ; libellés de fil d'Ariane pour `flotte`, `bus`, `flottes`, `gares`, `lignes`, `trajets`, `plans-de-sieges`, `maintenance`, `fournisseurs`.
- Liens : la fiche compagnie (onglet Flotte) lie chaque bus vers `/flotte/bus/[id]` et chaque trajet vers `/flotte/trajets/[id]`.
- Vue 360 : aucune modification de la mise en page (le fil d'activité montrera la nouvelle entrée après une mise hors service, comme pour les actions d'accès du lot 3).

## Tests

- **Vitest** : dépôts (filtres compagnie et statut, « sans conducteur affecté », projections avec `Object.keys`, comptes de sièges, coût total, échéances avec horloge injectée), règle « hors service » (une garde = un test : déjà hors service, maintenance en cours, trajet à venir, motif, bus inconnu), action (session d'abord, `ActionResult`, motif ≤ 500, aucune écriture sans session), cohérence de la graine (nombre de bus = `usedBuses` plafonné par `maxBuses`, toutes les références existent et sont de la même compagnie, un membre d'équipage au plus par bus, chaque affectation a le bon rôle, `availableSeats` = sièges libres, `totalCost` = main d'œuvre + pièces, aucune donnée personnelle dans `CrewMember`, aucune entrée d'activité ne contient un e-mail ou un téléphone).
- **Playwright** : filtrer les bus par compagnie ; ouvrir un bus et lire caractéristiques et équipage ; filtre « sans conducteur affecté » ; ouvrir un trajet et lire le plan de sièges (états et légende) ; mettre un bus hors service avec motif (le bouton de confirmation reste désactivé sans motif) ; refus avec maintenance en cours ; refus avec trajet à venir ; test `@prod` étendu aux écrans Flotte (aucun e-mail, téléphone ni IP).
- Entités possédées par les tests qui mutent : à fixer dans le plan (un bus par test, qu'aucun autre ne touche).

## Limites connues (à reporter dans le README)

Lecture seule hors « mettre hors service » ; pas de remise en service d'un bus `retired` ; affectations non modifiables ; équipage = registre sans compte (divergence avec `hr-service`) ; états de sièges figés (pas de réservation en direct) ; pas d'alertes automatiques d'échéance ; pas de lien vers la fiche d'un employé (elle n'existe pas dans le backoffice).
