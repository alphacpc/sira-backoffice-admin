# Backoffice Sira, lot 5 : ventes et paiements des voyageurs. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les cinq entrées « Bientôt disponible » de la section « Ventes et paiements » par de vraies pages sur données statiques typées : réservations (liste et fiche à quatre onglets), paiements des voyageurs (liste avec incohérences et fiche), billets (liste et fiche avec scans), moyens de paiement et tableau de bord du libre-service en ligne, avec une seule action serveur : « Annuler la réservation » (motif obligatoire, refusée si la réservation est déjà annulée, payée ou a un paiement en cours).

**Architecture:** Même socle que les lots 1 à 4. Quatre types (`Booking`, `PaymentMethod`, `Transaction`, `Ticket`) rejoignent le store ; une graine `seedSales` les dérive des plans de sièges du lot 4 (un siège `occupied` = réservation payée avec transaction réussie et billet, un siège `booked` = réservation non payée). Un dépôt `src/lib/repos/sales.ts` porte les projections client (`BookingRow`, `TransactionRow`, `TicketRow`, `PaymentMethodRow`), les détails serveur (`BookingDetail`, `TransactionDetail`, `TicketDetail`), les incohérences de paiement (calculées à la lecture avec une horloge injectée) et la mutation `bookingsRepo.cancel`. Les pages sont des Server Components ; chaque liste est un `DataTable` client qui ne reçoit qu'une projection. L'action `cancelBooking` passe par `run()`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21 (`ColumnDef<T, unknown>`, `accessorKey`/`accessorFn`, prop `rowHref` de `DataTable`), Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : le lot 4 est terminé et commité** (Tasks 1 à 7 de `docs/superpowers/plans/2026-11-02-backoffice-lot4.md`). Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ** (le plan ne les fige pas : ils dépendent de l'état exact du lot 4). Le lot 4 fournit `routeLabel`, `fleetCompanies`, `parseCompanyFilter` (`src/lib/repos/fleet.ts`), le composant `CompanyFilter` (`src/components/fleet/company-filter.tsx`), les types `Trip`, `Bus`, `SeatMap`, `Station`, `Route` et les pages `/flotte/trajets/[id]`.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : `cancelBooking` passe par `run()` de `src/lib/actions/run.ts` (session vérifiée **avant** toute lecture ou écriture), renvoie un `ActionResult` et ne lève jamais d'exception pour un échec attendu.
- Action sensible (annuler une réservation) : confirmation + **motif obligatoire**, rogné (`trim`), **500 caractères au plus** (`requireReason` : `"Motif trop long (500 caractères maximum)"`), jamais tronqué. Ordre des gardes du dépôt : réservation existante (`"Réservation introuvable"`) → motif (`"Un motif est obligatoire"`) → pas déjà annulée (`"Cette réservation est déjà annulée"`) → pas payée (`"Une réservation payée ne peut pas être annulée"`) → aucune transaction `PENDING` (`"Un paiement est en cours sur cette réservation"`). Effets : `status = "cancelled"`, `cancelledAt = now`, `cancelReason = "PLATFORM"`, siège `booked` → `free` dans le plan de sièges du trajet, `Trip.availableSeats + 1`, entrée d'activité rattachée à la compagnie : `Réservation <code> annulée. Motif : <motif>`.
- Le journal d'activité ne contient jamais d'e-mail, de téléphone ni d'objet métier complet.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `Booking`, `Transaction`, `Ticket`, `BookingDetail`, `TransactionDetail` ni `TicketDetail` ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. Les imports depuis `@/lib/repos/sales` dans un composant client sont des `import type`. Un passager n'a ni e-mail ni téléphone dans le backoffice. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Pas de `rowHref` sur un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (aucune ici : le bouton « Annuler la réservation » est sur la fiche).
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions, qui utilisent l'horloge réelle), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre test ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, motif ≤ 500, réservation inconnue, motif, déjà annulée, payée, paiement en cours, ordre des gardes, frontière de 30 minutes d'un paiement bloqué, projections) est prouvée par un test **qui échoue quand on retire la garde** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`, qui construit le serveur de production) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas dans l'arbre, supprimer `.next` et relancer : ce n'est pas une erreur du code.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création ou modification de réservations, billets ou moyens de paiement ; scan de billet ; remboursement ; reprise d'un paiement bloqué ; exécution réelle de l'expiration ; recherche globale ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Dérivation de la graine** : les réservations sont dérivées des plans de sièges du lot 4 (pas de nouveau tirage au sort) ; `Trip.availableSeats` n'est **jamais modifié** par la graine (il vaut déjà le nombre de sièges libres). Un siège `blocked` ou `free` n'a pas de réservation active ; une réservation annulée pointe un siège `free`.
2. **Plafond de 6 réservations par trajet** : la graine ne crée une réservation que pour les 6 premiers sièges `booked`/`occupied` (ordre du plan). Les autres restent simplement sans réservation : le test de cohérence ne vérifie que le sens « réservation → siège ».
3. **Codes** : `BK-`, `TX-`, `TK-` suivis de 8 caractères base 36 majuscules, issus de `hashCode(prefix, n)` (multiplication par 2 654 435 761 modulo 2³², bijective donc sans collision pour n < 2³²).
4. **Identifiants** : préfixes `uid(31, …)` moyens de paiement, `uid(32, …)` réservations, `uid(33, …)` transactions, `uid(34, …)` billets (les préfixes jusqu'à 23 sont déjà pris ; vérifier par `grep -n "uid(3[1-4]" src/lib/data/seed.ts` avant de commencer : aucune occurrence attendue).
5. **Âges des paiements en attente** : 2 à 9 minutes (jamais plus de 10), pour rester sous la limite de 30 minutes pendant toute une exécution E2E ; les deux paiements bloqués (3 h et 26 h) sont les deux premières transactions `PENDING` de la graine.
6. **Une transaction `FAILED` ne bloque pas l'annulation** (le client peut retenter, mais l'annulation par la plateforme est légitime) ; seule une `PENDING` la bloque.
7. **Bouton « Annuler la réservation »** affiché pour toute réservation `confirmed` (le serveur refuse les autres cas avec un message lisible dans le dialogue) : c'est ce qui rend les deux refus jouables en E2E. Sur la fiche, une note affiche aussi `cancelBlockedReason` quand il existe.
8. **Passagers de scénario** : « Rokhaya Thiaw » (au guichet, non payée, sans transaction), « Samba Kébé » (au guichet, transaction en attente non bloquée), « Coumba Lô » (au guichet, payée, billet émis, montants cohérents). Ils sont attribués, après génération, à la première réservation au guichet confirmée qui vérifie chaque condition.
9. **`Transaction.reference`** est affichée à la place de l'identifiant ; les fiches de billets sont adressées par `ticketCode` (`/ventes/billets/TK-…`), les autres par `id`.
10. **Test E2E du lot 1 `unimplemented sections show a coming-soon page`** : il visite `/ventes/reservations` (modifié au lot 4), qui devient une vraie page ici ; il visite désormais `/colis`.
11. **Pastilles de filtre** : canal « Tous les canaux / Guichet / En ligne » ; statut « Toutes / Confirmées / Annulées » ; paiement « Tous les paiements / En attente / Payées / Échouées » ; paiements voyageurs « Tous / En attente / Réussis / Échoués » et « Toutes / Avec incohérence » ; billets « Tous / Émis / Enregistrés / Utilisés / Annulés ».

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `a booking without payment is cancelled with a mandatory reason` | passager « Rokhaya Thiaw » | `cancelled`, une entrée d'activité, un siège libéré |
| `a booking with a payment in progress cannot be cancelled` | passager « Samba Kébé » | lecture seule (refus, rien ne change) |
| `a paid booking cannot be cancelled` | passager « Coumba Lô » | lecture seule (refus, rien ne change) |

Les autres tests de ventes sont en lecture seule. « Coumba Lô » est aussi lu par le test de liste (lecture seule). Aucun de ces tests ne peut empoisonner un autre en cas d'échec à mi-parcours, d'où l'absence de `try/finally`.

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) Booking, PaymentMethod, Transaction, Ticket + unions
src/lib/data/seed.ts                           (modifié) Store étendu, seedSales, constantes de ventes
src/lib/repos/sales.ts                         (créé)   dépôts, projections, anomalies, chronologie, annulation, statistiques en ligne
src/lib/labels.ts                              (modifié) badges et libellés de ventes
src/app/(admin)/ventes/actions.ts              (créé)   cancelBooking
src/components/sales/{booking-tabs,cancel-booking-button}.tsx                                           (créés)
src/app/(admin)/ventes/reservations/{page,bookings-table}.tsx, reservations/[id]/{page,not-found}.tsx  (créés)
src/app/(admin)/ventes/paiements/{page,transactions-table}.tsx, paiements/[id]/{page,not-found}.tsx    (créés)
src/app/(admin)/ventes/billets/{page,tickets-table}.tsx, billets/[code]/{page,not-found}.tsx           (créés)
src/app/(admin)/ventes/moyens-de-paiement/{page,payment-methods-table}.tsx                              (créés)
src/app/(admin)/ventes/en-ligne/page.tsx                                                                (créé)
src/lib/nav.ts                                 (modifié) 5 entrées implémentées, libellés, préfixes de fil d'Ariane
tests/unit/{sales-seed,sales-repo,sales-rules,sales-actions}.test.ts   (créés)
tests/unit/{labels,nav}.test.ts                (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

---
### Task 1: Types et graine des ventes (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`
- Create: `tests/unit/sales-seed.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)` et ses helpers `uid`, `iso`, la constante `PEOPLE`, la constante `CLIENTS` et la liste `store.users` (les comptes clients sont créés **avant** l'appel de `seedSales`), `store.trips`, `store.seatMaps`, `store.companies` (lots 1 à 4).
- Produces:
  - Types : `BookingStatus`, `BookingPaymentStatus`, `BookingChannel`, `CancelReason`, `PaymentMethodKind`, `TransactionStatus`, `TicketStatus`, `Booking`, `PaymentMethod`, `Transaction`, `Ticket`.
  - `Store` : `paymentMethods: PaymentMethod[]`, `bookings: Booking[]`, `transactions: Transaction[]`, `tickets: Ticket[]`.
  - Constantes exportées de `seed.ts` : aucune (le test s'appuie sur les noms de scénario en dur).

- [ ] **Step 1: Types**

Ajouter à la fin de `src/lib/types/index.ts` :

```ts
export type BookingStatus = "confirmed" | "cancelled";
export type BookingPaymentStatus = "pending" | "paid" | "failed";
export type BookingChannel = "counter" | "online";
/** Who ended the booking: the unpaid-booking expiry, the client, or the platform team. */
export type CancelReason = "EXPIRED" | "CLIENT" | "PLATFORM";

/** Traveller booking (`booking-service`). A passenger has a name only: no e-mail, no phone. */
export interface Booking {
  id: string; companyId: string; tripId: string;
  /** Client account for an online booking, `null` at the counter. */
  userId: string | null;
  passengerName: string;
  bookingCode: string;
  seatNumber: string | null;
  status: BookingStatus; paymentStatus: BookingPaymentStatus; channel: BookingChannel;
  amount: number; currency: string; ticketIssued: boolean;
  createdAt: string; cancelledAt: string | null; cancelReason: CancelReason | null;
}

export type PaymentMethodKind = "MOBILE_MONEY" | "CARD" | "CASH";

export interface PaymentMethod {
  id: string; companyId: string; name: string; kind: PaymentMethodKind; provider: string | null; active: boolean;
}

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Transaction {
  id: string; companyId: string; bookingId: string; paymentMethodId: string; reference: string;
  amount: number; currency: string; status: TransactionStatus; failureReason: string | null;
  createdAt: string; completedAt: string | null;
}

export type TicketStatus = "ISSUED" | "CHECKED_IN" | "USED" | "CANCELLED";

export interface Ticket {
  id: string; companyId: string; bookingId: string; tripId: string; ticketCode: string;
  seatNumber: string | null; status: TicketStatus; issuedAt: string;
  /** ISO dates of the scans, oldest first. */
  scans: string[];
}
```

- [ ] **Step 2: Écrire le test de graine (rouge)**

Créer `tests/unit/sales-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
beforeEach(() => resetStore(NOW));

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const bookingNamed = (name: string) => {
  const found = getStore().bookings.filter((b) => b.passengerName === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};

describe("sales seed: references", () => {
  it("links every booking to a trip, a seat map seat and, online, to a client account of the same company scope", () => {
    const s = getStore();
    const trips = byId(s.trips), users = byId(s.users);
    expect(s.bookings.length).toBeGreaterThan(100);
    for (const b of s.bookings) {
      const trip = trips.get(b.tripId);
      expect(trip, b.bookingCode).toBeDefined();
      expect(trip!.companyId).toBe(b.companyId);
      expect(b.amount).toBe(trip!.price);
      expect(b.currency).toBe(trip!.currency);
      const map = s.seatMaps.find((m) => m.tripId === b.tripId)!;
      expect(map.seats.some((x) => x.code === b.seatNumber), b.bookingCode).toBe(true);
      if (b.channel === "online") {
        expect(users.get(b.userId!)?.roleCode).toBe("USER");
        expect(b.passengerName).toBe(users.get(b.userId!)!.displayName);
      } else {
        expect(b.userId).toBeNull();
      }
    }
  });

  it("generates unique, well-formed codes", () => {
    const s = getStore();
    const check = (codes: string[], re: RegExp) => {
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of codes) expect(c).toMatch(re);
    };
    check(s.bookings.map((b) => b.bookingCode), /^BK-[0-9A-Z]{8}$/);
    check(s.transactions.map((t) => t.reference), /^TX-[0-9A-Z]{8}$/);
    check(s.tickets.map((t) => t.ticketCode), /^TK-[0-9A-Z]{8}$/);
  });

  it("keeps ids unique across the four new collections", () => {
    const s = getStore();
    for (const list of [s.paymentMethods, s.bookings, s.transactions, s.tickets]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});

describe("sales seed: seats", () => {
  it("matches the seat map: unpaid active bookings sit on booked seats, paid ones on occupied seats, cancelled ones on free seats", () => {
    const s = getStore();
    for (const b of s.bookings) {
      const seat = s.seatMaps.find((m) => m.tripId === b.tripId)!.seats.find((x) => x.code === b.seatNumber)!;
      const expected = b.status === "cancelled" ? "free" : b.paymentStatus === "paid" ? "occupied" : "booked";
      expect(seat.state, b.bookingCode).toBe(expected);
    }
  });

  it("never gives two active bookings the same seat on a trip", () => {
    const seen = new Set<string>();
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      const key = `${b.tripId}/${b.seatNumber}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("leaves Trip.availableSeats equal to the free seats of its map", () => {
    const s = getStore();
    for (const t of s.trips) {
      const map = s.seatMaps.find((m) => m.tripId === t.id)!;
      expect(t.availableSeats).toBe(map.seats.filter((x) => x.state === "free").length);
    }
  });

  it("caps the active bookings of a trip at 6", () => {
    const counts = new Map<string, number>();
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      counts.set(b.tripId, (counts.get(b.tripId) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThan(10);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(6);
  });
});

describe("sales seed: payments and tickets", () => {
  it("gives every paid booking a completed transaction, and every failed one a failed transaction with a reason", () => {
    const s = getStore();
    for (const b of s.bookings) {
      const txs = s.transactions.filter((t) => t.bookingId === b.id);
      if (b.paymentStatus === "paid") expect(txs.some((t) => t.status === "COMPLETED"), b.bookingCode).toBe(true);
      if (b.paymentStatus === "failed") {
        expect(txs).toHaveLength(1);
        expect(txs[0]!.status).toBe("FAILED");
        expect(txs[0]!.failureReason).toBeTruthy();
      }
      if (b.status === "cancelled") expect(txs).toHaveLength(0);
    }
    for (const t of s.transactions) {
      if (t.status !== "FAILED") expect(t.failureReason).toBeNull();
      expect(t.completedAt === null).toBe(t.status === "PENDING");
    }
  });

  it("uses a payment method of the booking's own company", () => {
    const s = getStore();
    const methods = byId(s.paymentMethods), bookings = byId(s.bookings);
    expect(s.transactions.length).toBeGreaterThan(100);
    for (const t of s.transactions) {
      expect(methods.get(t.paymentMethodId)!.companyId).toBe(t.companyId);
      expect(bookings.get(t.bookingId)!.companyId).toBe(t.companyId);
    }
  });

  it("issues each ticket to a paid booking of the same trip and company, at most one per booking", () => {
    const s = getStore();
    const bookings = byId(s.bookings);
    const perBooking = new Map<string, number>();
    for (const t of s.tickets) {
      const b = bookings.get(t.bookingId)!;
      expect(b.paymentStatus).toBe("paid");
      expect([t.tripId, t.companyId, t.seatNumber]).toEqual([b.tripId, b.companyId, b.seatNumber]);
      perBooking.set(t.bookingId, (perBooking.get(t.bookingId) ?? 0) + 1);
    }
    for (const n of perBooking.values()) expect(n).toBe(1);
    // ticketIssued mirrors the existence of a ticket, except for the one seeded gap.
    const paidWithoutTicket = s.bookings.filter((b) => b.paymentStatus === "paid" && !perBooking.has(b.id));
    expect(paidWithoutTicket).toHaveLength(1);
    expect(paidWithoutTicket[0]!.ticketIssued).toBe(false);
    for (const b of s.bookings.filter((x) => perBooking.has(x.id))) expect(b.ticketIssued).toBe(true);
  });

  it("covers every ticket status the flow produces and records scans only on checked-in or used tickets", () => {
    const s = getStore();
    const statuses = new Set(s.tickets.map((t) => t.status));
    expect([...statuses].sort()).toEqual(["CHECKED_IN", "ISSUED", "USED"]);
    for (const t of s.tickets) {
      if (t.status === "ISSUED") expect(t.scans).toEqual([]);
      else expect(t.scans.length).toBeGreaterThan(0);
    }
  });

  it("covers the three cancellation causes and expires an unpaid online booking exactly 30 minutes after its creation", () => {
    const cancelled = getStore().bookings.filter((b) => b.status === "cancelled");
    expect(new Set(cancelled.map((b) => b.cancelReason))).toEqual(new Set(["EXPIRED", "CLIENT", "PLATFORM"]));
    for (const b of cancelled) {
      expect(b.cancelledAt).not.toBeNull();
      if (b.cancelReason === "EXPIRED") {
        expect(Date.parse(b.cancelledAt!) - Date.parse(b.createdAt)).toBe(30 * MINUTE);
        expect(b.channel).toBe("online");
      }
      if (b.cancelReason === "PLATFORM") expect(b.channel).toBe("counter");
    }
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      expect(b.cancelledAt).toBeNull();
      expect(b.cancelReason).toBeNull();
    }
  });
});

describe("sales seed: anomalies", () => {
  it("seeds exactly two stuck payments, one amount mismatch and one missing ticket", () => {
    const s = getStore();
    const bookings = byId(s.bookings);
    const stuck = s.transactions.filter((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) > 30 * MINUTE);
    expect(stuck.map((t) => Math.round((NOW.getTime() - Date.parse(t.createdAt)) / MINUTE)).sort((a, b) => a - b)).toEqual([180, 1560]);
    const mismatched = s.transactions.filter((t) => t.amount !== bookings.get(t.bookingId)!.amount);
    expect(mismatched).toHaveLength(1);
    expect(mismatched[0]!.status).toBe("COMPLETED");
    const ticketed = new Set(s.tickets.map((t) => t.bookingId));
    expect(s.transactions.filter((t) => t.status === "COMPLETED" && !ticketed.has(t.bookingId))).toHaveLength(1);
  });

  it("keeps the other pending payments and unpaid online bookings young (10 minutes at most) so they stay valid during a test run", () => {
    const s = getStore();
    const stuckIds = new Set(
      s.transactions.filter((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) > 30 * MINUTE).map((t) => t.id),
    );
    const young = s.transactions.filter((t) => t.status === "PENDING" && !stuckIds.has(t.id));
    expect(young.length).toBeGreaterThan(5);
    for (const t of young) expect(NOW.getTime() - Date.parse(t.createdAt)).toBeLessThanOrEqual(10 * MINUTE);
    const unpaidOnline = s.bookings.filter(
      (b) => b.channel === "online" && b.status === "confirmed" && b.paymentStatus !== "paid"
        && !s.transactions.some((t) => t.bookingId === b.id && stuckIds.has(t.id)),
    );
    expect(unpaidOnline.length).toBeGreaterThan(5);
    for (const b of unpaidOnline) expect(NOW.getTime() - Date.parse(b.createdAt)).toBeLessThanOrEqual(11 * MINUTE);
  });
});

describe("sales seed: scenarios", () => {
  it("has one counter booking per E2E scenario", () => {
    const s = getStore();
    const txsOf = (id: string) => s.transactions.filter((t) => t.bookingId === id);

    const cancellable = bookingNamed("Rokhaya Thiaw");
    expect([cancellable.channel, cancellable.status, cancellable.paymentStatus]).toEqual(["counter", "confirmed", "pending"]);
    expect(txsOf(cancellable.id)).toHaveLength(0);

    const inProgress = bookingNamed("Samba Kébé");
    expect([inProgress.channel, inProgress.status, inProgress.paymentStatus]).toEqual(["counter", "confirmed", "pending"]);
    const pending = txsOf(inProgress.id).filter((t) => t.status === "PENDING");
    expect(pending).toHaveLength(1);
    expect(NOW.getTime() - Date.parse(pending[0]!.createdAt)).toBeLessThanOrEqual(10 * MINUTE);

    const paid = bookingNamed("Coumba Lô");
    expect([paid.channel, paid.status, paid.paymentStatus, paid.ticketIssued]).toEqual(["counter", "confirmed", "paid", true]);
    expect(s.tickets.filter((t) => t.bookingId === paid.id)).toHaveLength(1);
    expect(txsOf(paid.id).every((t) => t.amount === paid.amount)).toBe(true);
  });
});

describe("sales seed: payment methods", () => {
  it("gives each active company Orange Money, Wave and cash, with Wave inactive for one company in four", () => {
    const s = getStore();
    for (const c of s.companies) {
      const mine = s.paymentMethods.filter((m) => m.companyId === c.id);
      if (c.status !== "active") { expect(mine).toHaveLength(0); continue; }
      expect(mine.map((m) => m.name)).toEqual(expect.arrayContaining(["Orange Money", "Wave", "Espèces au guichet"]));
      expect(mine.find((m) => m.name === "Espèces au guichet")).toMatchObject({ kind: "CASH", provider: null, active: true });
    }
    const wave = s.paymentMethods.filter((m) => m.name === "Wave");
    expect(wave.some((m) => !m.active)).toBe(true);
    expect(wave.some((m) => m.active)).toBe(true);
    expect(s.paymentMethods.some((m) => m.kind === "CARD")).toBe(true);
  });
});

describe("sales seed: no personal data", () => {
  it("contains no e-mail address and no phone number", () => {
    const s = getStore();
    const text = JSON.stringify([s.paymentMethods, s.bookings, s.transactions, s.tickets]);
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\+221/);
  });

  it("writes nothing but labels and identifiers to the activity log", () => {
    for (const a of getStore().activity) expect(a.action).not.toMatch(/@|\+221/);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/sales-seed.test.ts`
Expected: FAIL (le compilateur de test tolère les propriétés absentes ; l'échec vient de `s.bookings` / `s.paymentMethods` indéfinis : `Cannot read properties of undefined`).

- [ ] **Step 4: Étendre le store et la graine**

Dans `src/lib/data/seed.ts` :

1. Ajouter à l'import de types (liste existante, ordre alphabétique conservé) : `Booking`, `BookingChannel`, `BookingPaymentStatus`, `BookingStatus`, `CancelReason`, `PaymentMethod`, `PaymentMethodKind`, `Ticket`, `TicketStatus`, `Transaction`, `TransactionStatus`.
2. Dans `interface Store`, après `crew: CrewMember[];` :

```ts
  paymentMethods: PaymentMethod[];
  bookings: Booking[];
  transactions: Transaction[];
  tickets: Ticket[];
```

3. Dans le littéral de `buildSeed`, remplacer la ligne `stations: [], routes: [], fleets: [], vendors: [], seatMaps: [], maintenances: [], crew: [],` par :

```ts
    stations: [], routes: [], fleets: [], vendors: [], seatMaps: [], maintenances: [], crew: [],
    paymentMethods: [], bookings: [], transactions: [], tickets: [],
```

4. Juste après la fermeture du bloc `CLIENTS.forEach((c, k) => { … });` (et avant le commentaire `// Sessions:`), ajouter :

```ts
  seedSales(store, now, iso);
```

5. À la fin du fichier, après `seatState`, ajouter :

```ts
const SCENARIO_NAMES = { cancellable: "Rokhaya Thiaw", inProgress: "Samba Kébé", paid: "Coumba Lô" } as const;
const FAILURE_REASONS = ["Solde insuffisant", "Délai de confirmation dépassé", "Paiement refusé par l'opérateur"];
const CANCEL_REASONS: CancelReason[] = ["EXPIRED", "CLIENT", "PLATFORM"];
/** A trip never gets more than this many seeded bookings, whatever its size. */
const MAX_BOOKINGS_PER_TRIP = 6;
const STUCK_AGES_MINUTES = [3 * 60, 26 * 60];

/** Unique, well-formed code: `prefix` + 8 base-36 characters (Knuth's multiplicative hash is a bijection modulo 2^32). */
function hashCode(prefix: string, n: number): string {
  return prefix + ((n * 2_654_435_761) % 2 ** 32).toString(36).toUpperCase().padStart(8, "0");
}

/**
 * Sales of every trip, derived from its seat map: an `occupied` seat is a paid booking (completed
 * transaction, ticket), a `booked` seat an unpaid one (no transaction, a pending one or a failed one,
 * in rotation); one trip in five also gets a cancelled booking on a free seat. Then four anomalies are
 * planted (two stuck payments, one amount mismatch, one missing ticket) and three scenario passengers named.
 */
function seedSales(store: Store, now: Date, iso: (offsetDays: number) => string): void {
  let methodSeq = 1, bookingSeq = 1, txSeq = 1, ticketSeq = 1;
  const nowMs = now.getTime();
  const ago = (minutes: number) => new Date(nowMs - minutes * 60_000).toISOString();
  const clients = CLIENTS.map((c) => store.users.find((u) => u.username === c.username)!);

  store.companies.forEach((company, i) => {
    if (company.status !== "active") return;
    const methods: [string, PaymentMethodKind, string | null, boolean][] = [
      ["Orange Money", "MOBILE_MONEY", "ORANGE", true],
      ["Wave", "MOBILE_MONEY", "WAVE", i % 4 !== 1],
      ["Espèces au guichet", "CASH", null, true],
    ];
    if (i % 5 === 2) methods.push(["Carte bancaire", "CARD", "VISA", true]);
    for (const [name, kind, provider, active] of methods) {
      store.paymentMethods.push({ id: uid(31, methodSeq++), companyId: company.id, name, kind, provider, active });
    }
  });

  store.trips.forEach((trip, ti) => {
    const map = store.seatMaps.find((m) => m.tripId === trip.id);
    if (!map) return;
    const methods = store.paymentMethods.filter((m) => m.companyId === trip.companyId);
    const mobile = methods.filter((m) => m.kind === "MOBILE_MONEY");
    const cash = methods.find((m) => m.kind === "CASH")!;
    const departure = Date.parse(trip.departure);

    const create = (
      seat: string, channel: BookingChannel, status: BookingStatus, paymentStatus: BookingPaymentStatus,
      createdAt: string, n: number,
    ): Booking => {
      const client = clients[n % clients.length]!;
      const booking: Booking = {
        id: uid(32, bookingSeq), companyId: trip.companyId, tripId: trip.id,
        userId: channel === "online" ? client.id : null,
        passengerName: channel === "online" ? client.displayName : PEOPLE[n % PEOPLE.length]!,
        bookingCode: hashCode("BK-", bookingSeq), seatNumber: seat, status, paymentStatus, channel,
        amount: trip.price, currency: trip.currency, ticketIssued: false,
        createdAt, cancelledAt: null, cancelReason: null,
      };
      bookingSeq++;
      store.bookings.push(booking);
      return booking;
    };
    const transact = (
      b: Booking, methodId: string, status: TransactionStatus,
      createdAt: string, completedAt: string | null, failureReason: string | null,
    ) => {
      store.transactions.push({
        id: uid(33, txSeq), companyId: b.companyId, bookingId: b.id, paymentMethodId: methodId,
        reference: hashCode("TX-", txSeq), amount: b.amount, currency: b.currency, status, failureReason,
        createdAt, completedAt,
      });
      txSeq++;
    };
    const issue = (b: Booking, status: TicketStatus, issuedAt: string, scans: string[]) => {
      b.ticketIssued = true;
      store.tickets.push({
        id: uid(34, ticketSeq), companyId: b.companyId, bookingId: b.id, tripId: b.tripId,
        ticketCode: hashCode("TK-", ticketSeq), seatNumber: b.seatNumber, status, issuedAt, scans,
      });
      ticketSeq++;
    };

    const claimed = map.seats
      .filter((x) => x.state === "booked" || x.state === "occupied")
      .slice(0, MAX_BOOKINGS_PER_TRIP);
    claimed.forEach((seat, j) => {
      const n = ti * 10 + j;
      const channel: BookingChannel = (ti + j) % 3 === 0 ? "counter" : "online";
      const method = channel === "online" ? mobile[n % mobile.length]! : cash;
      if (seat.state === "occupied") {
        const created = new Date(departure - (2 + (n % 4)) * 86_400_000).toISOString();
        const paidAt = new Date(Date.parse(created) + 3 * 60_000).toISOString();
        const b = create(seat.code, channel, "confirmed", "paid", created, n);
        transact(b, method.id, "COMPLETED", created, paidAt, null);
        if (trip.status === "departed") issue(b, "USED", paidAt, [new Date(departure - 40 * 60_000).toISOString()]);
        else if (j % 2 === 0) issue(b, "CHECKED_IN", paidAt, [ago(20)]);
        else issue(b, "ISSUED", paidAt, []);
        return;
      }
      const minutes = 2 + (n % 8);
      const created = ago(minutes + 1);
      const kind = j % 3;
      if (kind === 0) {
        create(seat.code, channel, "confirmed", "pending", created, n);
      } else if (kind === 1) {
        const b = create(seat.code, channel, "confirmed", "pending", created, n);
        transact(b, method.id, "PENDING", ago(minutes), null, null);
      } else {
        const b = create(seat.code, channel, "confirmed", "failed", created, n);
        transact(b, method.id, "FAILED", ago(minutes), ago(minutes - 1), FAILURE_REASONS[n % FAILURE_REASONS.length]!);
      }
    });

    if (ti % 5 === 0) {
      const free = map.seats.find((x) => x.state === "free");
      if (free) {
        const n = ti * 10 + 9;
        const reason = CANCEL_REASONS[(ti / 5) % CANCEL_REASONS.length]!;
        const createdMs = Math.min(departure - 3 * 86_400_000, nowMs - 3 * 3_600_000);
        const b = create(free.code, reason === "PLATFORM" ? "counter" : "online", "cancelled", "pending", new Date(createdMs).toISOString(), n);
        b.cancelReason = reason;
        b.cancelledAt = new Date(createdMs + (reason === "EXPIRED" ? 30 : 120) * 60_000).toISOString();
      }
    }
  });

  // Anomalies: the first two pending payments are stuck, the second completed one has the wrong amount,
  // the third completed one has lost its ticket.
  const bookingOf = (id: string) => store.bookings.find((b) => b.id === id)!;
  const pendingTx = store.transactions.filter((t) => t.status === "PENDING");
  STUCK_AGES_MINUTES.forEach((minutes, k) => {
    const t = pendingTx[k]!;
    t.createdAt = ago(minutes);
    bookingOf(t.bookingId).createdAt = ago(minutes + 1);
  });
  const completed = store.transactions.filter((t) => t.status === "COMPLETED");
  completed[1]!.amount -= 500;
  const orphan = bookingOf(completed[2]!.bookingId);
  orphan.ticketIssued = false;
  store.tickets = store.tickets.filter((t) => t.bookingId !== orphan.id);

  // Scenario passengers (counter bookings): one cancellable, one with a payment in progress, one paid.
  const txsOf = (id: string) => store.transactions.filter((t) => t.bookingId === id);
  const counter = store.bookings.filter((b) => b.channel === "counter" && b.status === "confirmed");
  counter.find((b) => b.paymentStatus === "pending" && txsOf(b.id).length === 0)!.passengerName = SCENARIO_NAMES.cancellable;
  counter.find((b) =>
    b.paymentStatus === "pending"
    && txsOf(b.id).some((t) => t.status === "PENDING" && Date.parse(t.createdAt) > nowMs - 30 * 60_000),
  )!.passengerName = SCENARIO_NAMES.inProgress;
  counter.find((b) =>
    b.paymentStatus === "paid" && b.ticketIssued && txsOf(b.id).every((t) => t.amount === b.amount),
  )!.passengerName = SCENARIO_NAMES.paid;
}
```

`iso` n'est pas utilisé dans `seedSales` (les dates y sont calculées en millisecondes depuis `now`) : retirer le paramètre `iso` de la signature et de l'appel si le linter ou `tsc` signale un paramètre inutilisé ; sinon le laisser pour l'homogénéité avec `seedFleet`. Garder la version qui compile sans avertissement.

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/sales-seed.test.ts` puis `pnpm test` puis `pnpm typecheck`
Expected: PASS partout. Si `young.length` ou `unpaidOnline.length` ne dépasse pas 5, c'est un défaut de la dérivation (jamais un test à assouplir) : ajuster la graine (par exemple en relevant `MAX_BOOKINGS_PER_TRIP`) et le signaler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts tests/unit/sales-seed.test.ts
git commit -m "feat: sales seed with payment methods, bookings, transactions and tickets

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Libellés, dépôts de lecture et incohérences (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/sales.ts`, `tests/unit/sales-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `routeLabel(routeId)` (lot 4), `addActivity` (lot 1), les types de la Task 1.
- Produces (`src/lib/repos/sales.ts`) :
  - Constantes : `STUCK_AFTER_MINUTES = 30`, `ONLINE_UNPAID_TTL_MINUTES = 30`, `BOOKING_STATUSES`, `BOOKING_PAYMENT_STATUSES`, `BOOKING_CHANNELS`, `TRANSACTION_STATUSES`, `TICKET_STATUSES` (tableaux `as const`).
  - Types : `AnomalyKind = "STUCK" | "AMOUNT_MISMATCH" | "MISSING_TICKET"`, `BookingRow`, `TransactionRow`, `TicketRow`, `PaymentMethodRow`, `TimelineEvent`, `BookingDetail`, `TransactionDetail`, `TicketDetail`, `ExpiringBooking`, `OnlineStats`.
  - `transactionAnomalies(tx: Transaction, now: Date): AnomalyKind[]`, `cancelBlockReason(booking: Booking): string | null`.
  - `bookingsRepo.listRows(filter, ): BookingRow[]`, `bookingsRepo.detail(id, now?)`, `bookingsRepo.cancel(id, reason, actor?, now?)` (cette dernière est ajoutée à la Task 3).
  - `transactionsRepo.listRows(filter, now?)`, `transactionsRepo.detail(id, now?)`, `ticketsRepo.listRows(filter)`, `ticketsRepo.detailByCode(code)`, `paymentMethodsRepo.listRows(filter)`, `onlineRepo.stats(now?)`.
  - Dans `labels.ts` : `bookingStatusBadge`, `bookingPaymentBadge`, `transactionStatusBadge`, `ticketStatusBadge`, `channelLabel`, `paymentKindLabel`, `cancelReasonLabel`, `anomalyLabel`, `anomalyExplanation`.

- [ ] **Step 1: Libellés (test rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` (importer les nouveaux noms dans l'import existant de `@/lib/labels`, ou ajouter un second import) :

```ts
import {
  anomalyExplanation, anomalyLabel, bookingPaymentBadge, bookingStatusBadge, cancelReasonLabel,
  channelLabel, paymentKindLabel, ticketStatusBadge, transactionStatusBadge,
} from "@/lib/labels";

describe("sales labels", () => {
  it("labels booking, payment, transaction and ticket statuses", () => {
    expect(bookingStatusBadge("confirmed")).toEqual({ label: "Confirmée", tone: "success" });
    expect(bookingStatusBadge("cancelled")).toEqual({ label: "Annulée", tone: "neutral" });
    expect(bookingPaymentBadge("pending")).toEqual({ label: "En attente", tone: "warning" });
    expect(bookingPaymentBadge("paid")).toEqual({ label: "Payée", tone: "success" });
    expect(bookingPaymentBadge("failed")).toEqual({ label: "Échouée", tone: "danger" });
    expect(transactionStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(transactionStatusBadge("COMPLETED")).toEqual({ label: "Réussie", tone: "success" });
    expect(transactionStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(ticketStatusBadge("ISSUED")).toEqual({ label: "Émis", tone: "info" });
    expect(ticketStatusBadge("CHECKED_IN")).toEqual({ label: "Enregistré", tone: "success" });
    expect(ticketStatusBadge("USED")).toEqual({ label: "Utilisé", tone: "neutral" });
    expect(ticketStatusBadge("CANCELLED")).toEqual({ label: "Annulé", tone: "danger" });
  });

  it("labels channels, payment kinds, cancellation causes and anomalies", () => {
    expect(channelLabel("online")).toBe("En ligne");
    expect(channelLabel("counter")).toBe("Guichet");
    expect(paymentKindLabel("MOBILE_MONEY")).toBe("Mobile money");
    expect(paymentKindLabel("CARD")).toBe("Carte bancaire");
    expect(paymentKindLabel("CASH")).toBe("Espèces");
    expect(cancelReasonLabel("EXPIRED")).toBe("Expirée (non payée à temps)");
    expect(cancelReasonLabel("CLIENT")).toBe("Annulée par le client");
    expect(cancelReasonLabel("PLATFORM")).toBe("Annulée par l'équipe Sira");
    expect(anomalyLabel("STUCK")).toBe("Paiement bloqué");
    expect(anomalyLabel("AMOUNT_MISMATCH")).toBe("Montant différent");
    expect(anomalyLabel("MISSING_TICKET")).toBe("Billet manquant");
    expect(anomalyExplanation("STUCK")).toBe("Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.");
    expect(anomalyExplanation("AMOUNT_MISMATCH")).toBe("Le montant de la transaction ne correspond pas à celui de la réservation.");
    expect(anomalyExplanation("MISSING_TICKET")).toBe("Le paiement est réussi mais aucun billet n'a été émis pour cette réservation.");
  });
});
```

Dans `src/lib/labels.ts`, ajouter `AnomalyKind` à… non : `AnomalyKind` est défini dans `sales.ts` ; pour éviter une dépendance de `labels.ts` vers un dépôt, **définir `AnomalyKind` dans `src/lib/types/index.ts`** (ajouter `export type AnomalyKind = "STUCK" | "AMOUNT_MISMATCH" | "MISSING_TICKET";` à la suite des types de la Task 1) et le ré-exporter depuis `sales.ts` (`export type { AnomalyKind } from "@/lib/types";`). Étendre l'import de types de `labels.ts` avec `AnomalyKind, BookingChannel, BookingPaymentStatus, BookingStatus, CancelReason, PaymentMethodKind, TicketStatus, TransactionStatus`, puis ajouter à la fin du fichier :

```ts
export const bookingStatusBadge = (s: BookingStatus): Badge =>
  pick({
    confirmed: { label: "Confirmée", tone: "success" },
    cancelled: { label: "Annulée", tone: "neutral" },
  }, s);

export const bookingPaymentBadge = (s: BookingPaymentStatus): Badge =>
  pick({
    pending: { label: "En attente", tone: "warning" },
    paid: { label: "Payée", tone: "success" },
    failed: { label: "Échouée", tone: "danger" },
  }, s);

export const transactionStatusBadge = (s: TransactionStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    COMPLETED: { label: "Réussie", tone: "success" },
    FAILED: { label: "Échouée", tone: "danger" },
  }, s);

export const ticketStatusBadge = (s: TicketStatus): Badge =>
  pick({
    ISSUED: { label: "Émis", tone: "info" },
    CHECKED_IN: { label: "Enregistré", tone: "success" },
    USED: { label: "Utilisé", tone: "neutral" },
    CANCELLED: { label: "Annulé", tone: "danger" },
  }, s);

export const channelLabel = (c: BookingChannel): string => (c === "online" ? "En ligne" : "Guichet");

export const paymentKindLabel = (k: PaymentMethodKind): string =>
  ({ MOBILE_MONEY: "Mobile money", CARD: "Carte bancaire", CASH: "Espèces" })[k];

export const cancelReasonLabel = (r: CancelReason): string =>
  ({
    EXPIRED: "Expirée (non payée à temps)",
    CLIENT: "Annulée par le client",
    PLATFORM: "Annulée par l'équipe Sira",
  })[r];

export const anomalyLabel = (k: AnomalyKind): string =>
  ({ STUCK: "Paiement bloqué", AMOUNT_MISMATCH: "Montant différent", MISSING_TICKET: "Billet manquant" })[k];

export const anomalyExplanation = (k: AnomalyKind): string =>
  ({
    STUCK: "Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.",
    AMOUNT_MISMATCH: "Le montant de la transaction ne correspond pas à celui de la réservation.",
    MISSING_TICKET: "Le paiement est réussi mais aucun billet n'a été émis pour cette réservation.",
  })[k];
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant l'ajout dans `labels.ts`, vert après).

- [ ] **Step 2: Écrire le test de dépôt (rouge)**

Créer `tests/unit/sales-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  bookingsRepo, cancelBlockReason, onlineRepo, paymentMethodsRepo, ticketsRepo, transactionAnomalies, transactionsRepo,
} from "@/lib/repos/sales";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
beforeEach(() => resetStore(NOW));

const bookingNamed = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;

describe("booking list", () => {
  it("lists every booking newest first, with a deterministic tie-break", () => {
    const rows = bookingsRepo.listRows({});
    expect(rows).toHaveLength(getStore().bookings.length);
    for (let i = 1; i < rows.length; i++) {
      const [a, b] = [rows[i - 1]!, rows[i]!];
      expect(a.createdAt >= b.createdAt).toBe(true);
    }
  });

  it("filters by company, status, payment status and channel, and combines the filters", () => {
    const s = getStore();
    const companyId = s.bookings[0]!.companyId;
    expect(bookingsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    expect(bookingsRepo.listRows({ companyId }).length).toBeGreaterThan(0);
    const cancelled = bookingsRepo.listRows({ status: "cancelled" });
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every((r) => r.status === "cancelled")).toBe(true);
    const failed = bookingsRepo.listRows({ paymentStatus: "failed" });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((r) => r.paymentStatus === "failed")).toBe(true);
    const counter = bookingsRepo.listRows({ channel: "counter" });
    expect(counter.every((r) => r.channel === "counter")).toBe(true);
    const both = bookingsRepo.listRows({ channel: "counter", paymentStatus: "paid" });
    expect(both.length).toBeGreaterThan(0);
    expect(both.every((r) => r.channel === "counter" && r.paymentStatus === "paid")).toBe(true);
    expect(both.length).toBeLessThan(counter.length);
  });

  it("exposes only client-safe fields", () => {
    const row = bookingsRepo.listRows({})[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "amount", "bookingCode", "channel", "companyId", "companyName", "createdAt", "currency", "departure", "id",
      "passengerName", "paymentStatus", "routeLabel", "seatNumber", "status",
    ]);
    expect(row.routeLabel).toMatch(/→/);
  });
});

describe("booking detail", () => {
  it("returns undefined for an unknown booking", () => {
    expect(bookingsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
  });

  it("builds an ordered timeline for a paid booking", () => {
    const d = bookingsRepo.detail(bookingNamed("Coumba Lô").id, NOW)!;
    expect(d.companyName).not.toBe("—");
    expect(d.routeLabel).toMatch(/→/);
    expect(d.transactions).toHaveLength(1);
    expect(d.tickets).toHaveLength(1);
    const labels = d.timeline.map((e) => e.label);
    expect(labels[0]).toBe("Réservation créée au guichet");
    expect(labels).toContain("Paiement lancé (Espèces au guichet)");
    expect(labels).toContain("Paiement réussi");
    expect(labels).toContain(`Billet ${d.tickets[0]!.ticketCode} émis`);
    for (let i = 1; i < d.timeline.length; i++) expect(d.timeline[i - 1]!.at <= d.timeline[i]!.at).toBe(true);
  });

  it("records the failure reason, the scans and the cancellation cause in the timeline", () => {
    const s = getStore();
    const failedBooking = s.bookings.find((b) => b.paymentStatus === "failed")!;
    const failedTx = s.transactions.find((t) => t.bookingId === failedBooking.id)!;
    expect(bookingsRepo.detail(failedBooking.id, NOW)!.timeline.map((e) => e.label))
      .toContain(`Paiement échoué : ${failedTx.failureReason}`);

    const scanned = s.tickets.find((t) => t.scans.length > 0)!;
    expect(bookingsRepo.detail(scanned.bookingId, NOW)!.timeline.map((e) => e.label))
      .toContain(`Billet ${scanned.ticketCode} scanné`);

    const expired = s.bookings.find((b) => b.cancelReason === "EXPIRED")!;
    const last = bookingsRepo.detail(expired.id, NOW)!.timeline.at(-1)!;
    expect(last.label).toBe("Réservation annulée : Expirée (non payée à temps)");
    expect(last.at).toBe(expired.cancelledAt);
  });

  it("explains why a booking cannot be cancelled", () => {
    expect(cancelBlockReason(bookingNamed("Rokhaya Thiaw"))).toBeNull();
    expect(cancelBlockReason(bookingNamed("Samba Kébé"))).toBe("Un paiement est en cours sur cette réservation");
    expect(cancelBlockReason(bookingNamed("Coumba Lô"))).toBe("Une réservation payée ne peut pas être annulée");
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    expect(cancelBlockReason(cancelled)).toBe("Cette réservation est déjà annulée");
    const failed = getStore().bookings.find((b) => b.paymentStatus === "failed" && b.status === "confirmed")!;
    expect(cancelBlockReason(failed)).toBeNull();
    expect(bookingsRepo.detail(bookingNamed("Samba Kébé").id, NOW)!.cancelBlockedReason)
      .toBe("Un paiement est en cours sur cette réservation");
  });
});

describe("payment anomalies", () => {
  it("flags exactly the four seeded anomalies", () => {
    const rows = transactionsRepo.listRows({ anomalyOnly: true }, NOW);
    expect(rows).toHaveLength(4);
    const kinds = rows.flatMap((r) => r.anomalies).sort();
    expect(kinds).toEqual(["AMOUNT_MISMATCH", "MISSING_TICKET", "STUCK", "STUCK"]);
    expect(transactionsRepo.listRows({}, NOW).filter((r) => r.anomalies.length > 0)).toHaveLength(4);
  });

  it("treats a pending payment as stuck only after strictly more than 30 minutes", () => {
    const tx = getStore().transactions.find((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) < 11 * MINUTE)!;
    const at = (ms: number) => ({ ...tx, createdAt: new Date(NOW.getTime() - ms).toISOString() });
    expect(transactionAnomalies(at(30 * MINUTE), NOW)).not.toContain("STUCK");
    expect(transactionAnomalies(at(30 * MINUTE + 1), NOW)).toContain("STUCK");
    // The clock is injected: the same payment is stuck two hours later.
    expect(transactionAnomalies(tx, new Date(NOW.getTime() + 2 * 60 * MINUTE))).toContain("STUCK");
    expect(transactionAnomalies(tx, NOW)).not.toContain("STUCK");
  });

  it("never flags a completed or failed payment as stuck", () => {
    const old = new Date(NOW.getTime() + 24 * 60 * MINUTE * 30);
    for (const t of getStore().transactions.filter((x) => x.status !== "PENDING")) {
      expect(transactionAnomalies(t, old)).not.toContain("STUCK");
    }
  });
});

describe("transactions", () => {
  it("filters by status and company and exposes only client-safe fields", () => {
    const s = getStore();
    const completed = transactionsRepo.listRows({ status: "COMPLETED" }, NOW);
    expect(completed.length).toBeGreaterThan(0);
    expect(completed.every((r) => r.status === "COMPLETED")).toBe(true);
    const companyId = s.transactions[0]!.companyId;
    expect(transactionsRepo.listRows({ companyId }, NOW).every((r) => r.companyId === companyId)).toBe(true);
    expect(Object.keys(completed[0]!).sort()).toEqual([
      "amount", "anomalies", "bookingCode", "bookingId", "companyId", "companyName", "completedAt", "createdAt",
      "currency", "failureReason", "id", "methodName", "passengerName", "reference", "status",
    ]);
  });

  it("returns a detail with the booking and one explanation per anomaly, undefined when unknown", () => {
    const stuck = transactionsRepo.listRows({ anomalyOnly: true }, NOW).find((r) => r.anomalies.includes("STUCK"))!;
    const d = transactionsRepo.detail(stuck.id, NOW)!;
    expect(d.transaction.reference).toBe(stuck.reference);
    expect(d.booking.bookingCode).toBe(stuck.bookingCode);
    expect(d.anomalies).toEqual([{
      kind: "STUCK", label: "Paiement bloqué",
      explanation: "Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.",
    }]);
    expect(transactionsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
  });
});

describe("tickets", () => {
  it("lists and filters tickets, newest first", () => {
    const all = ticketsRepo.listRows({});
    expect(all).toHaveLength(getStore().tickets.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.issuedAt >= all[i]!.issuedAt).toBe(true);
    const used = ticketsRepo.listRows({ status: "USED" });
    expect(used.length).toBeGreaterThan(0);
    expect(used.every((r) => r.status === "USED" && r.scanCount > 0)).toBe(true);
    expect(Object.keys(all[0]!).sort()).toEqual([
      "bookingCode", "bookingId", "companyId", "companyName", "departure", "id", "issuedAt", "passengerName",
      "routeLabel", "scanCount", "seatNumber", "status", "ticketCode",
    ]);
  });

  it("resolves a ticket by code with its scans, undefined when unknown", () => {
    const scanned = getStore().tickets.find((t) => t.scans.length > 0)!;
    const d = ticketsRepo.detailByCode(scanned.ticketCode)!;
    expect(d.ticket.ticketCode).toBe(scanned.ticketCode);
    expect(d.scans).toEqual(scanned.scans);
    expect(ticketsRepo.detailByCode("TK-INCONNU0")).toBeUndefined();
  });
});

describe("payment methods", () => {
  it("counts transactions and computes the success rate over finished payments", () => {
    const s = getStore();
    const rows = paymentMethodsRepo.listRows({});
    expect(rows).toHaveLength(s.paymentMethods.length);
    const withTraffic = rows.find((r) => r.transactions > 0 && r.failed > 0)!;
    const txs = s.transactions.filter((t) => t.paymentMethodId === withTraffic.id);
    expect(withTraffic.transactions).toBe(txs.length);
    expect(withTraffic.completed).toBe(txs.filter((t) => t.status === "COMPLETED").length);
    expect(withTraffic.failed).toBe(txs.filter((t) => t.status === "FAILED").length);
    expect(withTraffic.successRate).toBe(Math.round((withTraffic.completed / (withTraffic.completed + withTraffic.failed)) * 100));
    const idle = rows.find((r) => r.completed + r.failed === 0)!;
    expect(idle.successRate).toBeNull();
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "active", "companyId", "companyName", "completed", "failed", "id", "kind", "name", "provider", "successRate", "transactions",
    ]);
  });

  it("filters by company", () => {
    const companyId = getStore().paymentMethods[0]!.companyId;
    const rows = paymentMethodsRepo.listRows({ companyId });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.companyId === companyId)).toBe(true);
  });
});

