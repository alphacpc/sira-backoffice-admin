# Site vitrine Sira

Site de présentation statique de la solution Sira — **ce n'est pas** le client SaaS du produit
(celui-ci reste prévu pour la Phase 7 de `docs/implementation-roadmap.md`, une fois l'API stable
et documentée). Ce site ne fait aucun appel réseau vers un microservice Sira.

Voir `docs/superpowers/specs/2026-09-28-showcase-website-design.md` pour le design d'origine, et
`docs/site-vitrine-synthese.md` pour la synthèse de la solution qui sert de source de contenu.

## Démarrer en local

```bash
pnpm install
pnpm dev
```

Le site est servi sur `http://localhost:3000`.

## Build de production

```bash
pnpm build
pnpm start
```

## Plan du site

- `/` — Accueil
- `/pourquoi-sira` — Ce qui rend la plateforme différente
- `/solutions` — Ce que Sira permet, par rôle (compagnie, guichet, terrain, passager)
- `/services` — Détail des 9 domaines métier
- `/tarifs` — Plans et tarifs (indicatifs)
- `/reservation` — Comment réserver un billet en ligne
- `/reseau` — Le réseau (gares, lignes, hubs) et la couverture
- `/applications` — Applications mobiles (à venir)
- `/entreprises` — Ce que Sira change pour les compagnies de transport
- `/architecture` — Architecture technique (services, composants transverses, stack)
- `/methode` — Backend-first, microservices, qualité et observabilité
- `/securite` — Sécurité & conformité (isolation, RGPD, secrets)
- `/faq` — Questions fréquentes
- `/contact` — Contact & demande de démonstration (sans envoi réel)
- `/mentions-legales` — Mentions légales
- `/confidentialite` — Politique de confidentialité
- `/cgu` — Conditions générales d'utilisation

## Structure du contenu

Le contenu est extrait dans `content/*.ts` (services, architecture, solutions, method, security,
why-sira, companies, pricing, faq, reservation, network, apps, legal) pour rester facilement
éditable, plutôt que codé en dur dans le JSX.
