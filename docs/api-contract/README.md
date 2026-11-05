# Contrat d'API du backoffice admin Sira

Ce dossier décrit **tout ce que le backoffice admin attend de l'API** : écrans, fonctionnalités, modèles de données, endpoints, règles métier, et l'état réel du backend pour chacun. Il sert à vérifier ce qui existe déjà côté microservices, puis à implémenter ce qui manque.

Le backoffice tourne aujourd'hui sur des **données de démonstration en mémoire** (`src/lib/data/seed.ts`, `src/lib/repos/*.ts`). Chaque document a été rédigé en lisant le code du backoffice (pages, composants, repos, actions, types, tests), puis en vérifiant les contrôleurs et DTO des services Spring Boot.

## Documents

| # | Document | Écrans | Endpoints requis | ✅ existe | ⚠️ partiel | ❌ manquant |
|---|---|---:|---:|---:|---:|---:|
| 00 | [Tableau de bord, authentification, recherche, paramètres](00-tableau-de-bord-auth-parametres.md) | 11 | 41 | 1 | 13 | 27 |
| 01 | [Compagnies, KYC, catalogue d'offre](01-compagnies-kyc-offre.md) | 9 | 37 | 9 | 19 | 9 |
| 02 | [Facturation SaaS](02-facturation-saas.md) | 7 | 14 | 0 | 7 | 7 |
| 03 | [Utilisateurs et accès](03-utilisateurs-acces.md) | 6 | 16 | 0 | 5 | 11 |
| 04 | [Flotte](04-flotte.md) | 13 | 23 | 0 | 13 | 10 |
| 05 | [Ventes, locations de bus, factures de location](05-ventes-locations-factures.md) | 14 | 35 | 2 | 6 | 27 |
| 06 | [Colis et clients](06-colis-clients.md) | 8 | 22 | 0 | 12 | 10 |
| 07 | [Communication](07-communication.md) | 8 | 15 | 1 | 8 | 6 |
| 08 | [Conformité, audit, supervision](08-conformite-supervision.md) | 14 | 28 | 8 | 8 | 12 |
| | **Total** | **90** | **231** | **21** | **91** | **119** |

Légende : ✅ l'endpoint existe et couvre le besoin ; ⚠️ il existe mais est incomplet (pas de filtres, pas de pagination, champs ou jointures manquants, portée limitée à une compagnie) ; ❌ il n'existe pas.

Le décompte vient des rapports des auteurs de chaque document. Un endpoint compté une seule fois dans son document peut apparaître dans un autre (par exemple `GET /companies`).

## Structure de chaque document

Pour chaque écran : fonctionnalités (colonnes, filtres, tri, actions), modèle de données attendu (champ, type, nullable, valeurs), endpoints requis (méthode, chemin proposé, paramètres, corps, réponse, permission), règles métier, état côté API avec le service propriétaire recommandé. Chaque document se termine par une **synthèse des écarts** priorisée et des **questions ouvertes**.

## Constats qui reviennent dans presque tous les domaines

1. **Vue plateforme multi-compagnies.** Le backoffice voit toutes les compagnies. La plupart des endpoints existants sont scopés à une compagnie et sans filtre `companyId`. Seuls certains accèdent à tout pour un appelant « non restreint » (sans claim `company_id`, avec `RBAC_MANAGE`). Un préfixe `/admin/...` ou un paramètre `companyId` optionnel est à décider.
2. **Pagination et filtres côté serveur absents.** Le backoffice filtre, trie et pagine aujourd'hui côté client sur des jeux complets. Les listes ont besoin de pagination, de tri et de filtres serveur (statut, compagnie, recherche `q`, dates).
3. **Noms résolus.** Les services ne renvoient que des UUID (compagnie, acteur, voyageur, gare, plaque…). Le backoffice affiche des noms. Il faut soit des champs dénormalisés, soit un BFF qui fait la jointure. La recherche `q` sur ces noms n'est pas faisable côté serveur sans cette jointure.
4. **Agrégats et statistiques.** Presque aucun endpoint de statistiques n'existe (compteurs d'onglets, KPI des hubs, entonnoirs, percentiles, budget d'erreur, cartes de chaleur). Le backoffice en dérive beaucoup à partir de listes complètes. Il faut des endpoints d'agrégation dédiés.
5. **Motifs et audit des actions.** Plusieurs actions du backoffice exigent un motif (annulation, mise hors service, modération, rétention…) alors que les `PATCH` existants n'ont pas de champ motif. Les actions de la plateforme sensibles doivent émettre un événement d'audit (règle 6 du projet).
6. **Données personnelles.** Plusieurs DTO renvoient le téléphone ou l'e-mail en clair (colis, utilisateurs, notifications). Le backoffice masque et expose une « révélation » journalisée, à créer.
7. **Écarts de valeurs.** Casse des statuts différente (`HEALTHY` côté backend, `healthy` côté backoffice), statuts de facture différents, règles de notes de clôture différentes entre UI et API.

## Domaines entièrement nouveaux (rien côté backend)

- **Locations de bus** (demande, devis, confirmation, clôture, affectation bus et chauffeur, acompte, solde, caution, conflits de dates) : aucune table ni endpoint. Service recommandé : `booking-service` (nouveau lot). Voir `05`.
- **Factures de location** (numérotation, lignes, TVA, échéance, lien de paiement, QR) et **modèle de facture par compagnie** (logo, palette, textes) : inexistants. `company-service` n'a que `logo_url`, et ses `/invoices` sont des factures d'abonnement SaaS. Voir `05`.
- **Administrateurs du backoffice**, leurs sessions, le journal d'activité du backoffice et la sécurité (TOTP) : aucun service ne les porte aujourd'hui. Voir `00`.
- **Équipage** (chauffeur, assistant, contrôleur) : `Employee` de `hr-service` n'a ni nom (dans le `User` d'`identity-service`) ni rôle équivalent, seulement un `jobTitle` libre. Voir `04`.

