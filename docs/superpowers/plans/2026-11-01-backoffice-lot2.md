# Backoffice Sira, lot 2 : offre et facturation SaaS. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les huit entrées « Bientôt disponible » de la section « Offre et facturation » par de vraies pages (plans, fonctionnalités, paliers partenaires, types de documents KYC, abonnements, paiements, factures, impayés) sur données statiques typées, avec trois actions serveur : relancer un paiement, annuler un abonnement, activer ou désactiver un type de document KYC.

**Architecture:** Même socle que le lot 1. Les pages sont des Server Components (`export const dynamic = "force-dynamic"`, `searchParams`/`params` lus comme des `Promise`) qui lisent `src/lib/repos/billing.ts`, adossé au store en mémoire étendu par `src/lib/data/seed.ts`. Les composants clients ne reçoivent que des projections (`PlanRow`, `SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `UnpaidRow`, ou quelques champs scalaires) construites champ par champ. Les mutations sont des Server Actions qui passent par un `run()` partagé (session d'abord, `ActionResult`), extrait du lot 1 vers `src/lib/actions/run.ts`. Le registre des types KYC devient la source de vérité de l'activation automatique des compagnies.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21 (API v8 : `ColumnDef<T, unknown>`, `accessorKey`, `cell: ({ row }) => …`), Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await` (motif de `src/app/(admin)/compagnies/page.tsx`). Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=` (motif de `CompanyTabs`). Après une action, le composant client appelle `useRouter().refresh()` (motif de `KycActions`).
- **Server Actions = points d'entrée HTTP publics** : chaque action passe par `run()` de `src/lib/actions/run.ts` (session vérifiée **avant** toute lecture ou écriture), renvoie un `ActionResult` (`{ ok: true } | { ok: false; error: string }`) et ne lève jamais d'exception pour un échec attendu (en production, Next masque le message d'une exception).
- Actions sensibles (annulation d'abonnement, activation ou désactivation d'un type KYC) : confirmation + **motif obligatoire**, rogné (`trim`), **500 caractères au plus** (`"Motif trop long (500 caractères maximum)"`). La relance de paiement demande une confirmation sans motif.
- Le journal d'activité ne contient jamais de coordonnées (e-mail, téléphone) ni d'objet métier complet.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `Company`, `Employee`, `contactEmail`, `contactPhone`, ni un objet métier complet ; seulement une projection typée **et** construite champ par champ (les champs en trop sont absents à l'exécution, prouvé par un test `Object.keys`). Les imports de types depuis `@/lib/repos/billing` dans un composant client sont `import type` uniquement (jamais d'import de valeur, qui embarquerait le store dans le bundle client).
- Pas de `rowHref` sur un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (les clics dans le portail Radix remontent l'arbre React jusqu'à la ligne) : la navigation passe alors par un lien dans une cellule.
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach`, aucune dépendance à l'ordre. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute utilise des entités de graine qu'aucun autre test ne mute (Louga Trans pour le KYC, Touba Liaison pour l'annulation, Baobab Lines et Saint-Louis Route pour la relance, Sahel Express en lecture seule).
- Toute garde de sécurité ou de règle métier nouvelle (session d'abord, relance seulement `past_due`/`suspended`, annulation refusée sur `canceled`/`expired`, dernier type KYC obligatoire actif) est prouvée par un test **qui échoue quand on retire la garde** : l'implémenteur retire la garde, constate l'échec nommé, la remet, constate le vert.
- `pnpm build` (et donc `pnpm e2e`, qui construit le serveur de production) réécrit `tsconfig.json` : après chaque build, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`.
- Commits : message court en anglais (`feat:`/`test:`/`refactor:`/`chore:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création ou modification de plans, fonctionnalités et paliers (lecture seule), PDF, proration, remboursements, versements aux compagnies, transitions automatiques de statut dans le temps (la file des impayés affiche un dépassement, aucun job ne suspend ni n'expire).

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. La navigation compte **8** entrées dans « Offre et facturation » (le spec dit « 9 entrées » en comptant les écrans de détail) : les 8 passent à `implemented: true`.
2. « Abonnements actifs » d'un plan = abonnements **en cours** (`trial`, `active`, `past_due`, `suspended`) ; la colonne s'intitule « Abonnements en cours ».
3. Le paramètre de graine de la relance vit dans `Store.retryOutcomes` (clé = identifiant d'abonnement : Baobab Lines réussit, Saint-Louis Route échoue, Fatick Lines réussit ; tout autre abonnement réussit), pas dans le type `Subscription`.
4. Une relance **échouée** est un échec attendu : l'action enregistre la tentative puis renvoie `{ ok: false, error: "Échec du paiement : <motif>" }`.
5. La bascule d'un type KYC exige aussi un motif (action de conformité) ; le motif figure dans l'activité plateforme (`companyId: null`), comme celui de l'annulation figure dans l'activité de la compagnie (exigé par le spec).
6. Désactiver un type n'active aucune compagnie rétroactivement : l'activation reste déclenchée par l'approbation d'un document (règle du lot 1).
7. Le panneau KYC de la fiche compagnie affiche tous les types du registre ; ceux qui ne sont pas exigés portent le badge « Non exigé » et le compteur devient `approuvés / types obligatoires actifs`.
8. La file des impayés calcule `daysLeft` à partir de `pastDueSince` seul : suspension à `pastDueSince + 7 j`, expiration à `pastDueSince + 7 j + 30 j`. Le KPI et le panneau « Impayés » de la Vue 360 restent sur la même source (`subscriptions` au statut `past_due`) ; le panneau gagne un lien vers `/facturation/impayes`.
9. Le lien de la Vue 360 vers `/facturation/impayes` est ajouté à la Task 7 (la page existe à ce moment-là), pas à la Task 8.
10. `DataTable` (lot 1) gagne une prop facultative `rowId` (Task 7) : sans identifiant stable, une ligne retirée de la file des impayés après une relance réussie ferait réutiliser son composant (et l'état de son dialogue) par la ligne suivante.

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) Subscription, Invoice, CompanyDetail + Plan, FeatureDef, PartnerTier, KycDocumentType, SubscriptionHistoryEntry, PaymentAttempt…
src/lib/data/seed.ts                           (modifié) plans, catalogue, paliers, registre KYC, historique, tentatives, retryOutcomes
src/lib/repos/store.ts                         (modifié) resetStore(now?)
src/lib/repos/activity.ts                      (créé)   addActivity partagé
src/lib/repos/companies.ts                     (modifié) activation lue dans le registre KYC, detail.kycTypes
src/lib/repos/billing.ts                       (créé)   plansRepo, featuresRepo, tiersRepo, kycTypesRepo, subscriptionsRepo, invoicesRepo, paymentsRepo
src/lib/actions/run.ts                         (créé)   run(), ActionResult, requireString, requireReason, errorMessage
src/lib/filters.ts                             (créé)   parseFilter
src/lib/labels.ts                              (modifié) badges et libellés de facturation
src/lib/nav.ts                                 (modifié) 8 entrées implémentées, préfixes de fil d'Ariane
src/app/(admin)/compagnies/actions.ts          (modifié) utilise run() partagé
src/app/(admin)/facturation/actions.ts         (créé)   retrySubscriptionPayment, cancelSubscription
src/app/(admin)/offre/actions.ts               (créé)   setKycTypeActive
src/app/(admin)/offre/plans/{page,plans-table}.tsx, plans/[id]/{page,not-found}.tsx
src/app/(admin)/offre/fonctionnalites/page.tsx
src/app/(admin)/offre/paliers-partenaires/page.tsx
src/app/(admin)/offre/types-documents-kyc/{page,kyc-type-toggle}.tsx
src/app/(admin)/facturation/abonnements/{page,subscriptions-table}.tsx, abonnements/[id]/{page,not-found}.tsx
src/app/(admin)/facturation/paiements/{page,payments-table}.tsx
src/app/(admin)/facturation/factures/{page,invoices-table}.tsx, factures/[id]/{page,not-found}.tsx
src/app/(admin)/facturation/impayes/{page,unpaid-table}.tsx
src/app/(admin)/page.tsx                       (modifié) lien « Voir la file des impayés »
src/components/data/{detail-row,status-filter-nav}.tsx          (créés)
src/components/billing/{retry-payment-button,subscription-actions,subscription-tabs}.tsx (créés)
src/components/company/{kyc-panel,company-tabs}.tsx            (modifiés)
tests/unit/{billing-seed,offer-repos,billing-repo,run-action,billing-actions,labels,filters}.test.ts (créés)
tests/unit/nav.test.ts                         (modifié)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

Comptes de tests attendus : 94 tests unitaires au départ. Après chaque tâche : T1 119, T2 140, T3 160, T4 163, T5 165, T6 165, T7 169, T8 170. E2E (projet `dev` + test `@prod`) : 12 au départ, 13 après T4, 14 après T5, 15 après T6, 16 après T7, 16 après T8 (le test `@prod` est étendu, pas dupliqué).

---

### Task 1: Types, graine étendue et dépôts de l'offre (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`, `src/lib/repos/store.ts`, `src/lib/repos/companies.ts`
- Create: `src/lib/repos/activity.ts`, `src/lib/repos/billing.ts`, `tests/unit/billing-seed.test.ts`, `tests/unit/offer-repos.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `KYC_TYPES`, `companiesRepo` (lot 1).
- Produces:
  - Types : `Subscription` (+ `planId: string`, `trialEndDate: string | null`, `pastDueSince: string | null`), `Invoice` (+ `subscriptionId: string`), `Plan`, `FeatureDef`, `PartnerTierCode`, `PartnerTier`, `KycDocumentType`, `SubscriptionChangeKind`, `SubscriptionHistoryEntry`, `PaymentAttempt`, `RetryOutcome`, `CompanyDetail` (+ `kycTypes: KycDocumentType[]`).
  - `Store` gagne `plans: Plan[]`, `featureDefs: FeatureDef[]`, `partnerTiers: PartnerTier[]`, `kycTypes: KycDocumentType[]`, `subscriptionHistory: SubscriptionHistoryEntry[]`, `paymentAttempts: PaymentAttempt[]`, `retryOutcomes: Record<string, RetryOutcome>`.
  - `resetStore(now?: Date): void`.
  - `addActivity(companyId: string | null, actor: string, action: string, now?: Date): ActivityEntry` dans `repos/activity.ts`.
  - Dans `repos/billing.ts` : `LIVE_STATUSES: readonly SubscriptionStatus[]` ; `type SubscriptionRow` ; `type PlanRow` ; `interface PlanDetail { plan: Plan; features: FeatureDef[]; subscriptions: SubscriptionRow[] }` ; `interface FeatureWithPlans extends FeatureDef { plans: Pick<Plan, "id" | "name" | "status">[] }` ; `interface TierWithCount extends PartnerTier { companies: number }` ; `plansRepo.list(): Plan[]`, `plansRepo.listRows(): PlanRow[]`, `plansRepo.get(id: string): Plan | undefined`, `plansRepo.detail(id: string): PlanDetail | undefined` ; `featuresRepo.list(): FeatureWithPlans[]` ; `tiersRepo.list(): TierWithCount[]` ; `kycTypesRepo.list(): KycDocumentType[]`, `kycTypesRepo.requiredActive(): KycDocumentType[]`, `kycTypesRepo.setActive(code: string, active: boolean, reason: string, actor?: string): KycDocumentType`.
  - `companiesRepo.detail(id)` renvoie aussi `kycTypes` ; l'activation automatique exige les types `active && required` du registre.

- [ ] **Step 1: Étendre les types**

Remplacer intégralement `src/lib/types/index.ts` par :

```ts
export type CompanyStatus = "draft" | "active" | "suspended" | "closed";

export interface Company {
  id: string;
  slug: string;
  name: string;
  status: CompanyStatus;
  country: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  registrationNumber: string;
  ninea: string;
  createdAt: string;
  activatedAt: string | null;
  forceActivated: boolean;
  dataRetentionDays: number | null;
  partnerTier: "STANDARD" | "SILVER" | "GOLD";
}

export type KycDocumentStatus = "pending" | "approved" | "rejected";

export interface KycDocument {
  id: string;
  companyId: string;
  typeCode: string;
  typeName: string;
  status: KycDocumentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export type SubscriptionStatus =
  | "trial" | "active" | "past_due" | "suspended" | "expired" | "canceled";

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  nextBillingDate: string;
  trialEndDate: string | null;
  pastDueSince: string | null;
}

export interface Invoice {
  id: string;
  companyId: string;
  subscriptionId: string;
  number: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  issuedAt: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  setupFee: number;
  currency: string;
  trialDays: number;
  status: "active" | "inactive";
  limits: { maxUsers: number; maxBuses: number };
  featureCodes: string[];
}

export interface FeatureDef { code: string; name: string; kind: "boolean" | "quota" }

export type PartnerTierCode = Company["partnerTier"];
export interface PartnerTier { code: PartnerTierCode; minMonths: number; discountPercent: number }

export interface KycDocumentType { code: string; name: string; required: boolean; active: boolean }

export type SubscriptionChangeKind =
  | "ACTIVATION" | "UPGRADE" | "DOWNGRADE" | "PLAN_CHANGE" | "CANCELLATION";

export interface SubscriptionHistoryEntry {
  id: string;
  subscriptionId: string;
  kind: SubscriptionChangeKind;
  fromPlan: string | null;
  toPlan: string | null;
  at: string;
}

export interface PaymentAttempt {
  id: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  at: string;
  invoiceId: string | null;
  reason: string | null;
}

/** Simulated, deterministic outcome of a payment retry (seed parameter, never random). */
export type RetryOutcome = "success" | "failure";

export interface PlanLimits {
  maxUsers: number;
  usedUsers: number;
  maxBuses: number;
  usedBuses: number;
}

export interface FeatureFlag { code: string; name: string; enabled: boolean }
export interface UsageMetric { metricCode: string; label: string; value: number }
export interface ReferralCredit {
  id: string; amount: number; currency: string; status: "AVAILABLE" | "APPLIED";
}
export interface Referral { code: string | null; credits: ReferralCredit[] }

export interface Employee {
  id: string; companyId: string; name: string; email: string; phone: string;
  role: "MANAGER" | "GUICHETIER" | "CHAUFFEUR";
}
export interface FleetBus {
  id: string; companyId: string; plate: string; status: "active" | "maintenance";
}
export interface FleetTrip {
  id: string; companyId: string; route: string; departure: string;
  status: "planned" | "boarding" | "departed";
}

export interface ActivityEntry {
  id: string; companyId: string | null; at: string; actor: string; action: string;
}

export interface ServiceHealth {
  name: string; status: "healthy" | "degraded" | "down"; responseTimeMs: number;
}
export interface Incident {
  id: string; code: string; title: string; serviceName: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  detectedAt: string;
}
export interface DsrRequest {
  id: string; type: "ACCESS" | "ERASURE" | "RECTIFICATION";
  status: "RECEIVED" | "IN_PROGRESS"; dueDate: string; requesterRef: string;
}

export interface CompanyDetail {
  company: Company;
  documents: KycDocument[];
  kycTypes: KycDocumentType[];
  subscription: Subscription | null;
  invoices: Invoice[];
  limits: PlanLimits | null;
  features: FeatureFlag[];
  usage: UsageMetric[];
  referral: Referral;
  employees: Employee[];
  buses: FleetBus[];
  trips: FleetTrip[];
  activity: ActivityEntry[];
}
```

Run: `pnpm typecheck` → FAIL : `seed.ts` construit des `Subscription`/`Invoice` sans les nouveaux champs, `companies.ts` construit un `CompanyDetail` sans `kycTypes`. C'est attendu, les étapes suivantes corrigent.

- [ ] **Step 2: Tests de cohérence de la graine (échouants)**

Créer `tests/unit/billing-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { SubscriptionStatus } from "@/lib/types";
import { KYC_TYPES } from "@/lib/types/kyc";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};

describe("billing seed", () => {
  it("has four plans priced in XOF, Legacy being the only inactive one", () => {
    const plans = getStore().plans;
    expect(plans.map((p) => p.name)).toEqual(["Starter", "Pro", "Enterprise", "Legacy"]);
    expect(plans.filter((p) => p.status === "inactive").map((p) => p.code)).toEqual(["LEGACY"]);
    expect(plans.every((p) => p.currency === "XOF")).toBe(true);
  });

  it("has six features, the three partner tiers and the six KYC types active and required", () => {
    const s = getStore();
    expect(s.featureDefs).toHaveLength(6);
    expect(s.partnerTiers.map((t) => [t.code, t.minMonths, t.discountPercent])).toEqual([
      ["STANDARD", 0, 0], ["SILVER", 6, 5], ["GOLD", 12, 10],
    ]);
    expect(s.kycTypes.map((t) => t.code)).toEqual(KYC_TYPES.map((t) => t.code));
    expect(s.kycTypes.every((t) => t.required && t.active)).toBe(true);
  });

  it("only references catalogued features in plans", () => {
    const s = getStore();
    const codes = s.featureDefs.map((f) => f.code);
    for (const p of s.plans) for (const code of p.featureCodes) expect(codes).toContain(code);
  });

  it("points every subscription to a plan with the same name", () => {
    const s = getStore();
    expect(s.subscriptions).toHaveLength(15);
    for (const sub of s.subscriptions) {
      expect(s.plans.find((p) => p.id === sub.planId)?.name).toBe(sub.planName);
    }
  });

  it("has two unpaid, one suspended, one expired, one canceled and two trial subscriptions", () => {
    const count = (st: SubscriptionStatus) => getStore().subscriptions.filter((x) => x.status === st).length;
    expect([count("past_due"), count("suspended"), count("expired"), count("canceled"), count("trial")])
      .toEqual([2, 1, 1, 1, 2]);
  });

  it("sets trialEndDate only on trials and pastDueSince only on unpaid or suspended ones", () => {
    for (const sub of getStore().subscriptions) {
      expect(sub.trialEndDate !== null).toBe(sub.status === "trial");
      expect(sub.pastDueSince !== null).toBe(sub.status === "past_due" || sub.status === "suspended");
    }
  });

  it("links every invoice to a subscription of the same company and to exactly one matching attempt", () => {
    const s = getStore();
    expect(s.invoices).toHaveLength(30);
    for (const inv of s.invoices) {
      expect(s.subscriptions.find((x) => x.id === inv.subscriptionId)?.companyId).toBe(inv.companyId);
      const attempts = s.paymentAttempts.filter((a) => a.invoiceId === inv.id);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]!.status).toBe(inv.status);
      expect(attempts[0]!.amount).toBe(inv.amount);
    }
  });

  it("records failed attempts without invoice for every unpaid or suspended subscription", () => {
    const s = getStore();
    expect(s.paymentAttempts).toHaveLength(34);
    for (const sub of s.subscriptions.filter((x) => x.status === "past_due" || x.status === "suspended")) {
      expect(s.paymentAttempts.some((a) =>
        a.subscriptionId === sub.id && a.status === "failed" && a.invoiceId === null && !!a.reason,
      )).toBe(true);
    }
  });

  it("starts every history with an activation and ends the canceled one with a cancellation", () => {
    const s = getStore();
    for (const sub of s.subscriptions) {
      const h = s.subscriptionHistory
        .filter((x) => x.subscriptionId === sub.id)
        .sort((a, b) => a.at.localeCompare(b.at));
      expect(h[0]!.kind).toBe("ACTIVATION");
      expect(h[0]!.fromPlan).toBeNull();
      if (sub.status === "canceled") expect(h.at(-1)!.kind).toBe("CANCELLATION");
    }
    expect(s.subscriptionHistory.filter((x) => x.kind === "UPGRADE")).toHaveLength(2);
    expect(s.subscriptionHistory.filter((x) => x.kind === "DOWNGRADE")).toHaveLength(1);
  });

  it("gives each unpaid or suspended subscription a deterministic retry outcome", () => {
    const outcomes = getStore().retryOutcomes;
    expect(outcomes[subOf("Baobab Lines").id]).toBe("success");
    expect(outcomes[subOf("Saint-Louis Route").id]).toBe("failure");
    expect(outcomes[subOf("Fatick Lines").id]).toBe("success");
    expect(Object.keys(outcomes)).toHaveLength(3);
  });
});
```

Run: `pnpm test tests/unit/billing-seed.test.ts` → FAIL (erreurs de type ou `undefined` : `getStore().plans` n'existe pas, `resetStore` n'accepte pas d'argument).

- [ ] **Step 3: Étendre la graine et le store**

Remplacer `src/lib/repos/store.ts` par :

```ts
import { buildSeed, type Store } from "@/lib/data/seed";

const g = globalThis as { __siraBackofficeStore?: Store };

/** Store partagé par processus ; survit au rechargement à chaud en dev. */
export function getStore(): Store {
  return (g.__siraBackofficeStore ??= buildSeed());
}

/** Rebuilds the seed; tests pass a fixed date so day counts are deterministic. */
export function resetStore(now?: Date): void {
  g.__siraBackofficeStore = buildSeed(now);
}
```

Remplacer intégralement `src/lib/data/seed.ts` par (les parties « People, fleet », « Activity », services, incidents et DSR sont identiques au lot 1 ; la numérotation des factures `INV-2026-0002` … `INV-2026-0031` est conservée) :

```ts
import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Company, CompanyStatus, DsrRequest, Employee, FeatureDef, FeatureFlag,
  FleetBus, FleetTrip, Incident, Invoice, KycDocument, KycDocumentType, PartnerTier,
  PaymentAttempt, Plan, PlanLimits, Referral, RetryOutcome, ServiceHealth, Subscription,
  SubscriptionChangeKind, SubscriptionHistoryEntry, SubscriptionStatus, UsageMetric,
} from "@/lib/types";

const DAY = 86_400_000;

export interface Store {
  companies: Company[];
  documents: KycDocument[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  limits: Record<string, PlanLimits>;
  features: Record<string, FeatureFlag[]>;
  usage: Record<string, UsageMetric[]>;
  referrals: Record<string, Referral>;
  employees: Employee[];
  buses: FleetBus[];
  trips: FleetTrip[];
  activity: ActivityEntry[];
  services: ServiceHealth[];
  incidents: Incident[];
  dsr: DsrRequest[];
  plans: Plan[];
  featureDefs: FeatureDef[];
  partnerTiers: PartnerTier[];
  kycTypes: KycDocumentType[];
  subscriptionHistory: SubscriptionHistoryEntry[];
  paymentAttempts: PaymentAttempt[];
  retryOutcomes: Record<string, RetryOutcome>;
}

const NAMES = [
  "Sahel Express", "Teranga Bus", "Dakar Voyages", "Atlantique Transport",
  "Baobab Lines", "Casamance Trans", "Kaolack Cars", "Saint-Louis Route",
  "Thiès Mobilité", "Ziguinchor Express", "Touba Liaison", "Mbour Coast",
  "Diourbel Cars", "Tamba Rapide", "Louga Trans", "Kolda Voyages",
  "Fatick Lines", "Matam Express", "Richard-Toll Bus", "Saly Shuttle",
];

const DRAFT_INDEXES = [12, 13, 14, 15, 19];
const APPROVED_BY_DRAFT = [1, 2, 3, 5, 4];
const SUBSCRIPTION_STATUS: Record<number, SubscriptionStatus> = {
  0: "active", 1: "active", 2: "trial", 3: "active", 4: "past_due", 5: "active",
  6: "active", 7: "past_due", 8: "active", 9: "trial", 10: "active", 11: "active",
  16: "suspended", 17: "expired", 18: "canceled",
};
/** Days since the first unpaid charge (Baobab Lines, Saint-Louis Route, Fatick Lines). */
const PAST_DUE_SINCE_DAYS: Record<number, number> = { 4: 2, 7: 5, 16: 20 };
/** Deterministic retry results: the demo shows one refused payment (Saint-Louis Route). */
const RETRY_OUTCOMES: Record<number, RetryOutcome> = { 4: "success", 7: "failure", 16: "success" };
/** Plan changes before the current plan (the current plan is PLANS[index % 3]). */
const PLAN_CHANGES: Record<number, { kind: SubscriptionChangeKind; from: string }> = {
  1: { kind: "UPGRADE", from: "Starter" },
  5: { kind: "UPGRADE", from: "Pro" },
  6: { kind: "DOWNGRADE", from: "Pro" },
};

interface PlanDef {
  code: string; name: string; price: number; yearly: number; setup: number; trial: number;
  users: number; buses: number; features: string[]; status: Plan["status"];
}

const PLANS: PlanDef[] = [
  { code: "STARTER", name: "Starter", price: 10000, yearly: 100000, setup: 0, trial: 14, users: 10, buses: 5,
    features: ["ONLINE_BOOKING", "FLEET", "API_CALLS"], status: "active" },
  { code: "PRO", name: "Pro", price: 25000, yearly: 250000, setup: 50000, trial: 14, users: 50, buses: 25,
    features: ["ONLINE_BOOKING", "FLEET", "PARCELS", "API_CALLS", "SMS_NOTIFICATIONS"], status: "active" },
  { code: "ENTERPRISE", name: "Enterprise", price: 60000, yearly: 600000, setup: 150000, trial: 30, users: 500, buses: 200,
    features: ["ONLINE_BOOKING", "FLEET", "PARCELS", "HR", "API_CALLS", "SMS_NOTIFICATIONS"], status: "active" },
];
const LEGACY_PLAN: PlanDef = {
  code: "LEGACY", name: "Legacy", price: 8000, yearly: 80000, setup: 0, trial: 0, users: 5, buses: 3,
  features: ["ONLINE_BOOKING", "FLEET"], status: "inactive",
};

const FEATURE_DEFS: FeatureDef[] = [
  { code: "ONLINE_BOOKING", name: "Réservation en ligne", kind: "boolean" },
  { code: "FLEET", name: "Gestion de flotte", kind: "boolean" },
  { code: "PARCELS", name: "Colis", kind: "boolean" },
  { code: "HR", name: "Ressources humaines", kind: "boolean" },
  { code: "API_CALLS", name: "Appels API", kind: "quota" },
  { code: "SMS_NOTIFICATIONS", name: "Notifications SMS", kind: "quota" },
];

const TIERS: PartnerTier[] = [
  { code: "STANDARD", minMonths: 0, discountPercent: 0 },
  { code: "SILVER", minMonths: 6, discountPercent: 5 },
  { code: "GOLD", minMonths: 12, discountPercent: 10 },
];

const ROUTES = [
  "Dakar → Saint-Louis", "Dakar → Touba", "Dakar → Ziguinchor",
  "Thiès → Kaolack", "Mbour → Dakar",
];
const PEOPLE = [
  "Awa Diop", "Moussa Fall", "Fatou Ndiaye", "Ibrahima Sow", "Mariama Ba",
  "Cheikh Sy", "Aminata Gueye", "Ousmane Diallo", "Khady Faye",
];

function uid(prefix: number, n: number): string {
  return `${prefix.toString(16).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildSeed(now: Date = new Date()): Store {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString();
  const store: Store = {
    companies: [], documents: [], subscriptions: [], invoices: [], limits: {},
    features: {}, usage: {}, referrals: {}, employees: [], buses: [], trips: [],
    activity: [], services: [], incidents: [], dsr: [],
    plans: [], featureDefs: [], partnerTiers: [], kycTypes: [],
    subscriptionHistory: [], paymentAttempts: [], retryOutcomes: {},
  };
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, busSeq = 1, tripSeq = 1, actSeq = 1;
  let attSeq = 1, histSeq = 1;

  store.plans = [...PLANS, LEGACY_PLAN].map((p, n) => ({
    id: uid(12, n + 1), code: p.code, name: p.name, priceMonthly: p.price, priceYearly: p.yearly,
    setupFee: p.setup, currency: "XOF", trialDays: p.trial, status: p.status,
    limits: { maxUsers: p.users, maxBuses: p.buses }, featureCodes: [...p.features],
  }));
  store.featureDefs = FEATURE_DEFS.map((f) => ({ ...f }));
  store.partnerTiers = TIERS.map((t) => ({ ...t }));
  store.kycTypes = KYC_TYPES.map((t) => ({ code: t.code, name: t.name, required: true, active: true }));

  NAMES.forEach((name, i) => {
    const draftIdx = DRAFT_INDEXES.indexOf(i);
    const status: CompanyStatus =
      draftIdx >= 0 ? "draft" : i < 12 ? "active" : i === 18 ? "closed" : "suspended";
    const id = uid(1, i + 1);
    const slug = slugify(name);
    const company: Company = {
      id, slug, name, status, country: "SN", currency: "XOF",
      contactEmail: `contact@${slug}.sn`,
      contactPhone: `+2217712${String(30000 + i * 137).padStart(5, "0")}`,
      registrationNumber: `SN-DKR-2024-B-${1000 + i}`,
      ninea: `00${4100000 + i * 37}2G2`,
      createdAt: iso(-(400 - i * 15)),
      activatedAt: status === "draft" ? null : iso(-(380 - i * 15)),
      forceActivated: i === 3,
      dataRetentionDays: i % 4 === 0 ? 365 : null,
      partnerTier: i < 3 ? "GOLD" : i < 8 ? "SILVER" : "STANDARD",
    };
    store.companies.push(company);

    // KYC documents
    KYC_TYPES.forEach((t, k) => {
      let docStatus: KycDocument["status"] | null = null;
      if (status !== "draft") docStatus = "approved";
      else {
        const approved = APPROVED_BY_DRAFT[draftIdx] ?? 0;
        if (k < approved) docStatus = "approved";
        else if (k === approved && approved < KYC_TYPES.length) docStatus = "pending";
        else if (k === approved + 1 && draftIdx === 2) docStatus = "rejected";
      }
      if (!docStatus) return;
      store.documents.push({
        id: uid(2, docSeq++), companyId: id, typeCode: t.code, typeName: t.name,
        status: docStatus,
        uploadedAt: iso(-(30 - k * 3 - draftIdx)),
        reviewedAt: docStatus === "pending" ? null : iso(-(20 - k)),
        rejectionReason: docStatus === "rejected" ? "Document illisible" : null,
      });
    });

    // Subscription, invoices, payment attempts, history, limits, features
    const subStatus = SUBSCRIPTION_STATUS[i];
    if (subStatus) {
      const plan = PLANS[i % 3]!;
      const planId = store.plans[i % 3]!.id;
      const subId = uid(3, subSeq++);
      const pastDueDays = PAST_DUE_SINCE_DAYS[i];
      store.subscriptions.push({
        id: subId, companyId: id, planId, planName: plan.name, status: subStatus,
        billingCycle: "MONTHLY", price: plan.price, currency: "XOF",
        nextBillingDate: iso(5 + i),
        trialEndDate: subStatus === "trial" ? iso(5 + i) : null,
        pastDueSince: pastDueDays === undefined ? null : iso(-pastDueDays),
      });

      const invoices: Invoice[] = [
        {
          id: uid(4, invSeq++), companyId: id, subscriptionId: subId,
          number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
          amount: plan.price, currency: "XOF", status: "paid", issuedAt: iso(-60),
        },
        {
          id: uid(4, invSeq++), companyId: id, subscriptionId: subId,
          number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
          amount: plan.price, currency: "XOF",
          status: subStatus === "past_due" ? "failed" : "paid", issuedAt: iso(-30),
        },
      ];
      for (const inv of invoices) {
        store.invoices.push(inv);
        store.paymentAttempts.push({
          id: uid(13, attSeq++), subscriptionId: subId, companyId: id,
          amount: inv.amount, currency: inv.currency, status: inv.status, at: inv.issuedAt,
          invoiceId: inv.id, reason: inv.status === "failed" ? "Solde insuffisant" : null,
        });
      }
      if (pastDueDays !== undefined) {
        store.paymentAttempts.push({
          id: uid(13, attSeq++), subscriptionId: subId, companyId: id, amount: plan.price,
          currency: "XOF", status: "failed", at: iso(-pastDueDays), invoiceId: null,
          reason: "Solde insuffisant",
        });
        if (subStatus === "suspended") {
          store.paymentAttempts.push({
            id: uid(13, attSeq++), subscriptionId: subId, companyId: id, amount: plan.price,
            currency: "XOF", status: "failed", at: iso(-pastDueDays + 7), invoiceId: null,
            reason: "Moyen de paiement expiré",
          });
        }
      }
      const outcome = RETRY_OUTCOMES[i];
      if (outcome) store.retryOutcomes[subId] = outcome;

      const change = PLAN_CHANGES[i];
      store.subscriptionHistory.push({
        id: uid(14, histSeq++), subscriptionId: subId, kind: "ACTIVATION",
        fromPlan: null, toPlan: change ? change.from : plan.name, at: iso(-120),
      });
      if (change) {
        store.subscriptionHistory.push({
          id: uid(14, histSeq++), subscriptionId: subId, kind: change.kind,
          fromPlan: change.from, toPlan: plan.name, at: iso(-40),
        });
      }
      if (subStatus === "canceled") {
        store.subscriptionHistory.push({
          id: uid(14, histSeq++), subscriptionId: subId, kind: "CANCELLATION",
          fromPlan: plan.name, toPlan: null, at: iso(-10),
        });
      }

      store.limits[id] = {
        maxUsers: plan.users, usedUsers: Math.min(plan.users, 3 + i * 2),
        maxBuses: plan.buses, usedBuses: Math.min(plan.buses, 2 + (i % 4)),
      };
      store.features[id] = [
        { code: "ONLINE_BOOKING", name: "Réservation en ligne", enabled: true },
        { code: "FLEET", name: "Gestion de flotte", enabled: true },
        { code: "PARCELS", name: "Colis", enabled: i % 3 !== 0 },
        { code: "HR", name: "Ressources humaines", enabled: i % 3 === 2 },
      ];
    }

    store.usage[id] = [
      { metricCode: "bookings_created", label: "Réservations créées", value: 120 + i * 37 },
      { metricCode: "parcels_created", label: "Colis créés", value: 40 + i * 11 },
      { metricCode: "api_calls", label: "Appels API", value: 5000 + i * 850 },
    ];

    store.referrals[id] =
      i < 6
        ? {
            code: `REF-${slug.replace(/-/g, "").slice(0, 8).toUpperCase().padEnd(8, "X")}`,
            credits: [{
              id: uid(5, i + 1), amount: 50000, currency: "XOF",
              status: i % 2 ? "AVAILABLE" : "APPLIED",
            }],
          }
        : { code: null, credits: [] };

    // People, fleet
    const roles: Employee["role"][] = ["MANAGER", "GUICHETIER", "CHAUFFEUR"];
    const peopleCount = status === "draft" ? 1 : 3;
    for (let p = 0; p < peopleCount; p++) {
      const person = PEOPLE[(i + p) % PEOPLE.length]!;
      store.employees.push({
        id: uid(6, empSeq++), companyId: id, name: person,
        email: `${slugify(person)}@${slug}.sn`,
        phone: `+2217865${String(10000 + i * 211 + p * 17).padStart(5, "0")}`,
        role: roles[p]!,
      });
    }
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

    // Activity
    store.activity.push({
      id: uid(9, actSeq++), companyId: id, at: iso(-(400 - i * 15)),
      actor: "system", action: "Compagnie créée",
    });
    if (status !== "draft") {
      store.activity.push({
        id: uid(9, actSeq++), companyId: id, at: iso(-(380 - i * 15)),
        actor: "admin@sira.app", action: "Compagnie activée",
      });
    }
  });

  store.services = [
    ["identity-service", "healthy", 42], ["company-service", "healthy", 55],
    ["fleet-service", "healthy", 61], ["booking-service", "healthy", 88],
    ["parcel-service", "degraded", 1450], ["hr-service", "healthy", 70],
    ["customer-service", "healthy", 64], ["notification-service", "down", 0],
    ["audit-compliance-service", "healthy", 49], ["monitoring-service", "healthy", 38],
  ].map(([name, status, ms]) => ({
    name: name as string, status: status as ServiceHealth["status"], responseTimeMs: ms as number,
  }));

  store.incidents = [
    { id: uid(10, 1), code: "SYS-A1B2C3D4", title: "Notifications non envoyées", serviceName: "notification-service", severity: "HIGH", status: "INVESTIGATING", detectedAt: iso(-0.2) },
    { id: uid(10, 2), code: "SYS-E5F6G7H8", title: "Latence élevée sur les colis", serviceName: "parcel-service", severity: "MEDIUM", status: "MONITORING", detectedAt: iso(-1) },
    { id: uid(10, 3), code: "SYS-J9K1L2M3", title: "Échec de connexion intermittent", serviceName: "identity-service", severity: "LOW", status: "RESOLVED", detectedAt: iso(-6) },
  ];

  store.dsr = [
    { id: uid(11, 1), type: "ERASURE", status: "IN_PROGRESS", dueDate: iso(3), requesterRef: "usr-4f1c" },
    { id: uid(11, 2), type: "ACCESS", status: "RECEIVED", dueDate: iso(12), requesterRef: "usr-9a27" },
    { id: uid(11, 3), type: "RECTIFICATION", status: "RECEIVED", dueDate: iso(-2), requesterRef: "usr-c3d0" },
  ];

  return store;
}
```

Note sur l'ordre d'évaluation : dans chaque littéral de facture, `id: uid(4, invSeq++)` est évalué avant `number`, donc `number` reprend la valeur déjà incrémentée, exactement comme au lot 1 (`INV-2026-0002` pour la première facture).

Run: `pnpm test tests/unit/billing-seed.test.ts` → PASS (10 tests). `pnpm typecheck` échoue encore sur `companies.ts` (`kycTypes` manquant) : corrigé à l'étape 6.

- [ ] **Step 4: Tests des dépôts de l'offre et du registre KYC (échouants)**

Créer `tests/unit/offer-repos.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { featuresRepo, kycTypesRepo, plansRepo, tiersRepo } from "@/lib/repos/billing";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const planByName = (name: string) => getStore().plans.find((p) => p.name === name)!;
const louga = () => companiesRepo.list({ q: "louga" })[0]!;
const lougaInsuranceDoc = () =>
  getStore().documents.find((d) => d.companyId === louga().id && d.typeCode === "INSURANCE")!;

describe("plansRepo", () => {
  const ALLOWED = ["code", "currency", "id", "liveSubscriptions", "name", "priceMonthly", "priceYearly", "status", "trialDays"];

  it("listRows exposes exactly the allowed keys and counts live subscriptions per plan", () => {
    const rows = plansRepo.listRows();
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    expect(rows.map((r) => [r.name, r.liveSubscriptions])).toEqual([
      ["Starter", 4], ["Pro", 5], ["Enterprise", 4], ["Legacy", 0],
    ]);
  });

  it("detail returns the plan, its features in plan order and its subscriptions", () => {
    const pro = planByName("Pro");
    const d = plansRepo.detail(pro.id)!;
    expect(d.plan.id).toBe(pro.id);
    expect(d.features.map((f) => f.code)).toEqual(pro.featureCodes);
    expect(d.subscriptions).toHaveLength(5);
    expect(d.subscriptions.every((s) => s.planName === "Pro" && s.companyName !== "—")).toBe(true);
  });

  it("detail returns undefined for an unknown plan", () => {
    expect(plansRepo.detail("nope")).toBeUndefined();
    expect(plansRepo.get("nope")).toBeUndefined();
  });
});

describe("featuresRepo", () => {
  it("lists each feature with the plans that include it", () => {
    const list = featuresRepo.list();
    expect(list).toHaveLength(6);
    expect(list.find((f) => f.code === "ONLINE_BOOKING")!.plans.map((p) => p.name))
      .toEqual(["Starter", "Pro", "Enterprise", "Legacy"]);
    expect(list.find((f) => f.code === "HR")!.plans.map((p) => p.name)).toEqual(["Enterprise"]);
    expect(Object.keys(list[0]!.plans[0]!).sort()).toEqual(["id", "name", "status"]);
  });
});

describe("tiersRepo", () => {
  it("counts companies per tier, ordered by minimum seniority", () => {
    expect(tiersRepo.list().map((t) => [t.code, t.companies])).toEqual([
      ["STANDARD", 12], ["SILVER", 5], ["GOLD", 3],
    ]);
  });
});

describe("kycTypesRepo.setActive", () => {
  it("deactivates a type and logs a platform activity with the actor and the reason", () => {
    const n = getStore().activity.length;
    const t = kycTypesRepo.setActive("NINEA", false, "  Exigence levée  ", "tester@sira.app");
    expect(t.active).toBe(false);
    expect(kycTypesRepo.requiredActive().map((x) => x.code)).not.toContain("NINEA");
    const entry = getStore().activity[0]!;
    expect(getStore().activity.length).toBe(n + 1);
    expect(entry.companyId).toBeNull();
    expect(entry.actor).toBe("tester@sira.app");
    expect(entry.action).toBe("Type de document KYC « NINEA » désactivé. Motif : Exigence levée");
  });

  it("requires a reason", () => {
    expect(() => kycTypesRepo.setActive("NINEA", false, "   ")).toThrow("Un motif est obligatoire");
    expect(kycTypesRepo.list().find((t) => t.code === "NINEA")!.active).toBe(true);
  });

  it("throws for an unknown type", () => {
    expect(() => kycTypesRepo.setActive("NOPE", false, "x")).toThrow("Type de document introuvable");
  });

  it("is a no-op without activity when the state does not change", () => {
    const n = getStore().activity.length;
    kycTypesRepo.setActive("NINEA", true, "déjà actif");
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses to deactivate the last active required type", () => {
    const codes = kycTypesRepo.list().map((t) => t.code);
    for (const code of codes.slice(0, -1)) kycTypesRepo.setActive(code, false, "test");
    const last = codes.at(-1)!;
    expect(() => kycTypesRepo.setActive(last, false, "test"))
      .toThrow("Impossible de désactiver le dernier type de document obligatoire actif");
    expect(kycTypesRepo.requiredActive().map((t) => t.code)).toEqual([last]);
  });

  it("reactivates a type", () => {
    kycTypesRepo.setActive("NINEA", false, "test");
    kycTypesRepo.setActive("NINEA", true, "retour");
    expect(kycTypesRepo.requiredActive()).toHaveLength(6);
    expect(getStore().activity[0]!.action).toBe("Type de document KYC « NINEA » réactivé. Motif : retour");
  });
});

describe("KYC registry drives company activation", () => {
  it("keeps Louga Trans in draft when every type is still required", () => {
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    expect(companiesRepo.get(louga().id)!.status).toBe("draft");
  });

  it("activates Louga Trans once its missing and rejected types are no longer required", () => {
    kycTypesRepo.setActive("TRANSPORT_LICENSE", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", false, "test");
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    const c = companiesRepo.get(louga().id)!;
    expect(c.status).toBe("active");
    expect(c.forceActivated).toBe(false);
  });

  it("requires a reactivated type again", () => {
    kycTypesRepo.setActive("TRANSPORT_LICENSE", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", true, "test");
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    expect(companiesRepo.get(louga().id)!.status).toBe("draft");
  });

  it("exposes the registry in the company detail", () => {
    expect(companiesRepo.detail(louga().id)!.kycTypes).toHaveLength(6);
  });
});
```

Run: `pnpm test tests/unit/offer-repos.test.ts` → FAIL (module `@/lib/repos/billing` introuvable).

- [ ] **Step 5: Journal d'activité partagé et dépôts de l'offre**

Créer `src/lib/repos/activity.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import type { ActivityEntry } from "@/lib/types";

let actCounter = 1;

/** Appends to the activity log. Callers pass labels and identifiers only, never contact data. */
export function addActivity(
  companyId: string | null, actor: string, action: string, now: Date = new Date(),
): ActivityEntry {
  const entry: ActivityEntry = {
    id: `act-${now.getTime()}-${actCounter++}`, companyId, at: now.toISOString(), actor, action,
  };
  getStore().activity.unshift(entry);
  return entry;
}
```

Créer `src/lib/repos/billing.ts` :

```ts
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  FeatureDef, KycDocumentType, PartnerTier, Plan, Subscription, SubscriptionStatus,
} from "@/lib/types";

/** Statuses that still bind a company to its plan ("en cours"). */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = ["trial", "active", "past_due", "suspended"];

/** Client-safe projection of a subscription. */
export type SubscriptionRow = Pick<
  Subscription, "id" | "companyId" | "planName" | "status" | "billingCycle" | "price" | "currency" | "nextBillingDate"
> & { companyName: string };

/** Client-safe projection of a plan. */
export type PlanRow = Pick<
  Plan, "id" | "code" | "name" | "priceMonthly" | "priceYearly" | "currency" | "trialDays" | "status"
> & { liveSubscriptions: number };

export interface PlanDetail { plan: Plan; features: FeatureDef[]; subscriptions: SubscriptionRow[] }
export interface FeatureWithPlans extends FeatureDef { plans: Pick<Plan, "id" | "name" | "status">[] }
export interface TierWithCount extends PartnerTier { companies: number }

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function subscriptionRow(s: Subscription): SubscriptionRow {
  return {
    id: s.id, companyId: s.companyId, companyName: companyName(s.companyId), planName: s.planName,
    status: s.status, billingCycle: s.billingCycle, price: s.price, currency: s.currency,
    nextBillingDate: s.nextBillingDate,
  };
}

export const plansRepo = {
  list(): Plan[] {
    return getStore().plans;
  },

  listRows(): PlanRow[] {
    const subs = getStore().subscriptions;
    return getStore().plans.map((p) => ({
      id: p.id, code: p.code, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      currency: p.currency, trialDays: p.trialDays, status: p.status,
      liveSubscriptions: subs.filter((s) => s.planId === p.id && LIVE_STATUSES.includes(s.status)).length,
    }));
  },

  get(id: string): Plan | undefined {
    return getStore().plans.find((p) => p.id === id);
  },

  detail(id: string): PlanDetail | undefined {
    const s = getStore();
    const plan = s.plans.find((p) => p.id === id);
    if (!plan) return undefined;
    return {
      plan,
      features: plan.featureCodes
        .map((code) => s.featureDefs.find((f) => f.code === code))
        .filter((f): f is FeatureDef => f !== undefined),
      subscriptions: s.subscriptions.filter((x) => x.planId === id).map(subscriptionRow),
    };
  },
};

export const featuresRepo = {
  list(): FeatureWithPlans[] {
    const s = getStore();
    return s.featureDefs.map((f) => ({
      ...f,
      plans: s.plans
        .filter((p) => p.featureCodes.includes(f.code))
        .map((p) => ({ id: p.id, name: p.name, status: p.status })),
    }));
  },
};

export const tiersRepo = {
  list(): TierWithCount[] {
    const s = getStore();
    return [...s.partnerTiers]
      .sort((a, b) => a.minMonths - b.minMonths)
      .map((t) => ({ ...t, companies: s.companies.filter((c) => c.partnerTier === t.code).length }));
  },
};

export const kycTypesRepo = {
  list(): KycDocumentType[] {
    return getStore().kycTypes;
  },

  /** Types a draft company must have approved to be activated automatically. */
  requiredActive(): KycDocumentType[] {
    return getStore().kycTypes.filter((t) => t.active && t.required);
  },

  setActive(code: string, active: boolean, reason: string, actor = "admin@sira.app"): KycDocumentType {
    const type = getStore().kycTypes.find((t) => t.code === code);
    if (!type) throw new Error("Type de document introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (type.active === active) return type;
    if (!active && type.required && kycTypesRepo.requiredActive().length === 1) {
      throw new Error("Impossible de désactiver le dernier type de document obligatoire actif");
    }
    type.active = active;
    addActivity(
      null, actor,
      `Type de document KYC « ${type.name} » ${active ? "réactivé" : "désactivé"}. Motif : ${motif}`,
    );
    return type;
  },
};
```

- [ ] **Step 6: Brancher le registre dans `companiesRepo`**

Remplacer intégralement `src/lib/repos/companies.ts` par :

```ts
import { addActivity } from "@/lib/repos/activity";
import { kycTypesRepo } from "@/lib/repos/billing";
import { getStore } from "@/lib/repos/store";
import type { Company, CompanyDetail, CompanyStatus, KycDocument } from "@/lib/types";

/** Projection safe to hand to a client component: no contact data. */
export type CompanyRow = Pick<Company, "id" | "slug" | "name" | "status" | "partnerTier" | "createdAt" | "activatedAt">;

export interface KycQueueItem extends KycDocument { companyName: string }

function activateIfKycComplete(company: Company): void {
  if (company.status !== "draft") return;
  const docs = getStore().documents.filter((d) => d.companyId === company.id);
  const required = kycTypesRepo.requiredActive();
  const complete = required.length > 0 && required.every((t) =>
    docs.some((d) => d.typeCode === t.code && d.status === "approved"),
  );
  if (!complete) return;
  company.status = "active";
  company.activatedAt = new Date().toISOString();
  company.forceActivated = false;
  addActivity(company.id, "system", "Compagnie activée (KYC complet)");
}

export const companiesRepo = {
  list(filter: { status?: CompanyStatus; q?: string } = {}): Company[] {
    const q = filter.q?.trim().toLowerCase();
    return getStore().companies.filter(
      (c) =>
        (!filter.status || c.status === filter.status) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.includes(q)),
    );
  },

  listRows(filter: { status?: CompanyStatus; q?: string } = {}): CompanyRow[] {
    return companiesRepo.list(filter).map((c) => ({
      id: c.id, slug: c.slug, name: c.name, status: c.status,
      partnerTier: c.partnerTier, createdAt: c.createdAt, activatedAt: c.activatedAt,
    }));
  },

  get(id: string): Company | undefined {
    return getStore().companies.find((c) => c.id === id);
  },

  names(): { id: string; name: string }[] {
    return getStore().companies.map((c) => ({ id: c.id, name: c.name }));
  },

  detail(id: string): CompanyDetail | undefined {
    const s = getStore();
    const company = s.companies.find((c) => c.id === id);
    if (!company) return undefined;
    return {
      company,
      documents: s.documents.filter((d) => d.companyId === id),
      kycTypes: kycTypesRepo.list(),
      subscription: s.subscriptions.find((x) => x.companyId === id) ?? null,
      invoices: s.invoices.filter((x) => x.companyId === id),
      limits: s.limits[id] ?? null,
      features: s.features[id] ?? [],
      usage: s.usage[id] ?? [],
      referral: s.referrals[id] ?? { code: null, credits: [] },
      employees: s.employees.filter((e) => e.companyId === id),
      buses: s.buses.filter((b) => b.companyId === id),
      trips: s.trips.filter((t) => t.companyId === id),
      activity: s.activity
        .filter((a) => a.companyId === id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    };
  },

  kycQueue(): KycQueueItem[] {
    const s = getStore();
    return s.documents
      .filter((d) => d.status === "pending")
      .map((d) => ({
        ...d,
        companyName: s.companies.find((c) => c.id === d.companyId)?.name ?? "—",
      }))
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  },

  reviewDocument(
    docId: string,
    decision: "approved" | "rejected",
    reason?: string,
    actor = "admin@sira.app",
  ): KycDocument {
    const s = getStore();
    const doc = s.documents.find((d) => d.id === docId);
    if (!doc) throw new Error("Document introuvable");
    if (doc.status !== "pending") throw new Error("Le document n'est pas en attente de revue");
    if (decision === "rejected" && !reason?.trim()) throw new Error("Un motif de rejet est obligatoire");
    doc.status = decision;
    doc.reviewedAt = new Date().toISOString();
    doc.rejectionReason = decision === "rejected" ? reason!.trim() : null;
    addActivity(
      doc.companyId, actor,
      `Document ${doc.typeName} ${decision === "approved" ? "approuvé" : "rejeté"}`,
    );
    const company = s.companies.find((c) => c.id === doc.companyId);
    if (company && decision === "approved") activateIfKycComplete(company);
    return doc;
  },

  forceActivate(companyId: string, reason: string, actor = "admin@sira.app"): Company {
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    if (!reason.trim()) throw new Error("Un motif est obligatoire");
    if (company.status === "active") return company;
    company.status = "active";
    company.activatedAt = new Date().toISOString();
    company.forceActivated = true;
    addActivity(companyId, actor, "Activation forcée (contournement du KYC)");
    return company;
  },

  logReveal(companyId: string, field: "email" | "phone", actor = "admin@sira.app"): void {
    addActivity(
      companyId, actor,
      `Donnée personnelle révélée : ${field === "email" ? "e-mail" : "téléphone"}`,
    );
  },
};
```

Run: `pnpm typecheck && pnpm test`

Expected : typecheck OK ; **119 tests** verts (94 du lot 1 inchangés, dont `companies-repo.test.ts` et `dashboard-repo.test.ts`, + 10 `billing-seed` + 15 `offer-repos`). Aucun test du lot 1 n'a besoin d'être modifié : le registre est entièrement actif dans la graine, `companiesRepo.detail` ne fait qu'ajouter un champ.

- [ ] **Step 7: Prouver la garde « dernier type obligatoire actif »**

Dans `kycTypesRepo.setActive`, commenter temporairement le bloc `if (!active && type.required && kycTypesRepo.requiredActive().length === 1) { … }`.

Run: `pnpm test tests/unit/offer-repos.test.ts` → FAIL sur `refuses to deactivate the last active required type` (la fonction ne lève plus d'erreur). Restaurer le bloc, relancer → PASS. Faire de même avec la condition `required.length > 0 &&` de `activateIfKycComplete` : la retirer ne fait échouer aucun test (la garde de `setActive` empêche d'atteindre zéro type) ; la conserver comme défense en profondeur, sans test supplémentaire.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts src/lib/repos/store.ts src/lib/repos/activity.ts src/lib/repos/billing.ts src/lib/repos/companies.ts tests/unit/billing-seed.test.ts tests/unit/offer-repos.test.ts
git commit -m "feat: offer data model, seed and repositories with a mutable KYC type registry

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Dépôts de facturation (abonnements, factures, paiements, impayés, relance, annulation) (TDD)

**Files:**
- Modify: `src/lib/repos/billing.ts`
- Create: `tests/unit/billing-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `resetStore(now)`, `addActivity`, `SubscriptionRow`, `subscriptionRow`, `companyName` (Task 1, internes à `billing.ts`).
- Produces (dans `src/lib/repos/billing.ts`) :
  - `SUSPENSION_DELAY_DAYS = 7`, `EXPIRATION_DELAY_DAYS = 30`, `RETRY_FAILURE_REASON = "Paiement refusé par l'opérateur (simulation)"`.
  - `canRetry(status: SubscriptionStatus): boolean`, `canCancel(status: SubscriptionStatus): boolean`.
  - `type InvoiceRow`, `type PaymentRow` (avec `companyName` et `invoiceNumber: string | null`), `interface UnpaidRow`, `interface SubscriptionDetail`, `interface InvoiceDetail`.
  - `subscriptionsRepo.list(filter?: { status?: SubscriptionStatus }): Subscription[]`, `.listRows(filter?): SubscriptionRow[]`, `.get(id): Subscription | undefined`, `.detail(id): SubscriptionDetail | undefined`, `.unpaidQueue(now?: Date): UnpaidRow[]`, `.retryPayment(id: string, actor?: string, now?: Date): PaymentAttempt`, `.cancel(id: string, reason: string, actor?: string, now?: Date): Subscription`.
  - `invoicesRepo.list(filter?: { status?: Invoice["status"] }): Invoice[]`, `.listRows(filter?): InvoiceRow[]`, `.get(id): Invoice | undefined`, `.detail(id): InvoiceDetail | undefined`.
  - `paymentsRepo.list(filter?: { status?: PaymentAttempt["status"] }): PaymentAttempt[]`, `.listRows(filter?): PaymentRow[]`.

- [ ] **Step 1: Tests échouants**

Créer `tests/unit/billing-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  RETRY_FAILURE_REASON, invoicesRepo, paymentsRepo, subscriptionsRepo,
} from "@/lib/repos/billing";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};
const attemptsOf = (subId: string) => getStore().paymentAttempts.filter((a) => a.subscriptionId === subId);

describe("subscriptionsRepo.listRows", () => {
  const ALLOWED = ["billingCycle", "companyId", "companyName", "currency", "id", "nextBillingDate", "planName", "price", "status"];

  it("returns the 15 subscriptions with exactly the allowed keys", () => {
    const rows = subscriptionsRepo.listRows();
    expect(rows).toHaveLength(15);
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(ALLOWED);
  });

  it("filters by status", () => {
    expect(subscriptionsRepo.listRows({ status: "past_due" }).map((r) => r.companyName).sort())
      .toEqual(["Baobab Lines", "Saint-Louis Route"]);
    expect(subscriptionsRepo.list({ status: "trial" })).toHaveLength(2);
  });
});

describe("subscriptionsRepo.detail", () => {
  it("returns undefined for an unknown id", () => {
    expect(subscriptionsRepo.detail("nope")).toBeUndefined();
  });

  it("returns the plan, history oldest first, payments and invoices newest first", () => {
    const sub = subOf("Teranga Bus");
    const d = subscriptionsRepo.detail(sub.id)!;
    expect(d.companyName).toBe("Teranga Bus");
    expect(d.plan?.name).toBe("Pro");
    expect(d.history.map((h) => h.kind)).toEqual(["ACTIVATION", "UPGRADE"]);
    expect(d.history[1]).toMatchObject({ fromPlan: "Starter", toPlan: "Pro" });
    const paid = d.payments.map((p) => p.at);
    expect([...paid].sort().reverse()).toEqual(paid);
    expect(d.payments.every((p) => p.invoiceNumber !== null)).toBe(true);
    expect(d.invoices.map((i) => i.issuedAt)).toEqual([...d.invoices.map((i) => i.issuedAt)].sort().reverse());
  });

  it("computes the action flags from the status", () => {
    const unpaid = subscriptionsRepo.detail(subOf("Baobab Lines").id)!;
    expect([unpaid.canRetry, unpaid.canCancel]).toEqual([true, true]);
    const active = subscriptionsRepo.detail(subOf("Sahel Express").id)!;
    expect([active.canRetry, active.canCancel]).toEqual([false, true]);
    const expired = subscriptionsRepo.detail(subOf("Matam Express").id)!;
    expect([expired.canRetry, expired.canCancel]).toEqual([false, false]);
    const canceled = subscriptionsRepo.detail(subOf("Richard-Toll Bus").id)!;
    expect([canceled.canRetry, canceled.canCancel]).toEqual([false, false]);
  });
});

describe("subscriptionsRepo.unpaidQueue", () => {
  const ALLOWED = ["companyId", "companyName", "currency", "daysLeft", "deadline", "id", "pastDueSince", "planName", "price", "status"];

  it("lists unpaid and suspended subscriptions, most urgent first", () => {
    const q = subscriptionsRepo.unpaidQueue(NOW);
    expect(q.map((r) => [r.companyName, r.deadline, r.daysLeft])).toEqual([
      ["Saint-Louis Route", "suspension", 2],
      ["Baobab Lines", "suspension", 5],
      ["Fatick Lines", "expiration", 17],
    ]);
    for (const r of q) expect(Object.keys(r).sort()).toEqual(ALLOWED);
  });

  it("counts whole days from pastDueSince to the injected reference date", () => {
    const sub = subOf("Baobab Lines");
    sub.pastDueSince = "2026-10-01T00:00:00.000Z";
    const at = (iso: string) =>
      subscriptionsRepo.unpaidQueue(new Date(iso)).find((r) => r.id === sub.id)!.daysLeft;
    expect(at("2026-10-03T12:00:00.000Z")).toBe(5);
    expect(at("2026-10-08T00:00:00.000Z")).toBe(0);
    expect(at("2026-10-10T00:00:00.000Z")).toBe(-2);
  });

  it("counts the expiration of a suspended subscription from the suspension date", () => {
    const sub = subOf("Fatick Lines");
    sub.pastDueSince = "2026-09-01T00:00:00.000Z";
    const row = subscriptionsRepo.unpaidQueue(new Date("2026-09-20T00:00:00.000Z")).find((r) => r.id === sub.id)!;
    expect(row.deadline).toBe("expiration");
    expect(row.daysLeft).toBe(7 + 30 - 19);
  });
});

describe("subscriptionsRepo.retryPayment", () => {
  it("refuses every status other than unpaid or suspended and records nothing", () => {
    for (const name of ["Sahel Express", "Dakar Voyages", "Matam Express", "Richard-Toll Bus"]) {
      const sub = subOf(name);
      const before = { attempts: getStore().paymentAttempts.length, invoices: getStore().invoices.length, status: sub.status };
      expect(() => subscriptionsRepo.retryPayment(sub.id))
        .toThrow("Relance impossible : l'abonnement n'est ni impayé ni suspendu");
      expect(getStore().paymentAttempts.length).toBe(before.attempts);
      expect(getStore().invoices.length).toBe(before.invoices);
      expect(sub.status).toBe(before.status);
    }
  });

  it("on success records a paid attempt and a paid invoice, reactivates and pushes the due date by a month", () => {
    const sub = subOf("Baobab Lines");
    expect(sub.nextBillingDate).toBe("2026-11-10T08:00:00.000Z");
    const at = new Date("2026-11-02T09:00:00.000Z");
    const attempt = subscriptionsRepo.retryPayment(sub.id, "tester@sira.app", at);
    expect(attempt).toMatchObject({ status: "paid", reason: null, amount: 25000, at: at.toISOString() });
    const invoice = getStore().invoices.find((i) => i.id === attempt.invoiceId)!;
    expect(invoice).toMatchObject({
      status: "paid", subscriptionId: sub.id, companyId: sub.companyId, amount: 25000,
      number: "INV-2026-0032", issuedAt: at.toISOString(),
    });
    expect(sub.status).toBe("active");
    expect(sub.pastDueSince).toBeNull();
    expect(sub.nextBillingDate).toBe("2026-12-10T08:00:00.000Z");
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({ companyId: sub.companyId, actor: "tester@sira.app" });
    expect(entry.action).toBe("Relance du paiement de l'abonnement : réussie, abonnement réactivé");
  });

  it("reactivates a suspended subscription on success", () => {
    const sub = subOf("Fatick Lines");
    expect(subscriptionsRepo.retryPayment(sub.id).status).toBe("paid");
    expect(sub.status).toBe("active");
  });

  it("on failure records a failed attempt with a reason and changes nothing else", () => {
    const sub = subOf("Saint-Louis Route");
    const since = sub.pastDueSince;
    const invoices = getStore().invoices.length;
    const attempt = subscriptionsRepo.retryPayment(sub.id);
    expect(attempt).toMatchObject({ status: "failed", invoiceId: null, reason: RETRY_FAILURE_REASON });
    expect(attemptsOf(sub.id)).toContainEqual(attempt);
    expect(getStore().invoices.length).toBe(invoices);
    expect(sub.status).toBe("past_due");
    expect(sub.pastDueSince).toBe(since);
    expect(getStore().activity[0]!.action).toBe("Relance du paiement de l'abonnement : échec");
  });

  it("keeps invoice numbers unique across several successful retries", () => {
    subscriptionsRepo.retryPayment(subOf("Baobab Lines").id);
    subscriptionsRepo.retryPayment(subOf("Fatick Lines").id);
    const numbers = getStore().invoices.map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("throws for an unknown subscription", () => {
    expect(() => subscriptionsRepo.retryPayment("nope")).toThrow("Abonnement introuvable");
  });
});

describe("subscriptionsRepo.cancel", () => {
  it("refuses a canceled or expired subscription and changes nothing", () => {
    for (const name of ["Richard-Toll Bus", "Matam Express"]) {
      const sub = subOf(name);
      const before = { status: sub.status, history: getStore().subscriptionHistory.length };
      expect(() => subscriptionsRepo.cancel(sub.id, "motif")).toThrow("L'abonnement est déjà annulé ou expiré");
      expect(sub.status).toBe(before.status);
      expect(getStore().subscriptionHistory.length).toBe(before.history);
    }
  });

  it("requires a reason", () => {
    const sub = subOf("Touba Liaison");
    expect(() => subscriptionsRepo.cancel(sub.id, "   ")).toThrow("Un motif est obligatoire");
    expect(sub.status).toBe("active");
  });

  it("cancels, adds a CANCELLATION history entry and logs the reason in the company activity", () => {
    const sub = subOf("Touba Liaison");
    const at = new Date("2026-11-03T10:00:00.000Z");
    subscriptionsRepo.cancel(sub.id, "  Fin de contrat  ", "tester@sira.app", at);
    expect(sub.status).toBe("canceled");
    const last = getStore().subscriptionHistory.at(-1)!;
    expect(last).toMatchObject({
      subscriptionId: sub.id, kind: "CANCELLATION", fromPlan: "Pro", toPlan: null, at: at.toISOString(),
    });
    expect(getStore().activity[0]).toMatchObject({
      companyId: sub.companyId, actor: "tester@sira.app", action: "Abonnement annulé. Motif : Fin de contrat",
    });
  });

  it("takes a canceled unpaid subscription out of the unpaid queue", () => {
    const sub = subOf("Baobab Lines");
    subscriptionsRepo.cancel(sub.id, "Compagnie fermée");
    expect(sub.pastDueSince).toBeNull();
    expect(subscriptionsRepo.unpaidQueue(NOW).map((r) => r.id)).not.toContain(sub.id);
  });
});

describe("invoicesRepo", () => {
  const ALLOWED = ["amount", "companyId", "companyName", "currency", "id", "issuedAt", "number", "status", "subscriptionId"];

  it("lists invoices newest first, filters by status and projects exactly the allowed keys", () => {
    const all = invoicesRepo.listRows();
    expect(all).toHaveLength(30);
    expect(all.map((i) => i.issuedAt)).toEqual([...all.map((i) => i.issuedAt)].sort().reverse());
    for (const r of all) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    expect(invoicesRepo.list({ status: "failed" })).toHaveLength(2);
  });

  it("detail links the subscription and the payment attempt", () => {
    const inv = invoicesRepo.list().find((i) => i.number === "INV-2026-0003")!;
    const d = invoicesRepo.detail(inv.id)!;
    expect(d.companyName).toBe("Sahel Express");
    expect(d.subscription?.id).toBe(inv.subscriptionId);
    expect(d.payment).toMatchObject({ invoiceId: inv.id, status: "paid", invoiceNumber: "INV-2026-0003" });
    expect(invoicesRepo.detail("nope")).toBeUndefined();
  });
});

describe("paymentsRepo", () => {
  const ALLOWED = ["amount", "at", "companyId", "companyName", "currency", "id", "invoiceId", "invoiceNumber", "reason", "status", "subscriptionId"];

  it("lists attempts newest first, filters by status and projects exactly the allowed keys", () => {
    const all = paymentsRepo.listRows();
    expect(all).toHaveLength(34);
    expect(all.map((p) => p.at)).toEqual([...all.map((p) => p.at)].sort().reverse());
    for (const r of all) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    const failed = paymentsRepo.listRows({ status: "failed" });
    expect(failed).toHaveLength(6);
    expect(failed.filter((p) => p.invoiceId === null).every((p) => p.invoiceNumber === null)).toBe(true);
  });
});
```

Run: `pnpm test tests/unit/billing-repo.test.ts` → FAIL (`subscriptionsRepo`, `invoicesRepo`, `paymentsRepo`, `RETRY_FAILURE_REASON` non exportés).

- [ ] **Step 2: Implémenter les dépôts de facturation**

Dans `src/lib/repos/billing.ts`, remplacer le bloc d'imports par :

```ts
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  FeatureDef, Invoice, KycDocumentType, PartnerTier, PaymentAttempt, Plan, Subscription,
  SubscriptionHistoryEntry, SubscriptionStatus,
} from "@/lib/types";
```

Puis ajouter à la fin du fichier :

```ts
export const SUSPENSION_DELAY_DAYS = 7;
export const EXPIRATION_DELAY_DAYS = 30;
export const RETRY_FAILURE_REASON = "Paiement refusé par l'opérateur (simulation)";
const DAY = 86_400_000;

/** Client-safe projection of an invoice. */
export type InvoiceRow = Pick<
  Invoice, "id" | "number" | "subscriptionId" | "companyId" | "amount" | "currency" | "status" | "issuedAt"
> & { companyName: string };

/** Client-safe projection of a payment attempt. */
export type PaymentRow = Pick<
  PaymentAttempt, "id" | "subscriptionId" | "companyId" | "amount" | "currency" | "status" | "at" | "invoiceId" | "reason"
> & { companyName: string; invoiceNumber: string | null };

/** Client-safe row of the unpaid queue. */
export interface UnpaidRow {
  id: string;
  companyId: string;
  companyName: string;
  planName: string;
  status: "past_due" | "suspended";
  price: number;
  currency: string;
  pastDueSince: string;
  deadline: "suspension" | "expiration";
  daysLeft: number;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  companyName: string;
  plan: Plan | null;
  history: SubscriptionHistoryEntry[];
  payments: PaymentRow[];
  invoices: InvoiceRow[];
  canRetry: boolean;
  canCancel: boolean;
}

export interface InvoiceDetail {
  invoice: Invoice;
  companyName: string;
  subscription: SubscriptionRow | null;
  payment: PaymentRow | null;
}

export function canRetry(status: SubscriptionStatus): boolean {
  return status === "past_due" || status === "suspended";
}

export function canCancel(status: SubscriptionStatus): boolean {
  return status !== "canceled" && status !== "expired";
}

function invoiceRow(i: Invoice): InvoiceRow {
  return {
    id: i.id, number: i.number, subscriptionId: i.subscriptionId, companyId: i.companyId,
    companyName: companyName(i.companyId), amount: i.amount, currency: i.currency,
    status: i.status, issuedAt: i.issuedAt,
  };
}

function paymentRow(p: PaymentAttempt): PaymentRow {
  const invoice = p.invoiceId ? getStore().invoices.find((i) => i.id === p.invoiceId) : undefined;
  return {
    id: p.id, subscriptionId: p.subscriptionId, companyId: p.companyId,
    companyName: companyName(p.companyId), amount: p.amount, currency: p.currency,
    status: p.status, at: p.at, invoiceId: p.invoiceId, reason: p.reason,
    invoiceNumber: invoice?.number ?? null,
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

/** Next free number: the highest numeric suffix plus one (never reuses a number). */
function nextInvoiceNumber(now: Date): string {
  const max = getStore().invoices.reduce((m, i) => Math.max(m, Number(i.number.slice(-4)) || 0), 0);
  return `INV-${now.getUTCFullYear()}-${String(max + 1).padStart(4, "0")}`;
}

function addOneMonth(iso: string): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

function requireSubscription(id: string): Subscription {
  const sub = getStore().subscriptions.find((s) => s.id === id);
  if (!sub) throw new Error("Abonnement introuvable");
  return sub;
}

export const subscriptionsRepo = {
  list(filter: { status?: SubscriptionStatus } = {}): Subscription[] {
    return getStore().subscriptions.filter((s) => !filter.status || s.status === filter.status);
  },

  listRows(filter: { status?: SubscriptionStatus } = {}): SubscriptionRow[] {
    return subscriptionsRepo.list(filter).map(subscriptionRow);
  },

  get(id: string): Subscription | undefined {
    return getStore().subscriptions.find((s) => s.id === id);
  },

  detail(id: string): SubscriptionDetail | undefined {
    const s = getStore();
    const sub = s.subscriptions.find((x) => x.id === id);
    if (!sub) return undefined;
    return {
      subscription: sub,
      companyName: companyName(sub.companyId),
      plan: s.plans.find((p) => p.id === sub.planId) ?? null,
      history: s.subscriptionHistory
        .filter((h) => h.subscriptionId === id)
        .sort((a, b) => a.at.localeCompare(b.at)),
      payments: s.paymentAttempts
        .filter((p) => p.subscriptionId === id)
        .sort(byNewest((p) => p.at))
        .map(paymentRow),
      invoices: s.invoices
        .filter((i) => i.subscriptionId === id)
        .sort(byNewest((i) => i.issuedAt))
        .map(invoiceRow),
      canRetry: canRetry(sub.status),
      canCancel: canCancel(sub.status),
    };
  },

  /** Unpaid and suspended subscriptions, most urgent first, against an injected reference date. */
  unpaidQueue(now: Date = new Date()): UnpaidRow[] {
    return getStore().subscriptions
      .filter((s): s is Subscription & { status: "past_due" | "suspended" } =>
        s.status === "past_due" || s.status === "suspended")
      .map((s) => {
        const since = s.pastDueSince ?? now.toISOString();
        const elapsed = Math.floor((now.getTime() - new Date(since).getTime()) / DAY);
        const deadline: UnpaidRow["deadline"] = s.status === "past_due" ? "suspension" : "expiration";
        const limit = s.status === "past_due"
          ? SUSPENSION_DELAY_DAYS
          : SUSPENSION_DELAY_DAYS + EXPIRATION_DELAY_DAYS;
        return {
          id: s.id, companyId: s.companyId, companyName: companyName(s.companyId),
          planName: s.planName, status: s.status, price: s.price, currency: s.currency,
          pastDueSince: since, deadline, daysLeft: limit - elapsed,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft || a.companyName.localeCompare(b.companyName));
  },

  retryPayment(id: string, actor = "admin@sira.app", now: Date = new Date()): PaymentAttempt {
    const s = getStore();
    const sub = requireSubscription(id);
    if (!canRetry(sub.status)) {
      throw new Error("Relance impossible : l'abonnement n'est ni impayé ni suspendu");
    }
    const at = now.toISOString();
    const outcome = s.retryOutcomes[sub.id] ?? "success";
    if (outcome === "failure") {
      const failed: PaymentAttempt = {
        id: crypto.randomUUID(), subscriptionId: sub.id, companyId: sub.companyId,
        amount: sub.price, currency: sub.currency, status: "failed", at,
        invoiceId: null, reason: RETRY_FAILURE_REASON,
      };
      s.paymentAttempts.push(failed);
      addActivity(sub.companyId, actor, "Relance du paiement de l'abonnement : échec", now);
      return failed;
    }
    const invoice: Invoice = {
      id: crypto.randomUUID(), companyId: sub.companyId, subscriptionId: sub.id,
      number: nextInvoiceNumber(now), amount: sub.price, currency: sub.currency,
      status: "paid", issuedAt: at,
    };
    s.invoices.push(invoice);
    const paid: PaymentAttempt = {
      id: crypto.randomUUID(), subscriptionId: sub.id, companyId: sub.companyId,
      amount: sub.price, currency: sub.currency, status: "paid", at,
      invoiceId: invoice.id, reason: null,
    };
    s.paymentAttempts.push(paid);
    sub.status = "active";
    sub.pastDueSince = null;
    sub.nextBillingDate = addOneMonth(sub.nextBillingDate);
    addActivity(sub.companyId, actor, "Relance du paiement de l'abonnement : réussie, abonnement réactivé", now);
    return paid;
  },

  cancel(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Subscription {
    const sub = requireSubscription(id);
    if (!canCancel(sub.status)) throw new Error("L'abonnement est déjà annulé ou expiré");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    sub.status = "canceled";
    sub.pastDueSince = null;
    getStore().subscriptionHistory.push({
      id: crypto.randomUUID(), subscriptionId: sub.id, kind: "CANCELLATION",
      fromPlan: sub.planName, toPlan: null, at: now.toISOString(),
    });
    addActivity(sub.companyId, actor, `Abonnement annulé. Motif : ${motif}`, now);
    return sub;
  },
};

export const invoicesRepo = {
  list(filter: { status?: Invoice["status"] } = {}): Invoice[] {
    return getStore().invoices
      .filter((i) => !filter.status || i.status === filter.status)
      .sort(byNewest((i) => i.issuedAt));
  },

  listRows(filter: { status?: Invoice["status"] } = {}): InvoiceRow[] {
    return invoicesRepo.list(filter).map(invoiceRow);
  },

  get(id: string): Invoice | undefined {
    return getStore().invoices.find((i) => i.id === id);
  },

  detail(id: string): InvoiceDetail | undefined {
    const s = getStore();
    const invoice = s.invoices.find((i) => i.id === id);
    if (!invoice) return undefined;
    const sub = s.subscriptions.find((x) => x.id === invoice.subscriptionId);
    const attempt = s.paymentAttempts.find((a) => a.invoiceId === invoice.id);
    return {
      invoice,
      companyName: companyName(invoice.companyId),
      subscription: sub ? subscriptionRow(sub) : null,
      payment: attempt ? paymentRow(attempt) : null,
    };
  },
};

export const paymentsRepo = {
  list(filter: { status?: PaymentAttempt["status"] } = {}): PaymentAttempt[] {
    return getStore().paymentAttempts
      .filter((p) => !filter.status || p.status === filter.status)
      .sort(byNewest((p) => p.at));
  },

  listRows(filter: { status?: PaymentAttempt["status"] } = {}): PaymentRow[] {
    return paymentsRepo.list(filter).map(paymentRow);
  },
};
```

Notes : `crypto.randomUUID()` est global sous Node 24 (Vitest) et dans le runtime Node de Next ; les identifiants ont la forme d'un UUID, donc le fil d'Ariane les affiche « Fiche ». `list()` trie une copie filtrée (`filter` crée un nouveau tableau), jamais le tableau du store. Le tri est stable : deux factures émises au même instant gardent l'ordre de la graine.

Run: `pnpm test tests/unit/billing-repo.test.ts` → PASS (21 tests). Puis `pnpm typecheck && pnpm test` → **140 tests** verts.

- [ ] **Step 3: Prouver les gardes de relance et d'annulation**

1. Dans `retryPayment`, remplacer temporairement `if (!canRetry(sub.status)) {` par `if (false) {`. Run `pnpm test tests/unit/billing-repo.test.ts` → FAIL sur `refuses every status other than unpaid or suspended and records nothing`. Restaurer → PASS.
2. Dans `cancel`, commenter temporairement la ligne `if (!canCancel(sub.status)) throw …`. Run → FAIL sur `refuses a canceled or expired subscription and changes nothing`. Restaurer → PASS.
3. Dans `unpaidQueue`, remplacer temporairement `SUSPENSION_DELAY_DAYS + EXPIRATION_DELAY_DAYS` par `EXPIRATION_DELAY_DAYS`. Run → FAIL sur les deux tests d'expiration. Restaurer → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/repos/billing.ts tests/unit/billing-repo.test.ts
git commit -m "feat: subscription, invoice and payment repositories with retry and cancel rules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: `run()` partagé et Server Actions (relance, annulation, bascule KYC) (TDD)

**Files:**
- Create: `src/lib/actions/run.ts`, `src/app/(admin)/facturation/actions.ts`, `src/app/(admin)/offre/actions.ts`, `tests/unit/run-action.test.ts`, `tests/unit/billing-actions.test.ts`
- Modify: `src/app/(admin)/compagnies/actions.ts`

**Interfaces:**
- Consumes: `requireSession()` (lot 1), `subscriptionsRepo.retryPayment/cancel`, `kycTypesRepo.setActive` (Tasks 1-2).
- Produces:
  - `src/lib/actions/run.ts` : `type ActionResult = { ok: true } | { ok: false; error: string }`, `MAX_REASON = 500`, `REASON_TOO_LONG`, `SESSION_EXPIRED`, `requireString(value: unknown, label: string): string`, `requireReason(value: unknown): string` (rogné, ≤ 500), `errorMessage(e: unknown): string`, `run(body: (actor: string) => void): Promise<ActionResult>`.
  - `src/app/(admin)/facturation/actions.ts` : `retrySubscriptionPayment(subscriptionId: string): Promise<ActionResult>`, `cancelSubscription(subscriptionId: string, reason: string): Promise<ActionResult>`.
  - `src/app/(admin)/offre/actions.ts` : `setKycTypeActive(code: string, active: boolean, reason: string): Promise<ActionResult>`.
  - `src/app/(admin)/compagnies/actions.ts` garde exactement ses exports (`approveDocument`, `rejectDocument`, `forceActivateCompany`, `revealContact`, `type RevealResult`) et ses messages ; `type ActionResult` n'y est plus défini (aucun fichier ne l'importait depuis là, vérifié par `grep`).

- [ ] **Step 1: Tests de `run()` (échouants)**

Créer `tests/unit/run-action.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { errorMessage, requireReason, run } from "@/lib/actions/run";

beforeEach(() => {
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "tester@sira.app", stage: "full", exp: 9999999999 });
});

describe("run", () => {
  it("never runs the body without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn();
    expect(await run(body)).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(body).not.toHaveBeenCalled();
  });

  it("passes the session subject as the actor", async () => {
    const body = vi.fn();
    expect(await run(body)).toEqual({ ok: true });
    expect(body).toHaveBeenCalledWith("tester@sira.app");
  });

  it("turns a thrown error into an error result instead of throwing", async () => {
    expect(await run(() => { throw new Error("Refusé"); })).toEqual({ ok: false, error: "Refusé" });
    expect(await run(() => { throw "boom"; })).toEqual({ ok: false, error: "Action impossible" });
  });
});

describe("requireReason", () => {
  it("trims, accepts 500 characters and refuses blank or longer reasons", () => {
    expect(requireReason("  ok  ")).toBe("ok");
    expect(requireReason("x".repeat(500))).toHaveLength(500);
    expect(() => requireReason("   ")).toThrow("Motif invalide");
    expect(() => requireReason(42)).toThrow("Motif invalide");
    expect(() => requireReason("x".repeat(501))).toThrow("Motif trop long (500 caractères maximum)");
  });
});

describe("errorMessage", () => {
  it("falls back to a generic message", () => {
    expect(errorMessage(new Error(""))).toBe("Action impossible");
    expect(errorMessage(new Error("Précis"))).toBe("Précis");
  });
});
```

Run: `pnpm test tests/unit/run-action.test.ts` → FAIL (module `@/lib/actions/run` introuvable).

- [ ] **Step 2: Extraire `run()`**

Créer `src/lib/actions/run.ts` (module ordinaire, **sans** `"use server"` : il n'exporte pas que des fonctions asynchrones) :

```ts
import { requireSession } from "@/lib/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const MAX_REASON = 500;
export const REASON_TOO_LONG = "Motif trop long (500 caractères maximum)";
export const SESSION_EXPIRED = "Session expirée, reconnecte-toi";

export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} invalide`);
  return value;
}

/** A mandatory reason: trimmed, at most 500 characters. */
export function requireReason(value: unknown): string {
  const reason = requireString(value, "Motif").trim();
  if (reason.length > MAX_REASON) throw new Error(REASON_TOO_LONG);
  return reason;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action impossible";
}

/**
 * Server actions are public HTTP endpoints: the session is checked before the body
 * reads or writes anything, and expected failures come back as `{ ok: false }`
 * (production masks the message of a thrown error).
 */
export async function run(body: (actor: string) => void): Promise<ActionResult> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    body(actor);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
```

Remplacer intégralement `src/app/(admin)/compagnies/actions.ts` par (mêmes exports, mêmes messages, mêmes chemins revalidés) :

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  errorMessage, requireReason, requireString, run, SESSION_EXPIRED, type ActionResult,
} from "@/lib/actions/run";
import { requireSession } from "@/lib/auth/session";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

function refresh(companyId: string | null) {
  revalidatePath("/");
  revalidatePath("/compagnies");
  revalidatePath("/compagnies/kyc");
  if (companyId) revalidatePath(`/compagnies/${companyId}`);
}

export async function approveDocument(docId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(docId, "Document");
    const doc = companiesRepo.reviewDocument(docId, "approved", undefined, actor);
    refresh(doc.companyId);
  });
}

export async function rejectDocument(docId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(docId, "Document");
    const motif = requireReason(reason);
    const doc = companiesRepo.reviewDocument(docId, "rejected", motif, actor);
    refresh(doc.companyId);
  });
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    const motif = requireReason(reason);
    companiesRepo.forceActivate(companyId, motif, actor);
    refresh(companyId);
  });
}

