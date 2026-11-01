# Backoffice Sira, lot 2 : offre et facturation SaaS

Date : 2026-11-01. Statut : en attente de validation. Référence : `docs/sitemap.md` (sections 3 et 4 du sitemap), spec et plan du lot 1 (même socle, mêmes décisions).

## Décisions héritées du lot 1

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucun appel réseau, aucune connexion au backend.
- Pages = Server Components lisant des dépôts (`src/lib/repos`). Mutations = Server Actions qui appellent `requireSession()` en premier et renvoient un `ActionResult` (`{ ok: true } | { ok: false; error: string }`), jamais d'exception pour un échec attendu.
- Actions sensibles : confirmation et motif obligatoire (≤ 500 caractères), tracées dans l'activité. Aucune donnée personnelle envoyée au client : les composants clients ne reçoivent que des projections sans contact (règle vérifiée par un test E2E sur le HTML de production).
- Composants réutilisés : `DataTable`, `StatusBadge`, `KpiCard`, `PageHeader`, `ConfirmDialog`, `TabsWithUrl`, `Card*`, badges de `labels.ts`.

## Périmètre

Neuf écrans, déjà présents dans la navigation en « Bientôt disponible » ; ce lot les remplace par de vraies pages.

**Offre (ce que Sira vend)**
- `/offre/plans` : liste des plans (nom, prix mensuel et annuel, essai en jours, nombre d'abonnements actifs, statut).
- `/offre/plans/[id]` : détail (prix, frais d'installation, limites utilisateurs et bus, fonctionnalités incluses, abonnements liés).
- `/offre/fonctionnalites` : catalogue des fonctionnalités (code, nom, type booléen ou quota) avec les plans qui les incluent.
- `/offre/paliers-partenaires` : paliers (`STANDARD` 0 mois 0 %, `SILVER` 6 mois 5 %, `GOLD` 12 mois 10 %) avec le nombre de compagnies par palier.
- `/offre/types-documents-kyc` : types de documents KYC (6, code, nom, obligatoire, actif) ; action « activer / désactiver » un type.

**Facturation (ce que les compagnies paient à Sira)**
- `/facturation/abonnements` : liste filtrable par statut (essai, active, impayée, suspendue, expirée, annulée).
- `/facturation/abonnements/[id]` : détail avec onglets Résumé, Historique des changements de plan, Tentatives de paiement, Factures ; actions « Relancer le paiement » (statuts impayée ou suspendue) et « Annuler l'abonnement » (motif obligatoire).
- `/facturation/paiements` : paiements d'abonnement (payé ou échoué), filtrables, avec lien vers la facture et l'abonnement.
- `/facturation/factures` et `/facturation/factures/[id]` : liste (numéro, compagnie, montant, statut, date) et détail ; pas de PDF dans ce lot.
- `/facturation/impayes` : file de travail des abonnements impayés ou suspendus, triée par urgence (jours avant suspension ou expiration), avec l'action « Relancer le paiement » directement dans la liste.

## Modèle de données (types alignés sur `company-service`)

Nouveaux types dans `src/lib/types` : `Plan` (`id`, `code`, `name`, `priceMonthly`, `priceYearly`, `setupFee`, `currency`, `trialDays`, `status: "active" | "inactive"`, `limits: { maxUsers, maxBuses }`, `featureCodes: string[]`), `FeatureDef` (`code`, `name`, `kind: "boolean" | "quota"`), `PartnerTier` (`code`, `minMonths`, `discountPercent`), `KycDocumentType` (`code`, `name`, `required`, `active`), `SubscriptionHistoryEntry` (`id`, `subscriptionId`, `kind: "ACTIVATION" | "UPGRADE" | "DOWNGRADE" | "PLAN_CHANGE" | "CANCELLATION"`, `fromPlan`, `toPlan`, `at`), `PaymentAttempt` (`id`, `subscriptionId`, `companyId`, `amount`, `currency`, `status: "paid" | "failed"`, `at`, `invoiceId: string | null`, `reason: string | null`).

Les types existants `Subscription` et `Invoice` sont conservés. `Subscription` gagne `planId`, `trialEndDate: string | null`, `pastDueSince: string | null` ; `Invoice` gagne `subscriptionId`. Les `planName` existants restent cohérents avec la liste des plans (Starter, Pro, Enterprise). `KYC_TYPES` (constante du lot 1) reste la source des types de documents ; `KycDocumentType` en est le registre mutable (la liste des 6 types seedée avec `required: true`, `active: true`).

Graine : 3 plans (Starter, Pro, Enterprise) plus 1 plan inactif (« Legacy »), 6 fonctionnalités, 3 paliers, jeu d'historique et de tentatives cohérent avec les 15 abonnements existants (dont 2 impayés, 1 suspendu, 1 expiré, 1 annulé, 2 en essai), tentatives échouées pour les impayés.

## Règles métier (alignées sur le backend)

- **Relancer le paiement** : autorisé seulement pour `past_due` ou `suspended`, sinon refus avec message français. Résultat simulé déterministe : un paramètre de graine par abonnement décide succès ou échec (pas d'aléa). Succès : une tentative `paid` et une facture `paid` créées, l'abonnement repasse `active`, `pastDueSince` effacé, prochaine échéance repoussée d'un mois. Échec : une tentative `failed` avec un motif, statut inchangé.
- **Annuler l'abonnement** : refusé s'il est déjà `canceled` ou `expired` ; sinon `canceled`, ligne d'historique `CANCELLATION`, motif obligatoire enregistré dans l'activité de la compagnie.
- **Type de document KYC** : un type désactivé n'est plus exigé pour l'activation d'une compagnie ; le dépôt de lot 1 (`companiesRepo`) lit désormais le registre. Un type ne peut pas être désactivé s'il est le dernier type actif obligatoire.
- Délai avant suspension d'un impayé : 7 jours après `pastDueSince`, expiration 30 jours après la suspension (constantes affichées dans la file des impayés, calculées sans horloge cachée : la date de référence est injectée).

## Architecture

- `src/lib/repos/billing.ts` : `plansRepo`, `subscriptionsRepo`, `invoicesRepo`, `paymentsRepo`, `featuresRepo`, `tiersRepo`, `kycTypesRepo`. Les actions (relance, annulation, bascule d'un type KYC) vivent dans `src/app/(admin)/facturation/actions.ts` et `src/app/(admin)/offre/actions.ts`, avec le même motif `run()` que le lot 1 (session d'abord, `ActionResult`).
- Pages serveur par route ; tableaux clients typés sur des projections (`SubscriptionRow`, `InvoiceRow`, `PaymentRow`, `PlanRow`) sans champ superflu.
- Navigation : les 9 entrées passent à `implemented: true` ; la liste des chemins implémentés du test `nav.test.ts` est mise à jour.
- Vue 360 : l'indicateur « Abonnements impayés » et le panneau « Impayés » lisent la même source ; le panneau « Impayés » devient un lien vers `/facturation/impayes`.

## Tests

- Vitest : dépôts (filtres, règles de relance et d'annulation, bascule KYC, calcul des jours avant suspension), actions (session d'abord, `ActionResult`, motif tronqué à 500, aucune écriture si la session échoue), cohérence de la graine (chaque abonnement a un plan, chaque facture une tentative, totaux).
- Playwright : parcours « impayé → relance réussie → abonnement actif », « annuler avec motif obligatoire », « désactiver un type KYC puis activer une compagnie sans ce document », lecture d'une facture ; test `@prod` étendu aux nouvelles pages pour vérifier l'absence de coordonnées de contact dans le HTML.
- Une revue de sécurité des frontières serveur/client pour chaque nouveau composant client (tableaux, boutons d'action).

## Hors périmètre

Création et modification de plans, de fonctionnalités et de paliers (lecture seule), génération de PDF, proration, remboursements, versements aux compagnies, branchement aux API.
