# Sira Backoffice (admin)

Console d'administration de la plateforme Sira, destinée à l'équipe plateforme.
Lot 1 : socle, Vue 360, Compagnies. Lot 2 : offre (plans, fonctionnalités, paliers partenaires, types de documents KYC) et facturation SaaS (abonnements, paiements, factures, impayés). Lot 3 : utilisateurs et accès (comptes, rôles, matrice des permissions, sessions). Lot 4 : flotte (bus, flottes, gares, lignes, trajets, plans de sièges, maintenance, fournisseurs) en lecture seule, plus la mise hors service d'un bus. Données statiques typées, aucun appel réseau.

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
- `src/lib/actions/run.ts` : point d'entrée commun des Server Actions (session vérifiée avant toute lecture ou écriture, résultat `ok`/erreur, motif ≤ 500 caractères). Les actions vivent dans `compagnies/actions.ts`, `facturation/actions.ts`, `offre/actions.ts`, `utilisateurs/actions.ts`, `acces/actions.ts` et `flotte/actions.ts` ; `runReveal` est la variante qui renvoie une donnée personnelle après journalisation.
- `src/lib/repos/billing.ts` : plans, fonctionnalités, paliers, registre des types KYC (source de l'activation automatique), abonnements, factures, paiements et file des impayés. Les composants clients ne reçoivent que des projections (`PlanRow`, `SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `UnpaidRow`).
- `src/lib/repos/access.ts` : comptes de la plateforme, rôles, permissions et sessions (une session est active si elle n'est ni révoquée ni expirée à la date de référence injectée). Changer un rôle révoque toutes les sessions actives du compte ; un compte ne change pas son propre rôle et le dernier administrateur actif ne peut pas être rétrogradé. Les composants clients ne reçoivent que `UserRow` (sans e-mail ni téléphone), `SessionRow` (adresse IP tronquée `a.b.c.0`) et des scalaires.
- `src/lib/repos/fleet.ts` : gares, lignes, flottes, fournisseurs, bus, équipage, trajets, plans de sièges et maintenances. Les échéances (assurance, contrôle technique, carte grise) sont calculées contre la date de référence injectée (« expirée » avant, « bientôt » dans les 30 jours). La mise hors service d'un bus exige un motif et est refusée si le bus l'est déjà, si une maintenance est en cours ou s'il a un trajet planifié ou en embarquement. Les composants clients ne reçoivent que des projections (`BusRow`, `TripRow`, `SeatMapRow`, `MaintenanceRow`, `VendorRow`, `FleetRow`, `StationRow`, `RouteRow`) ou des scalaires ; l'équipage n'y figure que par son nom.
- `src/lib/auth` : jeton HMAC dans un cookie `HttpOnly` `SameSite=Strict` ; `src/middleware.ts` protège toutes les routes sauf l'accès. Le TOTP est limité à 5 essais : au cinquième échec, la session de connexion est supprimée (« Trop de tentatives, reconnecte-toi »).
- Données personnelles : l'e-mail et le téléphone de contact d'une compagnie ou d'un compte ne sont jamais présents dans le HTML de la page, seulement leur forme masquée ; les adresses IP des sessions sont tronquées. La valeur réelle n'est renvoyée que par une Server Action de révélation (session vérifiée, révélation journalisée sans la valeur).
- `docs/sitemap.md` : sitemap complet ; `docs/superpowers/` : spec et plan.

## Lot 5 : ventes et paiements des voyageurs

Huit écrans : réservations (filtres canal, paiement, statut ; détail avec chronologie et billets), paiements voyageurs (avec les incohérences détectées : paiement bloqué, montant différent, billet manquant), billets (détail avec scans), moyens de paiement et tableau de bord du libre-service en ligne (indicateurs et réservations proches de l'expiration). Une seule action : « Annuler la réservation » (motif obligatoire).

## Lot 6 : colis et clients

Sept écrans : colis (filtres de statut, détail avec itinéraire et historique), comptes clients (détail avec fidélité, parrainage et avis), programmes de fidélité et avis clients (filtres de statut, détail). Deux actions : « Déclarer le colis perdu » (motif obligatoire, colis en transit ou au hub uniquement) et « Ignorer l'avis » (motif obligatoire, avis en attente ou examiné). Le téléphone d'un destinataire est masqué ; sa révélation est une Server Action journalisée (sans la valeur).

## Limites connues (lots 1 à 6)

- Authentification et TOTP simulés (le rôle administrateur plateforme et le TOTP réels sont des prérequis backend).
- État en mémoire : il est réinitialisé à chaque redémarrage du serveur.
- CSP avec `'unsafe-inline'` pour les scripts (Next et next-themes) : à durcir avec des nonces avant la production.
- Offre en lecture seule : ni création ni modification de plans, fonctionnalités ou paliers.
- Facturation simulée : la relance de paiement a un résultat déterministe fixé par la graine (Saint-Louis Route échoue, les autres réussissent) ; pas de PDF de facture, pas de proration ni de remboursement.
- Aucune transition automatique dans le temps : la file des impayés affiche un délai dépassé, mais rien ne suspend ni n'expire un abonnement tout seul.
- Désactiver un type de document KYC n'active aucune compagnie rétroactivement : l'activation se déclenche à l'approbation d'un document.
- Accès : ni création, ni suppression, ni suspension de compte, ni réinitialisation de mot de passe ; la matrice des permissions est en lecture seule. L'administrateur connecté au backoffice n'est pas un compte de la plateforme (rôle « administrateur plateforme » distinct, prérequis backend) : la règle « on ne change pas son propre rôle » est appliquée mais ne se déclenche que si l'identité de la session correspond à l'e-mail ou à l'identifiant d'un compte.
- Flotte en lecture seule hors « Mettre hors service » : pas de remise en service d'un bus hors service, affectations d'équipage non modifiables, aucune création ni modification de flotte, bus, ligne, gare ou trajet, ni démarrage, clôture ou annulation de maintenance.
- L'équipage est un registre du backoffice sans compte, sans e-mail ni téléphone (côté plateforme, les affectations pointent des employés de `hr-service`) ; il n'existe pas de fiche employé vers laquelle le lier.
- Les états des sièges sont figés par la graine (pas de réservation en direct) ; aucune alerte d'échéance automatique, pas de GPS ni de suivi en temps réel.
- Ventes : pas de remboursement ni de reprise d'un paiement bloqué (le backend n'en a pas : une transaction `PENDING` reste bloquée jusqu'à intervention en base) ; une réservation payée n'est pas annulable ; l'expiration des réservations en ligne est affichée mais jamais exécutée ; moyens de paiement, billets et scans en lecture seule ; le passager n'a pas de fiche (nom seulement, avec un lien vers le compte pour une réservation en ligne) ; pas de versement aux compagnies ; les incohérences sont calculées à la lecture avec l'horloge du serveur.
- Colis et clients : pas de création ni de modification de colis (le backoffice ne remplace pas le guichet) ; une perte déclarée n'est pas annulable et ne déclenche aucun remboursement ; documents de colis non affichés ; adresse du destinataire absente ; paliers de fidélité affichés tels quels, jamais recalculés ; pas de dépense de points ; un avis ignoré n'est pas restaurable et la plateforme ne répond pas aux avis ; les points sont dérivés des réservations en ligne payées de la graine.
- Les sections autres que Vue 360, Compagnies, Offre, Facturation, Utilisateurs et accès, Flotte, Ventes, Colis et clients affichent « Bientôt disponible ».
- Navigation latérale masquée sous 768 px (outil de bureau).

> **Démonstration seulement : identifiants et TOTP simulés, ne jamais déployer ce lot tel quel.**