describe("online self-service stats", () => {
  it("counts online bookings, conversion, failures, expiries and stuck payments", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online");
    const stats = onlineRepo.stats(NOW);
    expect(stats.total).toBe(online.length);
    expect(stats.paid).toBe(online.filter((b) => b.paymentStatus === "paid").length);
    expect(stats.conversionPercent).toBe(Math.round((stats.paid / stats.total) * 100));
    expect(stats.expired).toBe(online.filter((b) => b.cancelReason === "EXPIRED").length);
    expect(stats.failedPayments).toBe(
      s.transactions.filter((t) => t.status === "FAILED" && online.some((b) => b.id === t.bookingId)).length,
    );
    expect(stats.stuck).toBe(
      transactionsRepo.listRows({}, NOW).filter((r) => r.anomalies.includes("STUCK") && online.some((b) => b.id === r.bookingId)).length,
    );
  });

  it("lists unpaid online bookings without a pending payment, soonest expiry first, 30 minutes after creation", () => {
    const s = getStore();
    const { expiring } = onlineRepo.stats(NOW);
    expect(expiring.length).toBeGreaterThan(5);
    for (let i = 1; i < expiring.length; i++) expect(expiring[i - 1]!.minutesLeft <= expiring[i]!.minutesLeft).toBe(true);
    for (const e of expiring) {
      const b = s.bookings.find((x) => x.id === e.id)!;
      expect(b.channel).toBe("online");
      expect(b.status).toBe("confirmed");
      expect(b.paymentStatus).not.toBe("paid");
      expect(s.transactions.some((t) => t.bookingId === b.id && t.status === "PENDING")).toBe(false);
      expect(e.minutesLeft).toBe(Math.ceil((Date.parse(b.createdAt) + 30 * MINUTE - NOW.getTime()) / MINUTE));
    }
    expect(Object.keys(expiring[0]!).sort()).toEqual(["amount", "bookingCode", "companyName", "currency", "id", "minutesLeft", "passengerName"]);
  });

  it("reports an expiry that has passed as zero or negative minutes left", () => {
    const later = new Date(NOW.getTime() + 60 * MINUTE);
    const { expiring } = onlineRepo.stats(later);
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring.every((e) => e.minutesLeft <= 0)).toBe(true);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/sales-repo.test.ts`
Expected: FAIL (`Cannot find module "@/lib/repos/sales"`).

- [ ] **Step 4: Implémenter le dépôt**

Créer `src/lib/repos/sales.ts` :

```ts
import { addActivity } from "@/lib/repos/activity";
import { anomalyExplanation, anomalyLabel } from "@/lib/labels";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type {
  AnomalyKind, Booking, BookingChannel, BookingPaymentStatus, BookingStatus, CancelReason, PaymentMethodKind,
  Ticket, TicketStatus, Transaction, TransactionStatus, TripStatus,
} from "@/lib/types";

export type { AnomalyKind } from "@/lib/types";

const MINUTE = 60_000;

/** A pending payment is stuck once it has waited strictly longer than this. */
export const STUCK_AFTER_MINUTES = 30;
/** An unpaid online booking expires this long after its creation. */
export const ONLINE_UNPAID_TTL_MINUTES = 30;

export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;
export const BOOKING_PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export const BOOKING_CHANNELS = ["counter", "online"] as const;
export const TRANSACTION_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export const TICKET_STATUSES = ["ISSUED", "CHECKED_IN", "USED", "CANCELLED"] as const;

/** Client-safe projection of a booking. */
export interface BookingRow {
  id: string; bookingCode: string; companyId: string; companyName: string; passengerName: string;
  routeLabel: string; departure: string; seatNumber: string | null; amount: number; currency: string;
  channel: BookingChannel; status: BookingStatus; paymentStatus: BookingPaymentStatus; createdAt: string;
}

/** Client-safe projection of a transaction, with its computed anomalies. */
export interface TransactionRow {
  id: string; reference: string; bookingId: string; bookingCode: string; companyId: string; companyName: string;
  passengerName: string; methodName: string; amount: number; currency: string; status: TransactionStatus;
  failureReason: string | null; createdAt: string; completedAt: string | null; anomalies: AnomalyKind[];
}

/** Client-safe projection of a ticket. */
export interface TicketRow {
  id: string; ticketCode: string; bookingId: string; bookingCode: string; companyId: string; companyName: string;
  passengerName: string; routeLabel: string; departure: string; seatNumber: string | null;
  status: TicketStatus; issuedAt: string; scanCount: number;
}

/** Client-safe projection of a payment method with its traffic. */
export interface PaymentMethodRow {
  id: string; companyId: string; companyName: string; name: string; kind: PaymentMethodKind;
  provider: string | null; active: boolean; transactions: number; completed: number; failed: number;
  /** Percentage of finished payments (completed or failed) that succeeded; `null` without any. */
  successRate: number | null;
}

export interface TimelineEvent { at: string; label: string }

export interface BookingDetail {
  booking: Booking;
  companyName: string;
  routeLabel: string;
  departure: string;
  tripStatus: TripStatus;
  busPlate: string;
  transactions: TransactionRow[];
  tickets: TicketRow[];
  timeline: TimelineEvent[];
  cancelBlockedReason: string | null;
}

export interface TransactionDetail {
  transaction: TransactionRow;
  booking: Pick<Booking, "id" | "bookingCode" | "passengerName" | "seatNumber" | "amount" | "currency" | "status" | "paymentStatus">;
  anomalies: { kind: AnomalyKind; label: string; explanation: string }[];
}

export interface TicketDetail { ticket: TicketRow; scans: string[] }

export interface ExpiringBooking {
  id: string; bookingCode: string; companyName: string; passengerName: string;
  amount: number; currency: string; minutesLeft: number;
}

export interface OnlineStats {
  total: number; paid: number; conversionPercent: number | null; failedPayments: number;
  expired: number; stuck: number; expiring: ExpiringBooking[];
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

function tripInfo(tripId: string): { routeLabel: string; departure: string; status: TripStatus; busPlate: string } {
  const s = getStore();
  const trip = s.trips.find((t) => t.id === tripId);
  if (!trip) return { routeLabel: "—", departure: "", status: "planned", busPlate: "—" };
  return {
    routeLabel: routeLabel(trip.routeId), departure: trip.departure, status: trip.status,
    busPlate: s.buses.find((b) => b.id === trip.busId)?.plate ?? "—",
  };
}

/** Why a booking cannot be cancelled by the platform, `null` when it can. Same order as the cancel guards. */
export function cancelBlockReason(booking: Booking): string | null {
  if (booking.status === "cancelled") return "Cette réservation est déjà annulée";
  if (booking.paymentStatus === "paid") return "Une réservation payée ne peut pas être annulée";
  if (getStore().transactions.some((t) => t.bookingId === booking.id && t.status === "PENDING")) {
    return "Un paiement est en cours sur cette réservation";
  }
  return null;
}

/** Anomalies of a transaction, computed against the injected clock (never stored). */
export function transactionAnomalies(tx: Transaction, now: Date): AnomalyKind[] {
  const s = getStore();
  const found: AnomalyKind[] = [];
  if (tx.status === "PENDING" && now.getTime() - Date.parse(tx.createdAt) > STUCK_AFTER_MINUTES * MINUTE) {
    found.push("STUCK");
  }
  const booking = s.bookings.find((b) => b.id === tx.bookingId);
  if (booking && booking.amount !== tx.amount) found.push("AMOUNT_MISMATCH");
  if (tx.status === "COMPLETED" && !s.tickets.some((t) => t.bookingId === tx.bookingId)) found.push("MISSING_TICKET");
  return found;
}

function bookingRow(b: Booking): BookingRow {
  const trip = tripInfo(b.tripId);
  return {
    id: b.id, bookingCode: b.bookingCode, companyId: b.companyId, companyName: companyName(b.companyId),
    passengerName: b.passengerName, routeLabel: trip.routeLabel, departure: trip.departure,
    seatNumber: b.seatNumber, amount: b.amount, currency: b.currency, channel: b.channel,
    status: b.status, paymentStatus: b.paymentStatus, createdAt: b.createdAt,
  };
}

function transactionRow(t: Transaction, now: Date): TransactionRow {
  const s = getStore();
  const booking = s.bookings.find((b) => b.id === t.bookingId);
  return {
    id: t.id, reference: t.reference, bookingId: t.bookingId, bookingCode: booking?.bookingCode ?? "—",
    companyId: t.companyId, companyName: companyName(t.companyId), passengerName: booking?.passengerName ?? "—",
    methodName: s.paymentMethods.find((m) => m.id === t.paymentMethodId)?.name ?? "—",
    amount: t.amount, currency: t.currency, status: t.status, failureReason: t.failureReason,
    createdAt: t.createdAt, completedAt: t.completedAt, anomalies: transactionAnomalies(t, now),
  };
}

function ticketRow(t: Ticket): TicketRow {
  const booking = getStore().bookings.find((b) => b.id === t.bookingId);
  const trip = tripInfo(t.tripId);
  return {
    id: t.id, ticketCode: t.ticketCode, bookingId: t.bookingId, bookingCode: booking?.bookingCode ?? "—",
    companyId: t.companyId, companyName: companyName(t.companyId), passengerName: booking?.passengerName ?? "—",
    routeLabel: trip.routeLabel, departure: trip.departure, seatNumber: t.seatNumber,
    status: t.status, issuedAt: t.issuedAt, scanCount: t.scans.length,
  };
}

function timelineOf(b: Booking, txs: Transaction[], tickets: Ticket[]): TimelineEvent[] {
  const s = getStore();
  const events: TimelineEvent[] = [{
    at: b.createdAt, label: b.channel === "online" ? "Réservation créée en ligne" : "Réservation créée au guichet",
  }];
  for (const t of txs) {
    const method = s.paymentMethods.find((m) => m.id === t.paymentMethodId)?.name ?? "—";
    events.push({ at: t.createdAt, label: `Paiement lancé (${method})` });
    if (t.completedAt) {
      events.push({
        at: t.completedAt,
        label: t.status === "COMPLETED" ? "Paiement réussi" : `Paiement échoué : ${t.failureReason ?? "motif inconnu"}`,
      });
    }
  }
  for (const k of tickets) {
    events.push({ at: k.issuedAt, label: `Billet ${k.ticketCode} émis` });
    for (const scan of k.scans) events.push({ at: scan, label: `Billet ${k.ticketCode} scanné` });
  }
  if (b.cancelledAt && b.cancelReason) {
    const cause = {
      EXPIRED: "Expirée (non payée à temps)", CLIENT: "Annulée par le client", PLATFORM: "Annulée par l'équipe Sira",
    }[b.cancelReason];
    events.push({ at: b.cancelledAt, label: `Réservation annulée : ${cause}` });
  }
  return events.sort((a, c) => a.at.localeCompare(c.at));
}

export const bookingsRepo = {
  listRows(filter: {
    companyId?: string; status?: BookingStatus; paymentStatus?: BookingPaymentStatus; channel?: BookingChannel;
  } = {}): BookingRow[] {
    return getStore().bookings
      .filter((b) =>
        (!filter.companyId || b.companyId === filter.companyId) &&
        (!filter.status || b.status === filter.status) &&
        (!filter.paymentStatus || b.paymentStatus === filter.paymentStatus) &&
        (!filter.channel || b.channel === filter.channel))
      .sort(newest((b) => b.createdAt))
      .map(bookingRow);
  },

  get(id: string): Booking | undefined {
    return getStore().bookings.find((b) => b.id === id);
  },

  detail(id: string, now: Date = new Date()): BookingDetail | undefined {
    const s = getStore();
    const booking = s.bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    const trip = tripInfo(booking.tripId);
    const txs = s.transactions.filter((t) => t.bookingId === id).sort(newest((t) => t.createdAt));
    const tickets = s.tickets.filter((t) => t.bookingId === id);
    return {
      booking, companyName: companyName(booking.companyId),
      routeLabel: trip.routeLabel, departure: trip.departure, tripStatus: trip.status, busPlate: trip.busPlate,
      transactions: txs.map((t) => transactionRow(t, now)),
      tickets: tickets.map(ticketRow),
      timeline: timelineOf(booking, txs, tickets),
      cancelBlockedReason: cancelBlockReason(booking),
    };
  },
};

export const transactionsRepo = {
  listRows(
    filter: { companyId?: string; status?: TransactionStatus; anomalyOnly?: boolean } = {}, now: Date = new Date(),
  ): TransactionRow[] {
    return getStore().transactions
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(newest((t) => t.createdAt))
      .map((t) => transactionRow(t, now))
      .filter((r) => !filter.anomalyOnly || r.anomalies.length > 0);
  },

  detail(id: string, now: Date = new Date()): TransactionDetail | undefined {
    const s = getStore();
    const tx = s.transactions.find((t) => t.id === id);
    if (!tx) return undefined;
    const row = transactionRow(tx, now);
    const b = s.bookings.find((x) => x.id === tx.bookingId);
    if (!b) return undefined;
    return {
      transaction: row,
      booking: {
        id: b.id, bookingCode: b.bookingCode, passengerName: b.passengerName, seatNumber: b.seatNumber,
        amount: b.amount, currency: b.currency, status: b.status, paymentStatus: b.paymentStatus,
      },
      anomalies: row.anomalies.map((kind) => ({ kind, label: anomalyLabel(kind), explanation: anomalyExplanation(kind) })),
    };
  },
};

export const ticketsRepo = {
  listRows(filter: { companyId?: string; status?: TicketStatus } = {}): TicketRow[] {
    return getStore().tickets
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(newest((t) => t.issuedAt))
      .map(ticketRow);
  },

  detailByCode(code: string): TicketDetail | undefined {
    const ticket = getStore().tickets.find((t) => t.ticketCode === code);
    return ticket ? { ticket: ticketRow(ticket), scans: [...ticket.scans] } : undefined;
  },
};

export const paymentMethodsRepo = {
  listRows(filter: { companyId?: string } = {}): PaymentMethodRow[] {
    const s = getStore();
    return s.paymentMethods
      .filter((m) => !filter.companyId || m.companyId === filter.companyId)
      .map((m) => {
        const txs = s.transactions.filter((t) => t.paymentMethodId === m.id);
        const completed = txs.filter((t) => t.status === "COMPLETED").length;
        const failed = txs.filter((t) => t.status === "FAILED").length;
        return {
          id: m.id, companyId: m.companyId, companyName: companyName(m.companyId), name: m.name, kind: m.kind,
          provider: m.provider, active: m.active, transactions: txs.length, completed, failed,
          successRate: completed + failed === 0 ? null : Math.round((completed / (completed + failed)) * 100),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name));
  },
};

export const onlineRepo = {
  stats(now: Date = new Date()): OnlineStats {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online");
    const onlineIds = new Set(online.map((b) => b.id));
    const paid = online.filter((b) => b.paymentStatus === "paid").length;
    const expiring = online
      .filter((b) =>
        b.status === "confirmed" && b.paymentStatus !== "paid" &&
        !s.transactions.some((t) => t.bookingId === b.id && t.status === "PENDING"))
      .map((b): ExpiringBooking => ({
        id: b.id, bookingCode: b.bookingCode, companyName: companyName(b.companyId), passengerName: b.passengerName,
        amount: b.amount, currency: b.currency,
        minutesLeft: Math.ceil((Date.parse(b.createdAt) + ONLINE_UNPAID_TTL_MINUTES * MINUTE - now.getTime()) / MINUTE),
      }))
      .sort((a, b) => a.minutesLeft - b.minutesLeft || a.id.localeCompare(b.id));
    return {
      total: online.length, paid,
      conversionPercent: online.length === 0 ? null : Math.round((paid / online.length) * 100),
      failedPayments: s.transactions.filter((t) => t.status === "FAILED" && onlineIds.has(t.bookingId)).length,
      expired: online.filter((b) => b.cancelReason === "EXPIRED").length,
      stuck: s.transactions.filter((t) => onlineIds.has(t.bookingId) && transactionAnomalies(t, now).includes("STUCK")).length,
      expiring,
    };
  },
};
```

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/sales-repo.test.ts tests/unit/labels.test.ts` puis `pnpm test` puis `pnpm typecheck`
Expected: PASS. En cas d'échec sur le test « flags exactly the four seeded anomalies », vérifier d'abord la graine (Task 1), pas le test.

- [ ] **Step 6: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. `> STUCK_AFTER_MINUTES * MINUTE` → `>=` dans `transactionAnomalies` : échoue `treats a pending payment as stuck only after strictly more than 30 minutes`.
2. Retirer la condition `tx.status === "PENDING" &&` : échoue `never flags a completed or failed payment as stuck`.
3. Retirer `|| a.id.localeCompare(b.id)` n'est pas détectable (égalités rares) : ne pas tester ; en revanche remplacer `at(b).localeCompare(at(a))` par `at(a).localeCompare(at(b))` : échoue `lists every booking newest first…`.
4. Filtrer `expiring` sans `b.status === "confirmed"` : échoue `lists unpaid online bookings without a pending payment…`.
5. Remplacer `Math.ceil` par `Math.floor` dans `minutesLeft` : échoue le même test.
6. Retirer `!s.transactions.some(… "PENDING")` du filtre `expiring` : échoue le même test.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types/index.ts src/lib/labels.ts src/lib/repos/sales.ts tests/unit/labels.test.ts tests/unit/sales-repo.test.ts
git commit -m "feat: sales read repositories, anomalies, timeline and online stats

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Règle d'annulation et action serveur (TDD)

**Files:**
- Modify: `src/lib/repos/sales.ts`
- Create: `src/app/(admin)/ventes/actions.ts`, `tests/unit/sales-rules.test.ts`, `tests/unit/sales-actions.test.ts`

**Interfaces:**
- Consumes: `cancelBlockReason`, `bookingsRepo`, `addActivity`, `run`, `requireReason`, `requireString`, `ActionResult`.
- Produces: `bookingsRepo.cancel(bookingId: string, reason: string, actor?: string, now?: Date): Booking` ; `cancelBooking(bookingId: string, reason: string): Promise<ActionResult>`.

- [ ] **Step 1: Test de la règle (rouge)**

Créer `tests/unit/sales-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { bookingsRepo } from "@/lib/repos/sales";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;
const cancel = (name: string, reason = "Demande du passager") =>
  bookingsRepo.cancel(named(name).id, reason, "tester@sira.app", NOW);
const seatOf = (b: { tripId: string; seatNumber: string | null }) =>
  getStore().seatMaps.find((m) => m.tripId === b.tripId)!.seats.find((x) => x.code === b.seatNumber)!;
const tripOf = (b: { tripId: string }) => getStore().trips.find((t) => t.id === b.tripId)!;

describe("cancelling a booking", () => {
  it("cancels an unpaid booking, frees its seat, restores the trip's availability and journals it", () => {
    const target = named("Rokhaya Thiaw");
    const trip = tripOf(target);
    const free = trip.availableSeats;
    expect(seatOf(target).state).toBe("booked");
    const n = getStore().activity.length;
    const result = cancel("Rokhaya Thiaw", "  Demande du passager  ");
    expect(result).toBe(target);
    expect(target.status).toBe("cancelled");
    expect(target.cancelledAt).toBe(NOW.toISOString());
    expect(target.cancelReason).toBe("PLATFORM");
    expect(seatOf(target).state).toBe("free");
    expect(trip.availableSeats).toBe(free + 1);
    expect(trip.availableSeats).toBe(getStore().seatMaps.find((m) => m.tripId === trip.id)!.seats.filter((x) => x.state === "free").length);
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Réservation ${target.bookingCode} annulée. Motif : Demande du passager`,
    });
  });

  it("cancels a booking whose only payment failed", () => {
    const failed = getStore().bookings.find((b) => b.paymentStatus === "failed" && b.status === "confirmed")!;
    bookingsRepo.cancel(failed.id, "Paiement abandonné", "tester@sira.app", NOW);
    expect(failed.status).toBe("cancelled");
    expect(seatOf(failed).state).toBe("free");
  });

  it("refuses an unknown booking", () => {
    expect(() => bookingsRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Réservation introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = named("Rokhaya Thiaw");
    const n = getStore().activity.length;
    expect(() => cancel("Rokhaya Thiaw", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("confirmed");
    expect(seatOf(target).state).toBe("booked");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a booking that is already cancelled", () => {
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    const trip = tripOf(cancelled);
    const free = trip.availableSeats;
    expect(() => bookingsRepo.cancel(cancelled.id, "motif")).toThrow("Cette réservation est déjà annulée");
    expect(trip.availableSeats).toBe(free);
  });

  it("refuses a paid booking and leaves its seat and ticket untouched", () => {
    const paid = named("Coumba Lô");
    expect(() => cancel("Coumba Lô")).toThrow("Une réservation payée ne peut pas être annulée");
    expect(paid.status).toBe("confirmed");
    expect(seatOf(paid).state).toBe("occupied");
    expect(getStore().tickets.filter((t) => t.bookingId === paid.id)).toHaveLength(1);
  });

  it("refuses a booking with a payment in progress", () => {
    const busy = named("Samba Kébé");
    expect(() => cancel("Samba Kébé")).toThrow("Un paiement est en cours sur cette réservation");
    expect(busy.status).toBe("confirmed");
    expect(seatOf(busy).state).toBe("booked");
  });

  it("checks the guards in order: unknown, reason, already cancelled, paid, payment in progress", () => {
    // A cancelled booking with a blank reason reports the reason first.
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    expect(() => bookingsRepo.cancel(cancelled.id, "")).toThrow("Un motif est obligatoire");
    // A paid booking that is also cancelled reports "already cancelled" first.
    const both = named("Coumba Lô");
    both.status = "cancelled";
    expect(() => cancel("Coumba Lô")).toThrow("Cette réservation est déjà annulée");
    // A paid booking that also has a pending payment reports "paid" before "payment in progress".
    resetStore(NOW);
    const paid = named("Coumba Lô");
    getStore().transactions.push({ ...getStore().transactions.find((t) => t.bookingId === paid.id)!, id: "extra", status: "PENDING", completedAt: null });
    expect(() => cancel("Coumba Lô")).toThrow("Une réservation payée ne peut pas être annulée");
  });

  it("does not release a seat that is not booked", () => {
    const target = named("Rokhaya Thiaw");
    const trip = tripOf(target);
    seatOf(target).state = "free";
    const free = trip.availableSeats;
    cancel("Rokhaya Thiaw");
    expect(trip.availableSeats).toBe(free);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/sales-rules.test.ts`
Expected: FAIL (`bookingsRepo.cancel is not a function`).

- [ ] **Step 3: Implémenter `cancel`**

Dans `src/lib/repos/sales.ts`, ajouter dans l'objet `bookingsRepo`, après `detail` :

```ts
  /**
   * Cancels a booking on behalf of the platform. Guards, in this order: booking exists, reason, not already
   * cancelled, not paid, no payment in progress. A failed payment does not block. The seat goes back to the
   * trip (free in the seat map, one more available seat).
   */
  cancel(bookingId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Booking {
    const s = getStore();
    const booking = s.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Réservation introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = cancelBlockReason(booking);
    if (blocked) throw new Error(blocked);
    booking.status = "cancelled";
    booking.cancelledAt = now.toISOString();
    booking.cancelReason = "PLATFORM";
    const seat = s.seatMaps.find((m) => m.tripId === booking.tripId)?.seats.find((x) => x.code === booking.seatNumber);
    if (seat && seat.state === "booked") {
      seat.state = "free";
      const trip = s.trips.find((t) => t.id === booking.tripId);
      if (trip) trip.availableSeats += 1;
    }
    addActivity(booking.companyId, actor, `Réservation ${booking.bookingCode} annulée. Motif : ${motif}`, now);
    return booking;
  },
```

- [ ] **Step 4: Constater le vert, puis les mutations**

Run: `pnpm test tests/unit/sales-rules.test.ts` → PASS.

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer la ligne `if (!motif) throw …` : échoue `refuses a blank reason and changes nothing`.
2. Dans `cancelBlockReason`, supprimer la ligne `status === "cancelled"` : échoue `refuses a booking that is already cancelled`.
3. Supprimer la ligne `paymentStatus === "paid"` : échoue `refuses a paid booking…`.
4. Supprimer la garde `PENDING` : échoue `refuses a booking with a payment in progress`.
5. Remplacer `t.status === "PENDING"` par `t.status !== "COMPLETED"` dans `cancelBlockReason` : échoue `cancels a booking whose only payment failed`.
6. Inverser l'ordre « payée » / « annulée » dans `cancelBlockReason` : échoue `checks the guards in order…`.
7. Supprimer `trip.availableSeats += 1` : échoue le premier test.
8. Retirer `seat.state === "booked" &&` : échoue `does not release a seat that is not booked`.

- [ ] **Step 5: Test et implémentation de l'action**

Créer `tests/unit/sales-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelBooking } from "@/app/(admin)/ventes/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const named = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;

describe("cancelBooking", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = named("Rokhaya Thiaw");
    const n = getStore().activity.length;
    expect(await cancelBooking(target.id, "motif")).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(target.status).toBe("confirmed");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cancels the booking, journals the actor and revalidates the affected pages", async () => {
    const target = named("Rokhaya Thiaw");
    expect(await cancelBooking(target.id, "  Demande du passager ")).toEqual({ ok: true });
    expect(target.status).toBe("cancelled");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining([
      "/", "/ventes/reservations", `/ventes/reservations/${target.id}`, "/ventes/en-ligne",
      `/flotte/trajets/${target.tripId}`, "/flotte/plans-de-sieges", `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = named("Rokhaya Thiaw");
    expect(await cancelBooking(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("confirmed");
    expect(await cancelBooking(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("cancelled");
  });

  it("returns the rule's message as an error result, never an exception", async () => {
    expect(await cancelBooking(named("Coumba Lô").id, "motif")).toEqual({
      ok: false, error: "Une réservation payée ne peut pas être annulée",
    });
    expect(await cancelBooking(named("Samba Kébé").id, "motif")).toEqual({
      ok: false, error: "Un paiement est en cours sur cette réservation",
    });
    expect(await cancelBooking("00000000-0000-4000-8000-000000000000", "motif")).toEqual({
      ok: false, error: "Réservation introuvable",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank booking id or a blank reason", async () => {
    expect((await cancelBooking("", "motif")).ok).toBe(false);
    expect((await cancelBooking(named("Rokhaya Thiaw").id, "   ")).ok).toBe(false);
    expect(named("Rokhaya Thiaw").status).toBe("confirmed");
  });
});
```

Créer `src/app/(admin)/ventes/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { bookingsRepo } from "@/lib/repos/sales";

export async function cancelBooking(bookingId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(bookingId, "Réservation");
    const motif = requireReason(reason);
    const booking = bookingsRepo.cancel(bookingId, motif, actor);
    revalidatePath("/");
    revalidatePath("/ventes/reservations");
    revalidatePath(`/ventes/reservations/${booking.id}`);
    revalidatePath("/ventes/en-ligne");
    revalidatePath(`/flotte/trajets/${booking.tripId}`);
    revalidatePath("/flotte/plans-de-sieges");
    revalidatePath(`/compagnies/${booking.companyId}`);
  });
}
```

Mutations de l'action : (a) appeler `bookingsRepo.cancel` avant `run` (hors `run`) → échoue `reads and writes nothing without a session` ; (b) remplacer `requireReason(reason)` par `reason.trim()` → échoue le test des 501 caractères ; (c) retirer `revalidatePath("/ventes/en-ligne")` → échoue le test de revalidation.

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repos/sales.ts "src/app/(admin)/ventes/actions.ts" tests/unit/sales-rules.test.ts tests/unit/sales-actions.test.ts
git commit -m "feat: cancel booking rule and server action

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Réservations (liste, fiche, annulation)

**Files:**
- Create: `src/components/sales/booking-tabs.tsx`, `src/components/sales/cancel-booking-button.tsx`, `src/app/(admin)/ventes/reservations/page.tsx`, `src/app/(admin)/ventes/reservations/bookings-table.tsx`, `src/app/(admin)/ventes/reservations/[id]/page.tsx`, `src/app/(admin)/ventes/reservations/[id]/not-found.tsx`

**Interfaces:**
- Consumes: `bookingsRepo.listRows/detail`, constantes de filtre, `parseCompanyFilter`, `CompanyFilter`, `TabsWithUrl`, `DetailRow`, `StatusBadge`, `StatusFilterNav`, `PageHeader`, `ConfirmDialog`, `cancelBooking`, libellés de la Task 2.
- Produces: pages `/ventes/reservations` et `/ventes/reservations/[id]` ; composants `BookingTabs({ detail, initialTab })` (serveur) et `CancelBookingButton({ bookingId, bookingCode })` (client).

Pas de test unitaire dans cette tâche (les pages sont couvertes par l'E2E de la Task 7) ; `pnpm typecheck` et `pnpm build` sont la vérification.

- [ ] **Step 1: Bouton d'annulation**

Créer `src/components/sales/cancel-booking-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelBooking } from "@/app/(admin)/ventes/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the booking code labels the button and the dialog. */
export interface CancelBookingButtonProps { bookingId: string; bookingCode: string }

export function CancelBookingButton({ bookingId, bookingCode }: CancelBookingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Annuler la réservation</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la réservation ${bookingCode}`}
        description="Le siège est rendu au trajet. Une réservation payée ou dont le paiement est en cours ne peut pas être annulée."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelBooking(bookingId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Onglets de la fiche**

Créer `src/components/sales/booking-tabs.tsx` :

```tsx
import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  bookingPaymentBadge, bookingStatusBadge, cancelReasonLabel, channelLabel, ticketStatusBadge, transactionStatusBadge,
} from "@/lib/labels";
import type { BookingDetail } from "@/lib/repos/sales";

const TAB_VALUES = ["resume", "chronologie", "paiements", "billets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BookingTabs({ detail, initialTab }: { detail: BookingDetail; initialTab?: string }) {
  const { booking: b } = detail;
  const status = bookingStatusBadge(b.status);
  const payment = bookingPaymentBadge(b.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Code">{b.bookingCode}</DetailRow>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${b.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Passager">
            {b.userId ? <Link href={`/utilisateurs/${b.userId}`} className="hover:underline">{b.passengerName}</Link> : b.passengerName}
          </DetailRow>
          <DetailRow label="Canal">{channelLabel(b.channel)}</DetailRow>
          <DetailRow label="Trajet">
            <Link href={`/flotte/trajets/${b.tripId}`} className="hover:underline">
              {detail.routeLabel} · {formatDateTime(detail.departure)}
            </Link>
          </DetailRow>
          <DetailRow label="Bus">{detail.busPlate}</DetailRow>
          <DetailRow label="Siège">{b.seatNumber ?? "—"}</DetailRow>
          <DetailRow label="Montant">{formatMoney(b.amount, b.currency)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Paiement"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></DetailRow>
          <DetailRow label="Billet émis">{b.ticketIssued ? "Oui" : "Non"}</DetailRow>
          <DetailRow label="Créée le">{formatDateTime(b.createdAt)}</DetailRow>
          <DetailRow label="Annulée le">{b.cancelledAt ? formatDateTime(b.cancelledAt) : "—"}</DetailRow>
          <DetailRow label="Cause de l'annulation">{b.cancelReason ? cancelReasonLabel(b.cancelReason) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "chronologie", label: "Chronologie",
      content: (
        <Card><CardContent>
          <ol className="space-y-2 text-sm">
            {detail.timeline.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex gap-4 border-b border-border pb-2 last:border-0">
                <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(e.at)}</span>
                <span>{e.label}</span>
              </li>
            ))}
          </ol>
        </CardContent></Card>
      ),
    },
    {
      value: "paiements", label: "Paiements",
      content: (
        <Card><CardContent>
          {detail.transactions.length === 0 ? <Empty>Aucun paiement pour cette réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Référence</th>
                  <th className="py-1 font-medium">Moyen</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Lancé le</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((t) => {
                  const badge = transactionStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/paiements/${t.id}`} className="font-medium hover:underline">{t.reference}</Link>
                      </td>
                      <td>{t.methodName}</td>
                      <td className="tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.createdAt)}</td>
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
      value: "billets", label: "Billets",
      content: (
        <Card><CardContent>
          {detail.tickets.length === 0 ? <Empty>Aucun billet émis pour cette réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Siège</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Émis le</th>
                  <th className="py-1 font-medium">Scans</th>
                </tr>
              </thead>
              <tbody>
                {detail.tickets.map((t) => {
                  const badge = ticketStatusBadge(t.status);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/billets/${t.ticketCode}`} className="font-medium hover:underline">{t.ticketCode}</Link>
                      </td>
                      <td>{t.seatNumber ?? "—"}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.issuedAt)}</td>
                      <td className="tabular-nums">{t.scanCount}</td>
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

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
```

- [ ] **Step 3: Liste**

Créer `src/app/(admin)/ventes/reservations/bookings-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { bookingPaymentBadge, bookingStatusBadge, channelLabel } from "@/lib/labels";
import type { BookingRow } from "@/lib/repos/sales";

const columns: ColumnDef<BookingRow, unknown>[] = [
  { accessorKey: "bookingCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.bookingCode}</span> },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    id: "trip", header: "Trajet", accessorFn: (r) => `${r.routeLabel} ${formatDateTime(r.departure)}`,
    cell: ({ row }) => (
      <div>
        <div>{row.original.routeLabel}</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.original.departure)}</div>
      </div>
    ),
  },
  { accessorKey: "seatNumber", header: "Siège", cell: ({ row }) => row.original.seatNumber ?? "—" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  { id: "channel", header: "Canal", accessorFn: (r) => channelLabel(r.channel) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = bookingStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "paymentStatus", header: "Paiement",
    cell: ({ row }) => {
      const b = bookingPaymentBadge(row.original.paymentStatus);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  return (
    <DataTable
      columns={columns} data={bookings} rowHref={(r) => `/ventes/reservations/${r.id}`}
      searchPlaceholder="Rechercher une réservation…" emptyMessage="Aucune réservation."
    />
  );
}
```

Créer `src/app/(admin)/ventes/reservations/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { BOOKING_CHANNELS, BOOKING_PAYMENT_STATUSES, BOOKING_STATUSES, bookingsRepo } from "@/lib/repos/sales";
import { BookingsTable } from "./bookings-table";

export const dynamic = "force-dynamic";

const BASE = "/ventes/reservations";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "confirmed", label: "Confirmées" },
  { value: "cancelled", label: "Annulées" },
];
const PAYMENT_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les paiements" },
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payées" },
  { value: "failed", label: "Échouées" },
];
const CHANNEL_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les canaux" },
  { value: "counter", label: "Guichet" },
  { value: "online", label: "En ligne" },
];

export default async function BookingsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; paiement?: string; canal?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, BOOKING_STATUSES);
  const paymentStatus = parseFilter(sp.paiement, BOOKING_PAYMENT_STATUSES);
  const channel = parseFilter(sp.canal, BOOKING_CHANNELS);
  const keep = { compagnie: companyId, statut: status, paiement: paymentStatus, canal: channel };
  return (
    <>
      <PageHeader
        title="Réservations"
        description="Réservations des voyageurs de toutes les compagnies, de la plus récente à la plus ancienne."
      />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={PAYMENT_OPTIONS} current={paymentStatus} param="paiement" keep={keep} label="Filtrer par paiement" />
      <StatusFilterNav basePath={BASE} options={CHANNEL_OPTIONS} current={channel} param="canal" keep={keep} label="Filtrer par canal" />
      <BookingsTable bookings={bookingsRepo.listRows({ companyId, status, paymentStatus, channel })} />
    </>
  );
}
```

- [ ] **Step 4: Fiche**

Créer `src/app/(admin)/ventes/reservations/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { BookingTabs } from "@/components/sales/booking-tabs";
import { CancelBookingButton } from "@/components/sales/cancel-booking-button";
import { bookingPaymentBadge, bookingStatusBadge } from "@/lib/labels";
import { bookingsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = bookingsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { booking } = detail;
  const status = bookingStatusBadge(booking.status);
  const payment = bookingPaymentBadge(booking.paymentStatus);
  return (
    <>
      <PageHeader
        title={`Réservation ${booking.bookingCode}`}
        description={`${booking.passengerName} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="booking-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            <span data-testid="booking-payment"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></span>
            {booking.status === "confirmed" && (
              <CancelBookingButton bookingId={booking.id} bookingCode={booking.bookingCode} />
            )}
          </>
        }
      />
      {booking.status === "confirmed" && detail.cancelBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="cancel-blocked">
          Annulation impossible : {detail.cancelBlockedReason}.
        </p>
      )}
      <BookingTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/ventes/reservations/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function BookingNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Réservation introuvable</p>
        <Link href="/ventes/reservations" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux réservations
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `pnpm typecheck && pnpm test` → PASS. (Les pages ne sont pas encore atteignables par la navigation : `nav.ts` est modifié à la Task 7 ; la route `[...slug]` du lot 1 affiche « Bientôt disponible » pour les chemins non implémentés, mais une route réelle prime sur elle.)

- [ ] **Step 6: Commit**

```bash
git add src/components/sales "src/app/(admin)/ventes/reservations"
git commit -m "feat: bookings list and detail with cancellation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Paiements voyageurs, billets et moyens de paiement

**Files:**
- Create: `src/app/(admin)/ventes/paiements/{page.tsx,transactions-table.tsx}`, `src/app/(admin)/ventes/paiements/[id]/{page.tsx,not-found.tsx}`, `src/app/(admin)/ventes/billets/{page.tsx,tickets-table.tsx}`, `src/app/(admin)/ventes/billets/[code]/{page.tsx,not-found.tsx}`, `src/app/(admin)/ventes/moyens-de-paiement/{page.tsx,payment-methods-table.tsx}`

**Interfaces:**
- Consumes: `transactionsRepo`, `ticketsRepo`, `paymentMethodsRepo`, `TRANSACTION_STATUSES`, `TICKET_STATUSES`, `parseCompanyFilter`, `CompanyFilter`, libellés de la Task 2.
- Produces: pages `/ventes/paiements`, `/ventes/paiements/[id]`, `/ventes/billets`, `/ventes/billets/[code]`, `/ventes/moyens-de-paiement`. `data-testid` : `anomaly-<KIND>` (fiche paiement), `ticket-status`, `ticket-scans` (liste `<ul>` des scans), `payment-method-status-<id>`… non : le test des moyens de paiement lit la ligne par son texte.

- [ ] **Step 1: Paiements voyageurs**

Créer `src/app/(admin)/ventes/paiements/transactions-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { anomalyLabel, transactionStatusBadge } from "@/lib/labels";
import type { TransactionRow } from "@/lib/repos/sales";

const columns: ColumnDef<TransactionRow, unknown>[] = [
  { accessorKey: "reference", header: "Référence", cell: ({ row }) => <span className="font-medium">{row.original.reference}</span> },
  { accessorKey: "bookingCode", header: "Réservation" },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "methodName", header: "Moyen" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = transactionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  {
    id: "anomalies", header: "Incohérences", accessorFn: (r) => r.anomalies.map(anomalyLabel).join(" "),
    cell: ({ row }) => (row.original.anomalies.length === 0 ? "—" : (
      <div className="flex flex-wrap gap-1">
        {row.original.anomalies.map((k) => <StatusBadge key={k} tone="danger">{anomalyLabel(k)}</StatusBadge>)}
      </div>
    )),
  },
];

export function TransactionsTable({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <DataTable
      columns={columns} data={transactions} rowHref={(r) => `/ventes/paiements/${r.id}`}
      searchPlaceholder="Rechercher un paiement…" emptyMessage="Aucun paiement."
    />
  );
}
```

Créer `src/app/(admin)/ventes/paiements/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { TRANSACTION_STATUSES, transactionsRepo } from "@/lib/repos/sales";
import { TransactionsTable } from "./transactions-table";

export const dynamic = "force-dynamic";

const BASE = "/ventes/paiements";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "COMPLETED", label: "Réussis" },
  { value: "FAILED", label: "Échoués" },
];
const ANOMALY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "oui", label: "Avec incohérence" },
];

export default async function TravellerPaymentsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; anomalie?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, TRANSACTION_STATUSES);
  const anomaly = parseFilter(sp.anomalie, ["oui"] as const);
  const keep = { compagnie: companyId, statut: status, anomalie: anomaly };
  return (
    <>
      <PageHeader
        title="Paiements des voyageurs"
        description="Transactions en ligne et au guichet, avec les incohérences détectées (paiement bloqué, montant différent, billet manquant)."
      />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={ANOMALY_OPTIONS} current={anomaly} param="anomalie" keep={keep} label="Filtrer par incohérence" />
      <TransactionsTable
        transactions={transactionsRepo.listRows({ companyId, status, anomalyOnly: anomaly === "oui" }, new Date())}
      />
    </>
  );
}
```

Créer `src/app/(admin)/ventes/paiements/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { bookingPaymentBadge, bookingStatusBadge, transactionStatusBadge } from "@/lib/labels";
import { transactionsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = transactionsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { transaction: t, booking: b } = detail;
  const status = transactionStatusBadge(t.status);
  const bStatus = bookingStatusBadge(b.status);
  const bPayment = bookingPaymentBadge(b.paymentStatus);
  return (
    <>
      <PageHeader
        title={`Paiement ${t.reference}`}
        description={`${t.passengerName} · ${t.companyName}`}
        actions={<span data-testid="transaction-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      {detail.anomalies.length > 0 && (
        <Card className="mb-4 border-danger/40">
          <CardHeader><CardTitle>Incohérences détectées</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {detail.anomalies.map((a) => (
                <li key={a.kind} data-testid={`anomaly-${a.kind}`}>
                  <StatusBadge tone="danger">{a.label}</StatusBadge>
                  <span className="ml-2">{a.explanation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Transaction</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Référence">{t.reference}</DetailRow>
            <DetailRow label="Moyen de paiement">{t.methodName}</DetailRow>
            <DetailRow label="Montant">{formatMoney(t.amount, t.currency)}</DetailRow>
            <DetailRow label="Lancé le">{formatDateTime(t.createdAt)}</DetailRow>
            <DetailRow label="Terminé le">{t.completedAt ? formatDateTime(t.completedAt) : "—"}</DetailRow>
            <DetailRow label="Motif d'échec">{t.failureReason ?? "—"}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Réservation</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Code">
              <Link href={`/ventes/reservations/${b.id}`} className="hover:underline">{b.bookingCode}</Link>
            </DetailRow>
            <DetailRow label="Passager">{b.passengerName}</DetailRow>
            <DetailRow label="Siège">{b.seatNumber ?? "—"}</DetailRow>
            <DetailRow label="Montant de la réservation">{formatMoney(b.amount, b.currency)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={bStatus.tone}>{bStatus.label}</StatusBadge></DetailRow>
            <DetailRow label="Paiement"><StatusBadge tone={bPayment.tone}>{bPayment.label}</StatusBadge></DetailRow>
          </dl></CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/ventes/paiements/[id]/not-found.tsx` (même modèle que `BookingNotFound`, texte « Paiement introuvable », lien `/ventes/paiements` « Retour aux paiements »).

- [ ] **Step 2: Billets**

Créer `src/app/(admin)/ventes/billets/tickets-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { ticketStatusBadge } from "@/lib/labels";
import type { TicketRow } from "@/lib/repos/sales";

const columns: ColumnDef<TicketRow, unknown>[] = [
  { accessorKey: "ticketCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.ticketCode}</span> },
  { accessorKey: "bookingCode", header: "Réservation" },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    id: "trip", header: "Trajet", accessorFn: (r) => `${r.routeLabel} ${formatDateTime(r.departure)}`,
    cell: ({ row }) => (
      <div>
        <div>{row.original.routeLabel}</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.original.departure)}</div>
      </div>
    ),
  },
  { accessorKey: "seatNumber", header: "Siège", cell: ({ row }) => row.original.seatNumber ?? "—" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = ticketStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "issuedAt", header: "Émis le", cell: ({ row }) => formatDateTime(row.original.issuedAt) },
  { accessorKey: "scanCount", header: "Scans", cell: ({ row }) => <span className="tabular-nums">{row.original.scanCount}</span> },
];

export function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  return (
    <DataTable
      columns={columns} data={tickets} rowHref={(r) => `/ventes/billets/${r.ticketCode}`}
      searchPlaceholder="Rechercher un billet…" emptyMessage="Aucun billet."
    />
  );
}
```

Créer `src/app/(admin)/ventes/billets/page.tsx` sur le modèle de la page des paiements : titre « Billets », description « Billets émis aux voyageurs, du plus récent au plus ancien. », filtres `CompanyFilter` + `StatusFilterNav` (`statut`, valeurs `TICKET_STATUSES`, options `all/ISSUED/CHECKED_IN/USED/CANCELLED` libellées « Tous / Émis / Enregistrés / Utilisés / Annulés »), `keep = { compagnie, statut }`, données `ticketsRepo.listRows({ companyId, status })`, composant `TicketsTable`. (Code complet : mêmes imports et même structure que `paiements/page.tsx`, en remplaçant `TRANSACTION_STATUSES` par `TICKET_STATUSES`, `transactionsRepo` par `ticketsRepo`, `TransactionsTable` par `TicketsTable` ; pas de filtre d'incohérence.)

Créer `src/app/(admin)/ventes/billets/[code]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ticketStatusBadge } from "@/lib/labels";
import { ticketsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const detail = ticketsRepo.detailByCode(decodeURIComponent(code));
  if (!detail) notFound();
  const { ticket: t, scans } = detail;
  const status = ticketStatusBadge(t.status);
  return (
    <>
      <PageHeader
        title={`Billet ${t.ticketCode}`}
        description={`${t.passengerName} · ${t.companyName}`}
        actions={<span data-testid="ticket-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Billet</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Réservation">
              <Link href={`/ventes/reservations/${t.bookingId}`} className="hover:underline">{t.bookingCode}</Link>
            </DetailRow>
            <DetailRow label="Trajet">{t.routeLabel} · {formatDateTime(t.departure)}</DetailRow>
            <DetailRow label="Siège">{t.seatNumber ?? "—"}</DetailRow>
            <DetailRow label="Émis le">{formatDateTime(t.issuedAt)}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scans</CardTitle></CardHeader>
          <CardContent>
            {scans.length === 0 ? <p className="text-sm text-muted-foreground">Aucun scan.</p> : (
              <ul data-testid="ticket-scans" className="space-y-1 text-sm">
                {scans.map((at, i) => <li key={`${at}-${i}`}>{formatDateTime(at)}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/ventes/billets/[code]/not-found.tsx` (texte « Billet introuvable », lien `/ventes/billets` « Retour aux billets »).

- [ ] **Step 3: Moyens de paiement**

Créer `src/app/(admin)/ventes/moyens-de-paiement/payment-methods-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { paymentKindLabel } from "@/lib/labels";
import type { PaymentMethodRow } from "@/lib/repos/sales";

const columns: ColumnDef<PaymentMethodRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "name", header: "Moyen de paiement", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "kind", header: "Type", accessorFn: (r) => paymentKindLabel(r.kind) },
  { accessorKey: "provider", header: "Opérateur", cell: ({ row }) => row.original.provider ?? "—" },
  {
    accessorKey: "active", header: "État",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.active ? "success" : "neutral"}>{row.original.active ? "Actif" : "Inactif"}</StatusBadge>
    ),
  },
  { accessorKey: "transactions", header: "Transactions", cell: ({ row }) => <span className="tabular-nums">{row.original.transactions}</span> },
  { accessorKey: "completed", header: "Réussies", cell: ({ row }) => <span className="tabular-nums">{row.original.completed}</span> },
  { accessorKey: "failed", header: "Échouées", cell: ({ row }) => <span className="tabular-nums">{row.original.failed}</span> },
  {
    accessorKey: "successRate", header: "Taux de réussite",
    cell: ({ row }) => (row.original.successRate === null ? "—" : <span className="tabular-nums">{row.original.successRate} %</span>),
  },
];

export function PaymentMethodsTable({ methods }: { methods: PaymentMethodRow[] }) {
  return (
    <DataTable
      columns={columns} data={methods}
      searchPlaceholder="Rechercher un moyen de paiement…" emptyMessage="Aucun moyen de paiement."
    />
  );
}
```

Créer `src/app/(admin)/ventes/moyens-de-paiement/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { paymentMethodsRepo } from "@/lib/repos/sales";
import { PaymentMethodsTable } from "./payment-methods-table";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  return (
    <>
      <PageHeader
        title="Moyens de paiement"
        description="Moyens de paiement acceptés par chaque compagnie, avec leur trafic et leur taux de réussite."
      />
      <CompanyFilter basePath="/ventes/moyens-de-paiement" current={companyId} />
      <PaymentMethodsTable methods={paymentMethodsRepo.listRows({ companyId })} />
    </>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `pnpm typecheck && pnpm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/ventes/paiements" "src/app/(admin)/ventes/billets" "src/app/(admin)/ventes/moyens-de-paiement"
git commit -m "feat: traveller payments with anomalies, tickets and payment methods

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Tableau de bord du libre-service en ligne

**Files:**
- Create: `src/app/(admin)/ventes/en-ligne/page.tsx`

**Interfaces:**
- Consumes: `onlineRepo.stats(now)`, `KpiCard`, `PageHeader`, `formatMoney`, `formatNumber`.
- Produces: page `/ventes/en-ligne`. `data-testid` : `online-total`, `online-conversion`, `online-failed`, `online-expired`, `online-stuck`, `expiring-row` (une par ligne de la liste).

- [ ] **Step 1: Page**

Créer `src/app/(admin)/ventes/en-ligne/page.tsx` :

```tsx
import Link from "next/link";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber } from "@/lib/format";
import { ONLINE_UNPAID_TTL_MINUTES, onlineRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default function OnlineSalesPage() {
  const stats = onlineRepo.stats(new Date());
  return (
    <>
      <PageHeader
        title="Libre-service en ligne"
        description={`Réservations faites par les voyageurs eux-mêmes. Une réservation non payée expire ${ONLINE_UNPAID_TTL_MINUTES} minutes après sa création.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div data-testid="online-total"><KpiCard label="Réservations en ligne" value={formatNumber(stats.total)} hint={`${formatNumber(stats.paid)} payées`} /></div>
        <div data-testid="online-conversion">
          <KpiCard label="Taux de conversion" value={stats.conversionPercent === null ? "—" : `${stats.conversionPercent} %`} hint="Réservations payées / réservations créées" />
        </div>
        <div data-testid="online-failed">
          <KpiCard label="Paiements échoués" value={formatNumber(stats.failedPayments)} tone={stats.failedPayments > 0 ? "warning" : "default"} />
        </div>
        <div data-testid="online-expired">
          <KpiCard label="Réservations expirées" value={formatNumber(stats.expired)} hint="Non payées à temps" />
        </div>
        <div data-testid="online-stuck">
          <KpiCard label="Paiements bloqués" value={formatNumber(stats.stuck)} tone={stats.stuck > 0 ? "danger" : "default"} hint="En attente depuis plus de 30 minutes" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Réservations non payées qui vont expirer</CardTitle></CardHeader>
        <CardContent>
          {stats.expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune réservation en attente de paiement.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Passager</th>
                  <th className="py-1 font-medium">Compagnie</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {stats.expiring.map((e) => (
                  <tr key={e.id} data-testid="expiring-row" className="border-t border-border">
                    <td className="py-1.5">
                      <Link href={`/ventes/reservations/${e.id}`} className="font-medium hover:underline">{e.bookingCode}</Link>
                    </td>
                    <td>{e.passengerName}</td>
                    <td>{e.companyName}</td>
                    <td className="tabular-nums">{formatMoney(e.amount, e.currency)}</td>
                    <td>{e.minutesLeft <= 0 ? "Expiration imminente" : `Dans ${e.minutesLeft} min`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `pnpm typecheck && pnpm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/ventes/en-ligne"
git commit -m "feat: online self-service dashboard

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, E2E, test de fuite et README

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 4 à 6.
- Produces: 5 entrées de navigation implémentées ; couverture E2E de la section.

- [ ] **Step 1: Test de navigation (rouge)**

Dans `tests/unit/nav.test.ts` : le test du lot 4 `marks only lot 1 to lot 4 pages as implemented` est **remplacé** par `marks only lot 1 to lot 5 pages as implemented` : reprendre le tableau attendu du lot 4 (23 chemins, trié) et y insérer, à leur place alphabétique, les cinq chemins `"/ventes/billets"`, `"/ventes/en-ligne"`, `"/ventes/moyens-de-paiement"`, `"/ventes/paiements"`, `"/ventes/reservations"` (28 chemins en tout). Ajouter à la fin du fichier :

```ts
describe("lot 5 breadcrumbs", () => {
  it("links the parent list of booking, payment and ticket details, nothing else under sales", () => {
    expect(isLinkablePath("/ventes/reservations/abc")).toBe(true);
    expect(isLinkablePath("/ventes/paiements/abc")).toBe(true);
    expect(isLinkablePath("/ventes/billets/TK-ABC12345")).toBe(true);
    expect(isLinkablePath("/ventes/en-ligne")).toBe(true);
    expect(isLinkablePath("/ventes")).toBe(false);
  });
  it("labels the sales segments with their accents", () => {
    expect(labelForSegment("reservations")).toBe("Réservations");
    expect(labelForSegment("en-ligne")).toBe("Libre-service en ligne");
    expect(labelForSegment("moyens-de-paiement")).toBe("Moyens de paiement");
  });
});
```

(importer `isLinkablePath` et `labelForSegment` si absents de l'import du fichier). Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` :
1. Remplacer les cinq lignes `todo(…)` de la section « Ventes et paiements » par :

```ts
    { label: "Réservations", href: "/ventes/reservations", implemented: true },
    { label: "Paiements voyageurs", href: "/ventes/paiements", implemented: true },
    { label: "Billets", href: "/ventes/billets", implemented: true },
    { label: "Moyens de paiement", href: "/ventes/moyens-de-paiement", implemented: true },
    { label: "Libre-service en ligne", href: "/ventes/en-ligne", implemented: true },
```

2. Ajouter à `SEGMENT_LABELS` : `reservations: "Réservations"`, `"en-ligne": "Libre-service en ligne"`.
3. Ajouter à `ROUTE_PREFIXES` (en conservant les préfixes existants, dont ceux du lot 4) : `"/ventes/reservations"`, `"/ventes/paiements"`, `"/ventes/billets"`.

Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/ventes/reservations");` par `await page.goto("/colis");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("bookings can be filtered by channel and payment and opened with their timeline and tickets", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await expect(page.getByRole("heading", { name: "Réservations" })).toBeVisible();
  await page.getByRole("link", { name: "Guichet", exact: true }).click();
  await expect(page).toHaveURL(/canal=counter/);
  await page.getByRole("link", { name: "Payées", exact: true }).click();
  await expect(page).toHaveURL(/canal=counter/);
  await expect(page).toHaveURL(/paiement=paid/);
  await page.getByPlaceholder("Rechercher une réservation…").fill("Coumba Lô");
  await page.getByRole("row", { name: /Coumba Lô/ }).click();
  await expect(page).toHaveURL(/\/ventes\/reservations\/[0-9a-f-]+$/);
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
  await expect(page.getByTestId("booking-payment")).toHaveText("Payée");
  await page.getByRole("tab", { name: "Chronologie" }).click();
  await expect(page.getByText("Paiement réussi")).toBeVisible();
  await page.getByRole("tab", { name: "Billets" }).click();
  await expect(page.getByRole("link", { name: /^TK-/ })).toHaveCount(1);
});

test("a booking without payment is cancelled with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Rokhaya Thiaw");
  await page.getByRole("row", { name: /Rokhaya Thiaw/ }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Demande du passager au guichet");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("booking-status")).toHaveText("Annulée");
  await page.getByRole("tab", { name: "Chronologie" }).click();
  await expect(page.getByText("Réservation annulée : Annulée par l'équipe Sira")).toBeVisible();
});

test("a booking with a payment in progress cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Samba Kébé");
  await page.getByRole("row", { name: /Samba Kébé/ }).click();
  await expect(page.getByTestId("cancel-blocked")).toContainText("Un paiement est en cours sur cette réservation");
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un paiement est en cours sur cette réservation");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
});

test("a paid booking cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Coumba Lô");
  await page.getByRole("row", { name: /Coumba Lô/ }).click();
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une réservation payée ne peut pas être annulée");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
});

test("payment anomalies are listed and explained", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/paiements?anomalie=oui");
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await expect(page.getByText("Paiement bloqué", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Montant différent", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Billet manquant", { exact: true })).toHaveCount(1);
  await page.getByRole("row", { name: /Paiement bloqué/ }).first().click();
  await expect(page).toHaveURL(/\/ventes\/paiements\/[0-9a-f-]+$/);
  await expect(page.getByTestId("anomaly-STUCK")).toContainText("en attente depuis plus de 30 minutes");
  await expect(page.getByTestId("transaction-status")).toHaveText("En attente");
});

test("a used ticket shows its status and scans", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/billets?statut=USED");
  await page.getByRole("row").nth(1).click();
  await expect(page).toHaveURL(/\/ventes\/billets\/TK-[0-9A-Z]{8}$/);
  await expect(page.getByTestId("ticket-status")).toHaveText("Utilisé");
  await expect(page.getByTestId("ticket-scans").locator("li")).toHaveCount(1);
});

test("an inactive payment method is shown as inactive", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/moyens-de-paiement");
  await expect(page.getByRole("heading", { name: "Moyens de paiement" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Wave.*Inactif/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Espèces au guichet.*Actif/ }).first()).toBeVisible();
});

test("the online dashboard shows the indicators and the bookings about to expire", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/en-ligne");
  await expect(page.getByRole("heading", { name: "Libre-service en ligne" })).toBeVisible();
  for (const id of ["online-total", "online-conversion", "online-failed", "online-expired", "online-stuck"]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("online-stuck")).toContainText("2");
  expect(await page.getByTestId("expiring-row").count()).toBeGreaterThan(0);
});
```

Remarque pour l'implémenteur : un `data-testid` posé sur un `div` autour de `KpiCard` (Task 6) ; `toContainText("2")` vérifie la valeur « 2 » **ou** un nombre qui la contient (les deux paiements bloqués sont en ligne ou au guichet selon la graine) : si le compte de paiements bloqués **en ligne** n'est pas 2, remplacer par la valeur réelle observée dans `onlineRepo.stats(NOW).stuck` et le documenter dans le plan (ne pas affaiblir l'assertion en `toBeVisible`).

3. Étendre le test `@prod` : après les appels existants à `detailPath(...)`, ajouter

```ts
  const bookingPath = await detailPath("/ventes/reservations", "Coumba", "Rechercher une réservation…", /Coumba Lô/);
  const transactionPath = await detailPath("/ventes/paiements", "Samba", "Rechercher un paiement…", /Samba Kébé/);
  const ticketPath = await detailPath("/ventes/billets", "Coumba", "Rechercher un billet…", /Coumba Lô/);
```

et ajouter au tableau `paths` : `"/ventes/reservations"`, `"/ventes/reservations?canal=online"`, `"/ventes/reservations?statut=cancelled"`, `bookingPath`, `` `${bookingPath}?onglet=chronologie` ``, `"/ventes/paiements"`, `"/ventes/paiements?anomalie=oui"`, `transactionPath`, `"/ventes/billets"`, `ticketPath`, `"/ventes/moyens-de-paiement"`, `"/ventes/en-ligne"`. (Le test existant applique à chaque chemin les expressions régulières d'e-mails, de téléphones et d'IP complètes sur le HTML brut et le DOM.)

Si « Rokhaya Thiaw » a été annulée par le test précédent, elle reste lisible (réservation annulée) : le `@prod` n'en dépend pas.

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter à la section des lots livrés un paragraphe « Lot 5 : ventes et paiements des voyageurs » décrivant les 8 écrans et l'unique action (« Annuler la réservation »), puis ajouter à la liste des limites : pas de remboursement ni de reprise d'un paiement bloqué (le backend n'en a pas : une transaction `PENDING` reste bloquée jusqu'à intervention en base) ; une réservation payée n'est pas annulable ; l'expiration des réservations en ligne est affichée mais jamais exécutée ; moyens de paiement, billets et scans en lecture seule ; le passager n'a pas de fiche (nom seulement, avec un lien vers le compte pour une réservation en ligne) ; pas de versement aux compagnies ; les incohérences sont calculées à la lecture avec l'horloge du serveur.

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable sales navigation, e2e coverage and leak check for sales pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 8 écrans (Tasks 4 à 6), modèle de données et graine (Task 1), règle d'annulation et ordre des gardes (Task 3), incohérences et frontière de 30 minutes (Task 2), expiration en ligne et conversion (Tasks 2 et 6), chronologie (Task 2), navigation et fil d'Ariane (Task 7), tests unitaires et E2E (Tasks 1 à 3 et 7), limites (README, Task 7).
- **Cohérence des noms** : `bookingsRepo.listRows/detail/cancel`, `transactionsRepo.listRows/detail`, `ticketsRepo.listRows/detailByCode`, `paymentMethodsRepo.listRows`, `onlineRepo.stats`, `transactionAnomalies`, `cancelBlockReason`, `AnomalyKind` (défini dans `types`, ré-exporté par `sales.ts`) sont utilisés à l'identique dans les tâches.
- **Risque connu, à signaler à l'implémenteur** : les compteurs exacts de la graine (4 anomalies, au moins 5 paiements jeunes) reposent sur l'algorithme de la Task 1 ; ils ont été raisonnés mais pas exécutés. Si un test de graine échoue pour une raison de volume, corriger la graine (jamais affaiblir le test) et consigner l'écart dans le plan.
