# Backoffice Sira, lot 1 : socle, Vue 360, Compagnies. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un backoffice Next.js lançable (`pnpm dev`) avec connexion + TOTP simulés, coquille complète (sidebar, Cmd+K, fil d'Ariane, clair/sombre), Vue 360 et section Compagnies, sur données statiques typées.

**Architecture:** Next.js App Router, TypeScript strict. Les pages sont des Server Components qui lisent des dépôts (`src/lib/repos`) adossés à un store en mémoire initialisé par une graine déterministe ; les mutations (approuver, rejeter, forcer l'activation) sont des Server Actions qui vérifient la session. Un middleware protège `(admin)` avec un jeton HMAC dans un cookie `HttpOnly`.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind v4, composants de style shadcn écrits à la main (Radix + cva + clsx + tailwind-merge), TanStack Table, Zod, React Hook Form, Recharts, cmdk, next-themes, Vitest, Playwright, pnpm.

## Global Constraints

- Dossier de travail : `/Users/macbookpro/Projects/sira/backoffice-admin/` (dépôt git séparé, branche `main`). Ne rien modifier hors de ce dossier.
- Interface en **français uniquement**. Style C : fond blanc/gris très clair, coins arrondis, ombres douces, accent orangé. Modes clair **et** sombre.
- Données **statiques typées** ; aucun appel réseau. Chaque ressource passe par `src/lib/repos`.
- Cookies `HttpOnly` + `SameSite=Strict` (`Secure` en production) ; **aucun jeton en `localStorage`** ; aucune donnée sensible dans les URL ou les logs.
- Actions sensibles (rejet de document, activation forcée) : confirmation et **motif obligatoire**.
- E-mail et téléphone masqués par défaut, bouton « révéler » (la révélation est journalisée dans l'activité).
- Les routes du sitemap hors Vue 360 et Compagnies sont présentes dans la navigation et mènent à « Bientôt disponible ».
- Identifiants de démonstration : `admin@sira.app` / `sira-demo`, code TOTP `123456`.
- Commits : message court en anglais (`feat:`/`test:`/`chore:`), terminé par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Écart assumé par rapport au spec : les composants « shadcn » sont écrits à la main dans `src/components/ui` (même structure et mêmes dépendances que shadcn) pour ne pas dépendre de l'assistant interactif du CLI.

## Carte des fichiers

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts, playwright.config.ts
middleware.ts
src/app/globals.css, src/app/layout.tsx
src/app/(auth)/connexion/page.tsx, connexion/verification/page.tsx, session-expiree/page.tsx, acces-refuse/page.tsx
src/app/(auth)/actions.ts                      login, verifyTotp, logout (server actions)
src/app/(admin)/layout.tsx                     coquille
src/app/(admin)/page.tsx                       Vue 360
src/app/(admin)/compagnies/page.tsx, kyc/page.tsx, [id]/page.tsx, actions.ts
src/app/(admin)/[...slug]/page.tsx             « Bientôt disponible »
src/components/ui/{button,input,card,dialog,tabs}.tsx
src/components/data/{status-badge,kpi-card,page-header,data-table,confirm-dialog,masked-value,tabs-with-url}.tsx
src/components/shell/{sidebar,topbar,breadcrumb,command-palette,theme-toggle,idle-logout}.tsx
src/components/dashboard/service-latency-chart.tsx
src/components/company/{kyc-panel,company-tabs}.tsx
src/lib/utils.ts, format.ts, mask.ts, labels.ts, nav.ts
src/lib/types/{index,kyc}.ts
src/lib/data/seed.ts
src/lib/repos/{store,companies,dashboard}.ts
src/lib/auth/{token,session,constants}.ts
tests/unit/*.test.ts, tests/e2e/backoffice.spec.ts
README.md
```

---

### Task 1: Socle du projet (Next.js, Tailwind v4, thème, Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/utils.ts`, `src/app/(admin)/page.tsx` (provisoire), `tests/unit/utils.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` dans `src/lib/utils.ts` ; variables CSS de thème (`--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--accent`, `--accent-foreground`, `--accent-soft`, `--success`, `--warning`, `--danger`, `--info`) et classes Tailwind `bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-accent`, `text-accent-foreground`, `bg-accent-soft`, `text-success`, `text-warning`, `text-danger`, `text-info` ; alias d'import `@/*` → `src/*`.

- [ ] **Step 1: Écrire `package.json` minimal puis installer**

Créer `package.json` :

```json
{
  "name": "sira-backoffice-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

Run:

```bash
cd /Users/macbookpro/Projects/sira/backoffice-admin
pnpm add next@15 react@19 react-dom@19 next-themes lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-tabs @tanstack/react-table zod react-hook-form @hookform/resolvers recharts cmdk
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss@4 @tailwindcss/postcss vitest @playwright/test
```

Expected: installation sans erreur. Si pnpm signale des scripts de build ignorés, lancer `pnpm approve-builds` et accepter (esbuild/sharp).

- [ ] **Step 2: Configurations**

`tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`postcss.config.mjs` :

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

`next.config.ts` (les en-têtes de sécurité sont ajoutés à la Task 3) :

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = { poweredByHeader: false };

export default nextConfig;
```

`vitest.config.ts` :

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
});
```

Ajouter à `.gitignore` (qui contient déjà `.superpowers/`) :

```
node_modules/
.next/
next-env.d.ts
tsconfig.tsbuildinfo
test-results/
playwright-report/
```

- [ ] **Step 3: Test échouant pour `cn`**

`tests/unit/utils.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins classes and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
```

Run: `pnpm test` → FAIL (module `@/lib/utils` introuvable).

- [ ] **Step 4: Implémenter `cn`**

`src/lib/utils.ts` :

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Run: `pnpm test` → PASS (1 test).

- [ ] **Step 5: Thème et layout racine**

`src/app/globals.css` :

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #fafafa;
  --foreground: #14181f;
  --card: #ffffff;
  --muted: #f1f2f4;
  --muted-foreground: #6b7280;
  --border: #e8e8ec;
  --accent: #e8741a;
  --accent-foreground: #ffffff;
  --accent-soft: #fff2e0;
  --success: #1f9d63;
  --warning: #b7791f;
  --danger: #e5484d;
  --info: #2f6fdb;
}

.dark {
  --background: #0e1013;
  --foreground: #e8eaee;
  --card: #16191e;
  --muted: #1d2127;
  --muted-foreground: #8b93a1;
  --border: #262b33;
  --accent: #f59a3c;
  --accent-foreground: #14181f;
  --accent-soft: #2b2014;
  --success: #3ddc84;
  --warning: #f2c14e;
  --danger: #ff6b6b;
  --info: #6aa5ff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-soft: var(--accent-soft);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-info: var(--info);
  --radius-card: 0.75rem;
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

`src/app/layout.tsx` :

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sira Backoffice",
  description: "Console d'administration de la plateforme Sira",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`src/app/(admin)/page.tsx` (provisoire, remplacé à la Task 6) :

```tsx
export default function Home() {
  return <main className="p-8 text-foreground">Sira Backoffice</main>;
}
```

- [ ] **Step 6: Vérifier le build**

Run: `pnpm typecheck && pnpm build`
Expected: les deux réussissent (la page `/` apparaît dans la sortie du build).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js, Tailwind v4 theme tokens, Vitest

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types, graine de données et dépôts (TDD)

**Files:**
- Create: `src/lib/types/kyc.ts`, `src/lib/types/index.ts`, `src/lib/data/seed.ts`, `src/lib/repos/store.ts`, `src/lib/repos/companies.ts`, `src/lib/repos/dashboard.ts`, `tests/unit/companies-repo.test.ts`, `tests/unit/dashboard-repo.test.ts`

**Interfaces:**
- Consumes: `cn` n'est pas utilisé ici.
- Produces (utilisé par toutes les tâches suivantes) :
  - `KYC_TYPES: readonly { code: string; name: string }[]` (6 types) dans `types/kyc.ts`.
  - Types dans `types/index.ts` : `CompanyStatus`, `Company`, `KycDocumentStatus`, `KycDocument`, `SubscriptionStatus`, `Subscription`, `Invoice`, `PlanLimits`, `FeatureFlag`, `UsageMetric`, `Referral`, `ReferralCredit`, `Employee`, `FleetBus`, `FleetTrip`, `ActivityEntry`, `ServiceHealth`, `Incident`, `DsrRequest`, `CompanyDetail`.
  - `getStore(): Store`, `resetStore(): void` dans `repos/store.ts`.
  - `companiesRepo` : `list(filter?: { status?: CompanyStatus; q?: string }): Company[]`, `get(id: string): Company | undefined`, `detail(id: string): CompanyDetail | undefined`, `kycQueue(): KycQueueItem[]`, `reviewDocument(docId: string, decision: "approved" | "rejected", reason?: string, actor?: string): KycDocument`, `forceActivate(companyId: string, reason: string, actor?: string): Company`, `logReveal(companyId: string, field: "email" | "phone", actor?: string): void`, `names(): { id: string; name: string }[]`.
  - `dashboardRepo.overview(now?: Date): Overview`.

- [ ] **Step 1: Types**

`src/lib/types/kyc.ts` :

```ts
export const KYC_TYPES = [
  { code: "REGISTRATION", name: "Registre du commerce" },
  { code: "NINEA", name: "NINEA" },
  { code: "TAX_CLEARANCE", name: "Attestation fiscale" },
  { code: "INSURANCE", name: "Assurance flotte" },
  { code: "TRANSPORT_LICENSE", name: "Licence de transport" },
  { code: "ID_MANAGER", name: "Pièce d'identité du dirigeant" },
] as const;
```

`src/lib/types/index.ts` :

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
  planName: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  nextBillingDate: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  number: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  issuedAt: string;
}

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

- [ ] **Step 2: Graine de données**

`src/lib/data/seed.ts` :

```ts
import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Company, CompanyStatus, DsrRequest, Employee, FeatureFlag,
  FleetBus, FleetTrip, Incident, Invoice, KycDocument, PlanLimits, Referral,
  ServiceHealth, Subscription, SubscriptionStatus, UsageMetric,
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
const PLANS = [
  { name: "Starter", price: 10000, users: 10, buses: 5 },
  { name: "Pro", price: 25000, users: 50, buses: 25 },
  { name: "Enterprise", price: 60000, users: 500, buses: 200 },
] as const;
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
  };
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, busSeq = 1, tripSeq = 1, actSeq = 1;

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

    // Subscription, invoices, limits, features
    const subStatus = SUBSCRIPTION_STATUS[i];
    if (subStatus) {
      const plan = PLANS[i % 3]!;
      store.subscriptions.push({
        id: uid(3, subSeq++), companyId: id, planName: plan.name, status: subStatus,
        billingCycle: "MONTHLY", price: plan.price, currency: "XOF",
        nextBillingDate: iso(5 + i),
      });
      store.invoices.push({
        id: uid(4, invSeq++), companyId: id, number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
        amount: plan.price, currency: "XOF", status: "paid", issuedAt: iso(-60),
      });
      store.invoices.push({
        id: uid(4, invSeq++), companyId: id, number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
        amount: plan.price, currency: "XOF",
        status: subStatus === "past_due" ? "failed" : "paid", issuedAt: iso(-30),
      });
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

- [ ] **Step 3: Store en mémoire**

`src/lib/repos/store.ts` :

```ts
import { buildSeed, type Store } from "@/lib/data/seed";

const g = globalThis as { __siraBackofficeStore?: Store };

/** Store partagé par processus ; survit au rechargement à chaud en dev. */
export function getStore(): Store {
  return (g.__siraBackofficeStore ??= buildSeed());
}

export function resetStore(): void {
  g.__siraBackofficeStore = buildSeed();
}
```

- [ ] **Step 4: Tests échouants du dépôt compagnies**

`tests/unit/companies-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { companiesRepo } from "@/lib/repos/companies";
import { resetStore } from "@/lib/repos/store";
import { KYC_TYPES } from "@/lib/types/kyc";

beforeEach(() => resetStore());

describe("companiesRepo.list", () => {
  it("returns the 20 seeded companies", () => {
    expect(companiesRepo.list()).toHaveLength(20);
  });
  it("filters by status", () => {
    const drafts = companiesRepo.list({ status: "draft" });
    expect(drafts).toHaveLength(5);
    expect(drafts.every((c) => c.status === "draft")).toBe(true);
  });
  it("searches name and slug case-insensitively", () => {
    expect(companiesRepo.list({ q: "KOLDA" }).map((c) => c.name)).toEqual(["Kolda Voyages"]);
    expect(companiesRepo.list({ q: "saint-louis" })).toHaveLength(1);
  });
});

describe("companiesRepo.detail", () => {
  it("returns undefined for an unknown id", () => {
    expect(companiesRepo.detail("nope")).toBeUndefined();
  });
  it("returns related records for a company", () => {
    const active = companiesRepo.list({ status: "active" })[0]!;
    const d = companiesRepo.detail(active.id)!;
    expect(d.documents).toHaveLength(KYC_TYPES.length);
    expect(d.subscription).not.toBeNull();
    expect(d.employees.length).toBeGreaterThan(0);
  });
});

describe("kyc workflow", () => {
  it("kycQueue lists only pending documents, oldest first, with company names", () => {
    const q = companiesRepo.kycQueue();
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((d) => d.status === "pending" && d.companyName.length > 0)).toBe(true);
    const times = q.map((d) => d.uploadedAt);
    expect([...times].sort()).toEqual(times);
  });

  function almostDone() {
    for (const c of companiesRepo.list({ status: "draft" })) {
      const d = companiesRepo.detail(c.id)!;
      const approved = d.documents.filter((x) => x.status === "approved").length;
      const pending = d.documents.filter((x) => x.status === "pending");
      if (approved === KYC_TYPES.length - 1 && pending.length === 1) return { c, doc: pending[0]! };
    }
    throw new Error("seed has no almost-complete draft company");
  }

  it("approving the last missing document activates the company", () => {
    const { c, doc } = almostDone();
    companiesRepo.reviewDocument(doc.id, "approved");
    const after = companiesRepo.get(c.id)!;
    expect(after.status).toBe("active");
    expect(after.activatedAt).not.toBeNull();
    expect(after.forceActivated).toBe(false);
  });

  it("rejecting requires a reason and stores it", () => {
    const { doc } = almostDone();
    expect(() => companiesRepo.reviewDocument(doc.id, "rejected")).toThrow(/motif/i);
    const out = companiesRepo.reviewDocument(doc.id, "rejected", "Flou");
    expect(out.status).toBe("rejected");
    expect(out.rejectionReason).toBe("Flou");
  });

  it("refuses to review a document that is not pending", () => {
    const approved = companiesRepo.detail(companiesRepo.list({ status: "active" })[0]!.id)!.documents[0]!;
    expect(() => companiesRepo.reviewDocument(approved.id, "approved")).toThrow(/en attente/i);
  });

  it("records an activity entry for each review", () => {
    const { c, doc } = almostDone();
    const before = companiesRepo.detail(c.id)!.activity.length;
    companiesRepo.reviewDocument(doc.id, "approved", undefined, "admin@sira.app");
    expect(companiesRepo.detail(c.id)!.activity.length).toBeGreaterThan(before);
  });
});

describe("forceActivate", () => {
  it("requires a reason", () => {
    const draft = companiesRepo.list({ status: "draft" })[0]!;
    expect(() => companiesRepo.forceActivate(draft.id, "  ")).toThrow(/motif/i);
  });
  it("activates a draft company and flags it", () => {
    const draft = companiesRepo.list({ status: "draft" })[0]!;
    const out = companiesRepo.forceActivate(draft.id, "vérifié hors ligne");
    expect(out.status).toBe("active");
    expect(out.forceActivated).toBe(true);
    expect(out.activatedAt).not.toBeNull();
  });
  it("is a no-op on an already active company (keeps its real activation)", () => {
    const active = companiesRepo.list({ status: "active" })[0]!;
    const out = companiesRepo.forceActivate(active.id, "test");
    expect(out.activatedAt).toBe(active.activatedAt);
    expect(out.forceActivated).toBe(active.forceActivated);
  });
  it("throws for an unknown company", () => {
    expect(() => companiesRepo.forceActivate("nope", "x")).toThrow(/introuvable/i);
  });
});

describe("logReveal", () => {
  it("adds an activity entry mentioning the field, never the value", () => {
    const c = companiesRepo.list()[0]!;
    companiesRepo.logReveal(c.id, "email", "admin@sira.app");
    const last = companiesRepo.detail(c.id)!.activity[0]!;
    expect(last.action).toMatch(/e-mail/i);
    expect(last.action).not.toContain(c.contactEmail);
  });
});
```

`tests/unit/dashboard-repo.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { dashboardRepo } from "@/lib/repos/dashboard";
import { resetStore } from "@/lib/repos/store";

beforeEach(() => resetStore());

describe("dashboardRepo.overview", () => {
  it("derives KPIs from the store", () => {
    const o = dashboardRepo.overview();
    expect(o.kpis.companies).toBe(20);
    expect(o.kpis.active).toBe(12);
    expect(o.kpis.draft).toBe(5);
    expect(o.kpis.openIncidents).toBe(2);
    expect(o.kpis.pastDue).toBe(2);
    expect(o.kpis.pendingKyc).toBeGreaterThan(0);
  });
  it("lists past-due subscriptions with company names", () => {
    const o = dashboardRepo.overview();
    expect(o.pastDue).toHaveLength(2);
    expect(o.pastDue.every((s) => s.companyName.length > 0)).toBe(true);
  });
  it("computes days left for data-subject requests, soonest first", () => {
    const o = dashboardRepo.overview(new Date());
    const days = o.dsr.map((d) => d.daysLeft);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(days[0]).toBeLessThan(0);
  });
  it("returns at most 8 recent activity entries, newest first", () => {
    const o = dashboardRepo.overview();
    expect(o.activity.length).toBeLessThanOrEqual(8);
    const at = o.activity.map((a) => a.at);
    expect([...at].sort().reverse()).toEqual(at);
  });
});
```

Run: `pnpm test` → FAIL (modules `repos/companies` et `repos/dashboard` introuvables).

- [ ] **Step 5: Implémenter les dépôts**

`src/lib/repos/companies.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Company, CompanyDetail, CompanyStatus, KycDocument,
} from "@/lib/types";

