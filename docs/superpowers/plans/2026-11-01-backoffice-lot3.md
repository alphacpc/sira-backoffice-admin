# Backoffice Sira, lot 3 : utilisateurs et accès. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les quatre entrées « Bientôt disponible » de la section « Utilisateurs et accès » par de vraies pages sur données statiques typées : liste et fiche des comptes de la plateforme (`/utilisateurs`, `/utilisateurs/[id]`), rôles (`/acces/roles`), matrice des permissions (`/acces/permissions`) et sessions actives (`/acces/sessions`), avec quatre actions serveur : changer le rôle d'un compte (qui révoque toutes ses sessions actives), révoquer toutes les sessions d'un compte, révoquer une session, révéler l'e-mail ou le téléphone d'un compte.

**Architecture:** Même socle que les lots 1 et 2. Les pages sont des Server Components (`export const dynamic = "force-dynamic"`, `params`/`searchParams` lus comme des `Promise`) qui lisent un nouveau dépôt `src/lib/repos/access.ts`, adossé au store en mémoire étendu par `src/lib/data/seed.ts` (comptes, rôles, permissions, attributions, sessions). Les composants clients ne reçoivent que des projections construites champ par champ (`UserRow` sans e-mail ni téléphone, `SessionRow` avec l'adresse IP tronquée `a.b.c.0`, `RoleOption`) ou des scalaires ; les pages Rôles et Permissions n'ont aucun composant client. Les mutations sont des Server Actions qui passent par le `run()` partagé ; la révélation passe par une variante `runReveal()` (session d'abord, la valeur ne sort qu'après journalisation). La date de référence (`now`) est injectée dans toutes les lectures et mutations de sessions : aucune horloge cachée, une session expirée n'est jamais comptée comme active.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, TanStack Table 8.21 (API v8 : `ColumnDef<T, unknown>`, `accessorKey`, `enableSorting`, `getRowId` via la prop `rowId` de `DataTable`), Radix Dialog/Tabs, Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm (versions installées : `@tanstack/react-table` 8.21.3, `next` 15.5.x, `react` 19.3.x, `vitest` 5.0.5, `zod` 4, `recharts` 3, `lucide-react` 1.x, `cmdk` 1.x ; ni zod, ni Recharts, ni cmdk ne sont touchés par ce lot).
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `params` et `searchParams` typés `Promise<…>` et attendus avec `await`. Onglets : `TabsWithUrl` avec la valeur initiale lue côté serveur dans `?onglet=` (motif de `SubscriptionTabs`). Après une action, le composant client appelle `useRouter().refresh()`.
- **Server Actions = points d'entrée HTTP publics** : chaque action passe par `run()` (ou `runReveal()`) de `src/lib/actions/run.ts` (session vérifiée **avant** toute lecture ou écriture), renvoie un `ActionResult` (`{ ok: true } | { ok: false; error: string }`) ou un `RevealResult` (`{ ok: true; value: string } | { ok: false; error: string }`) et ne lève jamais d'exception pour un échec attendu.
- Actions sensibles (changer un rôle, révoquer toutes les sessions d'un compte, révoquer une session) : confirmation + **motif obligatoire**, rogné (`trim`), **500 caractères au plus**, refusé au-delà (`"Motif trop long (500 caractères maximum)"`), jamais tronqué. La révélation d'un contact ne demande pas de motif mais est journalisée (« Donnée personnelle révélée : e-mail de <identifiant> », jamais la valeur).
- Le journal d'activité ne contient jamais d'e-mail, de téléphone ni d'objet métier complet : seulement des libellés, l'identifiant (`username`) du compte et le motif. Les entrées de ce lot sont des entrées plateforme (`companyId: null`) rattachées au compte par le nouveau champ facultatif `ActivityEntry.userId`.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : un composant `"use client"` ne reçoit jamais `PlatformUser`, `UserSession`, `UserDetail`, `email`, `phone` ni `ipAddress` ; seulement une projection typée **et** construite champ par champ (prouvé par un test `Object.keys`) ou des scalaires. Les imports depuis `@/lib/repos/access` dans un composant client sont des `import type` uniquement. Le test E2E `@prod` vérifie l'absence d'e-mail, de téléphone et d'adresse IP complète dans le HTML brut et le DOM de chaque nouvelle page.
- Pas de `rowHref` sur un `DataTable` dont les lignes contiennent un bouton qui ouvre un `ConfirmDialog` (`/acces/sessions` : la navigation passe par un lien dans une cellule, et `rowId` est obligatoire car une ligne disparaît après une révocation).
- Tests unitaires qui modifient le store : `resetStore(NOW)` dans `beforeEach` (ou `resetStore()` pour les actions, qui utilisent l'horloge réelle), aucune dépendance à l'ordre, pas de tautologie (un objet du store comparé avec lui-même), pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`, un test qui mute possède des entités de graine qu'aucun autre test ne mute (voir la table des entités ci-dessous).
- Toute garde nouvelle (session d'abord, motif ≤ 500, pas de changement de son propre rôle, dernier administrateur actif protégé, révocation en cascade au changement de rôle, rôle inconnu, rôle identique, rien à révoquer, session déjà révoquée ou expirée, session expirée jamais active, journalisation avant la valeur révélée) est prouvée par un test **qui échoue quand on retire la garde** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`, qui construit le serveur de production) réécrit `tsconfig.json` : après chaque build, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`.
- Commits : message court en anglais (`feat:`/`test:`/`refactor:`/`chore:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : création, suppression, suspension ou réactivation de comptes, réinitialisation de mot de passe, modification des permissions d'un rôle (lecture seule), 2FA de l'équipe admin, rôle « administrateur plateforme » distinct, branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés du spec)

1. **L'administrateur connecté au backoffice n'est pas un compte de la graine.** Le spec dit que « la session de l'administrateur courant n'est pas modélisée ». La règle « un administrateur ne peut pas changer son propre rôle » compare l'identité de la session (`actor`, aujourd'hui `admin@sira.app`) à l'e-mail **ou** à l'identifiant du compte cible ; elle est prouvée par les tests unitaires et d'action (session simulée avec l'e-mail d'un compte), elle ne se déclenche pas dans l'interface de démonstration. En conséquence, la graine a **un seul administrateur actif** (`moustapha.ndiaye`) et un administrateur suspendu (`seynabou.kane`) : la tentative de rétrograder le dernier administrateur actif est jouable dans l'E2E sans passer par la garde d'auto-modification.
2. **51 comptes au lieu d'« environ 40 »** : un compte par employé d'une compagnie **non brouillon** (45 ; les 5 employés des compagnies en brouillon n'ont pas encore de compte, ce qui donne au lien « Équipe » son cas « pas de compte »), 2 administrateurs de plateforme, 4 clients `USER`. Exactement 2 comptes suspendus (`seynabou.kane`, `pape.mbaye`).
3. **19 codes de permission, pas 20** : `ANALYTICS_READ` n'existe pas sur la plateforme (la lecture des agrégats d'analytique utilise `MONITORING_READ`, déjà dans la liste) ; aucun code n'est inventé.
4. **Attributions alignées sur les migrations réelles de la plateforme** : `ADMIN` porte 17 permissions (toutes sauf `EMPLOYEE_CONFIDENTIAL_ACCESS`, accordée à aucun rôle, et `COMPANY_PARTNERSHIP_MANAGE`, accordée au seul `MANAGER`) ; `MANAGER` porte **12** permissions (les 11 du lot « rôles de personnel de compagnie » plus `FLEET_MAINTENANCE_MANAGE`, ajoutée au `MANAGER` par le lot « maintenance des bus ») ; le spec disait 11. `GUICHETIER` 3, `CHAUFFEUR` et `USER` aucune.
5. **Lien employé → compte** : `Employee` gagne `userId: string | null` (miroir de `Employee.userId` côté `hr-service`), plutôt qu'un rapprochement par e-mail. `ActivityEntry` gagne `userId?: string` (facultatif : les entrées existantes ne changent pas).
6. **Aucune activité de compte n'est semée** : l'onglet Activité d'un compte est vide (« Aucune activité enregistrée pour ce compte. ») tant qu'aucune action n'a été faite ; semer « Compte créé » aurait changé le panneau « Activité récente » de la Vue 360, que le spec demande de ne pas modifier.
7. **Sessions** : durée de vie 7 jours ; 1 à 3 sessions par compte actif (quelques-unes révoquées, « Déconnexion », d'autres expirées) ; un compte suspendu ne garde qu'une session révoquée à sa suspension (« Compte suspendu »). `lastLoginAt` = début de la session la plus récente, donc jamais `null` dans la graine. Les adresses IP commencent par `41.82.` ou `196.207.` et ne finissent jamais par `0`, ce qui permet au test de fuite de rejeter toute adresse complète tout en acceptant la forme tronquée `a.b.c.0`. Une adresse qui n'est pas un IPv4 valide est affichée `••••`.
8. **Filtres** : `/utilisateurs` combine `?role=` et `?statut=` (chaque groupe de pastilles conserve l'autre filtre) ; `/acces/sessions` filtre par rôle (`?role=`) en plus de la recherche du tableau. `StatusFilterNav` gagne deux props facultatives (`param`, défaut `statut`, et `keep`) via un helper pur `filterHref` testé ; les liens du lot 2 restent identiques (`?statut=<valeur>`).
9. **Changer le rôle** : le dialogue réutilise `ConfirmDialog`, qui gagne deux props facultatives (`children`, rendu au-dessus du motif, et `confirmDisabled`) ; la liste déroulante exclut le rôle courant, la confirmation reste désactivée tant qu'aucun rôle n'est choisi, et le serveur refuse quand même un rôle identique. Ordre des gardes du dépôt : compte existant → rôle existant → motif → rôle identique → auto-modification → dernier administrateur actif. Changer le rôle d'un compte suspendu est permis (il n'a aucune session active : 0 révoquée).
10. Le bouton « Révoquer toutes les sessions » n'est affiché que s'il reste au moins une session active (le serveur refuse quand même « Aucune session active à révoquer »).
11. `RevealResult` et `runReveal()` vivent dans `src/lib/actions/run.ts` ; `compagnies/actions.ts` n'est pas modifié (il garde son propre `RevealResult`, identique).
12. Après une révélation réussie, `UserContactField` appelle `router.refresh()` pour que l'onglet Activité affiche la nouvelle entrée (l'état « révélé » de `MaskedValue` survit au rafraîchissement).
13. Les pages Rôles et Permissions sont des Server Components purs (détail repliable par `<details>`), sans composant client ; les cases de la matrice portent `data-testid="grant-<RÔLE>-<PERMISSION>"` et `data-granted="true|false"`, avec un texte `sr-only` « Accordée » / « Non accordée ».

## Entités de graine possédées par les tests E2E qui mutent

| Test E2E | Entité possédée | Effet |
|---|---|---|
| `changing a role requires a reason and revokes every active session` | `ibrahima-sow.dakar-voyages` | rôle `GUICHETIER` → `MANAGER`, 2 sessions révoquées |
| `an account's e-mail is masked, revealed on demand, and the reveal is journaled` | `khady-faye.matam-express` | une entrée d'activité (aucun autre état) ; le test « Équipe » ne lit que son nom, son identifiant et son rôle |
| `a session is revoked from the platform sessions list with a mandatory reason` | sessions de `lamine.camara` | session « Safari · iPhone » révoquée |
| `the last active administrator cannot be demoted` | `moustapha.ndiaye` | lecture seule (refus, rien ne change) |
| `the company team links each employee to their platform account` | Matam Express, Tamba Rapide | lecture seule (Tamba Rapide n'est mutée par aucun test, contrairement à Kolda Voyages et Louga Trans) |

Aucun de ces tests ne peut empoisonner un autre test en cas d'échec à mi-parcours (aucune autre entité n'est touchée), d'où l'absence de `try/finally`.

## Carte des fichiers

```
src/lib/types/index.ts                         (modifié) Employee.userId, ActivityEntry.userId? + UserStatus, PlatformUser, Role, PermissionDomain, PermissionDef, RolePermission, UserSession
src/lib/data/seed.ts                           (modifié) permissions, rôles, attributions, 51 comptes, 101 sessions, Employee.userId
src/lib/mask.ts                                (modifié) truncateIp
src/lib/repos/access.ts                        (créé)   usersRepo, rolesRepo, permissionsRepo, sessionsRepo, sessionState, projections
src/lib/repos/activity.ts                      (modifié) addActivity(…, userId?)
src/lib/actions/run.ts                         (modifié) RevealResult, runReveal
src/lib/filters.ts                             (modifié) filterHref
src/lib/labels.ts                              (modifié) userStatusBadge, sessionStateBadge, permissionDomainLabel
src/lib/nav.ts                                 (modifié) 4 entrées implémentées, fil d'Ariane
src/app/(admin)/utilisateurs/actions.ts        (créé)   changeUserRole, revokeUserSessions, revealUserContact
src/app/(admin)/acces/actions.ts               (créé)   revokeSession
src/app/(admin)/utilisateurs/{page,users-table}.tsx, utilisateurs/[id]/{page,not-found}.tsx   (créés)
src/app/(admin)/acces/roles/page.tsx, acces/permissions/page.tsx, acces/sessions/{page,sessions-table}.tsx (créés)
src/components/access/{user-tabs,user-actions,user-contact-field,revoke-session-button}.tsx   (créés)
src/components/data/status-filter-nav.tsx      (modifié) props param et keep
src/components/data/confirm-dialog.tsx         (modifié) props children et confirmDisabled
src/components/company/company-tabs.tsx        (modifié) onglet Équipe : lien vers le compte
tests/unit/{access-seed,access-repo,access-rules,access-actions}.test.ts  (créés)
tests/unit/{mask,filters,labels,run-action,nav}.test.ts                   (modifiés)
tests/e2e/backoffice.spec.ts                   (modifié)
README.md                                      (modifié)
```

Comptes de tests attendus : **181** tests unitaires au départ. Après chaque tâche : T1 **217**, T2 **235**, T3 **252**, T4 **257**, T5 257, T6 257, T7 **259**. E2E (projet `dev` + test `@prod`) : **16** au départ (15 + 1), **20** après T4, **21** après T5, **22** après T6, **23** après T7 (22 + 1 ; le test `@prod` est remplacé par sa version étendue, pas dupliqué).

**Tests existants touchés** (aucun nombre existant ne change de valeur) :
- `tests/unit/nav.test.ts` (Task 7) : le test `marks only lot 1 and lot 2 pages as implemented` est **remplacé** par `marks only lot 1, lot 2 and lot 3 pages as implemented` (11 chemins → 15 : les 4 entrées de la section) ; un `describe` est ajouté (2 tests).
- `tests/unit/mask.test.ts` (T1, +2), `tests/unit/filters.test.ts` (T4, +3), `tests/unit/labels.test.ts` (T4, +2), `tests/unit/run-action.test.ts` (T3, +3) : ajouts seulement.
- `tests/unit/billing-seed.test.ts`, `companies-repo.test.ts`, `dashboard-repo.test.ts` : **inchangés** — la graine garde 50 employés (seul le champ `userId` est ajouté), 15 abonnements et la même activité semée (décision 6), donc aucun compte ni ordre ne bouge.
- `tests/e2e/backoffice.spec.ts` : 6 tests ajoutés avant le test `@prod`, et le test `@prod` remplacé (Task 7) par une version qui couvre aussi les 5 écrans du lot, la fiche d'un employé, d'un administrateur et d'un client, et les adresses IP complètes.

---
### Task 1: Types, graine des comptes et des sessions, dépôt d'accès en lecture (TDD)

**Files:**
- Modify: `src/lib/types/index.ts`, `src/lib/data/seed.ts`, `src/lib/mask.ts`, `tests/unit/mask.test.ts`
- Create: `src/lib/repos/access.ts`, `tests/unit/access-seed.test.ts`, `tests/unit/access-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `resetStore(now?)` (lot 2), `buildSeed(now)` et ses helpers `uid`, `slugify`, `iso` (lot 1).
- Produces:
  - Types : `Employee` (+ `userId: string | null`), `ActivityEntry` (+ `userId?: string`), `UserStatus = "active" | "suspended"`, `PlatformUser`, `Role`, `PermissionDomain`, `PermissionDef`, `RolePermission`, `UserSession`.
  - `Store` gagne `users: PlatformUser[]`, `roles: Role[]`, `permissions: PermissionDef[]`, `rolePermissions: RolePermission[]`, `sessions: UserSession[]`.
  - `truncateIp(value: string): string` dans `src/lib/mask.ts`.
  - Dans `src/lib/repos/access.ts` : `interface UserRow` (10 clés), `type SessionState = "active" | "revoked" | "expired"`, `interface SessionRow` (12 clés), `interface RoleRow extends Role { userCount: number; permissions: PermissionDef[] }`, `interface RoleOption { code: string; name: string }`, `interface PermissionMatrix`, `interface UserDetail` (serveur seulement), `PERMISSION_DOMAINS: readonly PermissionDomain[]`, `sessionState(session: UserSession, now: Date): SessionState`, `usersRepo.listRows(filter?: { roleCode?: string; status?: UserStatus }, now?: Date): UserRow[]`, `usersRepo.get(id: string): PlatformUser | undefined`, `usersRepo.detail(id: string, now?: Date): UserDetail | undefined`, `rolesRepo.list(): Role[]`, `rolesRepo.options(): RoleOption[]`, `rolesRepo.listRows(): RoleRow[]`, `permissionsRepo.list(): PermissionDef[]`, `permissionsRepo.matrix(): PermissionMatrix`, `sessionsRepo.activeRows(filter?: { roleCode?: string }, now?: Date): SessionRow[]`, `sessionsRepo.get(id: string): UserSession | undefined`.

- [ ] **Step 1: Étendre les types**

Dans `src/lib/types/index.ts`, remplacer :

```ts
export interface Employee {
  id: string; companyId: string; name: string; email: string; phone: string;
  role: "MANAGER" | "GUICHETIER" | "CHAUFFEUR";
}
```

par :

```ts
export interface Employee {
  id: string; companyId: string; name: string; email: string; phone: string;
  role: "MANAGER" | "GUICHETIER" | "CHAUFFEUR";
  /** Platform account of the employee (`identity-service` user), null while the company is a draft. */
  userId: string | null;
}
```

puis remplacer :

```ts
export interface ActivityEntry {
  id: string; companyId: string | null; at: string; actor: string; action: string;
}
```

par :

```ts
export interface ActivityEntry {
  id: string; companyId: string | null; at: string; actor: string; action: string;
  /** Platform account the entry is about (role change, session revocation, contact reveal). */
  userId?: string;
}
```

et ajouter à la fin du fichier :

```ts
export type UserStatus = "active" | "suspended";

/** Platform account (`identity-service`). `email` and `phone` never leave the server. */
export interface PlatformUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  roleCode: string;
  status: UserStatus;
  companyId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Role { code: string; name: string; description: string }

