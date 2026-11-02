# Branding du backoffice : police, couleurs, logos, icônes

Date : 2026-11-02. Périmètre : `backoffice-admin` uniquement.

## Objectif

Remplacer l'habillage générique (police système, orange `#e8741a`, titre texte « Sira Backoffice », icônes Lucide) par l'identité Sira : police Gellix, palette bleu nuit / ambre / crème, logos fournis, icônes Phosphor.

## Décisions validées

1. Les couleurs de l'interface sont reconstruites depuis la palette du logo (option A).
2. La sidebar est bleu nuit `#0A2A47` dans les deux thèmes (option 1).
3. Icônes : `@phosphor-icons/react`, en remplacement de `lucide-react`.

## 1. Police Gellix

- `next/font/local` avec une famille unique et les graisses 400, 500, 600, 700 (Regular, Medium, SemiBold, Bold) ; pas de Thin, Black ni italiques.
- Variable CSS `--font-sans`, branchée dans `@theme` et sur `body` (remplace `system-ui`). Chiffres tabulaires pour les tableaux.
- Les sources restent dans `public/fonts/gellix`. Si `next/font/local` impose un chemin relatif au fichier, on copie les 4 `.otf` utilisés dans `src/app/fonts/`.

## 2. Couleurs (tokens de `globals.css`)

- Clair : fond crème `#FBFAF6`, cartes blanches, texte `#0A2A47`, bordures bleu-gris pâle, accent ambre `#F4A521` avec une variante plus foncée pour le texte sur fond clair (contraste AA), `accent-soft` ambre très pâle.
- Sombre : fond dérivé de `#0A2A47` mais plus profond (~`#071E33`), cartes ~`#0D2A45`, accent ambre.
- Sidebar : jetons `--sidebar`, `--sidebar-foreground`, `--sidebar-muted`, `--sidebar-active`, identiques dans les deux thèmes (`#0A2A47`).
- États success / warning / danger / info conservés, harmonisés avec la palette. Le contraste de chaque couple texte/fond est vérifié (AA).

## 3. Logos et favicon

- Composant `<Logo />` (`components/shell/logo.tsx`) : variantes horizontale et icône, version claire ou dark choisie selon le contexte (la sidebar utilise toujours la version dark).
- Sidebar : `sira-horizontal-dark.svg` ; icône seule en dessous du breakpoint `md`.
- Connexion, accès refusé, session expirée : logo horizontal adapté au thème.
- `metadata.icons` pointe sur `sira-favicon.svg` ; `viewport.themeColor` bleu nuit.
- Le titre texte « Sira Backoffice » disparaît.

## 4. Icônes Phosphor

- Migration des 7 fichiers qui importent Lucide, puis retrait de `lucide-react` de `package.json`.
- Wrapper `components/ui/icon.tsx` : graisse par défaut `regular`, `duotone` pour les icônes de section et les états vides ; `aria-hidden` par défaut pour les icônes décoratives.
- `lib/nav.ts` : champ `icon` sur chaque section et élément ; la sidebar les affiche.

## 5. Application

- Sidebar : sections avec icône ; élément actif = barre ambre à gauche sur fond bleu plus clair ; mode compact sous `md`.
- Topbar et composants `ui/*` (button, card, input, dialog, tabs) suivent les nouveaux tokens sans changer leur API. Les pages qui utilisent déjà `text-accent` / `bg-accent` héritent du changement.

## 6. Vérification

- `typecheck`, vitest et e2e verts. Les tests qui dépendent du texte « Sira Backoffice » ou de classes de couleur sont mis à jour.
- Contrôle de contraste AA sur les jetons (test unitaire ou script).
- Captures Playwright, thèmes clair et sombre : connexion, dashboard, un tableau.

## Hors périmètre

Autres applications du monorepo, nouveaux écrans, changement de mise en page des pages métier, refonte de composants au-delà des tokens.
