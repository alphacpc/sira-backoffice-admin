# Backoffice Sira, lot 8 : conformité et audit

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 7), spec et plan des lots 1 à 7 (même socle, mêmes décisions). **Prérequis : les lots 4 à 7 sont terminés et commités** : ce lot dérive ses journaux des compagnies, utilisateurs, sessions (lot 3), réservations (lot 5), colis (lot 6) et utilise le composant `CompanyFilter` (lot 4).

## Décisions héritées des lots 1 à 7

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `params` et `searchParams` lus comme des `Promise`) qui lisent des dépôts ; mutations = Server Actions via `run()` de `src/lib/actions/run.ts` (session d'abord, `ActionResult`, jamais d'exception pour un échec attendu). Action sensible : confirmation et motif obligatoire, rogné, **500 caractères au plus**, tracée dans l'activité du backoffice.
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts. Les adresses IP sont **tronquées** (`truncateIp`, `a.b.c.0`) avant de quitter le serveur. Le test E2E `@prod` vérifie l'absence d'e-mails, de téléphones et d'adresses IP complètes dans le HTML de chaque nouvelle page.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Les journaux sont immuables** : le journal d'audit, le journal d'accès aux données et l'historique des consentements sont en **lecture seule**, comme dans `audit-compliance-service` (ajout seul en code et par trigger). Aucune action ne les modifie ; les seules actions du backoffice **ajoutent** des lignes (voir plus bas).
- **Trois actions** :
  1. **Traiter une demande de personne concernée** : « Prendre en charge » (sans motif), « Clôturer » et « Rejeter » (notes de résolution obligatoires), selon le workflow strict de `audit-compliance-service`.
  2. **Modifier la durée de rétention d'une compagnie** (motif obligatoire, 90 à 3 650 jours) : raccourcir la durée **déclenche une anonymisation irréversible** à la prochaine exécution du job quotidien ; l'écran l'affiche.
  3. **Consulter les consentements d'un utilisateur** avec un **motif d'accès déclaré** parmi quatre valeurs : la consultation écrit une ligne dans le journal d'accès aux données.
