# Backoffice Sira, lot 4 : flotte. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les huit entrées « Bientôt disponible » de la section « Flotte » par de vraies pages sur données statiques typées : bus (liste et fiche à quatre onglets avec caractéristiques, équipage, échéances, maintenance, trajets), flottes, gares, lignes (liste et fiche), trajets (liste et fiche avec plan de sièges visuel), plans de sièges, maintenance et fournisseurs, avec une seule action serveur : « Mettre hors service » un bus (motif obligatoire, refusée si le bus l'est déjà, si une maintenance est en cours ou s'il a des trajets à venir).

**Architecture:** Même socle que les lots 1 à 3. Les types `Bus`, `Trip`, `Station`, `Route`, `Fleet`, `Vendor`, `SeatMap`, `BusMaintenance` et `CrewMember` remplacent les anciens `FleetBus`/`FleetTrip` du store ; ces deux noms survivent comme **projections** pour l'onglet « Flotte » de la fiche compagnie (construites par `companyFleetSummary`). La graine (`seedFleet`) équipe les 12 compagnies actives. Un nouveau dépôt `src/lib/repos/fleet.ts` porte les projections client (`BusRow`, `TripRow`, `SeatMapRow`, `MaintenanceRow`, `VendorRow`, `FleetRow`, `StationRow`, `RouteRow`), les détails serveur (`BusDetail`, `TripDetail`, `RouteDetail`), les calculs purs (`expiryState`, `daysUntil`, `seatCounts`) et la mutation `busesRepo.retire`. La date de référence (`now`) est injectée dans toute lecture qui en dépend. Les pages sont des Server Components (`export const dynamic = "force-dynamic"`, `params`/`searchParams` en `Promise`) ; chaque liste est un `DataTable` client qui ne reçoit qu'une projection ; le plan de sièges est un composant serveur (grille CSS). L'action `retireBus` passe par `run()`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21 (`ColumnDef<T, unknown>`, `accessorKey`, prop `rowHref`/`rowId` de `DataTable`), Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm (versions installées : `@tanstack/react-table` 8.21.3, `next` 15.5.x, `react` 19.3.x, `vitest` 5.0.5, `lucide-react` 1.x).
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : `retireBus` passe par `run()` de `src/lib/actions/run.ts` (session vérifiée **avant** toute lecture ou écriture), renvoie un `ActionResult` (`{ ok: true } | { ok: false; error: string }`) et ne lève jamais d'exception pour un échec attendu.
- Action sensible (mettre un bus hors service) : confirmation + **motif obligatoire**, rogné (`trim`), **500 caractères au plus**, refusé au-delà (`"Motif trop long (500 caractères maximum)"`), jamais tronqué. Ordre des gardes du dépôt : bus existant (`"Bus introuvable"`) → motif (`"Un motif est obligatoire"`) → pas déjà hors service (`"Ce bus est déjà hors service"`) → aucune maintenance `IN_PROGRESS` (`"Une maintenance est en cours sur ce bus"`) → aucun trajet `planned` ou `boarding` (`"Ce bus a des trajets à venir"`). Effets : `status = "retired"`, `retiredAt = now`, une entrée d'activité rattachée à la compagnie : `Bus <plaque> mis hors service. Motif : <motif>` ; `nextMaintenanceDate` et l'équipage sont conservés.
- Le journal d'activité ne contient jamais d'e-mail, de téléphone ni d'objet métier complet.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `Bus`, `Trip`, `BusDetail`, `TripDetail`, `RouteDetail` ni un identifiant de membre d'équipage ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. Les imports depuis `@/lib/repos/fleet` dans un composant client sont des `import type`. L'équipage (`CrewMember`) n'a ni compte, ni e-mail, ni téléphone ; les listes de bus et de trajets ne montrent que le **nom** du conducteur. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Pas de `rowHref` sur un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (aucune ici : le bouton « Mettre hors service » est sur la fiche).
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions, qui utilisent l'horloge réelle), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre test ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, motif ≤ 500, bus inconnu, motif, déjà hors service, maintenance en cours, trajet planifié, trajet en embarquement, ordre des gardes, frontière des échéances, siège bloqué hors compteurs, filtre « sans conducteur », projections) est prouvée par un test **qui échoue quand on retire la garde** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`, qui construit le serveur de production) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas dans l'arbre (reste d'un `pnpm dev` lancé sur un autre état du dépôt), supprimer `.next` et relancer : ce n'est pas une erreur du code.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création ou modification de flottes, bus, lignes, gares ou trajets ; démarrage, clôture ou annulation d'une maintenance ; remise en service d'un bus hors service ; modification des affectations ; alertes d'échéance automatiques ; GPS ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Nombre de bus** : `Math.max(2, Math.min(maxBuses, usedBuses))` pour chaque compagnie active, avec `usedBuses` **inchangé** (`Math.min(plan.buses, 2 + (i % 4))`, épinglé par les lots précédents). Comme tous les plans autorisent au moins 5 bus, cela donne 2, 3, 4 ou 5 bus par compagnie, **42 bus** au total (la graine des lots 1 à 3 en avait 2 + (i % 3)). Le compteur « Bus » de l'onglet « Fonctionnalités et limites » d'une compagnie correspond désormais au nombre réel de bus. Les compagnies activées pendant les tests E2E (Kolda Voyages, Louga Trans, Saly Shuttle) n'ont pas de flotte : la graine est construite une fois au démarrage.
2. **« Trajet à venir »** = statut `planned` ou `boarding`, quelle que soit l'heure de départ (un trajet en embarquement est en cours, un trajet planifié n'est pas parti). Un trajet `departed` ou `cancelled` ne bloque pas.
3. **Échéances** : « expirée » si la date est strictement antérieure à `now`, « bientôt » si elle tombe entre `now` (inclus) et `now + 30 jours` (inclus), « à jour » au-delà. Le nombre de jours affiché (`daysUntil`) est **arrondi au jour le plus proche** : les dates de la graine sont à un nombre entier de jours de la date de démarrage du serveur, un arrondi vers l'extérieur afficherait « 13 j » quelques secondes après le démarrage pour une date à –12 jours. `-0` est normalisé en `0` (« Expirée aujourd'hui »).
4. **Filtres** : `?compagnie=<id>` (pastilles limitées aux 12 compagnies qui possèdent une flotte, c'est-à-dire au moins une gare ; un autre identifiant est ignoré), `?statut=` (bus, trajets, maintenance), `?conducteur=sans` (bus sans conducteur principal). Chaque groupe de pastilles conserve les autres filtres via `filterHref` (prop `keep` de `StatusFilterNav`). Recherche côté client par le `DataTable`.
5. **`FleetBus` et `FleetTrip` restent** comme types de projection de la fiche compagnie (le statut est élargi à `BusStatus`/`TripStatus`), construits champ par champ par `companyFleetSummary` (trajets triés par départ). Le badge d'un bus passe par `busStatusBadge` : « En service » et « Maintenance » sont visuellement identiques à avant, « Hors service » (neutre) est nouveau.
6. **Équipage** : le dernier bus de chaque compagnie n'a aucune affectation (12 bus sans conducteur, dont le bus hors service) ; les autres ont un conducteur, un assistant si leur rang est pair, un contrôleur si leur rang est multiple de 3 (0 à 3 affectations, les quatre nombres sont présents). Un `CrewMember` est créé par affectation : le registre ne contient que des membres affectés, chacun à un seul bus. Les noms viennent de deux listes de 11 prénoms et 11 noms (57 noms distincts).
7. **Fournisseurs** : un garage par compagnie active, plus un assureur pour une compagnie sur deux (1 à 2 fournisseurs). Les maintenances sont faites par le garage, ou en interne (`vendorId: null`, affiché « Interne ») pour les annulées. Côté liste des fournisseurs : « interventions » = maintenances **non annulées** ; « coût cumulé » = somme des maintenances **terminées** (un assureur a donc 0 intervention).
8. **Maintenances** : une `IN_PROGRESS` pour chaque bus en maintenance (3 bus : premier bus des compagnies d'indice multiple de 4), une `COMPLETED` (deuxième bus) et une `PLANNED` (premier bus) par compagnie, une `CANCELLED` (deuxième bus) pour une compagnie sur trois : 31 maintenances, les quatre statuts. Code `MNT-<1000 + rang>`. `category` est une union `PREVENTIVE | CORRECTIVE | INSPECTION` (le spec ne fixe pas les valeurs), `type` est un texte libre (« Vidange », « Freins »…). Un bus en maintenance n'a qu'un trajet passé.
9. **Trajets** : motif `(indice compagnie + rang du bus) % 4` : 0 = embarquement (départ dans 2,4 h) puis planifié (+2 j), 1 = planifié (+1 j), 2 = parti (–1 j) puis annulé (+3 j), 3 = parti (–2 j) ; 56 trajets, les quatre statuts. Le bus hors service n'a pas de trajet ni de ligne. Prix : `round((2000 + 25 × distance) / 500) × 500`.
10. **Plan de sièges** : 4 colonnes, `ceil(places / 4)` rangées, codes « 3B » (rangée puis lettre A–D). Le siège 1A est toujours `blocked` ; les autres dépendent du statut du trajet (annulé : tous libres ; parti : occupés sauf un sur cinq ; embarquement : occupé / réservé / libre en rotation ; planifié : un sur trois réservé). `availableSeats` = nombre de sièges libres.
11. **`Route.status`** est `"active" | "inactive"` (le spec cite `status` sans valeurs) ; 2 lignes inactives dans la graine.
12. **Lignes cliquables** : bus → fiche, ligne → fiche, trajet → fiche, plan de sièges → fiche du trajet, maintenance → onglet « Maintenance » de la fiche du bus. Flottes, gares et fournisseurs n'ont pas de fiche (pas de `rowHref`). Tris : bus, flottes, gares, lignes et fournisseurs par compagnie puis libellé ; trajets, plans de sièges et maintenances du plus récent au plus ancien.
13. **Bouton « Mettre hors service »** affiché pour tout bus qui n'est pas `retired` (le serveur refuse les autres cas avec un message lisible dans le dialogue) : c'est ce qui rend les deux refus jouables en E2E.
14. **Fiches introuvables** : `not-found.tsx` pour un bus, un trajet et une ligne (« Bus introuvable », « Trajet introuvable », « Ligne introuvable »).
15. Le test E2E du lot 1 `unimplemented sections show a coming-soon page` visitait `/flotte/bus`, qui devient une vraie page à la Task 4 : il visite désormais `/ventes/reservations`.
16. **Prix d'achat** affiché dans la devise de la compagnie (`BusDetail.currency`).
17. Le test E2E du plan de sièges ouvre directement `/flotte/trajets?statut=boarding` au lieu de cliquer la pastille puis chercher : la pré-validation a montré, en mode `dev`, une course où le clic sur une ligne pendant la navigation client voyait encore l'ancienne liste (deux lignes, violation du mode strict). Le clic sur une pastille de filtre reste testé par le test de la liste des bus.

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `a bus without maintenance in progress or trips to come is taken out of service with a mandatory reason` | bus `DK-1051-AB` (Casamance Trans) | statut `retired`, une entrée d'activité sur Casamance Trans |
| `a bus with a maintenance in progress cannot be taken out of service` | bus `DK-1040-AB` (Baobab Lines) | lecture seule (refus, rien ne change) |
| `a bus with trips to come cannot be taken out of service` | bus `DK-1050-AB` (Casamance Trans) | lecture seule (refus, rien ne change) |

Les autres tests de flotte sont en lecture seule. `DK-1051-AB` n'est lu ailleurs que par sa plaque (lien de la fiche de ligne « Dakar → Touba », qui ne vérifie pas son statut) ; le décompte « 3 résultat(s) » de Casamance Trans compte aussi un bus hors service. Le test « Baobab Lines » du lot 2 ne touche que l'abonnement. Aucun de ces tests ne peut empoisonner un autre en cas d'échec à mi-parcours, d'où l'absence de `try/finally`.

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) FleetBus/FleetTrip (projections), Station, Route, Fleet, Vendor, Bus, Trip, SeatMap, BusMaintenance, CrewMember + unions
src/lib/data/seed.ts                           (modifié) Store étendu, seedFleet, seatState, constantes de flotte (ROUTES retiré)
src/lib/repos/fleet.ts                         (créé)   T1 : routeLabel, companyFleetSummary ; T2 : dépôts, projections, échéances, sièges, retire
src/lib/repos/companies.ts                     (modifié) detail() utilise companyFleetSummary
src/lib/labels.ts                              (modifié) busStatusBadge (T1), libellés de flotte (T4)
src/components/company/company-tabs.tsx        (modifié) badge de bus (T1), liens vers bus et trajets (T7)
src/app/(admin)/flotte/actions.ts              (créé)   retireBus
src/components/fleet/{expiry-badge,crew-list,company-filter,retire-bus-button,bus-tabs,seat-map}.tsx  (créés)
src/app/(admin)/flotte/bus/{page,buses-table}.tsx, bus/[id]/{page,not-found}.tsx                       (créés)
src/app/(admin)/flotte/trajets/{page,trips-table}.tsx, trajets/[id]/{page,not-found}.tsx               (créés)
src/app/(admin)/flotte/plans-de-sieges/{page,seat-maps-table}.tsx                                      (créés)
src/app/(admin)/flotte/{flottes,gares,fournisseurs}/{page,*-table}.tsx                                 (créés)
src/app/(admin)/flotte/lignes/{page,routes-table}.tsx, lignes/[id]/{page,not-found}.tsx                (créés)
src/app/(admin)/flotte/maintenance/{page,maintenance-table}.tsx                                        (créés)
src/lib/nav.ts                                 (modifié) 8 entrées implémentées, libellés, préfixes de fil d'Ariane
tests/unit/{fleet-seed,fleet-repo,fleet-rules,fleet-actions}.test.ts   (créés)
tests/unit/{labels,nav}.test.ts                (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

Comptes de tests attendus (validés, voir « Pré-validation ») : **259** tests unitaires au départ. Après chaque tâche : T1 **272**, T2 **306**, T3 **310**, T4 **313**, T5 313, T6 313, T7 **315**. E2E (projet `dev` + test `@prod`) : **23** au départ (22 + 1), **30** après T4, **32** après T5, **33** après T6, **34** après T7 (33 + 1 ; le test `@prod` est remplacé par sa version étendue, pas dupliqué).

**Tests existants touchés** :
- `tests/unit/nav.test.ts` (Task 7) : le test `marks only lot 1, lot 2 and lot 3 pages as implemented` est **remplacé** par `marks only lot 1 to lot 4 pages as implemented` (15 chemins → 23) ; un `describe` est ajouté (2 tests). Le test existant `expect(isLinkablePath("/flotte")).toBe(false)` reste vrai.
- `tests/unit/labels.test.ts` (T1 +1, T4 +3) : ajouts seulement.
- `tests/unit/billing-seed.test.ts`, `companies-repo.test.ts`, `dashboard-repo.test.ts`, `access-*.test.ts` : **inchangés** — la graine garde 20 compagnies, 50 employés, 51 comptes, 15 abonnements, la même activité semée et le même `usedBuses` ; aucun test existant ne comptait les bus ni les trajets.
- `tests/e2e/backoffice.spec.ts` : le test `unimplemented sections show a coming-soon page` change de chemin (T4) ; 11 tests ajoutés avant le test `@prod` ; le test `@prod` est remplacé (T7).

---
### Task 1: Types, graine de la flotte et projections de la fiche compagnie (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`, `src/lib/repos/companies.ts`, `src/lib/labels.ts`, `src/components/company/company-tabs.tsx`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/fleet.ts` (version minimale, complétée à la Task 2), `tests/unit/fleet-seed.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `resetStore(now?)`, `buildSeed(now)` et ses helpers `uid`, `iso` (lots 1 à 3), `store.limits` (lot 1), `companiesRepo.detail` (lot 1).
- Produces:
  - Types : `BusStatus`, `BusType`, `FuelType`, `TripStatus`, `SeatState`, `RouteStatus`, `VendorKind`, `MaintenanceStatus`, `MaintenanceCategory`, `CrewRole`, `Station`, `Route`, `Fleet`, `Vendor`, `Bus`, `Trip`, `SeatMap`, `BusMaintenance`, `CrewMember` ; `FleetBus` et `FleetTrip` deviennent des projections (`status: BusStatus` / `TripStatus`).
  - `Store` : `buses: Bus[]`, `trips: Trip[]`, et nouveaux `stations`, `routes`, `fleets`, `vendors`, `seatMaps`, `maintenances`, `crew`.
  - `src/lib/repos/fleet.ts` : `routeLabel(routeId: string | null): string`, `companyFleetSummary(companyId: string): { buses: FleetBus[]; trips: FleetTrip[] }`.
  - `busStatusBadge(s: BusStatus): Badge` dans `src/lib/labels.ts`.

- [ ] **Step 1: Types**

Dans `src/lib/types/index.ts`, remplacer :

```ts
export interface FleetBus {
  id: string; companyId: string; plate: string; status: "active" | "maintenance";
}
export interface FleetTrip {
  id: string; companyId: string; route: string; departure: string;
  status: "planned" | "boarding" | "departed";
}
```

par :

```ts
/** Company-page projection of a bus (plate and status only). */
export interface FleetBus {
  id: string; companyId: string; plate: string; status: BusStatus;
}
/** Company-page projection of a trip (route label, departure and status only). */
export interface FleetTrip {
  id: string; companyId: string; route: string; departure: string; status: TripStatus;
}
```

et ajouter à la fin du fichier :

```ts
export interface Station { id: string; companyId: string; name: string; city: string }

export type RouteStatus = "active" | "inactive";

export interface Route {
  id: string; companyId: string; originId: string; destinationId: string;
  distanceKm: number; durationMinutes: number; status: RouteStatus;
}

export interface Fleet { id: string; companyId: string; name: string; depotId: string | null }

export type VendorKind = "GARAGE" | "INSURER" | "PARTS" | "OTHER";

export interface Vendor { id: string; companyId: string; name: string; kind: VendorKind }

export type BusStatus = "active" | "maintenance" | "retired";
export type BusType = "MINIBUS" | "COACH" | "STANDARD" | "ARTICULATED";
export type FuelType = "DIESEL" | "PETROL" | "ELECTRIC" | "HYBRID";

/** A bus (`fleet-service`). The three crew fields point to `CrewMember` ids, never to an account. */
export interface Bus {
  id: string;
  companyId: string;
  fleetId: string | null;
  busCode: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  busType: BusType;
  fuelType: FuelType;
  engineNumber: string;
  color: string;
  seatCapacity: number;
  standingCapacity: number;
  luggageCapacity: number;
  wheelchairAccessible: boolean;
  airConditioned: boolean;
  gpsEnabled: boolean;
  gpsDeviceId: string | null;
  cameraInstalled: boolean;
  fuelSensorInstalled: boolean;
  status: BusStatus;
  routeId: string | null;
  depotId: string | null;
  driverId: string | null;
  driverAssistantId: string | null;
  controllerId: string | null;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  insuranceExpiry: string;
  technicalInspectionExpiry: string;
  registrationExpiry: string;
  purchaseDate: string;
  purchasePrice: number;
  retiredAt: string | null;
}

export type TripStatus = "planned" | "boarding" | "departed" | "cancelled";

export interface Trip {
  id: string; companyId: string; routeId: string; busId: string;
  departure: string; arrival: string; price: number; currency: string;
  totalSeats: number; availableSeats: number; status: TripStatus;
}

export type SeatState = "free" | "booked" | "occupied" | "blocked";

export interface SeatMap {
  id: string; companyId: string; busId: string; tripId: string;
  rows: number; columns: number; seats: { code: string; state: SeatState }[];
}

export type MaintenanceStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MaintenanceCategory = "PREVENTIVE" | "CORRECTIVE" | "INSPECTION";

export interface BusMaintenance {
  id: string; companyId: string; busId: string; vendorId: string | null; code: string;
  type: string; category: MaintenanceCategory; status: MaintenanceStatus;
  scheduledDate: string; startedAt: string | null; completedAt: string | null;
  laborCost: number; partsCost: number;
  /** Labor plus parts, computed when the seed is built. */
  totalCost: number;
}

export type CrewRole = "DRIVER" | "DRIVER_ASSISTANT" | "CONTROLLER";

/**
 * Crew registry of the backoffice (stands in for the `hr-service` employees the platform assigns):
 * no account, no e-mail, no phone.
 */
export interface CrewMember { id: string; companyId: string; name: string; role: CrewRole }
```

Ne pas lancer `pnpm typecheck` avant la fin du Step 3 : la graine (seul endroit qui construit des bus et des trajets) ne correspond aux nouveaux types qu'au Step 3.

- [ ] **Step 2: Tests de la graine (échouants)**

Créer `tests/unit/fleet-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore, resetStore } from "@/lib/repos/store";
import type { CrewRole } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const companyOf = (name: string) => getStore().companies.find((c) => c.name === name)!;
const busByPlate = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;

describe("fleet seed: volumes", () => {
  it("gives each active company as many buses as its plan's usedBuses, capped by maxBuses, never fewer than 2", () => {
    const s = getStore();
    for (const c of s.companies) {
      const count = s.buses.filter((b) => b.companyId === c.id).length;
      if (c.status !== "active") { expect(count).toBe(0); continue; }
      const limits = s.limits[c.id]!;
      expect(count).toBe(Math.max(2, Math.min(limits.maxBuses, limits.usedBuses)));
    }
    expect(s.buses).toHaveLength(42);
  });

  it("has 2 to 4 stations, 2 to 3 routes, one fleet and 1 to 2 vendors per active company, nothing for the others", () => {
    const s = getStore();
    for (const c of s.companies) {
      const of = <T extends { companyId: string }>(list: T[]) => list.filter((x) => x.companyId === c.id).length;
      if (c.status !== "active") {
        expect([of(s.stations), of(s.routes), of(s.fleets), of(s.vendors)]).toEqual([0, 0, 0, 0]);
        continue;
      }
      expect(of(s.stations)).toBeGreaterThanOrEqual(2);
      expect(of(s.stations)).toBeLessThanOrEqual(4);
      expect(of(s.routes)).toBeGreaterThanOrEqual(2);
      expect(of(s.routes)).toBeLessThanOrEqual(3);
      expect(of(s.fleets)).toBe(1);
      expect(of(s.vendors)).toBeGreaterThanOrEqual(1);
      expect(of(s.vendors)).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the counts pinned by lots 1 to 3", () => {
    const s = getStore();
    expect(s.companies).toHaveLength(20);
    expect(s.employees).toHaveLength(50);
    expect(s.users).toHaveLength(51);
    expect(s.subscriptions).toHaveLength(15);
  });
});

describe("fleet seed: references", () => {
  it("only references entities that exist in the same company", () => {
    const s = getStore();
    const same = <T extends { id: string; companyId: string }>(list: T[], id: string | null, companyId: string) => {
      if (id === null) return;
      expect(list.find((x) => x.id === id)?.companyId).toBe(companyId);
    };
    for (const r of s.routes) {
      same(s.stations, r.originId, r.companyId);
      same(s.stations, r.destinationId, r.companyId);
      expect(r.originId).not.toBe(r.destinationId);
    }
    for (const f of s.fleets) same(s.stations, f.depotId, f.companyId);
    for (const b of s.buses) {
      same(s.fleets, b.fleetId, b.companyId);
      same(s.routes, b.routeId, b.companyId);
      same(s.stations, b.depotId, b.companyId);
      same(s.crew, b.driverId, b.companyId);
      same(s.crew, b.driverAssistantId, b.companyId);
      same(s.crew, b.controllerId, b.companyId);
    }
    for (const t of s.trips) {
      same(s.buses, t.busId, t.companyId);
      same(s.routes, t.routeId, t.companyId);
      expect(s.buses.find((b) => b.id === t.busId)!.routeId).toBe(t.routeId);
    }
    for (const m of s.seatMaps) {
      same(s.buses, m.busId, m.companyId);
      same(s.trips, m.tripId, m.companyId);
      expect(s.trips.find((t) => t.id === m.tripId)!.busId).toBe(m.busId);
    }
    for (const m of s.maintenances) {
      same(s.buses, m.busId, m.companyId);
      same(s.vendors, m.vendorId, m.companyId);
    }
    expect(s.maintenances.length).toBeGreaterThan(0);
  });

  it("assigns each crew member to at most one bus, in the role of the field", () => {
    const s = getStore();
    const fields: [keyof Pick<typeof s.buses[number], "driverId" | "driverAssistantId" | "controllerId">, CrewRole][] = [
      ["driverId", "DRIVER"], ["driverAssistantId", "DRIVER_ASSISTANT"], ["controllerId", "CONTROLLER"],
    ];
    const assigned: string[] = [];
    for (const b of s.buses) {
      for (const [field, role] of fields) {
        const id = b[field];
        if (id === null) continue;
        expect(s.crew.find((c) => c.id === id)!.role).toBe(role);
        assigned.push(id);
      }
    }
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.length).toBeGreaterThan(0);
  });

  it("leaves at least one bus per company without a driver and gives the others 1 to 3 assignments", () => {
    const s = getStore();
    const counts = s.buses.map((b) => [b.driverId, b.driverAssistantId, b.controllerId].filter((x) => x !== null).length);
    expect(new Set(counts)).toEqual(new Set([0, 1, 2, 3]));
    for (const companyId of new Set(s.buses.map((b) => b.companyId))) {
      expect(s.buses.some((b) => b.companyId === companyId && b.driverId === null)).toBe(true);
    }
    expect(s.buses.filter((b) => b.driverId === null)).toHaveLength(12);
  });

  it("keeps crew members free of personal data", () => {
    for (const c of getStore().crew) {
      expect(Object.keys(c).sort()).toEqual(["companyId", "id", "name", "role"]);
      expect(c.name).not.toMatch(/@|\+221|\d/);
    }
  });
});

describe("fleet seed: statuses, seats, costs and expiries", () => {
  it("has one retired bus with a retirement date and no trip, and every bus in maintenance has an in-progress maintenance", () => {
    const s = getStore();
    const retired = s.buses.filter((b) => b.status === "retired");
    expect(retired.map((b) => b.plate)).toEqual(["DK-1023-AB"]);
    expect(retired[0]!.retiredAt).not.toBeNull();
    expect(s.trips.filter((t) => t.busId === retired[0]!.id)).toHaveLength(0);
    expect(s.buses.filter((b) => b.status !== "retired").every((b) => b.retiredAt === null)).toBe(true);
    const inMaintenance = s.buses.filter((b) => b.status === "maintenance");
    expect(inMaintenance.map((b) => b.plate)).toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    for (const b of inMaintenance) {
      expect(s.maintenances.some((m) => m.busId === b.id && m.status === "IN_PROGRESS")).toBe(true);
      expect(s.trips.some((t) => t.busId === b.id && (t.status === "planned" || t.status === "boarding"))).toBe(false);
    }
  });

  it("covers the four maintenance statuses and computes totalCost as labor plus parts", () => {
    const s = getStore();
    expect(new Set(s.maintenances.map((m) => m.status))).toEqual(new Set(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
    for (const m of s.maintenances) {
      expect(m.totalCost).toBe(m.laborCost + m.partsCost);
      expect(m.code).toMatch(/^MNT-\d+$/);
      expect(m.completedAt !== null).toBe(m.status === "COMPLETED");
      expect(m.startedAt !== null).toBe(m.status === "COMPLETED" || m.status === "IN_PROGRESS");
    }
  });

  it("gives every trip one seat map whose seats match totalSeats and whose free seats equal availableSeats", () => {
    const s = getStore();
    expect(s.seatMaps).toHaveLength(s.trips.length);
    for (const t of s.trips) {
      const map = s.seatMaps.filter((m) => m.tripId === t.id);
      expect(map).toHaveLength(1);
      const seats = map[0]!.seats;
      expect(seats).toHaveLength(t.totalSeats);
      expect(new Set(seats.map((x) => x.code)).size).toBe(seats.length);
      expect(map[0]!.rows * map[0]!.columns).toBeGreaterThanOrEqual(seats.length);
      expect(t.availableSeats).toBe(seats.filter((x) => x.state === "free").length);
    }
    const states = new Set(s.seatMaps.flatMap((m) => m.seats.map((x) => x.state)));
    expect(states).toEqual(new Set(["free", "booked", "occupied", "blocked"]));
    expect(new Set(s.trips.map((t) => t.status))).toEqual(new Set(["planned", "boarding", "departed", "cancelled"]));
  });

  it("spreads the expiries around the reference date: some expired, some within 30 days, some later", () => {
    const days = getStore().buses.flatMap((b) => [b.insuranceExpiry, b.technicalInspectionExpiry, b.registrationExpiry])
      .map((d) => (new Date(d).getTime() - NOW.getTime()) / DAY);
    expect(days.some((d) => d < 0)).toBe(true);
    expect(days.some((d) => d >= 0 && d <= 30)).toBe(true);
    expect(days.some((d) => d > 30)).toBe(true);
  });
});

describe("company page fleet projections", () => {
  it("hands the company page plates, statuses, route labels and departures only, trips by departure", () => {
    const detail = companiesRepo.detail(companyOf("Casamance Trans").id)!;
    expect(detail.buses.map((b) => b.plate)).toEqual(["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]);
    for (const b of detail.buses) expect(Object.keys(b).sort()).toEqual(["companyId", "id", "plate", "status"]);
    expect(detail.trips.length).toBeGreaterThan(1);
    for (const t of detail.trips) {
      expect(Object.keys(t).sort()).toEqual(["companyId", "departure", "id", "route", "status"]);
      expect(t.route).toMatch(/^[A-Za-zÀ-ÿ' -]+ → [A-Za-zÀ-ÿ' -]+$/);
    }
    const departures = detail.trips.map((t) => t.departure);
    expect(departures).toEqual([...departures].sort());
    expect(busByPlate("DK-1051-AB").companyId).toBe(companyOf("Casamance Trans").id);
  });
});
```

À la fin de `tests/unit/labels.test.ts`, ajouter :

```ts
import { busStatusBadge } from "@/lib/labels";
describe("bus status badge", () => {
  it("labels the three bus statuses", () => {
    expect(busStatusBadge("active")).toEqual({ label: "En service", tone: "success" });
    expect(busStatusBadge("maintenance")).toEqual({ label: "Maintenance", tone: "warning" });
    expect(busStatusBadge("retired")).toEqual({ label: "Hors service", tone: "neutral" });
  });
});
```

Run: `pnpm test tests/unit/fleet-seed.test.ts tests/unit/labels.test.ts` → FAIL : 11 des 12 tests de `fleet-seed` (le store n'a ni gares, ni lignes, ni membres d'équipage ; seul `keeps the counts pinned by lots 1 to 3` passe, c'est un garde-fou de non-régression) et `labels` (`busStatusBadge` n'existe pas).

- [ ] **Step 3: Graine, projections et badge**

Dans `src/lib/data/seed.ts`, appliquer dans l'ordre les remplacements suivants (chaque texte à remplacer apparaît une seule fois).

1. Dans l'import des types, remplacer :

```ts
import type {
  ActivityEntry, Company, CompanyStatus, DsrRequest, Employee, FeatureDef, FeatureFlag,
  FleetBus, FleetTrip, Incident, Invoice, KycDocument, KycDocumentType, PartnerTier,
  PaymentAttempt, PermissionDef, Plan, PlanLimits, PlatformUser, Referral, RetryOutcome, Role,
  RolePermission, ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionHistoryEntry,
  SubscriptionStatus, UsageMetric, UserSession, UserStatus,
} from "@/lib/types";
```

par :

```ts
import type {
  ActivityEntry, Bus, BusMaintenance, BusType, Company, CompanyStatus, CrewMember, CrewRole, DsrRequest,
  Employee, FeatureDef, FeatureFlag, Fleet, FuelType, Incident, Invoice, KycDocument, KycDocumentType,
  MaintenanceCategory, MaintenanceStatus, PartnerTier, PaymentAttempt, PermissionDef, Plan, PlanLimits,
  PlatformUser, Referral, RetryOutcome, Role, RolePermission, Route, SeatMap, SeatState, ServiceHealth,
  Station, Subscription, SubscriptionChangeKind, SubscriptionHistoryEntry, SubscriptionStatus, Trip,
  TripStatus, UsageMetric, UserSession, UserStatus, Vendor, VendorKind,
} from "@/lib/types";
```

2. Dans `interface Store`, remplacer :

```ts
  buses: FleetBus[];
  trips: FleetTrip[];
```

par :

```ts
  buses: Bus[];
  trips: Trip[];
```

3. Toujours dans `interface Store`, remplacer :

```ts
  sessions: UserSession[];
}
```

par :

```ts
  sessions: UserSession[];
  stations: Station[];
  routes: Route[];
  fleets: Fleet[];
  vendors: Vendor[];
  seatMaps: SeatMap[];
  maintenances: BusMaintenance[];
  crew: CrewMember[];
}
```

4. Remplacer la constante `ROUTES` (plus utilisée) :

```ts
const ROUTES = [
  "Dakar → Saint-Louis", "Dakar → Touba", "Dakar → Ziguinchor",
  "Thiès → Kaolack", "Mbour → Dakar",
];
```

par :

```ts
/** Station cities; a company's stations step by 3 through this list, so they never repeat within it. */
const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Touba", "Kaolack", "Ziguinchor", "Mbour", "Tambacounda"];
const BUS_MODELS: {
  brand: string; model: string; busType: BusType; fuelType: FuelType;
  seats: number; standing: number; luggage: number; price: number;
}[] = [
  { brand: "Mercedes-Benz", model: "Tourismo", busType: "COACH", fuelType: "DIESEL", seats: 53, standing: 0, luggage: 9, price: 95_000_000 },
  { brand: "BYD", model: "K9", busType: "STANDARD", fuelType: "ELECTRIC", seats: 41, standing: 30, luggage: 1, price: 120_000_000 },
  { brand: "Yutong", model: "ZK6122H", busType: "COACH", fuelType: "HYBRID", seats: 55, standing: 0, luggage: 10, price: 80_000_000 },
  { brand: "King Long", model: "XMQ6127", busType: "COACH", fuelType: "DIESEL", seats: 51, standing: 0, luggage: 8, price: 70_000_000 },
  { brand: "Toyota", model: "Coaster", busType: "MINIBUS", fuelType: "PETROL", seats: 29, standing: 0, luggage: 2, price: 35_000_000 },
];
const COLORS = ["Blanc", "Bleu", "Jaune", "Vert", "Rouge", "Gris"];
const VENDORS: { name: string; kind: VendorKind }[] = [
  { name: "Garage Central", kind: "GARAGE" },
  { name: "Assurances Askia", kind: "INSURER" },
];
const CREW_FIRST = ["Abdou", "Babacar", "Modou", "Saliou", "Alioune", "Mamadou", "Serigne", "Assane", "Ndiaga", "Daouda", "Boubacar"];
const CREW_LAST = ["Diagne", "Mbaye", "Thiam", "Gaye", "Seck", "Cissé", "Ndao", "Wade", "Badji", "Sané", "Lo"];
const MAINTENANCE_TYPES: { type: string; category: MaintenanceCategory }[] = [
  { type: "Vidange", category: "PREVENTIVE" },
  { type: "Freins", category: "CORRECTIVE" },
  { type: "Contrôle technique", category: "INSPECTION" },
  { type: "Pneus", category: "CORRECTIVE" },
  { type: "Révision générale", category: "PREVENTIVE" },
];
/** Insurance, technical inspection and registration expiries (days from `now`), cycled per bus. */
const INSURANCE_DAYS = [-12, 15, 120, 200, 60];
const INSPECTION_DAYS = [90, -5, 25, 300, 180];
const REGISTRATION_DAYS = [365, 400, 10, 500, -30];
/** The single retired bus of the seed: last bus of Dakar Voyages (company index 2). */
const RETIRED_COMPANY_INDEX = 2;
const SEAT_COLUMNS = 4;
/**
 * Trips of a bus by pattern `(company index + bus index) % 4` (days from `now`): pattern 0 is boarding
 * then planned, 1 planned, 2 departed then cancelled, 3 departed. Patterns 2 and 3 leave no trip to come.
 */
const TRIP_PATTERNS: { status: TripStatus; day: number }[][] = [
  [{ status: "boarding", day: 0.1 }, { status: "planned", day: 2 }],
  [{ status: "planned", day: 1 }],
  [{ status: "departed", day: -1 }, { status: "cancelled", day: 3 }],
  [{ status: "departed", day: -2 }],
];
```

5. Dans `buildSeed`, remplacer la fin de l'objet `store` :

```ts
    users: [], roles: [], permissions: [], rolePermissions: [], sessions: [],
  };
```

par :

```ts
    users: [], roles: [], permissions: [], rolePermissions: [], sessions: [],
    stations: [], routes: [], fleets: [], vendors: [], seatMaps: [], maintenances: [], crew: [],
  };
```

6. remplacer la déclaration des compteurs (ceux des bus et des trajets passent dans `seedFleet`) :

```ts
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, busSeq = 1, tripSeq = 1, actSeq = 1;
```

par :

```ts
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, actSeq = 1;
```

7. remplacer le commentaire :

```ts
    // People, fleet
```

par :

```ts
    // People (the fleet is seeded by seedFleet, once every company exists)
```

8. supprimer le bloc de flotte de la boucle des compagnies (de `if (status === "active") {` à son accolade fermante, juste avant `// Activity`) :

```ts
    if (status === "active") {
      for (let b = 0; b < 2 + (i % 3); b++) {
        store.buses.push({
          id: uid(7, busSeq++), companyId: id, plate: `DK-${1000 + i * 10 + b}-AB`,
          status: b === 0 && i % 4 === 0 ? "maintenance" : "active",
        });
      }
      for (let t = 0; t < 2; t++) {
        store.trips.push({
          id: uid(8, tripSeq++), companyId: id, route: ROUTES[(i + t) % ROUTES.length]!,
          departure: iso(t + 1), status: t === 0 ? "boarding" : "planned",
        });
      }
    }
```

par rien (bloc supprimé).

9. juste après la boucle `NAMES.forEach`, remplacer :

```ts
  PLATFORM_ADMINS.forEach((a, k) => {
```

par :

```ts
  seedFleet(store, iso);

  PLATFORM_ADMINS.forEach((a, k) => {
```

10. Ajouter à la fin du fichier :

```ts
/**
 * Fleet of every active company: stations, routes, one fleet, vendors, as many buses as the plan's
 * `usedBuses` (capped by `maxBuses`, never fewer than 2), crew, trips, seat maps and maintenances.
 * Per company, the last bus has no crew (it feeds the "sans conducteur affecté" filter).
 */
function seedFleet(store: Store, iso: (offsetDays: number) => string): void {
  let stationSeq = 1, routeSeq = 1, fleetSeq = 1, vendorSeq = 1, busSeq = 1, crewSeq = 1;
  let tripSeq = 1, seatMapSeq = 1, maintenanceSeq = 1;

  store.companies.forEach((company, i) => {
    if (company.status !== "active") return;
    const id = company.id;

    const stations: Station[] = Array.from({ length: 2 + (i % 3) }, (_, k) => {
      const city = CITIES[(i + k * 3) % CITIES.length]!;
      return { id: uid(17, stationSeq++), companyId: id, name: `Gare routière de ${city}`, city };
    });
    store.stations.push(...stations);

    const routes: Route[] = Array.from({ length: Math.min(stations.length, 2 + (i % 2)) }, (_, r) => {
      const distanceKm = 80 + ((i * 37 + r * 53) % 400);
      return {
        id: uid(18, routeSeq++), companyId: id, originId: stations[r]!.id,
        destinationId: stations[(r + 1) % stations.length]!.id, distanceKm,
        durationMinutes: Math.round(distanceKm * 1.2) + 30,
        status: i % 5 === 4 && r === 1 ? "inactive" : "active",
      };
    });
    store.routes.push(...routes);

    const fleet: Fleet = { id: uid(19, fleetSeq++), companyId: id, name: "Flotte principale", depotId: stations[0]!.id };
    store.fleets.push(fleet);

    const vendors: Vendor[] = VENDORS.slice(0, 1 + (i % 2 === 0 ? 1 : 0)).map((v, k) => ({
      id: uid(20, vendorSeq++), companyId: id,
      name: k === 0 ? `${v.name} ${stations[0]!.city}` : v.name, kind: v.kind,
    }));
    store.vendors.push(...vendors);

    const limits = store.limits[id];
    const busCount = Math.max(2, limits ? Math.min(limits.maxBuses, limits.usedBuses) : 2);

    const crewMember = (role: CrewRole): string => {
      const n = crewSeq++;
      const member: CrewMember = {
        id: uid(23, n), companyId: id, role,
        // Shifting the last name by 3 every 11 members keeps the first 66 names distinct.
        name: `${CREW_FIRST[n % CREW_FIRST.length]} ${CREW_LAST[(n + 3 * Math.floor(n / CREW_FIRST.length)) % CREW_LAST.length]}`,
      };
      store.crew.push(member);
      return member.id;
    };

    for (let b = 0; b < busCount; b++) {
      const model = BUS_MODELS[(i + b) % BUS_MODELS.length]!;
      const last = b === busCount - 1;
      const retired = last && i === RETIRED_COMPANY_INDEX;
      const inMaintenance = b === 0 && i % 4 === 0;
      const route = retired ? null : routes[b % routes.length]!;
      const age = 1 + ((i + b) % 9);
      const gps = b % 2 === 0;
      const bus: Bus = {
        id: uid(7, busSeq++), companyId: id, fleetId: last && i % 3 === 1 ? null : fleet.id,
        busCode: `BUS-${String(i + 1).padStart(2, "0")}${String(b + 1).padStart(2, "0")}`,
        plate: `DK-${1000 + i * 10 + b}-AB`, brand: model.brand, model: model.model, year: 2026 - age,
        busType: model.busType, fuelType: model.fuelType,
        engineNumber: `ENG-${(0x3a000 + i * 211 + b * 17).toString(16).toUpperCase()}`,
        color: COLORS[(i + b) % COLORS.length]!,
        seatCapacity: model.seats, standingCapacity: model.standing, luggageCapacity: model.luggage,
        wheelchairAccessible: b % 3 === 0, airConditioned: b % 4 !== 3,
        gpsEnabled: gps, gpsDeviceId: gps ? `GPS-${String(i + 1).padStart(2, "0")}${b + 1}` : null,
        cameraInstalled: (i + b) % 2 === 0, fuelSensorInstalled: b % 3 !== 2,
        status: retired ? "retired" : inMaintenance ? "maintenance" : "active",
        routeId: route?.id ?? null, depotId: stations[0]!.id,
        driverId: last ? null : crewMember("DRIVER"),
        driverAssistantId: !last && b % 2 === 0 ? crewMember("DRIVER_ASSISTANT") : null,
        controllerId: !last && b % 3 === 0 ? crewMember("CONTROLLER") : null,
        lastMaintenanceDate: iso(-(20 + ((i * 7 + b * 11) % 60))),
        nextMaintenanceDate: iso(10 + ((i * 13 + b * 7) % 80)),
        insuranceExpiry: iso(INSURANCE_DAYS[(i + b) % INSURANCE_DAYS.length]!),
        technicalInspectionExpiry: iso(INSPECTION_DAYS[(i * 2 + b) % INSPECTION_DAYS.length]!),
        registrationExpiry: iso(REGISTRATION_DAYS[(i + b * 3) % REGISTRATION_DAYS.length]!),
        purchaseDate: iso(-365 * age), purchasePrice: model.price,
        retiredAt: retired ? iso(-15) : null,
      };
      store.buses.push(bus);

      // Trips: a retired bus has none; a bus in maintenance only has a past trip.
      if (route) {
        const plan = TRIP_PATTERNS[inMaintenance ? 3 : (i + b) % TRIP_PATTERNS.length]!;
        plan.forEach(({ status, day }, t) => {
          const tripId = uid(8, tripSeq++);
          const rows = Math.ceil(bus.seatCapacity / SEAT_COLUMNS);
          const seats = Array.from({ length: bus.seatCapacity }, (_, k) => ({
            code: `${Math.floor(k / SEAT_COLUMNS) + 1}${"ABCD"[k % SEAT_COLUMNS]}`,
            state: seatState(status, k, t),
          }));
          store.seatMaps.push({
            id: uid(21, seatMapSeq++), companyId: id, busId: bus.id, tripId, rows, columns: SEAT_COLUMNS, seats,
          });
          store.trips.push({
            id: tripId, companyId: id, routeId: route.id, busId: bus.id,
            departure: iso(day), arrival: iso(day + route.durationMinutes / 1440),
            price: Math.round((2000 + route.distanceKm * 25) / 500) * 500, currency: company.currency,
            totalSeats: bus.seatCapacity, availableSeats: seats.filter((x) => x.state === "free").length, status,
          });
        });
      }
    }

    // Maintenances (done by the company's garage, or in-house for the cancelled ones): an in-progress
    // one for each bus in maintenance, a completed and a planned one per company, and a cancelled one
    // for every third company.
    const companyBuses = store.buses.filter((x) => x.companyId === id);
    const maintenance = (busId: string, status: MaintenanceStatus, scheduled: number, k: number) => {
      const n = maintenanceSeq++;
      const kind = MAINTENANCE_TYPES[(i + k) % MAINTENANCE_TYPES.length]!;
      const laborCost = 25_000 + ((i * 13 + k * 7) % 10) * 5_000;
      const partsCost = kind.category === "INSPECTION" ? 0 : 40_000 + ((i * 7 + k * 11) % 12) * 10_000;
      store.maintenances.push({
        id: uid(22, n), companyId: id, busId, vendorId: k === 3 ? null : vendors[0]!.id,
        code: `MNT-${String(1000 + n)}`, type: kind.type, category: kind.category, status,
        scheduledDate: iso(scheduled),
        startedAt: status === "IN_PROGRESS" || status === "COMPLETED" ? iso(scheduled + 0.25) : null,
        completedAt: status === "COMPLETED" ? iso(scheduled + 1) : null,
        laborCost, partsCost, totalCost: laborCost + partsCost,
      });
    };
    for (const bus of companyBuses) if (bus.status === "maintenance") maintenance(bus.id, "IN_PROGRESS", -1, 0);
    maintenance(companyBuses[1]!.id, "COMPLETED", -30, 1);
    maintenance(companyBuses[0]!.id, "PLANNED", 12, 2);
    if (i % 3 === 2) maintenance(companyBuses[1]!.id, "CANCELLED", -8, 3);
  });
}

/** Deterministic seat state: seat 1A is always blocked; the rest depends on the trip status. */
function seatState(status: TripStatus, k: number, t: number): SeatState {
  if (k === 0) return "blocked";
  if (status === "cancelled") return "free";
  if (status === "departed") return k % 5 === 4 ? "free" : "occupied";
  if (status === "boarding") return k % 3 === 0 ? "occupied" : k % 3 === 1 ? "booked" : "free";
  return (k + t) % 3 === 0 ? "booked" : "free";
}
```

Créer `src/lib/repos/fleet.ts` (version minimale ; la Task 2 la remplace intégralement) :

```ts
import { getStore } from "@/lib/repos/store";
import type { FleetBus, FleetTrip } from "@/lib/types";

/** "Dakar → Thiès": cities of the route's origin and destination stations ("—" when unknown). */
export function routeLabel(routeId: string | null): string {
  if (!routeId) return "—";
  const s = getStore();
  const route = s.routes.find((r) => r.id === routeId);
  if (!route) return "—";
  const city = (stationId: string) => s.stations.find((x) => x.id === stationId)?.city ?? "—";
  return `${city(route.originId)} → ${city(route.destinationId)}`;
}

/** Company page projections: plate and status of each bus, route, departure and status of each trip. */
export function companyFleetSummary(companyId: string): { buses: FleetBus[]; trips: FleetTrip[] } {
  const s = getStore();
  return {
    buses: s.buses
      .filter((b) => b.companyId === companyId)
      .map((b) => ({ id: b.id, companyId: b.companyId, plate: b.plate, status: b.status })),
    trips: s.trips
      .filter((t) => t.companyId === companyId)
      .sort((a, b) => a.departure.localeCompare(b.departure))
      .map((t) => ({
        id: t.id, companyId: t.companyId, route: routeLabel(t.routeId), departure: t.departure, status: t.status,
      })),
  };
}
```

Dans `src/lib/repos/companies.ts`, remplacer :

```ts
import { kycTypesRepo } from "@/lib/repos/billing";
```

par :

```ts
import { kycTypesRepo } from "@/lib/repos/billing";
import { companyFleetSummary } from "@/lib/repos/fleet";
```

puis remplacer :

```ts
      buses: s.buses.filter((b) => b.companyId === id),
      trips: s.trips.filter((t) => t.companyId === id),
```

par :

```ts
      ...companyFleetSummary(id),
```

Dans `src/lib/labels.ts`, remplacer :

```ts
import type {
  CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, PermissionDomain, Plan,
  ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, UserStatus,
} from "@/lib/types";
```

par :

```ts
import type {
  BusStatus, CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, PermissionDomain,
  Plan, ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, UserStatus,
} from "@/lib/types";
```

et ajouter à la fin du fichier :

```ts
export const busStatusBadge = (s: BusStatus): Badge =>
  pick({
    active: { label: "En service", tone: "success" },
    maintenance: { label: "Maintenance", tone: "warning" },
    retired: { label: "Hors service", tone: "neutral" },
  }, s);
```

Dans `src/components/company/company-tabs.tsx`, remplacer :

```tsx
import { companyStatusBadge, invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
```

par :

```tsx
import { busStatusBadge, companyStatusBadge, invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
```

puis, dans l'onglet `flotte`, remplacer :

```tsx
                  <li key={b.id} className="flex justify-between">{b.plate}<StatusBadge tone={b.status === "active" ? "success" : "warning"}>{b.status === "active" ? "En service" : "Maintenance"}</StatusBadge></li>
```

par :

```tsx
                  <li key={b.id} className="flex justify-between">{b.plate}{(() => { const badge = busStatusBadge(b.status); return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>; })()}</li>
```

(Visuellement identique pour « En service » et « Maintenance » ; un bus hors service affiche « Hors service ». La Task 7 ajoute les liens.)

- [ ] **Step 4: Vérifier**

Run: `pnpm typecheck && pnpm test` → **272 tests** verts (259 + 12 `fleet-seed` + 1 `labels`).

Faits de graine sur lesquels s'appuient les tâches suivantes (date de référence quelconque) : 42 bus, 56 trajets et autant de plans de sièges, 36 gares, 28 lignes, 12 flottes, 18 fournisseurs, 31 maintenances, 57 membres d'équipage. Bus hors service : `DK-1023-AB` (Dakar Voyages). En maintenance : `DK-1000-AB`, `DK-1040-AB`, `DK-1080-AB`. Casamance Trans : `DK-1050-AB` (conducteur Saliou Sané, assistant Alioune Lo, contrôleur Mamadou Diagne, un trajet planifié, ligne « Ziguinchor → Dakar »), `DK-1051-AB` (conducteur Serigne Mbaye seul, un trajet parti et un annulé, ligne « Dakar → Touba »), `DK-1052-AB` (sans équipage, un trajet parti « Touba → Mbour », 11 sièges libres sur 55). `DK-1022-AB` (Dakar Voyages, Toyota Coaster 29 places) : trajet en embarquement « Saint-Louis → Ziguinchor », 9 libres, 10 réservés, 9 occupés, 1 bloqué ; conducteur Babacar Seck, assistant Modou Cissé, pas de contrôleur.

- [ ] **Step 5: Prouver la projection de la fiche compagnie**

Dans `companyFleetSummary`, remplacer temporairement `.map((b) => ({ id: b.id, companyId: b.companyId, plate: b.plate, status: b.status })),` par `.map((b) => ({ ...b })),`. Run `pnpm test tests/unit/fleet-seed.test.ts` → FAIL sur `hands the company page plates, statuses, route labels and departures only, trips by departure`. Restaurer → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts src/lib/repos/fleet.ts src/lib/repos/companies.ts src/lib/labels.ts src/components/company/company-tabs.tsx tests/unit/fleet-seed.test.ts tests/unit/labels.test.ts
git commit -m "feat: fleet seed with stations, routes, buses, crew, trips, seat maps and maintenances

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Dépôt de flotte, échéances, sièges et règle de mise hors service (TDD)

**Files:**
- Modify: `src/lib/repos/fleet.ts` (remplacé intégralement)
- Create: `tests/unit/fleet-repo.test.ts`, `tests/unit/fleet-rules.test.ts`

**Interfaces:**
- Consumes: la graine et les types de la Task 1, `addActivity(companyId, actor, action, now?)` (lot 3), `parseFilter` (lot 2).
- Produces (tout dans `src/lib/repos/fleet.ts`) :
  - Constantes : `EXPIRY_SOON_DAYS = 30`, `UPCOMING_TRIP_STATUSES: readonly TripStatus[]` (`planned`, `boarding`), `CREW_ROLES: readonly CrewRole[]` (`DRIVER`, `DRIVER_ASSISTANT`, `CONTROLLER`).
  - Types : `ExpiryState = "expired" | "soon" | "ok"`, `CrewAssignment { role; name: string | null }`, `SeatCounts { total; free; booked; occupied; blocked }`, `SeatView`, `SeatMapView { id; rows; columns; seats: SeatView[]; counts }`, projections client `BusRow` (12 clés), `TripRow` (14), `SeatMapRow` (12), `MaintenanceRow` (17), `VendorRow` (8), `FleetRow` (6), `StationRow` (6), `RouteRow` (9), `BusExpiry`, détails serveur `BusDetail` (avec `currency`), `TripDetail`, `RouteDetail`.
  - Fonctions : `daysUntil(date, now)`, `expiryState(date, now)`, `seatCounts(seats)`, `routeLabel(routeId)`, `fleetCompanies(): { id; name }[]`, `parseCompanyFilter(raw?: string): string | undefined`, `companyFleetSummary(companyId)` (inchangée).
  - Dépôts : `busesRepo.listRows({ companyId?, status?, withoutDriver? })`, `busesRepo.get(id)`, `busesRepo.detail(id, now?)`, `busesRepo.retire(busId, reason, actor?, now?): Bus` ; `fleetsRepo.listRows({ companyId? })` ; `stationsRepo.listRows({ companyId? })` ; `routesRepo.listRows({ companyId? })`, `routesRepo.detail(id)` ; `tripsRepo.listRows({ companyId?, status? })`, `tripsRepo.detail(id)` ; `seatMapsRepo.listRows({ companyId? })`, `seatMapsRepo.forTrip(tripId)` ; `maintenanceRepo.listRows({ companyId?, status? })` ; `vendorsRepo.listRows({ companyId? })`.
  - Messages d'erreur de `retire` (renvoyés tels quels par l'action) : `Bus introuvable`, `Un motif est obligatoire`, `Ce bus est déjà hors service`, `Une maintenance est en cours sur ce bus`, `Ce bus a des trajets à venir`.

- [ ] **Step 1: Tests du dépôt et de la règle (échouants)**

Créer `tests/unit/fleet-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  busesRepo, daysUntil, expiryState, fleetCompanies, fleetsRepo, maintenanceRepo, parseCompanyFilter, routesRepo,
  seatCounts, seatMapsRepo, stationsRepo, tripsRepo, vendorsRepo,
} from "@/lib/repos/fleet";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const companyId = (name: string) => getStore().companies.find((c) => c.name === name)!.id;
const busId = (plate: string) => getStore().buses.find((b) => b.plate === plate)!.id;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe("company filter", () => {
  it("offers the twelve companies that own a fleet", () => {
    const companies = fleetCompanies();
    expect(companies).toHaveLength(12);
    expect(companies[0]).toEqual({ id: companyId("Sahel Express"), name: "Sahel Express" });
    expect(Object.keys(companies[0]!).sort()).toEqual(["id", "name"]);
  });
  it("keeps a fleet company id and drops a company without a fleet or an unknown value", () => {
    expect(parseCompanyFilter(companyId("Casamance Trans"))).toBe(companyId("Casamance Trans"));
    expect(parseCompanyFilter(companyId("Kolda Voyages"))).toBeUndefined();
    expect(parseCompanyFilter("nope")).toBeUndefined();
    expect(parseCompanyFilter(undefined)).toBeUndefined();
  });
});

describe("busesRepo.listRows", () => {
  it("returns a projection field by field, without any crew or employee identifier", () => {
    const rows = busesRepo.listRows();
    expect(rows).toHaveLength(42);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual([
        "brandModel", "busCode", "companyId", "companyName", "driverName", "fleetName", "id", "nextMaintenanceDate",
        "plate", "routeLabel", "seatCapacity", "status",
      ]);
    }
  });
  it("filters by company, sorted by plate, and names the driver", () => {
    const rows = busesRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => r.plate)).toEqual(["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]);
    expect(rows.map((r) => r.driverName)).toEqual(["Saliou Sané", "Serigne Mbaye", null]);
    expect(rows[1]).toMatchObject({
      busCode: "BUS-0602", brandModel: "BYD K9", companyName: "Casamance Trans", fleetName: "Flotte principale",
      routeLabel: "Dakar → Touba", status: "active", seatCapacity: 41,
    });
  });
  it("filters by status", () => {
    expect(busesRepo.listRows({ status: "retired" }).map((r) => r.plate)).toEqual(["DK-1023-AB"]);
    expect(busesRepo.listRows({ status: "maintenance" }).map((r) => r.plate).sort())
      .toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    expect(busesRepo.listRows({ status: "active" })).toHaveLength(38);
  });
  it("lists the buses without a driver, one per company at least, combinable with the company filter", () => {
    const rows = busesRepo.listRows({ withoutDriver: true });
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.driverName === null)).toBe(true);
    expect(busesRepo.listRows({ withoutDriver: true, companyId: companyId("Casamance Trans") }).map((r) => r.plate))
      .toEqual(["DK-1052-AB"]);
  });
  it("shows no fleet and no route as null (retired bus, bus outside the fleet)", () => {
    const retired = busesRepo.listRows({ status: "retired" })[0]!;
    expect(retired.routeLabel).toBeNull();
    expect(busesRepo.listRows().filter((r) => r.fleetName === null).map((r) => r.plate).sort())
      .toEqual(["DK-1012-AB", "DK-1041-AB", "DK-1074-AB", "DK-1103-AB"]);
  });
});

describe("busesRepo.detail", () => {
  it("returns undefined for an unknown bus", () => {
    expect(busesRepo.detail("nope", NOW)).toBeUndefined();
  });
  it("lists the three crew assignments by name, in role order, with null when unassigned", () => {
    expect(busesRepo.detail(busId("DK-1050-AB"), NOW)!.crew).toEqual([
      { role: "DRIVER", name: "Saliou Sané" },
      { role: "DRIVER_ASSISTANT", name: "Alioune Lo" },
      { role: "CONTROLLER", name: "Mamadou Diagne" },
    ]);
    expect(busesRepo.detail(busId("DK-1052-AB"), NOW)!.crew.map((c) => c.name)).toEqual([null, null, null]);
  });
  it("computes the expiries against the injected date", () => {
    const d = busesRepo.detail(busId("DK-1051-AB"), NOW)!;
    expect(d.expiries.map((e) => [e.key, e.state, e.daysLeft])).toEqual([
      ["insurance", "soon", 15], ["inspection", "expired", -5], ["registration", "ok", 500],
    ]);
    const later = busesRepo.detail(busId("DK-1051-AB"), new Date(NOW.getTime() + 20 * DAY))!;
    expect(later.expiries.map((e) => e.state)).toEqual(["expired", "expired", "ok"]);
  });
  it("names the company, fleet, route and depot, and lists maintenances and trips newest first", () => {
    const d = busesRepo.detail(busId("DK-1051-AB"), NOW)!;
    expect(d).toMatchObject({
      companyName: "Casamance Trans", currency: "XOF", fleetName: "Flotte principale", routeLabel: "Dakar → Touba",
      depotName: "Gare routière de Ziguinchor",
    });
    expect(d.maintenances.map((m) => [m.code, m.status])).toEqual([["MNT-1016", "CANCELLED"], ["MNT-1014", "COMPLETED"]]);
    expect(d.trips.map((t) => t.status)).toEqual(["cancelled", "departed"]);
  });
});

describe("expiries", () => {
  it("is expired one millisecond before the reference date and soon from the reference date", () => {
    expect(expiryState(at(-1), NOW)).toBe("expired");
    expect(expiryState(at(0), NOW)).toBe("soon");
  });
  it("is soon up to exactly 30 days, ok one millisecond after", () => {
    expect(expiryState(at(30 * DAY), NOW)).toBe("soon");
    expect(expiryState(at(30 * DAY + 1), NOW)).toBe("ok");
  });
  it("rounds to the nearest whole day, negative once past, and never returns -0", () => {
    expect(daysUntil(at(15 * DAY), NOW)).toBe(15);
    expect(daysUntil(at(-5 * DAY), NOW)).toBe(-5);
    expect(daysUntil(at(-12 * DAY - 60_000), NOW)).toBe(-12);
    expect(Object.is(daysUntil(at(-1), NOW), 0)).toBe(true);
    expect(daysUntil(at(DAY / 2), NOW)).toBe(1);
  });
});

describe("seats", () => {
  it("counts free, booked and occupied seats; a blocked seat counts in none", () => {
    expect(seatCounts([
      { code: "1A", state: "blocked" }, { code: "1B", state: "free" }, { code: "1C", state: "booked" },
      { code: "1D", state: "occupied" }, { code: "2A", state: "free" },
    ])).toEqual({ total: 5, free: 2, booked: 1, occupied: 1, blocked: 1 });
  });
  it("places each seat of a trip's map on its row and column, and its free seats equal availableSeats", () => {
    const trip = tripsRepo.listRows({ status: "boarding" }).find((t) => t.busPlate === "DK-1022-AB")!;
    const map = seatMapsRepo.forTrip(trip.id)!;
    expect(map.rows).toBe(8);
    expect(map.columns).toBe(4);
    expect(map.seats.slice(0, 5)).toEqual([
      { code: "1A", state: "blocked", row: 1, column: 1 }, { code: "1B", state: "booked", row: 1, column: 2 },
      { code: "1C", state: "free", row: 1, column: 3 }, { code: "1D", state: "occupied", row: 1, column: 4 },
      { code: "2A", state: "booked", row: 2, column: 1 },
    ]);
    expect(map.counts).toEqual({ total: 29, free: 9, booked: 10, occupied: 9, blocked: 1 });
    expect(map.counts.free).toBe(trip.availableSeats);
    expect(seatMapsRepo.forTrip("nope")).toBeNull();
  });
  it("lists the seat maps as counts only, filterable by company", () => {
    const rows = seatMapsRepo.listRows();
    expect(rows).toHaveLength(56);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "booked", "busId", "busPlate", "companyId", "companyName", "departure", "free", "id", "occupied", "routeLabel",
      "total", "tripId",
    ]);
    const casamance = seatMapsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(casamance).toHaveLength(4);
    for (const r of casamance) {
      const trip = getStore().trips.find((t) => t.id === r.tripId)!;
      expect(r.free).toBe(trip.availableSeats);
      expect(r.free + r.booked + r.occupied).toBeLessThan(r.total);
    }
  });
});

describe("tripsRepo", () => {
  it("projects trips field by field and filters by status and company", () => {
    const rows = tripsRepo.listRows();
    expect(rows).toHaveLength(56);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "arrival", "availableSeats", "busId", "busPlate", "companyId", "companyName", "currency", "departure", "id",
      "price", "routeId", "routeLabel", "status", "totalSeats",
    ]);
    const departures = rows.map((r) => r.departure);
    expect(departures).toEqual([...departures].sort().reverse());
    expect(tripsRepo.listRows({ status: "boarding" }).map((r) => r.busPlate))
      .toEqual(["DK-1022-AB", "DK-1031-AB", "DK-1062-AB", "DK-1071-AB", "DK-1102-AB", "DK-1111-AB"]);
    const casamance = tripsRepo.listRows({ companyId: companyId("Casamance Trans"), status: "departed" });
    expect(casamance.map((r) => r.busPlate).sort()).toEqual(["DK-1051-AB", "DK-1052-AB"]);
  });
  it("details a trip with its route, bus crew and seat map", () => {
    const row = tripsRepo.listRows({ status: "boarding" }).find((t) => t.busPlate === "DK-1022-AB")!;
    const d = tripsRepo.detail(row.id)!;
    expect(d.trip).toMatchObject({ routeLabel: "Saint-Louis → Ziguinchor", price: 6000, currency: "XOF", totalSeats: 29 });
    expect(d.busCode).toBe("BUS-0303");
    expect(d.crew.map((c) => c.name)).toEqual(["Babacar Seck", "Modou Cissé", null]);
    expect(d.seatMap!.counts.free).toBe(d.trip.availableSeats);
    expect(tripsRepo.detail("nope")).toBeUndefined();
  });
});

describe("maintenanceRepo and vendorsRepo", () => {
  it("projects maintenances with labor plus parts, the vendor name, and filters by status and company", () => {
    const rows = maintenanceRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.code, r.busPlate, r.status, r.vendorName, r.totalCost])).toEqual([
      ["MNT-1015", "DK-1050-AB", "PLANNED", "Garage Central Ziguinchor", 70000],
      ["MNT-1016", "DK-1051-AB", "CANCELLED", null, 175000],
      ["MNT-1014", "DK-1051-AB", "COMPLETED", "Garage Central Ziguinchor", 175000],
    ]);
    for (const r of maintenanceRepo.listRows()) expect(r.totalCost).toBe(r.laborCost + r.partsCost);
    expect(maintenanceRepo.listRows({ status: "IN_PROGRESS" }).map((r) => r.busPlate).sort())
      .toEqual(["DK-1000-AB", "DK-1040-AB", "DK-1080-AB"]);
    expect(Object.keys(rows[0]!)).toHaveLength(17);
  });
  it("counts a vendor's non-cancelled interventions and sums the cost of the completed ones", () => {
    const rows = vendorsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows).toEqual([{
      id: rows[0]!.id, name: "Garage Central Ziguinchor", kind: "GARAGE", companyId: companyId("Casamance Trans"),
      companyName: "Casamance Trans", interventions: 2, totalCost: 175000, currency: "XOF",
    }]);
    const insurer = vendorsRepo.listRows({ companyId: companyId("Sahel Express") }).find((v) => v.kind === "INSURER")!;
    expect([insurer.interventions, insurer.totalCost]).toEqual([0, 0]);
    expect(vendorsRepo.listRows()).toHaveLength(18);
  });
});

describe("fleets, stations and routes", () => {
  it("counts the buses of each fleet and names its depot", () => {
    expect(fleetsRepo.listRows({ companyId: companyId("Casamance Trans") })).toEqual([{
      id: getStore().fleets.find((f) => f.companyId === companyId("Casamance Trans"))!.id, name: "Flotte principale",
      companyId: companyId("Casamance Trans"), companyName: "Casamance Trans", depotName: "Gare routière de Ziguinchor",
      busCount: 3,
    }]);
    expect(fleetsRepo.listRows({ companyId: companyId("Baobab Lines") })[0]!.busCount).toBe(1);
  });
  it("counts the routes that serve each station", () => {
    const rows = stationsRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.city, r.routeCount])).toEqual([["Dakar", 2], ["Mbour", 1], ["Touba", 2], ["Ziguinchor", 1]]);
    expect(stationsRepo.listRows()).toHaveLength(36);
  });
  it("labels routes by cities and counts their buses and trips", () => {
    const rows = routesRepo.listRows({ companyId: companyId("Casamance Trans") });
    expect(rows.map((r) => [r.label, r.busCount, r.tripCount])).toEqual([
      ["Dakar → Touba", 1, 2], ["Touba → Mbour", 1, 1], ["Ziguinchor → Dakar", 1, 1],
    ]);
    expect(routesRepo.listRows().filter((r) => r.status === "inactive")).toHaveLength(2);
  });
  it("details a route with its stations, buses and trips", () => {
    const route = routesRepo.listRows({ companyId: companyId("Casamance Trans") })[0]!;
    const d = routesRepo.detail(route.id)!;
    expect([d.originName, d.destinationName]).toEqual(["Gare routière de Dakar", "Gare routière de Touba"]);
    expect(d.buses.map((b) => b.plate)).toEqual(["DK-1051-AB"]);
    expect(d.trips).toHaveLength(2);
    expect(routesRepo.detail("nope")).toBeUndefined();
  });
});
```

Créer `tests/unit/fleet-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { busesRepo } from "@/lib/repos/fleet";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const bus = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;
const retire = (plate: string, reason = "Moteur hors d'usage") =>
  busesRepo.retire(bus(plate).id, reason, "tester@sira.app", NOW);

describe("retiring a bus", () => {
  it("retires an active bus with no maintenance in progress and no trip to come, and journals it", () => {
    // DK-1051-AB: a departed and a cancelled trip, a completed and a cancelled maintenance.
    const target = bus("DK-1051-AB");
    const before = { next: target.nextMaintenanceDate, driver: target.driverId, controller: target.controllerId };
    const n = getStore().activity.length;
    const result = retire("DK-1051-AB", "  Moteur hors d'usage  ");
    expect(result).toBe(target);
    expect(target.status).toBe("retired");
    expect(target.retiredAt).toBe(NOW.toISOString());
    expect(target.nextMaintenanceDate).toBe(before.next);
    expect([target.driverId, target.controllerId]).toEqual([before.driver, before.controller]);
    expect(target.driverId).not.toBeNull();
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Bus DK-1051-AB mis hors service. Motif : Moteur hors d'usage",
    });
  });

  it("retires a bus in maintenance once its maintenance is no longer in progress", () => {
    const target = bus("DK-1040-AB");
    for (const m of getStore().maintenances) if (m.busId === target.id && m.status === "IN_PROGRESS") m.status = "COMPLETED";
    retire("DK-1040-AB");
    expect(target.status).toBe("retired");
  });

  it("refuses an unknown bus", () => {
    const n = getStore().activity.length;
    expect(() => busesRepo.retire("nope", "motif", "tester@sira.app", NOW)).toThrow("Bus introuvable");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a blank reason and changes nothing", () => {
    expect(() => retire("DK-1051-AB", "   ")).toThrow("Un motif est obligatoire");
    expect(bus("DK-1051-AB").status).toBe("active");
    expect(bus("DK-1051-AB").retiredAt).toBeNull();
  });

  it("refuses a bus that is already retired", () => {
    const target = bus("DK-1023-AB");
    const retiredAt = target.retiredAt;
    const n = getStore().activity.length;
    expect(() => retire("DK-1023-AB")).toThrow("Ce bus est déjà hors service");
    expect(target.retiredAt).toBe(retiredAt);
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a bus with a maintenance in progress", () => {
    expect(() => retire("DK-1040-AB")).toThrow("Une maintenance est en cours sur ce bus");
    expect(bus("DK-1040-AB").status).toBe("maintenance");
  });

  it("refuses a bus with a planned trip, and a bus whose only trip to come is boarding", () => {
    expect(() => retire("DK-1050-AB")).toThrow("Ce bus a des trajets à venir");
    expect(bus("DK-1050-AB").status).toBe("active");
    const boarding = bus("DK-1022-AB");
    for (const t of getStore().trips) if (t.busId === boarding.id && t.status === "planned") t.status = "departed";
    expect(getStore().trips.filter((t) => t.busId === boarding.id).map((t) => t.status).sort()).toEqual(["boarding", "departed"]);
    expect(() => retire("DK-1022-AB")).toThrow("Ce bus a des trajets à venir");
    expect(boarding.status).toBe("active");
  });

  it("checks the guards in order: reason, then already retired, then maintenance, then trips", () => {
    const retired = bus("DK-1023-AB");
    expect(() => retire("DK-1023-AB", " ")).toThrow("Un motif est obligatoire");
    getStore().maintenances.push({ ...getStore().maintenances[0]!, id: "m-extra", busId: retired.id, status: "IN_PROGRESS" });
    expect(() => retire("DK-1023-AB")).toThrow("Ce bus est déjà hors service");

    const inMaintenance = bus("DK-1040-AB");
    getStore().trips.push({ ...getStore().trips[0]!, id: "t-extra", busId: inMaintenance.id, status: "planned" });
    expect(() => retire("DK-1040-AB")).toThrow("Une maintenance est en cours sur ce bus");
  });

  it("never writes an e-mail or a phone number into the activity log", () => {
    retire("DK-1051-AB", "Contrôle signalé");
    for (const a of getStore().activity) expect(a.action).not.toMatch(/@|\+221\d/);
  });
});
```

Run: `pnpm test tests/unit/fleet-repo.test.ts tests/unit/fleet-rules.test.ts` → FAIL (les exports `busesRepo`, `expiryState`, `seatCounts`… n'existent pas encore).

- [ ] **Step 2: Implémenter**

Remplacer intégralement le contenu de `src/lib/repos/fleet.ts` par :

```ts
import { parseFilter } from "@/lib/filters";
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  Bus, BusMaintenance, BusStatus, CrewRole, FleetBus, FleetTrip, MaintenanceCategory, MaintenanceStatus,
  RouteStatus, SeatMap, SeatState, Trip, TripStatus, VendorKind,
} from "@/lib/types";

const DAY = 86_400_000;

/** A document expires "soon" when its date falls within this many days of the reference date. */
export const EXPIRY_SOON_DAYS = 30;

export type ExpiryState = "expired" | "soon" | "ok";

/** Trip statuses that still need the bus: a bus with such a trip cannot be retired. */
export const UPCOMING_TRIP_STATUSES: readonly TripStatus[] = ["planned", "boarding"];

/** Display order of the three crew assignments of a bus. */
export const CREW_ROLES: readonly CrewRole[] = ["DRIVER", "DRIVER_ASSISTANT", "CONTROLLER"];

const CREW_FIELD: Record<CrewRole, "driverId" | "driverAssistantId" | "controllerId"> = {
  DRIVER: "driverId", DRIVER_ASSISTANT: "driverAssistantId", CONTROLLER: "controllerId",
};

/** One crew assignment of a bus: the member's name only, never an identifier. */
export interface CrewAssignment { role: CrewRole; name: string | null }

export interface SeatCounts { total: number; free: number; booked: number; occupied: number; blocked: number }

/** Client-safe projection of a bus: names, never an employee or crew identifier. */
export interface BusRow {
  id: string;
  busCode: string;
  plate: string;
  brandModel: string;
  companyId: string;
  companyName: string;
  fleetName: string | null;
  routeLabel: string | null;
  status: BusStatus;
  seatCapacity: number;
  driverName: string | null;
  nextMaintenanceDate: string;
}

export interface BusExpiry {
  key: "insurance" | "inspection" | "registration";
  label: string;
  date: string;
  state: ExpiryState;
  daysLeft: number;
}

/** Client-safe projection of a trip. */
export interface TripRow {
  id: string;
  companyId: string;
  companyName: string;
  routeId: string;
  routeLabel: string;
  departure: string;
  arrival: string;
  status: TripStatus;
  price: number;
  currency: string;
  totalSeats: number;
  availableSeats: number;
  busId: string;
  busPlate: string;
}

export interface SeatView { code: string; row: number; column: number; state: SeatState }

export interface SeatMapView { id: string; rows: number; columns: number; seats: SeatView[]; counts: SeatCounts }

/** Client-safe projection of a seat map (counts only, no seat list). */
export interface SeatMapRow {
  id: string;
  tripId: string;
  busId: string;
  busPlate: string;
  companyId: string;
  companyName: string;
  routeLabel: string;
  departure: string;
  total: number;
  free: number;
  booked: number;
  occupied: number;
}

/** Client-safe projection of a maintenance. */
export interface MaintenanceRow {
  id: string;
  code: string;
  busId: string;
  busPlate: string;
  companyId: string;
  companyName: string;
  type: string;
  category: MaintenanceCategory;
  vendorName: string | null;
  status: MaintenanceStatus;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  currency: string;
}

/** Client-safe projection of a vendor: interventions exclude cancelled ones, the cost sums completed ones. */
export interface VendorRow {
  id: string;
  name: string;
  kind: VendorKind;
  companyId: string;
  companyName: string;
  interventions: number;
  totalCost: number;
  currency: string;
}

export interface FleetRow {
  id: string; name: string; companyId: string; companyName: string; depotName: string | null; busCount: number;
}

export interface StationRow {
  id: string; name: string; city: string; companyId: string; companyName: string; routeCount: number;
}

export interface RouteRow {
  id: string;
  label: string;
  companyId: string;
  companyName: string;
  distanceKm: number;
  durationMinutes: number;
  status: RouteStatus;
  busCount: number;
  tripCount: number;
}

/** Server-only detail of a bus (Server Components only; it carries the raw `Bus`). */
export interface BusDetail {
  bus: Bus;
  companyName: string;
  /** Currency of the owning company (purchase price). */
  currency: string;
  fleetName: string | null;
  routeLabel: string | null;
  depotName: string | null;
  crew: CrewAssignment[];
  expiries: BusExpiry[];
  maintenances: MaintenanceRow[];
  trips: TripRow[];
}

export interface TripDetail {
  trip: TripRow;
  distanceKm: number;
  durationMinutes: number;
  busCode: string;
  crew: CrewAssignment[];
  seatMap: SeatMapView | null;
}

export interface RouteDetail {
  route: RouteRow;
  originName: string;
  destinationName: string;
  buses: BusRow[];
  trips: TripRow[];
}

/** Days from `now` to `date`, rounded to the nearest whole day (negative once the date is more than half a day past). */
export function daysUntil(date: string, now: Date): number {
  return Math.round((new Date(date).getTime() - now.getTime()) / DAY) || 0;
}

/** Expired before `now`, "soon" within the next 30 days (inclusive), "ok" after. */
export function expiryState(date: string, now: Date): ExpiryState {
  const diff = new Date(date).getTime() - now.getTime();
  if (diff < 0) return "expired";
  return diff <= EXPIRY_SOON_DAYS * DAY ? "soon" : "ok";
}

/** Free, booked and occupied seats; a blocked seat counts in none of the three. */
export function seatCounts(seats: SeatMap["seats"]): SeatCounts {
  const count = (state: SeatState) => seats.filter((x) => x.state === state).length;
  return {
    total: seats.length, free: count("free"), booked: count("booked"), occupied: count("occupied"), blocked: count("blocked"),
  };
}

/** "Dakar → Thiès": cities of the route's origin and destination stations ("—" when unknown). */
export function routeLabel(routeId: string | null): string {
  if (!routeId) return "—";
  const s = getStore();
  const route = s.routes.find((r) => r.id === routeId);
  if (!route) return "—";
  const city = (stationId: string) => s.stations.find((x) => x.id === stationId)?.city ?? "—";
  return `${city(route.originId)} → ${city(route.destinationId)}`;
}

/** Companies that own a fleet (at least one station), in seed order: options of the company filters. */
export function fleetCompanies(): { id: string; name: string }[] {
  const s = getStore();
  const owners = new Set(s.stations.map((x) => x.companyId));
  return s.companies.filter((c) => owners.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
}

/** Keeps `?compagnie=` only when it names a company that owns a fleet. */
export function parseCompanyFilter(raw: string | undefined): string | undefined {
  return parseFilter(raw, fleetCompanies().map((c) => c.id));
}

/** Company page projections: plate and status of each bus, route, departure and status of each trip. */
export function companyFleetSummary(companyId: string): { buses: FleetBus[]; trips: FleetTrip[] } {
  const s = getStore();
  return {
    buses: s.buses
      .filter((b) => b.companyId === companyId)
      .map((b) => ({ id: b.id, companyId: b.companyId, plate: b.plate, status: b.status })),
    trips: s.trips
      .filter((t) => t.companyId === companyId)
      .sort((a, b) => a.departure.localeCompare(b.departure))
      .map((t) => ({
        id: t.id, companyId: t.companyId, route: routeLabel(t.routeId), departure: t.departure, status: t.status,
      })),
  };
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function companyCurrency(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.currency ?? "XOF";
}

function stationName(stationId: string | null): string | null {
  if (!stationId) return null;
  return getStore().stations.find((x) => x.id === stationId)?.name ?? null;
}

function crewName(crewId: string | null): string | null {
  if (!crewId) return null;
  return getStore().crew.find((c) => c.id === crewId)?.name ?? null;
}

function crewOf(bus: Bus): CrewAssignment[] {
  return CREW_ROLES.map((role) => ({ role, name: crewName(bus[CREW_FIELD[role]]) }));
}

function busRow(bus: Bus): BusRow {
  return {
    id: bus.id, busCode: bus.busCode, plate: bus.plate, brandModel: `${bus.brand} ${bus.model}`,
    companyId: bus.companyId, companyName: companyName(bus.companyId),
    fleetName: getStore().fleets.find((f) => f.id === bus.fleetId)?.name ?? null,
    routeLabel: bus.routeId ? routeLabel(bus.routeId) : null, status: bus.status, seatCapacity: bus.seatCapacity,
    driverName: crewName(bus.driverId), nextMaintenanceDate: bus.nextMaintenanceDate,
  };
}

function tripRow(trip: Trip): TripRow {
  return {
    id: trip.id, companyId: trip.companyId, companyName: companyName(trip.companyId), routeId: trip.routeId,
    routeLabel: routeLabel(trip.routeId), departure: trip.departure, arrival: trip.arrival, status: trip.status,
    price: trip.price, currency: trip.currency, totalSeats: trip.totalSeats, availableSeats: trip.availableSeats,
    busId: trip.busId, busPlate: getStore().buses.find((b) => b.id === trip.busId)?.plate ?? "—",
  };
}

function maintenanceRow(m: BusMaintenance): MaintenanceRow {
  const s = getStore();
  return {
    id: m.id, code: m.code, busId: m.busId, busPlate: s.buses.find((b) => b.id === m.busId)?.plate ?? "—",
    companyId: m.companyId, companyName: companyName(m.companyId), type: m.type, category: m.category,
    vendorName: s.vendors.find((v) => v.id === m.vendorId)?.name ?? null, status: m.status,
    scheduledDate: m.scheduledDate, startedAt: m.startedAt, completedAt: m.completedAt,
    laborCost: m.laborCost, partsCost: m.partsCost, totalCost: m.totalCost, currency: companyCurrency(m.companyId),
  };
}

function seatMapView(map: SeatMap): SeatMapView {
  return {
    id: map.id, rows: map.rows, columns: map.columns,
    seats: map.seats.map((seat) => {
      const m = /^(\d+)([A-Z])$/.exec(seat.code);
      return {
        code: seat.code, state: seat.state,
        row: m ? Number(m[1]) : 0, column: m ? m[2]!.charCodeAt(0) - 64 : 0,
      };
    }),
    counts: seatCounts(map.seats),
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

function byCompanyThen<T extends { companyName: string }>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => a.companyName.localeCompare(b.companyName, "fr") || key(a).localeCompare(key(b), "fr");
}

export const busesRepo = {
  listRows(filter: { companyId?: string; status?: BusStatus; withoutDriver?: boolean } = {}): BusRow[] {
    return getStore().buses
      .filter((b) =>
        (!filter.companyId || b.companyId === filter.companyId) &&
        (!filter.status || b.status === filter.status) &&
        (!filter.withoutDriver || b.driverId === null))
      .map(busRow)
      .sort(byCompanyThen((r) => r.plate));
  },

  get(id: string): Bus | undefined {
    return getStore().buses.find((b) => b.id === id);
  },

  detail(id: string, now: Date = new Date()): BusDetail | undefined {
    const s = getStore();
    const bus = s.buses.find((b) => b.id === id);
    if (!bus) return undefined;
    const expiry = (key: BusExpiry["key"], label: string, date: string): BusExpiry =>
      ({ key, label, date, state: expiryState(date, now), daysLeft: daysUntil(date, now) });
    return {
      bus,
      companyName: companyName(bus.companyId),
      currency: companyCurrency(bus.companyId),
      fleetName: s.fleets.find((f) => f.id === bus.fleetId)?.name ?? null,
      routeLabel: bus.routeId ? routeLabel(bus.routeId) : null,
      depotName: stationName(bus.depotId),
      crew: crewOf(bus),
      expiries: [
        expiry("insurance", "Assurance", bus.insuranceExpiry),
        expiry("inspection", "Contrôle technique", bus.technicalInspectionExpiry),
        expiry("registration", "Carte grise", bus.registrationExpiry),
      ],
      maintenances: s.maintenances.filter((m) => m.busId === id).sort(byNewest((m) => m.scheduledDate)).map(maintenanceRow),
      trips: s.trips.filter((t) => t.busId === id).sort(byNewest((t) => t.departure)).map(tripRow),
    };
  },

  /**
   * Takes a bus out of service (`active` or `maintenance` → `retired`). Guards, in this order: bus exists,
   * reason, not already retired, no maintenance in progress, no planned or boarding trip.
   */
  retire(busId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Bus {
    const s = getStore();
    const bus = s.buses.find((b) => b.id === busId);
    if (!bus) throw new Error("Bus introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (bus.status === "retired") throw new Error("Ce bus est déjà hors service");
    if (s.maintenances.some((m) => m.busId === bus.id && m.status === "IN_PROGRESS")) {
      throw new Error("Une maintenance est en cours sur ce bus");
    }
    if (s.trips.some((t) => t.busId === bus.id && UPCOMING_TRIP_STATUSES.includes(t.status))) {
      throw new Error("Ce bus a des trajets à venir");
    }
    bus.status = "retired";
    bus.retiredAt = now.toISOString();
    addActivity(bus.companyId, actor, `Bus ${bus.plate} mis hors service. Motif : ${motif}`, now);
    return bus;
  },
};

export const fleetsRepo = {
  listRows(filter: { companyId?: string } = {}): FleetRow[] {
    const s = getStore();
    return s.fleets
      .filter((f) => !filter.companyId || f.companyId === filter.companyId)
      .map((f) => ({
        id: f.id, name: f.name, companyId: f.companyId, companyName: companyName(f.companyId),
        depotName: stationName(f.depotId), busCount: s.buses.filter((b) => b.fleetId === f.id).length,
      }))
      .sort(byCompanyThen((r) => r.name));
  },
};

export const stationsRepo = {
  listRows(filter: { companyId?: string } = {}): StationRow[] {
    const s = getStore();
    return s.stations
      .filter((x) => !filter.companyId || x.companyId === filter.companyId)
      .map((x) => ({
        id: x.id, name: x.name, city: x.city, companyId: x.companyId, companyName: companyName(x.companyId),
        routeCount: s.routes.filter((r) => r.originId === x.id || r.destinationId === x.id).length,
      }))
      .sort(byCompanyThen((r) => r.name));
  },
};

function routeRow(routeId: string): RouteRow | undefined {
  const s = getStore();
  const r = s.routes.find((x) => x.id === routeId);
  if (!r) return undefined;
  return {
    id: r.id, label: routeLabel(r.id), companyId: r.companyId, companyName: companyName(r.companyId),
    distanceKm: r.distanceKm, durationMinutes: r.durationMinutes, status: r.status,
    busCount: s.buses.filter((b) => b.routeId === r.id).length,
    tripCount: s.trips.filter((t) => t.routeId === r.id).length,
  };
}

export const routesRepo = {
  listRows(filter: { companyId?: string } = {}): RouteRow[] {
    return getStore().routes
      .filter((r) => !filter.companyId || r.companyId === filter.companyId)
      .map((r) => routeRow(r.id)!)
      .sort(byCompanyThen((r) => r.label));
  },

  detail(id: string): RouteDetail | undefined {
    const s = getStore();
    const route = s.routes.find((r) => r.id === id);
    if (!route) return undefined;
    return {
      route: routeRow(id)!,
      originName: stationName(route.originId) ?? "—",
      destinationName: stationName(route.destinationId) ?? "—",
      buses: s.buses.filter((b) => b.routeId === id).map(busRow).sort((a, b) => a.plate.localeCompare(b.plate)),
      trips: s.trips.filter((t) => t.routeId === id).sort(byNewest((t) => t.departure)).map(tripRow),
    };
  },
};

export const tripsRepo = {
  listRows(filter: { companyId?: string; status?: TripStatus } = {}): TripRow[] {
    return getStore().trips
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(byNewest((t) => t.departure))
      .map(tripRow);
  },

  detail(id: string): TripDetail | undefined {
    const s = getStore();
    const trip = s.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    const route = s.routes.find((r) => r.id === trip.routeId);
    const bus = s.buses.find((b) => b.id === trip.busId);
    const map = s.seatMaps.find((m) => m.tripId === id);
    return {
      trip: tripRow(trip),
      distanceKm: route?.distanceKm ?? 0,
      durationMinutes: route?.durationMinutes ?? 0,
      busCode: bus?.busCode ?? "—",
      crew: bus ? crewOf(bus) : CREW_ROLES.map((role) => ({ role, name: null })),
      seatMap: map ? seatMapView(map) : null,
    };
  },
};

export const seatMapsRepo = {
  listRows(filter: { companyId?: string } = {}): SeatMapRow[] {
    const s = getStore();
    return s.seatMaps
      .filter((m) => !filter.companyId || m.companyId === filter.companyId)
      .map((m) => {
        const trip = s.trips.find((t) => t.id === m.tripId);
        const counts = seatCounts(m.seats);
        return {
          id: m.id, tripId: m.tripId, busId: m.busId, busPlate: s.buses.find((b) => b.id === m.busId)?.plate ?? "—",
          companyId: m.companyId, companyName: companyName(m.companyId),
          routeLabel: trip ? routeLabel(trip.routeId) : "—", departure: trip?.departure ?? "",
          total: counts.total, free: counts.free, booked: counts.booked, occupied: counts.occupied,
        };
      })
      .sort(byNewest((r) => r.departure));
  },

  forTrip(tripId: string): SeatMapView | null {
    const map = getStore().seatMaps.find((m) => m.tripId === tripId);
    return map ? seatMapView(map) : null;
  },
};

export const maintenanceRepo = {
  listRows(filter: { companyId?: string; status?: MaintenanceStatus } = {}): MaintenanceRow[] {
    return getStore().maintenances
      .filter((m) => (!filter.companyId || m.companyId === filter.companyId) && (!filter.status || m.status === filter.status))
      .sort(byNewest((m) => m.scheduledDate))
      .map(maintenanceRow);
  },
};

export const vendorsRepo = {
  listRows(filter: { companyId?: string } = {}): VendorRow[] {
    const s = getStore();
    return s.vendors
      .filter((v) => !filter.companyId || v.companyId === filter.companyId)
      .map((v) => {
        const done = s.maintenances.filter((m) => m.vendorId === v.id && m.status !== "CANCELLED");
        return {
          id: v.id, name: v.name, kind: v.kind, companyId: v.companyId, companyName: companyName(v.companyId),
          interventions: done.length,
          totalCost: done.filter((m) => m.status === "COMPLETED").reduce((sum, m) => sum + m.totalCost, 0),
          currency: companyCurrency(v.companyId),
        };
      })
      .sort(byCompanyThen((r) => r.name));
  },
};
```

Notes : chaque projection client est construite clé par clé (jamais `...bus`) : un champ ajouté plus tard à `Bus` (identifiant d'équipage, prix d'achat…) n'atteint pas le client par accident. `BusDetail` contient le `Bus` brut (avec les identifiants d'équipage) : il n'est consommé que par des Server Components. `retire` prend `now` en paramètre (aucune horloge cachée dans la règle) ; les lectures qui en dépendent (`busesRepo.detail`) aussi.

Run: `pnpm typecheck && pnpm test` → **306 tests** verts (272 + 25 `fleet-repo` + 9 `fleet-rules`).

- [ ] **Step 3: Prouver les gardes**

Pour chaque mutation : l'appliquer seule dans `src/lib/repos/fleet.ts`, lancer `pnpm test tests/unit/fleet-repo.test.ts tests/unit/fleet-rules.test.ts`, constater l'échec des tests nommés (et d'eux seuls), restaurer (`git diff src/lib/repos/fleet.ts` ne montre plus la mutation), constater le vert.

1. Bus inconnu : remplacer `const bus = s.buses.find((b) => b.id === busId);` suivi de `if (!bus) throw new Error("Bus introuvable");` par `const bus = s.buses.find((b) => b.id === busId)!;` → FAIL `refuses an unknown bus`.
2. Motif : supprimer la ligne `if (!motif) throw new Error("Un motif est obligatoire");` → FAIL `refuses a blank reason and changes nothing` et `checks the guards in order: reason, then already retired, then maintenance, then trips`. Puis remplacer `const motif = reason.trim();` par `const motif = reason;` → FAIL `retires an active bus with no maintenance in progress and no trip to come, and journals it`, `refuses a blank reason and changes nothing` et le test d'ordre.
3. Déjà hors service : supprimer `if (bus.status === "retired") throw new Error("Ce bus est déjà hors service");` → FAIL `refuses a bus that is already retired` et le test d'ordre.
4. Maintenance en cours : remplacer la condition `s.maintenances.some((m) => m.busId === bus.id && m.status === "IN_PROGRESS")` par `false` → FAIL `refuses a bus with a maintenance in progress` et le test d'ordre.
5. Trajets à venir : remplacer la condition `s.trips.some((t) => t.busId === bus.id && UPCOMING_TRIP_STATUSES.includes(t.status))` par `false` → FAIL `refuses a bus with a planned trip, and a bus whose only trip to come is boarding`.
6. Embarquement : réduire `UPCOMING_TRIP_STATUSES` à `["planned"]` → FAIL `refuses a bus with a planned trip, and a bus whose only trip to come is boarding` (le test rend « parti » le trajet planifié de `DK-1022-AB` pour que seul l'embarquement bloque).
7. Frontière haute des échéances : remplacer `diff <= EXPIRY_SOON_DAYS * DAY` par `diff < EXPIRY_SOON_DAYS * DAY` → FAIL `is soon up to exactly 30 days, ok one millisecond after`.
8. Frontière basse : remplacer `if (diff < 0) return "expired";` par `if (diff <= 0) return "expired";` → FAIL `is expired one millisecond before the reference date and soon from the reference date`.
9. Filtre « sans conducteur » : remplacer `(!filter.withoutDriver || b.driverId === null))` par `true)` → FAIL `lists the buses without a driver, one per company at least, combinable with the company filter`.
10. Projection : dans `busRow`, ajouter `driverId: bus.driverId,` à l'objet renvoyé (et `driverId: string | null;` à `BusRow` pour compiler) → FAIL `returns a projection field by field, without any crew or employee identifier`.
11. Siège bloqué : dans `seatCounts`, remplacer `seats.filter((x) => x.state === state).length` par `seats.filter((x) => x.state === state || (state === "free" && x.state === "blocked")).length` → FAIL `counts free, booked and occupied seats; a blocked seat counts in none`, `places each seat of a trip's map on its row and column, and its free seats equal availableSeats`, `lists the seat maps as counts only, filterable by company` et `details a trip with its route, bus crew and seat map`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/repos/fleet.ts tests/unit/fleet-repo.test.ts tests/unit/fleet-rules.test.ts
git commit -m "feat: fleet read repositories, expiries, seat counts and the retire rule

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Action serveur « Mettre hors service » (TDD)

**Files:**
- Create: `src/app/(admin)/flotte/actions.ts`, `tests/unit/fleet-actions.test.ts`

**Interfaces:**
- Consumes: `run`, `requireReason`, `requireString`, `ActionResult` (`src/lib/actions/run.ts`) ; `busesRepo.retire` (Task 2).
- Produces: `retireBus(busId: string, reason: string): Promise<ActionResult>` (Server Action). Revalide `/`, `/flotte/bus`, `/flotte/bus/<id>` et `/compagnies/<companyId>`. Messages : `Bus invalide` (identifiant vide ou non textuel), `Motif invalide` (motif vide), `Motif trop long (500 caractères maximum)`, `Session expirée, reconnecte-toi`, puis ceux du dépôt.

- [ ] **Step 1: Tests (échouants)**

Créer `tests/unit/fleet-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { retireBus } from "@/app/(admin)/flotte/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
const TOO_LONG = { ok: false, error: "Motif trop long (500 caractères maximum)" };

beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const bus = (plate: string) => getStore().buses.find((b) => b.plate === plate)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("retireBus", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = bus("DK-1051-AB");
    const n = getStore().activity.length;
    expect(await retireBus(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("active");
    expect(target.retiredAt).toBeNull();
    expect(getStore().activity.length).toBe(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("retires the bus as the session actor with the trimmed reason, and revalidates the pages", async () => {
    const target = bus("DK-1051-AB");
    expect(await retireBus(target.id, "  Accident  ")).toEqual({ ok: true });
    expect(target.status).toBe("retired");
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", action: "Bus DK-1051-AB mis hors service. Motif : Accident",
    });
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/flotte/bus", `/flotte/bus/${target.id}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("refuses a blank reason and 501 characters, accepts exactly 500", async () => {
    const target = bus("DK-1051-AB");
    expect(await retireBus(target.id, "   ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await retireBus(target.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(target.status).toBe("active");
    expect(await retireBus(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("retired");
  });

  it("refuses an invalid identifier and returns the repository refusals as results", async () => {
    expect(await retireBus("", "x")).toEqual({ ok: false, error: "Bus invalide" });
    expect(await retireBus(42 as never, "x")).toEqual({ ok: false, error: "Bus invalide" });
    expect(await retireBus("nope", "x")).toEqual({ ok: false, error: "Bus introuvable" });
    expect(await retireBus(bus("DK-1023-AB").id, "x")).toEqual({ ok: false, error: "Ce bus est déjà hors service" });
    expect(await retireBus(bus("DK-1040-AB").id, "x")).toEqual({ ok: false, error: "Une maintenance est en cours sur ce bus" });
    expect(await retireBus(bus("DK-1050-AB").id, "x")).toEqual({ ok: false, error: "Ce bus a des trajets à venir" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test tests/unit/fleet-actions.test.ts` → FAIL (le module `@/app/(admin)/flotte/actions` n'existe pas).

- [ ] **Step 2: Implémenter**

Créer `src/app/(admin)/flotte/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { busesRepo } from "@/lib/repos/fleet";

export async function retireBus(busId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(busId, "Bus");
    const motif = requireReason(reason);
    const bus = busesRepo.retire(busId, motif, actor);
    revalidatePath("/");
    revalidatePath("/flotte/bus");
    revalidatePath(`/flotte/bus/${bus.id}`);
    revalidatePath(`/compagnies/${bus.companyId}`);
  });
}
```

Run: `pnpm typecheck && pnpm test` → **310 tests** verts (306 + 4).

- [ ] **Step 3: Prouver la session d'abord et le plafond du motif**

1. Remplacer temporairement les deux lignes `const motif = requireReason(reason);` et `const bus = busesRepo.retire(busId, motif, actor);` par `const bus = busesRepo.retire(busId, reason, actor);`. Run `pnpm test tests/unit/fleet-actions.test.ts` → FAIL sur `refuses a blank reason and 501 characters, accepts exactly 500`. Restaurer → PASS.
2. Ajouter temporairement, en première ligne du corps de `retireBus` (avant `return run(`), `try { busesRepo.retire(busId, reason, "anonymous"); } catch { /* mutation */ }`. Run → FAIL sur `reads and writes nothing without a session`, `retires the bus as the session actor with the trimmed reason, and revalidates the pages` et `refuses a blank reason and 501 characters, accepts exactly 500`. Restaurer → PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/flotte/actions.ts" tests/unit/fleet-actions.test.ts
git commit -m "feat: retire bus server action

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Liste et fiche des bus (filtres, quatre onglets, équipage, échéances, mise hors service)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`, `tests/e2e/backoffice.spec.ts`
- Create: `src/components/fleet/expiry-badge.tsx`, `src/components/fleet/crew-list.tsx`, `src/components/fleet/company-filter.tsx`, `src/components/fleet/retire-bus-button.tsx`, `src/components/fleet/bus-tabs.tsx`, `src/app/(admin)/flotte/bus/page.tsx`, `src/app/(admin)/flotte/bus/buses-table.tsx`, `src/app/(admin)/flotte/bus/[id]/page.tsx`, `src/app/(admin)/flotte/bus/[id]/not-found.tsx`

**Interfaces:**
- Consumes: `busesRepo`, `fleetCompanies`, `parseCompanyFilter`, `BusRow`, `BusDetail`, `CrewAssignment`, `ExpiryState` (Task 2) ; `retireBus` (Task 3) ; `DataTable`, `StatusFilterNav` (props `param`, `keep`), `ConfirmDialog`, `TabsWithUrl`, `DetailRow`, `PageHeader`, `StatusBadge` (lots 1 à 3).
- Produces:
  - Libellés : `tripStatusBadge`, `maintenanceStatusBadge`, `routeStatusBadge`, `expiryBadge(state, daysLeft)`, `busTypeLabel`, `fuelTypeLabel`, `vendorKindLabel`, `crewRoleLabel`, `maintenanceCategoryLabel`, `seatStateLabel`.
  - Composants serveur : `ExpiryBadge({ state, daysLeft })`, `CrewList({ crew })` (`data-testid="crew-<RÔLE>"`, « Non affecté »), `CompanyFilter({ basePath, current, keep? })` (navigation « Filtrer par compagnie »), `BusTabs({ detail, initialTab? })` (onglets `caracteristiques`, `equipage`, `maintenance`, `trajets` ; `data-testid="expiry-<clé>"`).
  - Composant client : `RetireBusButton({ busId, plate })` (bouton et confirmation « Mettre hors service »).
  - Pages : `/flotte/bus` (filtres `?compagnie=`, `?statut=`, `?conducteur=sans`, recherche « Rechercher un bus… ») et `/flotte/bus/[id]` (`data-testid="bus-status"`), « Bus introuvable ».

- [ ] **Step 1: Tests des libellés (échouants)**

À la fin de `tests/unit/labels.test.ts`, ajouter :

```ts
import {
  busTypeLabel, crewRoleLabel, expiryBadge, fuelTypeLabel, maintenanceCategoryLabel, maintenanceStatusBadge,
  routeStatusBadge, seatStateLabel, tripStatusBadge, vendorKindLabel,
} from "@/lib/labels";
describe("fleet labels", () => {
  it("labels trip, maintenance and route statuses", () => {
    expect(["planned", "boarding", "departed", "cancelled"].map((st) => tripStatusBadge(st as "planned").label))
      .toEqual(["Planifié", "Embarquement", "Parti", "Annulé"]);
    expect(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => maintenanceStatusBadge(st as "PLANNED")))
      .toEqual([
        { label: "Planifiée", tone: "info" }, { label: "En cours", tone: "warning" },
        { label: "Terminée", tone: "success" }, { label: "Annulée", tone: "neutral" },
      ]);
    expect(routeStatusBadge("inactive")).toEqual({ label: "Inactive", tone: "neutral" });
  });
  it("labels an expiry by state and days", () => {
    expect(expiryBadge("expired", -12)).toEqual({ label: "Expirée depuis 12 j", tone: "danger" });
    expect(expiryBadge("expired", 0)).toEqual({ label: "Expirée aujourd'hui", tone: "danger" });
    expect(expiryBadge("soon", 15)).toEqual({ label: "Expire dans 15 j", tone: "warning" });
    expect(expiryBadge("soon", 0)).toEqual({ label: "Expire aujourd'hui", tone: "warning" });
    expect(expiryBadge("ok", 200)).toEqual({ label: "À jour", tone: "success" });
  });
  it("labels bus types, fuels, vendor kinds, crew roles, categories and seat states in French", () => {
    expect(["MINIBUS", "COACH", "STANDARD", "ARTICULATED"].map((t) => busTypeLabel(t as "COACH")))
      .toEqual(["Minibus", "Autocar", "Bus standard", "Bus articulé"]);
    expect(["DIESEL", "PETROL", "ELECTRIC", "HYBRID"].map((t) => fuelTypeLabel(t as "DIESEL")))
      .toEqual(["Diesel", "Essence", "Électrique", "Hybride"]);
    expect(["GARAGE", "INSURER", "PARTS", "OTHER"].map((k) => vendorKindLabel(k as "GARAGE")))
      .toEqual(["Garage", "Assureur", "Pièces détachées", "Autre"]);
    expect(["DRIVER", "DRIVER_ASSISTANT", "CONTROLLER"].map((r) => crewRoleLabel(r as "DRIVER")))
      .toEqual(["Conducteur principal", "Conducteur assistant", "Contrôleur"]);
    expect(["PREVENTIVE", "CORRECTIVE", "INSPECTION"].map((c) => maintenanceCategoryLabel(c as "PREVENTIVE")))
      .toEqual(["Préventive", "Corrective", "Contrôle"]);
    expect(["free", "booked", "occupied", "blocked"].map((st) => seatStateLabel(st as "free")))
      .toEqual(["libre", "réservé", "occupé", "bloqué"]);
  });
});
```

Run: `pnpm test tests/unit/labels.test.ts` → FAIL (3 tests : les libellés n'existent pas).

- [ ] **Step 2: Libellés**

Dans `src/lib/labels.ts`, remplacer :

```ts
import type {
  BusStatus, CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, PermissionDomain,
  Plan, ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, UserStatus,
} from "@/lib/types";
```

par :

```ts
import type {
  BusStatus, BusType, CompanyStatus, CrewRole, FeatureDef, FuelType, Incident, Invoice, KycDocumentStatus,
  MaintenanceCategory, MaintenanceStatus, PaymentAttempt, PermissionDomain, Plan, RouteStatus, SeatState,
  ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, TripStatus, UserStatus, VendorKind,
} from "@/lib/types";
```

et ajouter à la fin du fichier :

```ts
export const tripStatusBadge = (s: TripStatus): Badge =>
  pick({
    planned: { label: "Planifié", tone: "info" },
    boarding: { label: "Embarquement", tone: "warning" },
    departed: { label: "Parti", tone: "success" },
    cancelled: { label: "Annulé", tone: "neutral" },
  }, s);

export const maintenanceStatusBadge = (s: MaintenanceStatus): Badge =>
  pick({
    PLANNED: { label: "Planifiée", tone: "info" },
    IN_PROGRESS: { label: "En cours", tone: "warning" },
    COMPLETED: { label: "Terminée", tone: "success" },
    CANCELLED: { label: "Annulée", tone: "neutral" },
  }, s);

export const routeStatusBadge = (s: RouteStatus): Badge =>
  pick({
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" },
  }, s);

/** Expiry of a bus document; `daysLeft` comes from `daysUntil` (fleet repository). */
export function expiryBadge(state: "expired" | "soon" | "ok", daysLeft: number): Badge {
  if (state === "expired") {
    return { label: daysLeft === 0 ? "Expirée aujourd'hui" : `Expirée depuis ${-daysLeft} j`, tone: "danger" };
  }
  if (state === "soon") return { label: daysLeft === 0 ? "Expire aujourd'hui" : `Expire dans ${daysLeft} j`, tone: "warning" };
  return { label: "À jour", tone: "success" };
}

const BUS_TYPE_LABELS: Record<BusType, string> = {
  MINIBUS: "Minibus", COACH: "Autocar", STANDARD: "Bus standard", ARTICULATED: "Bus articulé",
};
export const busTypeLabel = (t: BusType): string => BUS_TYPE_LABELS[t];

const FUEL_LABELS: Record<FuelType, string> = { DIESEL: "Diesel", PETROL: "Essence", ELECTRIC: "Électrique", HYBRID: "Hybride" };
export const fuelTypeLabel = (t: FuelType): string => FUEL_LABELS[t];

const VENDOR_KIND_LABELS: Record<VendorKind, string> = {
  GARAGE: "Garage", INSURER: "Assureur", PARTS: "Pièces détachées", OTHER: "Autre",
};
export const vendorKindLabel = (k: VendorKind): string => VENDOR_KIND_LABELS[k];

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  DRIVER: "Conducteur principal", DRIVER_ASSISTANT: "Conducteur assistant", CONTROLLER: "Contrôleur",
};
export const crewRoleLabel = (r: CrewRole): string => CREW_ROLE_LABELS[r];

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  PREVENTIVE: "Préventive", CORRECTIVE: "Corrective", INSPECTION: "Contrôle",
};
export const maintenanceCategoryLabel = (c: MaintenanceCategory): string => CATEGORY_LABELS[c];

const SEAT_STATE_LABELS: Record<SeatState, string> = { free: "libre", booked: "réservé", occupied: "occupé", blocked: "bloqué" };
/** Lower-case state of a seat, as read in "Siège 3B, réservé". */
export const seatStateLabel = (s: SeatState): string => SEAT_STATE_LABELS[s];
```

Run: `pnpm test tests/unit/labels.test.ts` → PASS. Puis `pnpm test` → **313 tests** verts.

- [ ] **Step 3: Composants de flotte**

Créer `src/components/fleet/expiry-badge.tsx` :

```tsx
import { StatusBadge } from "@/components/data/status-badge";
import { expiryBadge } from "@/lib/labels";
import type { ExpiryState } from "@/lib/repos/fleet";

/** Server Component: badge of a document expiry ("Expirée depuis 12 j", "Expire dans 15 j", "À jour"). */
export function ExpiryBadge({ state, daysLeft }: { state: ExpiryState; daysLeft: number }) {
  const b = expiryBadge(state, daysLeft);
  return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
}
```

Créer `src/components/fleet/crew-list.tsx` :

```tsx
import { DetailRow } from "@/components/data/detail-row";
import { crewRoleLabel } from "@/lib/labels";
import type { CrewAssignment } from "@/lib/repos/fleet";

/** Server Component: the three crew assignments of a bus, by name only. */
export function CrewList({ crew }: { crew: CrewAssignment[] }) {
  return (
    <dl>
      {crew.map((c) => (
        <DetailRow key={c.role} label={crewRoleLabel(c.role)}>
          <span data-testid={`crew-${c.role}`} className={c.name ? undefined : "text-muted-foreground"}>
            {c.name ?? "Non affecté"}
          </span>
        </DetailRow>
      ))}
    </dl>
  );
}
```

Créer `src/components/fleet/company-filter.tsx` (Server Component : il lit le dépôt, il n'a pas `"use client"`) :

```tsx
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { fleetCompanies } from "@/lib/repos/fleet";

/** Server Component: `?compagnie=` pills over the companies that own a fleet; keeps the other filters. */
export function CompanyFilter({
  basePath, current, keep,
}: { basePath: string; current: string | undefined; keep?: Record<string, string | undefined> }) {
  const options: FilterOption[] = [
    { value: "all", label: "Toutes les compagnies" },
    ...fleetCompanies().map((c) => ({ value: c.id, label: c.name })),
  ];
  return (
    <StatusFilterNav
      basePath={basePath} options={options} current={current} param="compagnie" label="Filtrer par compagnie" keep={keep}
    />
  );
}
```

Créer `src/components/fleet/retire-bus-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { retireBus } from "@/app/(admin)/flotte/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the bus id and its plate (shown in the dialog title). */
export interface RetireBusButtonProps { busId: string; plate: string }

export function RetireBusButton({ busId, plate }: RetireBusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>Mettre hors service</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Mettre le bus ${plate} hors service`}
        description="Le bus ne pourra plus être affecté à un trajet. Refusé si une maintenance est en cours ou si des trajets sont à venir."
        confirmLabel="Mettre hors service" destructive requireReason
        onConfirm={async (reason) => {
          const r = await retireBus(busId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

Créer `src/components/fleet/bus-tabs.tsx` :

```tsx
import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { CrewList } from "@/components/fleet/crew-list";
import { ExpiryBadge } from "@/components/fleet/expiry-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  busStatusBadge, busTypeLabel, fuelTypeLabel, maintenanceCategoryLabel, maintenanceStatusBadge, tripStatusBadge,
} from "@/lib/labels";
import type { BusDetail } from "@/lib/repos/fleet";

const TAB_VALUES = ["caracteristiques", "equipage", "maintenance", "trajets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

const yesNo = (value: boolean) => (value ? "Oui" : "Non");

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BusTabs({ detail, initialTab }: { detail: BusDetail; initialTab?: string }) {
  const { bus } = detail;
  const status = busStatusBadge(bus.status);

  const items = [
    {
      value: "caracteristiques", label: "Caractéristiques",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent><dl>
            <DetailRow label="Code">{bus.busCode}</DetailRow>
            <DetailRow label="Plaque">{bus.plate}</DetailRow>
            <DetailRow label="Marque et modèle">{bus.brand} {bus.model}</DetailRow>
            <DetailRow label="Année">{bus.year}</DetailRow>
            <DetailRow label="Type">{busTypeLabel(bus.busType)}</DetailRow>
            <DetailRow label="Carburant">{fuelTypeLabel(bus.fuelType)}</DetailRow>
            <DetailRow label="Numéro de moteur">{bus.engineNumber}</DetailRow>
            <DetailRow label="Couleur">{bus.color}</DetailRow>
            <DetailRow label="Places assises">{bus.seatCapacity}</DetailRow>
            <DetailRow label="Places debout">{bus.standingCapacity}</DetailRow>
            <DetailRow label="Soute à bagages">{bus.luggageCapacity} m³</DetailRow>
            <DetailRow label="Accessible en fauteuil roulant">{yesNo(bus.wheelchairAccessible)}</DetailRow>
            <DetailRow label="Climatisation">{yesNo(bus.airConditioned)}</DetailRow>
            <DetailRow label="GPS">{bus.gpsEnabled ? `Oui · ${bus.gpsDeviceId ?? "boîtier inconnu"}` : "Non"}</DetailRow>
            <DetailRow label="Caméra">{yesNo(bus.cameraInstalled)}</DetailRow>
            <DetailRow label="Capteur de carburant">{yesNo(bus.fuelSensorInstalled)}</DetailRow>
          </dl></CardContent></Card>
          <div className="space-y-4">
            <Card><CardContent><dl>
              <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
              <DetailRow label="Compagnie">
                <Link href={`/compagnies/${bus.companyId}?onglet=flotte`} className="hover:underline">{detail.companyName}</Link>
              </DetailRow>
              <DetailRow label="Flotte">{detail.fleetName ?? "—"}</DetailRow>
              <DetailRow label="Ligne">
                {bus.routeId && detail.routeLabel ? (
                  <Link href={`/flotte/lignes/${bus.routeId}`} className="hover:underline">{detail.routeLabel}</Link>
                ) : "—"}
              </DetailRow>
              <DetailRow label="Dépôt">{detail.depotName ?? "—"}</DetailRow>
              <DetailRow label="Date d'achat">{formatDate(bus.purchaseDate)}</DetailRow>
              <DetailRow label="Prix d'achat">{formatMoney(bus.purchasePrice, detail.currency)}</DetailRow>
              <DetailRow label="Hors service depuis le">{bus.retiredAt ? formatDate(bus.retiredAt) : "—"}</DetailRow>
            </dl></CardContent></Card>
            <Card>
              <CardHeader><CardTitle>Échéances</CardTitle></CardHeader>
              <CardContent><dl>
                {detail.expiries.map((e) => (
                  <DetailRow key={e.key} label={e.label}>
                    <span className="inline-flex items-center gap-2" data-testid={`expiry-${e.key}`}>
                      {formatDate(e.date)} <ExpiryBadge state={e.state} daysLeft={e.daysLeft} />
                    </span>
                  </DetailRow>
                ))}
                <DetailRow label="Dernière maintenance">{formatDate(bus.lastMaintenanceDate)}</DetailRow>
                <DetailRow label="Prochaine maintenance">{formatDate(bus.nextMaintenanceDate)}</DetailRow>
              </dl></CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      value: "equipage", label: "Équipage",
      content: (
        <Card><CardContent className="space-y-2">
          <CrewList crew={detail.crew} />
          <p className="text-xs text-muted-foreground">
            Registre d&apos;équipage du backoffice : sans compte ni coordonnées. Les affectations ne sont pas modifiables ici.
          </p>
        </CardContent></Card>
      ),
    },
    {
      value: "maintenance", label: "Maintenance",
      content: (
        <Card><CardContent>
          {detail.maintenances.length === 0 ? <Empty>Aucune maintenance enregistrée.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">Catégorie</th>
                  <th className="py-1 font-medium">Fournisseur</th>
                  <th className="py-1 font-medium">Prévue le</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Coût total</th>
                </tr>
              </thead>
              <tbody>
                {detail.maintenances.map((m) => {
                  const b = maintenanceStatusBadge(m.status);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-1.5 font-mono text-xs">{m.code}</td>
                      <td>{m.type}</td>
                      <td>{maintenanceCategoryLabel(m.category)}</td>
                      <td>{m.vendorName ?? "Interne"}</td>
                      <td>{formatDate(m.scheduledDate)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="tabular-nums">{formatMoney(m.totalCost, m.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "trajets", label: "Trajets et sièges",
      content: (
        <Card><CardContent>
          {detail.trips.length === 0 ? <Empty>Aucun trajet pour ce bus.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Départ</th>
                  <th className="py-1 font-medium">Ligne</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Places libres</th>
                </tr>
              </thead>
              <tbody>
                {detail.trips.map((t) => {
                  const b = tripStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{formatDateTime(t.departure)}</Link>
                      </td>
                      <td>{t.routeLabel}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="tabular-nums">{t.availableSeats} / {t.totalSeats}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "caracteristiques";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
```

Notes : `BusTabs` reçoit `BusDetail` (avec les identifiants d'équipage du `Bus` brut) **côté serveur** et ne transmet à `TabsWithUrl` que des nœuds rendus ; l'équipage n'y figure que par son nom (`CrewList`). `RetireBusButton` ne reçoit que deux chaînes.

- [ ] **Step 4: Liste des bus**

Créer `src/app/(admin)/flotte/bus/buses-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { busStatusBadge } from "@/lib/labels";
import type { BusRow } from "@/lib/repos/fleet";

const columns: ColumnDef<BusRow, unknown>[] = [
  { accessorKey: "plate", header: "Plaque", cell: ({ row }) => <span className="font-medium">{row.original.plate}</span> },
  { accessorKey: "busCode", header: "Code", cell: ({ row }) => <span className="font-mono text-xs">{row.original.busCode}</span> },
  { accessorKey: "brandModel", header: "Marque et modèle" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "fleetName", header: "Flotte", cell: ({ row }) => row.original.fleetName ?? "—" },
  { accessorKey: "routeLabel", header: "Ligne", cell: ({ row }) => row.original.routeLabel ?? "—" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = busStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "seatCapacity", header: "Capacité", cell: ({ row }) => <span className="tabular-nums">{row.original.seatCapacity} places</span> },
  {
    accessorKey: "driverName", header: "Équipage",
    cell: ({ row }) => row.original.driverName ?? <span className="text-muted-foreground">Aucun conducteur</span>,
  },
  { accessorKey: "nextMaintenanceDate", header: "Prochaine maintenance", cell: ({ row }) => formatDate(row.original.nextMaintenanceDate) },
];

export function BusesTable({ buses }: { buses: BusRow[] }) {
  return (
    <DataTable
      columns={columns} data={buses} rowHref={(b) => `/flotte/bus/${b.id}`}
      searchPlaceholder="Rechercher un bus…" emptyMessage="Aucun bus."
    />
  );
}
```

Créer `src/app/(admin)/flotte/bus/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { busesRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import type { BusStatus } from "@/lib/types";
import { BusesTable } from "./buses-table";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "maintenance", "retired"] as const satisfies readonly BusStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "En service" },
  { value: "maintenance", label: "En maintenance" },
  { value: "retired", label: "Hors service" },
];
const DRIVER_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les bus" },
  { value: "sans", label: "Sans conducteur affecté" },
];

export default async function BusesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; conducteur?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  const driver = parseFilter(params.conducteur, ["sans"] as const);
  return (
    <>
      <PageHeader title="Bus" description="Les bus de toutes les compagnies : caractéristiques, équipage et maintenance. Lecture seule, sauf la mise hors service." />
      <CompanyFilter basePath="/flotte/bus" current={companyId} keep={{ statut: status, conducteur: driver }} />
      <StatusFilterNav basePath="/flotte/bus" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId, conducteur: driver }} />
      <StatusFilterNav
        basePath="/flotte/bus" options={DRIVER_OPTIONS} current={driver} param="conducteur"
        label="Filtrer par conducteur" keep={{ compagnie: companyId, statut: status }}
      />
      <BusesTable buses={busesRepo.listRows({ companyId, status, withoutDriver: driver === "sans" })} />
    </>
  );
}
```

- [ ] **Step 5: Fiche d'un bus**

Créer `src/app/(admin)/flotte/bus/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { BusTabs } from "@/components/fleet/bus-tabs";
import { RetireBusButton } from "@/components/fleet/retire-bus-button";
import { busStatusBadge } from "@/lib/labels";
import { busesRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

export default async function BusPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = busesRepo.detail(id);
  if (!detail) notFound();
  const { bus } = detail;
  const badge = busStatusBadge(bus.status);
  return (
    <>
      <PageHeader
        title={bus.plate}
        description={`${bus.busCode} · ${bus.brand} ${bus.model} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="bus-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            {bus.status !== "retired" && <RetireBusButton busId={bus.id} plate={bus.plate} />}
          </>
        }
      />
      <BusTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/flotte/bus/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function BusNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Bus introuvable</p>
        <Link href="/flotte/bus" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
```

La route réelle `/flotte/bus` prend le pas sur l'attrape-tout `[...slug]`, qui reste en place pour les sections non construites ; la barre latérale affiche encore « bientôt » jusqu'à la Task 7.

Run: `pnpm typecheck && pnpm test` → **313 tests** verts.

- [ ] **Step 6: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, remplacer :

```ts
test("unimplemented sections show a coming-soon page", async ({ page }) => {
  await login(page);
  await page.goto("/flotte/bus");
```

par :

```ts
test("unimplemented sections show a coming-soon page", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
```

puis insérer juste avant la ligne `test("no contact e-mail, phone or full IP address reaches the browser in page payloads @prod", async ({ page }) => {` :

```ts
async function openBus(page: Page, plate: string) {
  await page.goto("/flotte/bus");
  await page.getByPlaceholder("Rechercher un bus…").fill(plate);
  await page.getByRole("row", { name: new RegExp(plate) }).click();
  await expect(page.getByRole("heading", { name: plate })).toBeVisible();
}

test("buses are filtered by company, the other filters are kept", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  await expect(page.getByText("42 résultat(s)")).toBeVisible();
  await page.getByRole("navigation", { name: "Filtrer par compagnie" }).getByRole("link", { name: "Casamance Trans" }).click();
  await expect(page).toHaveURL(/compagnie=/);
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  for (const plate of ["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]) {
    await expect(page.getByRole("row", { name: new RegExp(plate) })).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Filtrer par statut" }).getByRole("link", { name: "En maintenance" }).click();
  await expect(page).toHaveURL(/compagnie=.*statut=maintenance|statut=maintenance.*compagnie=/);
  await expect(page.getByText("Aucun bus.")).toBeVisible();
});

test("the missing-driver filter lists one bus per company without a driver", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  await page.getByRole("navigation", { name: "Filtrer par conducteur" }).getByRole("link", { name: "Sans conducteur affecté" }).click();
  await expect(page).toHaveURL(/conducteur=sans/);
  await expect(page.getByText("12 résultat(s)")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Aucun conducteur" })).toHaveCount(12);
});

test("a bus shows its characteristics, crew, expiries and maintenance", async ({ page }) => {
  // Read-only: DK-1050-AB is also the trips-to-come refusal test's bus, which changes nothing.
  await login(page);
  await openBus(page, "DK-1050-AB");
  await expect(page.getByText("BUS-0601 · Mercedes-Benz Tourismo · Casamance Trans")).toBeVisible();
  await expect(page.getByTestId("bus-status")).toHaveText("En service");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("Autocar")).toBeVisible();
  await expect(panel.getByText("Diesel")).toBeVisible();
  await expect(panel.getByTestId("expiry-insurance")).toContainText("Expirée depuis 12 j");
  await expect(panel.getByRole("link", { name: "Ziguinchor → Dakar" })).toBeVisible();

  await page.getByRole("tab", { name: "Équipage" }).click();
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Saliou Sané");
  await expect(page.getByTestId("crew-DRIVER_ASSISTANT")).toHaveText("Alioune Lo");
  await expect(page.getByTestId("crew-CONTROLLER")).toHaveText("Mamadou Diagne");

  await page.getByRole("tab", { name: "Maintenance" }).click();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "MNT-1015" })).toBeVisible();
});

test("a bus without maintenance in progress or trips to come is taken out of service with a mandatory reason", async ({ page }) => {
  // Owns DK-1051-AB (Casamance Trans): no other test mutates this bus.
  await login(page);
  await openBus(page, "DK-1051-AB");
  await expect(page.getByTestId("bus-status")).toHaveText("En service");

  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Mettre hors service" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Moteur hors d'usage");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByTestId("bus-status")).toHaveText("Hors service");
  await expect(page.getByRole("button", { name: "Mettre hors service" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Équipage" }).click();
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Serigne Mbaye");

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Bus DK-1051-AB mis hors service. Motif : Moteur hors d'usage")).toBeVisible();
});

test("a bus with a maintenance in progress cannot be taken out of service", async ({ page }) => {
  // Read-only: the refusal changes nothing on DK-1040-AB.
  await login(page);
  await openBus(page, "DK-1040-AB");
  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Mettre hors service" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une maintenance est en cours sur ce bus");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("bus-status")).toHaveText("Maintenance");
});

test("a bus with trips to come cannot be taken out of service", async ({ page }) => {
  // Read-only: the refusal changes nothing on DK-1050-AB.
  await login(page);
  await openBus(page, "DK-1050-AB");
  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Mettre hors service" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Ce bus a des trajets à venir");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("bus-status")).toHaveText("En service");
});

test("an unknown bus id shows a not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/flotte/bus/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Bus introuvable")).toBeVisible();
});
```

Run:

```bash
pnpm exec playwright test --project dev -g "bus|coming-soon"
git checkout tsconfig.json
```

Expected : 8 tests passent (les 7 nouveaux et le test « coming-soon » modifié ; Playwright démarre aussi le serveur de production, comme pour `pnpm e2e`). Puis `pnpm typecheck && pnpm test` → 313 tests verts.

- [ ] **Step 7: Commit**

```bash
git add src/lib/labels.ts tests/unit/labels.test.ts src/components/fleet "src/app/(admin)/flotte/bus" tests/e2e/backoffice.spec.ts
git commit -m "feat: buses list and detail with crew, expiries and take-out-of-service

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Trajets (liste, fiche avec plan de sièges visuel) et plans de sièges

**Files:**
- Modify: `tests/e2e/backoffice.spec.ts`
- Create: `src/components/fleet/seat-map.tsx`, `src/app/(admin)/flotte/trajets/page.tsx`, `src/app/(admin)/flotte/trajets/trips-table.tsx`, `src/app/(admin)/flotte/trajets/[id]/page.tsx`, `src/app/(admin)/flotte/trajets/[id]/not-found.tsx`, `src/app/(admin)/flotte/plans-de-sieges/page.tsx`, `src/app/(admin)/flotte/plans-de-sieges/seat-maps-table.tsx`

**Interfaces:**
- Consumes: `tripsRepo`, `seatMapsRepo`, `parseCompanyFilter`, `TripRow`, `SeatMapRow`, `SeatMapView` (Task 2) ; `CompanyFilter`, `CrewList` (Task 4) ; `tripStatusBadge`, `seatStateLabel` (Task 4).
- Produces: `SeatMap({ map })` (Server Component : liste ordonnée « Plan de sièges », un `li` par siège avec `data-seat`, `data-state` et le nom accessible « Siège 3B, réservé » ; légende « Légende du plan de sièges » avec `data-testid="seat-count-<état>"`) ; pages `/flotte/trajets` (filtres compagnie et statut, recherche « Rechercher un trajet… »), `/flotte/trajets/[id]` (`data-testid="trip-status"`, `data-testid="trip-available"`, « Trajet introuvable »), `/flotte/plans-de-sieges` (recherche « Rechercher un plan de sièges… », une ligne ouvre le trajet).

- [ ] **Step 1: Plan de sièges visuel**

Créer `src/components/fleet/seat-map.tsx` :

```tsx
import { seatStateLabel } from "@/lib/labels";
import type { SeatMapView } from "@/lib/repos/fleet";
import { cn } from "@/lib/utils";
import type { SeatState } from "@/lib/types";

/** Colour and symbol of each state: the symbol keeps the map readable without colour. */
const STATE_STYLE: Record<SeatState, { className: string; symbol: string }> = {
  free: { className: "border-success/40 bg-success/10 text-success", symbol: "○" },
  booked: { className: "border-info/40 bg-info/15 text-info", symbol: "◐" },
  occupied: { className: "border-warning/40 bg-warning/20 text-warning", symbol: "●" },
  blocked: { className: "border-border bg-muted text-muted-foreground line-through", symbol: "✕" },
};

const LEGEND: { state: SeatState; label: string }[] = [
  { state: "free", label: "Libre" },
  { state: "booked", label: "Réservé" },
  { state: "occupied", label: "Occupé" },
  { state: "blocked", label: "Bloqué" },
];

/**
 * Server Component: a `rows` × `columns` CSS grid. Each seat carries `data-seat`, `data-state`, an accessible
 * label ("Siège 3B, réservé") and a symbol in addition to its colour; the legend gives the counts.
 */
export function SeatMap({ map }: { map: SeatMapView }) {
  const counts: Record<SeatState, number> = {
    free: map.counts.free, booked: map.counts.booked, occupied: map.counts.occupied, blocked: map.counts.blocked,
  };
  return (
    <div className="space-y-4">
      <ol
        aria-label="Plan de sièges"
        className="grid max-w-xs gap-1.5"
        style={{ gridTemplateColumns: `repeat(${map.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${map.rows}, auto)` }}
      >
        {map.seats.map((seat) => {
          const style = STATE_STYLE[seat.state];
          return (
            <li
              key={seat.code}
              data-seat={seat.code}
              data-state={seat.state}
              aria-label={`Siège ${seat.code}, ${seatStateLabel(seat.state)}`}
              style={{ gridRow: seat.row, gridColumn: seat.column }}
              className={cn("flex h-9 flex-col items-center justify-center rounded-md border text-[11px] font-medium leading-tight", style.className)}
            >
              <span aria-hidden="true">{style.symbol}</span>
              <span aria-hidden="true">{seat.code}</span>
            </li>
          );
        })}
      </ol>
      <ul aria-label="Légende du plan de sièges" className="flex flex-wrap gap-3 text-sm">
        {LEGEND.map((item) => (
          <li key={item.state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("inline-flex size-5 items-center justify-center rounded border text-[11px]", STATE_STYLE[item.state].className)}>
              {STATE_STYLE[item.state].symbol}
            </span>
            {item.label} <span className="tabular-nums text-muted-foreground" data-testid={`seat-count-${item.state}`}>({counts[item.state]})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Chaque siège porte un symbole (○ libre, ◐ réservé, ● occupé, ✕ bloqué) en plus de sa couleur ; symbole et code sont `aria-hidden`, le nom accessible vient de `aria-label`. Les couleurs utilisent les jetons existants (`success`, `info`, `warning`, `muted`), comme `StatusBadge`.

- [ ] **Step 2: Liste et fiche des trajets**

Créer `src/app/(admin)/flotte/trajets/trips-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { tripStatusBadge } from "@/lib/labels";
import type { TripRow } from "@/lib/repos/fleet";

const columns: ColumnDef<TripRow, unknown>[] = [
  { accessorKey: "routeLabel", header: "Ligne", cell: ({ row }) => <span className="font-medium">{row.original.routeLabel}</span> },
  { accessorKey: "departure", header: "Départ", cell: ({ row }) => formatDateTime(row.original.departure) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = tripStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "price", header: "Prix", cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span> },
  {
    accessorKey: "availableSeats", header: "Places libres",
    cell: ({ row }) => <span className="tabular-nums">{row.original.availableSeats} / {row.original.totalSeats}</span>,
  },
  { accessorKey: "busPlate", header: "Bus" },
  { accessorKey: "companyName", header: "Compagnie" },
];

export function TripsTable({ trips }: { trips: TripRow[] }) {
  return (
    <DataTable
      columns={columns} data={trips} rowHref={(t) => `/flotte/trajets/${t.id}`}
      searchPlaceholder="Rechercher un trajet…" emptyMessage="Aucun trajet."
    />
  );
}
```

Créer `src/app/(admin)/flotte/trajets/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter, tripsRepo } from "@/lib/repos/fleet";
import type { TripStatus } from "@/lib/types";
import { TripsTable } from "./trips-table";

export const dynamic = "force-dynamic";

const STATUSES = ["planned", "boarding", "departed", "cancelled"] as const satisfies readonly TripStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "planned", label: "Planifiés" },
  { value: "boarding", label: "En embarquement" },
  { value: "departed", label: "Partis" },
  { value: "cancelled", label: "Annulés" },
];

export default async function TripsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  return (
    <>
      <PageHeader title="Trajets" description="Les trajets de toutes les compagnies, du plus récent au plus ancien." />
      <CompanyFilter basePath="/flotte/trajets" current={companyId} keep={{ statut: status }} />
      <StatusFilterNav basePath="/flotte/trajets" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId }} />
      <TripsTable trips={tripsRepo.listRows({ companyId, status })} />
    </>
  );
}
```

Créer `src/app/(admin)/flotte/trajets/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { CrewList } from "@/components/fleet/crew-list";
import { SeatMap } from "@/components/fleet/seat-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { tripStatusBadge } from "@/lib/labels";
import { tripsRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = tripsRepo.detail(id);
  if (!detail) notFound();
  const { trip, seatMap } = detail;
  const badge = tripStatusBadge(trip.status);
  return (
    <>
      <PageHeader
        title={`Trajet ${trip.routeLabel}`}
        description={`${trip.companyName} · départ le ${formatDateTime(trip.departure)}`}
        actions={<span data-testid="trip-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Horaires et prix</CardTitle></CardHeader>
            <CardContent><dl>
              <DetailRow label="Ligne">
                <Link href={`/flotte/lignes/${trip.routeId}`} className="hover:underline">{trip.routeLabel}</Link>
              </DetailRow>
              <DetailRow label="Départ">{formatDateTime(trip.departure)}</DetailRow>
              <DetailRow label="Arrivée">{formatDateTime(trip.arrival)}</DetailRow>
              <DetailRow label="Durée">{duration(detail.durationMinutes)}</DetailRow>
              <DetailRow label="Distance">{detail.distanceKm} km</DetailRow>
              <DetailRow label="Prix">{formatMoney(trip.price, trip.currency)}</DetailRow>
              <DetailRow label="Places libres"><span data-testid="trip-available">{trip.availableSeats} / {trip.totalSeats}</span></DetailRow>
            </dl></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bus et équipage</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <dl>
                <DetailRow label="Bus">
                  <Link href={`/flotte/bus/${trip.busId}`} className="hover:underline">{trip.busPlate}</Link>
                  <span className="ml-1 font-mono text-xs text-muted-foreground">{detail.busCode}</span>
                </DetailRow>
              </dl>
              <CrewList crew={detail.crew} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Plan de sièges</CardTitle></CardHeader>
          <CardContent>
            {seatMap ? <SeatMap map={seatMap} /> : <p className="text-sm text-muted-foreground">Aucun plan de sièges pour ce trajet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/flotte/trajets/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function TripNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Trajet introuvable</p>
        <Link href="/flotte/trajets" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Liste des plans de sièges**

Créer `src/app/(admin)/flotte/plans-de-sieges/seat-maps-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { SeatMapRow } from "@/lib/repos/fleet";

const count = (value: number) => <span className="tabular-nums">{value}</span>;

const columns: ColumnDef<SeatMapRow, unknown>[] = [
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="font-medium">{row.original.busPlate}</span> },
  { accessorKey: "routeLabel", header: "Trajet" },
  { accessorKey: "departure", header: "Départ", cell: ({ row }) => formatDateTime(row.original.departure) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "total", header: "Sièges", cell: ({ row }) => count(row.original.total) },
  { accessorKey: "free", header: "Libres", cell: ({ row }) => count(row.original.free) },
  { accessorKey: "booked", header: "Réservés", cell: ({ row }) => count(row.original.booked) },
  { accessorKey: "occupied", header: "Occupés", cell: ({ row }) => count(row.original.occupied) },
];

/** A row opens the trip of the seat map. */
export function SeatMapsTable({ seatMaps }: { seatMaps: SeatMapRow[] }) {
  return (
    <DataTable
      columns={columns} data={seatMaps} rowHref={(m) => `/flotte/trajets/${m.tripId}`}
      searchPlaceholder="Rechercher un plan de sièges…" emptyMessage="Aucun plan de sièges."
    />
  );
}
```

Créer `src/app/(admin)/flotte/plans-de-sieges/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, seatMapsRepo } from "@/lib/repos/fleet";
import { SeatMapsTable } from "./seat-maps-table";

export const dynamic = "force-dynamic";

export default async function SeatMapsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Plans de sièges" description="Un plan par trajet : sièges libres, réservés et occupés (un siège bloqué n'entre dans aucun des trois)." />
      <CompanyFilter basePath="/flotte/plans-de-sieges" current={companyId} />
      <SeatMapsTable seatMaps={seatMapsRepo.listRows({ companyId })} />
    </>
  );
}
```

Run: `pnpm typecheck && pnpm test` → 313 tests verts (aucun test unitaire ajouté : la logique est dans le dépôt de la Task 2).

- [ ] **Step 4: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, insérer juste avant la ligne `test("no contact e-mail, phone or full IP address reaches the browser in page payloads @prod", async ({ page }) => {` :

```ts
test("a trip shows its timetable, its bus crew and a visual seat map with its legend", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/trajets?statut=boarding");
  await expect(page.getByRole("navigation", { name: "Filtrer par statut" }).getByRole("link", { name: "En embarquement" }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByText("6 résultat(s)")).toBeVisible();
  await page.getByPlaceholder("Rechercher un trajet…").fill("DK-1022");
  await page.getByRole("row", { name: /DK-1022-AB/ }).click();

  await expect(page.getByRole("heading", { name: "Trajet Saint-Louis → Ziguinchor" })).toBeVisible();
  await expect(page.getByTestId("trip-status")).toHaveText("Embarquement");
  await expect(page.getByTestId("trip-available")).toHaveText("9 / 29");
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Babacar Seck");
  await expect(page.getByTestId("crew-CONTROLLER")).toHaveText("Non affecté");

  const map = page.getByRole("list", { name: "Plan de sièges" });
  await expect(map.locator("[data-seat]")).toHaveCount(29);
  await expect(map.locator('[data-state="free"]')).toHaveCount(9);
  await expect(map.getByRole("listitem", { name: "Siège 1A, bloqué" })).toHaveAttribute("data-state", "blocked");
  await expect(map.getByRole("listitem", { name: "Siège 1B, réservé" })).toHaveAttribute("data-state", "booked");
  await expect(map.getByRole("listitem", { name: "Siège 1C, libre" })).toHaveAttribute("data-state", "free");
  await expect(map.getByRole("listitem", { name: "Siège 1D, occupé" })).toHaveAttribute("data-state", "occupied");

  const legend = page.getByRole("list", { name: "Légende du plan de sièges" });
  for (const label of ["Libre", "Réservé", "Occupé", "Bloqué"]) await expect(legend).toContainText(label);
  await expect(page.getByTestId("seat-count-free")).toHaveText("(9)");
  await expect(page.getByTestId("seat-count-booked")).toHaveText("(10)");
  await expect(page.getByTestId("seat-count-occupied")).toHaveText("(9)");
  await expect(page.getByTestId("seat-count-blocked")).toHaveText("(1)");
});

test("the seat maps list counts the seats and opens the trip", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/plans-de-sieges");
  await expect(page.getByText("56 résultat(s)")).toBeVisible();
  await page.getByPlaceholder("Rechercher un plan de sièges…").fill("DK-1052");
  const row = page.getByRole("row", { name: /DK-1052-AB/ });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("cell", { name: "55", exact: true })).toBeVisible();
  await row.click();
  await expect(page.getByRole("heading", { name: "Trajet Touba → Mbour" })).toBeVisible();
  await expect(page.getByTestId("trip-status")).toHaveText("Parti");
  await expect(page.getByTestId("trip-available")).toHaveText("11 / 55");

  await page.goto("/flotte/trajets/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Trajet introuvable")).toBeVisible();
});
```

Run:

```bash
pnpm exec playwright test --project dev -g "trip|seat"
git checkout tsconfig.json
```

Expected : 4 tests passent (les 2 nouveaux et les deux tests de la Task 4 dont le titre contient « trips »).

- [ ] **Step 5: Commit**

```bash
git add src/components/fleet/seat-map.tsx "src/app/(admin)/flotte/trajets" "src/app/(admin)/flotte/plans-de-sieges" tests/e2e/backoffice.spec.ts
git commit -m "feat: trips list and detail with a visual seat map, seat maps list

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Flottes, gares, lignes (liste et fiche), maintenance et fournisseurs

**Files:**
- Modify: `tests/e2e/backoffice.spec.ts`
- Create: `src/app/(admin)/flotte/flottes/{page,fleets-table}.tsx`, `src/app/(admin)/flotte/gares/{page,stations-table}.tsx`, `src/app/(admin)/flotte/lignes/{page,routes-table}.tsx`, `src/app/(admin)/flotte/lignes/[id]/{page,not-found}.tsx`, `src/app/(admin)/flotte/maintenance/{page,maintenance-table}.tsx`, `src/app/(admin)/flotte/fournisseurs/{page,vendors-table}.tsx`

**Interfaces:**
- Consumes: `fleetsRepo`, `stationsRepo`, `routesRepo`, `maintenanceRepo`, `vendorsRepo`, `parseCompanyFilter`, `FleetRow`, `StationRow`, `RouteRow`, `MaintenanceRow`, `VendorRow` (Task 2) ; `CompanyFilter` (Task 4) ; `routeStatusBadge`, `busStatusBadge`, `tripStatusBadge`, `maintenanceStatusBadge`, `maintenanceCategoryLabel`, `vendorKindLabel` (Tasks 1 et 4).
- Produces: pages `/flotte/flottes` (« Rechercher une flotte… »), `/flotte/gares` (« Rechercher une gare… »), `/flotte/lignes` (« Rechercher une ligne… », une ligne ouvre la fiche), `/flotte/lignes/[id]` (« Ligne <libellé> », cartes « Bus affectés (n) » et « Trajets (n) », `data-testid="route-status"`, « Ligne introuvable »), `/flotte/maintenance` (filtres compagnie et statut, « Rechercher une maintenance… », une ligne ouvre l'onglet Maintenance du bus), `/flotte/fournisseurs` (« Rechercher un fournisseur… »).

- [ ] **Step 1: Flottes et gares**

Créer `src/app/(admin)/flotte/flottes/fleets-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import type { FleetRow } from "@/lib/repos/fleet";

const columns: ColumnDef<FleetRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "depotName", header: "Dépôt de base", cell: ({ row }) => row.original.depotName ?? "—" },
  { accessorKey: "busCount", header: "Bus", cell: ({ row }) => <span className="tabular-nums">{row.original.busCount}</span> },
];

export function FleetsTable({ fleets }: { fleets: FleetRow[] }) {
  return <DataTable columns={columns} data={fleets} searchPlaceholder="Rechercher une flotte…" emptyMessage="Aucune flotte." />;
}
```

Créer `src/app/(admin)/flotte/flottes/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { fleetsRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import { FleetsTable } from "./fleets-table";

export const dynamic = "force-dynamic";

export default async function FleetsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Flottes" description="Les sous-flottes des compagnies, leur dépôt de base et leur nombre de bus." />
      <CompanyFilter basePath="/flotte/flottes" current={companyId} />
      <FleetsTable fleets={fleetsRepo.listRows({ companyId })} />
    </>
  );
}
```

Créer `src/app/(admin)/flotte/gares/stations-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import type { StationRow } from "@/lib/repos/fleet";

const columns: ColumnDef<StationRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "city", header: "Ville" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "routeCount", header: "Lignes desservies", cell: ({ row }) => <span className="tabular-nums">{row.original.routeCount}</span> },
];

export function StationsTable({ stations }: { stations: StationRow[] }) {
  return <DataTable columns={columns} data={stations} searchPlaceholder="Rechercher une gare…" emptyMessage="Aucune gare." />;
}
```

Créer `src/app/(admin)/flotte/gares/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, stationsRepo } from "@/lib/repos/fleet";
import { StationsTable } from "./stations-table";

export const dynamic = "force-dynamic";

export default async function StationsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Gares" description="Les gares des compagnies et le nombre de lignes qui les desservent." />
      <CompanyFilter basePath="/flotte/gares" current={companyId} />
      <StationsTable stations={stationsRepo.listRows({ companyId })} />
    </>
  );
}
```

- [ ] **Step 2: Lignes (liste et fiche)**

Créer `src/app/(admin)/flotte/lignes/routes-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { routeStatusBadge } from "@/lib/labels";
import type { RouteRow } from "@/lib/repos/fleet";

const columns: ColumnDef<RouteRow, unknown>[] = [
  { accessorKey: "label", header: "Ligne", cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
  { accessorKey: "distanceKm", header: "Distance", cell: ({ row }) => <span className="tabular-nums">{row.original.distanceKm} km</span> },
  {
    accessorKey: "durationMinutes", header: "Durée",
    cell: ({ row }) => <span className="tabular-nums">{Math.floor(row.original.durationMinutes / 60)} h {String(row.original.durationMinutes % 60).padStart(2, "0")}</span>,
  },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = routeStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "busCount", header: "Bus", cell: ({ row }) => <span className="tabular-nums">{row.original.busCount}</span> },
  { accessorKey: "tripCount", header: "Trajets", cell: ({ row }) => <span className="tabular-nums">{row.original.tripCount}</span> },
];

export function RoutesTable({ routes }: { routes: RouteRow[] }) {
  return (
    <DataTable
      columns={columns} data={routes} rowHref={(r) => `/flotte/lignes/${r.id}`}
      searchPlaceholder="Rechercher une ligne…" emptyMessage="Aucune ligne."
    />
  );
}
```

Créer `src/app/(admin)/flotte/lignes/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, routesRepo } from "@/lib/repos/fleet";
import { RoutesTable } from "./routes-table";

