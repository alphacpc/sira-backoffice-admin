# Backoffice Sira, lot 1 : socle, Vue 360, Compagnies

Date : 2026-11-01. Statut : design validé en brainstorm, en attente de relecture du spec.
Référence : `docs/sitemap.md` (sitemap validé, ~60 écrans, découpés en lots).

## Décisions

- Direction visuelle : **C, SaaS moderne** (fond blanc ou gris très clair, coins arrondis, ombres douces, accent chaud orangé). Modes clair et sombre.
- Stack : Next.js App Router + TypeScript strict, Tailwind v4 + shadcn/ui, TanStack Table, Zod + React Hook Form, Recharts, pnpm. TanStack Query et Playwright arrivent au branchement API et aux tests.
- Données : **statiques typées**, types alignés sur les modèles des services. Aucun appel réseau dans le lot 1.
- Lot 1 = socle + Vue 360 + Compagnies. Les autres sections du sitemap sont visibles dans la sidebar mais mènent à une page « Bientôt disponible ».

## Architecture

Projet Next.js dans `backoffice-admin/`.

```
src/app/(auth)/          connexion, verification, session-expiree, acces-refuse
src/app/(admin)/         coquille + pages (Vue 360, compagnies, placeholders)
src/components/ui/       shadcn
src/components/shell/    sidebar, palette Cmd+K, fil d'Ariane, en-tête
src/components/data/     DataTable, StatusBadge, KpiCard, PageHeader, ConfirmDialog
src/lib/types/           types métier (Company, KycDocument, Subscription, ...)
src/lib/data/            jeux de données statiques
src/lib/repos/           interfaces de dépôt + implémentation statique
src/lib/auth/            session simulée, middleware helpers
```

Chaque ressource est lue par une interface de dépôt (`companiesRepo.list(filters)`, `.get(id)`, etc.). Le lot 1 l'implémente sur les données statiques ; le branchement aux API remplacera cette seule couche.

## Design system

- Jetons de couleur en variables CSS, clair et sombre via `next-themes`.
- Composants communs : `DataTable` (TanStack, dense, tri, filtres, visibilité des colonnes), `StatusBadge`, `KpiCard`, `PageHeader`, `ConfirmDialog` avec motif obligatoire.

## Écrans

- `/connexion`, `/connexion/verification` (code à 6 chiffres), `/session-expiree`, `/acces-refuse`. Accès simulé avec un cookie factice posé côté serveur.
- `/` Vue 360 : KPI, santé des services, incidents ouverts, impayés, demandes RGPD proches de l'échéance, activité récente.
- `/compagnies` : liste filtrable par statut (brouillon, active, suspendue, fermée).
- `/compagnies/[id]` : onglets Profil, Vérification KYC (approbation ou rejet de document, activation forcée avec motif), Abonnement et paiements, Fonctionnalités et limites, Utilisation, Parrainage et crédits, Rétention des données, Équipe, Flotte et trajets, Activité.
- `/compagnies/kyc` : file de revue des documents en attente, tous tenants.
- Placeholders « Bientôt disponible » pour toutes les autres routes du sitemap, présentes dans la navigation.

Les actions (approuver, rejeter, forcer l'activation) modifient un état en mémoire du dépôt statique pour que les écrans réagissent ; rien n'est persisté.

## Sécurité

- Middleware qui protège `(admin)` ; cookie `HttpOnly` + `SameSite=Strict` ; aucun jeton en `localStorage`.
- CSP et en-têtes de sécurité dans `next.config`.
- Déconnexion après inactivité.
- Données personnelles (e-mail, téléphone) masquées par défaut, bouton « révéler ».
- Actions sensibles avec confirmation et motif obligatoire.
- Menus masqués selon les permissions (confort uniquement ; le contrôle réel reste côté API plus tard).
- Aucune donnée sensible dans les URL ou les logs.

## Données de test

Une vingtaine de compagnies cohérentes : statuts variés, documents KYC en états variés, abonnements (essai, active, impayée, suspendue), utilisation, crédits de parrainage. Elles alimentent aussi la Vue 360 (les chiffres sont dérivés des mêmes jeux).

## Tests

- Vitest : dépôts, filtres, utilitaires de masquage.
- Playwright : un parcours (connexion, TOTP, Vue 360, ouverture d'une compagnie, approbation d'un document KYC).

## Hors périmètre du lot 1

Branchement aux API, rôle administrateur plateforme et TOTP réels (prérequis backend du sitemap), toutes les sections autres que Vue 360 et Compagnies, internationalisation (français uniquement).