export type PermissionDomain =
  | "companies" | "fleet" | "bookings" | "parcels" | "hr" | "customers"
  | "marketing" | "notifications" | "compliance" | "monitoring" | "platform";

export interface PermissionDef { code: string; domain: PermissionDomain; description: string }

export interface RolePermission { roleCode: string; permissionCode: string }

/** A refresh-token session. `ipAddress` is the full address and never leaves the server. */
export interface UserSession {
  id: string;
  userId: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}
```

Ne pas lancer `pnpm typecheck` avant la fin du Step 4 : `Employee.userId` est obligatoire et la graine (seul endroit qui construit des `Employee`) ne le renseigne qu'au Step 3.

- [ ] **Step 2: Tests de la graine et du dépôt (échouants)**

Créer `tests/unit/access-seed.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { sessionState } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const grants = (role: string) =>
  getStore().rolePermissions.filter((rp) => rp.roleCode === role).map((rp) => rp.permissionCode).sort();

describe("access seed: roles and permissions", () => {
  it("has the five platform roles", () => {
    expect(getStore().roles.map((r) => r.code)).toEqual(["ADMIN", "MANAGER", "GUICHETIER", "CHAUFFEUR", "USER"]);
  });

  it("has the 19 real permission codes, each in one of the 11 domains, without duplicates", () => {
    const perms = getStore().permissions;
    expect(perms).toHaveLength(19);
    expect(new Set(perms.map((p) => p.code)).size).toBe(19);
    expect(new Set(perms.map((p) => p.domain)).size).toBe(11);
    for (const code of ["RBAC_MANAGE", "USER_MANAGE", "COMPANY_KYC_REVIEW", "EMPLOYEE_CONFIDENTIAL_ACCESS",
      "COMPLIANCE_READ", "COMPLIANCE_MANAGE", "MONITORING_READ", "MONITORING_MANAGE", "FLEET_MAINTENANCE_MANAGE"]) {
      expect(perms.map((p) => p.code)).toContain(code);
    }
  });

  it("only grants existing permissions to existing roles", () => {
    const s = getStore();
    for (const rp of s.rolePermissions) {
      expect(s.roles.map((r) => r.code)).toContain(rp.roleCode);
      expect(s.permissions.map((p) => p.code)).toContain(rp.permissionCode);
    }
  });

  it("grants the platform migrations' sets: ADMIN 17, MANAGER 12, GUICHETIER 3, CHAUFFEUR and USER none", () => {
    expect(grants("ADMIN")).toHaveLength(17);
    expect(grants("ADMIN")).not.toContain("EMPLOYEE_CONFIDENTIAL_ACCESS");
    expect(grants("ADMIN")).not.toContain("COMPANY_PARTNERSHIP_MANAGE");
    expect(grants("MANAGER")).toEqual([
      "BOOKING_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_MANAGE", "COMPANY_PARTNERSHIP_MANAGE", "CUSTOMER_MANAGE",
      "EMPLOYEE_MANAGE", "FLEET_MAINTENANCE_MANAGE", "FLEET_MANAGE", "MARKETING_MANAGE", "NOTIFICATION_MANAGE",
      "PARCEL_MANAGE", "USER_MANAGE",
    ]);
    expect(grants("GUICHETIER")).toEqual(["BOOKING_MANAGE", "FLEET_MANAGE", "USER_MANAGE"]);
    expect(grants("CHAUFFEUR")).toEqual([]);
    expect(grants("USER")).toEqual([]);
  });

  it("never grants a platform permission to a company role", () => {
    for (const role of ["MANAGER", "GUICHETIER"]) {
      for (const code of grants(role)) {
        expect(code).not.toMatch(/^(RBAC_MANAGE|COMPANY_KYC_REVIEW|COMPLIANCE_|MONITORING_|EMPLOYEE_CONFIDENTIAL_ACCESS)/);
      }
    }
  });
});

describe("access seed: accounts", () => {
  it("has one account per employee of a non-draft company, two platform admins and four clients", () => {
    const s = getStore();
    const linked = s.employees.filter((e) => e.userId !== null);
    const draftIds = s.companies.filter((c) => c.status === "draft").map((c) => c.id);
    expect(linked).toHaveLength(45);
    expect(s.employees.filter((e) => e.userId === null).every((e) => draftIds.includes(e.companyId))).toBe(true);
    expect(s.users).toHaveLength(51);
    expect(s.users.filter((u) => u.roleCode === "ADMIN").map((u) => u.username)).toEqual(["moustapha.ndiaye", "seynabou.kane"]);
    expect(s.users.filter((u) => u.roleCode === "USER")).toHaveLength(4);
  });

  it("mirrors each linked employee in its account (same company, role, name, e-mail and phone)", () => {
    const s = getStore();
    for (const e of s.employees.filter((x) => x.userId !== null)) {
      const u = s.users.find((x) => x.id === e.userId)!;
      expect([u.companyId, u.roleCode, u.displayName, u.email, u.phone]).toEqual([e.companyId, e.role, e.name, e.email, e.phone]);
    }
  });

  it("has unique identifiers and usernames, every role existing, and exactly two suspended accounts", () => {
    const s = getStore();
    expect(new Set(s.users.map((u) => u.id)).size).toBe(51);
    expect(new Set(s.users.map((u) => u.username)).size).toBe(51);
    for (const u of s.users) expect(s.roles.map((r) => r.code)).toContain(u.roleCode);
    expect(s.users.filter((u) => u.status === "suspended").map((u) => u.username)).toEqual(["seynabou.kane", "pape.mbaye"]);
  });

  it("has exactly one active administrator", () => {
    const admins = getStore().users.filter((u) => u.roleCode === "ADMIN" && u.status === "active");
    expect(admins.map((u) => u.username)).toEqual(["moustapha.ndiaye"]);
  });

  it("uses the employee contact formats for every account", () => {
    for (const u of getStore().users) {
      expect(u.email).toMatch(/^[a-z0-9._-]+@[a-z0-9-]+\.sn$/);
      expect(u.phone).toMatch(/^\+2217865\d{5}$/);
    }
  });
});

describe("access seed: sessions", () => {
  it("ties every session to an existing account and gives every active account 1 to 3 sessions", () => {
    const s = getStore();
    for (const x of s.sessions) expect(s.users.some((u) => u.id === x.userId)).toBe(true);
    for (const u of s.users.filter((x) => x.status === "active")) {
      const n = s.sessions.filter((x) => x.userId === u.id).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it("orders session dates coherently", () => {
    for (const x of getStore().sessions) {
      expect(x.createdAt <= x.lastSeenAt).toBe(true);
      expect(x.lastSeenAt <= x.expiresAt).toBe(true);
      expect(x.lastSeenAt <= NOW.toISOString()).toBe(true);
      if (x.revokedAt !== null) {
        expect(x.revokedAt >= x.lastSeenAt).toBe(true);
        expect(x.revokedReason).not.toBeNull();
      } else {
        expect(x.revokedReason).toBeNull();
      }
    }
  });

  it("has active, revoked and expired sessions", () => {
    const states = getStore().sessions.map((x) => sessionState(x, NOW));
    expect(states.filter((st) => st === "active")).toHaveLength(73);
    expect(states.filter((st) => st === "revoked")).toHaveLength(10);
    expect(states.filter((st) => st === "expired")).toHaveLength(18);
  });

  it("leaves no active session to a suspended account", () => {
    const s = getStore();
    for (const u of s.users.filter((x) => x.status === "suspended")) {
      const own = s.sessions.filter((x) => x.userId === u.id);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((x) => sessionState(x, NOW) !== "active")).toBe(true);
    }
  });

  it("sets lastLoginAt to the start of the newest session, after the account creation", () => {
    const s = getStore();
    for (const u of s.users) {
      const newest = s.sessions.filter((x) => x.userId === u.id).map((x) => x.createdAt).sort().at(-1);
      expect(u.lastLoginAt).toBe(newest);
      expect(u.createdAt <= u.lastLoginAt!).toBe(true);
    }
  });

  it("stores full IPv4 addresses whose last byte is never 0", () => {
    for (const x of getStore().sessions) expect(x.ipAddress).toMatch(/^(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}$/);
  });

  it("puts no account e-mail or phone in the seeded activity log", () => {
    const s = getStore();
    const log = JSON.stringify(s.activity);
    for (const u of s.users) {
      expect(log).not.toContain(u.email);
      expect(log).not.toContain(u.phone);
    }
  });
});
```

Créer `tests/unit/access-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { permissionsRepo, rolesRepo, sessionsRepo, usersRepo } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;

describe("usersRepo.listRows", () => {
  it("returns a projection without contact data, field by field", () => {
    const row = usersRepo.listRows({}, NOW)[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "activeSessions", "companyId", "companyName", "displayName", "id", "lastLoginAt", "roleCode",
      "roleName", "status", "username",
    ]);
  });

  it("filters by role and by status, and combines both", () => {
    expect(usersRepo.listRows({ roleCode: "ADMIN" }, NOW).map((r) => r.username).sort())
      .toEqual(["moustapha.ndiaye", "seynabou.kane"]);
    expect(usersRepo.listRows({ status: "suspended" }, NOW).map((r) => r.username).sort())
      .toEqual(["pape.mbaye", "seynabou.kane"]);
    expect(usersRepo.listRows({ roleCode: "USER", status: "active" }, NOW)).toHaveLength(3);
    expect(usersRepo.listRows({}, NOW)).toHaveLength(51);
  });

  it("sorts by display name, then username", () => {
    const rows = usersRepo.listRows({}, NOW);
    const keys = rows.map((r) => [r.displayName, r.username] as const);
    const sorted = [...keys].sort((a, b) => a[0].localeCompare(b[0], "fr") || a[1].localeCompare(b[1]));
    expect(keys).toEqual(sorted);
    expect(rows[0]!.displayName).toBe("Aïssatou Sarr");
  });

  it("names the role and the linked company, null for platform accounts", () => {
    const rows = usersRepo.listRows({}, NOW);
    expect(rows.find((r) => r.username === "khady-faye.matam-express")).toMatchObject({
      roleName: "Responsable de compagnie", companyName: "Matam Express",
    });
    expect(rows.find((r) => r.username === "moustapha.ndiaye")).toMatchObject({
      roleName: "Administrateur", companyId: null, companyName: null,
    });
  });

  it("counts active sessions against the injected date, never an expired one", () => {
    const id = userBy("lamine.camara").id;
    expect(usersRepo.listRows({}, NOW).find((r) => r.id === id)!.activeSessions).toBe(3);
    const later = new Date(NOW.getTime() + 5 * DAY);
    expect(usersRepo.listRows({}, later).find((r) => r.id === id)!.activeSessions).toBe(1);
    const muchLater = new Date(NOW.getTime() + 30 * DAY);
    expect(usersRepo.listRows({}, muchLater).every((r) => r.activeSessions === 0)).toBe(true);
  });

  it("counts no revoked session as active", () => {
    const row = usersRepo.listRows({}, NOW).find((r) => r.username === "mariama-ba.dakar-voyages")!;
    expect(getStore().sessions.filter((x) => x.userId === row.id)).toHaveLength(3);
    expect(row.activeSessions).toBe(1);
  });
});

describe("usersRepo.detail", () => {
  it("returns the account, its role, company, inherited permissions and sessions newest first", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const d = usersRepo.detail(u.id, NOW)!;
    expect(d.user.id).toBe(u.id);
    expect(d.role?.code).toBe("GUICHETIER");
    expect(d.companyName).toBe("Dakar Voyages");
    expect(d.permissions.map((p) => p.code)).toEqual(["FLEET_MANAGE", "BOOKING_MANAGE", "USER_MANAGE"]);
    expect(d.sessions).toHaveLength(2);
    expect(d.sessions[0]!.createdAt > d.sessions[1]!.createdAt).toBe(true);
    expect(d.activeSessions).toBe(2);
    expect(d.activity).toEqual([]);
  });

  it("projects the sessions without the full IP address", () => {
    const d = usersRepo.detail(userBy("lamine.camara").id, NOW)!;
    expect(Object.keys(d.sessions[0]!).sort()).toEqual([
      "createdAt", "deviceLabel", "displayName", "expiresAt", "id", "ip", "lastSeenAt", "revokedAt",
      "revokedReason", "state", "userId", "username",
    ]);
    for (const x of d.sessions) expect(x.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.0$/);
  });

  it("returns undefined for an unknown id", () => {
    expect(usersRepo.detail("nope", NOW)).toBeUndefined();
  });
});

describe("rolesRepo", () => {
  it("counts users and lists permissions of each role", () => {
    const rows = rolesRepo.listRows();
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(rows.map((r) => r.code)).toEqual(["ADMIN", "MANAGER", "GUICHETIER", "CHAUFFEUR", "USER"]);
    expect([byCode.ADMIN!.userCount, byCode.MANAGER!.userCount, byCode.GUICHETIER!.userCount,
      byCode.CHAUFFEUR!.userCount, byCode.USER!.userCount]).toEqual([2, 15, 15, 15, 4]);
    expect([byCode.ADMIN!.permissions.length, byCode.MANAGER!.permissions.length,
      byCode.GUICHETIER!.permissions.length, byCode.CHAUFFEUR!.permissions.length]).toEqual([17, 12, 3, 0]);
    expect(rows.reduce((n, r) => n + r.userCount, 0)).toBe(getStore().users.length);
  });

  it("offers every role as an option", () => {
    expect(rolesRepo.options()).toEqual([
      { code: "ADMIN", name: "Administrateur" }, { code: "MANAGER", name: "Responsable de compagnie" },
      { code: "GUICHETIER", name: "Agent de vente" }, { code: "CHAUFFEUR", name: "Chauffeur" },
      { code: "USER", name: "Utilisateur" },
    ]);
  });
});

describe("permissionsRepo.matrix", () => {
  it("groups the permissions by domain in the display order", () => {
    const m = permissionsRepo.matrix();
    expect(m.groups.map((g) => g.domain)).toEqual([
      "companies", "fleet", "bookings", "parcels", "hr", "customers",
      "marketing", "notifications", "compliance", "monitoring", "platform",
    ]);
    expect(m.groups.flatMap((g) => g.rows)).toHaveLength(19);
  });

  it("reflects exactly the grants of each role", () => {
    const s = getStore();
    const m = permissionsRepo.matrix();
    for (const row of m.groups.flatMap((g) => g.rows)) {
      const expected = s.rolePermissions.filter((rp) => rp.permissionCode === row.code).map((rp) => rp.roleCode).sort();
      expect([...row.grantedTo].sort()).toEqual(expected);
    }
    const rows = m.groups.flatMap((g) => g.rows);
    expect(rows.filter((r) => r.grantedTo.includes("MANAGER"))).toHaveLength(12);
    expect(rows.find((r) => r.code === "EMPLOYEE_CONFIDENTIAL_ACCESS")!.grantedTo).toEqual([]);
    expect(rows.find((r) => r.code === "RBAC_MANAGE")!.grantedTo).toEqual(["ADMIN"]);
  });
});

describe("sessionsRepo.activeRows", () => {
  it("lists only active sessions, most recently seen first", () => {
    const rows = sessionsRepo.activeRows({}, NOW);
    expect(rows).toHaveLength(73);
    expect(rows.every((r) => r.state === "active")).toBe(true);
    const seen = rows.map((r) => r.lastSeenAt);
    expect([...seen].sort().reverse()).toEqual(seen);
  });

  it("filters by the role of the account", () => {
    const rows = sessionsRepo.activeRows({ roleCode: "USER" }, NOW);
    expect(rows.length).toBeGreaterThan(0);
    const users = getStore().users;
    expect(rows.every((r) => users.find((u) => u.id === r.userId)!.roleCode === "USER")).toBe(true);
    expect(rows.filter((r) => r.username === "lamine.camara")).toHaveLength(3);
  });

  it("truncates every IP address to a.b.c.0", () => {
    const s = getStore();
    for (const r of sessionsRepo.activeRows({}, NOW)) {
      const full = s.sessions.find((x) => x.id === r.id)!.ipAddress;
      expect(r.ip).toBe(full.replace(/\.\d+$/, ".0"));
      expect(r.ip).not.toBe(full);
    }
  });

  it("drops a session once it expires", () => {
    expect(sessionsRepo.activeRows({}, new Date(NOW.getTime() + 30 * DAY))).toEqual([]);
  });
});
```

Ajouter à la fin de `tests/unit/mask.test.ts` :

```ts