export type RevealResult = { ok: true; value: string } | { ok: false; error: string };

export async function revealContact(companyId: string, field: "email" | "phone"): Promise<RevealResult> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    requireString(companyId, "Compagnie");
    if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    companiesRepo.logReveal(companyId, field, actor);
    revalidatePath(`/compagnies/${companyId}`);
    return { ok: true, value: field === "email" ? company.contactEmail : company.contactPhone };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
```

Run: `pnpm test tests/unit/run-action.test.ts tests/unit/company-actions.test.ts` → PASS (5 + 20 tests). `company-actions.test.ts` n'est **pas** modifié : il garantit que le refactoring garde le comportement du lot 1 (messages `Motif invalide`, `Motif trop long…`, `Session expirée…`).

- [ ] **Step 3: Tests des nouvelles actions (échouants)**

Créer `tests/unit/billing-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelSubscription, retrySubscriptionPayment } from "@/app/(admin)/facturation/actions";
import { setKycTypeActive } from "@/app/(admin)/offre/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const TOO_LONG = { ok: false, error: "Motif trop long (500 caractères maximum)" };

beforeEach(() => {
  resetStore(NOW);
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};
const kycType = (code: string) => getStore().kycTypes.find((t) => t.code === code)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("without a session nothing is read or written", () => {
  beforeEach(() => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
  });
  const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };

  it("retrySubscriptionPayment", async () => {
    const sub = subOf("Baobab Lines");
    const attempts = getStore().paymentAttempts.length;
    expect(await retrySubscriptionPayment(sub.id)).toEqual(EXPIRED);
    expect(sub.status).toBe("past_due");
    expect(getStore().paymentAttempts.length).toBe(attempts);
  });

  it("cancelSubscription", async () => {
    const sub = subOf("Touba Liaison");
    const activity = getStore().activity.length;
    expect(await cancelSubscription(sub.id, "motif")).toEqual(EXPIRED);
    expect(sub.status).toBe("active");
    expect(getStore().activity.length).toBe(activity);
  });

  it("setKycTypeActive", async () => {
    expect(await setKycTypeActive("NINEA", false, "motif")).toEqual(EXPIRED);
    expect(kycType("NINEA").active).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("retrySubscriptionPayment", () => {
  it("reactivates on success, by the session actor, and revalidates billing pages", async () => {
    const sub = subOf("Baobab Lines");
    expect(await retrySubscriptionPayment(sub.id)).toEqual({ ok: true });
    expect(sub.status).toBe("active");
    expect(getStore().activity[0]!.actor).toBe("tester@sira.app");
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/facturation/abonnements", "/facturation/impayes", "/facturation/paiements",
      "/facturation/factures", `/facturation/abonnements/${sub.id}`, `/compagnies/${sub.companyId}`,
    ]));
  });

  it("returns the refusal as an error but keeps the failed attempt", async () => {
    const sub = subOf("Saint-Louis Route");
    const attempts = getStore().paymentAttempts.length;
    expect(await retrySubscriptionPayment(sub.id)).toEqual({
      ok: false, error: "Échec du paiement : Paiement refusé par l'opérateur (simulation)",
    });
    expect(getStore().paymentAttempts.length).toBe(attempts + 1);
    expect(sub.status).toBe("past_due");
    expect(paths()).toContain("/facturation/impayes");
  });

  it("refuses a subscription that is neither unpaid nor suspended", async () => {
    expect(await retrySubscriptionPayment(subOf("Sahel Express").id)).toEqual({
      ok: false, error: "Relance impossible : l'abonnement n'est ni impayé ni suspendu",
    });
  });

  it("refuses an invalid identifier", async () => {
    expect(await retrySubscriptionPayment("")).toEqual({ ok: false, error: "Abonnement invalide" });
    expect(await retrySubscriptionPayment(42 as never)).toEqual({ ok: false, error: "Abonnement invalide" });
  });
});

