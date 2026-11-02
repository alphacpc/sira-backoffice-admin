# Backoffice Sira, lot 7 : communication

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 6), spec et plan des lots 1 à 6 (même socle, mêmes décisions). **Prérequis : les lots 4, 5 et 6 sont terminés et commités** : ce lot réutilise les réservations (lot 5), les colis, clients, comptes de fidélité et avis (lot 6) pour dériver ses données, et le composant `CompanyFilter` (lot 4).

## Décisions héritées des lots 1 à 6

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts ; mutations = Server Actions via `run()` / `runReveal()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Action sensible : confirmation et motif obligatoire, rogné, **500 caractères au plus**, tracée dans l'activité de la compagnie.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Lecture seule plus deux actions** : les campagnes appartiennent aux compagnies ; la plateforme observe et arbitre. Actions :
  1. **« Annuler la campagne »** (motif obligatoire), calquée sur `customer-service` : `DRAFT` ou `SCHEDULED` → `CANCELLED`, avec **cascade** sur les programmations `PENDING` de la campagne.
  2. **« Annuler la programmation »** (motif obligatoire) : `PENDING` → `CANCELLED`.
- **Le contenu d'une notification est une donnée personnelle** (il porte des codes de réservation et de colis adressés à une personne). Il est **masqué par défaut** : la fiche d'une notification ne l'affiche qu'après une action de révélation **journalisée**, sur le patron de `revealUserContact` (lot 3) et `revealParcelRecipientPhone` (lot 6). Les listes n'affichent jamais le contenu.
- Le texte d'un **message marketing** est rédigé par la compagnie et destiné à plusieurs clients : il n'est pas une donnée personnelle et s'affiche en clair.
- Hors périmètre : création ou modification de campagnes, segments, messages ou programmations ; approbation d'un message ; relance d'une notification échouée (le backend n'a ni reprise ni file de nouvelles tentatives) ; envoi par e-mail ou SMS marketing (le backend n'envoie que le canal `IN_APP`) ; consentements (lot de conformité) ; branchement aux API.

## Périmètre : 7 écrans

Les 5 entrées de la section « Communication » passent à `implemented: true`. Deux fiches ne sont pas dans le sitemap et sont ajoutées : `/communication/notifications/[id]` (le contenu masqué y vit) et `/communication/campagnes/[id]` (l'action d'annulation y vit).

| Écran | Contenu |
|---|---|
| `/communication/notifications` | Indicateurs (envoyées, échouées, en attente) et liste : code `NTF-…`, type, destinataire, compagnie, canal, statut, lue, créée le. Filtres : compagnie, canal, statut. |
| `/communication/notifications/[id]` | Métadonnées (type, canal, statut, tentatives, dates), destinataire (lien vers le compte), objet lié (réservation, colis, avis ou campagne), contenu masqué avec révélation journalisée. |
| `/communication/campagnes` | Liste : nom, compagnie, objectif, statut, période, budget, programmations. Filtres : compagnie, statut. |
| `/communication/campagnes/[id]` | Onglets **Résumé**, **Segments**, **Messages**, **Programmations**. Action « Annuler la campagne ». |
| `/communication/segments` | Liste : nom, compagnie, campagne, ciblage (lisible), taille estimée, **destinataires éligibles aujourd'hui** (calculés). Filtre : compagnie. |
| `/communication/messages` | Liste : campagne, compagnie, canal, objet, extrait du texte, statut. Filtres : compagnie, statut. |
| `/communication/programmations` | Liste : date prévue, campagne, message, segment, statut, destinataires, envoyée le. Action « Annuler la programmation » par ligne. Filtres : compagnie, statut. |

## Modèle de données (types alignés sur `notification-service`, `customer-service` et `sira_schema.dbml`)

- `AppNotification` (le nom `Notification` est pris par le DOM) : `id`, `companyId`, `entityType`, `entityId`, `notificationCode` (`NTF-` + 8), `notificationType`, `sentTo | null` (compte destinataire, `null` pour le SMS d'un destinataire de colis qui n'a pas de compte), `channel` (`EMAIL`, `SMS`, `IN_APP`, `PUSH`, `WHATSAPP`), `status` (`PENDING`, `SENT`, `FAILED`), `scheduledAt | null`, `sentAt | null`, `retryCount`, `read`, `messageContent` (jamais envoyé au client), `createdAt`. `IN_APP` est la valeur ajoutée par `notification-service` aux canaux du dbml.
- `MarketingCampaign` : `id`, `companyId`, `name`, `objective` (`ACQUISITION`, `RETENTION`, `PROMOTION`, `REACTIVATION`), `status` (`DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `CANCELLED`), `startDate`, `endDate`, `budget`, `currency`, `createdByUserId | null`, `createdAt`, `updatedAt | null`. **Divergence assumée avec le dbml** (déjà actée dans `customer-service`) : `created_by` pointe un compte utilisateur, pas un `Employee`.
- `MarketingSegment` : `id`, `companyId`, `campaignId | null` (un segment peut être réutilisé), `name`, `criteria: Record<string, string>`, `estimatedSize`, `createdAt`.
- `MarketingMessage` : `id`, `companyId`, `campaignId`, `channel`, `subject`, `content`, `status` (`DRAFT`, `APPROVED`, `SENT`), `createdAt`. `companyId` est dérivé de la campagne (colonne de commodité de la graine ; le dbml n'a pas ce champ).
- `MarketingSchedule` : `id`, `companyId`, `campaignId`, `messageId`, `segmentId`, `scheduledAt`, `sentAt | null`, `status` (`PENDING`, `SENT`, `FAILED`, `CANCELLED`), `recipientsCount`, `createdAt`.

### Graine

- **Marketing** : pour les 4 premières compagnies dotées d'un programme de fidélité actif (lot 6). Chacune a une campagne `SCHEDULED` (segment « palier VIP », message `IN_APP` approuvé, une programmation `SENT` il y a 3 jours et une `PENDING` dans 2 jours) et une campagne `CANCELLED` (programmation `CANCELLED`, segment réutilisable sans campagne) ; la première compagnie a en plus une campagne `SCHEDULED` « fin d'année » (segment « tous les clients », programmation `PENDING`) et une campagne `COMPLETED` « bilan » (valeur du dbml jamais produite par le backend actuel, semée pour couvrir le statut) ; les trois autres ont une campagne `DRAFT` (segment « palier gold » : valeur inconnue, ne cible personne ; message `EMAIL` en brouillon). Le nombre de destinataires d'une programmation `SENT` est celui des comptes de fidélité éligibles au moment de la graine.
- **Notifications** : dérivées des autres domaines, trois canaux (e-mail, SMS, dans l'application) par événement de réservation en ligne (confirmée, annulée par le client ou l'équipe ; une expiration n'envoie rien, comme dans le backend), un canal `IN_APP` pour un paiement confirmé, un SMS par ligne d'historique de colis (destinataire sans compte), une notification `IN_APP` par avis résolu et par destinataire d'une programmation envoyée. Quelques e-mails `FAILED` et SMS `PENDING` pour que les trois statuts existent.
- **Scénarios** (E2E, noms uniques) : « Offre de la Tabaski » (annulable, avec cascade), « Offre de fin d'année » (programmation annulable), « Bilan de rentrée » (campagne terminée : refus), « Campagne d'été annulée ».

## Règles métier

- **Annuler la campagne**, ordre des gardes : campagne existante (`"Campagne introuvable"`) → motif (`"Un motif est obligatoire"`) → pas déjà annulée (`"Cette campagne est déjà annulée"`) → ni en cours ni terminée (`"Une campagne en cours ou terminée ne peut pas être annulée"`). Effets : `status = "CANCELLED"`, `updatedAt = maintenant`, **toutes les programmations `PENDING` de la campagne passent à `CANCELLED`** (les `SENT` ne changent pas), une entrée d'activité : `Campagne « <nom> » annulée (<n> programmation(s) annulée(s)). Motif : <motif>`.
- **Annuler la programmation**, ordre des gardes : programmation existante (`"Programmation introuvable"`) → motif → statut `PENDING` (`"Cette programmation n'est plus en attente"`). Effets : `CANCELLED`, une entrée d'activité : `Programmation de la campagne « <nom> » annulée. Motif : <motif>`.
- **Révélation du contenu** : action `revealNotificationContent` ; la valeur ne quitte le serveur qu'après la ligne d'activité `Donnée personnelle révélée : contenu de la notification <code>`.
- **Ciblage d'un segment** (comme `MarketingScheduleDispatcher`) : seule la clé `membershipType` est évaluée, sans tenir compte de la casse, sur les comptes de fidélité **de la compagnie** ; une valeur inconnue ne cible personne ; des critères vides ciblent tous les comptes ; toute autre clé est affichée « non évalué » et ignorée. « Éligibles aujourd'hui » est recalculé à chaque lecture.

## Architecture

- `src/lib/repos/communication.ts` : `notificationsRepo` (`listRows`, `get`, `detail`, `stats`, `logReveal`), `campaignsRepo` (`listRows`, `detail`, `cancel`), `segmentsRepo`, `messagesRepo`, `schedulesRepo` (`listRows`, `cancel`), `describeCriteria`, `eligibleCount`, `campaignCancelBlockReason`. Le store gagne `notifications`, `marketingCampaigns`, `marketingSegments`, `marketingMessages`, `marketingSchedules`.
- Actions : `src/app/(admin)/communication/actions.ts` (`cancelCampaign`, `cancelSchedule`, `revealNotificationContent`).
- Pages dans `src/app/(admin)/communication/…` ; composants dans `src/components/communication/`.

## Tests

- **Vitest** : graines (références, cohérence des états, dérivation des notifications, cohérence des destinataires, aucune donnée personnelle), dépôts (filtres, projections avec `Object.keys`, ciblage, détails), règles (une garde = un test, ordre des gardes, cascade, révélation), actions (session d'abord, `ActionResult`, motif ≤ 500).
- **Playwright** : liste et filtres des notifications, contenu masqué puis révélé ; campagnes (liste, onglets) ; annulation de « Offre de la Tabaski » avec cascade ; refus sur « Bilan de rentrée » ; segments ; messages ; annulation de la programmation de « Offre de fin d'année » ; refus sur une programmation déjà envoyée ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

Pas de création ni d'édition de campagnes, segments, messages ou programmations (le backoffice ne remplace pas l'outil de la compagnie) ; une annulation n'est pas réversible ; aucune relance d'une notification échouée ; l'envoi réel de l'e-mail et du SMS marketing n'existe pas côté backend (canal `IN_APP` seul) ; l'expiration d'une réservation n'envoie aucune notification (comme le backend) ; le ciblage n'évalue que `membershipType` ; la taille estimée d'un segment est saisie par la compagnie et peut différer des éligibles réels.