export const dynamic = "force-dynamic";

export default async function RoutesPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Lignes" description="Les lignes des compagnies (origine → destination), avec leurs bus et leurs trajets." />
      <CompanyFilter basePath="/flotte/lignes" current={companyId} />
      <RoutesTable routes={routesRepo.listRows({ companyId })} />
    </>
  );
}
```

Créer `src/app/(admin)/flotte/lignes/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { busStatusBadge, routeStatusBadge, tripStatusBadge } from "@/lib/labels";
import { routesRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = routesRepo.detail(id);
  if (!detail) notFound();
  const { route } = detail;
  const badge = routeStatusBadge(route.status);
  return (
    <>
      <PageHeader
        title={`Ligne ${route.label}`}
        description={route.companyName}
        actions={<span data-testid="route-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <div className="space-y-4">
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${route.companyId}?onglet=flotte`} className="hover:underline">{route.companyName}</Link>
          </DetailRow>
          <DetailRow label="Origine">{detail.originName}</DetailRow>
          <DetailRow label="Destination">{detail.destinationName}</DetailRow>
          <DetailRow label="Distance">{route.distanceKm} km</DetailRow>
          <DetailRow label="Durée">{Math.floor(route.durationMinutes / 60)} h {String(route.durationMinutes % 60).padStart(2, "0")}</DetailRow>
        </dl></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Bus affectés ({detail.buses.length})</CardTitle></CardHeader>
          <CardContent>
            {detail.buses.length === 0 ? <Empty>Aucun bus affecté à cette ligne.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Plaque</th>
                    <th className="py-1 font-medium">Marque et modèle</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Conducteur</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.buses.map((b) => {
                    const s = busStatusBadge(b.status);
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="py-1.5"><Link href={`/flotte/bus/${b.id}`} className="font-medium hover:underline">{b.plate}</Link></td>
                        <td>{b.brandModel}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td>{b.driverName ?? <span className="text-muted-foreground">Aucun conducteur</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trajets ({detail.trips.length})</CardTitle></CardHeader>
          <CardContent>
            {detail.trips.length === 0 ? <Empty>Aucun trajet sur cette ligne.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Départ</th>
                    <th className="py-1 font-medium">Bus</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Places libres</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.trips.map((t) => {
                    const s = tripStatusBadge(t.status);
                    return (
                      <tr key={t.id} className="border-t border-border">
                        <td className="py-1.5"><Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{formatDateTime(t.departure)}</Link></td>
                        <td>{t.busPlate}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td className="tabular-nums">{t.availableSeats} / {t.totalSeats}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/flotte/lignes/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function RouteNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Ligne introuvable</p>
        <Link href="/flotte/lignes" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Maintenance et fournisseurs**

Créer `src/app/(admin)/flotte/maintenance/maintenance-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { maintenanceCategoryLabel, maintenanceStatusBadge } from "@/lib/labels";
import type { MaintenanceRow } from "@/lib/repos/fleet";

const columns: ColumnDef<MaintenanceRow, unknown>[] = [
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="font-medium">{row.original.busPlate}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "type", header: "Type",
    cell: ({ row }) => <>{row.original.type} <span className="text-xs text-muted-foreground">· {maintenanceCategoryLabel(row.original.category)}</span></>,
  },
  { accessorKey: "vendorName", header: "Fournisseur", cell: ({ row }) => row.original.vendorName ?? "Interne" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = maintenanceStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "scheduledDate", header: "Prévue le", cell: ({ row }) => formatDate(row.original.scheduledDate) },
  { accessorKey: "startedAt", header: "Commencée le", cell: ({ row }) => (row.original.startedAt ? formatDate(row.original.startedAt) : "—") },
  { accessorKey: "completedAt", header: "Terminée le", cell: ({ row }) => (row.original.completedAt ? formatDate(row.original.completedAt) : "—") },
  {
    accessorKey: "totalCost", header: "Coût total",
    cell: ({ row }) => (
      <span className="tabular-nums" title={`Main d'œuvre ${formatMoney(row.original.laborCost, row.original.currency)} + pièces ${formatMoney(row.original.partsCost, row.original.currency)}`}>
        {formatMoney(row.original.totalCost, row.original.currency)}
      </span>
    ),
  },
];

/** A row opens the maintenance tab of its bus. */
export function MaintenanceTable({ maintenances }: { maintenances: MaintenanceRow[] }) {
  return (
    <DataTable
      columns={columns} data={maintenances} rowHref={(m) => `/flotte/bus/${m.busId}?onglet=maintenance`}
      searchPlaceholder="Rechercher une maintenance…" emptyMessage="Aucune maintenance."
    />
  );
}
```

Créer `src/app/(admin)/flotte/maintenance/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { maintenanceRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import type { MaintenanceStatus } from "@/lib/types";
import { MaintenanceTable } from "./maintenance-table";

export const dynamic = "force-dynamic";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const satisfies readonly MaintenanceStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "PLANNED", label: "Planifiées" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function MaintenancePage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  return (
    <>
      <PageHeader title="Maintenance" description="Les interventions sur les bus ; le coût total est la main d'œuvre plus les pièces." />
      <CompanyFilter basePath="/flotte/maintenance" current={companyId} keep={{ statut: status }} />
      <StatusFilterNav basePath="/flotte/maintenance" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId }} />
      <MaintenanceTable maintenances={maintenanceRepo.listRows({ companyId, status })} />
    </>
  );
}
```

Créer `src/app/(admin)/flotte/fournisseurs/vendors-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatMoney } from "@/lib/format";
import { vendorKindLabel } from "@/lib/labels";
import type { VendorRow } from "@/lib/repos/fleet";

