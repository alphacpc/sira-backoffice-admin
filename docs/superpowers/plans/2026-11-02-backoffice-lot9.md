# Backoffice Sira, lot 9 : supervision. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les quatre entrées « Bientôt disponible » de la section « Supervision » par de vraies pages sur données statiques typées : santé des services (indicateurs, tableau, graphique des 48 derniers contrôles), incidents plateforme (liste, fiche, trois actions : déclarer, changer le statut, renseigner le postmortem), trafic API (agrégats sur 7, 14 ou 30 jours) et usage produit (événements dérivés des données déjà présentes).

**Architecture:** Même socle que les lots 1 à 8. Trois collections rejoignent le store (`serviceChecks`, `systemIncidents`, `apiUsage`) ; les collections provisoires `services` et `incidents` du lot 1 disparaissent et le tableau de bord lit les vraies données (les types `ServiceHealth` et `Incident` restent comme projections). Trois graines (`seedServiceChecks`, `seedSystemIncidents`, `seedApiUsage`). Un dépôt `src/lib/repos/monitoring.ts` porte la santé (obsolescence mesurée contre le dernier sondage), les incidents et leurs règles, les agrégats de trafic et l'usage dérivé. Les actions passent par `run()` ; les écritures d'incident ajoutent une entrée d'activité et une ligne de journal d'audit via `appendAudit` (lot 8).

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, Recharts 3 (déjà utilisé par le tableau de bord), TanStack Table 8.21, Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4 à 8 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ**. Le lot 4 fournit `CompanyFilter` et `parseCompanyFilter` ; le lot 5 `Booking`, `Transaction`, `Ticket`, `hashCode` (de `seed.ts`) ; le lot 6 `Parcel`, `ParcelHistoryEntry`, `Feedback`, `Customer` ; le lot 8 `appendAudit` (non exporté à ce jour, voir Task 4), `AuditLog` et le tableau de bord migré pour `dsr`. **Vérifier ces noms par `grep` avant de commencer** et adapter le plan s'ils ont changé.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : toutes passent par `run()` (session vérifiée **avant** toute lecture ou écriture), renvoient un `ActionResult` et ne lèvent jamais d'exception pour un échec attendu.
- Règles d'incident (messages exacts) :
  - `incidentsRepo.declare` (ordre des gardes) : titre non vide (`"Un titre est obligatoire"`) et 200 caractères au plus (`"Le titre est trop long (200 caractères maximum)"`) → service non vide (`"Le service est obligatoire"`) et 100 au plus (`"Le nom du service est trop long (100 caractères maximum)"`) → gravité valide (`"Gravité invalide"`) → portée valide (`"Portée invalide"`) → compagnie : obligatoire pour `SINGLE_COMPANY` (`"Une compagnie est obligatoire pour un incident limité à une compagnie"`), existante (`"Compagnie introuvable"`), interdite sinon (`"Une compagnie ne peut être indiquée que pour un incident limité à une compagnie"`) → description de 10 000 caractères au plus (`"La description est trop longue (10000 caractères maximum)"`).
  - `incidentsRepo.advance` (ordre des gardes) : incident existant (`"Incident introuvable"`) → statut cible valide (`"Statut invalide"`) → incident non résolu (`"Un incident résolu ne peut plus changer de statut"`) → statut différent (`"L'incident est déjà dans cet état"`) → pas de retour en arrière (`"Un incident ne peut pas revenir en arrière"`). Ordre : `INVESTIGATING < IDENTIFIED < MONITORING < RESOLVED`, sauts permis.
  - `incidentsRepo.setPostmortem` (ordre des gardes) : incident existant → adresse non vide (`"L'adresse du postmortem est obligatoire"`) → 2 048 caractères au plus (`"L'adresse du postmortem est trop longue (2048 caractères maximum)"`) → `http://` ou `https://` sans espace (`"L'adresse du postmortem doit commencer par http:// ou https://"`).
