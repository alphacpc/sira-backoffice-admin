# Backoffice Sira, lot 6 : colis et clients. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les quatre entrées « Bientôt disponible » de la section « Colis et clients » par de vraies pages sur données statiques typées : colis (liste et fiche à trois onglets avec itinéraire et historique), comptes clients (liste et fiche à cinq onglets), programmes de fidélité et avis (liste et fiche), avec deux actions serveur : « Déclarer le colis perdu » et « Ignorer l'avis » (motif obligatoire), plus la révélation journalisée du téléphone d'un destinataire de colis.

**Architecture:** Même socle que les lots 1 à 5. Neuf collections rejoignent le store (`parcels`, `parcelLegs`, `parcelHistory`, `customers`, `loyaltyPrograms`, `loyaltyAccounts`, `loyaltyTransactions`, `sponsorships`, `feedbacks`) ; trois graines (`seedCustomers`, `seedParcels`, `seedFeedbacks`) les dérivent des comptes clients (lot 3), des réservations (lot 5) et des trajets (lot 4). Deux dépôts : `src/lib/repos/parcels.ts` et `src/lib/repos/clients.ts`. Les pages sont des Server Components ; chaque liste est un `DataTable` client qui ne reçoit qu'une projection. Les actions passent par `run()` / `runReveal()`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21, Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4 et 5 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ** (le plan ne les fige pas). Le lot 4 fournit `routeLabel`, `fleetCompanies`, `parseCompanyFilter` (`src/lib/repos/fleet.ts`), le composant `CompanyFilter` (`src/components/fleet/company-filter.tsx`), les types `Station`, `Route`, `Trip`. Le lot 5 fournit `Booking` (`userId`, `channel`, `paymentStatus`, `amount`, `createdAt`, `bookingCode`, `tripId`, `companyId`), la fonction `hashCode(prefix, n)` de `src/lib/data/seed.ts` (non exportée, utilisable dans le même fichier) et la liste `CLIENTS`/la constante `PEOPLE`. **Vérifier ces noms par `grep` avant de commencer** et adapter le plan s'ils ont changé.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : `declareParcelLost` et `ignoreFeedback` passent par `run()`, `revealParcelRecipientPhone` par `runReveal()` (session vérifiée **avant** toute lecture ou écriture). Elles renvoient un `ActionResult` / `RevealResult` et ne lèvent jamais d'exception pour un échec attendu.
- Action sensible : confirmation + **motif obligatoire**, rogné, **500 caractères au plus** (`requireReason` : `"Motif trop long (500 caractères maximum)"`), jamais tronqué.
  - `declareLost` : colis existant (`"Colis introuvable"`) → motif (`"Un motif est obligatoire"`) → pas clos (`"Ce colis est déjà clos"` : `DELIVERED`, `CANCELLED`, `RETURNED`, `LOST`) → pas en attente (`"Un colis en attente ne peut pas être déclaré perdu"`). Effets : `LOST`, une ligne d'historique (`notes` = motif, `changedBy` = acteur), activité `Colis <code> déclaré perdu. Motif : <motif>`.
  - `ignore` : avis existant (`"Avis introuvable"`) → motif → statut `PENDING` ou `REVIEWED` (`"Cet avis est déjà traité"`). Effets : `IGNORED`, activité `Avis « <titre> » ignoré. Motif : <motif>`.
- Le journal d'activité ne contient jamais d'e-mail, de téléphone ni d'objet métier complet.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `Parcel`, `Customer`, `Feedback` ni un `*Detail` ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. `recipientPhone` ne quitte le serveur que masqué (`maskPhone`) ou par l'action de révélation. Les imports depuis `@/lib/repos/parcels` et `@/lib/repos/clients` dans un composant client sont des `import type`. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Pas de `rowHref` sur un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (aucune ici : les boutons sont sur les fiches).
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, motif ≤ 500, chaque garde de `declareLost` et de `ignore`, leur ordre, projections sans téléphone, révélation journalisée avant la valeur) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création ou modification de colis, jambes, documents ; réponse aux avis ; dépense de points, palier ; marketing ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Identifiants** : préfixes `uid(41, …)` colis, `uid(42, …)` jambes, `uid(43, …)` historique, `uid(44, …)` clients, `uid(45, …)` programmes, `uid(46, …)` comptes de fidélité, `uid(47, …)` mouvements, `uid(48, …)` parrainages, `uid(49, …)` avis (les préfixes jusqu'à 34 sont pris ; vérifier par `grep -n "uid(4[1-9]" src/lib/data/seed.ts` : aucune occurrence attendue).
2. **Ordre de la graine** : dans `buildSeed`, après `seedSales(store, now, iso)` : `seedCustomers`, puis `seedParcels`, puis `seedFeedbacks` (les avis ont besoin des clients, des réservations et des colis).
3. **Dérivation des points** : une transaction de fidélité par réservation **en ligne, confirmée et payée** d'un client, si la compagnie a un programme `ACTIVE` ; points = `floor(montant × 0,01)` ; compte unique par (client, compagnie). Le palier du compte est attribué en rotation (`REGULAR`, `VIP`, `PREMIUM`) : aucun calcul de palier n'existe dans `customer-service`.
4. **Colis** : 0 à 2 colis par trajet (`ti % 3`), 2 ou 3 (`2 + ti % 2`) sur un trajet parti pour que les six statuts de la rotation soient tous présents. Statuts : trajet annulé → `CANCELLED`, planifié → `PENDING`, en embarquement → `PENDING` ou `IN_TRANSIT` en alternance, parti → rotation `DELIVERED, DELIVERED, IN_TRANSIT, AT_HUB, LOST, RETURNED`. Les colis `AT_HUB` n'ont qu'une jambe (la deuxième jambe est ce qui les ferait repartir ; non semée).
5. **Colis à deux jambes** : un colis `DELIVERED` sur deux trajets (`j === 0` et `ti % 4 === 0`) reçoit une deuxième jambe sur un autre trajet de la même compagnie (s'il en existe un) et l'historique `PENDING → IN_TRANSIT → AT_HUB → IN_TRANSIT → DELIVERED`.
6. **Téléphone du destinataire** : `+2217713` + 5 chiffres (`10000 + (n × 37) % 80000`). Le préfixe est nouveau : le test `@prod` ajoute `/\+2217713\d{5}/` à ses expressions de téléphone.
7. **Scénarios** attribués après génération : « Dior Kébé » au premier colis `IN_TRANSIT`, « Gorgui Sall » au premier `PENDING`, « Yacine Ndoye » au premier `DELIVERED` ; avis « Climatisation en panne pendant le trajet » au premier avis `PENDING`, « Service impeccable au guichet » au premier `RESOLVED`.
8. **Avis** : pour chaque client, un avis `TRIP` par réservation payée (4 au plus, les plus anciennes), un avis `PARCEL` pour son premier colis envoyé s'il existe, un avis `SERVICE` rattaché à la compagnie de sa première réservation payée. Statut en rotation `PENDING, PENDING, REVIEWED, RESOLVED, IGNORED` (sur le rang d'avis), note en rotation `5, 4, 2, 1, 3` sur `(rang × 3) % 5`. Un avis `RESOLVED` a une réponse et une date de réponse.
9. **Fiches ajoutées au sitemap** : `/clients/comptes/[id]` et `/clients/avis/[id]`. Le fil d'Ariane les rend cliquables (`ROUTE_PREFIXES`).
10. **Statut du compte** : `userStatus` d'un client est celui de son compte utilisateur (`active` ou `suspended`) ; un client suspendu garde ses comptes de fidélité.
11. **Test E2E du lot 1 `unimplemented sections show a coming-soon page`** : le lot 5 l'a fait pointer sur `/colis` ; il pointe désormais sur `/communication/notifications`.
12. **Pastilles** : colis « Tous / En attente / En transit / Au hub / Livrés / Annulés / Retournés / Perdus » ; avis « Tous / En attente / Examinés / Résolus / Ignorés ».

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `an in-transit parcel is declared lost with a mandatory reason` | destinataire « Dior Kébé » | `LOST`, une ligne d'historique, une entrée d'activité |
| `a pending parcel cannot be declared lost` | destinataire « Gorgui Sall » | lecture seule (refus) |
| `a delivered parcel cannot be declared lost` | destinataire « Yacine Ndoye » | lecture seule (refus) |
| `a recipient phone is revealed on demand` | destinataire « Yacine Ndoye » | une entrée d'activité (aucune mutation du colis) |
| `a pending review is ignored with a mandatory reason` | avis « Climatisation en panne pendant le trajet » | `IGNORED`, une entrée d'activité |
| `a resolved review cannot be ignored` | avis « Service impeccable au guichet » | lecture seule (refus) |

Les autres tests sont en lecture seule.

## Carte des fichiers

```
src/lib/types/index.ts                        (modifié) colis, clients, fidélité, parrainage, avis + unions
src/lib/data/seed.ts                          (modifié) Store étendu, seedCustomers, seedParcels, seedFeedbacks
src/lib/repos/parcels.ts                      (créé)   colis : lecture, détail, perte, révélation
src/lib/repos/clients.ts                      (créé)   clients, fidélité, avis : lecture, détail, ignorer
src/lib/labels.ts                             (modifié) badges et libellés
src/app/(admin)/colis/actions.ts              (créé)   declareParcelLost, revealParcelRecipientPhone
src/app/(admin)/clients/actions.ts            (créé)   ignoreFeedback
src/components/parcels/{parcel-tabs,declare-lost-button,recipient-phone-field}.tsx   (créés)
src/components/clients/{customer-tabs,ignore-feedback-button}.tsx                    (créés)
src/app/(admin)/colis/{page,parcels-table}.tsx, colis/[id]/{page,not-found}.tsx      (créés)
src/app/(admin)/clients/comptes/{page,customers-table}.tsx, comptes/[id]/{page,not-found}.tsx   (créés)
src/app/(admin)/clients/fidelite/{page,programs-table}.tsx                           (créés)
src/app/(admin)/clients/avis/{page,feedback-table}.tsx, avis/[id]/{page,not-found}.tsx          (créés)
src/lib/nav.ts                                (modifié) 4 entrées implémentées, libellés, préfixes
tests/unit/{clients-seed,parcels-seed,parcels-repo,clients-repo,parcels-rules,feedback-rules,parcel-client-actions}.test.ts   (créés)
tests/unit/{labels,nav}.test.ts               (modifiés)
tests/e2e/backoffice.spec.ts                  (modifié)
README.md                                     (modifié)
```

---
### Task 1: Types et graine des clients (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`
- Create: `tests/unit/clients-seed.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)`, `uid`, `iso`, `hashCode` (lot 5), `CLIENTS`, `store.users` (comptes clients créés avant `seedSales`), `store.companies`, `store.bookings` (lot 5).
- Produces: types ci-dessous ; `Store` : `customers`, `loyaltyPrograms`, `loyaltyAccounts`, `loyaltyTransactions`, `sponsorships` (et, ajoutés vides ici et remplis aux Tasks 2 : `parcels`, `parcelLegs`, `parcelHistory`, `feedbacks`).

- [ ] **Step 1: Types**

Ajouter à la fin de `src/lib/types/index.ts` :

```ts
export type ParcelStatus = "PENDING" | "IN_TRANSIT" | "AT_HUB" | "DELIVERED" | "CANCELLED" | "RETURNED" | "LOST";
export type ParcelType = "DOCUMENT" | "PACKAGE" | "FRAGILE" | "PERISHABLE" | "OTHER";
export type ParcelPaymentStatus = "PENDING" | "PAID" | "REFUNDED";

/** Parcel (`parcel-service`). `recipientPhone` never leaves the server unmasked. */
export interface Parcel {
  id: string; companyId: string; parcelCode: string; trackingNumber: string;
  senderName: string; senderCustomerId: string | null;
  recipientName: string; recipientPhone: string;
  weightKg: number; parcelType: ParcelType; description: string;
  tripId: string; originStationId: string; destinationStationId: string;
  pickupAt: string; expectedDeliveryAt: string; actualDeliveryAt: string | null;
  status: ParcelStatus; shippingFee: number; currency: string; paymentStatus: ParcelPaymentStatus;
  createdAt: string;
}

/** One trip a parcel is assigned to (a parcel going through a hub has two). */
export interface ParcelLeg {
  id: string; parcelId: string; companyId: string; tripId: string; assignmentCode: string; sequence: number;
}

export interface ParcelHistoryEntry {
  id: string; parcelId: string; previousStatus: ParcelStatus | null; newStatus: ParcelStatus;
  notes: string | null; changedBy: string | null; changedAt: string;
}

export type MembershipType = "REGULAR" | "VIP" | "PREMIUM";

/** Client profile (`customer-service`). Points and tier live on the per-company loyalty account. */
export interface Customer {
  id: string; userId: string; name: string; isCorporate: boolean;
  sponsorshipId: string | null; sponsoredAt: string | null; createdAt: string;
}

export type LoyaltyProgramStatus = "ACTIVE" | "INACTIVE";

export interface LoyaltyProgram {
  id: string; companyId: string; name: string; pointsPerCurrencyUnit: number; redemptionRate: number;
  minPointsForRedemption: number; status: LoyaltyProgramStatus; createdAt: string;
}

export interface LoyaltyAccount {
  id: string; customerId: string; companyId: string; points: number; membershipType: MembershipType; createdAt: string;
}

export interface LoyaltyTransaction {
  id: string; accountId: string; bookingId: string; points: number; createdAt: string;
}

export type SponsorshipRewardType = "DISCOUNT" | "LOYALTY_POINTS" | "CASH";
export type SponsorshipStatus = "ACTIVE" | "REDEEMED" | "EXPIRED";

export interface Sponsorship {
  id: string; companyId: string; sponsorCustomerId: string; code: string;
  rewardType: SponsorshipRewardType; rewardValue: number; status: SponsorshipStatus;
  createdAt: string; expiresAt: string;
}

export type FeedbackType = "TRIP" | "BUS" | "STATION" | "SERVICE" | "PARCEL";
export type FeedbackStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "IGNORED";

export interface Feedback {
  id: string; companyId: string; customerId: string;
  tripId: string | null; parcelId: string | null; bookingId: string | null;
  rating: number; feedbackType: FeedbackType; title: string; comment: string;
  status: FeedbackStatus; response: string | null; respondedAt: string | null; createdAt: string;
}
```

- [ ] **Step 2: Écrire le test de graine des clients (rouge)**

Créer `tests/unit/clients-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

describe("customers seed", () => {
  it("creates one customer per client account, only the last one corporate", () => {
    const s = getStore();
    expect(s.customers).toHaveLength(4);
    for (const c of s.customers) {
      const user = s.users.find((u) => u.id === c.userId)!;
      expect(user.roleCode).toBe("USER");
      expect(c.name).toBe(user.displayName);
      expect(c.createdAt).toBe(user.createdAt);
    }
    expect(s.customers.map((c) => c.isCorporate)).toEqual([false, false, false, true]);
    expect(new Set(s.customers.map((c) => c.userId)).size).toBe(4);
  });

  it("holds no e-mail and no phone number", () => {
    const text = JSON.stringify([getStore().customers, getStore().loyaltyAccounts, getStore().sponsorships]);
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\+221/);
  });
});

describe("loyalty seed", () => {
  it("gives the first eight active companies a program, exactly one inactive, none to the others", () => {
    const s = getStore();
    const active = s.companies.filter((c) => c.status === "active");
    expect(s.loyaltyPrograms.map((p) => p.companyId)).toEqual(active.slice(0, 8).map((c) => c.id));
    expect(s.loyaltyPrograms.filter((p) => p.status === "INACTIVE")).toHaveLength(1);
    for (const p of s.loyaltyPrograms) {
      expect(p).toMatchObject({ pointsPerCurrencyUnit: 0.01, redemptionRate: 5, minPointsForRedemption: 1000 });
    }
  });

  it("derives one transaction from each paid online confirmed booking of a customer at a company with an active program", () => {
    const s = getStore();
    const eligible = s.bookings.filter((b) =>
      b.channel === "online" && b.status === "confirmed" && b.paymentStatus === "paid"
      && s.customers.some((c) => c.userId === b.userId)
      && s.loyaltyPrograms.some((p) => p.companyId === b.companyId && p.status === "ACTIVE"));
    expect(eligible.length).toBeGreaterThan(0);
    expect(s.loyaltyTransactions).toHaveLength(eligible.length);
    for (const b of eligible) {
      const customer = s.customers.find((c) => c.userId === b.userId)!;
      const account = s.loyaltyAccounts.find((a) => a.customerId === customer.id && a.companyId === b.companyId)!;
      const tx = s.loyaltyTransactions.find((t) => t.bookingId === b.id)!;
      expect(tx.accountId).toBe(account.id);
      expect(tx.points).toBe(Math.floor(b.amount * 0.01));
    }
  });

  it("keeps each account's points equal to the sum of its transactions, one account per customer and company", () => {
    const s = getStore();
    expect(s.loyaltyAccounts.length).toBeGreaterThan(0);
    const keys = s.loyaltyAccounts.map((a) => `${a.customerId}/${a.companyId}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const a of s.loyaltyAccounts) {
      const sum = s.loyaltyTransactions.filter((t) => t.accountId === a.id).reduce((n, t) => n + t.points, 0);
      expect(a.points).toBe(sum);
      expect(a.points).toBeGreaterThan(0);
      expect(["REGULAR", "VIP", "PREMIUM"]).toContain(a.membershipType);
    }
  });

  it("never opens an account at a company without an active program", () => {
    const s = getStore();
    const active = new Set(s.loyaltyPrograms.filter((p) => p.status === "ACTIVE").map((p) => p.companyId));
    for (const a of s.loyaltyAccounts) expect(active.has(a.companyId)).toBe(true);
  });
});