const columns: ColumnDef<VendorRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "kind", header: "Type", cell: ({ row }) => vendorKindLabel(row.original.kind) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "interventions", header: "Interventions", cell: ({ row }) => <span className="tabular-nums">{row.original.interventions}</span> },
  {
    accessorKey: "totalCost", header: "Coût cumulé",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.totalCost, row.original.currency)}</span>,
  },
];

export function VendorsTable({ vendors }: { vendors: VendorRow[] }) {
  return <DataTable columns={columns} data={vendors} searchPlaceholder="Rechercher un fournisseur…" emptyMessage="Aucun fournisseur." />;
}
```

Créer `src/app/(admin)/flotte/fournisseurs/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, vendorsRepo } from "@/lib/repos/fleet";
import { VendorsTable } from "./vendors-table";

export const dynamic = "force-dynamic";

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description="Garages, assureurs et fournisseurs de pièces des compagnies. Interventions hors annulées ; coût cumulé des interventions terminées."
      />
      <CompanyFilter basePath="/flotte/fournisseurs" current={companyId} />
      <VendorsTable vendors={vendorsRepo.listRows({ companyId })} />
    </>
  );
}
```

Run: `pnpm typecheck && pnpm test` → 313 tests verts.

- [ ] **Step 4: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, insérer juste avant la ligne `test("no contact e-mail, phone or full IP address reaches the browser in page payloads @prod", async ({ page }) => {` :

```ts
test("routes, stations, fleets, maintenance and vendors are readable lists", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/lignes");
  await page.getByPlaceholder("Rechercher une ligne…").fill("Casamance");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /Dakar → Touba/ }).click();
  await expect(page.getByRole("heading", { name: "Ligne Dakar → Touba" })).toBeVisible();
  await expect(page.getByText("Gare routière de Dakar")).toBeVisible();
  await expect(page.getByRole("link", { name: "DK-1051-AB" })).toBeVisible();
  await expect(page.getByText("Trajets (2)")).toBeVisible();

  await page.goto("/flotte/gares");
  await page.getByPlaceholder("Rechercher une gare…").fill("Casamance");
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await page.goto("/flotte/flottes");
  await expect(page.getByText("12 résultat(s)")).toBeVisible();

  await page.goto("/flotte/fournisseurs");
  await page.getByPlaceholder("Rechercher un fournisseur…").fill("Ziguinchor");
  const vendor = page.getByRole("row", { name: /Garage Central Ziguinchor/ });
  await expect(vendor).toContainText("Garage");
  await expect(vendor).toContainText(/175\s000/);

  await page.goto("/flotte/maintenance?statut=IN_PROGRESS");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /DK-1040-AB/ }).click();
  await expect(page.getByRole("heading", { name: "DK-1040-AB" })).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "MNT-1011" })).toBeVisible();

  await page.goto("/flotte/lignes/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Ligne introuvable")).toBeVisible();
});
```

Run:

```bash
pnpm exec playwright test --project dev -g "readable lists"
git checkout tsconfig.json
```

Expected : 1 test passe.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/flotte/flottes" "src/app/(admin)/flotte/gares" "src/app/(admin)/flotte/lignes" "src/app/(admin)/flotte/maintenance" "src/app/(admin)/flotte/fournisseurs" tests/e2e/backoffice.spec.ts
git commit -m "feat: fleets, stations, routes, maintenance and vendors pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, liens depuis la fiche compagnie, test de fuite `@prod` étendu, README et vérification finale

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `src/components/company/company-tabs.tsx`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 4 à 6.
- Produces: les 8 entrées « Flotte » à `implemented: true` ; `labelForSegment` pour `bus`, `flottes`, `gares`, `lignes`, `trajets`, `plans-de-sieges` (« Plans de sièges »), `maintenance`, `fournisseurs` ; `isLinkablePath` rend `/flotte/bus`, `/flotte/lignes` et `/flotte/trajets` cliquables depuis une fiche (`/flotte` reste non cliquable) ; l'onglet « Flotte et trajets » d'une compagnie lie chaque bus vers `/flotte/bus/<id>` et chaque trajet vers `/flotte/trajets/<id>`.

- [ ] **Step 1: Tests de navigation (échouants)**

Dans `tests/unit/nav.test.ts`, remplacer le test :

```ts
  it("marks only lot 1, lot 2 and lot 3 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual([
      "/", "/acces/permissions", "/acces/roles", "/acces/sessions", "/compagnies", "/compagnies/kyc",
      "/facturation/abonnements", "/facturation/factures", "/facturation/impayes", "/facturation/paiements",
      "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/plans", "/offre/types-documents-kyc",
      "/utilisateurs",
    ]);
  });
