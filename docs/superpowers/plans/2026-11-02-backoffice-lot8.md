# Backoffice Sira, lot 8 : conformité et audit. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les cinq entrées « Bientôt disponible » de la section « Conformité et audit » par de vraies pages sur données statiques typées : journal d'audit (liste et fiche avant/après), journal d'accès aux données, demandes de personnes concernées (liste, indicateurs de délai légal, traitement), consentements (compteurs d'états courants et consultation avec motif d'accès) et rétention des données, avec trois actions serveur : traiter une demande (prendre en charge, clôturer, rejeter), modifier la durée de rétention d'une compagnie et consulter les consentements d'un utilisateur.

**Architecture:** Même socle que les lots 1 à 7. Quatre collections rejoignent le store (`auditLogs`, `dataAccessLogs`, `consentRecords`, `dataSubjectRequests`) ; le `DsrRequest` provisoire du lot 1 disparaît et le tableau de bord lit les vraies demandes. Quatre graines (`seedDataSubjectRequests`, `seedConsents`, `seedAuditLogs`, `seedDataAccessLogs`) sont exécutées **en fin de `buildSeed`**, après la création des sessions. Un dépôt `src/lib/repos/compliance.ts` porte les projections client (adresses IP tronquées), les détails serveur, le workflow des demandes, la rétention et la consultation de consentements. Les actions passent par `run()` / `runValue()`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21, Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4 à 7 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ**. Le lot 4 fournit `CompanyFilter` (`src/components/fleet/company-filter.tsx`) et `parseCompanyFilter` (`src/lib/repos/fleet.ts`) ; le lot 3 les comptes, rôles et sessions (`store.users`, `store.sessions`) ; le lot 5 `Booking` ; le lot 6 `Parcel`/`ParcelHistoryEntry`/`Customer` ; `hashCode` n'est pas utilisé ici. **Vérifier ces noms par `grep` avant de commencer** et adapter le plan s'ils ont changé.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : toutes passent par `run()` ou `runValue()` (session vérifiée **avant** toute lecture ou écriture), renvoient un résultat typé et ne lèvent jamais d'exception pour un échec attendu.
- Règles sensibles (messages exacts) :
  - `dsrRepo.transition` : demande existante (`"Demande introuvable"`) → notes de résolution non vides pour une clôture ou un rejet (`"Des notes de résolution sont obligatoires"`) → transition permise : demande close (`"Cette demande est déjà close"`), déjà prise en charge (`"Cette demande est déjà prise en charge"`), clôture ou rejet d'une demande reçue (`"Une demande reçue doit d'abord être prise en charge"`). Notes rognées, **500 caractères au plus** (`requireReason` : `"Motif trop long (500 caractères maximum)"`), jamais tronquées.
  - `retentionRepo.set` : compagnie existante (`"Compagnie introuvable"`) → motif (`"Un motif est obligatoire"`) → entier entre 90 et 3650 (`"La durée doit être un nombre entier de jours compris entre 90 et 3650"`) → différent de la durée effective (`"La durée de rétention est déjà de <n> jours"`).
  - `consentsRepo.consult` : motif d'accès parmi `SUPPORT_REQUEST`, `LEGAL_OBLIGATION`, `SERVICE_DELIVERY`, `INVESTIGATION` (`"Motif d'accès invalide"`) → utilisateur existant (`"Utilisateur introuvable"`). Un appel refusé n'écrit aucune ligne.
- Les journaux (`auditLogs`, `dataAccessLogs`, `consentRecords`) sont **en ajout seul** : aucun dépôt n'expose de mutation d'une ligne existante ; un test structurel (`Object.keys` des dépôts, ou comparaison avant/après) l'épingle.
- Le journal d'activité du backoffice ne contient jamais d'e-mail, de téléphone ni de notes de résolution.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `AuditLog`, `DataAccessLog`, `ConsentRecord`, `DataSubjectRequest` ni un `*Detail` ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. Les adresses IP sont tronquées par `truncateIp` avant de quitter le serveur. Les imports depuis `@/lib/repos/compliance` dans un composant client sont des `import type`. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (rétention) n'a **pas** de `rowHref` et a un `rowId`.
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, notes et motif ≤ 500, chaque garde de chaque règle, leur ordre, ajout seul des journaux, IP tronquée, consultation refusée sans écriture) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création de demandes ou de consentements ; export des journaux ; simulation du job d'anonymisation ; alertes de retard ; journalisation des révélations des lots 3, 6 et 7 dans le journal d'accès ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Identifiants** : préfixes `uid(61, …)` demandes, `uid(62, …)` consentements, `uid(63, …)` journal d'audit, `uid(64, …)` journal d'accès (les préfixes jusqu'à 55 sont pris, 11 était l'ancien `dsr` ; vérifier par `grep -n "uid(6[1-4]" src/lib/data/seed.ts` : aucune occurrence attendue).
2. **Ordre de la graine** : les graines de ce lot sont appelées **juste avant `return store;`** de `buildSeed`, dans l'ordre `seedDataSubjectRequests`, `seedConsents`, `seedAuditLogs`, `seedDataAccessLogs`. Elles lisent `store.sessions`, créées après les graines des lots 5 à 7 : un appel plus tôt verrait des sessions vides.
3. **Remplacement de `dsr`** : `Store.dsr`, le type `DsrRequest` et l'ancienne affectation `store.dsr = [...]` sont supprimés ; `dashboardRepo.overview().dsr` devient `{ id, requestType, requesterName, dueDate, daysLeft }[]` (demandes **ouvertes** seulement, par jours restants croissants) et `src/app/(admin)/page.tsx` affiche le nom du demandeur à la place de `requesterRef`. Le test existant `computes days left for data-subject requests, soonest first` reste valable (une demande ouverte est en retard).
4. **Durées de rétention existantes** : la graine du lot 1 donne 365 jours aux compagnies d'indice multiple de 4 (`i % 4 === 0`), les autres n'en ont pas (730 par défaut). Ce lot ne change pas ces valeurs ; il **anonymise** à la graine les lignes d'audit plus anciennes que la durée de leur compagnie. « Casamance Trans » (indice 5, créée il y a 325 jours) n'a pas de durée propre : c'est la compagnie possédée par le test E2E de rétention.
5. **Lignes d'historique d'abonnement** : pour chaque compagnie active, trois lignes `UPDATE CompanySubscription` placées à 20 %, 50 % et 80 % de l'âge de la compagnie (jamais avant sa création). Pour « Casamance Trans », cela place des lignes à 65, 162 et 260 jours, plus la création (325 jours) et l'activation (305 jours) : raccourcir sa durée à 90 jours en laisse **au moins 4 non anonymisées**.
6. **Libellé d'acteur** : une ligne écrite par une action du backoffice porte `actorUserId = null`, `actorLabel = <identité de la session>`, `actorType = "USER"`, `ipAddress = null`, `userAgent = null` ; une ligne d'accès porte `accessedByUserId = null`, `accessedByLabel = <identité de la session>`, `ipAddress = null`. L'affichage utilise `actorLabel ?? nom du compte ?? "Système"`.
7. **Boutons** : « Prendre en charge » n'apparaît que pour une demande `RECEIVED` ; « Clôturer la demande » et « Rejeter la demande » apparaissent pour toute demande **ouverte** (`RECEIVED` ou `IN_PROGRESS`), le serveur refusant la clôture ou le rejet d'une demande reçue : c'est ce qui rend le refus jouable en E2E. Une demande close n'a aucun bouton et affiche une note.
8. **Notes de résolution** : le dialogue réutilise `ConfirmDialog` (`requireReason`) dont le champ s'appelle « Motif (obligatoire) ». Le message de dépassement de longueur est donc celui de `requireReason` (« Motif trop long… »).
9. **Anonymisation à la graine** : une ligne d'audit de compagnie plus ancienne (`>`, strictement) que la durée effective de sa compagnie a `ipAddress = userAgent = null` ; une ligne `UPDATE RetentionPurge` (acteur système, service `audit-compliance-service`, compagnie nulle) est ajoutée à 03:15 UTC du jour de la graine (la veille si cette heure est dans le futur) avec le nombre de lignes réellement modifiées. Les lignes sans compagnie ne sont jamais anonymisées (le job suit la durée de la compagnie, ou 730 jours si la compagnie est inconnue : non semé).
10. **Test E2E du lot 1 `unimplemented sections show a coming-soon page`** : le lot 7 l'a fait pointer sur `/conformite/journal-audit`, qui devient une vraie page ici ; il pointe désormais sur `/supervision/services`.

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `a received request is taken in charge` | demande « Ndèye Diouf — Accès » | `IN_PROGRESS`, 3 lignes de journal |
| `an in-progress request is closed with resolution notes` | demande « Lamine Camara — Effacement » | `COMPLETED`, 3 lignes de journal |
| `an in-progress request is rejected with resolution notes` | demande « Aïssatou Sarr — Opposition » | `REJECTED`, 3 lignes de journal |
| `a received request cannot be closed before it is taken in charge` | demande « Pape Mbaye — Rectification » | lecture seule (refus) |
| `a closed request offers no action` | demande « Aïssatou Sarr — Portabilité » | lecture seule |
| `consulting the consents of a user needs an access reason and is logged` | utilisateur « Aïssatou Sarr » | une ligne dans le journal d'accès |
| `a company's retention can be shortened within the allowed range` | compagnie « Casamance Trans » | durée 90 jours, une entrée d'activité, une ligne d'audit |