describe("cancelSubscription", () => {
  it("refuses a blank reason and changes nothing", async () => {
    const sub = subOf("Touba Liaison");
    for (const reason of ["", "   "]) {
      expect(await cancelSubscription(sub.id, reason)).toEqual({ ok: false, error: "Motif invalide" });
    }
    expect(sub.status).toBe("active");
  });

  it("refuses 501 characters and accepts exactly 500", async () => {
    const sub = subOf("Touba Liaison");
    expect(await cancelSubscription(sub.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(sub.status).toBe("active");
    expect(await cancelSubscription(sub.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("cancels with the trimmed reason recorded by the session actor", async () => {
    const sub = subOf("Touba Liaison");
    expect(await cancelSubscription(sub.id, "  Fin de contrat  ")).toEqual({ ok: true });
    expect(sub.status).toBe("canceled");
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", action: "Abonnement annulé. Motif : Fin de contrat",
    });
    expect(paths()).toContain(`/facturation/abonnements/${sub.id}`);
  });

  it("returns the repository refusal for an expired subscription", async () => {
    expect(await cancelSubscription(subOf("Matam Express").id, "motif")).toEqual({
      ok: false, error: "L'abonnement est déjà annulé ou expiré",
    });
  });
});

describe("setKycTypeActive", () => {
  it("deactivates by the session actor and revalidates", async () => {
    expect(await setKycTypeActive("NINEA", false, "  Exigence levée  ")).toEqual({ ok: true });
    expect(kycType("NINEA").active).toBe(false);
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining(["/offre/types-documents-kyc", "/compagnies", "/compagnies/kyc", "/"]));
  });

  it("refuses a blank or too long reason", async () => {
    expect(await setKycTypeActive("NINEA", false, " ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await setKycTypeActive("NINEA", false, "x".repeat(501))).toEqual(TOO_LONG);
    expect(kycType("NINEA").active).toBe(true);
  });

  it("refuses a non-boolean state", async () => {
    expect(await setKycTypeActive("NINEA", "false" as never, "motif")).toEqual({ ok: false, error: "État invalide" });
    expect(kycType("NINEA").active).toBe(true);
  });

  it("returns the refusal for the last active required type", async () => {
    const codes = getStore().kycTypes.map((t) => t.code);
    for (const code of codes.slice(0, -1)) await setKycTypeActive(code, false, "test");
    expect(await setKycTypeActive(codes.at(-1)!, false, "test")).toEqual({
      ok: false, error: "Impossible de désactiver le dernier type de document obligatoire actif",
    });
  });
});
```

Run: `pnpm test tests/unit/billing-actions.test.ts` → FAIL (modules `@/app/(admin)/facturation/actions` et `@/app/(admin)/offre/actions` introuvables).

- [ ] **Step 4: Implémenter les actions**

Créer `src/app/(admin)/facturation/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { subscriptionsRepo } from "@/lib/repos/billing";

function refreshBilling(subscriptionId: string, companyId: string) {
  revalidatePath("/");
  revalidatePath("/facturation/abonnements");
  revalidatePath("/facturation/impayes");
  revalidatePath("/facturation/paiements");
  revalidatePath("/facturation/factures");
  revalidatePath(`/facturation/abonnements/${subscriptionId}`);
  revalidatePath(`/compagnies/${companyId}`);
}

export async function retrySubscriptionPayment(subscriptionId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    const attempt = subscriptionsRepo.retryPayment(subscriptionId, actor);
    refreshBilling(subscriptionId, attempt.companyId);
    if (attempt.status === "failed") {
      throw new Error(`Échec du paiement : ${attempt.reason ?? "motif inconnu"}`);
    }
  });
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    const motif = requireReason(reason);
    const sub = subscriptionsRepo.cancel(subscriptionId, motif, actor);
    refreshBilling(subscriptionId, sub.companyId);
  });
}
```

Créer `src/app/(admin)/offre/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { kycTypesRepo } from "@/lib/repos/billing";

export async function setKycTypeActive(code: string, active: boolean, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(code, "Type de document");
    if (typeof active !== "boolean") throw new Error("État invalide");
    const motif = requireReason(reason);
    kycTypesRepo.setActive(code, active, motif, actor);
    revalidatePath("/offre/types-documents-kyc");
    revalidatePath("/compagnies");
    revalidatePath("/compagnies/kyc");
    revalidatePath("/");
  });
}
```

Run: `pnpm typecheck && pnpm test` → **160 tests** verts (140 + 5 `run-action` + 15 `billing-actions`).

- [ ] **Step 5: Prouver que la session passe en premier**

Dans `src/lib/actions/run.ts`, réécrire temporairement `run` pour appeler `body("anonymous")` **avant** le bloc `requireSession()` (puis retourner le résultat de la session comme aujourd'hui). Run `pnpm test tests/unit/run-action.test.ts tests/unit/billing-actions.test.ts tests/unit/company-actions.test.ts` → FAIL sur `never runs the body without a session` et sur les tests « without a session » / « no session » (statut ou nombre de tentatives modifié). Restaurer le fichier (`git diff src/lib/actions/run.ts` vide), relancer → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/run.ts "src/app/(admin)/compagnies/actions.ts" "src/app/(admin)/facturation/actions.ts" "src/app/(admin)/offre/actions.ts" tests/unit/run-action.test.ts tests/unit/billing-actions.test.ts
git commit -m "feat: shared session-first action runner; retry, cancel and KYC type toggle actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Pages de l'offre (plans, fonctionnalités, paliers, types KYC) et panneau KYC branché sur le registre

**Files:**
- Modify: `src/lib/labels.ts`, `src/components/company/kyc-panel.tsx`, `src/components/company/company-tabs.tsx`, `tests/e2e/backoffice.spec.ts`
- Create: `tests/unit/labels.test.ts`, `src/components/data/detail-row.tsx`, `src/app/(admin)/offre/plans/page.tsx`, `src/app/(admin)/offre/plans/plans-table.tsx`, `src/app/(admin)/offre/plans/[id]/page.tsx`, `src/app/(admin)/offre/plans/[id]/not-found.tsx`, `src/app/(admin)/offre/fonctionnalites/page.tsx`, `src/app/(admin)/offre/paliers-partenaires/page.tsx`, `src/app/(admin)/offre/types-documents-kyc/page.tsx`, `src/app/(admin)/offre/types-documents-kyc/kyc-type-toggle.tsx`

**Interfaces:**
- Consumes: `plansRepo`, `featuresRepo`, `tiersRepo`, `kycTypesRepo` (Task 1), `setKycTypeActive` (Task 3), `DataTable`, `StatusBadge`, `PageHeader`, `ConfirmDialog`, `Card*`, `formatMoney`, `formatNumber`, `formatDate` (lot 1).
- Produces:
  - `labels.ts` : `planStatusBadge(s: Plan["status"]): Badge`, `kycTypeStatusBadge(active: boolean): Badge`, `paymentStatusBadge(s: PaymentAttempt["status"]): Badge`, `changeKindLabel(k: SubscriptionChangeKind): string`, `featureKindLabel(k: FeatureDef["kind"]): string`, `billingCycleLabel(c: Subscription["billingCycle"]): string`.
  - `DetailRow({ label, children })` (Server Component) dans `components/data/detail-row.tsx`.
  - `PlansTable({ plans }: { plans: PlanRow[] })` (client).
  - `KycTypeToggle({ code, name, active }: KycTypeToggleProps)` (client), `KycTypeToggleProps = { code: string; name: string; active: boolean }`.
  - `KycPanel({ company, documents, kycTypes }: { company: KycPanelCompany; documents: KycDocument[]; kycTypes: KycDocumentType[] })`.
- Frontière serveur → client de cette tâche : `PlansTable` reçoit `PlanRow[]` (9 clés, prouvé par `offer-repos.test.ts`) ; `KycTypeToggle` reçoit trois scalaires ; `KycPanel` reçoit `kycTypes` reconstruit champ par champ (`code`, `name`, `required`, `active`) dans `CompanyTabs`. Les pages fonctionnalités, paliers et plan détaillé sont entièrement serveur.

- [ ] **Step 1: Tests des libellés (échouants)**

Créer `tests/unit/labels.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  billingCycleLabel, changeKindLabel, featureKindLabel, kycTypeStatusBadge, paymentStatusBadge,
  planStatusBadge,
} from "@/lib/labels";