```

par :

```ts
  it("marks only lot 1 to lot 4 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual([
      "/", "/acces/permissions", "/acces/roles", "/acces/sessions", "/compagnies", "/compagnies/kyc",
      "/facturation/abonnements", "/facturation/factures", "/facturation/impayes", "/facturation/paiements",
      "/flotte/bus", "/flotte/flottes", "/flotte/fournisseurs", "/flotte/gares", "/flotte/lignes",
      "/flotte/maintenance", "/flotte/plans-de-sieges", "/flotte/trajets",
      "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/plans", "/offre/types-documents-kyc",
      "/utilisateurs",
    ]);
  });
```

et ajouter à la fin du fichier :

```ts
describe("lot 4 breadcrumbs", () => {
  it("links the bus, route and trip lists from their detail pages, not the bare fleet prefix", () => {
    expect(isLinkablePath("/flotte/bus/abc")).toBe(true);
    expect(isLinkablePath("/flotte/lignes/abc")).toBe(true);
    expect(isLinkablePath("/flotte/trajets/abc")).toBe(true);
    expect(isLinkablePath("/flotte/plans-de-sieges")).toBe(true);
    expect(isLinkablePath("/flotte/gares/abc")).toBe(false);
    expect(isLinkablePath("/flotte")).toBe(false);
  });
  it("labels the fleet segments with their accents", () => {
    expect(["flotte", "bus", "flottes", "gares", "lignes", "trajets", "plans-de-sieges", "maintenance", "fournisseurs"]
      .map(labelForSegment)).toEqual([
      "Flotte", "Bus", "Flottes", "Gares", "Lignes", "Trajets", "Plans de sièges", "Maintenance", "Fournisseurs",
    ]);
  });
});
```

Run: `pnpm test tests/unit/nav.test.ts` → FAIL (3 tests : les 8 chemins ne sont pas implémentés ; `/flotte/bus/abc` n'est pas cliquable ; `plans-de-sieges` est libellé « Plans de sieges »).

- [ ] **Step 2: Basculer la navigation**

Dans `src/lib/nav.ts`, remplacer :

```ts
    todo("Bus", "/flotte/bus"),
    todo("Flottes", "/flotte/flottes"),
    todo("Gares", "/flotte/gares"),
    todo("Lignes", "/flotte/lignes"),
    todo("Trajets", "/flotte/trajets"),
    todo("Plans de sièges", "/flotte/plans-de-sieges"),
    todo("Maintenance", "/flotte/maintenance"),
    todo("Fournisseurs", "/flotte/fournisseurs"),
