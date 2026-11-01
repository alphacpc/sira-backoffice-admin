# Site vitrine Sira

Site statique de présentation de la plateforme Sira, destiné aux compagnies de transport
interurbain. Il ne fait aucun appel réseau vers un service Sira. Le client SaaS est l'application
`web/` du dépôt principal.

Design : `docs/superpowers/specs/2026-11-01-website-redesign-design.md` (dépôt `sira`).

## Démarrer

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm check      # règles de contenu, redirections, liens internes
```

## Pages

`/` · `/solution` · `/pour-qui` · `/securite` · `/tarifs` · `/demo` · `/mentions-legales` ·
`/confidentialite` · `/cgu`. Les anciennes adresses redirigent (voir `next.config.ts`).

## Règles de contenu

- Aucun chiffre, client, témoignage ni prix inventé : les tarifs sont « Sur devis ».
- Une fonction non livrée est étiquetée « à venir ».
- Les maquettes sont des composants (`components/mockups`) alimentés par `content/mock-data.ts`
  et légendées « Maquette — données fictives ».
- `pnpm check` échoue si une affirmation interdite apparaît (voir `scripts/check-site.mjs`).
