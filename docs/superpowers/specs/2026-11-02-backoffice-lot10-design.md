# Backoffice Sira, lot 10 : paramètres du backoffice

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (section 9), spec et plan des lots 1 à 9 (même socle, mêmes décisions). **Prérequis : les lots 4 à 9 sont terminés et commités** : ce lot réutilise `run` / `runValue` (`src/lib/actions/run.ts`), `addActivity`, `truncateIp`, `ConfirmDialog` avec motif, `StatusFilterNav`, `DataTable` et le journal d'activité alimenté par tous les lots.

## Décisions héritées des lots 1 à 9

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `searchParams` lu comme une `Promise`) qui lisent des dépôts ; mutations = Server Actions via `run()` / `runValue()` (session d'abord, résultat typé, jamais d'exception pour un échec attendu).
- **Aucune donnée personnelle ne traverse la frontière serveur → client** : composants clients = projections construites champ par champ (prouvé par `Object.keys`), `import type` seulement pour les types de dépôts ; adresses IP tronquées (`a.b.c.0`). Le test E2E `@prod` vérifie l'absence d'e-mails de contact, de téléphones et d'adresses IP complètes dans le HTML et le DOM de chaque nouvelle page.
- Actions sensibles = confirmation avec **motif obligatoire** (500 caractères au plus) quand elles touchent le compte d'**un autre** administrateur ; les actions sur son propre compte demandent une simple confirmation.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)` dans `beforeEach`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`, un test qui mute possède des entités qu'aucun autre ne mute.

## Choix de cadrage