export interface KycQueueItem extends KycDocument { companyName: string }

let actCounter = 1;
function addActivity(companyId: string | null, actor: string, action: string): void {
  const entry: ActivityEntry = {
    id: `act-${Date.now()}-${actCounter++}`, companyId,
    at: new Date().toISOString(), actor, action,
  };
  getStore().activity.unshift(entry);
}

function activateIfKycComplete(company: Company): void {
  if (company.status !== "draft") return;
  const docs = getStore().documents.filter((d) => d.companyId === company.id);
  const complete = KYC_TYPES.every((t) =>
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
      subscription: s.subscriptions.find((x) => x.companyId === id) ?? null,
      invoices: s.invoices.filter((x) => x.companyId === id),
      limits: s.limits[id] ?? null,
      features: s.features[id] ?? [],
      usage: s.usage[id] ?? [],
      referral: s.referrals[id] ?? { code: null, credits: [] },
      employees: s.employees.filter((e) => e.companyId === id),
      buses: s.buses.filter((b) => b.companyId === id),
      trips: s.trips.filter((t) => t.companyId === id),
      activity: s.activity.filter((a) => a.companyId === id),
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

`src/lib/repos/dashboard.ts` :

```ts
import { getStore } from "@/lib/repos/store";
import type { ActivityEntry, DsrRequest, Incident, ServiceHealth, Subscription } from "@/lib/types";

export interface Overview {
  kpis: {
    companies: number; active: number; draft: number;
    pastDue: number; openIncidents: number; pendingKyc: number;
  };
  services: ServiceHealth[];
  incidents: Incident[];
  pastDue: (Subscription & { companyName: string })[];
  dsr: (DsrRequest & { daysLeft: number })[];
  activity: (ActivityEntry & { companyName: string | null })[];
}

const DAY = 86_400_000;

export const dashboardRepo = {
  overview(now: Date = new Date()): Overview {
    const s = getStore();
    const name = (id: string | null) =>
      id ? (s.companies.find((c) => c.id === id)?.name ?? null) : null;
    const pastDue = s.subscriptions
      .filter((x) => x.status === "past_due")
      .map((x) => ({ ...x, companyName: name(x.companyId) ?? "—" }));
    return {
      kpis: {
        companies: s.companies.length,
        active: s.companies.filter((c) => c.status === "active").length,
        draft: s.companies.filter((c) => c.status === "draft").length,
        pastDue: pastDue.length,
        openIncidents: s.incidents.filter((i) => i.status !== "RESOLVED").length,
        pendingKyc: s.documents.filter((d) => d.status === "pending").length,
      },
      services: s.services,
      incidents: s.incidents.filter((i) => i.status !== "RESOLVED"),
      pastDue,
      dsr: s.dsr
        .map((d) => ({
          ...d,
          daysLeft: Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / DAY),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
      activity: [...s.activity]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8)
        .map((a) => ({ ...a, companyName: name(a.companyId) })),
    };
  },
};
```

- [ ] **Step 6: Faire passer les tests**

Run: `pnpm test`
Expected: PASS (tous les tests, y compris `utils`). Si `almostDone()` échoue avec « seed has no almost-complete draft company », vérifier `APPROVED_BY_DRAFT` (le 4ᵉ brouillon doit avoir 5 documents approuvés et le 6ᵉ en attente).

- [ ] **Step 7: Typecheck et commit**

Run: `pnpm typecheck` → OK.

```bash
git add -A
git commit -m "feat: typed seed data and in-memory repositories (companies, dashboard)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Authentification simulée, middleware, en-têtes de sécurité, pages d'accès

**Files:**
- Create: `src/lib/auth/constants.ts`, `src/lib/auth/token.ts`, `src/lib/auth/session.ts`, `middleware.ts`, `src/app/(auth)/actions.ts`, `src/app/(auth)/connexion/page.tsx`, `src/app/(auth)/connexion/login-form.tsx`, `src/app/(auth)/connexion/verification/page.tsx`, `src/app/(auth)/connexion/verification/totp-form.tsx`, `src/app/(auth)/session-expiree/page.tsx`, `src/app/(auth)/acces-refuse/page.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx`, `tests/unit/token.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `cn` (Task 1).
- Produces :
  - `constants.ts` : `PRE_COOKIE`, `SESSION_COOKIE`, `DEMO_ID`, `DEMO_PASSWORD`, `DEMO_TOTP`, `PRE_TTL_S` (300), `SESSION_TTL_S` (28800), `getSecret(): string`.
  - `token.ts` : `interface TokenPayload { sub: string; stage: "pre" | "full"; exp: number }`, `signToken(p: TokenPayload, secret: string): Promise<string>`, `verifyToken(token: string, secret: string, now?: number): Promise<TokenPayload | null>` (`exp` en secondes epoch).
  - `session.ts` : `requireSession(): Promise<TokenPayload>` (lit le cookie de session, lève `Error("Non authentifié")` sinon).
  - Actions : `login(input): Promise<{ ok: true } | { ok: false; error: string }>`, `verifyTotp(code: string): Promise<{ ok: true } | { ok: false; error: string }>`, `logout(): Promise<void>` (redirige vers `/connexion`), `logoutIdle(): Promise<void>` (redirige vers `/session-expiree`).
  - UI : `Button` (props `variant: "primary" | "secondary" | "ghost" | "danger"`, `size: "sm" | "md"`, tous les attributs `button`), `Input`, `Card`/`CardHeader`/`CardTitle`/`CardContent`.

- [ ] **Step 1: Test échouant du jeton**

`tests/unit/token.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/auth/token";

const SECRET = "test-secret";
const NOW = 1_000_000;

describe("token", () => {
  it("round-trips a valid token", async () => {
    const t = await signToken({ sub: "admin@sira.app", stage: "full", exp: NOW + 60 }, SECRET);
    expect(await verifyToken(t, SECRET, NOW * 1000)).toEqual({
      sub: "admin@sira.app", stage: "full", exp: NOW + 60,
    });
  });
  it("rejects an expired token", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: NOW - 1 }, SECRET);
    expect(await verifyToken(t, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects a token signed with another secret", async () => {
    const t = await signToken({ sub: "a", stage: "full", exp: NOW + 60 }, "other");
    expect(await verifyToken(t, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects a tampered payload", async () => {
    const t = await signToken({ sub: "a", stage: "pre", exp: NOW + 60 }, SECRET);
    const [, sig] = t.split(".");
    const forged = `${btoa(JSON.stringify({ sub: "a", stage: "full", exp: NOW + 60 }))}.${sig}`;
    expect(await verifyToken(forged, SECRET, NOW * 1000)).toBeNull();
  });
  it("rejects malformed input", async () => {
    expect(await verifyToken("", SECRET)).toBeNull();
    expect(await verifyToken("abc", SECRET)).toBeNull();
    expect(await verifyToken("a.b.c", SECRET)).toBeNull();
  });
});
```

Run: `pnpm test` → FAIL (`@/lib/auth/token` introuvable).

- [ ] **Step 2: Implémenter constantes et jeton**

`src/lib/auth/constants.ts` :

```ts
export const PRE_COOKIE = "sira_bo_pre";
export const SESSION_COOKIE = "sira_bo_session";
export const DEMO_ID = "admin@sira.app";
export const DEMO_PASSWORD = "sira-demo";
export const DEMO_TOTP = "123456";
export const PRE_TTL_S = 300;
export const SESSION_TTL_S = 8 * 3600;

export function getSecret(): string {
  return process.env.BACKOFFICE_SESSION_SECRET ?? "dev-only-insecure-backoffice-secret";
}
```

`src/lib/auth/token.ts` :

```ts
export interface TokenPayload {
  sub: string;
  stage: "pre" | "full";
  exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyToken(
  token: string, secret: string, now: number = Date.now(),
): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC", await hmacKey(secret), fromB64url(parts[1]), enc.encode(parts[0]),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    if (payload.stage !== "pre" && payload.stage !== "full") return null;
    return payload;
  } catch {
    return null;
  }
}
```

Note : dans le test « tampered payload », `btoa` produit du base64 standard ; la vérification échoue de toute façon sur la signature, ce qui est le comportement attendu.

Run: `pnpm test` → PASS.

- [ ] **Step 3: Session côté serveur et middleware**

`src/lib/auth/session.ts` :

```ts
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken, type TokenPayload } from "@/lib/auth/token";

export async function requireSession(): Promise<TokenPayload> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (!payload || payload.stage !== "full") throw new Error("Non authentifié");
  return payload;
}
```

`middleware.ts` (racine du projet) :

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken } from "@/lib/auth/token";

export async function middleware(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (payload && payload.stage === "full") return NextResponse.next();
  const target = raw ? "/session-expiree" : "/connexion";
  return NextResponse.redirect(new URL(target, req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|connexion|session-expiree|acces-refuse).*)"],
};
```

- [ ] **Step 4: En-têtes de sécurité**

Remplacer `next.config.ts` :

```ts
import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// 'unsafe-inline' (scripts) est requis par les scripts d'amorçage de Next et de
// next-themes tant qu'aucun nonce n'est en place ; à durcir avant la production.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 5: Primitives UI de base**

`src/components/ui/button.tsx` :

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:opacity-90",
        secondary: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size }), className)} {...props} />;
}
```

`src/components/ui/input.tsx` :

```tsx
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}
```

`src/components/ui/card.tsx` :

```tsx
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-border bg-card shadow-card", className)}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
```

- [ ] **Step 6: Server actions d'authentification**

`src/app/(auth)/actions.ts` :

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DEMO_ID, DEMO_PASSWORD, DEMO_TOTP, PRE_COOKIE, PRE_TTL_S, SESSION_COOKIE,
  SESSION_TTL_S, getSecret,
} from "@/lib/auth/constants";
import { signToken, verifyToken } from "@/lib/auth/token";

type Result = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({ identifiant: z.string().min(1), motDePasse: z.string().min(1) });
const totpSchema = z.string().regex(/^\d{6}$/);

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

const now = () => Math.floor(Date.now() / 1000);

export async function login(input: { identifiant: string; motDePasse: string }): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Identifiants invalides" };
  if (parsed.data.identifiant !== DEMO_ID || parsed.data.motDePasse !== DEMO_PASSWORD) {
    return { ok: false, error: "Identifiant ou mot de passe incorrect" };
  }
  const token = await signToken(
    { sub: DEMO_ID, stage: "pre", exp: now() + PRE_TTL_S }, getSecret(),
  );
  (await cookies()).set(PRE_COOKIE, token, cookieOptions(PRE_TTL_S));
  return { ok: true };
}

export async function verifyTotp(code: string): Promise<Result> {
  const jar = await cookies();
  const pre = jar.get(PRE_COOKIE)?.value;
  const payload = pre ? await verifyToken(pre, getSecret()) : null;
  if (!payload || payload.stage !== "pre") return { ok: false, error: "Session de connexion expirée" };
  if (!totpSchema.safeParse(code).success || code !== DEMO_TOTP) {
    return { ok: false, error: "Code incorrect" };
  }
  const token = await signToken(
    { sub: payload.sub, stage: "full", exp: now() + SESSION_TTL_S }, getSecret(),
  );
  jar.delete(PRE_COOKIE);
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_S));
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/connexion");
}

export async function logoutIdle(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/session-expiree");
}
```

