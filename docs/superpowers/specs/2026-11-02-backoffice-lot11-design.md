# Backoffice Sira, lot 11 : recherche globale

Date : 2026-11-02. Statut : rédigé pour relecture. Référence : `docs/sitemap.md` (« Vue 360 / Recherche globale » et « Transverse : palette de commandes »), spec et plan des lots 1 à 10. **Prérequis : les lots 4 à 10 sont terminés et commités** : la recherche couvre les données de tous les lots (incidents du lot 9, notifications et campagnes du lot 7, etc.). Dernier lot de la maquette : après lui, plus aucune entrée de navigation n'est « bientôt disponible ».

## Décisions héritées des lots 1 à 10

- Style C (clair et sombre), français uniquement, données **statiques typées** en mémoire, aucune connexion au backend.
- Pages = Server Components (`export const dynamic = "force-dynamic"`, `searchParams` lu comme une `Promise`). Une Server Action passe par `run()` / `runValue()` (session d'abord, résultat typé, jamais d'exception pour un échec attendu).
- **Aucune donnée personnelle ne traverse la frontière serveur → client ni n'apparaît dans une URL** : un résultat est une projection construite champ par champ (libellé, sous-libellé, lien), sans e-mail, téléphone ni adresse IP. Le test E2E `@prod` vérifie le HTML et le DOM des nouvelles pages.
- Toute garde nouvelle est prouvée par un test qui échoue quand on la retire. Tests de dépôt : `resetStore(NOW)`. E2E : chaque test se connecte lui-même, aucun `waitForTimeout`.

## Choix de cadrage

