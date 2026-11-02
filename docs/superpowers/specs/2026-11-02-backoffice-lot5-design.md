# Backoffice Sira, lot 5 : ventes et paiements des voyageurs

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 5b), spec et plan des lots 1 à 4 (même socle, mêmes décisions). **Prérequis : le lot 4 (flotte) est terminé et fusionné** : ce lot réutilise ses types (`Trip`, `Bus`, `SeatMap`), ses helpers (`routeLabel`, `fleetCompanies`, `parseCompanyFilter`) et le composant `CompanyFilter`.

## Décisions héritées des lots 1 à 4

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts (`src/lib/repos`) ; mutations = Server Actions via `run()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Action sensible : confirmation et motif obligatoire, rogné, **500 caractères au plus**, tracée dans l'activité de la compagnie.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Lecture seule plus une action** : les ventes appartiennent aux compagnies ; la plateforme observe et arbitre. Seule action : **« Annuler la réservation »** (motif obligatoire), calquée sur la règle du backend (`booking-service`) : on n'annule ni une réservation déjà annulée, ni une réservation payée, ni une réservation dont un paiement est en cours.
- La plateforme **ne rembourse pas, ne rejoue pas un paiement, ne modifie ni billet ni moyen de paiement** (le backend n'a ni remboursement ni reprise de paiement bloqué : voir « Limites »).
- Les **incohérences de paiement** du sitemap sont calculées à la lecture, jamais stockées : paiement bloqué, montant différent, billet manquant.
- Hors périmètre : création ou modification de réservations, de billets ou de moyens de paiement ; scan de billet depuis le backoffice ; remboursement ; reprise d'un paiement bloqué ; branchement aux API ; recherche globale.

## Périmètre : 8 écrans

Les 5 entrées de la section « Ventes et paiements » passent à `implemented: true`. Toutes les listes sont filtrables par compagnie (`?compagnie=<id>`) et ont une recherche côté client ; chaque lien de filtre conserve les autres filtres (`filterHref`, prop `keep`).

| Écran | Contenu |
|---|---|
| `/ventes/reservations` | Liste : code `BK-…`, passager, compagnie, ligne et départ, siège, montant, canal, statut, paiement, créée le. Filtres : compagnie, statut (`confirmed`, `cancelled`), paiement (`pending`, `paid`, `failed`), canal (`counter`, `online`). |
| `/ventes/reservations/[id]` | Onglets **Résumé**, **Chronologie**, **Paiements**, **Billets**. Action « Annuler la réservation ». |
| `/ventes/paiements` | Liste des transactions : référence `TX-…`, réservation, compagnie, moyen, montant, statut, date, incohérences. Filtres : compagnie, statut (`PENDING`, `COMPLETED`, `FAILED`), « avec incohérence ». |
| `/ventes/paiements/[id]` | Détail de la transaction, réservation liée, explication de chaque incohérence. |
| `/ventes/billets` | Liste : code `TK-…`, réservation, passager, ligne et départ, siège, statut, émis le, nombre de scans. Filtres : compagnie, statut (`ISSUED`, `CHECKED_IN`, `USED`, `CANCELLED`). |
| `/ventes/billets/[code]` | Détail du billet et liste des scans. |
| `/ventes/moyens-de-paiement` | Liste : compagnie, nom, type, opérateur, actif, transactions, réussies, échouées, taux de réussite. Filtre : compagnie. |
| `/ventes/en-ligne` | Tableau de bord du libre-service : réservations en ligne, payées, taux de conversion, paiements échoués, réservations expirées, paiements bloqués, et la liste des réservations non payées qui vont expirer. |

## Modèle de données (types alignés sur `booking-service`)

- `Booking` : `id`, `companyId`, `tripId`, `userId | null` (compte client, `null` au guichet), `passengerName`, `bookingCode` (`BK-` + 8 caractères), `seatNumber | null`, `status` (`confirmed`, `cancelled`), `paymentStatus` (`pending`, `paid`, `failed`), `channel` (`counter`, `online`), `amount`, `currency`, `ticketIssued`, `createdAt`, `cancelledAt | null`, `cancelReason | null` (`EXPIRED`, `CLIENT`, `PLATFORM`).
- `PaymentMethod` : `id`, `companyId`, `name`, `kind` (`MOBILE_MONEY`, `CARD`, `CASH`), `provider | null`, `active`.
- `Transaction` : `id`, `companyId`, `bookingId`, `paymentMethodId`, `reference` (`TX-` + 8), `amount`, `currency`, `status` (`PENDING`, `COMPLETED`, `FAILED`), `failureReason | null`, `createdAt`, `completedAt | null`.
- `Ticket` : `id`, `companyId`, `bookingId`, `tripId`, `ticketCode` (`TK-` + 8), `seatNumber | null`, `status` (`ISSUED`, `CHECKED_IN`, `USED`, `CANCELLED`), `issuedAt`, `scans: string[]` (dates ISO).

Un passager n'a **ni e-mail ni téléphone** dans le backoffice : seulement un nom (compte client pour une réservation en ligne, nom saisi au guichet sinon).

### Graine (`seedSales`)

Construite après la flotte et les comptes clients. Par compagnie active : Orange Money, Wave (inactif pour une compagnie sur quatre) et Espèces au guichet, plus une carte bancaire pour une compagnie sur cinq. Par trajet : au plus **6 réservations** prises dans les sièges `booked` ou `occupied` de son plan de sièges (un siège `occupied` = réservation payée avec transaction réussie et billet ; un siège `booked` = non payée : sans transaction, avec une transaction en attente, ou avec une transaction échouée, en rotation), plus une réservation **annulée** (siège libre) sur un trajet sur cinq, avec les trois causes en rotation. Canal : en ligne (compte client) deux fois sur trois, guichet sinon. Anomalies semées, en nombre exact : **2 paiements bloqués** (en attente depuis 3 h et 26 h), **1 montant différent**, **1 billet manquant**. Les paiements en attente non bloqués ont 2 à 9 minutes d'âge (la limite est de 30 minutes : ils le restent pendant toute une exécution E2E). Trois passagers de scénario, uniques et au guichet : « Rokhaya Thiaw » (annulable), « Samba Kébé » (paiement en cours), « Coumba Lô » (payée, billet émis).

## Règles métier

- **Annuler la réservation**, ordre des gardes : réservation existante (`"Réservation introuvable"`) → motif (`"Un motif est obligatoire"`) → pas déjà annulée (`"Cette réservation est déjà annulée"`) → pas payée (`"Une réservation payée ne peut pas être annulée"`) → aucune transaction `PENDING` (`"Un paiement est en cours sur cette réservation"`). Une transaction `FAILED` ne bloque pas. Effets : `status = "cancelled"`, `cancelledAt = now`, `cancelReason = "PLATFORM"`, le siège `booked` redevient `free` dans le plan de sièges et `Trip.availableSeats` augmente de 1, une entrée d'activité rattachée à la compagnie : `Réservation <code> annulée. Motif : <motif>`.
- **Incohérences** (calculées avec l'horloge injectée) : *paiement bloqué* = transaction `PENDING` créée il y a **plus de 30 minutes** (exactement 30 minutes n'est pas bloqué) ; *montant différent* = montant de la transaction différent de celui de la réservation ; *billet manquant* = transaction `COMPLETED` sans aucun billet pour la réservation.
- **Expiration en ligne** (affichage seulement) : une réservation en ligne confirmée, non payée et sans transaction `PENDING` expire **30 minutes** après sa création. `minutesLeft` = minutes restantes arrondies à l'entier supérieur ; `<= 0` s'affiche « Expiration imminente ».
- **Taux de conversion** = réservations en ligne payées / réservations en ligne (toutes), arrondi à l'entier, `—` sans réservation en ligne.
- Chronologie d'une réservation : création, lancement de chaque paiement, résultat de chaque paiement (réussi ou échoué avec son motif), émission de chaque billet, chaque scan, annulation (avec sa cause), du plus ancien au plus récent.

## Architecture

- `src/lib/repos/sales.ts` : `bookingsRepo`, `transactionsRepo`, `ticketsRepo`, `paymentMethodsRepo`, `onlineRepo`, `transactionAnomalies`, `cancelBlockReason`, projections (`BookingRow`, `TransactionRow`, `TicketRow`, `PaymentMethodRow`), détails serveur (`BookingDetail`, `TransactionDetail`, `TicketDetail`), mutation `bookingsRepo.cancel`. Le store gagne `paymentMethods`, `bookings`, `transactions`, `tickets`.
- Action `cancelBooking(bookingId, reason)` dans `src/app/(admin)/ventes/actions.ts` ; bouton `CancelBookingButton` (composant client, `ConfirmDialog` avec motif, scalaires uniquement).
- Pages dans `src/app/(admin)/ventes/…` ; composant serveur `src/components/sales/booking-tabs.tsx`.
- Libellés dans `src/lib/labels.ts`. Navigation : les 5 entrées passent à `implemented: true` ; préfixes de fil d'Ariane pour les trois fiches.

## Tests

- **Vitest** : graine (références, siège/état, transactions et billets, anomalies exactes, scénarios, aucune donnée personnelle), dépôts (filtres, projections avec `Object.keys`, chronologie, anomalies avec horloge injectée et frontière de 30 minutes, statistiques en ligne), règle d'annulation (une garde = un test, plus l'ordre des gardes et les effets), action (session d'abord, `ActionResult`, motif ≤ 500, aucune écriture sans session).
- **Playwright** : filtrer et ouvrir une réservation ; annuler « Rokhaya Thiaw » avec motif (bouton de confirmation désactivé sans motif) ; refus « Samba Kébé » (paiement en cours) et « Coumba Lô » (payée) ; incohérences de paiement ; billet utilisé et ses scans ; moyen de paiement inactif ; tableau de bord en ligne ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

Pas de remboursement ni de reprise d'un paiement bloqué (le backend n'en a pas : une transaction `PENDING` reste bloquée jusqu'à intervention en base) ; une réservation payée n'est pas annulable ; l'expiration des réservations en ligne est affichée mais jamais exécutée ; les moyens de paiement sont en lecture seule ; les scans de billets sont figés ; le passager n'a pas de fiche (seulement un nom, et un lien vers le compte pour les réservations en ligne) ; pas de versement aux compagnies.
