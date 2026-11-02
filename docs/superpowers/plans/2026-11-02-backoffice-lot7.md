# Backoffice Sira, lot 7 : communication. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les cinq entrées « Bientôt disponible » de la section « Communication » par de vraies pages sur données statiques typées : notifications (liste et fiche avec contenu masqué et révélation journalisée), campagnes (liste et fiche à quatre onglets), segments (avec les destinataires éligibles calculés), messages et programmations, avec deux actions serveur : « Annuler la campagne » (cascade sur les programmations en attente) et « Annuler la programmation » (motif obligatoire).

**Architecture:** Même socle que les lots 1 à 6. Cinq collections rejoignent le store (`notifications`, `marketingCampaigns`, `marketingSegments`, `marketingMessages`, `marketingSchedules`) ; deux graines (`seedMarketing`, `seedNotifications`) les dérivent des comptes de fidélité, avis et colis (lot 6) et des réservations (lot 5). Un dépôt `src/lib/repos/communication.ts` porte les projections client, les détails serveur, le ciblage des segments et les mutations. Les pages sont des Server Components ; chaque liste est un `DataTable` client qui ne reçoit qu'une projection. Les actions passent par `run()` / `runReveal()`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21, Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4, 5 et 6 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ** (le plan ne les fige pas). Le lot 4 fournit `CompanyFilter` (`src/components/fleet/company-filter.tsx`) et `parseCompanyFilter` (`src/lib/repos/fleet.ts`) ; le lot 5 fournit `Booking` et `hashCode(prefix, n)` de `src/lib/data/seed.ts` ; le lot 6 fournit `Parcel`, `ParcelHistoryEntry`, `Customer`, `LoyaltyAccount`, `LoyaltyProgram`, `Feedback` et les collections `parcels`, `parcelHistory`, `customers`, `loyaltyPrograms`, `loyaltyAccounts`, `feedbacks`. **Vérifier ces noms par `grep` avant de commencer** et adapter le plan s'ils ont changé.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : `cancelCampaign` et `cancelSchedule` passent par `run()`, `revealNotificationContent` par `runReveal()` (session vérifiée **avant** toute lecture ou écriture). Elles renvoient un `ActionResult` / `RevealResult` et ne lèvent jamais d'exception pour un échec attendu.
- Action sensible : confirmation + **motif obligatoire**, rogné, **500 caractères au plus** (`requireReason` : `"Motif trop long (500 caractères maximum)"`), jamais tronqué.
  - `campaignsRepo.cancel` : campagne existante (`"Campagne introuvable"`) → motif (`"Un motif est obligatoire"`) → pas déjà annulée (`"Cette campagne est déjà annulée"`) → ni `RUNNING` ni `COMPLETED` (`"Une campagne en cours ou terminée ne peut pas être annulée"`). Effets : `CANCELLED`, `updatedAt`, programmations `PENDING` de la campagne → `CANCELLED` (les autres inchangées), activité `Campagne « <nom> » annulée (<n> programmation(s) annulée(s)). Motif : <motif>`.
  - `schedulesRepo.cancel` : programmation existante (`"Programmation introuvable"`) → motif → statut `PENDING` (`"Cette programmation n'est plus en attente"`). Effets : `CANCELLED`, activité `Programmation de la campagne « <nom> » annulée. Motif : <motif>`.
- Le journal d'activité ne contient jamais d'e-mail, de téléphone ni le contenu d'une notification.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `AppNotification`, `NotificationDetail`, `CampaignDetail` ni un identifiant de compte ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. `messageContent` ne quitte le serveur que par l'action de révélation. Les imports depuis `@/lib/repos/communication` dans un composant client sont des `import type`. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (programmations) n'a **pas** de `rowHref` et a un `rowId`.
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, motif ≤ 500, chaque garde des deux annulations, leur ordre, cascade limitée aux `PENDING`, révélation journalisée avant la valeur, contenu absent des projections) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création ou édition de campagnes, segments, messages, programmations ; approbation ; relance d'une notification ; envoi réel ; consentements ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Identifiants** : préfixes `uid(51, …)` notifications, `uid(52, …)` campagnes, `uid(53, …)` segments, `uid(54, …)` messages, `uid(55, …)` programmations (les préfixes jusqu'à 49 sont pris ; vérifier par `grep -n "uid(5[1-5]" src/lib/data/seed.ts` : aucune occurrence attendue).
2. **Ordre de la graine** : dans `buildSeed`, après `seedFeedbacks(store, now)` : `seedMarketing(store, now, iso)`, puis `seedNotifications(store, now)` (les notifications ont besoin des programmations envoyées).
3. **Ciblage dupliqué** : `eligibleCount` existe dans `seed.ts` (fonction locale, car `seed.ts` ne peut pas importer un dépôt qui importe le store) et dans `communication.ts` ; un test de graine épingle que les deux donnent le même résultat pour chaque programmation `SENT`.
4. **Nommage** : le type s'appelle `AppNotification` (`Notification` est un type global du DOM) ; le libellé de canal de notification s'appelle `notificationChannelLabel` (`channelLabel` existe déjà pour le canal des réservations, lot 5).
5. **Compagnies semées** : les 4 premières compagnies dotées d'un programme de fidélité `ACTIVE`. Noms de campagne uniques pour les scénarios (première compagnie), noms suffixés par le nom de la compagnie pour les autres : une recherche par nom de scénario ne renvoie qu'une ligne.
6. **Volume des notifications** : par réservation en ligne : 3 notifications `booking_confirmed` (e-mail, SMS, dans l'application) ; si payée : 1 `payment_completed` (dans l'application) ; si annulée par le client ou l'équipe : 3 `booking_cancelled` (aucune pour une expiration). Statuts : un e-mail sur 15 (rang global) est `FAILED`, un SMS sur 40 est `PENDING`, le reste `SENT` ; une notification `IN_APP` envoyée est lue une fois sur trois.
7. **Boutons d'annulation** : « Annuler la campagne » est affiché pour toute campagne non `CANCELLED` (le serveur refuse `COMPLETED` avec un message lisible : c'est ce qui rend le refus jouable en E2E) ; « Annuler la programmation » est affiché pour toute programmation non `CANCELLED` (une `SENT` est refusée par le serveur). Les boutons de programmation portent `aria-label="Annuler la programmation « <objet> »"` ; les tests E2E les atteignent **dans leur ligne** (`getByRole("row", …).getByRole("button", …)`) car une campagne peut avoir deux programmations du même objet.
8. **Fiche d'une notification** : le lien vers l'objet lié est résolu côté serveur (`booking` → `/ventes/reservations/<id>`, `parcel` → `/colis/<id>`, `feedback` → `/clients/avis/<id>`, `marketing_schedule` → `/communication/campagnes/<id de la campagne>`).
9. **Test E2E du lot 1 `unimplemented sections show a coming-soon page`** : le lot 6 l'a fait pointer sur `/communication/notifications`, qui devient une vraie page ici ; il pointe désormais sur `/conformite/journal-audit`.

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `cancelling a scheduled campaign also cancels its pending schedule` | campagne « Offre de la Tabaski » | `CANCELLED`, sa programmation `PENDING` → `CANCELLED`, une entrée d'activité |
| `a completed campaign cannot be cancelled` | campagne « Bilan de rentrée » | lecture seule (refus) |
| `a pending schedule is cancelled with a mandatory reason` | programmation de « Offre de fin d'année » | `CANCELLED`, une entrée d'activité |
| `a schedule that was already sent cannot be cancelled` | programmation de « Bilan de rentrée » | lecture seule (refus) |
| `the content of a notification is hidden until it is revealed on demand` | première notification e-mail de la liste | une entrée d'activité (aucune mutation de la notification) |