- Le journal d'activité et le journal d'audit ne contiennent jamais d'adresse de postmortem, de description d'incident, d'e-mail ni de téléphone.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `SystemIncident`, `IncidentDetail` ni une ligne brute de trafic ; seulement une projection construite champ par champ (prouvé par `Object.keys`) ou des scalaires. Les imports depuis `@/lib/repos/monitoring` dans un composant client sont des `import type`. Le trafic n'est exposé qu'en agrégats. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, chaque garde des trois règles, leur ordre, obsolescence, disponibilité, agrégats pondérés, usage dérivé) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : relance d'un sondage ; ouverture automatique d'incident ; modification de la gravité ou de la portée ; historique des statuts ; alertes ; export ; branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Identifiants** : préfixes `uid(71, …)` contrôles, `uid(72, …)` incidents (les préfixes jusqu'à 64 sont pris ; 10 était l'ancien `incidents`) ; vérifier par `grep -n "uid(7[1-2]" src/lib/data/seed.ts` : aucune occurrence attendue. Les lignes de trafic n'ont pas d'identifiant.
2. **Migration en deux temps** : la Task 1 **ajoute** les nouvelles collections sans toucher à `services` et `incidents` (le dépôt reste vert) ; la Task 3 **supprime** les anciennes et migre le tableau de bord quand `servicesRepo` existe.
3. **Obsolescence** : mesurée contre le contrôle le plus récent de tout le store (`servicesRepo.referenceTime()`), seuil 90 000 ms, comparaison stricte. La disponibilité sur 24 h et le « dernier changement » se calculent aussi contre cette référence. Aucune de ces fonctions ne prend d'horloge.
4. **Compteurs de santé** : un service obsolète n'est compté **que** dans « obsolètes », quel que soit son dernier statut (il n'est donc compté ni opérationnel, ni dégradé, ni en panne). Dans la graine : 8 opérationnels, 1 dégradé, 1 en panne, 1 obsolète.
5. **Tableau de bord** : `services` = derniers contrôles des services **non obsolètes** (les 10 services sondés, pas `gateway`) ; `incidents` = incidents **ouverts**, du plus récent au plus ancien ; `kpis.openIncidents` = nombre d'incidents non résolus. Le test du lot 1 qui exigeait exactement 2 incidents ouverts devient relationnel (la graine en a 3 : ouverts, identifié, sous surveillance, en investigation).
6. **Codes d'incident** : les trois premiers gardent les codes du lot 1 (`SYS-A1B2C3D4`, `SYS-E5F6G7H8`, `SYS-J9K1L2M3`) ; les cinq autres ont des codes littéraux ; un incident déclaré reçoit `SYS-` + 8 caractères base 36 majuscules issus de `n × 2 654 435 761 mod 2³²`, le rang `n` augmentant tant que le code existe.
7. **Boutons** : « Changer le statut » est affiché pour tout incident **non résolu** et propose **tous** les autres statuts (le serveur refuse l'arrière : c'est ce qui rend le refus jouable en E2E) ; un incident résolu affiche une note à la place. « Renseigner le postmortem » est affiché à tout statut (libellé « Modifier le postmortem » quand une adresse existe).
8. **Déclaration** : `detectedAt` = maintenant (pas de champ de date), la compagnie touchée est une liste déroulante visible seulement pour la portée « Une compagnie ».
9. **Trafic semé** : fenêtre de 30 jours (le backend en garde 90, plage maximale 93) ; les fenêtres proposées sont 7, 14 et 30 jours. Les quatre premières compagnies actives portent le trafic (parts 40, 30, 20, 10 %) ; les endpoints publics reçoivent en plus 20 % de trafic anonyme (`companyId` nul), prélevés sur les parts.
10. **Usage dérivé** : événements `booking_created` (réservations), `payment_completed` (transactions `COMPLETED`, à `completedAt`), `ticket_issued` (billets), `parcel_created` (lignes d'historique sans statut précédent), `parcel_status_changed` (les autres lignes), `feedback_responded` (avis avec date de réponse). La compagnie d'un événement est celle de l'objet ; l'utilisateur est celui de la réservation (nul pour une réservation au guichet et pour les colis) ou le compte du client auteur de l'avis.
11. **Test E2E du lot 1 `unimplemented sections show a coming-soon page`** : le lot 8 l'a fait pointer sur `/supervision/services`, qui devient une vraie page ici ; il pointe désormais sur `/parametres/profil`.

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `declaring an incident adds it to the list and refuses a company scope without a company` | un incident créé par le test (« Incident de démonstration E2E ») | une ligne en plus ; aucun autre test ne compte les incidents après lui |
| `an incident can only move forward in status` | incident « Échecs de réservation sur une compagnie » | `IDENTIFIED` → `MONITORING` |
| `resolving an incident closes it and keeps only the postmortem editable` | incident « Latence élevée sur les colis » | `MONITORING` → `RESOLVED` |
| `a postmortem address must be an http or https link` | incident « Échec de connexion intermittent » | adresse de postmortem renseignée |

« Retard de synchronisation RH » (résolu, sans postmortem) est lu en lecture seule. Les tests de lecture ne dépendent ni du nombre d'incidents ni du statut de ceux qui précèdent (les filtres par statut sont asserés par présence d'une ligne précise, jamais par un compte exact sur « Tous »).

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) ServiceHealthCheck, SystemIncident, ApiUsageRow + unions
src/lib/data/seed.ts                           (modifié) Store étendu (T1), anciens services/incidents retirés (T3), 3 graines
src/lib/repos/monitoring.ts                    (créé)   santé, incidents (+ règles T4), trafic, usage
src/lib/repos/compliance.ts                    (modifié) appendAudit exporté (T4)
src/lib/repos/dashboard.ts                     (modifié) services et incidents depuis les nouveaux dépôts (T3)
src/lib/labels.ts                              (modifié) badges et libellés
src/app/(admin)/supervision/actions.ts         (créé)   declareIncident, advanceIncident, setIncidentPostmortem
src/components/monitoring/{service-history-chart,declare-incident-button,incident-actions,api-traffic-chart,usage-chart}.tsx   (créés)
src/app/(admin)/supervision/services/page.tsx                                                                (créé)
src/app/(admin)/supervision/incidents/{page,incidents-table}.tsx, incidents/[id]/{page,not-found}.tsx       (créés)
src/app/(admin)/supervision/api/page.tsx                                                                     (créé)
src/app/(admin)/supervision/usage/page.tsx                                                                   (créé)
src/lib/nav.ts                                 (modifié) 4 entrées implémentées, libellés, préfixes
tests/unit/{monitoring-seed,monitoring-api-seed,monitoring-repo,monitoring-rules,monitoring-actions}.test.ts   (créés)
tests/unit/{labels,nav,dashboard-repo}.test.ts (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

---
### Task 1: Types, contrôles de santé et incidents (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`
- Create: `tests/unit/monitoring-seed.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)`, `uid`, `iso`, `store.companies`.
- Produces: types ci-dessous ; `Store.serviceChecks`, `Store.systemIncidents`, `Store.apiUsage` (ce dernier ajouté vide, rempli à la Task 2) ; `seedServiceChecks(store, now)`, `seedSystemIncidents(store, iso)`.

- [ ] **Step 1: Types**

Ajouter à la fin de `src/lib/types/index.ts` (ne **pas** toucher à `ServiceHealth` ni à `Incident`, qui restent) :

```ts
export type ServiceStatus = "healthy" | "degraded" | "down";

/** One poll of a service (`monitoring-service`). The error rate is never computed by the backend. */
export interface ServiceHealthCheck {
  id: string; serviceName: string; environment: "production";
  status: ServiceStatus; responseTimeMs: number; errorRatePercent: number | null; checkedAt: string;
}

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
export type ImpactScope = "SINGLE_COMPANY" | "MULTI_COMPANY" | "PLATFORM_WIDE";

/** Platform incident, declared and followed by hand. Only its current state is kept. */
export interface SystemIncident {
  id: string; incidentCode: string; serviceName: string;
  severity: IncidentSeverity; status: IncidentStatus; title: string; description: string | null;
  impactScope: ImpactScope;
  /** Set if and only if the scope is `SINGLE_COMPANY`. */
  affectedCompanyId: string | null;
  detectedAt: string;
  /** Set if and only if the incident is resolved. */
  resolvedAt: string | null;
  /** Label of the backoffice identity that declared it (the backend stores a user id). */
  reportedBy: string;
  postmortemUrl: string | null;
  createdAt: string; updatedAt: string | null;
}

export type ApiStatusClass = "2xx" | "4xx" | "5xx";

/** Daily API traffic aggregate, the shape `GET /usage/api` returns (raw log lines never leave the server). */
export interface ApiUsageRow {
  day: string; companyId: string | null; endpoint: string; method: "GET" | "POST" | "PATCH";
  statusClass: ApiStatusClass; count: number; avgResponseMs: number; maxResponseMs: number;
}
```

- [ ] **Step 2: Écrire le test de graine (rouge)**

Créer `tests/unit/monitoring-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const checksOf = (name: string) =>
  getStore().serviceChecks.filter((c) => c.serviceName === name).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
const incidentTitled = (title: string) => {
  const found = getStore().systemIncidents.filter((i) => i.title === title);
  expect(found, title).toHaveLength(1);
  return found[0]!;
};

describe("service checks seed", () => {
  it("polls ten live services 48 times each, every 30 minutes, plus a retired gateway", () => {
    const s = getStore();
    const names = [...new Set(s.serviceChecks.map((c) => c.serviceName))].sort();
    expect(names).toEqual([
      "audit-compliance-service", "booking-service", "company-service", "customer-service", "fleet-service", "gateway",
      "hr-service", "identity-service", "monitoring-service", "notification-service", "parcel-service",
    ]);
    for (const name of names.filter((n) => n !== "gateway")) {
      const checks = checksOf(name);
      expect(checks, name).toHaveLength(48);
      for (let i = 1; i < checks.length; i++) {
        expect(Date.parse(checks[i]!.checkedAt) - Date.parse(checks[i - 1]!.checkedAt), name).toBe(30 * MINUTE);
      }
    }
    expect(checksOf("gateway")).toHaveLength(12);
    expect(new Set(s.serviceChecks.map((c) => c.id)).size).toBe(s.serviceChecks.length);
  });

  it("ends the live services 20 seconds before the seed date and the gateway two days earlier", () => {
    for (const name of ["identity-service", "notification-service", "monitoring-service"]) {
      expect(NOW.getTime() - Date.parse(checksOf(name).at(-1)!.checkedAt)).toBe(20_000);
    }
    expect(NOW.getTime() - Date.parse(checksOf("gateway").at(-1)!.checkedAt)).toBeGreaterThan(2 * DAY - 31 * MINUTE);
    for (const c of getStore().serviceChecks) expect(Date.parse(c.checkedAt)).toBeLessThan(NOW.getTime());
  });

  it("puts notification-service down, parcel-service degraded and booking-service through a single blip", () => {
    const tail = (name: string, n: number) => checksOf(name).slice(-n).map((c) => c.status);
    expect(tail("notification-service", 6)).toEqual(Array(6).fill("down"));
    expect(checksOf("notification-service").at(-7)!.status).toBe("healthy");
    expect(tail("parcel-service", 4)).toEqual(Array(4).fill("degraded"));
    expect(checksOf("parcel-service").at(-5)!.status).toBe("healthy");
    const booking = checksOf("booking-service");
    expect(booking.filter((c) => c.status !== "healthy")).toHaveLength(1);
    expect(booking.at(-1)!.status).toBe("healthy");
    for (const name of ["identity-service", "company-service", "fleet-service", "hr-service", "gateway"]) {
      expect(checksOf(name).every((c) => c.status === "healthy"), name).toBe(true);
    }
  });

  it("gives a response time coherent with the status and never computes an error rate", () => {
    for (const c of getStore().serviceChecks) {
      expect(c.environment).toBe("production");
      expect(c.errorRatePercent).toBeNull();
      if (c.status === "healthy") expect(c.responseTimeMs).toBeLessThan(1000);
      if (c.status === "degraded") expect(c.responseTimeMs).toBeGreaterThanOrEqual(1000);
      if (c.status === "down") expect(c.responseTimeMs).toBeGreaterThanOrEqual(8000);
    }
  });
});

describe("system incidents seed", () => {
  it("has eight incidents with unique codes covering the four statuses, four severities and three scopes", () => {
    const list = getStore().systemIncidents;
    expect(list).toHaveLength(8);
    expect(new Set(list.map((i) => i.incidentCode)).size).toBe(8);
    for (const i of list) expect(i.incidentCode).toMatch(/^SYS-[0-9A-Z]{8}$/);
    expect(new Set(list.map((i) => i.status))).toEqual(new Set(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]));
    expect(new Set(list.map((i) => i.severity))).toEqual(new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]));
    expect(new Set(list.map((i) => i.impactScope))).toEqual(new Set(["SINGLE_COMPANY", "MULTI_COMPANY", "PLATFORM_WIDE"]));
    expect(list.filter((i) => i.status !== "RESOLVED")).toHaveLength(3);
  });

  it("keeps the incident invariants: company iff single-company scope, resolution date iff resolved", () => {
    const s = getStore();
    for (const i of s.systemIncidents) {
      expect(i.affectedCompanyId !== null, i.incidentCode).toBe(i.impactScope === "SINGLE_COMPANY");
      if (i.affectedCompanyId) expect(s.companies.some((c) => c.id === i.affectedCompanyId)).toBe(true);
      expect(i.resolvedAt !== null, i.incidentCode).toBe(i.status === "RESOLVED");
      if (i.resolvedAt) expect(i.resolvedAt > i.detectedAt).toBe(true);
      expect(Date.parse(i.detectedAt)).toBeLessThan(NOW.getTime());
      expect(i.createdAt).toBe(i.detectedAt);
      expect(i.reportedBy).toBe("admin@sira.app");
      expect(i.title.length).toBeGreaterThan(5);
      if (i.postmortemUrl) expect(i.postmortemUrl).toMatch(/^https:\/\//);
    }
    expect(new Set(s.systemIncidents.map((i) => i.id)).size).toBe(8);
  });

  it("names the four scenarios in the expected states", () => {
    expect(incidentTitled("Échecs de réservation sur une compagnie")).toMatchObject({ status: "IDENTIFIED", impactScope: "SINGLE_COMPANY" });
    expect(incidentTitled("Latence élevée sur les colis")).toMatchObject({ status: "MONITORING", serviceName: "parcel-service" });
    const noPostmortem = incidentTitled("Échec de connexion intermittent");
    expect(noPostmortem).toMatchObject({ status: "RESOLVED", postmortemUrl: null });
    expect(incidentTitled("Retard de synchronisation RH")).toMatchObject({ status: "RESOLVED", postmortemUrl: null, impactScope: "SINGLE_COMPANY" });
    expect(getStore().systemIncidents.filter((i) => i.postmortemUrl !== null)).toHaveLength(2);
  });

  it("matches the open incidents to the services that are currently unhealthy", () => {
    const open = getStore().systemIncidents.filter((i) => i.status !== "RESOLVED").map((i) => i.serviceName);
    expect(open).toEqual(expect.arrayContaining(["notification-service", "parcel-service"]));
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().systemIncidents)).not.toMatch(/@|\+221/);
  });
});
```

(`reportedBy` vaut `admin@sira.app`, qui contient un `@` : le dernier test porte sur le **JSON complet** sans le champ `reportedBy` ; remplacer l'expression du dernier test par `JSON.stringify(getStore().systemIncidents.map(({ reportedBy: _r, ...rest }) => rest))`.)

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/monitoring-seed.test.ts` → FAIL (`serviceChecks` indéfini).

- [ ] **Step 4: Étendre le store et écrire les graines**

Dans `src/lib/data/seed.ts` :

1. Étendre l'import de types avec : `ApiUsageRow`, `ImpactScope`, `IncidentSeverity`, `IncidentStatus`, `ServiceHealthCheck`, `ServiceStatus`, `SystemIncident`.
2. Dans `interface Store`, ajouter (sans retirer `services` ni `incidents`) :

```ts
  serviceChecks: ServiceHealthCheck[];
  systemIncidents: SystemIncident[];
  apiUsage: ApiUsageRow[];
```

3. Dans le littéral de `buildSeed`, après `dataSubjectRequests: [], consentRecords: [], auditLogs: [], dataAccessLogs: [],` ajouter : `serviceChecks: [], systemIncidents: [], apiUsage: [],`.
4. Juste avant `return store;`, après les appels des graines du lot 8, ajouter :

```ts
  seedServiceChecks(store, now);
  seedSystemIncidents(store, iso);
```

5. À la fin du fichier, ajouter :

```ts
const SERVICE_BASE_MS: [string, number][] = [
  ["identity-service", 42], ["company-service", 55], ["fleet-service", 61], ["booking-service", 88],
  ["parcel-service", 70], ["hr-service", 70], ["customer-service", 64], ["notification-service", 52],
  ["audit-compliance-service", 49], ["monitoring-service", 38],
];

/**
 * Forty-eight health checks per live service, one every 30 minutes, the last 20 seconds before the seed date;
 * notification-service is down for its last six, parcel-service degraded for its last four, booking-service has one
 * isolated blip. A retired `gateway` keeps twelve checks from two days ago: the "stale" case.
 */
function seedServiceChecks(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const STEP = 30 * 60_000;
  const push = (serviceName: string, status: ServiceStatus, responseTimeMs: number, checkedAtMs: number): void => {
    store.serviceChecks.push({
      id: uid(71, seq++), serviceName, environment: "production", status, responseTimeMs, errorRatePercent: null,
      checkedAt: new Date(checkedAtMs).toISOString(),
    });
  };

  SERVICE_BASE_MS.forEach(([name, base], i) => {
    for (let k = 0; k < 48; k++) {
      const fromEnd = 47 - k;
      let status: ServiceStatus = "healthy";
      let ms = base + ((k * 7 + i * 13) % 20);
      if (name === "notification-service" && fromEnd < 6) { status = "down"; ms = 8000 + (k % 5) * 20; }
      if (name === "parcel-service" && fromEnd < 4) { status = "degraded"; ms = 1400 + (k % 4) * 25; }
      if (name === "booking-service" && k === 20) { status = "degraded"; ms = 1100; }
      push(name, status, ms, nowMs - 20_000 - fromEnd * STEP);
    }
  });
  for (let k = 0; k < 12; k++) push("gateway", "healthy", 14 + (k % 3), nowMs - 2 * 86_400_000 - (11 - k) * STEP);
}

/** Eight platform incidents: three open (investigating, identified, monitoring), five resolved, two with a postmortem. */
function seedSystemIncidents(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const active = store.companies.filter((c) => c.status === "active");
  const add = (
    incidentCode: string, serviceName: string, severity: IncidentSeverity, status: IncidentStatus, title: string,
    description: string | null, impactScope: ImpactScope, affectedCompanyId: string | null,
    detectedDays: number, resolvedDays: number | null, postmortemUrl: string | null,
  ): void => {
    store.systemIncidents.push({
      id: uid(72, seq++), incidentCode, serviceName, severity, status, title, description, impactScope, affectedCompanyId,
      detectedAt: iso(detectedDays), resolvedAt: resolvedDays === null ? null : iso(resolvedDays),
      reportedBy: "admin@sira.app", postmortemUrl, createdAt: iso(detectedDays),
      updatedAt: status === "INVESTIGATING" ? null : iso(detectedDays + 0.1),
    });
  };

  add("SYS-A1B2C3D4", "notification-service", "HIGH", "INVESTIGATING", "Notifications non envoyées",
    "Les envois d'e-mail et de SMS échouent depuis ce matin.", "PLATFORM_WIDE", null, -0.2, null, null);
  add("SYS-E5F6G7H8", "parcel-service", "MEDIUM", "MONITORING", "Latence élevée sur les colis",
    "Le suivi des colis répond lentement ; un correctif est en observation.", "MULTI_COMPANY", null, -1, null, null);
  add("SYS-J9K1L2M3", "identity-service", "LOW", "RESOLVED", "Échec de connexion intermittent",
    "Quelques connexions échouaient sans cause visible.", "PLATFORM_WIDE", null, -6, -5.5, null);
  add("SYS-M4N5P6Q7", "booking-service", "HIGH", "IDENTIFIED", "Échecs de réservation sur une compagnie",
    "Les réservations d'une compagnie échouent à la création ; la cause est identifiée.", "SINGLE_COMPANY", active[1]!.id, -2, null, null);
  add("SYS-R8S9T1U2", "fleet-service", "CRITICAL", "RESOLVED", "Indisponibilité de la flotte",
    "Le service de flotte était injoignable pendant plusieurs minutes.", "PLATFORM_WIDE", null, -20, -19.9,
    "https://status.sira.app/postmortems/2026-10-13");
  add("SYS-V3W4X5Y6", "hr-service", "MEDIUM", "RESOLVED", "Retard de synchronisation RH",
    "Les embauches d'une compagnie n'apparaissaient pas dans les comptes.", "SINGLE_COMPANY", active[2]!.id, -35, -34.5, null);
  add("SYS-Z7A8B9C1", "audit-compliance-service", "LOW", "RESOLVED", "Rapports de conformité lents",
    null, "MULTI_COMPANY", null, -50, -49.5, null);
  add("SYS-D2E3F4G5", "company-service", "HIGH", "RESOLVED", "Authentification des API partenaires",
    "Les clés d'API de partenaires étaient refusées.", "PLATFORM_WIDE", null, -70, -69.8,
    "https://status.sira.app/postmortems/2026-08-24");
}
```

- [ ] **Step 5: Constater le vert**

Run: `pnpm test tests/unit/monitoring-seed.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS (les anciennes collections `services`/`incidents` sont intactes ; aucun test existant ne change).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts tests/unit/monitoring-seed.test.ts
git commit -m "feat: service health checks and system incidents seed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Graine du trafic API (TDD)

**Files:**
- Modify: `src/lib/data/seed.ts`
- Create: `tests/unit/monitoring-api-seed.test.ts`

**Interfaces:**
- Consumes: `store.companies`.
- Produces: `store.apiUsage` rempli ; `seedApiUsage(store, now)`.

- [ ] **Step 1: Test (rouge)**

Créer `tests/unit/monitoring-api-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const rows = () => getStore().apiUsage;
const sum = (list: { count: number }[]) => list.reduce((n, r) => n + r.count, 0);

describe("API traffic seed", () => {
  it("covers the last 30 UTC days, today included, and nothing else", () => {
    const days = [...new Set(rows().map((r) => r.day))].sort();
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-10-04");
    expect(days.at(-1)).toBe("2026-11-02");
  });

  it("uses normalised endpoints, three status classes and the three methods", () => {
    expect(rows().length).toBeGreaterThan(2000);
    for (const r of rows()) {
      expect(r.endpoint).toMatch(/^\/[a-z\-/{}]+$/);
      expect(r.endpoint).not.toMatch(/[0-9a-f]{8}-/);
    }
    expect(new Set(rows().map((r) => r.statusClass))).toEqual(new Set(["2xx", "4xx", "5xx"]));
    expect(new Set(rows().map((r) => r.method))).toEqual(new Set(["GET", "POST", "PATCH"]));
    expect(new Set(rows().map((r) => r.endpoint)).size).toBe(14);
  });

  it("keeps counts positive, a maximum never below the average, and no duplicate aggregate key", () => {
    const keys = new Set<string>();
    for (const r of rows()) {
      expect(r.count).toBeGreaterThan(0);
      expect(r.avgResponseMs).toBeGreaterThan(0);
      expect(r.maxResponseMs).toBeGreaterThanOrEqual(r.avgResponseMs);
      const key = [r.day, r.companyId, r.method, r.endpoint, r.statusClass].join("|");
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  });

  it("attributes traffic to four active companies and to anonymous callers on public endpoints only", () => {
    const s = getStore();
    const companies = new Set(rows().map((r) => r.companyId).filter((c) => c !== null));
    expect(companies.size).toBe(4);
    for (const id of companies) expect(s.companies.find((c) => c.id === id)!.status).toBe("active");
    const anonymousEndpoints = new Set(rows().filter((r) => r.companyId === null).map((r) => r.endpoint));
    expect([...anonymousEndpoints].sort()).toEqual(["/auth/login", "/parcels/track/{id}", "/public/trips/search"]);
  });

  it("shows the parcel incident: more server errors and slower answers during the last two days", () => {
    const recent = new Set(["2026-11-01", "2026-11-02"]);
    const parcel = rows().filter((r) => r.endpoint === "/parcels/track/{id}");
    const share = (list: typeof parcel) => sum(list.filter((r) => r.statusClass === "5xx")) / sum(list);
    const during = parcel.filter((r) => recent.has(r.day));
    const before = parcel.filter((r) => !recent.has(r.day));
    expect(share(during)).toBeGreaterThan(share(before) * 3);
    const ok = (list: typeof parcel) => list.filter((r) => r.statusClass === "2xx");
    const mean = (list: typeof parcel) => list.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / sum(list);
    expect(mean(ok(during))).toBeGreaterThan(mean(ok(before)) * 2);
  });

  it("leaves the other endpoints healthy during the same days", () => {
    const login = rows().filter((r) => r.endpoint === "/auth/login");
    const recent = login.filter((r) => ["2026-11-01", "2026-11-02"].includes(r.day));
    const fiveXx = (list: typeof login) => sum(list.filter((r) => r.statusClass === "5xx")) / sum(list);
    expect(fiveXx(recent)).toBeLessThan(0.02);
  });

  it("holds no address, no user and no identifier of a person", () => {
    expect(JSON.stringify(rows())).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
```

- [ ] **Step 2: Constater l'échec**

Run: `pnpm test tests/unit/monitoring-api-seed.test.ts` → FAIL (`apiUsage` vide).

- [ ] **Step 3: Écrire la graine**

Dans `src/lib/data/seed.ts`, juste après `seedSystemIncidents(store, iso);` ajouter `seedApiUsage(store, now);`, puis à la fin du fichier :

```ts
interface ApiEndpointDef {
  method: "GET" | "POST" | "PATCH"; endpoint: string; perDay: number; ms: number; p4: number; p5: number; open?: boolean;
}
const API_ENDPOINTS: ApiEndpointDef[] = [
  { method: "POST", endpoint: "/auth/login", perDay: 420, ms: 180, p4: 0.08, p5: 0.002, open: true },
  { method: "GET", endpoint: "/public/trips/search", perDay: 900, ms: 140, p4: 0.01, p5: 0.004, open: true },
  { method: "POST", endpoint: "/me/bookings", perDay: 160, ms: 420, p4: 0.06, p5: 0.01 },
  { method: "GET", endpoint: "/me/bookings", perDay: 380, ms: 90, p4: 0.005, p5: 0.002 },
  { method: "POST", endpoint: "/me/bookings/{id}/payment", perDay: 110, ms: 650, p4: 0.04, p5: 0.02 },
  { method: "GET", endpoint: "/bookings", perDay: 300, ms: 110, p4: 0.01, p5: 0.003 },
  { method: "GET", endpoint: "/bookings/{id}", perDay: 260, ms: 70, p4: 0.02, p5: 0.002 },
  { method: "GET", endpoint: "/trips", perDay: 280, ms: 95, p4: 0.005, p5: 0.001 },
  { method: "PATCH", endpoint: "/trips/{id}/status", perDay: 60, ms: 85, p4: 0.03, p5: 0.002 },
  { method: "GET", endpoint: "/parcels/track/{id}", perDay: 340, ms: 120, p4: 0.15, p5: 0.004, open: true },
  { method: "GET", endpoint: "/notifications/me", perDay: 500, ms: 60, p4: 0.002, p5: 0.001 },
  { method: "POST", endpoint: "/parcels", perDay: 70, ms: 380, p4: 0.04, p5: 0.01 },
  { method: "GET", endpoint: "/companies/{id}", perDay: 150, ms: 55, p4: 0.01, p5: 0.001 },
  { method: "GET", endpoint: "/health/services", perDay: 90, ms: 45, p4: 0, p5: 0 },
];
const API_SHARES = [0.4, 0.3, 0.2, 0.1];

/**
 * Thirty days of API traffic aggregates for four active companies (and anonymous callers on the public endpoints),
 * with a weekly rhythm and a degradation of the parcel and notification endpoints during the last two days.
 */
function seedApiUsage(store: Store, now: Date): void {
  const DAY_MS = 86_400_000;
  const companyIds = store.companies.filter((c) => c.status === "active").slice(0, 4).map((c) => c.id);

  for (let d = 0; d < 30; d++) {
    const at = new Date(now.getTime() - d * DAY_MS);
    const day = at.toISOString().slice(0, 10);
    const dow = at.getUTCDay();
    API_ENDPOINTS.forEach((e, ei) => {
      const factor = (dow === 0 ? 0.6 : dow === 6 ? 0.8 : 1) * (1 + ((d * 31 + ei * 17) % 11) / 50);
      const degraded = d <= 1 && (e.endpoint.startsWith("/parcels") || e.endpoint === "/notifications/me");
      const p5 = degraded ? e.p5 * 8 + 0.03 : e.p5;
      const slow = degraded ? 3 : 1;
      const noise = ((d * 13 + ei * 7) % 9) / 40 - 0.1;
      const targets: [string | null, number][] = [
        ...companyIds.map((id, k): [string | null, number] => [id, e.open ? API_SHARES[k]! * 0.8 : API_SHARES[k]!]),
        ...(e.open ? [[null, 0.2] as [string | null, number]] : []),
      ];
      for (const [companyId, share] of targets) {
        const total = Math.round(e.perDay * factor * share);
        if (total === 0) continue;
        const n5 = Math.round(total * p5);
        const n4 = Math.round(total * e.p4);
        const n2 = Math.max(0, total - n4 - n5);
        const ok = Math.max(1, Math.round(e.ms * slow * (1 + noise)));
        const classes: [ApiUsageRow["statusClass"], number, number, number][] = [
          ["2xx", n2, ok, ok * (4 + (d % 3))],
          ["4xx", n4, Math.max(1, Math.round(e.ms * 0.6)), Math.max(1, Math.round(e.ms * 0.6)) * 3],
          ["5xx", n5, Math.round(e.ms * slow * 2.5), Math.round(e.ms * slow * 2.5) * 4],
        ];
        for (const [statusClass, count, avgResponseMs, maxResponseMs] of classes) {
          if (count <= 0) continue;
          store.apiUsage.push({ day, companyId, endpoint: e.endpoint, method: e.method, statusClass, count, avgResponseMs, maxResponseMs });
        }
      }
    });
  }
}
```

- [ ] **Step 4: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. Si `> 2000` lignes n'est pas atteint, vérifier le nombre de compagnies actives ; si la part de 5xx du colis ne dépasse pas trois fois celle d'avant, c'est un défaut de la graine (les paramètres `p5 * 8 + 0.03` doivent suffire) : l'ajuster dans la graine, jamais dans le test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/seed.ts tests/unit/monitoring-api-seed.test.ts
git commit -m "feat: API traffic aggregates seed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Libellés, dépôts de lecture et migration du tableau de bord (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `src/lib/data/seed.ts`, `src/lib/repos/dashboard.ts`, `tests/unit/labels.test.ts`, `tests/unit/dashboard-repo.test.ts`
- Create: `src/lib/repos/monitoring.ts`, `tests/unit/monitoring-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, types des Tasks 1 et 2, `Booking`, `Transaction`, `Ticket`, `ParcelHistoryEntry`, `Feedback`, `Customer`.
- Produces (`src/lib/repos/monitoring.ts`) :
  - Constantes : `STALE_AFTER_MS = 90_000`, `INCIDENT_STATUSES`, `INCIDENT_SEVERITIES`, `IMPACT_SCOPES` (`as const`), `API_WINDOWS = [7, 14, 30]`.
  - Fonction : `incidentTransitionBlock(incident, target)`.
  - Types : `ServiceRow`, `ServiceStats`, `HistoryPoint`, `IncidentRow`, `IncidentDetail`, `ApiDayRow`, `ApiEndpointRow`, `ApiSummary`, `UsageDayRow`, `UsageEventRow`, `UsageSummary`.
  - Dépôts : `servicesRepo.referenceTime()` / `.names()` / `.list()` / `.stats()` / `.history(name)` / `.latestLive()`, `incidentsRepo.listRows({ status?, severity?, serviceName? })` / `.get(id)` / `.detail(id, now?)`, `apiRepo.summary({ days, companyId? }, now?)`, `analyticsRepo.summary({ days, companyId? }, now?)`.
  - Libellés : `incidentStatusBadge`, `impactScopeLabel`.

- [ ] **Step 1: Libellés (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import { impactScopeLabel, incidentStatusBadge } from "@/lib/labels";

describe("monitoring labels", () => {
  it("labels incident statuses and impact scopes", () => {
    expect(incidentStatusBadge("INVESTIGATING")).toEqual({ label: "En investigation", tone: "warning" });
    expect(incidentStatusBadge("IDENTIFIED")).toEqual({ label: "Identifié", tone: "warning" });
    expect(incidentStatusBadge("MONITORING")).toEqual({ label: "Sous surveillance", tone: "info" });
    expect(incidentStatusBadge("RESOLVED")).toEqual({ label: "Résolu", tone: "success" });
    expect(impactScopeLabel("SINGLE_COMPANY")).toBe("Une compagnie");
    expect(impactScopeLabel("MULTI_COMPANY")).toBe("Plusieurs compagnies");
    expect(impactScopeLabel("PLATFORM_WIDE")).toBe("Toute la plateforme");
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `ImpactScope`, `IncidentStatus`, puis ajouter à la fin :

```ts
export const incidentStatusBadge = (s: IncidentStatus): Badge =>
  pick({
    INVESTIGATING: { label: "En investigation", tone: "warning" },
    IDENTIFIED: { label: "Identifié", tone: "warning" },
    MONITORING: { label: "Sous surveillance", tone: "info" },
    RESOLVED: { label: "Résolu", tone: "success" },
  }, s);

export const impactScopeLabel = (s: ImpactScope): string =>
  ({ SINGLE_COMPANY: "Une compagnie", MULTI_COMPANY: "Plusieurs compagnies", PLATFORM_WIDE: "Toute la plateforme" })[s];
```

Run: `pnpm test tests/unit/labels.test.ts` (rouge avant, vert après).

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/monitoring-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  analyticsRepo, apiRepo, incidentTransitionBlock, incidentsRepo, STALE_AFTER_MS, servicesRepo,
} from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const serviceNamed = (name: string) => servicesRepo.list().find((r) => r.name === name)!;
const incidentTitled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;

describe("service health", () => {
  it("takes the most recent check of all services as the reference of the poll", () => {
    const latest = getStore().serviceChecks.map((c) => c.checkedAt).sort().at(-1);
    expect(servicesRepo.referenceTime()).toBe(latest);
    expect(NOW.getTime() - Date.parse(latest!)).toBe(20_000);
  });

  it("lists every service once, sorted, with its latest check and no error rate", () => {
    const rows = servicesRepo.list();
    expect(rows.map((r) => r.name)).toEqual([...new Set(getStore().serviceChecks.map((c) => c.serviceName))].sort());
    expect(servicesRepo.names()).toEqual(rows.map((r) => r.name));
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "checkedAt", "errorRatePercent", "lastChangeAt", "name", "openIncidents", "responseTimeMs", "stale", "status", "uptimePercent",
    ]);
    expect(rows.every((r) => r.errorRatePercent === null)).toBe(true);
    expect(serviceNamed("notification-service")).toMatchObject({ status: "down", stale: false });
    expect(serviceNamed("parcel-service")).toMatchObject({ status: "degraded", stale: false });
    expect(serviceNamed("identity-service")).toMatchObject({ status: "healthy", stale: false });
  });

  it("flags a service as stale only when its last check is strictly more than 90 seconds older than the reference", () => {
    expect(serviceNamed("gateway").stale).toBe(true);
    const s = getStore();
    const target = s.serviceChecks.filter((c) => c.serviceName === "hr-service").sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0]!;
    const ref = Date.parse(servicesRepo.referenceTime()!);
    target.checkedAt = new Date(ref - STALE_AFTER_MS).toISOString();
    expect(serviceNamed("hr-service").stale).toBe(false);
    target.checkedAt = new Date(ref - STALE_AFTER_MS - 1).toISOString();
    expect(serviceNamed("hr-service").stale).toBe(true);
  });

  it("computes the 24-hour availability against the reference, nothing for a stale service", () => {
    expect(serviceNamed("identity-service").uptimePercent).toBe(100);
    expect(serviceNamed("gateway").uptimePercent).toBeNull();
    // notification-service: 48 checks in the window, 6 down => 42/48 = 87.5 %
    expect(serviceNamed("notification-service").uptimePercent).toBe(87.5);
    // parcel-service: 4 degraded of 48 => 44/48 = 91.7 %
    expect(serviceNamed("parcel-service").uptimePercent).toBe(91.7);
    // booking-service: one blip of 48 => 97.9 %
    expect(serviceNamed("booking-service").uptimePercent).toBe(97.9);
  });

  it("finds the most recent state change of a service", () => {
    const s = getStore();
    const checks = s.serviceChecks.filter((c) => c.serviceName === "notification-service").sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    expect(serviceNamed("notification-service").lastChangeAt).toBe(checks.at(-6)!.checkedAt);
    expect(serviceNamed("identity-service").lastChangeAt).toBeNull();
    const booking = s.serviceChecks.filter((c) => c.serviceName === "booking-service").sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    expect(serviceNamed("booking-service").lastChangeAt).toBe(booking[21]!.checkedAt);
  });

  it("counts the open incidents of each service", () => {
    expect(serviceNamed("notification-service").openIncidents).toBe(1);
    expect(serviceNamed("parcel-service").openIncidents).toBe(1);
    expect(serviceNamed("fleet-service").openIncidents).toBe(0);
  });

  it("counts a stale service only as stale", () => {
    expect(servicesRepo.stats()).toEqual({ healthy: 8, degraded: 1, down: 1, stale: 1 });
  });

  it("returns the 48 latest checks of a service, oldest first, and nothing for an unknown one", () => {
    const history = servicesRepo.history("notification-service");
    expect(history).toHaveLength(48);
    for (let i = 1; i < history.length; i++) expect(history[i - 1]!.at < history[i]!.at).toBe(true);
    expect(history.slice(-6).every((p) => p.status === "down")).toBe(true);
    expect(Object.keys(history[0]!).sort()).toEqual(["at", "responseTimeMs", "status"]);
    expect(servicesRepo.history("gateway")).toHaveLength(12);
    expect(servicesRepo.history("inconnu")).toEqual([]);
  });

  it("gives the dashboard the live services only", () => {
    const live = servicesRepo.latestLive();
    expect(live.map((s) => s.name)).not.toContain("gateway");
    expect(live).toHaveLength(10);
    expect(live.find((s) => s.name === "notification-service")).toEqual({ name: "notification-service", status: "down", responseTimeMs: expect.any(Number) });
    expect(live.find((s) => s.name === "notification-service")!.responseTimeMs).toBeGreaterThanOrEqual(8000);
  });
});

describe("incident transitions", () => {
  it("allows moving forward, jumps included, and refuses everything else in the documented order", () => {
    const at = (status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED") => ({ status });
    expect(incidentTransitionBlock(at("INVESTIGATING"), "IDENTIFIED")).toBeNull();
    expect(incidentTransitionBlock(at("INVESTIGATING"), "RESOLVED")).toBeNull();
    expect(incidentTransitionBlock(at("IDENTIFIED"), "MONITORING")).toBeNull();
    expect(incidentTransitionBlock(at("MONITORING"), "RESOLVED")).toBeNull();
    expect(incidentTransitionBlock(at("IDENTIFIED"), "IDENTIFIED")).toBe("L'incident est déjà dans cet état");
    expect(incidentTransitionBlock(at("IDENTIFIED"), "INVESTIGATING")).toBe("Un incident ne peut pas revenir en arrière");
    expect(incidentTransitionBlock(at("MONITORING"), "IDENTIFIED")).toBe("Un incident ne peut pas revenir en arrière");
    for (const target of ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const) {
      expect(incidentTransitionBlock(at("RESOLVED"), target)).toBe("Un incident résolu ne peut plus changer de statut");
    }
  });
});

describe("incident list and detail", () => {
  it("lists incidents newest first and filters by status, severity and service", () => {
    const all = incidentsRepo.listRows({});
    expect(all).toHaveLength(8);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.detectedAt >= all[i]!.detectedAt).toBe(true);
    expect(incidentsRepo.listRows({ status: "RESOLVED" })).toHaveLength(5);
    expect(incidentsRepo.listRows({ severity: "HIGH" }).every((r) => r.severity === "HIGH")).toBe(true);
    expect(incidentsRepo.listRows({ serviceName: "parcel-service" }).map((r) => r.title)).toEqual(["Latence élevée sur les colis"]);
    expect(incidentsRepo.listRows({ status: "RESOLVED", severity: "CRITICAL" })).toHaveLength(1);
  });

  it("exposes only client-safe fields (no description) and names the touched company", () => {
    const rows = incidentsRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "companyName", "detectedAt", "hasPostmortem", "id", "impactScope", "incidentCode", "resolvedAt", "serviceName",
      "severity", "status", "title",
    ]);
    const text = JSON.stringify(rows);
    for (const i of getStore().systemIncidents) if (i.description) expect(text).not.toContain(i.description);
    const single = rows.find((r) => r.title === "Échecs de réservation sur une compagnie")!;
    expect(single.companyName).toBe(getStore().companies.find((c) => c.id === incidentTitled(single.title).affectedCompanyId)!.name);
    expect(rows.find((r) => r.title === "Latence élevée sur les colis")!.companyName).toBeNull();
    expect(rows.find((r) => r.title === "Indisponibilité de la flotte")!.hasPostmortem).toBe(true);
  });

  it("returns the detail with an ongoing or final duration, undefined when unknown", () => {
    expect(incidentsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
    const open = incidentsRepo.detail(incidentTitled("Latence élevée sur les colis").id, NOW)!;
    expect(open.durationMinutes).toBe(1440);
    expect(open.companyName).toBeNull();
    const done = incidentsRepo.detail(incidentTitled("Échec de connexion intermittent").id, NOW)!;
    expect(done.durationMinutes).toBe(720);
    const later = incidentsRepo.detail(incidentTitled("Latence élevée sur les colis").id, new Date(NOW.getTime() + DAY))!;
    expect(later.durationMinutes).toBe(2880);
    expect(incidentsRepo.detail(incidentTitled("Échec de connexion intermittent").id, new Date(NOW.getTime() + DAY))!.durationMinutes).toBe(720);
  });
});

describe("API traffic summary", () => {
  it("totals the window with weighted averages and error shares", () => {
    const s = getStore();
    const summary = apiRepo.summary({ days: 7 }, NOW);
    const window = s.apiUsage.filter((r) => r.day >= "2026-10-27");
    const count = window.reduce((n, r) => n + r.count, 0);
    expect(summary.days).toBe(7);
    expect(summary.from).toBe("2026-10-27");
    expect(summary.to).toBe("2026-11-02");
    expect(summary.totals.count).toBe(count);
    expect(summary.totals.avgResponseMs).toBe(Math.round(window.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / count));
    expect(summary.totals.maxResponseMs).toBe(Math.max(...window.map((r) => r.maxResponseMs)));
    expect(summary.totals.serverErrorPercent).toBe(Math.round((window.filter((r) => r.statusClass === "5xx").reduce((n, r) => n + r.count, 0) / count) * 1000) / 10);
    expect(summary.totals.clientErrorPercent).toBeGreaterThan(0);
  });

  it("returns one row per day of the window, oldest first, with counts that add up", () => {
    const summary = apiRepo.summary({ days: 14 }, NOW);
    expect(summary.byDay).toHaveLength(14);
    expect(summary.byDay[0]!.day).toBe("2026-10-20");
    expect(summary.byDay.at(-1)!.day).toBe("2026-11-02");
    const total = summary.byDay.reduce((n, d) => n + d.ok + d.clientErrors + d.serverErrors, 0);
    expect(total).toBe(summary.totals.count);
    expect(Object.keys(summary.byDay[0]!).sort()).toEqual(["clientErrors", "day", "ok", "serverErrors"]);
  });

  it("groups by method and endpoint, busiest first", () => {
    const summary = apiRepo.summary({ days: 30 }, NOW);
    expect(summary.byEndpoint).toHaveLength(14);
    for (let i = 1; i < summary.byEndpoint.length; i++) expect(summary.byEndpoint[i - 1]!.count >= summary.byEndpoint[i]!.count).toBe(true);
    expect(Object.keys(summary.byEndpoint[0]!).sort()).toEqual([
      "avgResponseMs", "clientErrorPercent", "count", "endpoint", "maxResponseMs", "method", "serverErrorPercent",
    ]);
    const parcel = summary.byEndpoint.find((e) => e.endpoint === "/parcels/track/{id}")!;
    expect(parcel.method).toBe("GET");
    expect(parcel.clientErrorPercent).toBeGreaterThan(5);
    expect(summary.byEndpoint.reduce((n, e) => n + e.count, 0)).toBe(summary.totals.count);
  });

  it("filters by company and rejects nothing: an unknown company simply has no traffic", () => {
    const s = getStore();
    const id = s.apiUsage.find((r) => r.companyId)!.companyId!;
    const mine = apiRepo.summary({ days: 30, companyId: id }, NOW);
    expect(mine.totals.count).toBe(s.apiUsage.filter((r) => r.companyId === id).reduce((n, r) => n + r.count, 0));
    expect(mine.totals.count).toBeLessThan(apiRepo.summary({ days: 30 }, NOW).totals.count);
    const none = apiRepo.summary({ days: 30, companyId: "00000000-0000-4000-8000-000000000000" }, NOW);
    expect(none.totals).toEqual({ count: 0, avgResponseMs: 0, maxResponseMs: 0, clientErrorPercent: 0, serverErrorPercent: 0 });
    expect(none.byEndpoint).toEqual([]);
    expect(none.byDay).toHaveLength(30);
  });

  it("moves with the injected clock", () => {
    const later = apiRepo.summary({ days: 7 }, new Date(NOW.getTime() + 3 * DAY));
    expect(later.to).toBe("2026-11-05");
    expect(later.totals.count).toBeLessThan(apiRepo.summary({ days: 7 }, NOW).totals.count);
  });
});

describe("derived product usage", () => {
  it("counts the events of the window from the data the other screens show", () => {
    const s = getStore();
    const summary = analyticsRepo.summary({ days: 30 }, NOW);
    const byName = new Map(summary.byEvent.map((e) => [e.eventName, e]));
    const inWindow = (iso: string) => Date.parse(iso) >= Date.UTC(2026, 9, 4) && Date.parse(iso) < Date.UTC(2026, 10, 3);
    expect(byName.get("booking_created")!.count).toBe(s.bookings.filter((b) => inWindow(b.createdAt)).length);
    expect(byName.get("payment_completed")!.count).toBe(s.transactions.filter((t) => t.status === "COMPLETED" && t.completedAt && inWindow(t.completedAt)).length);
    expect(byName.get("ticket_issued")!.count).toBe(s.tickets.filter((t) => inWindow(t.issuedAt)).length);
    expect(byName.get("parcel_created")!.count).toBe(s.parcelHistory.filter((h) => h.previousStatus === null && inWindow(h.changedAt)).length);
    expect(byName.get("parcel_status_changed")!.count).toBe(s.parcelHistory.filter((h) => h.previousStatus !== null && inWindow(h.changedAt)).length);
    expect(byName.get("feedback_responded")!.count).toBe(s.feedbacks.filter((f) => f.respondedAt && inWindow(f.respondedAt)).length);
    expect(summary.totals.events).toBe(summary.byEvent.reduce((n, e) => n + e.count, 0));
  });

  it("assigns categories, counts distinct users per event and never counts a parcel user", () => {
    const summary = analyticsRepo.summary({ days: 30 }, NOW);
    const byName = new Map(summary.byEvent.map((e) => [e.eventName, e]));
    expect(byName.get("booking_created")!.eventCategory).toBe("booking");
    expect(byName.get("parcel_created")!.eventCategory).toBe("parcel");
    expect(byName.get("feedback_responded")!.eventCategory).toBe("customer");
    expect(byName.get("parcel_created")!.distinctUsers).toBe(0);
    expect(byName.get("booking_created")!.distinctUsers).toBeGreaterThan(0);
    expect(byName.get("booking_created")!.distinctUsers).toBeLessThanOrEqual(4);
    expect(byName.get("booking_created")!.activeDays).toBeGreaterThan(0);
    expect(summary.totals.distinctUsers).toBeGreaterThanOrEqual(byName.get("booking_created")!.distinctUsers);
    expect(Object.keys(summary.byEvent[0]!).sort()).toEqual(["activeDays", "count", "distinctUsers", "eventCategory", "eventName"]);
  });

  it("returns one row per day of the window with the three categories", () => {
    const summary = analyticsRepo.summary({ days: 7 }, NOW);
    expect(summary.byDay).toHaveLength(7);
    expect(summary.byDay.at(-1)!.day).toBe("2026-11-02");
    expect(Object.keys(summary.byDay[0]!).sort()).toEqual(["booking", "customer", "day", "parcel"]);
    const total = summary.byDay.reduce((n, d) => n + d.booking + d.parcel + d.customer, 0);
    expect(total).toBe(summary.totals.events);
  });

  it("filters by company and shrinks the window when asked for fewer days", () => {
    const s = getStore();
    const companyId = s.bookings[0]!.companyId;
    const mine = analyticsRepo.summary({ days: 30, companyId }, NOW);
    expect(mine.totals.events).toBeLessThan(analyticsRepo.summary({ days: 30 }, NOW).totals.events);
    expect(analyticsRepo.summary({ days: 7 }, NOW).totals.events).toBeLessThanOrEqual(analyticsRepo.summary({ days: 30 }, NOW).totals.events);
    expect(analyticsRepo.summary({ days: 30, companyId: "00000000-0000-4000-8000-000000000000" }, NOW).totals).toEqual({ events: 0, distinctUsers: 0 });
  });
});
```

Dans ce test, les valeurs attendues « 87,5 / 91,7 / 97,9 » supposent 48 contrôles dans les 24 h précédant la référence : le premier contrôle (le plus ancien) est à `20 s + 47 × 30 min` de la référence, soit 23,5 h : il est dans la fenêtre. Si la fenêtre était de 24 h **exclusive** de 48 contrôles, ces valeurs seraient fausses : garder la comparaison `référence − contrôle <= 24 h`.

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/monitoring-repo.test.ts` → FAIL (module absent).

- [ ] **Step 4: Implémenter le dépôt**

Créer `src/lib/repos/monitoring.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import type {
  ApiUsageRow, ImpactScope, IncidentSeverity, IncidentStatus, ServiceHealth, ServiceStatus, SystemIncident,
} from "@/lib/types";

/** A service whose last check precedes the most recent check of all services by more than this is stale. */
export const STALE_AFTER_MS = 90_000;
export const INCIDENT_STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const IMPACT_SCOPES = ["SINGLE_COMPANY", "MULTI_COMPANY", "PLATFORM_WIDE"] as const;
export const API_WINDOWS = [7, 14, 30] as const;

const HOUR = 3_600_000;
const DAY = 86_400_000;
const STATUS_ORDER: Record<IncidentStatus, number> = { INVESTIGATING: 0, IDENTIFIED: 1, MONITORING: 2, RESOLVED: 3 };

export interface ServiceRow {
  name: string; status: ServiceStatus; responseTimeMs: number;
  /** The backend never computes it: always `null`. */
  errorRatePercent: number | null;
  checkedAt: string; stale: boolean;
  /** Share of healthy checks in the 24 hours before the reference; `null` when there is none (stale service). */
  uptimePercent: number | null;
  lastChangeAt: string | null; openIncidents: number;
}

export interface ServiceStats { healthy: number; degraded: number; down: number; stale: number }
export interface HistoryPoint { at: string; responseTimeMs: number; status: ServiceStatus }

/** Client-safe projection of an incident: no description. */
export interface IncidentRow {
  id: string; incidentCode: string; title: string; serviceName: string; severity: IncidentSeverity;
  status: IncidentStatus; impactScope: ImpactScope; companyName: string | null; detectedAt: string;
  resolvedAt: string | null; hasPostmortem: boolean;
}

export interface IncidentDetail {
  incident: SystemIncident;
  companyName: string | null;
  durationMinutes: number;
}

export interface ApiTotals {
  count: number; avgResponseMs: number; maxResponseMs: number; clientErrorPercent: number; serverErrorPercent: number;
}
export interface ApiDayRow { day: string; ok: number; clientErrors: number; serverErrors: number }
export interface ApiEndpointRow extends ApiTotals { method: ApiUsageRow["method"]; endpoint: string }
export interface ApiSummary { days: number; from: string; to: string; totals: ApiTotals; byDay: ApiDayRow[]; byEndpoint: ApiEndpointRow[] }

export interface UsageDayRow { day: string; booking: number; parcel: number; customer: number }
export interface UsageEventRow { eventName: string; eventCategory: "booking" | "parcel" | "customer"; count: number; activeDays: number; distinctUsers: number }
export interface UsageSummary {
  days: number; from: string; to: string; totals: { events: number; distinctUsers: number };
  byDay: UsageDayRow[]; byEvent: UsageEventRow[];
}

function companyName(companyId: string | null): string | null {
  return companyId ? getStore().companies.find((c) => c.id === companyId)?.name ?? "—" : null;
}

/** Why an incident cannot move to `target`, `null` when it can. Same order as the guards. */
export function incidentTransitionBlock(incident: Pick<SystemIncident, "status">, target: IncidentStatus): string | null {
  if (incident.status === "RESOLVED") return "Un incident résolu ne peut plus changer de statut";
  if (target === incident.status) return "L'incident est déjà dans cet état";
  if (STATUS_ORDER[target] < STATUS_ORDER[incident.status]) return "Un incident ne peut pas revenir en arrière";
  return null;
}

function checksOf(name: string) {
  return getStore().serviceChecks.filter((c) => c.serviceName === name).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}

const rounded = (value: number) => Math.round(value * 10) / 10;
const dayOf = (at: Date) => at.toISOString().slice(0, 10);

function windowDays(days: number, now: Date): string[] {
  return Array.from({ length: days }, (_, i) => dayOf(new Date(now.getTime() - (days - 1 - i) * DAY)));
}

export const servicesRepo = {
  /** The most recent check of all services: the reference of the whole poll. */
  referenceTime(): string | null {
    return getStore().serviceChecks.reduce<string | null>((max, c) => (max === null || c.checkedAt > max ? c.checkedAt : max), null);
  },

  names(): string[] {
    return [...new Set(getStore().serviceChecks.map((c) => c.serviceName))].sort();
  },

  list(): ServiceRow[] {
    const s = getStore();
    const ref = this.referenceTime();
    const refMs = ref ? Date.parse(ref) : 0;
    return this.names().map((name): ServiceRow => {
      const checks = checksOf(name);
      const latest = checks.at(-1)!;
      const window = checks.filter((c) => refMs - Date.parse(c.checkedAt) <= 24 * HOUR);
      let lastChangeAt: string | null = null;
      for (let i = 1; i < checks.length; i++) if (checks[i]!.status !== checks[i - 1]!.status) lastChangeAt = checks[i]!.checkedAt;
      return {
        name, status: latest.status, responseTimeMs: latest.responseTimeMs, errorRatePercent: latest.errorRatePercent,
        checkedAt: latest.checkedAt, stale: refMs - Date.parse(latest.checkedAt) > STALE_AFTER_MS,
        uptimePercent: window.length === 0 ? null : rounded((window.filter((c) => c.status === "healthy").length / window.length) * 100),
        lastChangeAt,
        openIncidents: s.systemIncidents.filter((i) => i.serviceName === name && i.status !== "RESOLVED").length,
      };
    });
  },

  stats(): ServiceStats {
    const rows = this.list();
    const live = rows.filter((r) => !r.stale);
    return {
      healthy: live.filter((r) => r.status === "healthy").length,
      degraded: live.filter((r) => r.status === "degraded").length,
      down: live.filter((r) => r.status === "down").length,
      stale: rows.length - live.length,
    };
  },

  history(name: string): HistoryPoint[] {
    return checksOf(name).slice(-48).map((c) => ({ at: c.checkedAt, responseTimeMs: c.responseTimeMs, status: c.status }));
  },

  /** Dashboard projection: the latest check of every service that is still being polled. */
  latestLive(): ServiceHealth[] {
    return this.list().filter((r) => !r.stale).map((r) => ({ name: r.name, status: r.status, responseTimeMs: r.responseTimeMs }));
  },
};

function incidentRow(i: SystemIncident): IncidentRow {
  return {
    id: i.id, incidentCode: i.incidentCode, title: i.title, serviceName: i.serviceName, severity: i.severity,
    status: i.status, impactScope: i.impactScope, companyName: companyName(i.affectedCompanyId),
    detectedAt: i.detectedAt, resolvedAt: i.resolvedAt, hasPostmortem: i.postmortemUrl !== null,
  };
}

export const incidentsRepo = {
  listRows(filter: { status?: IncidentStatus; severity?: IncidentSeverity; serviceName?: string } = {}): IncidentRow[] {
    return getStore().systemIncidents
      .filter((i) =>
        (!filter.status || i.status === filter.status) &&
        (!filter.severity || i.severity === filter.severity) &&
        (!filter.serviceName || i.serviceName === filter.serviceName))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || a.id.localeCompare(b.id))
      .map(incidentRow);
  },

  get(id: string): SystemIncident | undefined {
    return getStore().systemIncidents.find((i) => i.id === id);
  },

  detail(id: string, now: Date = new Date()): IncidentDetail | undefined {
    const incident = getStore().systemIncidents.find((i) => i.id === id);
    if (!incident) return undefined;
    const end = incident.resolvedAt ? Date.parse(incident.resolvedAt) : now.getTime();
    return {
      incident, companyName: companyName(incident.affectedCompanyId),
      durationMinutes: Math.max(0, Math.round((end - Date.parse(incident.detectedAt)) / 60_000)),
    };
  },
};

function totalsOf(rows: ApiUsageRow[]): ApiTotals {
  const count = rows.reduce((n, r) => n + r.count, 0);
  if (count === 0) return { count: 0, avgResponseMs: 0, maxResponseMs: 0, clientErrorPercent: 0, serverErrorPercent: 0 };
  const of = (cls: ApiUsageRow["statusClass"]) => rows.filter((r) => r.statusClass === cls).reduce((n, r) => n + r.count, 0);
  return {
    count,
    avgResponseMs: Math.round(rows.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / count),
    maxResponseMs: Math.max(...rows.map((r) => r.maxResponseMs)),
    clientErrorPercent: rounded((of("4xx") / count) * 100),
    serverErrorPercent: rounded((of("5xx") / count) * 100),
  };
}

export const apiRepo = {
  summary(filter: { days: number; companyId?: string }, now: Date = new Date()): ApiSummary {
    const days = windowDays(filter.days, now);
    const inWindow = new Set(days);
    const rows = getStore().apiUsage.filter((r) => inWindow.has(r.day) && (!filter.companyId || r.companyId === filter.companyId));
    const groups = new Map<string, ApiUsageRow[]>();
    for (const r of rows) groups.set(`${r.method} ${r.endpoint}`, [...(groups.get(`${r.method} ${r.endpoint}`) ?? []), r]);
    return {
      days: filter.days, from: days[0]!, to: days.at(-1)!, totals: totalsOf(rows),
      byDay: days.map((day): ApiDayRow => {
        const of = (cls: ApiUsageRow["statusClass"]) => rows.filter((r) => r.day === day && r.statusClass === cls).reduce((n, r) => n + r.count, 0);
        return { day, ok: of("2xx"), clientErrors: of("4xx"), serverErrors: of("5xx") };
      }),
      byEndpoint: [...groups.values()]
        .map((list): ApiEndpointRow => ({ method: list[0]!.method, endpoint: list[0]!.endpoint, ...totalsOf(list) }))
        .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint)),
    };
  },
};