describe("sponsorship seed", () => {
  it("has an active, a redeemed and an expired sponsorship with unique codes", () => {
    const s = getStore();
    expect(s.sponsorships.map((x) => x.status).sort()).toEqual(["ACTIVE", "EXPIRED", "REDEEMED"]);
    expect(new Set(s.sponsorships.map((x) => x.code)).size).toBe(3);
    for (const x of s.sponsorships) expect(x.code).toMatch(/^SPN-[0-9A-Z]{8}$/);
    const expired = s.sponsorships.find((x) => x.status === "EXPIRED")!;
    expect(Date.parse(expired.expiresAt)).toBeLessThan(NOW.getTime());
    const active = s.sponsorships.find((x) => x.status === "ACTIVE")!;
    expect(Date.parse(active.expiresAt)).toBeGreaterThan(NOW.getTime());
  });

  it("links exactly one sponsored customer to the redeemed sponsorship, never to their own", () => {
    const s = getStore();
    const sponsored = s.customers.filter((c) => c.sponsorshipId !== null);
    expect(sponsored).toHaveLength(1);
    const used = s.sponsorships.find((x) => x.id === sponsored[0]!.sponsorshipId)!;
    expect(used.status).toBe("REDEEMED");
    expect(used.sponsorCustomerId).not.toBe(sponsored[0]!.id);
    expect(sponsored[0]!.sponsoredAt).not.toBeNull();
    for (const c of s.customers.filter((x) => x.sponsorshipId === null)) expect(c.sponsoredAt).toBeNull();
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/clients-seed.test.ts` → FAIL (`s.customers` indéfini).

- [ ] **Step 4: Étendre le store et écrire `seedCustomers`**

Dans `src/lib/data/seed.ts` :

1. Étendre l'import de types avec : `Customer`, `Feedback`, `FeedbackStatus`, `FeedbackType`, `LoyaltyAccount`, `LoyaltyProgram`, `LoyaltyTransaction`, `MembershipType`, `Parcel`, `ParcelHistoryEntry`, `ParcelLeg`, `ParcelStatus`, `ParcelType`, `Sponsorship`, `SponsorshipRewardType`, `SponsorshipStatus`.
2. Dans `interface Store`, après `tickets: Ticket[];` :

```ts
  parcels: Parcel[];
  parcelLegs: ParcelLeg[];
  parcelHistory: ParcelHistoryEntry[];
  customers: Customer[];
  loyaltyPrograms: LoyaltyProgram[];
  loyaltyAccounts: LoyaltyAccount[];
  loyaltyTransactions: LoyaltyTransaction[];
  sponsorships: Sponsorship[];
  feedbacks: Feedback[];
```

3. Dans le littéral de `buildSeed`, après `paymentMethods: [], bookings: [], transactions: [], tickets: [],` ajouter :

```ts
    parcels: [], parcelLegs: [], parcelHistory: [], customers: [], loyaltyPrograms: [],
    loyaltyAccounts: [], loyaltyTransactions: [], sponsorships: [], feedbacks: [],
```

4. Après la ligne `seedSales(store, now, iso);`, ajouter `seedCustomers(store, iso);` (les appels `seedParcels` et `seedFeedbacks` sont ajoutés à la Task 2).
5. À la fin du fichier, ajouter :

```ts
const MEMBERSHIPS: MembershipType[] = ["REGULAR", "VIP", "PREMIUM"];

/**
 * Customers (one per client account), loyalty programs for the first eight active companies (one inactive),
 * loyalty accounts and point movements derived from the customers' paid online bookings, and three sponsorships.
 */
function seedCustomers(store: Store, iso: (offsetDays: number) => string): void {
  let customerSeq = 1, programSeq = 1, accountSeq = 1, movementSeq = 1, sponsorSeq = 1;

  const customers = CLIENTS.map((c, k) => {
    const user = store.users.find((u) => u.username === c.username)!;
    const customer: Customer = {
      id: uid(44, customerSeq++), userId: user.id, name: user.displayName, isCorporate: k === CLIENTS.length - 1,
      sponsorshipId: null, sponsoredAt: null, createdAt: user.createdAt,
    };
    store.customers.push(customer);
    return customer;
  });

  const activeCompanies = store.companies.filter((c) => c.status === "active");
  activeCompanies.slice(0, 8).forEach((company, k) => {
    store.loyaltyPrograms.push({
      id: uid(45, programSeq++), companyId: company.id, name: `Fidélité ${company.name}`,
      pointsPerCurrencyUnit: 0.01, redemptionRate: 5, minPointsForRedemption: 1000,
      status: k === 5 ? "INACTIVE" : "ACTIVE", createdAt: iso(-(300 - k * 20)),
    });
  });

  const paidOnline = store.bookings
    .filter((b) => b.channel === "online" && b.status === "confirmed" && b.paymentStatus === "paid")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const booking of paidOnline) {
    const customer = customers.find((c) => c.userId === booking.userId);
    const program = store.loyaltyPrograms.find((p) => p.companyId === booking.companyId && p.status === "ACTIVE");
    if (!customer || !program) continue;
    let account = store.loyaltyAccounts.find((a) => a.customerId === customer.id && a.companyId === booking.companyId);
    if (!account) {
      account = {
        id: uid(46, accountSeq), customerId: customer.id, companyId: booking.companyId, points: 0,
        membershipType: MEMBERSHIPS[accountSeq % MEMBERSHIPS.length]!, createdAt: booking.createdAt,
      };
      accountSeq++;
      store.loyaltyAccounts.push(account);
    }
    const points = Math.floor(booking.amount * program.pointsPerCurrencyUnit);
    account.points += points;
    store.loyaltyTransactions.push({
      id: uid(47, movementSeq++), accountId: account.id, bookingId: booking.id, points, createdAt: booking.createdAt,
    });
  }

  const sponsor = (
    companyIndex: number, who: Customer, status: SponsorshipStatus, rewardType: SponsorshipRewardType,
    rewardValue: number, createdDays: number, expiresDays: number,
  ): Sponsorship => {
    const sponsorship: Sponsorship = {
      id: uid(48, sponsorSeq), companyId: activeCompanies[companyIndex]!.id, sponsorCustomerId: who.id,
      code: hashCode("SPN-", sponsorSeq), rewardType, rewardValue, status,
      createdAt: iso(createdDays), expiresAt: iso(expiresDays),
    };
    sponsorSeq++;
    store.sponsorships.push(sponsorship);
    return sponsorship;
  };
  sponsor(0, customers[0]!, "ACTIVE", "LOYALTY_POINTS", 500, -20, 70);
  const redeemed = sponsor(0, customers[0]!, "REDEEMED", "LOYALTY_POINTS", 500, -60, 30);
  sponsor(1, customers[1]!, "EXPIRED", "DISCOUNT", 10, -120, -30);
  customers[2]!.sponsorshipId = redeemed.id;
  customers[2]!.sponsoredAt = iso(-45);
}
```

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/clients-seed.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS. Si « derives one transaction… » échoue sur `eligible.length`, c'est que les réservations en ligne payées du lot 5 n'appartiennent pas aux clients (défaut de graine à signaler, pas d'assouplissement du test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts tests/unit/clients-seed.test.ts
git commit -m "feat: customers, loyalty and sponsorship seed derived from online bookings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Graine des colis et des avis (TDD)

**Files:**
- Modify: `src/lib/data/seed.ts`, `tests/unit/clients-seed.test.ts`
- Create: `tests/unit/parcels-seed.test.ts`

**Interfaces:**
- Consumes: `store.trips`, `store.routes`, `store.customers`, `store.bookings`, `hashCode`, `PEOPLE`.
- Produces: `store.parcels`, `store.parcelLegs`, `store.parcelHistory`, `store.feedbacks` remplis ; fonctions `seedParcels(store, now)` et `seedFeedbacks(store, now)`.

- [ ] **Step 1: Test de graine des colis (rouge)**

Créer `tests/unit/parcels-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { ParcelStatus } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const recipient = (name: string) => {
  const found = getStore().parcels.filter((p) => p.recipientName === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};

describe("parcels seed: references", () => {
  it("links every parcel to a trip, the route's stations and a company-consistent first leg", () => {
    const s = getStore();
    expect(s.parcels.length).toBeGreaterThan(40);
    for (const p of s.parcels) {
      const trip = s.trips.find((t) => t.id === p.tripId)!;
      const route = s.routes.find((r) => r.id === trip.routeId)!;
      expect(trip.companyId).toBe(p.companyId);
      expect([p.originStationId, p.destinationStationId]).toEqual([route.originId, route.destinationId]);
      expect(p.expectedDeliveryAt).toBe(trip.arrival);
      const legs = s.parcelLegs.filter((l) => l.parcelId === p.id).sort((a, b) => a.sequence - b.sequence);
      expect(legs.length).toBeGreaterThanOrEqual(1);
      expect(legs.length).toBeLessThanOrEqual(2);
      expect(legs.map((l) => l.sequence)).toEqual(legs.map((_, i) => i + 1));
      expect(legs[0]!.tripId).toBe(p.tripId);
      for (const l of legs) expect(l.companyId).toBe(p.companyId);
    }
  });

  it("generates unique, well-formed codes and ids", () => {
    const s = getStore();
    const check = (codes: string[], re: RegExp) => {
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of codes) expect(c).toMatch(re);
    };
    check(s.parcels.map((p) => p.parcelCode), /^PCL-[0-9A-Z]{8}$/);
    check(s.parcels.map((p) => p.trackingNumber), /^TRK-[0-9A-Z]{8}$/);
    for (const list of [s.parcels, s.parcelLegs, s.parcelHistory]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });

  it("ties the sender to a customer or a counter name, and gives every recipient a masked-able phone", () => {
    const s = getStore();
    for (const p of s.parcels) {
      expect(p.recipientPhone).toMatch(/^\+2217713\d{5}$/);
      if (p.senderCustomerId) {
        expect(p.senderName).toBe(s.customers.find((c) => c.id === p.senderCustomerId)!.name);
      } else {
        expect(p.senderName).toBeTruthy();
      }
    }
    expect(s.parcels.some((p) => p.senderCustomerId !== null)).toBe(true);
    expect(s.parcels.some((p) => p.senderCustomerId === null)).toBe(true);
  });
});

describe("parcels seed: statuses", () => {
  it("covers the seven statuses", () => {
    const seen = new Set(getStore().parcels.map((p) => p.status));
    expect([...seen].sort()).toEqual(
      ["AT_HUB", "CANCELLED", "DELIVERED", "IN_TRANSIT", "LOST", "PENDING", "RETURNED"],
    );
  });

  it("follows the trip: cancelled trips cancel their parcels, planned trips keep them pending, others never cancel", () => {
    const s = getStore();
    for (const p of s.parcels) {
      const trip = s.trips.find((t) => t.id === p.tripId)!;
      if (trip.status === "cancelled") expect(p.status).toBe("CANCELLED");
      else expect(p.status).not.toBe("CANCELLED");
      if (trip.status === "planned") expect(p.status).toBe("PENDING");
    }
  });

  it("sets the delivery date only on delivered parcels and the payment status from the parcel's fate", () => {
    for (const p of getStore().parcels) {
      expect(p.actualDeliveryAt === null).toBe(p.status !== "DELIVERED");
      if (p.status === "CANCELLED") expect(p.paymentStatus).toBe("REFUNDED");
      else if (p.status === "PENDING") expect(p.paymentStatus).toBe("PENDING");
      else expect(p.paymentStatus).toBe("PAID");
      expect(p.shippingFee).toBeGreaterThan(0);
    }
  });
});

describe("parcels seed: history", () => {
  it("chains every parcel's history from creation to its current status, oldest first, never in the future", () => {
    const s = getStore();
    for (const p of s.parcels) {
      const h = s.parcelHistory.filter((e) => e.parcelId === p.id).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
      expect(h.length).toBeGreaterThanOrEqual(1);
      expect(h[0]!.previousStatus).toBeNull();
      expect(h[0]!.newStatus).toBe("PENDING");
      expect(h.at(-1)!.newStatus).toBe(p.status);
      for (let i = 1; i < h.length; i++) expect(h[i]!.previousStatus).toBe(h[i - 1]!.newStatus);
      for (const e of h) expect(Date.parse(e.changedAt)).toBeLessThanOrEqual(NOW.getTime());
      expect(p.createdAt).toBe(h[0]!.changedAt);
    }
  });

  it("only uses transitions the parcel state machine allows", () => {
    const allowed: Record<ParcelStatus, ParcelStatus[]> = {
      PENDING: ["IN_TRANSIT", "CANCELLED"], IN_TRANSIT: ["AT_HUB", "DELIVERED", "RETURNED", "LOST"],
      AT_HUB: ["IN_TRANSIT", "DELIVERED", "RETURNED", "LOST"], DELIVERED: [], CANCELLED: [], RETURNED: [], LOST: [],
    };
    for (const e of getStore().parcelHistory.filter((x) => x.previousStatus !== null)) {
      expect(allowed[e.previousStatus!], `${e.previousStatus} → ${e.newStatus}`).toContain(e.newStatus);
    }
  });

  it("has parcels going through a hub with two legs", () => {
    const s = getStore();
    const twoLegs = s.parcels.filter((p) => s.parcelLegs.filter((l) => l.parcelId === p.id).length === 2);
    expect(twoLegs.length).toBeGreaterThan(0);
    for (const p of twoLegs) {
      expect(p.status).toBe("DELIVERED");
      const path = s.parcelHistory.filter((e) => e.parcelId === p.id).sort((a, b) => a.changedAt.localeCompare(b.changedAt)).map((e) => e.newStatus);
      expect(path).toEqual(["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"]);
      const [first, second] = s.parcelLegs.filter((l) => l.parcelId === p.id).sort((a, b) => a.sequence - b.sequence);
      expect(second!.tripId).not.toBe(first!.tripId);
      expect(s.trips.find((t) => t.id === second!.tripId)!.companyId).toBe(p.companyId);
    }
  });
});

describe("parcels seed: scenarios", () => {
  it("names one recipient per E2E scenario", () => {
    expect(recipient("Dior Kébé").status).toBe("IN_TRANSIT");
    expect(recipient("Gorgui Sall").status).toBe("PENDING");
    expect(recipient("Yacine Ndoye").status).toBe("DELIVERED");
  });
});

describe("parcels seed: no personal data besides the recipient phone", () => {
  it("keeps e-mails out of parcels, legs and history", () => {
    const s = getStore();
    expect(JSON.stringify([s.parcelLegs, s.parcelHistory])).not.toMatch(/@|\+221/);
    expect(JSON.stringify(s.parcels.map(({ recipientPhone: _p, ...rest }) => rest))).not.toMatch(/@|\+221/);
  });
});
```

Ajouter à la fin de `tests/unit/clients-seed.test.ts` :

```ts
describe("feedback seed", () => {
  it("references existing customers, companies and, when given, trips, parcels and bookings of the same company", () => {
    const s = getStore();
    expect(s.feedbacks.length).toBeGreaterThan(10);
    for (const f of s.feedbacks) {
      expect(s.customers.some((c) => c.id === f.customerId)).toBe(true);
      expect(s.companies.some((c) => c.id === f.companyId)).toBe(true);
      expect(f.rating).toBeGreaterThanOrEqual(1);
      expect(f.rating).toBeLessThanOrEqual(5);
      if (f.bookingId) {
        const b = s.bookings.find((x) => x.id === f.bookingId)!;
        expect(b.companyId).toBe(f.companyId);
        expect(b.paymentStatus).toBe("paid");
        expect(s.customers.find((c) => c.id === f.customerId)!.userId).toBe(b.userId);
      }
      if (f.parcelId) expect(s.parcels.find((x) => x.id === f.parcelId)!.companyId).toBe(f.companyId);
      if (f.tripId) expect(s.trips.find((x) => x.id === f.tripId)!.companyId).toBe(f.companyId);
      if (f.feedbackType === "PARCEL") expect(f.parcelId).not.toBeNull();
      if (f.feedbackType === "TRIP") expect(f.bookingId).not.toBeNull();
    }
  });

  it("covers the four statuses and the three feedback types it produces; only resolved reviews carry a response", () => {
    const s = getStore();
    expect(new Set(s.feedbacks.map((f) => f.status))).toEqual(new Set(["PENDING", "REVIEWED", "RESOLVED", "IGNORED"]));
    expect(new Set(s.feedbacks.map((f) => f.feedbackType))).toEqual(new Set(["TRIP", "PARCEL", "SERVICE"]));
    for (const f of s.feedbacks) {
      expect(f.response !== null).toBe(f.status === "RESOLVED");
      expect(f.respondedAt !== null).toBe(f.status === "RESOLVED");
      expect(Date.parse(f.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      if (f.respondedAt) {
        expect(f.respondedAt >= f.createdAt).toBe(true);
        expect(Date.parse(f.respondedAt)).toBeLessThanOrEqual(NOW.getTime());
      }
    }
  });

  it("has exactly one review per scenario title", () => {
    const s = getStore();
    const pending = s.feedbacks.filter((f) => f.title === "Climatisation en panne pendant le trajet");
    const resolved = s.feedbacks.filter((f) => f.title === "Service impeccable au guichet");
    expect(pending.map((f) => f.status)).toEqual(["PENDING"]);
    expect(resolved.map((f) => f.status)).toEqual(["RESOLVED"]);
  });

  it("holds no e-mail and no phone number", () => {
    expect(JSON.stringify(getStore().feedbacks)).not.toMatch(/@|\+221/);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/parcels-seed.test.ts tests/unit/clients-seed.test.ts` → FAIL (collections vides).

- [ ] **Step 3: Écrire `seedParcels` et `seedFeedbacks`**

Dans `src/lib/data/seed.ts`, après `seedCustomers(store, iso);` ajouter :

```ts
  seedParcels(store, now);
  seedFeedbacks(store, now);
```

puis, à la fin du fichier :

```ts
const RECIPIENTS = [
  "Mame Diarra Sène", "Tidiane Cissokho", "Fama Badiane", "Elhadji Sakho",
  "Soda Mendy", "Moctar Dème", "Aby Tounkara", "Bakary Konaté",
];
const PARCEL_SCENARIOS = { lostable: "Dior Kébé", pending: "Gorgui Sall", closed: "Yacine Ndoye" } as const;
const PARCEL_TYPES: ParcelType[] = ["DOCUMENT", "PACKAGE", "FRAGILE", "PERISHABLE", "OTHER"];
const PARCEL_DESCRIPTIONS = [
  "Dossiers administratifs", "Pièces détachées", "Verres en cristal", "Produits frais", "Vêtements", "Matériel informatique",
];
const DEPARTED_STATUSES: ParcelStatus[] = ["DELIVERED", "DELIVERED", "IN_TRANSIT", "AT_HUB", "LOST", "RETURNED"];
const PARCEL_PATHS: Record<ParcelStatus, ParcelStatus[]> = {
  PENDING: ["PENDING"], IN_TRANSIT: ["PENDING", "IN_TRANSIT"], AT_HUB: ["PENDING", "IN_TRANSIT", "AT_HUB"],
  DELIVERED: ["PENDING", "IN_TRANSIT", "DELIVERED"], LOST: ["PENDING", "IN_TRANSIT", "LOST"],
  RETURNED: ["PENDING", "IN_TRANSIT", "RETURNED"], CANCELLED: ["PENDING", "CANCELLED"],
};
const HUB_PATH: ParcelStatus[] = ["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"];

/**
 * Parcels of every trip (more on departed trips so all seven statuses appear), each with its legs and a status
 * history that ends at its current status; some delivered parcels went through a hub (two legs).
 */
function seedParcels(store: Store, now: Date): void {
  let parcelSeq = 1, legSeq = 1, historySeq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  store.trips.forEach((trip, ti) => {
    const route = store.routes.find((r) => r.id === trip.routeId);
    if (!route) return;
    const count = trip.status === "departed" ? 2 + (ti % 2) : ti % 3;
    const departure = Date.parse(trip.departure);
    for (let j = 0; j < count; j++) {
      const n = ti * 10 + j;
      const status: ParcelStatus =
        trip.status === "cancelled" ? "CANCELLED"
        : trip.status === "planned" ? "PENDING"
        : trip.status === "boarding" ? (j % 2 === 0 ? "PENDING" : "IN_TRANSIT")
        : DEPARTED_STATUSES[(ti + j) % DEPARTED_STATUSES.length]!;
      const secondTrip = store.trips.find((t) => t.companyId === trip.companyId && t.id !== trip.id);
      const hub = status === "DELIVERED" && j === 0 && ti % 4 === 0 && secondTrip !== undefined;
      const path = hub ? HUB_PATH : PARCEL_PATHS[status];
      const customer = j % 2 === 0 ? store.customers[n % store.customers.length]! : null;
      const weightKg = 1 + (n % 9) * 2.5;
      const createdMs = Math.min(departure - 2 * DAY_MS, nowMs - 3_600_000);
      const parcel: Parcel = {
        id: uid(41, parcelSeq), companyId: trip.companyId, parcelCode: hashCode("PCL-", parcelSeq),
        trackingNumber: hashCode("TRK-", parcelSeq),
        senderName: customer ? customer.name : PEOPLE[n % PEOPLE.length]!, senderCustomerId: customer?.id ?? null,
        recipientName: RECIPIENTS[n % RECIPIENTS.length]!,
        recipientPhone: `+2217713${String(10_000 + ((n * 37) % 80_000)).padStart(5, "0")}`,
        weightKg, parcelType: PARCEL_TYPES[n % PARCEL_TYPES.length]!,
        description: PARCEL_DESCRIPTIONS[n % PARCEL_DESCRIPTIONS.length]!,
        tripId: trip.id, originStationId: route.originId, destinationStationId: route.destinationId,
        pickupAt: new Date(departure - 3_600_000).toISOString(), expectedDeliveryAt: trip.arrival,
        actualDeliveryAt: status === "DELIVERED" ? new Date(Date.parse(trip.arrival) + 1_800_000).toISOString() : null,
        status, shippingFee: Math.round((1500 + weightKg * 200) / 100) * 100, currency: trip.currency,
        paymentStatus: status === "CANCELLED" ? "REFUNDED" : status === "PENDING" ? "PENDING" : "PAID",
        createdAt: new Date(createdMs).toISOString(),
      };
      parcelSeq++;
      store.parcels.push(parcel);

      store.parcelLegs.push({
        id: uid(42, legSeq), parcelId: parcel.id, companyId: parcel.companyId, tripId: trip.id,
        assignmentCode: hashCode("ASG-", legSeq), sequence: 1,
      });
      legSeq++;
      if (hub) {
        store.parcelLegs.push({
          id: uid(42, legSeq), parcelId: parcel.id, companyId: parcel.companyId, tripId: secondTrip.id,
          assignmentCode: hashCode("ASG-", legSeq), sequence: 2,
        });
        legSeq++;
      }

      path.forEach((newStatus, k) => {
        store.parcelHistory.push({
          id: uid(43, historySeq++), parcelId: parcel.id, previousStatus: k === 0 ? null : path[k - 1]!, newStatus,
          notes: null, changedBy: k === 0 ? null : "Équipe de la compagnie",
          changedAt: new Date(createdMs + k * 1_800_000).toISOString(),
        });
      });
    }
  });

  store.parcels.find((p) => p.status === "IN_TRANSIT")!.recipientName = PARCEL_SCENARIOS.lostable;
  store.parcels.find((p) => p.status === "PENDING")!.recipientName = PARCEL_SCENARIOS.pending;
  store.parcels.find((p) => p.status === "DELIVERED")!.recipientName = PARCEL_SCENARIOS.closed;
}

const FEEDBACK_SCENARIOS = {
  ignorable: "Climatisation en panne pendant le trajet", resolved: "Service impeccable au guichet",
} as const;
const FEEDBACK_STATUS_CYCLE: FeedbackStatus[] = ["PENDING", "PENDING", "REVIEWED", "RESOLVED", "IGNORED"];
const FEEDBACK_RATINGS = [5, 4, 2, 1, 3];
const FEEDBACK_TITLES: Record<"TRIP" | "PARCEL" | "SERVICE", string[]> = {
  TRIP: ["Départ en retard", "Trajet confortable", "Bus très propre", "Arrêt trop long", "Chauffeur courtois"],
  PARCEL: ["Colis bien arrivé", "Colis livré en retard"],
  SERVICE: ["Accueil au guichet", "Application de réservation"],
};

/** Reviews of every customer: one per paid booking (four at most), one for their first parcel, one on the service. */
function seedFeedbacks(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  const add = (
    customer: Customer, companyId: string, feedbackType: "TRIP" | "PARCEL" | "SERVICE",
    refs: { tripId?: string; parcelId?: string; bookingId?: string }, baseIso: string,
  ) => {
    const n = seq++;
    const status = FEEDBACK_STATUS_CYCLE[n % FEEDBACK_STATUS_CYCLE.length]!;
    const createdMs = Math.min(Date.parse(baseIso) + 2 * DAY_MS, nowMs - 3_600_000);
    const titles = FEEDBACK_TITLES[feedbackType];
    store.feedbacks.push({
      id: uid(49, n), companyId, customerId: customer.id,
      tripId: refs.tripId ?? null, parcelId: refs.parcelId ?? null, bookingId: refs.bookingId ?? null,
      rating: FEEDBACK_RATINGS[(n * 3) % FEEDBACK_RATINGS.length]!, feedbackType,
      title: titles[n % titles.length]!, comment: "Retour d'expérience détaillé du client sur ce service.",
      status,
      response: status === "RESOLVED" ? "Merci pour votre retour, nous en avons tenu compte." : null,
      respondedAt: status === "RESOLVED" ? new Date(Math.min(createdMs + DAY_MS, nowMs)).toISOString() : null,
      createdAt: new Date(createdMs).toISOString(),
    });
  };

  for (const customer of store.customers) {
    const paid = store.bookings
      .filter((b) => b.userId === customer.userId && b.paymentStatus === "paid")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .slice(0, 4);
    for (const b of paid) add(customer, b.companyId, "TRIP", { tripId: b.tripId, bookingId: b.id }, b.createdAt);
    const parcel = store.parcels.find((p) => p.senderCustomerId === customer.id);
    if (parcel) add(customer, parcel.companyId, "PARCEL", { parcelId: parcel.id, tripId: parcel.tripId }, parcel.createdAt);
    if (paid[0]) add(customer, paid[0].companyId, "SERVICE", {}, paid[0].createdAt);
  }

  store.feedbacks.find((f) => f.status === "PENDING")!.title = FEEDBACK_SCENARIOS.ignorable;
  store.feedbacks.find((f) => f.status === "RESOLVED")!.title = FEEDBACK_SCENARIOS.resolved;
}
```

Le type `FeedbackType` importé à la Task 1 reste utilisé par `Feedback` (types) ; si `tsc` signale un import inutilisé dans `seed.ts`, retirer `FeedbackType` de l'import.

- [ ] **Step 4: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. En cas d'échec de couverture (« covers the seven statuses », « covers the four statuses »), c'est un défaut de volume de la graine à corriger dans la graine (par exemple en relevant le nombre de colis d'un trajet parti), jamais en assouplissant le test ; le signaler.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/seed.ts tests/unit/parcels-seed.test.ts tests/unit/clients-seed.test.ts
git commit -m "feat: parcels with legs and history, and customer feedback seed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Colis : libellés, dépôt, règle de perte, révélation et actions (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/parcels.ts`, `src/app/(admin)/colis/actions.ts`, `tests/unit/parcels-repo.test.ts`, `tests/unit/parcels-rules.test.ts`, `tests/unit/parcel-client-actions.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `routeLabel` (lot 4), `addActivity`, `maskPhone`, `run`, `runReveal`, `requireReason`, `requireString`.
- Produces (`src/lib/repos/parcels.ts`) :
  - `PARCEL_STATUSES` (`as const`), `CLOSED_PARCEL_STATUSES`, `lostBlockReason(parcel): string | null`.
  - `ParcelRow`, `ParcelLegRow`, `ParcelHistoryRow`, `ParcelDetail`.
  - `parcelsRepo.listRows({ companyId?, status? })`, `parcelsRepo.get(id)`, `parcelsRepo.detail(id)`, `parcelsRepo.declareLost(id, reason, actor?, now?)`, `parcelsRepo.logReveal(id, actor?, now?)`.
  - Libellés : `parcelStatusBadge`, `parcelPaymentBadge`, `parcelTypeLabel`.
  - Actions : `declareParcelLost(parcelId, reason): Promise<ActionResult>`, `revealParcelRecipientPhone(parcelId): Promise<RevealResult>`.

- [ ] **Step 1: Libellés (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";

describe("parcel labels", () => {
  it("labels parcel statuses, payments and types", () => {
    expect(parcelStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "neutral" });
    expect(parcelStatusBadge("IN_TRANSIT")).toEqual({ label: "En transit", tone: "info" });
    expect(parcelStatusBadge("AT_HUB")).toEqual({ label: "Au hub", tone: "warning" });
    expect(parcelStatusBadge("DELIVERED")).toEqual({ label: "Livré", tone: "success" });
    expect(parcelStatusBadge("CANCELLED")).toEqual({ label: "Annulé", tone: "neutral" });
    expect(parcelStatusBadge("RETURNED")).toEqual({ label: "Retourné", tone: "warning" });
    expect(parcelStatusBadge("LOST")).toEqual({ label: "Perdu", tone: "danger" });
    expect(parcelPaymentBadge("PENDING")).toEqual({ label: "À payer", tone: "warning" });
    expect(parcelPaymentBadge("PAID")).toEqual({ label: "Payé", tone: "success" });
    expect(parcelPaymentBadge("REFUNDED")).toEqual({ label: "Remboursé", tone: "neutral" });
    expect(parcelTypeLabel("DOCUMENT")).toBe("Document");
    expect(parcelTypeLabel("PACKAGE")).toBe("Colis standard");
    expect(parcelTypeLabel("FRAGILE")).toBe("Fragile");
    expect(parcelTypeLabel("PERISHABLE")).toBe("Périssable");
    expect(parcelTypeLabel("OTHER")).toBe("Autre");
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `ParcelPaymentStatus`, `ParcelStatus`, `ParcelType`, puis ajouter à la fin :

```ts
export const parcelStatusBadge = (s: ParcelStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "neutral" },
    IN_TRANSIT: { label: "En transit", tone: "info" },
    AT_HUB: { label: "Au hub", tone: "warning" },
    DELIVERED: { label: "Livré", tone: "success" },
    CANCELLED: { label: "Annulé", tone: "neutral" },
    RETURNED: { label: "Retourné", tone: "warning" },
    LOST: { label: "Perdu", tone: "danger" },
  }, s);

export const parcelPaymentBadge = (s: ParcelPaymentStatus): Badge =>
  pick({
    PENDING: { label: "À payer", tone: "warning" },
    PAID: { label: "Payé", tone: "success" },
    REFUNDED: { label: "Remboursé", tone: "neutral" },
  }, s);

export const parcelTypeLabel = (t: ParcelType): string =>
  ({ DOCUMENT: "Document", PACKAGE: "Colis standard", FRAGILE: "Fragile", PERISHABLE: "Périssable", OTHER: "Autre" })[t];
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant, vert après).

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/parcels-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { lostBlockReason, parcelsRepo } from "@/lib/repos/parcels";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;

describe("parcel list", () => {
  it("lists every parcel newest first and filters by company and status", () => {
    const s = getStore();
    const all = parcelsRepo.listRows({});
    expect(all).toHaveLength(s.parcels.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.parcels[0]!.companyId;
    const mine = parcelsRepo.listRows({ companyId });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.companyId === companyId)).toBe(true);
    const lost = parcelsRepo.listRows({ status: "LOST" });
    expect(lost.length).toBeGreaterThan(0);
    expect(lost.every((r) => r.status === "LOST")).toBe(true);
    const both = parcelsRepo.listRows({ companyId, status: "DELIVERED" });
    expect(both.every((r) => r.companyId === companyId && r.status === "DELIVERED")).toBe(true);
  });

  it("exposes only client-safe fields, never the phone", () => {
    const row = parcelsRepo.listRows({})[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "companyId", "companyName", "createdAt", "currency", "id", "legCount", "parcelCode", "parcelType",
      "paymentStatus", "recipientName", "routeLabel", "senderName", "shippingFee", "status", "trackingNumber", "weightKg",
    ]);
    expect(row.routeLabel).toMatch(/→/);
    expect(JSON.stringify(parcelsRepo.listRows({}))).not.toMatch(/\+221/);
  });

  it("counts the legs of a parcel", () => {
    const s = getStore();
    const two = s.parcelLegs.find((l) => l.sequence === 2)!;
    expect(parcelsRepo.listRows({}).find((r) => r.id === two.parcelId)!.legCount).toBe(2);
  });
});

describe("parcel detail", () => {
  it("returns undefined for an unknown parcel", () => {
    expect(parcelsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("returns legs in order, history oldest first, the masked phone and the loss rule", () => {
    const s = getStore();
    const two = s.parcelLegs.find((l) => l.sequence === 2)!;
    const d = parcelsRepo.detail(two.parcelId)!;
    expect(d.legs.map((l) => l.sequence)).toEqual([1, 2]);
    expect(d.legs[0]!.routeLabel).toMatch(/→/);
    expect(d.history.map((h) => h.newStatus)).toEqual(["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"]);
    expect(d.originName).not.toBe("—");
    expect(d.recipientPhoneMasked).toMatch(/^\+221•+\d{2}$/);
    expect(d.recipientPhoneMasked).not.toBe(d.parcel.recipientPhone);
    expect(d.lostBlockedReason).toBe("Ce colis est déjà clos");
  });

  it("explains when a parcel cannot be declared lost", () => {
    expect(lostBlockReason(named("Dior Kébé"))).toBeNull();
    expect(lostBlockReason(named("Gorgui Sall"))).toBe("Un colis en attente ne peut pas être déclaré perdu");
    expect(lostBlockReason(named("Yacine Ndoye"))).toBe("Ce colis est déjà clos");
    const hub = getStore().parcels.find((p) => p.status === "AT_HUB")!;
    expect(lostBlockReason(hub)).toBeNull();
    for (const status of ["CANCELLED", "RETURNED", "LOST"] as const) {
      expect(lostBlockReason({ ...hub, status })).toBe("Ce colis est déjà clos");
    }
  });
});
```

Run → FAIL (module absent).

- [ ] **Step 3: Test des règles (rouge)**

Créer `tests/unit/parcels-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { parcelsRepo } from "@/lib/repos/parcels";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;
const declare = (name: string, reason = "Introuvable au hub") =>
  parcelsRepo.declareLost(named(name).id, reason, "tester@sira.app", NOW);

describe("declaring a parcel lost", () => {
  it("marks an in-transit parcel lost, adds a history line and journals it", () => {
    const target = named("Dior Kébé");
    const historyBefore = getStore().parcelHistory.filter((h) => h.parcelId === target.id).length;
    const n = getStore().activity.length;
    const result = declare("Dior Kébé", "  Introuvable au hub  ");
    expect(result).toBe(target);
    expect(target.status).toBe("LOST");
    expect(target.actualDeliveryAt).toBeNull();
    const history = getStore().parcelHistory.filter((h) => h.parcelId === target.id);
    expect(history).toHaveLength(historyBefore + 1);
    expect(history.at(-1)).toMatchObject({
      previousStatus: "IN_TRANSIT", newStatus: "LOST", notes: "Introuvable au hub",
      changedBy: "tester@sira.app", changedAt: NOW.toISOString(),
    });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Colis ${target.parcelCode} déclaré perdu. Motif : Introuvable au hub`,
    });
  });

  it("also accepts a parcel waiting at a hub", () => {
    const hub = getStore().parcels.find((p) => p.status === "AT_HUB")!;
    parcelsRepo.declareLost(hub.id, "Perdu au hub", "tester@sira.app", NOW);
    expect(hub.status).toBe("LOST");
    expect(getStore().parcelHistory.filter((h) => h.parcelId === hub.id).at(-1)!.previousStatus).toBe("AT_HUB");
  });

  it("refuses an unknown parcel", () => {
    expect(() => parcelsRepo.declareLost("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Colis introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = named("Dior Kébé");
    const n = getStore().activity.length;
    expect(() => declare("Dior Kébé", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("IN_TRANSIT");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a closed parcel and leaves its history untouched", () => {
    const target = named("Yacine Ndoye");
    const history = getStore().parcelHistory.filter((h) => h.parcelId === target.id).length;
    expect(() => declare("Yacine Ndoye")).toThrow("Ce colis est déjà clos");
    expect(target.status).toBe("DELIVERED");
    expect(getStore().parcelHistory.filter((h) => h.parcelId === target.id)).toHaveLength(history);
  });

  it("refuses every other closed status", () => {
    for (const status of ["CANCELLED", "RETURNED", "LOST"] as const) {
      const p = getStore().parcels.find((x) => x.status === status)!;
      expect(() => parcelsRepo.declareLost(p.id, "motif")).toThrow("Ce colis est déjà clos");
    }
  });

  it("refuses a pending parcel", () => {
    const target = named("Gorgui Sall");
    expect(() => declare("Gorgui Sall")).toThrow("Un colis en attente ne peut pas être déclaré perdu");
    expect(target.status).toBe("PENDING");
  });

  it("checks the guards in order: unknown, reason, closed, pending", () => {
    const closed = named("Yacine Ndoye");
    expect(() => parcelsRepo.declareLost(closed.id, "")).toThrow("Un motif est obligatoire");
    const pending = named("Gorgui Sall");
    expect(() => parcelsRepo.declareLost(pending.id, "")).toThrow("Un motif est obligatoire");
  });
});

describe("revealing a recipient phone", () => {
  it("journals the reveal on the parcel's company without writing the number", () => {
    const target = named("Yacine Ndoye");
    const n = getStore().activity.length;
    parcelsRepo.logReveal(target.id, "tester@sira.app", NOW);
    expect(getStore().activity).toHaveLength(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Donnée personnelle révélée : téléphone du destinataire du colis ${target.parcelCode}`,
    });
    expect(entry.action).not.toContain(target.recipientPhone);
  });

  it("refuses an unknown parcel without journaling", () => {
    const n = getStore().activity.length;
    expect(() => parcelsRepo.logReveal("00000000-0000-4000-8000-000000000000")).toThrow("Colis introuvable");
    expect(getStore().activity).toHaveLength(n);
  });
});
```

- [ ] **Step 4: Implémenter le dépôt**

Créer `src/lib/repos/parcels.ts` :

```ts
import { maskPhone } from "@/lib/mask";
import { addActivity } from "@/lib/repos/activity";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type { Parcel, ParcelPaymentStatus, ParcelStatus, ParcelType, TripStatus } from "@/lib/types";

export const PARCEL_STATUSES = ["PENDING", "IN_TRANSIT", "AT_HUB", "DELIVERED", "CANCELLED", "RETURNED", "LOST"] as const;

/** Terminal statuses: nothing can happen to such a parcel any more. */
export const CLOSED_PARCEL_STATUSES: readonly ParcelStatus[] = ["DELIVERED", "CANCELLED", "RETURNED", "LOST"];

/** Client-safe projection of a parcel: no phone. */
export interface ParcelRow {
  id: string; parcelCode: string; trackingNumber: string; companyId: string; companyName: string;
  senderName: string; recipientName: string; routeLabel: string; parcelType: ParcelType; weightKg: number;
  shippingFee: number; currency: string; status: ParcelStatus; paymentStatus: ParcelPaymentStatus;
  legCount: number; createdAt: string;
}

export interface ParcelLegRow {
  id: string; sequence: number; assignmentCode: string; tripId: string; routeLabel: string;
  departure: string; tripStatus: TripStatus;
}

export interface ParcelHistoryRow {
  id: string; previousStatus: ParcelStatus | null; newStatus: ParcelStatus;
  notes: string | null; changedBy: string | null; changedAt: string;
}

export interface ParcelDetail {
  parcel: Parcel;
  companyName: string;
  originName: string;
  destinationName: string;
  routeLabel: string;
  /** Always masked: the real number only comes from the journaled reveal action. */
  recipientPhoneMasked: string;
  legs: ParcelLegRow[];
  history: ParcelHistoryRow[];
  lostBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function stationName(stationId: string): string {
  const station = getStore().stations.find((x) => x.id === stationId);
  return station ? `${station.name}` : "—";
}

/** Why a parcel cannot be declared lost, `null` when it can. Same order as the guards. */
export function lostBlockReason(parcel: Parcel): string | null {
  if (CLOSED_PARCEL_STATUSES.includes(parcel.status)) return "Ce colis est déjà clos";
  if (parcel.status === "PENDING") return "Un colis en attente ne peut pas être déclaré perdu";
  return null;
}

function parcelRoute(parcel: Parcel): string {
  const trip = getStore().trips.find((t) => t.id === parcel.tripId);
  return trip ? routeLabel(trip.routeId) : "—";
}

function parcelRow(p: Parcel): ParcelRow {
  const s = getStore();
  return {
    id: p.id, parcelCode: p.parcelCode, trackingNumber: p.trackingNumber, companyId: p.companyId,
    companyName: companyName(p.companyId), senderName: p.senderName, recipientName: p.recipientName,
    routeLabel: parcelRoute(p), parcelType: p.parcelType, weightKg: p.weightKg, shippingFee: p.shippingFee,
    currency: p.currency, status: p.status, paymentStatus: p.paymentStatus,
    legCount: s.parcelLegs.filter((l) => l.parcelId === p.id).length, createdAt: p.createdAt,
  };
}

export const parcelsRepo = {
  listRows(filter: { companyId?: string; status?: ParcelStatus } = {}): ParcelRow[] {
    return getStore().parcels
      .filter((p) => (!filter.companyId || p.companyId === filter.companyId) && (!filter.status || p.status === filter.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .map(parcelRow);
  },

  get(id: string): Parcel | undefined {
    return getStore().parcels.find((p) => p.id === id);
  },

  detail(id: string): ParcelDetail | undefined {
    const s = getStore();
    const parcel = s.parcels.find((p) => p.id === id);
    if (!parcel) return undefined;
    const legs = s.parcelLegs
      .filter((l) => l.parcelId === id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((l): ParcelLegRow => {
        const trip = s.trips.find((t) => t.id === l.tripId);
        return {
          id: l.id, sequence: l.sequence, assignmentCode: l.assignmentCode, tripId: l.tripId,
          routeLabel: trip ? routeLabel(trip.routeId) : "—", departure: trip?.departure ?? "",
          tripStatus: trip?.status ?? "planned",
        };
      });
    const history = s.parcelHistory
      .filter((h) => h.parcelId === id)
      .sort((a, b) => a.changedAt.localeCompare(b.changedAt) || a.id.localeCompare(b.id))
      .map((h): ParcelHistoryRow => ({
        id: h.id, previousStatus: h.previousStatus, newStatus: h.newStatus, notes: h.notes,
        changedBy: h.changedBy, changedAt: h.changedAt,
      }));
    return {
      parcel, companyName: companyName(parcel.companyId),
      originName: stationName(parcel.originStationId), destinationName: stationName(parcel.destinationStationId),
      routeLabel: parcelRoute(parcel), recipientPhoneMasked: maskPhone(parcel.recipientPhone),
      legs, history, lostBlockedReason: lostBlockReason(parcel),
    };
  },

  /**
   * Declares a parcel lost. Guards, in this order: parcel exists, reason, not closed, not pending.
   * Only `IN_TRANSIT` and `AT_HUB` parcels pass.
   */
  declareLost(parcelId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Parcel {
    const s = getStore();
    const parcel = s.parcels.find((p) => p.id === parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = lostBlockReason(parcel);
    if (blocked) throw new Error(blocked);
    const previous = parcel.status;
    parcel.status = "LOST";
    s.parcelHistory.push({
      id: `hist-${now.getTime()}-${s.parcelHistory.length + 1}`, parcelId: parcel.id,
      previousStatus: previous, newStatus: "LOST", notes: motif, changedBy: actor, changedAt: now.toISOString(),
    });
    addActivity(parcel.companyId, actor, `Colis ${parcel.parcelCode} déclaré perdu. Motif : ${motif}`, now);
    return parcel;
  },

  /** Journals the reveal of the recipient phone; the number itself is never written to the log. */
  logReveal(parcelId: string, actor = "admin@sira.app", now: Date = new Date()): void {
    const parcel = getStore().parcels.find((p) => p.id === parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    addActivity(
      parcel.companyId, actor, `Donnée personnelle révélée : téléphone du destinataire du colis ${parcel.parcelCode}`, now,
    );
  },
};
```

Remarque : `stationName` renvoie le nom complet de la gare (« Gare routière de Thiès ») ; la ligne `return station ? \`${station.name}\` : "—"` peut s'écrire `station?.name ?? "—"`. Simplifier ainsi si le linter le demande.

- [ ] **Step 5: Constater le vert du dépôt et des règles**

Run: `pnpm test tests/unit/parcels-repo.test.ts tests/unit/parcels-rules.test.ts` → PASS.

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer `if (!motif) throw …` : échoue `refuses a blank reason and changes nothing`.
2. Retirer `"DELIVERED"` de `CLOSED_PARCEL_STATUSES` : échoue `refuses a closed parcel and leaves its history untouched`.
3. Retirer `"LOST"` (ou `"RETURNED"`, `"CANCELLED"`) : échoue `refuses every other closed status`.
4. Supprimer la ligne `parcel.status === "PENDING"` de `lostBlockReason` : échoue `refuses a pending parcel`.
5. Inverser les deux conditions de `lostBlockReason` (pending avant closed) : aucun statut ne les satisfait ensemble, donc **non détectable** : ne pas tester. À la place, remplacer `CLOSED_PARCEL_STATUSES.includes(parcel.status)` par `parcel.status !== "IN_TRANSIT"` : échoue `also accepts a parcel waiting at a hub`.
6. Supprimer `s.parcelHistory.push(…)` : échoue le premier test de la perte.
7. Dans `listRows`, retirer le filtre `status` : échoue `lists every parcel newest first and filters…`.
8. Dans `detail`, remplacer `maskPhone(parcel.recipientPhone)` par `parcel.recipientPhone` : échoue `returns legs in order, history oldest first, the masked phone…`.

- [ ] **Step 6: Test des actions (rouge) puis implémentation**

Créer `tests/unit/parcel-client-actions.test.ts` (les tests de `ignoreFeedback` sont ajoutés à la Task 4 dans ce même fichier) :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { declareParcelLost, revealParcelRecipientPhone } from "@/app/(admin)/colis/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const parcelNamed = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;

describe("declareParcelLost", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = parcelNamed("Dior Kébé");
    const n = getStore().activity.length;
    expect(await declareParcelLost(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("IN_TRANSIT");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("declares the parcel lost, journals the actor and revalidates the affected pages", async () => {
    const target = parcelNamed("Dior Kébé");
    expect(await declareParcelLost(target.id, " Introuvable au hub ")).toEqual({ ok: true });
    expect(target.status).toBe("LOST");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining(["/colis", `/colis/${target.id}`, `/compagnies/${target.companyId}`]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = parcelNamed("Dior Kébé");
    expect(await declareParcelLost(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("IN_TRANSIT");
    expect(await declareParcelLost(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("LOST");
  });

  it("returns the rule's message as an error result", async () => {
    expect(await declareParcelLost(parcelNamed("Gorgui Sall").id, "motif")).toEqual({
      ok: false, error: "Un colis en attente ne peut pas être déclaré perdu",
    });
    expect(await declareParcelLost(parcelNamed("Yacine Ndoye").id, "motif")).toEqual({ ok: false, error: "Ce colis est déjà clos" });
    expect(await declareParcelLost("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Colis introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await declareParcelLost("", "motif")).ok).toBe(false);
    expect((await declareParcelLost(parcelNamed("Dior Kébé").id, "  ")).ok).toBe(false);
    expect(parcelNamed("Dior Kébé").status).toBe("IN_TRANSIT");
  });
});

describe("revealParcelRecipientPhone", () => {
  it("returns no value and logs nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone(parcelNamed("Yacine Ndoye").id)).toEqual(EXPIRED);
    expect(getStore().activity).toHaveLength(n);
  });

  it("returns the number only after journaling the reveal, by the session actor", async () => {
    const target = parcelNamed("Yacine Ndoye");
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone(target.id)).toEqual({ ok: true, value: target.recipientPhone });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", companyId: target.companyId,
      action: `Donnée personnelle révélée : téléphone du destinataire du colis ${target.parcelCode}`,
    });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toContain(`/colis/${target.id}`);
  });

  it("refuses an unknown or blank parcel without logging", async () => {
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Colis introuvable" });
    expect(await revealParcelRecipientPhone("")).toEqual({ ok: false, error: "Colis invalide" });
    expect(getStore().activity).toHaveLength(n);
  });
});
```

Créer `src/app/(admin)/colis/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { parcelsRepo } from "@/lib/repos/parcels";

export async function declareParcelLost(parcelId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(parcelId, "Colis");
    const motif = requireReason(reason);
    const parcel = parcelsRepo.declareLost(parcelId, motif, actor);
    revalidatePath("/");
    revalidatePath("/colis");
    revalidatePath(`/colis/${parcel.id}`);
    revalidatePath(`/compagnies/${parcel.companyId}`);
  });
}

export async function revealParcelRecipientPhone(parcelId: string): Promise<RevealResult> {
  return runReveal((actor) => {
    requireString(parcelId, "Colis");
    const parcel = parcelsRepo.get(parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    parcelsRepo.logReveal(parcelId, actor);
    revalidatePath(`/colis/${parcelId}`);
    revalidatePath(`/compagnies/${parcel.companyId}`);
    return parcel.recipientPhone;
  });
}
```

Mutations des actions : (a) appeler `parcelsRepo.declareLost` hors de `run` → échoue `reads and writes nothing without a session` ; (b) remplacer `requireReason(reason)` par `reason.trim()` → échoue le test des 501 caractères ; (c) dans `revealParcelRecipientPhone`, retourner la valeur avant `logReveal` en déplaçant l'appel après le `return` n'est pas possible : à la place, supprimer la ligne `parcelsRepo.logReveal(parcelId, actor)` → échoue `returns the number only after journaling…`.

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/labels.ts src/lib/repos/parcels.ts "src/app/(admin)/colis/actions.ts" tests/unit/labels.test.ts tests/unit/parcels-repo.test.ts tests/unit/parcels-rules.test.ts tests/unit/parcel-client-actions.test.ts
git commit -m "feat: parcel repository, lost rule, journaled phone reveal and actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Clients, fidélité et avis : libellés, dépôt, règle d'ignorance et action (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`, `tests/unit/parcel-client-actions.test.ts`
- Create: `src/lib/repos/clients.ts`, `src/app/(admin)/clients/actions.ts`, `tests/unit/clients-repo.test.ts`, `tests/unit/feedback-rules.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `routeLabel`, `addActivity`, `run`, `requireReason`, `requireString`.
- Produces (`src/lib/repos/clients.ts`) :
  - `FEEDBACK_STATUSES` (`as const`), `feedbackIgnoreBlockReason(feedback): string | null`.
  - `CustomerRow`, `LoyaltyMovementRow`, `LoyaltyAccountDetail`, `SponsorshipRow`, `CustomerBookingRow`, `CustomerDetail`, `LoyaltyProgramRow`, `FeedbackRow`, `FeedbackDetail`.
  - `customersRepo.listRows()`, `customersRepo.detail(id)`, `loyaltyRepo.listPrograms({ companyId? })`, `feedbackRepo.listRows({ companyId?, status? })`, `feedbackRepo.detail(id)`, `feedbackRepo.ignore(id, reason, actor?, now?)`.
  - Libellés : `feedbackStatusBadge`, `feedbackTypeLabel`, `membershipLabel`, `sponsorshipStatusBadge`, `rewardLabel`, `ratingStars`.
  - Action : `ignoreFeedback(feedbackId, reason): Promise<ActionResult>`.

- [ ] **Step 1: Libellés (rouge puis vert)**

Ajouter à `tests/unit/labels.test.ts` :

```ts
import {
  feedbackStatusBadge, feedbackTypeLabel, membershipLabel, ratingStars, rewardLabel, sponsorshipStatusBadge,
} from "@/lib/labels";

describe("client labels", () => {
  it("labels reviews, memberships, sponsorships and ratings", () => {
    expect(feedbackStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(feedbackStatusBadge("REVIEWED")).toEqual({ label: "Examiné", tone: "info" });
    expect(feedbackStatusBadge("RESOLVED")).toEqual({ label: "Résolu", tone: "success" });
    expect(feedbackStatusBadge("IGNORED")).toEqual({ label: "Ignoré", tone: "neutral" });
    expect(feedbackTypeLabel("TRIP")).toBe("Trajet");
    expect(feedbackTypeLabel("BUS")).toBe("Bus");
    expect(feedbackTypeLabel("STATION")).toBe("Gare");
    expect(feedbackTypeLabel("SERVICE")).toBe("Service");
    expect(feedbackTypeLabel("PARCEL")).toBe("Colis");
    expect(membershipLabel("REGULAR")).toBe("Standard");
    expect(membershipLabel("VIP")).toBe("VIP");
    expect(membershipLabel("PREMIUM")).toBe("Premium");
    expect(sponsorshipStatusBadge("ACTIVE")).toEqual({ label: "Actif", tone: "success" });
    expect(sponsorshipStatusBadge("REDEEMED")).toEqual({ label: "Utilisé", tone: "info" });
    expect(sponsorshipStatusBadge("EXPIRED")).toEqual({ label: "Expiré", tone: "neutral" });
    expect(rewardLabel("DISCOUNT", 10, "XOF")).toBe("Réduction de 10 %");
    expect(rewardLabel("LOYALTY_POINTS", 500, "XOF")).toBe("500 points");
    expect(rewardLabel("CASH", 2000, "XOF")).toMatch(/^Remise de 2[\s  ]000/);
    expect(ratingStars(3)).toBe("★★★☆☆");
    expect(ratingStars(5)).toBe("★★★★★");
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `FeedbackStatus`, `FeedbackType`, `MembershipType`, `SponsorshipRewardType`, `SponsorshipStatus`, importer `formatMoney` de `@/lib/format`, et ajouter à la fin :

```ts
export const feedbackStatusBadge = (s: FeedbackStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    REVIEWED: { label: "Examiné", tone: "info" },
    RESOLVED: { label: "Résolu", tone: "success" },
    IGNORED: { label: "Ignoré", tone: "neutral" },
  }, s);

export const feedbackTypeLabel = (t: FeedbackType): string =>
  ({ TRIP: "Trajet", BUS: "Bus", STATION: "Gare", SERVICE: "Service", PARCEL: "Colis" })[t];

export const membershipLabel = (m: MembershipType): string =>
  ({ REGULAR: "Standard", VIP: "VIP", PREMIUM: "Premium" })[m];

export const sponsorshipStatusBadge = (s: SponsorshipStatus): Badge =>
  pick({
    ACTIVE: { label: "Actif", tone: "success" },
    REDEEMED: { label: "Utilisé", tone: "info" },
    EXPIRED: { label: "Expiré", tone: "neutral" },
  }, s);

export const rewardLabel = (type: SponsorshipRewardType, value: number, currency: string): string =>
  type === "DISCOUNT" ? `Réduction de ${value} %`
    : type === "LOYALTY_POINTS" ? `${value} points`
    : `Remise de ${formatMoney(value, currency)}`;

export const ratingStars = (rating: number): string => "★".repeat(rating) + "☆".repeat(5 - rating);
```

(Si `labels.ts` importe déjà `format`, ne pas dupliquer l'import ; si un import circulaire apparaît, `format.ts` n'importe pas `labels.ts` : aucun cycle attendu.)

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/clients-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { customersRepo, feedbackIgnoreBlockReason, feedbackRepo, loyaltyRepo } from "@/lib/repos/clients";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const customerNamed = (name: string) => getStore().customers.find((c) => c.name === name)!;
const feedbackTitled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;

describe("customer list", () => {
  it("lists the four customers with counters and no personal data", () => {
    const s = getStore();
    const rows = customersRepo.listRows();
    expect(rows).toHaveLength(4);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accountCount", "createdAt", "feedbackCount", "id", "isCorporate", "name", "onlineBookings", "parcelCount",
      "sponsored", "totalPoints", "userStatus",
    ]);
    for (const r of rows) {
      const c = s.customers.find((x) => x.id === r.id)!;
      const accounts = s.loyaltyAccounts.filter((a) => a.customerId === c.id);
      expect(r.accountCount).toBe(accounts.length);
      expect(r.totalPoints).toBe(accounts.reduce((n, a) => n + a.points, 0));
      expect(r.onlineBookings).toBe(s.bookings.filter((b) => b.userId === c.userId).length);
      expect(r.parcelCount).toBe(s.parcels.filter((p) => p.senderCustomerId === c.id).length);
      expect(r.feedbackCount).toBe(s.feedbacks.filter((f) => f.customerId === c.id).length);
      expect(r.sponsored).toBe(c.sponsorshipId !== null);
      expect(r.userStatus).toBe(s.users.find((u) => u.id === c.userId)!.status);
    }
    expect(JSON.stringify(rows)).not.toMatch(/@|\+221/);
    expect(rows.find((r) => r.name === "Pape Mbaye")!.userStatus).toBe("suspended");
  });
});

describe("customer detail", () => {
  it("returns undefined for an unknown customer", () => {
    expect(customersRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("returns loyalty accounts with their movements, newest first", () => {
    const s = getStore();
    const target = s.customers.find((c) => s.loyaltyAccounts.some((a) => a.customerId === c.id))!;
    const d = customersRepo.detail(target.id)!;
    expect(d.accounts.length).toBe(s.loyaltyAccounts.filter((a) => a.customerId === target.id).length);
    for (const a of d.accounts) {
      expect(a.companyName).not.toBe("—");
      expect(a.programName).toMatch(/^Fidélité /);
      expect(a.movements.reduce((n, m) => n + m.points, 0)).toBe(a.points);
      for (let i = 1; i < a.movements.length; i++) expect(a.movements[i - 1]!.createdAt >= a.movements[i]!.createdAt).toBe(true);
      for (const m of a.movements) expect(m.bookingCode).toMatch(/^BK-/);
    }
    expect(d.totalPoints).toBe(d.accounts.reduce((n, a) => n + a.points, 0));
  });

  it("returns the sponsorships given and the one used", () => {
    const s = getStore();
    const sponsor = customerNamed("Aïssatou Sarr");
    const given = customersRepo.detail(sponsor.id)!;
    expect(given.sponsorships.map((x) => x.status).sort()).toEqual(["ACTIVE", "REDEEMED"]);
    expect(given.sponsoredBy).toBeNull();
    const sponsored = s.customers.find((c) => c.sponsorshipId !== null)!;
    const d = customersRepo.detail(sponsored.id)!;
    expect(d.sponsoredBy).toMatchObject({ sponsorName: "Aïssatou Sarr" });
    expect(d.sponsoredBy!.code).toMatch(/^SPN-/);
    expect(Object.keys(given.sponsorships[0]!).sort()).toEqual([
      "code", "companyName", "createdAt", "currency", "expiresAt", "id", "rewardType", "rewardValue", "status",
    ]);
  });

  it("returns the customer's bookings (newest first, at most 10) and reviews", () => {
    const s = getStore();
    const target = s.customers.find((c) => s.bookings.filter((b) => b.userId === c.userId).length > 0)!;
    const d = customersRepo.detail(target.id)!;
    expect(d.bookings.length).toBeGreaterThan(0);
    expect(d.bookings.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < d.bookings.length; i++) expect(d.bookings[i - 1]!.createdAt >= d.bookings[i]!.createdAt).toBe(true);
    expect(Object.keys(d.bookings[0]!).sort()).toEqual([
      "amount", "bookingCode", "createdAt", "currency", "departure", "id", "paymentStatus", "routeLabel", "status",
    ]);
    expect(d.feedbacks.every((f) => f.customerId === target.id)).toBe(true);
    expect(d.feedbacks.length).toBe(s.feedbacks.filter((f) => f.customerId === target.id).length);
    expect(d.userId).toBe(target.userId);
    expect(d.parcelCount).toBe(s.parcels.filter((p) => p.senderCustomerId === target.id).length);
  });
});

describe("loyalty programs", () => {
  it("lists programs with their accounts and the points they distributed", () => {
    const s = getStore();
    const rows = loyaltyRepo.listPrograms({});
    expect(rows).toHaveLength(s.loyaltyPrograms.length);
    for (const r of rows) {
      const accounts = s.loyaltyAccounts.filter((a) => a.companyId === r.companyId);
      expect(r.accounts).toBe(accounts.length);
      expect(r.pointsIssued).toBe(accounts.reduce((n, a) => n + a.points, 0));
    }
    expect(rows.filter((r) => r.status === "INACTIVE")).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accounts", "companyId", "companyName", "id", "minPointsForRedemption", "name", "pointsIssued",
      "pointsPerCurrencyUnit", "redemptionRate", "status",
    ]);
  });

  it("filters by company", () => {
    const companyId = getStore().loyaltyPrograms[0]!.companyId;
    const rows = loyaltyRepo.listPrograms({ companyId });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.companyId).toBe(companyId);
  });
});

describe("feedback list and detail", () => {
  it("lists reviews newest first and filters by company and status", () => {
    const s = getStore();
    const all = feedbackRepo.listRows({});
    expect(all).toHaveLength(s.feedbacks.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const pending = feedbackRepo.listRows({ status: "PENDING" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === "PENDING")).toBe(true);
    const companyId = s.feedbacks[0]!.companyId;
    expect(feedbackRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    expect(Object.keys(all[0]!).sort()).toEqual([
      "companyId", "companyName", "createdAt", "customerId", "customerName", "feedbackType", "id", "rating",
      "responded", "status", "title",
    ]);
  });

  it("returns a detail with the references and the ignore rule, undefined when unknown", () => {
    const trip = getStore().feedbacks.find((f) => f.feedbackType === "TRIP")!;
    const d = feedbackRepo.detail(trip.id)!;
    expect(d.customerName).not.toBe("—");
    expect(d.tripLabel).toMatch(/→/);
    expect(d.bookingCode).toMatch(/^BK-/);
    expect(d.parcelCode).toBeNull();
    const parcel = getStore().feedbacks.find((f) => f.feedbackType === "PARCEL")!;
    expect(feedbackRepo.detail(parcel.id)!.parcelCode).toMatch(/^PCL-/);
    expect(feedbackRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("explains when a review cannot be ignored", () => {
    expect(feedbackIgnoreBlockReason(feedbackTitled("Climatisation en panne pendant le trajet"))).toBeNull();
    expect(feedbackIgnoreBlockReason(feedbackTitled("Service impeccable au guichet"))).toBe("Cet avis est déjà traité");
    const reviewed = getStore().feedbacks.find((f) => f.status === "REVIEWED")!;
    expect(feedbackIgnoreBlockReason(reviewed)).toBeNull();
    const ignored = getStore().feedbacks.find((f) => f.status === "IGNORED")!;
    expect(feedbackIgnoreBlockReason(ignored)).toBe("Cet avis est déjà traité");
    expect(feedbackRepo.detail(ignored.id)!.ignoreBlockedReason).toBe("Cet avis est déjà traité");
  });
});
```

- [ ] **Step 3: Test des règles (rouge)**

Créer `tests/unit/feedback-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { feedbackRepo } from "@/lib/repos/clients";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const titled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;
const PENDING_TITLE = "Climatisation en panne pendant le trajet";
const RESOLVED_TITLE = "Service impeccable au guichet";
const ignore = (title: string, reason = "Propos injurieux") =>
  feedbackRepo.ignore(titled(title).id, reason, "tester@sira.app", NOW);

describe("ignoring a review", () => {
  it("ignores a pending review, keeps the rest and journals it on the company", () => {
    const target = titled(PENDING_TITLE);
    const before = { rating: target.rating, comment: target.comment, response: target.response };
    const n = getStore().activity.length;
    const result = ignore(PENDING_TITLE, "  Propos injurieux  ");
    expect(result).toBe(target);
    expect(target.status).toBe("IGNORED");
    expect({ rating: target.rating, comment: target.comment, response: target.response }).toEqual(before);
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Avis « ${PENDING_TITLE} » ignoré. Motif : Propos injurieux`,
    });
  });

  it("also ignores a reviewed review", () => {
    const reviewed = getStore().feedbacks.find((f) => f.status === "REVIEWED")!;
    feedbackRepo.ignore(reviewed.id, "Hors sujet", "tester@sira.app", NOW);
    expect(reviewed.status).toBe("IGNORED");
  });

  it("refuses an unknown review", () => {
    expect(() => feedbackRepo.ignore("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Avis introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = titled(PENDING_TITLE);
    const n = getStore().activity.length;
    expect(() => ignore(PENDING_TITLE, "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a resolved review and keeps its response", () => {
    const target = titled(RESOLVED_TITLE);
    expect(() => ignore(RESOLVED_TITLE)).toThrow("Cet avis est déjà traité");
    expect(target.status).toBe("RESOLVED");
    expect(target.response).not.toBeNull();
  });

  it("refuses a review that is already ignored", () => {
    const ignored = getStore().feedbacks.find((f) => f.status === "IGNORED")!;
    expect(() => feedbackRepo.ignore(ignored.id, "motif")).toThrow("Cet avis est déjà traité");
  });

  it("checks the reason before the status", () => {
    const resolved = titled(RESOLVED_TITLE);
    expect(() => feedbackRepo.ignore(resolved.id, "")).toThrow("Un motif est obligatoire");
  });
});
```

- [ ] **Step 4: Implémenter le dépôt**

Créer `src/lib/repos/clients.ts` :

```ts
import { addActivity } from "@/lib/repos/activity";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type {
  BookingPaymentStatus, BookingStatus, Customer, Feedback, FeedbackStatus, FeedbackType, LoyaltyProgramStatus,
  MembershipType, SponsorshipRewardType, SponsorshipStatus, UserStatus,
} from "@/lib/types";

export const FEEDBACK_STATUSES = ["PENDING", "REVIEWED", "RESOLVED", "IGNORED"] as const;

/** Client-safe projection of a customer (no contact data). */
export interface CustomerRow {
  id: string; name: string; isCorporate: boolean; accountCount: number; totalPoints: number;
  onlineBookings: number; parcelCount: number; feedbackCount: number; sponsored: boolean;
  userStatus: UserStatus; createdAt: string;
}

export interface LoyaltyMovementRow { id: string; bookingId: string; bookingCode: string; points: number; createdAt: string }

export interface LoyaltyAccountDetail {
  id: string; companyId: string; companyName: string; programName: string | null;
  programStatus: LoyaltyProgramStatus | null; points: number; membershipType: MembershipType;
  movements: LoyaltyMovementRow[];
}

export interface SponsorshipRow {
  id: string; companyName: string; code: string; rewardType: SponsorshipRewardType; rewardValue: number;
  currency: string; status: SponsorshipStatus; createdAt: string; expiresAt: string;
}

export interface CustomerBookingRow {
  id: string; bookingCode: string; routeLabel: string; departure: string; amount: number; currency: string;
  status: BookingStatus; paymentStatus: BookingPaymentStatus; createdAt: string;
}

export interface FeedbackRow {
  id: string; companyId: string; companyName: string; customerId: string; customerName: string;
  feedbackType: FeedbackType; rating: number; title: string; status: FeedbackStatus;
  responded: boolean; createdAt: string;
}

export interface CustomerDetail {
  customer: Customer;
  userId: string;
  userStatus: UserStatus;
  parcelCount: number;
  totalPoints: number;
  accounts: LoyaltyAccountDetail[];
  sponsorships: SponsorshipRow[];
  sponsoredBy: { code: string; sponsorName: string; companyName: string; at: string } | null;
  bookings: CustomerBookingRow[];
  feedbacks: FeedbackRow[];
}

export interface LoyaltyProgramRow {
  id: string; companyId: string; companyName: string; name: string; pointsPerCurrencyUnit: number;
  redemptionRate: number; minPointsForRedemption: number; status: LoyaltyProgramStatus;
  accounts: number; pointsIssued: number;
}

export interface FeedbackDetail {
  feedback: Feedback;
  companyName: string;
  customerName: string;
  tripLabel: string | null;
  bookingCode: string | null;
  parcelCode: string | null;
  ignoreBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function customerName(customerId: string): string {
  return getStore().customers.find((c) => c.id === customerId)?.name ?? "—";
}

const byNewest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

/** Why a review cannot be ignored, `null` when it can: only pending and reviewed reviews can. */
export function feedbackIgnoreBlockReason(feedback: Feedback): string | null {
  return feedback.status === "PENDING" || feedback.status === "REVIEWED" ? null : "Cet avis est déjà traité";
}

function feedbackRow(f: Feedback): FeedbackRow {
  return {
    id: f.id, companyId: f.companyId, companyName: companyName(f.companyId), customerId: f.customerId,
    customerName: customerName(f.customerId), feedbackType: f.feedbackType, rating: f.rating, title: f.title,
    status: f.status, responded: f.response !== null, createdAt: f.createdAt,
  };
}

export const customersRepo = {
  listRows(): CustomerRow[] {
    const s = getStore();
    return s.customers
      .map((c): CustomerRow => {
        const accounts = s.loyaltyAccounts.filter((a) => a.customerId === c.id);
        return {
          id: c.id, name: c.name, isCorporate: c.isCorporate, accountCount: accounts.length,
          totalPoints: accounts.reduce((n, a) => n + a.points, 0),
          onlineBookings: s.bookings.filter((b) => b.userId === c.userId).length,
          parcelCount: s.parcels.filter((p) => p.senderCustomerId === c.id).length,
          feedbackCount: s.feedbacks.filter((f) => f.customerId === c.id).length,
          sponsored: c.sponsorshipId !== null,
          userStatus: s.users.find((u) => u.id === c.userId)?.status ?? "active",
          createdAt: c.createdAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  detail(id: string): CustomerDetail | undefined {
    const s = getStore();
    const customer = s.customers.find((c) => c.id === id);
    if (!customer) return undefined;
    const accounts = s.loyaltyAccounts
      .filter((a) => a.customerId === id)
      .map((a): LoyaltyAccountDetail => {
        const program = s.loyaltyPrograms.find((p) => p.companyId === a.companyId);
        return {
          id: a.id, companyId: a.companyId, companyName: companyName(a.companyId),
          programName: program?.name ?? null, programStatus: program?.status ?? null,
          points: a.points, membershipType: a.membershipType,
          movements: s.loyaltyTransactions
            .filter((t) => t.accountId === a.id)
            .sort(byNewest((t) => t.createdAt))
            .map((t) => ({
              id: t.id, bookingId: t.bookingId,
              bookingCode: s.bookings.find((b) => b.id === t.bookingId)?.bookingCode ?? "—",
              points: t.points, createdAt: t.createdAt,
            })),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
    const sponsorships = s.sponsorships
      .filter((x) => x.sponsorCustomerId === id)
      .sort(byNewest((x) => x.createdAt))
      .map((x): SponsorshipRow => ({
        id: x.id, companyName: companyName(x.companyId), code: x.code, rewardType: x.rewardType,
        rewardValue: x.rewardValue, currency: s.companies.find((c) => c.id === x.companyId)?.currency ?? "XOF",
        status: x.status, createdAt: x.createdAt, expiresAt: x.expiresAt,
      }));
    const used = customer.sponsorshipId ? s.sponsorships.find((x) => x.id === customer.sponsorshipId) : undefined;
    return {
      customer, userId: customer.userId,
      userStatus: s.users.find((u) => u.id === customer.userId)?.status ?? "active",
      parcelCount: s.parcels.filter((p) => p.senderCustomerId === id).length,
      totalPoints: accounts.reduce((n, a) => n + a.points, 0),
      accounts, sponsorships,
      sponsoredBy: used
        ? {
          code: used.code, sponsorName: customerName(used.sponsorCustomerId), companyName: companyName(used.companyId),
          at: customer.sponsoredAt ?? used.createdAt,
        }
        : null,
      bookings: s.bookings
        .filter((b) => b.userId === customer.userId)
        .sort(byNewest((b) => b.createdAt))
        .slice(0, 10)
        .map((b): CustomerBookingRow => {
          const trip = s.trips.find((t) => t.id === b.tripId);
          return {
            id: b.id, bookingCode: b.bookingCode, routeLabel: trip ? routeLabel(trip.routeId) : "—",
            departure: trip?.departure ?? "", amount: b.amount, currency: b.currency, status: b.status,
            paymentStatus: b.paymentStatus, createdAt: b.createdAt,
          };
        }),
      feedbacks: s.feedbacks.filter((f) => f.customerId === id).sort(byNewest((f) => f.createdAt)).map(feedbackRow),
    };
  },
};

export const loyaltyRepo = {
  listPrograms(filter: { companyId?: string } = {}): LoyaltyProgramRow[] {
    const s = getStore();
    return s.loyaltyPrograms
      .filter((p) => !filter.companyId || p.companyId === filter.companyId)
      .map((p): LoyaltyProgramRow => {
        const accounts = s.loyaltyAccounts.filter((a) => a.companyId === p.companyId);
        return {
          id: p.id, companyId: p.companyId, companyName: companyName(p.companyId), name: p.name,
          pointsPerCurrencyUnit: p.pointsPerCurrencyUnit, redemptionRate: p.redemptionRate,
          minPointsForRedemption: p.minPointsForRedemption, status: p.status,
          accounts: accounts.length, pointsIssued: accounts.reduce((n, a) => n + a.points, 0),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  },
};

export const feedbackRepo = {
  listRows(filter: { companyId?: string; status?: FeedbackStatus } = {}): FeedbackRow[] {
    return getStore().feedbacks
      .filter((f) => (!filter.companyId || f.companyId === filter.companyId) && (!filter.status || f.status === filter.status))
      .sort(byNewest((f) => f.createdAt))
      .map(feedbackRow);
  },

  get(id: string): Feedback | undefined {
    return getStore().feedbacks.find((f) => f.id === id);
  },

  detail(id: string): FeedbackDetail | undefined {
    const s = getStore();
    const feedback = s.feedbacks.find((f) => f.id === id);
    if (!feedback) return undefined;
    const trip = feedback.tripId ? s.trips.find((t) => t.id === feedback.tripId) : undefined;
    return {
      feedback, companyName: companyName(feedback.companyId), customerName: customerName(feedback.customerId),
      tripLabel: trip ? routeLabel(trip.routeId) : null,
      bookingCode: feedback.bookingId ? s.bookings.find((b) => b.id === feedback.bookingId)?.bookingCode ?? null : null,
      parcelCode: feedback.parcelId ? s.parcels.find((p) => p.id === feedback.parcelId)?.parcelCode ?? null : null,
      ignoreBlockedReason: feedbackIgnoreBlockReason(feedback),
    };
  },

  /** Ignores a review. Guards, in this order: review exists, reason, status pending or reviewed. */
  ignore(feedbackId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Feedback {
    const feedback = getStore().feedbacks.find((f) => f.id === feedbackId);
    if (!feedback) throw new Error("Avis introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = feedbackIgnoreBlockReason(feedback);
    if (blocked) throw new Error(blocked);
    feedback.status = "IGNORED";
    addActivity(feedback.companyId, actor, `Avis « ${feedback.title} » ignoré. Motif : ${motif}`, now);
    return feedback;
  },
};
```

- [ ] **Step 5: Action `ignoreFeedback` et ses tests**

Ajouter à `tests/unit/parcel-client-actions.test.ts` (importer `ignoreFeedback` depuis `@/app/(admin)/clients/actions`) :

```ts
import { ignoreFeedback } from "@/app/(admin)/clients/actions";

const feedbackTitled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;
const PENDING_TITLE = "Climatisation en panne pendant le trajet";
const RESOLVED_TITLE = "Service impeccable au guichet";

describe("ignoreFeedback", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = feedbackTitled(PENDING_TITLE);
    const n = getStore().activity.length;
    expect(await ignoreFeedback(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores the review, journals the actor and revalidates the affected pages", async () => {
    const target = feedbackTitled(PENDING_TITLE);
    expect(await ignoreFeedback(target.id, " Propos injurieux ")).toEqual({ ok: true });
    expect(target.status).toBe("IGNORED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining([
      "/clients/avis", `/clients/avis/${target.id}`, `/clients/comptes/${target.customerId}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = feedbackTitled(PENDING_TITLE);
    expect(await ignoreFeedback(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("PENDING");
    expect(await ignoreFeedback(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("IGNORED");
  });

  it("returns the rule's message as an error result", async () => {
    expect(await ignoreFeedback(feedbackTitled(RESOLVED_TITLE).id, "motif")).toEqual({ ok: false, error: "Cet avis est déjà traité" });
    expect(await ignoreFeedback("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Avis introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await ignoreFeedback("", "motif")).ok).toBe(false);
    expect((await ignoreFeedback(feedbackTitled(PENDING_TITLE).id, "  ")).ok).toBe(false);
    expect(feedbackTitled(PENDING_TITLE).status).toBe("PENDING");
  });
});
```

Créer `src/app/(admin)/clients/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { feedbackRepo } from "@/lib/repos/clients";

export async function ignoreFeedback(feedbackId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(feedbackId, "Avis");
    const motif = requireReason(reason);
    const feedback = feedbackRepo.ignore(feedbackId, motif, actor);
    revalidatePath("/clients/avis");
    revalidatePath(`/clients/avis/${feedback.id}`);
    revalidatePath(`/clients/comptes/${feedback.customerId}`);
    revalidatePath(`/compagnies/${feedback.companyId}`);
  });
}
```

- [ ] **Step 6: Constater le vert et les mutations**

Run: `pnpm test` puis `pnpm typecheck` → PASS.

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer `if (!motif) throw …` dans `ignore` : échoue `refuses a blank reason and changes nothing`.
2. Remplacer la condition de `feedbackIgnoreBlockReason` par `feedback.status === "PENDING"` : échoue `also ignores a reviewed review`.
3. Remplacer-la par `feedback.status !== "IGNORED"` : échoue `refuses a resolved review and keeps its response`.
4. Supprimer l'appel `addActivity` : échoue `ignores a pending review, keeps the rest and journals it on the company`.
5. Dans `customersRepo.listRows`, remplacer `onlineBookings` par le compte de toutes les réservations (`s.bookings.length`) : échoue `lists the four customers with counters and no personal data`.
6. Dans `detail`, retirer `.slice(0, 10)` : n'échoue que si un client a plus de 10 réservations ; sinon ne pas compter cette mutation comme preuve (signaler le résultat observé).
7. Action : appeler `feedbackRepo.ignore` hors de `run` → échoue `reads and writes nothing without a session` ; remplacer `requireReason(reason)` par `reason.trim()` → échoue le test des 501 caractères.

- [ ] **Step 7: Commit**

```bash
git add src/lib/labels.ts src/lib/repos/clients.ts "src/app/(admin)/clients/actions.ts" tests/unit/labels.test.ts tests/unit/clients-repo.test.ts tests/unit/feedback-rules.test.ts tests/unit/parcel-client-actions.test.ts
git commit -m "feat: customers, loyalty and feedback repositories with the ignore rule and action

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Pages des colis

**Files:**
- Create: `src/components/parcels/{declare-lost-button,recipient-phone-field,parcel-tabs}.tsx`, `src/app/(admin)/colis/{page.tsx,parcels-table.tsx}`, `src/app/(admin)/colis/[id]/{page.tsx,not-found.tsx}`

**Interfaces:**
- Consumes: `parcelsRepo`, `PARCEL_STATUSES`, `declareParcelLost`, `revealParcelRecipientPhone`, `parseCompanyFilter`, `CompanyFilter`, `MaskedValue`, `TabsWithUrl`, `ConfirmDialog`, libellés des Tasks 3 et 4.
- Produces: pages `/colis` et `/colis/[id]`. `data-testid` : `parcel-status` (badge de la fiche).

Pas de test unitaire (couverture E2E à la Task 7) ; `pnpm typecheck` est la vérification.

- [ ] **Step 1: Composants clients**

Créer `src/components/parcels/declare-lost-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { declareParcelLost } from "@/app/(admin)/colis/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface DeclareLostButtonProps { parcelId: string; parcelCode: string }

export function DeclareLostButton({ parcelId, parcelCode }: DeclareLostButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Déclarer le colis perdu</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Déclarer le colis ${parcelCode} perdu`}
        description="Seul un colis en transit ou au hub peut être déclaré perdu. Cette décision est définitive et figure dans l'historique du colis."
        confirmLabel="Confirmer la perte" destructive requireReason
        onConfirm={async (reason) => {
          const r = await declareParcelLost(parcelId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

Créer `src/components/parcels/recipient-phone-field.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { revealParcelRecipientPhone } from "@/app/(admin)/colis/actions";
import { MaskedValue } from "@/components/data/masked-value";

/** Receives only the masked number; the real one comes from the journaled server action, on demand. */
export function RecipientPhoneField({ parcelId, masked }: { parcelId: string; masked: string }) {
  const router = useRouter();
  return (
    <MaskedValue masked={masked} kind="phone" reveal={async () => {
      const r = await revealParcelRecipientPhone(parcelId);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
      return r.value;
    }} />
  );
}
```

- [ ] **Step 2: Onglets de la fiche**

Créer `src/components/parcels/parcel-tabs.tsx` :

```tsx
import Link from "next/link";
import { RecipientPhoneField } from "@/components/parcels/recipient-phone-field";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";
import type { ParcelDetail } from "@/lib/repos/parcels";

const TAB_VALUES = ["resume", "itineraire", "historique"];

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function ParcelTabs({ detail, initialTab }: { detail: ParcelDetail; initialTab?: string }) {
  const { parcel: p } = detail;
  const status = parcelStatusBadge(p.status);
  const payment = parcelPaymentBadge(p.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Code">{p.parcelCode}</DetailRow>
          <DetailRow label="Numéro de suivi">{p.trackingNumber}</DetailRow>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${p.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Expéditeur">
            {p.senderCustomerId
              ? <Link href={`/clients/comptes/${p.senderCustomerId}`} className="hover:underline">{p.senderName}</Link>
              : p.senderName}
          </DetailRow>
          <DetailRow label="Destinataire">{p.recipientName}</DetailRow>
          <DetailRow label="Téléphone du destinataire">
            <RecipientPhoneField parcelId={p.id} masked={detail.recipientPhoneMasked} />
          </DetailRow>
          <DetailRow label="Origine">{detail.originName}</DetailRow>
          <DetailRow label="Destination">{detail.destinationName}</DetailRow>
          <DetailRow label="Type">{parcelTypeLabel(p.parcelType)}</DetailRow>
          <DetailRow label="Description">{p.description}</DetailRow>
          <DetailRow label="Poids">{p.weightKg} kg</DetailRow>
          <DetailRow label="Frais d'expédition">{formatMoney(p.shippingFee, p.currency)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Paiement"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></DetailRow>
          <DetailRow label="Prise en charge">{formatDateTime(p.pickupAt)}</DetailRow>
          <DetailRow label="Livraison prévue">{formatDateTime(p.expectedDeliveryAt)}</DetailRow>
          <DetailRow label="Livré le">{p.actualDeliveryAt ? formatDateTime(p.actualDeliveryAt) : "—"}</DetailRow>
          <DetailRow label="Créé le">{formatDateTime(p.createdAt)}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "itineraire", label: "Itinéraire",
      content: (
        <Card><CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Jambe</th>
                <th className="py-1 font-medium">Trajet</th>
                <th className="py-1 font-medium">Départ</th>
                <th className="py-1 font-medium">Code d&apos;affectation</th>
              </tr>
            </thead>
            <tbody>
              {detail.legs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-1.5">{l.sequence}</td>
                  <td>
                    <Link href={`/flotte/trajets/${l.tripId}`} className="font-medium hover:underline">{l.routeLabel}</Link>
                  </td>
                  <td>{l.departure ? formatDateTime(l.departure) : "—"}</td>
                  <td>{l.assignmentCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ),
    },
    {
      value: "historique", label: "Historique",
      content: (
        <Card><CardContent>
          <ol className="space-y-2 text-sm">
            {detail.history.map((h) => {
              const badge = parcelStatusBadge(h.newStatus);
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-2 last:border-0">
                  <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(h.changedAt)}</span>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="text-muted-foreground">{h.changedBy ?? "Création du colis"}</span>
                  {h.notes && <span>{h.notes}</span>}
                </li>
              );
            })}
          </ol>
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
```

- [ ] **Step 3: Liste**

Créer `src/app/(admin)/colis/parcels-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";
import type { ParcelRow } from "@/lib/repos/parcels";

const columns: ColumnDef<ParcelRow, unknown>[] = [
  { accessorKey: "parcelCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.parcelCode}</span> },
  { accessorKey: "trackingNumber", header: "Suivi" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "senderName", header: "Expéditeur" },
  { accessorKey: "recipientName", header: "Destinataire" },
  { accessorKey: "routeLabel", header: "Ligne" },
  { id: "type", header: "Type", accessorFn: (r) => parcelTypeLabel(r.parcelType) },
  { accessorKey: "weightKg", header: "Poids", cell: ({ row }) => <span className="tabular-nums">{row.original.weightKg} kg</span> },
  {
    accessorKey: "shippingFee", header: "Frais",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.shippingFee, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = parcelStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "paymentStatus", header: "Paiement",
    cell: ({ row }) => {
      const b = parcelPaymentBadge(row.original.paymentStatus);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "legCount", header: "Jambes", cell: ({ row }) => <span className="tabular-nums">{row.original.legCount}</span> },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function ParcelsTable({ parcels }: { parcels: ParcelRow[] }) {
  return (
    <DataTable
      columns={columns} data={parcels} rowHref={(r) => `/colis/${r.id}`}
      searchPlaceholder="Rechercher un colis…" emptyMessage="Aucun colis."
    />
  );
}
```

Créer `src/app/(admin)/colis/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { PARCEL_STATUSES, parcelsRepo } from "@/lib/repos/parcels";
import { ParcelsTable } from "./parcels-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "IN_TRANSIT", label: "En transit" },
  { value: "AT_HUB", label: "Au hub" },
  { value: "DELIVERED", label: "Livrés" },
  { value: "CANCELLED", label: "Annulés" },
  { value: "RETURNED", label: "Retournés" },
  { value: "LOST", label: "Perdus" },
];

export default async function ParcelsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, PARCEL_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Colis"
        description="Colis confiés aux compagnies, du plus récent au plus ancien. Le téléphone du destinataire est masqué."
      />
      <CompanyFilter basePath="/colis" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/colis" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <ParcelsTable parcels={parcelsRepo.listRows({ companyId, status })} />
    </>
  );
}
```

- [ ] **Step 4: Fiche**

Créer `src/app/(admin)/colis/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { DeclareLostButton } from "@/components/parcels/declare-lost-button";
import { ParcelTabs } from "@/components/parcels/parcel-tabs";
import { parcelStatusBadge } from "@/lib/labels";
import { CLOSED_PARCEL_STATUSES, parcelsRepo } from "@/lib/repos/parcels";

export const dynamic = "force-dynamic";

export default async function ParcelPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = parcelsRepo.detail(id);
  if (!detail) notFound();
  const { parcel } = detail;
  const status = parcelStatusBadge(parcel.status);
  return (
    <>
      <PageHeader
        title={`Colis ${parcel.parcelCode}`}
        description={`${detail.routeLabel} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="parcel-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {!CLOSED_PARCEL_STATUSES.includes(parcel.status) && (
              <DeclareLostButton parcelId={parcel.id} parcelCode={parcel.parcelCode} />
            )}
          </>
        }
      />
      {!CLOSED_PARCEL_STATUSES.includes(parcel.status) && detail.lostBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="lost-blocked">
          Déclaration de perte impossible : {detail.lostBlockedReason}.
        </p>
      )}
      <ParcelTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Le bouton est affiché pour tout colis non clos, **y compris `PENDING`** (le serveur refuse avec un message lisible : c'est ce qui rend le refus « Gorgui Sall » jouable en E2E). Pour un colis clos (« Yacine Ndoye » livré), le bouton n'est **pas** affiché : le refus E2E d'un colis clos se joue donc **sans** passer par le bouton (voir Task 7, test `a delivered parcel cannot be declared lost`, qui vérifie l'absence du bouton et la note ; la garde « déjà clos » est prouvée par les tests unitaires).

Créer `src/app/(admin)/colis/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function ParcelNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Colis introuvable</p>
        <Link href="/colis" className="mt-2 inline-block text-sm text-accent underline">Retour aux colis</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/parcels "src/app/(admin)/colis"
git commit -m "feat: parcels list and detail with itinerary, history and phone reveal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Pages des clients : comptes, fidélité, avis

**Files:**
- Create: `src/components/clients/{customer-tabs,ignore-feedback-button}.tsx`, `src/app/(admin)/clients/comptes/{page.tsx,customers-table.tsx}`, `src/app/(admin)/clients/comptes/[id]/{page.tsx,not-found.tsx}`, `src/app/(admin)/clients/fidelite/{page.tsx,programs-table.tsx}`, `src/app/(admin)/clients/avis/{page.tsx,feedback-table.tsx}`, `src/app/(admin)/clients/avis/[id]/{page.tsx,not-found.tsx}`

**Interfaces:**
- Consumes: `customersRepo`, `loyaltyRepo`, `feedbackRepo`, `FEEDBACK_STATUSES`, `ignoreFeedback`, `parseCompanyFilter`, `CompanyFilter`, libellés de la Task 4.
- Produces: pages `/clients/comptes`, `/clients/comptes/[id]`, `/clients/fidelite`, `/clients/avis`, `/clients/avis/[id]`. `data-testid` : `loyalty-total`, `sponsorship-row`, `sponsored-by`, `customer-kind`, `feedback-status`.

- [ ] **Step 1: Bouton d'ignorance**

Créer `src/components/clients/ignore-feedback-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ignoreFeedback } from "@/app/(admin)/clients/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface IgnoreFeedbackButtonProps { feedbackId: string; title: string }

export function IgnoreFeedbackButton({ feedbackId, title }: IgnoreFeedbackButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Ignorer l&apos;avis</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Ignorer l'avis « ${title} »`}
        description="Un avis ignoré n'est plus traité par la compagnie. Seuls les avis en attente ou examinés peuvent être ignorés."
        confirmLabel="Ignorer cet avis" destructive requireReason
        onConfirm={async (reason) => {
          const r = await ignoreFeedback(feedbackId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Onglets de la fiche client**

Créer `src/components/clients/customer-tabs.tsx` :

```tsx
import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import {
  bookingPaymentBadge, bookingStatusBadge, feedbackStatusBadge, feedbackTypeLabel, membershipLabel, ratingStars,
  rewardLabel, sponsorshipStatusBadge,
} from "@/lib/labels";
import type { CustomerDetail } from "@/lib/repos/clients";

const TAB_VALUES = ["profil", "fidelite", "parrainage", "reservations", "avis"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CustomerTabs({ detail, initialTab }: { detail: CustomerDetail; initialTab?: string }) {
  const { customer: c } = detail;

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Nom">{c.name}</DetailRow>
          <DetailRow label="Type"><span data-testid="customer-kind">{c.isCorporate ? "Entreprise" : "Particulier"}</span></DetailRow>
          <DetailRow label="Compte utilisateur">
            <Link href={`/utilisateurs/${detail.userId}`} className="hover:underline">Voir le compte</Link>
          </DetailRow>
          <DetailRow label="État du compte">{detail.userStatus === "active" ? "Actif" : "Suspendu"}</DetailRow>
          <DetailRow label="Colis envoyés">{detail.parcelCount}</DetailRow>
          <DetailRow label="Client depuis le">{formatDate(c.createdAt)}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "fidelite", label: "Fidélité",
      content: (
        <div className="space-y-4">
          <Card><CardContent>
            <p className="text-sm text-muted-foreground">Points cumulés (toutes compagnies)</p>
            <p data-testid="loyalty-total" className="text-2xl font-semibold tabular-nums">{formatNumber(detail.totalPoints)} pts</p>
          </CardContent></Card>
          {detail.accounts.length === 0 ? <Empty>Aucun compte de fidélité.</Empty> : detail.accounts.map((a) => (
            <Card key={a.id}><CardContent>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/compagnies/${a.companyId}`} className="font-medium hover:underline">{a.companyName}</Link>
                  <span className="ml-2 text-sm text-muted-foreground">{a.programName ?? "Aucun programme"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge tone="info">{membershipLabel(a.membershipType)}</StatusBadge>
                  <span className="tabular-nums font-medium">{formatNumber(a.points)} pts</span>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Date</th>
                    <th className="py-1 font-medium">Réservation</th>
                    <th className="py-1 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {a.movements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(m.createdAt)}</td>
                      <td><Link href={`/ventes/reservations/${m.bookingId}`} className="hover:underline">{m.bookingCode}</Link></td>
                      <td className="tabular-nums">+{m.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          ))}
        </div>
      ),
    },
    {
      value: "parrainage", label: "Parrainage",
      content: (
        <div className="space-y-4">
          <Card><CardContent>
            {detail.sponsoredBy ? (
              <p className="text-sm" data-testid="sponsored-by">
                Parrainé par <span className="font-medium">{detail.sponsoredBy.sponsorName}</span> avec le code{" "}
                {detail.sponsoredBy.code} ({detail.sponsoredBy.companyName}) le {formatDate(detail.sponsoredBy.at)}.
              </p>
            ) : <Empty>Ce client n&apos;a pas été parrainé.</Empty>}
          </CardContent></Card>
          <Card><CardContent>
            {detail.sponsorships.length === 0 ? <Empty>Aucun code de parrainage généré.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Code</th>
                    <th className="py-1 font-medium">Compagnie</th>
                    <th className="py-1 font-medium">Récompense</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Expire le</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sponsorships.map((x) => {
                    const badge = sponsorshipStatusBadge(x.status);
                    return (
                      <tr key={x.id} data-testid="sponsorship-row" className="border-t border-border">
                        <td className="py-1.5 font-medium">{x.code}</td>
                        <td>{x.companyName}</td>
                        <td>{rewardLabel(x.rewardType, x.rewardValue, x.currency)}</td>
                        <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                        <td>{formatDate(x.expiresAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent></Card>
        </div>
      ),
    },
    {
      value: "reservations", label: "Réservations",
      content: (
        <Card><CardContent>
          {detail.bookings.length === 0 ? <Empty>Aucune réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Trajet</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Paiement</th>
                  <th className="py-1 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {detail.bookings.map((b) => {
                  const status = bookingStatusBadge(b.status);
                  const payment = bookingPaymentBadge(b.paymentStatus);
                  return (
                    <tr key={b.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/reservations/${b.id}`} className="font-medium hover:underline">{b.bookingCode}</Link>
                      </td>
                      <td>{b.routeLabel}{b.departure ? ` · ${formatDateTime(b.departure)}` : ""}</td>
                      <td className="tabular-nums">{formatMoney(b.amount, b.currency)}</td>
                      <td><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                      <td><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></td>
                      <td>{formatDateTime(b.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Les dix réservations les plus récentes.</p>
        </CardContent></Card>
      ),
    },
    {
      value: "avis", label: "Avis",
      content: (
        <Card><CardContent>
          {detail.feedbacks.length === 0 ? <Empty>Aucun avis.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Titre</th>
                  <th className="py-1 font-medium">Compagnie</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">Note</th>
                  <th className="py-1 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {detail.feedbacks.map((f) => {
                  const badge = feedbackStatusBadge(f.status);
                  return (
                    <tr key={f.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/clients/avis/${f.id}`} className="font-medium hover:underline">{f.title}</Link>
                      </td>
                      <td>{f.companyName}</td>
                      <td>{feedbackTypeLabel(f.feedbackType)}</td>
                      <td aria-label={`Note ${f.rating} sur 5`}>{ratingStars(f.rating)}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
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

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
```

- [ ] **Step 3: Comptes clients**

Créer `src/app/(admin)/clients/comptes/customers-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import type { CustomerRow } from "@/lib/repos/clients";

const num = (n: number) => <span className="tabular-nums">{formatNumber(n)}</span>;

const columns: ColumnDef<CustomerRow, unknown>[] = [
  { accessorKey: "name", header: "Client", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "kind", header: "Type", accessorFn: (r) => (r.isCorporate ? "Entreprise" : "Particulier") },
  { accessorKey: "accountCount", header: "Comptes de fidélité", cell: ({ row }) => num(row.original.accountCount) },
  { accessorKey: "totalPoints", header: "Points", cell: ({ row }) => num(row.original.totalPoints) },
  { accessorKey: "onlineBookings", header: "Réservations en ligne", cell: ({ row }) => num(row.original.onlineBookings) },
  { accessorKey: "parcelCount", header: "Colis envoyés", cell: ({ row }) => num(row.original.parcelCount) },
  { accessorKey: "feedbackCount", header: "Avis", cell: ({ row }) => num(row.original.feedbackCount) },
  { id: "sponsored", header: "Parrainé", accessorFn: (r) => (r.sponsored ? "Oui" : "Non") },
  {
    accessorKey: "userStatus", header: "Compte",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.userStatus === "active" ? "success" : "warning"}>
        {row.original.userStatus === "active" ? "Actif" : "Suspendu"}
      </StatusBadge>
    ),
  },
  { accessorKey: "createdAt", header: "Client depuis le", cell: ({ row }) => formatDate(row.original.createdAt) },
];

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <DataTable
      columns={columns} data={customers} rowHref={(r) => `/clients/comptes/${r.id}`}
      searchPlaceholder="Rechercher un client…" emptyMessage="Aucun client."
    />
  );
}
```

Créer `src/app/(admin)/clients/comptes/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { customersRepo } from "@/lib/repos/clients";
import { CustomersTable } from "./customers-table";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Comptes clients"
        description="Voyageurs inscrits en libre-service, avec leurs points de fidélité, leurs colis et leurs avis. Aucun e-mail ni téléphone n'est affiché."
      />
      <CustomersTable customers={customersRepo.listRows()} />
    </>
  );
}
```

Créer `src/app/(admin)/clients/comptes/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { CustomerTabs } from "@/components/clients/customer-tabs";
import { PageHeader } from "@/components/data/page-header";
import { customersRepo } from "@/lib/repos/clients";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = customersRepo.detail(id);
  if (!detail) notFound();
  return (
    <>
      <PageHeader
        title={detail.customer.name}
        description={detail.customer.isCorporate ? "Compte entreprise" : "Compte particulier"}
      />
      <CustomerTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/clients/comptes/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Client introuvable</p>
        <Link href="/clients/comptes" className="mt-2 inline-block text-sm text-accent underline">Retour aux comptes clients</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Fidélité**

Créer `src/app/(admin)/clients/fidelite/programs-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatNumber } from "@/lib/format";
import type { LoyaltyProgramRow } from "@/lib/repos/clients";

const columns: ColumnDef<LoyaltyProgramRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "name", header: "Programme", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  {
    accessorKey: "pointsPerCurrencyUnit", header: "Points par unité",
    cell: ({ row }) => <span className="tabular-nums">{row.original.pointsPerCurrencyUnit}</span>,
  },
  {
    accessorKey: "redemptionRate", header: "Valeur d'un point",
    cell: ({ row }) => <span className="tabular-nums">{row.original.redemptionRate}</span>,
  },
  {
    accessorKey: "minPointsForRedemption", header: "Seuil de conversion",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.minPointsForRedemption)} pts</span>,
  },
  {
    accessorKey: "status", header: "État",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.status === "ACTIVE" ? "success" : "neutral"}>
        {row.original.status === "ACTIVE" ? "Actif" : "Inactif"}
      </StatusBadge>
    ),
  },
  { accessorKey: "accounts", header: "Comptes", cell: ({ row }) => <span className="tabular-nums">{row.original.accounts}</span> },
  {
    accessorKey: "pointsIssued", header: "Points distribués",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.pointsIssued)}</span>,
  },
];

export function ProgramsTable({ programs }: { programs: LoyaltyProgramRow[] }) {
  return (
    <DataTable
      columns={columns} data={programs}
      searchPlaceholder="Rechercher un programme…" emptyMessage="Aucun programme de fidélité."
    />
  );
}
```

Créer `src/app/(admin)/clients/fidelite/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { formatNumber } from "@/lib/format";
import { loyaltyRepo } from "@/lib/repos/clients";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { ProgramsTable } from "./programs-table";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  const programs = loyaltyRepo.listPrograms({ companyId });
  return (
    <>
      <PageHeader
        title="Fidélité"
        description="Programmes de fidélité des compagnies. Les points sont crédités à chaque réservation en ligne payée ; la dépense de points n'existe pas encore."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Programmes actifs" value={programs.filter((p) => p.status === "ACTIVE").length} hint={`${programs.length} au total`} />
        <KpiCard label="Comptes de fidélité" value={formatNumber(programs.reduce((n, p) => n + p.accounts, 0))} />
        <KpiCard label="Points distribués" value={formatNumber(programs.reduce((n, p) => n + p.pointsIssued, 0))} />
      </div>
      <CompanyFilter basePath="/clients/fidelite" current={companyId} />
      <ProgramsTable programs={programs} />
    </>
  );
}
```

- [ ] **Step 5: Avis**

Créer `src/app/(admin)/clients/avis/feedback-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { feedbackStatusBadge, feedbackTypeLabel, ratingStars } from "@/lib/labels";
import type { FeedbackRow } from "@/lib/repos/clients";

const columns: ColumnDef<FeedbackRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "customerName", header: "Client" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "type", header: "Type", accessorFn: (r) => feedbackTypeLabel(r.feedbackType) },
  {
    accessorKey: "rating", header: "Note",
    cell: ({ row }) => <span aria-label={`Note ${row.original.rating} sur 5`}>{ratingStars(row.original.rating)}</span>,
  },
  { accessorKey: "title", header: "Titre", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = feedbackStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function FeedbackTable({ feedbacks }: { feedbacks: FeedbackRow[] }) {
  return (
    <DataTable
      columns={columns} data={feedbacks} rowHref={(r) => `/clients/avis/${r.id}`}
      searchPlaceholder="Rechercher un avis…" emptyMessage="Aucun avis."
    />
  );
}
```

Créer `src/app/(admin)/clients/avis/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { FEEDBACK_STATUSES, feedbackRepo } from "@/lib/repos/clients";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { FeedbackTable } from "./feedback-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "REVIEWED", label: "Examinés" },
  { value: "RESOLVED", label: "Résolus" },
  { value: "IGNORED", label: "Ignorés" },
];

export default async function FeedbackPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, FEEDBACK_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Avis"
        description="Avis des voyageurs sur les trajets, les colis et le service, du plus récent au plus ancien."
      />
      <CompanyFilter basePath="/clients/avis" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/clients/avis" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <FeedbackTable feedbacks={feedbackRepo.listRows({ companyId, status })} />
    </>
  );
}
```

Créer `src/app/(admin)/clients/avis/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { IgnoreFeedbackButton } from "@/components/clients/ignore-feedback-button";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { feedbackStatusBadge, feedbackTypeLabel, ratingStars } from "@/lib/labels";
import { feedbackRepo } from "@/lib/repos/clients";

export const dynamic = "force-dynamic";

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = feedbackRepo.detail(id);
  if (!detail) notFound();
  const { feedback: f } = detail;
  const status = feedbackStatusBadge(f.status);
  const canIgnore = f.status === "PENDING" || f.status === "REVIEWED";
  return (
    <>
      <PageHeader
        title={f.title}
        description={`${detail.customerName} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="feedback-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {canIgnore && <IgnoreFeedbackButton feedbackId={f.id} title={f.title} />}
          </>
        }
      />
      {!canIgnore && detail.ignoreBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="ignore-blocked">
          Modération impossible : {detail.ignoreBlockedReason}.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Avis</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Client">
              <Link href={`/clients/comptes/${f.customerId}`} className="hover:underline">{detail.customerName}</Link>
            </DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${f.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Type">{feedbackTypeLabel(f.feedbackType)}</DetailRow>
            <DetailRow label="Note"><span aria-label={`Note ${f.rating} sur 5`}>{ratingStars(f.rating)}</span></DetailRow>
            <DetailRow label="Déposé le">{formatDateTime(f.createdAt)}</DetailRow>
            <DetailRow label="Trajet">
              {f.tripId && detail.tripLabel
                ? <Link href={`/flotte/trajets/${f.tripId}`} className="hover:underline">{detail.tripLabel}</Link> : "—"}
            </DetailRow>
            <DetailRow label="Réservation">
              {f.bookingId && detail.bookingCode
                ? <Link href={`/ventes/reservations/${f.bookingId}`} className="hover:underline">{detail.bookingCode}</Link> : "—"}
            </DetailRow>
            <DetailRow label="Colis">
              {f.parcelId && detail.parcelCode
                ? <Link href={`/colis/${f.parcelId}`} className="hover:underline">{detail.parcelCode}</Link> : "—"}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Commentaire</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{f.comment}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Réponse de la compagnie</CardTitle></CardHeader>
            <CardContent>
              {f.response ? (
                <>
                  <p className="text-sm">{f.response}</p>
                  {f.respondedAt && <p className="mt-2 text-xs text-muted-foreground">Répondu le {formatDateTime(f.respondedAt)}</p>}
                </>
              ) : <p className="text-sm text-muted-foreground">Aucune réponse.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/clients/avis/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function FeedbackNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Avis introuvable</p>
        <Link href="/clients/avis" className="mt-2 inline-block text-sm text-accent underline">Retour aux avis</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/clients "src/app/(admin)/clients"
git commit -m "feat: customer accounts, loyalty programs and reviews pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, E2E, test de fuite et README

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 5 et 6.
- Produces: 4 entrées de navigation implémentées ; couverture E2E de la section.

- [ ] **Step 1: Test de navigation (rouge)**

Dans `tests/unit/nav.test.ts` : le test du lot 5 `marks only lot 1 to lot 5 pages as implemented` est **remplacé** par `marks only lot 1 to lot 6 pages as implemented` : reprendre le tableau attendu du lot 5 (28 chemins, trié) et y insérer, à leur place alphabétique, les quatre chemins `"/clients/avis"`, `"/clients/comptes"`, `"/clients/fidelite"`, `"/colis"` (32 chemins en tout). Ajouter à la fin du fichier :

```ts
describe("lot 6 breadcrumbs", () => {
  it("links the parent list of parcel, customer and review details, nothing else under clients", () => {
    expect(isLinkablePath("/colis/abc")).toBe(true);
    expect(isLinkablePath("/clients/comptes/abc")).toBe(true);
    expect(isLinkablePath("/clients/avis/abc")).toBe(true);
    expect(isLinkablePath("/clients/fidelite")).toBe(true);
    expect(isLinkablePath("/clients")).toBe(false);
  });
  it("labels the client segments with their accents", () => {
    expect(labelForSegment("fidelite")).toBe("Fidélité");
    expect(labelForSegment("comptes")).toBe("Comptes");
    expect(labelForSegment("avis")).toBe("Avis");
  });
});
```

(importer `isLinkablePath` et `labelForSegment` si absents.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` :
1. Remplacer les quatre lignes `todo(…)` de la section « Colis et clients » par :

```ts
    { label: "Colis", href: "/colis", implemented: true },
    { label: "Comptes clients", href: "/clients/comptes", implemented: true },
    { label: "Fidélité", href: "/clients/fidelite", implemented: true },
    { label: "Avis", href: "/clients/avis", implemented: true },
```

2. Ajouter à `SEGMENT_LABELS` : `fidelite: "Fidélité"`.
3. Ajouter à `ROUTE_PREFIXES` (en conservant les préfixes existants des lots précédents) : `"/colis"`, `"/clients/comptes"`, `"/clients/avis"`.

Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/colis");` par `await page.goto("/communication/notifications");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("parcels can be filtered by status and opened with their itinerary and history", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await expect(page.getByRole("heading", { name: "Colis" })).toBeVisible();
  await page.getByRole("link", { name: "Livrés", exact: true }).click();
  await expect(page).toHaveURL(/statut=DELIVERED/);
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page).toHaveURL(/\/colis\/[0-9a-f-]+$/);
  await expect(page.getByTestId("parcel-status")).toHaveText("Livré");
  await page.getByRole("tab", { name: "Itinéraire" }).click();
  await expect(page.getByRole("link", { name: /→/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByText("Création du colis")).toBeVisible();
});

test("an in-transit parcel is declared lost with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await page.getByPlaceholder("Rechercher un colis…").fill("Dior Kébé");
  await page.getByRole("row", { name: /Dior Kébé/ }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("En transit");
  await page.getByRole("button", { name: "Déclarer le colis perdu" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer la perte" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Introuvable lors du contrôle au hub");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("parcel-status")).toHaveText("Perdu");
  await expect(page.getByRole("button", { name: "Déclarer le colis perdu" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByText("Introuvable lors du contrôle au hub")).toBeVisible();
});

test("a pending parcel cannot be declared lost", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await page.getByPlaceholder("Rechercher un colis…").fill("Gorgui Sall");
  await page.getByRole("row", { name: /Gorgui Sall/ }).click();
  await expect(page.getByTestId("lost-blocked")).toContainText("Un colis en attente ne peut pas être déclaré perdu");
  await page.getByRole("button", { name: "Déclarer le colis perdu" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer la perte" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un colis en attente ne peut pas être déclaré perdu");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("En attente");
});

test("a delivered parcel offers no way to declare it lost", async ({ page }) => {
  await login(page);
  await page.goto("/colis?statut=DELIVERED");
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("Livré");
  await expect(page.getByRole("button", { name: "Déclarer le colis perdu" })).toHaveCount(0);
});

test("a recipient phone is masked until it is revealed on demand", async ({ page }) => {
  await login(page);
  await page.goto("/colis?statut=DELIVERED");
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+221•+\d{2}$/);
  await page.getByRole("button", { name: "Révéler la donnée" }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+2217713\d{5}$/);
  await page.getByRole("button", { name: "Masquer la donnée" }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+221•+\d{2}$/);
});

test("customer accounts list the four clients and open their loyalty, sponsorship and reviews", async ({ page }) => {
  await login(page);
  await page.goto("/clients/comptes");
  await expect(page.getByRole("heading", { name: "Comptes clients" })).toBeVisible();
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /Aïssatou Sarr/ }).click();
  await expect(page).toHaveURL(/\/clients\/comptes\/[0-9a-f-]+$/);
  await expect(page.getByTestId("customer-kind")).toHaveText("Particulier");
  await page.getByRole("tab", { name: "Fidélité" }).click();
  await expect(page.getByTestId("loyalty-total")).toHaveText(/^\d[\d\s  ]* pts$/);
  await page.getByRole("tab", { name: "Parrainage" }).click();
  await expect(page.getByTestId("sponsorship-row")).toHaveCount(2);
  await page.getByRole("tab", { name: "Avis" }).click();
  await expect(page.getByRole("link", { name: /\S/ }).first()).toBeVisible();

  await page.goto("/clients/comptes");
  await page.getByRole("row", { name: /Ndèye Diouf/ }).click();
  await page.getByRole("tab", { name: "Parrainage" }).click();
  await expect(page.getByTestId("sponsored-by")).toContainText("Aïssatou Sarr");

  await page.goto("/clients/comptes");
  await page.getByRole("row", { name: /Lamine Camara/ }).click();
  await expect(page.getByTestId("customer-kind")).toHaveText("Entreprise");
});

test("loyalty programs are listed with one inactive program", async ({ page }) => {
  await login(page);
  await page.goto("/clients/fidelite");
  await expect(page.getByRole("heading", { name: "Fidélité" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Inactif/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Fidélité .*Actif/ }).first()).toBeVisible();
});

test("a pending review is ignored with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/clients/avis?statut=PENDING");
  await page.getByPlaceholder("Rechercher un avis…").fill("Climatisation en panne");
  await page.getByRole("row", { name: /Climatisation en panne pendant le trajet/ }).click();
  await expect(page.getByTestId("feedback-status")).toHaveText("En attente");
  await page.getByRole("button", { name: "Ignorer l'avis" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Ignorer cet avis" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Avis hors sujet signalé par la compagnie");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("feedback-status")).toHaveText("Ignoré");
  await expect(page.getByRole("button", { name: "Ignorer l'avis" })).toHaveCount(0);
  await expect(page.getByTestId("ignore-blocked")).toContainText("Cet avis est déjà traité");
});

test("a resolved review shows the company's response and cannot be ignored", async ({ page }) => {
  await login(page);
  await page.goto("/clients/avis?statut=RESOLVED");
  await page.getByPlaceholder("Rechercher un avis…").fill("Service impeccable");
  await page.getByRole("row", { name: /Service impeccable au guichet/ }).click();
  await expect(page.getByTestId("feedback-status")).toHaveText("Résolu");
  await expect(page.getByText("Merci pour votre retour, nous en avons tenu compte.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ignorer l'avis" })).toHaveCount(0);
  await expect(page.getByTestId("ignore-blocked")).toContainText("Cet avis est déjà traité");
});
```

3. Étendre le test `@prod` : après les appels existants à `detailPath(...)`, ajouter

```ts
  const parcelPath = await detailPath("/colis", "Yacine", "Rechercher un colis…", /Yacine Ndoye/);
  const customerPath = await detailPath("/clients/comptes", "Aïssatou", "Rechercher un client…", /Aïssatou Sarr/);
  const feedbackPath = await detailPath("/clients/avis", "Service impeccable", "Rechercher un avis…", /Service impeccable au guichet/);
```

étendre la constante `PHONES` avec le nouveau préfixe : `const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/, /\+2217713\d{5}/];` et ajouter au tableau `paths` : `"/colis"`, `"/colis?statut=LOST"`, `parcelPath`, `` `${parcelPath}?onglet=itineraire` ``, `` `${parcelPath}?onglet=historique` ``, `"/clients/comptes"`, `customerPath`, `` `${customerPath}?onglet=fidelite` ``, `` `${customerPath}?onglet=parrainage` ``, `"/clients/fidelite"`, `"/clients/avis"`, `"/clients/avis?statut=PENDING"`, `feedbackPath`.

(Le test existant applique à chaque chemin les expressions régulières d'e-mails, de téléphones et d'IP complètes sur le HTML brut et le DOM : le numéro complet d'un destinataire n'y apparaît jamais, seulement sa version masquée.)

Si le test `a pending review is ignored…` ou `an in-transit parcel is declared lost…` a déjà tourné, son entité est modifiée : le `@prod` n'en dépend pas (il ouvre « Yacine Ndoye » et « Service impeccable au guichet », deux entités en lecture seule).

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter à la section des lots livrés un paragraphe « Lot 6 : colis et clients » décrivant les 7 écrans et les deux actions (« Déclarer le colis perdu », « Ignorer l'avis ») ainsi que la révélation journalisée du téléphone d'un destinataire, puis ajouter à la liste des limites : pas de création ni de modification de colis (le backoffice ne remplace pas le guichet) ; une perte déclarée n'est pas annulable et ne déclenche aucun remboursement ; documents de colis non affichés ; adresse du destinataire absente ; paliers de fidélité affichés tels quels, jamais recalculés ; pas de dépense de points ; un avis ignoré n'est pas restaurable et la plateforme ne répond pas aux avis ; les points sont dérivés des réservations en ligne payées de la graine.

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable parcels and clients navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 7 écrans (Tasks 5 et 6), modèle de données et graines (Tasks 1 et 2), règles de perte et d'ignorance avec ordre des gardes (Tasks 3 et 4), révélation journalisée (Task 3), dérivation des points (Task 1), navigation et fil d'Ariane (Task 7), tests unitaires et E2E (Tasks 1 à 4 et 7), limites (README).
- **Cohérence des noms** : `parcelsRepo.listRows/get/detail/declareLost/logReveal`, `lostBlockReason`, `customersRepo.listRows/detail`, `loyaltyRepo.listPrograms`, `feedbackRepo.listRows/get/detail/ignore`, `feedbackIgnoreBlockReason`, `declareParcelLost`, `revealParcelRecipientPhone`, `ignoreFeedback` sont utilisés à l'identique dans les tâches ; `hashCode`, `CLIENTS` et `PEOPLE` viennent du lot 5 et de `seed.ts`.
- **Refus E2E d'un colis clos** : le bouton n'est pas affiché pour un colis clos (décision de la Task 5), donc le refus « déjà clos » n'est prouvé que par les tests unitaires ; l'E2E vérifie l'absence du bouton. Choix assumé, symétrique de l'avis résolu.
- **Risques connus, à signaler à l'implémenteur** : (1) la dérivation des points suppose que les réservations en ligne payées du lot 5 appartiennent aux comptes clients ; (2) la couverture des sept statuts de colis repose sur le volume des trajets partis du lot 4 ; (3) `toHaveText(/^\d[\d\s  ]* pts$/)` dépend du format de `formatNumber` (`Intl` `fr-FR`, espace fine insécable) ; (4) `getByRole("link", { name: /→/ })` suppose que `routeLabel` contient une flèche ; (5) les tests de graine n'ont pas été exécutés. Corriger la graine ou le sélecteur plutôt qu'affaiblir un test, et consigner l'écart dans le plan.
