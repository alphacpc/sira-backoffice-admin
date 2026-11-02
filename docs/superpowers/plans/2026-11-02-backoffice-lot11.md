# Backoffice Sira, lot 11 : recherche globale. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la recherche globale : la page `/recherche` (résultats groupés par type) et des résultats d'enregistrements dans la palette ⌘K existante, sur données statiques typées, sans jamais interroger ni renvoyer un e-mail ou un téléphone.

**Architecture:** Un module pur `src/lib/search-query.ts` (normalisation, rang, refus des requêtes de type contact) utilisable côté serveur et client ; un dépôt `src/lib/repos/search.ts` qui interroge 11 types d'enregistrements par nom ou code ; une page serveur `/recherche` (formulaire GET sans JavaScript) ; une Server Action `searchEverywhere` pour la palette ; la palette passe à un filtrage local (`src/lib/palette.ts`) plus une section « Enregistrements » alimentée par le serveur.

**Tech Stack:** Next.js 15.5, React 19, TypeScript ^5 strict (`noUncheckedIndexedAccess`), Tailwind v4, cmdk (déjà utilisé), Vitest 5, Playwright, pnpm. Aucune nouvelle dépendance.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier. Aucune nouvelle dépendance npm.
- **Prérequis : les lots 4 à 10 sont terminés et commités.** Avant de commencer : `pnpm test` et `pnpm typecheck` verts, **relever le nombre de tests unitaires et E2E de départ**. Vérifier par `grep` que : `store.systemIncidents` (lot 9), `store.notifications`, `store.marketingCampaigns` (lot 7), `store.invoices`, `store.buses`, `store.parcels`, `store.tickets`, `store.bookings`, `store.customers`, `store.users`, `store.roles`, `store.companies` existent ; que les pages de détail `/compagnies/[id]`, `/utilisateurs/[id]`, `/clients/comptes/[id]`, `/ventes/reservations/[id]`, `/ventes/billets/[code]`, `/colis/[id]`, `/facturation/factures/[id]`, `/flotte/bus/[id]`, `/supervision/incidents/[id]`, `/communication/campagnes/[id]`, `/communication/notifications/[id]` existent ; que les codes semés (`BK-`, `TK-`, `PCL-`, `TRK-`, `NTF-`) contiennent des lettres (sinon la détection « téléphone » refuserait des requêtes légitimes).
- Interface en **français uniquement** (accents exacts). Style C clair et sombre. Données **statiques typées**, aucun appel réseau, aucun branchement au backend.
- Pages : Server Components avec `export const dynamic = "force-dynamic"` ; `searchParams` typé `Promise<…>` et attendu avec `await`.
- **Server Actions = points d'entrée HTTP publics** : `searchEverywhere` passe par `runValue()` (session vérifiée **avant** toute lecture) et ne lève jamais d'exception pour un échec attendu.
- **Aucune donnée de contact** : ni recherchée (aucun champ e-mail ou téléphone n'est lu par `searchRepo`), ni affichée, ni renvoyée dans la page ou dans l'URL. Les requêtes de type contact sont refusées par `queryProblem` avant toute recherche, **redirigées** vers `/recherche?refus=contact` (la valeur saisie disparaît de l'URL) et jamais réaffichées. Un résultat est une projection `SearchHit` construite champ par champ (`type`, `id`, `label`, `sublabel`, `href`), prouvée par `Object.keys`. Noms de passagers, d'expéditeurs, de destinataires et contenus de messages ne sont jamais interrogés. Le composant client de la palette n'importe `@/lib/repos/search` qu'en `import type`.
- Règles de requête (messages exacts, ordre imposé) : `"Saisis au moins 2 caractères"` (après trim) → `"La recherche est trop longue (100 caractères maximum)"` → `"La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant."` (contient `@`, ou uniquement des chiffres, espaces et `+ ( ) . -` avec au moins 7 chiffres).
- Tests unitaires qui lisent le store : `resetStore(NOW)` dans `beforeEach`, aucune dépendance à l'ordre, pas d'assertion qui passerait sur un tableau vide. Tests E2E : chaque test se connecte lui-même, sélecteurs accessibles ou `data-testid`, aucun `waitForTimeout`. Ce lot ne mute aucune donnée : aucune entité de graine n'est possédée par un test.
- Toute garde nouvelle (session d'abord, chaque garde de requête et leur ordre, normalisation, rang, limites, exclusion des champs personnels) est prouvée par un test **qui échoue quand on la retire** : l'implémenteur applique la mutation indiquée, constate l'échec du test nommé, restaure (`git diff` vide sur le fichier), constate le vert.
- `pnpm build` (et donc `pnpm e2e`) réécrit `tsconfig.json` : après chaque build ou E2E, `git checkout tsconfig.json` ; ne jamais committer cette réécriture ni `next-env.d.ts`. Si `pnpm typecheck` signale des erreurs **dans `.next/types/`** pour des routes qui n'existent pas, supprimer `.next` et relancer.
- Commits : message court en anglais (`feat:`/`test:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Hors périmètre : recherche par contact, recherche floue, plein texte dans les messages ou journaux, filtres sauvegardés, historique, surlignage, branchement aux API.

## Décisions prises en écrivant le plan (ambiguïtés ou écarts du spec)

1. **Redirection des requêtes de type contact** (écart au spec, qui disait seulement « refusée ») : la page redirige vers `/recherche?refus=contact` et affiche le message ; sinon la valeur saisie resterait dans l'URL et l'historique du navigateur. À reporter dans le spec (section Règles) : « une requête de type contact est redirigée vers `/recherche?refus=contact` ». Les requêtes trop courtes ou trop longues restent sur place, sans être réaffichées si trop longues.
2. **Rang** : calculé sur la première occurrence de la requête normalisée dans le champ ; 0 égalité exacte, 1 début du texte, 2 début de mot (caractère précédent parmi espace, `-`, `_`, `.`, `/`), 3 ailleurs. Le meilleur rang des champs d'un enregistrement est retenu.
3. **Types et ordre des groupes** : `company`, `user`, `customer`, `booking`, `ticket`, `parcel`, `invoice`, `bus`, `incident`, `campaign`, `notification`. Les libellés de groupe sont au pluriel (« Compagnies », « Comptes plateforme », « Comptes clients », « Réservations », « Billets », « Colis », « Factures », « Bus », « Incidents », « Campagnes », « Notifications »).
4. **Sous-libellés sans donnée personnelle** : compagnie → libellé du statut (`companyStatusBadge`) ; compte plateforme → `identifiant · nom du rôle` ; compte client → `Compte client` ; réservation, billet, colis, facture, bus, campagne, notification → nom de la compagnie (`—` si introuvable) ; incident → nom du service.
5. **Palette** : `shouldFilter={false}` sur `Command` ; les pages et compagnies sont filtrées localement par `filterByQuery` (insensible aux accents et à la casse) ; l'état « aucun résultat » est calculé par le composant (pas `Command.Empty`) ; le placeholder reste `Aller à une page ou une compagnie…` pour ne pas casser le test E2E existant.
6. **Retrait du test « coming-soon »** : après ce lot, plus aucune entrée de navigation n'est « bientôt disponible ». Le test E2E `unimplemented sections show a coming-soon page` est **remplacé** par un test qui vérifie qu'un chemin inconnu répond `404` ; la page `[...slug]` reste en place.
7. **Aucune graine nouvelle.** Les tests de dépôt lisent le store (valeurs semées) et construisent leurs requêtes à partir de ces valeurs.

## Carte des fichiers

```
src/lib/search-query.ts                          (créé)   normalizeText, matchRank, queryProblem, isContactLike, limites
src/lib/palette.ts                               (créé)   filterByQuery
src/lib/repos/search.ts                          (créé)   searchRepo, SEARCH_TYPES, SearchHit/Group/Result
src/app/(admin)/recherche/actions.ts             (créé)   searchEverywhere
src/app/(admin)/recherche/page.tsx               (créé)   page de résultats
src/components/shell/command-palette.tsx         (modifié) filtrage local + enregistrements + « Voir tous »
src/lib/nav.ts                                   (modifié) /recherche implémentée, libellé « Recherche »
tests/unit/{search-query,palette,search-repo,search-actions}.test.ts   (créés)
tests/unit/nav.test.ts                           (modifié)
tests/e2e/backoffice.spec.ts                     (modifié)
README.md, docs/superpowers/specs/2026-11-02-backoffice-lot11-design.md   (modifiés)
```

---
### Task 1: Module de requête pur (TDD)

**Files:**
- Create: `src/lib/search-query.ts`, `tests/unit/search-query.test.ts`

**Interfaces:**
- Produces: `MIN_QUERY = 2`, `MAX_QUERY = 100`, `PAGE_LIMIT = 25`, `PALETTE_LIMIT = 4`, `CONTACT_QUERY_MESSAGE`, `normalizeText(text): string`, `matchRank(text, normalizedQuery): number | null`, `isContactLike(raw): boolean`, `queryProblem(raw): string | null`.

- [ ] **Step 1: Test (rouge)**

Créer `tests/unit/search-query.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  CONTACT_QUERY_MESSAGE, isContactLike, matchRank, MAX_QUERY, normalizeText, queryProblem,
} from "@/lib/search-query";

describe("normalizeText", () => {
  it("lowercases, strips accents and collapses spaces", () => {
    expect(normalizeText("  Aïssatou   SARR ")).toBe("aissatou sarr");
    expect(normalizeText("Thiès Éléphant")).toBe("thies elephant");
    expect(normalizeText("")).toBe("");
  });
  it("keeps hyphens and digits", () => {
    expect(normalizeText("BK-8F3A21")).toBe("bk-8f3a21");
  });
});

describe("matchRank", () => {
  it("ranks exact, prefix, word start and inside matches, null otherwise", () => {
    expect(matchRank("Aïssatou Sarr", "aissatou sarr")).toBe(0);
    expect(matchRank("Aïssatou Sarr", "aissatou")).toBe(1);
    expect(matchRank("Aïssatou Sarr", "sarr")).toBe(2);
    expect(matchRank("Aïssatou Sarr", "ssa")).toBe(3);
    expect(matchRank("Aïssatou Sarr", "diop")).toBeNull();
  });
  it("treats hyphen, underscore, dot and slash as word starts", () => {
    expect(matchRank("louga-trans", "trans")).toBe(2);
    expect(matchRank("a_b", "b")).toBe(2);
    expect(matchRank("moustapha.ndiaye", "ndiaye")).toBe(2);
    expect(matchRank("a/b", "b")).toBe(2);
    expect(matchRank("abc", "bc")).toBe(3);
  });
  it("matches codes by prefix", () => {
    expect(matchRank("BK-8F3A21", "bk-")).toBe(1);
    expect(matchRank("BK-8F3A21", "8f3a")).toBe(2);
  });
});

describe("isContactLike", () => {
  it("detects e-mail addresses and phone numbers", () => {
    expect(isContactLike("someone@example.sn")).toBe(true);
    expect(isContactLike("@x")).toBe(true);
    expect(isContactLike("+221 77 123 45 67")).toBe(true);
    expect(isContactLike("(221) 77.123.45.67")).toBe(true);
    expect(isContactLike("7712345")).toBe(true);
  });
  it("accepts names, codes and short numbers", () => {
    expect(isContactLike("Aïssatou Sarr")).toBe(false);
    expect(isContactLike("BK-12345678")).toBe(false);
    expect(isContactLike("TRK-0123456789")).toBe(false);
    expect(isContactLike("771234")).toBe(false);
    expect(isContactLike("+22 1")).toBe(false);
  });
});

describe("queryProblem", () => {
  it("accepts a valid query", () => {
    expect(queryProblem("louga")).toBeNull();
    expect(queryProblem("  ab  ")).toBeNull();
    expect(queryProblem("x".repeat(MAX_QUERY))).toBeNull();
  });
  it("refuses a query that is too short after trimming", () => {
    expect(queryProblem("")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem("   ")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem(" a ")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem("@")).toBe("Saisis au moins 2 caractères");
  });
  it("refuses a query that is too long", () => {
    expect(queryProblem("x".repeat(MAX_QUERY + 1))).toBe("La recherche est trop longue (100 caractères maximum)");
  });
  it("refuses contact-like queries with the contact message", () => {
    expect(CONTACT_QUERY_MESSAGE).toBe("La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant.");
    expect(queryProblem("someone@example.sn")).toBe(CONTACT_QUERY_MESSAGE);
    expect(queryProblem("+221 77 123 45 67")).toBe(CONTACT_QUERY_MESSAGE);
  });
  it("checks too short, then too long, then contact", () => {
    expect(queryProblem("@")).toBe("Saisis au moins 2 caractères");
    expect(queryProblem(`${"@".repeat(MAX_QUERY)}x`)).toBe("La recherche est trop longue (100 caractères maximum)");
  });
});
```

Run: `pnpm test tests/unit/search-query.test.ts` → FAIL (module absent).

- [ ] **Step 2: Implémenter**

Créer `src/lib/search-query.ts` :

```ts
/** Pure helpers shared by the server (repository, action) and the client (palette). No store access. */

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
export const PAGE_LIMIT = 25;
export const PALETTE_LIMIT = 4;
export const CONTACT_QUERY_MESSAGE =
  "La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant.";

/** Lowercase, accents stripped, runs of spaces collapsed, trimmed. */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Rank of the first occurrence of an already normalised query in a text: 0 exact, 1 start, 2 start of a word
 * (preceded by a space, `-`, `_`, `.` or `/`), 3 elsewhere; `null` when absent.
 */
export function matchRank(text: string, normalizedQuery: string): number | null {
  const n = normalizeText(text);
  const at = n.indexOf(normalizedQuery);
  if (at < 0) return null;
  if (at === 0) return n === normalizedQuery ? 0 : 1;
  return /[\s\-_./]/.test(n[at - 1]!) ? 2 : 3;
}

/** An e-mail address (contains `@`) or a phone number (digits and separators only, at least 7 digits). */
export function isContactLike(raw: string): boolean {
  const t = raw.trim();
  if (t.includes("@")) return true;
  return /^[+\d\s().-]+$/.test(t) && t.replace(/\D/g, "").length >= 7;
}

/** Why a query cannot be searched, `null` when it can. Order: too short, too long, contact-like. */
export function queryProblem(raw: string): string | null {
  const t = raw.trim();
  if (t.length < MIN_QUERY) return "Saisis au moins 2 caractères";
  if (t.length > MAX_QUERY) return "La recherche est trop longue (100 caractères maximum)";
  if (isContactLike(t)) return CONTACT_QUERY_MESSAGE;
  return null;
}
```

Run: `pnpm test tests/unit/search-query.test.ts` → PASS.

- [ ] **Step 3: Mutations (preuves)**

1. `normalizeText` : retirer `.normalize("NFD").replace(/\p{M}/gu, "")` → échoue `lowercases, strips accents…`.
2. `matchRank` : remplacer `n === normalizedQuery` par `false` → échoue `ranks exact, prefix…`.
3. Retirer `_` ou `/` de la classe de séparateurs → échoue `treats hyphen, underscore, dot and slash as word starts`.
4. `isContactLike` : remplacer `>= 7` par `>= 6` → échoue `accepts names, codes and short numbers` (`771234`).
5. Retirer la première ligne (`includes("@")`) → échoue `detects e-mail addresses…`.
6. `queryProblem` : tester le contact avant la longueur → échoue `checks too short, then too long, then contact`.
7. Remplacer `t.length < MIN_QUERY` par `<= MIN_QUERY` → échoue `accepts a valid query` (`ab`).
8. Remplacer `> MAX_QUERY` par `>= MAX_QUERY` → échoue le même test (borne à 100).

- [ ] **Step 4: Commit**

```bash
git add src/lib/search-query.ts tests/unit/search-query.test.ts
git commit -m "feat: search query helpers (normalisation, rank, contact refusal)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Dépôt de recherche (TDD)

**Files:**
- Create: `src/lib/repos/search.ts`, `tests/unit/search-repo.test.ts`

**Interfaces:**
- Consumes: `getStore()`, `companyStatusBadge`, helpers de la Task 1.
- Produces: `SEARCH_TYPES`, `type SearchType`, `SEARCH_TYPE_LABELS`, `SearchHit`, `SearchGroup`, `SearchResult`, `searchRepo.search(raw, { types?, limitPerType }): SearchResult`.

- [ ] **Step 1: Test (rouge)**

Créer `tests/unit/search-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import { SEARCH_TYPES, SEARCH_TYPE_LABELS, searchRepo, type SearchType } from "@/lib/repos/search";
import { CONTACT_QUERY_MESSAGE, PAGE_LIMIT } from "@/lib/search-query";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const run = (q: string, limitPerType = PAGE_LIMIT, types?: readonly SearchType[]) =>
  searchRepo.search(q, { limitPerType, types });
const group = (q: string, type: SearchType, limit = PAGE_LIMIT) => run(q, limit).groups.find((g) => g.type === type);
const companyName = (id: string) => getStore().companies.find((c) => c.id === id)?.name ?? "—";

describe("search problems", () => {
  it("returns the problem and reads nothing for an unusable query", () => {
    expect(run("a")).toEqual({ problem: "Saisis au moins 2 caractères", groups: [] });
    expect(run("someone@example.sn")).toEqual({ problem: CONTACT_QUERY_MESSAGE, groups: [] });
    expect(run("+221 77 123 45 67").groups).toEqual([]);
  });
  it("returns no problem and no group when nothing matches", () => {
    expect(run("zzzqqqxxx")).toEqual({ problem: null, groups: [] });
  });
});

describe("companies", () => {
  it("finds a company by name, accent- and case-insensitively, linking to its page", () => {
    const company = getStore().companies.find((c) => c.name === "Louga Trans")!;
    const g = group("LOUGA tr", "company")!;
    expect(g.label).toBe("Compagnies");
    expect(g.hits[0]).toEqual({
      type: "company", id: company.id, label: "Louga Trans", sublabel: expect.any(String), href: `/compagnies/${company.id}`,
    });
  });
  it("also finds a company by slug, registration number and NINEA, never by contact data", () => {
    const c = getStore().companies[0]!;
    for (const field of [c.slug, c.registrationNumber, c.ninea]) {
      expect(group(field, "company")!.hits.map((h) => h.id), field).toContain(c.id);
    }
    expect(run(c.contactEmail).groups).toEqual([]);
    expect(run(c.contactPhone).groups).toEqual([]);
  });
});

describe("platform and client accounts", () => {
  it("finds a platform account by username or display name, with the role in the sublabel", () => {
    const u = getStore().users.find((x) => x.roleCode === "ADMIN")!;
    const hit = group(u.username, "user")!.hits.find((h) => h.id === u.id)!;
    expect(hit).toMatchObject({ label: u.displayName, href: `/utilisateurs/${u.id}` });
    expect(hit.sublabel).toBe(`${u.username} · Administrateur`);
    expect(group(u.displayName.split(" ")[0]!, "user")!.hits.map((h) => h.id)).toContain(u.id);
  });
  it("finds the accent-insensitive display name", () => {
    expect(group("aissatou", "user")!.hits.some((h) => h.label === "Aïssatou Sarr")).toBe(true);
  });
  it("never finds an account by e-mail or phone", () => {
    const u = getStore().users[0]!;
    expect(run(u.email).groups).toEqual([]);
    expect(run(u.phone).groups).toEqual([]);
    expect(run(u.email.split("@")[1]!).groups.some((g) => g.type === "user")).toBe(false);
  });
  it("finds a client account by name", () => {
    const c = getStore().customers[0]!;
    const hit = group(c.name, "customer")!.hits.find((h) => h.id === c.id)!;
    expect(hit).toEqual({ type: "customer", id: c.id, label: c.name, sublabel: "Compte client", href: `/clients/comptes/${c.id}` });
  });
});

describe("sales, parcels and billing", () => {
  it("finds a booking by code but never by passenger name", () => {
    const b = getStore().bookings[0]!;
    const hit = group(b.bookingCode, "booking")!.hits.find((h) => h.id === b.id)!;
    expect(hit).toEqual({ type: "booking", id: b.id, label: b.bookingCode, sublabel: companyName(b.companyId), href: `/ventes/reservations/${b.id}` });
    expect(group(b.passengerName, "booking")?.hits.some((h) => h.id === b.id) ?? false).toBe(false);
  });
  it("finds a ticket by code, encoding the code in the link", () => {
    const t = getStore().tickets[0]!;
    const hit = group(t.ticketCode, "ticket")!.hits.find((h) => h.label === t.ticketCode)!;
    expect(hit.href).toBe(`/ventes/billets/${encodeURIComponent(t.ticketCode)}`);
    expect(hit.sublabel).toBe(companyName(t.companyId));
  });
  it("finds a parcel by code or tracking number but never by sender, recipient or phone", () => {
    const p = getStore().parcels[0]!;
    for (const q of [p.parcelCode, p.trackingNumber]) {
      expect(group(q, "parcel")!.hits.find((h) => h.id === p.id), q).toMatchObject({ label: p.parcelCode, href: `/colis/${p.id}` });
    }
    expect(group(p.recipientName, "parcel")?.hits.some((h) => h.id === p.id) ?? false).toBe(false);
    expect(group(p.senderName, "parcel")?.hits.some((h) => h.id === p.id) ?? false).toBe(false);
    expect(run(p.recipientPhone).groups).toEqual([]);
  });
  it("finds an invoice by number and a bus by code or plate", () => {
    const s = getStore();
    const inv = s.invoices[0]!;
    expect(group(inv.number, "invoice")!.hits.find((h) => h.id === inv.id)).toMatchObject({ href: `/facturation/factures/${inv.id}`, sublabel: companyName(inv.companyId) });
    const bus = s.buses[0]!;
    for (const q of [bus.busCode, bus.plate]) {
      expect(group(q, "bus")!.hits.find((h) => h.id === bus.id), q).toMatchObject({ href: `/flotte/bus/${bus.id}` });
    }
  });
});

describe("supervision and communication", () => {
  it("finds an incident by code or title, with the service as sublabel", () => {
    const i = getStore().systemIncidents[0]!;
    for (const q of [i.incidentCode, i.title]) {
      expect(group(q, "incident")!.hits.find((h) => h.id === i.id), q).toMatchObject({ href: `/supervision/incidents/${i.id}`, sublabel: i.serviceName });
    }
  });
  it("finds a campaign by name", () => {
    const c = getStore().marketingCampaigns[0]!;
    expect(group(c.name, "campaign")!.hits.find((h) => h.id === c.id)).toMatchObject({ href: `/communication/campagnes/${c.id}`, sublabel: companyName(c.companyId) });
  });
  it("finds a notification by code but never by content", () => {
    const n = getStore().notifications.find((x) => x.messageContent.length > 15)!;
    expect(group(n.notificationCode, "notification")!.hits.find((h) => h.id === n.id)).toMatchObject({ href: `/communication/notifications/${n.id}` });
    const words = n.messageContent.split(" ").filter((w) => w.length > 6 && !/^[A-Z]{2,3}-/.test(w));
    for (const w of words) expect(run(w).groups.some((g) => g.type === "notification"), w).toBe(false);
  });
});

describe("result shape, order and limits", () => {
  it("returns hits with exactly five fields and group labels from the map", () => {
    const g = group("bk-", "booking")!;
    expect(Object.keys(g.hits[0]!).sort()).toEqual(["href", "id", "label", "sublabel", "type"]);
    expect(Object.keys(g).sort()).toEqual(["hits", "label", "total", "type"]);
    expect(g.label).toBe(SEARCH_TYPE_LABELS.booking);
  });
  it("orders groups like SEARCH_TYPES and omits empty ones", () => {
    const types = run("a-").groups.map((g) => g.type);
    expect(types).toEqual(SEARCH_TYPES.filter((t) => types.includes(t)));
    expect(run("bk-").groups.map((g) => g.type)).toEqual(["booking"]);
  });
  it("sorts hits by rank then label", () => {
    const hits = group("bk-", "booking", 500)!.hits;
    const labels = hits.map((h) => h.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "fr")));
    const mixed = group("express", "company")!.hits;
    const first = mixed[0]!.label.toLowerCase();
    expect(first.startsWith("express") || mixed.every((h) => !h.label.toLowerCase().startsWith("express"))).toBe(true);
  });
  it("limits hits per type but reports the real total", () => {
    const total = getStore().bookings.length;
    expect(total).toBeGreaterThan(4);
    const g = group("bk-", "booking", 4)!;
    expect(g.hits).toHaveLength(4);
    expect(g.total).toBe(total);
    expect(group("bk-", "booking")!.hits).toHaveLength(Math.min(PAGE_LIMIT, total));
  });
  it("restricts to the requested types", () => {
    expect(run("bk-", 4, ["ticket"]).groups).toEqual([]);
    expect(run("bk-", 4, ["booking", "ticket"]).groups.map((g) => g.type)).toEqual(["booking"]);
  });
});
```

Run: `pnpm test tests/unit/search-repo.test.ts` → FAIL (module absent).

- [ ] **Step 2: Implémenter**

Créer `src/lib/repos/search.ts` :

```ts
import { companyStatusBadge } from "@/lib/labels";
import { getStore } from "@/lib/repos/store";
import { matchRank, normalizeText, queryProblem } from "@/lib/search-query";

export const SEARCH_TYPES = [
  "company", "user", "customer", "booking", "ticket", "parcel", "invoice", "bus", "incident", "campaign", "notification",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  company: "Compagnies", user: "Comptes plateforme", customer: "Comptes clients", booking: "Réservations",
  ticket: "Billets", parcel: "Colis", invoice: "Factures", bus: "Bus", incident: "Incidents",
  campaign: "Campagnes", notification: "Notifications",
};

/** Client-safe result: a label, a sublabel without personal data, and a link. */
export interface SearchHit { type: SearchType; id: string; label: string; sublabel: string; href: string }
export interface SearchGroup { type: SearchType; label: string; total: number; hits: SearchHit[] }
export interface SearchResult { problem: string | null; groups: SearchGroup[] }

interface Candidate { id: string; label: string; sublabel: string; href: string; fields: string[] }

function companyName(id: string): string {
  return getStore().companies.find((c) => c.id === id)?.name ?? "—";
}

/** Only names, codes and identifiers are listed in `fields`: never an e-mail, a phone, a person's name or a message. */
function candidates(type: SearchType): Candidate[] {
  const s = getStore();
  switch (type) {
    case "company":
      return s.companies.map((c) => ({
        id: c.id, label: c.name, sublabel: companyStatusBadge(c.status).label, href: `/compagnies/${c.id}`,
        fields: [c.name, c.slug, c.registrationNumber, c.ninea],
      }));
    case "user":
      return s.users.map((u) => ({
        id: u.id, label: u.displayName,
        sublabel: `${u.username} · ${s.roles.find((r) => r.code === u.roleCode)?.name ?? u.roleCode}`,
        href: `/utilisateurs/${u.id}`, fields: [u.username, u.displayName],
      }));
    case "customer":
      return s.customers.map((c) => ({
        id: c.id, label: c.name, sublabel: "Compte client", href: `/clients/comptes/${c.id}`, fields: [c.name],
      }));
    case "booking":
      return s.bookings.map((b) => ({
        id: b.id, label: b.bookingCode, sublabel: companyName(b.companyId), href: `/ventes/reservations/${b.id}`, fields: [b.bookingCode],
      }));
    case "ticket":
      return s.tickets.map((t) => ({
        id: t.id, label: t.ticketCode, sublabel: companyName(t.companyId),
        href: `/ventes/billets/${encodeURIComponent(t.ticketCode)}`, fields: [t.ticketCode],
      }));
    case "parcel":
      return s.parcels.map((p) => ({
        id: p.id, label: p.parcelCode, sublabel: companyName(p.companyId), href: `/colis/${p.id}`,
        fields: [p.parcelCode, p.trackingNumber],
      }));
    case "invoice":
      return s.invoices.map((i) => ({
        id: i.id, label: i.number, sublabel: companyName(i.companyId), href: `/facturation/factures/${i.id}`, fields: [i.number],
      }));
    case "bus":
      return s.buses.map((b) => ({
        id: b.id, label: b.busCode, sublabel: companyName(b.companyId), href: `/flotte/bus/${b.id}`, fields: [b.busCode, b.plate],
      }));
    case "incident":
      return s.systemIncidents.map((i) => ({
        id: i.id, label: i.incidentCode, sublabel: i.serviceName, href: `/supervision/incidents/${i.id}`,
        fields: [i.incidentCode, i.title],
      }));
    case "campaign":
      return s.marketingCampaigns.map((c) => ({
        id: c.id, label: c.name, sublabel: companyName(c.companyId), href: `/communication/campagnes/${c.id}`, fields: [c.name],
      }));
    case "notification":
      return s.notifications.map((n) => ({
        id: n.id, label: n.notificationCode, sublabel: companyName(n.companyId), href: `/communication/notifications/${n.id}`,
        fields: [n.notificationCode],
      }));
  }
}

function bestRank(fields: string[], query: string): number | null {
  let best: number | null = null;
  for (const f of fields) {
    const r = matchRank(f, query);
    if (r !== null && (best === null || r < best)) best = r;
  }
  return best;
}

export const searchRepo = {
  /** A query with a problem reads nothing. Groups follow `SEARCH_TYPES`; empty groups are left out. */
  search(raw: string, options: { types?: readonly SearchType[]; limitPerType: number }): SearchResult {
    const problem = queryProblem(raw);
    if (problem) return { problem, groups: [] };
    const query = normalizeText(raw);
    const wanted = options.types ?? SEARCH_TYPES;
    const groups: SearchGroup[] = [];
    for (const type of SEARCH_TYPES) {
      if (!wanted.includes(type)) continue;
      const ranked = candidates(type)
        .flatMap((c) => {
          const rank = bestRank(c.fields, query);
          return rank === null ? [] : [{ c, rank }];
        })
        .sort((a, b) => a.rank - b.rank || a.c.label.localeCompare(b.c.label, "fr") || a.c.id.localeCompare(b.c.id));
      if (ranked.length === 0) continue;
      groups.push({
        type, label: SEARCH_TYPE_LABELS[type], total: ranked.length,
        hits: ranked.slice(0, options.limitPerType).map(({ c }): SearchHit => ({
          type, id: c.id, label: c.label, sublabel: c.sublabel, href: c.href,
        })),
      });
    }
    return { problem: null, groups };
  },
};
```

Run: `pnpm test` puis `pnpm typecheck` → PASS. Si un test de valeurs semées échoue (par exemple le nom `Aïssatou Sarr` ou le libellé du rôle `Administrateur`), corriger l'attendu d'après la graine réelle, pas le code.

- [ ] **Step 3: Mutations (preuves)**

Appliquer, constater l'échec du test nommé, restaurer :
1. Ajouter `c.contactEmail` aux `fields` des compagnies → échoue `also finds a company by slug… never by contact data`.
2. Ajouter `u.email` aux `fields` des comptes → échoue `never finds an account by e-mail or phone`.
3. Ajouter `b.passengerName` aux `fields` des réservations → échoue `finds a booking by code but never by passenger name`.
4. Ajouter `p.recipientName` aux `fields` des colis → échoue `finds a parcel by code or tracking number but never by sender, recipient or phone`.
5. Ajouter `n.messageContent` aux `fields` des notifications → échoue `finds a notification by code but never by content`.
6. Retirer `encodeURIComponent` du lien de billet → échoue `finds a ticket by code, encoding the code in the link`.
7. Remplacer `.slice(0, options.limitPerType)` par `.slice(0, options.limitPerType + 1)` → échoue `limits hits per type but reports the real total`.
8. Remplacer `total: ranked.length` par `total: options.limitPerType` → échoue le même test.
9. Retirer le test `wanted.includes(type)` → échoue `restricts to the requested types`.
10. Retirer le tri par rang (`a.rank - b.rank ||`) → échoue `sorts hits by rank then label` si la graine fournit des rangs mixtes ; **si la mutation survit, ajouter au test un cas à rangs mixtes construit sur la graine** (par exemple « express » dans les compagnies, ou deux enregistrements dont l'un commence par la requête et l'autre la contient) et recommencer.
11. Retirer `if (problem) return …` → échoue `returns the problem and reads nothing…`.
12. Remplacer `bestRank` par le rang du premier champ seulement → échoue `also finds a company by slug…` ou `finds an incident by code or title`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/repos/search.ts tests/unit/search-repo.test.ts
git commit -m "feat: global search repository over eleven record types, without contact data

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Action de la palette, filtrage local et page `/recherche` (TDD)

**Files:**
- Create: `src/lib/palette.ts`, `src/app/(admin)/recherche/actions.ts`, `src/app/(admin)/recherche/page.tsx`, `tests/unit/palette.test.ts`, `tests/unit/search-actions.test.ts`

**Interfaces:**
- Produces: `filterByQuery<T>(items, query, label): T[]` ; action `searchEverywhere(query): Promise<ValueResult<SearchHit[]>>` ; page `/recherche` (`data-testid` : `search-help`, `search-problem`, `search-group-<type>`, `search-hit`, `search-more`, `search-empty`).

- [ ] **Step 1: Tests (rouge)**

Créer `tests/unit/palette.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { filterByQuery } from "@/lib/palette";

const items = [{ n: "Louga Trans" }, { n: "Thiès Express" }, { n: "Saint-Louis Bus" }];
const label = (i: { n: string }) => i.n;

describe("filterByQuery", () => {
  it("keeps everything for an empty or blank query", () => {
    expect(filterByQuery(items, "", label)).toEqual(items);
    expect(filterByQuery(items, "   ", label)).toEqual(items);
  });
  it("matches substrings without regard to case or accents", () => {
    expect(filterByQuery(items, "LOUGA", label).map(label)).toEqual(["Louga Trans"]);
    expect(filterByQuery(items, "thies", label).map(label)).toEqual(["Thiès Express"]);
    expect(filterByQuery(items, "louis", label).map(label)).toEqual(["Saint-Louis Bus"]);
  });
  it("matches every word of a multi-word query", () => {
    expect(filterByQuery(items, "trans louga", label).map(label)).toEqual(["Louga Trans"]);
    expect(filterByQuery(items, "louga bus", label)).toEqual([]);
  });
  it("returns nothing when nothing matches", () => {
    expect(filterByQuery(items, "zzz", label)).toEqual([]);
  });
});
```

Créer `tests/unit/search-actions.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { searchEverywhere } from "@/app/(admin)/recherche/actions";
import { resetStore } from "@/lib/repos/store";

beforeEach(() => {
  resetStore();
  requireSession.mockReset();
  requireSession.mockResolvedValue({ sub: "admin@sira.app", stage: "full", exp: 9999999999 });
});

describe("searchEverywhere", () => {
  it("reads nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    expect(await searchEverywhere("bk-")).toEqual({ ok: false, error: "Session expirée, reconnecte-toi" });
  });

  it("returns at most four hits per type, flattened, without companies", async () => {
    const r = await searchEverywhere("bk-");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.length).toBeGreaterThan(0);
    expect(r.value.length).toBeLessThanOrEqual(4);
    expect(r.value.every((h) => h.type === "booking")).toBe(true);
    const names = await searchEverywhere("trans");
    expect(names.ok && names.value.every((h) => h.type !== "company")).toBe(true);
  });

  it("returns an empty list, not an error, for an unusable query", async () => {
    expect(await searchEverywhere("a")).toEqual({ ok: true, value: [] });
    expect(await searchEverywhere("someone@example.sn")).toEqual({ ok: true, value: [] });
  });

  it("returns an empty list for a value that is not a string", async () => {
    expect(await searchEverywhere(42 as unknown as string)).toEqual({ ok: true, value: [] });
  });
});
```

Run: `pnpm test tests/unit/palette.test.ts tests/unit/search-actions.test.ts` → FAIL.

- [ ] **Step 2: Implémenter filtrage et action**

Créer `src/lib/palette.ts` :

```ts
import { normalizeText } from "@/lib/search-query";

/** Local filter of the palette's static sections: every word of the query must appear in the label. */
export function filterByQuery<T>(items: T[], query: string, label: (item: T) => string): T[] {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const text = normalizeText(label(item));
    return words.every((w) => text.includes(w));
  });
}
```

Créer `src/app/(admin)/recherche/actions.ts` :

```ts
"use server";

import { runValue, type ValueResult } from "@/lib/actions/run";
import { SEARCH_TYPES, searchRepo, type SearchHit } from "@/lib/repos/search";
import { PALETTE_LIMIT } from "@/lib/search-query";

/** Palette lookup: every type except companies (the palette already lists them), a few hits per type. */
export async function searchEverywhere(query: string): Promise<ValueResult<SearchHit[]>> {
  return runValue(() => {
    if (typeof query !== "string") return [];
    const result = searchRepo.search(query, {
      types: SEARCH_TYPES.filter((t) => t !== "company"), limitPerType: PALETTE_LIMIT,
    });
    return result.groups.flatMap((g) => g.hits);
  });
}
```

Run: `pnpm test` puis `pnpm typecheck` → PASS.

- [ ] **Step 3: Page**

Créer `src/app/(admin)/recherche/page.tsx` :

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav } from "@/components/data/status-filter-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseFilter } from "@/lib/filters";
import { SEARCH_TYPES, searchRepo } from "@/lib/repos/search";
import { CONTACT_QUERY_MESSAGE, isContactLike, PAGE_LIMIT, queryProblem } from "@/lib/search-query";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; type?: string; refus?: string }> }) {
  const sp = await searchParams;
  const raw = (sp.q ?? "").trim();
  // A contact-like value never stays in the URL or on the page.
  if (raw && isContactLike(raw)) redirect("/recherche?refus=contact");

  const problem = sp.refus === "contact" ? CONTACT_QUERY_MESSAGE : raw ? queryProblem(raw) : null;
  const result = raw && !problem ? searchRepo.search(raw, { limitPerType: PAGE_LIMIT }) : null;
  const type = parseFilter(sp.type, SEARCH_TYPES);
  const shown = result ? result.groups.filter((g) => !type || g.type === type) : [];
  const grandTotal = result ? result.groups.reduce((n, g) => n + g.total, 0) : 0;

  return (
    <>
      <PageHeader
        title="Recherche"
        description="Cherche un nom, un code ou un identifiant dans toute la plateforme. Les e-mails et les numéros de téléphone ne sont pas recherchables."
      />
      <form action="/recherche" method="get" role="search" className="mb-4 flex gap-2">
        <Input
          name="q" aria-label="Rechercher dans le backoffice" placeholder="Nom, code, identifiant…"
          defaultValue={raw && !problem ? raw : ""} className="max-w-md" autoComplete="off"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      {!raw && !problem && (
        <p data-testid="search-help" className="text-sm text-muted-foreground">
          Exemples : un nom de compagnie, un code de réservation (BK-…), de billet (TK-…), de colis (PCL-…) ou d&apos;incident (SYS-…).
        </p>
      )}
      {problem && <p role="alert" data-testid="search-problem" className="text-sm text-danger">{problem}</p>}

      {result && (
        <>
          {result.groups.length > 0 && (
            <StatusFilterNav
              basePath="/recherche" param="type" current={type} keep={{ q: raw }} label="Filtrer par type"
              options={[
                { value: "all", label: `Tous (${grandTotal})` },
                ...result.groups.map((g) => ({ value: g.type, label: `${g.label} (${g.total})` })),
              ]}
            />
          )}
          {shown.length === 0 && (
            <p data-testid="search-empty" className="text-sm text-muted-foreground">
              {result.groups.length === 0 ? "Aucun résultat pour cette recherche." : "Aucun résultat dans ce type."}
            </p>
          )}
          <div className="space-y-4">
            {shown.map((g) => (
              <Card key={g.type} data-testid={`search-group-${g.type}`}>
                <CardHeader><CardTitle>{g.label} · {g.total}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {g.hits.map((h) => (
                      <li key={h.id} data-testid="search-hit" className="py-2">
                        <Link href={h.href} className="font-medium hover:underline">{h.label}</Link>
                        <span className="ml-2 text-sm text-muted-foreground">{h.sublabel}</span>
                      </li>
                    ))}
                  </ul>
                  {g.total > g.hits.length && (
                    <p data-testid="search-more" className="mt-2 text-xs text-muted-foreground">
                      {g.total - g.hits.length} autre(s) résultat(s) : affine la recherche.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
```

(Si `Card` n'accepte pas `data-testid`, envelopper dans un `<div data-testid=…>` ; vérifier que `Input` transmet `name` et `autoComplete`.)

Run: `pnpm typecheck && pnpm test` → PASS.

- [ ] **Step 4: Mutations (preuves)**

1. `filterByQuery` : retirer `normalizeText` du libellé → échoue `matches substrings without regard to case or accents`.
2. Remplacer `every` par `some` → échoue `matches every word of a multi-word query`.
3. Action : appeler `searchRepo.search` hors de `runValue` → échoue `reads nothing without a session`.
4. Action : retirer le filtre `t !== "company"` → échoue `returns at most four hits per type, flattened, without companies`.
5. Action : remplacer `PALETTE_LIMIT` par `PAGE_LIMIT` → échoue le même test (au plus 4).
6. Action : retirer `typeof query !== "string"` → échoue `returns an empty list for a value that is not a string` (exception → `ok: false`).
7. Page (vérifiée par E2E en Task 5) : noter que retirer la redirection de contact est détecté par le test E2E `a contact-like query is refused and never shown`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/palette.ts "src/app/(admin)/recherche" tests/unit/palette.test.ts tests/unit/search-actions.test.ts
git commit -m "feat: global search page, palette action and local palette filter

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Palette de commandes (enregistrements et « Voir tous »)

**Files:**
- Modify: `src/components/shell/command-palette.tsx`

**Interfaces:**
- Consumes: `searchEverywhere`, `filterByQuery`, `queryProblem`, `type SearchHit`, `allNavItems`.

- [ ] **Step 1: Réécrire la palette**

Remplacer le contenu de `src/components/shell/command-palette.tsx` par :

```tsx
"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchEverywhere } from "@/app/(admin)/recherche/actions";
import { Button } from "@/components/ui/button";
import { allNavItems } from "@/lib/nav";
import { filterByQuery } from "@/lib/palette";
import type { SearchHit } from "@/lib/repos/search";
import { queryProblem } from "@/lib/search-query";

const ITEM = "cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft";

export function CommandPalette({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const latest = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Records come from the server after a short pause; a late answer to an older query is dropped.
  useEffect(() => {
    const id = ++latest.current;
    if (queryProblem(query) !== null) {
      setHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const r = await searchEverywhere(query);
      if (id === latest.current && r.ok) setHits(r.value);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function changeOpen(o: boolean) {
    setOpen(o);
    if (!o) {
      setQuery("");
      setHits([]);
    }
  }

  function go(href: string) {
    changeOpen(false);
    router.push(href);
  }

  const pages = filterByQuery(allNavItems(), query, (i) => i.label);
  const matchingCompanies = filterByQuery(companies, query, (c) => c.name);
  const trimmed = query.trim();
  const canSearchAll = queryProblem(query) === null;
  const nothing = pages.length === 0 && matchingCompanies.length === 0 && hits.length === 0 && !canSearchAll;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Ouvrir la recherche">
        <Search size={14} />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden rounded bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <Command.Dialog
        open={open} onOpenChange={changeOpen} label="Palette de commandes" shouldFilter={false}
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        <Command.Input
          value={query} onValueChange={setQuery}
          placeholder="Aller à une page ou une compagnie…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          {nothing && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>}
          {canSearchAll && (
            <Command.Group heading="Recherche" className="text-xs text-muted-foreground">
              <Command.Item
                value={`tous ${trimmed}`} onSelect={() => go(`/recherche?q=${encodeURIComponent(trimmed)}`)} className={ITEM}
              >
                Voir tous les résultats pour « {trimmed} »
              </Command.Item>
            </Command.Group>
          )}
          {pages.length > 0 && (
            <Command.Group heading="Pages" className="text-xs text-muted-foreground">
              {pages.map((i) => (
                <Command.Item key={i.href} value={`page ${i.href}`} onSelect={() => go(i.href)} className={ITEM}>
                  {i.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {matchingCompanies.length > 0 && (
            <Command.Group heading="Compagnies" className="text-xs text-muted-foreground">
              {matchingCompanies.map((c) => (
                <Command.Item key={c.id} value={`compagnie ${c.id}`} onSelect={() => go(`/compagnies/${c.id}`)} className={ITEM}>
                  {c.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {hits.length > 0 && (
            <Command.Group heading="Enregistrements" className="text-xs text-muted-foreground">
              {hits.map((h) => (
                <Command.Item key={`${h.type}-${h.id}`} value={`${h.type} ${h.id}`} onSelect={() => go(h.href)} className={ITEM}>
                  <span className="font-medium">{h.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{h.sublabel}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
```

(`queryProblem` est pur et importé côté client ; `SearchHit` est un `import type`. Le test E2E existant `the command palette opens with the keyboard and navigates to a company` doit rester vert : le placeholder est inchangé, et le nom accessible de l'option « Louga Trans » reste exactement `Louga Trans`.)

- [ ] **Step 2: Vérifier**

Run: `pnpm typecheck && pnpm test` → PASS. Vérifier à la main (`pnpm dev`) : ⌘K, taper `BK-`, la section « Enregistrements » apparaît après une courte pause ; taper `louga`, l'option « Louga Trans » reste ; vider le champ rétablit toutes les pages.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/command-palette.tsx
git commit -m "feat: command palette lists records and links to the full search

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Navigation, E2E, test de fuite et README

**Files:**
- Modify: `src/lib/nav.ts`, `tests/unit/nav.test.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`, `docs/superpowers/specs/2026-11-02-backoffice-lot11-design.md`

- [ ] **Step 1: Test de navigation (rouge)**

Dans `tests/unit/nav.test.ts` : le test du lot 10 `marks only lot 1 to lot 10 pages as implemented` devient `marks every page as implemented` : reprendre son tableau attendu (49 chemins, trié) et y insérer `"/recherche"` à sa place alphabétique (après `"/parametres/profil"`, avant `"/supervision/api"`), soit 50 chemins ; ajouter :

```ts
  it("has no page left as coming soon", () => {
    expect(allNavItems().filter((i) => !i.implemented)).toEqual([]);
  });
  it("labels the search segment", () => {
    expect(labelForSegment("recherche")).toBe("Recherche");
    expect(isLinkablePath("/recherche")).toBe(true);
  });
```

(importer `allNavItems`, `isLinkablePath`, `labelForSegment` si absents ; **le test du lot 10 `keeps the global search as the only unimplemented page` est supprimé**, il devient faux.) Run: `pnpm test tests/unit/nav.test.ts` → FAIL.

- [ ] **Step 2: Navigation**

Dans `src/lib/nav.ts` : remplacer `todo("Recherche globale", "/recherche"),` par `{ label: "Recherche globale", href: "/recherche", implemented: true },` ; ajouter `recherche: "Recherche"` à `SEGMENT_LABELS` ; **supprimer la fonction `todo`** si elle n'est plus utilisée (sinon le lint signale une variable inutilisée). Run: `pnpm test` → PASS.

- [ ] **Step 3: E2E**

Dans `tests/e2e/backoffice.spec.ts` :

1. **Remplacer** le test `unimplemented sections show a coming-soon page` par :

```ts
test("an unknown path answers 404", async ({ page }) => {
  await login(page);
  const response = await page.goto("/ce-chemin-nexiste-pas");
  expect(response?.status()).toBe(404);
});
```

2. Ajouter, avant le test `@prod`, les tests suivants :

```ts
test("searching by booking code lists the bookings and opens one", async ({ page }) => {
  await login(page);
  await page.goto("/recherche");
  await expect(page.getByTestId("search-help")).toBeVisible();
  await page.getByLabel("Rechercher dans le backoffice").fill("BK-");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page).toHaveURL(/\/recherche\?q=BK-/);
  const group = page.getByTestId("search-group-booking");
  await expect(group).toBeVisible();
  expect(await group.getByTestId("search-hit").count()).toBeGreaterThan(0);
  await expect(page.getByTestId("search-group-ticket")).toHaveCount(0);
  await group.getByTestId("search-hit").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/ventes\/reservations\/[0-9a-f-]+$/);
});

test("the search ignores accents and case", async ({ page }) => {
  await login(page);
  await page.goto("/recherche?q=AISSATOU");
  await expect(page.getByTestId("search-hit").filter({ hasText: "Aïssatou Sarr" }).first()).toBeVisible();
});

test("a contact-like query is refused and never shown", async ({ page }) => {
  await login(page);
  await page.goto("/recherche?q=someone%40example.sn");
  await expect(page).toHaveURL(/\/recherche\?refus=contact$/);
  await expect(page.getByTestId("search-problem")).toHaveText(
    "La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant.",
  );
  await expect(page.getByLabel("Rechercher dans le backoffice")).toHaveValue("");
  await expect(page.locator("body")).not.toContainText("someone@example.sn");

  await page.goto("/recherche?q=%2B221%2077%20123%2045%2067");
  await expect(page).toHaveURL(/\/recherche\?refus=contact$/);
  await expect(page.locator("body")).not.toContainText("77 123 45 67");
});

test("a too short query is refused and an unknown one finds nothing", async ({ page }) => {
  await login(page);
  await page.goto("/recherche?q=a");
  await expect(page.getByTestId("search-problem")).toHaveText("Saisis au moins 2 caractères");
  await page.goto("/recherche?q=zzzqqqxxx");
  await expect(page.getByTestId("search-empty")).toHaveText("Aucun résultat pour cette recherche.");
  await expect(page.locator("body")).not.toContainText("zzzqqqxxx");
});

test("the search can be narrowed to one type", async ({ page }) => {
  await login(page);
  await page.goto("/recherche?q=pcl-");
  await expect(page.getByTestId("search-group-parcel")).toBeVisible();
  const filters = page.getByRole("navigation", { name: "Filtrer par type" });
  await expect(filters.getByRole("link", { name: /^Tous \(\d+\)$/ })).toBeVisible();
  await filters.getByRole("link", { name: /^Colis \(\d+\)$/ }).click();
  await expect(page).toHaveURL(/type=parcel/);
  await expect(page).toHaveURL(/q=pcl-/);
  await expect(page.getByTestId("search-group-parcel")).toBeVisible();

  await page.goto("/recherche?q=pcl-&type=booking");
  await expect(page.getByTestId("search-empty")).toHaveText("Aucun résultat dans ce type.");
});

test("a long result list is capped and says how many are left", async ({ page }) => {
  await login(page);
  await page.goto("/recherche?q=bk-");
  const group = page.getByTestId("search-group-booking");
  const count = await group.getByTestId("search-hit").count();
  expect(count).toBeLessThanOrEqual(25);
  if (count === 25) await expect(group.getByTestId("search-more")).toContainText("autre(s) résultat(s)");
});

test("the palette lists records and links to the full search", async ({ page }) => {
  await login(page);
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByPlaceholder("Aller à une page ou une compagnie…");
  await input.fill("BK-");
  const record = page.getByRole("option", { name: /^BK-/ }).first();
  await expect(record).toBeVisible();
  await expect(page.getByRole("option", { name: /Voir tous les résultats pour « BK- »/ })).toBeVisible();
  await record.click();
  await expect(page).toHaveURL(/\/ventes\/reservations\/[0-9a-f-]+$/);

  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder("Aller à une page ou une compagnie…").fill("TK-");
  await page.getByRole("option", { name: /Voir tous les résultats pour « TK- »/ }).click();
  await expect(page).toHaveURL(/\/recherche\?q=TK-$/);
  await expect(page.getByTestId("search-group-ticket")).toBeVisible();
});

test("the palette never searches for a contact", async ({ page }) => {
  await login(page);
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByPlaceholder("Aller à une page ou une compagnie…");
  await input.fill("someone@example.sn");
  await expect(page.getByRole("option", { name: /Voir tous les résultats/ })).toHaveCount(0);
  await expect(page.getByText("Aucun résultat")).toBeVisible();
});
```

3. Étendre le test `@prod` : ajouter au tableau `paths` : `"/recherche"`, `"/recherche?q=bk-"`, `"/recherche?q=aissatou"`, `"/recherche?q=express"`, `"/recherche?q=sys-"`, `"/recherche?refus=contact"`.

Run: `pnpm e2e` (build de production inclus) → PASS ; puis `git checkout tsconfig.json` (et `next-env.d.ts` s'il apparaît modifié).

- [ ] **Step 4: Spec et README**

Dans `docs/superpowers/specs/2026-11-02-backoffice-lot11-design.md`, section « Règles », ajouter la phrase : « Une requête de type contact est **redirigée** vers `/recherche?refus=contact` (la valeur saisie disparaît de l'URL et n'est jamais réaffichée). » et remplacer, dans « Choix de cadrage », « Une requête refusée n'est jamais renvoyée dans la page » par « Une requête de type contact ou trop longue n'est jamais renvoyée dans la page ».

Dans `README.md`, ajouter un paragraphe « Lot 11 : recherche globale » (page `/recherche`, palette ⌘K enrichie, 11 types, nom ou code seulement) et mentionner que la maquette n'a désormais plus aucune page « bientôt disponible » ; ajouter à la liste des limites : pas de recherche par e-mail ni téléphone (volontaire) ; pas de recherche dans les noms de passagers, d'expéditeurs, de destinataires ni dans le contenu des messages ; sous-chaîne simple sans tolérance aux fautes ; 25 résultats par type au plus ; pas d'historique ni de filtres sauvegardés ; la palette interroge le serveur à chaque pause de saisie.

- [ ] **Step 5: Vérification finale**

Run: `pnpm typecheck && pnpm test && pnpm e2e` puis `git checkout tsconfig.json`. Relever les nouveaux comptes de tests (unitaires et E2E) dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts tests/unit/nav.test.ts tests/e2e/backoffice.spec.ts README.md docs/superpowers/specs/2026-11-02-backoffice-lot11-design.md
git commit -m "feat: enable global search navigation, e2e coverage and leak check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## Auto-revue du plan

- **Couverture du spec** : module de requête (Task 1), dépôt sur 11 types avec exclusions de champs personnels et limites (Task 2), action de palette, filtrage local et page (Task 3), palette (Task 4), navigation, E2E, fuite, README (Task 5).
- **Cohérence des noms** : `normalizeText`, `matchRank`, `isContactLike`, `queryProblem`, `CONTACT_QUERY_MESSAGE`, `PAGE_LIMIT`, `PALETTE_LIMIT`, `searchRepo.search`, `SEARCH_TYPES`, `SEARCH_TYPE_LABELS`, `SearchHit`, `filterByQuery`, `searchEverywhere` sont utilisés à l'identique.
- **Écart au spec, assumé et reporté** : redirection des requêtes de type contact (décision 1, spec amendé à la Task 5).
- **Risques connus** : (1) les tests de dépôt reposent sur des valeurs semées (« Louga Trans », « Aïssatou Sarr », libellé de rôle « Administrateur », un seul `u.username` unique) : corriger l'attendu d'après la graine, pas le code ; (2) la mutation 10 de la Task 2 peut survivre si la graine n'a pas de rangs mixtes : le plan demande alors d'ajouter un cas ; (3) `Command.Dialog` doit accepter `shouldFilter` (propriété de `Command`) ; (4) le test E2E de la palette dépend du délai de 250 ms, attendu par la récupération automatique de `expect` ; (5) les tests n'ont pas été exécutés ; (6) le test `a long result list is capped` est conditionnel (il ne prouve le plafond que si la graine dépasse 25 réservations, ce que le test de dépôt `limits hits per type…` prouve déjà au niveau unitaire).