interface DerivedEvent {
  at: string; eventName: string; eventCategory: UsageEventRow["eventCategory"]; companyId: string; userId: string | null;
}

/** Product events the other screens already show, read as the backend's `AnalyticsEvent` would carry them. */
function derivedEvents(): DerivedEvent[] {
  const s = getStore();
  const out: DerivedEvent[] = [];
  const userOfBooking = (bookingId: string) => s.bookings.find((b) => b.id === bookingId)?.userId ?? null;
  for (const b of s.bookings) out.push({ at: b.createdAt, eventName: "booking_created", eventCategory: "booking", companyId: b.companyId, userId: b.userId });
  for (const t of s.transactions) {
    if (t.status === "COMPLETED" && t.completedAt) {
      out.push({ at: t.completedAt, eventName: "payment_completed", eventCategory: "booking", companyId: t.companyId, userId: userOfBooking(t.bookingId) });
    }
  }
  for (const t of s.tickets) out.push({ at: t.issuedAt, eventName: "ticket_issued", eventCategory: "booking", companyId: t.companyId, userId: userOfBooking(t.bookingId) });
  for (const h of s.parcelHistory) {
    const parcel = s.parcels.find((p) => p.id === h.parcelId);
    if (!parcel) continue;
    out.push({
      at: h.changedAt, eventName: h.previousStatus === null ? "parcel_created" : "parcel_status_changed",
      eventCategory: "parcel", companyId: parcel.companyId, userId: null,
    });
  }
  for (const f of s.feedbacks) {
    if (f.respondedAt) {
      out.push({
        at: f.respondedAt, eventName: "feedback_responded", eventCategory: "customer", companyId: f.companyId,
        userId: s.customers.find((c) => c.id === f.customerId)?.userId ?? null,
      });
    }
  }
  return out;
}