- Ces actions écrivent aussi, comme le fait le backend, une ligne dans le **journal d'audit** (traitement d'une demande, changement de rétention) et dans le **journal d'accès** (traitement d'une demande, consultation de consentements). L'identité du backoffice n'étant pas un compte utilisateur de la plateforme, ces lignes portent un **libellé d'acteur** (`actorLabel`, `accessedByLabel`) à la place d'un identifiant de compte : divergence assumée avec le dbml.
- Hors périmètre : création de demandes, de consentements ou de lignes de journal à la main ; export CSV des journaux ; rectification d'une ligne ; purge ou anonymisation manuelle (le job est quotidien et n'est pas simulé) ; alertes d'échéance automatiques ; journalisation des révélations de données personnelles des lots 3, 6 et 7 dans le journal d'accès (elles restent dans l'activité du backoffice) ; branchement aux API.

## Périmètre : 8 écrans

Les 5 entrées de la section « Conformité et audit » passent à `implemented: true`. Trois fiches s'ajoutent au sitemap : `/conformite/journal-audit/[id]` (avant/après), `/conformite/demandes-rgpd/[id]` (traitement) et l'écran des consentements contient une consultation. La page d'accueil (lot 1) lit désormais les vraies demandes.

| Écran | Contenu |
|---|---|
| `/conformite/journal-audit` | Liste en lecture seule : date, compagnie (ou « Plateforme »), acteur, type d'acteur, action, entité, service source, adresse IP tronquée. Filtres : compagnie, action. |
| `/conformite/journal-audit/[id]` | Métadonnées (origine, agent utilisateur, horloge du producteur vs réception) et tableau **avant / après** champ par champ, changements surlignés. |
| `/conformite/acces-donnees` | Liste en lecture seule : date, consulté par, personne concernée (type et nom), catégorie, motif, type d'accès, IP tronquée. Filtres : type d'accès, catégorie. |
| `/conformite/demandes-rgpd` | Indicateurs (ouvertes, en retard, à échéance sous 7 jours, closes) et liste : demandeur, type, compagnie, statut, échéance et jours restants, traité par. Filtres : statut, type, « en retard ». |
| `/conformite/demandes-rgpd/[id]` | Demande complète (motif du demandeur, notes de résolution), compte à rebours du délai légal de 30 jours, actions « Prendre en charge », « Clôturer », « Rejeter ». |
| `/conformite/consentements` | Compteurs des **états courants** par type de consentement et par compagnie (accordés, retirés) ; **consultation** d'un utilisateur : choix d'un utilisateur et du motif d'accès, puis historique complet de ses consentements. |
| `/conformite/retention` | Une ligne par compagnie : durée effective (personnalisée ou 730 jours par défaut), lignes de journal plus anciennes que cette durée, **dont encore non anonymisées**. Action « Modifier la durée ». |

## Modèle de données (types alignés sur `audit-compliance-service` et `sira_schema.dbml`)

- `AuditLog` : `id`, `companyId | null`, `actorUserId | null`, `actorLabel | null` (backoffice), `actorType` (`USER`, `EMPLOYEE`, `SYSTEM`, `API_KEY`), `action` (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGIN_FAILED`, `EXPORT`, `PERMISSION_CHANGE`), `entityType`, `entityId`, `beforeState | null`, `afterState | null` (paires clé → texte, jamais de texte libre), `ipAddress | null`, `userAgent | null` (nuls une fois anonymisés), `sourceService | null`, `occurredAt | null`, `createdAt`.
- `DataAccessLog` : `id`, `accessedByUserId | null`, `accessedByLabel | null` (backoffice), `dataSubjectType` (`CUSTOMER`, `EMPLOYEE`, `USER`), `dataSubjectId`, `dataCategory` (`IDENTITY`, `FINANCIAL`, `LOCATION`, `HEALTH`, `CONTACT`, `CONSENT`), `accessReason` (`SUPPORT_REQUEST`, `LEGAL_OBLIGATION`, `SERVICE_DELIVERY`, `INVESTIGATION`), `accessType` (`VIEW`, `EXPORT`, `MODIFY`, `DELETE`), `ipAddress | null`, `createdAt`.
- `ConsentRecord` (**ajout seul**) : `id`, `userId`, `consentType` (`MARKETING_EMAIL`, `MARKETING_SMS`, `DATA_SHARING_PARTNERS`, `COOKIES_ANALYTICS`, `GEOLOCATION`), `companyId | null` (obligatoire pour les deux types marketing, interdit sinon), `status` (`GRANTED`, `WITHDRAWN`), `consentVersion`, `source` (`SIGNUP`, `SETTINGS_PAGE`, `BOOKING_FLOW`), `grantedAt | null` (renseigné seulement sur un octroi), `withdrawnAt | null` (seulement sur un retrait), `createdAt`. L'état courant d'un triplet (utilisateur, type, compagnie) est sa ligne la plus récente.
- `DataSubjectRequest` : `id`, `requesterUserId`, `companyId | null`, `requestType` (`ACCESS`, `RECTIFICATION`, `ERASURE`, `PORTABILITY`, `RESTRICTION`, `OBJECTION`), `status` (`RECEIVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`), `reason`, `handledBy | null` (libellé de l'acteur du backoffice ; le dbml pointe un `Employee`, `audit-compliance-service` un compte utilisateur), `dueDate` (création + 30 jours), `resolvedAt | null`, `resolutionNotes | null`, `createdAt`. Ce type **remplace** le `DsrRequest` provisoire du lot 1.

### Graine

- **Demandes** : 10 demandes (clients et deux employés) couvrant les 4 statuts et les 6 types, dont une **en retard**. Cinq demandes de scénario aux couples (demandeur, type) uniques pour les tests E2E.
- **Consentements** : historique de chaque client (cookies, géolocalisation accordée puis retirée, marketing par compagnie dont un retrait, SMS, partage), une ligne marketing **sans compagnie** antérieure à la portée par compagnie (n'autorise rien), trois employés avec un consentement cookies.
- **Journal d'audit** : dérivé des compagnies (création, activation), des sessions (connexions, plus un échec par compte suspendu), des réservations, de l'historique des colis, plus trois lignes d'historique d'abonnement par compagnie active (qui servent la démonstration de la rétention). Les lignes plus anciennes que la durée de rétention de leur compagnie sont **déjà anonymisées** (IP et agent utilisateur effacés), comme après le passage du job.
- **Journal d'accès** : une consultation par demande ouverte ou close, une modification par demande close, et trois consultations de consentements avec leur motif.

## Règles métier

- **Workflow d'une demande** (`dsrRepo.transition`) : `RECEIVED → IN_PROGRESS`, `IN_PROGRESS → COMPLETED` ou `REJECTED` ; toute autre transition est refusée. Ordre des gardes : demande existante (`"Demande introuvable"`) → notes obligatoires pour une clôture ou un rejet (`"Des notes de résolution sont obligatoires"` ; **plus strict que le backend**, qui ne les exige que pour un rejet) → transition permise : demande close (`"Cette demande est déjà close"`), déjà prise en charge (`"Cette demande est déjà prise en charge"`), clôture ou rejet d'une demande reçue (`"Une demande reçue doit d'abord être prise en charge"`). Effets : statut, `handledBy` = l'acteur, pour une clôture ou un rejet `resolvedAt` = maintenant et `resolutionNotes` ; une ligne de journal d'audit `UPDATE DataSubjectRequest` (`{status}` avant/après, source `audit-compliance-service`), une ligne de journal d'accès `MODIFY` `IDENTITY` `LEGAL_OBLIGATION`, une entrée d'activité.
- **Délai légal** : `dueDate` = création + 30 jours. Jours restants = `ceil((échéance − maintenant) / jour)` ; **en retard** si la demande est ouverte et que l'échéance est passée ; une demande close n'a plus de délai.
- **Durée de rétention** (`retentionRepo.set`), ordre des gardes : compagnie existante (`"Compagnie introuvable"`) → motif (`"Un motif est obligatoire"`) → entier entre 90 et 3 650 (`"La durée doit être un nombre entier de jours compris entre 90 et 3650"`) → différente de la durée effective (`"La durée de rétention est déjà de <n> jours"`). Effets : `Company.dataRetentionDays`, une ligne de journal d'audit `UPDATE Company` (`{dataRetentionDays}` avant/après, source `company-service`), une entrée d'activité. On ne peut pas revenir au défaut (`null`) : le backend non plus.
- **Anonymisation** (affichage) : durée effective = durée de la compagnie ou 730 jours ; « plus anciennes » = lignes de journal de la compagnie plus vieilles que cette durée ; « non anonymisées » = parmi elles, celles dont l'adresse IP est encore présente. Aucune exécution du job n'est simulée.
- **Consultation de consentements** (`consentsRepo.consult`), ordre des gardes : motif d'accès valide (`"Motif d'accès invalide"`) → utilisateur existant (`"Utilisateur introuvable"`). Effets : une ligne de journal d'accès `VIEW` `CONSENT` avec le motif et le type de personne concernée (client → `CUSTOMER`, employé → `EMPLOYEE`, sinon `USER`) ; l'historique est renvoyé sans adresse IP. Un appel refusé n'écrit rien.

## Architecture

- `src/lib/repos/compliance.ts` : `auditRepo`, `accessRepo`, `dsrRepo`, `consentsRepo`, `retentionRepo`, `dsrTransitionBlock`, `dsrDaysLeft`, `effectiveRetentionDays`. Le store gagne `auditLogs`, `dataAccessLogs`, `consentRecords`, `dataSubjectRequests` ; `dsr` et `DsrRequest` disparaissent, le tableau de bord (`dashboardRepo`, `src/app/(admin)/page.tsx`) lit `dataSubjectRequests`.
- `src/lib/actions/run.ts` gagne `runValue<T>` (comme `runReveal`, pour une valeur structurée).
- Actions : `src/app/(admin)/conformite/actions.ts` (`startDataSubjectRequest`, `completeDataSubjectRequest`, `rejectDataSubjectRequest`, `setCompanyRetention`, `consultUserConsents`).
- Pages dans `src/app/(admin)/conformite/…` ; composants dans `src/components/compliance/`.

## Tests

- **Vitest** : graines (références, états, anonymisation, cohérence des demandes, ajout seul des consentements, aucune donnée personnelle), dépôts (filtres, projections avec `Object.keys`, diff avant/après, compteurs, délai légal, état courant), règles (une garde = un test, ordre des gardes, effets sur les trois journaux), actions (session d'abord, `ActionResult`, motif ≤ 500, consultation sans écriture en cas de refus), tableau de bord migré.
- **Playwright** : journal d'audit (filtre, fiche avant/après) ; accès aux données ; demandes (indicateurs, prise en charge, clôture, rejet, refus d'une transition illégale, demande close sans bouton) ; consentements (compteurs, consultation avec motif, ligne ajoutée au journal d'accès) ; rétention (valeur invalide refusée, durée raccourcie, compteur de lignes à anonymiser) ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

Journaux en lecture seule, sans export ; les lectures du backoffice (pages) n'écrivent pas dans le journal d'accès (seules les actions le font), alors que `GET /data-subject-requests` en écrit côté backend ; les révélations de données personnelles des lots 3, 6 et 7 sont dans l'activité du backoffice, pas dans le journal d'accès ; le job d'anonymisation n'est pas simulé ; on ne peut pas revenir à la durée par défaut ; les notes de clôture sont obligatoires (plus strict que le backend) ; aucune alerte de retard n'est émise ; l'acteur des lignes écrites par le backoffice est un libellé, pas un compte de la plateforme ; la consultation de consentements est limitée aux utilisateurs qui en ont.