```

par :

```ts
    { label: "Bus", href: "/flotte/bus", implemented: true },
    { label: "Flottes", href: "/flotte/flottes", implemented: true },
    { label: "Gares", href: "/flotte/gares", implemented: true },
    { label: "Lignes", href: "/flotte/lignes", implemented: true },
    { label: "Trajets", href: "/flotte/trajets", implemented: true },
    { label: "Plans de sièges", href: "/flotte/plans-de-sieges", implemented: true },
    { label: "Maintenance", href: "/flotte/maintenance", implemented: true },
    { label: "Fournisseurs", href: "/flotte/fournisseurs", implemented: true },
```

puis remplacer :

```ts
  recherche: "Recherche", roles: "Rôles",
};
```

par :

```ts
  recherche: "Recherche", roles: "Rôles", bus: "Bus", flottes: "Flottes", gares: "Gares", lignes: "Lignes",
  trajets: "Trajets", "plans-de-sieges": "Plans de sièges", maintenance: "Maintenance", fournisseurs: "Fournisseurs",
};
```

et remplacer :

```ts
const ROUTE_PREFIXES = [
  "/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures", "/utilisateurs",
];
```

par :

```ts
const ROUTE_PREFIXES = [
  "/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures", "/utilisateurs",
  "/flotte/bus", "/flotte/lignes", "/flotte/trajets",
];
```

Run: `pnpm test tests/unit/nav.test.ts` → PASS (11 tests). Puis `pnpm test` → **315 tests** verts.

- [ ] **Step 3: Liens depuis l'onglet « Flotte et trajets » d'une compagnie**

Dans `src/components/company/company-tabs.tsx` (onglet `flotte`), remplacer :

```tsx
                  <li key={b.id} className="flex justify-between">{b.plate}{(() => { const badge = busStatusBadge(b.status); return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>; })()}</li>