export const analyticsRepo = {
  summary(filter: { days: number; companyId?: string }, now: Date = new Date()): UsageSummary {
    const days = windowDays(filter.days, now);
    const inWindow = new Set(days);
    const events = derivedEvents().filter((e) => inWindow.has(e.at.slice(0, 10)) && (!filter.companyId || e.companyId === filter.companyId));
    const users = (list: DerivedEvent[]) => new Set(list.map((e) => e.userId).filter((u): u is string => u !== null));
    const names = [...new Set(events.map((e) => e.eventName))];
    return {
      days: filter.days, from: days[0]!, to: days.at(-1)!,
      totals: { events: events.length, distinctUsers: users(events).size },
      byDay: days.map((day): UsageDayRow => {
        const of = (cat: UsageEventRow["eventCategory"]) => events.filter((e) => e.at.slice(0, 10) === day && e.eventCategory === cat).length;
        return { day, booking: of("booking"), parcel: of("parcel"), customer: of("customer") };
      }),
      byEvent: names
        .map((eventName): UsageEventRow => {
          const list = events.filter((e) => e.eventName === eventName);
          return {
            eventName, eventCategory: list[0]!.eventCategory, count: list.length,
            activeDays: new Set(list.map((e) => e.at.slice(0, 10))).size, distinctUsers: users(list).size,
          };
        })
        .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName)),
    };
  },
};
```

(`this` dans `servicesRepo` est correct pour un objet littéral appelé par `servicesRepo.list()` ; si `tsc` ou le lint s'en plaint, remplacer par `servicesRepo.` explicite.)

- [ ] **Step 5: Supprimer les anciennes collections et migrer le tableau de bord**

Dans `src/lib/data/seed.ts` : **supprimer** de `interface Store` les champs `services: ServiceHealth[];` et `incidents: Incident[];`, retirer `services: [], incidents: [],` du littéral de `buildSeed`, **supprimer** les blocs `store.services = [ … ].map(…);` et `store.incidents = [ … ];`, et retirer `ServiceHealth` et `Incident` de l'import de types s'ils ne servent plus (ils restent exportés par `types/index.ts` pour le tableau de bord).

Dans `src/lib/repos/dashboard.ts` :
1. importer `import { servicesRepo } from "@/lib/repos/monitoring";`
2. remplacer `openIncidents: s.incidents.filter((i) => i.status !== "RESOLVED").length,` par `openIncidents: s.systemIncidents.filter((i) => i.status !== "RESOLVED").length,`
3. remplacer `services: s.services,` par `services: servicesRepo.latestLive(),`
4. remplacer `incidents: s.incidents.filter((i) => i.status !== "RESOLVED"),` par :

```ts
      incidents: s.systemIncidents
        .filter((i) => i.status !== "RESOLVED")
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
        .map((i): Incident => ({
          id: i.id, code: i.incidentCode, title: i.title, serviceName: i.serviceName, severity: i.severity,
          status: i.status, detectedAt: i.detectedAt,
        })),