import { truncateIp } from "@/lib/mask";
describe("truncateIp", () => {
  it("keeps the /24 network of an IPv4 address", () => {
    expect(truncateIp("41.82.14.72")).toBe("41.82.14.0");
    expect(truncateIp(" 196.207.7.41 ")).toBe("196.207.7.0");
  });
  it("masks anything that is not a valid IPv4 address", () => {
    expect(truncateIp("2001:db8::1")).toBe("••••");
    expect(truncateIp("300.1.1.1")).toBe("••••");
    expect(truncateIp("")).toBe("••••");
  });
});
```

Run: `pnpm test tests/unit/access-seed.test.ts tests/unit/access-repo.test.ts tests/unit/mask.test.ts` → FAIL (modules `@/lib/repos/access` introuvable, `truncateIp` n'est pas une fonction).

- [ ] **Step 3: Étendre la graine**

Dans `src/lib/data/seed.ts` :

1. Remplacer le bloc d'import de types par :

```ts
import type {
  ActivityEntry, Company, CompanyStatus, DsrRequest, Employee, FeatureDef, FeatureFlag,
  FleetBus, FleetTrip, Incident, Invoice, KycDocument, KycDocumentType, PartnerTier,
  PaymentAttempt, PermissionDef, Plan, PlanLimits, PlatformUser, Referral, RetryOutcome, Role,
  RolePermission, ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionHistoryEntry,
  SubscriptionStatus, UsageMetric, UserSession, UserStatus,
} from "@/lib/types";
```

2. Dans `interface Store`, remplacer la ligne `  retryOutcomes: Record<string, RetryOutcome>;` et l'accolade qui la suit par :

```ts
  retryOutcomes: Record<string, RetryOutcome>;
  users: PlatformUser[];
  roles: Role[];
  permissions: PermissionDef[];
  rolePermissions: RolePermission[];
  sessions: UserSession[];
}
```

3. Insérer, juste avant la ligne `const ROUTES = [`, le bloc :

```ts
/** Real permission codes of the platform (`identity-service` migrations), grouped by domain. */
const PERMISSIONS: PermissionDef[] = [
  { code: "COMPANY_MANAGE", domain: "companies", description: "Gérer les compagnies et leur facturation" },
  { code: "COMPANY_KYC_SUBMIT", domain: "companies", description: "Déposer les documents KYC de sa compagnie" },
  { code: "COMPANY_KYC_REVIEW", domain: "companies", description: "Revoir les documents KYC et forcer une activation" },
  { code: "COMPANY_PARTNERSHIP_MANAGE", domain: "companies", description: "Gérer le parrainage et les crédits de sa compagnie" },
  { code: "FLEET_MANAGE", domain: "fleet", description: "Gérer gares, lignes, bus et trajets" },
  { code: "FLEET_MAINTENANCE_MANAGE", domain: "fleet", description: "Gérer la maintenance des bus et les fournisseurs" },
  { code: "BOOKING_MANAGE", domain: "bookings", description: "Vendre et gérer les réservations et billets" },
  { code: "PARCEL_MANAGE", domain: "parcels", description: "Gérer les colis" },
  { code: "EMPLOYEE_MANAGE", domain: "hr", description: "Gérer les employés, congés, paie et avantages" },
  { code: "EMPLOYEE_CONFIDENTIAL_ACCESS", domain: "hr", description: "Accéder aux documents RH confidentiels" },
  { code: "CUSTOMER_MANAGE", domain: "customers", description: "Gérer les clients, la fidélité et les avis" },
  { code: "MARKETING_MANAGE", domain: "marketing", description: "Gérer les campagnes marketing" },
  { code: "NOTIFICATION_MANAGE", domain: "notifications", description: "Consulter et gérer les notifications" },
  { code: "COMPLIANCE_READ", domain: "compliance", description: "Lire les consentements et les journaux d'audit" },
  { code: "COMPLIANCE_MANAGE", domain: "compliance", description: "Traiter les demandes des personnes concernées" },
  { code: "MONITORING_READ", domain: "monitoring", description: "Lire la santé des services, les incidents et l'usage" },
  { code: "MONITORING_MANAGE", domain: "monitoring", description: "Déclarer et suivre les incidents" },
  { code: "RBAC_MANAGE", domain: "platform", description: "Gérer les rôles des comptes" },
  { code: "USER_MANAGE", domain: "platform", description: "Consulter les comptes utilisateurs" },
];

const ROLES: Role[] = [
  { code: "ADMIN", name: "Administrateur", description: "Équipe plateforme Sira : toutes les permissions de plateforme." },
  { code: "MANAGER", name: "Responsable de compagnie", description: "Gère sa compagnie ; jamais les permissions de plateforme." },
  { code: "GUICHETIER", name: "Agent de vente", description: "Vend des billets au guichet de sa compagnie." },
  { code: "CHAUFFEUR", name: "Chauffeur", description: "Rôle métier réservé, sans permission." },
  { code: "USER", name: "Utilisateur", description: "Client final : réservation en libre-service, sans permission." },
];

/** Grants as seeded by the platform migrations (EMPLOYEE_CONFIDENTIAL_ACCESS is granted to no role). */
const ROLE_GRANTS: Record<string, string[]> = {
  ADMIN: [
    "COMPANY_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_KYC_REVIEW", "FLEET_MANAGE", "FLEET_MAINTENANCE_MANAGE",
    "BOOKING_MANAGE", "PARCEL_MANAGE", "EMPLOYEE_MANAGE", "CUSTOMER_MANAGE", "MARKETING_MANAGE",
    "NOTIFICATION_MANAGE", "COMPLIANCE_READ", "COMPLIANCE_MANAGE", "MONITORING_READ", "MONITORING_MANAGE",
    "RBAC_MANAGE", "USER_MANAGE",
  ],
  MANAGER: [
    "COMPANY_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_PARTNERSHIP_MANAGE", "FLEET_MANAGE", "FLEET_MAINTENANCE_MANAGE",
    "BOOKING_MANAGE", "PARCEL_MANAGE", "EMPLOYEE_MANAGE", "CUSTOMER_MANAGE", "MARKETING_MANAGE",
    "NOTIFICATION_MANAGE", "USER_MANAGE",
  ],
  GUICHETIER: ["BOOKING_MANAGE", "FLEET_MANAGE", "USER_MANAGE"],
  CHAUFFEUR: [],
  USER: [],
};

const SESSION_TTL_DAYS = 7;
const DEVICES = ["Chrome · Windows", "Safari · iPhone", "Application Android", "Firefox · Ubuntu", "Edge · Windows"];
const PLATFORM_ADMINS: { username: string; displayName: string; status: UserStatus }[] = [
  { username: "moustapha.ndiaye", displayName: "Moustapha Ndiaye", status: "active" },
  { username: "seynabou.kane", displayName: "Seynabou Kane", status: "suspended" },
];
const CLIENTS: { username: string; displayName: string; status: UserStatus }[] = [
  { username: "aissatou.sarr", displayName: "Aïssatou Sarr", status: "active" },
  { username: "pape.mbaye", displayName: "Pape Mbaye", status: "suspended" },
  { username: "ndeye.diouf", displayName: "Ndèye Diouf", status: "active" },
  { username: "lamine.camara", displayName: "Lamine Camara", status: "active" },
];
```

4. Dans `buildSeed`, remplacer l'initialisation `subscriptionHistory: [], paymentAttempts: [], retryOutcomes: {},\n  };` par :

```ts
    subscriptionHistory: [], paymentAttempts: [], retryOutcomes: {},
    users: [], roles: [], permissions: [], rolePermissions: [], sessions: [],
  };
```

5. Remplacer `  let attSeq = 1, histSeq = 1;` par :

```ts
  let attSeq = 1, histSeq = 1, userSeq = 1, sessionSeq = 1;
```

6. Juste après la ligne `  store.kycTypes = KYC_TYPES.map(…);`, ajouter :

```ts
  store.permissions = PERMISSIONS.map((p) => ({ ...p }));
  store.roles = ROLES.map((r) => ({ ...r }));
  store.rolePermissions = Object.entries(ROLE_GRANTS).flatMap(([roleCode, codes]) =>
    codes.map((permissionCode) => ({ roleCode, permissionCode })));
```

7. Dans la boucle des employés (`for (let p = 0; p < peopleCount; p++) {`), remplacer :

```ts
      const person = PEOPLE[(i + p) % PEOPLE.length]!;
      store.employees.push({
        id: uid(6, empSeq++), companyId: id, name: person,
        email: `${slugify(person)}@${slug}.sn`,
        phone: `+2217865${String(10000 + i * 211 + p * 17).padStart(5, "0")}`,
        role: roles[p]!,
      });
```

par :

```ts
      const person = PEOPLE[(i + p) % PEOPLE.length]!;
      const email = `${slugify(person)}@${slug}.sn`;
      const phone = `+2217865${String(10000 + i * 211 + p * 17).padStart(5, "0")}`;
      // A draft company has no platform account yet: its accounts are created at activation.
      const userId = status === "draft" ? null : uid(15, userSeq++);
      store.employees.push({ id: uid(6, empSeq++), companyId: id, name: person, email, phone, role: roles[p]!, userId });
      if (userId) {
        store.users.push({
          id: userId, username: `${slugify(person)}.${slug}`, displayName: person, email, phone,
          roleCode: roles[p]!, status: "active", companyId: id, lastLoginAt: null,
          createdAt: iso(-(378 - i * 15)),
        });
      }
```

8. Insérer, juste avant la ligne `  store.services = [`, le bloc :

```ts
  PLATFORM_ADMINS.forEach((a, k) => {
    store.users.push({
      id: uid(15, userSeq++), username: a.username, displayName: a.displayName, email: `${a.username}@sira.sn`,
      phone: `+22178659${String(1000 + k * 37).padStart(4, "0")}`, roleCode: "ADMIN", status: a.status,
      companyId: null, lastLoginAt: null, createdAt: iso(-(500 - k * 20)),
    });
  });
  CLIENTS.forEach((c, k) => {
    store.users.push({
      id: uid(15, userSeq++), username: c.username, displayName: c.displayName, email: `${c.username}@client.sn`,
      phone: `+22178659${String(5000 + k * 41).padStart(4, "0")}`, roleCode: "USER", status: c.status,
      companyId: null, lastLoginAt: null, createdAt: iso(-(200 - k * 20)),
    });
  });

  // Sessions: 1 to 3 per active account (some revoked, some expired); a suspended account only
  // keeps the session revoked at its suspension. lastLoginAt is the start of the newest session.
  const ip = (u: number, k: number) =>
    `${u % 2 ? "196.207" : "41.82"}.${(u * 7 + k) % 250}.${10 + ((u * 31 + k * 17) % 240)}`;
  store.users.forEach((user, u) => {
    const starts = user.status === "suspended" ? [-(20 + (u % 5))] : Array.from(
      { length: 1 + (u % 3) }, (_, k) => -(k * 3 + (u % 5) + 0.5),
    );
    starts.forEach((start, k) => {
      const revoked = user.status === "suspended" ? start + 1 : k === 1 && u % 4 === 0 ? start + 0.5 : null;
      store.sessions.push({
        id: uid(16, sessionSeq++), userId: user.id, deviceLabel: DEVICES[(u + k) % DEVICES.length]!,
        ipAddress: ip(u, k), createdAt: iso(start), lastSeenAt: iso(start + 0.25),
        expiresAt: iso(start + SESSION_TTL_DAYS),
        revokedAt: revoked === null ? null : iso(revoked),
        revokedReason: revoked === null ? null : user.status === "suspended" ? "Compte suspendu" : "Déconnexion",
      });
    });
    user.lastLoginAt = iso(Math.max(...starts));
  });
```

Notes : les identifiants de compte (`uid(15, n)`) et de session (`uid(16, n)`) ont la forme d'un UUID (le fil d'Ariane affiche « Fiche »). Les comptes d'employés sont créés deux jours après l'activation de leur compagnie (`iso(-(378 - i * 15))`), donc toujours avant leur première session (au plus 26 jours avant `now`). Le nombre de sessions dépend de l'indice du compte (`1 + (u % 3)`), la révocation « Déconnexion » de `k === 1 && u % 4 === 0` : la graine est déterministe (73 sessions actives, 10 révoquées, 18 expirées à `now`).

- [ ] **Step 4: `truncateIp` et le dépôt d'accès en lecture**

Ajouter à la fin de `src/lib/mask.ts` :

```ts

/** Truncates an IPv4 address to its /24 network (`a.b.c.0`); anything else is fully masked. */
export function truncateIp(value: string): string {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value.trim());
  if (!m || m.slice(1).some((part) => Number(part) > 255)) return "••••";
  return `${m[1]}.${m[2]}.${m[3]}.0`;
}
```

Créer `src/lib/repos/access.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import { truncateIp } from "@/lib/mask";
import type {
  ActivityEntry, PermissionDef, PermissionDomain, PlatformUser, Role, UserSession, UserStatus,
} from "@/lib/types";

/** Client-safe projection of an account: no e-mail, no phone. */
export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  status: UserStatus;
  companyId: string | null;
  companyName: string | null;
  lastLoginAt: string | null;
  activeSessions: number;
}

export type SessionState = "active" | "revoked" | "expired";

/** Client-safe projection of a session: the IP address is truncated (`a.b.c.0`). */
export interface SessionRow {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  deviceLabel: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  state: SessionState;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface RoleRow extends Role {
  userCount: number;
  permissions: PermissionDef[];
}

export interface RoleOption { code: string; name: string }

export interface PermissionMatrix {
  roles: RoleOption[];
  groups: {
    domain: PermissionDomain;
    rows: { code: string; description: string; grantedTo: string[] }[];
  }[];
}

/** Server-only detail of an account (contains the raw contact data: never pass it to a client component). */
export interface UserDetail {
  user: PlatformUser;
  role: Role | null;
  companyName: string | null;
  permissions: PermissionDef[];
  sessions: SessionRow[];
  activeSessions: number;
  activity: ActivityEntry[];
}

/** Display order of the permission domains (matrix and role details). */
export const PERMISSION_DOMAINS: readonly PermissionDomain[] = [
  "companies", "fleet", "bookings", "parcels", "hr", "customers",
  "marketing", "notifications", "compliance", "monitoring", "platform",
];

/** A session counts as active only when it is neither revoked nor expired at `now`. */
export function sessionState(session: UserSession, now: Date): SessionState {
  if (session.revokedAt !== null) return "revoked";
  return new Date(session.expiresAt).getTime() > now.getTime() ? "active" : "expired";
}

function companyName(companyId: string | null): string | null {
  if (!companyId) return null;
  return getStore().companies.find((c) => c.id === companyId)?.name ?? null;
}

function roleName(code: string): string {
  return getStore().roles.find((r) => r.code === code)?.name ?? code;
}

function permissionsOf(roleCode: string): PermissionDef[] {
  const s = getStore();
  const codes = new Set(s.rolePermissions.filter((rp) => rp.roleCode === roleCode).map((rp) => rp.permissionCode));
  return PERMISSION_DOMAINS.flatMap((d) => s.permissions.filter((p) => p.domain === d && codes.has(p.code)));
}

function activeSessionsOf(userId: string, now: Date): UserSession[] {
  return getStore().sessions.filter((x) => x.userId === userId && sessionState(x, now) === "active");
}

function sessionRow(session: UserSession, now: Date): SessionRow {
  const user = getStore().users.find((u) => u.id === session.userId);
  return {
    id: session.id, userId: session.userId, username: user?.username ?? "—",
    displayName: user?.displayName ?? "—", deviceLabel: session.deviceLabel, ip: truncateIp(session.ipAddress),
    createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt,
    state: sessionState(session, now), revokedAt: session.revokedAt, revokedReason: session.revokedReason,
  };
}

function userRow(user: PlatformUser, now: Date): UserRow {
  return {
    id: user.id, username: user.username, displayName: user.displayName, roleCode: user.roleCode,
    roleName: roleName(user.roleCode), status: user.status, companyId: user.companyId,
    companyName: companyName(user.companyId), lastLoginAt: user.lastLoginAt,
    activeSessions: activeSessionsOf(user.id, now).length,
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

export const usersRepo = {
  listRows(filter: { roleCode?: string; status?: UserStatus } = {}, now: Date = new Date()): UserRow[] {
    return getStore().users
      .filter((u) => (!filter.roleCode || u.roleCode === filter.roleCode) && (!filter.status || u.status === filter.status))
      .map((u) => userRow(u, now))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr") || a.username.localeCompare(b.username));
  },

  get(id: string): PlatformUser | undefined {
    return getStore().users.find((u) => u.id === id);
  },

  detail(id: string, now: Date = new Date()): UserDetail | undefined {
    const s = getStore();
    const user = s.users.find((u) => u.id === id);
    if (!user) return undefined;
    const sessions = s.sessions
      .filter((x) => x.userId === id)
      .sort(byNewest((x) => x.createdAt))
      .map((x) => sessionRow(x, now));
    return {
      user,
      role: s.roles.find((r) => r.code === user.roleCode) ?? null,
      companyName: companyName(user.companyId),
      permissions: permissionsOf(user.roleCode),
      sessions,
      activeSessions: sessions.filter((x) => x.state === "active").length,
      activity: s.activity.filter((a) => a.userId === id).sort(byNewest((a) => a.at)),
    };
  },
};

export const rolesRepo = {
  list(): Role[] {
    return getStore().roles;
  },

  options(): RoleOption[] {
    return getStore().roles.map((r) => ({ code: r.code, name: r.name }));
  },

  listRows(): RoleRow[] {
    const s = getStore();
    return s.roles.map((r) => ({
      code: r.code, name: r.name, description: r.description,
      userCount: s.users.filter((u) => u.roleCode === r.code).length,
      permissions: permissionsOf(r.code),
    }));
  },
};

export const permissionsRepo = {
  list(): PermissionDef[] {
    return getStore().permissions;
  },

  matrix(): PermissionMatrix {
    const s = getStore();
    return {
      roles: rolesRepo.options(),
      groups: PERMISSION_DOMAINS
        .map((domain) => ({
          domain,
          rows: s.permissions.filter((p) => p.domain === domain).map((p) => ({
            code: p.code, description: p.description,
            grantedTo: s.roles
              .filter((r) => s.rolePermissions.some((rp) => rp.roleCode === r.code && rp.permissionCode === p.code))
              .map((r) => r.code),
          })),
        }))
        .filter((g) => g.rows.length > 0),
    };
  },
};

export const sessionsRepo = {
  /** Active sessions of the whole platform, most recently seen first. */
  activeRows(filter: { roleCode?: string } = {}, now: Date = new Date()): SessionRow[] {
    const s = getStore();
    return s.sessions
      .filter((x) => sessionState(x, now) === "active")
      .filter((x) => !filter.roleCode || s.users.find((u) => u.id === x.userId)?.roleCode === filter.roleCode)
      .sort(byNewest((x) => x.lastSeenAt))
      .map((x) => sessionRow(x, now));
  },

  get(id: string): UserSession | undefined {
    return getStore().sessions.find((x) => x.id === id);
  },
};
```

Notes : `sessionState` est la seule source de vérité de « active » ; elle compare `expiresAt` à la date injectée (jamais `Date.now()` caché). Les projections `userRow` et `sessionRow` construisent chaque clé explicitement (jamais de `...user`) : un champ ajouté plus tard à `PlatformUser` ou `UserSession` n'atteint pas le client par accident. `UserDetail` contient `PlatformUser` (avec ses contacts) : il n'est consommé que par des Server Components.

Run: `pnpm typecheck && pnpm test` → **217 tests** verts (181 + 17 `access-seed` + 17 `access-repo` + 2 `truncateIp`).

- [ ] **Step 5: Prouver les gardes de lecture**

1. Dans `sessionState`, remplacer temporairement `return new Date(session.expiresAt).getTime() > now.getTime() ? "active" : "expired";` par `return "active";`. Run `pnpm test tests/unit/access-seed.test.ts tests/unit/access-repo.test.ts` → FAIL sur `has active, revoked and expired sessions`, `counts active sessions against the injected date, never an expired one`, `counts no revoked session as active`, `lists only active sessions, most recently seen first` et `drops a session once it expires`. Restaurer → PASS.
2. Dans `sessionRow`, remplacer temporairement `ip: truncateIp(session.ipAddress)` par `ip: session.ipAddress`. Run → FAIL sur `projects the sessions without the full IP address` et `truncates every IP address to a.b.c.0`. Restaurer → PASS.
3. Dans `userRow`, ajouter temporairement `email: user.email,` à l'objet renvoyé (et `email: string;` à `UserRow` pour compiler). Run → FAIL sur `returns a projection without contact data, field by field`. Restaurer → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/index.ts src/lib/data/seed.ts src/lib/mask.ts src/lib/repos/access.ts tests/unit/access-seed.test.ts tests/unit/access-repo.test.ts tests/unit/mask.test.ts
git commit -m "feat: platform accounts, roles, permissions and sessions seed with read repositories

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Règles de mutation (changement de rôle, révocations, révélation) (TDD)

**Files:**
- Modify: `src/lib/repos/activity.ts`, `src/lib/repos/access.ts`
- Create: `tests/unit/access-rules.test.ts`

**Interfaces:**
- Consumes: le dépôt de la Task 1, `getStore()`.
- Produces:
  - `addActivity(companyId: string | null, actor: string, action: string, now?: Date, userId?: string): ActivityEntry` (le 5ᵉ paramètre est facultatif ; les appels existants ne changent pas).
  - `ROLE_CHANGE_REASON = "Changement de rôle"`.
  - `usersRepo.changeRole(userId: string, roleCode: string, reason: string, actor?: string, now?: Date): { user: PlatformUser; revoked: number }`.
  - `usersRepo.revokeAllSessions(userId: string, reason: string, actor?: string, now?: Date): number`.
  - `usersRepo.logReveal(userId: string, field: "email" | "phone", actor?: string, now?: Date): void`.
  - `sessionsRepo.revoke(sessionId: string, reason: string, actor?: string, now?: Date): UserSession`.
  - Messages d'erreur (en français, renvoyés tels quels par les actions) : `Utilisateur introuvable`, `Rôle inconnu`, `Un motif est obligatoire`, `Le compte a déjà ce rôle`, `Impossible de changer son propre rôle`, `Impossible de rétrograder le dernier administrateur actif`, `Aucune session active à révoquer`, `Session introuvable`, `La session est déjà révoquée ou expirée`.

- [ ] **Step 1: Tests des règles (échouants)**

Créer `tests/unit/access-rules.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { ROLE_CHANGE_REASON, sessionState, sessionsRepo, usersRepo } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const ACTOR = "tester@sira.app";
beforeEach(() => resetStore(NOW));

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;
const sessionsOf = (userId: string) => getStore().sessions.filter((x) => x.userId === userId);
const activeOf = (userId: string) => sessionsOf(userId).filter((x) => sessionState(x, NOW) === "active");
const snapshot = (userId: string) => JSON.stringify(sessionsOf(userId));

describe("usersRepo.changeRole", () => {
  it("changes the role and revokes every active session with the role-change reason", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(activeOf(u.id)).toHaveLength(2);
    const r = usersRepo.changeRole(u.id, "MANAGER", "  Promotion  ", ACTOR, NOW);
    expect(r.revoked).toBe(2);
    expect(u.roleCode).toBe("MANAGER");
    expect(activeOf(u.id)).toHaveLength(0);
    for (const x of sessionsOf(u.id)) {
      expect(x.revokedAt).toBe(NOW.toISOString());
      expect(x.revokedReason).toBe(ROLE_CHANGE_REASON);
    }
  });

  it("leaves already revoked and expired sessions untouched", () => {
    const u = userBy("mariama-ba.dakar-voyages");
    const [, revoked, expired] = [...sessionsOf(u.id)];
    const before = [JSON.stringify(revoked), JSON.stringify(expired)];
    expect(usersRepo.changeRole(u.id, "GUICHETIER", "Réorganisation", ACTOR, NOW).revoked).toBe(1);
    expect([JSON.stringify(revoked), JSON.stringify(expired)]).toEqual(before);
  });

  it("writes one platform activity entry tied to the account, with the reason and no contact data", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const n = getStore().activity.length;
    usersRepo.changeRole(u.id, "MANAGER", "Promotion", ACTOR, NOW);
    expect(getStore().activity.length).toBe(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR, at: NOW.toISOString(),
      action: "Rôle de ibrahima-sow.dakar-voyages changé : Agent de vente → Responsable de compagnie (2 session(s) révoquée(s)). Motif : Promotion",
    });
    expect(entry.action).not.toContain(u.email);
    expect(entry.action).not.toContain(u.phone);
  });

  it("refuses an unknown account or an unknown role and changes nothing", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const before = snapshot(u.id);
    expect(() => usersRepo.changeRole("nope", "MANAGER", "x", ACTOR, NOW)).toThrow("Utilisateur introuvable");
    expect(() => usersRepo.changeRole(u.id, "SUPERADMIN", "x", ACTOR, NOW)).toThrow("Rôle inconnu");
    expect(u.roleCode).toBe("GUICHETIER");
    expect(snapshot(u.id)).toBe(before);
  });

