# Backoffice Sira, lot 10 : paramètres du backoffice. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les trois entrées « Bientôt disponible » de la section « Paramètres » par de vraies pages sur données statiques typées : mon profil (compte, TOTP, mes sessions), équipe d'administrateurs (inviter, suspendre, réactiver, réinitialiser le TOTP, révoquer les sessions) et journal du backoffice (journal d'activité filtrable).

**Architecture:** Même socle que les lots 1 à 9. Deux collections rejoignent le store (`backofficeAdmins`, `backofficeSessions`) avec une graine (`seedBackofficeTeam`, qui ajoute aussi une dizaine d'entrées de journal). Un dépôt `src/lib/repos/backoffice.ts` porte l'équipe (`adminsRepo`), le profil (`profileRepo`) et le journal (`journalRepo`). Les actions passent par `run()` / `runValue()` ; toute écriture ajoute une entrée d'activité. Le journal réutilise `store.activity`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21, Radix Dialog, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4 à 9 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ**. Vérifier par `grep` que `runValue`/`ValueResult` (`src/lib/actions/run.ts`), `addActivity`, `truncateIp`, `ConfirmDialog`, `StatusFilterNav`, `DataTable`, `KpiCard` existent avec les signatures utilisées ci-dessous, que `grep -n "uid(8[1-3]" src/lib/data/seed.ts` ne renvoie rien (préfixes 81 à 83 libres), et relever les valeurs du type `Tone` de `src/lib/labels.ts` (ce plan utilise `success`, `warning`, `danger`, `info`, `neutral`) : adapter si l'une manque.
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `searchParams` typé `Promise<…>` et attendu avec `await`. Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : toutes passent par `run()` ou `runValue()` (session vérifiée **avant** toute lecture ou écriture), renvoient un résultat typé et ne lèvent jamais d'exception pour un échec attendu.
- Règles (messages exacts ; ordre des gardes imposé) :
  - `adminsRepo.invite` : identifiant non vide (`"L'identifiant est obligatoire"`) → format `^[a-z0-9._-]{3,40}@sira\.app$` après trim et minuscules (`"L'identifiant doit avoir la forme prenom.nom@sira.app"`) → nom non vide (`"Le nom est obligatoire"`) et 100 caractères au plus (`"Le nom est trop long (100 caractères maximum)"`) → identifiant libre (`"Cet identifiant existe déjà"`).
  - `adminsRepo.suspend` : administrateur existant (`"Administrateur introuvable"`) → motif non vide (`"Un motif est obligatoire"`) et 500 au plus (`"Motif trop long (500 caractères maximum)"`) → pas son propre compte (`"Impossible de suspendre son propre compte"`) → statut actif (`"Le compte n'est pas actif"`) → pas le dernier actif (`"Impossible de suspendre le dernier administrateur actif"`).
  - `adminsRepo.reactivate` : existant → motif → statut suspendu (`"Le compte n'est pas suspendu"`).
  - `adminsRepo.resetTotp` : existant → motif → pas son propre compte (`"Impossible de réinitialiser son propre TOTP"`) → statut actif (`"Le compte n'est pas actif"`) → TOTP activé (`"Aucun TOTP à réinitialiser"`).
  - `adminsRepo.revokeSessions` : existant → motif → pas son propre compte (`"Pour tes propres sessions, utilise ton profil"`) → au moins une session active (`"Aucune session active à révoquer"`).
  - `profileRepo.updateDisplayName` : compte de l'acteur (`"Compte introuvable"`) → nom non vide (`"Le nom est obligatoire"`) et 100 au plus (`"Le nom est trop long (100 caractères maximum)"`).
  - `profileRepo.revokeSession` : compte → session à soi (`"Session introuvable"`) → pas la courante (`"Utilise la déconnexion pour fermer la session courante"`) → encore active (`"La session est déjà révoquée ou expirée"`).
  - `profileRepo.revokeOthers` : compte → au moins une autre session active (`"Aucune autre session active"`).
  - `profileRepo.regenerateRecoveryCodes` : compte → TOTP activé (`"Le TOTP n'est pas activé"`).
- Le journal d'activité ne contient jamais de code de récupération, d'adresse IP ni de contact ; les codes de récupération ne sont ni stockés ni journalisés (seul leur nombre l'est).
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `BackofficeAdmin` ni `BackofficeSession` ; seulement des projections construites champ par champ (prouvé par `Object.keys`) ou des scalaires. Les imports depuis `@/lib/repos/backoffice` dans un composant client sont des `import type`. Adresses IP tronquées par `truncateIp`. Le test E2E `@prod` vérifie l'absence d'e-mail de contact, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (`resetStore()` pour les actions), aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute (table ci-dessous).
- Toute garde nouvelle (session d'abord, chaque garde, leur ordre, filtres, plafond du journal) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : authentification réelle, changement de mot de passe, enrôlement TOTP réel, annulation d'invitation, suppression d'un administrateur, rôles propres au backoffice, export du journal, journalisation des connexions, branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **Identifiants** : `uid(81, n)` administrateurs, `uid(82, n)` sessions, `uid(83, n)` entrées de journal ajoutées ; une création à l'exécution reçoit `bo-admin-<ms>-<n>` / `bo-session-<ms>-<n>` (aucune page de détail n'exige un UUID).
2. **Acteur = identifiant** : l'acteur des actions est `sub` de la session (`admin@sira.app`). Les gardes « pas son propre compte » comparent l'identifiant de l'administrateur ciblé à l'acteur. Un acteur qui n'est pas dans l'équipe (cas de test) n'est pas « soi-même » ; pour lui, les actions de profil répondent `"Compte introuvable"`.
3. **Dernier administrateur actif** : la garde n'est atteignable que si l'acteur n'est pas lui-même un administrateur actif de la liste (sinon la garde « son propre compte » ou le nombre d'actifs ≥ 2 la précède). Elle est testée avec un acteur extérieur à l'équipe, après avoir suspendu les autres administrateurs actifs par écriture directe dans le store.
4. **Sessions** : une session est active si non révoquée et non expirée. La fenêtre de 8 h est portée par `expiresAt` (graine : début + 8 h). L'état « expirée » s'affiche, il n'est jamais écrit.
5. **Révocation de sa propre session** : pas de motif (simple confirmation) ; la révocation des sessions d'un autre administrateur exige un motif.
6. **Codes de récupération** : générés par `crypto.randomUUID()` (huit caractères hexadécimaux en majuscules, formatés `XXXX-XXXX`), huit codes distincts ; le dépôt les renvoie et ne conserve que le compteur. L'action utilise `runValue`.
7. **Journal** : filtres `?acteur=` (parmi les acteurs présents), `?jours=` (7, 30 ou 90 ; absent = tout), `?revelations=1`. Un acteur ou une période invalide est ignoré (`parseFilter`). Indicateurs : entrées des 7 derniers jours, acteurs distincts de ces 7 jours, révélations des 30 derniers jours.
8. **Test E2E `unimplemented sections show a coming-soon page`** : le lot 9 l'a fait pointer sur `/parametres/profil`, qui devient une vraie page ici ; il pointe désormais sur `/recherche` (lot 11).
9. **Mise en forme des tableaux** : le tableau de l'équipe et celui du journal utilisent `DataTable` (clients) ; le tableau des sessions du profil est un `<table>` serveur (peu de lignes).

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `the profile name can be changed` | nom affiché de `admin@sira.app` | modifié puis restauré dans le test |
| `recovery codes are shown once after regenerating them` | codes de `admin@sira.app` | compteur 8 → 8, codes affichés une fois |
| `own sessions can be revoked one by one or all at once` | sessions « Application Android » et « Firefox · Ubuntu » de `admin@sira.app` | révoquées |
| `inviting an administrator rejects a bad identifier then adds the invitation` | un administrateur créé par le test (`e2e.invite@sira.app`) | une ligne en plus |
| `suspending an administrator needs a reason` | Ibrahima Sow | actif → suspendu |
| `a suspended administrator can be reactivated` | Seynabou Kane | suspendu → actif |
| `resetting the TOTP of an administrator signs them out` | Moustapha Ndiaye | TOTP activé → non enrôlé |
| `revoking the sessions of an administrator needs a reason` | Fatou Diallo | 2 → 0 sessions actives |

Lues sans modification : Awa Fall (invitée), la session courante de `admin@sira.app`, et toutes les entrées de journal des autres administrateurs. Aucun test de lecture n'affirme l'état d'une entité de ce tableau (ils s'en tiennent à la présence d'une ligne ou à la structure).

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) AdminStatus, BackofficeAdmin, BackofficeSession
src/lib/data/seed.ts                           (modifié) Store étendu, seedBackofficeTeam
src/lib/repos/backoffice.ts                    (créé)   adminsRepo, profileRepo, journalRepo
src/lib/labels.ts                              (modifié) adminStatusBadge
src/app/(admin)/parametres/actions.ts          (créé)   9 actions
src/components/settings/{invite-admin-button,admin-actions,profile-actions,revoke-my-session-button}.tsx   (créés)
src/app/(admin)/parametres/profil/page.tsx                                                   (créé)
src/app/(admin)/parametres/equipe-admin/{page.tsx,admins-table.tsx}                          (créés)
src/app/(admin)/parametres/journal-backoffice/{page.tsx,journal-table.tsx}                   (créés)
src/lib/nav.ts                                 (modifié) 3 entrées implémentées, libellés
tests/unit/{backoffice-seed,backoffice-repo,backoffice-team-rules,backoffice-profile-rules,backoffice-actions}.test.ts   (créés)
tests/unit/{labels,nav}.test.ts                (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

---
### Task 1: Types et graine de l'équipe (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`
- Create: `tests/unit/backoffice-seed.test.ts`

**Interfaces:**
- Consumes: `buildSeed(now)`, `uid`, `iso`, `store.activity`, `store.companies`.
- Produces: types ci-dessous ; `Store.backofficeAdmins`, `Store.backofficeSessions` ; `seedBackofficeTeam(store, iso)`.

- [ ] **Step 1: Types**

Ajouter à la fin de `src/lib/types/index.ts` :

```ts
export type AdminStatus = "active" | "suspended" | "invited";

/** Backoffice administrator. The login identifier (`prenom.nom@sira.app`) is a service identifier, not contact data. */
export interface BackofficeAdmin {
  id: string;
  identifier: string;
  displayName: string;
  status: AdminStatus;
  totpEnabled: boolean;
  totpEnrolledAt: string | null;
  /** Only the number of recovery codes left is kept, never the codes. */
  recoveryCodesRemaining: number;
  lastLoginAt: string | null;
  createdAt: string;
}

/** A backoffice session (8 hours, like the real cookie). `ipAddress` is the full address and never leaves the server. */
export interface BackofficeSession {
  id: string;
  adminId: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  /** The session of the signed-in administrator (the real cookie carries no session id). */
  current: boolean;
}
```

- [ ] **Step 2: Test de graine (rouge)**

Créer `tests/unit/backoffice-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const HOUR = 3_600_000;
beforeEach(() => resetStore(NOW));

const admin = (identifier: string) => {
  const found = getStore().backofficeAdmins.filter((a) => a.identifier === identifier);
  expect(found, identifier).toHaveLength(1);
  return found[0]!;
};
const sessionsOf = (identifier: string) => getStore().backofficeSessions.filter((s) => s.adminId === admin(identifier).id);
const isActive = (s: { revokedAt: string | null; expiresAt: string }) => s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime();

describe("backoffice team seed", () => {
  it("has six administrators with unique identifiers of the form prenom.nom@sira.app", () => {
    const list = getStore().backofficeAdmins;
    expect(list.map((a) => a.identifier).sort()).toEqual([
      "admin@sira.app", "awa.fall@sira.app", "fatou.diallo@sira.app", "ibrahima.sow@sira.app",
      "moustapha.ndiaye@sira.app", "seynabou.kane@sira.app",
    ]);
    expect(new Set(list.map((a) => a.id)).size).toBe(6);
    for (const a of list) expect(a.identifier).toMatch(/^[a-z0-9._-]{3,40}@sira\.app$/);
  });

  it("matches the scenarios: statuses, TOTP and recovery codes", () => {
    expect(admin("admin@sira.app")).toMatchObject({ displayName: "Administrateur Sira", status: "active", totpEnabled: true, recoveryCodesRemaining: 8 });
    expect(admin("moustapha.ndiaye@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 6 });
    expect(admin("ibrahima.sow@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 8 });
    expect(admin("fatou.diallo@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 5 });
    expect(admin("seynabou.kane@sira.app")).toMatchObject({ status: "suspended", totpEnabled: true, recoveryCodesRemaining: 3 });
    expect(admin("awa.fall@sira.app")).toMatchObject({ status: "invited", totpEnabled: false, totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null });
  });

  it("keeps the TOTP invariants: an enrolment date iff enabled, no code without TOTP", () => {
    for (const a of getStore().backofficeAdmins) {
      expect(a.totpEnrolledAt !== null, a.identifier).toBe(a.totpEnabled);
      if (!a.totpEnabled) expect(a.recoveryCodesRemaining).toBe(0);
      expect(a.createdAt < NOW.toISOString()).toBe(true);
    }
  });

  it("counts the active sessions per administrator", () => {
    const active = (id: string) => sessionsOf(id).filter(isActive).length;
    expect(active("admin@sira.app")).toBe(3);
    expect(active("moustapha.ndiaye@sira.app")).toBe(1);
    expect(active("ibrahima.sow@sira.app")).toBe(1);
    expect(active("fatou.diallo@sira.app")).toBe(2);
    expect(active("seynabou.kane@sira.app")).toBe(0);
    expect(sessionsOf("awa.fall@sira.app")).toHaveLength(0);
  });

  it("gives the signed-in administrator one current session, an Android one, a Firefox one and an expired one", () => {
    const own = sessionsOf("admin@sira.app");
    expect(own).toHaveLength(4);
    expect(own.filter((s) => s.current)).toHaveLength(1);
    expect(getStore().backofficeSessions.filter((s) => s.current)).toHaveLength(1);
    expect(isActive(own.find((s) => s.current)!)).toBe(true);
    expect(own.map((s) => s.deviceLabel)).toEqual(expect.arrayContaining(["Application Android", "Firefox · Ubuntu"]));
    expect(own.filter((s) => !s.current && !isActive(s))).toHaveLength(1);
  });

  it("keeps eight-hour sessions and a coherent revocation", () => {
    for (const s of getStore().backofficeSessions) {
      expect(Date.parse(s.expiresAt) - Date.parse(s.createdAt)).toBe(8 * HOUR);
      expect(Date.parse(s.lastSeenAt)).toBeGreaterThanOrEqual(Date.parse(s.createdAt));
      expect(Date.parse(s.lastSeenAt)).toBeLessThan(NOW.getTime());
      expect(s.revokedAt !== null).toBe(s.revokedReason !== null);
      expect(getStore().backofficeAdmins.some((a) => a.id === s.adminId)).toBe(true);
    }
    const kane = sessionsOf("seynabou.kane@sira.app");
    expect(kane).toHaveLength(1);
    expect(kane[0]!.revokedReason).toBe("Compte suspendu");
  });

  it("sets the last login to the start of the newest session", () => {
    for (const a of getStore().backofficeAdmins) {
      const starts = sessionsOf(a.identifier).map((s) => s.createdAt).sort();
      expect(a.lastLoginAt, a.identifier).toBe(starts.at(-1) ?? null);
    }
  });

  it("uses full addresses on the two known prefixes, never ending in 0", () => {
    for (const s of getStore().backofficeSessions) expect(s.ipAddress).toMatch(/^(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}$/);
  });
});

describe("backoffice journal seed", () => {
  const entriesOf = (identifier: string) => getStore().activity.filter((e) => e.actor === identifier);

  it("adds ten dated entries for the other active administrators, none for the signed-in one beyond the earlier lots", () => {
    const others = ["moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app"];
    expect(others.reduce((n, id) => n + entriesOf(id).length, 0)).toBe(10);
    for (const e of others.flatMap(entriesOf)) {
      expect(Date.parse(e.at)).toBeLessThan(NOW.getTime());
      expect(Date.parse(e.at)).toBeGreaterThan(NOW.getTime() - 41 * 86_400_000);
    }
    expect(entriesOf("seynabou.kane@sira.app")).toHaveLength(0);
    expect(entriesOf("awa.fall@sira.app")).toHaveLength(0);
  });

  it("gives ibrahima.sow one old and one recent entry, and moustapha.ndiaye two data reveals", () => {
    const ibrahima = entriesOf("ibrahima.sow@sira.app").sort((a, b) => a.at.localeCompare(b.at));
    expect(ibrahima.map((e) => e.action)).toEqual([
      "Type de document KYC désactivé", "Paliers partenaires consultés pour audit", "Incident déclaré (Haute) sur booking-service",
    ]);
    expect(NOW.getTime() - Date.parse(ibrahima[0]!.at)).toBeGreaterThan(39 * 86_400_000);
    expect(NOW.getTime() - Date.parse(ibrahima[2]!.at)).toBeLessThan(4 * 86_400_000);
    expect(entriesOf("moustapha.ndiaye@sira.app").filter((e) => e.action.startsWith("Donnée personnelle révélée"))).toHaveLength(2);
  });

  it("holds no e-mail address, no phone number and no IP address", () => {
    const text = JSON.stringify(getStore().activity.filter((e) => e.actor !== "admin@sira.app"));
    expect(text.replace(/[a-z.]+@sira\.app/g, "")).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
```

Run: `pnpm test tests/unit/backoffice-seed.test.ts` → FAIL (`backofficeAdmins` indéfini).

- [ ] **Step 3: Étendre le store et écrire la graine**

Dans `src/lib/data/seed.ts` :

1. Étendre l'import de types avec `AdminStatus`, `BackofficeAdmin`, `BackofficeSession`.
2. Dans `interface Store`, ajouter : `backofficeAdmins: BackofficeAdmin[]; backofficeSessions: BackofficeSession[];`
3. Dans le littéral de `buildSeed`, ajouter : `backofficeAdmins: [], backofficeSessions: [],`.
4. **Après le dernier appel de graine existant** (celui du lot 9, `seedApiUsage(store, now);`) et avant `return store;`, ajouter `seedBackofficeTeam(store, iso);`.
5. À la fin du fichier, ajouter :

```ts
const TEAM_JOURNAL: [number, string, string][] = [
  [-40, "ibrahima.sow", "Type de document KYC désactivé"],
  [-31, "fatou.diallo", "Plan Starter : prix mensuel modifié"],
  [-27, "moustapha.ndiaye", "Compagnie suspendue pour impayé"],
  [-19, "fatou.diallo", "Facture relancée"],
  [-14, "moustapha.ndiaye", "Donnée personnelle révélée : téléphone de pape.mbaye"],
  [-11, "ibrahima.sow", "Paliers partenaires consultés pour audit"],
  [-8, "moustapha.ndiaye", "Donnée personnelle révélée : e-mail de aissatou.sarr"],
  [-6, "fatou.diallo", "Campagne annulée"],
  [-3, "ibrahima.sow", "Incident déclaré (Haute) sur booking-service"],
  [-2, "fatou.diallo", "Demande RGPD (accès) : reçue → en cours"],
];

/**
 * Six backoffice administrators with their 8-hour sessions (relative to the seed date), plus ten journal entries
 * written by the other active administrators. `admin@sira.app` is the signed-in demo identity.
 */
function seedBackofficeTeam(store: Store, iso: (offsetDays: number) => string): void {
  let adminSeq = 1, sessionSeq = 1, journalSeq = 1;
  const h = (hours: number) => iso(hours / 24);

  const addAdmin = (
    identifier: string, displayName: string, status: AdminStatus,
    createdDaysAgo: number, enrolledDaysAgo: number | null, recoveryCodesRemaining: number,
  ): BackofficeAdmin => {
    const admin: BackofficeAdmin = {
      id: uid(81, adminSeq++), identifier, displayName, status,
      totpEnabled: enrolledDaysAgo !== null, totpEnrolledAt: enrolledDaysAgo === null ? null : iso(-enrolledDaysAgo),
      recoveryCodesRemaining, lastLoginAt: null, createdAt: iso(-createdDaysAgo),
    };
    store.backofficeAdmins.push(admin);
    return admin;
  };
  const addSession = (
    admin: BackofficeAdmin, deviceLabel: string, ipAddress: string, startHours: number, lastSeenHours: number,
    options: { current?: boolean; revokedReason?: string } = {},
  ): void => {
    const createdAt = h(startHours);
    store.backofficeSessions.push({
      id: uid(82, sessionSeq++), adminId: admin.id, deviceLabel, ipAddress, createdAt, lastSeenAt: h(lastSeenHours),
      expiresAt: h(startHours + 8),
      revokedAt: options.revokedReason ? h(lastSeenHours) : null, revokedReason: options.revokedReason ?? null,
      current: options.current ?? false,
    });
    if (admin.lastLoginAt === null || createdAt > admin.lastLoginAt) admin.lastLoginAt = createdAt;
  };

  const self = addAdmin("admin@sira.app", "Administrateur Sira", "active", 400, 399, 8);
  const moustapha = addAdmin("moustapha.ndiaye@sira.app", "Moustapha Ndiaye", "active", 300, 299, 6);
  const ibrahima = addAdmin("ibrahima.sow@sira.app", "Ibrahima Sow", "active", 250, 249, 8);
  const fatou = addAdmin("fatou.diallo@sira.app", "Fatou Diallo", "active", 200, 199, 5);
  const seynabou = addAdmin("seynabou.kane@sira.app", "Seynabou Kane", "suspended", 180, 179, 3);
  addAdmin("awa.fall@sira.app", "Awa Fall", "invited", 2, null, 0);

  addSession(self, "Chrome · macOS", "41.82.14.23", -1, -0.05, { current: true });
  addSession(self, "Application Android", "196.207.31.8", -3, -0.5);
  addSession(self, "Firefox · Ubuntu", "41.82.77.54", -5, -2);
  addSession(self, "Safari · iPhone", "196.207.5.19", -48, -47.5);
  addSession(moustapha, "Chrome · Windows", "41.82.9.120", -2, -1);
  addSession(ibrahima, "Edge · Windows", "196.207.44.67", -4, -3);
  addSession(fatou, "Chrome · Windows", "41.82.101.3", -1.5, -0.2);
  addSession(fatou, "Application Android", "196.207.88.201", -6, -5);
  addSession(seynabou, "Firefox · Ubuntu", "41.82.23.15", -24 * 20, -24 * 20 + 1, { revokedReason: "Compte suspendu" });

  for (const [days, username, action] of TEAM_JOURNAL) {
    store.activity.push({ id: uid(83, journalSeq++), companyId: null, at: iso(days), actor: `${username}@sira.app`, action });
  }
}
```

(`uid`, `iso` : mêmes noms que dans le reste du fichier ; si `iso` n'accepte pas de fractions de jour, remplacer `h` par `(hours) => new Date(now.getTime() + hours * 3_600_000).toISOString()` en passant `now` à la fonction.)

- [ ] **Step 4: Constater le vert**

Run: `pnpm test tests/unit/backoffice-seed.test.ts` puis `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts tests/unit/backoffice-seed.test.ts
git commit -m "feat: backoffice administrators, sessions and journal seed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Dépôts de lecture (TDD)

**Files:**
- Modify: `src/lib/labels.ts`, `tests/unit/labels.test.ts`
- Create: `src/lib/repos/backoffice.ts`, `tests/unit/backoffice-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `truncateIp`, types de la Task 1.
- Produces (`src/lib/repos/backoffice.ts`) : constantes `ADMIN_STATUSES`, `JOURNAL_WINDOWS`, `JOURNAL_LIMIT = 500`, `RECOVERY_CODE_COUNT = 8` ; types `SessionState`, `AdminRow`, `MySessionRow`, `ProfileView`, `JournalRow`, `JournalStats` ; fonction `backofficeSessionState(session, now)` ; `adminsRepo.listRows(filter, now, self?)` / `.get(id)` ; `profileRepo.view(actor, now)` ; `journalRepo.actors()` / `.stats(now)` / `.list(filter, now)`. Libellé `adminStatusBadge`.

- [ ] **Step 1: Libellé (rouge puis vert)**

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts
import { adminStatusBadge } from "@/lib/labels";

describe("admin status badge", () => {
  it("labels the three administrator statuses", () => {
    expect(adminStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(adminStatusBadge("suspended")).toEqual({ label: "Suspendu", tone: "danger" });
    expect(adminStatusBadge("invited")).toEqual({ label: "Invité", tone: "info" });
  });
});
```

Dans `src/lib/labels.ts`, étendre l'import de types avec `AdminStatus` et ajouter à la fin :

```ts
export const adminStatusBadge = (s: AdminStatus): Badge =>
  pick({
    active: { label: "Actif", tone: "success" },
    suspended: { label: "Suspendu", tone: "danger" },
    invited: { label: "Invité", tone: "info" },
  }, s);
```

- [ ] **Step 2: Test de dépôt (rouge)**

Créer `tests/unit/backoffice-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  adminsRepo, backofficeSessionState, JOURNAL_LIMIT, journalRepo, profileRepo,
} from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const SELF = "admin@sira.app";
const rowOf = (identifier: string, self = SELF) => adminsRepo.listRows({}, NOW, self).find((r) => r.identifier === identifier)!;

describe("session state", () => {
  it("is revoked first, then expired, then active", () => {
    const base = { revokedAt: null, revokedReason: null, expiresAt: new Date(NOW.getTime() + 1).toISOString() };
    expect(backofficeSessionState(base as never, NOW)).toBe("active");
    expect(backofficeSessionState({ ...base, expiresAt: NOW.toISOString() } as never, NOW)).toBe("expired");
    expect(backofficeSessionState({ ...base, revokedAt: NOW.toISOString(), revokedReason: "x" } as never, NOW)).toBe("revoked");
    expect(backofficeSessionState({ ...base, expiresAt: NOW.toISOString(), revokedAt: NOW.toISOString(), revokedReason: "x" } as never, NOW)).toBe("revoked");
  });
});

describe("administrators list", () => {
  it("lists the six administrators oldest first, with only client-safe fields", () => {
    const rows = adminsRepo.listRows({}, NOW, SELF);
    expect(rows.map((r) => r.identifier)).toEqual([
      "admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app", "seynabou.kane@sira.app", "awa.fall@sira.app",
    ]);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "activeSessions", "createdAt", "displayName", "id", "identifier", "isSelf", "lastLoginAt", "recoveryCodesRemaining", "status", "totpEnabled",
    ]);
  });

  it("flags only the signed-in administrator as self", () => {
    const rows = adminsRepo.listRows({}, NOW, SELF);
    expect(rows.filter((r) => r.isSelf).map((r) => r.identifier)).toEqual([SELF]);
    expect(adminsRepo.listRows({}, NOW, "someone@sira.app").some((r) => r.isSelf)).toBe(false);
  });

  it("counts active sessions: revoked and expired ones do not count", () => {
    expect(rowOf(SELF).activeSessions).toBe(3);
    expect(rowOf("fatou.diallo@sira.app").activeSessions).toBe(2);
    expect(rowOf("seynabou.kane@sira.app").activeSessions).toBe(0);
    expect(rowOf("awa.fall@sira.app").activeSessions).toBe(0);
  });

  it("filters by status", () => {
    expect(adminsRepo.listRows({ status: "active" }, NOW, SELF)).toHaveLength(4);
    expect(adminsRepo.listRows({ status: "suspended" }, NOW, SELF).map((r) => r.identifier)).toEqual(["seynabou.kane@sira.app"]);
    expect(adminsRepo.listRows({ status: "invited" }, NOW, SELF).map((r) => r.identifier)).toEqual(["awa.fall@sira.app"]);
  });

  it("finds one administrator by id", () => {
    const id = getStore().backofficeAdmins[1]!.id;
    expect(adminsRepo.get(id)?.identifier).toBe("moustapha.ndiaye@sira.app");
    expect(adminsRepo.get("inconnu")).toBeUndefined();
  });

  it("holds no full IP address", () => {
    expect(JSON.stringify(adminsRepo.listRows({}, NOW, SELF))).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});

describe("profile view", () => {
  it("returns undefined for an actor outside the team", () => {
    expect(profileRepo.view("someone@sira.app", NOW)).toBeUndefined();
  });

  it("shows the account, the TOTP state and the sessions newest first with truncated addresses", () => {
    const v = profileRepo.view(SELF, NOW)!;
    expect(v).toMatchObject({
      displayName: "Administrateur Sira", identifier: SELF, roleLabel: "Administrateur", totpEnabled: true, recoveryCodesRemaining: 8,
    });
    expect(v.sessions).toHaveLength(4);
    for (let i = 1; i < v.sessions.length; i++) expect(v.sessions[i - 1]!.createdAt >= v.sessions[i]!.createdAt).toBe(true);
    expect(v.sessions.filter((s) => s.current)).toHaveLength(1);
    expect(v.sessions.find((s) => s.current)!.state).toBe("active");
    expect(v.sessions.filter((s) => s.state === "expired")).toHaveLength(1);
    for (const s of v.sessions) expect(s.ip).toMatch(/^\d+\.\d+\.\d+\.0$/);
    expect(Object.keys(v.sessions[0]!).sort()).toEqual(["createdAt", "current", "deviceLabel", "expiresAt", "id", "ip", "lastSeenAt", "revokedReason", "state"]);
    expect(JSON.stringify(v)).not.toMatch(/\.(?!0\b)\d+\b.*\d+\.\d+\.\d+\.[1-9]/);
  });

  it("counts the other active sessions (the current one excluded)", () => {
    expect(profileRepo.view(SELF, NOW)!.otherActiveSessions).toBe(2);
  });
});

describe("journal", () => {
  it("lists actors present in the journal, sorted", () => {
    const actors = journalRepo.actors();
    expect(actors).toEqual([...actors].sort());
    expect(actors).toEqual(expect.arrayContaining(["admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app"]));
    expect(new Set(actors).size).toBe(actors.length);
  });

  it("lists newest first and projects only safe fields", () => {
    const rows = journalRepo.list({}, NOW);
    expect(rows.length).toBeGreaterThan(10);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.at >= rows[i]!.at).toBe(true);
    expect(Object.keys(rows[0]!).sort()).toEqual(["action", "actor", "at", "companyName", "id"]);
  });

  it("filters by actor, by period and by data reveals, combined", () => {
    const ibrahima = "ibrahima.sow@sira.app";
    expect(journalRepo.list({ actor: ibrahima }, NOW)).toHaveLength(3);
    expect(journalRepo.list({ actor: ibrahima, days: 30 }, NOW).map((r) => r.action)).toEqual([
      "Incident déclaré (Haute) sur booking-service", "Paliers partenaires consultés pour audit",
    ]);
    expect(journalRepo.list({ actor: ibrahima, days: 90 }, NOW)).toHaveLength(3);
    const reveals = journalRepo.list({ actor: "moustapha.ndiaye@sira.app", revealsOnly: true }, NOW);
    expect(reveals).toHaveLength(2);
    expect(reveals.every((r) => r.action.startsWith("Donnée personnelle révélée"))).toBe(true);
    expect(journalRepo.list({ actor: ibrahima, revealsOnly: true }, NOW)).toEqual([]);
    expect(journalRepo.list({ actor: "inconnu" }, NOW)).toEqual([]);
  });

  it("keeps the period bound inclusive and relative to the injected clock", () => {
    const s = getStore();
    s.activity.unshift({ id: "edge", companyId: null, at: new Date(NOW.getTime() - 7 * DAY).toISOString(), actor: "edge@sira.app", action: "Bord" });
    expect(journalRepo.list({ actor: "edge@sira.app", days: 7 }, NOW)).toHaveLength(1);
    expect(journalRepo.list({ actor: "edge@sira.app", days: 7 }, new Date(NOW.getTime() + 1))).toHaveLength(0);
  });

  it("names the company of an entry, nothing for a platform entry", () => {
    const s = getStore();
    const company = s.companies[0]!;
    s.activity.unshift({ id: "c1", companyId: company.id, at: NOW.toISOString(), actor: "edge@sira.app", action: "Avec compagnie" });
    s.activity.unshift({ id: "c2", companyId: null, at: NOW.toISOString(), actor: "edge@sira.app", action: "Sans compagnie" });
    const rows = journalRepo.list({ actor: "edge@sira.app" }, NOW);
    expect(rows.find((r) => r.id === "c1")!.companyName).toBe(company.name);
    expect(rows.find((r) => r.id === "c2")!.companyName).toBeNull();
  });

  it("keeps at most 500 entries, the most recent", () => {
    const s = getStore();
    for (let i = 0; i < 600; i++) {
      s.activity.push({ id: `bulk-${i}`, companyId: null, at: new Date(NOW.getTime() - i * 1000).toISOString(), actor: "bulk@sira.app", action: `Entrée ${i}` });
    }
    const rows = journalRepo.list({ actor: "bulk@sira.app" }, NOW);
    expect(JOURNAL_LIMIT).toBe(500);
    expect(rows).toHaveLength(500);
    expect(rows[0]!.action).toBe("Entrée 0");
    expect(rows.at(-1)!.action).toBe("Entrée 499");
    expect(journalRepo.list({}, NOW)).toHaveLength(500);
  });

  it("computes the indicators against the injected clock", () => {
    const s = getStore();
    const stats = journalRepo.stats(NOW);
    const week = s.activity.filter((e) => Date.parse(e.at) >= NOW.getTime() - 7 * DAY);
    expect(stats.entries7d).toBe(week.length);
    expect(stats.actors7d).toBe(new Set(week.map((e) => e.actor)).size);
    expect(stats.reveals30d).toBe(s.activity.filter((e) => /révélé/i.test(e.action) && Date.parse(e.at) >= NOW.getTime() - 30 * DAY).length);
    expect(stats.reveals30d).toBeGreaterThanOrEqual(2);
    expect(journalRepo.stats(new Date(NOW.getTime() + 60 * DAY))).toEqual({ entries7d: 0, actors7d: 0, reveals30d: 0 });
  });
});
```

(Le dernier `expect` de « shows the account… » avec une expression régulière complexe est remplacé par : `for (const s of v.sessions) expect(s.ip).toMatch(/\.0$/);` déjà présent ; **supprimer** la ligne `expect(JSON.stringify(v)).not.toMatch(/\.(?!0\b)…/)` et la remplacer par `expect(JSON.stringify(v)).not.toMatch(/(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/);`.)

Run: `pnpm test tests/unit/backoffice-repo.test.ts` → FAIL (module absent).

- [ ] **Step 3: Implémenter le dépôt**

Créer `src/lib/repos/backoffice.ts` :

```ts
import { truncateIp } from "@/lib/mask";
import { getStore } from "@/lib/repos/store";
import type { AdminStatus, BackofficeAdmin, BackofficeSession } from "@/lib/types";

export const ADMIN_STATUSES = ["active", "suspended", "invited"] as const;
export const JOURNAL_WINDOWS = [7, 30, 90] as const;
export const JOURNAL_LIMIT = 500;
export const RECOVERY_CODE_COUNT = 8;

const DAY = 86_400_000;
const REVEAL = /révélé/i;

export type SessionState = "active" | "revoked" | "expired";

export function backofficeSessionState(session: BackofficeSession, now: Date): SessionState {
  if (session.revokedAt !== null) return "revoked";
  return Date.parse(session.expiresAt) > now.getTime() ? "active" : "expired";
}

/** Client-safe projection of an administrator: no session, no address. */
export interface AdminRow {
  id: string; identifier: string; displayName: string; status: AdminStatus; totpEnabled: boolean;
  recoveryCodesRemaining: number; activeSessions: number; lastLoginAt: string | null; createdAt: string; isSelf: boolean;
}

/** Client-safe projection of one of my sessions: the address is truncated (`a.b.c.0`). */
export interface MySessionRow {
  id: string; deviceLabel: string; ip: string; createdAt: string; lastSeenAt: string; expiresAt: string;
  state: SessionState; current: boolean; revokedReason: string | null;
}

export interface ProfileView {
  displayName: string; identifier: string; roleLabel: string; totpEnabled: boolean; totpEnrolledAt: string | null;
  recoveryCodesRemaining: number; createdAt: string; lastLoginAt: string | null;
  /** Active sessions other than the current one. */
  otherActiveSessions: number; sessions: MySessionRow[];
}

export interface JournalRow { id: string; at: string; actor: string; action: string; companyName: string | null }
export interface JournalStats { entries7d: number; actors7d: number; reveals30d: number }

function sessionsOf(adminId: string): BackofficeSession[] {
  return getStore().backofficeSessions.filter((s) => s.adminId === adminId);
}

function adminRow(admin: BackofficeAdmin, now: Date, self: string | undefined): AdminRow {
  return {
    id: admin.id, identifier: admin.identifier, displayName: admin.displayName, status: admin.status,
    totpEnabled: admin.totpEnabled, recoveryCodesRemaining: admin.recoveryCodesRemaining,
    activeSessions: sessionsOf(admin.id).filter((s) => backofficeSessionState(s, now) === "active").length,
    lastLoginAt: admin.lastLoginAt, createdAt: admin.createdAt, isSelf: admin.identifier === self,
  };
}

export const adminsRepo = {
  listRows(filter: { status?: AdminStatus } = {}, now: Date = new Date(), self?: string): AdminRow[] {
    return getStore().backofficeAdmins
      .filter((a) => !filter.status || a.status === filter.status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((a) => adminRow(a, now, self));
  },

  get(id: string): BackofficeAdmin | undefined {
    return getStore().backofficeAdmins.find((a) => a.id === id);
  },
};

export const profileRepo = {
  view(actor: string, now: Date = new Date()): ProfileView | undefined {
    const admin = getStore().backofficeAdmins.find((a) => a.identifier === actor);
    if (!admin) return undefined;
    const sessions = sessionsOf(admin.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .map((s): MySessionRow => ({
        id: s.id, deviceLabel: s.deviceLabel, ip: truncateIp(s.ipAddress), createdAt: s.createdAt, lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt, state: backofficeSessionState(s, now), current: s.current, revokedReason: s.revokedReason,
      }));
    return {
      displayName: admin.displayName, identifier: admin.identifier, roleLabel: "Administrateur",
      totpEnabled: admin.totpEnabled, totpEnrolledAt: admin.totpEnrolledAt,
      recoveryCodesRemaining: admin.recoveryCodesRemaining, createdAt: admin.createdAt, lastLoginAt: admin.lastLoginAt,
      otherActiveSessions: sessions.filter((s) => !s.current && s.state === "active").length, sessions,
    };
  },
};

export const journalRepo = {
  actors(): string[] {
    return [...new Set(getStore().activity.map((e) => e.actor))].sort();
  },

  stats(now: Date = new Date()): JournalStats {
    const activity = getStore().activity;
    const since = (days: number) => now.getTime() - days * DAY;
    const week = activity.filter((e) => Date.parse(e.at) >= since(7));
    return {
      entries7d: week.length,
      actors7d: new Set(week.map((e) => e.actor)).size,
      reveals30d: activity.filter((e) => REVEAL.test(e.action) && Date.parse(e.at) >= since(30)).length,
    };
  },

  /** Newest first, at most `JOURNAL_LIMIT` entries. `days` is inclusive; a reveal is an action mentioning « révélé(e) ». */
  list(filter: { actor?: string; days?: number; revealsOnly?: boolean } = {}, now: Date = new Date()): JournalRow[] {
    const s = getStore();
    const since = filter.days ? now.getTime() - filter.days * DAY : -Infinity;
    return s.activity
      .filter((e) =>
        (!filter.actor || e.actor === filter.actor) &&
        Date.parse(e.at) >= since &&
        (!filter.revealsOnly || REVEAL.test(e.action)))
      .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
      .slice(0, JOURNAL_LIMIT)
      .map((e): JournalRow => ({
        id: e.id, at: e.at, actor: e.actor, action: e.action,
        companyName: e.companyId ? s.companies.find((c) => c.id === e.companyId)?.name ?? null : null,
      }));
  },
};
```

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 4: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. `backofficeSessionState` : tester l'expiration avant la révocation → échoue `is revoked first, then expired, then active`.
2. Remplacer `> now.getTime()` par `>= now.getTime()` → échoue le même test.
3. Dans `adminRow`, compter toutes les sessions (retirer le filtre `"active"`) → échoue `counts active sessions…`.
4. Dans `profileRepo.view`, remplacer `truncateIp(s.ipAddress)` par `s.ipAddress` → échoue `shows the account…`.
5. Retirer `!s.current &&` de `otherActiveSessions` → échoue `counts the other active sessions…`.
6. Dans `journalRepo.list`, remplacer `>= since` par `> since` → échoue `keeps the period bound inclusive…`.
7. Remplacer `.slice(0, JOURNAL_LIMIT)` par `.slice(0, JOURNAL_LIMIT + 1)` → échoue `keeps at most 500 entries, the most recent`.
8. Retirer le tri (`.sort(...)`) → échoue `lists newest first…`.
9. Dans `stats`, remplacer `since(30)` par `since(7)` → échoue `computes the indicators…` (assertion relationnelle sur les 30 jours).
10. Dans `list`, ignorer `revealsOnly` → échoue `filters by actor, by period and by data reveals, combined`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/labels.ts src/lib/repos/backoffice.ts tests/unit/labels.test.ts tests/unit/backoffice-repo.test.ts
git commit -m "feat: backoffice team, profile and journal read repositories

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Règles de l'équipe et actions (TDD)

**Files:**
- Modify: `src/lib/repos/backoffice.ts`
- Create: `src/app/(admin)/parametres/actions.ts`, `tests/unit/backoffice-team-rules.test.ts`, `tests/unit/backoffice-actions.test.ts`

**Interfaces:**
- Consumes: `addActivity` (`src/lib/repos/activity.ts`), `run` / `requireString` (`src/lib/actions/run.ts`).
- Produces: `adminsRepo.invite(input: AdminInviteInput, actor?, now?)`, `.suspend(id, reason, actor?, now?)`, `.reactivate(...)`, `.resetTotp(...)`, `.revokeSessions(...)` ; type `AdminInviteInput` ; actions `inviteAdmin(input)`, `suspendAdmin(id, reason)`, `reactivateAdmin(id, reason)`, `resetAdminTotp(id, reason)`, `revokeAdminSessions(id, reason)`.

- [ ] **Step 1: Test des règles (rouge)**

Créer `tests/unit/backoffice-team-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { adminsRepo } from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const SELF = "admin@sira.app";
beforeEach(() => resetStore(NOW));

const byIdentifier = (identifier: string) => getStore().backofficeAdmins.find((a) => a.identifier === identifier)!;
const MOUSTAPHA = "moustapha.ndiaye@sira.app";
const activeSessions = (id: string) =>
  getStore().backofficeSessions.filter((s) => s.adminId === id && s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime());
const counts = () => ({ admins: getStore().backofficeAdmins.length, activity: getStore().activity.length });
const invite = (over: Partial<{ identifier: string; displayName: string }> = {}) =>
  adminsRepo.invite({ identifier: "nouveau.admin@sira.app", displayName: "Nouvel Admin", ...over }, SELF, NOW);

describe("inviting an administrator", () => {
  it("creates an invited account with no TOTP and no session, and journals it", () => {
    const before = counts();
    const a = invite({ identifier: "  Nouveau.Admin@SIRA.app ", displayName: "  Nouvel Admin  " });
    expect(a).toMatchObject({
      identifier: "nouveau.admin@sira.app", displayName: "Nouvel Admin", status: "invited", totpEnabled: false,
      totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null, createdAt: NOW.toISOString(),
    });
    expect(getStore().backofficeAdmins.at(-1)).toBe(a);
    expect(getStore().backofficeSessions.some((s) => s.adminId === a.id)).toBe(false);
    expect(counts()).toEqual({ admins: before.admins + 1, activity: before.activity + 1 });
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: SELF, at: NOW.toISOString(), action: "Administrateur invité : nouveau.admin@sira.app" });
  });

  it("refuses a blank identifier and a badly formed one", () => {
    expect(() => invite({ identifier: "   " })).toThrow("L'identifiant est obligatoire");
    for (const bad of ["sans-arobase", "a@sira.app", "x y@sira.app", "nom@gmail.com", "nom@sira.app.evil.com", "NOM@sira.sn", `${"a".repeat(41)}@sira.app`]) {
      expect(() => invite({ identifier: bad }), bad).toThrow("L'identifiant doit avoir la forme prenom.nom@sira.app");
    }
    expect(() => invite({ identifier: `${"a".repeat(40)}@sira.app` })).not.toThrow();
  });

  it("refuses a blank or too long name", () => {
    expect(() => invite({ displayName: "  " })).toThrow("Le nom est obligatoire");
    expect(() => invite({ displayName: "n".repeat(101) })).toThrow("Le nom est trop long (100 caractères maximum)");
    expect(() => invite({ displayName: "n".repeat(100) })).not.toThrow();
  });

  it("refuses an identifier that already exists, whatever its case", () => {
    expect(() => invite({ identifier: "Admin@sira.app" })).toThrow("Cet identifiant existe déjà");
    invite();
    expect(() => invite()).toThrow("Cet identifiant existe déjà");
  });

  it("changes nothing when a guard refuses, and checks the guards in order", () => {
    const before = counts();
    expect(() => invite({ identifier: "" })).toThrow();
    expect(() => invite({ identifier: "admin@sira.app", displayName: "" })).toThrow("Le nom est obligatoire");
    expect(() => adminsRepo.invite({ identifier: "mal formé", displayName: "" }, SELF, NOW)).toThrow("L'identifiant doit avoir la forme");
    expect(counts()).toEqual(before);
  });
});

describe("suspending an administrator", () => {
  it("suspends, revokes every active session with the reason « Compte suspendu » and journals the motif", () => {
    const fatou = byIdentifier("fatou.diallo@sira.app");
    const before = counts();
    adminsRepo.suspend(fatou.id, "  Départ de l'équipe  ", SELF, NOW);
    expect(fatou.status).toBe("suspended");
    expect(activeSessions(fatou.id)).toHaveLength(0);
    const revoked = getStore().backofficeSessions.filter((s) => s.adminId === fatou.id && s.revokedAt === NOW.toISOString());
    expect(revoked).toHaveLength(2);
    expect(revoked.every((s) => s.revokedReason === "Compte suspendu")).toBe(true);
    expect(counts().activity).toBe(before.activity + 1);
    expect(getStore().activity[0]!.action).toBe("Administrateur fatou.diallo@sira.app suspendu (2 session(s) révoquée(s)). Motif : Départ de l'équipe");
    expect(getStore().activity[0]!.actor).toBe(SELF);
  });

  it("keeps the sessions already revoked or expired as they were", () => {
    const self = byIdentifier(SELF);
    const expired = getStore().backofficeSessions.find((s) => s.adminId === self.id && !s.current && Date.parse(s.expiresAt) <= NOW.getTime())!;
    adminsRepo.suspend(byIdentifier(MOUSTAPHA).id, "Test", "someone@sira.app", NOW);
    expect(expired.revokedAt).toBeNull();
  });

  it("refuses an unknown administrator, then a blank or too long motif", () => {
    expect(() => adminsRepo.suspend("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const id = byIdentifier(MOUSTAPHA).id;
    expect(() => adminsRepo.suspend(id, "   ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.suspend(id, "m".repeat(501), SELF, NOW)).toThrow("Motif trop long (500 caractères maximum)");
    expect(() => adminsRepo.suspend(id, "m".repeat(500), SELF, NOW)).not.toThrow();
  });

  it("refuses to suspend oneself, a suspended account and an invited one", () => {
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Impossible de suspendre son propre compte");
    expect(() => adminsRepo.suspend(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
    expect(() => adminsRepo.suspend(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
  });

  it("refuses to suspend the last active administrator", () => {
    for (const a of getStore().backofficeAdmins) if (a.identifier !== MOUSTAPHA && a.status === "active") a.status = "suspended";
    expect(() => adminsRepo.suspend(byIdentifier(MOUSTAPHA).id, "x", "someone@sira.app", NOW)).toThrow(
      "Impossible de suspendre le dernier administrateur actif",
    );
    expect(byIdentifier(MOUSTAPHA).status).toBe("active");
  });

  it("changes nothing when a guard refuses, and checks the guards in order", () => {
    const before = counts();
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("son propre compte");
    expect(() => adminsRepo.suspend(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("pas actif");
    expect(counts()).toEqual(before);
    expect(activeSessions(byIdentifier(SELF).id)).toHaveLength(3);
  });
});

describe("reactivating an administrator", () => {
  it("reactivates a suspended account and journals the motif, without restoring sessions", () => {
    const kane = byIdentifier("seynabou.kane@sira.app");
    const sessionsBefore = getStore().backofficeSessions.filter((s) => s.adminId === kane.id).map((s) => s.revokedAt);
    adminsRepo.reactivate(kane.id, "Retour de congé", SELF, NOW);
    expect(kane.status).toBe("active");
    expect(getStore().backofficeSessions.filter((s) => s.adminId === kane.id).map((s) => s.revokedAt)).toEqual(sessionsBefore);
    expect(getStore().activity[0]!.action).toBe("Administrateur seynabou.kane@sira.app réactivé. Motif : Retour de congé");
  });

  it("refuses unknown, blank motif and an account that is not suspended, in that order", () => {
    expect(() => adminsRepo.reactivate("inconnu", "", SELF, NOW)).toThrow("Administrateur introuvable");
    const kane = byIdentifier("seynabou.kane@sira.app");
    expect(() => adminsRepo.reactivate(kane.id, " ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.reactivate(byIdentifier(MOUSTAPHA).id, "x", SELF, NOW)).toThrow("Le compte n'est pas suspendu");
    expect(() => adminsRepo.reactivate(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas suspendu");
    expect(kane.status).toBe("suspended");
  });
});

describe("resetting the TOTP of an administrator", () => {
  it("disables the TOTP, clears the codes, revokes sessions with the reason « TOTP réinitialisé » and journals", () => {
    const m = byIdentifier(MOUSTAPHA);
    adminsRepo.resetTotp(m.id, "Téléphone perdu", SELF, NOW);
    expect(m).toMatchObject({ status: "active", totpEnabled: false, totpEnrolledAt: null, recoveryCodesRemaining: 0 });
    expect(activeSessions(m.id)).toHaveLength(0);
    expect(getStore().backofficeSessions.filter((s) => s.adminId === m.id).every((s) => s.revokedReason === "TOTP réinitialisé")).toBe(true);
    expect(getStore().activity[0]!.action).toBe(`TOTP de ${MOUSTAPHA} réinitialisé (1 session(s) révoquée(s)). Motif : Téléphone perdu`);
  });

  it("refuses in order: unknown, motif, oneself, not active, no TOTP", () => {
    expect(() => adminsRepo.resetTotp("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const m = byIdentifier(MOUSTAPHA);
    expect(() => adminsRepo.resetTotp(m.id, "", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.resetTotp(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Impossible de réinitialiser son propre TOTP");
    expect(() => adminsRepo.resetTotp(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
    adminsRepo.resetTotp(m.id, "x", SELF, NOW);
    expect(() => adminsRepo.resetTotp(m.id, "x", SELF, NOW)).toThrow("Aucun TOTP à réinitialiser");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => adminsRepo.resetTotp(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow();
    expect(byIdentifier(SELF).totpEnabled).toBe(true);
    expect(counts()).toEqual(before);
  });
});

describe("revoking the sessions of an administrator", () => {
  it("revokes every active session with the motif and journals the count", () => {
    const fatou = byIdentifier("fatou.diallo@sira.app");
    adminsRepo.revokeSessions(fatou.id, "Poste partagé", SELF, NOW);
    expect(activeSessions(fatou.id)).toHaveLength(0);
    expect(getStore().backofficeSessions.filter((s) => s.adminId === fatou.id).every((s) => s.revokedReason === "Poste partagé")).toBe(true);
    expect(fatou.status).toBe("active");
    expect(getStore().activity[0]!.action).toBe("2 session(s) de fatou.diallo@sira.app révoquée(s). Motif : Poste partagé");
  });

  it("refuses in order: unknown, motif, oneself, no active session", () => {
    expect(() => adminsRepo.revokeSessions("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const fatou = byIdentifier("fatou.diallo@sira.app");
    expect(() => adminsRepo.revokeSessions(fatou.id, " ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.revokeSessions(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Pour tes propres sessions, utilise ton profil");
    expect(() => adminsRepo.revokeSessions(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Aucune session active à révoquer");
    expect(() => adminsRepo.revokeSessions(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Aucune session active à révoquer");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => adminsRepo.revokeSessions(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow();
    expect(counts()).toEqual(before);
  });
});

describe("what the journal never receives", () => {
  it("holds no IP address, no e-mail and no phone number after every team action", () => {
    adminsRepo.suspend(byIdentifier("fatou.diallo@sira.app").id, "Motif", SELF, NOW);
    adminsRepo.resetTotp(byIdentifier(MOUSTAPHA).id, "Motif", SELF, NOW);
    adminsRepo.reactivate(byIdentifier("seynabou.kane@sira.app").id, "Motif", SELF, NOW);
    invite();
    const text = JSON.stringify(getStore().activity.slice(0, 4)).replace(/[a-z.]+@sira\.app/g, "");
    expect(text).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
```

Run: `pnpm test tests/unit/backoffice-team-rules.test.ts` → FAIL (`adminsRepo.invite is not a function`).

- [ ] **Step 2: Implémenter**

Dans `src/lib/repos/backoffice.ts` :

1. Ajouter l'import : `import { addActivity } from "@/lib/repos/activity";`
2. Ajouter, avant `export const adminsRepo`, les utilitaires :

```ts
export interface AdminInviteInput { identifier: string; displayName: string }

const IDENTIFIER_FORMAT = /^[a-z0-9._-]{3,40}@sira\.app$/;
const MAX_NAME = 100;
const MAX_MOTIF = 500;
let boSeq = 1;

function requireMotif(reason: string): string {
  const motif = reason.trim();
  if (!motif) throw new Error("Un motif est obligatoire");
  if (motif.length > MAX_MOTIF) throw new Error("Motif trop long (500 caractères maximum)");
  return motif;
}

function requireAdmin(id: string): BackofficeAdmin {
  const admin = getStore().backofficeAdmins.find((a) => a.id === id);
  if (!admin) throw new Error("Administrateur introuvable");
  return admin;
}

function activeSessionsOf(adminId: string, now: Date): BackofficeSession[] {
  return sessionsOf(adminId).filter((s) => backofficeSessionState(s, now) === "active");
}

function revokeAll(sessions: BackofficeSession[], reason: string, now: Date): number {
  for (const s of sessions) { s.revokedAt = now.toISOString(); s.revokedReason = reason; }
  return sessions.length;
}
```

3. Dans `adminsRepo`, après `get`, ajouter :

```ts
  /** Invites an administrator. Guards, in this order: identifier present, well formed, name, identifier free. */
  invite(input: AdminInviteInput, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const s = getStore();
    const identifier = input.identifier.trim().toLowerCase();
    if (!identifier) throw new Error("L'identifiant est obligatoire");
    if (!IDENTIFIER_FORMAT.test(identifier)) throw new Error("L'identifiant doit avoir la forme prenom.nom@sira.app");
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Le nom est obligatoire");
    if (displayName.length > MAX_NAME) throw new Error("Le nom est trop long (100 caractères maximum)");
    if (s.backofficeAdmins.some((a) => a.identifier === identifier)) throw new Error("Cet identifiant existe déjà");
    const admin: BackofficeAdmin = {
      id: `bo-admin-${now.getTime()}-${boSeq++}`, identifier, displayName, status: "invited", totpEnabled: false,
      totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null, createdAt: now.toISOString(),
    };
    s.backofficeAdmins.push(admin);
    addActivity(null, actor, `Administrateur invité : ${identifier}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, active, not the last active one. */
  suspend(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const s = getStore();
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Impossible de suspendre son propre compte");
    if (admin.status !== "active") throw new Error("Le compte n'est pas actif");
    if (s.backofficeAdmins.filter((a) => a.status === "active").length === 1) {
      throw new Error("Impossible de suspendre le dernier administrateur actif");
    }
    admin.status = "suspended";
    const revoked = revokeAll(activeSessionsOf(admin.id, now), "Compte suspendu", now);
    addActivity(null, actor, `Administrateur ${admin.identifier} suspendu (${revoked} session(s) révoquée(s)). Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, suspended. Sessions are not restored. */
  reactivate(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.status !== "suspended") throw new Error("Le compte n'est pas suspendu");
    admin.status = "active";
    addActivity(null, actor, `Administrateur ${admin.identifier} réactivé. Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, active, TOTP enabled. */
  resetTotp(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Impossible de réinitialiser son propre TOTP");
    if (admin.status !== "active") throw new Error("Le compte n'est pas actif");
    if (!admin.totpEnabled) throw new Error("Aucun TOTP à réinitialiser");
    admin.totpEnabled = false;
    admin.totpEnrolledAt = null;
    admin.recoveryCodesRemaining = 0;
    const revoked = revokeAll(activeSessionsOf(admin.id, now), "TOTP réinitialisé", now);
    addActivity(null, actor, `TOTP de ${admin.identifier} réinitialisé (${revoked} session(s) révoquée(s)). Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, at least one active session. */
  revokeSessions(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): number {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Pour tes propres sessions, utilise ton profil");
    const active = activeSessionsOf(admin.id, now);
    if (active.length === 0) throw new Error("Aucune session active à révoquer");
    revokeAll(active, motif, now);
    addActivity(null, actor, `${active.length} session(s) de ${admin.identifier} révoquée(s). Motif : ${motif}`, now);
    return active.length;
  },
```

(`sessionsOf` et `backofficeSessionState` sont déjà définis plus haut dans le fichier ; `revokeAll` et `activeSessionsOf` doivent être placés **après** eux.)

Run: `pnpm test tests/unit/backoffice-team-rules.test.ts` → PASS.

- [ ] **Step 3: Test et implémentation des actions de l'équipe**

Créer `tests/unit/backoffice-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import {
  inviteAdmin, reactivateAdmin, resetAdminTotp, revokeAdminSessions, suspendAdmin,
} from "@/app/(admin)/parametres/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "admin@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const byIdentifier = (identifier: string) => getStore().backofficeAdmins.find((a) => a.identifier === identifier)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("team actions", () => {
  it("write nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().backofficeAdmins.length;
    const ibrahima = byIdentifier("ibrahima.sow@sira.app");
    expect(await inviteAdmin({ identifier: "x.y@sira.app", displayName: "X" })).toEqual(EXPIRED);
    expect(await suspendAdmin(ibrahima.id, "x")).toEqual(EXPIRED);
    expect(await reactivateAdmin(byIdentifier("seynabou.kane@sira.app").id, "x")).toEqual(EXPIRED);
    expect(await resetAdminTotp(byIdentifier("moustapha.ndiaye@sira.app").id, "x")).toEqual(EXPIRED);
    expect(await revokeAdminSessions(byIdentifier("fatou.diallo@sira.app").id, "x")).toEqual(EXPIRED);
    expect(getStore().backofficeAdmins).toHaveLength(n);
    expect(ibrahima.status).toBe("active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("invite as the session actor and revalidate the team and the journal", async () => {
    expect(await inviteAdmin({ identifier: "x.y@sira.app", displayName: "X Y" })).toEqual({ ok: true });
    expect(byIdentifier("x.y@sira.app").status).toBe("invited");
    expect(getStore().activity[0]!.actor).toBe("admin@sira.app");
    expect(paths()).toEqual(expect.arrayContaining(["/parametres/equipe-admin", "/parametres/journal-backoffice"]));
  });

  it("suspend, reactivate, reset the TOTP and revoke sessions", async () => {
    expect(await suspendAdmin(byIdentifier("ibrahima.sow@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("ibrahima.sow@sira.app").status).toBe("suspended");
    expect(await reactivateAdmin(byIdentifier("seynabou.kane@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("seynabou.kane@sira.app").status).toBe("active");
    expect(await resetAdminTotp(byIdentifier("moustapha.ndiaye@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("moustapha.ndiaye@sira.app").totpEnabled).toBe(false);
    expect(await revokeAdminSessions(byIdentifier("fatou.diallo@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(paths()).toEqual(expect.arrayContaining(["/parametres/equipe-admin", "/parametres/journal-backoffice"]));
  });

  it("return the rule's message and revalidate nothing when a rule refuses", async () => {
    expect(await inviteAdmin({ identifier: "mal formé", displayName: "X" })).toEqual({
      ok: false, error: "L'identifiant doit avoir la forme prenom.nom@sira.app",
    });
    expect(await suspendAdmin(byIdentifier("admin@sira.app").id, "x")).toEqual({ ok: false, error: "Impossible de suspendre son propre compte" });
    expect(await suspendAdmin(byIdentifier("ibrahima.sow@sira.app").id, " ")).toEqual({ ok: false, error: "Un motif est obligatoire" });
    expect(await suspendAdmin("inconnu", "x")).toEqual({ ok: false, error: "Administrateur introuvable" });
    expect((await suspendAdmin("", "x")).ok).toBe(false);
    expect((await revokeAdminSessions("", "x")).ok).toBe(false);
    expect(byIdentifier("ibrahima.sow@sira.app").status).toBe("active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

Créer `src/app/(admin)/parametres/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireString, run, type ActionResult } from "@/lib/actions/run";
import { adminsRepo, type AdminInviteInput } from "@/lib/repos/backoffice";

function refreshTeam() {
  revalidatePath("/parametres/equipe-admin");
  revalidatePath("/parametres/journal-backoffice");
}

export async function inviteAdmin(input: AdminInviteInput): Promise<ActionResult> {
  return run((actor) => {
    adminsRepo.invite(input, actor);
    refreshTeam();
  });
}

export async function suspendAdmin(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.suspend(adminId, reason, actor);
    refreshTeam();
  });
}

export async function reactivateAdmin(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.reactivate(adminId, reason, actor);
    refreshTeam();
  });
}

export async function resetAdminTotp(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.resetTotp(adminId, reason, actor);
    refreshTeam();
  });
}

export async function revokeAdminSessions(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.revokeSessions(adminId, reason, actor);
    refreshTeam();
  });
}
```

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 4: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. `invite` : supprimer `.toLowerCase()` → échoue `creates an invited account…` (`  Nouveau.Admin@SIRA.app ` n'est plus normalisé).
2. Supprimer `.trim()` de l'identifiant → échoue le même test.
3. Remplacer le motif de la regex `{3,40}` par `{3,41}` → échoue `refuses a blank identifier and a badly formed one`.
4. Remplacer `displayName.length > MAX_NAME` par `>= MAX_NAME` → échoue `refuses a blank or too long name`.
5. Supprimer la garde `Cet identifiant existe déjà` → échoue `refuses an identifier that already exists…`.
6. `suspend` : supprimer la garde `son propre compte` → échoue `refuses to suspend oneself…`.
7. Supprimer la garde `dernier administrateur actif` → échoue `refuses to suspend the last active administrator`.
8. `suspend` : révoquer aussi les sessions déjà expirées (utiliser `sessionsOf` au lieu de `activeSessionsOf`) → échoue `keeps the sessions already revoked or expired as they were`.
9. `requireMotif` : retirer la borne 500 → échoue `refuses an unknown administrator, then a blank or too long motif`.
10. `reactivate` : supprimer la garde de statut → échoue `refuses unknown, blank motif and an account that is not suspended…`.
11. `resetTotp` : ne pas remettre `recoveryCodesRemaining` à 0 → échoue `disables the TOTP, clears the codes…`.
12. `resetTotp` : supprimer la garde `Aucun TOTP à réinitialiser` → échoue `refuses in order: unknown, motif, oneself, not active, no TOTP`.
13. `revokeSessions` : supprimer la garde « propres sessions » → échoue `refuses in order: unknown, motif, oneself, no active session`.
14. Actions : appeler `adminsRepo.invite` hors de `run` → échoue `write nothing without a session`.
15. Actions : retirer `requireString(adminId, "Administrateur")` de `suspendAdmin` → échoue la ligne `(await suspendAdmin("", "x")).ok` (le dépôt répondrait `"Administrateur introuvable"`, donc `ok` resterait faux : **si cette mutation survit, la ligne est redondante avec la garde du dépôt ; la conserver comme défense en profondeur et le noter**).

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/backoffice.ts "src/app/(admin)/parametres/actions.ts" tests/unit/backoffice-team-rules.test.ts tests/unit/backoffice-actions.test.ts
git commit -m "feat: invite, suspend, reactivate, reset TOTP and revoke sessions for backoffice administrators

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Règles du profil et actions (TDD)

**Files:**
- Modify: `src/lib/repos/backoffice.ts`, `src/app/(admin)/parametres/actions.ts`, `tests/unit/backoffice-actions.test.ts`
- Create: `tests/unit/backoffice-profile-rules.test.ts`

**Interfaces:**
- Produces: `profileRepo.updateDisplayName(actor, name, now?)`, `.revokeSession(actor, sessionId, now?)`, `.revokeOthers(actor, now?)`, `.regenerateRecoveryCodes(actor, now?)` (renvoie `string[]`) ; actions `updateMyDisplayName(name)`, `revokeMySession(sessionId)`, `revokeMyOtherSessions()`, `regenerateMyRecoveryCodes(): Promise<ValueResult<string[]>>`.

- [ ] **Step 1: Test des règles (rouge)**

Créer `tests/unit/backoffice-profile-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { profileRepo, RECOVERY_CODE_COUNT } from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const SELF = "admin@sira.app";
const OUTSIDER = "someone@sira.app";
beforeEach(() => resetStore(NOW));

const me = () => getStore().backofficeAdmins.find((a) => a.identifier === SELF)!;
const mine = () => getStore().backofficeSessions.filter((s) => s.adminId === me().id);
const sessionNamed = (device: string) => mine().find((s) => s.deviceLabel === device)!;
const isActive = (s: { revokedAt: string | null; expiresAt: string }) => s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime();
const counts = () => ({ activity: getStore().activity.length });

describe("changing my display name", () => {
  it("trims, stores and journals without the name", () => {
    profileRepo.updateDisplayName(SELF, "  Admin Principal  ", NOW);
    expect(me().displayName).toBe("Admin Principal");
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: SELF, at: NOW.toISOString(), action: "Nom affiché de admin@sira.app modifié" });
    expect(getStore().activity[0]!.action).not.toContain("Admin Principal");
  });

  it("refuses an actor outside the team, a blank name and a too long one, in that order", () => {
    expect(() => profileRepo.updateDisplayName(OUTSIDER, "", NOW)).toThrow("Compte introuvable");
    expect(() => profileRepo.updateDisplayName(SELF, "   ", NOW)).toThrow("Le nom est obligatoire");
    expect(() => profileRepo.updateDisplayName(SELF, "n".repeat(101), NOW)).toThrow("Le nom est trop long (100 caractères maximum)");
    expect(() => profileRepo.updateDisplayName(SELF, "n".repeat(100), NOW)).not.toThrow();
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => profileRepo.updateDisplayName(SELF, "", NOW)).toThrow();
    expect(me().displayName).toBe("Administrateur Sira");
    expect(counts()).toEqual(before);
  });
});

describe("revoking one of my sessions", () => {
  it("revokes it with the reason « Révoquée par le titulaire » and journals the device", () => {
    const android = sessionNamed("Application Android");
    profileRepo.revokeSession(SELF, android.id, NOW);
    expect(android.revokedAt).toBe(NOW.toISOString());
    expect(android.revokedReason).toBe("Révoquée par le titulaire");
    expect(mine().filter(isActive)).toHaveLength(2);
    expect(getStore().activity[0]!.action).toBe("Session révoquée (Application Android)");
  });

  it("refuses an unknown session and a session of another administrator", () => {
    expect(() => profileRepo.revokeSession(SELF, "inconnue", NOW)).toThrow("Session introuvable");
    const other = getStore().backofficeSessions.find((s) => s.adminId !== me().id)!;
    expect(() => profileRepo.revokeSession(SELF, other.id, NOW)).toThrow("Session introuvable");
    expect(other.revokedAt).toBe(other.revokedAt);
    expect(() => profileRepo.revokeSession(OUTSIDER, sessionNamed("Application Android").id, NOW)).toThrow("Compte introuvable");
  });

  it("refuses the current session, then one already revoked or expired", () => {
    const current = mine().find((s) => s.current)!;
    expect(() => profileRepo.revokeSession(SELF, current.id, NOW)).toThrow("Utilise la déconnexion pour fermer la session courante");
    expect(current.revokedAt).toBeNull();
    const expired = mine().find((s) => !s.current && !isActive(s))!;
    expect(() => profileRepo.revokeSession(SELF, expired.id, NOW)).toThrow("La session est déjà révoquée ou expirée");
    const android = sessionNamed("Application Android");
    profileRepo.revokeSession(SELF, android.id, NOW);
    expect(() => profileRepo.revokeSession(SELF, android.id, NOW)).toThrow("La session est déjà révoquée ou expirée");
  });

  it("checks the guards in order: account, ownership, current, active", () => {
    const current = mine().find((s) => s.current)!;
    current.revokedAt = NOW.toISOString();
    current.revokedReason = "x";
    expect(() => profileRepo.revokeSession(SELF, current.id, NOW)).toThrow("Utilise la déconnexion pour fermer la session courante");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => profileRepo.revokeSession(SELF, mine().find((s) => s.current)!.id, NOW)).toThrow();
    expect(counts()).toEqual(before);
  });
});

describe("revoking all my other sessions", () => {
  it("revokes the active ones except the current, keeps the expired one untouched, and journals the count", () => {
    const expired = mine().find((s) => !s.current && !isActive(s))!;
    profileRepo.revokeOthers(SELF, NOW);
    expect(mine().filter(isActive).map((s) => s.current)).toEqual([true]);
    expect(expired.revokedAt).toBeNull();
    expect(sessionNamed("Firefox · Ubuntu").revokedReason).toBe("Révoquée par le titulaire");
    expect(getStore().activity[0]!.action).toBe("2 autre(s) session(s) révoquée(s)");
  });

  it("refuses an actor outside the team and when nothing else is active", () => {
    expect(() => profileRepo.revokeOthers(OUTSIDER, NOW)).toThrow("Compte introuvable");
    profileRepo.revokeOthers(SELF, NOW);
    expect(() => profileRepo.revokeOthers(SELF, NOW)).toThrow("Aucune autre session active");
  });
});

describe("regenerating the recovery codes", () => {
  it("returns eight distinct XXXX-XXXX codes, resets the counter and journals without the codes", () => {
    me().recoveryCodesRemaining = 2;
    const codes = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(me().recoveryCodesRemaining).toBe(8);
    expect(getStore().activity[0]).toMatchObject({ actor: SELF, action: "Codes de récupération régénérés" });
  });

  it("never stores or journals the codes", () => {
    const codes = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    const stored = JSON.stringify([getStore().backofficeAdmins, getStore().backofficeSessions, getStore().activity]);
    for (const c of codes) expect(stored).not.toContain(c);
  });

  it("gives different codes each time", () => {
    const a = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    const b = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    expect(a.some((c) => b.includes(c))).toBe(false);
  });

  it("refuses an actor outside the team and an account without TOTP", () => {
    expect(() => profileRepo.regenerateRecoveryCodes(OUTSIDER, NOW)).toThrow("Compte introuvable");
    me().totpEnabled = false;
    const before = counts();
    expect(() => profileRepo.regenerateRecoveryCodes(SELF, NOW)).toThrow("Le TOTP n'est pas activé");
    expect(counts()).toEqual(before);
  });
});
```

(Dans « refuses an unknown session and a session of another administrator », **supprimer** la ligne `expect(other.revokedAt).toBe(other.revokedAt);` qui est une tautologie ; la remplacer par `const otherBefore = other.revokedAt;` placée avant le `toThrow`, puis `expect(other.revokedAt).toBe(otherBefore);` après.)

Run: `pnpm test tests/unit/backoffice-profile-rules.test.ts` → FAIL.

- [ ] **Step 2: Implémenter**

Dans `src/lib/repos/backoffice.ts`, ajouter dans `profileRepo` (après `view`) et l'utilitaire `selfOf` avant `profileRepo` :

```ts
function selfOf(actor: string): BackofficeAdmin {
  const admin = getStore().backofficeAdmins.find((a) => a.identifier === actor);
  if (!admin) throw new Error("Compte introuvable");
  return admin;
}

function newRecoveryCode(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}
```

```ts
  /** Guards, in this order: my account, name present, at most 100 characters. */
  updateDisplayName(actor: string, name: string, now: Date = new Date()): BackofficeAdmin {
    const admin = selfOf(actor);
    const displayName = name.trim();
    if (!displayName) throw new Error("Le nom est obligatoire");
    if (displayName.length > MAX_NAME) throw new Error("Le nom est trop long (100 caractères maximum)");
    admin.displayName = displayName;
    addActivity(null, actor, `Nom affiché de ${admin.identifier} modifié`, now);
    return admin;
  },

  /** Guards, in this order: my account, one of my sessions, not the current one, still active. No motif for one's own session. */
  revokeSession(actor: string, sessionId: string, now: Date = new Date()): BackofficeSession {
    const admin = selfOf(actor);
    const session = sessionsOf(admin.id).find((s) => s.id === sessionId);
    if (!session) throw new Error("Session introuvable");
    if (session.current) throw new Error("Utilise la déconnexion pour fermer la session courante");
    if (backofficeSessionState(session, now) !== "active") throw new Error("La session est déjà révoquée ou expirée");
    revokeAll([session], "Révoquée par le titulaire", now);
    addActivity(null, actor, `Session révoquée (${session.deviceLabel})`, now);
    return session;
  },

  /** Guards, in this order: my account, at least one other active session. The current session stays. */
  revokeOthers(actor: string, now: Date = new Date()): number {
    const admin = selfOf(actor);
    const others = activeSessionsOf(admin.id, now).filter((s) => !s.current);
    if (others.length === 0) throw new Error("Aucune autre session active");
    revokeAll(others, "Révoquée par le titulaire", now);
    addActivity(null, actor, `${others.length} autre(s) session(s) révoquée(s)`, now);
    return others.length;
  },

  /** Guards, in this order: my account, TOTP enabled. Returns the new codes once; only their number is kept. */
  regenerateRecoveryCodes(actor: string, now: Date = new Date()): string[] {
    const admin = selfOf(actor);
    if (!admin.totpEnabled) throw new Error("Le TOTP n'est pas activé");
    const codes = new Set<string>();
    while (codes.size < RECOVERY_CODE_COUNT) codes.add(newRecoveryCode());
    admin.recoveryCodesRemaining = RECOVERY_CODE_COUNT;
    addActivity(null, actor, "Codes de récupération régénérés", now);
    return [...codes];
  },
```

Dans `src/app/(admin)/parametres/actions.ts`, remplacer l'import de `run` par `import { requireString, run, runValue, type ActionResult, type ValueResult } from "@/lib/actions/run";`, importer `profileRepo`, et ajouter :

```ts
function refreshProfile() {
  revalidatePath("/parametres/profil");
  revalidatePath("/parametres/equipe-admin");
  revalidatePath("/parametres/journal-backoffice");
}

export async function updateMyDisplayName(name: string): Promise<ActionResult> {
  return run((actor) => {
    profileRepo.updateDisplayName(actor, name);
    refreshProfile();
  });
}

export async function revokeMySession(sessionId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(sessionId, "Session");
    profileRepo.revokeSession(actor, sessionId);
    refreshProfile();
  });
}

export async function revokeMyOtherSessions(): Promise<ActionResult> {
  return run((actor) => {
    profileRepo.revokeOthers(actor);
    refreshProfile();
  });
}

/** The codes are handed back once; only their number is stored. */
export async function regenerateMyRecoveryCodes(): Promise<ValueResult<string[]>> {
  return runValue((actor) => {
    const codes = profileRepo.regenerateRecoveryCodes(actor);
    refreshProfile();
    return codes;
  });
}
```

- [ ] **Step 3: Tests des actions du profil**

Ajouter à `tests/unit/backoffice-actions.test.ts` (compléter l'import avec `regenerateMyRecoveryCodes, revokeMyOtherSessions, revokeMySession, updateMyDisplayName`) :

```ts
describe("profile actions", () => {
  const mySession = (device: string) =>
    getStore().backofficeSessions.find((s) => s.adminId === byIdentifier("admin@sira.app").id && s.deviceLabel === device)!;

  it("write nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    expect(await updateMyDisplayName("Autre")).toEqual(EXPIRED);
    expect(await revokeMySession(mySession("Application Android").id)).toEqual(EXPIRED);
    expect(await revokeMyOtherSessions()).toEqual(EXPIRED);
    expect(await regenerateMyRecoveryCodes()).toEqual(EXPIRED);
    expect(byIdentifier("admin@sira.app").displayName).toBe("Administrateur Sira");
    expect(mySession("Application Android").revokedAt).toBeNull();
    expect(byIdentifier("admin@sira.app").recoveryCodesRemaining).toBe(8);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("act on the account of the session actor and revalidate the profile", async () => {
    expect(await updateMyDisplayName("Autre Nom")).toEqual({ ok: true });
    expect(byIdentifier("admin@sira.app").displayName).toBe("Autre Nom");
    expect(await revokeMySession(mySession("Application Android").id)).toEqual({ ok: true });
    expect(await revokeMyOtherSessions()).toEqual({ ok: true });
    expect(mySession("Firefox · Ubuntu").revokedAt).not.toBeNull();
    expect(paths()).toEqual(expect.arrayContaining(["/parametres/profil", "/parametres/journal-backoffice"]));
  });

  it("act on nobody when the session actor is outside the team", async () => {
    requireSession.mockResolvedValue({ ...session, sub: "someone@sira.app" });
    expect(await updateMyDisplayName("Autre")).toEqual({ ok: false, error: "Compte introuvable" });
    expect(await regenerateMyRecoveryCodes()).toEqual({ ok: false, error: "Compte introuvable" });
    expect(byIdentifier("admin@sira.app").displayName).toBe("Administrateur Sira");
  });

  it("hand the recovery codes back once and keep only their number", async () => {
    const result = await regenerateMyRecoveryCodes();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(8);
    expect(JSON.stringify([getStore().backofficeAdmins, getStore().activity])).not.toContain(result.value[0]!);
    expect(paths()).toContain("/parametres/profil");
  });

  it("return the rule's message and revalidate nothing when a rule refuses", async () => {
    expect(await updateMyDisplayName("  ")).toEqual({ ok: false, error: "Le nom est obligatoire" });
    const current = getStore().backofficeSessions.find((s) => s.current)!;
    expect(await revokeMySession(current.id)).toEqual({ ok: false, error: "Utilise la déconnexion pour fermer la session courante" });
    expect((await revokeMySession("")).ok).toBe(false);
    byIdentifier("admin@sira.app").totpEnabled = false;
    expect(await regenerateMyRecoveryCodes()).toEqual({ ok: false, error: "Le TOTP n'est pas activé" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 4: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. `updateDisplayName` : ne pas `trim` → échoue `trims, stores and journals without the name`.
2. Journaliser le nom dans l'activité → échoue le même test (`not.toContain`).
3. `revokeSession` : retirer le filtre de propriété (chercher dans toutes les sessions) → échoue `refuses an unknown session and a session of another administrator`.
4. Supprimer la garde `session.current` → échoue `refuses the current session…`.
5. Inverser l'ordre des gardes (état avant `current`) → échoue `checks the guards in order: account, ownership, current, active`.
6. `revokeOthers` : ne pas exclure la session courante → échoue `revokes the active ones except the current…`.
7. `revokeOthers` : révoquer aussi la session expirée (`sessionsOf`) → échoue le même test (`expired.revokedAt` non nul).
8. `regenerateRecoveryCodes` : ne pas remettre le compteur → échoue `returns eight distinct…`.
9. Remplacer le `Set` par un tableau (autoriser les doublons : `Math.random` figé) → échoue `returns eight distinct XXXX-XXXX codes…` ; en pratique, retirer la boucle `while` et ne générer qu'un code répété huit fois.
10. Journaliser les codes dans l'activité → échoue `never stores or journals the codes`.
11. Retirer la garde `Le TOTP n'est pas activé` → échoue `refuses an actor outside the team and an account without TOTP`.
12. Action `regenerateMyRecoveryCodes` : appeler `profileRepo` hors de `runValue` → échoue `write nothing without a session`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repos/backoffice.ts "src/app/(admin)/parametres/actions.ts" tests/unit/backoffice-profile-rules.test.ts tests/unit/backoffice-actions.test.ts
git commit -m "feat: profile rules (name, own sessions, recovery codes) and server actions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Pages de l'équipe et du journal

**Files:**
- Create: `src/components/settings/{invite-admin-button,admin-actions}.tsx`, `src/app/(admin)/parametres/equipe-admin/{page.tsx,admins-table.tsx}`, `src/app/(admin)/parametres/journal-backoffice/{page.tsx,journal-table.tsx}`

**Interfaces:**
- Consumes: `adminsRepo`, `journalRepo`, constantes, actions de la Task 3, `parseFilter`, `StatusFilterNav`, `DataTable`, `ConfirmDialog`, `KpiCard`, `adminStatusBadge`.
- Produces: pages `/parametres/equipe-admin` et `/parametres/journal-backoffice`. `data-testid` : `admin-sessions` (cellule), `journal-entries`, `journal-actors`, `journal-reveals`.

- [ ] **Step 1: Bouton d'invitation**

Créer `src/components/settings/invite-admin-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteAdmin } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Inviter un administrateur</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title="Inviter un administrateur"
        description="Le compte est créé « invité » : il devra enrôler son TOTP à sa première connexion. Aucun e-mail n'est envoyé dans cette maquette."
        confirmLabel="Envoyer l'invitation" confirmDisabled={identifier.trim() === "" || displayName.trim() === ""}
        onConfirm={async () => {
          const r = await inviteAdmin({ identifier, displayName });
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setIdentifier("");
          setDisplayName("");
        }}
      >
        <div className="space-y-3 text-sm">
          <label className="block space-y-1"><span className="font-medium">Identifiant de connexion</span>
            <Input aria-label="Identifiant de connexion" placeholder="prenom.nom@sira.app" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </label>
          <label className="block space-y-1"><span className="font-medium">Nom affiché</span>
            <Input aria-label="Nom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
```

- [ ] **Step 2: Actions par ligne**

Créer `src/components/settings/admin-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reactivateAdmin, resetAdminTotp, revokeAdminSessions, suspendAdmin } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { AdminStatus } from "@/lib/types";

/** Scalars only: no session, no address. The buttons are hidden for the signed-in administrator's own row. */
export interface AdminActionsProps {
  adminId: string; identifier: string; status: AdminStatus; totpEnabled: boolean; activeSessions: number; isSelf: boolean;
}

type Dialog = "suspend" | "reactivate" | "totp" | "sessions" | null;

export function AdminActions({ adminId, identifier, status, totpEnabled, activeSessions, isSelf }: AdminActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Dialog>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };
  const run = (action: (id: string, reason: string) => Promise<{ ok: true } | { ok: false; error: string }>) => async (reason: string) => {
    const r = await action(adminId, reason);
    router.refresh();
    if (!r.ok) throw new Error(r.error);
  };
  if (isSelf) return <span className="text-xs text-muted-foreground">Toi</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {status === "active" && <Button size="sm" variant="danger" aria-label={`Suspendre ${identifier}`} onClick={() => setOpen("suspend")}>Suspendre</Button>}
      {status === "suspended" && <Button size="sm" aria-label={`Réactiver ${identifier}`} onClick={() => setOpen("reactivate")}>Réactiver</Button>}
      {status === "active" && totpEnabled && (
        <Button size="sm" variant="secondary" aria-label={`Réinitialiser le TOTP de ${identifier}`} onClick={() => setOpen("totp")}>Réinitialiser le TOTP</Button>
      )}
      {activeSessions > 0 && (
        <Button size="sm" variant="secondary" aria-label={`Révoquer les sessions de ${identifier}`} onClick={() => setOpen("sessions")}>Révoquer les sessions</Button>
      )}

      <ConfirmDialog
        open={open === "suspend"} onOpenChange={close} requireReason destructive
        title={`Suspendre ${identifier}`}
        description="Le compte est suspendu et toutes ses sessions actives sont révoquées immédiatement."
        confirmLabel="Suspendre le compte" onConfirm={run(suspendAdmin)}
      />
      <ConfirmDialog
        open={open === "reactivate"} onOpenChange={close} requireReason
        title={`Réactiver ${identifier}`}
        description="Le compte redevient actif. Ses anciennes sessions ne sont pas rétablies : il devra se reconnecter."
        confirmLabel="Réactiver le compte" onConfirm={run(reactivateAdmin)}
      />
      <ConfirmDialog
        open={open === "totp"} onOpenChange={close} requireReason destructive
        title={`Réinitialiser le TOTP de ${identifier}`}
        description="Son TOTP et ses codes de récupération sont supprimés, ses sessions sont révoquées : il devra se ré-enrôler à la prochaine connexion."
        confirmLabel="Réinitialiser le TOTP" onConfirm={run(resetAdminTotp)}
      />
      <ConfirmDialog
        open={open === "sessions"} onOpenChange={close} requireReason destructive
        title={`Révoquer les sessions de ${identifier}`}
        description="Toutes ses sessions actives sont fermées immédiatement ; le compte reste actif."
        confirmLabel="Révoquer les sessions" onConfirm={run(revokeAdminSessions)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Tableau et page de l'équipe**

Créer `src/app/(admin)/parametres/equipe-admin/admins-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { AdminActions } from "@/components/settings/admin-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { adminStatusBadge } from "@/lib/labels";
import type { AdminRow } from "@/lib/repos/backoffice";

const columns: ColumnDef<AdminRow, unknown>[] = [
  { accessorKey: "displayName", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span> },
  { accessorKey: "identifier", header: "Identifiant" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = adminStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "totp", header: "TOTP", accessorFn: (r) => (r.totpEnabled ? "Activé" : "Non enrôlé"),
    cell: ({ row }) => (row.original.totpEnabled
      ? <span>Activé <span className="text-xs text-muted-foreground">({row.original.recoveryCodesRemaining} codes)</span></span>
      : <span className="text-muted-foreground">Non enrôlé</span>),
  },
  { accessorKey: "activeSessions", header: "Sessions actives", cell: ({ row }) => <span data-testid="admin-sessions" className="tabular-nums">{row.original.activeSessions}</span> },
  { accessorKey: "lastLoginAt", header: "Dernière connexion", cell: ({ row }) => (row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "—") },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDate(row.original.createdAt) },
  {
    id: "actions", header: "Actions", enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <AdminActions
          adminId={r.id} identifier={r.identifier} status={r.status} totpEnabled={r.totpEnabled}
          activeSessions={r.activeSessions} isSelf={r.isSelf}
        />
      );
    },
  },
];

export function AdminsTable({ admins }: { admins: AdminRow[] }) {
  return <DataTable columns={columns} data={admins} rowId={(r) => r.id} searchPlaceholder="Rechercher un administrateur…" emptyMessage="Aucun administrateur." />;
}
```

(Si `DataTable` ouvre la fiche au clic de ligne uniquement quand `rowHref` est fourni, aucune navigation ici : pas de `rowHref`.)

Créer `src/app/(admin)/parametres/equipe-admin/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { InviteAdminButton } from "@/components/settings/invite-admin-button";
import { requireSession } from "@/lib/auth/session";
import { parseFilter } from "@/lib/filters";
import { ADMIN_STATUSES, adminsRepo } from "@/lib/repos/backoffice";
import { AdminsTable } from "./admins-table";

export const dynamic = "force-dynamic";

const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
  { value: "invited", label: "Invités" },
];

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, ADMIN_STATUSES);
  const { sub } = await requireSession();
  return (
    <>
      <PageHeader
        title="Équipe admin"
        description="Administrateurs du backoffice. Le TOTP est obligatoire ; l'authentification reste celle de démonstration."
        actions={<InviteAdminButton />}
      />
      <StatusFilterNav basePath="/parametres/equipe-admin" options={OPTIONS} current={status} label="Filtrer par statut" />
      <AdminsTable admins={adminsRepo.listRows({ status }, new Date(), sub)} />
    </>
  );
}
```

- [ ] **Step 4: Journal**

Créer `src/app/(admin)/parametres/journal-backoffice/journal-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { JournalRow } from "@/lib/repos/backoffice";

const columns: ColumnDef<JournalRow, unknown>[] = [
  { accessorKey: "at", header: "Date", cell: ({ row }) => formatDateTime(row.original.at) },
  { accessorKey: "actor", header: "Acteur" },
  { accessorKey: "action", header: "Action" },
  { id: "company", header: "Compagnie", accessorFn: (r) => r.companyName ?? "Plateforme" },
];

export function JournalTable({ rows }: { rows: JournalRow[] }) {
  return <DataTable columns={columns} data={rows} rowId={(r) => r.id} searchPlaceholder="Rechercher dans le journal…" emptyMessage="Aucune entrée." />;
}
```

Créer `src/app/(admin)/parametres/journal-backoffice/page.tsx` :

```tsx
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { filterHref, parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { JOURNAL_LIMIT, JOURNAL_WINDOWS, journalRepo } from "@/lib/repos/backoffice";
import { JournalTable } from "./journal-table";

export const dynamic = "force-dynamic";

const BASE = "/parametres/journal-backoffice";
const WINDOW_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toute la période" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
];

export default async function BackofficeJournalPage({
  searchParams,
}: { searchParams: Promise<{ acteur?: string; jours?: string; revelations?: string }> }) {
  const sp = await searchParams;
  const actors = journalRepo.actors();
  const actor = parseFilter(sp.acteur, actors);
  const daysText = parseFilter(sp.jours, JOURNAL_WINDOWS.map(String));
  const days = daysText ? Number(daysText) : undefined;
  const revealsOnly = sp.revelations === "1";
  const keep = { acteur: actor, jours: daysText, revelations: revealsOnly ? "1" : undefined };
  const now = new Date();
  const stats = journalRepo.stats(now);
  const rows = journalRepo.list({ actor, days, revealsOnly }, now);
  return (
    <>
      <PageHeader
        title="Journal du backoffice"
        description={`Actions des administrateurs, de la plus récente à la plus ancienne (${JOURNAL_LIMIT} entrées au plus). Aucune donnée personnelle n'y figure.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div data-testid="journal-entries"><KpiCard label="Entrées sur 7 jours" value={formatNumber(stats.entries7d)} /></div>
        <div data-testid="journal-actors"><KpiCard label="Acteurs sur 7 jours" value={formatNumber(stats.actors7d)} /></div>
        <div data-testid="journal-reveals"><KpiCard label="Révélations de données sur 30 jours" value={formatNumber(stats.reveals30d)} /></div>
      </div>
      <StatusFilterNav
        basePath={BASE} param="acteur" current={actor} keep={keep} label="Filtrer par acteur"
        options={[{ value: "all", label: "Tous les acteurs" }, ...actors.map((a) => ({ value: a, label: a }))]}
      />
      <StatusFilterNav basePath={BASE} param="jours" current={daysText} keep={keep} label="Choisir la période" options={WINDOW_OPTIONS} />
      <StatusFilterNav
        basePath={BASE} param="revelations" current={revealsOnly ? "1" : undefined} keep={keep} label="Filtrer par type"
        options={[{ value: "all", label: "Toutes les actions" }, { value: "1", label: "Révélations de données" }]}
      />
      <JournalTable rows={rows} />
    </>
  );
}
```

(Retirer l'import inutilisé `filterHref` s'il n'est pas utilisé. `parseFilter(value, allowed)` renvoie la valeur si elle appartient à la liste, sinon `undefined` : vérifier sa signature dans `src/lib/filters.ts`, elle accepte un tableau de chaînes en lecture seule.)

- [ ] **Step 5: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/settings/invite-admin-button.tsx src/components/settings/admin-actions.tsx "src/app/(admin)/parametres/equipe-admin" "src/app/(admin)/parametres/journal-backoffice"
git commit -m "feat: administrator team and backoffice journal pages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Page du profil

**Files:**
- Create: `src/components/settings/{profile-actions,revoke-my-session-button}.tsx`, `src/app/(admin)/parametres/profil/page.tsx`

**Interfaces:**
- Consumes: `profileRepo.view`, actions de la Task 4, `requireSession`.
- Produces: page `/parametres/profil`. `data-testid` : `profile-name`, `profile-identifier`, `profile-totp`, `profile-codes`, `recovery-code`.

- [ ] **Step 1: Révocation d'une session**

Créer `src/components/settings/revoke-my-session-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeMySession } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` names the device in the button and the dialog. */
export interface RevokeMySessionButtonProps { sessionId: string; label: string }

export function RevokeMySessionButton({ sessionId, label }: RevokeMySessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="danger" aria-label={`Révoquer la session ${label}`} onClick={() => setOpen(true)}>Révoquer</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen} destructive
        title={`Révoquer la session ${label}`}
        description="La session est fermée immédiatement sur cet appareil."
        confirmLabel="Révoquer la session"
        onConfirm={async () => {
          const r = await revokeMySession(sessionId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Actions du profil**

Créer `src/components/settings/profile-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { regenerateMyRecoveryCodes, revokeMyOtherSessions, updateMyDisplayName } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Scalars only. */
export interface ProfileActionsProps { displayName: string; totpEnabled: boolean; otherActiveSessions: number }

export function ProfileActions({ displayName, totpEnabled, otherActiveSessions }: ProfileActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"name" | "codes" | "others" | null>(null);
  const [name, setName] = useState(displayName);
  const [codes, setCodes] = useState<string[] | null>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => { setName(displayName); setOpen("name"); }}>Modifier mon nom</Button>
      {totpEnabled && <Button variant="secondary" onClick={() => setOpen("codes")}>Régénérer mes codes de récupération</Button>}
      {otherActiveSessions > 0 && <Button variant="danger" onClick={() => setOpen("others")}>Révoquer toutes les autres sessions</Button>}

      <ConfirmDialog
        open={open === "name"} onOpenChange={close}
        title="Modifier mon nom" confirmLabel="Enregistrer le nom" confirmDisabled={name.trim() === ""}
        onConfirm={async () => {
          const r = await updateMyDisplayName(name);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Nom affiché</span>
          <Input aria-label="Nom affiché" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "codes"} onOpenChange={close} destructive
        title="Régénérer mes codes de récupération"
        description="Les anciens codes ne fonctionnent plus. Les nouveaux ne sont affichés qu'une seule fois : note-les maintenant."
        confirmLabel="Régénérer les codes"
        onConfirm={async () => {
          const r = await regenerateMyRecoveryCodes();
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setCodes(r.value);
        }}
      />

      <ConfirmDialog
        open={open === "others"} onOpenChange={close} destructive
        title="Révoquer toutes les autres sessions"
        description="Toutes tes sessions actives, sauf celle-ci, sont fermées immédiatement."
        confirmLabel="Révoquer les sessions"
        onConfirm={async () => {
          const r = await revokeMyOtherSessions();
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />

      <Dialog open={codes !== null} onOpenChange={(o) => { if (!o) setCodes(null); }}>
        <DialogContent>
          <DialogTitle>Nouveaux codes de récupération</DialogTitle>
          <DialogDescription>Chaque code ne sert qu&apos;une fois. Ils ne seront plus affichés après la fermeture de cette fenêtre.</DialogDescription>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
            {(codes ?? []).map((c) => <li key={c} data-testid="recovery-code" className="rounded border border-border px-2 py-1">{c}</li>)}
          </ul>
          <div className="mt-5 flex justify-end"><Button onClick={() => setCodes(null)}>J&apos;ai noté mes codes</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

(Le `ConfirmDialog` des codes se ferme après succès, puis la fenêtre des codes s'ouvre : `setCodes` est appelé avant la fermeture du premier dialogue, les deux états sont indépendants.)

- [ ] **Step 3: Page**

Créer `src/app/(admin)/parametres/profil/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { ProfileActions } from "@/components/settings/profile-actions";
import { RevokeMySessionButton } from "@/components/settings/revoke-my-session-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { profileRepo, type SessionState } from "@/lib/repos/backoffice";

export const dynamic = "force-dynamic";

const STATE: Record<SessionState, { label: string; tone: "success" | "danger" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  revoked: { label: "Révoquée", tone: "danger" },
  expired: { label: "Expirée", tone: "neutral" },
};

export default async function ProfilePage() {
  const { sub } = await requireSession();
  const view = profileRepo.view(sub, new Date());
  if (!view) notFound();
  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Sécurité de ton compte administrateur : TOTP et sessions."
        actions={<ProfileActions displayName={view.displayName} totpEnabled={view.totpEnabled} otherActiveSessions={view.otherActiveSessions} />}
      />
      <Card className="mb-6">
        <CardHeader><CardTitle>Compte</CardTitle></CardHeader>
        <CardContent><dl>
          <DetailRow label="Nom affiché"><span data-testid="profile-name">{view.displayName}</span></DetailRow>
          <DetailRow label="Identifiant"><span data-testid="profile-identifier">{view.identifier}</span></DetailRow>
          <DetailRow label="Rôle">{view.roleLabel}</DetailRow>
          <DetailRow label="TOTP">
            <span data-testid="profile-totp">
              {view.totpEnabled ? `Activé depuis le ${formatDate(view.totpEnrolledAt!)}` : "Non enrôlé"}
            </span>
          </DetailRow>
          <DetailRow label="Codes de récupération restants"><span data-testid="profile-codes">{view.recoveryCodesRemaining}</span></DetailRow>
          <DetailRow label="Dernière connexion">{view.lastLoginAt ? formatDateTime(view.lastLoginAt) : "—"}</DetailRow>
          <DetailRow label="Compte créé le">{formatDate(view.createdAt)}</DetailRow>
        </dl></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mes sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Appareil</th>
                <th className="px-3 py-2 font-medium">Adresse</th>
                <th className="px-3 py-2 font-medium">Début</th>
                <th className="px-3 py-2 font-medium">Dernière activité</th>
                <th className="px-3 py-2 font-medium">État</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {view.sessions.map((s) => {
                const state = STATE[s.state];
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">
                      {s.deviceLabel}{s.current && <span className="ml-2 text-xs text-accent">Session courante</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{s.ip}</td>
                    <td className="px-3 py-2">{formatDateTime(s.createdAt)}</td>
                    <td className="px-3 py-2">{formatDateTime(s.lastSeenAt)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      {s.revokedReason && <span className="ml-2 text-xs text-muted-foreground">{s.revokedReason}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {s.state === "active" && !s.current
                        ? <RevokeMySessionButton sessionId={s.id} label={s.deviceLabel} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Les sessions durent 8 heures. Pour fermer la session courante, utilise la déconnexion.
      </p>
    </>
  );
}
```

- [ ] **Step 4: Vérifier et commiter**

Run: `pnpm typecheck && pnpm test` → PASS.

```bash
git add src/components/settings/profile-actions.tsx src/components/settings/revoke-my-session-button.tsx "src/app/(admin)/parametres/profil"
git commit -m "feat: backoffice profile page with TOTP state, recovery codes and own sessions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, E2E, test de fuite et README

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

- [ ] **Step 1: Test de navigation (rouge)**

Dans `tests/unit/nav.test.ts` : remplacer le test du lot 9 `marks only lot 1 to lot 9 pages as implemented` par `marks only lot 1 to lot 10 pages as implemented` : reprendre son tableau attendu (46 chemins, trié) et y insérer, à leur place alphabétique (après `"/offre/types-documents-kyc"`, avant `"/supervision/api"`), les chemins `"/parametres/equipe-admin"`, `"/parametres/journal-backoffice"`, `"/parametres/profil"` (49 chemins en tout). Ajouter :

```ts
describe("lot 10 breadcrumbs", () => {
  it("labels the settings segments and links the three pages", () => {
    expect(labelForSegment("parametres")).toBe("Paramètres");
    expect(labelForSegment("profil")).toBe("Mon profil");
    expect(labelForSegment("equipe-admin")).toBe("Équipe admin");
    expect(labelForSegment("journal-backoffice")).toBe("Journal du backoffice");
    expect(isLinkablePath("/parametres/profil")).toBe(true);
    expect(isLinkablePath("/parametres")).toBe(false);
  });
  it("keeps the global search as the only unimplemented page", () => {
    expect(allNavItems().filter((i) => !i.implemented).map((i) => i.href)).toEqual(["/recherche"]);
  });
});
```

(importer `allNavItems`, `isLinkablePath`, `labelForSegment` si absents.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts`, remplacer les trois lignes `todo(…)` de la section « Paramètres » par :

```ts
    { label: "Mon profil", href: "/parametres/profil", implemented: true },
    { label: "Équipe admin", href: "/parametres/equipe-admin", implemented: true },
    { label: "Journal du backoffice", href: "/parametres/journal-backoffice", implemented: true },
```

Ajouter à `SEGMENT_LABELS` : `profil: "Mon profil", "equipe-admin": "Équipe admin", "journal-backoffice": "Journal du backoffice"` (sans doublon de clé existante). Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. Dans le test `unimplemented sections show a coming-soon page`, remplacer `await page.goto("/parametres/profil");` par `await page.goto("/recherche");`.
2. Ajouter, **avant** le test `@prod`, les tests suivants :

```ts
test("the profile shows the account, the TOTP state and the current session", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();
  await expect(page.getByTestId("profile-identifier")).toHaveText("admin@sira.app");
  await expect(page.getByTestId("profile-totp")).toContainText("Activé depuis le");
  await expect(page.getByTestId("profile-codes")).toHaveText("8");
  const current = page.getByRole("row", { name: /Session courante/ });
  await expect(current).toBeVisible();
  await expect(current.getByRole("button", { name: /Révoquer/ })).toHaveCount(0);
  await expect(page.getByRole("table")).not.toContainText(/\b(?:41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/);
});

test("the profile name can be changed", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await page.getByRole("button", { name: "Modifier mon nom" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom affiché").fill("n".repeat(101));
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Le nom est trop long (100 caractères maximum)");
  await dialog.getByLabel("Nom affiché").fill("Administrateur Sira E2E");
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("profile-name")).toHaveText("Administrateur Sira E2E");
  await page.getByRole("button", { name: "Modifier mon nom" }).click();
  await page.getByRole("dialog").getByLabel("Nom affiché").fill("Administrateur Sira");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByTestId("profile-name")).toHaveText("Administrateur Sira");
});

test("recovery codes are shown once after regenerating them", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await page.getByRole("button", { name: "Régénérer mes codes de récupération" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Régénérer les codes" }).click();
  await expect(page.getByRole("dialog", { name: "Nouveaux codes de récupération" })).toBeVisible();
  await expect(page.getByTestId("recovery-code")).toHaveCount(8);
  await expect(page.getByTestId("recovery-code").first()).toHaveText(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
  await page.getByRole("button", { name: "J'ai noté mes codes" }).click();
  await expect(page.getByTestId("recovery-code")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("recovery-code")).toHaveCount(0);
  await expect(page.getByTestId("profile-codes")).toHaveText("8");
});

test("own sessions can be revoked one by one or all at once", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  const android = page.getByRole("row", { name: /Application Android/ });
  await android.getByRole("button", { name: /Révoquer la session/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Révoquer la session" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(android).toContainText("Révoquée");
  await expect(android).toContainText("Révoquée par le titulaire");

  await page.getByRole("button", { name: "Révoquer toutes les autres sessions" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Révoquer les sessions" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Firefox · Ubuntu/ })).toContainText("Révoquée");
  await expect(page.getByRole("button", { name: "Révoquer toutes les autres sessions" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Session courante/ })).toContainText("Active");
});

test("the team lists the administrators and filters by status", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  await expect(page.getByRole("heading", { name: "Équipe admin" })).toBeVisible();
  for (const id of ["admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app", "seynabou.kane@sira.app", "awa.fall@sira.app"]) {
    await expect(page.getByRole("row", { name: new RegExp(id.replace(/\./g, "\\.")) })).toBeVisible();
  }
  const self = page.getByRole("row", { name: /admin@sira\.app/ }).first();
  await expect(self.getByRole("button")).toHaveCount(0);
  const awa = page.getByRole("row", { name: /awa\.fall@sira\.app/ });
  await expect(awa).toContainText("Invité");
  await expect(awa).toContainText("Non enrôlé");
  await page.getByRole("link", { name: "Invités", exact: true }).click();
  await expect(page).toHaveURL(/statut=invited/);
  await expect(page.getByRole("row", { name: /awa\.fall@sira\.app/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /fatou\.diallo@sira\.app/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Suspendus", exact: true }).click();
  await expect(page).toHaveURL(/statut=suspended/);
});

test("inviting an administrator rejects a bad identifier then adds the invitation", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  await page.getByRole("button", { name: "Inviter un administrateur" }).click();
  const dialog = page.getByRole("dialog");
  const send = dialog.getByRole("button", { name: "Envoyer l'invitation" });
  await expect(send).toBeDisabled();
  await dialog.getByLabel("Identifiant de connexion").fill("mal formé");
  await dialog.getByLabel("Nom affiché").fill("Invité E2E");
  await send.click();
  await expect(dialog.getByRole("alert")).toHaveText("L'identifiant doit avoir la forme prenom.nom@sira.app");
  await dialog.getByLabel("Identifiant de connexion").fill("e2e.invite@sira.app");
  await send.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row", { name: /e2e\.invite@sira\.app/ });
  await expect(row).toContainText("Invité");
  await expect(row).toContainText("Non enrôlé");
});

test("suspending an administrator needs a reason", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /ibrahima\.sow@sira\.app/ });
  await expect(row).toContainText("Actif");
  await row.getByRole("button", { name: /Suspendre/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Suspendre le compte" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Départ de l'équipe");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Suspendu");
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row.getByRole("button", { name: /Réactiver/ })).toBeVisible();
});

test("a suspended administrator can be reactivated", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /seynabou\.kane@sira\.app/ });
  await expect(row).toContainText("Suspendu");
  await row.getByRole("button", { name: /Réactiver/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Retour de congé");
  await dialog.getByRole("button", { name: "Réactiver le compte" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Actif");
});

test("resetting the TOTP of an administrator signs them out", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /moustapha\.ndiaye@sira\.app/ });
  await expect(row.getByTestId("admin-sessions")).toHaveText("1");
  await row.getByRole("button", { name: /Réinitialiser le TOTP/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Téléphone perdu");
  await dialog.getByRole("button", { name: "Réinitialiser le TOTP" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Non enrôlé");
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row.getByRole("button", { name: /Réinitialiser le TOTP/ })).toHaveCount(0);
});

test("revoking the sessions of an administrator needs a reason", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /fatou\.diallo@sira\.app/ });
  await expect(row.getByTestId("admin-sessions")).toHaveText("2");
  await row.getByRole("button", { name: /Révoquer les sessions/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Révoquer les sessions" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Poste partagé");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row).toContainText("Actif");
});

test("the journal shows the indicators and filters by actor, period and data reveals", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/journal-backoffice");
  await expect(page.getByRole("heading", { name: "Journal du backoffice" })).toBeVisible();
  for (const id of ["journal-entries", "journal-actors", "journal-reveals"]) await expect(page.getByTestId(id)).toBeVisible();

  const ibrahima = "ibrahima.sow%40sira.app";
  await page.goto(`/parametres/journal-backoffice?acteur=${ibrahima}&jours=90`);
  await expect(page.getByRole("row", { name: /Type de document KYC désactivé/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Incident déclaré \(Haute\) sur booking-service/ })).toBeVisible();
  await page.getByRole("link", { name: "30 jours", exact: true }).click();
  await expect(page).toHaveURL(/jours=30/);
  await expect(page).toHaveURL(/acteur=ibrahima/);
  await expect(page.getByRole("row", { name: /Type de document KYC désactivé/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Incident déclaré \(Haute\) sur booking-service/ })).toBeVisible();

  await page.goto("/parametres/journal-backoffice?acteur=moustapha.ndiaye%40sira.app&revelations=1");
  await expect(page.getByRole("row", { name: /Donnée personnelle révélée : téléphone de pape\.mbaye/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Compagnie suspendue pour impayé/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Toutes les actions", exact: true }).click();
  await expect(page.getByRole("row", { name: /Compagnie suspendue pour impayé/ })).toBeVisible();
});

test("an action of the team appears in the journal", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/journal-backoffice?acteur=admin%40sira.app&jours=7");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table")).not.toContainText(/moustapha\.ndiaye@sira\.app\s+(Donnée|Compagnie)/);
});
```

(Le dernier test est un garde-fou de structure : l'acteur est filtré. **Si ce test n'ajoute pas de preuve, le supprimer** plutôt que de le laisser passer sur une table sans lien avec les actions de l'équipe ; la preuve réelle que les actions de l'équipe atterrissent dans le journal est faite par les tests unitaires (`journals it`, `addActivity`).)

3. Étendre le test `@prod` : ajouter au tableau `paths` : `"/parametres/profil"`, `"/parametres/equipe-admin"`, `"/parametres/equipe-admin?statut=suspended"`, `"/parametres/journal-backoffice"`, `"/parametres/journal-backoffice?jours=30"`, `"/parametres/journal-backoffice?revelations=1"`. (Les identifiants `@sira.app` ne correspondent à aucune des expressions interdites, qui ciblent `.sn` ; les adresses de session sont tronquées `a.b.c.0`, la regex `FULL_IP` exige un dernier octet non nul.)

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: README**

Dans `README.md`, ajouter un paragraphe « Lot 10 : paramètres du backoffice » (3 écrans ; actions : modifier son nom, régénérer ses codes de récupération, révoquer ses sessions, inviter, suspendre, réactiver, réinitialiser le TOTP, révoquer les sessions d'un autre administrateur ; journal filtrable) et ajouter à la liste des limites : équipe propre à la maquette (le backend n'a ni rôle « administrateur plateforme » ni TOTP dédiés) ; l'authentification reste celle de démonstration (suspendre, inviter ou réinitialiser le TOTP n'a aucun effet sur la connexion réelle) ; pas de changement de mot de passe ni d'enrôlement TOTP réel ; la session courante est une session semée ; pas d'annulation d'invitation ni de suppression d'administrateur ; connexions et déconnexions non journalisées ; journal borné à 500 entrées, sans export ; un seul niveau de rôle d'administrateur ; codes de récupération non stockés (affichés une fois).

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable settings navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : 3 écrans (Tasks 5 et 6), modèle et graine (Task 1), lectures (Task 2), règles de l'équipe (Task 3) et du profil (Task 4), nav / E2E / fuite / README (Task 7), limites (README).
- **Cohérence des noms** : `adminsRepo.listRows/get/invite/suspend/reactivate/resetTotp/revokeSessions`, `profileRepo.view/updateDisplayName/revokeSession/revokeOthers/regenerateRecoveryCodes`, `journalRepo.actors/stats/list`, `AdminRow`, `MySessionRow`, `ProfileView`, `JournalRow`, `AdminInviteInput`, `backofficeSessionState`, actions `inviteAdmin`, `suspendAdmin`, `reactivateAdmin`, `resetAdminTotp`, `revokeAdminSessions`, `updateMyDisplayName`, `revokeMySession`, `revokeMyOtherSessions`, `regenerateMyRecoveryCodes` sont utilisés à l'identique.
- **Points à corriger ou vérifier à l'exécution** (déjà signalés dans les tâches) : le test `profile view` de la Task 2 contient une expression régulière à remplacer par `/(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/` ; la tautologie `expect(other.revokedAt).toBe(other.revokedAt)` de la Task 4 est à remplacer par une comparaison avec la valeur d'avant ; la mutation 15 de la Task 3 peut survivre (garde redondante, à noter) ; le dernier test E2E (`an action of the team appears in the journal`) est faible et sera supprimé s'il n'apporte pas de preuve ; `otherActiveSessions` est exposé par `ProfileView` (ajouté à l'interface, utilisé par la page) ; vérifier que `parseFilter` accepte un tableau `readonly string[]` et que `filterHref` n'est pas importé inutilement dans la page du journal.
- **Risques connus** : (1) `iso()` doit accepter des jours fractionnaires (sinon utiliser `now`) ; (2) le test de graine « last login » suppose que la session la plus récente d'un administrateur est celle de plus grand `createdAt` ; (3) la graine du journal ajoute dix entrées dont les dates sont relatives à `now`, les tests de période dépendent des décalages −40, −11 et −3 jours d'Ibrahima Sow ; (4) les tests de graine, de dépôt et d'E2E n'ont pas été exécutés : corriger la graine ou le sélecteur plutôt qu'affaiblir un test, et consigner l'écart dans le plan.