```

Dans `tests/unit/dashboard-repo.test.ts` : remplacer l'assertion `expect(o.kpis.openIncidents).toBe(2);` par `expect(o.kpis.openIncidents).toBe(getStore().systemIncidents.filter((i) => i.status !== "RESOLVED").length);` (importer `getStore` si absent) et ajouter dans le `describe` :

```ts
  it("shows the live services and the open incidents of the monitoring data", () => {
    const o = dashboardRepo.overview(new Date());
    expect(o.services).toHaveLength(10);
    expect(o.services.map((s) => s.name)).not.toContain("gateway");
    expect(o.services.find((s) => s.name === "notification-service")!.status).toBe("down");
    expect(o.incidents.length).toBe(o.kpis.openIncidents);
    expect(o.incidents.every((i) => i.status !== "RESOLVED")).toBe(true);
    const at = o.incidents.map((i) => i.detectedAt);
    expect([...at].sort().reverse()).toEqual(at);
  });
```

- [ ] **Step 6: Constater le vert**

Run: `pnpm test` puis `pnpm typecheck` → PASS. Vérifier à la main que `grep -rn "s\.services\|store\.services\|s\.incidents\|store\.incidents" src tests` ne renvoie plus rien.

- [ ] **Step 7: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. Dans `servicesRepo.list`, remplacer `> STALE_AFTER_MS` par `>= STALE_AFTER_MS` : échoue `flags a service as stale only when its last check is strictly more than 90 seconds older…`.
2. Remplacer `<= 24 * HOUR` par `< 24 * HOUR` : échoue `computes the 24-hour availability…` (le plus ancien contrôle sort de la fenêtre : 87,5 devient 87,2).
3. Dans `stats`, compter les services obsolètes aussi comme leur dernier statut (retirer le filtre `live`) : échoue `counts a stale service only as stale`.
4. Dans `list`, retirer le test `checks[i]!.status !== checks[i - 1]!.status` pour le remplacer par `i === 0` : échoue `finds the most recent state change of a service`.
5. Dans `incidentTransitionBlock`, inverser les deux premières lignes : échoue `allows moving forward, jumps included…`.
6. Dans `incidentRow`, ajouter `description` à la projection : échoue `exposes only client-safe fields (no description)…`.
7. Dans `totalsOf`, remplacer la moyenne pondérée par la moyenne simple : échoue `totals the window with weighted averages and error shares`.
8. Dans `windowDays`, remplacer `days - 1 - i` par `days - i` : échoue `totals the window…` (la fenêtre de 7 jours deviendrait de 8).
9. Dans `derivedEvents`, ne pas filtrer `status === "COMPLETED"` : échoue `counts the events of the window from the data the other screens show`.
10. Dans `analyticsRepo.summary`, compter l'utilisateur d'un colis (`userId: "x"`) : échoue `assigns categories, counts distinct users per event and never counts a parcel user`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/labels.ts src/lib/data/seed.ts src/lib/repos/monitoring.ts src/lib/repos/dashboard.ts tests/unit/labels.test.ts tests/unit/monitoring-repo.test.ts tests/unit/dashboard-repo.test.ts
git commit -m "feat: monitoring read repositories, staleness, availability, traffic and derived usage; dashboard migration

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Règles d'incident et actions serveur (TDD)

**Files:**
- Modify: `src/lib/repos/monitoring.ts`, `src/lib/repos/compliance.ts`
- Create: `src/app/(admin)/supervision/actions.ts`, `tests/unit/monitoring-rules.test.ts`, `tests/unit/monitoring-actions.test.ts`

**Interfaces:**
- Consumes: dépôts de la Task 3, `appendAudit` (lot 8, exporté ici), `addActivity`, `run`, `requireString`.
- Produces: `incidentsRepo.declare(input, actor?, now?)`, `incidentsRepo.advance(id, target, actor?, now?)`, `incidentsRepo.setPostmortem(id, url, actor?, now?)` ; type `IncidentInput` ; actions `declareIncident(input)`, `advanceIncident(id, target)`, `setIncidentPostmortem(id, url)`.

- [ ] **Step 1: Exporter `appendAudit`**

Dans `src/lib/repos/compliance.ts` (lot 8), remplacer `function appendAudit(` par `export function appendAudit(`. Aucun autre changement ; `pnpm test tests/unit/compliance-repo.test.ts tests/unit/compliance-rules.test.ts` reste vert.

- [ ] **Step 2: Test des règles (rouge)**

Créer `tests/unit/monitoring-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { incidentsRepo, type IncidentInput } from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const titled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;
const companyId = () => getStore().companies.find((c) => c.status === "active")!.id;
const valid = (over: Partial<IncidentInput> = {}): IncidentInput => ({
  title: "Lenteur des réservations", serviceName: "booking-service", severity: "HIGH", impactScope: "PLATFORM_WIDE",
  affectedCompanyId: null, description: "Les réservations répondent lentement.", ...over,
});
const declare = (over: Partial<IncidentInput> = {}) => incidentsRepo.declare(valid(over), "tester@sira.app", NOW);
const counts = () => {
  const s = getStore();
  return { incidents: s.systemIncidents.length, audit: s.auditLogs.length, activity: s.activity.length };
};

describe("declaring an incident", () => {
  it("creates it as investigating with a generated code, the actor, and journals it without the description", () => {
    const before = counts();
    const incident = declare();
    expect(incident).toMatchObject({
      status: "INVESTIGATING", severity: "HIGH", impactScope: "PLATFORM_WIDE", affectedCompanyId: null,
      title: "Lenteur des réservations", serviceName: "booking-service", description: "Les réservations répondent lentement.",
      detectedAt: NOW.toISOString(), createdAt: NOW.toISOString(), resolvedAt: null, postmortemUrl: null,
      reportedBy: "tester@sira.app", updatedAt: null,
    });
    expect(incident.incidentCode).toMatch(/^SYS-[0-9A-Z]{8}$/);
    const s = getStore();
    expect(s.systemIncidents.at(-1)).toBe(incident);
    expect(counts()).toEqual({ incidents: before.incidents + 1, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: null, actorUserId: null, actorLabel: "tester@sira.app", actorType: "USER", action: "CREATE",
      entityType: "SystemIncident", entityId: incident.id, beforeState: null,
      afterState: { status: "INVESTIGATING", severity: "HIGH", impactScope: "PLATFORM_WIDE" },
      sourceService: "monitoring-service", createdAt: NOW.toISOString(),
    });
    expect(s.activity[0]).toMatchObject({ companyId: null, actor: "tester@sira.app", at: NOW.toISOString() });
    expect(s.activity[0]!.action).toBe(`Incident ${incident.incidentCode} déclaré (Haute) sur booking-service`);
    expect(JSON.stringify([s.auditLogs.at(-1), s.activity[0]])).not.toContain("répondent lentement");
  });

  it("attaches a single-company incident to its company and trims text", () => {
    const id = companyId();
    const incident = declare({ title: "  Panne locale  ", serviceName: " fleet-service ", impactScope: "SINGLE_COMPANY", affectedCompanyId: id, description: "   " });
    expect(incident).toMatchObject({ title: "Panne locale", serviceName: "fleet-service", affectedCompanyId: id, description: null });
    expect(getStore().auditLogs.at(-1)!.companyId).toBe(id);
    expect(getStore().activity[0]!.companyId).toBe(id);
  });

  it("generates codes that never collide with an existing one", () => {
    const first = declare();
    const second = declare({ title: "Deuxième incident" });
    expect(first.incidentCode).not.toBe(second.incidentCode);
    const codes = getStore().systemIncidents.map((i) => i.incidentCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("refuses a blank or too long title", () => {
    expect(() => declare({ title: "   " })).toThrow("Un titre est obligatoire");
    expect(() => declare({ title: "x".repeat(201) })).toThrow("Le titre est trop long (200 caractères maximum)");
    expect(() => declare({ title: "x".repeat(200) })).not.toThrow();
  });

  it("refuses a blank or too long service name", () => {
    expect(() => declare({ serviceName: " " })).toThrow("Le service est obligatoire");
    expect(() => declare({ serviceName: "s".repeat(101) })).toThrow("Le nom du service est trop long (100 caractères maximum)");
    expect(() => declare({ serviceName: "s".repeat(100) })).not.toThrow();
  });

  it("refuses an unknown severity or scope", () => {
    expect(() => declare({ severity: "URGENT" as never })).toThrow("Gravité invalide");
    expect(() => declare({ impactScope: "EVERYWHERE" as never })).toThrow("Portée invalide");
  });

  it("requires an existing company for a single-company scope and forbids one otherwise", () => {
    expect(() => declare({ impactScope: "SINGLE_COMPANY", affectedCompanyId: null })).toThrow(
      "Une compagnie est obligatoire pour un incident limité à une compagnie",
    );
    expect(() => declare({ impactScope: "SINGLE_COMPANY", affectedCompanyId: "00000000-0000-4000-8000-000000000000" })).toThrow("Compagnie introuvable");
    expect(() => declare({ impactScope: "PLATFORM_WIDE", affectedCompanyId: companyId() })).toThrow(
      "Une compagnie ne peut être indiquée que pour un incident limité à une compagnie",
    );
    expect(() => declare({ impactScope: "MULTI_COMPANY", affectedCompanyId: companyId() })).toThrow(
      "Une compagnie ne peut être indiquée que pour un incident limité à une compagnie",
    );
  });

  it("limits the description to 10000 characters", () => {
    expect(() => declare({ description: "d".repeat(10_001) })).toThrow("La description est trop longue (10000 caractères maximum)");
    expect(() => declare({ description: "d".repeat(10_000) })).not.toThrow();
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => declare({ title: "" })).toThrow();
    expect(() => declare({ impactScope: "SINGLE_COMPANY" })).toThrow();
    expect(counts()).toEqual(before);
  });

  it("checks the guards in order: title, service, severity, scope, company, description", () => {
    const bad = valid({ title: "", serviceName: "", severity: "X" as never, impactScope: "Y" as never, description: "d".repeat(10_001) });
    expect(() => incidentsRepo.declare(bad)).toThrow("Un titre est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok" })).toThrow("Le service est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s" })).toThrow("Gravité invalide");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW" })).toThrow("Portée invalide");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW", impactScope: "SINGLE_COMPANY" })).toThrow("Une compagnie est obligatoire");
    expect(() => incidentsRepo.declare({ ...bad, title: "ok", serviceName: "s", severity: "LOW", impactScope: "PLATFORM_WIDE" })).toThrow("La description est trop longue");
  });
});

