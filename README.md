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
| `pnpm build && pnpm start` | build et serveur de production (exige `BACKOFFICE_SESSION_SECRET`, 32 caractères au moins) |
| `pnpm typecheck` | vérification TypeScript |
| `pnpm test` | tests unitaires (Vitest) |
| `pnpm e2e` | parcours de bout en bout (Playwright, serveur `pnpm dev` sur le port 3100 ; `pnpm exec playwright install chromium` une fois) |

## Architecture

- `src/lib/repos` : dépôts adossés à un store en mémoire initialisé par `src/lib/data/seed.ts`. Le branchement aux API remplacera cette seule couche.
- `src/app/(admin)` : pages (Server Components) ; mutations via Server Actions qui vérifient la session et renvoient un résultat (`ok` ou erreur) affiché dans l'interface.
- `src/lib/auth` : jeton HMAC dans un cookie `HttpOnly` `SameSite=Strict` ; `src/middleware.ts` protège toutes les routes sauf l'accès. Le TOTP est limité à 5 essais : au cinquième échec, la session de connexion est supprimée (« Trop de tentatives, reconnecte-toi »).
- Données personnelles : l'e-mail et le téléphone de contact d'une compagnie ne sont jamais présents dans le HTML de la page, seulement leur forme masquée. La valeur réelle n'est renvoyée que par une Server Action de révélation (session vérifiée, révélation journalisée).
- `docs/sitemap.md` : sitemap complet ; `docs/superpowers/` : spec et plan.

## Limites connues du lot 1

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Les sections autres que Vue 360 et Compagnies affichent « Bientôt disponible ».
- Navigation latérale masquée sous 768 px (outil de bureau).