describe("billing labels", () => {
  it("labels plan and KYC type states", () => {
    expect(planStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(planStatusBadge("inactive")).toEqual({ label: "Inactif", tone: "neutral" });
    expect(kycTypeStatusBadge(true)).toEqual({ label: "Actif", tone: "success" });
    expect(kycTypeStatusBadge(false)).toEqual({ label: "Inactif", tone: "neutral" });
  });

  it("labels payment attempts", () => {
    expect(paymentStatusBadge("paid")).toEqual({ label: "Payé", tone: "success" });
    expect(paymentStatusBadge("failed")).toEqual({ label: "Échoué", tone: "danger" });
  });

  it("labels plan changes, feature kinds and billing cycles in French", () => {
    expect(["ACTIVATION", "UPGRADE", "DOWNGRADE", "PLAN_CHANGE", "CANCELLATION"].map((k) =>
      changeKindLabel(k as Parameters<typeof changeKindLabel>[0]))).toEqual([
      "Activation", "Montée en gamme", "Descente en gamme", "Changement de plan", "Annulation",
    ]);
    expect(featureKindLabel("boolean")).toBe("Activable");
    expect(featureKindLabel("quota")).toBe("Quota");
    expect(billingCycleLabel("MONTHLY")).toBe("Mensuel");
    expect(billingCycleLabel("YEARLY")).toBe("Annuel");
  });
});
```

Run: `pnpm test tests/unit/labels.test.ts` → FAIL (exports manquants).

- [ ] **Step 2: Libellés**

Dans `src/lib/labels.ts`, remplacer le bloc d'imports par :

```ts
import type { Tone } from "@/components/data/status-badge";
import type {
  CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, Plan,
  ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus,
} from "@/lib/types";
```

puis ajouter à la fin du fichier :

```ts
export const planStatusBadge = (s: Plan["status"]): Badge =>
  pick({
    active: { label: "Actif", tone: "success" },
    inactive: { label: "Inactif", tone: "neutral" },
  }, s);

export const kycTypeStatusBadge = (active: boolean): Badge =>
  active ? { label: "Actif", tone: "success" } : { label: "Inactif", tone: "neutral" };

export const paymentStatusBadge = (s: PaymentAttempt["status"]): Badge =>
  pick({
    paid: { label: "Payé", tone: "success" },
    failed: { label: "Échoué", tone: "danger" },
  }, s);

const CHANGE_KIND_LABELS: Record<SubscriptionChangeKind, string> = {
  ACTIVATION: "Activation",
  UPGRADE: "Montée en gamme",
  DOWNGRADE: "Descente en gamme",
  PLAN_CHANGE: "Changement de plan",
  CANCELLATION: "Annulation",
};

export const changeKindLabel = (k: SubscriptionChangeKind): string => CHANGE_KIND_LABELS[k];

export const featureKindLabel = (k: FeatureDef["kind"]): string => (k === "boolean" ? "Activable" : "Quota");

export const billingCycleLabel = (c: Subscription["billingCycle"]): string =>
  c === "MONTHLY" ? "Mensuel" : "Annuel";
```

Run: `pnpm test tests/unit/labels.test.ts` → PASS (3 tests).

- [ ] **Step 3: Ligne de détail partagée**

Créer `src/components/data/detail-row.tsx` :

```tsx
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
```

- [ ] **Step 4: Plans (liste et détail)**

Créer `src/app/(admin)/offre/plans/plans-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatMoney, formatNumber } from "@/lib/format";
import { planStatusBadge } from "@/lib/labels";
import type { PlanRow } from "@/lib/repos/billing";