  it("refuses a blank reason", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "   ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
    expect(u.roleCode).toBe("GUICHETIER");
  });

  it("refuses the role the account already has and revokes nothing", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const before = snapshot(u.id);
    const n = getStore().activity.length;
    expect(() => usersRepo.changeRole(u.id, "GUICHETIER", "x", ACTOR, NOW)).toThrow("Le compte a déjà ce rôle");
    expect(snapshot(u.id)).toBe(before);
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses to change one's own role, whether the actor is the e-mail or the username", () => {
    const u = userBy("lamine.camara");
    const before = snapshot(u.id);
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "x", u.email, NOW)).toThrow("Impossible de changer son propre rôle");
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "x", u.username, NOW)).toThrow("Impossible de changer son propre rôle");
    expect(u.roleCode).toBe("USER");
    expect(snapshot(u.id)).toBe(before);
  });

  it("refuses to demote the last active administrator and revokes nothing", () => {
    const admin = userBy("moustapha.ndiaye");
    const before = snapshot(admin.id);
    expect(() => usersRepo.changeRole(admin.id, "MANAGER", "x", ACTOR, NOW))
      .toThrow("Impossible de rétrograder le dernier administrateur actif");
    expect(admin.roleCode).toBe("ADMIN");
    expect(snapshot(admin.id)).toBe(before);
  });

  it("allows demoting an administrator once another one is active, and a suspended administrator anytime", () => {
    usersRepo.changeRole(userBy("seynabou.kane").id, "USER", "Départ", ACTOR, NOW);
    expect(userBy("seynabou.kane").roleCode).toBe("USER");
    usersRepo.changeRole(userBy("lamine.camara").id, "ADMIN", "Renfort", ACTOR, NOW);
    usersRepo.changeRole(userBy("moustapha.ndiaye").id, "MANAGER", "Rotation", ACTOR, NOW);
    expect(userBy("moustapha.ndiaye").roleCode).toBe("MANAGER");
  });
});

describe("usersRepo.revokeAllSessions", () => {
  it("revokes every active session with the given reason and logs it", () => {
    const u = userBy("lamine.camara");
    expect(usersRepo.revokeAllSessions(u.id, "  Appareil perdu  ", ACTOR, NOW)).toBe(3);
    expect(activeOf(u.id)).toHaveLength(0);
    expect(sessionsOf(u.id).every((x) => x.revokedReason === "Appareil perdu" && x.revokedAt === NOW.toISOString())).toBe(true);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR,
      action: "3 session(s) de lamine.camara révoquée(s). Motif : Appareil perdu",
    });
  });

  it("refuses when nothing is active and writes nothing", () => {
    const suspended = userBy("pape.mbaye");
    const n = getStore().activity.length;
    const before = snapshot(suspended.id);
    expect(() => usersRepo.revokeAllSessions(suspended.id, "x", ACTOR, NOW)).toThrow("Aucune session active à révoquer");
    expect(snapshot(suspended.id)).toBe(before);
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses a second revocation and an unknown account or a blank reason", () => {
    const u = userBy("lamine.camara");
    usersRepo.revokeAllSessions(u.id, "x", ACTOR, NOW);
    expect(() => usersRepo.revokeAllSessions(u.id, "x", ACTOR, NOW)).toThrow("Aucune session active à révoquer");
    expect(() => usersRepo.revokeAllSessions("nope", "x", ACTOR, NOW)).toThrow("Utilisateur introuvable");
    expect(() => usersRepo.revokeAllSessions(userBy("ndeye.diouf").id, " ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
  });
});

describe("sessionsRepo.revoke", () => {
  it("revokes one active session only, with the reason, and logs it on the account", () => {
    const u = userBy("lamine.camara");
    const target = activeOf(u.id)[1]!;
    sessionsRepo.revoke(target.id, "Session suspecte", ACTOR, NOW);
    expect(target.revokedAt).toBe(NOW.toISOString());
    expect(target.revokedReason).toBe("Session suspecte");
    expect(activeOf(u.id)).toHaveLength(2);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id,
      action: `Session de lamine.camara révoquée (${target.deviceLabel}). Motif : Session suspecte`,
    });
  });

  it("refuses an already revoked or an expired session and changes nothing", () => {
    const s = getStore();
    const revoked = s.sessions.find((x) => sessionState(x, NOW) === "revoked")!;
    const expired = s.sessions.find((x) => sessionState(x, NOW) === "expired")!;
    const before = [JSON.stringify(revoked), JSON.stringify(expired)];
    expect(() => sessionsRepo.revoke(revoked.id, "x", ACTOR, NOW)).toThrow("La session est déjà révoquée ou expirée");
    expect(() => sessionsRepo.revoke(expired.id, "x", ACTOR, NOW)).toThrow("La session est déjà révoquée ou expirée");
    expect([JSON.stringify(revoked), JSON.stringify(expired)]).toEqual(before);
  });

  it("refuses an unknown session or a blank reason", () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(() => sessionsRepo.revoke("nope", "x", ACTOR, NOW)).toThrow("Session introuvable");
    expect(() => sessionsRepo.revoke(target.id, "  ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
    expect(target.revokedAt).toBeNull();
  });
});

describe("usersRepo.logReveal", () => {
  it("logs the field on the account, never the value", () => {
    const u = userBy("khady-faye.matam-express");
    usersRepo.logReveal(u.id, "phone", ACTOR, NOW);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR,
      action: "Donnée personnelle révélée : téléphone de khady-faye.matam-express",
    });
    expect(() => usersRepo.logReveal("nope", "email", ACTOR, NOW)).toThrow("Utilisateur introuvable");
  });

  it("shows the reveal on the account activity tab", () => {
    const u = userBy("khady-faye.matam-express");
    usersRepo.logReveal(u.id, "email", ACTOR, NOW);
    expect(usersRepo.detail(u.id, NOW)!.activity.map((a) => a.action))
      .toEqual(["Donnée personnelle révélée : e-mail de khady-faye.matam-express"]);
  });
});

describe("activity log stays free of contact data", () => {
  it("contains no account e-mail or phone after every kind of access action", () => {
    const s = getStore();
    usersRepo.changeRole(userBy("ibrahima-sow.dakar-voyages").id, "MANAGER", "Promotion", ACTOR, NOW);
    usersRepo.revokeAllSessions(userBy("lamine.camara").id, "Appareil perdu", ACTOR, NOW);
    sessionsRepo.revoke(activeOf(userBy("ndeye.diouf").id)[0]!.id, "Suspecte", ACTOR, NOW);
    usersRepo.logReveal(userBy("khady-faye.matam-express").id, "email", ACTOR, NOW);
    usersRepo.logReveal(userBy("khady-faye.matam-express").id, "phone", ACTOR, NOW);
    const log = JSON.stringify(s.activity);
    expect(s.activity.filter((a) => a.userId !== undefined)).toHaveLength(5);
    for (const u of s.users) {
      expect(log).not.toContain(u.email);
      expect(log).not.toContain(u.phone);
    }
  });
});
```

Run: `pnpm test tests/unit/access-rules.test.ts` → FAIL (`ROLE_CHANGE_REASON` est `undefined`, `usersRepo.changeRole is not a function`, etc.).

- [ ] **Step 2: Implémenter**

Remplacer intégralement `src/lib/repos/activity.ts` par :

```ts
import { getStore } from "@/lib/repos/store";
import type { ActivityEntry } from "@/lib/types";

let actCounter = 1;

/**
 * Appends to the activity log. Callers pass labels and identifiers only, never contact data.
 * `userId` ties the entry to a platform account (shown on that account's activity tab).
 */
export function addActivity(
  companyId: string | null, actor: string, action: string, now: Date = new Date(), userId?: string,
): ActivityEntry {
  const entry: ActivityEntry = {
    id: `act-${now.getTime()}-${actCounter++}`, companyId, at: now.toISOString(), actor, action,
    ...(userId ? { userId } : {}),
  };
  getStore().activity.unshift(entry);
  return entry;
}
```

Remplacer intégralement `src/lib/repos/access.ts` par :

```ts
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import { truncateIp } from "@/lib/mask";
import type {
  ActivityEntry, PermissionDef, PermissionDomain, PlatformUser, Role, UserSession, UserStatus,
} from "@/lib/types";

/** Client-safe projection of an account: no e-mail, no phone. */
export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  status: UserStatus;
  companyId: string | null;
  companyName: string | null;
  lastLoginAt: string | null;
  activeSessions: number;
}

export type SessionState = "active" | "revoked" | "expired";