```

par :

```tsx
                  <li key={b.id} className="flex justify-between">
                    <Link href={`/flotte/bus/${b.id}`} className="hover:underline">{b.plate}</Link>
                    {(() => { const badge = busStatusBadge(b.status); return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>; })()}
                  </li>
```

puis remplacer :

```tsx
                  <li key={t.id} className="flex justify-between"><span>{t.route}</span><span className="text-muted-foreground">{formatDateTime(t.departure)}</span></li>
```

par :

```tsx
                  <li key={t.id} className="flex justify-between">
                    <Link href={`/flotte/trajets/${t.id}`} className="hover:underline">{t.route}</Link>
                    <span className="text-muted-foreground">{formatDateTime(t.departure)}</span>
                  </li>
```

(`Link` est déjà importé dans ce fichier ; le composant reste un Server Component.)

- [ ] **Step 4: Parcours E2E de navigation et test de fuite `@prod` étendu**

Dans `tests/e2e/backoffice.spec.ts`, remplacer intégralement le test `no contact e-mail, phone or full IP address reaches the browser in page payloads @prod` (du `test(` jusqu'à la fin du fichier) par :

```ts
test("the fleet section is navigable and the company fleet tab links each bus and trip", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  const sidebar = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(sidebar.getByRole("link", { name: "Plans de sièges" })).not.toContainText("bientôt");
  await expect(page.getByRole("navigation", { name: "Fil d'Ariane" })).toContainText("Flotte");

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Flotte et trajets" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "DK-1050-AB" }).click();
  await expect(page.getByRole("heading", { name: "DK-1050-AB" })).toBeVisible();
  const crumbs = page.getByRole("navigation", { name: "Fil d'Ariane" });
  await expect(crumbs.getByRole("link", { name: "Bus" })).toHaveAttribute("href", "/flotte/bus");
  await expect(crumbs.getByRole("link", { name: "Flotte" })).toHaveCount(0);

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Flotte et trajets" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "Ziguinchor → Dakar" }).click();
  await expect(page.getByRole("heading", { name: "Trajet Ziguinchor → Dakar" })).toBeVisible();
});