const columns: ColumnDef<PlanRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span> },
  {
    accessorKey: "priceMonthly", header: "Prix mensuel",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.priceMonthly, row.original.currency)}</span>,
  },
  {
    accessorKey: "priceYearly", header: "Prix annuel",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.priceYearly, row.original.currency)}</span>,
  },
  {
    accessorKey: "trialDays", header: "Essai",
    cell: ({ row }) => (row.original.trialDays > 0 ? `${row.original.trialDays} jours` : "Aucun"),
  },
  {
    accessorKey: "liveSubscriptions", header: "Abonnements en cours",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.liveSubscriptions)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = planStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function PlansTable({ plans }: { plans: PlanRow[] }) {
  return (
    <DataTable
      columns={columns} data={plans} rowHref={(p) => `/offre/plans/${p.id}`}
      searchPlaceholder="Rechercher un plan…" emptyMessage="Aucun plan."
    />
  );
}
```

Créer `src/app/(admin)/offre/plans/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { plansRepo } from "@/lib/repos/billing";
import { PlansTable } from "./plans-table";

export const dynamic = "force-dynamic";

export default function PlansPage() {
  return (
    <>
      <PageHeader
        title="Plans"
        description="Les offres d'abonnement vendues par Sira aux compagnies (lecture seule)."
      />
      <PlansTable plans={plansRepo.listRows()} />
    </>
  );
}
```

Créer `src/app/(admin)/offre/plans/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { featureKindLabel, planStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import { plansRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = plansRepo.detail(id);
  if (!detail) notFound();
  const { plan, features, subscriptions } = detail;
  const status = planStatusBadge(plan.status);

  return (
    <>
      <PageHeader
        title={`Plan ${plan.name}`}
        description={`Code : ${plan.code}`}
        actions={<span data-testid="plan-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tarifs</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Prix mensuel">{formatMoney(plan.priceMonthly, plan.currency)}</DetailRow>
              <DetailRow label="Prix annuel">{formatMoney(plan.priceYearly, plan.currency)}</DetailRow>
              <DetailRow label="Frais d'installation">{formatMoney(plan.setupFee, plan.currency)}</DetailRow>
              <DetailRow label="Période d'essai">{plan.trialDays > 0 ? `${plan.trialDays} jours` : "Aucune"}</DetailRow>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Limites</CardTitle></CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Utilisateurs maximum">{formatNumber(plan.limits.maxUsers)}</DetailRow>
              <DetailRow label="Bus maximum">{formatNumber(plan.limits.maxBuses)}</DetailRow>
            </dl>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Fonctionnalités incluses ({features.length})</CardTitle></CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fonctionnalité incluse.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {features.map((f) => (
                  <li key={f.code} className="flex items-center justify-between">
                    <span>{f.name} <span className="font-mono text-xs text-muted-foreground">{f.code}</span></span>
                    <StatusBadge tone="info">{featureKindLabel(f.kind)}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Abonnements liés ({subscriptions.length})</CardTitle></CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun abonnement sur ce plan.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Compagnie</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Prix</th>
                    <th className="py-1 font-medium">Prochaine échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => {
                    const b = subscriptionStatusBadge(s.status);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-1.5">
                          <Link href={`/facturation/abonnements/${s.id}`} className="font-medium hover:underline">{s.companyName}</Link>
                        </td>
                        <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                        <td className="tabular-nums">{formatMoney(s.price, s.currency)}</td>
                        <td>{formatDate(s.nextBillingDate)}</td>
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

Créer `src/app/(admin)/offre/plans/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function PlanNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Plan introuvable</p>
        <Link href="/offre/plans" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux plans
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Fonctionnalités et paliers partenaires (pages serveur)**

Créer `src/app/(admin)/offre/fonctionnalites/page.tsx` :

```tsx
import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { featureKindLabel } from "@/lib/labels";
import { featuresRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  const features = featuresRepo.list();
  return (
    <>
      <PageHeader
        title="Fonctionnalités"
        description="Catalogue des fonctionnalités que les plans peuvent inclure (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Plans qui l&apos;incluent</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.code} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{f.code}</td>
                <td className="px-3 py-2 font-medium">{f.name}</td>
                <td className="px-3 py-2">{featureKindLabel(f.kind)}</td>
                <td className="px-3 py-2">
                  {f.plans.length === 0 ? (
                    <span className="text-muted-foreground">Aucun</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {f.plans.map((p) => (
                        <Link key={p.id} href={`/offre/plans/${p.id}`}>
                          <StatusBadge tone={p.status === "active" ? "info" : "neutral"}>
                            {p.name}{p.status === "inactive" ? " (inactif)" : ""}
                          </StatusBadge>
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/offre/paliers-partenaires/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { formatNumber } from "@/lib/format";
import { tiersRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default function PartnerTiersPage() {
  const tiers = tiersRepo.list();
  return (
    <>
      <PageHeader
        title="Paliers partenaires"
        description="Remise accordée selon l'ancienneté d'une compagnie sur la plateforme (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Palier</th>
              <th className="px-3 py-2 font-medium">Ancienneté minimale</th>
              <th className="px-3 py-2 font-medium">Remise</th>
              <th className="px-3 py-2 font-medium">Compagnies</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.code} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{t.code}</td>
                <td className="px-3 py-2">{t.minMonths === 0 ? "Dès l'activation" : `${t.minMonths} mois`}</td>
                <td className="px-3 py-2 tabular-nums">{t.discountPercent} %</td>
                <td className="px-3 py-2 tabular-nums" data-testid={`tier-companies-${t.code}`}>{formatNumber(t.companies)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Types de documents KYC et bascule**

Créer `src/app/(admin)/offre/types-documents-kyc/kyc-type-toggle.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setKycTypeActive } from "@/app/(admin)/offre/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Three scalars only: nothing else crosses the server/client boundary. */
export interface KycTypeToggleProps { code: string; name: string; active: boolean }

export function KycTypeToggle({ code, name, active }: KycTypeToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const verb = active ? "Désactiver" : "Réactiver";

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} aria-label={`${verb} ${name}`}>
        {verb}
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`${verb} le type « ${name} »`}
        description={active
          ? "Ce document ne sera plus exigé pour activer une compagnie. Les documents déjà déposés sont conservés."
          : "Ce document sera de nouveau exigé pour activer une compagnie."}
        confirmLabel={verb} destructive={active} requireReason
        onConfirm={async (reason) => {
          const r = await setKycTypeActive(code, !active, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

Créer `src/app/(admin)/offre/types-documents-kyc/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { kycTypeStatusBadge } from "@/lib/labels";
import { kycTypesRepo } from "@/lib/repos/billing";
import { KycTypeToggle } from "./kyc-type-toggle";

export const dynamic = "force-dynamic";

export default function KycTypesPage() {
  const types = kycTypesRepo.list();
  const requiredActive = kycTypesRepo.requiredActive().length;
  return (
    <>
      <PageHeader
        title="Types de documents KYC"
        description="Documents exigés pour activer une compagnie. Un type désactivé n'est plus exigé."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        {requiredActive} type(s) obligatoire(s) actif(s). Le dernier type obligatoire actif ne peut pas être désactivé.
      </p>
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="px-3 py-2 font-medium">Obligatoire</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const b = kycTypeStatusBadge(t.active);
              return (
                <tr key={t.code} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.required ? "Oui" : "Non"}</td>
                  <td className="px-3 py-2" data-testid={`kyc-type-status-${t.code}`}>
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <KycTypeToggle code={t.code} name={t.name} active={t.active} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Brancher le panneau KYC de la fiche compagnie sur le registre**

Remplacer intégralement `src/components/company/kyc-panel.tsx` par :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { forceActivateCompany } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { KycActions } from "@/components/company/kyc-actions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { kycStatusBadge } from "@/lib/labels";
import type { Company, KycDocument, KycDocumentType } from "@/lib/types";

/** Only the fields the panel needs: this is a client component, so nothing personal may cross the boundary. */
export type KycPanelCompany = Pick<Company, "id" | "name" | "status" | "forceActivated">;

export function KycPanel({
  company, documents, kycTypes,
}: { company: KycPanelCompany; documents: KycDocument[]; kycTypes: KycDocumentType[] }) {
  const router = useRouter();
  const [forcing, setForcing] = useState(false);
  const required = kycTypes.filter((t) => t.active && t.required);
  const approved = required.filter((t) =>
    documents.some((d) => d.typeCode === t.code && d.status === "approved"),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium">{approved} / {required.length}</span> documents obligatoires approuvés.
          {company.forceActivated && (
            <span className="ml-2"><StatusBadge tone="warning">Activée de force</StatusBadge></span>
          )}
        </p>
        {company.status === "draft" && (
          <Button variant="secondary" onClick={() => setForcing(true)}>Forcer l&apos;activation</Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Déposé le</th>
              <th className="px-3 py-2 font-medium">Détail</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {kycTypes.map((t) => {
              const doc = documents.find((d) => d.typeCode === t.code);
              const badge = doc ? kycStatusBadge(doc.status) : null;
              const isRequired = t.active && t.required;
              return (
                <tr key={t.code} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">
                    {t.name}
                    {!isRequired && <span className="ml-2"><StatusBadge>Non exigé</StatusBadge></span>}
                  </td>
                  <td className="px-3 py-2">
                    {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : <StatusBadge>Non déposé</StatusBadge>}
                  </td>
                  <td className="px-3 py-2">{doc ? formatDate(doc.uploadedAt) : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{doc?.rejectionReason ?? ""}</td>
                  <td className="px-3 py-2">
                    {doc?.status === "pending" && <KycActions docId={doc.id} docLabel={t.name} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={forcing} onOpenChange={setForcing}
        title={`Forcer l'activation de ${company.name}`}
        description="La compagnie sera activée sans KYC complet. Cette action est tracée et marquée « activée de force »."
        confirmLabel="Forcer l'activation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await forceActivateCompany(company.id, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
```

Dans `src/components/company/company-tabs.tsx`, remplacer l'élément `KycPanel` de l'onglet `kyc` (une seule ligne) par :

```tsx
    { value: "kyc", label: "Vérification KYC", content: <KycPanel company={{ id: c.id, name: c.name, status: c.status, forceActivated: c.forceActivated }} documents={detail.documents} kycTypes={detail.kycTypes.map((t) => ({ code: t.code, name: t.name, required: t.required, active: t.active }))} /> },
```

Le compteur reste `5 / 6` pour Kolda Voyages avec le registre par défaut : le test E2E du lot 1 n'est pas modifié.

- [ ] **Step 8: Parcours E2E « désactiver deux types KYC puis activer Louga Trans »**

Dans `tests/e2e/backoffice.spec.ts`, la route `/facturation/factures` devient une vraie page à la Task 6 : remplacer dans le test `unimplemented sections show a coming-soon page` la ligne `await page.goto("/facturation/factures");` par :

```ts
  await page.goto("/flotte/bus");
```

Puis ajouter, **avant** le test `no contact e-mail or phone reaches the browser in page payloads @prod` :

```ts
test("deactivating KYC types lets a company activate without those documents", async ({ page }) => {
  await login(page);
  const types = ["Licence de transport", "Pièce d'identité du dirigeant"];

  await page.goto("/offre/types-documents-kyc");
  for (const name of types) {
    await page.getByRole("button", { name: `Désactiver ${name}` }).click();
    const dialog = page.getByRole("dialog");
    const confirm = dialog.getByRole("button", { name: "Désactiver", exact: true });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Motif (obligatoire)").fill("Document non exigé pour la démonstration");
    await confirm.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByTestId("kyc-type-status-TRANSPORT_LICENSE")).toHaveText("Inactif");
  await expect(page.getByTestId("kyc-type-status-ID_MANAGER")).toHaveText("Inactif");

  await openCompany(page, "louga", /Louga Trans/);
  await page.getByRole("tab", { name: "Vérification KYC" }).click();
  await expect(page.getByText("3 / 4")).toBeVisible();
  await page.getByRole("button", { name: "Approuver Assurance flotte" }).click();
  await expect(page.getByText("4 / 4")).toBeVisible();
  await expect(page.getByTestId("company-status")).toHaveText("Active");

  // Restore the registry so later tests see the seed configuration.
  await page.goto("/offre/types-documents-kyc");
  for (const name of types) {
    await page.getByRole("button", { name: `Réactiver ${name}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Motif (obligatoire)").fill("Retour à la configuration initiale");
    await dialog.getByRole("button", { name: "Réactiver", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByTestId("kyc-type-status-TRANSPORT_LICENSE")).toHaveText("Actif");
  await expect(page.getByTestId("kyc-type-status-ID_MANAGER")).toHaveText("Actif");
});
```

Louga Trans (graine) : REGISTRATION, NINEA et TAX_CLEARANCE approuvés, INSURANCE en attente, TRANSPORT_LICENSE rejeté, ID_MANAGER non déposé. Aucun autre test ne mute Louga Trans (la palette de commandes ne fait qu'ouvrir sa fiche).

- [ ] **Step 9: Vérifier**

Run:

```bash
pnpm typecheck && pnpm test
pnpm exec playwright test --project=dev -g "KYC types|coming-soon|KYC approval"
git checkout tsconfig.json
```

Expected : typecheck OK ; **163 tests** unitaires verts (160 + 3 `labels`) ; Playwright : 3 tests passent (le nouveau parcours, la page « Bientôt disponible » sur `/flotte/bus`, et le parcours Kolda du lot 1 inchangé). Playwright démarre aussi le serveur de production (construction comprise) : c'est normal, et la dernière commande annule la réécriture de `tsconfig.json`.

Vérification manuelle (`pnpm dev`, connecté) : `/offre/plans` (4 lignes, Legacy « Inactif »), `/offre/plans/<id de Pro>` (5 fonctionnalités, 5 abonnements liés), `/offre/fonctionnalites`, `/offre/paliers-partenaires` (12, 5, 3), `/offre/types-documents-kyc`, en clair et en sombre.

- [ ] **Step 10: Commit**

```bash
git add src/lib/labels.ts tests/unit/labels.test.ts src/components/data/detail-row.tsx "src/app/(admin)/offre" src/components/company/kyc-panel.tsx src/components/company/company-tabs.tsx tests/e2e/backoffice.spec.ts
git commit -m "feat: offer pages (plans, features, partner tiers, KYC types) and registry-driven KYC panel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

`git add "src/app/(admin)/offre"` ajoute aussi `offre/actions.ts`, déjà commité à la Task 3 (sans effet).

---
### Task 5: Abonnements (liste filtrable, détail à onglets, relance et annulation)

**Files:**
- Create: `src/lib/filters.ts`, `tests/unit/filters.test.ts`, `src/components/data/status-filter-nav.tsx`, `src/components/billing/retry-payment-button.tsx`, `src/components/billing/subscription-actions.tsx`, `src/components/billing/subscription-tabs.tsx`, `src/app/(admin)/facturation/abonnements/page.tsx`, `src/app/(admin)/facturation/abonnements/subscriptions-table.tsx`, `src/app/(admin)/facturation/abonnements/[id]/page.tsx`, `src/app/(admin)/facturation/abonnements/[id]/not-found.tsx`
- Modify: `src/components/company/company-tabs.tsx`, `tests/e2e/backoffice.spec.ts`

**Interfaces:**
- Consumes: `subscriptionsRepo.listRows/detail`, `SubscriptionRow`, `SubscriptionDetail` (Tasks 1-2), `retrySubscriptionPayment`, `cancelSubscription` (Task 3), `changeKindLabel`, `paymentStatusBadge`, `billingCycleLabel`, `DetailRow` (Task 4), `TabsWithUrl`, `ConfirmDialog`, `DataTable` (lot 1).
- Produces:
  - `parseFilter<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined` dans `src/lib/filters.ts`.
  - `interface FilterOption { value: string; label: string }` et `StatusFilterNav({ basePath, options, current, label? })` (Server Component) dans `components/data/status-filter-nav.tsx` ; l'option de valeur `"all"` mène à `basePath`, les autres à `basePath?statut=<value>`.
  - `RetryPaymentButton({ subscriptionId, label }: RetryPaymentButtonProps)` (client) ; bouton au nom accessible `Relancer le paiement de <label>`, confirmation `Relancer`.
  - `SubscriptionActions({ subscriptionId, companyName, canRetry, canCancel }: SubscriptionActionsProps)` (client) ; bouton `Annuler l'abonnement`, confirmation `Confirmer l'annulation`.
  - `SubscriptionTabs({ detail, initialTab })` (Server Component), valeurs d'onglet `resume`, `historique`, `tentatives`, `factures`.
  - `SubscriptionsTable({ subscriptions }: { subscriptions: SubscriptionRow[] })` (client).
- Frontière serveur → client : `SubscriptionsTable` reçoit `SubscriptionRow[]` (9 clés prouvées en Task 2) ; `RetryPaymentButton` et `SubscriptionActions` reçoivent des scalaires (identifiant, nom de compagnie, deux booléens). `SubscriptionTabs` est un Server Component : le contenu de ses onglets est rendu côté serveur puis passé à `TabsWithUrl` comme nœuds React (même mécanisme que `CompanyTabs`) ; aucun objet `Subscription` n'est passé en props à un composant client.

- [ ] **Step 1: Test de `parseFilter` (échouant)**

Créer `tests/unit/filters.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { parseFilter } from "@/lib/filters";

describe("parseFilter", () => {
  const allowed = ["paid", "failed"] as const;
  it("returns an allowed value", () => {
    expect(parseFilter("failed", allowed)).toBe("failed");
  });
  it("returns undefined for a missing or unknown value", () => {
    expect(parseFilter(undefined, allowed)).toBeUndefined();
    expect(parseFilter("all", allowed)).toBeUndefined();
    expect(parseFilter("PAID", allowed)).toBeUndefined();
  });
});
```

Run: `pnpm test tests/unit/filters.test.ts` → FAIL (module introuvable).

- [ ] **Step 2: `parseFilter` et `StatusFilterNav`**

Créer `src/lib/filters.ts` :

```ts
/** Keeps a query-string filter only when it is one of the allowed values. */
export function parseFilter<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((value) => value === raw);
}
```

Créer `src/components/data/status-filter-nav.tsx` :

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterOption { value: string; label: string }

/** Pill links that set `?statut=` on a list page; the option "all" clears the filter. */
export function StatusFilterNav({
  basePath, options, current, label = "Filtrer par statut",
}: { basePath: string; options: FilterOption[]; current: string | undefined; label?: string }) {
  return (
    <nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = (o.value === "all" && !current) || o.value === current;
        return (
          <Link
            key={o.value}
            href={o.value === "all" ? basePath : `${basePath}?statut=${o.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              active ? "border-accent bg-accent-soft font-medium" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Run: `pnpm test tests/unit/filters.test.ts` → PASS (2 tests).

- [ ] **Step 3: Boutons d'action (clients)**

Créer `src/components/billing/retry-payment-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { retrySubscriptionPayment } from "@/app/(admin)/facturation/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` is the company name shown in the button and the dialog; no other data is needed. */
export interface RetryPaymentButtonProps { subscriptionId: string; label: string }

export function RetryPaymentButton({ subscriptionId, label }: RetryPaymentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} aria-label={`Relancer le paiement de ${label}`}>
        Relancer le paiement
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Relancer le paiement de ${label}`}
        description="Une nouvelle tentative de prélèvement est simulée immédiatement. En cas de succès, une facture payée est émise et l'abonnement redevient actif."
        confirmLabel="Relancer"
        onConfirm={async () => {
          const r = await retrySubscriptionPayment(subscriptionId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

Créer `src/components/billing/subscription-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelSubscription } from "@/app/(admin)/facturation/actions";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only; the flags come from `canRetry`/`canCancel` computed on the server. */
export interface SubscriptionActionsProps {
  subscriptionId: string;
  companyName: string;
  canRetry: boolean;
  canCancel: boolean;
}

export function SubscriptionActions({ subscriptionId, companyName, canRetry, canCancel }: SubscriptionActionsProps) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  if (!canRetry && !canCancel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry && <RetryPaymentButton subscriptionId={subscriptionId} label={companyName} />}
      {canCancel && (
        <Button size="sm" variant="danger" onClick={() => setCanceling(true)}>Annuler l&apos;abonnement</Button>
      )}
      <ConfirmDialog
        open={canceling} onOpenChange={setCanceling}
        title={`Annuler l'abonnement de ${companyName}`}
        description="L'abonnement passe à l'état « Annulée ». Le motif est enregistré dans l'activité de la compagnie."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelSubscription(subscriptionId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Liste des abonnements**

Créer `src/app/(admin)/facturation/abonnements/subscriptions-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { billingCycleLabel, subscriptionStatusBadge } from "@/lib/labels";
import type { SubscriptionRow } from "@/lib/repos/billing";

const columns: ColumnDef<SubscriptionRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  { accessorKey: "planName", header: "Plan" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = subscriptionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "billingCycle", header: "Cycle", cell: ({ row }) => billingCycleLabel(row.original.billingCycle) },
  {
    accessorKey: "price", header: "Prix",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  { accessorKey: "nextBillingDate", header: "Prochaine échéance", cell: ({ row }) => formatDate(row.original.nextBillingDate) },
];

export function SubscriptionsTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <DataTable
      columns={columns} data={subscriptions} rowHref={(s) => `/facturation/abonnements/${s.id}`}
      searchPlaceholder="Rechercher un abonnement…" emptyMessage="Aucun abonnement."
    />
  );
}
```

Créer `src/app/(admin)/facturation/abonnements/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { subscriptionsRepo } from "@/lib/repos/billing";
import type { SubscriptionStatus } from "@/lib/types";
import { SubscriptionsTable } from "./subscriptions-table";

export const dynamic = "force-dynamic";

const STATUSES = ["trial", "active", "past_due", "suspended", "expired", "canceled"] as const satisfies readonly SubscriptionStatus[];
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "trial", label: "Essai" },
  { value: "active", label: "Actifs" },
  { value: "past_due", label: "Impayés" },
  { value: "suspended", label: "Suspendus" },
  { value: "expired", label: "Expirés" },
  { value: "canceled", label: "Annulés" },
];

export default async function SubscriptionsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader title="Abonnements" description="Les abonnements des compagnies aux plans de Sira." />
      <StatusFilterNav basePath="/facturation/abonnements" options={OPTIONS} current={status} />
      <SubscriptionsTable subscriptions={subscriptionsRepo.listRows({ status })} />
    </>
  );
}
```

- [ ] **Step 5: Détail d'un abonnement**

Créer `src/components/billing/subscription-tabs.tsx` :

```tsx
import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  billingCycleLabel, changeKindLabel, invoiceStatusBadge, paymentStatusBadge, subscriptionStatusBadge,
} from "@/lib/labels";
import type { SubscriptionDetail } from "@/lib/repos/billing";

const TAB_VALUES = ["resume", "historique", "tentatives", "factures"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function SubscriptionTabs({ detail, initialTab }: { detail: SubscriptionDetail; initialTab?: string }) {
  const { subscription: sub, plan } = detail;
  const status = subscriptionStatusBadge(sub.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${sub.companyId}?onglet=abonnement`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Plan">
            {plan ? <Link href={`/offre/plans/${plan.id}`} className="hover:underline">{sub.planName}</Link> : sub.planName}
          </DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Cycle de facturation">{billingCycleLabel(sub.billingCycle)}</DetailRow>
          <DetailRow label="Prix">{formatMoney(sub.price, sub.currency)}</DetailRow>
          <DetailRow label="Prochaine échéance">{formatDate(sub.nextBillingDate)}</DetailRow>
          <DetailRow label="Fin de l'essai">{sub.trialEndDate ? formatDate(sub.trialEndDate) : "—"}</DetailRow>
          <DetailRow label="Impayé depuis">{sub.pastDueSince ? formatDate(sub.pastDueSince) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "historique", label: "Historique des changements de plan",
      content: (
        <Card><CardContent>
          {detail.history.length === 0 ? <Empty>Aucun changement enregistré.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Changement</th>
                  <th className="py-1 font-medium">Ancien plan</th>
                  <th className="py-1 font-medium">Nouveau plan</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-1.5">{formatDate(h.at)}</td>
                    <td>{changeKindLabel(h.kind)}</td>
                    <td>{h.fromPlan ?? "—"}</td>
                    <td>{h.toPlan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "tentatives", label: "Tentatives de paiement",
      content: (
        <Card><CardContent>
          {detail.payments.length === 0 ? <Empty>Aucune tentative de paiement.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Motif</th>
                  <th className="py-1 font-medium">Facture</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((p) => {
                  const b = paymentStatusBadge(p.status);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(p.at)}</td>
                      <td className="tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="text-muted-foreground">{p.reason ?? "—"}</td>
                      <td>
                        {p.invoiceId && p.invoiceNumber ? (
                          <Link href={`/facturation/factures/${p.invoiceId}`} className="hover:underline">{p.invoiceNumber}</Link>
                        ) : "—"}
                      </td>
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
      value: "factures", label: "Factures",
      content: (
        <Card><CardContent>
          {detail.invoices.length === 0 ? <Empty>Aucune facture.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Numéro</th>
                  <th className="py-1 font-medium">Émise le</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {detail.invoices.map((i) => {
                  const b = invoiceStatusBadge(i.status);
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/facturation/factures/${i.id}`} className="font-medium hover:underline">{i.number}</Link>
                      </td>
                      <td>{formatDate(i.issuedAt)}</td>
                      <td className="tabular-nums">{formatMoney(i.amount, i.currency)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
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

Créer `src/app/(admin)/facturation/abonnements/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { SubscriptionActions } from "@/components/billing/subscription-actions";
import { SubscriptionTabs } from "@/components/billing/subscription-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { billingCycleLabel, subscriptionStatusBadge } from "@/lib/labels";
import { subscriptionsRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = subscriptionsRepo.detail(id);
  if (!detail) notFound();
  const sub = detail.subscription;
  const badge = subscriptionStatusBadge(sub.status);
  return (
    <>
      <PageHeader
        title={`Abonnement de ${detail.companyName}`}
        description={`Plan ${sub.planName} · ${billingCycleLabel(sub.billingCycle)}`}
        actions={
          <>
            <span data-testid="subscription-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            <SubscriptionActions
              subscriptionId={sub.id} companyName={detail.companyName}
              canRetry={detail.canRetry} canCancel={detail.canCancel}
            />
          </>
        }
      />
      <SubscriptionTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/facturation/abonnements/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SubscriptionNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Abonnement introuvable</p>
        <Link href="/facturation/abonnements" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux abonnements
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Lien depuis la fiche compagnie**

Dans `src/components/company/company-tabs.tsx`, ajouter `import Link from "next/link";` en tête des imports, puis dans l'onglet `abonnement`, remplacer la ligne :

```tsx
              <Row label="Prochaine échéance">{formatDate(sub.nextBillingDate)}</Row>
```

par :

```tsx
              <Row label="Prochaine échéance">{formatDate(sub.nextBillingDate)}</Row>
              <Row label="Détail"><Link href={`/facturation/abonnements/${sub.id}`} className="text-accent hover:underline">Voir l&apos;abonnement</Link></Row>
```

- [ ] **Step 7: Parcours E2E « annuler avec motif obligatoire »**

Ajouter dans `tests/e2e/backoffice.spec.ts`, avant le test `@prod` :

```ts
test("canceling a subscription requires a reason and records the change", async ({ page }) => {
  await login(page);
  await page.goto("/facturation/abonnements");
  await page.getByPlaceholder("Rechercher un abonnement…").fill("touba");
  await page.getByRole("row", { name: /Touba Liaison/ }).click();
  await expect(page.getByRole("heading", { name: "Abonnement de Touba Liaison" })).toBeVisible();
  await expect(page.getByTestId("subscription-status")).toHaveText("Active");

  await page.getByRole("button", { name: "Annuler l'abonnement" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Fin de contrat demandée par la compagnie");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page.getByTestId("subscription-status")).toHaveText("Annulée");
  await expect(page.getByRole("button", { name: "Annuler l'abonnement" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Historique des changements de plan" }).click();
  await expect(page.getByRole("cell", { name: "Annulation" })).toBeVisible();
});
```

- [ ] **Step 8: Vérifier**

Run:

```bash
pnpm typecheck && pnpm test
pnpm exec playwright test --project=dev -g "canceling a subscription"
git checkout tsconfig.json
```

Expected : typecheck OK ; **165 tests** unitaires verts (163 + 2 `filters`) ; Playwright : 1 test passe. Vérification manuelle (`pnpm dev`) : filtres « Impayés » (2 lignes) et « Suspendus » (1), détail de Baobab Lines (bouton « Relancer le paiement » présent, onglets lisibles via `?onglet=tentatives`), détail de Matam Express (aucun bouton : abonnement expiré), lien « Voir l'abonnement » depuis la fiche compagnie.

- [ ] **Step 9: Commit**

```bash
git add src/lib/filters.ts tests/unit/filters.test.ts src/components/data/status-filter-nav.tsx src/components/billing "src/app/(admin)/facturation/abonnements" src/components/company/company-tabs.tsx tests/e2e/backoffice.spec.ts
git commit -m "feat: subscriptions list and detail with payment retry and cancellation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Paiements et factures (listes filtrables, détail d'une facture)

**Files:**
- Create: `src/app/(admin)/facturation/paiements/page.tsx`, `src/app/(admin)/facturation/paiements/payments-table.tsx`, `src/app/(admin)/facturation/factures/page.tsx`, `src/app/(admin)/facturation/factures/invoices-table.tsx`, `src/app/(admin)/facturation/factures/[id]/page.tsx`, `src/app/(admin)/facturation/factures/[id]/not-found.tsx`
- Modify: `tests/e2e/backoffice.spec.ts`

**Interfaces:**
- Consumes: `paymentsRepo.listRows`, `invoicesRepo.listRows/detail`, `PaymentRow`, `InvoiceRow` (Task 2), `parseFilter`, `StatusFilterNav` (Task 5), `paymentStatusBadge`, `invoiceStatusBadge`, `subscriptionStatusBadge`, `DetailRow`.
- Produces: `PaymentsTable({ payments }: { payments: PaymentRow[] })`, `InvoicesTable({ invoices }: { invoices: InvoiceRow[] })` (clients) ; pages `/facturation/paiements`, `/facturation/factures`, `/facturation/factures/[id]`.
- Frontière serveur → client : `PaymentRow[]` (11 clés) et `InvoiceRow[]` (9 clés), prouvées par `billing-repo.test.ts`. La page de détail d'une facture est entièrement serveur.

- [ ] **Step 1: Paiements**

Créer `src/app/(admin)/facturation/paiements/payments-table.tsx` (pas de `rowHref` : chaque ligne porte deux liens distincts, facture et abonnement) :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentStatusBadge } from "@/lib/labels";
import type { PaymentRow } from "@/lib/repos/billing";

const columns: ColumnDef<PaymentRow, unknown>[] = [
  { accessorKey: "at", header: "Date", cell: ({ row }) => formatDateTime(row.original.at) },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = paymentStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "reason", header: "Motif", cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason ?? "—"}</span> },
  {
    accessorKey: "invoiceNumber", header: "Facture",
    cell: ({ row }) => (row.original.invoiceId && row.original.invoiceNumber ? (
      <Link href={`/facturation/factures/${row.original.invoiceId}`} className="hover:underline">{row.original.invoiceNumber}</Link>
    ) : "—"),
  },
  {
    id: "subscription", header: "Abonnement", enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/facturation/abonnements/${row.original.subscriptionId}`} className="text-accent hover:underline">
        Voir l&apos;abonnement
      </Link>
    ),
  },
];

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  return (
    <DataTable
      columns={columns} data={payments}
      searchPlaceholder="Rechercher un paiement…" emptyMessage="Aucun paiement."
    />
  );
}
```

Créer `src/app/(admin)/facturation/paiements/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { paymentsRepo } from "@/lib/repos/billing";
import { PaymentsTable } from "./payments-table";

export const dynamic = "force-dynamic";

const STATUSES = ["paid", "failed"] as const;
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "paid", label: "Payés" },
  { value: "failed", label: "Échoués" },
];

export default async function PaymentsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader
        title="Paiements"
        description="Tentatives de paiement des abonnements, de la plus récente à la plus ancienne."
      />
      <StatusFilterNav basePath="/facturation/paiements" options={OPTIONS} current={status} />
      <PaymentsTable payments={paymentsRepo.listRows({ status })} />
    </>
  );
}
```

- [ ] **Step 2: Factures (liste)**

Créer `src/app/(admin)/facturation/factures/invoices-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusBadge } from "@/lib/labels";
import type { InvoiceRow } from "@/lib/repos/billing";

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  { accessorKey: "number", header: "Numéro", cell: ({ row }) => <span className="font-medium">{row.original.number}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = invoiceStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "issuedAt", header: "Émise le", cell: ({ row }) => formatDate(row.original.issuedAt) },
];

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <DataTable
      columns={columns} data={invoices} rowHref={(i) => `/facturation/factures/${i.id}`}
      searchPlaceholder="Rechercher une facture…" emptyMessage="Aucune facture."
    />
  );
}
```

Créer `src/app/(admin)/facturation/factures/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { invoicesRepo } from "@/lib/repos/billing";
import { InvoicesTable } from "./invoices-table";

export const dynamic = "force-dynamic";

const STATUSES = ["paid", "failed"] as const;
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées" },
  { value: "failed", label: "Échouées" },
];

export default async function InvoicesPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader title="Factures" description="Factures d'abonnement émises par Sira aux compagnies." />
      <StatusFilterNav basePath="/facturation/factures" options={OPTIONS} current={status} />
      <InvoicesTable invoices={invoicesRepo.listRows({ status })} />
    </>
  );
}
```

- [ ] **Step 3: Détail d'une facture**

Créer `src/app/(admin)/facturation/factures/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { invoiceStatusBadge, paymentStatusBadge } from "@/lib/labels";
import { invoicesRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = invoicesRepo.detail(id);
  if (!detail) notFound();
  const { invoice, subscription, payment } = detail;
  const status = invoiceStatusBadge(invoice.status);
  const paymentBadge = payment ? paymentStatusBadge(payment.status) : null;

  return (
    <>
      <PageHeader
        title={`Facture ${invoice.number}`}
        description={`Émise le ${formatDate(invoice.issuedAt)}`}
        actions={<span data-testid="invoice-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <Card>
        <CardContent>
          <dl>
            <DetailRow label="Numéro">{invoice.number}</DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${invoice.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Abonnement">
              {subscription ? (
                <Link href={`/facturation/abonnements/${subscription.id}`} className="text-accent hover:underline">
                  Voir l&apos;abonnement
                </Link>
              ) : "—"}
            </DetailRow>
            <DetailRow label="Plan">{subscription?.planName ?? "—"}</DetailRow>
            <DetailRow label="Montant">{formatMoney(invoice.amount, invoice.currency)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Paiement associé">
              {payment && paymentBadge ? (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge tone={paymentBadge.tone}>{paymentBadge.label}</StatusBadge>
                  {formatDateTime(payment.at)}
                </span>
              ) : "Aucune tentative enregistrée"}
            </DetailRow>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Le PDF des factures n&apos;est pas disponible dans ce lot.</p>
        </CardContent>
      </Card>
    </>
  );
}
```

Créer `src/app/(admin)/facturation/factures/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoiceNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Facture introuvable</p>
        <Link href="/facturation/factures" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux factures
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Parcours E2E « lecture d'une facture »**

Ajouter dans `tests/e2e/backoffice.spec.ts`, avant le test `@prod` (lecture seule ; `INV-2026-0003` est la seconde facture de Sahel Express dans la graine) :

```ts
test("an invoice can be read from the invoices list and links to its subscription", async ({ page }) => {
  await login(page);
  await page.goto("/facturation/factures");
  await page.getByPlaceholder("Rechercher une facture…").fill("INV-2026-0003");
  await page.getByRole("row", { name: /INV-2026-0003/ }).click();
  await expect(page.getByRole("heading", { name: "Facture INV-2026-0003" })).toBeVisible();
  await expect(page.getByTestId("invoice-status")).toHaveText("Payée");
  await expect(page.getByRole("link", { name: "Sahel Express" })).toBeVisible();

  await page.getByRole("link", { name: "Voir l'abonnement" }).click();
  await expect(page.getByRole("heading", { name: "Abonnement de Sahel Express" })).toBeVisible();

  await page.goto("/facturation/factures/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Facture introuvable")).toBeVisible();
});
```

- [ ] **Step 5: Vérifier**

Run:

```bash
pnpm typecheck && pnpm test
pnpm exec playwright test --project=dev -g "an invoice can be read"
git checkout tsconfig.json
```

Expected : typecheck OK ; **165 tests** unitaires verts (aucun nouveau test unitaire : les dépôts sont couverts par la Task 2) ; Playwright : 1 test passe. Vérification manuelle : `/facturation/paiements?statut=failed` (6 lignes), `/facturation/factures?statut=failed` (2 lignes), lien de facture depuis un paiement.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/facturation/paiements" "src/app/(admin)/facturation/factures" tests/e2e/backoffice.spec.ts
git commit -m "feat: payment and invoice lists with an invoice detail page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: File des impayés (urgence, relance dans la liste) et lien depuis la Vue 360

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`, `src/components/data/data-table.tsx`, `src/app/(admin)/page.tsx`, `tests/e2e/backoffice.spec.ts`
- Create: `src/app/(admin)/facturation/impayes/page.tsx`, `src/app/(admin)/facturation/impayes/unpaid-table.tsx`

**Interfaces:**
- Consumes: `subscriptionsRepo.unpaidQueue`, `UnpaidRow`, `SUSPENSION_DELAY_DAYS`, `EXPIRATION_DELAY_DAYS` (Task 2), `RetryPaymentButton` (Task 5), `KpiCard`, `DataTable`.
- Produces: `urgencyBadge(deadline: UnpaidRow["deadline"], daysLeft: number): Badge` dans `labels.ts` ; prop facultative `rowId?: (row: T) => string` de `DataTable` (transmise à `getRowId` de TanStack Table 8) ; `UnpaidTable({ rows }: { rows: UnpaidRow[] })` (client) ; lien « Voir la file des impayés » dans le panneau « Impayés » de la Vue 360.
- Frontière serveur → client : `UnpaidTable` reçoit `UnpaidRow[]` (10 clés, prouvées par `billing-repo.test.ts`). **Pas de `rowHref`** : chaque ligne contient un `RetryPaymentButton` qui ouvre un dialogue ; la fiche de l'abonnement s'ouvre par le lien du nom de la compagnie.

- [ ] **Step 1: Tests du badge d'urgence (échouants)**

Dans `tests/unit/labels.test.ts`, ajouter `urgencyBadge` à l'import depuis `@/lib/labels`, puis ajouter à la fin du fichier :

```ts
describe("urgencyBadge", () => {
  it("is neutral when the deadline is more than five days away", () => {
    expect(urgencyBadge("expiration", 17)).toEqual({ label: "17 j avant expiration", tone: "neutral" });
  });
  it("warns between three and five days and alarms at two days or less", () => {
    expect(urgencyBadge("suspension", 5)).toEqual({ label: "5 j avant suspension", tone: "warning" });
    expect(urgencyBadge("suspension", 2)).toEqual({ label: "2 j avant suspension", tone: "danger" });
  });
  it("says today on the deadline day", () => {
    expect(urgencyBadge("suspension", 0)).toEqual({ label: "Suspension aujourd'hui", tone: "danger" });
  });
  it("reports an overdue deadline", () => {
    expect(urgencyBadge("expiration", -3)).toEqual({ label: "Expiration dépassée de 3 j", tone: "danger" });
  });
});
```

Run: `pnpm test tests/unit/labels.test.ts` → FAIL (`urgencyBadge` n'existe pas).

- [ ] **Step 2: Implémenter `urgencyBadge`**

Ajouter à la fin de `src/lib/labels.ts` :

```ts
/** Urgency of an unpaid subscription; daysLeft comes from subscriptionsRepo.unpaidQueue(now). */
export function urgencyBadge(deadline: "suspension" | "expiration", daysLeft: number): Badge {
  const noun = deadline === "suspension" ? "Suspension" : "Expiration";
  if (daysLeft < 0) return { label: `${noun} dépassée de ${-daysLeft} j`, tone: "danger" };
  if (daysLeft === 0) return { label: `${noun} aujourd'hui`, tone: "danger" };
  const label = `${daysLeft} j avant ${deadline}`;
  if (daysLeft <= 2) return { label, tone: "danger" };
  if (daysLeft <= 5) return { label, tone: "warning" };
  return { label, tone: "neutral" };
}
```

Run: `pnpm test tests/unit/labels.test.ts` → PASS (7 tests).

- [ ] **Step 3: Identifiant de ligne stable dans `DataTable`**

Par défaut, TanStack Table 8 identifie une ligne par son index : quand une relance réussie retire une ligne de la file, React réutiliserait le composant de la ligne suivante (et l'état ouvert de son dialogue). Dans `src/components/data/data-table.tsx` :

1. ajouter à `DataTableProps<T>` la propriété :

```ts
  /** Stable row identity (TanStack `getRowId`); use it when rows can disappear after an action. */
  rowId?: (row: T) => string;
```

2. ajouter `rowId` à la déstructuration des props (`columns, data, searchPlaceholder = "Rechercher…", rowHref, rowId,`) ;
3. dans l'objet passé à `useReactTable`, ajouter après `data, columns,` la ligne :

```ts
    ...(rowId ? { getRowId: (row: T) => rowId(row) } : {}),
```

Les tableaux existants ne passent pas `rowId` : leur comportement est inchangé.

- [ ] **Step 4: Page des impayés**

Créer `src/app/(admin)/facturation/impayes/unpaid-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { subscriptionStatusBadge, urgencyBadge } from "@/lib/labels";
import type { UnpaidRow } from "@/lib/repos/billing";

const columns: ColumnDef<UnpaidRow, unknown>[] = [
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <Link href={`/facturation/abonnements/${row.original.id}`} className="font-medium hover:underline">
        {row.original.companyName}
      </Link>
    ),
  },
  { accessorKey: "planName", header: "Plan" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = subscriptionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "price", header: "Montant dû",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  { accessorKey: "pastDueSince", header: "Impayé depuis", cell: ({ row }) => formatDate(row.original.pastDueSince) },
  {
    accessorKey: "daysLeft", header: "Urgence",
    cell: ({ row }) => {
      const b = urgencyBadge(row.original.deadline, row.original.daysLeft);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "action", header: "Action", enableSorting: false,
    cell: ({ row }) => <RetryPaymentButton subscriptionId={row.original.id} label={row.original.companyName} />,
  },
];

export function UnpaidTable({ rows }: { rows: UnpaidRow[] }) {
  return (
    <DataTable
      columns={columns} data={rows} rowId={(r) => r.id}
      searchPlaceholder="Rechercher une compagnie…" emptyMessage="Aucun impayé."
    />
  );
}
```

Créer `src/app/(admin)/facturation/impayes/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { formatMoney } from "@/lib/format";
import {
  EXPIRATION_DELAY_DAYS, SUSPENSION_DELAY_DAYS, subscriptionsRepo,
} from "@/lib/repos/billing";
import { UnpaidTable } from "./unpaid-table";

export const dynamic = "force-dynamic";

export default function UnpaidPage() {
  const rows = subscriptionsRepo.unpaidQueue(new Date());
  const pastDue = rows.filter((r) => r.status === "past_due").length;
  const suspended = rows.length - pastDue;
  const total = rows.reduce((sum, r) => sum + r.price, 0);
  return (
    <>
      <PageHeader
        title="Impayés"
        description="Abonnements impayés ou suspendus, du plus urgent au moins urgent."
      />
      <section aria-label="Indicateurs des impayés" className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Abonnements impayés" value={pastDue} tone={pastDue ? "danger" : "default"} />
        <KpiCard label="Abonnements suspendus" value={suspended} tone={suspended ? "warning" : "default"} />
        <KpiCard label="Montant en souffrance" value={formatMoney(total, rows[0]?.currency ?? "XOF")} />
        <KpiCard
          label="Délais appliqués"
          value={`${SUSPENSION_DELAY_DAYS} j / ${EXPIRATION_DELAY_DAYS} j`}
          hint={`Suspension ${SUSPENSION_DELAY_DAYS} jours après l'impayé, expiration ${EXPIRATION_DELAY_DAYS} jours après la suspension.`}
        />
      </section>
      <UnpaidTable rows={rows} />
    </>
  );
}
```

La date de référence est passée explicitement (`new Date()` au moment du rendu) : le dépôt ne lit jamais l'horloge lui-même, ce qui garde les tests déterministes.

- [ ] **Step 5: Lien depuis la Vue 360**

Dans `src/app/(admin)/page.tsx`, dans la carte « Impayés », remplacer la ligne :

```tsx
            {o.pastDue.length === 0 && <p className="text-sm text-muted-foreground">Aucun impayé.</p>}
```

par :

```tsx
            {o.pastDue.length === 0 && <p className="text-sm text-muted-foreground">Aucun impayé.</p>}
            <Link href="/facturation/impayes" className="inline-block pt-1 text-sm text-accent hover:underline">
              Voir la file des impayés
            </Link>
```

(`Link` est déjà importé dans ce fichier.) Le KPI « Abonnements impayés » et la liste de la carte lisent toujours `dashboardRepo.overview().pastDue` : même source, inchangée.

- [ ] **Step 6: Parcours E2E « impayé → relance réussie → abonnement actif »**

Ajouter dans `tests/e2e/backoffice.spec.ts`, avant le test `@prod` :

```ts
test("an unpaid subscription is relaunched from the queue; a refused payment keeps it unpaid", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Voir la file des impayés" }).click();
  await expect(page.getByRole("heading", { name: "Impayés", exact: true })).toBeVisible();
  await expect(page.getByRole("row").nth(1)).toContainText("Saint-Louis Route");

  // Saint-Louis Route: the seed makes its retry fail.
  await page.getByRole("button", { name: "Relancer le paiement de Saint-Louis Route" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Relancer", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Échec du paiement");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("row", { name: /Saint-Louis Route/ })).toHaveCount(1);

  // Baobab Lines: the seed makes its retry succeed.
  await page.getByRole("button", { name: "Relancer le paiement de Baobab Lines" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Relancer", exact: true }).click();
  await expect(page.getByRole("row", { name: /Baobab Lines/ })).toHaveCount(0);

  await page.goto("/facturation/abonnements");
  await page.getByPlaceholder("Rechercher un abonnement…").fill("baobab");
  await page.getByRole("row", { name: /Baobab Lines/ }).click();
  await expect(page.getByTestId("subscription-status")).toHaveText("Active");
  await page.getByRole("tab", { name: "Tentatives de paiement" }).click();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Payé", exact: true })).toHaveCount(2);
});
```

Baobab Lines a, dans la graine, une tentative payée (facture du mois −2) et deux échouées ; la relance ajoute la deuxième tentative payée. Radix ne monte que l'onglet actif, donc le décompte porte sur ce seul panneau.

- [ ] **Step 7: Vérifier**

Run:

```bash
pnpm typecheck && pnpm test
pnpm exec playwright test --project=dev -g "relaunched from the queue"
git checkout tsconfig.json
```

Expected : typecheck OK ; **169 tests** unitaires verts (165 + 4 `urgencyBadge`) ; Playwright : 1 test passe. Vérification manuelle : `/facturation/impayes` montre Saint-Louis Route (2 j, rouge), Baobab Lines (5 j, orange), Fatick Lines (17 j avant expiration, neutre) ; le lien de la Vue 360 y mène.

- [ ] **Step 8: Commit**

```bash
git add src/lib/labels.ts tests/unit/labels.test.ts src/components/data/data-table.tsx "src/app/(admin)/facturation/impayes" "src/app/(admin)/page.tsx" tests/e2e/backoffice.spec.ts
git commit -m "feat: unpaid queue sorted by urgency with in-list payment retry

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Navigation, fil d'Ariane, test de fuite `@prod` étendu, README et vérification finale

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 4 à 7.
- Produces: les 8 entrées « Offre et facturation » à `implemented: true` (plus de badge « bientôt », la palette de commandes et la barre latérale y mènent) ; `isLinkablePath` rend cliquables dans le fil d'Ariane `/offre/plans`, `/facturation/abonnements` et `/facturation/factures` quand on est sur une page de détail. La page attrape-tout `[...slug]` reste en place pour les routes non construites.

- [ ] **Step 1: Tests de navigation (échouants)**

Dans `tests/unit/nav.test.ts`, remplacer le test `marks only lot 1 pages as implemented` par :

```ts
  it("marks only lot 1 and lot 2 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual([
      "/", "/compagnies", "/compagnies/kyc",
      "/facturation/abonnements", "/facturation/factures", "/facturation/impayes", "/facturation/paiements",
      "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/plans", "/offre/types-documents-kyc",
    ]);
  });
```

et ajouter à la fin du fichier :

```ts
describe("isLinkablePath for lot 2 detail pages", () => {
  it("links the parent list of plan, subscription and invoice details, nothing else", () => {
    expect(isLinkablePath("/offre/plans/abc")).toBe(true);
    expect(isLinkablePath("/facturation/abonnements/abc")).toBe(true);
    expect(isLinkablePath("/facturation/factures/abc")).toBe(true);
    expect(isLinkablePath("/facturation/paiements/abc")).toBe(false);
    expect(isLinkablePath("/facturation")).toBe(false);
  });
});
```

Run: `pnpm test tests/unit/nav.test.ts` → FAIL (2 tests : seuls 3 chemins sont implémentés ; `/offre/plans/abc` n'est pas cliquable).

- [ ] **Step 2: Basculer la navigation**

Dans `src/lib/nav.ts`, remplacer la section « Offre et facturation » par :

```ts
  { label: "Offre et facturation", items: [
    { label: "Plans", href: "/offre/plans", implemented: true },
    { label: "Fonctionnalités", href: "/offre/fonctionnalites", implemented: true },
    { label: "Paliers partenaires", href: "/offre/paliers-partenaires", implemented: true },
    { label: "Types de documents KYC", href: "/offre/types-documents-kyc", implemented: true },
    { label: "Abonnements", href: "/facturation/abonnements", implemented: true },
    { label: "Paiements", href: "/facturation/paiements", implemented: true },
    { label: "Factures", href: "/facturation/factures", implemented: true },
    { label: "Impayés", href: "/facturation/impayes", implemented: true },
  ] },
```

et remplacer la ligne `const ROUTE_PREFIXES = ["/compagnies"];` par :

```ts
const ROUTE_PREFIXES = ["/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures"];
```

Run: `pnpm test tests/unit/nav.test.ts` → PASS (7 tests ; `recognises known paths` garde `/facturation/factures` comme chemin connu).

- [ ] **Step 3: Étendre le test de fuite `@prod`**

Dans `tests/e2e/backoffice.spec.ts`, remplacer intégralement le test `no contact e-mail or phone reaches the browser in page payloads @prod` par :

```ts
test("no contact e-mail or phone reaches the browser in page payloads @prod", async ({ page }) => {
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

  const CONTACT_EMAIL = /contact@[a-z0-9-]+\.sn/;
  const ANY_SN_EMAIL = /[a-z0-9._-]+@[a-z0-9-]+\.sn/;
  const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/];
  const paths = [
    "/compagnies", "/compagnies?statut=draft", "/compagnies/kyc", "/", companyPath,
    "/offre/plans", planPath, "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/types-documents-kyc",
    "/facturation/abonnements", "/facturation/abonnements?statut=past_due", subscriptionPath,
    "/facturation/paiements", "/facturation/paiements?statut=failed",
    "/facturation/factures", invoicePath, "/facturation/impayes",
  ];
  for (const path of paths) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(raw, `raw ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(raw, `raw ${path}`).not.toMatch(re);
    await page.goto(path);
    const rendered = await page.content();
    expect(rendered, `dom ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(rendered, `dom ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(rendered, `dom ${path}`).not.toMatch(re);
  }
});
```

`ANY_SN_EMAIL` attrape aussi les e-mails d'employés (`awa-diop@matam-express.sn`) ; les formes masquées (`a•••@matam-express.sn`) n'y correspondent pas car le caractère qui précède `@` est `•`. Matam Express a un abonnement expiré et deux factures : les quatre détails existent.

- [ ] **Step 4: README**

Dans `README.md` :

1. Remplacer la ligne `Lot 1 : socle, Vue 360, Compagnies, sur données statiques typées (aucun appel réseau).` par :

```markdown
Lot 1 : socle, Vue 360, Compagnies. Lot 2 : offre (plans, fonctionnalités, paliers partenaires, types de documents KYC) et facturation SaaS (abonnements, paiements, factures, impayés). Données statiques typées, aucun appel réseau.
```

2. Dans « Architecture », ajouter après la puce `src/app/(admin)` :

```markdown
- `src/lib/actions/run.ts` : point d'entrée commun des Server Actions (session vérifiée avant toute lecture ou écriture, résultat `ok`/erreur, motif ≤ 500 caractères). Les actions vivent dans `compagnies/actions.ts`, `facturation/actions.ts` et `offre/actions.ts`.
- `src/lib/repos/billing.ts` : plans, fonctionnalités, paliers, registre des types KYC (source de l'activation automatique), abonnements, factures, paiements et file des impayés. Les composants clients ne reçoivent que des projections (`PlanRow`, `SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `UnpaidRow`).
```

3. Remplacer la section `## Limites connues du lot 1` (titre et puces) par :

```markdown
## Limites connues (lots 1 et 2)

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Offre en lecture seule : ni création ni modification de plans, fonctionnalités ou paliers.
- Facturation simulée : la relance de paiement a un résultat déterministe fixé par la graine (Saint-Louis Route échoue, les autres réussissent) ; pas de PDF de facture, pas de proration ni de remboursement.
- Aucune transition automatique dans le temps : la file des impayés affiche un délai dépassé, mais rien ne suspend ni n'expire un abonnement tout seul.
- Désactiver un type de document KYC n'active aucune compagnie rétroactivement : l'activation se déclenche à l'approbation d'un document.
- Les sections autres que Vue 360, Compagnies, Offre et Facturation affichent « Bientôt disponible ».
- Navigation latérale masquée sous 768 px (outil de bureau).
```

- [ ] **Step 5: Revue de sécurité des frontières serveur → client**

Pour chaque composant client ajouté ou modifié par le lot, vérifier dans le code (`grep -n "use client" -r src` puis lecture) que ses props correspondent exactement à cette liste, que les imports depuis `@/lib/repos/billing` sont des `import type`, et qu'aucun n'importe `getStore`, un dépôt ou `@/lib/data/seed` :

| Composant client | Props reçues |
|---|---|
| `PlansTable` | `PlanRow[]` (9 clés) |
| `KycTypeToggle` | `code`, `name`, `active` |
| `KycPanel` (modifié) | `KycPanelCompany` (4 clés), `KycDocument[]`, `kycTypes` reconstruit (`code`, `name`, `required`, `active`) |
| `SubscriptionsTable` | `SubscriptionRow[]` (9 clés) |
| `SubscriptionActions` | `subscriptionId`, `companyName`, `canRetry`, `canCancel` |
| `RetryPaymentButton` | `subscriptionId`, `label` (nom de compagnie) |
| `PaymentsTable` | `PaymentRow[]` (11 clés) |
| `InvoicesTable` | `InvoiceRow[]` (9 clés) |
| `UnpaidTable` | `UnpaidRow[]` (10 clés) |

Run :

```bash
grep -rn 'from "@/lib/repos/billing"' src --include='*.tsx' | grep -v "import type"
grep -rlE '^"use client"' src | xargs grep -lE 'getStore|lib/data/seed|[a-zA-Z]+Repo\.'
```

La première commande ne doit lister que des fichiers `page.tsx` (Server Components ; les composants clients et `subscription-tabs.tsx` n'importent que des types, sur une seule ligne). La seconde ne doit rien afficher (code de sortie 1).

Si une ligne contredit le tableau, corriger le composant (projection), pas le tableau.

- [ ] **Step 6: Vérification complète**

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
- Vitest : **170 tests** verts (169 + 1 nouveau test dans `nav.test.ts` ; le test des chemins implémentés est remplacé, pas ajouté) ;
- build OK (toutes les routes `offre/*` et `facturation/*` apparaissent comme dynamiques `ƒ`) ;
- Playwright : **16 tests** passent (15 sur le projet `dev`, 1 sur le projet `prod`) ;
- `git status --short` ne montre ni `tsconfig.json` ni `next-env.d.ts`.

Si un sélecteur échoue, corriger le **composant** (libellé accessible, `data-testid`) plutôt que le test, sauf faute manifeste dans le test.

- [ ] **Step 7: Vérification visuelle (clair et sombre)**

`pnpm dev`, se connecter, parcourir dans les deux thèmes : `/offre/plans`, une fiche de plan, `/offre/fonctionnalites`, `/offre/paliers-partenaires`, `/offre/types-documents-kyc`, `/facturation/abonnements` (filtres), la fiche de Baobab Lines (4 onglets), `/facturation/paiements`, `/facturation/factures`, une facture, `/facturation/impayes`, la Vue 360. Vérifier : la barre latérale n'affiche plus « bientôt » sur la section « Offre et facturation », le fil d'Ariane d'une fiche (« Accueil › Facturation › Abonnements › Fiche ») rend « Abonnements » cliquable, contraste lisible, aucun débordement horizontal de la page. Arrêter le serveur.

- [ ] **Step 8: Commit final**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable offer and billing navigation, extend the payload leak test, update README

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Auto-revue

### Couverture du spec

| Exigence du spec | Tâche |
|---|---|
| Types `Plan`, `FeatureDef`, `PartnerTier`, `KycDocumentType`, `SubscriptionHistoryEntry`, `PaymentAttempt` ; `Subscription.planId/trialEndDate/pastDueSince` ; `Invoice.subscriptionId` | 1 |
| Graine : 3 plans + Legacy inactif, 6 fonctionnalités, 3 paliers, 6 types KYC, historique et tentatives cohérents (2 impayés, 1 suspendu, 1 expiré, 1 annulé, 2 essais, échecs pour les impayés), planName cohérents | 1 (`billing-seed.test.ts`) |
| `/offre/plans` (nom, prix mensuel et annuel, essai, abonnements en cours, statut) et `/offre/plans/[id]` (prix, frais, limites, fonctionnalités, abonnements liés) | 1 (dépôt), 4 (pages) |
| `/offre/fonctionnalites` (code, nom, type, plans qui l'incluent) | 1, 4 |
| `/offre/paliers-partenaires` (STANDARD 0/0, SILVER 6/5, GOLD 12/10, nombre de compagnies) | 1, 4 |
| `/offre/types-documents-kyc` + activer/désactiver ; type désactivé non exigé ; dernier type obligatoire actif protégé ; `companiesRepo` lit le registre | 1 (dépôt et branchement), 3 (action), 4 (page, panneau KYC, E2E) |
| `/facturation/abonnements` filtrable (essai, active, impayée, suspendue, expirée, annulée) | 2, 5 |
| `/facturation/abonnements/[id]` : onglets Résumé, Historique, Tentatives, Factures ; relance (`past_due`/`suspended`) ; annulation (motif obligatoire) | 2, 3, 5 |
| Relance : résultat déterministe par abonnement ; succès = tentative et facture payées, `active`, `pastDueSince` effacé, échéance + 1 mois ; échec = tentative échouée avec motif, statut inchangé | 1 (`retryOutcomes`), 2, 3 |
| Annulation : refus sur `canceled`/`expired`, `CANCELLATION` dans l'historique, motif dans l'activité de la compagnie | 2, 3, 5 |
| `/facturation/paiements` filtrable, liens facture et abonnement | 2, 6 |
| `/facturation/factures` et `/facturation/factures/[id]`, sans PDF | 2, 6 |
| `/facturation/impayes` trié par urgence, délais 7 j / 30 j affichés, date de référence injectée, relance dans la liste | 2, 7 |
| Navigation : entrées implémentées, `nav.test.ts` mis à jour, attrape-tout conservé | 8 |
| Vue 360 : KPI et panneau sur la même source, panneau lié à `/facturation/impayes` | 7 |
| Actions : session d'abord, `ActionResult`, motif ≤ 500, aucune écriture sans session | 3 |
| Projections client sans champ superflu (`SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `PlanRow`, `UnpaidRow`) | 1, 2 (tests `Object.keys`), 8 (revue) |
| Playwright : impayé → relance réussie → actif ; annuler avec motif ; désactiver un type KYC puis activer une compagnie ; lecture d'une facture ; `@prod` étendu aux nouvelles pages | 4, 5, 6, 7, 8 |
| Revue de sécurité des frontières serveur/client pour chaque composant client | 8 (Step 5) |
| Hors périmètre (création de plans, PDF, proration, remboursements, versements, API) | rappelé dans les contraintes et le README |

### Recherche de trous

Aucun « TBD », « TODO », « similaire à » ni étape sans code. Chaque étape de code donne le fichier complet ou le bloc exact à remplacer avec son ancre textuelle (Task 4 Step 7 et Task 5 Step 6 pour `company-tabs.tsx`, Task 7 Step 3 pour `data-table.tsx`, Task 7 Step 5 pour la Vue 360, Task 8 Step 2 pour `nav.ts`).

### Cohérence des noms et des types

- `resetStore(now?)`, `addActivity(companyId, actor, action, now?)` : définis en Task 1, utilisés en Tasks 1-3.
- `SubscriptionRow`, `subscriptionRow`, `companyName` : définis en Task 1 (internes pour les deux derniers), utilisés par `plansRepo.detail` (Task 1) puis par les dépôts de la Task 2.
- `LIVE_STATUSES` → `PlanRow.liveSubscriptions` → colonne « Abonnements en cours » (Task 4).
- `canRetry` / `canCancel` (fonctions, Task 2) → `SubscriptionDetail.canRetry/canCancel` → props de `SubscriptionActions` (Task 5).
- `RETRY_FAILURE_REASON` (Task 2) → message `Échec du paiement : …` (Task 3) → alerte attendue par l'E2E (Task 7).
- `retrySubscriptionPayment`, `cancelSubscription` (Task 3) → `RetryPaymentButton`, `SubscriptionActions` (Task 5) → `UnpaidTable` (Task 7).
- `setKycTypeActive(code, active, reason)` (Task 3) → `KycTypeToggle` appelle `setKycTypeActive(code, !active, reason)` (Task 4).
- `parseFilter` + `StatusFilterNav` (Task 5) → pages abonnements, paiements, factures (Tasks 5-6).
- `DetailRow` (Task 4) → détail de plan (Task 4), `SubscriptionTabs` (Task 5), détail de facture (Task 6).
- `urgencyBadge(deadline, daysLeft)` (Task 7) consomme `UnpaidRow["deadline"]` et `daysLeft` (Task 2).
- Libellés accessibles attendus par l'E2E et produits par les composants : `Désactiver <nom>` / `Réactiver <nom>` (`KycTypeToggle`), `Approuver <nom du type>` (`KycActions`, lot 1), `Annuler l'abonnement` et `Confirmer l'annulation` (`SubscriptionActions`), `Relancer le paiement de <compagnie>` et `Relancer` (`RetryPaymentButton`), `Voir la file des impayés` (Vue 360), `Voir l'abonnement` (détail de facture), placeholders `Rechercher un plan…`, `Rechercher un abonnement…`, `Rechercher une facture…`, `Rechercher un paiement…`, `Rechercher une compagnie…`, `data-testid` `kyc-type-status-<CODE>`, `subscription-status`, `invoice-status`, `plan-status`, `company-status` (lot 1).
- `DataTable.rowId` (Task 7) → `getRowId` de TanStack Table 8 (option vérifiée dans `table-core@8.21.3/build/lib/core/table.d.ts`) → utilisé par `UnpaidTable` seulement.
- Versions vérifiées dans `node_modules` : `@tanstack/react-table` 8.21.3 (API `ColumnDef<T, unknown>`, `accessorKey`, `enableSorting`, déjà utilisée par le lot 1), `next` 15.5.28 (`params`/`searchParams` en `Promise`), `react` 19.3.1, `vitest` 5.0.5, Node 24 (`crypto.randomUUID` global). Ni cmdk ni Recharts ne sont touchés par ce lot.

### Pré-validation

Le code de ce plan a été appliqué une fois, tel qu'écrit, dans une copie jetable du dépôt (hors du dépôt, `node_modules` partagé) : `tsc --noEmit` sans erreur, **170 tests Vitest** verts aux comptes annoncés tâche par tâche (119, 140, 160, 163, 165, 165, 169, 170), `next build` réussi (les 11 nouvelles routes en `ƒ`), et `pnpm exec playwright test` : **16 tests** passés (15 `dev` + 1 `prod`). Les mutations des Steps « Prouver » (Tasks 1, 2 et 3) ont été exécutées : chacune fait échouer exactement les tests nommés, et le retrait de `required.length > 0 &&` n'en fait échouer aucun, comme annoncé. Un défaut trouvé par cette pré-validation a été corrigé dans le plan : un `beforeEach(() => mock.mockRejectedValue(…))` à corps-expression renvoie le mock, que Vitest appelle comme fonction de nettoyage (le corps est désormais un bloc).