Les autres tests sont en lecture seule. « Offre de la Tabaski » n'est lue ailleurs qu'en lecture seule avant son annulation (ordre des tests du fichier : la lecture précède la mutation ; si un test de lecture la suit, il ne doit pas dépendre de son statut).

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) notifications et marketing + unions
src/lib/data/seed.ts                           (modifié) Store étendu, seedMarketing, seedNotifications, eligibleCount
src/lib/repos/communication.ts                 (créé)   dépôts, projections, ciblage, détails, annulations, révélation
src/lib/labels.ts                              (modifié) badges et libellés
src/app/(admin)/communication/actions.ts       (créé)   cancelCampaign, cancelSchedule, revealNotificationContent
src/components/communication/{notification-content,cancel-campaign-button,cancel-schedule-button,campaign-tabs}.tsx   (créés)
src/app/(admin)/communication/notifications/{page,notifications-table}.tsx, notifications/[id]/{page,not-found}.tsx   (créés)
src/app/(admin)/communication/campagnes/{page,campaigns-table}.tsx, campagnes/[id]/{page,not-found}.tsx                (créés)
src/app/(admin)/communication/segments/{page,segments-table}.tsx                                                       (créés)
src/app/(admin)/communication/messages/{page,messages-table}.tsx                                                       (créés)
src/app/(admin)/communication/programmations/{page,schedules-table}.tsx                                                (créés)
src/lib/nav.ts                                 (modifié) 5 entrées implémentées, préfixes
tests/unit/{communication-seed,notifications-seed,communication-repo,communication-rules,communication-actions}.test.ts   (créés)
tests/unit/{labels,nav}.test.ts                (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

---
### Task 1: Types et graine du marketing (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`
- Create: `tests/unit/communication-seed.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)`, `uid`, `iso`, `store.loyaltyPrograms`, `store.loyaltyAccounts`, `store.customers`, `store.users`, `store.companies` (lots 3 et 6).
- Produces: types ci-dessous ; `Store` : `marketingCampaigns`, `marketingSegments`, `marketingMessages`, `marketingSchedules`, `notifications` (ce dernier rempli à la Task 2) ; fonctions `eligibleCount(store, companyId, criteria)` et `seedMarketing(store, now, iso)`.

- [ ] **Step 1: Types**

Ajouter à la fin de `src/lib/types/index.ts` :

```ts
export type NotificationChannel = "EMAIL" | "SMS" | "IN_APP" | "PUSH" | "WHATSAPP";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

/** Delivered (or failed) message (`notification-service`). `messageContent` never leaves the server except on a journaled reveal. */
export interface AppNotification {
  id: string; companyId: string; entityType: string; entityId: string;
  notificationCode: string; notificationType: string;
  /** Receiving account; `null` for the SMS of a parcel recipient who has no account. */
  sentTo: string | null;
  channel: NotificationChannel; status: NotificationStatus;
  scheduledAt: string | null; sentAt: string | null; retryCount: number; read: boolean;
  messageContent: string; createdAt: string;
}

export type CampaignObjective = "ACQUISITION" | "RETENTION" | "PROMOTION" | "REACTIVATION";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "COMPLETED" | "CANCELLED";

export interface MarketingCampaign {
  id: string; companyId: string; name: string; objective: CampaignObjective; status: CampaignStatus;
  startDate: string; endDate: string; budget: number; currency: string;
  /** Platform account of the author (the dbml points to an Employee; `customer-service` stores the account). */
  createdByUserId: string | null;
  createdAt: string; updatedAt: string | null;
}

export interface MarketingSegment {
  id: string; companyId: string;
  /** `null` for a segment that can be reused by several campaigns. */
  campaignId: string | null;
  name: string;
  /** Targeting rules; only `membershipType` is ever evaluated. */
  criteria: Record<string, string>;
  estimatedSize: number; createdAt: string;
}

export type MarketingMessageStatus = "DRAFT" | "APPROVED" | "SENT";

export interface MarketingMessage {
  id: string; companyId: string; campaignId: string; channel: NotificationChannel;
  subject: string; content: string; status: MarketingMessageStatus; createdAt: string;
}

export type ScheduleStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";

export interface MarketingSchedule {
  id: string; companyId: string; campaignId: string; messageId: string; segmentId: string;
  scheduledAt: string; sentAt: string | null; status: ScheduleStatus; recipientsCount: number; createdAt: string;
}
```

- [ ] **Step 2: Écrire le test de graine du marketing (rouge)**

Créer `tests/unit/communication-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => {
  const found = getStore().marketingCampaigns.filter((c) => c.name === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};
const schedulesOf = (campaignId: string) => getStore().marketingSchedules.filter((s) => s.campaignId === campaignId);

describe("marketing seed: references", () => {
  it("creates campaigns only for the first four companies with an active loyalty program", () => {
    const s = getStore();
    const expected = s.loyaltyPrograms.filter((p) => p.status === "ACTIVE").slice(0, 4).map((p) => p.companyId);
    expect(expected).toHaveLength(4);
    expect(new Set(s.marketingCampaigns.map((c) => c.companyId))).toEqual(new Set(expected));
    expect(s.marketingCampaigns).toHaveLength(13);
  });

  it("keeps every segment, message and schedule inside the company of its campaign", () => {
    const s = getStore();
    const campaigns = new Map(s.marketingCampaigns.map((c) => [c.id, c]));
    for (const m of s.marketingMessages) expect(campaigns.get(m.campaignId)!.companyId).toBe(m.companyId);
    for (const seg of s.marketingSegments) {
      if (seg.campaignId) expect(campaigns.get(seg.campaignId)!.companyId).toBe(seg.companyId);
    }
    for (const sc of s.marketingSchedules) {
      const campaign = campaigns.get(sc.campaignId)!;
      expect(campaign.companyId).toBe(sc.companyId);
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      const segment = s.marketingSegments.find((x) => x.id === sc.segmentId)!;
      expect(message.campaignId).toBe(sc.campaignId);
      expect(segment.companyId).toBe(sc.companyId);
    }
  });

  it("has unique ids and unique campaign names", () => {
    const s = getStore();
    for (const list of [s.marketingCampaigns, s.marketingSegments, s.marketingMessages, s.marketingSchedules]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
    expect(new Set(s.marketingCampaigns.map((c) => c.name)).size).toBe(s.marketingCampaigns.length);
  });

  it("names the author with a platform account of the company when there is one", () => {
    const s = getStore();
    for (const c of s.marketingCampaigns) {
      if (c.createdByUserId) expect(s.users.find((u) => u.id === c.createdByUserId)!.companyId).toBe(c.companyId);
    }
  });
});

describe("marketing seed: states", () => {
  it("covers the campaign, message and schedule statuses the backend can produce, plus one completed campaign", () => {
    const s = getStore();
    expect(new Set(s.marketingCampaigns.map((c) => c.status))).toEqual(new Set(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]));
    expect(new Set(s.marketingMessages.map((m) => m.status))).toEqual(new Set(["DRAFT", "APPROVED", "SENT"]));
    expect(new Set(s.marketingSchedules.map((x) => x.status))).toEqual(new Set(["PENDING", "SENT", "CANCELLED"]));
    expect(s.marketingCampaigns.filter((c) => c.status === "COMPLETED")).toHaveLength(1);
  });

  it("gives a cancelled campaign no pending schedule and an update date; the others have none", () => {
    for (const c of getStore().marketingCampaigns) {
      if (c.status === "CANCELLED") {
        expect(schedulesOf(c.id).every((x) => x.status !== "PENDING")).toBe(true);
        expect(c.updatedAt).not.toBeNull();
      } else {
        expect(c.updatedAt).toBeNull();
      }
    }
  });

  it("only schedules approved or sent messages, and sends only in the past", () => {
    const s = getStore();
    for (const sc of s.marketingSchedules) {
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      expect(["APPROVED", "SENT"]).toContain(message.status);
      expect(message.channel).toBe("IN_APP");
      if (sc.status === "SENT") {
        expect(sc.sentAt).not.toBeNull();
        expect(Date.parse(sc.sentAt!)).toBeLessThan(NOW.getTime());
        expect(Date.parse(sc.sentAt!)).toBeGreaterThan(Date.parse(sc.scheduledAt));
      } else {
        expect(sc.sentAt).toBeNull();
      }
      if (sc.status === "PENDING") expect(Date.parse(sc.scheduledAt)).toBeGreaterThan(NOW.getTime());
    }
  });

  it("keeps drafts out of the schedules", () => {
    const s = getStore();
    for (const m of s.marketingMessages.filter((x) => x.status === "DRAFT")) {
      expect(s.marketingSchedules.some((x) => x.messageId === m.id)).toBe(false);
    }
  });

  it("matches a sent schedule's recipient count to the company's eligible loyalty accounts", () => {
    const s = getStore();
    const sent = s.marketingSchedules.filter((x) => x.status === "SENT");
    expect(sent.length).toBeGreaterThan(3);
    for (const sc of sent) {
      const segment = s.marketingSegments.find((x) => x.id === sc.segmentId)!;
      const accounts = s.loyaltyAccounts.filter((a) => a.companyId === sc.companyId);
      const wanted = segment.criteria.membershipType;
      const expected = wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
      expect(sc.recipientsCount).toBe(expected);
    }
    expect(sent.some((x) => x.recipientsCount > 0)).toBe(true);
  });
});

describe("marketing seed: scenarios", () => {
  it("has the four scenario campaigns in the expected states", () => {
    const tabaski = campaignNamed("Offre de la Tabaski");
    expect(tabaski.status).toBe("SCHEDULED");
    expect(schedulesOf(tabaski.id).map((x) => x.status).sort()).toEqual(["PENDING", "SENT"]);

    const yearEnd = campaignNamed("Offre de fin d'année");
    expect(yearEnd.status).toBe("SCHEDULED");
    expect(schedulesOf(yearEnd.id).map((x) => x.status)).toEqual(["PENDING"]);
    const yearEndMessage = getStore().marketingMessages.find((m) => m.campaignId === yearEnd.id)!;
    expect(yearEndMessage.subject).toBe("Offre de fin d'année");

    const done = campaignNamed("Bilan de rentrée");
    expect(done.status).toBe("COMPLETED");
    expect(schedulesOf(done.id).map((x) => x.status)).toEqual(["SENT"]);

    expect(campaignNamed("Campagne d'été annulée").status).toBe("CANCELLED");
  });

  it("targets with a known tier, with every account, and with a tier no one has", () => {
    const criteria = getStore().marketingSegments.map((s) => s.criteria);
    expect(criteria.some((c) => c.membershipType === "vip")).toBe(true);
    expect(criteria.some((c) => Object.keys(c).length === 0)).toBe(true);
    expect(criteria.some((c) => c.membershipType === "gold")).toBe(true);
    expect(criteria.some((c) => c.lastBookingDays !== undefined)).toBe(true);
  });

  it("holds no e-mail address and no phone number", () => {
    const s = getStore();
    expect(JSON.stringify([s.marketingCampaigns, s.marketingSegments, s.marketingMessages, s.marketingSchedules]))
      .not.toMatch(/@|\+221/);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/communication-seed.test.ts` → FAIL (`s.marketingCampaigns` indéfini).

- [ ] **Step 4: Étendre le store et écrire `seedMarketing`**

Dans `src/lib/data/seed.ts` :

1. Étendre l'import de types avec : `AppNotification`, `CampaignObjective`, `CampaignStatus`, `MarketingCampaign`, `MarketingMessage`, `MarketingMessageStatus`, `MarketingSchedule`, `MarketingSegment`, `NotificationChannel`, `NotificationStatus`, `ScheduleStatus`.
2. Dans `interface Store`, après `feedbacks: Feedback[];` :

```ts
  notifications: AppNotification[];
  marketingCampaigns: MarketingCampaign[];
  marketingSegments: MarketingSegment[];
  marketingMessages: MarketingMessage[];
  marketingSchedules: MarketingSchedule[];
```

3. Dans le littéral de `buildSeed`, après `loyaltyAccounts: [], loyaltyTransactions: [], sponsorships: [], feedbacks: [],` ajouter :

```ts
    notifications: [], marketingCampaigns: [], marketingSegments: [], marketingMessages: [], marketingSchedules: [],
```

4. Après `seedFeedbacks(store, now);` ajouter `seedMarketing(store, now, iso);` (l'appel `seedNotifications` est ajouté à la Task 2).
5. À la fin du fichier, ajouter :

```ts
const MARKETING_SCENARIOS = {
  tabaski: "Offre de la Tabaski", yearEnd: "Offre de fin d'année", cancelled: "Campagne d'été annulée", completed: "Bilan de rentrée",
} as const;

/**
 * Same targeting as `customer-service`'s dispatcher: only `membershipType` is evaluated (case-insensitive) over the
 * company's loyalty accounts; no rule targets every account; an unknown tier targets nobody.
 */
function eligibleCount(store: Store, companyId: string, criteria: Record<string, string>): number {
  const accounts = store.loyaltyAccounts.filter((a) => a.companyId === companyId);
  const wanted = criteria.membershipType;
  return wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
}

/**
 * Campaigns of the first four companies with an active loyalty program: a scheduled campaign (a sent and a pending
 * schedule), a cancelled one (cancelled schedule, reusable segment); the first company also has a year-end campaign
 * (pending schedule) and a completed one; the others a draft campaign targeting an unknown tier.
 */
function seedMarketing(store: Store, now: Date, iso: (offsetDays: number) => string): void {
  let campaignSeq = 1, segmentSeq = 1, messageSeq = 1, scheduleSeq = 1;
  const S = MARKETING_SCENARIOS;
  const companyIds = store.loyaltyPrograms.filter((p) => p.status === "ACTIVE").slice(0, 4).map((p) => p.companyId);

  companyIds.forEach((companyId, k) => {
    const company = store.companies.find((c) => c.id === companyId)!;
    const creator = store.users.find((u) => u.companyId === companyId);

    const campaign = (
      name: string, objective: CampaignObjective, status: CampaignStatus, startDays: number, endDays: number, budget: number,
    ): MarketingCampaign => {
      const c: MarketingCampaign = {
        id: uid(52, campaignSeq++), companyId, name, objective, status, startDate: iso(startDays), endDate: iso(endDays),
        budget, currency: company.currency, createdByUserId: creator?.id ?? null, createdAt: iso(startDays - 10),
        updatedAt: status === "CANCELLED" ? iso(-2) : null,
      };
      store.marketingCampaigns.push(c);
      return c;
    };
    const segment = (campaignId: string | null, name: string, criteria: Record<string, string>, estimatedSize: number): MarketingSegment => {
      const seg: MarketingSegment = {
        id: uid(53, segmentSeq++), companyId, campaignId, name, criteria, estimatedSize, createdAt: iso(-12),
      };
      store.marketingSegments.push(seg);
      return seg;
    };
    const message = (
      campaignId: string, channel: NotificationChannel, subject: string, content: string, status: MarketingMessageStatus,
    ): MarketingMessage => {
      const m: MarketingMessage = {
        id: uid(54, messageSeq++), companyId, campaignId, channel, subject, content, status, createdAt: iso(-11),
      };
      store.marketingMessages.push(m);
      return m;
    };
    const schedule = (
      c: MarketingCampaign, m: MarketingMessage, seg: MarketingSegment, status: ScheduleStatus, days: number,
    ): void => {
      const scheduledAt = iso(days);
      store.marketingSchedules.push({
        id: uid(55, scheduleSeq++), companyId, campaignId: c.id, messageId: m.id, segmentId: seg.id, scheduledAt,
        sentAt: status === "SENT" ? new Date(Date.parse(scheduledAt) + 60_000).toISOString() : null, status,
        recipientsCount: status === "SENT" ? eligibleCount(store, companyId, seg.criteria) : 0,
        createdAt: iso(Math.min(days, 0) - 1),
      });
    };

    // Scheduled campaign: a schedule already sent and one still pending.
    const scheduled = campaign(
      k === 0 ? S.tabaski : `Promotion VIP ${company.name}`, "PROMOTION", "SCHEDULED", -5, 20, 250_000 + k * 50_000,
    );
    const vip = segment(scheduled.id, `VIP ${company.name}`, { membershipType: "vip" }, 12 + k * 3);
    const promo = message(scheduled.id, "IN_APP", scheduled.name, "Profitez de -20 % sur votre prochain trajet.", "APPROVED");
    schedule(scheduled, promo, vip, "SENT", -3);
    schedule(scheduled, promo, vip, "PENDING", 2);

    if (k === 0) {
      const yearEnd = campaign(S.yearEnd, "RETENTION", "SCHEDULED", -2, 30, 120_000);
      const everyone = segment(yearEnd.id, `Tous les clients ${company.name}`, {}, 40);
      const m = message(yearEnd.id, "IN_APP", yearEnd.name, "Voyagez en fin d'année avec 15 % de réduction.", "APPROVED");
      schedule(yearEnd, m, everyone, "PENDING", 10);
    } else {
      const draft = campaign(`Réactivation ${company.name}`, "REACTIVATION", "DRAFT", 5, 40, 80_000);
      segment(draft.id, `Palier gold ${company.name}`, { membershipType: "gold", lastBookingDays: "90" }, 8);
      message(draft.id, "EMAIL", `Nous vous attendons chez ${company.name}`, "Revenez voyager, une surprise vous attend.", "DRAFT");
    }

    // Cancelled campaign: its schedule was cancelled with it; its segment is reusable.
    const cancelled = campaign(k === 0 ? S.cancelled : `Campagne annulée ${company.name}`, "ACQUISITION", "CANCELLED", -15, -1, 60_000);
    const reusable = segment(null, `Nouveaux clients ${company.name}`, {}, 25);
    const cancelledMessage = message(cancelled.id, "IN_APP", cancelled.name, "Découvrez nos nouvelles lignes.", "APPROVED");
    schedule(cancelled, cancelledMessage, reusable, "CANCELLED", 5);

    if (k === 0) {
      const done = campaign(S.completed, "PROMOTION", "COMPLETED", -40, -10, 200_000);
      const premium = segment(done.id, `Clients premium ${company.name}`, { membershipType: "premium" }, 6);
      const doneMessage = message(done.id, "IN_APP", done.name, "Merci pour votre fidélité : bilan et avantages.", "SENT");
      schedule(done, doneMessage, premium, "SENT", -20);
    }
  });
}
```

(`now` n'est pas utilisé par `seedMarketing` : retirer le paramètre de la signature et de l'appel si `tsc` ou le linter signale un paramètre inutilisé.)

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/communication-seed.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS. Si « matches a sent schedule's recipient count… » échoue sur `sent.some((x) => x.recipientsCount > 0)`, aucune des 4 premières compagnies à programme actif n'a de compte de fidélité éligible : défaut de graine à corriger (choisir les compagnies d'après les comptes de fidélité existants), jamais un test à assouplir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts tests/unit/communication-seed.test.ts
git commit -m "feat: marketing campaigns, segments, messages and schedules seed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Graine des notifications (TDD)

**Files:**
- Modify: `src/lib/data/seed.ts`
- Create: `tests/unit/notifications-seed.test.ts`

**Interfaces:**
- Consumes: `store.bookings`, `store.parcels`, `store.parcelHistory`, `store.feedbacks`, `store.customers`, `store.marketingSchedules`, `store.marketingSegments`, `store.marketingMessages`, `store.loyaltyAccounts`, `hashCode`.
- Produces: `store.notifications` rempli ; fonction `seedNotifications(store, now)`.

- [ ] **Step 1: Test de graine (rouge)**

Créer `tests/unit/notifications-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const ofType = (type: string) => getStore().notifications.filter((n) => n.notificationType === type);

describe("notifications seed: shape", () => {
  it("generates unique, well-formed codes and ids", () => {
    const list = getStore().notifications;
    expect(list.length).toBeGreaterThan(300);
    expect(new Set(list.map((n) => n.id)).size).toBe(list.length);
    expect(new Set(list.map((n) => n.notificationCode)).size).toBe(list.length);
    for (const n of list) expect(n.notificationCode).toMatch(/^NTF-[0-9A-Z]{8}$/);
  });

  it("covers the three statuses and the three channels it uses", () => {
    const list = getStore().notifications;
    expect(new Set(list.map((n) => n.status))).toEqual(new Set(["PENDING", "SENT", "FAILED"]));
    expect(new Set(list.map((n) => n.channel))).toEqual(new Set(["EMAIL", "SMS", "IN_APP"]));
    for (const n of list) {
      if (n.status === "FAILED") expect(n.channel).toBe("EMAIL");
      if (n.status === "PENDING") expect(n.channel).toBe("SMS");
      expect(n.sentAt === null).toBe(n.status !== "SENT");
      expect(n.retryCount).toBe(0);
    }
  });

  it("only marks sent in-app notifications as read, and never dates a notification in the future", () => {
    for (const n of getStore().notifications) {
      if (n.read) {
        expect(n.channel).toBe("IN_APP");
        expect(n.status).toBe("SENT");
      }
      expect(Date.parse(n.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      if (n.sentAt) expect(Date.parse(n.sentAt)).toBeGreaterThan(Date.parse(n.createdAt));
    }
    expect(getStore().notifications.some((n) => n.read)).toBe(true);
    expect(getStore().notifications.some((n) => n.channel === "IN_APP" && n.status === "SENT" && !n.read)).toBe(true);
  });

  it("holds no e-mail address and no phone number, content included", () => {
    expect(JSON.stringify(getStore().notifications)).not.toMatch(/@|\+221/);
  });
});

describe("notifications seed: derivation", () => {
  it("sends three booking_confirmed notifications per online booking with an account", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online" && b.userId);
    expect(ofType("booking_confirmed")).toHaveLength(online.length * 3);
    for (const b of online) {
      const mine = s.notifications.filter((n) => n.entityId === b.id && n.notificationType === "booking_confirmed");
      expect(mine.map((n) => n.channel).sort()).toEqual(["EMAIL", "IN_APP", "SMS"]);
      for (const n of mine) {
        expect([n.entityType, n.companyId, n.sentTo]).toEqual(["booking", b.companyId, b.userId]);
        expect(n.messageContent).toContain(b.bookingCode);
      }
    }
  });

  it("sends one payment_completed per paid online booking and booking_cancelled only for non-expired cancellations", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online" && b.userId);
    expect(ofType("payment_completed")).toHaveLength(online.filter((b) => b.paymentStatus === "paid").length);
    for (const n of ofType("payment_completed")) expect(n.channel).toBe("IN_APP");
    const cancelled = online.filter((b) => b.status === "cancelled" && b.cancelReason !== "EXPIRED");
    expect(cancelled.length).toBeGreaterThan(0);
    expect(ofType("booking_cancelled")).toHaveLength(cancelled.length * 3);
    const expired = online.filter((b) => b.cancelReason === "EXPIRED");
    expect(expired.length).toBeGreaterThan(0);
    for (const b of expired) {
      expect(s.notifications.some((n) => n.entityId === b.id && n.notificationType === "booking_cancelled")).toBe(false);
    }
  });

  it("sends one SMS per parcel history line to a recipient without an account", () => {
    const s = getStore();
    const sms = s.notifications.filter((n) => n.entityType === "parcel");
    expect(sms).toHaveLength(s.parcelHistory.length);
    for (const n of sms) {
      expect(n.channel).toBe("SMS");
      expect(n.sentTo).toBeNull();
      expect(n.notificationType).toMatch(/^parcel_(created|status_[a-z_]+)$/);
      const parcel = s.parcels.find((p) => p.id === n.entityId)!;
      expect(n.companyId).toBe(parcel.companyId);
      expect(n.messageContent).toContain(parcel.parcelCode);
    }
    expect(new Set(sms.map((n) => n.notificationType)).size).toBeGreaterThan(3);
  });

  it("answers each resolved review with one in-app notification to its author", () => {
    const s = getStore();
    const resolved = s.feedbacks.filter((f) => f.status === "RESOLVED");
    expect(resolved.length).toBeGreaterThan(0);
    expect(ofType("feedback_response")).toHaveLength(resolved.length);
    for (const f of resolved) {
      const n = s.notifications.find((x) => x.entityId === f.id)!;
      expect(n.channel).toBe("IN_APP");
      expect(n.sentTo).toBe(s.customers.find((c) => c.id === f.customerId)!.userId);
      expect(n.createdAt).toBe(f.respondedAt);
    }
  });

  it("delivers each sent schedule to every eligible account, with the message text, and nothing for the other schedules", () => {
    const s = getStore();
    const marketing = ofType("marketing_message");
    let expected = 0;
    for (const sc of s.marketingSchedules) {
      const mine = marketing.filter((n) => n.entityId === sc.id);
      if (sc.status !== "SENT") { expect(mine).toHaveLength(0); continue; }
      expect(mine).toHaveLength(sc.recipientsCount);
      expected += sc.recipientsCount;
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      for (const n of mine) {
        expect([n.entityType, n.channel, n.createdAt, n.messageContent]).toEqual(["marketing_schedule", "IN_APP", sc.sentAt, message.content]);
        expect(n.companyId).toBe(sc.companyId);
      }
    }
    expect(marketing).toHaveLength(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("only addresses existing accounts", () => {
    const s = getStore();
    const users = new Set(s.users.map((u) => u.id));
    for (const n of s.notifications) if (n.sentTo) expect(users.has(n.sentTo)).toBe(true);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/notifications-seed.test.ts` → FAIL (`notifications` vide).

- [ ] **Step 3: Écrire `seedNotifications`**

Dans `src/lib/data/seed.ts`, après `seedMarketing(store, now, iso);` ajouter `seedNotifications(store, now);`, puis à la fin du fichier :

```ts
const PARCEL_STATUS_TEXT: Record<ParcelStatus, string> = {
  PENDING: "enregistré", IN_TRANSIT: "en transit", AT_HUB: "arrivé au hub", DELIVERED: "livré",
  CANCELLED: "annulé", RETURNED: "retourné", LOST: "déclaré perdu",
};
const BOOKING_CHANNELS: NotificationChannel[] = ["EMAIL", "SMS", "IN_APP"];

/**
 * Notifications derived from the other domains: three channels for the confirmation and the cancellation of an
 * online booking, one in-app notification for a confirmed payment, one SMS per parcel history line (the recipient
 * has no account), one in-app notification per resolved review and per recipient of a sent marketing schedule.
 * An expired booking sends nothing (as in the backend). One e-mail in fifteen has failed, one SMS in forty is pending.
 */
function seedNotifications(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();

  const push = (
    companyId: string, entityType: string, entityId: string, notificationType: string, sentTo: string | null,
    channel: NotificationChannel, messageContent: string, createdAt: string,
  ): void => {
    const n = seq++;
    const status: NotificationStatus =
      channel === "EMAIL" && n % 15 === 0 ? "FAILED" : channel === "SMS" && n % 40 === 0 ? "PENDING" : "SENT";
    store.notifications.push({
      id: uid(51, n), companyId, entityType, entityId, notificationCode: hashCode("NTF-", n), notificationType, sentTo,
      channel, status, scheduledAt: null,
      sentAt: status === "SENT" ? new Date(Date.parse(createdAt) + 2_000).toISOString() : null,
      retryCount: 0, read: channel === "IN_APP" && status === "SENT" && n % 3 === 0, messageContent, createdAt,
    });
  };

  for (const b of store.bookings.filter((x) => x.channel === "online" && x.userId)) {
    for (const channel of BOOKING_CHANNELS) {
      push(b.companyId, "booking", b.id, "booking_confirmed", b.userId, channel,
        `Réservation ${b.bookingCode} confirmée, siège ${b.seatNumber ?? "—"}.`, b.createdAt);
    }
    if (b.paymentStatus === "paid") {
      push(b.companyId, "booking", b.id, "payment_completed", b.userId, "IN_APP",
        `Paiement reçu pour la réservation ${b.bookingCode}.`, new Date(Date.parse(b.createdAt) + 180_000).toISOString());
    }
    if (b.status === "cancelled" && b.cancelReason !== "EXPIRED" && b.cancelledAt) {
      for (const channel of BOOKING_CHANNELS) {
        push(b.companyId, "booking", b.id, "booking_cancelled", b.userId, channel,
          `Réservation ${b.bookingCode} annulée.`, b.cancelledAt);
      }
    }
  }

  for (const p of store.parcels) {
    for (const h of store.parcelHistory.filter((x) => x.parcelId === p.id)) {
      push(p.companyId, "parcel", p.id, h.previousStatus === null ? "parcel_created" : `parcel_status_${h.newStatus.toLowerCase()}`,
        null, "SMS", `Colis ${p.parcelCode} : ${PARCEL_STATUS_TEXT[h.newStatus]}.`, h.changedAt);
    }
  }

  for (const f of store.feedbacks.filter((x) => x.status === "RESOLVED" && x.respondedAt)) {
    const customer = store.customers.find((c) => c.id === f.customerId)!;
    push(f.companyId, "feedback", f.id, "feedback_response", customer.userId, "IN_APP",
      "La compagnie a répondu à votre avis.", f.respondedAt!);
  }

  for (const sc of store.marketingSchedules.filter((x) => x.status === "SENT")) {
    const segment = store.marketingSegments.find((x) => x.id === sc.segmentId)!;
    const message = store.marketingMessages.find((x) => x.id === sc.messageId)!;
    const wanted = segment.criteria.membershipType;
    const accounts = store.loyaltyAccounts.filter((a) =>
      a.companyId === sc.companyId && (wanted === undefined || a.membershipType === wanted.toUpperCase()));
    for (const a of accounts) {
      const customer = store.customers.find((c) => c.id === a.customerId)!;
      push(sc.companyId, "marketing_schedule", sc.id, "marketing_message", customer.userId, "IN_APP", message.content, sc.sentAt!);
    }
  }

  // Keep the log chronological for readers of the raw store; consumers sort anyway.
  store.notifications.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  void nowMs;
}
```

Retirer `nowMs` et le `void nowMs;` si inutilisés (c'est le cas : supprimer les deux lignes ainsi que le paramètre `now` de la signature et de l'appel si `tsc` signale un paramètre inutilisé).

- [ ] **Step 4: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. Si « sentAt > createdAt » échoue pour une notification `PENDING`/`FAILED`, c'est qu'un `sentAt` non nul a été posé à tort ; si les assertions de volume échouent (`> 300`), c'est un défaut de dérivation à corriger dans la graine.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/seed.ts tests/unit/notifications-seed.test.ts
git commit -m "feat: notifications seed derived from bookings, parcels, reviews and marketing sends

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Libellés et dépôts de lecture (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/communication.ts`, `tests/unit/communication-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `addActivity`, types de la Task 1.
- Produces (`src/lib/repos/communication.ts`) :
  - Constantes : `NOTIFICATION_CHANNELS`, `NOTIFICATION_STATUSES`, `CAMPAIGN_STATUSES`, `MESSAGE_STATUSES`, `SCHEDULE_STATUSES` (tableaux `as const`).
  - Fonctions : `describeCriteria(criteria): string`, `eligibleCount(segment): number`, `campaignCancelBlockReason(campaign): string | null`.
  - Types : `NotificationRow`, `NotificationDetail`, `NotificationStats`, `CampaignRow`, `CampaignDetail`, `SegmentRow`, `MessageRow`, `ScheduleRow`.
  - Dépôts : `notificationsRepo.listRows({ companyId?, channel?, status? })`, `.get(id)`, `.detail(id)`, `.stats({ companyId? })` ; `campaignsRepo.listRows({ companyId?, status? })`, `.detail(id)` ; `segmentsRepo.listRows({ companyId? })` ; `messagesRepo.listRows({ companyId?, status? })` ; `schedulesRepo.listRows({ companyId?, status? })`.
  - Libellés : `notificationStatusBadge`, `notificationChannelLabel`, `notificationTypeLabel`, `campaignStatusBadge`, `objectiveLabel`, `messageStatusBadge`, `scheduleStatusBadge`.

- [ ] **Step 1: Libellés (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import {
  campaignStatusBadge, messageStatusBadge, notificationChannelLabel, notificationStatusBadge, notificationTypeLabel,
  objectiveLabel, scheduleStatusBadge,
} from "@/lib/labels";

describe("communication labels", () => {
  it("labels notification statuses, channels and types", () => {
    expect(notificationStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(notificationStatusBadge("SENT")).toEqual({ label: "Envoyée", tone: "success" });
    expect(notificationStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(notificationChannelLabel("EMAIL")).toBe("E-mail");
    expect(notificationChannelLabel("SMS")).toBe("SMS");
    expect(notificationChannelLabel("IN_APP")).toBe("Dans l'application");
    expect(notificationChannelLabel("PUSH")).toBe("Notification push");
    expect(notificationChannelLabel("WHATSAPP")).toBe("WhatsApp");
    expect(notificationTypeLabel("booking_confirmed")).toBe("Réservation confirmée");
    expect(notificationTypeLabel("booking_cancelled")).toBe("Réservation annulée");
    expect(notificationTypeLabel("payment_completed")).toBe("Paiement confirmé");
    expect(notificationTypeLabel("parcel_created")).toBe("Colis enregistré");
    expect(notificationTypeLabel("parcel_status_in_transit")).toBe("Colis : en transit");
    expect(notificationTypeLabel("parcel_status_at_hub")).toBe("Colis : au hub");
    expect(notificationTypeLabel("feedback_response")).toBe("Réponse à un avis");
    expect(notificationTypeLabel("marketing_message")).toBe("Message marketing");
    expect(notificationTypeLabel("inconnu_type")).toBe("inconnu_type");
  });

  it("labels campaigns, objectives, messages and schedules", () => {
    expect(campaignStatusBadge("DRAFT")).toEqual({ label: "Brouillon", tone: "neutral" });
    expect(campaignStatusBadge("SCHEDULED")).toEqual({ label: "Programmée", tone: "info" });
    expect(campaignStatusBadge("RUNNING")).toEqual({ label: "En cours", tone: "info" });
    expect(campaignStatusBadge("COMPLETED")).toEqual({ label: "Terminée", tone: "success" });
    expect(campaignStatusBadge("CANCELLED")).toEqual({ label: "Annulée", tone: "neutral" });
    expect(objectiveLabel("ACQUISITION")).toBe("Acquisition");
    expect(objectiveLabel("RETENTION")).toBe("Fidélisation");
    expect(objectiveLabel("PROMOTION")).toBe("Promotion");
    expect(objectiveLabel("REACTIVATION")).toBe("Réactivation");
    expect(messageStatusBadge("DRAFT")).toEqual({ label: "Brouillon", tone: "neutral" });
    expect(messageStatusBadge("APPROVED")).toEqual({ label: "Approuvé", tone: "success" });
    expect(messageStatusBadge("SENT")).toEqual({ label: "Envoyé", tone: "info" });
    expect(scheduleStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(scheduleStatusBadge("SENT")).toEqual({ label: "Envoyée", tone: "success" });
    expect(scheduleStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(scheduleStatusBadge("CANCELLED")).toEqual({ label: "Annulée", tone: "neutral" });
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `CampaignObjective`, `CampaignStatus`, `MarketingMessageStatus`, `NotificationChannel`, `NotificationStatus`, `ScheduleStatus`, puis ajouter à la fin :

```ts
export const notificationStatusBadge = (s: NotificationStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    SENT: { label: "Envoyée", tone: "success" },
    FAILED: { label: "Échouée", tone: "danger" },
  }, s);

export const notificationChannelLabel = (c: NotificationChannel): string =>
  ({ EMAIL: "E-mail", SMS: "SMS", IN_APP: "Dans l'application", PUSH: "Notification push", WHATSAPP: "WhatsApp" })[c];

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  booking_confirmed: "Réservation confirmée",
  booking_cancelled: "Réservation annulée",
  payment_completed: "Paiement confirmé",
  parcel_created: "Colis enregistré",
  parcel_status_pending: "Colis : en attente",
  parcel_status_in_transit: "Colis : en transit",
  parcel_status_at_hub: "Colis : au hub",
  parcel_status_delivered: "Colis : livré",
  parcel_status_cancelled: "Colis : annulé",
  parcel_status_returned: "Colis : retourné",
  parcel_status_lost: "Colis : perdu",
  feedback_response: "Réponse à un avis",
  marketing_message: "Message marketing",
};

/** French label of a `notification_type`; an unknown type is shown as is. */
export const notificationTypeLabel = (type: string): string => NOTIFICATION_TYPE_LABELS[type] ?? type;

export const campaignStatusBadge = (s: CampaignStatus): Badge =>
  pick({
    DRAFT: { label: "Brouillon", tone: "neutral" },
    SCHEDULED: { label: "Programmée", tone: "info" },
    RUNNING: { label: "En cours", tone: "info" },
    COMPLETED: { label: "Terminée", tone: "success" },
    CANCELLED: { label: "Annulée", tone: "neutral" },
  }, s);

export const objectiveLabel = (o: CampaignObjective): string =>
  ({ ACQUISITION: "Acquisition", RETENTION: "Fidélisation", PROMOTION: "Promotion", REACTIVATION: "Réactivation" })[o];

export const messageStatusBadge = (s: MarketingMessageStatus): Badge =>
  pick({
    DRAFT: { label: "Brouillon", tone: "neutral" },
    APPROVED: { label: "Approuvé", tone: "success" },
    SENT: { label: "Envoyé", tone: "info" },
  }, s);

export const scheduleStatusBadge = (s: ScheduleStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    SENT: { label: "Envoyée", tone: "success" },
    FAILED: { label: "Échouée", tone: "danger" },
    CANCELLED: { label: "Annulée", tone: "neutral" },
  }, s);
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant, vert après).

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/communication-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  campaignCancelBlockReason, campaignsRepo, describeCriteria, eligibleCount, messagesRepo, notificationsRepo,
  schedulesRepo, segmentsRepo,
} from "@/lib/repos/communication";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;

describe("targeting", () => {
  it("describes criteria in plain French", () => {
    expect(describeCriteria({})).toBe("Tous les clients");
    expect(describeCriteria({ membershipType: "vip" })).toBe("Palier : VIP");
    expect(describeCriteria({ membershipType: "Premium" })).toBe("Palier : PREMIUM");
    expect(describeCriteria({ membershipType: "gold" })).toBe("Palier inconnu « gold » (aucun client)");
    expect(describeCriteria({ lastBookingDays: "90" })).toBe("lastBookingDays : 90 (non évalué)");
    expect(describeCriteria({ membershipType: "vip", lastBookingDays: "90" })).toBe("Palier : VIP · lastBookingDays : 90 (non évalué)");
  });

  it("counts the company's loyalty accounts that match, case-insensitively, ignoring unknown keys", () => {
    const s = getStore();
    const account = s.loyaltyAccounts[0]!;
    const base = { id: "x", companyId: account.companyId, campaignId: null, name: "t", estimatedSize: 0, createdAt: NOW.toISOString() };
    const mine = s.loyaltyAccounts.filter((a) => a.companyId === account.companyId);
    expect(eligibleCount({ ...base, criteria: {} })).toBe(mine.length);
    expect(eligibleCount({ ...base, criteria: { lastBookingDays: "90" } })).toBe(mine.length);
    for (const tier of ["REGULAR", "VIP", "PREMIUM"] as const) {
      const expected = mine.filter((a) => a.membershipType === tier).length;
      expect(eligibleCount({ ...base, criteria: { membershipType: tier.toLowerCase() } })).toBe(expected);
      expect(eligibleCount({ ...base, criteria: { membershipType: tier } })).toBe(expected);
    }
    expect(eligibleCount({ ...base, criteria: { membershipType: "gold" } })).toBe(0);
    expect(eligibleCount({ ...base, companyId: "00000000-0000-4000-8000-000000000000", criteria: {} })).toBe(0);
  });
});

describe("notification list", () => {
  it("lists every notification newest first and filters by company, channel and status", () => {
    const s = getStore();
    const all = notificationsRepo.listRows({});
    expect(all).toHaveLength(s.notifications.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.notifications[0]!.companyId;
    expect(notificationsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    const sms = notificationsRepo.listRows({ channel: "SMS" });
    expect(sms.length).toBeGreaterThan(0);
    expect(sms.every((r) => r.channel === "SMS")).toBe(true);
    const failed = notificationsRepo.listRows({ status: "FAILED" });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((r) => r.status === "FAILED")).toBe(true);
    const both = notificationsRepo.listRows({ channel: "EMAIL", status: "FAILED" });
    expect(both.length).toBe(failed.length);
    expect(notificationsRepo.listRows({ channel: "SMS", status: "FAILED" })).toHaveLength(0);
  });

  it("exposes only client-safe fields: no content, no account identifier", () => {
    const rows = notificationsRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "channel", "companyId", "companyName", "createdAt", "entityType", "id", "notificationCode", "notificationType",
      "read", "recipientLabel", "sentAt", "status",
    ]);
    const text = JSON.stringify(rows);
    const sample = getStore().notifications[0]!;
    expect(text).not.toContain(sample.messageContent);
    expect(text).not.toContain(sample.sentTo ?? "no-account");
  });

  it("labels the recipient with the account name, or says there is no account", () => {
    const s = getStore();
    const withAccount = s.notifications.find((n) => n.sentTo)!;
    const row = notificationsRepo.listRows({}).find((r) => r.id === withAccount.id)!;
    expect(row.recipientLabel).toBe(s.users.find((u) => u.id === withAccount.sentTo)!.displayName);
    const without = s.notifications.find((n) => n.sentTo === null)!;
    expect(notificationsRepo.listRows({}).find((r) => r.id === without.id)!.recipientLabel).toBe("Destinataire sans compte");
  });

  it("counts sent, failed and pending notifications, optionally for one company", () => {
    const s = getStore();
    const stats = notificationsRepo.stats({});
    expect(stats).toEqual({
      sent: s.notifications.filter((n) => n.status === "SENT").length,
      failed: s.notifications.filter((n) => n.status === "FAILED").length,
      pending: s.notifications.filter((n) => n.status === "PENDING").length,
    });
    const companyId = s.notifications[0]!.companyId;
    const mine = notificationsRepo.stats({ companyId });
    expect(mine.sent + mine.failed + mine.pending).toBe(s.notifications.filter((n) => n.companyId === companyId).length);
  });
});

describe("notification detail", () => {
  it("returns undefined for an unknown notification", () => {
    expect(notificationsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("links a booking notification to its booking and its recipient account", () => {
    const s = getStore();
    const n = s.notifications.find((x) => x.entityType === "booking")!;
    const d = notificationsRepo.detail(n.id)!;
    const booking = s.bookings.find((b) => b.id === n.entityId)!;
    expect(d.entity).toEqual({ href: `/ventes/reservations/${booking.id}`, label: booking.bookingCode });
    expect(d.recipientUserId).toBe(n.sentTo);
    expect(d.recipientName).toBe(s.users.find((u) => u.id === n.sentTo)!.displayName);
    expect(d.companyName).not.toBe("—");
  });

  it("resolves parcel, review and marketing notifications to their pages", () => {
    const s = getStore();
    const parcel = s.notifications.find((x) => x.entityType === "parcel")!;
    expect(notificationsRepo.detail(parcel.id)!.entity!.href).toBe(`/colis/${parcel.entityId}`);
    expect(notificationsRepo.detail(parcel.id)!.recipientUserId).toBeNull();
    expect(notificationsRepo.detail(parcel.id)!.recipientName).toBe("Destinataire sans compte");
    const feedback = s.notifications.find((x) => x.entityType === "feedback")!;
    expect(notificationsRepo.detail(feedback.id)!.entity!.href).toBe(`/clients/avis/${feedback.entityId}`);
    const marketing = s.notifications.find((x) => x.entityType === "marketing_schedule")!;
    const schedule = s.marketingSchedules.find((x) => x.id === marketing.entityId)!;
    expect(notificationsRepo.detail(marketing.id)!.entity!.href).toBe(`/communication/campagnes/${schedule.campaignId}`);
  });
});

describe("campaigns", () => {
  it("lists campaigns newest first with their schedule count and filters by company and status", () => {
    const s = getStore();
    const all = campaignsRepo.listRows({});
    expect(all).toHaveLength(s.marketingCampaigns.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const tabaski = all.find((r) => r.name === "Offre de la Tabaski")!;
    expect(tabaski.scheduleCount).toBe(2);
    expect(Object.keys(tabaski).sort()).toEqual([
      "budget", "companyId", "companyName", "createdAt", "currency", "endDate", "id", "name", "objective",
      "scheduleCount", "startDate", "status",
    ]);
    const cancelled = campaignsRepo.listRows({ status: "CANCELLED" });
    expect(cancelled.length).toBe(4);
    expect(cancelled.every((r) => r.status === "CANCELLED")).toBe(true);
    const companyId = s.marketingCampaigns[0]!.companyId;
    expect(campaignsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("returns undefined for an unknown campaign and a full detail for a known one", () => {
    expect(campaignsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
    const target = campaignNamed("Offre de la Tabaski");
    const d = campaignsRepo.detail(target.id)!;
    expect(d.companyName).not.toBe("—");
    expect(d.segments.map((x) => x.name)).toHaveLength(1);
    expect(d.messages).toHaveLength(1);
    expect(d.messages[0]!.content).toBe("Profitez de -20 % sur votre prochain trajet.");
    expect(d.schedules.map((x) => x.status).sort()).toEqual(["PENDING", "SENT"]);
    expect(d.cancelBlockedReason).toBeNull();
  });

  it("explains when a campaign cannot be cancelled", () => {
    expect(campaignCancelBlockReason(campaignNamed("Offre de la Tabaski"))).toBeNull();
    expect(campaignCancelBlockReason(campaignNamed("Offre de fin d'année"))).toBeNull();
    expect(campaignCancelBlockReason(campaignNamed("Campagne d'été annulée"))).toBe("Cette campagne est déjà annulée");
    expect(campaignCancelBlockReason(campaignNamed("Bilan de rentrée")))
      .toBe("Une campagne en cours ou terminée ne peut pas être annulée");
    const running = { ...campaignNamed("Offre de la Tabaski"), status: "RUNNING" as const };
    expect(campaignCancelBlockReason(running)).toBe("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(campaignsRepo.detail(campaignNamed("Bilan de rentrée").id)!.cancelBlockedReason)
      .toBe("Une campagne en cours ou terminée ne peut pas être annulée");
  });
});

describe("segments, messages and schedules", () => {
  it("lists segments with their readable targeting and the eligible accounts today", () => {
    const s = getStore();
    const rows = segmentsRepo.listRows({});
    expect(rows).toHaveLength(s.marketingSegments.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignName", "companyId", "companyName", "createdAt", "criteriaLabel", "eligibleNow", "estimatedSize", "id", "name",
    ]);
    const vip = rows.find((r) => r.criteriaLabel === "Palier : VIP")!;
    const seg = s.marketingSegments.find((x) => x.id === vip.id)!;
    expect(vip.eligibleNow).toBe(eligibleCount(seg));
    expect(rows.some((r) => r.criteriaLabel === "Tous les clients")).toBe(true);
    expect(rows.find((r) => r.criteriaLabel.startsWith("Palier inconnu"))!.eligibleNow).toBe(0);
    expect(rows.find((r) => r.name.startsWith("Nouveaux clients"))!.campaignName).toBeNull();
    const companyId = s.marketingSegments[0]!.companyId;
    expect(segmentsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("lists messages with their campaign and filters by status", () => {
    const rows = messagesRepo.listRows({});
    expect(rows).toHaveLength(getStore().marketingMessages.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignId", "campaignName", "channel", "companyId", "companyName", "content", "createdAt", "id", "status", "subject",
    ]);
    const drafts = messagesRepo.listRows({ status: "DRAFT" });
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((r) => r.status === "DRAFT" && r.channel === "EMAIL")).toBe(true);
  });

  it("lists schedules by planned date, flags which can be cancelled and filters by status", () => {
    const s = getStore();
    const rows = schedulesRepo.listRows({});
    expect(rows).toHaveLength(s.marketingSchedules.length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.scheduledAt >= rows[i]!.scheduledAt).toBe(true);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignId", "campaignName", "cancellable", "channel", "companyId", "companyName", "id", "messageSubject",
      "recipientsCount", "scheduledAt", "segmentName", "sentAt", "status",
    ]);
    for (const r of rows) expect(r.cancellable).toBe(r.status !== "CANCELLED");
    const pending = schedulesRepo.listRows({ status: "PENDING" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === "PENDING")).toBe(true);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/communication-repo.test.ts` → FAIL (module absent).

- [ ] **Step 4: Implémenter le dépôt de lecture**

Créer `src/lib/repos/communication.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import type {
  AppNotification, CampaignObjective, CampaignStatus, MarketingCampaign, MarketingMessageStatus, MarketingSegment,
  NotificationChannel, NotificationStatus, ScheduleStatus,
} from "@/lib/types";

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS", "IN_APP", "PUSH", "WHATSAPP"] as const;
export const NOTIFICATION_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"] as const;
export const MESSAGE_STATUSES = ["DRAFT", "APPROVED", "SENT"] as const;
export const SCHEDULE_STATUSES = ["PENDING", "SENT", "FAILED", "CANCELLED"] as const;

const KNOWN_TIERS = ["REGULAR", "VIP", "PREMIUM"];

/** Client-safe projection of a notification: no content, no account identifier. */
export interface NotificationRow {
  id: string; notificationCode: string; companyId: string; companyName: string; notificationType: string;
  entityType: string; recipientLabel: string; channel: NotificationChannel; status: NotificationStatus;
  read: boolean; createdAt: string; sentAt: string | null;
}

export interface NotificationStats { sent: number; failed: number; pending: number }

export interface NotificationDetail {
  notification: AppNotification;
  companyName: string;
  recipientName: string;
  recipientUserId: string | null;
  entity: { href: string; label: string } | null;
}

export interface CampaignRow {
  id: string; companyId: string; companyName: string; name: string; objective: CampaignObjective;
  status: CampaignStatus; startDate: string; endDate: string; budget: number; currency: string;
  scheduleCount: number; createdAt: string;
}

export interface SegmentRow {
  id: string; companyId: string; companyName: string; campaignName: string | null; name: string;
  criteriaLabel: string; estimatedSize: number; eligibleNow: number; createdAt: string;
}

export interface MessageRow {
  id: string; companyId: string; companyName: string; campaignId: string; campaignName: string;
  channel: NotificationChannel; subject: string; content: string; status: MarketingMessageStatus; createdAt: string;
}

export interface ScheduleRow {
  id: string; companyId: string; companyName: string; campaignId: string; campaignName: string;
  messageSubject: string; channel: NotificationChannel; segmentName: string; scheduledAt: string;
  sentAt: string | null; status: ScheduleStatus; recipientsCount: number;
  /** False once cancelled: every other status still shows the button (the server refuses what it must). */
  cancellable: boolean;
}

export interface CampaignDetail {
  campaign: MarketingCampaign;
  companyName: string;
  createdByName: string;
  segments: SegmentRow[];
  messages: MessageRow[];
  schedules: ScheduleRow[];
  cancelBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

/** Readable targeting of a segment; only `membershipType` is evaluated by the backend. */
export function describeCriteria(criteria: Record<string, string>): string {
  const parts = Object.entries(criteria).map(([key, value]) =>
    key === "membershipType"
      ? KNOWN_TIERS.includes(value.toUpperCase()) ? `Palier : ${value.toUpperCase()}` : `Palier inconnu « ${value} » (aucun client)`
      : `${key} : ${value} (non évalué)`);
  return parts.length === 0 ? "Tous les clients" : parts.join(" · ");
}

/** Loyalty accounts of the segment's company that its criteria target today. */
export function eligibleCount(segment: MarketingSegment): number {
  const accounts = getStore().loyaltyAccounts.filter((a) => a.companyId === segment.companyId);
  const wanted = segment.criteria.membershipType;
  return wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
}

/** Why a campaign cannot be cancelled, `null` when it can. Same order as the cancel guards. */
export function campaignCancelBlockReason(campaign: MarketingCampaign): string | null {
  if (campaign.status === "CANCELLED") return "Cette campagne est déjà annulée";
  if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
    return "Une campagne en cours ou terminée ne peut pas être annulée";
  }
  return null;
}

function recipientName(sentTo: string | null): string {
  if (!sentTo) return "Destinataire sans compte";
  return getStore().users.find((u) => u.id === sentTo)?.displayName ?? "Compte supprimé";
}

function notificationRow(n: AppNotification): NotificationRow {
  return {
    id: n.id, notificationCode: n.notificationCode, companyId: n.companyId, companyName: companyName(n.companyId),
    notificationType: n.notificationType, entityType: n.entityType, recipientLabel: recipientName(n.sentTo),
    channel: n.channel, status: n.status, read: n.read, createdAt: n.createdAt, sentAt: n.sentAt,
  };
}

function entityLink(n: AppNotification): { href: string; label: string } | null {
  const s = getStore();
  if (n.entityType === "booking") {
    const b = s.bookings.find((x) => x.id === n.entityId);
    return b ? { href: `/ventes/reservations/${b.id}`, label: b.bookingCode } : null;
  }
  if (n.entityType === "parcel") {
    const p = s.parcels.find((x) => x.id === n.entityId);
    return p ? { href: `/colis/${p.id}`, label: p.parcelCode } : null;
  }
  if (n.entityType === "feedback") {
    const f = s.feedbacks.find((x) => x.id === n.entityId);
    return f ? { href: `/clients/avis/${f.id}`, label: f.title } : null;
  }
  if (n.entityType === "marketing_schedule") {
    const sc = s.marketingSchedules.find((x) => x.id === n.entityId);
    const c = sc ? s.marketingCampaigns.find((x) => x.id === sc.campaignId) : undefined;
    return c ? { href: `/communication/campagnes/${c.id}`, label: c.name } : null;
  }
  return null;
}

function segmentRow(seg: MarketingSegment): SegmentRow {
  return {
    id: seg.id, companyId: seg.companyId, companyName: companyName(seg.companyId),
    campaignName: seg.campaignId ? getStore().marketingCampaigns.find((c) => c.id === seg.campaignId)?.name ?? null : null,
    name: seg.name, criteriaLabel: describeCriteria(seg.criteria), estimatedSize: seg.estimatedSize,
    eligibleNow: eligibleCount(seg), createdAt: seg.createdAt,
  };
}

function messageRow(m: ReturnType<typeof getStore>["marketingMessages"][number]): MessageRow {
  return {
    id: m.id, companyId: m.companyId, companyName: companyName(m.companyId), campaignId: m.campaignId,
    campaignName: getStore().marketingCampaigns.find((c) => c.id === m.campaignId)?.name ?? "—",
    channel: m.channel, subject: m.subject, content: m.content, status: m.status, createdAt: m.createdAt,
  };
}

function scheduleRow(sc: ReturnType<typeof getStore>["marketingSchedules"][number]): ScheduleRow {
  const s = getStore();
  const message = s.marketingMessages.find((m) => m.id === sc.messageId);
  return {
    id: sc.id, companyId: sc.companyId, companyName: companyName(sc.companyId), campaignId: sc.campaignId,
    campaignName: s.marketingCampaigns.find((c) => c.id === sc.campaignId)?.name ?? "—",
    messageSubject: message?.subject ?? "—", channel: message?.channel ?? "IN_APP",
    segmentName: s.marketingSegments.find((x) => x.id === sc.segmentId)?.name ?? "—",
    scheduledAt: sc.scheduledAt, sentAt: sc.sentAt, status: sc.status, recipientsCount: sc.recipientsCount,
    cancellable: sc.status !== "CANCELLED",
  };
}

export const notificationsRepo = {
  listRows(filter: { companyId?: string; channel?: NotificationChannel; status?: NotificationStatus } = {}): NotificationRow[] {
    return getStore().notifications
      .filter((n) =>
        (!filter.companyId || n.companyId === filter.companyId) &&
        (!filter.channel || n.channel === filter.channel) &&
        (!filter.status || n.status === filter.status))
      .sort(newest((n) => n.createdAt))
      .map(notificationRow);
  },

  get(id: string): AppNotification | undefined {
    return getStore().notifications.find((n) => n.id === id);
  },

  stats(filter: { companyId?: string } = {}): NotificationStats {
    const list = getStore().notifications.filter((n) => !filter.companyId || n.companyId === filter.companyId);
    return {
      sent: list.filter((n) => n.status === "SENT").length,
      failed: list.filter((n) => n.status === "FAILED").length,
      pending: list.filter((n) => n.status === "PENDING").length,
    };
  },

  detail(id: string): NotificationDetail | undefined {
    const n = getStore().notifications.find((x) => x.id === id);
    if (!n) return undefined;
    return {
      notification: n, companyName: companyName(n.companyId), recipientName: recipientName(n.sentTo),
      recipientUserId: n.sentTo, entity: entityLink(n),
    };
  },
};

export const campaignsRepo = {
  listRows(filter: { companyId?: string; status?: CampaignStatus } = {}): CampaignRow[] {
    const s = getStore();
    return s.marketingCampaigns
      .filter((c) => (!filter.companyId || c.companyId === filter.companyId) && (!filter.status || c.status === filter.status))
      .sort(newest((c) => c.createdAt))
      .map((c): CampaignRow => ({
        id: c.id, companyId: c.companyId, companyName: companyName(c.companyId), name: c.name, objective: c.objective,
        status: c.status, startDate: c.startDate, endDate: c.endDate, budget: c.budget, currency: c.currency,
        scheduleCount: s.marketingSchedules.filter((x) => x.campaignId === c.id).length, createdAt: c.createdAt,
      }));
  },

  get(id: string): MarketingCampaign | undefined {
    return getStore().marketingCampaigns.find((c) => c.id === id);
  },

  detail(id: string): CampaignDetail | undefined {
    const s = getStore();
    const campaign = s.marketingCampaigns.find((c) => c.id === id);
    if (!campaign) return undefined;
    return {
      campaign, companyName: companyName(campaign.companyId),
      createdByName: s.users.find((u) => u.id === campaign.createdByUserId)?.displayName ?? "—",
      segments: s.marketingSegments.filter((x) => x.campaignId === id).map(segmentRow),
      messages: s.marketingMessages.filter((m) => m.campaignId === id).map(messageRow),
      schedules: s.marketingSchedules.filter((x) => x.campaignId === id).sort(newest((x) => x.scheduledAt)).map(scheduleRow),
      cancelBlockedReason: campaignCancelBlockReason(campaign),
    };
  },
};

export const segmentsRepo = {
  listRows(filter: { companyId?: string } = {}): SegmentRow[] {
    return getStore().marketingSegments
      .filter((x) => !filter.companyId || x.companyId === filter.companyId)
      .sort((a, b) => companyName(a.companyId).localeCompare(companyName(b.companyId)) || a.name.localeCompare(b.name))
      .map(segmentRow);
  },
};

export const messagesRepo = {
  listRows(filter: { companyId?: string; status?: MarketingMessageStatus } = {}): MessageRow[] {
    return getStore().marketingMessages
      .filter((m) => (!filter.companyId || m.companyId === filter.companyId) && (!filter.status || m.status === filter.status))
      .sort(newest((m) => m.createdAt))
      .map(messageRow);
  },
};

export const schedulesRepo = {
  listRows(filter: { companyId?: string; status?: ScheduleStatus } = {}): ScheduleRow[] {
    return getStore().marketingSchedules
      .filter((x) => (!filter.companyId || x.companyId === filter.companyId) && (!filter.status || x.status === filter.status))
      .sort(newest((x) => x.scheduledAt))
      .map(scheduleRow);
  },
};
```

Les deux signatures `ReturnType<typeof getStore>["marketingMessages"][number]` peuvent être remplacées par les types `MarketingMessage` et `MarketingSchedule` (à importer de `@/lib/types`) : c'est plus lisible, faire ce remplacement.

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/communication-repo.test.ts tests/unit/labels.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 6: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. Dans `eligibleCount`, remplacer `wanted.toUpperCase()` par `wanted` : échoue `counts the company's loyalty accounts that match, case-insensitively…`.
2. Retirer le filtre `a.companyId === segment.companyId` : même test.
3. Dans `describeCriteria`, traiter une valeur inconnue comme `Palier : …` : échoue `describes criteria in plain French`.
4. Dans `notificationRow`, ajouter `messageContent` à la projection (via `...n`) : échoue `exposes only client-safe fields: no content, no account identifier`.
5. Dans `notificationsRepo.listRows`, retirer le filtre `channel` : échoue le premier test de la liste.
6. Dans `campaignCancelBlockReason`, retirer `RUNNING` : échoue le test avec la campagne simulée en cours ; retirer `COMPLETED` : échoue `explains when a campaign cannot be cancelled`.
7. Dans `scheduleRow`, remplacer `sc.status !== "CANCELLED"` par `sc.status === "PENDING"` : échoue `lists schedules by planned date, flags which can be cancelled…`.
8. Dans `entityLink`, supprimer la branche `marketing_schedule` : échoue `resolves parcel, review and marketing notifications to their pages`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/labels.ts src/lib/repos/communication.ts tests/unit/labels.test.ts tests/unit/communication-repo.test.ts
git commit -m "feat: communication read repositories, targeting and labels

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Annulations, révélation et actions serveur (TDD)

**Files:**
- Modify: `src/lib/repos/communication.ts`
- Create: `src/app/(admin)/communication/actions.ts`, `tests/unit/communication-rules.test.ts`, `tests/unit/communication-actions.test.ts`

**Interfaces:**
- Consumes: dépôts de la Task 3, `addActivity`, `run`, `runReveal`, `requireReason`, `requireString`.
- Produces: `campaignsRepo.cancel(id, reason, actor?, now?): MarketingCampaign` ; `schedulesRepo.cancel(id, reason, actor?, now?): MarketingSchedule` ; `notificationsRepo.logReveal(id, actor?, now?): void` ; actions `cancelCampaign`, `cancelSchedule`, `revealNotificationContent`.

- [ ] **Step 1: Test des règles (rouge)**

Créer `tests/unit/communication-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { campaignsRepo, notificationsRepo, schedulesRepo } from "@/lib/repos/communication";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;
const schedulesOf = (campaignId: string) => getStore().marketingSchedules.filter((s) => s.campaignId === campaignId);
const cancelCampaign = (name: string, reason = "Offre retirée") =>
  campaignsRepo.cancel(campaignNamed(name).id, reason, "tester@sira.app", NOW);
const pendingScheduleOf = (name: string) => schedulesOf(campaignNamed(name).id).find((s) => s.status === "PENDING")!;

describe("cancelling a campaign", () => {
  it("cancels it, cascades to its pending schedules only, and journals the count", () => {
    const target = campaignNamed("Offre de la Tabaski");
    const [sent, pending] = [
      schedulesOf(target.id).find((s) => s.status === "SENT")!, schedulesOf(target.id).find((s) => s.status === "PENDING")!,
    ];
    const n = getStore().activity.length;
    const result = cancelCampaign("Offre de la Tabaski", "  Offre retirée  ");
    expect(result).toBe(target);
    expect(target.status).toBe("CANCELLED");
    expect(target.updatedAt).toBe(NOW.toISOString());
    expect(pending.status).toBe("CANCELLED");
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).not.toBeNull();
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Campagne « Offre de la Tabaski » annulée (1 programmation(s) annulée(s)). Motif : Offre retirée",
    });
  });

  it("does not touch the schedules of other campaigns", () => {
    const other = campaignNamed("Offre de fin d'année");
    cancelCampaign("Offre de la Tabaski");
    expect(other.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de fin d'année").status).toBe("PENDING");
  });

  it("cancels a draft campaign with no schedule and reports zero", () => {
    const draft = getStore().marketingCampaigns.find((c) => c.status === "DRAFT")!;
    const n = getStore().activity.length;
    campaignsRepo.cancel(draft.id, "Abandonnée", "tester@sira.app", NOW);
    expect(draft.status).toBe("CANCELLED");
    expect(getStore().activity[0]!.action).toBe(`Campagne « ${draft.name} » annulée (0 programmation(s) annulée(s)). Motif : Abandonnée`);
    expect(getStore().activity).toHaveLength(n + 1);
  });

  it("refuses an unknown campaign", () => {
    expect(() => campaignsRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Campagne introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = campaignNamed("Offre de la Tabaski");
    const n = getStore().activity.length;
    expect(() => cancelCampaign("Offre de la Tabaski", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a campaign that is already cancelled", () => {
    expect(() => cancelCampaign("Campagne d'été annulée")).toThrow("Cette campagne est déjà annulée");
  });

  it("refuses a completed campaign and leaves its schedule untouched", () => {
    const done = campaignNamed("Bilan de rentrée");
    expect(() => cancelCampaign("Bilan de rentrée")).toThrow("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(done.status).toBe("COMPLETED");
    expect(schedulesOf(done.id).map((s) => s.status)).toEqual(["SENT"]);
  });

  it("refuses a running campaign", () => {
    const target = campaignNamed("Offre de la Tabaski");
    target.status = "RUNNING";
    expect(() => cancelCampaign("Offre de la Tabaski")).toThrow("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
  });

  it("checks the guards in order: unknown, reason, already cancelled, running or completed", () => {
    expect(() => cancelCampaign("Campagne d'été annulée", "")).toThrow("Un motif est obligatoire");
    expect(() => cancelCampaign("Bilan de rentrée", "")).toThrow("Un motif est obligatoire");
    const target = campaignNamed("Bilan de rentrée");
    target.status = "CANCELLED";
    expect(() => cancelCampaign("Bilan de rentrée")).toThrow("Cette campagne est déjà annulée");
  });
});

describe("cancelling a schedule", () => {
  it("cancels a pending schedule, keeps its campaign and journals it", () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    const campaign = campaignNamed("Offre de fin d'année");
    const n = getStore().activity.length;
    const result = schedulesRepo.cancel(target.id, "  Date incorrecte  ", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("CANCELLED");
    expect(campaign.status).toBe("SCHEDULED");
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Programmation de la campagne « Offre de fin d'année » annulée. Motif : Date incorrecte",
    });
  });

  it("refuses an unknown schedule", () => {
    expect(() => schedulesRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Programmation introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    const n = getStore().activity.length;
    expect(() => schedulesRepo.cancel(target.id, "  ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a schedule that is no longer pending, whatever its status", () => {
    const sent = schedulesOf(campaignNamed("Bilan de rentrée").id)[0]!;
    expect(() => schedulesRepo.cancel(sent.id, "motif")).toThrow("Cette programmation n'est plus en attente");
    expect(sent.status).toBe("SENT");
    const cancelled = getStore().marketingSchedules.find((s) => s.status === "CANCELLED")!;
    expect(() => schedulesRepo.cancel(cancelled.id, "motif")).toThrow("Cette programmation n'est plus en attente");
    const failed = pendingScheduleOf("Offre de fin d'année");
    failed.status = "FAILED";
    expect(() => schedulesRepo.cancel(failed.id, "motif")).toThrow("Cette programmation n'est plus en attente");
  });

  it("checks the reason before the status", () => {
    const sent = schedulesOf(campaignNamed("Bilan de rentrée").id)[0]!;
    expect(() => schedulesRepo.cancel(sent.id, "")).toThrow("Un motif est obligatoire");
  });
});

describe("revealing a notification's content", () => {
  it("journals the reveal on the notification's company without writing the content", () => {
    const target = getStore().notifications.find((n) => n.entityType === "booking")!;
    const n = getStore().activity.length;
    notificationsRepo.logReveal(target.id, "tester@sira.app", NOW);
    expect(getStore().activity).toHaveLength(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Donnée personnelle révélée : contenu de la notification ${target.notificationCode}`,
    });
    expect(entry.action).not.toContain(target.messageContent);
  });

  it("refuses an unknown notification without journaling", () => {
    const n = getStore().activity.length;
    expect(() => notificationsRepo.logReveal("00000000-0000-4000-8000-000000000000")).toThrow("Notification introuvable");
    expect(getStore().activity).toHaveLength(n);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/communication-rules.test.ts` → FAIL (`campaignsRepo.cancel is not a function`).

- [ ] **Step 3: Implémenter**

Dans `src/lib/repos/communication.ts`, ajouter l'import `import { addActivity } from "@/lib/repos/activity";` et `MarketingSchedule` à l'import de types, puis ajouter :

Dans `notificationsRepo`, après `detail` :

```ts
  /** Journals the reveal of a notification's content; the content itself is never written to the log. */
  logReveal(id: string, actor = "admin@sira.app", now: Date = new Date()): void {
    const n = getStore().notifications.find((x) => x.id === id);
    if (!n) throw new Error("Notification introuvable");
    addActivity(n.companyId, actor, `Donnée personnelle révélée : contenu de la notification ${n.notificationCode}`, now);
  },
```

Dans `campaignsRepo`, après `detail` :

```ts
  /**
   * Cancels a campaign and, with it, every schedule still pending. Guards, in this order: campaign exists, reason,
   * not already cancelled, neither running nor completed.
   */
  cancel(campaignId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): MarketingCampaign {
    const s = getStore();
    const campaign = s.marketingCampaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error("Campagne introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = campaignCancelBlockReason(campaign);
    if (blocked) throw new Error(blocked);
    campaign.status = "CANCELLED";
    campaign.updatedAt = now.toISOString();
    const pending = s.marketingSchedules.filter((x) => x.campaignId === campaign.id && x.status === "PENDING");
    for (const schedule of pending) schedule.status = "CANCELLED";
    addActivity(
      campaign.companyId, actor,
      `Campagne « ${campaign.name} » annulée (${pending.length} programmation(s) annulée(s)). Motif : ${motif}`, now,
    );
    return campaign;
  },
```

Dans `schedulesRepo`, après `listRows` :

```ts
  /** Cancels a schedule. Guards, in this order: schedule exists, reason, still pending. */
  cancel(scheduleId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): MarketingSchedule {
    const s = getStore();
    const schedule = s.marketingSchedules.find((x) => x.id === scheduleId);
    if (!schedule) throw new Error("Programmation introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (schedule.status !== "PENDING") throw new Error("Cette programmation n'est plus en attente");
    schedule.status = "CANCELLED";
    const campaignName = s.marketingCampaigns.find((c) => c.id === schedule.campaignId)?.name ?? "—";
    addActivity(schedule.companyId, actor, `Programmation de la campagne « ${campaignName} » annulée. Motif : ${motif}`, now);
    return schedule;
  },
```

Run: `pnpm test tests/unit/communication-rules.test.ts` → PASS.

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer la ligne `if (!motif) throw …` de `campaignsRepo.cancel` : échoue `refuses a blank reason and changes nothing` (campagne).
2. Dans la cascade, retirer `&& x.status === "PENDING"` : échoue `cancels it, cascades to its pending schedules only…` (la `SENT` passerait à `CANCELLED`).
3. Supprimer la boucle `for (const schedule of pending) …` : échoue le même test.
4. Supprimer le compteur du message d'activité (`pending.length`) en le remplaçant par `0` : échoue le même test.
5. Retirer `COMPLETED` de `campaignCancelBlockReason` : échoue `refuses a completed campaign…`.
6. Dans `schedulesRepo.cancel`, remplacer `schedule.status !== "PENDING"` par `schedule.status === "CANCELLED"` : échoue `refuses a schedule that is no longer pending, whatever its status`.
7. Supprimer `addActivity` de `schedulesRepo.cancel` : échoue le premier test des programmations.
8. Supprimer `campaign.updatedAt = …` : échoue le premier test de la campagne.

- [ ] **Step 4: Test et implémentation des actions**

Créer `tests/unit/communication-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelCampaign, cancelSchedule, revealNotificationContent } from "@/app/(admin)/communication/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;
const pendingScheduleOf = (name: string) =>
  getStore().marketingSchedules.find((s) => s.campaignId === campaignNamed(name).id && s.status === "PENDING")!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("cancelCampaign", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = campaignNamed("Offre de la Tabaski");
    const n = getStore().activity.length;
    expect(await cancelCampaign(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cancels the campaign and its pending schedule, journals the actor and revalidates the affected pages", async () => {
    const target = campaignNamed("Offre de la Tabaski");
    expect(await cancelCampaign(target.id, " Offre retirée ")).toEqual({ ok: true });
    expect(target.status).toBe("CANCELLED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    expect(paths()).toEqual(expect.arrayContaining([
      "/communication/campagnes", `/communication/campagnes/${target.id}`, "/communication/programmations",
      `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = campaignNamed("Offre de la Tabaski");
    expect(await cancelCampaign(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("SCHEDULED");
    expect(await cancelCampaign(target.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("returns the rule's message as an error result", async () => {
    expect(await cancelCampaign(campaignNamed("Bilan de rentrée").id, "motif")).toEqual({
      ok: false, error: "Une campagne en cours ou terminée ne peut pas être annulée",
    });
    expect(await cancelCampaign(campaignNamed("Campagne d'été annulée").id, "motif")).toEqual({
      ok: false, error: "Cette campagne est déjà annulée",
    });
    expect(await cancelCampaign("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Campagne introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await cancelCampaign("", "motif")).ok).toBe(false);
    expect((await cancelCampaign(campaignNamed("Offre de la Tabaski").id, "  ")).ok).toBe(false);
    expect(campaignNamed("Offre de la Tabaski").status).toBe("SCHEDULED");
  });
});

describe("cancelSchedule", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("PENDING");
  });

  it("cancels the schedule, journals the actor and revalidates the affected pages", async () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(target.id, "Date incorrecte")).toEqual({ ok: true });
    expect(target.status).toBe("CANCELLED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    expect(paths()).toEqual(expect.arrayContaining([
      "/communication/programmations", `/communication/campagnes/${target.campaignId}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("refuses 501 characters, an already sent schedule, an unknown one and blank input", async () => {
    const pending = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(pending.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    const sent = getStore().marketingSchedules.find((s) => s.status === "SENT")!;
    expect(await cancelSchedule(sent.id, "motif")).toEqual({ ok: false, error: "Cette programmation n'est plus en attente" });
    expect(await cancelSchedule("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Programmation introuvable" });
    expect((await cancelSchedule("", "motif")).ok).toBe(false);
    expect((await cancelSchedule(pending.id, "  ")).ok).toBe(false);
    expect(pending.status).toBe("PENDING");
    expect(sent.status).toBe("SENT");
  });
});

describe("revealNotificationContent", () => {
  it("returns no value and logs nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().activity.length;
    expect(await revealNotificationContent(getStore().notifications[0]!.id)).toEqual(EXPIRED);
    expect(getStore().activity).toHaveLength(n);
  });

  it("returns the content only after journaling the reveal, by the session actor", async () => {
    const target = getStore().notifications.find((x) => x.entityType === "booking")!;
    const n = getStore().activity.length;
    expect(await revealNotificationContent(target.id)).toEqual({ ok: true, value: target.messageContent });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", companyId: target.companyId,
      action: `Donnée personnelle révélée : contenu de la notification ${target.notificationCode}`,
    });
    expect(paths()).toContain(`/communication/notifications/${target.id}`);
  });

  it("refuses an unknown or blank notification without logging", async () => {
    const n = getStore().activity.length;
    expect(await revealNotificationContent("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Notification introuvable" });
    expect(await revealNotificationContent("")).toEqual({ ok: false, error: "Notification invalide" });
    expect(getStore().activity).toHaveLength(n);
  });
});
```

Créer `src/app/(admin)/communication/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { campaignsRepo, notificationsRepo, schedulesRepo } from "@/lib/repos/communication";

export async function cancelCampaign(campaignId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(campaignId, "Campagne");
    const motif = requireReason(reason);
    const campaign = campaignsRepo.cancel(campaignId, motif, actor);
    revalidatePath("/communication/campagnes");
    revalidatePath(`/communication/campagnes/${campaign.id}`);
    revalidatePath("/communication/programmations");
    revalidatePath(`/compagnies/${campaign.companyId}`);
  });
}

export async function cancelSchedule(scheduleId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(scheduleId, "Programmation");
    const motif = requireReason(reason);
    const schedule = schedulesRepo.cancel(scheduleId, motif, actor);
    revalidatePath("/communication/programmations");
    revalidatePath(`/communication/campagnes/${schedule.campaignId}`);
    revalidatePath(`/compagnies/${schedule.companyId}`);
  });
}

export async function revealNotificationContent(notificationId: string): Promise<RevealResult> {
  return runReveal((actor) => {
    requireString(notificationId, "Notification");
    const notification = notificationsRepo.get(notificationId);
    if (!notification) throw new Error("Notification introuvable");
    notificationsRepo.logReveal(notificationId, actor);
    revalidatePath(`/communication/notifications/${notificationId}`);
    revalidatePath(`/compagnies/${notification.companyId}`);
    return notification.messageContent;
  });
}
```

Mutations des actions : (a) appeler `campaignsRepo.cancel` hors de `run` → échoue `reads and writes nothing without a session` ; (b) remplacer `requireReason(reason)` par `reason.trim()` (dans l'une ou l'autre action) → échoue le test des 501 caractères ; (c) supprimer `notificationsRepo.logReveal(notificationId, actor)` → échoue `returns the content only after journaling the reveal…` ; (d) retirer `revalidatePath("/communication/programmations")` de `cancelCampaign` → échoue le test de revalidation.

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/communication.ts "src/app/(admin)/communication/actions.ts" tests/unit/communication-rules.test.ts tests/unit/communication-actions.test.ts
git commit -m "feat: cancel campaign and schedule rules, journaled content reveal and server actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Pages des notifications

**Files:**
- Create: `src/components/communication/notification-content.tsx`, `src/app/(admin)/communication/notifications/{page.tsx,notifications-table.tsx}`, `src/app/(admin)/communication/notifications/[id]/{page.tsx,not-found.tsx}`

**Interfaces:**
- Consumes: `notificationsRepo`, `NOTIFICATION_CHANNELS`, `NOTIFICATION_STATUSES`, `revealNotificationContent`, `parseCompanyFilter`, `CompanyFilter`, `KpiCard`, libellés de la Task 3.
- Produces: pages `/communication/notifications` et `/communication/notifications/[id]`. `data-testid` : `notif-sent`, `notif-failed`, `notif-pending`, `notification-status`, `notification-content`.

Pas de test unitaire (couverture E2E à la Task 7) ; `pnpm typecheck` est la vérification.

- [ ] **Step 1: Contenu masqué**

Créer `src/components/communication/notification-content.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revealNotificationContent } from "@/app/(admin)/communication/actions";
import { Button } from "@/components/ui/button";

/** Scalars only: the content comes from the journaled server action, on demand. */
export function NotificationContent({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [content, setContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const r = await revealNotificationContent(notificationId);
      if (!r.ok) throw new Error(r.error);
      setContent(r.value);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'afficher le contenu");
    } finally {
      setBusy(false);
    }
  }

  if (content !== null) {
    return (
      <div className="space-y-2">
        <p data-testid="notification-content" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{content}</p>
        <Button variant="secondary" size="sm" onClick={() => setContent(null)}>Masquer le contenu</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Le contenu est une donnée personnelle : il est masqué et son affichage est journalisé.
      </p>
      <Button size="sm" onClick={reveal} disabled={busy}>Afficher le contenu</Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Liste**

Créer `src/app/(admin)/communication/notifications/notifications-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, notificationStatusBadge, notificationTypeLabel } from "@/lib/labels";
import type { NotificationRow } from "@/lib/repos/communication";

const columns: ColumnDef<NotificationRow, unknown>[] = [
  { accessorKey: "notificationCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.notificationCode}</span> },
  { id: "type", header: "Type", accessorFn: (r) => notificationTypeLabel(r.notificationType) },
  { accessorKey: "recipientLabel", header: "Destinataire" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = notificationStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { id: "read", header: "Lue", accessorFn: (r) => (r.read ? "Oui" : "Non") },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function NotificationsTable({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <DataTable
      columns={columns} data={notifications} rowHref={(r) => `/communication/notifications/${r.id}`}
      searchPlaceholder="Rechercher une notification…" emptyMessage="Aucune notification."
    />
  );
}
```

Créer `src/app/(admin)/communication/notifications/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, notificationsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { NotificationsTable } from "./notifications-table";

export const dynamic = "force-dynamic";

const BASE = "/communication/notifications";
const CHANNEL_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les canaux" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SMS", label: "SMS" },
  { value: "IN_APP", label: "Dans l'application" },
];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "SENT", label: "Envoyées" },
  { value: "FAILED", label: "Échouées" },
];

export default async function NotificationsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; canal?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const channel = parseFilter(sp.canal, NOTIFICATION_CHANNELS);
  const status = parseFilter(sp.statut, NOTIFICATION_STATUSES);
  const keep = { compagnie: companyId, canal: channel, statut: status };
  const stats = notificationsRepo.stats({ companyId });
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Messages envoyés aux voyageurs et aux destinataires de colis, du plus récent au plus ancien. Le contenu est masqué."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div data-testid="notif-sent"><KpiCard label="Envoyées" value={formatNumber(stats.sent)} /></div>
        <div data-testid="notif-failed">
          <KpiCard label="Échouées" value={formatNumber(stats.failed)} tone={stats.failed > 0 ? "danger" : "default"} hint="Aucune nouvelle tentative automatique" />
        </div>
        <div data-testid="notif-pending">
          <KpiCard label="En attente" value={formatNumber(stats.pending)} tone={stats.pending > 0 ? "warning" : "default"} />
        </div>
      </div>
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={CHANNEL_OPTIONS} current={channel} param="canal" keep={keep} label="Filtrer par canal" />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <NotificationsTable notifications={notificationsRepo.listRows({ companyId, channel, status })} />
    </>
  );
}
```

- [ ] **Step 3: Fiche**

Créer `src/app/(admin)/communication/notifications/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotificationContent } from "@/components/communication/notification-content";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, notificationStatusBadge, notificationTypeLabel } from "@/lib/labels";
import { notificationsRepo } from "@/lib/repos/communication";

export const dynamic = "force-dynamic";

export default async function NotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = notificationsRepo.detail(id);
  if (!detail) notFound();
  const { notification: n } = detail;
  const status = notificationStatusBadge(n.status);
  return (
    <>
      <PageHeader
        title={`Notification ${n.notificationCode}`}
        description={`${notificationTypeLabel(n.notificationType)} · ${detail.companyName}`}
        actions={<span data-testid="notification-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Envoi</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Canal">{notificationChannelLabel(n.channel)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Tentatives de renvoi">{n.retryCount}</DetailRow>
            <DetailRow label="Lue">{n.read ? "Oui" : "Non"}</DetailRow>
            <DetailRow label="Créée le">{formatDateTime(n.createdAt)}</DetailRow>
            <DetailRow label="Envoyée le">{n.sentAt ? formatDateTime(n.sentAt) : "—"}</DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${n.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Destinataire">
              {detail.recipientUserId
                ? <Link href={`/utilisateurs/${detail.recipientUserId}`} className="hover:underline">{detail.recipientName}</Link>
                : detail.recipientName}
            </DetailRow>
            <DetailRow label="Objet lié">
              {detail.entity ? <Link href={detail.entity.href} className="hover:underline">{detail.entity.label}</Link> : "—"}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contenu</CardTitle></CardHeader>
          <CardContent><NotificationContent notificationId={n.id} /></CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/communication/notifications/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function NotificationNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Notification introuvable</p>
        <Link href="/communication/notifications" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux notifications
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/communication/notification-content.tsx "src/app/(admin)/communication/notifications"
git commit -m "feat: notifications list and detail with journaled content reveal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Pages des campagnes, segments, messages et programmations

**Files:**
- Create: `src/components/communication/{cancel-campaign-button,cancel-schedule-button,campaign-tabs}.tsx`, `src/app/(admin)/communication/campagnes/{page.tsx,campaigns-table.tsx}`, `src/app/(admin)/communication/campagnes/[id]/{page.tsx,not-found.tsx}`, `src/app/(admin)/communication/segments/{page.tsx,segments-table.tsx}`, `src/app/(admin)/communication/messages/{page.tsx,messages-table.tsx}`, `src/app/(admin)/communication/programmations/{page.tsx,schedules-table.tsx}`

**Interfaces:**
- Consumes: `campaignsRepo`, `segmentsRepo`, `messagesRepo`, `schedulesRepo`, constantes de statut, `cancelCampaign`, `cancelSchedule`, `parseCompanyFilter`, `CompanyFilter`, libellés des Tasks 3 et 4.
- Produces: pages `/communication/campagnes`, `/communication/campagnes/[id]`, `/communication/segments`, `/communication/messages`, `/communication/programmations`. `data-testid` : `campaign-status`.

- [ ] **Step 1: Boutons d'annulation**

Créer `src/components/communication/cancel-campaign-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelCampaign } from "@/app/(admin)/communication/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface CancelCampaignButtonProps { campaignId: string; name: string }

export function CancelCampaignButton({ campaignId, name }: CancelCampaignButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Annuler la campagne</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la campagne « ${name} »`}
        description="Les programmations en attente de la campagne sont annulées avec elle. Une campagne en cours ou terminée ne peut pas être annulée."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelCampaign(campaignId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

Créer `src/components/communication/cancel-schedule-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelSchedule } from "@/app/(admin)/communication/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the subject labels the button and the dialog. */
export interface CancelScheduleButtonProps { scheduleId: string; subject: string }

export function CancelScheduleButton({ scheduleId, subject }: CancelScheduleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)} aria-label={`Annuler la programmation « ${subject} »`}>
        Annuler
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la programmation « ${subject} »`}
        description="Seule une programmation en attente peut être annulée. Cette décision est définitive."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelSchedule(scheduleId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Onglets de la campagne**

Créer `src/components/communication/campaign-tabs.tsx` :

```tsx
import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  campaignStatusBadge, messageStatusBadge, notificationChannelLabel, objectiveLabel, scheduleStatusBadge,
} from "@/lib/labels";
import type { CampaignDetail } from "@/lib/repos/communication";

const TAB_VALUES = ["resume", "segments", "messages", "programmations"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CampaignTabs({ detail, initialTab }: { detail: CampaignDetail; initialTab?: string }) {
  const { campaign: c } = detail;
  const status = campaignStatusBadge(c.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${c.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Objectif">{objectiveLabel(c.objective)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Début">{formatDate(c.startDate)}</DetailRow>
          <DetailRow label="Fin">{formatDate(c.endDate)}</DetailRow>
          <DetailRow label="Budget">{formatMoney(c.budget, c.currency)}</DetailRow>
          <DetailRow label="Créée par">{detail.createdByName}</DetailRow>
          <DetailRow label="Créée le">{formatDate(c.createdAt)}</DetailRow>
          <DetailRow label="Modifiée le">{c.updatedAt ? formatDateTime(c.updatedAt) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "segments", label: "Segments",
      content: (
        <Card><CardContent>
          {detail.segments.length === 0 ? <Empty>Aucun segment propre à cette campagne.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Nom</th>
                  <th className="py-1 font-medium">Ciblage</th>
                  <th className="py-1 font-medium">Taille estimée</th>
                  <th className="py-1 font-medium">Éligibles aujourd&apos;hui</th>
                </tr>
              </thead>
              <tbody>
                {detail.segments.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-1.5 font-medium">{s.name}</td>
                    <td>{s.criteriaLabel}</td>
                    <td className="tabular-nums">{s.estimatedSize}</td>
                    <td className="tabular-nums">{s.eligibleNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "messages", label: "Messages",
      content: (
        <div className="space-y-3">
          {detail.messages.length === 0 ? <Empty>Aucun message.</Empty> : detail.messages.map((m) => {
            const badge = messageStatusBadge(m.status);
            return (
              <Card key={m.id}><CardContent>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.subject}</span>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{notificationChannelLabel(m.channel)}</span>
                </div>
                <p className="text-sm">{m.content}</p>
              </CardContent></Card>
            );
          })}
        </div>
      ),
    },
    {
      value: "programmations", label: "Programmations",
      content: (
        <Card><CardContent>
          {detail.schedules.length === 0 ? <Empty>Aucune programmation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Prévue le</th>
                  <th className="py-1 font-medium">Message</th>
                  <th className="py-1 font-medium">Segment</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Destinataires</th>
                  <th className="py-1 font-medium">Envoyée le</th>
                </tr>
              </thead>
              <tbody>
                {detail.schedules.map((x) => {
                  const badge = scheduleStatusBadge(x.status);
                  return (
                    <tr key={x.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(x.scheduledAt)}</td>
                      <td>{x.messageSubject}</td>
                      <td>{x.segmentName}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td className="tabular-nums">{x.recipientsCount}</td>
                      <td>{x.sentAt ? formatDateTime(x.sentAt) : "—"}</td>
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

- [ ] **Step 3: Campagnes (liste et fiche)**

Créer `src/app/(admin)/communication/campagnes/campaigns-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { campaignStatusBadge, objectiveLabel } from "@/lib/labels";
import type { CampaignRow } from "@/lib/repos/communication";

const columns: ColumnDef<CampaignRow, unknown>[] = [
  { accessorKey: "name", header: "Campagne", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "objective", header: "Objectif", accessorFn: (r) => objectiveLabel(r.objective) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = campaignStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "period", header: "Période", accessorFn: (r) => `${formatDate(r.startDate)} ${formatDate(r.endDate)}`,
    cell: ({ row }) => `${formatDate(row.original.startDate)} → ${formatDate(row.original.endDate)}`,
  },
  {
    accessorKey: "budget", header: "Budget",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.budget, row.original.currency)}</span>,
  },
  { accessorKey: "scheduleCount", header: "Programmations", cell: ({ row }) => <span className="tabular-nums">{row.original.scheduleCount}</span> },
];

export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <DataTable
      columns={columns} data={campaigns} rowHref={(r) => `/communication/campagnes/${r.id}`}
      searchPlaceholder="Rechercher une campagne…" emptyMessage="Aucune campagne."
    />
  );
}
```

Créer `src/app/(admin)/communication/campagnes/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { CAMPAIGN_STATUSES, campaignsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { CampaignsTable } from "./campaigns-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "SCHEDULED", label: "Programmées" },
  { value: "RUNNING", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function CampaignsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, CAMPAIGN_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader title="Campagnes" description="Campagnes marketing des compagnies, de la plus récente à la plus ancienne." />
      <CompanyFilter basePath="/communication/campagnes" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/campagnes" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <CampaignsTable campaigns={campaignsRepo.listRows({ companyId, status })} />
    </>
  );
}
```

Créer `src/app/(admin)/communication/campagnes/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { CampaignTabs } from "@/components/communication/campaign-tabs";
import { CancelCampaignButton } from "@/components/communication/cancel-campaign-button";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { campaignStatusBadge } from "@/lib/labels";
import { campaignsRepo } from "@/lib/repos/communication";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = campaignsRepo.detail(id);
  if (!detail) notFound();
  const { campaign } = detail;
  const status = campaignStatusBadge(campaign.status);
  return (
    <>
      <PageHeader
        title={campaign.name}
        description={detail.companyName}
        actions={
          <>
            <span data-testid="campaign-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {campaign.status !== "CANCELLED" && <CancelCampaignButton campaignId={campaign.id} name={campaign.name} />}
          </>
        }
      />
      {campaign.status !== "CANCELLED" && detail.cancelBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="cancel-blocked">
          Annulation impossible : {detail.cancelBlockedReason}.
        </p>
      )}
      <CampaignTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/communication/campagnes/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function CampaignNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Campagne introuvable</p>
        <Link href="/communication/campagnes" className="mt-2 inline-block text-sm text-accent underline">Retour aux campagnes</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Segments**

Créer `src/app/(admin)/communication/segments/segments-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDate } from "@/lib/format";
import type { SegmentRow } from "@/lib/repos/communication";

const columns: ColumnDef<SegmentRow, unknown>[] = [
  { accessorKey: "name", header: "Segment", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "campaign", header: "Campagne", accessorFn: (r) => r.campaignName ?? "Réutilisable", cell: ({ row }) => row.original.campaignName ?? "Réutilisable" },
  { accessorKey: "criteriaLabel", header: "Ciblage" },
  { accessorKey: "estimatedSize", header: "Taille estimée", cell: ({ row }) => <span className="tabular-nums">{row.original.estimatedSize}</span> },
  { accessorKey: "eligibleNow", header: "Éligibles aujourd'hui", cell: ({ row }) => <span className="tabular-nums">{row.original.eligibleNow}</span> },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDate(row.original.createdAt) },
];

export function SegmentsTable({ segments }: { segments: SegmentRow[] }) {
  return (
    <DataTable
      columns={columns} data={segments}
      searchPlaceholder="Rechercher un segment…" emptyMessage="Aucun segment."
    />
  );
}
```

Créer `src/app/(admin)/communication/segments/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { segmentsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { SegmentsTable } from "./segments-table";

export const dynamic = "force-dynamic";

export default async function SegmentsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  return (
    <>
      <PageHeader
        title="Segments"
        description="Ciblages des campagnes. Seul le palier de fidélité est évalué ; les destinataires éligibles sont recalculés à chaque lecture."
      />
      <CompanyFilter basePath="/communication/segments" current={companyId} />
      <SegmentsTable segments={segmentsRepo.listRows({ companyId })} />
    </>
  );
}
```

- [ ] **Step 5: Messages**

Créer `src/app/(admin)/communication/messages/messages-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { messageStatusBadge, notificationChannelLabel } from "@/lib/labels";
import type { MessageRow } from "@/lib/repos/communication";

const columns: ColumnDef<MessageRow, unknown>[] = [
  { accessorKey: "subject", header: "Objet", cell: ({ row }) => <span className="font-medium">{row.original.subject}</span> },
  { accessorKey: "campaignName", header: "Campagne" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  {
    accessorKey: "content", header: "Texte",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.content.length > 80 ? `${row.original.content.slice(0, 80)}…` : row.original.content}
      </span>
    ),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = messageStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function MessagesTable({ messages }: { messages: MessageRow[] }) {
  return (
    <DataTable
      columns={columns} data={messages} rowHref={(r) => `/communication/campagnes/${r.campaignId}?onglet=messages`}
      searchPlaceholder="Rechercher un message…" emptyMessage="Aucun message."
    />
  );
}
```

Créer `src/app/(admin)/communication/messages/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { MESSAGE_STATUSES, messagesRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { MessagesTable } from "./messages-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "APPROVED", label: "Approuvés" },
  { value: "SENT", label: "Envoyés" },
];

export default async function MessagesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, MESSAGE_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages marketing rédigés par les compagnies. Seul le canal « dans l'application » est réellement envoyé."
      />
      <CompanyFilter basePath="/communication/messages" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/messages" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <MessagesTable messages={messagesRepo.listRows({ companyId, status })} />
    </>
  );
}
```

- [ ] **Step 6: Programmations**

Créer `src/app/(admin)/communication/programmations/schedules-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CancelScheduleButton } from "@/components/communication/cancel-schedule-button";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, scheduleStatusBadge } from "@/lib/labels";
import type { ScheduleRow } from "@/lib/repos/communication";

const columns: ColumnDef<ScheduleRow, unknown>[] = [
  { accessorKey: "scheduledAt", header: "Prévue le", cell: ({ row }) => formatDateTime(row.original.scheduledAt) },
  { accessorKey: "campaignName", header: "Campagne", cell: ({ row }) => <span className="font-medium">{row.original.campaignName}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "messageSubject", header: "Message" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  { accessorKey: "segmentName", header: "Segment" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = scheduleStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "recipientsCount", header: "Destinataires", cell: ({ row }) => <span className="tabular-nums">{row.original.recipientsCount}</span> },
  { accessorKey: "sentAt", header: "Envoyée le", cell: ({ row }) => (row.original.sentAt ? formatDateTime(row.original.sentAt) : "—") },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (row.original.cancellable
      ? <CancelScheduleButton scheduleId={row.original.id} subject={row.original.messageSubject} />
      : null),
  },
];

/** No `rowHref`: the rows hold a button that opens a dialog. */
export function SchedulesTable({ schedules }: { schedules: ScheduleRow[] }) {
  return (
    <DataTable
      columns={columns} data={schedules} rowId={(r) => r.id}
      searchPlaceholder="Rechercher une programmation…" emptyMessage="Aucune programmation."
    />
  );
}
```

Créer `src/app/(admin)/communication/programmations/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { SCHEDULE_STATUSES, schedulesRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { SchedulesTable } from "./schedules-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "SENT", label: "Envoyées" },
  { value: "FAILED", label: "Échouées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function SchedulesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, SCHEDULE_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Programmations"
        description="Envois planifiés des campagnes. Une programmation en attente part automatiquement à l'échéance."
      />
      <CompanyFilter basePath="/communication/programmations" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/programmations" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <SchedulesTable schedules={schedulesRepo.listRows({ companyId, status })} />
    </>
  );
}
```

- [ ] **Step 7: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/communication "src/app/(admin)/communication/campagnes" "src/app/(admin)/communication/segments" "src/app/(admin)/communication/messages" "src/app/(admin)/communication/programmations"
git commit -m "feat: campaigns, segments, messages and schedules pages with cancellation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, E2E, test de fuite et README

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 5 et 6.
- Produces: 5 entrées de navigation implémentées ; couverture E2E de la section.

- [ ] **Step 1: Test de navigation (rouge)**

Dans `tests/unit/nav.test.ts` : le test du lot 6 `marks only lot 1 to lot 6 pages as implemented` est **remplacé** par `marks only lot 1 to lot 7 pages as implemented` : reprendre le tableau attendu du lot 6 (32 chemins, trié) et y insérer, à leur place alphabétique, les cinq chemins `"/communication/campagnes"`, `"/communication/messages"`, `"/communication/notifications"`, `"/communication/programmations"`, `"/communication/segments"` (37 chemins en tout). Ajouter à la fin du fichier :

```ts
describe("lot 7 breadcrumbs", () => {
  it("links the parent list of notification and campaign details, nothing else under communication", () => {
    expect(isLinkablePath("/communication/notifications/abc")).toBe(true);
    expect(isLinkablePath("/communication/campagnes/abc")).toBe(true);
    expect(isLinkablePath("/communication/segments")).toBe(true);
    expect(isLinkablePath("/communication")).toBe(false);
  });
  it("labels the communication segments", () => {
    expect(labelForSegment("communication")).toBe("Communication");
    expect(labelForSegment("programmations")).toBe("Programmations");
  });
});
```

(importer `isLinkablePath` et `labelForSegment` si absents.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` :
1. Remplacer les cinq lignes `todo(…)` de la section « Communication » par :

```ts
    { label: "Notifications", href: "/communication/notifications", implemented: true },
    { label: "Campagnes", href: "/communication/campagnes", implemented: true },
    { label: "Segments", href: "/communication/segments", implemented: true },
    { label: "Messages", href: "/communication/messages", implemented: true },
    { label: "Programmations", href: "/communication/programmations", implemented: true },
```

2. Ajouter à `ROUTE_PREFIXES` (en conservant les préfixes existants des lots précédents) : `"/communication/notifications"`, `"/communication/campagnes"`.

Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/communication/notifications");` par `await page.goto("/conformite/journal-audit");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("notifications can be filtered by channel and status and show the delivery indicators", async ({ page }) => {
  await login(page);
  await page.goto("/communication/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  for (const id of ["notif-sent", "notif-failed", "notif-pending"]) await expect(page.getByTestId(id)).toBeVisible();
  await page.getByRole("link", { name: "E-mail", exact: true }).click();
  await expect(page).toHaveURL(/canal=EMAIL/);
  await page.getByRole("link", { name: "Échouées", exact: true }).click();
  await expect(page).toHaveURL(/canal=EMAIL/);
  await expect(page).toHaveURL(/statut=FAILED/);
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  await expect(page.getByRole("row", { name: /Échouée/ }).first()).toBeVisible();
});

test("the content of a notification is hidden until it is revealed on demand", async ({ page }) => {
  await login(page);
  await page.goto("/communication/notifications?canal=EMAIL&statut=SENT");
  await page.getByRole("row").nth(1).click();
  await expect(page).toHaveURL(/\/communication\/notifications\/[0-9a-f-]+$/);
  await expect(page.getByTestId("notification-status")).toHaveText("Envoyée");
  await expect(page.getByTestId("notification-content")).toHaveCount(0);
  await page.getByRole("button", { name: "Afficher le contenu" }).click();
  await expect(page.getByTestId("notification-content")).toContainText(/Réservation BK-[0-9A-Z]{8} confirmée/);
  await page.getByRole("button", { name: "Masquer le contenu" }).click();
  await expect(page.getByTestId("notification-content")).toHaveCount(0);
});

test("campaigns are listed and opened with their segments, messages and schedules", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await expect(page.getByRole("heading", { name: "Campagnes" })).toBeVisible();
  await page.getByPlaceholder("Rechercher une campagne…").fill("fin d'année");
  await page.getByRole("row", { name: /Offre de fin d'année/ }).click();
  await expect(page).toHaveURL(/\/communication\/campagnes\/[0-9a-f-]+$/);
  await expect(page.getByTestId("campaign-status")).toHaveText("Programmée");
  await page.getByRole("tab", { name: "Segments" }).click();
  await expect(page.getByText("Tous les clients").first()).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByText("Voyagez en fin d'année avec 15 % de réduction.")).toBeVisible();
  await page.getByRole("tab", { name: "Programmations" }).click();
  await expect(page.getByText("En attente", { exact: true })).toBeVisible();
});

test("cancelling a scheduled campaign also cancels its pending schedule", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await page.getByPlaceholder("Rechercher une campagne…").fill("Tabaski");
  await page.getByRole("row", { name: /Offre de la Tabaski/ }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Programmée");
  await page.getByRole("button", { name: "Annuler la campagne" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Offre retirée à la demande de la compagnie");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("campaign-status")).toHaveText("Annulée");
  await expect(page.getByRole("button", { name: "Annuler la campagne" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Programmations" }).click();
  await expect(page.getByText("Envoyée", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Annulée", { exact: true })).toHaveCount(1);
  await expect(page.getByText("En attente", { exact: true })).toHaveCount(0);
});

test("a completed campaign cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await page.getByPlaceholder("Rechercher une campagne…").fill("Bilan de rentrée");
  await page.getByRole("row", { name: /Bilan de rentrée/ }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Terminée");
  await expect(page.getByTestId("cancel-blocked")).toContainText("Une campagne en cours ou terminée ne peut pas être annulée");
  await page.getByRole("button", { name: "Annuler la campagne" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une campagne en cours ou terminée ne peut pas être annulée");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Terminée");
});

test("segments show their readable targeting and the eligible accounts", async ({ page }) => {
  await login(page);
  await page.goto("/communication/segments");
  await expect(page.getByRole("heading", { name: "Segments" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Palier : VIP/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Tous les clients/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Palier inconnu « gold » \(aucun client\)/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /lastBookingDays : 90 \(non évalué\)/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Réutilisable/ }).first()).toBeVisible();
});

test("messages are listed with their status", async ({ page }) => {
  await login(page);
  await page.goto("/communication/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await page.getByRole("link", { name: "Brouillons", exact: true }).click();
  await expect(page).toHaveURL(/statut=DRAFT/);
  await expect(page.getByRole("row", { name: /E-mail.*Brouillon/ }).first()).toBeVisible();
});

test("a pending schedule is cancelled with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/communication/programmations?statut=PENDING");
  await page.getByPlaceholder("Rechercher une programmation…").fill("fin d'année");
  const row = page.getByRole("row", { name: /Offre de fin d'année/ });
  await row.getByRole("button", { name: /Annuler la programmation/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Date d'envoi incorrecte");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Offre de fin d'année/ })).toHaveCount(0);
  await page.goto("/communication/programmations?statut=CANCELLED");
  await page.getByPlaceholder("Rechercher une programmation…").fill("fin d'année");
  await expect(page.getByRole("row", { name: /Offre de fin d'année.*Annulée/ })).toBeVisible();
});

test("a schedule that was already sent cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/communication/programmations?statut=SENT");
  await page.getByPlaceholder("Rechercher une programmation…").fill("Bilan de rentrée");
  const row = page.getByRole("row", { name: /Bilan de rentrée/ });
  await row.getByRole("button", { name: /Annuler la programmation/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Cette programmation n'est plus en attente");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("row", { name: /Bilan de rentrée.*Envoyée/ })).toBeVisible();
});
```

Remarque pour l'implémenteur : sur la page « Programmations », le champ de recherche et le bouton portent « Annuler » ; le sélecteur `{ name: /Annuler la programmation/ }` cible l'`aria-label` du bouton de la ligne. Après l'annulation de « Offre de fin d'année » (`statut=PENDING`), la ligne disparaît de la liste filtrée.

3. Étendre le test `@prod` : après les appels existants à `detailPath(...)`, ajouter

```ts
  const notificationPath = await detailPath("/communication/notifications", "Réservation confirmée", "Rechercher une notification…", /Réservation confirmée/);
  const campaignPath = await detailPath("/communication/campagnes", "Bilan de rentrée", "Rechercher une campagne…", /Bilan de rentrée/);
```

et ajouter au tableau `paths` : `"/communication/notifications"`, `"/communication/notifications?canal=SMS"`, `"/communication/notifications?statut=FAILED"`, `notificationPath`, `"/communication/campagnes"`, `"/communication/campagnes?statut=CANCELLED"`, `campaignPath`, `` `${campaignPath}?onglet=programmations` ``, `"/communication/segments"`, `"/communication/messages"`, `"/communication/programmations"`.

(Le test existant applique à chaque chemin les expressions régulières d'e-mails, de téléphones et d'IP complètes sur le HTML brut et le DOM : le contenu d'une notification n'y apparaît jamais, il n'est servi que par l'action de révélation.)

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter à la section des lots livrés un paragraphe « Lot 7 : communication » décrivant les 7 écrans, les deux actions (« Annuler la campagne » avec cascade, « Annuler la programmation ») et la révélation journalisée du contenu d'une notification, puis ajouter à la liste des limites : pas de création ni d'édition de campagnes, segments, messages ou programmations ; une annulation n'est pas réversible ; aucune relance d'une notification échouée (le backend n'en a pas) ; seul le canal « dans l'application » est réellement envoyé côté backend ; l'expiration d'une réservation n'envoie aucune notification ; le ciblage n'évalue que le palier de fidélité ; la taille estimée d'un segment est saisie par la compagnie et peut différer des éligibles réels ; une campagne « terminée » n'est produite par aucun chemin du backend actuel (valeur semée pour couvrir le statut).

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable communication navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 7 écrans (Tasks 5 et 6), modèle de données et graines (Tasks 1 et 2), ciblage et projections (Task 3), règles d'annulation avec cascade, ordre des gardes et révélation (Task 4), navigation, E2E et fuite (Task 7), limites (README).
- **Cohérence des noms** : `notificationsRepo.listRows/get/detail/stats/logReveal`, `campaignsRepo.listRows/get/detail/cancel`, `segmentsRepo.listRows`, `messagesRepo.listRows`, `schedulesRepo.listRows/cancel`, `describeCriteria`, `eligibleCount` (dépôt : prend un `MarketingSegment` ; graine : prend `(store, companyId, criteria)`), `campaignCancelBlockReason`, `cancelCampaign`, `cancelSchedule`, `revealNotificationContent` sont utilisés à l'identique dans les tâches.
- **Risques connus, à signaler à l'implémenteur** : (1) les quatre premières compagnies à programme actif n'ont peut-être pas toutes un compte de fidélité éligible : la graine peut alors avoir `recipientsCount` nul partout, ce que `communication-seed` et `notifications-seed` refusent volontairement ; (2) les tests de volume (`> 300` notifications, `> 5` SMS, `> 3` programmations envoyées) reposent sur le volume des lots 4 à 6 ; (3) le test E2E des notifications échouées suppose au moins un e-mail `FAILED` (un sur quinze, rang global) ; (4) le test `a pending schedule is cancelled…` suppose que la ligne annulée apparaît avec « Annulée » dans la ligne ; (5) les tests de graine n'ont pas été exécutés. Corriger la graine ou le sélecteur plutôt qu'affaiblir un test, et consigner l'écart dans le plan.