- [ ] **Step 7: Pages d'accès**

`src/app/(auth)/connexion/login-form.tsx` :

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  identifiant: z.string().min(1, "Identifiant requis"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const res = await login(values);
    if (res.ok) router.push("/connexion/verification");
    else setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="identifiant" className="text-sm font-medium">Identifiant</label>
        <Input id="identifiant" type="email" autoComplete="username" {...register("identifiant")} />
        {formState.errors.identifiant && (
          <p className="text-xs text-danger">{formState.errors.identifiant.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="motDePasse" className="text-sm font-medium">Mot de passe</label>
        <Input id="motDePasse" type="password" autoComplete="current-password" {...register("motDePasse")} />
        {formState.errors.motDePasse && (
          <p className="text-xs text-danger">{formState.errors.motDePasse.message}</p>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        Continuer
      </Button>
    </form>
  );
}
```

`src/app/(auth)/connexion/page.tsx` :

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function ConnexionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Sira</p>
            <h1 className="mt-1 text-xl font-semibold">Connexion au backoffice</h1>
            <p className="mt-1 text-sm text-muted-foreground">Réservé à l&apos;équipe plateforme.</p>
          </div>
          <LoginForm />
          <p className="text-xs text-muted-foreground">
            Démo : admin@sira.app / sira-demo, puis le code 123456.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

`src/app/(auth)/connexion/verification/totp-form.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { verifyTotp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TotpForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verifyTotp(code);
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else setError(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium">Code à 6 chiffres</label>
        <Input
          id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
        Valider
      </Button>
    </form>
  );
}
```

`src/app/(auth)/connexion/verification/page.tsx` :

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PRE_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken } from "@/lib/auth/token";
import { TotpForm } from "./totp-form";

export default async function VerificationPage() {
  const raw = (await cookies()).get(PRE_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (!payload || payload.stage !== "pre") redirect("/connexion");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 py-8">
          <div>
            <h1 className="text-xl font-semibold">Vérification en deux étapes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Saisis le code de ton application d&apos;authentification.
            </p>
          </div>
          <TotpForm />
        </CardContent>
      </Card>
    </main>
  );
}
```

`src/app/(auth)/session-expiree/page.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionExpireePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-xl font-semibold">Session expirée</h1>
          <p className="text-sm text-muted-foreground">
            Pour ta sécurité, tu as été déconnecté. Reconnecte-toi pour continuer.
          </p>
          <Link href="/connexion" className="inline-block text-sm font-medium text-accent underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
```

`src/app/(auth)/acces-refuse/page.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AccesRefusePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-xl font-semibold">Accès refusé</h1>
          <p className="text-sm text-muted-foreground">
            Tu n&apos;as pas les droits nécessaires pour consulter cette page.
          </p>
          <Link href="/" className="inline-block text-sm font-medium text-accent underline">
            Retour à l&apos;accueil
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 8: Vérifier à la main**

Run: `pnpm typecheck && pnpm test`
Expected: OK.

Run: `pnpm dev` puis, dans un autre terminal :

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
curl -sI http://localhost:3000/connexion | grep -i -E "content-security-policy|x-frame-options|x-content-type"
```

Expected : `307 http://localhost:3000/connexion` pour `/` sans cookie ; les trois en-têtes sont présents. Dans le navigateur : connexion `admin@sira.app` / `sira-demo`, puis code `123456` → arrivée sur `/` (page provisoire). Arrêter le serveur.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: simulated login + TOTP, HMAC session cookie, middleware, security headers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Composants de données et utilitaires d'affichage

**Files:**
- Create: `src/lib/mask.ts`, `src/lib/format.ts`, `src/lib/labels.ts`, `src/components/ui/dialog.tsx`, `src/components/ui/tabs.tsx`, `src/components/data/status-badge.tsx`, `src/components/data/kpi-card.tsx`, `src/components/data/page-header.tsx`, `src/components/data/data-table.tsx`, `src/components/data/confirm-dialog.tsx`, `src/components/data/masked-value.tsx`, `src/components/data/tabs-with-url.tsx`, `tests/unit/mask.test.ts`, `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: `cn`, `Button`, `Input`, `Card*` (Tasks 1 et 3), types de `@/lib/types`.
- Produces :
  - `maskEmail(v: string): string`, `maskPhone(v: string): string` (`mask.ts`).
  - `formatMoney(amount: number, currency: string): string`, `formatDate(iso: string): string`, `formatDateTime(iso: string): string`, `formatNumber(n: number): string` (`format.ts`).
  - `type Tone = "neutral" | "success" | "warning" | "danger" | "info"` et `StatusBadge({ tone, children })`.
  - `labels.ts` : `companyStatusBadge(s: CompanyStatus): { label: string; tone: Tone }`, `subscriptionStatusBadge(s: SubscriptionStatus)`, `kycStatusBadge(s: KycDocumentStatus)`, `serviceStatusBadge(s: ServiceHealth["status"])`, `severityBadge(s: Incident["severity"])`, `invoiceStatusBadge(s: Invoice["status"])`.
  - `KpiCard({ label, value, hint?, tone? })`, `PageHeader({ title, description?, actions? })`.
  - `DataTable<T>({ columns: ColumnDef<T, unknown>[]; data: T[]; searchPlaceholder?: string; rowHref?: (row: T) => string; emptyMessage?: string; pageSize?: number })`.
  - `ConfirmDialog({ open, onOpenChange, title, description?, confirmLabel, destructive?, requireReason?, onConfirm: (reason: string) => Promise<void> | void })`.
  - `MaskedValue({ value, kind: "email" | "phone", onReveal?: () => void | Promise<void> })`.
  - `TabsWithUrl({ items: { value: string; label: string; content: React.ReactNode }[]; defaultValue: string })`.
  - `Dialog*` et `Tabs*` : enveloppes Radix (`Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`).

- [ ] **Step 1: Tests échouants (masquage et format)**

`tests/unit/mask.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "@/lib/mask";

describe("maskEmail", () => {
  it("keeps first char and domain", () => {
    expect(maskEmail("awa.diop@sahel.sn")).toBe("a•••@sahel.sn");
  });
  it("handles short or invalid values without throwing", () => {
    expect(maskEmail("a@b.sn")).toBe("a•••@b.sn");
    expect(maskEmail("no-at-sign")).toBe("••••");
    expect(maskEmail("")).toBe("••••");
  });
});

describe("maskPhone", () => {
  it("keeps the country prefix and last two digits", () => {
    expect(maskPhone("+221771230000")).toBe("+221•••••••00");
  });
  it("masks everything but the last two digits when there is no prefix", () => {
    expect(maskPhone("771230000")).toBe("•••••••00");
    expect(maskPhone("")).toBe("••••");
  });
});
```

`tests/unit/format.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("format", () => {
  it("formats XOF without decimals", () => {
    expect(norm(formatMoney(25000, "XOF"))).toMatch(/^25 000\s?(F\s?CFA|XOF)$/);
  });
  it("formats numbers with French grouping", () => {
    expect(norm(formatNumber(12345))).toBe("12 345");
  });
  it("formats a date in UTC as dd/mm/yyyy", () => {
    expect(formatDate("2026-03-05T23:30:00Z")).toBe("05/03/2026");
  });
  it("returns a dash for an invalid date", () => {
    expect(formatDate("nope")).toBe("—");
  });
});
```

Run: `pnpm test` → FAIL.

- [ ] **Step 2: Implémenter masquage et format**

`src/lib/mask.ts` :

```ts
export function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return "••••";
  return `${value[0]}•••${value.slice(at)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3) return "••••";
  const prefix = value.startsWith("+") ? value.slice(0, 4) : "";
  const rest = value.startsWith("+") ? value.slice(4) : value;
  const restDigits = rest.replace(/\D/g, "");
  return `${prefix}${"•".repeat(Math.max(restDigits.length - 2, 1))}${restDigits.slice(-2)}`;
}
```

`src/lib/format.ts` :

```ts
const number = new Intl.NumberFormat("fr-FR");

export function formatNumber(n: number): string {
  return number.format(n);
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency, maximumFractionDigits: currency === "XOF" ? 0 : 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(d);
}
```

Run: `pnpm test` → PASS.

- [ ] **Step 3: Libellés et badge**

`src/components/data/status-badge.tsx` :

```tsx
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}
```

`src/lib/labels.ts` :

```ts
import type { Tone } from "@/components/data/status-badge";
import type {
  CompanyStatus, Incident, Invoice, KycDocumentStatus, ServiceHealth, SubscriptionStatus,
} from "@/lib/types";

type Badge = { label: string; tone: Tone };

export const companyStatusBadge = (s: CompanyStatus): Badge =>
  ({
    draft: { label: "Brouillon", tone: "neutral" },
    active: { label: "Active", tone: "success" },
    suspended: { label: "Suspendue", tone: "warning" },
    closed: { label: "Fermée", tone: "danger" },
  })[s];

export const subscriptionStatusBadge = (s: SubscriptionStatus): Badge =>
  ({
    trial: { label: "Essai", tone: "info" },
    active: { label: "Active", tone: "success" },
    past_due: { label: "Impayée", tone: "danger" },
    suspended: { label: "Suspendue", tone: "warning" },
    expired: { label: "Expirée", tone: "neutral" },
    canceled: { label: "Annulée", tone: "neutral" },
  })[s];

export const kycStatusBadge = (s: KycDocumentStatus): Badge =>
  ({
    pending: { label: "En attente", tone: "warning" },
    approved: { label: "Approuvé", tone: "success" },
    rejected: { label: "Rejeté", tone: "danger" },
  })[s];

export const serviceStatusBadge = (s: ServiceHealth["status"]): Badge =>
  ({
    healthy: { label: "Opérationnel", tone: "success" },
    degraded: { label: "Dégradé", tone: "warning" },
    down: { label: "En panne", tone: "danger" },
  })[s];

export const severityBadge = (s: Incident["severity"]): Badge =>
  ({
    LOW: { label: "Faible", tone: "neutral" },
    MEDIUM: { label: "Moyenne", tone: "warning" },
    HIGH: { label: "Haute", tone: "danger" },
    CRITICAL: { label: "Critique", tone: "danger" },
  })[s];

export const invoiceStatusBadge = (s: Invoice["status"]): Badge =>
  ({
    paid: { label: "Payée", tone: "success" },
    failed: { label: "Échouée", tone: "danger" },
  })[s];
```

- [ ] **Step 4: KpiCard, PageHeader**

`src/components/data/kpi-card.tsx` :

```tsx
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClass = {
  default: "text-foreground", danger: "text-danger", warning: "text-warning", success: "text-success",
} as const;

export function KpiCard({
  label, value, hint, tone = "default",
}: { label: string; value: string | number; hint?: string; tone?: keyof typeof toneClass }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
```

`src/components/data/page-header.tsx` :

```tsx
export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Dialog, Tabs, ConfirmDialog**

`src/components/ui/dialog.tsx` :

```tsx
"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;

export function DialogContent({
  className, children, ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-card p-6 shadow-card",
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogTitle(props: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className="text-lg font-semibold" {...props} />;
}

export function DialogDescription(props: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className="mt-1 text-sm text-muted-foreground" {...props} />;
}
```

`src/components/ui/tabs.tsx` :

```tsx
"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-accent data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("pt-5 focus-visible:outline-none", className)} {...props} />;
}
```

`src/components/data/confirm-dialog.tsx` :

```tsx
"use client";

import { useState } from "react";
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
  onConfirm: (reason: string) => Promise<void> | void;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, requireReason, onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = requireReason && reason.trim().length === 0;

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(""); setError(null); } onOpenChange(o); }}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
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
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={confirm} disabled={busy || !!missing}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: MaskedValue et TabsWithUrl**

`src/components/data/masked-value.tsx` :

```tsx
"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskEmail, maskPhone } from "@/lib/mask";

export function MaskedValue({
  value, kind, onReveal,
}: { value: string; kind: "email" | "phone"; onReveal?: () => void | Promise<void> }) {
  const [shown, setShown] = useState(false);

  async function toggle() {
    if (!shown) await onReveal?.();
    setShown((s) => !s);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span data-testid={`masked-${kind}`}>
        {shown ? value : kind === "email" ? maskEmail(value) : maskPhone(value)}
      </span>
      <button
        type="button" onClick={toggle}
        aria-label={shown ? "Masquer la donnée" : "Révéler la donnée"}
        className="text-muted-foreground hover:text-foreground"
      >
        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </span>
  );
}
```

`src/components/data/tabs-with-url.tsx` :

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabsWithUrl({
  items, defaultValue,
}: {
  items: { value: string; label: string; content: React.ReactNode }[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);

  function onChange(next: string) {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set("onglet", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {items.map((i) => (
          <TabsTrigger key={i.value} value={i.value}>{i.label}</TabsTrigger>
        ))}
      </TabsList>
      {items.map((i) => (
        <TabsContent key={i.value} value={i.value}>{i.content}</TabsContent>
      ))}
    </Tabs>
  );
}
```

- [ ] **Step 7: DataTable**

`src/components/data/data-table.tsx` :

```tsx
"use client";

import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  rowHref?: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T>({
  columns, data, searchPlaceholder = "Rechercher…", rowHref,
  emptyMessage = "Aucun résultat", pageSize = 15,
}: DataTableProps<T>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [visibility, setVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data, columns,
    state: { sorting, globalFilter, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          className="max-w-xs" placeholder={searchPlaceholder} aria-label="Rechercher dans le tableau"
          value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            Colonnes
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border bg-card p-2 shadow-card">
            {table.getAllLeafColumns().map((col) => (
              <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th key={h.id} className="px-3 py-2 font-medium">
                      {h.column.getCanSort() ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-foreground">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" && <ArrowUp size={12} />}
                          {sorted === "desc" && <ArrowDown size={12} />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={rowHref ? () => router.push(rowHref(row.original)) : undefined}
                  className={`border-b border-border last:border-0 ${rowHref ? "cursor-pointer hover:bg-muted/50" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} résultat(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Page précédente">
            <ChevronLeft size={14} />
          </Button>
          <span>Page {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}</span>
          <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Page suivante">
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Vérifier et commit**

Run: `pnpm typecheck && pnpm test`
Expected: OK (tests `mask` et `format` passent).

```bash
git add -A
git commit -m "feat: data components (DataTable, StatusBadge, KpiCard, ConfirmDialog, MaskedValue) and display utils

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Coquille (sidebar, fil d'Ariane, Cmd+K, thème, déconnexion automatique, placeholders)

**Files:**
- Create: `src/lib/nav.ts`, `src/components/shell/sidebar.tsx`, `src/components/shell/topbar.tsx`, `src/components/shell/breadcrumb.tsx`, `src/components/shell/command-palette.tsx`, `src/components/shell/theme-toggle.tsx`, `src/components/shell/idle-logout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/[...slug]/page.tsx`, `tests/unit/nav.test.ts`

**Interfaces:**
- Consumes: `Button` (Task 3), `logout`/`logoutIdle` (Task 3), `companiesRepo.names()` (Task 2), `cn`.
- Produces :
  - `nav.ts` : `interface NavItem { label: string; href: string; implemented: boolean }`, `interface NavSection { label: string; items: NavItem[] }`, `NAV: NavSection[]`, `allNavItems(): NavItem[]`, `isKnownPath(path: string): boolean`, `labelForSegment(segment: string): string`.
  - Le layout `(admin)` rend sidebar + topbar + `{children}` et passe la liste `{id,name}[]` à la palette.

- [ ] **Step 1: Test échouant de la navigation**

`tests/unit/nav.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { NAV, allNavItems, isKnownPath, labelForSegment } from "@/lib/nav";

describe("nav", () => {
  it("has unique hrefs", () => {
    const hrefs = allNavItems().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("marks only lot 1 pages as implemented", () => {
    const done = allNavItems().filter((i) => i.implemented).map((i) => i.href).sort();
    expect(done).toEqual(["/", "/compagnies", "/compagnies/kyc"]);
  });
  it("covers every sitemap section", () => {
    expect(NAV.map((s) => s.label)).toEqual([
      "Vue 360", "Compagnies", "Offre et facturation", "Utilisateurs et accès",
      "Flotte", "Ventes et paiements", "Colis et clients", "Communication",
      "Conformité et audit", "Supervision", "Paramètres",
    ]);
  });
  it("recognises known paths and rejects unknown ones", () => {
    expect(isKnownPath("/facturation/factures")).toBe(true);
    expect(isKnownPath("/n-importe-quoi")).toBe(false);
  });
  it("labels a segment", () => {
    expect(labelForSegment("compagnies")).toBe("Compagnies");
    expect(labelForSegment("inconnu-xyz")).toBe("Inconnu xyz");
  });
});
```

Run: `pnpm test` → FAIL.

- [ ] **Step 2: Implémenter la navigation**

`src/lib/nav.ts` :

```ts
export interface NavItem { label: string; href: string; implemented: boolean }
export interface NavSection { label: string; items: NavItem[] }

const todo = (label: string, href: string): NavItem => ({ label, href, implemented: false });

export const NAV: NavSection[] = [
  { label: "Vue 360", items: [
    { label: "Vue d'ensemble", href: "/", implemented: true },
    todo("Recherche globale", "/recherche"),
  ] },
  { label: "Compagnies", items: [
    { label: "Toutes les compagnies", href: "/compagnies", implemented: true },
    { label: "File de revue KYC", href: "/compagnies/kyc", implemented: true },
  ] },
  { label: "Offre et facturation", items: [
    todo("Plans", "/offre/plans"),
    todo("Fonctionnalités", "/offre/fonctionnalites"),
    todo("Paliers partenaires", "/offre/paliers-partenaires"),
    todo("Types de documents KYC", "/offre/types-documents-kyc"),
    todo("Abonnements", "/facturation/abonnements"),
    todo("Paiements", "/facturation/paiements"),
    todo("Factures", "/facturation/factures"),
    todo("Impayés", "/facturation/impayes"),
  ] },
  { label: "Utilisateurs et accès", items: [
    todo("Utilisateurs", "/utilisateurs"),
    todo("Rôles", "/acces/roles"),
    todo("Permissions", "/acces/permissions"),
    todo("Sessions", "/acces/sessions"),
  ] },
  { label: "Flotte", items: [
    todo("Bus", "/flotte/bus"),
    todo("Flottes", "/flotte/flottes"),
    todo("Gares", "/flotte/gares"),
    todo("Lignes", "/flotte/lignes"),
    todo("Trajets", "/flotte/trajets"),
    todo("Plans de sièges", "/flotte/plans-de-sieges"),
    todo("Maintenance", "/flotte/maintenance"),
    todo("Fournisseurs", "/flotte/fournisseurs"),
  ] },
  { label: "Ventes et paiements", items: [
    todo("Réservations", "/ventes/reservations"),
    todo("Paiements voyageurs", "/ventes/paiements"),
    todo("Billets", "/ventes/billets"),
    todo("Moyens de paiement", "/ventes/moyens-de-paiement"),
    todo("Libre-service en ligne", "/ventes/en-ligne"),
  ] },
  { label: "Colis et clients", items: [
    todo("Colis", "/colis"),
    todo("Comptes clients", "/clients/comptes"),
    todo("Fidélité", "/clients/fidelite"),
    todo("Avis", "/clients/avis"),
  ] },
  { label: "Communication", items: [
    todo("Notifications", "/communication/notifications"),
    todo("Campagnes", "/communication/campagnes"),
    todo("Segments", "/communication/segments"),
    todo("Messages", "/communication/messages"),
    todo("Programmations", "/communication/programmations"),
  ] },
  { label: "Conformité et audit", items: [
    todo("Journal d'audit", "/conformite/journal-audit"),
    todo("Accès aux données", "/conformite/acces-donnees"),
    todo("Demandes RGPD", "/conformite/demandes-rgpd"),
    todo("Consentements", "/conformite/consentements"),
    todo("Rétention", "/conformite/retention"),
  ] },
  { label: "Supervision", items: [
    todo("Services", "/supervision/services"),
    todo("Incidents", "/supervision/incidents"),
    todo("Trafic API", "/supervision/api"),
    todo("Usage", "/supervision/usage"),
  ] },
  { label: "Paramètres", items: [
    todo("Mon profil", "/parametres/profil"),
    todo("Équipe admin", "/parametres/equipe-admin"),
    todo("Journal du backoffice", "/parametres/journal-backoffice"),
  ] },
];

export function allNavItems(): NavItem[] {
  return NAV.flatMap((s) => s.items);
}

export function isKnownPath(path: string): boolean {
  return allNavItems().some((i) => i.href === path);
}

const SEGMENT_LABELS: Record<string, string> = {
  compagnies: "Compagnies", kyc: "File de revue KYC", offre: "Offre",
  facturation: "Facturation", flotte: "Flotte", ventes: "Ventes", clients: "Clients",
  communication: "Communication", conformite: "Conformité", supervision: "Supervision",
  parametres: "Paramètres", acces: "Accès", utilisateurs: "Utilisateurs", colis: "Colis",
  recherche: "Recherche",
};

export function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]!;
  const text = segment.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
```

Run: `pnpm test` → PASS.

- [ ] **Step 3: Sidebar, thème, déconnexion automatique, fil d'Ariane**

`src/components/shell/sidebar.tsx` :

```tsx
"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card md:block">
      <div className="px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sira <span className="text-accent">Backoffice</span>
        </Link>
      </div>
      <nav aria-label="Navigation principale" className="px-3 pb-6">
        {NAV.map((section) => {
          const active = section.items.some((i) => i.href === pathname);
          return (
            <details key={section.label} open={active || section.label === "Vue 360" || section.label === "Compagnies"} className="group mb-1">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {section.label}
                <ChevronDown size={14} className="text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-1 space-y-0.5 pl-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={item.href === pathname ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                        item.href === pathname
                          ? "bg-accent-soft font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                      {!item.implemented && (
                        <span className="rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">bientôt</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
```

`src/components/shell/theme-toggle.tsx` :

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost" size="sm" aria-label="Basculer le thème clair ou sombre"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun size={16} className="hidden dark:block" />
      <Moon size={16} className="dark:hidden" />
    </Button>
  );
}
```

`src/components/shell/idle-logout.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import { logoutIdle } from "@/app/(auth)/actions";

const IDLE_MS = 15 * 60 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let timer = setTimeout(() => void logoutIdle(), IDLE_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void logoutIdle(), IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
  return null;
}
```

`src/components/shell/breadcrumb.tsx` :

```tsx
"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { labelForSegment } from "@/lib/nav";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function Breadcrumb() {
  const segments = (usePathname() ?? "/").split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: UUID.test(seg) ? "Fiche" : labelForSegment(seg),
  }));
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground">Accueil</Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          <ChevronRight size={12} />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Palette de commandes et topbar**

`src/components/shell/command-palette.tsx` :

```tsx
"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { allNavItems } from "@/lib/nav";

export function CommandPalette({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
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

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Ouvrir la recherche">
        <Search size={14} />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden rounded bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <Command.Dialog
        open={open} onOpenChange={setOpen} label="Palette de commandes"
        className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        <Command.Input placeholder="Aller à une page ou une compagnie…" className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none" />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</Command.Empty>
          <Command.Group heading="Pages" className="text-xs text-muted-foreground">
            {allNavItems().map((i) => (
              <Command.Item key={i.href} value={`page ${i.label}`} onSelect={() => go(i.href)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft">
                {i.label}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Compagnies" className="text-xs text-muted-foreground">
            {companies.map((c) => (
              <Command.Item key={c.id} value={`compagnie ${c.name}`} onSelect={() => go(`/compagnies/${c.id}`)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent-soft">
                {c.name}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
```

`src/components/shell/topbar.tsx` :

```tsx
import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ companies }: { companies: { id: string; name: string }[] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <Breadcrumb />
      <div className="flex items-center gap-2">
        <CommandPalette companies={companies} />
        <ThemeToggle />
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" aria-label="Se déconnecter">
            <LogOut size={16} />
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Layout admin et placeholders**

`src/app/(admin)/layout.tsx` :

```tsx
import { IdleLogout } from "@/components/shell/idle-logout";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { companiesRepo } from "@/lib/repos/companies";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companies={companiesRepo.names()} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <IdleLogout />
    </div>
  );
}
```

`src/app/(admin)/[...slug]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { allNavItems, isKnownPath } from "@/lib/nav";

export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  if (!isKnownPath(path)) notFound();
  const item = allNavItems().find((i) => i.href === path)!;
  return (
    <>
      <PageHeader title={item.label} />
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium">Bientôt disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cet écran fait partie d&apos;un prochain lot du backoffice.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] **Step 6: Vérifier**

Run: `pnpm typecheck && pnpm test`
Expected: OK.

Run `pnpm dev`, se connecter, vérifier : sidebar à 11 sections, `/facturation/factures` affiche « Bientôt disponible », `/n-importe-quoi` affiche la page 404, `⌘K`/`Ctrl+K` ouvre la palette, le bouton lune/soleil bascule le thème, le fil d'Ariane suit l'URL, le bouton de déconnexion renvoie vers `/connexion`. Arrêter le serveur.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: admin shell (sidebar, breadcrumb, command palette, theme, idle logout, coming-soon pages)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Vue 360

**Files:**
- Create: `src/components/dashboard/service-latency-chart.tsx`
- Modify: `src/app/(admin)/page.tsx` (remplace la version provisoire)

**Interfaces:**
- Consumes: `dashboardRepo.overview()` (Task 2), `KpiCard`, `PageHeader`, `StatusBadge`, `Card*`, `serviceStatusBadge`, `severityBadge`, `subscriptionStatusBadge`, `formatMoney`, `formatDateTime`.
- Produces: la route `/`.

- [ ] **Step 1: Graphique de latence (Recharts, composant client)**

`src/components/dashboard/service-latency-chart.tsx` :

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ServiceHealth } from "@/lib/types";

const COLOR = { healthy: "var(--success)", degraded: "var(--warning)", down: "var(--danger)" } as const;

export function ServiceLatencyChart({ services }: { services: ServiceHealth[] }) {
  const data = services.map((s) => ({
    name: s.name.replace("-service", ""),
    ms: s.status === "down" ? 0 : s.responseTimeMs,
    status: s.status,
  }));
  return (
    <div className="h-56" role="img" aria-label="Temps de réponse par service, en millisecondes">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <Tooltip
            formatter={(v) => [`${v} ms`, "Réponse"]}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.name} fill={COLOR[d.status]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Page Vue 360**

Remplacer `src/app/(admin)/page.tsx` :

```tsx
import Link from "next/link";
import { ServiceLatencyChart } from "@/components/dashboard/service-latency-chart";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { serviceStatusBadge, severityBadge } from "@/lib/labels";
import { dashboardRepo } from "@/lib/repos/dashboard";

export const dynamic = "force-dynamic";

const DSR_LABEL = { ACCESS: "Accès", ERASURE: "Effacement", RECTIFICATION: "Rectification" } as const;

export default function Vue360Page() {
  const o = dashboardRepo.overview();
  return (
    <>
      <PageHeader title="Vue 360" description="L'état de la plateforme et des compagnies en un coup d'œil." />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard label="Compagnies" value={o.kpis.companies} />
        <KpiCard label="Actives" value={o.kpis.active} tone="success" />
        <KpiCard label="En brouillon" value={o.kpis.draft} />
        <KpiCard label="KYC à revoir" value={o.kpis.pendingKyc} tone="warning" />
        <KpiCard label="Abonnements impayés" value={o.kpis.pastDue} tone={o.kpis.pastDue ? "danger" : "default"} />
        <KpiCard label="Incidents ouverts" value={o.kpis.openIncidents} tone={o.kpis.openIncidents ? "danger" : "default"} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Santé des services</CardTitle></CardHeader>
          <CardContent>
            <ServiceLatencyChart services={o.services} />
            <ul className="mt-3 flex flex-wrap gap-2">
              {o.services.map((s) => {
                const b = serviceStatusBadge(s.status);
                return (
                  <li key={s.name} className="flex items-center gap-1.5 text-xs">
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>{s.name}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Incidents ouverts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {o.incidents.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident ouvert.</p>}
            {o.incidents.map((i) => {
              const b = severityBadge(i.severity);
              return (
                <div key={i.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
                    <span className="font-medium">{i.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.code} · {i.serviceName} · {formatDateTime(i.detectedAt)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Impayés</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.pastDue.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <Link href={`/compagnies/${s.companyId}?onglet=abonnement`} className="font-medium hover:underline">
                  {s.companyName}
                </Link>
                <span className="tabular-nums text-muted-foreground">{formatMoney(s.price, s.currency)}</span>
              </div>
            ))}
            {o.pastDue.length === 0 && <p className="text-sm text-muted-foreground">Aucun impayé.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Demandes RGPD à traiter</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.dsr.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span>{DSR_LABEL[d.type]} <span className="text-xs text-muted-foreground">({d.requesterRef})</span></span>
                <StatusBadge tone={d.daysLeft < 0 ? "danger" : d.daysLeft <= 5 ? "warning" : "neutral"}>
                  {d.daysLeft < 0 ? `En retard de ${-d.daysLeft} j` : `${d.daysLeft} j restants`}
                </StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Activité récente</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {o.activity.map((a) => (
              <div key={a.id} className="text-sm">
                <p>{a.action}{a.companyName ? ` · ${a.companyName}` : ""}</p>
                <p className="text-xs text-muted-foreground">{a.actor} · {formatDate(a.at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `pnpm typecheck && pnpm build`
Expected: OK (`/` est dynamique).

Run `pnpm dev`, se connecter : six KPI (`Compagnies 20`, `Actives 12`, `En brouillon 5`, `Abonnements impayés 2`, `Incidents ouverts 2`), graphique avec une barre rouge (notification) et une jaune (parcel), liste d'incidents, deux impayés, trois demandes RGPD dont une « En retard », activité récente. Basculer en sombre : le graphique reste lisible. Arrêter le serveur.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Vue 360 dashboard

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Liste des compagnies, file KYC et actions serveur

**Files:**
- Create: `src/app/(admin)/compagnies/actions.ts`, `src/app/(admin)/compagnies/page.tsx`, `src/app/(admin)/compagnies/companies-table.tsx`, `src/app/(admin)/compagnies/kyc/page.tsx`, `src/app/(admin)/compagnies/kyc/kyc-queue-table.tsx`, `src/components/company/kyc-actions.tsx`

**Interfaces:**
- Consumes: `companiesRepo` (Task 2), `requireSession` (Task 3), `DataTable`, `ConfirmDialog`, `StatusBadge`, `companyStatusBadge`, `kycStatusBadge`, `PageHeader`, `Button`.
- Produces :
  - Server actions (`"use server"`, chacune appelle `requireSession()` d'abord et `revalidatePath` pour `/`, `/compagnies`, `/compagnies/kyc`, `/compagnies/${id}`) : `approveDocument(docId: string): Promise<void>`, `rejectDocument(docId: string, reason: string): Promise<void>`, `forceActivateCompany(companyId: string, reason: string): Promise<void>`, `revealContact(companyId: string, field: "email" | "phone"): Promise<void>`.
  - `KycActions({ docId, companyId }: ...)` : boutons Approuver / Rejeter pour un document en attente.

- [ ] **Step 1: Server actions**

`src/app/(admin)/compagnies/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

function refresh(companyId: string | null) {
  revalidatePath("/");
  revalidatePath("/compagnies");
  revalidatePath("/compagnies/kyc");
  if (companyId) revalidatePath(`/compagnies/${companyId}`);
}

export async function approveDocument(docId: string): Promise<void> {
  const session = await requireSession();
  const doc = companiesRepo.reviewDocument(docId, "approved", undefined, session.sub);
  refresh(doc.companyId);
}

export async function rejectDocument(docId: string, reason: string): Promise<void> {
  const session = await requireSession();
  const doc = companiesRepo.reviewDocument(docId, "rejected", reason, session.sub);
  refresh(doc.companyId);
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<void> {
  const session = await requireSession();
  companiesRepo.forceActivate(companyId, reason, session.sub);
  refresh(companyId);
}

export async function revealContact(companyId: string, field: "email" | "phone"): Promise<void> {
  const session = await requireSession();
  if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
  if (!getStore().companies.some((c) => c.id === companyId)) throw new Error("Compagnie introuvable");
  companiesRepo.logReveal(companyId, field, session.sub);
  revalidatePath(`/compagnies/${companyId}`);
}
```

- [ ] **Step 2: Boutons d'action KYC (composant client)**

`src/components/company/kyc-actions.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveDocument, rejectDocument } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

export function KycActions({ docId, docLabel }: { docId: string; docLabel: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await approveDocument(docId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve} disabled={busy} aria-label={`Approuver ${docLabel}`}>Approuver</Button>
      <Button size="sm" variant="secondary" onClick={() => setRejecting(true)} aria-label={`Rejeter ${docLabel}`}>Rejeter</Button>
      <ConfirmDialog
        open={rejecting} onOpenChange={setRejecting}
        title={`Rejeter « ${docLabel} »`}
        description="Le motif sera conservé et visible dans l'historique."
        confirmLabel="Rejeter le document" destructive requireReason
        onConfirm={async (reason) => {
          await rejectDocument(docId, reason);
          router.refresh();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Liste des compagnies**

`src/app/(admin)/compagnies/companies-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { companyStatusBadge } from "@/lib/labels";
import type { Company } from "@/lib/types";

const columns: ColumnDef<Company, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "slug", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.slug}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = companyStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "partnerTier", header: "Palier" },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDate(row.original.createdAt) },
  {
    accessorKey: "activatedAt", header: "Activée le",
    cell: ({ row }) => (row.original.activatedAt ? formatDate(row.original.activatedAt) : "—"),
  },
];

export function CompaniesTable({ companies }: { companies: Company[] }) {
  return (
    <DataTable
      columns={columns} data={companies} rowHref={(c) => `/compagnies/${c.id}`}
      searchPlaceholder="Rechercher une compagnie…"
    />
  );
}
```

`src/app/(admin)/compagnies/page.tsx` :

```tsx
import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { companiesRepo } from "@/lib/repos/companies";
import type { CompanyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompaniesTable } from "./companies-table";

export const dynamic = "force-dynamic";

const FILTERS: { value: CompanyStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Actives" },
  { value: "suspended", label: "Suspendues" },
  { value: "closed", label: "Fermées" },
];

export default async function CompagniesPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = FILTERS.some((f) => f.value === statut && f.value !== "all")
    ? (statut as CompanyStatus) : undefined;
  const companies = companiesRepo.list({ status });
  return (
    <>
      <PageHeader title="Compagnies" description="Les compagnies de transport clientes de la plateforme." />
      <nav aria-label="Filtrer par statut" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f.value === "all" && !status) || f.value === status;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/compagnies" : `/compagnies?statut=${f.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                active ? "border-accent bg-accent-soft font-medium" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <CompaniesTable companies={companies} />
    </>
  );
}
```

- [ ] **Step 4: File de revue KYC**

`src/app/(admin)/compagnies/kyc/kyc-queue-table.tsx` :

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { KycActions } from "@/components/company/kyc-actions";
import { DataTable } from "@/components/data/data-table";
import { formatDate } from "@/lib/format";
import type { KycQueueItem } from "@/lib/repos/companies";

const columns: ColumnDef<KycQueueItem, unknown>[] = [
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <Link href={`/compagnies/${row.original.companyId}?onglet=kyc`} className="font-medium hover:underline">
        {row.original.companyName}
      </Link>
    ),
  },
  { accessorKey: "typeName", header: "Document" },
  { accessorKey: "uploadedAt", header: "Déposé le", cell: ({ row }) => formatDate(row.original.uploadedAt) },
  {
    id: "actions", header: "Actions", enableSorting: false,
    cell: ({ row }) => <KycActions docId={row.original.id} docLabel={`${row.original.typeName} de ${row.original.companyName}`} />,
  },
];

export function KycQueueTable({ items }: { items: KycQueueItem[] }) {
  return (
    <DataTable
      columns={columns} data={items} searchPlaceholder="Rechercher une compagnie ou un document…"
      emptyMessage="Aucun document en attente de revue."
    />
  );
}
```

`src/app/(admin)/compagnies/kyc/page.tsx` :

```tsx
import { PageHeader } from "@/components/data/page-header";
import { companiesRepo } from "@/lib/repos/companies";
import { KycQueueTable } from "./kyc-queue-table";

export const dynamic = "force-dynamic";

export default function KycQueuePage() {
  return (
    <>
      <PageHeader
        title="File de revue KYC"
        description="Documents en attente de revue, toutes compagnies confondues, du plus ancien au plus récent."
      />
      <KycQueueTable items={companiesRepo.kycQueue()} />
    </>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `pnpm typecheck && pnpm build`
Expected: OK.

Run `pnpm dev`, se connecter :
- `/compagnies` : 20 lignes sur 2 pages, filtre « Brouillon » → 5, recherche « kolda » → 1, clic sur une ligne → navigation vers `/compagnies/<uuid>` (la fiche arrive à la Task 8 : 404 attendu pour l'instant).
- `/compagnies/kyc` : liste non vide ; **Rejeter** sans motif → bouton « Rejeter le document » désactivé ; avec motif → la ligne disparaît ; **Approuver** → la ligne disparaît.
Arrêter le serveur.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: companies list, KYC review queue, server actions with session check

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Fiche compagnie (onglets)

**Files:**
- Create: `src/app/(admin)/compagnies/[id]/page.tsx`, `src/app/(admin)/compagnies/[id]/not-found.tsx`, `src/components/company/company-tabs.tsx`, `src/components/company/kyc-panel.tsx`, `src/components/company/contact-field.tsx`

**Interfaces:**
- Consumes: `companiesRepo.detail()` (Task 2), `TabsWithUrl`, `MaskedValue`, `ConfirmDialog`, `KycActions`, `forceActivateCompany`, `revealContact` (Task 7), badges et formats (Task 4), `KYC_TYPES`.
- Produces: la route `/compagnies/[id]` ; `?onglet=` ∈ `profil | kyc | abonnement | fonctionnalites | utilisation | parrainage | retention | equipe | flotte | activite` (défaut `profil`).

- [ ] **Step 1: Champ de contact masqué (client)**

`src/components/company/contact-field.tsx` :

```tsx
"use client";

import { revealContact } from "@/app/(admin)/compagnies/actions";
import { MaskedValue } from "@/components/data/masked-value";

export function ContactField({
  companyId, field, value,
}: { companyId: string; field: "email" | "phone"; value: string }) {
  return <MaskedValue value={value} kind={field} onReveal={() => revealContact(companyId, field)} />;
}
```

- [ ] **Step 2: Panneau KYC (client)**

`src/components/company/kyc-panel.tsx` :

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
import type { Company, KycDocument } from "@/lib/types";
import { KYC_TYPES } from "@/lib/types/kyc";

export function KycPanel({ company, documents }: { company: Company; documents: KycDocument[] }) {
  const router = useRouter();
  const [forcing, setForcing] = useState(false);
  const approved = KYC_TYPES.filter((t) =>
    documents.some((d) => d.typeCode === t.code && d.status === "approved"),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium">{approved} / {KYC_TYPES.length}</span> documents obligatoires approuvés.
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
            {KYC_TYPES.map((t) => {
              const doc = documents.find((d) => d.typeCode === t.code);
              const badge = doc ? kycStatusBadge(doc.status) : null;
              return (
                <tr key={t.code} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
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
          await forceActivateCompany(company.id, reason);
          router.refresh();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Onglets**

`src/components/company/company-tabs.tsx` (composant serveur : il assemble les onglets, les parties interactives sont des composants client) :

```tsx
import { ContactField } from "@/components/company/contact-field";
import { KycPanel } from "@/components/company/kyc-panel";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { companyStatusBadge, invoiceStatusBadge, subscriptionStatusBadge } from "@/lib/labels";
import type { CompanyDetail } from "@/lib/types";

const TAB_VALUES = ["profil", "kyc", "abonnement", "fonctionnalites", "utilisation", "parrainage", "retention", "equipe", "flotte", "activite"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums">{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CompanyTabs({ detail, initialTab }: { detail: CompanyDetail; initialTab?: string }) {
  const { company: c, subscription: sub } = detail;
  const status = companyStatusBadge(c.status);

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Card><CardContent>
          <dl>
            <Row label="Nom">{c.name}</Row>
            <Row label="Identifiant">{c.slug}</Row>
            <Row label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></Row>
            <Row label="Pays / devise">{c.country} · {c.currency}</Row>
            <Row label="E-mail de contact"><ContactField companyId={c.id} field="email" value={c.contactEmail} /></Row>
            <Row label="Téléphone"><ContactField companyId={c.id} field="phone" value={c.contactPhone} /></Row>
            <Row label="Registre du commerce">{c.registrationNumber}</Row>
            <Row label="NINEA">{c.ninea}</Row>
            <Row label="Palier partenaire">{c.partnerTier}</Row>
            <Row label="Créée le">{formatDate(c.createdAt)}</Row>
            <Row label="Activée le">{c.activatedAt ? formatDate(c.activatedAt) : "—"}</Row>
          </dl>
        </CardContent></Card>
      ),
    },
    { value: "kyc", label: "Vérification KYC", content: <KycPanel company={c} documents={detail.documents} /> },
    {
      value: "abonnement", label: "Abonnement et paiements",
      content: (
        <div className="space-y-4">
          {sub ? (
            <Card><CardContent><dl>
              <Row label="Plan">{sub.planName}</Row>
              <Row label="Statut">{(() => { const b = subscriptionStatusBadge(sub.status); return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>; })()}</Row>
              <Row label="Prix">{formatMoney(sub.price, sub.currency)} / {sub.billingCycle === "MONTHLY" ? "mois" : "an"}</Row>
              <Row label="Prochaine échéance">{formatDate(sub.nextBillingDate)}</Row>
            </dl></CardContent></Card>
          ) : <Empty>Aucun abonnement.</Empty>}
          {detail.invoices.length > 0 && (
            <Card><CardContent>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Facture</th><th className="py-1 font-medium">Émise le</th><th className="py-1 font-medium">Montant</th><th className="py-1 font-medium">Statut</th></tr></thead>
                <tbody>
                  {detail.invoices.map((i) => {
                    const b = invoiceStatusBadge(i.status);
                    return (
                      <tr key={i.id} className="border-t border-border">
                        <td className="py-1.5">{i.number}</td><td>{formatDate(i.issuedAt)}</td>
                        <td className="tabular-nums">{formatMoney(i.amount, i.currency)}</td>
                        <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </div>
      ),
    },
    {
      value: "fonctionnalites", label: "Fonctionnalités et limites",
      content: detail.limits ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="space-y-4">
            <Meter label="Utilisateurs" used={detail.limits.usedUsers} max={detail.limits.maxUsers} />
            <Meter label="Bus" used={detail.limits.usedBuses} max={detail.limits.maxBuses} />
          </CardContent></Card>
          <Card><CardContent>
            <ul className="space-y-2 text-sm">
              {detail.features.map((f) => (
                <li key={f.code} className="flex items-center justify-between">
                  {f.name}<StatusBadge tone={f.enabled ? "success" : "neutral"}>{f.enabled ? "Activée" : "Désactivée"}</StatusBadge>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </div>
      ) : <Empty>Aucun plan souscrit : pas de limites ni de fonctionnalités.</Empty>,
    },
    {
      value: "utilisation", label: "Utilisation",
      content: (
        <Card><CardContent><dl>
          {detail.usage.map((u) => <Row key={u.metricCode} label={u.label}>{formatNumber(u.value)}</Row>)}
        </dl></CardContent></Card>
      ),
    },
    {
      value: "parrainage", label: "Parrainage et crédits",
      content: (
        <Card><CardContent className="space-y-3">
          <p className="text-sm">Code de parrainage : <span className="font-mono font-medium">{detail.referral.code ?? "aucun"}</span></p>
          {detail.referral.credits.length === 0 ? <Empty>Aucun crédit reçu.</Empty> : (
            <ul className="space-y-2 text-sm">
              {detail.referral.credits.map((cr) => (
                <li key={cr.id} className="flex items-center justify-between">
                  {formatMoney(cr.amount, cr.currency)}
                  <StatusBadge tone={cr.status === "AVAILABLE" ? "info" : "neutral"}>{cr.status === "AVAILABLE" ? "Disponible" : "Utilisé"}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "retention", label: "Rétention des données",
      content: (
        <Card><CardContent>
          <p className="text-sm">
            Durée de conservation des traces d&apos;audit (adresses IP et agents) :{" "}
            <span className="font-medium">{c.dataRetentionDays ? `${c.dataRetentionDays} jours` : "défaut plateforme (730 jours)"}</span>
          </p>
        </CardContent></Card>
      ),
    },
    {
      value: "equipe", label: "Équipe",
      content: (
        <Card><CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Nom</th><th className="py-1 font-medium">Rôle</th><th className="py-1 font-medium">E-mail</th></tr></thead>
            <tbody>
              {detail.employees.map((e) => (
                <tr key={e.id} className="border-t border-border"><td className="py-1.5 font-medium">{e.name}</td><td>{e.role}</td><td className="text-muted-foreground">{e.email.replace(/^(.).*(@.*)$/, "$1•••$2")}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ),
    },
    {
      value: "flotte", label: "Flotte et trajets",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent>
            <h3 className="mb-2 text-sm font-semibold">Bus ({detail.buses.length})</h3>
            {detail.buses.length === 0 ? <Empty>Aucun bus.</Empty> : (
              <ul className="space-y-1 text-sm">
                {detail.buses.map((b) => (
                  <li key={b.id} className="flex justify-between">{b.plate}<StatusBadge tone={b.status === "active" ? "success" : "warning"}>{b.status === "active" ? "En service" : "Maintenance"}</StatusBadge></li>
                ))}
              </ul>
            )}
          </CardContent></Card>
          <Card><CardContent>
            <h3 className="mb-2 text-sm font-semibold">Trajets ({detail.trips.length})</h3>
            {detail.trips.length === 0 ? <Empty>Aucun trajet.</Empty> : (
              <ul className="space-y-1 text-sm">
                {detail.trips.map((t) => (
                  <li key={t.id} className="flex justify-between"><span>{t.route}</span><span className="text-muted-foreground">{formatDateTime(t.departure)}</span></li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </div>
      ),
    },
    {
      value: "activite", label: "Activité",
      content: (
        <Card><CardContent>
          {detail.activity.length === 0 ? <Empty>Aucune activité.</Empty> : (
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

Note : la liste Équipe masque directement l'e-mail par expression régulière côté serveur (affichage seul, pas de bouton de révélation dans ce lot).

- [ ] **Step 4: Page et 404**

`src/app/(admin)/compagnies/[id]/page.tsx` :

```tsx
import { notFound } from "next/navigation";
import { CompanyTabs } from "@/components/company/company-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { companyStatusBadge } from "@/lib/labels";
import { companiesRepo } from "@/lib/repos/companies";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = companiesRepo.detail(id);
  if (!detail) notFound();
  const badge = companyStatusBadge(detail.company.status);
  return (
    <>
      <PageHeader
        title={detail.company.name}
        description={`Identifiant : ${detail.company.slug}`}
        actions={<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      />
      <CompanyTabs detail={detail} initialTab={onglet} />
    </>
  );
}
```

`src/app/(admin)/compagnies/[id]/not-found.tsx` :

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function CompanyNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Compagnie introuvable</p>
        <Link href="/compagnies" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `pnpm typecheck && pnpm build`
Expected: OK.

Run `pnpm dev`, se connecter, ouvrir « Kolda Voyages » (`/compagnies`, recherche « kolda ») :
- Onglet Profil : e-mail et téléphone masqués ; l'œil les révèle, et l'onglet Activité montre ensuite « Donnée personnelle révélée : e-mail ».
- Onglet KYC : 5 approuvés, 1 en attente ; **Approuver** le dernier → la compagnie passe « Active » (badge de l'en-tête), l'onglet Activité contient « Compagnie activée (KYC complet) ».
- Ouvrir un autre brouillon → **Forcer l'activation** : bouton désactivé sans motif, avec motif → badge « Activée de force ».
- `?onglet=abonnement` ouvre directement l'onglet ; un UUID inconnu affiche « Compagnie introuvable ».
Arrêter le serveur.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: company detail page with tabs, KYC panel, masked contact, forced activation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Parcours E2E Playwright, README et vérification finale

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/backoffice.spec.ts`, `README.md`

**Interfaces:**
- Consumes: tout ce qui précède. Identifiants de démonstration ; compagnie « Kolda Voyages » (brouillon, 5 documents approuvés, 1 en attente).

- [ ] **Step 1: Configuration Playwright**

`playwright.config.ts` :

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/connexion",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

Run: `pnpm exec playwright install chromium`
Expected: Chromium téléchargé.

- [ ] **Step 2: Parcours E2E**

`tests/e2e/backoffice.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill("admin@sira.app");
  await page.getByLabel("Mot de passe").fill("sira-demo");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Code à 6 chiffres").fill("123456");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("heading", { name: "Vue 360" })).toBeVisible();
}

test("anonymous visitors are redirected to the login page", async ({ page }) => {
  await page.goto("/compagnies");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("a wrong TOTP code is refused", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill("admin@sira.app");
  await page.getByLabel("Mot de passe").fill("sira-demo");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("alert")).toContainText("Code incorrect");
});

test("login, dashboard, company KYC approval activates the company", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Santé des services")).toBeVisible();

  await page.getByRole("link", { name: "Toutes les compagnies" }).click();
  await page.getByPlaceholder("Rechercher une compagnie…").fill("kolda");
  await page.getByRole("row", { name: /Kolda Voyages/ }).click();
  await expect(page.getByRole("heading", { name: "Kolda Voyages" })).toBeVisible();

  // personal data is masked until revealed
  await expect(page.getByTestId("masked-email")).toContainText("•••");
  await page.getByRole("button", { name: "Révéler la donnée" }).first().click();
  await expect(page.getByTestId("masked-email")).toContainText("@kolda-voyages.sn");

  await page.getByRole("tab", { name: "Vérification KYC" }).click();
  await expect(page.getByText("5 / 6")).toBeVisible();
  await page.getByRole("button", { name: /^Approuver / }).click();

  await expect(page.getByText("6 / 6")).toBeVisible();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Compagnie activée (KYC complet)")).toBeVisible();
});

test("rejecting a document requires a reason", async ({ page }) => {
  await login(page);
  await page.goto("/compagnies/kyc");
  await page.getByRole("button", { name: /^Rejeter / }).first().click();
  const confirm = page.getByRole("button", { name: "Rejeter le document" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Motif (obligatoire)").fill("Document illisible");
  await expect(confirm).toBeEnabled();
});

test("unimplemented sections show a coming-soon page", async ({ page }) => {
  await login(page);
  await page.goto("/facturation/factures");
  await expect(page.getByText("Bientôt disponible")).toBeVisible();
});
```

Notes d'implémentation : le test « login… » modifie l'état en mémoire du serveur ; comme `reuseExistingServer` est à `false`, chaque `pnpm e2e` repart d'une graine neuve. Le test « rejecting » n'envoie pas la confirmation, donc il ne dépend pas de l'état laissé par le test précédent.

- [ ] **Step 3: README**

`README.md` :

````markdown
# Sira Backoffice (admin)

Console d'administration de la plateforme Sira, destinée à l'équipe plateforme.
Lot 1 : socle, Vue 360, Compagnies, sur données statiques typées (aucun appel réseau).

## Lancer

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Connexion de démonstration : `admin@sira.app` / `sira-demo`, puis le code `123456`.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | serveur de développement |
| `pnpm build && pnpm start` | build et serveur de production |
| `pnpm typecheck` | vérification TypeScript |
| `pnpm test` | tests unitaires (Vitest) |
| `pnpm e2e` | parcours de bout en bout (Playwright ; `pnpm exec playwright install chromium` une fois) |

## Architecture

- `src/lib/repos` : dépôts adossés à un store en mémoire initialisé par `src/lib/data/seed.ts`. Le branchement aux API remplacera cette seule couche.
- `src/app/(admin)` : pages (Server Components) ; mutations via Server Actions qui vérifient la session.
- `src/lib/auth` : jeton HMAC dans un cookie `HttpOnly` `SameSite=Strict` ; `middleware.ts` protège toutes les routes sauf l'accès.
- `docs/sitemap.md` : sitemap complet ; `docs/superpowers/` : spec et plan.

## Limites connues du lot 1

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Les sections autres que Vue 360 et Compagnies affichent « Bientôt disponible ».
- Navigation latérale masquée sous 768 px (outil de bureau).
````

- [ ] **Step 4: Exécuter toute la vérification**

Run:

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm e2e
```

Expected : typecheck OK ; Vitest vert (utils, companies-repo, dashboard-repo, token, mask, format, nav) ; build OK ; Playwright : 5 tests passent. Si un sélecteur échoue, corriger le **composant** (libellé accessible manquant) plutôt que le test, sauf faute manifeste dans le test.

- [ ] **Step 5: Vérification visuelle (clair et sombre)**

Run `pnpm dev`, parcourir `/`, `/compagnies`, `/compagnies/kyc`, une fiche compagnie dans les deux thèmes. Vérifier : contraste lisible, aucun débordement horizontal de la page, tableaux dont le défilement horizontal reste interne. Arrêter le serveur.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "test: Playwright journey, README, final verification for lot 1

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Auto-revue (couverture du spec)

- Connexion, TOTP, session expirée, accès refusé : Task 3. Vue 360 : Task 6. Liste, fiche à 10 onglets, file KYC : Tasks 7 et 8. Placeholders et navigation complète : Task 5.
- Sécurité : cookie `HttpOnly`/`SameSite=Strict`, middleware, CSP et en-têtes (Task 3), déconnexion après inactivité (Task 5), masquage et révélation journalisée (Tasks 2, 4, 8), motif obligatoire (Tasks 4, 7, 8), vérification de session dans chaque action (Task 7).
- Dépôts et données : Task 2 ; mutations en mémoire (approbation, rejet, activation forcée, auto-activation) : Tasks 2 et 7.
- Tests : Vitest (Tasks 1 à 5), Playwright (Task 9).
- Cohérence des noms : `companiesRepo`, `dashboardRepo`, `KycQueueItem`, `requireSession`, `ConfirmDialog.onConfirm(reason)`, `TabsWithUrl` (`?onglet=`), `KycActions({ docId, docLabel })` sont définis avant d'être utilisés.
- Hors périmètre rappelé : pas de branchement aux API, pas d'i18n, sections hors lot en « Bientôt disponible ».