Les autres tests sont en lecture seule. Le test de consultation et celui de la clôture n'interfèrent pas : ils ne partagent aucune entité.

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) journaux, consentements, demandes + unions ; DsrRequest supprimé
src/lib/data/seed.ts                           (modifié) Store étendu, 4 graines ; dsr supprimé
src/lib/actions/run.ts                         (modifié) runValue
src/lib/repos/dashboard.ts                     (modifié) dsr depuis dataSubjectRequests
src/app/(admin)/page.tsx                       (modifié) libellé et nom du demandeur
src/lib/repos/compliance.ts                    (créé)   dépôts, projections, workflow, rétention, consultation
src/lib/labels.ts                              (modifié) badges et libellés
src/app/(admin)/conformite/actions.ts          (créé)   5 actions
src/components/compliance/{dsr-actions,consent-lookup,retention-table}.tsx   (créés)
src/app/(admin)/conformite/journal-audit/{page,audit-table}.tsx, journal-audit/[id]/{page,not-found}.tsx   (créés)
src/app/(admin)/conformite/acces-donnees/{page,access-table}.tsx                                             (créés)
src/app/(admin)/conformite/demandes-rgpd/{page,requests-table}.tsx, demandes-rgpd/[id]/{page,not-found}.tsx (créés)
src/app/(admin)/conformite/consentements/page.tsx                                                            (créé)
src/app/(admin)/conformite/retention/page.tsx                                                                (créé)
src/lib/nav.ts                                 (modifié) 5 entrées implémentées, libellés, préfixes
tests/unit/{compliance-dsr-seed,compliance-journals-seed,compliance-repo,compliance-rules,compliance-actions,run-value}.test.ts   (créés)
tests/unit/{labels,nav,dashboard-repo}.test.ts (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

---
### Task 1: Types, demandes de personnes concernées et tableau de bord (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`, `src/lib/actions/run.ts`, `src/lib/repos/dashboard.ts`, `src/app/(admin)/page.tsx`, `src/lib/labels.ts`, `tests/unit/labels.test.ts`, `tests/unit/dashboard-repo.test.ts`
- Create: `tests/unit/compliance-dsr-seed.test.ts`, `tests/unit/run-value.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)`, `uid`, `iso`, `store.users` (clients et employés, lot 3), `store.companies`.
- Produces: types ci-dessous ; `Store.dataSubjectRequests` (et `auditLogs`, `dataAccessLogs`, `consentRecords` ajoutés vides, remplis aux Tasks 2) ; `seedDataSubjectRequests(store, iso)` ; `runValue<T>` ; `dsrTypeLabel`, `dsrStatusBadge` dans `labels.ts`.

- [ ] **Step 1: Types**

Dans `src/lib/types/index.ts`, **supprimer** l'interface `DsrRequest`, puis ajouter à la fin du fichier :

```ts
export type DsrType = "ACCESS" | "RECTIFICATION" | "ERASURE" | "PORTABILITY" | "RESTRICTION" | "OBJECTION";
export type DsrStatus = "RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

/** Data-subject request (`audit-compliance-service`). Replaces the lot 1 `DsrRequest` stub. */
export interface DataSubjectRequest {
  id: string; requesterUserId: string;
  /** `null` for a platform-level request. */
  companyId: string | null;
  requestType: DsrType; status: DsrStatus; reason: string;
  /** Label of the backoffice identity that handled it (the dbml points to an Employee). */
  handledBy: string | null;
  /** Creation plus 30 days. */
  dueDate: string; resolvedAt: string | null; resolutionNotes: string | null; createdAt: string;
}

export type ConsentType = "MARKETING_EMAIL" | "MARKETING_SMS" | "DATA_SHARING_PARTNERS" | "COOKIES_ANALYTICS" | "GEOLOCATION";
export type ConsentStatus = "GRANTED" | "WITHDRAWN";
export type ConsentSource = "SIGNUP" | "SETTINGS_PAGE" | "BOOKING_FLOW";

/** Append-only consent history: one row per change, never rewritten. */
export interface ConsentRecord {
  id: string; userId: string; consentType: ConsentType;
  /** Required for the two marketing types, forbidden otherwise (a legacy marketing row may lack it). */
  companyId: string | null;
  status: ConsentStatus; consentVersion: string; source: ConsentSource;
  grantedAt: string | null; withdrawnAt: string | null; createdAt: string;
}

export type AuditActorType = "USER" | "EMPLOYEE" | "SYSTEM" | "API_KEY";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGIN_FAILED" | "EXPORT" | "PERMISSION_CHANGE";

/** Append-only audit trail line. Origin fields are `null` once anonymised by the retention job. */
export interface AuditLog {
  id: string; companyId: string | null;
  actorUserId: string | null;
  /** Backoffice identity when the line was written by a backoffice action (not a platform account). */
  actorLabel: string | null;
  actorType: AuditActorType; action: AuditAction; entityType: string; entityId: string;
  beforeState: Record<string, string> | null; afterState: Record<string, string> | null;
  ipAddress: string | null; userAgent: string | null;
  sourceService: string | null; occurredAt: string | null; createdAt: string;
}

export type DataSubjectType = "CUSTOMER" | "EMPLOYEE" | "USER";
export type DataCategory = "IDENTITY" | "FINANCIAL" | "LOCATION" | "HEALTH" | "CONTACT" | "CONSENT";
export type AccessReason = "SUPPORT_REQUEST" | "LEGAL_OBLIGATION" | "SERVICE_DELIVERY" | "INVESTIGATION";
export type AccessType = "VIEW" | "EXPORT" | "MODIFY" | "DELETE";

/** Append-only log of accesses to personal data. */
export interface DataAccessLog {
  id: string; accessedByUserId: string | null; accessedByLabel: string | null;
  dataSubjectType: DataSubjectType; dataSubjectId: string; dataCategory: DataCategory;
  accessReason: AccessReason; accessType: AccessType; ipAddress: string | null; createdAt: string;
}
```

- [ ] **Step 2: `runValue` (rouge puis vert)**

Créer `tests/unit/run-value.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { runValue } from "@/lib/actions/run";

beforeEach(() => {
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "tester@sira.app", stage: "full", exp: 9999999999 });
});

describe("runValue", () => {
  it("runs the body with the session actor and returns its structured value", async () => {
    const body = vi.fn((actor: string) => ({ actor, items: [1, 2] }));
    expect(await runValue(body)).toEqual({ ok: true, value: { actor: "tester@sira.app", items: [1, 2] } });
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("never runs the body without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn(() => "secret");
    expect(await runValue(body)).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect(body).not.toHaveBeenCalled();
  });

  it("turns an expected failure into an error result carrying its message", async () => {
    expect(await runValue(() => { throw new Error("Utilisateur introuvable"); })).toEqual({
      ok: false, error: "Utilisateur introuvable",
    });
    expect(await runValue(() => { throw "boom"; })).toEqual({ ok: false, error: "Action impossible" });
  });
});
```

Run: `pnpm test tests/unit/run-value.test.ts` → FAIL. Puis, dans `src/lib/actions/run.ts`, ajouter à la fin :

```ts
export type ValueResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Same contract as `runReveal` for an action that hands back a structured value (the body journals what it needs
 * before returning): the session is checked first, and the value only leaves the server when the body succeeds.
 */
export async function runValue<T>(body: (actor: string) => T): Promise<ValueResult<T>> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    return { ok: true, value: body(actor) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
```

Run: `pnpm test tests/unit/run-value.test.ts` → PASS.

- [ ] **Step 3: Libellés des demandes (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";

describe("data-subject request labels", () => {
  it("labels types and statuses", () => {
    expect(dsrTypeLabel("ACCESS")).toBe("Accès");
    expect(dsrTypeLabel("RECTIFICATION")).toBe("Rectification");
    expect(dsrTypeLabel("ERASURE")).toBe("Effacement");
    expect(dsrTypeLabel("PORTABILITY")).toBe("Portabilité");
    expect(dsrTypeLabel("RESTRICTION")).toBe("Limitation");
    expect(dsrTypeLabel("OBJECTION")).toBe("Opposition");
    expect(dsrStatusBadge("RECEIVED")).toEqual({ label: "Reçue", tone: "warning" });
    expect(dsrStatusBadge("IN_PROGRESS")).toEqual({ label: "En cours", tone: "info" });
    expect(dsrStatusBadge("COMPLETED")).toEqual({ label: "Clôturée", tone: "success" });
    expect(dsrStatusBadge("REJECTED")).toEqual({ label: "Rejetée", tone: "neutral" });
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `DsrStatus`, `DsrType`, puis ajouter à la fin :

```ts
export const dsrTypeLabel = (t: DsrType): string =>
  ({
    ACCESS: "Accès", RECTIFICATION: "Rectification", ERASURE: "Effacement",
    PORTABILITY: "Portabilité", RESTRICTION: "Limitation", OBJECTION: "Opposition",
  })[t];

export const dsrStatusBadge = (s: DsrStatus): Badge =>
  pick({
    RECEIVED: { label: "Reçue", tone: "warning" },
    IN_PROGRESS: { label: "En cours", tone: "info" },
    COMPLETED: { label: "Clôturée", tone: "success" },
    REJECTED: { label: "Rejetée", tone: "neutral" },
  }, s);
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant, vert après).

- [ ] **Step 4: Test de graine des demandes (rouge)**

Créer `tests/unit/compliance-dsr-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DsrType } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const requestOf = (name: string, type: DsrType) => {
  const s = getStore();
  const found = s.dataSubjectRequests.filter(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  );
  expect(found, `${name} / ${type}`).toHaveLength(1);
  return found[0]!;
};

describe("data-subject requests seed", () => {
  it("has ten requests covering the four statuses and the six types", () => {
    const list = getStore().dataSubjectRequests;
    expect(list).toHaveLength(10);
    expect(new Set(list.map((r) => r.status))).toEqual(new Set(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]));
    expect(new Set(list.map((r) => r.requestType))).toEqual(
      new Set(["ACCESS", "RECTIFICATION", "ERASURE", "PORTABILITY", "RESTRICTION", "OBJECTION"]),
    );
    expect(new Set(list.map((r) => r.id)).size).toBe(10);
  });

  it("links each request to an existing requester and, when set, to the requester's company", () => {
    const s = getStore();
    for (const r of s.dataSubjectRequests) {
      const user = s.users.find((u) => u.id === r.requesterUserId)!;
      expect(user).toBeDefined();
      if (r.companyId) expect(r.companyId).toBe(user.companyId);
      expect(r.reason.length).toBeGreaterThan(10);
    }
    expect(s.dataSubjectRequests.some((r) => r.companyId !== null)).toBe(true);
    expect(s.dataSubjectRequests.some((r) => r.companyId === null)).toBe(true);
  });

  it("sets the legal deadline thirty days after creation and never creates a request in the future", () => {
    for (const r of getStore().dataSubjectRequests) {
      expect(Date.parse(r.dueDate) - Date.parse(r.createdAt)).toBe(30 * DAY);
      expect(Date.parse(r.createdAt)).toBeLessThan(NOW.getTime());
    }
  });

  it("fills handler, resolution date and notes only where the status calls for them", () => {
    for (const r of getStore().dataSubjectRequests) {
      const closed = r.status === "COMPLETED" || r.status === "REJECTED";
      expect(r.resolvedAt !== null).toBe(closed);
      expect(r.resolutionNotes !== null).toBe(closed);
      expect(r.handledBy !== null).toBe(r.status !== "RECEIVED");
      if (r.resolvedAt) {
        expect(r.resolvedAt >= r.createdAt).toBe(true);
        expect(Date.parse(r.resolvedAt)).toBeLessThan(NOW.getTime());
      }
    }
  });

  it("has exactly one open request past its deadline", () => {
    const overdue = getStore().dataSubjectRequests.filter(
      (r) => (r.status === "RECEIVED" || r.status === "IN_PROGRESS") && Date.parse(r.dueDate) < NOW.getTime(),
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0]!.requestType).toBe("RECTIFICATION");
  });

  it("names the five E2E scenarios with unique requester and type pairs", () => {
    expect(requestOf("Ndèye Diouf", "ACCESS").status).toBe("RECEIVED");
    expect(requestOf("Lamine Camara", "ERASURE").status).toBe("IN_PROGRESS");
    expect(requestOf("Aïssatou Sarr", "OBJECTION").status).toBe("IN_PROGRESS");
    expect(requestOf("Pape Mbaye", "RECTIFICATION").status).toBe("RECEIVED");
    expect(requestOf("Aïssatou Sarr", "PORTABILITY").status).toBe("COMPLETED");
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().dataSubjectRequests)).not.toMatch(/@|\+221/);
  });
});
```

- [ ] **Step 5: Constater l'échec**

Run: `pnpm test tests/unit/compliance-dsr-seed.test.ts` → FAIL (`dataSubjectRequests` indéfini).

- [ ] **Step 6: Étendre le store et écrire la graine**

Dans `src/lib/data/seed.ts` :

1. Dans l'import de types : **retirer** `DsrRequest` ; ajouter `AccessReason`, `AccessType`, `AuditAction`, `AuditActorType`, `AuditLog`, `ConsentRecord`, `ConsentSource`, `ConsentStatus`, `ConsentType`, `DataAccessLog`, `DataCategory`, `DataSubjectRequest`, `DataSubjectType`, `DsrStatus`, `DsrType`.
2. Dans `interface Store` : **remplacer** `dsr: DsrRequest[];` par :

```ts
  dataSubjectRequests: DataSubjectRequest[];
  consentRecords: ConsentRecord[];
  auditLogs: AuditLog[];
  dataAccessLogs: DataAccessLog[];
```

3. Dans le littéral de `buildSeed` : remplacer `incidents: [], dsr: [],` par `incidents: [], dataSubjectRequests: [], consentRecords: [], auditLogs: [], dataAccessLogs: [],` (la ligne actuelle est `activity: [], services: [], incidents: [], dsr: [],`).
4. **Supprimer** le bloc `store.dsr = [ … ];` (les trois demandes provisoires).
5. Juste avant `return store;` de `buildSeed`, ajouter :

```ts
  seedDataSubjectRequests(store, iso);
```

6. À la fin du fichier, ajouter :

```ts
/**
 * Ten data-subject requests: four statuses, six types, one open request past its deadline. The five scenario
 * requests use unique (requester, type) pairs among the client accounts.
 */
function seedDataSubjectRequests(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const client = (displayName: string) => store.users.find((u) => u.displayName === displayName && u.roleCode === "USER" && u.companyId === null)!;
  const staff = store.users.filter((u) => u.companyId !== null);

  interface Def {
    who: PlatformUser; type: DsrType; status: DsrStatus; createdDays: number; reason: string;
    resolvedDays?: number; notes?: string;
  }
  const defs: Def[] = [
    { who: client("Ndèye Diouf"), type: "ACCESS", status: "RECEIVED", createdDays: -10, reason: "Je souhaite obtenir une copie de mes données personnelles." },
    { who: client("Lamine Camara"), type: "ERASURE", status: "IN_PROGRESS", createdDays: -27, reason: "Je demande la suppression de mon compte entreprise." },
    { who: client("Aïssatou Sarr"), type: "OBJECTION", status: "IN_PROGRESS", createdDays: -20, reason: "Je m'oppose à l'usage de mes données à des fins commerciales." },
    { who: client("Pape Mbaye"), type: "RECTIFICATION", status: "RECEIVED", createdDays: -32, reason: "Mon nom est mal orthographié sur mes billets." },
    { who: client("Aïssatou Sarr"), type: "PORTABILITY", status: "COMPLETED", createdDays: -50, resolvedDays: -30, reason: "Je veux récupérer mes données dans un format lisible.", notes: "Export transmis au demandeur." },
    { who: client("Pape Mbaye"), type: "RESTRICTION", status: "RECEIVED", createdDays: -5, reason: "Je demande la limitation du traitement de mes données le temps d'une vérification." },
    { who: client("Ndèye Diouf"), type: "ERASURE", status: "COMPLETED", createdDays: -60, resolvedDays: -35, reason: "Je demande l'effacement de mon ancien compte.", notes: "Données effacées, journaux d'audit conservés." },
    { who: client("Lamine Camara"), type: "ACCESS", status: "REJECTED", createdDays: -45, resolvedDays: -40, reason: "Je demande l'accès aux données d'un tiers.", notes: "Identité du demandeur non vérifiée." },
    { who: staff[0]!, type: "ACCESS", status: "COMPLETED", createdDays: -40, resolvedDays: -25, reason: "Je demande l'accès à ma fiche employé.", notes: "Copie transmise par la compagnie." },
    { who: staff[1]!, type: "PORTABILITY", status: "RECEIVED", createdDays: -8, reason: "Je souhaite transférer mes données vers un autre service." },
  ];

  for (const d of defs) {
    store.dataSubjectRequests.push({
      id: uid(61, seq++), requesterUserId: d.who.id, companyId: d.who.companyId, requestType: d.type, status: d.status,
      reason: d.reason, handledBy: d.status === "RECEIVED" ? null : "admin@sira.app",
      dueDate: iso(d.createdDays + 30), resolvedAt: d.resolvedDays === undefined ? null : iso(d.resolvedDays),
      resolutionNotes: d.notes ?? null, createdAt: iso(d.createdDays),
    });
  }
}
```

Les graines des journaux (Task 2) ajoutent leurs appels à la suite de `seedDataSubjectRequests(store, iso);`. `PlatformUser` doit être importé depuis `@/lib/types` s'il ne l'est pas déjà dans `seed.ts`.

- [ ] **Step 7: Migrer le tableau de bord**

Dans `src/lib/repos/dashboard.ts` : remplacer l'import de types par `import type { ActivityEntry, DsrType, Incident, ServiceHealth, Subscription } from "@/lib/types";`, remplacer la ligne `dsr: (DsrRequest & { daysLeft: number })[];` de `Overview` par :

```ts
  dsr: { id: string; requestType: DsrType; requesterName: string; dueDate: string; daysLeft: number }[];
```

et remplacer le calcul de `dsr` (le bloc `dsr: s.dsr.map(...).sort(...)`) par :

```ts
      dsr: s.dataSubjectRequests
        .filter((d) => d.status === "RECEIVED" || d.status === "IN_PROGRESS")
        .map((d) => ({
          id: d.id, requestType: d.requestType, dueDate: d.dueDate,
          requesterName: s.users.find((u) => u.id === d.requesterUserId)?.displayName ?? "—",
          daysLeft: Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / DAY),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
```

Dans `src/app/(admin)/page.tsx` : supprimer la constante `DSR_LABEL`, importer `dsrTypeLabel` de `@/lib/labels` (ajouter à l'import existant de `labels` s'il y en a un), et remplacer `{DSR_LABEL[d.type]} <span …>({d.requesterRef})</span>` par `{dsrTypeLabel(d.requestType)} <span className="text-xs text-muted-foreground">({d.requesterName})</span>`.

Ajouter à la fin de `tests/unit/dashboard-repo.test.ts`, dans le `describe` existant (ou un nouveau) :

```ts
  it("lists only open data-subject requests with the requester's name", () => {
    const s = getStore();
    const o = dashboardRepo.overview(new Date());
    const open = s.dataSubjectRequests.filter((d) => d.status === "RECEIVED" || d.status === "IN_PROGRESS");
    expect(o.dsr).toHaveLength(open.length);
    expect(o.dsr.length).toBeGreaterThan(0);
    for (const d of o.dsr) {
      const source = open.find((x) => x.id === d.id)!;
      expect(d.requesterName).toBe(s.users.find((u) => u.id === source.requesterUserId)!.displayName);
      expect(Object.keys(d).sort()).toEqual(["daysLeft", "dueDate", "id", "requestType", "requesterName"]);
    }
  });
```

(importer `getStore` de `@/lib/repos/store` si le fichier ne l'importe pas.)

- [ ] **Step 8: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. Vérifier à la main que `grep -rn "DsrRequest\|requesterRef\|\.dsr\b" src tests` ne renvoie plus rien.

- [ ] **Step 9: Commit**

```bash
git add src tests
git commit -m "feat: data-subject requests seed, compliance types, runValue and dashboard migration

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Graines des consentements, du journal d'audit et du journal d'accès (TDD)

**Files:**
- Modify: `src/lib/data/seed.ts`
- Create: `tests/unit/compliance-journals-seed.test.ts`

**Interfaces:**
- Consumes: `store.users`, `store.sessions`, `store.companies`, `store.subscriptions`, `store.bookings`, `store.parcels`, `store.parcelHistory`, `store.loyaltyPrograms`, `store.dataSubjectRequests`.
- Produces: `store.consentRecords`, `store.auditLogs`, `store.dataAccessLogs` remplis ; fonctions `seedConsents(store, iso)`, `seedAuditLogs(store, now, iso)`, `seedDataAccessLogs(store, now)` ; constante `DEFAULT_RETENTION_DAYS` (locale à `seed.ts`).

- [ ] **Step 1: Test (rouge)**

Créer `tests/unit/compliance-journals-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { AuditLog } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const retentionDays = (companyId: string) => getStore().companies.find((c) => c.id === companyId)!.dataRetentionDays ?? 730;
const isOlderThanRetention = (a: AuditLog) =>
  a.companyId !== null && NOW.getTime() - Date.parse(a.createdAt) > retentionDays(a.companyId) * DAY;

describe("consent records seed", () => {
  it("keeps the history append-only and coherent: grant and withdrawal dates, company scope, existing users", () => {
    const s = getStore();
    expect(s.consentRecords.length).toBeGreaterThan(25);
    expect(new Set(s.consentRecords.map((r) => r.id)).size).toBe(s.consentRecords.length);
    for (const r of s.consentRecords) {
      expect(s.users.some((u) => u.id === r.userId)).toBe(true);
      expect(r.grantedAt !== null).toBe(r.status === "GRANTED");
      expect(r.withdrawnAt !== null).toBe(r.status === "WITHDRAWN");
      expect(r.createdAt).toBe(r.grantedAt ?? r.withdrawnAt);
      expect(Date.parse(r.createdAt)).toBeLessThan(NOW.getTime());
      if (r.companyId) expect(["MARKETING_EMAIL", "MARKETING_SMS"]).toContain(r.consentType);
      else if (r.consentType.startsWith("MARKETING")) expect(r.consentVersion).toBe("v1.0");
    }
  });

  it("covers the five consent types, both statuses and the three sources", () => {
    const s = getStore();
    expect(new Set(s.consentRecords.map((r) => r.consentType))).toEqual(
      new Set(["MARKETING_EMAIL", "MARKETING_SMS", "DATA_SHARING_PARTNERS", "COOKIES_ANALYTICS", "GEOLOCATION"]),
    );
    expect(new Set(s.consentRecords.map((r) => r.status))).toEqual(new Set(["GRANTED", "WITHDRAWN"]));
    expect(new Set(s.consentRecords.map((r) => r.source))).toEqual(new Set(["SIGNUP", "SETTINGS_PAGE", "BOOKING_FLOW"]));
  });

  it("only withdraws what had been granted earlier for the same user, type and company", () => {
    const s = getStore();
    for (const w of s.consentRecords.filter((r) => r.status === "WITHDRAWN")) {
      const earlier = s.consentRecords.filter((r) =>
        r.userId === w.userId && r.consentType === w.consentType && r.companyId === w.companyId
        && r.status === "GRANTED" && r.createdAt < w.createdAt);
      expect(earlier.length, w.id).toBeGreaterThan(0);
    }
  });

  it("has one legacy marketing row without a company, and marketing consents for several companies", () => {
    const s = getStore();
    expect(s.consentRecords.filter((r) => r.consentType === "MARKETING_EMAIL" && r.companyId === null)).toHaveLength(1);
    const companies = new Set(s.consentRecords.filter((r) => r.companyId).map((r) => r.companyId));
    expect(companies.size).toBeGreaterThan(1);
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().consentRecords)).not.toMatch(/@|\+221/);
  });
});

describe("audit log seed", () => {
  it("is large, unique and never in the future, with the producer's clock only where a source is given", () => {
    const list = getStore().auditLogs;
    expect(list.length).toBeGreaterThan(300);
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
    for (const a of list) {
      expect(Date.parse(a.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      expect(a.entityId.length).toBeGreaterThan(0);
      expect(a.sourceService).not.toBeNull();
      expect(a.occurredAt).toBe(a.createdAt);
    }
  });

  it("references existing companies and actors and keeps actor types coherent", () => {
    const s = getStore();
    for (const a of s.auditLogs) {
      if (a.companyId) expect(s.companies.some((c) => c.id === a.companyId)).toBe(true);
      if (a.actorUserId) expect(s.users.some((u) => u.id === a.actorUserId)).toBe(true);
      if (a.actorType === "USER") expect(a.actorUserId).not.toBeNull();
      if (a.actorType === "SYSTEM") expect(a.actorUserId).toBeNull();
      expect(a.actorLabel).toBeNull();
    }
  });

  it("covers creation, update, login, failed login, permission change and the retention purge", () => {
    const s = getStore();
    expect(new Set(s.auditLogs.map((a) => a.action))).toEqual(
      new Set(["CREATE", "UPDATE", "LOGIN", "LOGIN_FAILED", "PERMISSION_CHANGE"]),
    );
    expect(new Set(s.auditLogs.map((a) => a.sourceService))).toEqual(new Set([
      "company-service", "identity-service", "booking-service", "parcel-service", "audit-compliance-service",
    ]));
    const logins = s.auditLogs.filter((a) => a.action === "LOGIN");
    expect(logins).toHaveLength(s.sessions.length);
    const failed = s.auditLogs.filter((a) => a.action === "LOGIN_FAILED");
    expect(failed).toHaveLength(s.users.filter((u) => u.status === "suspended").length);
    for (const a of failed) expect(a.afterState).toEqual({ reason: "ACCOUNT_NOT_ACTIVE" });
  });

  it("derives one booking line per booking and one parcel line per status change", () => {
    const s = getStore();
    expect(s.auditLogs.filter((a) => a.entityType === "Booking")).toHaveLength(s.bookings.length);
    expect(s.auditLogs.filter((a) => a.entityType === "Parcel")).toHaveLength(
      s.parcelHistory.filter((h) => h.previousStatus !== null).length,
    );
    const first = s.auditLogs.find((a) => a.entityType === "Parcel")!;
    expect(first.beforeState!.status).toBeDefined();
    expect(first.afterState!.status).toBeDefined();
  });

  it("gives each active company three subscription history lines after its creation", () => {
    const s = getStore();
    for (const c of s.companies.filter((x) => x.status === "active")) {
      const lines = s.auditLogs.filter((a) => a.companyId === c.id && a.entityType === "CompanySubscription");
      expect(lines, c.name).toHaveLength(3);
      for (const l of lines) expect(l.createdAt > c.createdAt).toBe(true);
    }
  });

  it("anonymises every line older than its company's retention and leaves the others with their origin", () => {
    const s = getStore();
    const old = s.auditLogs.filter(isOlderThanRetention);
    expect(old.length).toBeGreaterThan(0);
    for (const a of old) {
      expect(a.ipAddress).toBeNull();
      expect(a.userAgent).toBeNull();
    }
    for (const a of s.auditLogs.filter((x) => !isOlderThanRetention(x) && x.actorType === "USER")) {
      expect(a.ipAddress, a.id).not.toBeNull();
      expect(a.userAgent, a.id).not.toBeNull();
    }
  });

  it("records the daily purge with the number of lines it really changed", () => {
    const purge = getStore().auditLogs.filter((a) => a.entityType === "RetentionPurge");
    expect(purge).toHaveLength(1);
    expect(purge[0]).toMatchObject({
      action: "UPDATE", actorType: "SYSTEM", actorUserId: null, companyId: null, sourceService: "audit-compliance-service",
      ipAddress: null,
    });
    expect(purge[0]!.createdAt).toBe("2026-11-02T03:15:00.000Z");
    expect(Number(purge[0]!.afterState!.anonymisedAuditLogs)).toBeGreaterThan(0);
  });

  it("stores states as strings only and holds no e-mail address or phone number", () => {
    const text = JSON.stringify(getStore().auditLogs);
    expect(text).not.toMatch(/@|\+221/);
    for (const a of getStore().auditLogs) {
      for (const state of [a.beforeState, a.afterState]) {
        if (state) for (const v of Object.values(state)) expect(typeof v).toBe("string");
      }
    }
  });

  it("leaves the stored audit lines sorted oldest first", () => {
    const list = getStore().auditLogs;
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.createdAt <= list[i]!.createdAt).toBe(true);
  });
});

describe("data access log seed", () => {
  it("records a view for every request, a modification for each closed one and an export for the portability", () => {
    const s = getStore();
    const forSubject = (userId: string) => s.dataAccessLogs.filter((l) => l.dataSubjectId === userId && l.dataCategory === "IDENTITY");
    for (const r of s.dataSubjectRequests) {
      const rows = forSubject(r.requesterUserId);
      expect(rows.some((l) => l.accessType === "VIEW"), r.id).toBe(true);
      if (r.resolvedAt) expect(rows.some((l) => l.accessType === "MODIFY" && l.createdAt === r.resolvedAt), r.id).toBe(true);
    }
    const portability = s.dataSubjectRequests.find((r) => r.requestType === "PORTABILITY" && r.status === "COMPLETED")!;
    expect(s.dataAccessLogs.some((l) => l.accessType === "EXPORT" && l.dataSubjectId === portability.requesterUserId)).toBe(true);
  });

  it("records three consent consultations with three different reasons", () => {
    const rows = getStore().dataAccessLogs.filter((l) => l.dataCategory === "CONSENT");
    expect(rows).toHaveLength(3);
    expect(rows.every((l) => l.accessType === "VIEW")).toBe(true);
    expect(new Set(rows.map((l) => l.accessReason)).size).toBe(3);
  });

  it("references existing accounts, types the data subject from its account and never dates a line in the future", () => {
    const s = getStore();
    expect(s.dataAccessLogs.length).toBeGreaterThan(15);
    expect(new Set(s.dataAccessLogs.map((l) => l.id)).size).toBe(s.dataAccessLogs.length);
    for (const l of s.dataAccessLogs) {
      const subject = s.users.find((u) => u.id === l.dataSubjectId)!;
      expect(subject).toBeDefined();
      expect(l.dataSubjectType).toBe(subject.companyId !== null ? "EMPLOYEE" : subject.roleCode === "USER" ? "CUSTOMER" : "USER");
      expect(s.users.find((u) => u.id === l.accessedByUserId)!.roleCode).toBe("ADMIN");
      expect(l.accessedByLabel).toBeNull();
      expect(l.ipAddress).not.toBeNull();
      expect(Date.parse(l.createdAt)).toBeLessThan(NOW.getTime());
    }
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().dataAccessLogs)).not.toMatch(/@|\+221/);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/compliance-journals-seed.test.ts` → FAIL (collections vides).

- [ ] **Step 3: Écrire les graines**

Dans `src/lib/data/seed.ts`, après `seedDataSubjectRequests(store, iso);` (avant `return store;`) ajouter :

```ts
  seedConsents(store, iso);
  seedAuditLogs(store, now, iso);
  seedDataAccessLogs(store, now);
```

puis, à la fin du fichier :

```ts
const DEFAULT_RETENTION_DAYS = 730;

/** Consent history of the client accounts (append-only rows), plus a cookie consent for three employees. */
function seedConsents(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const record = (
    userId: string, consentType: ConsentType, companyId: string | null, status: ConsentStatus,
    source: ConsentSource, days: number, consentVersion = "v1.1",
  ): void => {
    store.consentRecords.push({
      id: uid(62, seq++), userId, consentType, companyId, status, consentVersion, source,
      grantedAt: status === "GRANTED" ? iso(days) : null, withdrawnAt: status === "WITHDRAWN" ? iso(days) : null,
      createdAt: iso(days),
    });
  };
  const clients = store.users.filter((u) => u.roleCode === "USER" && u.companyId === null);
  const companyIds = store.loyaltyPrograms.map((p) => p.companyId);

  clients.forEach((u, k) => {
    record(u.id, "COOKIES_ANALYTICS", null, "GRANTED", "SIGNUP", -(180 - k * 10), "v1.0");
    record(u.id, "GEOLOCATION", null, "GRANTED", "SETTINGS_PAGE", -(150 - k * 10));
    if (k % 2 === 0) record(u.id, "GEOLOCATION", null, "WITHDRAWN", "SETTINGS_PAGE", -(40 + k));
    const emailCompany = companyIds[k % companyIds.length]!;
    record(u.id, "MARKETING_EMAIL", emailCompany, "GRANTED", "BOOKING_FLOW", -(100 - k));
    if (k % 3 === 1) record(u.id, "MARKETING_EMAIL", emailCompany, "WITHDRAWN", "SETTINGS_PAGE", -20);
    record(u.id, "MARKETING_SMS", companyIds[(k + 1) % companyIds.length]!, "GRANTED", "SETTINGS_PAGE", -(60 - k));
    if (k === 0) record(u.id, "MARKETING_EMAIL", null, "GRANTED", "SIGNUP", -400, "v1.0");
    if (k === 3) record(u.id, "DATA_SHARING_PARTNERS", null, "GRANTED", "SETTINGS_PAGE", -30);
  });
  store.users.filter((u) => u.companyId !== null).slice(0, 3).forEach((u, k) => {
    record(u.id, "COOKIES_ANALYTICS", null, "GRANTED", "SIGNUP", -(90 - k * 5));
  });
}

/**
 * Audit trail derived from the other domains (company creation and activation, logins, bookings, parcel status
 * changes, three subscription history lines per active company, admin role grants), then anonymised the way the
 * daily retention job would have: a company line older than the company's retention loses its IP and user agent.
 */
function seedAuditLogs(store: Store, now: Date, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;
  const admin = store.users.find((u) => u.roleCode === "ADMIN" && u.status === "active")!;
  const originOf = (userId: string) => {
    const session = store.sessions.find((x) => x.userId === userId);
    return { ipAddress: session?.ipAddress ?? "196.207.12.40", userAgent: session?.deviceLabel ?? "Chrome · Windows" };
  };
  const noOrigin = { ipAddress: null, userAgent: null };
  const staffOf = (companyId: string) => store.users.find((u) => u.companyId === companyId) ?? null;
  const add = (row: Omit<AuditLog, "id" | "occurredAt" | "actorLabel">): void => {
    store.auditLogs.push({ id: uid(63, seq++), actorLabel: null, occurredAt: row.createdAt, ...row });
  };

  for (const c of store.companies) {
    add({
      companyId: c.id, actorUserId: admin.id, actorType: "USER", action: "CREATE", entityType: "Company", entityId: c.id,
      beforeState: null, afterState: { status: "DRAFT" }, ...originOf(admin.id), sourceService: "company-service",
      createdAt: c.createdAt,
    });
    if (c.activatedAt) {
      add({
        companyId: c.id, actorUserId: c.forceActivated ? admin.id : null, actorType: c.forceActivated ? "USER" : "SYSTEM",
        action: "UPDATE", entityType: "Company", entityId: c.id,
        beforeState: { status: "DRAFT", forceActivated: "false" },
        afterState: { status: "ACTIVE", forceActivated: String(c.forceActivated) },
        ...(c.forceActivated ? originOf(admin.id) : noOrigin), sourceService: "company-service", createdAt: c.activatedAt,
      });
    }
  }

  for (const c of store.companies.filter((x) => x.status === "active")) {
    const subscription = store.subscriptions.find((s) => s.companyId === c.id);
    const born = Date.parse(c.createdAt);
    const age = nowMs - born;
    const steps: [number, Record<string, string>, Record<string, string>][] = [
      [0.2, { status: "TRIAL" }, { status: "ACTIVE" }],
      [0.5, { billingCycle: "MONTHLY" }, { billingCycle: "YEARLY" }],
      [0.8, { billingCycle: "YEARLY" }, { billingCycle: "MONTHLY" }],
    ];
    for (const [fraction, beforeState, afterState] of steps) {
      add({
        companyId: c.id, actorUserId: admin.id, actorType: "USER", action: "UPDATE", entityType: "CompanySubscription",
        entityId: subscription?.id ?? c.id, beforeState, afterState, ...originOf(admin.id),
        sourceService: "company-service", createdAt: new Date(born + age * fraction).toISOString(),
      });
    }
  }

  for (const session of store.sessions) {
    const user = store.users.find((u) => u.id === session.userId);
    add({
      companyId: user?.companyId ?? null, actorUserId: session.userId, actorType: "USER", action: "LOGIN",
      entityType: "User", entityId: session.userId, beforeState: null, afterState: null,
      ipAddress: session.ipAddress, userAgent: session.deviceLabel, sourceService: "identity-service",
      createdAt: session.createdAt,
    });
  }
  for (const u of store.users.filter((x) => x.status === "suspended")) {
    add({
      companyId: u.companyId, actorUserId: null, actorType: "SYSTEM", action: "LOGIN_FAILED", entityType: "User",
      entityId: u.id, beforeState: null, afterState: { reason: "ACCOUNT_NOT_ACTIVE" }, ...originOf(u.id),
      sourceService: "identity-service", createdAt: iso(-3),
    });
  }
  for (const u of store.users.filter((x) => x.roleCode === "ADMIN")) {
    add({
      companyId: null, actorUserId: null, actorType: "SYSTEM", action: "PERMISSION_CHANGE", entityType: "User",
      entityId: u.id, beforeState: { roleCode: "USER" }, afterState: { roleCode: "ADMIN", sessionsRevoked: "0" },
      ...noOrigin, sourceService: "identity-service", createdAt: u.createdAt,
    });
  }

  for (const b of store.bookings) {
    const actorId = b.channel === "online" ? b.userId : staffOf(b.companyId)?.id ?? null;
    add({
      companyId: b.companyId, actorUserId: actorId, actorType: actorId ? "USER" : "SYSTEM", action: "CREATE",
      entityType: "Booking", entityId: b.id, beforeState: null, afterState: { status: "confirmed", paymentStatus: "pending" },
      ...(actorId ? originOf(actorId) : noOrigin), sourceService: "booking-service", createdAt: b.createdAt,
    });
  }

  for (const h of store.parcelHistory.filter((x) => x.previousStatus !== null)) {
    const parcel = store.parcels.find((p) => p.id === h.parcelId)!;
    const staff = staffOf(parcel.companyId);
    add({
      companyId: parcel.companyId, actorUserId: staff?.id ?? null, actorType: staff ? "USER" : "SYSTEM", action: "UPDATE",
      entityType: "Parcel", entityId: parcel.id, beforeState: { status: h.previousStatus! }, afterState: { status: h.newStatus },
      ...(staff ? originOf(staff.id) : noOrigin), sourceService: "parcel-service", createdAt: h.changedAt,
    });
  }

  // The daily job's work: anonymise what is older than the company's retention.
  let anonymised = 0;
  for (const a of store.auditLogs) {
    if (!a.companyId || a.ipAddress === null) continue;
    const days = store.companies.find((c) => c.id === a.companyId)?.dataRetentionDays ?? DEFAULT_RETENTION_DAYS;
    if (nowMs - Date.parse(a.createdAt) > days * DAY_MS) {
      a.ipAddress = null;
      a.userAgent = null;
      anonymised++;
    }
  }
  const purgeAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 15));
  if (purgeAt.getTime() > nowMs) purgeAt.setUTCDate(purgeAt.getUTCDate() - 1);
  add({
    companyId: null, actorUserId: null, actorType: "SYSTEM", action: "UPDATE", entityType: "RetentionPurge",
    entityId: purgeAt.toISOString().slice(0, 10), beforeState: null,
    afterState: { anonymisedAuditLogs: String(anonymised), anonymisedDataAccessLogs: "0" },
    ...noOrigin, sourceService: "audit-compliance-service", createdAt: purgeAt.toISOString(),
  });

  store.auditLogs.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Platform admins' accesses to personal data: one view per request, a modification per closed one, an export, three consent reads. */
function seedDataAccessLogs(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;
  const activeAdmins = store.users.filter((u) => u.roleCode === "ADMIN" && u.status === "active");
  const admins = activeAdmins.length > 0 ? activeAdmins : store.users.filter((u) => u.roleCode === "ADMIN");
  const subjectTypeOf = (u: PlatformUser): DataSubjectType =>
    u.companyId !== null ? "EMPLOYEE" : u.roleCode === "USER" ? "CUSTOMER" : "USER";
  const add = (
    who: PlatformUser, subject: PlatformUser, dataCategory: DataCategory, accessReason: AccessReason,
    accessType: AccessType, createdAt: string,
  ): void => {
    store.dataAccessLogs.push({
      id: uid(64, seq++), accessedByUserId: who.id, accessedByLabel: null, dataSubjectType: subjectTypeOf(subject),
      dataSubjectId: subject.id, dataCategory, accessReason, accessType,
      ipAddress: store.sessions.find((s) => s.userId === who.id)?.ipAddress ?? "41.82.10.20", createdAt,
    });
  };
  const userOf = (id: string) => store.users.find((u) => u.id === id)!;

  store.dataSubjectRequests.forEach((r, k) => {
    const who = admins[k % admins.length]!;
    const subject = userOf(r.requesterUserId);
    const viewedAt = new Date(Math.min(Date.parse(r.createdAt) + DAY_MS, nowMs - 60_000)).toISOString();
    add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "VIEW", viewedAt);
    if (r.resolvedAt) {
      add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "MODIFY", r.resolvedAt);
      if (r.requestType === "PORTABILITY") add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "EXPORT", r.resolvedAt);
    }
  });

  const clients = store.users.filter((u) => u.roleCode === "USER" && u.companyId === null);
  const reads: [AccessReason, number][] = [["INVESTIGATION", -9], ["SUPPORT_REQUEST", -6], ["LEGAL_OBLIGATION", -2]];
  reads.forEach(([reason, days], k) => {
    add(admins[k % admins.length]!, clients[k % clients.length]!, "CONSENT", reason, "VIEW", new Date(nowMs + days * DAY_MS).toISOString());
  });
}
```

Si `seedAuditLogs` n'utilise pas `iso` autre que pour `LOGIN_FAILED` (c'est le cas : un seul usage), le garder ; si `seedDataAccessLogs` signale `now` inutilisé, c'est faux (il l'utilise via `nowMs`).

- [ ] **Step 4: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. Si « gives each active company three subscription history lines after its creation » ou « anonymises every line older… » échouent, c'est un défaut de graine ; si « is large… > 300 » échoue, vérifier que les sessions et réservations existent au moment de l'appel (les graines doivent être appelées avant `return store;`, après la boucle des sessions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/seed.ts tests/unit/compliance-journals-seed.test.ts
git commit -m "feat: consent history, audit trail and data access log seeds

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Libellés et dépôts de lecture (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/compliance.ts`, `tests/unit/compliance-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `truncateIp` (`src/lib/mask.ts`), `addActivity`, types de la Task 1.
- Produces (`src/lib/repos/compliance.ts`) :
  - Constantes : `DEFAULT_RETENTION_DAYS = 730`, `MIN_RETENTION_DAYS = 90`, `MAX_RETENTION_DAYS = 3650`, `DSR_SOON_DAYS = 7`, `AUDIT_ACTIONS`, `ACCESS_TYPES`, `DATA_CATEGORIES`, `DSR_STATUSES`, `DSR_TYPES`, `ACCESS_REASONS` (`as const`).
  - Fonctions : `effectiveRetentionDays(company)`, `dsrDaysLeft(request, now)`, `dsrTransitionBlock(request, target)`.
  - Types : `AuditRow`, `AuditChange`, `AuditDetail`, `AccessRow`, `DsrRow`, `DsrStats`, `DsrDetail`, `ConsentSummaryRow`, `ConsentUserOption`, `ConsentEntryView`, `RetentionRow`.
  - Dépôts : `auditRepo.listRows({ companyId?, action? })` / `.detail(id)`, `accessRepo.listRows({ accessType?, category? })`, `dsrRepo.listRows({ status?, type?, companyId?, overdueOnly? }, now?)` / `.get(id)` / `.detail(id, now?)` / `.stats(now?)`, `consentsRepo.summary()` / `.userOptions()`, `retentionRepo.listRows(now?)`.
  - Libellés : `auditActionLabel`, `auditActorTypeLabel`, `accessTypeLabel`, `dataCategoryLabel`, `accessReasonLabel`, `consentTypeLabel`, `consentStatusBadge`, `consentSourceLabel`.

- [ ] **Step 1: Libellés (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import {
  accessReasonLabel, accessTypeLabel, auditActionLabel, auditActorTypeLabel, consentSourceLabel, consentStatusBadge,
  consentTypeLabel, dataCategoryLabel,
} from "@/lib/labels";

describe("compliance labels", () => {
  it("labels audit actions and actor types", () => {
    expect(auditActionLabel("CREATE")).toBe("Création");
    expect(auditActionLabel("UPDATE")).toBe("Modification");
    expect(auditActionLabel("DELETE")).toBe("Suppression");
    expect(auditActionLabel("LOGIN")).toBe("Connexion");
    expect(auditActionLabel("LOGIN_FAILED")).toBe("Échec de connexion");
    expect(auditActionLabel("EXPORT")).toBe("Export");
    expect(auditActionLabel("PERMISSION_CHANGE")).toBe("Changement de permission");
    expect(auditActorTypeLabel("USER")).toBe("Utilisateur");
    expect(auditActorTypeLabel("EMPLOYEE")).toBe("Employé");
    expect(auditActorTypeLabel("SYSTEM")).toBe("Système");
    expect(auditActorTypeLabel("API_KEY")).toBe("Clé d'API");
  });

  it("labels data accesses", () => {
    expect(accessTypeLabel("VIEW")).toBe("Consultation");
    expect(accessTypeLabel("EXPORT")).toBe("Export");
    expect(accessTypeLabel("MODIFY")).toBe("Modification");
    expect(accessTypeLabel("DELETE")).toBe("Suppression");
    expect(dataCategoryLabel("IDENTITY")).toBe("Identité");
    expect(dataCategoryLabel("FINANCIAL")).toBe("Finances");
    expect(dataCategoryLabel("LOCATION")).toBe("Localisation");
    expect(dataCategoryLabel("HEALTH")).toBe("Santé");
    expect(dataCategoryLabel("CONTACT")).toBe("Contact");
    expect(dataCategoryLabel("CONSENT")).toBe("Consentement");
    expect(accessReasonLabel("SUPPORT_REQUEST")).toBe("Demande d'assistance");
    expect(accessReasonLabel("LEGAL_OBLIGATION")).toBe("Obligation légale");
    expect(accessReasonLabel("SERVICE_DELIVERY")).toBe("Prestation du service");
    expect(accessReasonLabel("INVESTIGATION")).toBe("Enquête");
  });

  it("labels consents", () => {
    expect(consentTypeLabel("MARKETING_EMAIL")).toBe("Marketing par e-mail");
    expect(consentTypeLabel("MARKETING_SMS")).toBe("Marketing par SMS");
    expect(consentTypeLabel("DATA_SHARING_PARTNERS")).toBe("Partage avec des partenaires");
    expect(consentTypeLabel("COOKIES_ANALYTICS")).toBe("Cookies et analyses");
    expect(consentTypeLabel("GEOLOCATION")).toBe("Géolocalisation");
    expect(consentStatusBadge("GRANTED")).toEqual({ label: "Accordé", tone: "success" });
    expect(consentStatusBadge("WITHDRAWN")).toEqual({ label: "Retiré", tone: "neutral" });
    expect(consentSourceLabel("SIGNUP")).toBe("Inscription");
    expect(consentSourceLabel("SETTINGS_PAGE")).toBe("Page de réglages");
    expect(consentSourceLabel("BOOKING_FLOW")).toBe("Parcours de réservation");
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `AccessReason`, `AccessType`, `AuditAction`, `AuditActorType`, `ConsentSource`, `ConsentStatus`, `ConsentType`, `DataCategory`, puis ajouter à la fin :

```ts
export const auditActionLabel = (a: AuditAction): string =>
  ({
    CREATE: "Création", UPDATE: "Modification", DELETE: "Suppression", LOGIN: "Connexion",
    LOGIN_FAILED: "Échec de connexion", EXPORT: "Export", PERMISSION_CHANGE: "Changement de permission",
  })[a];

export const auditActorTypeLabel = (t: AuditActorType): string =>
  ({ USER: "Utilisateur", EMPLOYEE: "Employé", SYSTEM: "Système", API_KEY: "Clé d'API" })[t];

export const accessTypeLabel = (t: AccessType): string =>
  ({ VIEW: "Consultation", EXPORT: "Export", MODIFY: "Modification", DELETE: "Suppression" })[t];

export const dataCategoryLabel = (c: DataCategory): string =>
  ({
    IDENTITY: "Identité", FINANCIAL: "Finances", LOCATION: "Localisation", HEALTH: "Santé",
    CONTACT: "Contact", CONSENT: "Consentement",
  })[c];

export const accessReasonLabel = (r: AccessReason): string =>
  ({
    SUPPORT_REQUEST: "Demande d'assistance", LEGAL_OBLIGATION: "Obligation légale",
    SERVICE_DELIVERY: "Prestation du service", INVESTIGATION: "Enquête",
  })[r];

export const consentTypeLabel = (t: ConsentType): string =>
  ({
    MARKETING_EMAIL: "Marketing par e-mail", MARKETING_SMS: "Marketing par SMS",
    DATA_SHARING_PARTNERS: "Partage avec des partenaires", COOKIES_ANALYTICS: "Cookies et analyses",
    GEOLOCATION: "Géolocalisation",
  })[t];

export const consentStatusBadge = (s: ConsentStatus): Badge =>
  pick({
    GRANTED: { label: "Accordé", tone: "success" },
    WITHDRAWN: { label: "Retiré", tone: "neutral" },
  }, s);

export const consentSourceLabel = (s: ConsentSource): string =>
  ({ SIGNUP: "Inscription", SETTINGS_PAGE: "Page de réglages", BOOKING_FLOW: "Parcours de réservation" })[s];
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant, vert après).

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/compliance-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  accessRepo, auditRepo, consentsRepo, dsrDaysLeft, dsrRepo, dsrTransitionBlock, effectiveRetentionDays, retentionRepo,
} from "@/lib/repos/compliance";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;

describe("audit log", () => {
  it("lists every line newest first and filters by company and action", () => {
    const s = getStore();
    const all = auditRepo.listRows({});
    expect(all).toHaveLength(s.auditLogs.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.auditLogs.find((a) => a.companyId)!.companyId!;
    const mine = auditRepo.listRows({ companyId });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.companyId === companyId)).toBe(true);
    const logins = auditRepo.listRows({ action: "LOGIN" });
    expect(logins).toHaveLength(s.sessions.length);
    expect(logins.every((r) => r.action === "LOGIN")).toBe(true);
    expect(auditRepo.listRows({ companyId, action: "CREATE" }).every((r) => r.companyId === companyId && r.action === "CREATE")).toBe(true);
  });

  it("exposes only client-safe fields and a truncated IP, never the user agent or the states", () => {
    const rows = auditRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "action", "actorLabel", "actorType", "companyId", "companyName", "createdAt", "entityRef", "entityType", "id",
      "ipTruncated", "sourceService",
    ]);
    const login = auditRepo.listRows({ action: "LOGIN" })[0]!;
    const source = getStore().auditLogs.find((a) => a.id === login.id)!;
    expect(login.ipTruncated).toBe(source.ipAddress!.replace(/\.\d+$/, ".0"));
    expect(JSON.stringify(rows)).not.toContain(source.ipAddress!);
    expect(JSON.stringify(rows)).not.toContain(source.userAgent!);
  });

  it("names the actor and says 'Plateforme' and '—' where there is no company or no origin", () => {
    const s = getStore();
    const purge = auditRepo.listRows({}).find((r) => r.entityType === "RetentionPurge")!;
    expect(purge.companyName).toBe("Plateforme");
    expect(purge.actorLabel).toBe("Système");
    expect(purge.ipTruncated).toBe("—");
    const login = s.auditLogs.find((a) => a.action === "LOGIN")!;
    expect(auditRepo.listRows({ action: "LOGIN" }).find((r) => r.id === login.id)!.actorLabel)
      .toBe(s.users.find((u) => u.id === login.actorUserId)!.displayName);
  });

  it("returns a before/after table with the changed fields flagged, undefined when unknown", () => {
    const s = getStore();
    expect(auditRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
    const activation = s.auditLogs.find((a) => a.entityType === "Company" && a.action === "UPDATE")!;
    const d = auditRepo.detail(activation.id)!;
    expect(d.entityId).toBe(activation.entityId);
    expect(d.changes.map((c) => c.key)).toEqual(["forceActivated", "status"]);
    const status = d.changes.find((c) => c.key === "status")!;
    expect(status).toEqual({ key: "status", before: "DRAFT", after: "ACTIVE", changed: true });
    expect(d.changes.some((c) => c.key === "forceActivated" && c.changed === (c.before !== c.after))).toBe(true);
    const creation = auditRepo.detail(s.auditLogs.find((a) => a.action === "CREATE" && a.entityType === "Company")!.id)!;
    expect(creation.changes).toEqual([{ key: "status", before: null, after: "DRAFT", changed: true }]);
    const login = auditRepo.detail(s.auditLogs.find((a) => a.action === "LOGIN")!.id)!;
    expect(login.changes).toEqual([]);
  });

  it("shows the user agent on the detail only, and a dash once anonymised", () => {
    const s = getStore();
    const fresh = s.auditLogs.find((a) => a.userAgent !== null)!;
    expect(auditRepo.detail(fresh.id)!.userAgent).toBe(fresh.userAgent);
    const anonymised = s.auditLogs.find((a) => a.actorType === "USER" && a.userAgent === null)!;
    expect(auditRepo.detail(anonymised.id)!.userAgent).toBe("—");
    expect(auditRepo.detail(anonymised.id)!.row.ipTruncated).toBe("—");
  });

  it("is read-only: the repository offers no way to change a line", () => {
    expect(Object.keys(auditRepo).sort()).toEqual(["detail", "listRows"]);
    expect(Object.keys(accessRepo).sort()).toEqual(["listRows"]);
  });
});

describe("data access log", () => {
  it("lists accesses newest first and filters by type and category", () => {
    const s = getStore();
    const all = accessRepo.listRows({});
    expect(all).toHaveLength(s.dataAccessLogs.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const exports = accessRepo.listRows({ accessType: "EXPORT" });
    expect(exports.length).toBeGreaterThan(0);
    expect(exports.every((r) => r.accessType === "EXPORT")).toBe(true);
    const consent = accessRepo.listRows({ category: "CONSENT" });
    expect(consent).toHaveLength(3);
    expect(accessRepo.listRows({ accessType: "EXPORT", category: "CONSENT" })).toHaveLength(0);
  });

  it("names who and whom, truncates the IP and exposes only client-safe fields", () => {
    const s = getStore();
    const rows = accessRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accessReason", "accessType", "accessedByLabel", "createdAt", "dataCategory", "id", "ipTruncated", "subjectName", "subjectType",
    ]);
    const source = s.dataAccessLogs.find((l) => l.id === rows[0]!.id)!;
    expect(rows[0]!.subjectName).toBe(s.users.find((u) => u.id === source.dataSubjectId)!.displayName);
    expect(rows[0]!.accessedByLabel).toBe(s.users.find((u) => u.id === source.accessedByUserId)!.displayName);
    expect(rows[0]!.ipTruncated).toMatch(/\.0$/);
    expect(JSON.stringify(rows)).not.toContain(source.ipAddress!);
    expect(JSON.stringify(rows)).not.toContain(source.dataSubjectId);
  });
});

describe("legal deadline", () => {
  it("counts the days left of an open request and nothing for a closed one", () => {
    const overdue = dsrOf("Pape Mbaye", "RECTIFICATION");
    expect(dsrDaysLeft(overdue, NOW)).toBe(-2);
    expect(dsrDaysLeft(dsrOf("Ndèye Diouf", "ACCESS"), NOW)).toBe(20);
    expect(dsrDaysLeft(dsrOf("Aïssatou Sarr", "PORTABILITY"), NOW)).toBeNull();
    expect(dsrDaysLeft(dsrOf("Lamine Camara", "ACCESS"), NOW)).toBeNull();
  });

  it("rounds up to the next day and moves with the injected clock", () => {
    const r = dsrOf("Ndèye Diouf", "ACCESS");
    const due = Date.parse(r.dueDate);
    expect(dsrDaysLeft(r, new Date(due - DAY / 2))).toBe(1);
    expect(dsrDaysLeft(r, new Date(due))).toBe(0);
    expect(dsrDaysLeft(r, new Date(due + 1))).toBe(0);
    expect(dsrDaysLeft(r, new Date(due + DAY))).toBe(-1);
  });

  it("explains which transitions the workflow refuses", () => {
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    const inProgress = dsrOf("Lamine Camara", "ERASURE");
    const closed = dsrOf("Aïssatou Sarr", "PORTABILITY");
    expect(dsrTransitionBlock(received, "IN_PROGRESS")).toBeNull();
    expect(dsrTransitionBlock(received, "COMPLETED")).toBe("Une demande reçue doit d'abord être prise en charge");
    expect(dsrTransitionBlock(received, "REJECTED")).toBe("Une demande reçue doit d'abord être prise en charge");
    expect(dsrTransitionBlock(inProgress, "IN_PROGRESS")).toBe("Cette demande est déjà prise en charge");
    expect(dsrTransitionBlock(inProgress, "COMPLETED")).toBeNull();
    expect(dsrTransitionBlock(inProgress, "REJECTED")).toBeNull();
    for (const target of ["IN_PROGRESS", "COMPLETED", "REJECTED"] as const) {
      expect(dsrTransitionBlock(closed, target)).toBe("Cette demande est déjà close");
    }
  });
});

describe("data-subject requests", () => {
  it("lists requests with their deadline, soonest first, and filters", () => {
    const s = getStore();
    const all = dsrRepo.listRows({}, NOW);
    expect(all).toHaveLength(s.dataSubjectRequests.length);
    const open = all.filter((r) => r.daysLeft !== null);
    for (let i = 1; i < open.length; i++) expect(open[i - 1]!.daysLeft! <= open[i]!.daysLeft!).toBe(true);
    expect(all.slice(0, open.length).every((r) => r.daysLeft !== null)).toBe(true);
    expect(dsrRepo.listRows({ status: "COMPLETED" }, NOW).every((r) => r.status === "COMPLETED")).toBe(true);
    expect(dsrRepo.listRows({ type: "ERASURE" }, NOW).every((r) => r.requestType === "ERASURE")).toBe(true);
    const late = dsrRepo.listRows({ overdueOnly: true }, NOW);
    expect(late).toHaveLength(1);
    expect(late[0]).toMatchObject({ requesterName: "Pape Mbaye", requestType: "RECTIFICATION", overdue: true, daysLeft: -2 });
    const companyId = s.dataSubjectRequests.find((r) => r.companyId)!.companyId!;
    expect(dsrRepo.listRows({ companyId }, NOW).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("exposes only client-safe fields (no reason, no notes, no identifier of the requester)", () => {
    const row = dsrRepo.listRows({}, NOW)[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "companyId", "companyName", "createdAt", "daysLeft", "dueDate", "handledBy", "id", "overdue", "requestType",
      "requesterName", "status",
    ]);
    const text = JSON.stringify(dsrRepo.listRows({}, NOW));
    for (const r of getStore().dataSubjectRequests) {
      expect(text).not.toContain(r.reason);
      expect(text).not.toContain(r.requesterUserId);
    }
  });

  it("counts open, overdue, soon-due and closed requests", () => {
    const s = getStore();
    const stats = dsrRepo.stats(NOW);
    const open = s.dataSubjectRequests.filter((r) => r.status === "RECEIVED" || r.status === "IN_PROGRESS");
    expect(stats.open).toBe(open.length);
    expect(stats.closed).toBe(s.dataSubjectRequests.length - open.length);
    expect(stats.overdue).toBe(1);
    expect(stats.dueSoon).toBe(open.filter((r) => Date.parse(r.dueDate) >= NOW.getTime() && Date.parse(r.dueDate) - NOW.getTime() <= 7 * DAY).length);
    expect(stats.dueSoon).toBe(1);
  });

  it("returns the full detail for the server and undefined for an unknown request", () => {
    expect(dsrRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
    const target = dsrOf("Lamine Camara", "ERASURE");
    const d = dsrRepo.detail(target.id, NOW)!;
    expect(d.request.reason).toBe(target.reason);
    expect(d.requesterName).toBe("Lamine Camara");
    expect(d.requesterUserId).toBe(target.requesterUserId);
    expect(d.daysLeft).toBe(3);
    expect(d.overdue).toBe(false);
    expect(dsrRepo.detail(dsrOf("Pape Mbaye", "RECTIFICATION").id, NOW)!.overdue).toBe(true);
    expect(dsrRepo.detail(dsrOf("Aïssatou Sarr", "PORTABILITY").id, NOW)!.daysLeft).toBeNull();
  });
});

describe("consents", () => {
  it("summarises the current state of each user, type and company, ignoring superseded rows", () => {
    const s = getStore();
    const rows = consentsRepo.summary();
    const latest = new Map<string, (typeof s.consentRecords)[number]>();
    for (const r of [...s.consentRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
      latest.set(`${r.userId}|${r.consentType}|${r.companyId ?? ""}`, r);
    }
    const current = [...latest.values()];
    expect(rows.reduce((n, r) => n + r.granted, 0)).toBe(current.filter((r) => r.status === "GRANTED").length);
    expect(rows.reduce((n, r) => n + r.withdrawn, 0)).toBe(current.filter((r) => r.status === "WITHDRAWN").length);
    expect(rows.reduce((n, r) => n + r.withdrawn, 0)).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(s.consentRecords.length);
    expect(Object.keys(rows[0]!).sort()).toEqual(["companyName", "consentType", "granted", "withdrawn"]);
  });

  it("names the scope of each summary line: a company, the platform, or a legacy marketing row", () => {
    const rows = consentsRepo.summary();
    expect(rows.filter((r) => r.companyName === "Sans compagnie (ancien)")).toHaveLength(1);
    expect(rows.find((r) => r.consentType === "COOKIES_ANALYTICS")!.companyName).toBe("Plateforme");
    expect(rows.some((r) => r.consentType === "MARKETING_SMS" && r.companyName !== "Plateforme")).toBe(true);
  });

  it("offers the users who have at least one consent, labelled without contact data", () => {
    const s = getStore();
    const options = consentsRepo.userOptions();
    const withConsent = new Set(s.consentRecords.map((r) => r.userId));
    expect(options.map((o) => o.id).sort()).toEqual([...withConsent].sort());
    expect(options.find((o) => o.label === "Aïssatou Sarr (client)")).toBeDefined();
    expect(JSON.stringify(options)).not.toMatch(/@|\+221/);
    expect(Object.keys(options[0]!).sort()).toEqual(["id", "label"]);
  });
});

describe("retention", () => {
  it("uses the company's own duration or the 730 day default", () => {
    expect(effectiveRetentionDays({ dataRetentionDays: 365 })).toBe(365);
    expect(effectiveRetentionDays({ dataRetentionDays: null })).toBe(730);
  });

  it("lists every company with its duration and counts the lines older than it and not yet anonymised", () => {
    const s = getStore();
    const rows = retentionRepo.listRows(NOW);
    expect(rows).toHaveLength(s.companies.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "companyId", "companyName", "configuredDays", "effectiveDays", "isCustom", "olderRows", "pendingRows", "status",
    ]);
    for (const r of rows) {
      const company = s.companies.find((c) => c.id === r.companyId)!;
      expect(r.effectiveDays).toBe(company.dataRetentionDays ?? 730);
      expect(r.isCustom).toBe(company.dataRetentionDays !== null);
      const older = s.auditLogs.filter((a) => a.companyId === r.companyId && NOW.getTime() - Date.parse(a.createdAt) > r.effectiveDays * DAY);
      expect(r.olderRows).toBe(older.length);
      expect(r.pendingRows).toBe(older.filter((a) => a.ipAddress !== null).length);
      expect(r.pendingRows).toBe(0);
    }
    expect(rows.some((r) => r.olderRows > 0)).toBe(true);
  });

  it("sees lines become pending when the retention is shortened and when the clock moves", () => {
    const s = getStore();
    const casamance = companyNamed("Casamance Trans");
    expect(retentionRepo.listRows(NOW).find((r) => r.companyId === casamance.id)).toMatchObject({ olderRows: 0, pendingRows: 0, effectiveDays: 730 });
    casamance.dataRetentionDays = 90;
    const shortened = retentionRepo.listRows(NOW).find((r) => r.companyId === casamance.id)!;
    expect(shortened.pendingRows).toBeGreaterThanOrEqual(4);
    expect(shortened.pendingRows).toBe(shortened.olderRows);
    casamance.dataRetentionDays = null;
    const later = new Date(NOW.getTime() + 500 * DAY);
    expect(retentionRepo.listRows(later).find((r) => r.companyId === casamance.id)!.pendingRows).toBeGreaterThan(0);
    expect(s.auditLogs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/compliance-repo.test.ts` → FAIL (module absent).

- [ ] **Step 4: Implémenter le dépôt de lecture**

Créer `src/lib/repos/compliance.ts` :

```ts
import { truncateIp } from "@/lib/mask";
import { getStore } from "@/lib/repos/store";
import type {
  AccessReason, AccessType, AuditAction, AuditActorType, AuditLog, Company, ConsentRecord, ConsentSource,
  ConsentStatus, ConsentType, DataAccessLog, DataCategory, DataSubjectRequest, DataSubjectType, DsrStatus, DsrType,
  PlatformUser,
} from "@/lib/types";

export const DEFAULT_RETENTION_DAYS = 730;
export const MIN_RETENTION_DAYS = 90;
export const MAX_RETENTION_DAYS = 3650;
/** An open request is "due soon" when its deadline is within this many days. */
export const DSR_SOON_DAYS = 7;

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED", "EXPORT", "PERMISSION_CHANGE"] as const;
export const ACCESS_TYPES = ["VIEW", "EXPORT", "MODIFY", "DELETE"] as const;
export const DATA_CATEGORIES = ["IDENTITY", "FINANCIAL", "LOCATION", "HEALTH", "CONTACT", "CONSENT"] as const;
export const DSR_STATUSES = ["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;
export const DSR_TYPES = ["ACCESS", "RECTIFICATION", "ERASURE", "PORTABILITY", "RESTRICTION", "OBJECTION"] as const;
export const ACCESS_REASONS = ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"] as const;

const DAY = 86_400_000;

/** Client-safe projection of an audit line: truncated IP, no user agent, no states. */
export interface AuditRow {
  id: string; createdAt: string; companyId: string | null; companyName: string; actorLabel: string;
  actorType: AuditActorType; action: AuditAction; entityType: string; entityRef: string;
  sourceService: string | null; ipTruncated: string;
}

export interface AuditChange { key: string; before: string | null; after: string | null; changed: boolean }

export interface AuditDetail {
  row: AuditRow;
  entityId: string;
  userAgent: string;
  occurredAt: string | null;
  changes: AuditChange[];
}

export interface AccessRow {
  id: string; createdAt: string; accessedByLabel: string; subjectType: DataSubjectType; subjectName: string;
  dataCategory: DataCategory; accessReason: AccessReason; accessType: AccessType; ipTruncated: string;
}

/** Client-safe projection of a request: no reason, no notes, no requester identifier. */
export interface DsrRow {
  id: string; requesterName: string; companyId: string | null; companyName: string; requestType: DsrType;
  status: DsrStatus; dueDate: string; daysLeft: number | null; overdue: boolean; handledBy: string | null; createdAt: string;
}

export interface DsrStats { open: number; overdue: number; dueSoon: number; closed: number }

export interface DsrDetail {
  request: DataSubjectRequest;
  requesterName: string;
  requesterUserId: string;
  companyName: string;
  daysLeft: number | null;
  overdue: boolean;
}

export interface ConsentSummaryRow { consentType: ConsentType; companyName: string; granted: number; withdrawn: number }
export interface ConsentUserOption { id: string; label: string }

export interface ConsentEntryView {
  id: string; consentType: ConsentType; companyName: string | null; status: ConsentStatus;
  consentVersion: string; source: ConsentSource; at: string; isCurrent: boolean;
}

export interface RetentionRow {
  companyId: string; companyName: string; status: Company["status"]; configuredDays: number | null;
  effectiveDays: number; isCustom: boolean; olderRows: number; pendingRows: number;
}

export function effectiveRetentionDays(company: Pick<Company, "dataRetentionDays">): number {
  return company.dataRetentionDays ?? DEFAULT_RETENTION_DAYS;
}

function isOpen(request: Pick<DataSubjectRequest, "status">): boolean {
  return request.status === "RECEIVED" || request.status === "IN_PROGRESS";
}

/** Days left before the legal deadline, rounded up; `null` for a closed request. */
export function dsrDaysLeft(request: DataSubjectRequest, now: Date): number | null {
  if (!isOpen(request)) return null;
  return Math.ceil((Date.parse(request.dueDate) - now.getTime()) / DAY);
}

/** Why a request cannot move to `target`, `null` when it can. Same order as the transition guards. */
export function dsrTransitionBlock(request: Pick<DataSubjectRequest, "status">, target: DsrStatus): string | null {
  if (!isOpen(request)) return "Cette demande est déjà close";
  if (target === "IN_PROGRESS") return request.status === "IN_PROGRESS" ? "Cette demande est déjà prise en charge" : null;
  return request.status === "RECEIVED" ? "Une demande reçue doit d'abord être prise en charge" : null;
}

function companyName(companyId: string | null, fallback = "Plateforme"): string {
  if (!companyId) return fallback;
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function userName(userId: string | null): string | null {
  return userId ? getStore().users.find((u) => u.id === userId)?.displayName ?? null : null;
}

export function subjectTypeOf(user: PlatformUser): DataSubjectType {
  return user.companyId !== null ? "EMPLOYEE" : user.roleCode === "USER" ? "CUSTOMER" : "USER";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

function auditRow(a: AuditLog): AuditRow {
  return {
    id: a.id, createdAt: a.createdAt, companyId: a.companyId, companyName: companyName(a.companyId),
    actorLabel: a.actorLabel ?? userName(a.actorUserId) ?? "Système", actorType: a.actorType, action: a.action,
    entityType: a.entityType, entityRef: a.entityId.slice(0, 8), sourceService: a.sourceService,
    ipTruncated: a.ipAddress ? truncateIp(a.ipAddress) : "—",
  };
}

function accessRow(l: DataAccessLog): AccessRow {
  return {
    id: l.id, createdAt: l.createdAt, accessedByLabel: l.accessedByLabel ?? userName(l.accessedByUserId) ?? "—",
    subjectType: l.dataSubjectType, subjectName: userName(l.dataSubjectId) ?? "Compte supprimé",
    dataCategory: l.dataCategory, accessReason: l.accessReason, accessType: l.accessType,
    ipTruncated: l.ipAddress ? truncateIp(l.ipAddress) : "—",
  };
}

function dsrRow(r: DataSubjectRequest, now: Date): DsrRow {
  const daysLeft = dsrDaysLeft(r, now);
  return {
    id: r.id, requesterName: userName(r.requesterUserId) ?? "—", companyId: r.companyId,
    companyName: companyName(r.companyId, "—"), requestType: r.requestType, status: r.status,
    dueDate: r.dueDate, daysLeft, overdue: daysLeft !== null && daysLeft < 0, handledBy: r.handledBy, createdAt: r.createdAt,
  };
}

/** Latest row of each (user, type, company): the current consent state. */
function currentConsents(): ConsentRecord[] {
  const latest = new Map<string, ConsentRecord>();
  const ordered = [...getStore().consentRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const r of ordered) latest.set(`${r.userId}|${r.consentType}|${r.companyId ?? ""}`, r);
  return [...latest.values()];
}

export const auditRepo = {
  listRows(filter: { companyId?: string; action?: AuditAction } = {}): AuditRow[] {
    return getStore().auditLogs
      .filter((a) => (!filter.companyId || a.companyId === filter.companyId) && (!filter.action || a.action === filter.action))
      .sort(newest((a) => a.createdAt))
      .map(auditRow);
  },

  detail(id: string): AuditDetail | undefined {
    const a = getStore().auditLogs.find((x) => x.id === id);
    if (!a) return undefined;
    const keys = [...new Set([...Object.keys(a.beforeState ?? {}), ...Object.keys(a.afterState ?? {})])].sort();
    return {
      row: auditRow(a), entityId: a.entityId, userAgent: a.userAgent ?? "—", occurredAt: a.occurredAt,
      changes: keys.map((key) => {
        const before = a.beforeState?.[key] ?? null;
        const after = a.afterState?.[key] ?? null;
        return { key, before, after, changed: before !== after };
      }),
    };
  },
};

export const accessRepo = {
  listRows(filter: { accessType?: AccessType; category?: DataCategory } = {}): AccessRow[] {
    return getStore().dataAccessLogs
      .filter((l) => (!filter.accessType || l.accessType === filter.accessType) && (!filter.category || l.dataCategory === filter.category))
      .sort(newest((l) => l.createdAt))
      .map(accessRow);
  },
};

export const dsrRepo = {
  /** Open requests first, soonest deadline first; closed requests after, newest first. */
  listRows(
    filter: { status?: DsrStatus; type?: DsrType; companyId?: string; overdueOnly?: boolean } = {}, now: Date = new Date(),
  ): DsrRow[] {
    const rows = getStore().dataSubjectRequests
      .filter((r) =>
        (!filter.status || r.status === filter.status) &&
        (!filter.type || r.requestType === filter.type) &&
        (!filter.companyId || r.companyId === filter.companyId))
      .map((r) => dsrRow(r, now))
      .filter((r) => !filter.overdueOnly || r.overdue);
    const open = rows.filter((r) => r.daysLeft !== null).sort((a, b) => a.daysLeft! - b.daysLeft! || a.id.localeCompare(b.id));
    const closed = rows.filter((r) => r.daysLeft === null).sort(newest((r) => r.createdAt));
    return [...open, ...closed];
  },

  get(id: string): DataSubjectRequest | undefined {
    return getStore().dataSubjectRequests.find((r) => r.id === id);
  },

  stats(now: Date = new Date()): DsrStats {
    const list = getStore().dataSubjectRequests;
    const open = list.filter(isOpen);
    return {
      open: open.length,
      overdue: open.filter((r) => dsrDaysLeft(r, now)! < 0).length,
      dueSoon: open.filter((r) => dsrDaysLeft(r, now)! >= 0 && dsrDaysLeft(r, now)! <= DSR_SOON_DAYS).length,
      closed: list.length - open.length,
    };
  },

  detail(id: string, now: Date = new Date()): DsrDetail | undefined {
    const request = getStore().dataSubjectRequests.find((r) => r.id === id);
    if (!request) return undefined;
    const daysLeft = dsrDaysLeft(request, now);
    return {
      request, requesterName: userName(request.requesterUserId) ?? "—", requesterUserId: request.requesterUserId,
      companyName: companyName(request.companyId, "—"), daysLeft, overdue: daysLeft !== null && daysLeft < 0,
    };
  },
};

export const consentsRepo = {
  /** Current consent states counted per type and company (or scope). */
  summary(): ConsentSummaryRow[] {
    const groups = new Map<string, ConsentSummaryRow>();
    for (const r of currentConsents()) {
      const name = r.companyId
        ? companyName(r.companyId)
        : r.consentType === "MARKETING_EMAIL" || r.consentType === "MARKETING_SMS" ? "Sans compagnie (ancien)" : "Plateforme";
      const key = `${r.consentType}|${name}`;
      const row = groups.get(key) ?? { consentType: r.consentType, companyName: name, granted: 0, withdrawn: 0 };
      if (r.status === "GRANTED") row.granted++;
      else row.withdrawn++;
      groups.set(key, row);
    }
    return [...groups.values()].sort((a, b) => a.consentType.localeCompare(b.consentType) || a.companyName.localeCompare(b.companyName));
  },

  userOptions(): ConsentUserOption[] {
    const s = getStore();
    const ids = new Set(s.consentRecords.map((r) => r.userId));
    return s.users
      .filter((u) => ids.has(u.id))
      .map((u) => ({ id: u.id, label: `${u.displayName} (${u.companyId ? companyName(u.companyId) : "client"})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
};

export const retentionRepo = {
  listRows(now: Date = new Date()): RetentionRow[] {
    const s = getStore();
    return s.companies
      .map((c): RetentionRow => {
        const effectiveDays = effectiveRetentionDays(c);
        const older = s.auditLogs.filter((a) => a.companyId === c.id && now.getTime() - Date.parse(a.createdAt) > effectiveDays * DAY);
        return {
          companyId: c.id, companyName: c.name, status: c.status, configuredDays: c.dataRetentionDays, effectiveDays,
          isCustom: c.dataRetentionDays !== null, olderRows: older.length,
          pendingRows: older.filter((a) => a.ipAddress !== null).length,
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  },
};
```

(Les types `AuditLog`, `ConsentRecord`, `DataAccessLog`, etc. importés mais non utilisés par un export peuvent être retirés si `tsc` le signale.)

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/compliance-repo.test.ts tests/unit/labels.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS. Si `shortened.pendingRows >= 4` échoue, vérifier l'âge de « Casamance Trans » (indice 5, créée il y a 325 jours) et les trois lignes d'abonnement de la Task 2.

- [ ] **Step 6: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. Dans `dsrDaysLeft`, remplacer `Math.ceil` par `Math.floor` : échoue `rounds up to the next day and moves with the injected clock`.
2. Retirer le test `isOpen` de `dsrDaysLeft` : échoue `counts the days left of an open request and nothing for a closed one`.
3. Dans `dsrTransitionBlock`, inverser `RECEIVED`/`IN_PROGRESS` de la dernière ligne : échoue `explains which transitions the workflow refuses`.
4. Dans `auditRow`, remplacer `truncateIp(a.ipAddress)` par `a.ipAddress` : échoue `exposes only client-safe fields and a truncated IP…`.
5. Dans `dsrRow`, ajouter `reason: r.reason` à la projection : échoue `exposes only client-safe fields (no reason, no notes, no identifier of the requester)`.
6. Dans `currentConsents`, supprimer le tri : échoue `summarises the current state…` si l'ordre de stockage diffère de l'ordre chronologique ; sinon constater et consigner que la mutation est équivalente (la graine est insérée dans l'ordre).
7. Dans `retentionRepo.listRows`, remplacer `> effectiveDays * DAY` par `>= effectiveDays * DAY` : non détectable à la graine (aucune ligne exactement à la limite) : ne pas compter cette mutation comme preuve.
8. Dans `retentionRepo.listRows`, retirer `a.ipAddress !== null` : échoue `lists every company with its duration and counts the lines older…` (`pendingRows` devrait valoir 0).
9. Dans `auditRepo.detail`, retirer `sort()` des clés : échoue `returns a before/after table…`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/labels.ts src/lib/repos/compliance.ts tests/unit/labels.test.ts tests/unit/compliance-repo.test.ts
git commit -m "feat: compliance read repositories, legal deadline, consent state and retention counters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Règles d'écriture et actions serveur (TDD)

**Files:**
- Modify: `src/lib/repos/compliance.ts`
- Create: `src/app/(admin)/conformite/actions.ts`, `tests/unit/compliance-rules.test.ts`, `tests/unit/compliance-actions.test.ts`

**Interfaces:**
- Consumes: dépôts de la Task 3, `addActivity`, `run`, `runValue`, `requireReason`, `requireString`, `ValueResult`.
- Produces: `dsrRepo.transition(id, target, notes, actor?, now?): DataSubjectRequest` ; `retentionRepo.set(companyId, days, reason, actor?, now?): Company` ; `consentsRepo.consult(userId, reason, actor?, now?): ConsentEntryView[]` ; actions `startDataSubjectRequest(id)`, `completeDataSubjectRequest(id, notes)`, `rejectDataSubjectRequest(id, notes)`, `setCompanyRetention(companyId, days, reason)`, `consultUserConsents(userId, accessReason)`.

- [ ] **Step 1: Test des règles (rouge)**

Créer `tests/unit/compliance-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { consentsRepo, dsrRepo, retentionRepo } from "@/lib/repos/compliance";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const userNamed = (name: string) => getStore().users.find((u) => u.displayName === name && u.roleCode === "USER" && u.companyId === null)!;
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;
const counts = () => {
  const s = getStore();
  return { audit: s.auditLogs.length, access: s.dataAccessLogs.length, activity: s.activity.length };
};

describe("taking a request in charge", () => {
  it("moves a received request to in progress, records the handler and writes the three journals", () => {
    const target = dsrOf("Ndèye Diouf", "ACCESS");
    const before = counts();
    const result = dsrRepo.transition(target.id, "IN_PROGRESS", "", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("IN_PROGRESS");
    expect(target.handledBy).toBe("tester@sira.app");
    expect(target.resolvedAt).toBeNull();
    expect(target.resolutionNotes).toBeNull();
    const s = getStore();
    expect(counts()).toEqual({ audit: before.audit + 1, access: before.access + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: target.companyId, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "UPDATE",
      entityType: "DataSubjectRequest", entityId: target.id, beforeState: { status: "RECEIVED" },
      afterState: { status: "IN_PROGRESS" }, ipAddress: null, userAgent: null, sourceService: "audit-compliance-service",
      occurredAt: NOW.toISOString(), createdAt: NOW.toISOString(),
    });
    expect(s.dataAccessLogs.at(-1)).toMatchObject({
      accessedByUserId: null, accessedByLabel: "tester@sira.app", dataSubjectType: "CUSTOMER",
      dataSubjectId: target.requesterUserId, dataCategory: "IDENTITY", accessReason: "LEGAL_OBLIGATION",
      accessType: "MODIFY", ipAddress: null, createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ actor: "tester@sira.app", at: NOW.toISOString(), companyId: target.companyId });
    expect(s.activity[0]!.action).toBe("Demande RGPD (Accès) : reçue → en cours");
  });
});

describe("closing and rejecting a request", () => {
  it("closes an in-progress request with trimmed notes and a resolution date", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    dsrRepo.transition(target.id, "COMPLETED", "  Données effacées.  ", "tester@sira.app", NOW);
    expect(target.status).toBe("COMPLETED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    expect(target.resolutionNotes).toBe("Données effacées.");
    expect(target.handledBy).toBe("tester@sira.app");
    expect(getStore().auditLogs.at(-1)).toMatchObject({ beforeState: { status: "IN_PROGRESS" }, afterState: { status: "COMPLETED" } });
  });

  it("rejects an in-progress request with notes", () => {
    const target = dsrOf("Aïssatou Sarr", "OBJECTION");
    dsrRepo.transition(target.id, "REJECTED", "Demande infondée.", "tester@sira.app", NOW);
    expect(target.status).toBe("REJECTED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    expect(getStore().auditLogs.at(-1)!.afterState).toEqual({ status: "REJECTED" });
  });

  it("keeps the notes out of the journals", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    dsrRepo.transition(target.id, "COMPLETED", "NOTE-CONFIDENTIELLE", "tester@sira.app", NOW);
    const s = getStore();
    expect(JSON.stringify([s.auditLogs.at(-1), s.dataAccessLogs.at(-1), s.activity[0]])).not.toContain("NOTE-CONFIDENTIELLE");
  });

  it("refuses an unknown request", () => {
    expect(() => dsrRepo.transition("00000000-0000-4000-8000-000000000000", "COMPLETED", "n")).toThrow("Demande introuvable");
  });

  it("refuses blank notes for a closing or a rejection and changes nothing", () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    const before = counts();
    expect(() => dsrRepo.transition(target.id, "COMPLETED", "   ")).toThrow("Des notes de résolution sont obligatoires");
    expect(() => dsrRepo.transition(target.id, "REJECTED", "")).toThrow("Des notes de résolution sont obligatoires");
    expect(target.status).toBe("IN_PROGRESS");
    expect(counts()).toEqual(before);
  });

  it("does not need notes to take a request in charge", () => {
    expect(() => dsrRepo.transition(dsrOf("Ndèye Diouf", "ACCESS").id, "IN_PROGRESS", "", "tester@sira.app", NOW)).not.toThrow();
  });

  it("refuses to close or reject a request that was only received, and changes nothing", () => {
    const target = dsrOf("Pape Mbaye", "RECTIFICATION");
    const before = counts();
    expect(() => dsrRepo.transition(target.id, "COMPLETED", "notes")).toThrow("Une demande reçue doit d'abord être prise en charge");
    expect(() => dsrRepo.transition(target.id, "REJECTED", "notes")).toThrow("Une demande reçue doit d'abord être prise en charge");
    expect(target.status).toBe("RECEIVED");
    expect(target.handledBy).toBeNull();
    expect(counts()).toEqual(before);
  });

  it("refuses to take an already handled request in charge again", () => {
    expect(() => dsrRepo.transition(dsrOf("Lamine Camara", "ERASURE").id, "IN_PROGRESS", "")).toThrow("Cette demande est déjà prise en charge");
  });

  it("refuses any move on a closed request and keeps its resolution", () => {
    const target = dsrOf("Aïssatou Sarr", "PORTABILITY");
    const resolvedAt = target.resolvedAt;
    for (const to of ["IN_PROGRESS", "COMPLETED", "REJECTED"] as const) {
      expect(() => dsrRepo.transition(target.id, to, "notes")).toThrow("Cette demande est déjà close");
    }
    expect(target.status).toBe("COMPLETED");
    expect(target.resolvedAt).toBe(resolvedAt);
  });

  it("checks the guards in order: unknown, notes, transition", () => {
    const received = dsrOf("Pape Mbaye", "RECTIFICATION");
    expect(() => dsrRepo.transition(received.id, "COMPLETED", "")).toThrow("Des notes de résolution sont obligatoires");
    const closed = dsrOf("Aïssatou Sarr", "PORTABILITY");
    expect(() => dsrRepo.transition(closed.id, "COMPLETED", "")).toThrow("Des notes de résolution sont obligatoires");
  });
});

describe("changing a company's retention", () => {
  it("sets the duration, journals the change and keeps the old value in the audit line", () => {
    const company = companyNamed("Casamance Trans");
    expect(company.dataRetentionDays).toBeNull();
    const before = counts();
    const result = retentionRepo.set(company.id, 90, "  Demande de la compagnie  ", "tester@sira.app", NOW);
    expect(result).toBe(company);
    expect(company.dataRetentionDays).toBe(90);
    const s = getStore();
    expect(counts()).toEqual({ audit: before.audit + 1, access: before.access, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: company.id, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "UPDATE",
      entityType: "Company", entityId: company.id, beforeState: { dataRetentionDays: "null" },
      afterState: { dataRetentionDays: "90" }, ipAddress: null, sourceService: "company-service", createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ companyId: company.id, actor: "tester@sira.app", at: NOW.toISOString() });
    expect(s.activity[0]!.action).toBe("Durée de rétention de Casamance Trans : 730 → 90 jours. Motif : Demande de la compagnie");
  });

  it("records an explicit previous value and shows the lines that become pending", () => {
    const company = getStore().companies.find((c) => c.dataRetentionDays === 365)!;
    retentionRepo.set(company.id, 180, "Alignement", "tester@sira.app", NOW);
    expect(getStore().auditLogs.at(-1)!.beforeState).toEqual({ dataRetentionDays: "365" });
    const row = retentionRepo.listRows(NOW).find((r) => r.companyId === company.id)!;
    expect(row.effectiveDays).toBe(180);
    expect(row.pendingRows).toBeGreaterThan(0);
  });

  it("accepts the two bounds and refuses just outside them", () => {
    const company = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(company.id, 89, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    expect(() => retentionRepo.set(company.id, 3651, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    expect(company.dataRetentionDays).toBeNull();
    retentionRepo.set(company.id, 90, "motif", "tester@sira.app", NOW);
    retentionRepo.set(company.id, 3650, "motif", "tester@sira.app", NOW);
    expect(company.dataRetentionDays).toBe(3650);
  });

  it("refuses a non-integer or non-finite duration", () => {
    const company = companyNamed("Casamance Trans");
    for (const bad of [100.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => retentionRepo.set(company.id, bad, "motif")).toThrow("La durée doit être un nombre entier de jours compris entre 90 et 3650");
    }
  });

  it("refuses an unknown company and a blank reason without writing anything", () => {
    const company = companyNamed("Casamance Trans");
    const before = counts();
    expect(() => retentionRepo.set("00000000-0000-4000-8000-000000000000", 100, "motif")).toThrow("Compagnie introuvable");
    expect(() => retentionRepo.set(company.id, 100, "   ")).toThrow("Un motif est obligatoire");
    expect(company.dataRetentionDays).toBeNull();
    expect(counts()).toEqual(before);
  });

  it("refuses the current effective duration, explicit or default", () => {
    const custom = getStore().companies.find((c) => c.dataRetentionDays === 365)!;
    expect(() => retentionRepo.set(custom.id, 365, "motif")).toThrow("La durée de rétention est déjà de 365 jours");
    const byDefault = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(byDefault.id, 730, "motif")).toThrow("La durée de rétention est déjà de 730 jours");
  });

  it("checks the guards in order: unknown, reason, range, unchanged", () => {
    const company = companyNamed("Casamance Trans");
    expect(() => retentionRepo.set(company.id, 10, "")).toThrow("Un motif est obligatoire");
    expect(() => retentionRepo.set(company.id, 10, "motif")).toThrow("La durée doit être un nombre entier");
    expect(() => retentionRepo.set(company.id, 730, "motif")).toThrow("déjà de 730 jours");
  });
});

describe("consulting a user's consents", () => {
  it("returns the full history newest first, flags the current states and logs the access with its reason", () => {
    const user = userNamed("Aïssatou Sarr");
    const records = getStore().consentRecords.filter((r) => r.userId === user.id);
    const before = counts();
    const entries = consentsRepo.consult(user.id, "INVESTIGATION", "tester@sira.app", NOW);
    expect(entries).toHaveLength(records.length);
    for (let i = 1; i < entries.length; i++) expect(entries[i - 1]!.at >= entries[i]!.at).toBe(true);
    expect(entries.filter((e) => e.isCurrent).length).toBeGreaterThan(0);
    expect(entries.filter((e) => e.isCurrent).length).toBeLessThan(entries.length);
    expect(Object.keys(entries[0]!).sort()).toEqual(["at", "companyName", "consentType", "consentVersion", "id", "isCurrent", "source", "status"]);
    expect(counts()).toEqual({ audit: before.audit, access: before.access + 1, activity: before.activity });
    expect(getStore().dataAccessLogs.at(-1)).toMatchObject({
      accessedByUserId: null, accessedByLabel: "tester@sira.app", dataSubjectType: "CUSTOMER", dataSubjectId: user.id,
      dataCategory: "CONSENT", accessReason: "INVESTIGATION", accessType: "VIEW", ipAddress: null, createdAt: NOW.toISOString(),
    });
  });

  it("types an employee's data subject accordingly and works for every valid reason", () => {
    const s = getStore();
    const employee = s.users.find((u) => u.companyId !== null && s.consentRecords.some((r) => r.userId === u.id))!;
    for (const reason of ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"]) {
      consentsRepo.consult(employee.id, reason, "tester@sira.app", NOW);
    }
    const rows = s.dataAccessLogs.slice(-4);
    expect(rows.map((r) => r.accessReason)).toEqual(["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"]);
    expect(rows.every((r) => r.dataSubjectType === "EMPLOYEE")).toBe(true);
  });

  it("refuses an invalid reason and an unknown user without writing a line", () => {
    const user = userNamed("Aïssatou Sarr");
    const before = counts();
    expect(() => consentsRepo.consult(user.id, "CURIOSITY")).toThrow("Motif d'accès invalide");
    expect(() => consentsRepo.consult(user.id, "")).toThrow("Motif d'accès invalide");
    expect(() => consentsRepo.consult("00000000-0000-4000-8000-000000000000", "INVESTIGATION")).toThrow("Utilisateur introuvable");
    expect(counts()).toEqual(before);
  });

  it("checks the reason before the user", () => {
    expect(() => consentsRepo.consult("00000000-0000-4000-8000-000000000000", "CURIOSITY")).toThrow("Motif d'accès invalide");
  });

  it("never rewrites the consent history it reads", () => {
    const user = userNamed("Aïssatou Sarr");
    const snapshot = JSON.stringify(getStore().consentRecords);
    consentsRepo.consult(user.id, "INVESTIGATION", "tester@sira.app", NOW);
    expect(JSON.stringify(getStore().consentRecords)).toBe(snapshot);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/compliance-rules.test.ts` → FAIL (`dsrRepo.transition is not a function`).

- [ ] **Step 3: Implémenter**

Dans `src/lib/repos/compliance.ts`, ajouter l'import `import { addActivity } from "@/lib/repos/activity";`, puis ajouter (après `currentConsents`, avant `auditRepo`) deux fonctions d'ajout, qui sont **les seules écritures dans les journaux** :

```ts
let appendSeq = 1;

/** The only way a backoffice action adds to the audit trail; existing lines are never touched. */
function appendAudit(
  row: Pick<AuditLog, "companyId" | "action" | "entityType" | "entityId" | "beforeState" | "afterState" | "sourceService">,
  actor: string, now: Date,
): void {
  getStore().auditLogs.push({
    id: `audit-${now.getTime()}-${appendSeq++}`, actorUserId: null, actorLabel: actor, actorType: "USER",
    ipAddress: null, userAgent: null, occurredAt: now.toISOString(), createdAt: now.toISOString(), ...row,
  });
}

function appendAccess(
  row: Pick<DataAccessLog, "dataSubjectType" | "dataSubjectId" | "dataCategory" | "accessReason" | "accessType">,
  actor: string, now: Date,
): void {
  getStore().dataAccessLogs.push({
    id: `access-${now.getTime()}-${appendSeq++}`, accessedByUserId: null, accessedByLabel: actor,
    ipAddress: null, createdAt: now.toISOString(), ...row,
  });
}

const DSR_STATUS_TEXT: Record<DsrStatus, string> = {
  RECEIVED: "reçue", IN_PROGRESS: "en cours", COMPLETED: "clôturée", REJECTED: "rejetée",
};
const DSR_TYPE_TEXT: Record<DsrType, string> = {
  ACCESS: "Accès", RECTIFICATION: "Rectification", ERASURE: "Effacement",
  PORTABILITY: "Portabilité", RESTRICTION: "Limitation", OBJECTION: "Opposition",
};
```

Dans `dsrRepo`, après `detail`, ajouter :

```ts
  /**
   * Moves a request along the workflow. Guards, in this order: request exists, resolution notes (required to close
   * or reject), transition allowed. Writes an audit line, a data-access line and an activity entry.
   */
  transition(
    requestId: string, target: DsrStatus, notes: string, actor = "admin@sira.app", now: Date = new Date(),
  ): DataSubjectRequest {
    const s = getStore();
    const request = s.dataSubjectRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("Demande introuvable");
    const text = notes.trim();
    if (target !== "IN_PROGRESS" && !text) throw new Error("Des notes de résolution sont obligatoires");
    const blocked = dsrTransitionBlock(request, target);
    if (blocked) throw new Error(blocked);
    const previous = request.status;
    request.status = target;
    request.handledBy = actor;
    if (target !== "IN_PROGRESS") {
      request.resolvedAt = now.toISOString();
      request.resolutionNotes = text;
    }
    appendAudit({
      companyId: request.companyId, action: "UPDATE", entityType: "DataSubjectRequest", entityId: request.id,
      beforeState: { status: previous }, afterState: { status: target }, sourceService: "audit-compliance-service",
    }, actor, now);
    const subject = s.users.find((u) => u.id === request.requesterUserId);
    appendAccess({
      dataSubjectType: subject ? subjectTypeOf(subject) : "USER", dataSubjectId: request.requesterUserId,
      dataCategory: "IDENTITY", accessReason: "LEGAL_OBLIGATION", accessType: "MODIFY",
    }, actor, now);
    addActivity(
      request.companyId, actor,
      `Demande RGPD (${DSR_TYPE_TEXT[request.requestType]}) : ${DSR_STATUS_TEXT[previous]} → ${DSR_STATUS_TEXT[target]}`, now,
    );
    return request;
  },
```

Dans `consentsRepo`, après `userOptions`, ajouter :

```ts
  /**
   * Reads a user's consent history on behalf of the platform. Guards, in this order: valid access reason, user
   * exists. A refused call writes nothing; a successful one adds a `VIEW` / `CONSENT` line to the data-access log.
   */
  consult(userId: string, accessReason: string, actor = "admin@sira.app", now: Date = new Date()): ConsentEntryView[] {
    const s = getStore();
    if (!(ACCESS_REASONS as readonly string[]).includes(accessReason)) throw new Error("Motif d'accès invalide");
    const user = s.users.find((u) => u.id === userId);
    if (!user) throw new Error("Utilisateur introuvable");
    appendAccess({
      dataSubjectType: subjectTypeOf(user), dataSubjectId: user.id, dataCategory: "CONSENT",
      accessReason: accessReason as AccessReason, accessType: "VIEW",
    }, actor, now);
    const current = new Set(currentConsents().map((r) => r.id));
    return s.consentRecords
      .filter((r) => r.userId === userId)
      .sort(newest((r) => r.createdAt))
      .map((r): ConsentEntryView => ({
        id: r.id, consentType: r.consentType, companyName: r.companyId ? companyName(r.companyId) : null,
        status: r.status, consentVersion: r.consentVersion, source: r.source, at: r.createdAt, isCurrent: current.has(r.id),
      }));
  },
```

Dans `retentionRepo`, après `listRows`, ajouter :

```ts
  /**
   * Sets a company's retention. Guards, in this order: company exists, reason, whole number of days between 90
   * and 3650, different from the current effective duration. Shortening it makes older lines due for anonymisation
   * at the next run of the daily job (not simulated).
   */
  set(companyId: string, days: number, reason: string, actor = "admin@sira.app", now: Date = new Date()): Company {
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
      throw new Error(`La durée doit être un nombre entier de jours compris entre ${MIN_RETENTION_DAYS} et ${MAX_RETENTION_DAYS}`);
    }
    const effective = effectiveRetentionDays(company);
    if (days === effective) throw new Error(`La durée de rétention est déjà de ${effective} jours`);
    const previous = company.dataRetentionDays;
    company.dataRetentionDays = days;
    appendAudit({
      companyId: company.id, action: "UPDATE", entityType: "Company", entityId: company.id,
      beforeState: { dataRetentionDays: previous === null ? "null" : String(previous) },
      afterState: { dataRetentionDays: String(days) }, sourceService: "company-service",
    }, actor, now);
    addActivity(company.id, actor, `Durée de rétention de ${company.name} : ${effective} → ${days} jours. Motif : ${motif}`, now);
    return company;
  },
```

Run: `pnpm test tests/unit/compliance-rules.test.ts` puis `pnpm test tests/unit/compliance-repo.test.ts` (le test « is read-only » de la Task 3 attend `Object.keys(auditRepo)` = `["detail","listRows"]` : inchangé, car `auditRepo` n'a pas de mutation ; `accessRepo` non plus). → PASS.

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer la ligne `if (target !== "IN_PROGRESS" && !text) throw …` : échoue `refuses blank notes for a closing or a rejection and changes nothing`.
2. Remplacer `target !== "IN_PROGRESS" && !text` par `!text` : échoue `does not need notes to take a request in charge`.
3. Supprimer l'appel `appendAudit` de `transition` : échoue le premier test.
4. Supprimer l'appel `appendAccess` de `transition` : échoue le premier test.
5. Inverser l'ordre notes / transition (placer le contrôle de transition avant les notes) : échoue `checks the guards in order: unknown, notes, transition`.
6. Dans `dsrTransitionBlock`, retirer la ligne `!isOpen(request)` : échoue `refuses any move on a closed request and keeps its resolution`.
7. Dans `transition`, ajouter `notes` à l'état de l'audit : échoue `keeps the notes out of the journals`.
8. Dans `set`, remplacer `days < MIN_RETENTION_DAYS` par `days <= MIN_RETENTION_DAYS` : échoue `accepts the two bounds and refuses just outside them` ; faire de même avec `>= MAX_RETENTION_DAYS`.
9. Dans `set`, retirer `!Number.isInteger(days) ||` : échoue `refuses a non-integer or non-finite duration`.
10. Dans `set`, comparer `days === company.dataRetentionDays` au lieu de `effective` : échoue `refuses the current effective duration, explicit or default`.
11. Dans `consult`, déplacer `appendAccess` avant le contrôle du motif : échoue `refuses an invalid reason and an unknown user without writing a line`.
12. Dans `consult`, intervertir les deux gardes : échoue `checks the reason before the user`.

- [ ] **Step 4: Test et implémentation des actions**

Créer `tests/unit/compliance-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import {
  completeDataSubjectRequest, consultUserConsents, rejectDataSubjectRequest, setCompanyRetention,
  startDataSubjectRequest,
} from "@/app/(admin)/conformite/actions";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;
const clientNamed = (name: string) => getStore().users.find((u) => u.displayName === name && u.companyId === null)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("request actions", () => {
  it("write nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    const inProgress = dsrOf("Lamine Camara", "ERASURE");
    const n = getStore().auditLogs.length;
    expect(await startDataSubjectRequest(received.id)).toEqual(EXPIRED);
    expect(await completeDataSubjectRequest(inProgress.id, "notes")).toEqual(EXPIRED);
    expect(await rejectDataSubjectRequest(inProgress.id, "notes")).toEqual(EXPIRED);
    expect([received.status, inProgress.status]).toEqual(["RECEIVED", "IN_PROGRESS"]);
    expect(getStore().auditLogs).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("take a request in charge, close it and reject another, journaling the actor and revalidating the pages", async () => {
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    expect(await startDataSubjectRequest(received.id)).toEqual({ ok: true });
    expect(received).toMatchObject({ status: "IN_PROGRESS", handledBy: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/conformite/demandes-rgpd", `/conformite/demandes-rgpd/${received.id}`, "/conformite/journal-audit", "/conformite/acces-donnees",
    ]));

    const toClose = dsrOf("Lamine Camara", "ERASURE");
    expect(await completeDataSubjectRequest(toClose.id, "  Données effacées  ")).toEqual({ ok: true });
    expect(toClose).toMatchObject({ status: "COMPLETED", resolutionNotes: "Données effacées" });

    const toReject = dsrOf("Aïssatou Sarr", "OBJECTION");
    expect(await rejectDataSubjectRequest(toReject.id, "Infondée")).toEqual({ ok: true });
    expect(toReject.status).toBe("REJECTED");
  });

  it("accept notes of exactly 500 characters and refuse 501 without changing anything", async () => {
    const target = dsrOf("Lamine Camara", "ERASURE");
    expect(await completeDataSubjectRequest(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(await rejectDataSubjectRequest(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("IN_PROGRESS");
    expect(await completeDataSubjectRequest(target.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("return the rule's message as an error result and revalidate nothing", async () => {
    expect(await completeDataSubjectRequest(dsrOf("Pape Mbaye", "RECTIFICATION").id, "notes")).toEqual({
      ok: false, error: "Une demande reçue doit d'abord être prise en charge",
    });
    expect(await startDataSubjectRequest(dsrOf("Lamine Camara", "ERASURE").id)).toEqual({ ok: false, error: "Cette demande est déjà prise en charge" });
    expect(await rejectDataSubjectRequest(dsrOf("Aïssatou Sarr", "PORTABILITY").id, "notes")).toEqual({ ok: false, error: "Cette demande est déjà close" });
    expect(await startDataSubjectRequest("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Demande introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuse a blank id or blank notes", async () => {
    expect((await startDataSubjectRequest("")).ok).toBe(false);
    expect((await completeDataSubjectRequest("", "notes")).ok).toBe(false);
    expect((await completeDataSubjectRequest(dsrOf("Lamine Camara", "ERASURE").id, "  ")).ok).toBe(false);
    expect(dsrOf("Lamine Camara", "ERASURE").status).toBe("IN_PROGRESS");
  });
});

describe("setCompanyRetention", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, "motif")).toEqual(EXPIRED);
    expect(company.dataRetentionDays).toBeNull();
  });

  it("sets the duration, journals the actor and revalidates the affected pages", async () => {
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, " Demande de la compagnie ")).toEqual({ ok: true });
    expect(company.dataRetentionDays).toBe(90);
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: company.id });
    expect(paths()).toEqual(expect.arrayContaining([
      "/conformite/retention", "/conformite/journal-audit", `/compagnies/${company.id}`,
    ]));
  });

  it("refuses 501 characters, an out-of-range or unchanged duration, an unknown company and blank input", async () => {
    const company = companyNamed("Casamance Trans");
    expect(await setCompanyRetention(company.id, 90, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(await setCompanyRetention(company.id, 50, "motif")).toEqual({
      ok: false, error: "La durée doit être un nombre entier de jours compris entre 90 et 3650",
    });
    expect(await setCompanyRetention(company.id, 730, "motif")).toEqual({ ok: false, error: "La durée de rétention est déjà de 730 jours" });
    expect(await setCompanyRetention("00000000-0000-4000-8000-000000000000", 90, "motif")).toEqual({ ok: false, error: "Compagnie introuvable" });
    expect((await setCompanyRetention("", 90, "motif")).ok).toBe(false);
    expect((await setCompanyRetention(company.id, 90, "  ")).ok).toBe(false);
    expect(company.dataRetentionDays).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("consultUserConsents", () => {
  it("returns nothing and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().dataAccessLogs.length;
    expect(await consultUserConsents(clientNamed("Aïssatou Sarr").id, "INVESTIGATION")).toEqual(EXPIRED);
    expect(getStore().dataAccessLogs).toHaveLength(n);
  });

  it("returns the history after logging the access with its reason, and revalidates the access log", async () => {
    const user = clientNamed("Aïssatou Sarr");
    const n = getStore().dataAccessLogs.length;
    const result = await consultUserConsents(user.id, "SUPPORT_REQUEST");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(getStore().consentRecords.filter((r) => r.userId === user.id).length);
      expect(JSON.stringify(result.value)).not.toMatch(/@|\+221/);
    }
    expect(getStore().dataAccessLogs).toHaveLength(n + 1);
    expect(getStore().dataAccessLogs.at(-1)).toMatchObject({ accessedByLabel: "tester@sira.app", accessReason: "SUPPORT_REQUEST", dataCategory: "CONSENT" });
    expect(paths()).toContain("/conformite/acces-donnees");
  });

  it("refuses an invalid reason, an unknown user and blank input without logging", async () => {
    const user = clientNamed("Aïssatou Sarr");
    const n = getStore().dataAccessLogs.length;
    expect(await consultUserConsents(user.id, "CURIOSITY")).toEqual({ ok: false, error: "Motif d'accès invalide" });
    expect(await consultUserConsents("00000000-0000-4000-8000-000000000000", "INVESTIGATION")).toEqual({ ok: false, error: "Utilisateur introuvable" });
    expect((await consultUserConsents("", "INVESTIGATION")).ok).toBe(false);
    expect(getStore().dataAccessLogs).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

Créer `src/app/(admin)/conformite/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  requireReason, requireString, run, runValue, type ActionResult, type ValueResult,
} from "@/lib/actions/run";
import { consentsRepo, dsrRepo, retentionRepo, type ConsentEntryView } from "@/lib/repos/compliance";
import type { DataSubjectRequest } from "@/lib/types";

function refreshRequest(request: DataSubjectRequest) {
  revalidatePath("/");
  revalidatePath("/conformite/demandes-rgpd");
  revalidatePath(`/conformite/demandes-rgpd/${request.id}`);
  revalidatePath("/conformite/journal-audit");
  revalidatePath("/conformite/acces-donnees");
  if (request.companyId) revalidatePath(`/compagnies/${request.companyId}`);
}

export async function startDataSubjectRequest(requestId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(requestId, "Demande");
    refreshRequest(dsrRepo.transition(requestId, "IN_PROGRESS", "", actor));
  });
}

export async function completeDataSubjectRequest(requestId: string, notes: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(requestId, "Demande");
    const text = requireReason(notes);
    refreshRequest(dsrRepo.transition(requestId, "COMPLETED", text, actor));
  });
}

export async function rejectDataSubjectRequest(requestId: string, notes: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(requestId, "Demande");
    const text = requireReason(notes);
    refreshRequest(dsrRepo.transition(requestId, "REJECTED", text, actor));
  });
}

export async function setCompanyRetention(companyId: string, days: number, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    const motif = requireReason(reason);
    const company = retentionRepo.set(companyId, days, motif, actor);
    revalidatePath("/conformite/retention");
    revalidatePath("/conformite/journal-audit");
    revalidatePath(`/compagnies/${company.id}`);
  });
}

export async function consultUserConsents(userId: string, accessReason: string): Promise<ValueResult<ConsentEntryView[]>> {
  return runValue((actor) => {
    requireString(userId, "Utilisateur");
    const entries = consentsRepo.consult(userId, accessReason, actor);
    revalidatePath("/conformite/acces-donnees");
    return entries;
  });
}
```

Mutations des actions : (a) appeler `dsrRepo.transition` hors de `run` → échoue `write nothing without a session` ; (b) remplacer `requireReason(notes)` par `notes.trim()` dans `completeDataSubjectRequest` → échoue le test des 501 caractères ; (c) idem dans `rejectDataSubjectRequest` ; (d) retirer `revalidatePath("/conformite/acces-donnees")` de `refreshRequest` → échoue le test de revalidation ; (e) dans `consultUserConsents`, appeler `runValue` après avoir lu `consentsRepo.consult` hors de la fonction (casser l'ordre session d'abord) → échoue `returns nothing and writes nothing without a session`.

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/compliance.ts "src/app/(admin)/conformite/actions.ts" tests/unit/compliance-rules.test.ts tests/unit/compliance-actions.test.ts
git commit -m "feat: data-subject request workflow, retention change, consent consultation and actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Pages du journal d'audit et du journal d'accès

**Files:**
- Create: `src/app/(admin)/conformite/journal-audit/{page.tsx,audit-table.tsx}`, `src/app/(admin)/conformite/journal-audit/[id]/{page.tsx,not-found.tsx}`, `src/app/(admin)/conformite/acces-donnees/{page.tsx,access-table.tsx}`

**Interfaces:**
- Consumes: `auditRepo`, `accessRepo`, `AUDIT_ACTIONS`, `ACCESS_TYPES`, `DATA_CATEGORIES`, `parseCompanyFilter`, `CompanyFilter`, libellés des Tasks 1 et 3.
- Produces: pages `/conformite/journal-audit`, `/conformite/journal-audit/[id]`, `/conformite/acces-donnees`. `data-testid` : `audit-change` (une ligne par champ, `data-changed="true|false"`), `audit-readonly`.

Pas de test unitaire (couverture E2E à la Task 7) ; `pnpm typecheck` est la vérification.

- [ ] **Step 1: Liste du journal d'audit**

Créer `src/app/(admin)/conformite/journal-audit/audit-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, auditActorTypeLabel } from "@/lib/labels";
import type { AuditRow } from "@/lib/repos/compliance";

const columns: ColumnDef<AuditRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "actorLabel", header: "Acteur" },
  { id: "actorType", header: "Type d'acteur", accessorFn: (r) => auditActorTypeLabel(r.actorType) },
  {
    accessorKey: "action", header: "Action",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.action === "LOGIN_FAILED" ? "danger" : "neutral"}>{auditActionLabel(row.original.action)}</StatusBadge>
    ),
  },
  {
    id: "entity", header: "Entité", accessorFn: (r) => `${r.entityType} ${r.entityRef}`,
    cell: ({ row }) => (
      <span>{row.original.entityType} <span className="text-xs text-muted-foreground">{row.original.entityRef}</span></span>
    ),
  },
  { accessorKey: "sourceService", header: "Service", cell: ({ row }) => row.original.sourceService ?? "—" },
  { accessorKey: "ipTruncated", header: "Adresse IP" },
];

export function AuditTable({ lines }: { lines: AuditRow[] }) {
  return (
    <DataTable
      columns={columns} data={lines} rowHref={(r) => `/conformite/journal-audit/${r.id}`}
      searchPlaceholder="Rechercher dans le journal…" emptyMessage="Aucune ligne de journal."
    />
  );
}
```

Créer `src/app/(admin)/conformite/journal-audit/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { AUDIT_ACTIONS, auditRepo } from "@/lib/repos/compliance";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { AuditTable } from "./audit-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/journal-audit";
const ACTION_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "CREATE", label: "Création" },
  { value: "UPDATE", label: "Modification" },
  { value: "LOGIN", label: "Connexion" },
  { value: "LOGIN_FAILED", label: "Échec de connexion" },
  { value: "PERMISSION_CHANGE", label: "Changement de permission" },
];

export default async function AuditLogPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; action?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const action = parseFilter(sp.action, AUDIT_ACTIONS);
  const keep = { compagnie: companyId, action };
  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Actions sensibles de toute la plateforme, de la plus récente à la plus ancienne. Les adresses IP sont tronquées."
      />
      <p data-testid="audit-readonly" className="mb-4 text-sm text-muted-foreground">
        Journal en lecture seule : aucune ligne ne peut être modifiée ni supprimée.
      </p>
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={ACTION_OPTIONS} current={action} param="action" keep={keep} label="Filtrer par action" />
      <AuditTable lines={auditRepo.listRows({ companyId, action })} />
    </>
  );
}
```

- [ ] **Step 2: Fiche d'une ligne**

Créer `src/app/(admin)/conformite/journal-audit/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, auditActorTypeLabel } from "@/lib/labels";
import { auditRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default async function AuditLineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = auditRepo.detail(id);
  if (!detail) notFound();
  const { row } = detail;
  return (
    <>
      <PageHeader
        title={`${auditActionLabel(row.action)} · ${row.entityType}`}
        description={`${row.companyName} · ${formatDateTime(row.createdAt)}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Origine</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Acteur">{row.actorLabel}</DetailRow>
            <DetailRow label="Type d'acteur">{auditActorTypeLabel(row.actorType)}</DetailRow>
            <DetailRow label="Compagnie">
              {row.companyId ? <Link href={`/compagnies/${row.companyId}`} className="hover:underline">{row.companyName}</Link> : row.companyName}
            </DetailRow>
            <DetailRow label="Service source">{row.sourceService ?? "—"}</DetailRow>
            <DetailRow label="Adresse IP">{row.ipTruncated}</DetailRow>
            <DetailRow label="Agent utilisateur">{detail.userAgent}</DetailRow>
            <DetailRow label="Reçue le">{formatDateTime(row.createdAt)}</DetailRow>
            <DetailRow label="Survenue le (horloge du producteur)">{detail.occurredAt ? formatDateTime(detail.occurredAt) : "—"}</DetailRow>
            <DetailRow label="Entité">{row.entityType}</DetailRow>
            <DetailRow label="Identifiant">{detail.entityId}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avant / après</CardTitle></CardHeader>
          <CardContent>
            {detail.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cette action n&apos;enregistre aucun état.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Champ</th>
                    <th className="py-1 font-medium">Avant</th>
                    <th className="py-1 font-medium">Après</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.changes.map((c) => (
                    <tr
                      key={c.key} data-testid="audit-change" data-changed={c.changed ? "true" : "false"}
                      className={`border-t border-border ${c.changed ? "bg-warning/10" : ""}`}
                    >
                      <td className="py-1.5 font-medium">{c.key}</td>
                      <td>{c.before ?? "—"}</td>
                      <td>{c.after ?? "—"}</td>
                    </tr>
                  ))}
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

Créer `src/app/(admin)/conformite/journal-audit/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AuditLineNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Ligne de journal introuvable</p>
        <Link href="/conformite/journal-audit" className="mt-2 inline-block text-sm text-accent underline">Retour au journal d&apos;audit</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Accès aux données**

Créer `src/app/(admin)/conformite/acces-donnees/access-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel, accessTypeLabel, dataCategoryLabel } from "@/lib/labels";
import type { AccessRow } from "@/lib/repos/compliance";

const SUBJECT_TYPE = { CUSTOMER: "Client", EMPLOYEE: "Employé", USER: "Utilisateur" } as const;

const columns: ColumnDef<AccessRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "accessedByLabel", header: "Consulté par" },
  { id: "subject", header: "Personne concernée", accessorFn: (r) => `${SUBJECT_TYPE[r.subjectType]} ${r.subjectName}`,
    cell: ({ row }) => (
      <span>{row.original.subjectName} <span className="text-xs text-muted-foreground">({SUBJECT_TYPE[row.original.subjectType]})</span></span>
    ) },
  { id: "category", header: "Catégorie", accessorFn: (r) => dataCategoryLabel(r.dataCategory) },
  { id: "reason", header: "Motif", accessorFn: (r) => accessReasonLabel(r.accessReason) },
  { id: "type", header: "Accès", accessorFn: (r) => accessTypeLabel(r.accessType) },
  { accessorKey: "ipTruncated", header: "Adresse IP" },
];

export function AccessTable({ lines }: { lines: AccessRow[] }) {
  return (
    <DataTable
      columns={columns} data={lines}
      searchPlaceholder="Rechercher un accès…" emptyMessage="Aucun accès enregistré."
    />
  );
}
```

Créer `src/app/(admin)/conformite/acces-donnees/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { ACCESS_TYPES, DATA_CATEGORIES, accessRepo } from "@/lib/repos/compliance";
import { AccessTable } from "./access-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/acces-donnees";
const TYPE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "VIEW", label: "Consultations" },
  { value: "EXPORT", label: "Exports" },
  { value: "MODIFY", label: "Modifications" },
];
const CATEGORY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les catégories" },
  { value: "IDENTITY", label: "Identité" },
  { value: "CONSENT", label: "Consentement" },
];

export default async function DataAccessPage({
  searchParams,
}: { searchParams: Promise<{ type?: string; categorie?: string }> }) {
  const sp = await searchParams;
  const accessType = parseFilter(sp.type, ACCESS_TYPES);
  const category = parseFilter(sp.categorie, DATA_CATEGORIES);
  const keep = { type: accessType, categorie: category };
  return (
    <>
      <PageHeader
        title="Accès aux données"
        description="Qui a consulté, exporté ou modifié des données personnelles, pour quel motif. Journal en lecture seule ; les adresses IP sont tronquées."
      />
      <StatusFilterNav basePath={BASE} options={TYPE_OPTIONS} current={accessType} param="type" keep={keep} label="Filtrer par type d'accès" />
      <StatusFilterNav basePath={BASE} options={CATEGORY_OPTIONS} current={category} param="categorie" keep={keep} label="Filtrer par catégorie" />
      <AccessTable lines={accessRepo.listRows({ accessType, category })} />
    </>
  );
}
```

- [ ] **Step 4: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add "src/app/(admin)/conformite/journal-audit" "src/app/(admin)/conformite/acces-donnees"
git commit -m "feat: audit trail list and detail, and data access log pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Pages des demandes RGPD, des consentements et de la rétention

**Files:**
- Create: `src/components/compliance/{dsr-actions,consent-lookup,retention-table}.tsx`, `src/app/(admin)/conformite/demandes-rgpd/{page.tsx,requests-table.tsx}`, `src/app/(admin)/conformite/demandes-rgpd/[id]/{page.tsx,not-found.tsx}`, `src/app/(admin)/conformite/consentements/page.tsx`, `src/app/(admin)/conformite/retention/page.tsx`

**Interfaces:**
- Consumes: `dsrRepo`, `consentsRepo`, `retentionRepo`, constantes de filtre, actions de la Task 4, `parseFilter`, `KpiCard`, `ConfirmDialog`, libellés.
- Produces: pages `/conformite/demandes-rgpd`, `/conformite/demandes-rgpd/[id]`, `/conformite/consentements`, `/conformite/retention`. `data-testid` : `dsr-open`, `dsr-overdue`, `dsr-soon`, `dsr-closed`, `dsr-status`, `dsr-countdown`, `dsr-closed-note`, `dsr-resolution`, `consent-entry` (`data-current`), `consent-error`, `retention-pending`.

- [ ] **Step 1: Actions de la fiche d'une demande**

Créer `src/components/compliance/dsr-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  completeDataSubjectRequest, rejectDataSubjectRequest, startDataSubjectRequest,
} from "@/app/(admin)/conformite/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. `status` is the request's current status. */
export interface DsrActionsProps { requestId: string; status: "RECEIVED" | "IN_PROGRESS" }

export function DsrActions({ requestId, status }: DsrActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"start" | "complete" | "reject" | null>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <>
      {status === "RECEIVED" && <Button size="sm" onClick={() => setOpen("start")}>Prendre en charge</Button>}
      <Button size="sm" variant="secondary" onClick={() => setOpen("complete")}>Clôturer la demande</Button>
      <Button size="sm" variant="danger" onClick={() => setOpen("reject")}>Rejeter la demande</Button>

      <ConfirmDialog
        open={open === "start"} onOpenChange={close}
        title="Prendre en charge la demande"
        description="La demande passe à « En cours » et vous en devenez le responsable. Le délai légal continue de courir."
        confirmLabel="Confirmer la prise en charge"
        onConfirm={async () => {
          const r = await startDataSubjectRequest(requestId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
      <ConfirmDialog
        open={open === "complete"} onOpenChange={close}
        title="Clôturer la demande"
        description="Décrivez ce qui a été fait. La demande est close et ne peut plus être modifiée."
        confirmLabel="Confirmer la clôture" requireReason
        onConfirm={async (notes) => {
          const r = await completeDataSubjectRequest(requestId, notes);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
      <ConfirmDialog
        open={open === "reject"} onOpenChange={close}
        title="Rejeter la demande"
        description="Indiquez pourquoi la demande est rejetée. Le demandeur en est informé par la compagnie ou par la plateforme."
        confirmLabel="Confirmer le rejet" destructive requireReason
        onConfirm={async (notes) => {
          const r = await rejectDataSubjectRequest(requestId, notes);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Liste et fiche des demandes**

Créer `src/app/(admin)/conformite/demandes-rgpd/requests-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import type { DsrRow } from "@/lib/repos/compliance";

const columns: ColumnDef<DsrRow, unknown>[] = [
  { accessorKey: "requesterName", header: "Demandeur", cell: ({ row }) => <span className="font-medium">{row.original.requesterName}</span> },
  { id: "type", header: "Type", accessorFn: (r) => dsrTypeLabel(r.requestType) },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = dsrStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "dueDate", header: "Échéance", cell: ({ row }) => formatDate(row.original.dueDate) },
  {
    id: "deadline", header: "Délai", accessorFn: (r) => r.daysLeft ?? 9999,
    cell: ({ row }) => {
      const d = row.original.daysLeft;
      if (d === null) return "—";
      return (
        <StatusBadge tone={d < 0 ? "danger" : d <= 7 ? "warning" : "neutral"}>
          {d < 0 ? `En retard de ${-d} j` : `${d} j restants`}
        </StatusBadge>
      );
    },
  },
  { accessorKey: "handledBy", header: "Traité par", cell: ({ row }) => row.original.handledBy ?? "—" },
];

export function RequestsTable({ requests }: { requests: DsrRow[] }) {
  return (
    <DataTable
      columns={columns} data={requests} rowHref={(r) => `/conformite/demandes-rgpd/${r.id}`}
      searchPlaceholder="Rechercher une demande…" emptyMessage="Aucune demande."
    />
  );
}
```

Créer `src/app/(admin)/conformite/demandes-rgpd/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { DSR_STATUSES, DSR_TYPES, dsrRepo } from "@/lib/repos/compliance";
import { RequestsTable } from "./requests-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/demandes-rgpd";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "RECEIVED", label: "Reçues" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Clôturées" },
  { value: "REJECTED", label: "Rejetées" },
];
const TYPE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les types" },
  { value: "ACCESS", label: "Accès" },
  { value: "RECTIFICATION", label: "Rectification" },
  { value: "ERASURE", label: "Effacement" },
  { value: "PORTABILITY", label: "Portabilité" },
  { value: "RESTRICTION", label: "Limitation" },
  { value: "OBJECTION", label: "Opposition" },
];
const LATE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les échéances" },
  { value: "oui", label: "En retard" },
];

export default async function DataSubjectRequestsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string; type?: string; retard?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, DSR_STATUSES);
  const type = parseFilter(sp.type, DSR_TYPES);
  const late = parseFilter(sp.retard, ["oui"] as const);
  const keep = { statut: status, type, retard: late };
  const now = new Date();
  const stats = dsrRepo.stats(now);
  return (
    <>
      <PageHeader
        title="Demandes RGPD"
        description="Droits des personnes concernées : accès, rectification, effacement, portabilité, limitation, opposition. Le délai légal de traitement est de 30 jours."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="dsr-open"><KpiCard label="Ouvertes" value={formatNumber(stats.open)} /></div>
        <div data-testid="dsr-overdue">
          <KpiCard label="En retard" value={formatNumber(stats.overdue)} tone={stats.overdue > 0 ? "danger" : "default"} hint="Échéance dépassée" />
        </div>
        <div data-testid="dsr-soon">
          <KpiCard label="À échéance sous 7 jours" value={formatNumber(stats.dueSoon)} tone={stats.dueSoon > 0 ? "warning" : "default"} />
        </div>
        <div data-testid="dsr-closed"><KpiCard label="Closes" value={formatNumber(stats.closed)} /></div>
      </div>
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={TYPE_OPTIONS} current={type} param="type" keep={keep} label="Filtrer par type" />
      <StatusFilterNav basePath={BASE} options={LATE_OPTIONS} current={late} param="retard" keep={keep} label="Filtrer par échéance" />
      <RequestsTable requests={dsrRepo.listRows({ status, type, overdueOnly: late === "oui" }, now)} />
    </>
  );
}
```

Créer `src/app/(admin)/conformite/demandes-rgpd/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DsrActions } from "@/components/compliance/dsr-actions";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import { dsrRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default async function DataSubjectRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = dsrRepo.detail(id, new Date());
  if (!detail) notFound();
  const { request: r } = detail;
  const status = dsrStatusBadge(r.status);
  const open = r.status === "RECEIVED" || r.status === "IN_PROGRESS";
  return (
    <>
      <PageHeader
        title={`${dsrTypeLabel(r.requestType)} · ${detail.requesterName}`}
        description={`Demande reçue le ${formatDate(r.createdAt)}`}
        actions={
          <>
            <span data-testid="dsr-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {open && <DsrActions requestId={r.id} status={r.status as "RECEIVED" | "IN_PROGRESS"} />}
          </>
        }
      />
      {!open && (
        <p data-testid="dsr-closed-note" className="mb-4 text-sm text-muted-foreground">
          Cette demande est close : elle ne peut plus être modifiée.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Demande</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Demandeur">
              <Link href={`/utilisateurs/${detail.requesterUserId}`} className="hover:underline">{detail.requesterName}</Link>
            </DetailRow>
            <DetailRow label="Compagnie">
              {r.companyId ? <Link href={`/compagnies/${r.companyId}`} className="hover:underline">{detail.companyName}</Link> : "Niveau plateforme"}
            </DetailRow>
            <DetailRow label="Type">{dsrTypeLabel(r.requestType)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Échéance légale">{formatDate(r.dueDate)}</DetailRow>
            <DetailRow label="Délai">
              <span data-testid="dsr-countdown">
                {detail.daysLeft === null ? "—" : detail.overdue ? `En retard de ${-detail.daysLeft} j` : `${detail.daysLeft} j restants`}
              </span>
            </DetailRow>
            <DetailRow label="Traitée par">{r.handledBy ?? "—"}</DetailRow>
            <DetailRow label="Résolue le">{r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}</DetailRow>
          </dl></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Motif du demandeur</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{r.reason}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notes de résolution</CardTitle></CardHeader>
            <CardContent>
              {r.resolutionNotes
                ? <p data-testid="dsr-resolution" className="text-sm">{r.resolutionNotes}</p>
                : <p className="text-sm text-muted-foreground">Aucune note pour le moment.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/conformite/demandes-rgpd/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function DataSubjectRequestNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Demande introuvable</p>
        <Link href="/conformite/demandes-rgpd" className="mt-2 inline-block text-sm text-accent underline">Retour aux demandes</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Consentements**

Créer `src/components/compliance/consent-lookup.tsx` :

```tsx
"use client";

import { useState } from "react";
import { consultUserConsents } from "@/app/(admin)/conformite/actions";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel, consentSourceLabel, consentStatusBadge, consentTypeLabel } from "@/lib/labels";
import type { ConsentEntryView, ConsentUserOption } from "@/lib/repos/compliance";

const REASONS = ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"] as const;

/** Only account ids and labels come in; the history comes from the journaled server action. */
export function ConsentLookup({ users }: { users: ConsentUserOption[] }) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("SUPPORT_REQUEST");
  const [entries, setEntries] = useState<ConsentEntryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function consult() {
    setBusy(true);
    setError(null);
    const r = await consultUserConsents(userId, reason);
    setBusy(false);
    if (!r.ok) { setError(r.error); setEntries(null); return; }
    setEntries(r.value);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Utilisateur</span>
          <select
            aria-label="Utilisateur" value={userId} onChange={(e) => setUserId(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Motif d&apos;accès</span>
          <select
            aria-label="Motif d'accès" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {REASONS.map((r) => <option key={r} value={r}>{accessReasonLabel(r)}</option>)}
          </select>
        </label>
        <Button size="sm" onClick={consult} disabled={busy || !userId}>Consulter</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        La consultation est enregistrée dans le journal d&apos;accès aux données, avec le motif choisi.
      </p>
      {error && <p role="alert" data-testid="consent-error" className="text-sm text-danger">{error}</p>}
      {entries && (
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Consentement</th>
                <th className="px-3 py-2 font-medium">Compagnie</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const badge = consentStatusBadge(e.status);
                return (
                  <tr key={e.id} data-testid="consent-entry" data-current={e.isCurrent ? "true" : "false"} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{formatDateTime(e.at)}</td>
                    <td className="px-3 py-2">{consentTypeLabel(e.consentType)}</td>
                    <td className="px-3 py-2">{e.companyName ?? "—"}</td>
                    <td className="px-3 py-2"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                    <td className="px-3 py-2">{e.consentVersion}</td>
                    <td className="px-3 py-2">{consentSourceLabel(e.source)}</td>
                    <td className="px-3 py-2">{e.isCurrent ? "Courant" : "Remplacé"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

Créer `src/app/(admin)/conformite/consentements/page.tsx` :

```tsx
import { ConsentLookup } from "@/components/compliance/consent-lookup";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { consentTypeLabel } from "@/lib/labels";
import { consentsRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default function ConsentsPage() {
  const summary = consentsRepo.summary();
  return (
    <>
      <PageHeader
        title="Consentements"
        description="États courants par type et par compagnie. L'historique d'un utilisateur se consulte avec un motif d'accès déclaré et journalisé."
      />
      <Card className="mb-6">
        <CardHeader><CardTitle>États courants</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Consentement</th>
                <th className="py-1 font-medium">Portée</th>
                <th className="py-1 font-medium">Accordés</th>
                <th className="py-1 font-medium">Retirés</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={`${s.consentType}-${s.companyName}`} className="border-t border-border">
                  <td className="py-1.5 font-medium">{consentTypeLabel(s.consentType)}</td>
                  <td>{s.companyName}</td>
                  <td className="tabular-nums">{s.granted}</td>
                  <td className="tabular-nums">{s.withdrawn}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Une ligne « Sans compagnie (ancien) » est un consentement marketing antérieur à la portée par compagnie : il n&apos;autorise aucun envoi.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Consulter l&apos;historique d&apos;un utilisateur</CardTitle></CardHeader>
        <CardContent><ConsentLookup users={consentsRepo.userOptions()} /></CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 4: Rétention**

Créer `src/components/compliance/retention-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCompanyRetention } from "@/app/(admin)/conformite/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { companyStatusBadge } from "@/lib/labels";
import type { RetentionRow } from "@/lib/repos/compliance";

function ChangeRetention({ row }: { row: RetentionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(String(row.effectiveDays));

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => { setDays(String(row.effectiveDays)); setOpen(true); }} aria-label={`Modifier la durée de ${row.companyName}`}>
        Modifier
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Modifier la durée de rétention de ${row.companyName}`}
        description="Raccourcir la durée fait anonymiser, de façon irréversible, les lignes de journal plus anciennes au prochain passage du job quotidien (03:15 UTC)."
        confirmLabel="Enregistrer la durée" destructive requireReason
        onConfirm={async (reason) => {
          const r = await setCompanyRetention(row.companyId, Number(days), reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block text-sm font-medium" htmlFor="retention-days">Nouvelle durée (jours)</label>
        <Input id="retention-days" type="number" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Nouvelle durée (jours)" />
      </ConfirmDialog>
    </>
  );
}

const columns: ColumnDef<RetentionRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = companyStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "effectiveDays", header: "Durée effective",
    cell: ({ row }) => <span className="tabular-nums">{row.original.effectiveDays} j{row.original.isCustom ? "" : " (défaut)"}</span>,
  },
  { accessorKey: "olderRows", header: "Lignes plus anciennes", cell: ({ row }) => <span className="tabular-nums">{row.original.olderRows}</span> },
  {
    accessorKey: "pendingRows", header: "Non anonymisées",
    cell: ({ row }) => (
      <span data-testid="retention-pending" className={`tabular-nums ${row.original.pendingRows > 0 ? "font-medium text-warning" : ""}`}>
        {row.original.pendingRows}
      </span>
    ),
  },
  { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ChangeRetention row={row.original} /> },
];

/** No `rowHref`: the rows hold a button that opens a dialog. */
export function RetentionTable({ rows }: { rows: RetentionRow[] }) {
  return (
    <DataTable
      columns={columns} data={rows} rowId={(r) => r.companyId} pageSize={25}
      searchPlaceholder="Rechercher une compagnie…" emptyMessage="Aucune compagnie."
    />
  );
}
```

Créer `src/app/(admin)/conformite/retention/page.tsx` :

```tsx
import { RetentionTable } from "@/components/compliance/retention-table";
import { PageHeader } from "@/components/data/page-header";
import { DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS, MIN_RETENTION_DAYS, retentionRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default function RetentionPage() {
  return (
    <>
      <PageHeader
        title="Rétention des données"
        description={`Un job quotidien (03:15 UTC) efface l'adresse IP et l'agent utilisateur des lignes de journal plus anciennes que la durée de leur compagnie (${DEFAULT_RETENTION_DAYS} jours par défaut, entre ${MIN_RETENTION_DAYS} et ${MAX_RETENTION_DAYS}). Les lignes ne sont jamais supprimées. Raccourcir une durée est irréversible.`}
      />
      <RetentionTable rows={retentionRepo.listRows(new Date())} />
    </>
  );
}
```

(`Input` existe dans `src/components/ui/input.tsx` ; s'il n'accepte pas `id`/`type`/`inputMode`, le vérifier et adapter les props, sans créer de nouveau composant.)

- [ ] **Step 5: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/compliance "src/app/(admin)/conformite/demandes-rgpd" "src/app/(admin)/conformite/consentements" "src/app/(admin)/conformite/retention"
git commit -m "feat: data-subject requests, consents and retention pages

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

Dans `tests/unit/nav.test.ts` : le test du lot 7 `marks only lot 1 to lot 7 pages as implemented` est **remplacé** par `marks only lot 1 to lot 8 pages as implemented` : reprendre le tableau attendu du lot 7 (37 chemins, trié) et y insérer, à leur place alphabétique (après `"/compagnies/kyc"`), les cinq chemins `"/conformite/acces-donnees"`, `"/conformite/consentements"`, `"/conformite/demandes-rgpd"`, `"/conformite/journal-audit"`, `"/conformite/retention"` (42 chemins en tout). Ajouter à la fin du fichier :

```ts
describe("lot 8 breadcrumbs", () => {
  it("links the parent list of audit line and request details, nothing else under compliance", () => {
    expect(isLinkablePath("/conformite/journal-audit/abc")).toBe(true);
    expect(isLinkablePath("/conformite/demandes-rgpd/abc")).toBe(true);
    expect(isLinkablePath("/conformite/retention")).toBe(true);
    expect(isLinkablePath("/conformite")).toBe(false);
  });
  it("labels the compliance segments with their accents", () => {
    expect(labelForSegment("journal-audit")).toBe("Journal d'audit");
    expect(labelForSegment("acces-donnees")).toBe("Accès aux données");
    expect(labelForSegment("demandes-rgpd")).toBe("Demandes RGPD");
    expect(labelForSegment("consentements")).toBe("Consentements");
    expect(labelForSegment("retention")).toBe("Rétention");
  });
});
```

(importer `isLinkablePath` et `labelForSegment` si absents.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` :
1. Remplacer les cinq lignes `todo(…)` de la section « Conformité et audit » par :

```ts
    { label: "Journal d'audit", href: "/conformite/journal-audit", implemented: true },
    { label: "Accès aux données", href: "/conformite/acces-donnees", implemented: true },
    { label: "Demandes RGPD", href: "/conformite/demandes-rgpd", implemented: true },
    { label: "Consentements", href: "/conformite/consentements", implemented: true },
    { label: "Rétention", href: "/conformite/retention", implemented: true },
```

2. Ajouter à `SEGMENT_LABELS` : `"journal-audit": "Journal d'audit"`, `"acces-donnees": "Accès aux données"`, `"demandes-rgpd": "Demandes RGPD"`, `consentements: "Consentements"`, `retention: "Rétention"`.
3. Ajouter à `ROUTE_PREFIXES` (en conservant les préfixes existants des lots précédents) : `"/conformite/journal-audit"`, `"/conformite/demandes-rgpd"`.

Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/conformite/journal-audit");` par `await page.goto("/supervision/services");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("the audit trail is read-only, filterable and shows a before and after table", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/journal-audit");
  await expect(page.getByRole("heading", { name: "Journal d'audit" })).toBeVisible();
  await expect(page.getByTestId("audit-readonly")).toContainText("lecture seule");
  await page.getByRole("link", { name: "Modification", exact: true }).click();
  await expect(page).toHaveURL(/action=UPDATE/);
  await page.getByPlaceholder("Rechercher dans le journal…").fill("Company");
  await page.getByRole("row", { name: /Modification.*Company/ }).first().click();
  await expect(page).toHaveURL(/\/conformite\/journal-audit\/[0-9a-f-]+$/);
  await expect(page.getByRole("columnheader", { name: "Avant" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Après" })).toBeVisible();
  expect(await page.getByTestId("audit-change").count()).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="audit-change"][data-changed="true"]').first()).toBeVisible();
});

test("login lines of the audit trail carry a truncated address only", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/journal-audit?action=LOGIN");
  await expect(page.getByRole("row", { name: /Connexion/ }).first()).toContainText(/\d+\.\d+\.\d+\.0|—/);
  await page.goto("/conformite/journal-audit?action=LOGIN_FAILED");
  await expect(page.getByRole("row", { name: /Échec de connexion/ }).first()).toBeVisible();
});

test("the data access log is read-only and filterable by type and category", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/acces-donnees");
  await expect(page.getByRole("heading", { name: "Accès aux données" })).toBeVisible();
  await page.getByRole("link", { name: "Exports", exact: true }).click();
  await expect(page).toHaveURL(/type=EXPORT/);
  await expect(page.getByRole("row", { name: /Export/ }).first()).toBeVisible();
  await page.goto("/conformite/acces-donnees?categorie=CONSENT");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
});

test("data-subject requests show the legal deadline indicators and the overdue request", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await expect(page.getByRole("heading", { name: "Demandes RGPD" })).toBeVisible();
  for (const id of ["dsr-open", "dsr-overdue", "dsr-soon", "dsr-closed"]) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByTestId("dsr-overdue")).toContainText("1");
  await page.getByRole("link", { name: "En retard", exact: true }).click();
  await expect(page).toHaveURL(/retard=oui/);
  await expect(page.getByRole("row", { name: /Pape Mbaye.*Rectification.*En retard de \d+ j/ })).toBeVisible();
});

test("a received request is taken in charge", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Ndèye Diouf");
  await page.getByRole("row", { name: /Ndèye Diouf.*Accès/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Reçue");
  await page.getByRole("button", { name: "Prendre en charge" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer la prise en charge" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await expect(page.getByRole("button", { name: "Prendre en charge" })).toHaveCount(0);
});

test("an in-progress request is closed with resolution notes and leaves a trace in the journals", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Lamine Camara");
  await page.getByRole("row", { name: /Lamine Camara.*Effacement/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await page.getByRole("button", { name: "Clôturer la demande" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer la clôture" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Compte et données effacés, journaux d'audit conservés.");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("Clôturée");
  await expect(page.getByTestId("dsr-resolution")).toContainText("Compte et données effacés");
  await expect(page.getByTestId("dsr-closed-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clôturer la demande" })).toHaveCount(0);

  await page.goto("/conformite/journal-audit?action=UPDATE");
  await page.getByPlaceholder("Rechercher dans le journal…").fill("DataSubjectRequest");
  await expect(page.getByRole("row", { name: /DataSubjectRequest/ }).first()).toBeVisible();
  await page.goto("/conformite/acces-donnees?type=MODIFY");
  await page.getByPlaceholder("Rechercher un accès…").fill("Lamine Camara");
  await expect(page.getByRole("row", { name: /Lamine Camara.*Modification/ }).first()).toBeVisible();
});

test("an in-progress request is rejected with resolution notes", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Aïssatou Sarr");
  await page.getByRole("row", { name: /Aïssatou Sarr.*Opposition/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await page.getByRole("button", { name: "Rejeter la demande" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer le rejet" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Opposition sans fondement légal.");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("Rejetée");
});

test("a received request cannot be closed before it is taken in charge", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Pape Mbaye");
  await page.getByRole("row", { name: /Pape Mbaye.*Rectification/ }).click();
  await page.getByRole("button", { name: "Clôturer la demande" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer la clôture" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une demande reçue doit d'abord être prise en charge");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Reçue");
});

test("a closed request offers no action", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd?statut=COMPLETED");
  await page.getByPlaceholder("Rechercher une demande…").fill("Aïssatou Sarr");
  await page.getByRole("row", { name: /Aïssatou Sarr.*Portabilité/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Clôturée");
  await expect(page.getByTestId("dsr-closed-note")).toBeVisible();
  for (const name of ["Prendre en charge", "Clôturer la demande", "Rejeter la demande"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(page.getByTestId("dsr-countdown")).toHaveText("—");
});

test("consulting the consents of a user needs an access reason and is logged", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/consentements");
  await expect(page.getByRole("heading", { name: "Consentements" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cookies et analyses.*Plateforme/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Sans compagnie \(ancien\)/ })).toBeVisible();
  await expect(page.getByTestId("consent-entry")).toHaveCount(0);
  await page.getByLabel("Utilisateur").selectOption({ label: "Aïssatou Sarr (client)" });
  await page.getByLabel("Motif d'accès").selectOption({ label: "Enquête" });
  await page.getByRole("button", { name: "Consulter" }).click();
  expect(await page.getByTestId("consent-entry").count()).toBeGreaterThan(2);
  await expect(page.locator('[data-testid="consent-entry"][data-current="true"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="consent-entry"][data-current="false"]').first()).toBeVisible();

  await page.goto("/conformite/acces-donnees?categorie=CONSENT");
  await expect(page.getByRole("row", { name: /Aïssatou Sarr.*Enquête/ }).first()).toBeVisible();
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
});

test("a company's retention can be shortened within the allowed range", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/retention");
  await expect(page.getByRole("heading", { name: "Rétention des données" })).toBeVisible();
  await page.getByPlaceholder("Rechercher une compagnie…").fill("Casamance");
  const row = page.getByRole("row", { name: /Casamance Trans/ });
  await expect(row).toContainText("730 j (défaut)");
  await expect(row.getByTestId("retention-pending")).toHaveText("0");

  await row.getByRole("button", { name: "Modifier la durée de Casamance Trans" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouvelle durée (jours)").fill("50");
  await dialog.getByLabel("Motif (obligatoire)").fill("Demande de la compagnie");
  await dialog.getByRole("button", { name: "Enregistrer la durée" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("La durée doit être un nombre entier de jours compris entre 90 et 3650");

  await dialog.getByLabel("Nouvelle durée (jours)").fill("90");
  await dialog.getByRole("button", { name: "Enregistrer la durée" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("90 j");
  await expect(row).not.toContainText("(défaut)");
  await expect(row.getByTestId("retention-pending")).not.toHaveText("0");
});
```

3. Étendre le test `@prod` : après les appels existants à `detailPath(...)`, ajouter

```ts
  const auditPath = await detailPath("/conformite/journal-audit", "Connexion", "Rechercher dans le journal…", /Connexion/);
  const requestPath = await detailPath("/conformite/demandes-rgpd", "Aïssatou", "Rechercher une demande…", /Aïssatou Sarr.*Portabilité/);
```

et ajouter au tableau `paths` : `"/conformite/journal-audit"`, `"/conformite/journal-audit?action=LOGIN_FAILED"`, `auditPath`, `"/conformite/acces-donnees"`, `"/conformite/acces-donnees?categorie=CONSENT"`, `"/conformite/demandes-rgpd"`, `"/conformite/demandes-rgpd?retard=oui"`, `requestPath`, `"/conformite/consentements"`, `"/conformite/retention"`.

(Le test existant applique à chaque chemin les expressions régulières d'e-mails, de téléphones et d'IP complètes sur le HTML brut et le DOM : les adresses du journal y apparaissent tronquées en `a.b.c.0`, jamais complètes. Si le test `a company's retention…` ou un autre test de cette section a déjà muté une entité, le `@prod` n'en dépend pas : il ouvre une ligne de connexion et la demande « Aïssatou Sarr — Portabilité », en lecture seule.)

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter à la section des lots livrés un paragraphe « Lot 8 : conformité et audit » décrivant les 8 écrans et les trois actions (traiter une demande, modifier la rétention, consulter des consentements avec motif), puis ajouter à la liste des limites : journaux en lecture seule et sans export ; les lectures de pages n'écrivent pas dans le journal d'accès (seules les actions le font), alors que le backend écrit une ligne à chaque lecture d'une demande ; les révélations de données personnelles des lots 3, 6 et 7 sont dans l'activité du backoffice, pas dans le journal d'accès ; le job d'anonymisation n'est pas simulé (les compteurs « non anonymisées » se calculent à la lecture) ; on ne peut pas revenir à la durée par défaut ; les notes de clôture sont obligatoires (plus strict que le backend) ; aucune alerte de retard n'est émise ; l'acteur des lignes écrites par le backoffice est un libellé, pas un compte de la plateforme ; la consultation de consentements est limitée aux utilisateurs qui en ont.

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable compliance navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 8 écrans (Tasks 5 et 6), modèle de données et graines (Tasks 1 et 2), lecture avec IP tronquée, diff avant/après, délai légal, état courant des consentements et compteurs de rétention (Task 3), workflow des demandes, changement de rétention, consultation de consentements et écritures dans les trois journaux (Task 4), navigation, E2E et fuite (Task 7), limites (README).
- **Cohérence des noms** : `auditRepo.listRows/detail`, `accessRepo.listRows`, `dsrRepo.listRows/get/stats/detail/transition`, `consentsRepo.summary/userOptions/consult`, `retentionRepo.listRows/set`, `dsrTransitionBlock`, `dsrDaysLeft`, `effectiveRetentionDays`, `runValue`/`ValueResult`, `startDataSubjectRequest`/`completeDataSubjectRequest`/`rejectDataSubjectRequest`/`setCompanyRetention`/`consultUserConsents` sont utilisés à l'identique dans les tâches.
- **Risques connus, à signaler à l'implémenteur** : (1) `shortened.pendingRows >= 4` et `olderRows > 0` reposent sur l'âge des compagnies de la graine du lot 1 (créées il y a `400 − 15·i` jours) ; (2) `purge.createdAt` attendu `2026-11-02T03:15:00.000Z` suppose la date de graine du test (`NOW`) ; (3) « Sans compagnie (ancien) » suppose que `companyIds` (compagnies à programme de fidélité) est non vide, donc que le lot 6 est en place ; (4) la mutation 6 de la Task 3 (tri de `currentConsents`) peut être équivalente et doit alors être consignée comme telle ; (5) `getByLabel("Utilisateur")` du test des consentements ne doit correspondre qu'à la liste déroulante de la page : vérifier qu'aucun autre élément de la page (menu de compte, recherche) ne porte l'étiquette « Utilisateur » ; (6) les tests de graine n'ont pas été exécutés. Corriger la graine ou le sélecteur plutôt qu'affaiblir un test, et consigner l'écart dans le plan.