## Manques précis relevés par domaine

- **Accès (03)** : pas de liste d'utilisateurs ni de sessions, pas de révocation avec motif, pas d'exposition de `RolePermission`, `GET /api/users/{id}` renvoie e-mail et téléphone en clair sans rôle ni statut.
- **Flotte (04)** : pas de filtres sur les listes, pas de dates d'expiration d'assurance et de contrôle technique sur le bus, pas de liste plateforme des maintenances, `totalSeats` absent de `Trip`, pas d'état par siège ni d'historique de scans (un seul `scannedAt`). Les coordonnées GPS des gares existent côté backend.
- **Ventes (05)** : pas de liste de transactions ni de billets, `Booking` sans `cancelReason`/`cancelledAt` ni nom de voyageur, annulation staff sans motif ni garde.
- **Colis et clients (06)** : aucune liste ni fiche staff des clients (`customer-service` n'expose que `/customers/me`), `ParcelHistory` sans endpoint, `LoyaltyPointsTransaction` sans `booking_id` ni endpoint.
- **Communication (07)** : `PUSH` et `WHATSAPP` n'existent que dans l'interface, pas de `GET /notifications/{id}`, liste de notifications qui exige `entityType` + `entityId`, le marketing n'est pas audité.
- **Conformité et supervision (08)** : p50 et p95 existent par service mais ne sont pas exposés ; le poller sonde toutes les 30 s alors que le jeu de démonstration suppose 30 min par point ; aucune statistique ni historique de santé.
- **Facturation (02)** : pas de table de tentatives de paiement, ni de relance ni de renvoi de facture.
- **Compagnies et offre (01)** : le backoffice n'a aucun écran de création, modification, suspension ou fermeture de compagnie, ni d'édition de plan, de fonctionnalité ou de palier. Seule écriture du catalogue : activer ou désactiver un type de document KYC.

## Limites de ce travail

- Les documents sont générés par lecture de code et ne sont pas relus ligne par ligne. Les preuves (chemins de contrôleurs et de DTO) sont citées dans chaque document : vérifie-les avant d'implémenter.
- Les chemins d'API sont des **propositions**, pas des contrats arrêtés. Chaque document liste ses questions ouvertes.
- Les endpoints ne sont pas implémentés. C'est l'étape suivante, à découper service par service (règle 7 de `CLAUDE.md` : spec, plan, migrations Flyway, tests).