describe("changing the status of an incident", () => {
  it("moves it forward, stamps the update, journals the transition and nothing else", () => {
    const target = titled("Échecs de réservation sur une compagnie");
    const before = counts();
    const result = incidentsRepo.advance(target.id, "MONITORING", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("MONITORING");
    expect(target.updatedAt).toBe(NOW.toISOString());
    expect(target.resolvedAt).toBeNull();
    const s = getStore();
    expect(counts()).toEqual({ incidents: before.incidents, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      companyId: target.affectedCompanyId, actorLabel: "tester@sira.app", action: "UPDATE", entityType: "SystemIncident",
      entityId: target.id, beforeState: { status: "IDENTIFIED" }, afterState: { status: "MONITORING" },
      sourceService: "monitoring-service",
    });
    expect(s.activity[0]!.action).toBe(`Incident ${target.incidentCode} : identifié → sous surveillance`);
  });

  it("resolves an incident and sets its resolution date, jumping over statuses", () => {
    const target = titled("Latence élevée sur les colis");
    incidentsRepo.advance(target.id, "RESOLVED", "tester@sira.app", NOW);
    expect(target.status).toBe("RESOLVED");
    expect(target.resolvedAt).toBe(NOW.toISOString());
    const fresh = declare();
    incidentsRepo.advance(fresh.id, "RESOLVED", "tester@sira.app", NOW);
    expect(fresh.status).toBe("RESOLVED");
  });

  it("refuses an unknown incident and an unknown status", () => {
    expect(() => incidentsRepo.advance("00000000-0000-4000-8000-000000000000", "RESOLVED")).toThrow("Incident introuvable");
    expect(() => incidentsRepo.advance(titled("Latence élevée sur les colis").id, "ARCHIVED" as never)).toThrow("Statut invalide");
  });

  it("refuses to go back or stay put, and leaves the incident and the journals untouched", () => {
    const target = titled("Échecs de réservation sur une compagnie");
    const before = counts();
    expect(() => incidentsRepo.advance(target.id, "INVESTIGATING", "tester@sira.app", NOW)).toThrow("Un incident ne peut pas revenir en arrière");
    expect(() => incidentsRepo.advance(target.id, "IDENTIFIED", "tester@sira.app", NOW)).toThrow("L'incident est déjà dans cet état");
    expect(target.status).toBe("IDENTIFIED");
    expect(target.updatedAt).not.toBe(NOW.toISOString());
    expect(counts()).toEqual(before);
  });

  it("refuses any change on a resolved incident and keeps its resolution date", () => {
    const target = titled("Retard de synchronisation RH");
    const resolvedAt = target.resolvedAt;
    for (const to of ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const) {
      expect(() => incidentsRepo.advance(target.id, to)).toThrow("Un incident résolu ne peut plus changer de statut");
    }
    expect(target.resolvedAt).toBe(resolvedAt);
  });

  it("checks the guards in order: unknown, status, resolved, same, backwards", () => {
    expect(() => incidentsRepo.advance("00000000-0000-4000-8000-000000000000", "ARCHIVED" as never)).toThrow("Incident introuvable");
    expect(() => incidentsRepo.advance(titled("Retard de synchronisation RH").id, "ARCHIVED" as never)).toThrow("Statut invalide");
    expect(() => incidentsRepo.advance(titled("Retard de synchronisation RH").id, "RESOLVED")).toThrow("Un incident résolu");
  });
});

describe("setting a postmortem", () => {
  it("records the address on a resolved incident and audits only the first time", () => {
    const target = titled("Échec de connexion intermittent");
    const before = counts();
    incidentsRepo.setPostmortem(target.id, "  https://status.sira.app/postmortems/2026-10-28  ", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("https://status.sira.app/postmortems/2026-10-28");
    expect(target.updatedAt).toBe(NOW.toISOString());
    const s = getStore();
    expect(counts()).toEqual({ incidents: before.incidents, audit: before.audit + 1, activity: before.activity + 1 });
    expect(s.auditLogs.at(-1)).toMatchObject({
      action: "UPDATE", entityType: "SystemIncident", beforeState: { postmortem: "false" }, afterState: { postmortem: "true" },
    });
    expect(s.activity[0]!.action).toBe(`Postmortem de l'incident ${target.incidentCode} ajouté`);
    expect(JSON.stringify([s.auditLogs.at(-1), s.activity[0]])).not.toContain("status.sira.app");

    incidentsRepo.setPostmortem(target.id, "http://status.sira.app/v2", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("http://status.sira.app/v2");
    expect(s.auditLogs).toHaveLength(before.audit + 1);
    expect(s.activity[0]!.action).toBe(`Postmortem de l'incident ${target.incidentCode} mis à jour`);
  });

  it("works on an open incident too", () => {
    const target = titled("Latence élevée sur les colis");
    incidentsRepo.setPostmortem(target.id, "https://status.sira.app/p", "tester@sira.app", NOW);
    expect(target.postmortemUrl).toBe("https://status.sira.app/p");
    expect(target.status).toBe("MONITORING");
  });

  it("refuses an unknown incident and a blank address", () => {
    expect(() => incidentsRepo.setPostmortem("00000000-0000-4000-8000-000000000000", "https://x.org")).toThrow("Incident introuvable");
    expect(() => incidentsRepo.setPostmortem(titled("Latence élevée sur les colis").id, "   ")).toThrow("L'adresse du postmortem est obligatoire");
  });

  it("refuses an address that is not an http or https link, or that contains a space", () => {
    const target = titled("Échec de connexion intermittent");
    for (const bad of ["ftp://x.org/p", "javascript:alert(1)", "status.sira.app/p", "https://", "https://a b.org"]) {
      expect(() => incidentsRepo.setPostmortem(target.id, bad), bad).toThrow("L'adresse du postmortem doit commencer par http:// ou https://");
    }
    expect(target.postmortemUrl).toBeNull();
  });

  it("limits the address to 2048 characters", () => {
    const target = titled("Échec de connexion intermittent");
    const url = (n: number) => `https://x.org/${"a".repeat(n - "https://x.org/".length)}`;
    expect(() => incidentsRepo.setPostmortem(target.id, url(2049))).toThrow("L'adresse du postmortem est trop longue (2048 caractères maximum)");
    incidentsRepo.setPostmortem(target.id, url(2048), "tester@sira.app", NOW);
    expect(target.postmortemUrl).toHaveLength(2048);
  });

  it("changes nothing when a guard refuses", () => {
    const target = titled("Échec de connexion intermittent");
    const before = counts();
    expect(() => incidentsRepo.setPostmortem(target.id, "ftp://x.org")).toThrow();
    expect(target.postmortemUrl).toBeNull();
    expect(counts()).toEqual(before);
  });
});
```

- [ ] **Step 3: Constater l'échec**

Run: `pnpm test tests/unit/monitoring-rules.test.ts` → FAIL (`incidentsRepo.declare is not a function`).

- [ ] **Step 4: Implémenter**

Dans `src/lib/repos/monitoring.ts` :

1. Ajouter les imports : `import { addActivity } from "@/lib/repos/activity";` et `import { appendAudit } from "@/lib/repos/compliance";`.
2. Ajouter, après `incidentTransitionBlock`, le type et les utilitaires :

```ts
export interface IncidentInput {
  title: string; serviceName: string; severity: IncidentSeverity; impactScope: ImpactScope;
  affectedCompanyId: string | null; description: string;
}

const STATUS_TEXT: Record<IncidentStatus, string> = {
  INVESTIGATING: "en investigation", IDENTIFIED: "identifié", MONITORING: "sous surveillance", RESOLVED: "résolu",
};
const SEVERITY_TEXT: Record<IncidentSeverity, string> = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Haute", CRITICAL: "Critique" };

let incidentSeq = 1;

/** `SYS-` + 8 base-36 characters (Knuth's multiplicative hash), advanced until the code is unused. */
function nextIncidentCode(): string {
  const used = new Set(getStore().systemIncidents.map((i) => i.incidentCode));
  let n = getStore().systemIncidents.length + 1;
  for (;;) {
    const code = "SYS-" + ((n * 2_654_435_761) % 2 ** 32).toString(36).toUpperCase().padStart(8, "0");
    if (!used.has(code)) return code;
    n++;
  }
}
```

3. Dans `incidentsRepo`, après `detail`, ajouter :

```ts
  /**
   * Declares an incident. Guards, in this order: title, service, severity, scope, company, description.
   * The incident starts as `INVESTIGATING`, detected now.
   */
  declare(input: IncidentInput, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const s = getStore();
    const title = input.title.trim();
    if (!title) throw new Error("Un titre est obligatoire");
    if (title.length > 200) throw new Error("Le titre est trop long (200 caractères maximum)");
    const serviceName = input.serviceName.trim();
    if (!serviceName) throw new Error("Le service est obligatoire");
    if (serviceName.length > 100) throw new Error("Le nom du service est trop long (100 caractères maximum)");
    if (!(INCIDENT_SEVERITIES as readonly string[]).includes(input.severity)) throw new Error("Gravité invalide");
    if (!(IMPACT_SCOPES as readonly string[]).includes(input.impactScope)) throw new Error("Portée invalide");
    if (input.impactScope === "SINGLE_COMPANY") {
      if (!input.affectedCompanyId) throw new Error("Une compagnie est obligatoire pour un incident limité à une compagnie");
      if (!s.companies.some((c) => c.id === input.affectedCompanyId)) throw new Error("Compagnie introuvable");
    } else if (input.affectedCompanyId) {
      throw new Error("Une compagnie ne peut être indiquée que pour un incident limité à une compagnie");
    }
    const description = input.description.trim();
    if (description.length > 10_000) throw new Error("La description est trop longue (10000 caractères maximum)");

    const incident: SystemIncident = {
      id: `incident-${now.getTime()}-${incidentSeq++}`, incidentCode: nextIncidentCode(), serviceName,
      severity: input.severity, status: "INVESTIGATING", title, description: description || null,
      impactScope: input.impactScope, affectedCompanyId: input.impactScope === "SINGLE_COMPANY" ? input.affectedCompanyId : null,
      detectedAt: now.toISOString(), resolvedAt: null, reportedBy: actor, postmortemUrl: null,
      createdAt: now.toISOString(), updatedAt: null,
    };
    s.systemIncidents.push(incident);
    appendAudit({
      companyId: incident.affectedCompanyId, action: "CREATE", entityType: "SystemIncident", entityId: incident.id,
      beforeState: null, afterState: { status: incident.status, severity: incident.severity, impactScope: incident.impactScope },
      sourceService: "monitoring-service",
    }, actor, now);
    addActivity(incident.affectedCompanyId, actor, `Incident ${incident.incidentCode} déclaré (${SEVERITY_TEXT[incident.severity]}) sur ${serviceName}`, now);
    return incident;
  },

  /** Moves an incident forward. Guards, in this order: incident exists, valid status, not resolved, different, not backwards. */
  advance(incidentId: string, target: IncidentStatus, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const incident = getStore().systemIncidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error("Incident introuvable");
    if (!(INCIDENT_STATUSES as readonly string[]).includes(target)) throw new Error("Statut invalide");
    const blocked = incidentTransitionBlock(incident, target);
    if (blocked) throw new Error(blocked);
    const previous = incident.status;
    incident.status = target;
    incident.updatedAt = now.toISOString();
    if (target === "RESOLVED") incident.resolvedAt = now.toISOString();
    appendAudit({
      companyId: incident.affectedCompanyId, action: "UPDATE", entityType: "SystemIncident", entityId: incident.id,
      beforeState: { status: previous }, afterState: { status: target }, sourceService: "monitoring-service",
    }, actor, now);
    addActivity(incident.affectedCompanyId, actor, `Incident ${incident.incidentCode} : ${STATUS_TEXT[previous]} → ${STATUS_TEXT[target]}`, now);
    return incident;
  },

  /**
   * Records the postmortem address, at any status. Guards, in this order: incident exists, address present,
   * at most 2048 characters, an http(s) link without space. The audit line is written on the first address only.
   */
  setPostmortem(incidentId: string, url: string, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const incident = getStore().systemIncidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error("Incident introuvable");
    const address = url.trim();
    if (!address) throw new Error("L'adresse du postmortem est obligatoire");
    if (address.length > 2048) throw new Error("L'adresse du postmortem est trop longue (2048 caractères maximum)");
    if (!/^https?:\/\/\S+$/i.test(address)) throw new Error("L'adresse du postmortem doit commencer par http:// ou https://");
    const first = incident.postmortemUrl === null;
    incident.postmortemUrl = address;
    incident.updatedAt = now.toISOString();
    if (first) {
      appendAudit({
        companyId: incident.affectedCompanyId, action: "UPDATE", entityType: "SystemIncident", entityId: incident.id,
        beforeState: { postmortem: "false" }, afterState: { postmortem: "true" }, sourceService: "monitoring-service",
      }, actor, now);
    }
    addActivity(incident.affectedCompanyId, actor, `Postmortem de l'incident ${incident.incidentCode} ${first ? "ajouté" : "mis à jour"}`, now);
    return incident;
  },
```

Run: `pnpm test tests/unit/monitoring-rules.test.ts` → PASS. (Le message « https:// » seul est refusé par l'expression `^https?:\/\/\S+$` qui exige au moins un caractère après `//`.)

Mutations (appliquer, constater l'échec du test nommé, restaurer) :
1. Supprimer `if (!title) throw …` : échoue `refuses a blank or too long title`.
2. Remplacer `title.length > 200` par `title.length >= 200` : échoue le même test (la borne 200 accepte).
3. Remplacer `serviceName.length > 100` par `>= 100` : échoue `refuses a blank or too long service name`.
4. Supprimer la ligne `else if (input.affectedCompanyId) throw …` : échoue `requires an existing company for a single-company scope and forbids one otherwise`.
5. Supprimer le contrôle `s.companies.some(...)` : échoue le même test.
6. Remplacer `description.length > 10_000` par `>= 10_000` : échoue `limits the description to 10000 characters`.
7. Supprimer `appendAudit` de `declare` : échoue le premier test de la déclaration.
8. Supprimer `if (target === "RESOLVED") incident.resolvedAt = …` : échoue `resolves an incident and sets its resolution date…`.
9. Dans `incidentTransitionBlock`, supprimer la ligne `RESOLVED` : échoue `refuses any change on a resolved incident and keeps its resolution date`.
10. Dans `advance`, déplacer la vérification du statut avant celle de l'incident : échoue `checks the guards in order: unknown, status, resolved, same, backwards`.
11. Dans `setPostmortem`, remplacer l'expression par `^https?:\/\/` (sans `\S+$`) : échoue `refuses an address that is not an http or https link, or that contains a space`.
12. Remplacer `address.length > 2048` par `>= 2048` : échoue `limits the address to 2048 characters`.
13. Dans `setPostmortem`, auditer à chaque saisie (retirer `if (first)`) : échoue `records the address on a resolved incident and audits only the first time`.
14. Ajouter l'adresse à l'état de l'audit : échoue le même test (`not.toContain("status.sira.app")`).

- [ ] **Step 5: Test et implémentation des actions**

Créer `tests/unit/monitoring-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { advanceIncident, declareIncident, setIncidentPostmortem } from "@/app/(admin)/supervision/actions";
import type { IncidentInput } from "@/lib/repos/monitoring";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const titled = (title: string) => getStore().systemIncidents.find((i) => i.title === title)!;
const input = (over: Partial<IncidentInput> = {}): IncidentInput => ({
  title: "Incident de test", serviceName: "booking-service", severity: "LOW", impactScope: "PLATFORM_WIDE",
  affectedCompanyId: null, description: "", ...over,
});
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("declareIncident", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().systemIncidents.length;
    expect(await declareIncident(input())).toEqual(EXPIRED);
    expect(getStore().systemIncidents).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("declares the incident as the session actor and revalidates the affected pages", async () => {
    expect(await declareIncident(input({ title: "  Incident de test  " }))).toEqual({ ok: true });
    const created = getStore().systemIncidents.at(-1)!;
    expect(created).toMatchObject({ title: "Incident de test", reportedBy: "tester@sira.app", status: "INVESTIGATING" });
    expect(paths()).toEqual(expect.arrayContaining(["/", "/supervision/incidents", "/supervision/services", "/conformite/journal-audit"]));
  });

  it("returns the rule's message as an error result and revalidates nothing", async () => {
    expect(await declareIncident(input({ title: " " }))).toEqual({ ok: false, error: "Un titre est obligatoire" });
    expect(await declareIncident(input({ impactScope: "SINGLE_COMPANY" }))).toEqual({
      ok: false, error: "Une compagnie est obligatoire pour un incident limité à une compagnie",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("advanceIncident", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "MONITORING")).toEqual(EXPIRED);
    expect(target.status).toBe("IDENTIFIED");
  });

  it("moves the incident forward and revalidates the incident, the list and the dashboard", async () => {
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "MONITORING")).toEqual({ ok: true });
    expect(target.status).toBe("MONITORING");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining(["/", "/supervision/incidents", `/supervision/incidents/${target.id}`]));
  });

  it("returns the rule's message for a backward move, an unknown incident and a blank id", async () => {
    const target = titled("Échecs de réservation sur une compagnie");
    expect(await advanceIncident(target.id, "INVESTIGATING")).toEqual({ ok: false, error: "Un incident ne peut pas revenir en arrière" });
    expect(await advanceIncident(titled("Retard de synchronisation RH").id, "RESOLVED")).toEqual({
      ok: false, error: "Un incident résolu ne peut plus changer de statut",
    });
    expect(await advanceIncident("00000000-0000-4000-8000-000000000000", "RESOLVED")).toEqual({ ok: false, error: "Incident introuvable" });
    expect((await advanceIncident("", "RESOLVED")).ok).toBe(false);
    expect(target.status).toBe("IDENTIFIED");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setIncidentPostmortem", () => {
  it("writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "https://status.sira.app/p")).toEqual(EXPIRED);
    expect(target.postmortemUrl).toBeNull();
  });

  it("records the address and revalidates the incident", async () => {
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "https://status.sira.app/p")).toEqual({ ok: true });
    expect(target.postmortemUrl).toBe("https://status.sira.app/p");
    expect(paths()).toEqual(expect.arrayContaining([`/supervision/incidents/${target.id}`, "/supervision/incidents"]));
  });

  it("returns the rule's message for a bad address, an unknown incident and a blank id", async () => {
    const target = titled("Échec de connexion intermittent");
    expect(await setIncidentPostmortem(target.id, "ftp://x.org")).toEqual({
      ok: false, error: "L'adresse du postmortem doit commencer par http:// ou https://",
    });
    expect(await setIncidentPostmortem("00000000-0000-4000-8000-000000000000", "https://x.org")).toEqual({ ok: false, error: "Incident introuvable" });
    expect((await setIncidentPostmortem("", "https://x.org")).ok).toBe(false);
    expect(target.postmortemUrl).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

Créer `src/app/(admin)/supervision/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireString, run, type ActionResult } from "@/lib/actions/run";
import { incidentsRepo, type IncidentInput } from "@/lib/repos/monitoring";
import type { IncidentStatus, SystemIncident } from "@/lib/types";

function refreshIncident(incident: SystemIncident) {
  revalidatePath("/");
  revalidatePath("/supervision/incidents");
  revalidatePath(`/supervision/incidents/${incident.id}`);
  revalidatePath("/supervision/services");
  revalidatePath("/conformite/journal-audit");
  if (incident.affectedCompanyId) revalidatePath(`/compagnies/${incident.affectedCompanyId}`);
}

export async function declareIncident(input: IncidentInput): Promise<ActionResult> {
  return run((actor) => {
    refreshIncident(incidentsRepo.declare(input, actor));
  });
}

export async function advanceIncident(incidentId: string, target: IncidentStatus): Promise<ActionResult> {
  return run((actor) => {
    requireString(incidentId, "Incident");
    refreshIncident(incidentsRepo.advance(incidentId, target, actor));
  });
}

export async function setIncidentPostmortem(incidentId: string, url: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(incidentId, "Incident");
    refreshIncident(incidentsRepo.setPostmortem(incidentId, url, actor));
  });
}
```

Mutations des actions : (a) appeler `incidentsRepo.declare` hors de `run` → échoue `writes nothing without a session` (déclaration) ; (b) retirer `requireString(incidentId, "Incident")` d'`advanceIncident` → échoue la ligne `(await advanceIncident("", "RESOLVED")).ok` ; (c) retirer `revalidatePath("/")` de `refreshIncident` → échoue les tests de revalidation (déclaration ou changement de statut) ; (d) passer `"admin@sira.app"` à la place de `actor` → échoue `declares the incident as the session actor…`.

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repos/monitoring.ts src/lib/repos/compliance.ts "src/app/(admin)/supervision/actions.ts" tests/unit/monitoring-rules.test.ts tests/unit/monitoring-actions.test.ts
git commit -m "feat: declare, advance and document incidents, with journals and server actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Pages des services et des incidents

**Files:**
- Create: `src/components/monitoring/{service-history-chart,declare-incident-button,incident-actions}.tsx`, `src/app/(admin)/supervision/services/page.tsx`, `src/app/(admin)/supervision/incidents/{page.tsx,incidents-table.tsx}`, `src/app/(admin)/supervision/incidents/[id]/{page.tsx,not-found.tsx}`

**Interfaces:**
- Consumes: `servicesRepo`, `incidentsRepo`, constantes de filtre, actions de la Task 4, `parseFilter`, `KpiCard`, `ConfirmDialog`, libellés (`serviceStatusBadge`, `severityBadge`, `incidentStatusBadge`, `impactScopeLabel`).
- Produces: pages `/supervision/services`, `/supervision/incidents`, `/supervision/incidents/[id]`. `data-testid` : `svc-healthy`, `svc-degraded`, `svc-down`, `svc-stale`, `svc-reference`, `incident-status`, `incident-resolved-note`, `incident-postmortem`, `incident-duration`.

- [ ] **Step 1: Graphique de l'historique**

Créer `src/components/monitoring/service-history-chart.tsx` :

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of a check: a UTC time label, the response time and the status. */
export interface ServiceHistoryPoint { label: string; ms: number; status: "healthy" | "degraded" | "down" }

const COLOR = { healthy: "var(--success)", degraded: "var(--warning)", down: "var(--danger)" } as const;

export function ServiceHistoryChart({ service, points }: { service: string; points: ServiceHistoryPoint[] }) {
  return (
    <div className="h-64" role="img" aria-label={`Temps de réponse des ${points.length} derniers contrôles de ${service}, en millisecondes`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={5} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip
            formatter={(v) => [`${v} ms`, "Réponse"]}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="ms" radius={[2, 2, 0, 0]}>
            {points.map((p, i) => <Cell key={i} fill={COLOR[p.status]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Page des services**

Créer `src/app/(admin)/supervision/services/page.tsx` :

```tsx
import Link from "next/link";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { StatusFilterNav } from "@/components/data/status-filter-nav";
import { ServiceHistoryChart } from "@/components/monitoring/service-history-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import { serviceStatusBadge } from "@/lib/labels";
import { servicesRepo } from "@/lib/repos/monitoring";

export const dynamic = "force-dynamic";

const utcTime = (iso: string) => new Date(iso).toISOString().slice(11, 16);

export default async function ServicesPage({
  searchParams,
}: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const rows = servicesRepo.list();
  const stats = servicesRepo.stats();
  const reference = servicesRepo.referenceTime();
  const names = rows.map((r) => r.name);
  const chosen =
    names.find((n) => n === service) ?? rows.find((r) => !r.stale && r.status !== "healthy")?.name ?? names[0] ?? "";
  const points = servicesRepo.history(chosen).map((p) => ({ label: utcTime(p.at), ms: p.responseTimeMs, status: p.status }));
  return (
    <>
      <PageHeader
        title="Santé des services"
        description="Contrôles de santé de la plateforme. Un service est obsolète quand son dernier contrôle précède de plus de 90 secondes le dernier sondage."
      />
      <p data-testid="svc-reference" className="mb-4 text-sm text-muted-foreground">
        Dernier sondage : {reference ? formatDateTime(reference) : "—"} (UTC)
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="svc-healthy"><KpiCard label="Opérationnels" value={formatNumber(stats.healthy)} tone="success" /></div>
        <div data-testid="svc-degraded"><KpiCard label="Dégradés" value={formatNumber(stats.degraded)} tone={stats.degraded > 0 ? "warning" : "default"} /></div>
        <div data-testid="svc-down"><KpiCard label="En panne" value={formatNumber(stats.down)} tone={stats.down > 0 ? "danger" : "default"} /></div>
        <div data-testid="svc-stale"><KpiCard label="Obsolètes" value={formatNumber(stats.stale)} hint="Plus sondés" /></div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Réponse</th>
                <th className="px-3 py-2 font-medium">Taux d&apos;erreur</th>
                <th className="px-3 py-2 font-medium">Disponibilité 24 h</th>
                <th className="px-3 py-2 font-medium">Dernier changement</th>
                <th className="px-3 py-2 font-medium">Incidents ouverts</th>
                <th className="px-3 py-2 font-medium">Dernier contrôle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = serviceStatusBadge(r.status);
                return (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/supervision/services?service=${r.name}`} className="font-medium hover:underline">{r.name}</Link>
                    </td>
                    <td className="px-3 py-2">
                      {r.stale ? <StatusBadge tone="neutral">Obsolète</StatusBadge> : <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.responseTimeMs} ms</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.errorRatePercent === null ? "—" : `${r.errorRatePercent} %`}</td>
                    <td className="px-3 py-2 tabular-nums">{r.uptimePercent === null ? "—" : `${r.uptimePercent} %`}</td>
                    <td className="px-3 py-2">{r.lastChangeAt ? formatDateTime(r.lastChangeAt) : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.openIncidents > 0
                        ? <Link href={`/supervision/incidents?service=${r.name}`} className="text-accent hover:underline">{r.openIncidents}</Link>
                        : 0}
                    </td>
                    <td className="px-3 py-2">{formatDateTime(r.checkedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique de {chosen}</CardTitle></CardHeader>
        <CardContent>
          <StatusFilterNav
            basePath="/supervision/services" param="service" current={chosen} label="Choisir un service"
            options={names.map((n) => ({ value: n, label: n }))}
          />
          <ServiceHistoryChart service={chosen} points={points} />
          <p className="mt-2 text-xs text-muted-foreground">
            Un contrôle toutes les 30 minutes dans cette maquette (le service sonde toutes les 30 secondes). Vert : opérationnel, orange : dégradé, rouge : en panne.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

(`StatusFilterNav` marque « all » comme sans filtre ; ici `current` est toujours un nom de service, aucune option « all » n'existe, c'est voulu. Le filtre `?service=` de la liste des incidents est lu par la page des incidents ci-dessous.)

- [ ] **Step 3: Composants clients des incidents**

Créer `src/components/monitoring/declare-incident-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { declareIncident } from "@/app/(admin)/supervision/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEVERITIES = [["LOW", "Faible"], ["MEDIUM", "Moyenne"], ["HIGH", "Haute"], ["CRITICAL", "Critique"]] as const;
const SCOPES = [
  ["SINGLE_COMPANY", "Une compagnie"], ["MULTI_COMPANY", "Plusieurs compagnies"], ["PLATFORM_WIDE", "Toute la plateforme"],
] as const;
const FIELD = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

/** Service names and company names/ids only: no incident data comes in. */
export function DeclareIncidentButton({
  services, companies,
}: { services: string[]; companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [serviceName, setServiceName] = useState(services[0] ?? "");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number][0]>("MEDIUM");
  const [scope, setScope] = useState<(typeof SCOPES)[number][0]>("PLATFORM_WIDE");
  const [companyId, setCompanyId] = useState("");
  const [description, setDescription] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Déclarer un incident</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title="Déclarer un incident"
        description="L'incident est créé « en investigation », détecté maintenant, à votre nom."
        confirmLabel="Déclarer l'incident" confirmDisabled={title.trim() === ""}
        onConfirm={async () => {
          const r = await declareIncident({
            title, serviceName, severity, impactScope: scope,
            affectedCompanyId: scope === "SINGLE_COMPANY" && companyId ? companyId : null, description,
          });
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setTitle("");
          setDescription("");
        }}
      >
        <div className="space-y-3 text-sm">
          <label className="block space-y-1"><span className="font-medium">Titre</span>
            <Input aria-label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block space-y-1"><span className="font-medium">Service</span>
            <select aria-label="Service" className={FIELD} value={serviceName} onChange={(e) => setServiceName(e.target.value)}>
              {services.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="font-medium">Gravité</span>
            <select aria-label="Gravité" className={FIELD} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              {SEVERITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="font-medium">Portée</span>
            <select aria-label="Portée" className={FIELD} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              {SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {scope === "SINGLE_COMPANY" && (
            <label className="block space-y-1"><span className="font-medium">Compagnie touchée</span>
              <select aria-label="Compagnie touchée" className={FIELD} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Choisir une compagnie…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1"><span className="font-medium">Description</span>
            <textarea aria-label="Description" rows={3} className={FIELD} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
```

Créer `src/components/monitoring/incident-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { advanceIncident, setIncidentPostmortem } from "@/app/(admin)/supervision/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IncidentStatus } from "@/lib/types";

const STATUSES: [IncidentStatus, string][] = [
  ["INVESTIGATING", "En investigation"], ["IDENTIFIED", "Identifié"], ["MONITORING", "Sous surveillance"], ["RESOLVED", "Résolu"],
];

/** Scalars only: the incident id, its status and its postmortem address. */
export interface IncidentActionsProps { incidentId: string; status: IncidentStatus; postmortemUrl: string | null }

export function IncidentActions({ incidentId, status, postmortemUrl }: IncidentActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"status" | "postmortem" | null>(null);
  const options = STATUSES.filter(([v]) => v !== status);
  const [target, setTarget] = useState<IncidentStatus>(options[0]?.[0] ?? "RESOLVED");
  const [url, setUrl] = useState(postmortemUrl ?? "");
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <>
      {status !== "RESOLVED" && <Button size="sm" onClick={() => { setTarget(options[0]![0]); setOpen("status"); }}>Changer le statut</Button>}
      <Button size="sm" variant="secondary" onClick={() => { setUrl(postmortemUrl ?? ""); setOpen("postmortem"); }}>
        {postmortemUrl ? "Modifier le postmortem" : "Renseigner le postmortem"}
      </Button>

      <ConfirmDialog
        open={open === "status"} onOpenChange={close}
        title="Changer le statut de l'incident"
        description="Un incident ne peut qu'avancer : investigation, identifié, sous surveillance, résolu. Les sauts sont permis ; une résolution est définitive."
        confirmLabel="Confirmer le changement"
        onConfirm={async () => {
          const r = await advanceIncident(incidentId, target);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Nouveau statut</span>
          <select
            aria-label="Nouveau statut" value={target} onChange={(e) => setTarget(e.target.value as IncidentStatus)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "postmortem"} onOpenChange={close}
        title="Postmortem de l'incident"
        description="Adresse d'un compte rendu publié (http ou https). Elle peut être renseignée à tout moment, même après la résolution."
        confirmLabel="Enregistrer le postmortem" confirmDisabled={url.trim() === ""}
        onConfirm={async () => {
          const r = await setIncidentPostmortem(incidentId, url);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Adresse du postmortem</span>
          <Input aria-label="Adresse du postmortem" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      </ConfirmDialog>
    </>
  );
}
```

- [ ] **Step 4: Liste des incidents**

Créer `src/app/(admin)/supervision/incidents/incidents-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import type { IncidentRow } from "@/lib/repos/monitoring";

const columns: ColumnDef<IncidentRow, unknown>[] = [
  { accessorKey: "incidentCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.incidentCode}</span> },
  { accessorKey: "title", header: "Titre" },
  { accessorKey: "serviceName", header: "Service" },
  {
    accessorKey: "severity", header: "Gravité",
    cell: ({ row }) => {
      const b = severityBadge(row.original.severity);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = incidentStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "scope", header: "Portée", accessorFn: (r) => `${impactScopeLabel(r.impactScope)} ${r.companyName ?? ""}`,
    cell: ({ row }) => (
      <span>{impactScopeLabel(row.original.impactScope)}{row.original.companyName ? ` · ${row.original.companyName}` : ""}</span>
    ),
  },
  { accessorKey: "detectedAt", header: "Détecté le", cell: ({ row }) => formatDateTime(row.original.detectedAt) },
  { accessorKey: "resolvedAt", header: "Résolu le", cell: ({ row }) => (row.original.resolvedAt ? formatDateTime(row.original.resolvedAt) : "—") },
];

export function IncidentsTable({ incidents }: { incidents: IncidentRow[] }) {
  return (
    <DataTable
      columns={columns} data={incidents} rowHref={(r) => `/supervision/incidents/${r.id}`}
      searchPlaceholder="Rechercher un incident…" emptyMessage="Aucun incident."
    />
  );
}
```

Créer `src/app/(admin)/supervision/incidents/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { DeclareIncidentButton } from "@/components/monitoring/declare-incident-button";
import { parseFilter } from "@/lib/filters";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, incidentsRepo, servicesRepo } from "@/lib/repos/monitoring";
import { getStore } from "@/lib/repos/store";
import { IncidentsTable } from "./incidents-table";

export const dynamic = "force-dynamic";

const BASE = "/supervision/incidents";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "INVESTIGATING", label: "En investigation" },
  { value: "IDENTIFIED", label: "Identifiés" },
  { value: "MONITORING", label: "Sous surveillance" },
  { value: "RESOLVED", label: "Résolus" },
];
const SEVERITY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les gravités" },
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
  { value: "CRITICAL", label: "Critique" },
];

export default async function IncidentsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string; gravite?: string; service?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, INCIDENT_STATUSES);
  const severity = parseFilter(sp.gravite, INCIDENT_SEVERITIES);
  const serviceName = parseFilter(sp.service, servicesRepo.names());
  const keep = { statut: status, gravite: severity, service: serviceName };
  const companies = getStore().companies.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }));
  return (
    <>
      <PageHeader
        title="Incidents"
        description={serviceName
          ? `Incidents plateforme du service ${serviceName}, du plus récent au plus ancien.`
          : "Incidents plateforme, déclarés et suivis à la main, du plus récent au plus ancien."}
        actions={<DeclareIncidentButton services={servicesRepo.names()} companies={companies} />}
      />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={SEVERITY_OPTIONS} current={severity} param="gravite" keep={keep} label="Filtrer par gravité" />
      <IncidentsTable incidents={incidentsRepo.listRows({ status, severity, serviceName })} />
    </>
  );
}
```

- [ ] **Step 5: Fiche d'un incident**

Créer `src/app/(admin)/supervision/incidents/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { IncidentActions } from "@/components/monitoring/incident-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import { incidentsRepo } from "@/lib/repos/monitoring";

export const dynamic = "force-dynamic";

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = incidentsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { incident: i } = detail;
  const status = incidentStatusBadge(i.status);
  const severity = severityBadge(i.severity);
  return (
    <>
      <PageHeader
        title={i.title}
        description={`${i.incidentCode} · ${i.serviceName}`}
        actions={
          <>
            <span data-testid="incident-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            <IncidentActions incidentId={i.id} status={i.status} postmortemUrl={i.postmortemUrl} />
          </>
        }
      />
      {i.status === "RESOLVED" && (
        <p data-testid="incident-resolved-note" className="mb-4 text-sm text-muted-foreground">
          Incident résolu : seul le postmortem peut encore être renseigné ou modifié.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incident</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Gravité"><StatusBadge tone={severity.tone}>{severity.label}</StatusBadge></DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Service">
              <Link href={`/supervision/services?service=${i.serviceName}`} className="hover:underline">{i.serviceName}</Link>
            </DetailRow>
            <DetailRow label="Portée">{impactScopeLabel(i.impactScope)}</DetailRow>
            <DetailRow label="Compagnie touchée">
              {i.affectedCompanyId && detail.companyName
                ? <Link href={`/compagnies/${i.affectedCompanyId}`} className="hover:underline">{detail.companyName}</Link>
                : "—"}
            </DetailRow>
            <DetailRow label="Détecté le">{formatDateTime(i.detectedAt)}</DetailRow>
            <DetailRow label="Résolu le">{i.resolvedAt ? formatDateTime(i.resolvedAt) : "—"}</DetailRow>
            <DetailRow label={i.resolvedAt ? "Durée" : "Ouvert depuis"}>
              <span data-testid="incident-duration">{duration(detail.durationMinutes)}</span>
            </DetailRow>
            <DetailRow label="Déclaré par">{i.reportedBy}</DetailRow>
            <DetailRow label="Postmortem">
              {i.postmortemUrl
                ? <a data-testid="incident-postmortem" href={i.postmortemUrl} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">Ouvrir le compte rendu</a>
                : <span data-testid="incident-postmortem">Aucun</span>}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            {i.description ? <p className="text-sm">{i.description}</p> : <p className="text-sm text-muted-foreground">Aucune description.</p>}
            <p className="mt-4 text-xs text-muted-foreground">Seul l&apos;état courant est conservé : l&apos;historique des changements de statut n&apos;existe pas.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

Créer `src/app/(admin)/supervision/incidents/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function IncidentNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Incident introuvable</p>
        <Link href="/supervision/incidents" className="mt-2 inline-block text-sm text-accent underline">Retour aux incidents</Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/monitoring "src/app/(admin)/supervision/services" "src/app/(admin)/supervision/incidents"
git commit -m "feat: service health and incident pages with declare, status and postmortem actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Pages du trafic API et de l'usage

**Files:**
- Create: `src/components/monitoring/{api-traffic-chart,usage-chart}.tsx`, `src/app/(admin)/supervision/api/page.tsx`, `src/app/(admin)/supervision/usage/page.tsx`

**Interfaces:**
- Consumes: `apiRepo`, `analyticsRepo`, `API_WINDOWS`, `parseCompanyFilter`, `CompanyFilter`, `StatusFilterNav`, `KpiCard`.
- Produces: pages `/supervision/api` et `/supervision/usage`. `data-testid` : `api-requests`, `api-latency`, `api-4xx`, `api-5xx`, `usage-events`, `usage-users`.

- [ ] **Step 1: Graphiques**

Créer `src/components/monitoring/api-traffic-chart.tsx` :

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of one day of aggregated traffic: counts only. */
export interface ApiTrafficPoint { label: string; ok: number; clientErrors: number; serverErrors: number }

export function ApiTrafficChart({ points }: { points: ApiTrafficPoint[] }) {
  return (
    <div className="h-64" role="img" aria-label="Requêtes par jour, par classe de statut">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ok" name="2xx" stackId="a" fill="var(--success)" />
          <Bar dataKey="clientErrors" name="4xx" stackId="a" fill="var(--warning)" />
          <Bar dataKey="serverErrors" name="5xx" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Créer `src/components/monitoring/usage-chart.tsx` :

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Projection of one day of product events: counts per category only. */
export interface UsagePoint { label: string; booking: number; parcel: number; customer: number }

export function UsageChart({ points }: { points: UsagePoint[] }) {
  return (
    <div className="h-64" role="img" aria-label="Événements produit par jour, par catégorie">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="booking" name="Réservations" stackId="a" fill="var(--accent)" />
          <Bar dataKey="parcel" name="Colis" stackId="a" fill="var(--info)" />
          <Bar dataKey="customer" name="Clients" stackId="a" fill="var(--success)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

(Si une variable `--accent` ou `--info` n'existe pas dans `src/app/globals.css`, utiliser celles que le graphique du tableau de bord emploie : `--success`, `--warning`, `--danger`, `--border`, `--muted-foreground` ; vérifier par `grep -n "\-\-info\|\-\-accent" src/app/globals.css`.)

- [ ] **Step 2: Page du trafic API**

Créer `src/app/(admin)/supervision/api/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { ApiTrafficChart } from "@/components/monitoring/api-traffic-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { API_WINDOWS, apiRepo } from "@/lib/repos/monitoring";
import { parseCompanyFilter } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

const BASE = "/supervision/api";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];
const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function ApiTrafficPage({
  searchParams,
}: { searchParams: Promise<{ jours?: string; compagnie?: string }> }) {
  const sp = await searchParams;
  const days = Number(parseFilter(sp.jours, API_WINDOWS.map(String))) || 7;
  const companyId = parseCompanyFilter(sp.compagnie);
  const keep = { jours: String(days), compagnie: companyId };
  const summary = apiRepo.summary({ days, companyId }, new Date());
  return (
    <>
      <PageHeader
        title="Trafic API"
        description={`Appels à la plateforme du ${summary.from} au ${summary.to}. Seuls des agrégats sont affichés : jamais d'adresse, d'utilisateur ni de ligne brute.`}
      />
      <StatusFilterNav basePath={BASE} options={WINDOW_OPTIONS} current={String(days)} param="jours" keep={keep} label="Choisir la période" />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="api-requests"><KpiCard label="Requêtes" value={formatNumber(summary.totals.count)} /></div>
        <div data-testid="api-latency">
          <KpiCard label="Latence moyenne" value={`${summary.totals.avgResponseMs} ms`} hint={`Maximum ${formatNumber(summary.totals.maxResponseMs)} ms`} />
        </div>
        <div data-testid="api-4xx"><KpiCard label="Erreurs client (4xx)" value={`${summary.totals.clientErrorPercent} %`} /></div>
        <div data-testid="api-5xx">
          <KpiCard label="Erreurs serveur (5xx)" value={`${summary.totals.serverErrorPercent} %`} tone={summary.totals.serverErrorPercent >= 1 ? "danger" : "default"} />
        </div>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Requêtes par jour</CardTitle></CardHeader>
        <CardContent>
          <ApiTrafficChart points={summary.byDay.map((d) => ({ label: label(d.day), ok: d.ok, clientErrors: d.clientErrors, serverErrors: d.serverErrors }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Par endpoint</CardTitle></CardHeader>
        <CardContent>
          {summary.byEndpoint.length === 0 ? <p className="text-sm text-muted-foreground">Aucun trafic sur cette période.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Méthode</th>
                  <th className="py-1 font-medium">Endpoint</th>
                  <th className="py-1 font-medium">Requêtes</th>
                  <th className="py-1 font-medium">Moyenne</th>
                  <th className="py-1 font-medium">Maximum</th>
                  <th className="py-1 font-medium">4xx</th>
                  <th className="py-1 font-medium">5xx</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEndpoint.map((e) => (
                  <tr key={`${e.method} ${e.endpoint}`} className="border-t border-border">
                    <td className="py-1.5 font-medium">{e.method}</td>
                    <td className="font-mono text-xs">{e.endpoint}</td>
                    <td className="tabular-nums">{formatNumber(e.count)}</td>
                    <td className="tabular-nums">{e.avgResponseMs} ms</td>
                    <td className="tabular-nums">{formatNumber(e.maxResponseMs)} ms</td>
                    <td className="tabular-nums">{e.clientErrorPercent} %</td>
                    <td className={`tabular-nums ${e.serverErrorPercent >= 1 ? "font-medium text-danger" : ""}`}>{e.serverErrorPercent} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Trafic anonyme (sans compagnie) inclus quand aucune compagnie n&apos;est choisie. Sur cette maquette, 30 jours de trafic sont conservés.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Page de l'usage**

Créer `src/app/(admin)/supervision/usage/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { UsageChart } from "@/components/monitoring/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { API_WINDOWS, analyticsRepo } from "@/lib/repos/monitoring";
import { parseCompanyFilter } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

const BASE = "/supervision/usage";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];
const CATEGORY = { booking: "Réservations", parcel: "Colis", customer: "Clients" } as const;
const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function UsagePage({
  searchParams,
}: { searchParams: Promise<{ jours?: string; compagnie?: string }> }) {
  const sp = await searchParams;
  const days = Number(parseFilter(sp.jours, API_WINDOWS.map(String))) || 7;
  const companyId = parseCompanyFilter(sp.compagnie);
  const keep = { jours: String(days), compagnie: companyId };
  const summary = analyticsRepo.summary({ days, companyId }, new Date());
  return (
    <>
      <PageHeader
        title="Usage"
        description={`Événements produit du ${summary.from} au ${summary.to}, par jour UTC. Un événement de colis ne porte pas d'utilisateur.`}
      />
      <StatusFilterNav basePath={BASE} options={WINDOW_OPTIONS} current={String(days)} param="jours" keep={keep} label="Choisir la période" />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div data-testid="usage-events"><KpiCard label="Événements" value={formatNumber(summary.totals.events)} /></div>
        <div data-testid="usage-users"><KpiCard label="Utilisateurs distincts" value={formatNumber(summary.totals.distinctUsers)} hint="Comptes ayant déclenché au moins un événement" /></div>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle>Événements par jour</CardTitle></CardHeader>
        <CardContent>
          <UsageChart points={summary.byDay.map((d) => ({ label: label(d.day), booking: d.booking, parcel: d.parcel, customer: d.customer }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Par événement</CardTitle></CardHeader>
        <CardContent>
          {summary.byEvent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement sur cette période.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Événement</th>
                  <th className="py-1 font-medium">Catégorie</th>
                  <th className="py-1 font-medium">Total</th>
                  <th className="py-1 font-medium">Jours actifs</th>
                  <th className="py-1 font-medium">Utilisateurs distincts</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEvent.map((e) => (
                  <tr key={e.eventName} className="border-t border-border">
                    <td className="py-1.5 font-mono text-xs font-medium">{e.eventName}</td>
                    <td>{CATEGORY[e.eventCategory]}</td>
                    <td className="tabular-nums">{formatNumber(e.count)}</td>
                    <td className="tabular-nums">{e.activeDays}</td>
                    <td className="tabular-nums">{e.distinctUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Ces chiffres sont calculés à partir des réservations, paiements, billets, colis et avis déjà présents. Le service conserve les événements 395 jours.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 4: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/monitoring/api-traffic-chart.tsx src/components/monitoring/usage-chart.tsx "src/app/(admin)/supervision/api" "src/app/(admin)/supervision/usage"
git commit -m "feat: API traffic and product usage pages

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

Dans `tests/unit/nav.test.ts` : le test du lot 8 `marks only lot 1 to lot 8 pages as implemented` est **remplacé** par `marks only lot 1 to lot 9 pages as implemented` : reprendre le tableau attendu du lot 8 (42 chemins, trié) et y insérer, à leur place alphabétique (après `"/offre/types-documents-kyc"`), les quatre chemins `"/supervision/api"`, `"/supervision/incidents"`, `"/supervision/services"`, `"/supervision/usage"` (46 chemins en tout). Ajouter à la fin du fichier :

```ts
describe("lot 9 breadcrumbs", () => {
  it("links the parent list of an incident detail, nothing else under supervision", () => {
    expect(isLinkablePath("/supervision/incidents/abc")).toBe(true);
    expect(isLinkablePath("/supervision/services")).toBe(true);
    expect(isLinkablePath("/supervision/api")).toBe(true);
    expect(isLinkablePath("/supervision")).toBe(false);
  });
  it("labels the supervision segments", () => {
    expect(labelForSegment("supervision")).toBe("Supervision");
    expect(labelForSegment("api")).toBe("Trafic API");
    expect(labelForSegment("usage")).toBe("Usage");
    expect(labelForSegment("incidents")).toBe("Incidents");
  });
});
```

(importer `isLinkablePath` et `labelForSegment` si absents.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` :
1. Remplacer les quatre lignes `todo(…)` de la section « Supervision » par :

```ts
    { label: "Services", href: "/supervision/services", implemented: true },
    { label: "Incidents", href: "/supervision/incidents", implemented: true },
    { label: "Trafic API", href: "/supervision/api", implemented: true },
    { label: "Usage", href: "/supervision/usage", implemented: true },
```

2. Ajouter à `SEGMENT_LABELS` : `api: "Trafic API"`.
3. Ajouter à `ROUTE_PREFIXES` (en conservant les préfixes existants des lots précédents) : `"/supervision/incidents"`.

Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/supervision/services");` par `await page.goto("/parametres/profil");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("service health shows the indicators, the outage, the stale service and the history chart", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/services");
  await expect(page.getByRole("heading", { name: "Santé des services" })).toBeVisible();
  await expect(page.getByTestId("svc-healthy")).toContainText("8");
  await expect(page.getByTestId("svc-degraded")).toContainText("1");
  await expect(page.getByTestId("svc-down")).toContainText("1");
  await expect(page.getByTestId("svc-stale")).toContainText("1");
  await expect(page.getByTestId("svc-reference")).toContainText("Dernier sondage");
  await expect(page.getByRole("row", { name: /notification-service.*En panne/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /parcel-service.*Dégradé/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /gateway.*Obsolète/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /identity-service.*Opérationnel.*100 %/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /notification-service/ })).toBeVisible();
  await page.getByRole("link", { name: "identity-service", exact: true }).last().click();
  await expect(page).toHaveURL(/service=identity-service/);
  await expect(page.getByRole("img", { name: /identity-service/ })).toBeVisible();
});

test("incidents can be filtered by status and opened", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible();
  await page.getByRole("link", { name: "Résolus", exact: true }).click();
  await expect(page).toHaveURL(/statut=RESOLVED/);
  await expect(page.getByRole("row", { name: /Indisponibilité de la flotte/ })).toBeVisible();
  await page.getByRole("link", { name: "Critique", exact: true }).click();
  await expect(page).toHaveURL(/gravite=CRITICAL/);
  await expect(page).toHaveURL(/statut=RESOLVED/);
  await page.getByRole("row", { name: /Indisponibilité de la flotte/ }).click();
  await expect(page).toHaveURL(/\/supervision\/incidents\/[0-9a-f-]+$/);
  await expect(page.getByTestId("incident-status")).toHaveText("Résolu");
  await expect(page.getByTestId("incident-resolved-note")).toBeVisible();
  await expect(page.getByTestId("incident-postmortem")).toHaveAttribute("href", /status\.sira\.app\/postmortems/);
  await expect(page.getByTestId("incident-duration")).not.toHaveText("");
});

test("declaring an incident adds it to the list and refuses a company scope without a company", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByRole("button", { name: "Déclarer un incident" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Déclarer l'incident" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Titre").fill("Incident de démonstration E2E");
  await dialog.getByLabel("Service").selectOption("booking-service");
  await dialog.getByLabel("Gravité").selectOption({ label: "Haute" });
  await dialog.getByLabel("Portée").selectOption({ label: "Une compagnie" });
  await expect(dialog.getByLabel("Compagnie touchée")).toBeVisible();
  await confirm.click();
  await expect(dialog.getByRole("alert")).toHaveText("Une compagnie est obligatoire pour un incident limité à une compagnie");

  await dialog.getByLabel("Portée").selectOption({ label: "Toute la plateforme" });
  await expect(dialog.getByLabel("Compagnie touchée")).toHaveCount(0);
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Incident de démonstration E2E.*booking-service.*Haute.*En investigation/ })).toBeVisible();
});

test("an incident can only move forward in status", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByPlaceholder("Rechercher un incident…").fill("Échecs de réservation");
  await page.getByRole("row", { name: /Échecs de réservation sur une compagnie/ }).click();
  await expect(page.getByTestId("incident-status")).toHaveText("Identifié");
  await page.getByRole("button", { name: "Changer le statut" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "En investigation" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un incident ne peut pas revenir en arrière");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "Sous surveillance" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-status")).toHaveText("Sous surveillance");
});

test("resolving an incident closes it and keeps only the postmortem editable", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByPlaceholder("Rechercher un incident…").fill("Latence élevée");
  await page.getByRole("row", { name: /Latence élevée sur les colis/ }).click();
  await expect(page.getByTestId("incident-status")).toHaveText("Sous surveillance");
  await page.getByRole("button", { name: "Changer le statut" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "Résolu" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-status")).toHaveText("Résolu");
  await expect(page.getByTestId("incident-resolved-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "Changer le statut" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Renseigner le postmortem" })).toBeVisible();
});

test("a postmortem address must be an http or https link", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents?statut=RESOLVED");
  await page.getByPlaceholder("Rechercher un incident…").fill("connexion intermittent");
  await page.getByRole("row", { name: /Échec de connexion intermittent/ }).click();
  await expect(page.getByTestId("incident-postmortem")).toHaveText("Aucun");
  await page.getByRole("button", { name: "Renseigner le postmortem" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Adresse du postmortem").fill("ftp://example.org/p");
  await dialog.getByRole("button", { name: "Enregistrer le postmortem" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("L'adresse du postmortem doit commencer par http:// ou https://");
  await dialog.getByLabel("Adresse du postmortem").fill("https://status.sira.app/postmortems/2026-10-28");
  await dialog.getByRole("button", { name: "Enregistrer le postmortem" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-postmortem")).toHaveAttribute("href", "https://status.sira.app/postmortems/2026-10-28");
  await expect(page.getByRole("button", { name: "Modifier le postmortem" })).toBeVisible();
});

test("API traffic shows the indicators, a daily chart and the endpoints, for a chosen period", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/api");
  await expect(page.getByRole("heading", { name: "Trafic API" })).toBeVisible();
  for (const id of ["api-requests", "api-latency", "api-4xx", "api-5xx"]) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByRole("img", { name: /Requêtes par jour/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /POST.*\/auth\/login/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /GET.*\/parcels\/track\/\{id\}/ })).toBeVisible();
  await page.getByRole("link", { name: "30 jours", exact: true }).click();
  await expect(page).toHaveURL(/jours=30/);
  await expect(page.getByRole("row", { name: /GET.*\/health\/services/ })).toBeVisible();
});

test("product usage shows the derived events and the daily chart", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/usage?jours=30");
  await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
  await expect(page.getByTestId("usage-events")).toBeVisible();
  await expect(page.getByTestId("usage-users")).toBeVisible();
  await expect(page.getByRole("img", { name: /Événements produit par jour/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /booking_created.*Réservations/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /parcel_created.*Colis/ })).toBeVisible();
});
```

3. Étendre le test `@prod` : après les appels existants à `detailPath(...)`, ajouter

```ts
  const incidentPath = await detailPath("/supervision/incidents", "flotte", "Rechercher un incident…", /Indisponibilité de la flotte/);
```

et ajouter au tableau `paths` : `"/supervision/services"`, `"/supervision/services?service=notification-service"`, `"/supervision/incidents"`, `"/supervision/incidents?statut=RESOLVED"`, `incidentPath`, `"/supervision/api"`, `"/supervision/api?jours=30"`, `"/supervision/usage"`, `"/supervision/usage?jours=30"`.

(Le test existant applique à chaque chemin les expressions régulières d'e-mails, de téléphones et d'IP complètes sur le HTML brut et le DOM : le trafic n'expose que des agrégats, aucune adresse. Les incidents des tests E2E mutés plus haut ne gênent pas le `@prod`, qui ouvre « Indisponibilité de la flotte », résolu et jamais modifié.)

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter à la section des lots livrés un paragraphe « Lot 9 : supervision » décrivant les 6 écrans, les trois actions d'incident (déclarer, changer le statut, renseigner le postmortem) et la lecture seule de la santé, du trafic et de l'usage, puis ajouter à la liste des limites : contrôles de santé échantillonnés toutes les 30 minutes (le backend sonde toutes les 30 secondes) ; taux d'erreur de service jamais calculé ; aucun moyen de relancer un sondage ; un service en panne n'ouvre pas d'incident automatiquement ; un incident ne garde pas l'historique de ses statuts et sa gravité ou sa portée ne sont pas modifiables ; obsolescence mesurée contre le dernier sondage de la plateforme, pas contre l'horloge de l'écran ; trafic API semé sur 30 jours (le backend en garde 90) et usage produit dérivé des données présentes ; aucune limitation de débit ; l'auteur d'un incident est un libellé, pas un compte de la plateforme.

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable supervision navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 6 écrans (Tasks 5 et 6), modèle de données et graines (Tasks 1 et 2), obsolescence, disponibilité, dernier changement, filtres, agrégats pondérés et usage dérivé (Task 3), règles et actions d'incident avec journaux (Task 4), navigation, E2E et fuite (Task 7), limites (README), migration du tableau de bord (Task 3).
- **Cohérence des noms** : `servicesRepo.referenceTime/names/list/stats/history/latestLive`, `incidentsRepo.listRows/get/detail/declare/advance/setPostmortem`, `incidentTransitionBlock`, `apiRepo.summary`, `analyticsRepo.summary`, `IncidentInput`, `declareIncident`/`advanceIncident`/`setIncidentPostmortem`, `appendAudit` sont utilisés à l'identique dans les tâches.
- **Écart connu à corriger à l'exécution** : le dernier test de la Task 1 (« holds no e-mail address and no phone number ») est suivi d'une consigne entre parenthèses qui remplace son expression : `reportedBy` vaut `admin@sira.app` et contient un `@`. L'implémenteur écrit directement la version qui exclut ce champ.
- **Risques connus, à signaler à l'implémenteur** : (1) les valeurs de disponibilité attendues (87,5 / 91,7 / 97,9) supposent 48 contrôles dans la fenêtre de 24 h, ce que la comparaison `<= 24 h` garantit ; (2) `usage-chart` suppose les variables CSS `--accent` et `--info` (à vérifier, sinon utiliser celles du graphique du tableau de bord) ; (3) le test E2E `service health…` suppose le texte exact « 100 % » pour `identity-service` (format `Intl` non utilisé ici, c'est un texte littéral) ; (4) `getByLabel("Service")` du test de déclaration ne doit correspondre qu'à la liste déroulante du dialogue : le dialogue masque le reste de la page, mais vérifier qu'aucune étiquette « Service » n'existe dans le dialogue en double ; (5) l'usage dérivé dépend du volume des lots 5 et 6, `distinctUsers <= 4` suppose les quatre comptes clients ; (6) les tests de graine n'ont pas été exécutés. Corriger la graine ou le sélecteur plutôt qu'affaiblir un test, et consigner l'écart dans le plan.
