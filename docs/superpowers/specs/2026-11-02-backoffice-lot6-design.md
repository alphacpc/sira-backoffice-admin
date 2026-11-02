# Backoffice Sira, lot 6 : colis et clients

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 5c), spec et plan des lots 1 à 5 (même socle, mêmes décisions). **Prérequis : les lots 4 (flotte) et 5 (ventes) sont terminés et commités** : ce lot réutilise les stations, lignes et trajets du lot 4 (`routeLabel`, `fleetCompanies`, `parseCompanyFilter`, `CompanyFilter`) et les réservations du lot 5 (`Booking`, `hashCode` de `seed.ts`).

## Décisions héritées des lots 1 à 5

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts ; mutations = Server Actions via `run()` / `runReveal()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Action sensible : confirmation et motif obligatoire, rogné, **500 caractères au plus**, tracée dans l'activité de la compagnie.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Un numéro de téléphone n'apparaît **masqué** (`maskPhone`) ; sa révélation passe par une action journalisée (patron de `revealUserContact`, lot 3). Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Lecture seule plus deux actions** : colis et clients appartiennent aux compagnies ; la plateforme observe et arbitre. Actions :
  1. **« Déclarer le colis perdu »** (motif obligatoire), calquée sur la machine à états de `parcel-service` : seul un colis `IN_TRANSIT` ou `AT_HUB` peut passer à `LOST`.
  2. **« Ignorer l'avis »** (motif obligatoire) : modération d'un avis abusif, calquée sur `customer-service` (`PENDING` ou `REVIEWED` → `IGNORED`).
- **Révélation du téléphone du destinataire** d'un colis : action journalisée (donnée personnelle, pas d'e-mail ni d'adresse dans le backoffice).
- Hors périmètre : création ou modification de colis ; assignation d'une jambe ; documents de colis (`ParcelDocument`) ; réponse à un avis ; modification du palier, des points ou du programme de fidélité ; dépense de points ; création de parrainages ; marketing (lot de communication) ; branchement aux API.

## Périmètre : 7 écrans

Les 4 entrées de la section « Colis et clients » passent à `implemented: true`. Deux fiches ne sont pas dans le sitemap et sont ajoutées parce qu'une action ou un détail en dépend : `/clients/comptes/[id]` et `/clients/avis/[id]`.

| Écran | Contenu |
|---|---|
| `/colis` | Liste : code `PCL-…`, suivi `TRK-…`, compagnie, expéditeur, destinataire, ligne (origine → destination), type, poids, frais, statut, paiement, jambes, créé le. Filtres : compagnie, statut (7 valeurs). |
| `/colis/[id]` | Onglets **Résumé**, **Itinéraire** (jambes), **Historique**. Téléphone du destinataire masqué avec révélation journalisée. Action « Déclarer le colis perdu ». |
| `/clients/comptes` | Liste : nom, type (particulier ou entreprise), comptes de fidélité, points, réservations en ligne, colis envoyés, avis, parrainé, état du compte. |
| `/clients/comptes/[id]` | Onglets **Profil**, **Fidélité** (comptes par compagnie et mouvements de points), **Parrainage**, **Réservations**, **Avis**. Lien vers le compte utilisateur. |
| `/clients/fidelite` | Programmes de fidélité par compagnie : taux, valeur d'un point, seuil de conversion, état, comptes, points distribués. Filtre : compagnie. |
| `/clients/avis` | Liste : date, client, compagnie, type, note, titre, statut. Filtres : compagnie, statut. |
| `/clients/avis/[id]` | Avis complet (note, commentaire, références), réponse de la compagnie, action « Ignorer l'avis ». |

## Modèle de données (types alignés sur `parcel-service`, `customer-service` et `sira_schema.dbml`)

- `Parcel` : `id`, `companyId`, `parcelCode` (`PCL-` + 8), `trackingNumber` (`TRK-` + 8), `senderName`, `senderCustomerId | null`, `recipientName`, `recipientPhone` (jamais envoyé au client), `weightKg`, `parcelType` (`DOCUMENT`, `PACKAGE`, `FRAGILE`, `PERISHABLE`, `OTHER`), `description`, `tripId`, `originStationId`, `destinationStationId`, `pickupAt`, `expectedDeliveryAt`, `actualDeliveryAt | null`, `status` (`PENDING`, `IN_TRANSIT`, `AT_HUB`, `DELIVERED`, `CANCELLED`, `RETURNED`, `LOST`), `shippingFee`, `currency`, `paymentStatus` (`PENDING`, `PAID`, `REFUNDED`), `createdAt`. `AT_HUB` est une valeur ajoutée par `parcel-service` au statut du dbml.
- `ParcelLeg` : `id`, `parcelId`, `companyId`, `tripId`, `assignmentCode`, `sequence`. `ParcelHistoryEntry` : `id`, `parcelId`, `previousStatus | null`, `newStatus`, `notes | null`, `changedBy | null`, `changedAt`.
- `Customer` : `id`, `userId`, `name`, `isCorporate`, `sponsorshipId | null`, `sponsoredAt | null`, `createdAt`. **Divergence assumée avec le dbml** (déjà actée dans `customer-service`) : `loyalty_points` et `membership_type` ne sont plus sur le client mais sur le compte de fidélité par compagnie.
- `LoyaltyProgram` : `id`, `companyId`, `name`, `pointsPerCurrencyUnit`, `redemptionRate`, `minPointsForRedemption`, `status` (`ACTIVE`, `INACTIVE`), `createdAt`. `LoyaltyAccount` : `id`, `customerId`, `companyId`, `points`, `membershipType` (`REGULAR`, `VIP`, `PREMIUM`), `createdAt`. `LoyaltyTransaction` : `id`, `accountId`, `bookingId`, `points`, `createdAt`.
- `Sponsorship` : `id`, `companyId`, `sponsorCustomerId`, `code` (`SPN-` + 8), `rewardType` (`DISCOUNT`, `LOYALTY_POINTS`, `CASH`), `rewardValue`, `status` (`ACTIVE`, `REDEEMED`, `EXPIRED`), `createdAt`, `expiresAt`.
- `Feedback` : `id`, `companyId`, `customerId`, `tripId | null`, `parcelId | null`, `bookingId | null`, `rating` (1 à 5), `feedbackType` (`TRIP`, `BUS`, `STATION`, `SERVICE`, `PARCEL`), `title`, `comment`, `status` (`PENDING`, `REVIEWED`, `RESOLVED`, `IGNORED`), `response | null`, `respondedAt | null`, `createdAt`.

### Graine

- **Clients** : un `Customer` par compte client existant (4, dont le dernier « entreprise »). Programmes de fidélité pour les 8 premières compagnies actives (taux 0,01 point par unité de devise, un point vaut 5, seuil 1 000 points), dont **un inactif**. Les comptes de fidélité et les mouvements sont **dérivés des réservations du lot 5** : chaque réservation en ligne payée d'un client, dans une compagnie dotée d'un programme actif, crédite `floor(montant × taux)` points sur le compte (client, compagnie), créé à la première réservation. Trois parrainages : un actif, un utilisé par un autre client, un expiré.
- **Colis** : par trajet, 0 à 2 colis (2 ou 3 sur un trajet parti), statut cohérent avec celui du trajet (annulé → `CANCELLED`, planifié → `PENDING`, parti → les six autres statuts en rotation) et historique cohérent avec le statut final. Quelques colis livrés ont deux jambes (passage par un hub). Téléphones des destinataires au format `+2217713xxxxx`. Trois destinataires de scénario uniques : « Dior Kébé » (en transit, perdable), « Gorgui Sall » (en attente), « Yacine Ndoye » (livré).
- **Avis** : dérivés des réservations payées, des colis et des comptes des clients, statuts en rotation. Deux titres de scénario uniques : « Climatisation en panne pendant le trajet » (en attente, ignorable), « Service impeccable au guichet » (résolu).

## Règles métier

- **Déclarer le colis perdu**, ordre des gardes : colis existant (`"Colis introuvable"`) → motif (`"Un motif est obligatoire"`) → pas clos (`"Ce colis est déjà clos"`, pour `DELIVERED`, `CANCELLED`, `RETURNED`, `LOST`) → pas en attente (`"Un colis en attente ne peut pas être déclaré perdu"`). Effets : `status = "LOST"`, une ligne d'historique (`previousStatus` → `LOST`, `notes` = le motif, `changedBy` = l'acteur, `changedAt` = maintenant), une entrée d'activité rattachée à la compagnie : `Colis <code> déclaré perdu. Motif : <motif>`.
- **Ignorer l'avis**, ordre des gardes : avis existant (`"Avis introuvable"`) → motif (`"Un motif est obligatoire"`) → statut `PENDING` ou `REVIEWED` (`"Cet avis est déjà traité"` pour `RESOLVED` et `IGNORED`). Effets : `status = "IGNORED"`, une entrée d'activité : `Avis « <titre> » ignoré. Motif : <motif>`.
- **Révélation** : action `revealParcelRecipientPhone` ; la valeur ne quitte le serveur qu'après la ligne d'activité `Donnée personnelle révélée : téléphone du destinataire du colis <code>`.
- **Points de fidélité** = `floor(montant × pointsPerCurrencyUnit)` ; le palier (`membershipType`) n'est jamais recalculé (comme dans `customer-service`).

## Architecture

- `src/lib/repos/parcels.ts` (`parcelsRepo` : `listRows`, `get`, `detail`, `declareLost`, `logReveal` ; `lostBlockReason`) et `src/lib/repos/clients.ts` (`customersRepo`, `loyaltyRepo`, `feedbackRepo` : `listRows`, `detail`, `ignore`). Le store gagne `parcels`, `parcelLegs`, `parcelHistory`, `customers`, `loyaltyPrograms`, `loyaltyAccounts`, `loyaltyTransactions`, `sponsorships`, `feedbacks`.
- Actions : `src/app/(admin)/colis/actions.ts` (`declareParcelLost`, `revealParcelRecipientPhone`), `src/app/(admin)/clients/actions.ts` (`ignoreFeedback`).
- Pages dans `src/app/(admin)/colis/…` et `src/app/(admin)/clients/…` ; composants dans `src/components/parcels/` et `src/components/clients/`.

## Tests

- **Vitest** : graines (références, cohérence statut/historique/trajet, dérivation des points, parrainage, aucune donnée personnelle), dépôts (filtres, projections avec `Object.keys`, détails), règles (une garde = un test, ordre des gardes, effets), actions (session d'abord, `ActionResult`, motif ≤ 500, révélation journalisée).
- **Playwright** : filtrer et ouvrir un colis ; déclarer perdu « Dior Kébé » ; refus « Gorgui Sall » et « Yacine Ndoye » ; révélation du téléphone ; comptes clients et fiche ; programmes de fidélité ; ignorer l'avis ; refus sur l'avis résolu ; test `@prod` étendu (nouveau préfixe de téléphone `+2217713`).

## Limites connues (à reporter dans le README)

Pas de création ni de modification de colis (le backoffice ne remplace pas le guichet) ; la perte d'un colis n'est pas annulable ; pas de remboursement du colis perdu ; documents de colis non affichés ; les paliers de fidélité sont affichés tels quels, jamais recalculés ; pas de dépense de points ; les avis ignorés ne sont pas restaurables ; pas de réponse de la plateforme aux avis ; adresse du destinataire absente du backoffice.
