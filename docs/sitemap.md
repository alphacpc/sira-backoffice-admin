# Backoffice Sira — Sitemap validé (2026-11-01)

Statut : **validé par l'utilisateur**, implémentation prévue le lendemain. Aucun code n'existe encore.

## Contexte et décisions

- Le backoffice est l'outil de l'équipe plateforme Sira (vue 360 de la solution). La plateforme destinée aux tenants (compagnies) sera un projet séparé, construit ensuite.
- Dépôt dédié : `https://github.com/alphacpc/sira-backoffice-admin.git` (remote `origin` configuré, rien poussé). Dossier : `sira/backoffice-admin/`.
- **Attention** : le dépôt `sira/website/` (site vitrine) a aussi `origin` = `sira-backoffice-admin.git`. À corriger avant tout `push` depuis `website/`.
- Phase initiale : **interfaces uniquement, sur données statiques typées** (types alignés sur les modèles des services). Branchement aux API ensuite.
- Inspiration design : grands opérateurs de transport européens (rail, bus, aérien) ; design system évolutif, mode clair/sombre, tableaux denses.
- Stack envisagée (à confirmer au spec) : Next.js App Router + TypeScript strict, Tailwind v4 + shadcn/ui, TanStack Table/Query, Zod, React Hook Form, Recharts/Tremor, Playwright.
- Prochaine étape du brainstorm : direction visuelle (2-3 pistes de design system avec maquettes), puis spec de conception, puis plan.

## 0. Accès (public)
- `/connexion` : identifiant et mot de passe
- `/connexion/verification` : code TOTP
- `/session-expiree`, `/acces-refuse`

## 1. Vue 360
- `/` : indicateurs clés, santé des services, incidents ouverts, impayés, demandes RGPD proches de l'échéance, activité récente
- `/recherche` : recherche globale (compagnie, utilisateur, réservation, colis, code billet)

## 2. Compagnies (tenants)
- `/compagnies` : liste, filtres par statut (brouillon, active, suspendue, fermée)
- `/compagnies/[id]`, onglets :
  - Profil
  - Vérification KYC (documents, approbation ou rejet, activation forcée)
  - Abonnement et paiements
  - Fonctionnalités et limites
  - Utilisation
  - Parrainage et crédits
  - Rétention des données
  - Équipe (employés, rôles)
  - Flotte et trajets de la compagnie
  - Activité (journal d'audit filtré)
- `/compagnies/kyc` : file de revue des documents en attente, tous tenants confondus

## 3. Offre et facturation SaaS (ce que les compagnies paient à Sira)
- `/offre/plans`, `/offre/plans/[id]`
- `/offre/fonctionnalites`
- `/offre/paliers-partenaires`
- `/offre/types-documents-kyc`
- `/facturation/abonnements`, `/facturation/abonnements/[id]` : essai, active, impayée, suspendue, expirée, annulée ; historique des changements de plan ; tentatives de paiement ; relance
- `/facturation/paiements` : paiements d'abonnement (payé ou échoué)
- `/facturation/factures`, `/facturation/factures/[id]`
- `/facturation/impayes` : file de travail, délai avant suspension

## 4. Utilisateurs et accès
- `/utilisateurs`, `/utilisateurs/[id]`
- `/acces/roles`, `/acces/permissions` (matrice)
- `/acces/sessions` : sessions actives et révocation

## 5. Opérations des compagnies (vue transverse, filtrable par compagnie)

### 5a. Flotte
- `/flotte/bus`, `/flotte/bus/[id]` : compagnie, flotte, ligne, dépôt, chauffeur, statut, capacité, maintenance, plans de sièges
- `/flotte/flottes`
- `/flotte/gares`
- `/flotte/lignes`, `/flotte/lignes/[id]`
- `/flotte/trajets`, `/flotte/trajets/[id]` : horaires, prix, places, bus, réservations et colis, **plan de sièges visuel** (libres, réservés, occupés)
- `/flotte/plans-de-sieges`
- `/flotte/maintenance`, `/flotte/fournisseurs`

### 5b. Ventes et paiements des voyageurs (ce que les clients paient aux compagnies)
- `/ventes/reservations`, `/ventes/reservations/[id]` : passager, trajet, siège, montant, canal (en ligne ou guichet), chronologie
- `/ventes/paiements`, `/ventes/paiements/[id]` : transactions en ligne (en attente, réussie, échouée), moyen de paiement, incohérences
- `/ventes/billets`, `/ventes/billets/[code]` : émis, enregistré, utilisé, annulé, scans
- `/ventes/moyens-de-paiement`
- `/ventes/en-ligne` : libre-service (impayées qui vont expirer, taux de conversion, échecs)

### 5c. Colis et clients
- `/colis`, `/colis/[id]`
- `/clients/comptes`, `/clients/fidelite`, `/clients/avis`

## 6. Communication
- `/communication/notifications`
- `/communication/campagnes`, `/communication/segments`, `/communication/messages`, `/communication/programmations`

## 7. Conformité et audit
- `/conformite/journal-audit`
- `/conformite/acces-donnees`
- `/conformite/demandes-rgpd` : délai légal de 30 jours, traitement
- `/conformite/consentements`
- `/conformite/retention`

## 8. Supervision
- `/supervision/services` : santé en temps réel
- `/supervision/incidents`, `/supervision/incidents/[id]`
- `/supervision/api` : trafic et latences par endpoint
- `/supervision/usage`

## 9. Paramètres du backoffice
- `/parametres/profil` : sécurité du compte, TOTP, sessions
- `/parametres/equipe-admin`
- `/parametres/journal-backoffice`

## Transverse
- Navigation : barre latérale à deux niveaux, palette de commandes (Cmd+K), filtres sauvegardables, fil d'Ariane, mode clair et sombre.
- Sécurité : TOTP obligatoire ; cookies `HttpOnly` + `SameSite=Strict`, jetons jamais en `localStorage`, BFF côté Next.js ; menus masqués selon les permissions (confort, le contrôle réel reste côté API) ; actions sensibles avec confirmation et motif obligatoire (activation forcée, suspension, révocation de sessions, changement de rôle) ; données personnelles masquées par défaut avec révélation journalisée ; CSP stricte et en-têtes de sécurité ; déconnexion après inactivité ; aucune donnée sensible dans les URL ou les logs.

## Prérequis backend (non bloquants pour les maquettes)
1. Rôle « administrateur plateforme » distinct et TOTP (inexistants aujourd'hui).
2. Endpoints de liste globale des paiements de réservation (`booking-service`) et des paiements d'abonnement (`company-service`) ; aujourd'hui seul `GET /transactions/{id}` existe.
3. Pas de versements ni de remboursements aux compagnies à ce jour (à décider plus tard).