- **Une équipe d'administrateurs du backoffice, modélisée à part.** Le backend n'a pas encore de rôle « administrateur plateforme » distinct ni de TOTP (prérequis 1 du sitemap) : la maquette porte donc sa propre collection `BackofficeAdmin`, sans lien avec les comptes `ADMIN` de `identity-service`. Chaque administrateur a un **identifiant de connexion** (`prenom.nom@sira.app`) : c'est un identifiant de service, pas une donnée de contact, et il figure déjà comme acteur dans tous les journaux.
- **Le compte connecté est reconnu par son identifiant** (la session porte `sub` = `admin@sira.app`). Les écrans « Mon profil » et les gardes « pas sur son propre compte » s'appuient dessus.
- **Sessions du backoffice** : une collection `BackofficeSession` propre à chaque administrateur (appareil, adresse tronquée, début, dernière activité, expiration à 8 h comme le cookie réel). La session « courante » est une session semée marquée `current` (le cookie réel ne porte pas d'identifiant de session) ; elle ne peut pas être révoquée depuis l'écran (on utilise la déconnexion).
- **Le TOTP reste obligatoire** : aucune action ne le désactive. On peut **réinitialiser** le TOTP d'un autre administrateur (il devra se ré-enrôler) et **régénérer ses propres codes de récupération**. Le mot de passe et le secret TOTP réels ne sont pas gérés ici (identifiants de démonstration fixes, voir le README) ; aucun secret, aucun code de récupération ne reste en mémoire : seul le **nombre** de codes restants est conservé, les codes ne sont affichés qu'une fois, à la régénération.
- **Le « journal du backoffice » est le journal d'activité** déjà alimenté par toutes les actions des lots 1 à 9, présenté à plat : date, acteur, action, compagnie. Filtres : acteur, période (7, 30 ou 90 jours, ou tout), et « révélations de données personnelles seulement ». Il ne contient que ce que les lots écrivent (libellés et identifiants, jamais de contact). Il est borné à **500 entrées** les plus récentes.
- Hors périmètre : authentification réelle (la suspension d'un administrateur ne l'empêche pas de se connecter avec les identifiants de démonstration), changement de mot de passe, enrôlement TOTP réel, annulation d'une invitation, suppression d'un administrateur, rôles ou permissions propres au backoffice, export du journal, journalisation des connexions et déconnexions, branchement aux API.

## Périmètre : 3 écrans

Les 3 entrées de la section « Paramètres » passent à `implemented: true`. Plus aucune route de la navigation n'est « bientôt disponible » sauf `/recherche` (lot 11).

| Écran | Contenu |
|---|---|
| `/parametres/profil` | Mon compte : nom affiché (modifiable), identifiant, rôle, état du TOTP (date d'enrôlement, codes de récupération restants), dernière connexion. Mes sessions (appareil, adresse tronquée, début, dernière activité, état, « Session courante »). Actions : « Modifier mon nom », « Régénérer mes codes de récupération » (affiche 8 codes une seule fois), « Révoquer » une autre session, « Révoquer toutes les autres sessions ». |
| `/parametres/equipe-admin` | Tableau des administrateurs : nom, identifiant, statut (actif, suspendu, invité), TOTP (activé / non enrôlé), sessions actives, dernière connexion, créé le. Filtre : statut. Actions : « Inviter un administrateur » ; par ligne (hors son propre compte) : « Suspendre » / « Réactiver », « Réinitialiser le TOTP », « Révoquer les sessions » (motif obligatoire). |
| `/parametres/journal-backoffice` | Indicateurs (entrées sur 7 jours, acteurs distincts, révélations de données sur 30 jours) et tableau du journal d'activité avec les trois filtres ci-dessus et la recherche plein texte du tableau. |

## Modèle de données

- `BackofficeAdmin` : `id`, `identifier` (`prenom.nom@sira.app`, unique), `displayName`, `status` (`active`, `suspended`, `invited`), `totpEnabled`, `totpEnrolledAt | null`, `recoveryCodesRemaining`, `lastLoginAt | null`, `createdAt`.
- `BackofficeSession` : `id`, `adminId`, `deviceLabel`, `ipAddress` (complète, ne quitte pas le serveur), `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt | null`, `revokedReason | null`, `current` (booléen).
- Le journal réutilise `ActivityEntry` (lot 1).

### Graine

Six administrateurs, deux types de sessions par rapport à `now` (une session est **active** si non révoquée et non expirée) :

| Identifiant | Nom | Statut | TOTP | Sessions | Rôle dans les tests |
|---|---|---|---|---|---|
| `admin@sira.app` | Administrateur Sira | actif | activé, 8 codes | 4 : courante (début −1 h), « Application Android » active, « Firefox · Ubuntu » active, une expirée | profil (lecture, nom, régénération, révocations) |
| `moustapha.ndiaye@sira.app` | Moustapha Ndiaye | actif | activé, 6 codes | 1 active | réinitialisation du TOTP |
| `ibrahima.sow@sira.app` | Ibrahima Sow | actif | activé, 8 codes | 1 active | suspension |
| `fatou.diallo@sira.app` | Fatou Diallo | actif | activé, 5 codes | 2 actives | révocation des sessions |
| `seynabou.kane@sira.app` | Seynabou Kane | suspendu | activé, 3 codes | 1 révoquée (motif « Compte suspendu ») | réactivation |
| `awa.fall@sira.app` | Awa Fall | invité | non enrôlé, 0 code | aucune | lecture seule |

Journal : en plus des entrées des lots 1 à 9 (toutes au nom de `admin@sira.app`), une dizaine d'entrées anciennes (de −40 à −2 jours) au nom des autres administrateurs actifs, avec des libellés génériques sans contact, dont deux « Donnée personnelle révélée : … ».

## Règles métier

- **Inviter** (`adminsRepo.invite`), ordre des gardes : identifiant non vide → format `^[a-z0-9._-]{3,40}@sira\.app$` après trim et mise en minuscules → nom non vide et 100 caractères au plus → identifiant inexistant. Effets : statut `invited`, TOTP non enrôlé, aucune session, entrée d'activité. Aucun e-mail n'est envoyé (maquette).
- **Suspendre** (`suspend`), ordre : administrateur existant → motif → pas son propre compte → statut `active` → pas le dernier administrateur actif. Effets : statut `suspended`, toutes ses sessions actives révoquées (« Compte suspendu »), activité avec le motif.
- **Réactiver** (`reactivate`), ordre : existant → motif → statut `suspended`. Effet : statut `active`, activité.
- **Réinitialiser le TOTP** (`resetTotp`), ordre : existant → motif → pas son propre compte → statut `active` → TOTP activé. Effets : `totpEnabled` faux, date d'enrôlement et codes remis à zéro, sessions actives révoquées (« TOTP réinitialisé »), activité.
- **Révoquer les sessions d'un autre administrateur** (`revokeSessions`), ordre : existant → motif → pas son propre compte → au moins une session active. Effets : sessions révoquées avec le motif, activité.
- **Mon profil** (`profileRepo`), le compte est celui de l'acteur (`"Compte introuvable"` sinon) : `updateDisplayName` (non vide, 100 caractères au plus) ; `revokeSession` (session à soi et existante `"Session introuvable"` → pas la courante `"Utilise la déconnexion pour fermer la session courante"` → encore active `"La session est déjà révoquée ou expirée"`) ; `revokeOthers` (au moins une autre session active `"Aucune autre session active"`, motif « Révoquée par le titulaire ») ; `regenerateRecoveryCodes` (TOTP activé `"Le TOTP n'est pas activé"`) : 8 nouveaux codes `XXXX-XXXX`, compteur remis à 8, **codes jamais journalisés ni stockés**.
- Toutes les écritures ajoutent une entrée d'activité (compagnie nulle) ; aucune n'écrit de code de récupération, d'adresse IP ni de contact.
- **Journal** : `journalRepo.list({ actor?, days?, revealsOnly? }, now)` trie du plus récent au plus ancien, ne garde que les 500 premières lignes ; « révélation » = action qui contient `révélée` ou `révélé`.

## Architecture

- `src/lib/repos/backoffice.ts` : `adminsRepo` (`listRows`, `get`, `invite`, `suspend`, `reactivate`, `resetTotp`, `revokeSessions`), `profileRepo` (`view`, `updateDisplayName`, `revokeSession`, `revokeOthers`, `regenerateRecoveryCodes`), `journalRepo` (`actors`, `stats`, `list`), constantes de filtre. Le store gagne `backofficeAdmins` et `backofficeSessions`.
- Actions : `src/app/(admin)/parametres/actions.ts`. Pages dans `src/app/(admin)/parametres/…` ; composants dans `src/components/settings/`.

## Tests

- **Vitest** : graine (6 administrateurs, sessions actives par administrateur, entrées de journal), dépôts (états de session, filtres du journal, plafond de 500, jamais d'IP complète dans une ligne), règles (une garde = un test, ordre des gardes, effets sur sessions et journal, aucun code de récupération dans le journal), actions (session d'abord, résultats typés).
- **Playwright** : profil (lecture, renommage, codes de récupération affichés une fois, révocation d'une session puis des autres, refus de la session courante impossible : pas de bouton) ; équipe (liste, filtre, invitation et refus d'un identifiant mal formé, suspension avec refus sans motif, réactivation, réinitialisation du TOTP, révocation des sessions) ; journal (filtres acteur / période / révélations) ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

L'équipe d'administrateurs est propre à la maquette (le backend n'a ni rôle ni TOTP dédiés) ; l'authentification reste celle de démonstration (suspendre, inviter ou réinitialiser n'a aucun effet sur la connexion réelle) ; pas de changement de mot de passe ni d'enrôlement TOTP réel ; la session courante est une session semée ; pas d'annulation d'invitation ni de suppression d'administrateur ; connexions et déconnexions non journalisées ; journal borné à 500 entrées, sans export ; un seul niveau de rôle d'administrateur.
