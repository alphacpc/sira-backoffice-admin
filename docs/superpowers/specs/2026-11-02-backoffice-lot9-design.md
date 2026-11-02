# Backoffice Sira, lot 9 : supervision

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 8), spec et plan des lots 1 à 8 (même socle, mêmes décisions). **Prérequis : les lots 4 à 8 sont terminés et commités** : ce lot dérive l'usage des réservations (lot 5), colis (lot 6) et avis (lot 6), réutilise `appendAudit` du dépôt de conformité (lot 8) et le composant `CompanyFilter` (lot 4).

## Décisions héritées des lots 1 à 8

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts ; mutations = Server Actions via `run()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu).
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Le trafic API est exposé **uniquement en agrégats** (jamais d'adresse IP, d'utilisateur ni de ligne brute), comme `GET /usage/api` du backend. Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Santé, trafic et usage sont en lecture seule** : `monitoring-service` est un observateur pur, il n'expose aucun moyen de relancer un sondage ni de modifier un agrégat.
- **Les incidents se gèrent depuis le backoffice**, qui est l'outil de l'équipe plateforme (`POST` / `PATCH /incidents` du backend sont réservés à `MONITORING_MANAGE` et à un appelant plateforme). Trois actions : **« Déclarer un incident »**, **« Changer le statut »** (workflow en avant seulement, sauts autorisés) et **« Renseigner le postmortem »** (adresse `http` ou `https`, modifiable même après résolution). Aucun motif obligatoire : ces actions n'effacent rien. Elles écrivent une entrée d'activité et une ligne du journal d'audit (service source `monitoring-service`), comme le fait le backend.
- **L'obsolescence se mesure contre le dernier sondage de la plateforme**, pas contre l'horloge de l'écran : les données étant statiques, une mesure contre l'heure réelle ferait passer tous les services à « obsolète » après 90 secondes de vie du serveur. Un service est obsolète quand son dernier contrôle précède de plus de 90 secondes le contrôle le plus récent de tous les services (comportement du champ `stale` du backend). La page affiche l'heure du dernier sondage.
- **L'usage produit est calculé à la lecture** à partir des données déjà présentes (réservations, paiements, billets, colis, avis) : aucune collection supplémentaire, donc toujours cohérent avec les écrans des lots 5 et 6. Le **trafic API** est semé (rien ne le produit ailleurs).
- Hors périmètre : relance d'un sondage ; ouverture automatique d'un incident depuis un service en panne ; modification de la gravité ou de la portée d'un incident existant ; historique des changements de statut (le backend ne garde que l'état courant) ; alertes ; limitation de débit ; export ; trafic par clé d'API ; branchement aux API.

## Périmètre : 6 écrans

Les 4 entrées de la section « Supervision » passent à `implemented: true`. `/supervision/incidents/[id]` s'ajoute au sitemap. Le tableau de bord (lot 1) lit désormais les vrais contrôles et incidents.

| Écran | Contenu |
|---|---|
| `/supervision/services` | Indicateurs (opérationnels, dégradés, en panne, obsolètes) et tableau : service, statut, temps de réponse, taux d'erreur (toujours « — » : le backend ne le calcule pas), disponibilité sur 24 h, dernier changement d'état, incidents ouverts, obsolète. Graphique des 48 derniers contrôles d'un service choisi (`?service=`). |
| `/supervision/incidents` | Liste : code `SYS-…`, titre, service, gravité, statut, portée, détecté le, résolu le. Filtres : statut, gravité. Bouton « Déclarer un incident ». |
| `/supervision/incidents/[id]` | Fiche : description, portée et compagnie touchée, dates, durée, postmortem. Actions « Changer le statut » et « Renseigner le postmortem ». |
| `/supervision/api` | Agrégats du trafic sur 7, 14 ou 30 jours : requêtes, latence moyenne et maximale, part d'erreurs 4xx et 5xx, graphique par jour, tableau par méthode et endpoint normalisé. Filtre : compagnie. |
| `/supervision/usage` | Événements produit sur 7, 14 ou 30 jours : total, utilisateurs distincts, graphique par jour et catégorie, tableau par événement (total, jours actifs, utilisateurs distincts). Filtre : compagnie. |

## Modèle de données (types alignés sur `monitoring-service`)

- `ServiceHealthCheck` : `id`, `serviceName`, `environment` (`production`), `status` (`healthy`, `degraded`, `down`), `responseTimeMs`, `errorRatePercent | null` (toujours `null`), `checkedAt`. Le type provisoire `ServiceHealth` du lot 1 (nom, statut, temps de réponse) reste comme **projection** du tableau de bord.
- `SystemIncident` : `id`, `incidentCode` (`SYS-` + 8), `serviceName`, `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status` (`INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`), `title`, `description | null`, `impactScope` (`SINGLE_COMPANY`, `MULTI_COMPANY`, `PLATFORM_WIDE`), `affectedCompanyId | null` (renseigné si et seulement si la portée est `SINGLE_COMPANY`), `detectedAt`, `resolvedAt | null` (renseigné si et seulement si résolu), `reportedBy` (libellé de l'identité du backoffice ; le backend stocke `reported_by_user_id`), `postmortemUrl | null`, `createdAt`, `updatedAt | null`. Le type provisoire `Incident` du lot 1 reste comme projection du tableau de bord.
- `ApiUsageRow` (agrégat quotidien, la forme que le backend renvoie) : `day` (jour UTC), `companyId | null`, `endpoint` (normalisé : `/bookings/{id}`), `method`, `statusClass` (`2xx`, `4xx`, `5xx`), `count`, `avgResponseMs`, `maxResponseMs`.

### Graine

- **Contrôles de santé** : 10 services sondés, 48 contrôles chacun (un toutes les 30 minutes, le dernier 20 secondes avant la graine), plus `gateway` (12 contrôles, tous vieux de 2 jours : le cas d'un service retiré d'Eureka, obsolète). `notification-service` en panne depuis ses 6 derniers contrôles, `parcel-service` dégradé depuis ses 4 derniers, `booking-service` avec un pic isolé (une transition aller-retour).
- **Incidents** : 8 incidents couvrant les 4 statuts, 4 gravités et 3 portées ; 3 ouverts (dont les deux du lot 1) ; deux avec postmortem. Scénarios E2E (titres uniques) : « Échecs de réservation sur une compagnie » (identifié), « Latence élevée sur les colis » (sous surveillance), « Échec de connexion intermittent » (résolu, sans postmortem), « Retard de synchronisation RH » (résolu).
- **Trafic API** : 30 jours × 14 endpoints normalisés × classes de statut × 4 compagnies, avec un trafic anonyme sur les endpoints publics et une dégradation (5xx et latence en hausse) sur les endpoints colis pendant les 2 derniers jours.

## Règles métier

- **Déclarer un incident** (`incidentsRepo.declare`), ordre des gardes : titre non vide et 200 caractères au plus → service non vide et 100 au plus → gravité valide → portée valide → compagnie (obligatoire et existante pour `SINGLE_COMPANY`, interdite sinon) → description de 10 000 caractères au plus. Effets : code `SYS-` + 8 caractères unique, statut `INVESTIGATING`, `detectedAt` = maintenant, `reportedBy` = l'acteur, entrée d'activité, ligne d'audit `CREATE SystemIncident`.
- **Changer le statut** (`incidentsRepo.advance`), ordre des gardes : incident existant (`"Incident introuvable"`) → statut cible valide (`"Statut invalide"`) → incident non résolu (`"Un incident résolu ne peut plus changer de statut"`) → statut différent (`"L'incident est déjà dans cet état"`) → pas de retour en arrière (`"Un incident ne peut pas revenir en arrière"`). L'ordre des statuts est `INVESTIGATING < IDENTIFIED < MONITORING < RESOLVED`, les sauts sont permis. Effets : statut, `updatedAt`, `resolvedAt` à la résolution, entrée d'activité, ligne d'audit `UPDATE` (`{status}` avant/après).
- **Renseigner le postmortem** (`incidentsRepo.setPostmortem`), ordre des gardes : incident existant → adresse non vide (`"L'adresse du postmortem est obligatoire"`) → 2 048 caractères au plus → commence par `http://` ou `https://` et sans espace. Autorisé à tout statut. Effets : adresse, `updatedAt`, entrée d'activité ; ligne d'audit seulement à la **première** saisie (`{postmortem}` `false` → `true`, jamais l'adresse), comme le backend.
- **Disponibilité 24 h** = part des contrôles `healthy` parmi ceux des 24 heures précédant le dernier sondage, arrondie au dixième ; **dernier changement d'état** = date du contrôle le plus récent dont le statut diffère du précédent.
- **Usage** : événements dérivés — `booking_created`, `payment_completed`, `ticket_issued` (catégorie `booking`), `parcel_created`, `parcel_status_changed` (`parcel`), `feedback_responded` (`customer`) ; jour UTC ; utilisateurs distincts = comptes non nuls (un colis ne porte pas d'utilisateur). Fenêtre = les N derniers jours UTC, aujourd'hui compris.

## Architecture

- `src/lib/repos/monitoring.ts` : `servicesRepo`, `incidentsRepo`, `apiRepo`, `analyticsRepo`, `incidentTransitionBlock`, projections et constantes. Le store perd `services` et `incidents`, gagne `serviceChecks`, `systemIncidents`, `apiUsage`.
- `src/lib/repos/compliance.ts` (lot 8) : `appendAudit` est exporté.
- Actions : `src/app/(admin)/supervision/actions.ts` (`declareIncident`, `advanceIncident`, `setIncidentPostmortem`).
- Pages dans `src/app/(admin)/supervision/…` ; composants dans `src/components/monitoring/`.

## Tests

- **Vitest** : graines (cohérence des contrôles, scénarios, incidents, agrégats API), dépôts (obsolescence, disponibilité, dernier changement, filtres, agrégats pondérés, usage dérivé), règles (une garde = un test, ordre des gardes, effets sur l'activité et l'audit), actions (session d'abord, `ActionResult`), tableau de bord migré.
- **Playwright** : services (indicateurs, panne, service obsolète, graphique) ; incidents (liste, filtres, fiche) ; déclaration d'un incident et refus (portée sans compagnie) ; changement de statut (refus en arrière puis succès) ; résolution ; postmortem (refus puis succès) ; trafic API ; usage ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

Les contrôles sont un échantillon toutes les 30 minutes (le backend sonde toutes les 30 secondes) ; le taux d'erreur de service n'est jamais calculé ; aucun moyen de relancer un sondage ; un service en panne n'ouvre pas d'incident automatiquement ; un incident ne garde pas l'historique de ses statuts ; la gravité et la portée ne sont pas modifiables après déclaration ; le trafic est semé sur 30 jours (le backend en garde 90) et l'usage est dérivé des données présentes ; aucune limitation de débit ; l'auteur d'un incident est un libellé, pas un compte de la plateforme.
