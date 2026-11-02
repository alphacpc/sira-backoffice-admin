# Sira Backoffice (admin)

Console d'administration de la plateforme Sira, destinée à l'équipe plateforme.
Lot 1 : socle, Vue 360, Compagnies. Lot 2 : offre (plans, fonctionnalités, paliers partenaires, types de documents KYC) et facturation SaaS (abonnements, paiements, factures, impayés). Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Données statiques typées, aucun appel réseau.

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
- `src/lib/actions/run.ts` : point d'entrée commun des Server Actions (session vérifiée avant toute lecture ou écriture, résultat `ok`/erreur, motif ≤ 500 caractères). Les actions vivent dans `compagnies/actions.ts`, `facturation/actions.ts`, `offre/actions.ts`, `utilisateurs/actions.ts` et `acces/actions.ts` ; `runReveal` est la variante qui renvoie une donnée personnelle après journalisation.
- `src/lib/repos/billing.ts` : plans, fonctionnalités, paliers, registre des types KYC (source de l'activation automatique), abonnements, factures, paiements et file des impayés. Les composants clients ne reçoivent que des projections (`PlanRow`, `SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `UnpaidRow`).
- `src/lib/repos/access.ts` : comptes de la plateforme, rôles, permissions et sessions (une session est active si elle n'est ni révoquée ni expirée à la date de référence injectée). Changer un rôle révoque toutes les sessions actives du compte ; un compte ne change pas son propre rôle et le dernier administrateur actif ne peut pas être rétrogradé. Les composants clients ne reçoivent que `UserRow` (sans e-mail ni téléphone), `SessionRow` (adresse IP tronquée `a.b.c.0`) et des scalaires.
- `src/lib/auth` : jeton HMAC dans un cookie `HttpOnly` `SameSite=Strict` ; `src/middleware.ts` protège toutes les routes sauf l'accès. Le TOTP est limité à 5 essais : au cinquième échec, la session de connexion est supprimée (« Trop de tentatives, reconnecte-toi »).
- Données personnelles : l'e-mail et le téléphone de contact d'une compagnie ou d'un compte ne sont jamais présents dans le HTML de la page, seulement leur forme masquée ; les adresses IP des sessions sont tronquées. La valeur réelle n'est renvoyée que par une Server Action de révélation (session vérifiée, révélation journalisée sans la valeur).
- `docs/sitemap.md` : sitemap complet ; `docs/superpowers/` : spec et plan.

## Limites connues (lots 1 à 3)

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Offre en lecture seule : ni création ni modification de plans, fonctionnalités ou paliers.
- Facturation simulée : la relance de paiement a un résultat déterministe fixé par la graine (Saint-Louis Route échoue, les autres réussissent) ; pas de PDF de facture, pas de proration ni de remboursement.
- Aucune transition automatique dans le temps : la file des impayés affiche un délai dépassé, mais rien ne suspend ni n'expire un abonnement tout seul.
- Désactiver un type de document KYC n'active aucune compagnie rétroactivement : l'activation se déclenche à l'approbation d'un document.
- Accès : ni création, ni suppression, ni suspension de compte, ni réinitialisation de mot de passe ; la matrice des permissions est en lecture seule. L'administrateur connecté au backoffice n'est pas un compte de la plateforme (rôle « administrateur plateforme » distinct, prérequis backend) : la règle « on ne change pas son propre rôle » est appliquée mais ne se déclenche que si l'identité de la session correspond à l'e-mail ou à l'identifiant d'un compte.
- Les sections autres que Vue 360, Compagnies, Offre, Facturation, Utilisateurs et accès affichent « Bientôt disponible ».
- Navigation latérale masquée sous 768 px (outil de bureau).

> **Démonstration seulement : identifiants et TOTP simulés, ne jamais déployer ce lot tel quel.**