test("no contact e-mail, phone or full IP address reaches the browser in page payloads @prod", async ({ page }) => {
  await login(page);

  async function detailPath(listPath: string, search: string, placeholder: string, row: RegExp): Promise<string> {
    await page.goto(listPath);
    await page.getByPlaceholder(placeholder).fill(search);
    await page.getByRole("row", { name: row }).first().click();
    await expect(page).not.toHaveURL(new RegExp(`${listPath}$`));
    return new URL(page.url()).pathname;
  }

  const companyPath = await detailPath("/compagnies", "matam", "Rechercher une compagnie…", /Matam Express/);
  const planPath = await detailPath("/offre/plans", "Enterprise", "Rechercher un plan…", /Enterprise/);
  const subscriptionPath = await detailPath("/facturation/abonnements", "matam", "Rechercher un abonnement…", /Matam Express/);
  const invoicePath = await detailPath("/facturation/factures", "matam", "Rechercher une facture…", /Matam Express/);
  const employeeUserPath = await detailPath("/utilisateurs", "khady-faye.matam", "Rechercher un utilisateur…", /khady-faye\.matam-express/);
  const adminUserPath = await detailPath("/utilisateurs", "moustapha", "Rechercher un utilisateur…", /moustapha\.ndiaye/);
  const clientUserPath = await detailPath("/utilisateurs", "lamine", "Rechercher un utilisateur…", /lamine\.camara/);
  const busPath = await detailPath("/flotte/bus", "DK-1022", "Rechercher un bus…", /DK-1022-AB/);
  const routePath = await detailPath("/flotte/lignes", "Casamance", "Rechercher une ligne…", /Dakar → Touba/);
  const tripPath = await detailPath("/flotte/plans-de-sieges", "DK-1022", "Rechercher un plan de sièges…", /DK-1022-AB/);
  const casamancePath = await detailPath("/compagnies", "casamance", "Rechercher une compagnie…", /Casamance Trans/);

  const CONTACT_EMAIL = /contact@[a-z0-9-]+\.sn/;
  const ANY_SN_EMAIL = /[a-z0-9._-]+@[a-z0-9-]+\.sn/;
  const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/];
  // Seed session addresses start with 41.82 or 196.207 and never end in 0: only a.b.c.0 may appear.
  const FULL_IP = /\b(?:41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/;
  const paths = [
    "/compagnies", "/compagnies?statut=draft", "/compagnies/kyc", "/", companyPath, `${companyPath}?onglet=equipe`,
    "/offre/plans", planPath, "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/types-documents-kyc",
    "/facturation/abonnements", "/facturation/abonnements?statut=past_due", subscriptionPath,
    "/facturation/paiements", "/facturation/paiements?statut=failed",
    "/facturation/factures", invoicePath, "/facturation/impayes",
    "/utilisateurs", "/utilisateurs?role=ADMIN", "/utilisateurs?statut=suspended",
    employeeUserPath, `${employeeUserPath}?onglet=sessions`, adminUserPath, `${clientUserPath}?onglet=sessions`,
    "/acces/roles", "/acces/permissions", "/acces/sessions", "/acces/sessions?role=USER",
    "/flotte/bus", "/flotte/bus?conducteur=sans", "/flotte/bus?statut=maintenance", busPath,
    `${busPath}?onglet=equipage`, `${busPath}?onglet=maintenance`, `${busPath}?onglet=trajets`,
    "/flotte/flottes", "/flotte/gares", "/flotte/lignes", routePath, "/flotte/trajets", "/flotte/trajets?statut=boarding",
    tripPath, "/flotte/plans-de-sieges", "/flotte/maintenance", "/flotte/maintenance?statut=IN_PROGRESS",
    "/flotte/fournisseurs", `${casamancePath}?onglet=flotte`,
  ];
  for (const path of paths) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(raw, `raw ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(raw, `raw ${path}`).not.toMatch(re);
    expect(raw, `raw ${path}`).not.toMatch(FULL_IP);
    await page.goto(path);
    const rendered = await page.content();
    expect(rendered, `dom ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(rendered, `dom ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(rendered, `dom ${path}`).not.toMatch(re);
    expect(rendered, `dom ${path}`).not.toMatch(FULL_IP);
  }
  // The pages are really rendered (the negative checks above would pass on an empty page).
  await page.goto("/acces/sessions");
  await expect(page.getByRole("cell", { name: /^(41\.82|196\.207)\.\d{1,3}\.0$/ }).first()).toBeVisible();
  await page.goto(employeeUserPath);
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
  await page.goto(`${busPath}?onglet=equipage`);
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Babacar Seck");
  await page.goto(tripPath);
  await expect(page.getByRole("list", { name: "Plan de sièges" }).locator("[data-seat]")).toHaveCount(29);
});
```

Les quatre assertions positives finales empêchent le test de passer sur des pages vides ; `ANY_SN_EMAIL` et `PHONES` couvrent toutes les données personnelles de la graine, et l'équipage n'en a aucune. Le bus `DK-1022-AB`, la ligne « Dakar → Touba » de Casamance Trans et le trajet ouvert depuis la liste des plans de sièges ne sont mutés par aucun test.

- [ ] **Step 5: README**

Dans `README.md` :

1. Remplacer la phrase `Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Données statiques typées, aucun appel réseau.` par :

```markdown
Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Lot 4 : flotte (bus, flottes, gares, lignes, trajets, plans de sièges, maintenance, fournisseurs) en lecture seule, plus la mise hors service d'un bus. Données statiques typées, aucun appel réseau.
```

2. Dans la puce `src/lib/actions/run.ts`, remplacer `` `utilisateurs/actions.ts` et `acces/actions.ts` ; `` par `` `utilisateurs/actions.ts`, `acces/actions.ts` et `flotte/actions.ts` ; ``.

3. Ajouter, juste avant la puce `src/lib/auth` (celle qui commence par « jeton HMAC »), la puce :

```markdown
- `src/lib/repos/fleet.ts` : gares, lignes, flottes, fournisseurs, bus, équipage, trajets, plans de sièges et maintenances. Les échéances (assurance, contrôle technique, carte grise) sont calculées contre la date de référence injectée (« expirée » avant, « bientôt » dans les 30 jours). La mise hors service d'un bus exige un motif et est refusée si le bus l'est déjà, si une maintenance est en cours ou s'il a un trajet planifié ou en embarquement. Les composants clients ne reçoivent que des projections (`BusRow`, `TripRow`, `SeatMapRow`, `MaintenanceRow`, `VendorRow`, `FleetRow`, `StationRow`, `RouteRow`) ou des scalaires ; l'équipage n'y figure que par son nom.
```

4. Remplacer le titre `## Limites connues (lots 1 à 3)` par `## Limites connues (lots 1 à 4)`, et remplacer la puce `- Les sections autres que Vue 360, Compagnies, Offre, Facturation, Utilisateurs et accès affichent « Bientôt disponible ».` par :

```markdown
- Flotte en lecture seule hors « Mettre hors service » : pas de remise en service d'un bus hors service, affectations d'équipage non modifiables, aucune création ni modification de flotte, bus, ligne, gare ou trajet, ni démarrage, clôture ou annulation de maintenance.
- L'équipage est un registre du backoffice sans compte, sans e-mail ni téléphone (côté plateforme, les affectations pointent des employés de `hr-service`) ; il n'existe pas de fiche employé vers laquelle le lier.
- Les états des sièges sont figés par la graine (pas de réservation en direct) ; aucune alerte d'échéance automatique, pas de GPS ni de suivi en temps réel.
- Les sections autres que Vue 360, Compagnies, Offre, Facturation, Utilisateurs et accès, Flotte affichent « Bientôt disponible ».
```

- [ ] **Step 6: Revue de sécurité des frontières serveur → client**

Pour chaque composant client ajouté par le lot, vérifier dans le code que ses props correspondent exactement à cette liste, que les imports depuis `@/lib/repos/fleet` sont des `import type`, et qu'aucun n'importe `getStore`, un dépôt ou `@/lib/data/seed` :

| Composant client | Props reçues |
|---|---|
| `BusesTable` | `BusRow[]` (12 clés, nom du conducteur seulement) |
| `TripsTable` | `TripRow[]` (14 clés) |
| `SeatMapsTable` | `SeatMapRow[]` (12 clés, compteurs seulement) |
| `FleetsTable` | `FleetRow[]` (6 clés) |
| `StationsTable` | `StationRow[]` (6 clés) |
| `RoutesTable` | `RouteRow[]` (9 clés) |
| `MaintenanceTable` | `MaintenanceRow[]` (17 clés) |
| `VendorsTable` | `VendorRow[]` (8 clés) |
| `RetireBusButton` | `busId`, `plate` |

`BusTabs`, `SeatMap`, `CrewList`, `ExpiryBadge`, `CompanyFilter` et les `page.tsx` sont des Server Components.

Run :

```bash
grep -rn 'from "@/lib/repos/fleet"' src | grep -v "import type"
grep -rlE '^"use client"' src | xargs grep -lE 'getStore|lib/data/seed|[a-zA-Z]+Repo\.'
```

La première commande ne doit lister que des `page.tsx` de `src/app/(admin)/flotte`, `src/app/(admin)/flotte/actions.ts`, `src/components/fleet/company-filter.tsx` (Server Component) et `src/lib/repos/companies.ts`. La seconde ne doit rien afficher (code de sortie 1). Si une ligne contredit le tableau, corriger le composant (projection), pas le tableau.

- [ ] **Step 7: Vérification complète**

Run:

```bash
pnpm typecheck && pnpm test && pnpm build
git checkout tsconfig.json
pnpm e2e
git checkout tsconfig.json
git status --short
```

Expected :
- typecheck OK ;
- Vitest : **315 tests** verts ;
- build OK : `/flotte/bus`, `/flotte/bus/[id]`, `/flotte/flottes`, `/flotte/gares`, `/flotte/lignes`, `/flotte/lignes/[id]`, `/flotte/trajets`, `/flotte/trajets/[id]`, `/flotte/plans-de-sieges`, `/flotte/maintenance` et `/flotte/fournisseurs` apparaissent comme dynamiques `ƒ` ;
- Playwright : **34 tests** passent (33 sur le projet `dev`, 1 sur le projet `prod`) ;
- `git status --short` ne montre ni `tsconfig.json` ni `next-env.d.ts`.

Si un sélecteur échoue, corriger le **composant** (libellé accessible, `data-testid`) plutôt que le test, sauf faute manifeste dans le test.

- [ ] **Step 8: Vérification visuelle (clair et sombre)**

`pnpm dev`, se connecter, parcourir dans les deux thèmes : `/flotte/bus` (les trois groupes de filtres combinés, par exemple `?statut=active&conducteur=sans`), la fiche de `DK-1050-AB` (4 onglets, badges d'échéance, dialogue « Mettre hors service » sans confirmer), un trajet en embarquement (plan de sièges : grille lisible, symboles visibles, légende ; contraste des quatre états en sombre), `/flotte/plans-de-sieges`, `/flotte/lignes` et une fiche de ligne, `/flotte/maintenance?statut=IN_PROGRESS`, `/flotte/fournisseurs`, l'onglet « Flotte et trajets » de Casamance Trans. Vérifier : la barre latérale n'affiche plus « bientôt » dans la section « Flotte » ; le fil d'Ariane d'une fiche de bus (« Accueil › Flotte › Bus › Fiche ») rend « Bus » cliquable et « Flotte » non cliquable ; douze pastilles de compagnie passent à la ligne sans défilement horizontal de la page. Arrêter le serveur.

- [ ] **Step 9: Commit final**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts src/components/company/company-tabs.tsx tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable fleet navigation, link the company fleet tab, extend the payload leak test

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Limites connues du lot 4

- Lecture seule hors « Mettre hors service » : pas de remise en service d'un bus `retired`, pas de modification des affectations, ni création ni modification de flotte, bus, ligne, gare, trajet ou maintenance.
- L'équipage est un registre sans compte (divergence assumée avec `hr-service`, voir le spec) ; aucun lien vers une fiche d'employé, qui n'existe pas dans le backoffice.
- États des sièges figés par la graine ; un bus hors service garde ses éventuels trajets passés et ses plans de sièges (aucun nettoyage).
- Aucune alerte automatique d'échéance : les badges sont recalculés à chaque affichage contre la date du serveur.
- La graine de flotte est construite une fois : une compagnie activée ensuite (KYC ou activation forcée) n'a ni bus ni gare et n'apparaît pas dans les filtres de compagnie.
- Pas de verrou : deux administrateurs qui mettent le même bus hors service en même temps, le second reçoit « Ce bus est déjà hors service » (store en mémoire, un seul processus).

---

## Auto-revue

### Couverture du spec

| Exigence du spec | Tâche |
|---|---|
| 8 écrans, entrées `implemented: true`, filtre `?compagnie=` sur toutes les listes, recherche côté client, filtres qui conservent les autres | 4, 5, 6 (pages), 7 (navigation) ; décision 4 |
| `/flotte/bus` : plaque, code, marque et modèle, compagnie, flotte, ligne, statut, capacité, équipage, prochaine maintenance ; filtres compagnie, statut, « sans conducteur affecté » | 2 (`BusRow`, `listRows`), 4 |
| `/flotte/bus/[id]` : onglets Caractéristiques, Équipage, Maintenance, Trajets et sièges ; « Mettre hors service » | 2 (`BusDetail`), 3, 4 |
| `/flotte/flottes`, `/flotte/gares`, `/flotte/lignes` (+ fiche), `/flotte/maintenance`, `/flotte/fournisseurs` avec leurs colonnes | 2, 6 ; décisions 7 et 12 |
| `/flotte/trajets` (+ fiche avec horaires, prix, places, bus, équipage, plan de sièges visuel), filtre par statut | 2, 5 |
| `/flotte/plans-de-sieges` : bus, trajet, sièges, libres, réservés, occupés ; lien vers le trajet | 2, 5 |
| Types `Station`, `Route`, `Fleet`, `Vendor`, `Bus` (toutes les caractéristiques), `Trip`, `SeatMap`, `BusMaintenance`, `CrewMember` ; `FleetBus`/`FleetTrip` remplacés par des projections compatibles | 1 ; décision 5 |
| Graine : compagnies actives, 2-4 gares, 2-3 lignes, 1 flotte, 1-2 fournisseurs, bus = `usedBuses` plafonné et ≥ 2, ≤ 2 trajets par bus, un plan par trajet, bus en maintenance avec maintenance en cours, un bus `retired`, 0-3 affectations dont un bus sans conducteur par compagnie, un membre par bus, quatre statuts de maintenance, échéances réparties | 1 (`fleet-seed.test.ts`) ; décisions 1, 6 à 10 |
| Mettre hors service : motif rogné ≤ 500, ordre des gardes, effets (`retiredAt`, activité, `nextMaintenanceDate` et équipage conservés) | 2 (règle et preuves), 3 (action), 4 (UI et E2E) ; décision 2 |
| Échéances « expirée » / « bientôt » (30 jours) avec date injectée | 2 (`expiryState`, `daysUntil`, preuves 7 et 8), 4 (`ExpiryBadge`) ; décision 3 |
| Plan de sièges : compteurs depuis `seats`, `availableSeats` = libres, `blocked` hors compteurs ; grille CSS, `data-seat`, `data-state`, libellé accessible, symbole, légende | 1, 2 (preuve 11), 5 |
| Listes sans identifiant d'employé (nom seulement) ; aucune donnée personnelle côté client | 2 (`Object.keys`, preuve 10), 7 (revue et `@prod`) |
| Architecture : `src/lib/repos/fleet.ts`, `flotte/actions.ts`, `components/fleet/{bus-tabs,seat-map,retire-bus-button,expiry-badge}` | 2, 3, 4, 5 |
| Fil d'Ariane (`flotte`, `bus`, `flottes`, `gares`, `lignes`, `trajets`, `plans-de-sieges`, `maintenance`, `fournisseurs`) ; liens depuis l'onglet Flotte de la fiche compagnie ; Vue 360 inchangée | 7 |
| Vitest : dépôts, filtres, projections, sièges, coût total, échéances, règle (une garde = un test), action, cohérence de la graine, aucune donnée personnelle dans `CrewMember` ni dans l'activité | 1, 2, 3 |
| Playwright : filtre compagnie, caractéristiques et équipage, « sans conducteur », plan de sièges (états, légende), mise hors service avec motif, refus maintenance, refus trajet à venir, `@prod` étendu | 4, 5, 6, 7 |
| Limites reportées au README | 7 |

### Recherche de trous

Aucun « TBD », « TODO », « similaire à » ni étape sans code. Chaque étape de code donne le fichier complet ou le bloc exact à remplacer avec son ancre textuelle (Task 1 Steps 1 et 3 pour `types/index.ts`, `seed.ts`, `companies.ts`, `labels.ts`, `company-tabs.tsx` ; Task 4 Step 2 pour `labels.ts` ; Task 7 Steps 1 à 3 pour `nav.test.ts`, `nav.ts`, `company-tabs.tsx` ; Task 7 Step 5 pour le README). Les blocs de ce plan ont été extraits des fichiers de la copie de pré-validation, et les remplacements de la Task 1 et de la Task 7 ont été rejoués par programme sur les fichiers de `main` pour vérifier qu'ils redonnent exactement les fichiers validés.

### Cohérence des noms et des types

- `BusStatus`/`TripStatus` (Task 1) → `FleetBus`/`FleetTrip` (projections, Task 1) → `busStatusBadge` (Task 1) → `company-tabs.tsx` (Tasks 1 et 7).
- `companyFleetSummary`, `routeLabel` (Task 1, conservées telles quelles par la Task 2) → `companiesRepo.detail` (Task 1).
- `expiryState`, `daysUntil`, `EXPIRY_SOON_DAYS` (Task 2) → `BusExpiry` (Task 2) → `expiryBadge(state, daysLeft)` (Task 4) → `ExpiryBadge` → `BusTabs` (`data-testid="expiry-insurance"`) → E2E (Task 4).
- `seatCounts`, `SeatMapView` (Task 2) → `SeatMap` (Task 5) → `data-testid="seat-count-<état>"` → E2E (Task 5) ; `seatStateLabel` (Task 4) → libellé « Siège 1B, réservé ».
- `CREW_ROLES`, `CrewAssignment` (Task 2) → `CrewList` (`data-testid="crew-DRIVER"`, Task 4) → `BusTabs` (Task 4), fiche trajet (Task 5) → E2E (Tasks 4, 5, 7).
- `busesRepo.retire` et ses messages (Task 2) → `retireBus` (Task 3) → `RetireBusButton` (Task 4) → alertes du dialogue en E2E (Task 4).
- `fleetCompanies`, `parseCompanyFilter` (Task 2) → `CompanyFilter` (Task 4) → toutes les pages de liste (Tasks 4 à 6).
- `filterHref` / `StatusFilterNav` (`param`, `keep`, lot 3) → pages bus, trajets, maintenance.
- Libellés accessibles attendus par l'E2E et produits par les composants : placeholders `Rechercher un bus…`, `Rechercher un trajet…`, `Rechercher un plan de sièges…`, `Rechercher une ligne…`, `Rechercher une gare…`, `Rechercher une flotte…`, `Rechercher un fournisseur…`, `Rechercher une maintenance…` ; navigations `Filtrer par compagnie`, `Filtrer par statut`, `Filtrer par conducteur`, `Navigation principale`, `Fil d'Ariane` ; bouton et confirmation `Mettre hors service`, `Annuler` ; champ `Motif (obligatoire)` ; onglets `Caractéristiques`, `Équipage`, `Maintenance`, `Trajets et sièges`, `Flotte et trajets` (lot 1), `Activité` (lot 1) ; listes `Plan de sièges`, `Légende du plan de sièges` ; `data-testid` `bus-status`, `trip-status`, `trip-available`, `route-status`, `crew-<RÔLE>`, `expiry-<clé>`, `seat-count-<état>` ; textes `Bus introuvable`, `Trajet introuvable`, `Ligne introuvable`, `Aucun conducteur`, `Non affecté`, `Aucun bus.`.
- Versions vérifiées dans `node_modules` : `@tanstack/react-table` 8.21.3, `next` 15.5, `react` 19.3, `vitest` 5.0.5. Tailwind v4 fournit `size-5` et les opacités `bg-info/15`.

### Pré-validation

Le code de ce plan a été appliqué dans une copie jetable du dépôt (`/private/tmp/claude-501/lot4-validate`, `node_modules` partagé par lien symbolique), une tâche par commit, puis chaque commit a été extrait seul pour vérifier qu'il compile et passe : `tsc --noEmit` sans erreur à chaque tâche, **Vitest 272, 306, 310, 313, 313, 313, 315** (T1 à T7), `next build` réussi, et Playwright **34 tests** passés (33 `dev` + 1 `prod`, `pnpm e2e` complet en 2,3 min). Les mutations des étapes « Prouver » (Tasks 1, 2 et 3) ont été exécutées : chacune fait échouer exactement les tests nommés, et la restauration rend la suite verte. Défauts trouvés par cette pré-validation et corrigés dans le plan : (1) la mutation « embarquement » survivait, car le bus `DK-1022-AB` a aussi un trajet planifié : le test rend d'abord ce trajet « parti » ; (2) le premier calcul des jours (`ceil` vers l'extérieur) affichait « 13 j » quelques secondes après le démarrage pour une échéance à –12 jours : arrondi au jour le plus proche (décision 3) ; (3) le test du plan de sièges cliquait une ligne pendant la navigation client d'un filtre et voyait deux lignes (décision 17) ; (4) des maintenances attribuées à l'assureur ont été rendues au garage (décision 7) ; (5) la fiche d'un bus affichait le prix d'achat dans la devise du premier trajet : `BusDetail.currency` (décision 16) ; (6) un `pnpm typecheck` lancé après un `pnpm dev` sur un autre état du dépôt échouait sur `.next/types` (contrainte globale ajoutée).