- **Une recherche, deux portes d'entrée** : la page `/recherche` (résultats complets, groupés par type, liens de partage) et la **palette de commandes ⌘K** déjà présente (lot 1), qui gagne des résultats d'enregistrements en plus des pages et compagnies. Les deux utilisent le même dépôt `searchRepo`.
- **On cherche un nom, un code ou un identifiant, jamais un contact.** Les requêtes qui ressemblent à une adresse e-mail (contiennent `@`) ou à un numéro de téléphone (uniquement chiffres, espaces, `+ ( ) . -`, au moins 7 chiffres) sont **refusées** avec un message, avant toute recherche. Raison : la requête voyage dans l'URL (`?q=`), et le backoffice ne met aucune donnée de contact dans une URL. Aucun champ e-mail ou téléphone n'est d'ailleurs interrogé. Une requête de type contact ou trop longue n'est jamais renvoyée dans la page.
- **Champs interrogés** (nom d'affichage ou code seulement) :

| Type | Champs | Lien | Sous-libellé |
|---|---|---|---|
| Compagnie | nom, slug, numéro d'immatriculation, NINEA | `/compagnies/{id}` | libellé du statut |
| Compte plateforme | identifiant, nom affiché | `/utilisateurs/{id}` | identifiant · nom du rôle |
| Compte client | nom | `/clients/comptes/{id}` | « Compte client » |
| Réservation | code `BK-…` (jamais le nom du passager) | `/ventes/reservations/{id}` | compagnie |
| Billet | code `TK-…` | `/ventes/billets/{code}` | compagnie |
| Colis | code `PCL-…`, numéro de suivi `TRK-…` (jamais l'expéditeur ni le destinataire) | `/colis/{id}` | compagnie |
| Facture | numéro | `/facturation/factures/{id}` | compagnie |
| Bus | code, plaque | `/flotte/bus/{id}` | compagnie |
| Incident | code `SYS-…`, titre | `/supervision/incidents/{id}` | service |
| Campagne | nom | `/communication/campagnes/{id}` | compagnie |
| Notification | code `NTF-…` (jamais le contenu) | `/communication/notifications/{id}` | compagnie |

- **Correspondance** : insensible à la casse et aux accents (`aissatou` trouve « Aïssatou »), espaces multiples réduits, sous-chaîne. Rang : égalité exacte, début du texte, début de mot (après espace, `-`, `_`, `.`, `/`), autre position. Le meilleur rang parmi les champs d'un enregistrement est retenu ; tri par rang, puis libellé (ordre français), puis identifiant.
- **Limites** : 2 caractères minimum, 100 au plus. La page montre au plus 25 résultats par type, avec le total par type ; la palette en montre 4 par type.
- Hors périmètre : recherche par contact, recherche floue ou par faute de frappe, recherche plein texte dans les messages, les journaux ou les motifs, filtres sauvegardés, historique des recherches, suggestions, surlignage, branchement aux API.

## Périmètre : 1 écran et la palette

| Écran | Contenu |
|---|---|
| `/recherche` | Champ de recherche (formulaire GET, sans JavaScript), filtre par type (pastilles avec compteurs), résultats groupés par type : libellé en lien, sous-libellé, total du type et « N autres résultats affinez la recherche » si le total dépasse 25. Message d'aide sans requête ; message de refus pour une requête trop courte, trop longue ou de type contact ; « Aucun résultat » sinon. |
| Palette ⌘K | Sections existantes (Pages, Compagnies) filtrées localement, plus une section « Enregistrements » alimentée par une Server Action (`searchEverywhere`) après 250 ms de pause, et une ligne « Voir tous les résultats pour « … » » qui ouvre `/recherche?q=…`. |

L'entrée « Recherche globale » de la navigation passe à `implemented: true` ; plus aucune entrée n'est « bientôt disponible ». La page fourre-tout `[...slug]` reste (elle renvoie `404` pour un chemin inconnu).

## Règles

- Une requête de type contact est **redirigée** vers `/recherche?refus=contact` (la valeur saisie disparaît de l'URL et n'est jamais réaffichée).
- `queryProblem(raw)` renvoie `null` ou un message, dans cet ordre : trop court (`"Saisis au moins 2 caractères"`, après trim) → trop long (`"La recherche est trop longue (100 caractères maximum)"`) → ressemble à un contact (`"La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant."`).
- `searchRepo.search(raw, { types?, limitPerType }, now?)` renvoie `{ problem, groups }` ; avec un problème, `groups` est vide et aucune donnée n'est lue. `types` absent = tous. Les groupes vides sont omis, dans l'ordre du tableau ci-dessus.
- La Server Action `searchEverywhere(query)` : session d'abord ; renvoie les résultats de tous les types **sauf les compagnies** (la palette les a déjà), 4 par type ; un problème de requête renvoie une liste vide (pas une erreur).

## Architecture

- `src/lib/search-query.ts` (pur, utilisable côté client) : `normalizeText`, `matchRank`, `queryProblem`, constantes de limites.
- `src/lib/repos/search.ts` : `SEARCH_TYPES`, `SEARCH_TYPE_LABELS`, `searchRepo.search`, types `SearchHit`, `SearchGroup`, `SearchResult`.
- `src/app/(admin)/recherche/{page.tsx,actions.ts}` ; `src/lib/palette.ts` (filtrage local des pages et compagnies) ; `src/components/shell/command-palette.tsx` modifié.

## Tests

- **Vitest** : normalisation et rang (accents, casse, positions, exactitude), refus des contacts (e-mails, téléphones, codes qui contiennent des chiffres acceptés), dépôt (chaque type : champ interrogé, lien, sous-libellé ; jamais un nom de passager, de destinataire ni un contenu ; tri ; limite ; compteur de total ; types filtrés ; problème), action (session d'abord, compagnies exclues, requête refusée = liste vide), palette (filtrage local).
- **Playwright** : recherche par code de réservation et ouverture du résultat ; recherche insensible aux accents ; refus d'une requête de type e-mail (message affiché, requête non renvoyée) ; filtre par type ; palette (résultat d'enregistrement, ligne « Voir tous les résultats ») ; chemin inconnu = `404` ; test `@prod` étendu.

## Limites connues (à reporter dans le README)

Pas de recherche par e-mail ni téléphone (volontaire : la requête passe par l'URL) ; pas de recherche dans les noms de passagers, expéditeurs, destinataires ni dans le contenu des messages ; sous-chaîne simple, sans tolérance aux fautes ; 25 résultats par type au plus ; pas d'historique ni de filtres sauvegardés ; la palette interroge le serveur à chaque pause de saisie (pas de cache) ; la recherche porte sur les données semées de la maquette.