/** Client-safe projection of a session: the IP address is truncated (`a.b.c.0`). */
export interface SessionRow {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  deviceLabel: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  state: SessionState;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface RoleRow extends Role {
  userCount: number;
  permissions: PermissionDef[];
}

export interface RoleOption { code: string; name: string }

export interface PermissionMatrix {
  roles: RoleOption[];
  groups: {
    domain: PermissionDomain;
    rows: { code: string; description: string; grantedTo: string[] }[];
  }[];
}

/** Server-only detail of an account (contains the raw contact data: never pass it to a client component). */
export interface UserDetail {
  user: PlatformUser;
  role: Role | null;
  companyName: string | null;
  permissions: PermissionDef[];
  sessions: SessionRow[];
  activeSessions: number;
  activity: ActivityEntry[];
}

/** Display order of the permission domains (matrix and role details). */
export const PERMISSION_DOMAINS: readonly PermissionDomain[] = [
  "companies", "fleet", "bookings", "parcels", "hr", "customers",
  "marketing", "notifications", "compliance", "monitoring", "platform",
];

export const ROLE_CHANGE_REASON = "Changement de rôle";

/** A session counts as active only when it is neither revoked nor expired at `now`. */
export function sessionState(session: UserSession, now: Date): SessionState {
  if (session.revokedAt !== null) return "revoked";
  return new Date(session.expiresAt).getTime() > now.getTime() ? "active" : "expired";
}

function companyName(companyId: string | null): string | null {
  if (!companyId) return null;
  return getStore().companies.find((c) => c.id === companyId)?.name ?? null;
}

function roleName(code: string): string {
  return getStore().roles.find((r) => r.code === code)?.name ?? code;
}

function permissionsOf(roleCode: string): PermissionDef[] {
  const s = getStore();
  const codes = new Set(s.rolePermissions.filter((rp) => rp.roleCode === roleCode).map((rp) => rp.permissionCode));
  return PERMISSION_DOMAINS.flatMap((d) => s.permissions.filter((p) => p.domain === d && codes.has(p.code)));
}

function activeSessionsOf(userId: string, now: Date): UserSession[] {
  return getStore().sessions.filter((x) => x.userId === userId && sessionState(x, now) === "active");
}

function sessionRow(session: UserSession, now: Date): SessionRow {
  const user = getStore().users.find((u) => u.id === session.userId);
  return {
    id: session.id, userId: session.userId, username: user?.username ?? "—",
    displayName: user?.displayName ?? "—", deviceLabel: session.deviceLabel, ip: truncateIp(session.ipAddress),
    createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt,
    state: sessionState(session, now), revokedAt: session.revokedAt, revokedReason: session.revokedReason,
  };
}

function userRow(user: PlatformUser, now: Date): UserRow {
  return {
    id: user.id, username: user.username, displayName: user.displayName, roleCode: user.roleCode,
    roleName: roleName(user.roleCode), status: user.status, companyId: user.companyId,
    companyName: companyName(user.companyId), lastLoginAt: user.lastLoginAt,
    activeSessions: activeSessionsOf(user.id, now).length,
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

function requireUser(id: string): PlatformUser {
  const user = getStore().users.find((u) => u.id === id);
  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

function requireMotif(reason: string): string {
  const motif = reason.trim();
  if (!motif) throw new Error("Un motif est obligatoire");
  return motif;
}

function revoke(session: UserSession, reason: string, now: Date): void {
  session.revokedAt = now.toISOString();
  session.revokedReason = reason;
}

export const usersRepo = {
  listRows(filter: { roleCode?: string; status?: UserStatus } = {}, now: Date = new Date()): UserRow[] {
    return getStore().users
      .filter((u) => (!filter.roleCode || u.roleCode === filter.roleCode) && (!filter.status || u.status === filter.status))
      .map((u) => userRow(u, now))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr") || a.username.localeCompare(b.username));
  },

  get(id: string): PlatformUser | undefined {
    return getStore().users.find((u) => u.id === id);
  },

  detail(id: string, now: Date = new Date()): UserDetail | undefined {
    const s = getStore();
    const user = s.users.find((u) => u.id === id);
    if (!user) return undefined;
    const sessions = s.sessions
      .filter((x) => x.userId === id)
      .sort(byNewest((x) => x.createdAt))
      .map((x) => sessionRow(x, now));
    return {
      user,
      role: s.roles.find((r) => r.code === user.roleCode) ?? null,
      companyName: companyName(user.companyId),
      permissions: permissionsOf(user.roleCode),
      sessions,
      activeSessions: sessions.filter((x) => x.state === "active").length,
      activity: s.activity.filter((a) => a.userId === id).sort(byNewest((a) => a.at)),
    };
  },

  /**
   * Changes the role of an account and revokes all its active sessions (as `PATCH /api/users/{id}/role`).
   * `actor` is the identity of the session (e-mail or username): nobody changes their own role.
   */
  changeRole(
    userId: string, roleCode: string, reason: string, actor = "admin@sira.app", now: Date = new Date(),
  ): { user: PlatformUser; revoked: number } {
    const s = getStore();
    const user = requireUser(userId);
    if (!s.roles.some((r) => r.code === roleCode)) throw new Error("Rôle inconnu");
    const motif = requireMotif(reason);
    if (user.roleCode === roleCode) throw new Error("Le compte a déjà ce rôle");
    if (actor === user.email || actor === user.username) {
      throw new Error("Impossible de changer son propre rôle");
    }
    const activeAdmins = s.users.filter((u) => u.roleCode === "ADMIN" && u.status === "active");
    if (user.roleCode === "ADMIN" && user.status === "active" && activeAdmins.length === 1) {
      throw new Error("Impossible de rétrograder le dernier administrateur actif");
    }
    const previous = user.roleCode;
    user.roleCode = roleCode;
    const active = activeSessionsOf(user.id, now);
    for (const session of active) revoke(session, ROLE_CHANGE_REASON, now);
    addActivity(
      null, actor,
      `Rôle de ${user.username} changé : ${roleName(previous)} → ${roleName(roleCode)} (${active.length} session(s) révoquée(s)). Motif : ${motif}`,
      now, user.id,
    );
    return { user, revoked: active.length };
  },

  revokeAllSessions(userId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): number {
    const user = requireUser(userId);
    const motif = requireMotif(reason);
    const active = activeSessionsOf(user.id, now);
    if (active.length === 0) throw new Error("Aucune session active à révoquer");
    for (const session of active) revoke(session, motif, now);
    addActivity(null, actor, `${active.length} session(s) de ${user.username} révoquée(s). Motif : ${motif}`, now, user.id);
    return active.length;
  },

  logReveal(userId: string, field: "email" | "phone", actor = "admin@sira.app", now: Date = new Date()): void {
    const user = requireUser(userId);
    addActivity(
      null, actor,
      `Donnée personnelle révélée : ${field === "email" ? "e-mail" : "téléphone"} de ${user.username}`,
      now, user.id,
    );
  },
};

export const rolesRepo = {
  list(): Role[] {
    return getStore().roles;
  },

  options(): RoleOption[] {
    return getStore().roles.map((r) => ({ code: r.code, name: r.name }));
  },

  listRows(): RoleRow[] {
    const s = getStore();
    return s.roles.map((r) => ({
      code: r.code, name: r.name, description: r.description,
      userCount: s.users.filter((u) => u.roleCode === r.code).length,
      permissions: permissionsOf(r.code),
    }));
  },
};

export const permissionsRepo = {
  list(): PermissionDef[] {
    return getStore().permissions;
  },

  matrix(): PermissionMatrix {
    const s = getStore();
    return {
      roles: rolesRepo.options(),
      groups: PERMISSION_DOMAINS
        .map((domain) => ({
          domain,
          rows: s.permissions.filter((p) => p.domain === domain).map((p) => ({
            code: p.code, description: p.description,
            grantedTo: s.roles
              .filter((r) => s.rolePermissions.some((rp) => rp.roleCode === r.code && rp.permissionCode === p.code))
              .map((r) => r.code),
          })),
        }))
        .filter((g) => g.rows.length > 0),
    };
  },
};

export const sessionsRepo = {
  /** Active sessions of the whole platform, most recently seen first. */
  activeRows(filter: { roleCode?: string } = {}, now: Date = new Date()): SessionRow[] {
    const s = getStore();
    return s.sessions
      .filter((x) => sessionState(x, now) === "active")
      .filter((x) => !filter.roleCode || s.users.find((u) => u.id === x.userId)?.roleCode === filter.roleCode)
      .sort(byNewest((x) => x.lastSeenAt))
      .map((x) => sessionRow(x, now));
  },

  get(id: string): UserSession | undefined {
    return getStore().sessions.find((x) => x.id === id);
  },

  revoke(sessionId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): UserSession {
    const session = getStore().sessions.find((x) => x.id === sessionId);
    if (!session) throw new Error("Session introuvable");
    const motif = requireMotif(reason);
    if (sessionState(session, now) !== "active") throw new Error("La session est déjà révoquée ou expirée");
    revoke(session, motif, now);
    const user = getStore().users.find((u) => u.id === session.userId);
    addActivity(
      null, actor, `Session de ${user?.username ?? "compte inconnu"} révoquée (${session.deviceLabel}). Motif : ${motif}`,
      now, session.userId,
    );
    return session;
  },
};
```

Notes : chaque mutation vérifie tout **avant** d'écrire (aucun état partiel si une garde refuse). Le changement de rôle révoque les sessions actives à la date injectée avec le motif fixe « Changement de rôle » (comme `PATCH /api/users/{id}/role`), et écrit une seule entrée d'activité ; une session déjà révoquée ou expirée n'est pas réécrite. L'entrée d'activité contient l'identifiant (`username`), les noms de rôles et le motif, jamais l'e-mail ni le téléphone.

Run: `pnpm typecheck && pnpm test` → **235 tests** verts (217 + 18).

- [ ] **Step 3: Prouver les gardes**

Pour chaque ligne, appliquer la mutation seule dans `src/lib/repos/access.ts`, lancer `pnpm test tests/unit/access-rules.test.ts`, constater l'échec du ou des tests nommés, restaurer la ligne d'origine, relancer → PASS :

| Mutation | Test(s) qui doivent échouer |
|---|---|
| `if (actor === user.email \|\| actor === user.username) {` → `if (false) {` | `refuses to change one's own role, whether the actor is the e-mail or the username` |
| `if (user.roleCode === "ADMIN" && user.status === "active" && activeAdmins.length === 1) {` → `if (false) {` | `refuses to demote the last active administrator and revokes nothing` |
| supprimer la ligne `for (const session of active) revoke(session, ROLE_CHANGE_REASON, now);` | `changes the role and revokes every active session with the role-change reason` |
| supprimer la ligne `if (user.roleCode === roleCode) throw new Error("Le compte a déjà ce rôle");` | `refuses the role the account already has and revokes nothing` |
| supprimer la ligne `if (!s.roles.some((r) => r.code === roleCode)) throw new Error("Rôle inconnu");` | `refuses an unknown account or an unknown role and changes nothing` |
| supprimer la ligne `if (active.length === 0) throw new Error("Aucune session active à révoquer");` | `refuses when nothing is active and writes nothing`, `refuses a second revocation and an unknown account or a blank reason` |
| supprimer la ligne `if (sessionState(session, now) !== "active") throw new Error("La session est déjà révoquée ou expirée");` | `refuses an already revoked or an expired session and changes nothing` |

- [ ] **Step 4: Commit**

```bash
git add src/lib/repos/activity.ts src/lib/repos/access.ts tests/unit/access-rules.test.ts
git commit -m "feat: role change with session revocation, session revocation and journaled contact reveal rules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Server Actions (changement de rôle, révocations, révélation) (TDD)

**Files:**
- Modify: `src/lib/actions/run.ts`, `tests/unit/run-action.test.ts`
- Create: `src/app/(admin)/utilisateurs/actions.ts`, `src/app/(admin)/acces/actions.ts`, `tests/unit/access-actions.test.ts`

**Interfaces:**
- Consumes: `run`, `requireString`, `requireReason`, `errorMessage`, `SESSION_EXPIRED` (lot 2) ; `usersRepo`, `sessionsRepo` (Task 2).
- Produces:
  - `src/lib/actions/run.ts` : `type RevealResult = { ok: true; value: string } | { ok: false; error: string }`, `runReveal(body: (actor: string) => string): Promise<RevealResult>`.
  - `src/app/(admin)/utilisateurs/actions.ts` : `changeUserRole(userId: string, roleCode: string, reason: string): Promise<ActionResult>`, `revokeUserSessions(userId: string, reason: string): Promise<ActionResult>`, `revealUserContact(userId: string, field: "email" | "phone"): Promise<RevealResult>`.
  - `src/app/(admin)/acces/actions.ts` : `revokeSession(sessionId: string, reason: string): Promise<ActionResult>`.
  - Chemins revalidés : `/utilisateurs`, `/utilisateurs/<id>`, `/acces/roles`, `/acces/sessions`.

- [ ] **Step 1: Tests (échouants)**

Dans `tests/unit/run-action.test.ts`, remplacer `import { errorMessage, requireReason, run } from "@/lib/actions/run";` par `import { errorMessage, requireReason, run, runReveal } from "@/lib/actions/run";` et ajouter à la fin du fichier :

```ts

describe("runReveal", () => {
  it("never runs the body nor returns a value without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const body = vi.fn(() => "secret@example.sn");
    const r = await runReveal(body);
    expect(r).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
    expect("value" in r).toBe(false);
    expect(body).not.toHaveBeenCalled();
  });

  it("returns the value with the session subject as the actor", async () => {
    const body = vi.fn(() => "valeur");
    expect(await runReveal(body)).toEqual({ ok: true, value: "valeur" });
    expect(body).toHaveBeenCalledWith("tester@sira.app");
  });

  it("turns a thrown error into an error result without a value", async () => {
    const r = await runReveal(() => { throw new Error("Utilisateur introuvable"); });
    expect(r).toEqual({ ok: false, error: "Utilisateur introuvable" });
  });
});
```

Créer `tests/unit/access-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { revokeSession } from "@/app/(admin)/acces/actions";
import { changeUserRole, revealUserContact, revokeUserSessions } from "@/app/(admin)/utilisateurs/actions";
import { sessionState } from "@/lib/repos/access";
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

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;
const activeOf = (userId: string) =>
  getStore().sessions.filter((x) => x.userId === userId && sessionState(x, new Date()) === "active");
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("without a session nothing is read or written", () => {
  beforeEach(() => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
  });

  it("changeUserRole", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const n = getStore().activity.length;
    expect(await changeUserRole(u.id, "MANAGER", "motif")).toEqual(EXPIRED);
    expect(u.roleCode).toBe("GUICHETIER");
    expect(activeOf(u.id)).toHaveLength(2);
    expect(getStore().activity.length).toBe(n);
  });

  it("revokeUserSessions", async () => {
    const u = userBy("lamine.camara");
    expect(await revokeUserSessions(u.id, "motif")).toEqual(EXPIRED);
    expect(activeOf(u.id)).toHaveLength(3);
  });

  it("revokeSession", async () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(await revokeSession(target.id, "motif")).toEqual(EXPIRED);
    expect(target.revokedAt).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revealUserContact returns no value and logs nothing", async () => {
    const n = getStore().activity.length;
    const r = await revealUserContact(userBy("khady-faye.matam-express").id, "email");
    expect(r).toEqual(EXPIRED);
    expect("value" in r).toBe(false);
    expect(getStore().activity.length).toBe(n);
  });
});

describe("changeUserRole", () => {
  it("changes the role by the session actor, revokes the sessions and revalidates", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(await changeUserRole(u.id, "MANAGER", "  Promotion  ")).toEqual({ ok: true });
    expect(u.roleCode).toBe("MANAGER");
    expect(activeOf(u.id)).toHaveLength(0);
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", userId: u.id });
    expect(getStore().activity[0]!.action).toMatch(/Motif : Promotion$/);
    expect(paths()).toEqual(expect.arrayContaining([
      "/utilisateurs", `/utilisateurs/${u.id}`, "/acces/roles", "/acces/sessions",
    ]));
  });

  it("refuses a blank reason, 501 characters, and accepts exactly 500", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(await changeUserRole(u.id, "MANAGER", "   ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await changeUserRole(u.id, "MANAGER", "x".repeat(501))).toEqual(TOO_LONG);
    expect(u.roleCode).toBe("GUICHETIER");
    expect(await changeUserRole(u.id, "MANAGER", "x".repeat(500))).toEqual({ ok: true });
  });

  it("refuses invalid identifiers and returns the repository refusals", async () => {
    expect(await changeUserRole("", "MANAGER", "x")).toEqual({ ok: false, error: "Utilisateur invalide" });
    expect(await changeUserRole(userBy("lamine.camara").id, 42 as never, "x")).toEqual({ ok: false, error: "Rôle invalide" });
    expect(await changeUserRole(userBy("lamine.camara").id, "ROOT", "x")).toEqual({ ok: false, error: "Rôle inconnu" });
    expect(await changeUserRole(userBy("moustapha.ndiaye").id, "MANAGER", "x")).toEqual({
      ok: false, error: "Impossible de rétrograder le dernier administrateur actif",
    });
  });

  it("refuses to change the role of the account matching the session identity", async () => {
    const u = userBy("lamine.camara");
    requireSession.mockResolvedValue({ ...session, sub: u.email });
    expect(await changeUserRole(u.id, "MANAGER", "x")).toEqual({ ok: false, error: "Impossible de changer son propre rôle" });
    expect(u.roleCode).toBe("USER");
  });
});

describe("revokeUserSessions", () => {
  it("revokes every active session and revalidates", async () => {
    const u = userBy("lamine.camara");
    expect(await revokeUserSessions(u.id, "Appareil perdu")).toEqual({ ok: true });
    expect(activeOf(u.id)).toHaveLength(0);
    expect(paths()).toEqual(expect.arrayContaining(["/acces/sessions", `/utilisateurs/${u.id}`]));
  });

  it("returns the refusal when nothing is active, and refuses a too long reason", async () => {
    expect(await revokeUserSessions(userBy("pape.mbaye").id, "x")).toEqual({ ok: false, error: "Aucune session active à révoquer" });
    expect(await revokeUserSessions(userBy("lamine.camara").id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(activeOf(userBy("lamine.camara").id)).toHaveLength(3);
  });
});

describe("revokeSession", () => {
  it("revokes the session by the session actor and revalidates the account page", async () => {
    const u = userBy("lamine.camara");
    const target = activeOf(u.id)[0]!;
    expect(await revokeSession(target.id, "Session suspecte")).toEqual({ ok: true });
    expect(target.revokedReason).toBe("Session suspecte");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", userId: u.id });
    expect(paths()).toEqual(expect.arrayContaining(["/acces/sessions", "/utilisateurs", `/utilisateurs/${u.id}`]));
  });

  it("refuses a blank or too long reason, an invalid id and an already revoked session", async () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(await revokeSession(target.id, " ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await revokeSession(target.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(await revokeSession("", "x")).toEqual({ ok: false, error: "Session invalide" });
    expect(target.revokedAt).toBeNull();
    await revokeSession(target.id, "x");
    expect(await revokeSession(target.id, "x")).toEqual({ ok: false, error: "La session est déjà révoquée ou expirée" });
  });
});

describe("revealUserContact", () => {
  it("returns the value only after journaling, by the session actor", async () => {
    const u = userBy("khady-faye.matam-express");
    expect(await revealUserContact(u.id, "email")).toEqual({ ok: true, value: "khady-faye@matam-express.sn" });
    expect(await revealUserContact(u.id, "phone")).toEqual({ ok: true, value: u.phone });
    expect(getStore().activity.slice(0, 2).map((a) => [a.actor, a.userId, a.action])).toEqual([
      ["tester@sira.app", u.id, "Donnée personnelle révélée : téléphone de khady-faye.matam-express"],
      ["tester@sira.app", u.id, "Donnée personnelle révélée : e-mail de khady-faye.matam-express"],
    ]);
    expect(paths()).toContain(`/utilisateurs/${u.id}`);
  });

  it("refuses an invalid field or an unknown account without logging", async () => {
    const n = getStore().activity.length;
    const bad = await revealUserContact(userBy("khady-faye.matam-express").id, "address" as never);
    expect(bad).toEqual({ ok: false, error: "Champ invalide" });
    expect(await revealUserContact("nope", "email")).toEqual({ ok: false, error: "Utilisateur introuvable" });
    expect(await revealUserContact("", "email")).toEqual({ ok: false, error: "Utilisateur invalide" });
    expect(getStore().activity.length).toBe(n);
  });
});
```

Run: `pnpm test tests/unit/run-action.test.ts tests/unit/access-actions.test.ts` → FAIL (`runReveal` n'est pas une fonction ; modules `@/app/(admin)/acces/actions` et `@/app/(admin)/utilisateurs/actions` introuvables).

- [ ] **Step 2: Implémenter**

Ajouter à la fin de `src/lib/actions/run.ts` :

```ts

export type RevealResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Same contract as `run` for an action that hands back one personal value: the session is
 * checked first, and the value only leaves the server when the body (which journals the reveal) succeeds.
 */
export async function runReveal(body: (actor: string) => string): Promise<RevealResult> {
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

Créer `src/app/(admin)/utilisateurs/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { usersRepo } from "@/lib/repos/access";

function refreshUser(userId: string) {
  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);
  revalidatePath("/acces/roles");
  revalidatePath("/acces/sessions");
}

export async function changeUserRole(userId: string, roleCode: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(userId, "Utilisateur");
    requireString(roleCode, "Rôle");
    const motif = requireReason(reason);
    usersRepo.changeRole(userId, roleCode, motif, actor);
    refreshUser(userId);
  });
}

export async function revokeUserSessions(userId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(userId, "Utilisateur");
    const motif = requireReason(reason);
    usersRepo.revokeAllSessions(userId, motif, actor);
    refreshUser(userId);
  });
}

export async function revealUserContact(userId: string, field: "email" | "phone"): Promise<RevealResult> {
  return runReveal((actor) => {
    requireString(userId, "Utilisateur");
    if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
    const user = usersRepo.get(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    usersRepo.logReveal(userId, field, actor);
    revalidatePath(`/utilisateurs/${userId}`);
    return field === "email" ? user.email : user.phone;
  });
}
```

Créer `src/app/(admin)/acces/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { sessionsRepo } from "@/lib/repos/access";

export async function revokeSession(sessionId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(sessionId, "Session");
    const motif = requireReason(reason);
    const session = sessionsRepo.revoke(sessionId, motif, actor);
    revalidatePath("/acces/sessions");
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${session.userId}`);
  });
}
```

Notes : un fichier `"use server"` n'exporte que des fonctions asynchrones ; les types (`RevealResult`) sont importés avec `import type` et effacés à la compilation. `revealUserContact` lit la valeur **après** `usersRepo.logReveal` : si la journalisation lève, aucune valeur ne sort.

Run: `pnpm typecheck && pnpm test` → **252 tests** verts (235 + 3 `runReveal` + 14 `access-actions`).

- [ ] **Step 3: Prouver la session d'abord, la journalisation et le plafond du motif**

1. Dans `runReveal`, ajouter temporairement en première ligne du corps `const early = body("anonymous"); void early;`. Run `pnpm test tests/unit/run-action.test.ts tests/unit/access-actions.test.ts` → FAIL sur `never runs the body nor returns a value without a session`, `turns a thrown error into an error result without a value` et `revealUserContact returns no value and logs nothing`. Restaurer → PASS.
2. Dans `revealUserContact`, supprimer temporairement la ligne `usersRepo.logReveal(userId, field, actor);`. Run `pnpm test tests/unit/access-actions.test.ts` → FAIL sur `returns the value only after journaling, by the session actor`. Restaurer → PASS.
3. Dans `changeUserRole`, remplacer temporairement `const motif = requireReason(reason);` par `const motif = reason;` (et de même dans `revokeSession`, en gardant l'import utilisé : `const motif = reason; void requireReason;`). Run → FAIL sur `refuses a blank reason, 501 characters, and accepts exactly 500` et `refuses a blank or too long reason, an invalid id and an already revoked session`. Restaurer → PASS (`git diff` vide sur les trois fichiers).

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/run.ts "src/app/(admin)/utilisateurs/actions.ts" "src/app/(admin)/acces/actions.ts" tests/unit/run-action.test.ts tests/unit/access-actions.test.ts
git commit -m "feat: session-first actions for role change, session revocation and contact reveal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Liste et fiche des comptes (filtres, onglets, révélation, changement de rôle, révocation)

**Files:**
- Modify: `src/lib/filters.ts`, `src/lib/labels.ts`, `src/components/data/status-filter-nav.tsx`, `src/components/data/confirm-dialog.tsx`, `tests/unit/filters.test.ts`, `tests/unit/labels.test.ts`, `tests/e2e/backoffice.spec.ts`
- Create: `src/app/(admin)/utilisateurs/page.tsx`, `src/app/(admin)/utilisateurs/users-table.tsx`, `src/app/(admin)/utilisateurs/[id]/page.tsx`, `src/app/(admin)/utilisateurs/[id]/not-found.tsx`, `src/components/access/user-tabs.tsx`, `src/components/access/user-actions.tsx`, `src/components/access/user-contact-field.tsx`

**Interfaces:**
- Consumes: `usersRepo.listRows/detail`, `rolesRepo.options`, `PERMISSION_DOMAINS`, `type UserRow`, `type UserDetail`, `type RoleOption` (Task 1) ; `changeUserRole`, `revokeUserSessions`, `revealUserContact` (Task 3) ; `DataTable`, `StatusBadge`, `PageHeader`, `DetailRow`, `TabsWithUrl`, `MaskedValue`, `ConfirmDialog`, `maskEmail`, `maskPhone`, `formatDate`, `formatDateTime` (lots 1-2).
- Produces:
  - `filterHref(basePath: string, param: string, value: string, keep?: Record<string, string | undefined>): string`.
  - `StatusFilterNav` gagne `param?: string` (défaut `"statut"`) et `keep?: Record<string, string | undefined>`.
  - `ConfirmDialog` gagne `children?: React.ReactNode` et `confirmDisabled?: boolean`.
  - `userStatusBadge(s: UserStatus)`, `sessionStateBadge(s: "active" | "revoked" | "expired")`, `permissionDomainLabel(d: PermissionDomain): string`.
  - Composants : `UsersTable({ users: UserRow[] })` (client), `UserTabs({ detail: UserDetail; initialTab?: string })` (serveur), `UserActions(props: UserActionsProps)` (client), `UserContactField({ userId, field, masked })` (client).
  - Libellés et sélecteurs : placeholder `Rechercher un utilisateur…`, boutons `Changer le rôle`, `Révoquer toutes les sessions`, `Révoquer les sessions`, champ `Nouveau rôle`, `data-testid` `user-role`, `user-status`, `active-session-count`, onglets `Profil`, `Rôle et permissions`, `Sessions`, `Activité`.

- [ ] **Step 1: Tests du helper de filtre et des libellés (échouants)**

Ajouter à la fin de `tests/unit/filters.test.ts` :

```ts

import { filterHref } from "@/lib/filters";
describe("filterHref", () => {
  it("sets the parameter and clears it for all, like the lot 2 links", () => {
    expect(filterHref("/facturation/abonnements", "statut", "past_due")).toBe("/facturation/abonnements?statut=past_due");
    expect(filterHref("/facturation/abonnements", "statut", "all")).toBe("/facturation/abonnements");
  });
  it("keeps the other filters and drops undefined ones", () => {
    expect(filterHref("/utilisateurs", "role", "ADMIN", { statut: "suspended" })).toBe("/utilisateurs?statut=suspended&role=ADMIN");
    expect(filterHref("/utilisateurs", "role", "all", { statut: "suspended" })).toBe("/utilisateurs?statut=suspended");
    expect(filterHref("/utilisateurs", "statut", "active", { role: undefined })).toBe("/utilisateurs?statut=active");
  });
  it("never keeps a stale value of the parameter it sets", () => {
    expect(filterHref("/utilisateurs", "role", "USER", { role: "ADMIN" })).toBe("/utilisateurs?role=USER");
  });
});
```

Ajouter à la fin de `tests/unit/labels.test.ts` :

```ts

import { permissionDomainLabel, sessionStateBadge, userStatusBadge } from "@/lib/labels";
describe("access labels", () => {
  it("labels account statuses and session states", () => {
    expect(userStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(userStatusBadge("suspended")).toEqual({ label: "Suspendu", tone: "warning" });
    expect(["active", "revoked", "expired"].map((st) => sessionStateBadge(st as "active").label))
      .toEqual(["Active", "Révoquée", "Expirée"]);
  });
  it("labels the eleven permission domains in French", () => {
    expect(["companies", "fleet", "bookings", "parcels", "hr", "customers", "marketing", "notifications",
      "compliance", "monitoring", "platform"].map((d) => permissionDomainLabel(d as "fleet"))).toEqual([
      "Compagnies", "Flotte", "Réservations", "Colis", "Ressources humaines", "Clients", "Marketing",
      "Notifications", "Conformité", "Supervision", "Plateforme",
    ]);
  });
});
```

Run: `pnpm test tests/unit/filters.test.ts tests/unit/labels.test.ts` → FAIL (`filterHref`, `userStatusBadge`, `sessionStateBadge`, `permissionDomainLabel` ne sont pas des fonctions).

- [ ] **Step 2: Helper, libellés, filtres et dialogue**

Remplacer intégralement `src/lib/filters.ts` par :

```ts
/** Keeps a query-string filter only when it is one of the allowed values. */
export function parseFilter<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((value) => value === raw);
}

/**
 * Link target of a filter pill: sets `param` to `value` ("all" clears it) and keeps the other
 * filters listed in `keep` (undefined values are dropped).
 */
export function filterHref(
  basePath: string, param: string, value: string, keep: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, kept] of Object.entries(keep)) if (kept !== undefined && key !== param) query.set(key, kept);
  if (value !== "all") query.set(param, value);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
```

Dans `src/lib/labels.ts`, remplacer le bloc d'import de types par :

```ts
import type { Tone } from "@/components/data/status-badge";
import type {
  CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, PermissionDomain, Plan,
  ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, UserStatus,
} from "@/lib/types";
```

et ajouter à la fin du fichier :

```ts

export const userStatusBadge = (s: UserStatus): Badge =>
  pick({
    active: { label: "Actif", tone: "success" },
    suspended: { label: "Suspendu", tone: "warning" },
  }, s);

export const sessionStateBadge = (s: "active" | "revoked" | "expired"): Badge =>
  pick({
    active: { label: "Active", tone: "success" },
    revoked: { label: "Révoquée", tone: "neutral" },
    expired: { label: "Expirée", tone: "neutral" },
  }, s);

const DOMAIN_LABELS: Record<PermissionDomain, string> = {
  companies: "Compagnies",
  fleet: "Flotte",
  bookings: "Réservations",
  parcels: "Colis",
  hr: "Ressources humaines",
  customers: "Clients",
  marketing: "Marketing",
  notifications: "Notifications",
  compliance: "Conformité",
  monitoring: "Supervision",
  platform: "Plateforme",
};

export const permissionDomainLabel = (d: PermissionDomain): string => DOMAIN_LABELS[d];
```

Remplacer intégralement `src/components/data/status-filter-nav.tsx` par :

```tsx
import Link from "next/link";
import { filterHref } from "@/lib/filters";
import { cn } from "@/lib/utils";

export interface FilterOption { value: string; label: string }

/**
 * Pill links that set `?<param>=` (default `statut`) on a list page; the option "all" clears the
 * filter. `keep` carries the other active filters of the page.
 */
export function StatusFilterNav({
  basePath, options, current, label = "Filtrer par statut", param = "statut", keep,
}: {
  basePath: string;
  options: FilterOption[];
  current: string | undefined;
  label?: string;
  param?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = (o.value === "all" && !current) || o.value === current;
        return (
          <Link
            key={o.value}
            href={filterHref(basePath, param, o.value, keep)}
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

Remplacer intégralement `src/components/data/confirm-dialog.tsx` par :

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  /** Extra fields rendered above the reason (for example a select); `confirmDisabled` gates them. */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, requireReason, children,
  confirmDisabled, onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = requireReason && reason.trim().length === 0;

  useEffect(() => {
    if (!open) { setReason(""); setError(null); }
  }, [open]);

  function handleOpenChange(o: boolean) {
    if (busy && !o) return;
    if (!o) { setReason(""); setError(null); }
    onOpenChange(o);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children && <div className="mt-4 space-y-1">{children}</div>}
        {requireReason && (
          <div className="mt-4 space-y-1">
            <label htmlFor="reason" className="text-sm font-medium">Motif (obligatoire)</label>
            <textarea
              id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={confirm} disabled={busy || !!missing || !!confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Run: `pnpm typecheck && pnpm test` → **257 tests** verts (252 + 3 + 2). Les pages du lot 2 gardent leurs liens (`filterHref(basePath, "statut", valeur)` produit `?statut=<valeur>`, prouvé par le premier test de `filterHref`).

- [ ] **Step 3: Liste des comptes**

Créer `src/app/(admin)/utilisateurs/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { rolesRepo, usersRepo } from "@/lib/repos/access";
import type { UserStatus } from "@/lib/types";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "suspended"] as const satisfies readonly UserStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
];

export default async function UsersPage({
  searchParams,
}: { searchParams: Promise<{ role?: string; statut?: string }> }) {
  const params = await searchParams;
  const roles = rolesRepo.options();
  const role = parseFilter(params.role, roles.map((r) => r.code));
  const status = parseFilter(params.statut, STATUSES);
  const roleOptions: FilterOption[] = [
    { value: "all", label: "Tous les rôles" },
    ...roles.map((r) => ({ value: r.code, label: r.name })),
  ];
  return (
    <>
      <PageHeader title="Utilisateurs" description="Tous les comptes de la plateforme : équipes des compagnies, clients et administrateurs." />
      <StatusFilterNav
        basePath="/utilisateurs" options={roleOptions} current={role} param="role"
        label="Filtrer par rôle" keep={{ statut: status }}
      />
      <StatusFilterNav basePath="/utilisateurs" options={STATUS_OPTIONS} current={status} keep={{ role }} />
      <UsersTable users={usersRepo.listRows({ roleCode: role, status })} />
    </>
  );
}
```

Créer `src/app/(admin)/utilisateurs/users-table.tsx` (les lignes n'ont aucun bouton : `rowHref` est permis) :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { userStatusBadge } from "@/lib/labels";
import type { UserRow } from "@/lib/repos/access";

const columns: ColumnDef<UserRow, unknown>[] = [
  { accessorKey: "displayName", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span> },
  { accessorKey: "username", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.username}</span> },
  { accessorKey: "roleName", header: "Rôle" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = userStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => row.original.companyName ?? "—" },
  {
    accessorKey: "lastLoginAt", header: "Dernière connexion",
    cell: ({ row }) => (row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "Jamais"),
  },
  {
    accessorKey: "activeSessions", header: "Sessions actives",
    cell: ({ row }) => <span className="tabular-nums">{row.original.activeSessions}</span>,
  },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <DataTable
      columns={columns} data={users} rowHref={(u) => `/utilisateurs/${u.id}`}
      searchPlaceholder="Rechercher un utilisateur…" emptyMessage="Aucun utilisateur."
    />
  );
}
```

- [ ] **Step 4: Fiche d'un compte**

Créer `src/components/access/user-contact-field.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { revealUserContact } from "@/app/(admin)/utilisateurs/actions";
import { MaskedValue } from "@/components/data/masked-value";

/**
 * Receives only the masked value; the real one comes from the journaled server action, on demand.
 * The refresh shows the new journal entry on the activity tab.
 */
export function UserContactField({
  userId, field, masked,
}: { userId: string; field: "email" | "phone"; masked: string }) {
  const router = useRouter();
  return <MaskedValue masked={masked} kind={field} reveal={async () => {
    const r = await revealUserContact(userId, field);
    if (!r.ok) throw new Error(r.error);
    router.refresh();
    return r.value;
  }} />;
}
```

Créer `src/components/access/user-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeUserRole, revokeUserSessions } from "@/app/(admin)/utilisateurs/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { RoleOption } from "@/lib/repos/access";

/** Scalars and role options only: no contact data reaches this component. */
export interface UserActionsProps {
  userId: string;
  displayName: string;
  roleCode: string;
  roles: RoleOption[];
  activeSessions: number;
}

export function UserActions({ userId, displayName, roleCode, roles, activeSessions }: UserActionsProps) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [nextRole, setNextRole] = useState("");

  function openRoleDialog() {
    setNextRole("");
    setChanging(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={openRoleDialog}>Changer le rôle</Button>
      {activeSessions > 0 && (
        <Button size="sm" variant="danger" onClick={() => setRevoking(true)}>Révoquer toutes les sessions</Button>
      )}
      <ConfirmDialog
        open={changing} onOpenChange={setChanging}
        title={`Changer le rôle de ${displayName}`}
        description="Toutes les sessions actives du compte sont révoquées immédiatement : une nouvelle connexion sera nécessaire."
        confirmLabel="Changer le rôle" requireReason confirmDisabled={nextRole === ""}
        onConfirm={async (reason) => {
          const r = await changeUserRole(userId, nextRole, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label htmlFor="next-role" className="text-sm font-medium">Nouveau rôle</label>
        <select
          id="next-role" value={nextRole} onChange={(e) => setNextRole(e.target.value)}
          className="w-full rounded-lg border border-border bg-card p-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="">Choisir un rôle…</option>
          {roles.filter((r) => r.code !== roleCode).map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </ConfirmDialog>
      <ConfirmDialog
        open={revoking} onOpenChange={setRevoking}
        title={`Révoquer les sessions de ${displayName}`}
        description={`${activeSessions} session(s) active(s) seront révoquées : l'utilisateur devra se reconnecter.`}
        confirmLabel="Révoquer les sessions" destructive requireReason
        onConfirm={async (reason) => {
          const r = await revokeUserSessions(userId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
```

Créer `src/components/access/user-tabs.tsx` (Server Component : pas de `"use client"`) :

```tsx
import Link from "next/link";
import { UserContactField } from "@/components/access/user-contact-field";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { permissionDomainLabel, sessionStateBadge, userStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import { PERMISSION_DOMAINS, type UserDetail } from "@/lib/repos/access";

const TAB_VALUES = ["profil", "role", "sessions", "activite"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * Server Component: only rendered nodes reach TabsWithUrl. E-mail and phone are masked here; the
 * client field receives the masked string and fetches the real value through a journaled action.
 */
export function UserTabs({ detail, initialTab }: { detail: UserDetail; initialTab?: string }) {
  const { user, role } = detail;
  const status = userStatusBadge(user.status);

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Nom affiché">{user.displayName}</DetailRow>
          <DetailRow label="Identifiant">{user.username}</DetailRow>
          <DetailRow label="E-mail"><UserContactField userId={user.id} field="email" masked={maskEmail(user.email)} /></DetailRow>
          <DetailRow label="Téléphone"><UserContactField userId={user.id} field="phone" masked={maskPhone(user.phone)} /></DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Compagnie">
            {user.companyId && detail.companyName ? (
              <Link href={`/compagnies/${user.companyId}?onglet=equipe`} className="hover:underline">{detail.companyName}</Link>
            ) : "—"}
          </DetailRow>
          <DetailRow label="Compte créé le">{formatDate(user.createdAt)}</DetailRow>
          <DetailRow label="Dernière connexion">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "role", label: "Rôle et permissions",
      content: (
        <Card><CardContent className="space-y-4">
          <div>
            <p className="font-medium">{role?.name ?? user.roleCode} <span className="font-mono text-xs text-muted-foreground">{user.roleCode}</span></p>
            {role && <p className="text-sm text-muted-foreground">{role.description}</p>}
          </div>
          {detail.permissions.length === 0 ? <Empty>Ce rôle ne porte aucune permission.</Empty> : (
            <div className="space-y-3">
              {PERMISSION_DOMAINS.map((d) => {
                const perms = detail.permissions.filter((p) => p.domain === d);
                if (perms.length === 0) return null;
                return (
                  <div key={d}>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">{permissionDomainLabel(d)}</h3>
                    <ul className="mt-1 space-y-1 text-sm">
                      {perms.map((p) => (
                        <li key={p.code}><span className="font-mono text-xs">{p.code}</span> · {p.description}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "sessions", label: "Sessions",
      content: (
        <Card><CardContent className="space-y-3">
          <p className="text-sm" data-testid="active-session-count">{detail.activeSessions} session(s) active(s)</p>
          {detail.sessions.length === 0 ? <Empty>Aucune session.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Appareil</th>
                  <th className="py-1 font-medium">Adresse IP</th>
                  <th className="py-1 font-medium">Début</th>
                  <th className="py-1 font-medium">Dernière activité</th>
                  <th className="py-1 font-medium">Expiration</th>
                  <th className="py-1 font-medium">État</th>
                  <th className="py-1 font-medium">Motif de révocation</th>
                </tr>
              </thead>
              <tbody>
                {detail.sessions.map((x) => {
                  const b = sessionStateBadge(x.state);
                  return (
                    <tr key={x.id} className="border-t border-border">
                      <td className="py-1.5">{x.deviceLabel}</td>
                      <td className="font-mono text-xs">{x.ip}</td>
                      <td>{formatDateTime(x.createdAt)}</td>
                      <td>{formatDateTime(x.lastSeenAt)}</td>
                      <td>{formatDateTime(x.expiresAt)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="text-muted-foreground">{x.revokedReason ?? "—"}</td>
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
      value: "activite", label: "Activité",
      content: (
        <Card><CardContent>
          {detail.activity.length === 0 ? <Empty>Aucune activité enregistrée pour ce compte.</Empty> : (
            <ul className="space-y-2 text-sm">
              {detail.activity.map((a) => (
                <li key={a.id}><p>{a.action}</p><p className="text-xs text-muted-foreground">{a.actor} · {formatDateTime(a.at)}</p></li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
```

Créer `src/app/(admin)/utilisateurs/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { UserActions } from "@/components/access/user-actions";
import { UserTabs } from "@/components/access/user-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { userStatusBadge } from "@/lib/labels";
import { rolesRepo, usersRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default async function UserPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = usersRepo.detail(id);
  if (!detail) notFound();
  const { user } = detail;
  const badge = userStatusBadge(user.status);
  return (
    <>
      <PageHeader
        title={user.displayName}
        description={`Identifiant : ${user.username}`}
        actions={
          <>
            <span data-testid="user-role"><StatusBadge tone="info">{detail.role?.name ?? user.roleCode}</StatusBadge></span>
            <span data-testid="user-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            <UserActions
              userId={user.id} displayName={user.displayName} roleCode={user.roleCode}
              roles={rolesRepo.options()} activeSessions={detail.activeSessions}
            />
          </>
        }
      />
      <UserTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

Créer `src/app/(admin)/utilisateurs/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function UserNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Utilisateur introuvable</p>
        <Link href="/utilisateurs" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
```

Notes : `UserTabs` reçoit `UserDetail` (avec les contacts bruts) **côté serveur** et ne transmet au client que des nœuds rendus et, à `UserContactField`, la chaîne masquée (`maskEmail(user.email)`). `UserActions` ne reçoit que des scalaires et `RoleOption[]` (`code`, `name`). La route réelle `/utilisateurs` prend le pas sur l'attrape-tout `[...slug]`, qui reste en place pour les sections non construites.

- [ ] **Step 5: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, insérer juste avant la ligne `test("no contact e-mail or phone reaches the browser in page payloads @prod", async ({ page }) => {` :

```ts
async function openUser(page: Page, search: string, username: string, displayName: string) {
  await page.goto("/utilisateurs");
  await page.getByPlaceholder("Rechercher un utilisateur…").fill(search);
  await page.getByRole("row", { name: new RegExp(username.replace(/\./g, "\\.")) }).click();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
}

test("changing a role requires a reason and revokes every active session", async ({ page }) => {
  // Owns ibrahima-sow.dakar-voyages: no other test mutates this account.
  await login(page);
  await openUser(page, "ibrahima-sow.dakar", "ibrahima-sow.dakar-voyages", "Ibrahima Sow");
  await expect(page.getByTestId("user-role")).toHaveText("Agent de vente");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("2 session(s) active(s)");

  await page.getByRole("button", { name: "Changer le rôle" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Changer le rôle" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Nouveau rôle").selectOption({ label: "Responsable de compagnie" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Promotion au poste de responsable");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByTestId("user-role")).toHaveText("Responsable de compagnie");
  await expect(page.getByTestId("active-session-count")).toHaveText("0 session(s) active(s)");
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Changement de rôle" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Révoquer toutes les sessions" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText(/Agent de vente → Responsable de compagnie \(2 session\(s\) révoquée\(s\)\)/)).toBeVisible();
});

test("the last active administrator cannot be demoted", async ({ page }) => {
  // Read-only: the refusal changes nothing on moustapha.ndiaye.
  await login(page);
  await page.goto("/utilisateurs?role=ADMIN");
  await page.getByRole("row", { name: /moustapha\.ndiaye/ }).click();
  await expect(page.getByRole("heading", { name: "Moustapha Ndiaye" })).toBeVisible();

  await page.getByRole("button", { name: "Changer le rôle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau rôle").selectOption({ label: "Responsable de compagnie" });
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Changer le rôle" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Impossible de rétrograder le dernier administrateur actif");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();

  await expect(page.getByTestId("user-role")).toHaveText("Administrateur");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("1 session(s) active(s)");
});

test("an account's e-mail is masked, revealed on demand, and the reveal is journaled", async ({ page }) => {
  // Owns khady-faye.matam-express: a reveal only adds an activity entry to this account.
  await login(page);
  await openUser(page, "khady-faye.matam", "khady-faye.matam-express", "Khady Faye");
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
  await page.getByRole("button", { name: "Révéler la donnée" }).first().click();
  await expect(page.getByTestId("masked-email")).toHaveText("khady-faye@matam-express.sn");

  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Donnée personnelle révélée : e-mail de khady-faye.matam-express")).toBeVisible();
  await expect(page.getByRole("tabpanel")).not.toContainText("khady-faye@matam-express.sn");
});

test("an unknown account id shows a not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/utilisateurs/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Utilisateur introuvable")).toBeVisible();
});
```

Run:

```bash
pnpm exec playwright test --project dev -g "role|administrator|account"
git checkout tsconfig.json
```

Expected : 4 tests passent (Playwright démarre aussi le serveur de production, comme pour `pnpm e2e`). Puis `pnpm typecheck && pnpm test` → 257 tests verts.

- [ ] **Step 6: Commit**

```bash
git add src/lib/filters.ts src/lib/labels.ts src/components/data/status-filter-nav.tsx src/components/data/confirm-dialog.tsx "src/app/(admin)/utilisateurs" src/components/access tests/unit/filters.test.ts tests/unit/labels.test.ts tests/e2e/backoffice.spec.ts
git commit -m "feat: platform accounts list and detail with journaled reveal, role change and session revocation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Rôles et matrice des permissions (lecture seule)

**Files:**
- Create: `src/app/(admin)/acces/roles/page.tsx`, `src/app/(admin)/acces/permissions/page.tsx`
- Modify: `tests/e2e/backoffice.spec.ts`

**Interfaces:**
- Consumes: `rolesRepo.listRows`, `permissionsRepo.matrix`, `PERMISSION_DOMAINS` (Task 1), `permissionDomainLabel` (Task 4), `PageHeader`, `Card`.
- Produces: deux Server Components sans composant client ; `data-testid` `role-users-<CODE>`, `role-permissions-<CODE>`, `grant-<RÔLE>-<PERMISSION>` avec `data-granted="true|false"` ; résumé repliable `Permissions du rôle « <nom> »`.

- [ ] **Step 1: Page des rôles**

Créer `src/app/(admin)/acces/roles/page.tsx` :

```tsx
import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { permissionDomainLabel } from "@/lib/labels";
import { PERMISSION_DOMAINS, rolesRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default function RolesPage() {
  const roles = rolesRepo.listRows();
  return (
    <>
      <PageHeader
        title="Rôles"
        description="Les rôles de la plateforme et les permissions qu'ils portent (lecture seule)."
      />
      <div className="space-y-4">
        {roles.map((r) => (
          <Card key={r.code}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{r.name} <span className="font-mono text-xs text-muted-foreground">{r.code}</span></h2>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <Link href={`/utilisateurs?role=${r.code}`} className="hover:underline" data-testid={`role-users-${r.code}`}>
                    {r.userCount} utilisateur(s)
                  </Link>
                  <span data-testid={`role-permissions-${r.code}`}>{r.permissions.length} permission(s)</span>
                </div>
              </div>
              {r.permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune permission.</p>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm text-accent">Permissions du rôle « {r.name} »</summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {PERMISSION_DOMAINS.map((d) => {
                      const perms = r.permissions.filter((p) => p.domain === d);
                      if (perms.length === 0) return null;
                      return (
                        <div key={d}>
                          <h3 className="text-xs font-semibold uppercase text-muted-foreground">{permissionDomainLabel(d)}</h3>
                          <ul className="mt-1 space-y-1 text-sm">
                            {perms.map((p) => (
                              <li key={p.code}><span className="font-mono text-xs">{p.code}</span> · {p.description}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Matrice des permissions**

Créer `src/app/(admin)/acces/permissions/page.tsx` :

```tsx
import { Fragment } from "react";
import { PageHeader } from "@/components/data/page-header";
import { permissionDomainLabel } from "@/lib/labels";
import { permissionsRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  const { roles, groups } = permissionsRepo.matrix();
  return (
    <>
      <PageHeader
        title="Permissions"
        description="Matrice des permissions par rôle, regroupées par domaine (lecture seule)."
      />
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Permission</th>
              {roles.map((r) => (
                <th key={r.code} scope="col" className="px-3 py-2 text-center font-medium">
                  {r.name}<span className="block font-mono text-[10px]">{r.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.domain}>
                <tr className="border-b border-border bg-muted/30">
                  <th colSpan={roles.length + 1} scope="colgroup" className="px-3 py-1.5 text-xs font-semibold uppercase">
                    {permissionDomainLabel(g.domain)}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.code} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 font-normal">
                      <span className="font-mono text-xs">{row.code}</span>
                      <span className="block text-xs text-muted-foreground">{row.description}</span>
                    </th>
                    {roles.map((r) => {
                      const granted = row.grantedTo.includes(r.code);
                      return (
                        <td
                          key={r.code} className="px-3 py-2 text-center"
                          data-testid={`grant-${r.code}-${row.code}`} data-granted={granted ? "true" : "false"}
                        >
                          {granted ? <span className="text-success" aria-hidden>✓</span> : <span className="text-muted-foreground" aria-hidden>·</span>}
                          <span className="sr-only">{granted ? "Accordée" : "Non accordée"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, insérer juste avant la ligne du test `@prod` :

```ts
test("the roles page counts accounts and the matrix shows the MANAGER grants", async ({ page }) => {
  await login(page);
  await page.goto("/acces/roles");
  await expect(page.getByTestId("role-users-ADMIN")).toHaveText("2 utilisateur(s)");
  await expect(page.getByTestId("role-permissions-MANAGER")).toHaveText("12 permission(s)");
  await expect(page.getByTestId("role-permissions-CHAUFFEUR")).toHaveText("0 permission(s)");
  const details = page.locator("details").filter({ hasText: "Permissions du rôle « Agent de vente »" });
  await details.getByText("Permissions du rôle « Agent de vente »").click();
  await expect(details.getByText("BOOKING_MANAGE")).toBeVisible();
  await expect(details.getByText("RBAC_MANAGE")).toHaveCount(0);

  await page.goto("/acces/permissions");
  await expect(page.locator('[data-testid^="grant-MANAGER-"][data-granted="true"]')).toHaveCount(12);
  for (const code of ["COMPANY_MANAGE", "COMPANY_PARTNERSHIP_MANAGE", "FLEET_MAINTENANCE_MANAGE", "USER_MANAGE"]) {
    await expect(page.getByTestId(`grant-MANAGER-${code}`)).toHaveAttribute("data-granted", "true");
  }
  for (const code of ["RBAC_MANAGE", "COMPANY_KYC_REVIEW", "COMPLIANCE_READ", "MONITORING_MANAGE", "EMPLOYEE_CONFIDENTIAL_ACCESS"]) {
    await expect(page.getByTestId(`grant-MANAGER-${code}`)).toHaveAttribute("data-granted", "false");
  }
  await expect(page.getByTestId("grant-ADMIN-RBAC_MANAGE")).toHaveAttribute("data-granted", "true");
  await expect(page.getByRole("rowheader", { name: /EMPLOYEE_CONFIDENTIAL_ACCESS/ })).toBeVisible();
});
```

Run:

```bash
pnpm typecheck
pnpm exec playwright test --project dev -g "matrix"
git checkout tsconfig.json
```

Expected : typecheck OK, 1 test passe. Si la ligne `toHaveCount(12)` échoue, corriger la **graine** (Task 1, `ROLE_GRANTS.MANAGER`) ou la page, jamais le test : les 12 permissions du `MANAGER` sont la décision 4.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/acces/roles" "src/app/(admin)/acces/permissions" tests/e2e/backoffice.spec.ts
git commit -m "feat: read-only roles page and permission matrix grouped by domain

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Sessions actives de la plateforme (filtre par rôle, révocation)

**Files:**
- Create: `src/app/(admin)/acces/sessions/page.tsx`, `src/app/(admin)/acces/sessions/sessions-table.tsx`, `src/components/access/revoke-session-button.tsx`
- Modify: `tests/e2e/backoffice.spec.ts`

**Interfaces:**
- Consumes: `sessionsRepo.activeRows`, `rolesRepo.options`, `type SessionRow` (Task 1) ; `revokeSession` (Task 3) ; `StatusFilterNav` avec `param` (Task 4) ; `DataTable` avec `rowId` (lot 2).
- Produces: `RevokeSessionButton({ sessionId: string; label: string })` (client), `SessionsTable({ sessions: SessionRow[] })` (client, `rowId`, **sans** `rowHref`) ; bouton `Révoquer la session <identifiant> · <appareil>`, confirmation `Révoquer la session`, placeholder `Rechercher une session…`.

- [ ] **Step 1: Bouton de révocation**

Créer `src/components/access/revoke-session-button.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeSession } from "@/app/(admin)/acces/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` names the session (username and device) in the button and the dialog. */
export interface RevokeSessionButtonProps { sessionId: string; label: string }

export function RevokeSessionButton({ sessionId, label }: RevokeSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)} aria-label={`Révoquer la session ${label}`}>
        Révoquer
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Révoquer la session ${label}`}
        description="La session est fermée immédiatement : l'utilisateur devra se reconnecter sur cet appareil."
        confirmLabel="Révoquer la session" destructive requireReason
        onConfirm={async (reason) => {
          const r = await revokeSession(sessionId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Tableau et page**

Créer `src/app/(admin)/acces/sessions/sessions-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { RevokeSessionButton } from "@/components/access/revoke-session-button";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { SessionRow } from "@/lib/repos/access";

const columns: ColumnDef<SessionRow, unknown>[] = [
  {
    accessorKey: "displayName", header: "Utilisateur",
    cell: ({ row }) => (
      <Link href={`/utilisateurs/${row.original.userId}`} className="font-medium hover:underline">
        {row.original.displayName}
      </Link>
    ),
  },
  { accessorKey: "username", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.username}</span> },
  { accessorKey: "deviceLabel", header: "Appareil" },
  { accessorKey: "ip", header: "Adresse IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span> },
  { accessorKey: "createdAt", header: "Début", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "lastSeenAt", header: "Dernière activité", cell: ({ row }) => formatDateTime(row.original.lastSeenAt) },
  { accessorKey: "expiresAt", header: "Expiration", cell: ({ row }) => formatDateTime(row.original.expiresAt) },
  {
    id: "action", header: "Action", enableSorting: false,
    cell: ({ row }) => (
      <RevokeSessionButton sessionId={row.original.id} label={`${row.original.username} · ${row.original.deviceLabel}`} />
    ),
  },
];

/** No rowHref: each row holds a button that opens a dialog (the user link is in a cell). */
export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  return (
    <DataTable
      columns={columns} data={sessions} rowId={(s) => s.id}
      searchPlaceholder="Rechercher une session…" emptyMessage="Aucune session active."
    />
  );
}
```

Créer `src/app/(admin)/acces/sessions/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { rolesRepo, sessionsRepo } from "@/lib/repos/access";
import { SessionsTable } from "./sessions-table";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams,
}: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const roles = rolesRepo.options();
  const role = parseFilter(params.role, roles.map((r) => r.code));
  const options: FilterOption[] = [
    { value: "all", label: "Tous les rôles" },
    ...roles.map((r) => ({ value: r.code, label: r.name })),
  ];
  return (
    <>
      <PageHeader
        title="Sessions"
        description="Sessions actives de toute la plateforme. Les adresses IP sont tronquées au réseau (a.b.c.0)."
      />
      <StatusFilterNav basePath="/acces/sessions" options={options} current={role} param="role" label="Filtrer par rôle" />
      <SessionsTable sessions={sessionsRepo.activeRows({ roleCode: role })} />
    </>
  );
}
```

- [ ] **Step 3: Parcours E2E**

Dans `tests/e2e/backoffice.spec.ts`, insérer juste avant la ligne du test `@prod` :

```ts
test("a session is revoked from the platform sessions list with a mandatory reason", async ({ page }) => {
  // Owns lamine.camara's sessions: no other test mutates them.
  await login(page);
  await page.goto("/acces/sessions?role=USER");
  await page.getByPlaceholder("Rechercher une session…").fill("lamine.camara");
  await expect(page.getByRole("row", { name: /lamine\.camara/ })).toHaveCount(3);
  await expect(page.getByRole("cell", { name: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.0$/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Révoquer la session lamine.camara · Safari · iPhone" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Révoquer la session" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Téléphone signalé perdu");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /lamine\.camara/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Révoquer la session lamine.camara · Safari · iPhone" })).toHaveCount(0);

  await page.getByRole("link", { name: "Lamine Camara" }).first().click();
  await expect(page.getByRole("heading", { name: "Lamine Camara" })).toBeVisible();
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("2 session(s) active(s)");
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Téléphone signalé perdu" })).toBeVisible();
});
```

Run:

```bash
pnpm typecheck
pnpm exec playwright test --project dev -g "platform sessions"
git checkout tsconfig.json
```

Expected : typecheck OK, 1 test passe. `lamine.camara` a trois appareils distincts (« Application Android », « Safari · iPhone », « Firefox · Ubuntu ») : chaque libellé de bouton est unique.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/acces/sessions" src/components/access/revoke-session-button.tsx tests/e2e/backoffice.spec.ts
git commit -m "feat: platform active sessions list with role filter and per-session revocation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Navigation, lien depuis l'équipe d'une compagnie, test de fuite `@prod` étendu, README et vérification finale

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `src/components/company/company-tabs.tsx`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: toutes les pages des Tasks 4 à 6, `Employee.userId` (Task 1).
- Produces: les 4 entrées « Utilisateurs et accès » à `implemented: true` ; `isLinkablePath` rend `/utilisateurs` cliquable depuis une fiche ; `labelForSegment("roles") === "Rôles"` ; l'onglet Équipe d'une compagnie lie chaque employé qui a un compte vers `/utilisateurs/<userId>` (colonne « Compte » : « Compte plateforme » / « Pas encore de compte »).

- [ ] **Step 1: Tests de navigation (échouants)**

Dans `tests/unit/nav.test.ts`, remplacer le test `marks only lot 1 and lot 2 pages as implemented` (11 chemins) par :

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

et ajouter à la fin du fichier :

```ts

describe("lot 3 breadcrumbs", () => {
  it("links the user list from an account page, not the bare access prefix", () => {
    expect(isLinkablePath("/utilisateurs")).toBe(true);
    expect(isLinkablePath("/utilisateurs/abc")).toBe(true);
    expect(isLinkablePath("/acces/roles")).toBe(true);
    expect(isLinkablePath("/acces")).toBe(false);
  });
  it("labels the access segments with their accents", () => {
    expect(labelForSegment("acces")).toBe("Accès");
    expect(labelForSegment("roles")).toBe("Rôles");
    expect(labelForSegment("utilisateurs")).toBe("Utilisateurs");
  });
});
```

Run: `pnpm test tests/unit/nav.test.ts` → FAIL (2 tests : les 4 chemins ne sont pas implémentés ; `/utilisateurs/abc` n'est pas cliquable et `roles` est libellé « Roles »).

- [ ] **Step 2: Basculer la navigation**

Dans `src/lib/nav.ts`, remplacer :

```ts
    todo("Utilisateurs", "/utilisateurs"),
    todo("Rôles", "/acces/roles"),
    todo("Permissions", "/acces/permissions"),
    todo("Sessions", "/acces/sessions"),
```

par :

```ts
    { label: "Utilisateurs", href: "/utilisateurs", implemented: true },
    { label: "Rôles", href: "/acces/roles", implemented: true },
    { label: "Permissions", href: "/acces/permissions", implemented: true },
    { label: "Sessions", href: "/acces/sessions", implemented: true },
```

remplacer `  recherche: "Recherche",\n};` par :

```ts
  recherche: "Recherche", roles: "Rôles",
};
```

et remplacer la ligne `const ROUTE_PREFIXES = ["/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures"];` par :

```ts
const ROUTE_PREFIXES = [
  "/compagnies", "/offre/plans", "/facturation/abonnements", "/facturation/factures", "/utilisateurs",
];
```

Run: `pnpm test tests/unit/nav.test.ts` → PASS (9 tests). Puis `pnpm test` → **259 tests** verts.

- [ ] **Step 3: Lien depuis l'onglet Équipe d'une compagnie**

Dans `src/components/company/company-tabs.tsx` (onglet `equipe`), remplacer :

```tsx
            <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Nom</th><th className="py-1 font-medium">Rôle</th><th className="py-1 font-medium">E-mail</th></tr></thead>
            <tbody>
              {detail.employees.map((e) => (
                <tr key={e.id} className="border-t border-border"><td className="py-1.5 font-medium">{e.name}</td><td>{e.role}</td><td className="text-muted-foreground">{maskEmail(e.email)}</td></tr>
              ))}
            </tbody>
```

par :

```tsx
            <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Nom</th><th className="py-1 font-medium">Rôle</th><th className="py-1 font-medium">E-mail</th><th className="py-1 font-medium">Compte</th></tr></thead>
            <tbody>
              {detail.employees.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-1.5 font-medium">
                    {e.userId ? <Link href={`/utilisateurs/${e.userId}`} className="hover:underline">{e.name}</Link> : e.name}
                  </td>
                  <td>{e.role}</td>
                  <td className="text-muted-foreground">{maskEmail(e.email)}</td>
                  <td className="text-muted-foreground">{e.userId ? "Compte plateforme" : "Pas encore de compte"}</td>
                </tr>
              ))}
            </tbody>
```

(`Link` est déjà importé dans ce fichier. Le composant reste un Server Component ; seul l'identifiant du compte est rendu dans le lien.)

- [ ] **Step 4: Parcours E2E « Équipe » et test de fuite `@prod` étendu**

Dans `tests/e2e/backoffice.spec.ts`, remplacer intégralement le test `no contact e-mail or phone reaches the browser in page payloads @prod` (du `test(` jusqu'à la fin du fichier) par :

```ts
test("the company team links each employee to their platform account", async ({ page }) => {
  // Read-only.
  await login(page);
  await openCompany(page, "matam", /Matam Express/);
  await page.getByRole("tab", { name: "Équipe" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "Khady Faye" }).click();
  await expect(page.getByRole("heading", { name: "Khady Faye" })).toBeVisible();
  await expect(page.getByText("Identifiant : khady-faye.matam-express")).toBeVisible();
  await expect(page.getByTestId("user-role")).toHaveText("Responsable de compagnie");

  await openCompany(page, "tamba", /Tamba Rapide/);
  await page.getByRole("tab", { name: "Équipe" }).click();
  await expect(page.getByRole("tabpanel").getByText("Pas encore de compte")).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(0);
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
  // The truncated form is really rendered (the negative checks above would pass on an empty page).
  await page.goto("/acces/sessions");
  await expect(page.getByRole("cell", { name: /^(41\.82|196\.207)\.\d{1,3}\.0$/ }).first()).toBeVisible();
  await page.goto(employeeUserPath);
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
});
```

`FULL_IP` ne peut pas correspondre à une adresse tronquée : après `41.82.<c>.`, il exige un dernier octet qui commence par `1`-`9`, or la forme tronquée finit par `.0`. Les deux assertions positives finales empêchent le test de passer sur une page vide. `ANY_SN_EMAIL` attrape les e-mails d'employés, d'administrateurs (`@sira.sn`) et de clients (`@client.sn`) ; `PHONES[1]` attrape tous les téléphones de comptes (`+2217865…`, y compris `+22178659…` des administrateurs et clients).

- [ ] **Step 5: README**

Dans `README.md` :

1. Remplacer la ligne qui commence par `Lot 1 : socle, Vue 360, Compagnies. Lot 2 :` par :

```markdown
Lot 1 : socle, Vue 360, Compagnies. Lot 2 : offre (plans, fonctionnalités, paliers partenaires, types de documents KYC) et facturation SaaS (abonnements, paiements, factures, impayés). Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Données statiques typées, aucun appel réseau.
```

2. Dans la puce `src/lib/actions/run.ts`, remplacer la dernière phrase (celle qui commence par « Les actions vivent dans ») par :

```markdown
Les actions vivent dans `compagnies/actions.ts`, `facturation/actions.ts`, `offre/actions.ts`, `utilisateurs/actions.ts` et `acces/actions.ts` ; `runReveal` est la variante qui renvoie une donnée personnelle après journalisation.
```

3. Ajouter, juste avant la puce `src/lib/auth` (celle qui commence par « jeton HMAC »), la puce :

```markdown
- `src/lib/repos/access.ts` : comptes de la plateforme, rôles, permissions et sessions (une session est active si elle n'est ni révoquée ni expirée à la date de référence injectée). Changer un rôle révoque toutes les sessions actives du compte ; un compte ne change pas son propre rôle et le dernier administrateur actif ne peut pas être rétrogradé. Les composants clients ne reçoivent que `UserRow` (sans e-mail ni téléphone), `SessionRow` (adresse IP tronquée `a.b.c.0`) et des scalaires.
```

4. Remplacer la puce qui commence par `- Données personnelles :` par :

```markdown
- Données personnelles : l'e-mail et le téléphone de contact d'une compagnie ou d'un compte ne sont jamais présents dans le HTML de la page, seulement leur forme masquée ; les adresses IP des sessions sont tronquées. La valeur réelle n'est renvoyée que par une Server Action de révélation (session vérifiée, révélation journalisée sans la valeur).
```

5. Remplacer le titre `## Limites connues (lots 1 et 2)` par `## Limites connues (lots 1 à 3)`, et remplacer la puce `- Les sections autres que Vue 360, Compagnies, Offre et Facturation affichent « Bientôt disponible ».` par :

```markdown
- Accès : ni création, ni suppression, ni suspension de compte, ni réinitialisation de mot de passe ; la matrice des permissions est en lecture seule. L'administrateur connecté au backoffice n'est pas un compte de la plateforme (rôle « administrateur plateforme » distinct, prérequis backend) : la règle « on ne change pas son propre rôle » est appliquée mais ne se déclenche que si l'identité de la session correspond à l'e-mail ou à l'identifiant d'un compte.
- Les sections autres que Vue 360, Compagnies, Offre, Facturation, Utilisateurs et accès affichent « Bientôt disponible ».
```

- [ ] **Step 6: Revue de sécurité des frontières serveur → client**

Pour chaque composant client ajouté ou modifié par le lot, vérifier dans le code que ses props correspondent exactement à cette liste, que les imports depuis `@/lib/repos/access` sont des `import type`, et qu'aucun n'importe `getStore`, un dépôt ou `@/lib/data/seed` :

| Composant client | Props reçues |
|---|---|
| `UsersTable` | `UserRow[]` (10 clés, sans e-mail ni téléphone) |
| `UserActions` | `userId`, `displayName`, `roleCode`, `roles` (`RoleOption[]` : `code`, `name`), `activeSessions` |
| `UserContactField` | `userId`, `field`, `masked` (chaîne déjà masquée côté serveur) |
| `SessionsTable` | `SessionRow[]` (12 clés, `ip` tronquée) |
| `RevokeSessionButton` | `sessionId`, `label` (identifiant et appareil) |
| `ConfirmDialog` (modifié) | `children` (nœuds rendus par `UserActions`), `confirmDisabled` |
| `StatusFilterNav` (modifié, serveur) | `param`, `keep` (valeurs de filtre de l'URL) |

`UserTabs`, les pages Rôles, Permissions et les `page.tsx` sont des Server Components.

Run :

```bash
grep -rn 'from "@/lib/repos/access"' src | grep -v "import type"
grep -rlE '^"use client"' src | xargs grep -lE 'getStore|lib/data/seed|[a-zA-Z]+Repo\.'
```

La première commande ne doit lister que des `page.tsx`, les deux fichiers `actions.ts` et `src/components/access/user-tabs.tsx` (Server Component, qui importe la valeur `PERMISSION_DOMAINS`). La seconde ne doit rien afficher (code de sortie 1). Si une ligne contredit le tableau, corriger le composant (projection), pas le tableau.

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
- Vitest : **259 tests** verts ;
- build OK : `/utilisateurs`, `/utilisateurs/[id]`, `/acces/roles`, `/acces/permissions` et `/acces/sessions` apparaissent comme dynamiques `ƒ` ;
- Playwright : **23 tests** passent (22 sur le projet `dev`, 1 sur le projet `prod`) ;
- `git status --short` ne montre ni `tsconfig.json` ni `next-env.d.ts`.

Si un sélecteur échoue, corriger le **composant** (libellé accessible, `data-testid`) plutôt que le test, sauf faute manifeste dans le test.

- [ ] **Step 8: Vérification visuelle (clair et sombre)**

`pnpm dev`, se connecter, parcourir dans les deux thèmes : `/utilisateurs` (les deux groupes de filtres combinés, par exemple `?role=USER&statut=suspended`), la fiche de `lamine.camara` (4 onglets, dialogue « Changer le rôle » avec sa liste déroulante, sans confirmer), `/acces/roles` (détails repliables), `/acces/permissions` (largeur de la matrice : défilement horizontal du tableau seulement, jamais de la page), `/acces/sessions` (filtre par rôle), l'onglet Équipe de Matam Express. Vérifier : la barre latérale n'affiche plus « bientôt » sur la section « Utilisateurs et accès », le fil d'Ariane d'une fiche (« Accueil › Utilisateurs › Fiche ») rend « Utilisateurs » cliquable, celui de `/acces/roles` affiche « Accueil › Accès › Rôles » avec « Accès » non cliquable, contraste lisible. Arrêter le serveur.

- [ ] **Step 9: Commit final**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts src/components/company/company-tabs.tsx tests/e2e/backoffice.spec.ts README.md
git commit -m "feat: enable users and access navigation, link company team to accounts, extend the payload leak test

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Limites connues du lot 3

- Le compte de l'administrateur connecté n'est pas modélisé : la garde d'auto-modification n'est exercée que par les tests unitaires et d'action (décision 1).
- Pas de verrou ni de versionnement : deux administrateurs qui changent le même rôle en même temps, le dernier écrit gagne (store en mémoire, un seul processus).
- `lastLoginAt` n'est pas mis à jour par les actions (aucune connexion n'est simulée) ; après une révocation, la fiche garde la dernière connexion d'origine.
- L'onglet Activité d'un compte ne montre que les actions faites depuis le démarrage du serveur (décision 6).
- Aucun écran ne permet de consulter les sessions révoquées ou expirées de toute la plateforme : `/acces/sessions` ne liste que les sessions actives ; l'historique d'un compte est sur sa fiche.
- La matrice des permissions est en lecture seule et la graine reflète les migrations de la plateforme à la date du lot : une nouvelle permission côté `identity-service` doit être ajoutée à la graine à la main.

---

## Auto-revue

### Couverture du spec

| Exigence du spec | Tâche |
|---|---|
| Types `PlatformUser`, `Role`, `PermissionDef`, `RolePermission`, `UserSession` | 1 |
| Rôles `ADMIN`, `MANAGER`, `GUICHETIER`, `CHAUFFEUR`, `USER` ; codes de permission réels rattachés à un domaine | 1 (`access-seed.test.ts`, décisions 3 et 4) |
| Graine : un compte par employé, clients `USER`, 2 administrateurs, 2 suspendus, 1 à 3 sessions par compte actif dont des révoquées, formats d'e-mail et de téléphone des employés | 1 (décisions 2 et 7) |
| Cohérence de la graine (chaque session a un compte, chaque compte un rôle, matrice fidèle, aucun contact dans le journal, dates de session ordonnées, compte suspendu sans session active, `lastLoginAt` cohérent) | 1 (`access-seed.test.ts`, `access-repo.test.ts`) |
| Session expirée jamais active, date de référence injectée | 1 (`sessionState`, Step 5) |
| `/utilisateurs` : colonnes, filtres rôle et statut, recherche sur le nom et l'identifiant | 1 (dépôt), 4 (page) |
| `/utilisateurs/[id]` : Profil (contacts masqués, révélation journalisée), Rôle et permissions, Sessions, Activité ; « Changer le rôle » et « Révoquer toutes les sessions » avec motif | 2, 3, 4 |
| Changer le rôle : rôle existant, refus si identique, pas de changement de son propre rôle, dernier `ADMIN` actif protégé, motif, révocation en cascade « Changement de rôle », activité plateforme sans contact | 2 (règles et preuves), 3 (action), 4 (UI et E2E) |
| Révoquer toutes les sessions / une session : refus s'il n'y a rien à révoquer, motif, `revokedAt` et `revokedReason` | 2, 3, 4, 6 |
| `revealUserContact(userId, field)` calqué sur `revealContact` : session d'abord, journalisation sans la valeur, valeur renvoyée seulement en cas de succès | 2, 3 (`runReveal`), 4 |
| `/acces/roles` : nombre d'utilisateurs et de permissions, détail repliable, lecture seule | 1, 5 |
| `/acces/permissions` : matrice permissions × rôles regroupée par domaine (11 domaines), lecture seule | 1, 5 |
| `/acces/sessions` : sessions actives, IP tronquée `a.b.c.0`, début, dernière activité, expiration, filtrables, révocation avec motif | 1, 3, 6 |
| `src/lib/repos/access.ts` avec `usersRepo`, `rolesRepo`, `permissionsRepo`, `sessionsRepo` ; actions dans `utilisateurs/actions.ts` et `acces/actions.ts` via `run()` | 1, 2, 3 |
| Projections `UserRow`, `SessionRow`, `RoleRow`, `PermissionMatrix` sans PII ; fiche avec chaînes masquées et scalaires seulement | 1 (tests `Object.keys`), 4, 7 (revue) |
| Navigation : 4 entrées implémentées, `nav.test.ts` mis à jour ; lien Équipe → `/utilisateurs/[id]` quand un compte existe ; Vue 360 inchangée | 7 (décision 6 pour la Vue 360) |
| Vitest : dépôts, règles, IP tronquée, actions (session d'abord, `ActionResult`, motif ≤ 500, aucune écriture sans session), cohérence | 1, 2, 3 |
| Playwright : changement de rôle avec motif puis révocation constatée ; révocation depuis `/acces/sessions` ; dernier administrateur refusé avec message ; matrice `MANAGER` ; révélation depuis la fiche ; `@prod` étendu aux 5 écrans (e-mail, téléphone, IP complète) | 4, 5, 6, 7 |
| Hors périmètre (création, suppression, suspension, mot de passe, édition de la matrice, 2FA, rôle admin distinct, API) | contraintes globales, README |

### Recherche de trous

Aucun « TBD », « TODO », « similaire à » ni étape sans code. Chaque étape de code donne le fichier complet ou le bloc exact à remplacer avec son ancre textuelle (Task 1 Steps 1 et 3 pour `types/index.ts` et `seed.ts`, Task 4 Step 2 pour `labels.ts`, Task 7 Steps 1 à 3 pour `nav.test.ts`, `nav.ts` et `company-tabs.tsx`, Task 7 Step 5 pour le README).

### Cohérence des noms et des types

- `sessionState(session, now)` (Task 1) → `SessionRow.state`, `activeRows`, `activeSessionsOf` (Task 1) → gardes de `changeRole`, `revokeAllSessions`, `sessionsRepo.revoke` (Task 2) → `sessionStateBadge` (Task 4).
- `truncateIp` (Task 1, `mask.ts`) → `SessionRow.ip` (Task 1) → colonne « Adresse IP » (Tasks 4 et 6) → `FULL_IP` du test `@prod` (Task 7).
- `addActivity(…, now, userId)` (Task 2) → `UserDetail.activity` filtré sur `userId` (Task 1) → onglet Activité (Task 4).
- `ROLE_CHANGE_REASON` (Task 2) → cellule « Changement de rôle » attendue par l'E2E (Task 4).
- `runReveal` / `RevealResult` (Task 3) → `revealUserContact` (Task 3) → `UserContactField` (Task 4).
- `changeUserRole`, `revokeUserSessions` (Task 3) → `UserActions` (Task 4) ; `revokeSession` (Task 3) → `RevokeSessionButton` (Task 6).
- `rolesRepo.options()` / `RoleOption` (Task 1) → filtres de `/utilisateurs` et `/acces/sessions`, liste de `UserActions` (Tasks 4 et 6), `PermissionMatrix.roles` (Task 1) → colonnes de la matrice (Task 5).
- `PERMISSION_DOMAINS` (Task 1) → `permissionsOf`, `matrix` (Task 1), `UserTabs` (Task 4), page Rôles (Task 5) ; `permissionDomainLabel` (Task 4) → `UserTabs`, pages Rôles et Permissions.
- `filterHref` (Task 4) → `StatusFilterNav` (`param`, `keep`) → pages `/utilisateurs` (Task 4) et `/acces/sessions` (Task 6) ; pages du lot 2 inchangées.
- `ConfirmDialog.children` / `confirmDisabled` (Task 4) → `UserActions` seulement.
- `Employee.userId` (Task 1) → onglet Équipe (Task 7).
- Libellés accessibles attendus par l'E2E et produits par les composants : placeholders `Rechercher un utilisateur…`, `Rechercher une session…` ; boutons `Changer le rôle`, `Révoquer toutes les sessions`, `Révoquer la session <identifiant> · <appareil>`, `Révoquer la session`, `Révéler la donnée` (lot 1), `Annuler` ; champs `Nouveau rôle`, `Motif (obligatoire)` ; onglets `Sessions`, `Activité`, `Équipe` (lot 1) ; `data-testid` `user-role`, `user-status`, `active-session-count`, `masked-email` (lot 1), `role-users-<CODE>`, `role-permissions-<CODE>`, `grant-<RÔLE>-<PERMISSION>` ; textes `Utilisateur introuvable`, `Pas encore de compte`, `Identifiant : <identifiant>`, `Permissions du rôle « <nom> »`.
- Versions vérifiées dans `node_modules` : `@tanstack/react-table` 8.21.3 (`ColumnDef<T, unknown>`, `accessorKey`, `enableSorting`, `getRowId`), `next` 15.5 (`params`/`searchParams` en `Promise`, `notFound`, `revalidatePath`), `react` 19.3 (`Fragment` avec `key`), `vitest` 5.0.5 (`vi.mock` hissé, `mockResolvedValue`). Tailwind v4 fournit `sr-only`.

### Pré-validation

Le code de ce plan a été appliqué une fois, tel qu'écrit, dans une copie jetable du dépôt (hors du dépôt, `node_modules` partagé par lien symbolique), puis rejoué **tâche par tâche** dans une seconde copie partant de `main` pour vérifier que chaque tâche compile et passe seule : `tsc --noEmit` sans erreur à chaque tâche, **259 tests Vitest** verts aux comptes annoncés (217, 235, 252, 257, 257, 257, 259), `next build` réussi (les 5 nouvelles routes en `ƒ`), et Playwright : **23 tests** passés (22 `dev` + 1 `prod`). Les mutations des étapes « Prouver » (Tasks 1, 2 et 3) ont été exécutées : chacune fait échouer exactement les tests nommés, et la restauration rend la suite verte. Trois défauts trouvés par cette pré-validation ont été corrigés dans le plan : (1) l'E2E de la page Rôles cherchait `BOOKING_MANAGE` dans toute la page, or la première occurrence est dans le détail replié de l'`ADMIN` (invisible) : la recherche est désormais limitée au `<details>` du rôle, et le résumé, qui donnait « Voir les permissions de Agent de vente », devient « Permissions du rôle « Agent de vente » » ; (2) le test « Équipe » utilisait Kolda Voyages pour le cas « pas de compte », or le test KYC du lot 1 l'active : il utilise Tamba Rapide, qu'aucun test ne mute ; (3) après une révélation, l'onglet Activité restait périmé (l'action revalide le chemin mais le client ne se rafraîchissait pas) : `UserContactField` appelle `router.refresh()`.
