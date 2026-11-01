# Site vitrine Sira

Site statique de présentation de la plateforme Sira, destiné aux compagnies de transport
interurbain. Il ne fait aucun appel réseau vers un service Sira. Le client SaaS est l'application
`web/` du dépôt principal.

Design : `docs/superpowers/specs/2026-11-01-website-redesign-v2-design.md` (dépôt `sira`).

## Démarrer

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm check      # règles de contenu, redirections ; --links pour les liens internes
```

## Identité

- Couleurs : bleu marine (`navy`, `navy-dark`, `navy-deep`), ambre (`amber`, `amber-dark`,
  `amber-soft`, `amber-ink`), papier clair (`paper`, `mist`). Tokens dans `app/globals.css`.
- Typographie : Gellix uniquement (sans-serif). Aucun serif : `pnpm check` échoue sur
  `Fraunces` / `font-serif`.
- Les anciens tokens `cream`, `sand`, `forest` sont supprimés ; `pnpm check` échoue s'ils reviennent.

## Le fil de route

L'accueil est un trajet : une ligne (`components/route/RouteThread.tsx`) relie des « arrêts »
(`components/route/Stop.tsx`), chacun étiqueté par un code de gare et présentant un chapitre
du produit (billetterie, flotte, colis, supervision…). `ChapterFull.tsx` porte les chapitres
pleine largeur. Les écrans de produit sont de petits composants fictifs dans
`components/screens`, légendés « Maquette — données fictives ».

## Images

- `public/images/` : visuels sources.
- `public/images/clean/` : recadrages des captures d'application (`billet.png`,
  `gestionnaire-ecran.png`, `gestionnaire-laptop.png`, `voyageuse.jpg`). Les captures
  d'origine portent une marge crème autour du téléphone et un logo incrusté ; les recadrer à
  part évite de les rogner à l'affichage et de laisser apparaître ces défauts.
- Plusieurs fichiers de `public/images/` ne sont plus référencés (voir le rapport de la Task 7) ;
  ils sont conservés.

## Pages (9)

`/` · `/solution` · `/pour-qui` · `/securite` · `/tarifs` · `/demo` · `/mentions-legales` ·
`/confidentialite` · `/cgu`. Les 11 anciennes adresses redirigent en 308 (voir `next.config.ts`).

## Règles de contenu

- Aucun chiffre, client, témoignage ni prix inventé : les tarifs sont « Sur devis ».
- Le site présente l'ensemble des fonctions comme disponibles ; aucun chiffre, client ni témoignage inventé ; les moyens de paiement présentés sont Wave, Orange Money et la carte bancaire.
- `pnpm check` échoue si une affirmation interdite apparaît (voir `scripts/check-site.mjs`).

## Mouvement

Une seule couche de mouvement, posée sur la mise en page sans la modifier (`components/motion.tsx`) :
`Enter` (entrée générale), `Reveal`, `Stagger`/`StaggerItem` (cascades), `AnimatedTitle` (mots qui
montent, via `Title2 animate=…`), `HeroBlock` (en-têtes de page), `Drift`/`ScrollZoom` (parallaxe
liée au défilement), plus `PhotoCard`, `Coupon`, `RouteLine`, `Stop`/`StopText`. `app/template.tsx`
fait fondre le contenu à chaque navigation (jamais l'en-tête ni le pied de page).

- Courbe `[0.21, 0.47, 0.32, 0.98]`, 0,5 à 0,9 s, retards de 60 à 90 ms ; seuls `transform`, `opacity`
  et `clip-path` bougent. Aucune boucle infinie hors parcours du voyageur (qui a un bouton de pause).
- `prefers-reduced-motion` : aucun mouvement, état final immédiat ; `[data-motion]` est forcé visible
  en CSS (et dans `<noscript>`), donc un état initial caché venu du serveur ne reste jamais.
- Un nouveau composant animé doit utiliser `useReduce()` (pas `useReducedMotion()` : le premier rendu
  doit être identique au rendu serveur) et marquer ses éléments `data-motion`.
