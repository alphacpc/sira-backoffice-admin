# 00 — Tableau de bord, authentification, recherche globale et paramètres

## Vue d'ensemble

Ce périmètre couvre le socle transverse du backoffice Sira (outil de l'équipe plateforme, **vue sur toutes les compagnies, aucun tenant**) :

- **Accès** : connexion (identifiant + mot de passe), vérification TOTP, session expirée / accès refusé, session (cookie signé 8 h, déconnexion après 15 min d'inactivité côté client).
- **Tableau de bord** `/` : points à traiter, 8 KPI, activité commerciale, entonnoir, trois Pareto, carte de chaleur, colis, santé des services, incidents, prochains départs, conformité (RGPD/KYC), capacité/abonnements, réservations récentes, activité récente.
- **Recherche globale** : page `/recherche` et palette ⌘K (11 types de ressources, sans e-mail ni téléphone).
- **Paramètres** : profil de l'administrateur connecté, équipe d'administrateurs du backoffice, posture de sécurité, préférences (locales), **journal d'activité du backoffice**.

Constat global : aujourd'hui tout vient d'un store en mémoire (`src/lib/data/seed.ts`) et d'un compte de démonstration codé en dur (`admin@sira.app` / `sira-demo` / TOTP `123456`, `src/lib/auth/constants.ts`). Côté backend, seuls `identity-service` (login/refresh/logout JWT), `monitoring-service` (santé, incidents, usage API) et `audit-compliance-service` (journal d'audit, demandes RGPD) offrent des lectures plateforme exploitables ; **aucun endpoint n'existe pour les comptes administrateurs du backoffice (invitation, suspension, TOTP, sessions), pour le TOTP, pour la recherche globale, ni pour les agrégats du tableau de bord**.

Conventions de ce document : chemins proposés sous `/admin/...` (accès plateforme uniquement : JWT sans claim `companyId`, avec `RBAC_MANAGE`, même conjonction stricte que `TenantAccessGuard`/`PlatformAccessGuard`). Dates en ISO-8601 UTC. Identifiants UUID. Les chaînes de caractères visibles sont en français, les enums gardent leur casse technique du code (`active`/`suspended`/`invited` en minuscules ; `LOW`/`MEDIUM`/… en majuscules).

Légende : ✅ existe · ⚠️ partiel · ❌ manquant. Les identifiants `A…`, `D…`, `S…`, `P…` des endpoints sont réutilisés dans la synthèse.

---

## Accès : connexion

### Connexion — `/connexion`

- **Fonctionnalités** :
  - Formulaire à deux champs : **Identifiant** (`type=email`, `autocomplete=username`, placeholder `prenom@sira.app`) et **Mot de passe** (bouton afficher/masquer).
  - Validation client : identifiant requis (« Identifiant requis »), mot de passe requis (« Mot de passe requis »). Côté serveur : `identifiant`/`motDePasse` non vides sinon « Identifiants invalides ».
  - Erreur d'identifiants : « Identifiant ou mot de passe incorrect » (message unique, pas d'énumération de comptes).
  - Étape 1 sur 2 (indicateur d'étapes) ; succès → redirection vers `/connexion/verification`.
  - Panneau de marque piloté par `?disposition=` (valeur parmi `AUTH_PANELS`, purement visuel).
  - Bloc « Compte de démonstration » (à supprimer en production).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| identifiant | string | non | e-mail professionnel `prenom.nom@sira.app` (≤ 40 car. avant `@`, `[a-z0-9._-]`) | identifiant de connexion du compte admin (≠ donnée de contact grand public) |
| motDePasse | string | non | libre | jamais journalisé |
| preAuthToken | string (opaque) | non | TTL 300 s | remplace le cookie `sira_bo_pre` (stage `pre`) ; httpOnly, SameSite=Strict, `Secure` en production |

- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|---|
| A1 | POST | `/admin/auth/login` | `{ identifiant, motDePasse }` | `200 { preAuthToken, mfaRequired: true, mfaEnrolled: bool }` ; `401 { error }` ; `423/429` si verrouillé | publique (rate-limitée) |

- **Règles métier** :
  - Mot de passe + TOTP **obligatoires** pour tout administrateur du backoffice (docs/security.md : MFA obligatoire pour les rôles admin/manager).
  - Seul un compte dont le statut est `active` peut se connecter ; `suspended` et `invited` (non enrôlé) sont refusés ou orientés vers l'enrôlement.
  - Le jeton intermédiaire (stage `pre`) vit 5 min (`PRE_TTL_S = 300`), n'ouvre aucune page du backoffice.
  - Message d'erreur identique pour identifiant inconnu / mot de passe faux.
  - Effets de bord : écriture d'une ligne dans le journal (succès `LOGIN`, échec borné) ; mise à jour de `lastLoginAt` après la 2ᵉ étape.
- **État côté API** :
  - A1 ⚠️ — `identity-service` `POST /api/auth/login` (`controller/AuthController.java`) : valide `username`/`password`, renvoie `accessToken` + `refreshToken` (+ `user{id,username,email}`) ; **mais** pas d'étape intermédiaire MFA, pas de notion « compte du backoffice » (le rôle `ADMIN` existe, aucun filtre d'audience), le champ est `username` (pas un e-mail `@sira.app`), pas de verrouillage visible. Tables `UserSession`/`LoginAttempt` du dbml (statuts `failed_password`, `failed_mfa`, `account_locked`) non exposées. Service propriétaire : **identity-service**.

### Vérification TOTP — `/connexion/verification`

- **Fonctionnalités** :
  - Saisie d'un code à **6 chiffres** (clavier numérique, non-chiffres supprimés à la frappe, `autocomplete=one-time-code`), bouton « Valider » désactivé tant que < 6 chiffres.
  - Erreurs : « Code incorrect » ; « Trop de tentatives, reconnecte-toi » à partir de la 5ᵉ erreur (`MAX_TOTP_ATTEMPTS = 5`) ; « Session de connexion expirée » si le jeton intermédiaire est absent/expiré.
  - La page redirige vers `/connexion` si aucun jeton intermédiaire valide ; lien « ← Changer de compte ».
  - Succès → `/` (rafraîchissement) ; session de **8 h** (`SESSION_TTL_S`).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| code | string | non | `^\d{6}$` | TOTP RFC 6238 (ou code de récupération `XXXX-XXXX`, voir Profil) |
| attempts | int | non | 0–5 | compteur par jeton intermédiaire, calculé par l'API |
| session | cookie/jeton | non | TTL 8 h | remplace `sira_bo_session` (stage `full`, `sub` = identifiant) |

- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|---|
| A2 | POST | `/admin/auth/mfa/verify` | `{ preAuthToken, code }` | `200 { accessToken, refreshToken, expiresIn }` ; `401 { error: "Code incorrect", attemptsLeft }` ; `423 "Trop de tentatives…"` | jeton intermédiaire |
| A6 | POST | `/admin/auth/mfa/enroll` | `{ preAuthToken }` puis `{ preAuthToken, code }` | `200 { otpauthUri, secret (affiché une fois), recoveryCodes[8] }` | jeton intermédiaire — **requis mais sans écran aujourd'hui** (l'invitation indique « devra enrôler son TOTP à sa première connexion ») |

- **Règles métier** : 5 essais max par jeton intermédiaire puis verrouillage (le cookie n'est pas supprimé : la page doit afficher le message ; l'API doit rendre le verrouillage persistant et non contournable en rejouant un ancien jeton) ; secret TOTP chiffré au repos, jamais renvoyé ensuite ; 8 codes de récupération à usage unique ; succès = `lastLoginAt` mis à jour + création d'une session (appareil, IP, expiration 8 h).
- **État côté API** :
  - A2 ❌ — aucune route MFA dans `identity-service` (grep `totp|mfa` sans résultat dans `src/main` ; `docs/services/identity-service.md` : « MFA TOTP (enrôlement, vérification, codes de secours) » non coché ; table `MfaMethod` dans `sira_schema.dbml` l. 496). Service : **identity-service**.
  - A6 ❌ — idem (`POST /auth/mfa/enroll` listé dans la doc du service, non implémenté).

### Session expirée / Accès refusé — `/session-expiree`, `/acces-refuse`

- **Fonctionnalités** :
  - `/session-expiree` : message « Votre session a expiré » + bouton « Retour à la connexion ». Atteint (a) par le middleware quand un cookie de session existe mais est invalide/expiré, (b) par la déconnexion d'inactivité (15 min sans `mousemove`/`keydown`/`click`/`scroll`, composant `IdleLogout`).
  - `/acces-refuse` : message « Votre compte n'a pas les droits nécessaires… » + « Retour à l'accueil ». **Aucune logique ne redirige vers cette page aujourd'hui** (page statique) : elle est prévue pour un refus `403` de l'API.
  - Chemins publics : `/connexion`, `/connexion/*`, `/session-expiree`, `/acces-refuse`, `/favicon.ico` ; tout le reste exige une session `full` (middleware `src/middleware.ts`) → `/connexion` si aucun cookie, `/session-expiree` si cookie invalide.
  - Les server actions renvoient `{ ok:false, error:"Session expirée, reconnecte-toi" }` si la session manque.
- **Modèle de données attendu** : aucun objet affiché. Le middleware lit dans la session : `sub` (identifiant), `stage` (`pre`|`full`), `exp`.
- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|---|
| A3 | POST | `/admin/auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` ; `401` si révoqué | session |
| A4 | POST | `/admin/auth/logout` | `{ refreshToken, reason?: "manual"\|"idle" }` | `204` (révoque la session côté serveur) | session |
| A5 | GET | `/admin/me` | — | `ProfileView` (voir Profil) + `permissions[]` | session |

- **Règles métier** : l'API doit pouvoir **révoquer** une session (suspension du compte, réinitialisation TOTP, révocation manuelle) ; le jeton d'accès identity vit ≤ 15 min alors que la session du backoffice vit 8 h → renouvellement via refresh ; la validation du jeton se fait au middleware (aujourd'hui HMAC local, à remplacer par la validation du JWT identity, secret/clé partagé) ; `403` explicite (permission manquante) → `/acces-refuse`.
- **État côté API** :
  - A3 ⚠️ — `POST /api/auth/refresh` (AuthController) avec rotation, mais renvoie `401 {error:"Invalid refresh token"}` sans distinction expiration/révocation.
  - A4 ⚠️ — `POST /api/auth/logout` (204) sans motif ; l'inactivité n'est pas distinguée.
  - A5 ⚠️ — `GET /api/me` (`MeController` → `UserProfileResponse`), sans TOTP/sessions/permissions de backoffice.
  - Service : **identity-service**. Permission d'accès au backoffice (ex. `BACKOFFICE_ACCESS`) : ❌ inexistante (seules `RBAC_MANAGE`, `COMPLIANCE_READ`, `MONITORING_READ`… existent).

---

## Tableau de bord — `/`

- **Fonctionnalités** (page serveur, `force-dynamic`) :
  - En-tête : date du jour (fr, UTC) + « période du dd/mm au dd/mm » ; sélecteur **Période** `?jours=` ∈ **7 / 14 (défaut) / 30** jours ; champ de recherche (GET `/recherche?q=`).
  - **À traiter** : tuiles cliquables (compte + libellé + lien), uniquement celles dont `count > 0` ; sinon « Tout est à jour ». Clés : `incidents` (« Incidents ouverts » → `/supervision/incidents`), `pastdue` (« Abonnements impayés » → `/offre-facturation/impayes`), `dsr` (« Demandes RGPD en retard » → `/conformite/demandes-rgpd`), `kyc` (« Documents KYC à revoir » → `/compagnies/kyc`), `expiring` (« Réservations en ligne qui expirent » → `/ventes/en-ligne`), `stuck` (« Paiements bloqués » → `/ventes/paiements`).
  - **8 indicateurs** : Chiffre d'affaires (XOF, delta vs période précédente, MRR en indice, sparkline) ; Réservations (delta, % annulées) ; Taux de paiement (% payées / confirmées, delta en points, alerte < 70 %) ; Panier moyen (XOF, delta) ; Remplissage des départs (% sièges réservés sur trajets à venir) ; Livraison des colis (% livrés parmi clos, colis en circulation, en retard) ; Disponibilité API (%, services opérationnels x/y, sparkline 100 − err5) ; Incidents ouverts (+ MTTR).
  - **Activité commerciale** : série quotidienne (revenu XOF, réservations, payées) sur la période.
  - **Entonnoir** : Réservations créées → Confirmées → Payées → Billet émis, avec taux d'étape et phrase « Sur 100 réservations, N aboutissent à un paiement ».
  - **Pareto** : CA par compagnie (8 premières + « Autres (n) », part cumulée, « n compagnies concentrent 80 % », indice de concentration élevé ≥ 40 % / modéré ≥ 25 % / faible) ; erreurs 5xx par endpoint (8) ; causes d'échec de paiement (8).
  - **Carte de chaleur** : CA par compagnie (8 premières) × jour.
  - **Colis** : 4 étapes (En attente, En transit, Au hub, Livrés) + nombre en retard.
  - **Santé des services 24 h** : une frise par service (48 contrôles), latence, uptime % (rouge si < 99,5 %), lien vers `/supervision/services?service=`. Services « stale » exclus.
  - **Incidents ouverts** (4 premiers, barre de sévérité), **Prochains départs** (5), **Conformité** (4 demandes RGPD avec jours restants/retard + 4 documents KYC), **Capacité** (jauge bus actifs/total, bus en maintenance, mix des plans actifs), **Réservations récentes** (6), **Activité récente** (6 dernières entrées hors journal backoffice).
  - Tous les blocs vides ont un état vide textuel (« Aucune vente sur la période », « Aucun incident ouvert », etc.).
- **Modèle de données attendu** (réponse agrégée `DashData`, tout est calculé côté serveur ; le front n'a aucune logique de calcul hormis l'affichage) :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| days, from, to | int, date, date | non | days ∈ {7,14,30} | fenêtre courante `[to-days+1 … to]`, jours UTC |
| generatedAt | datetime | non | | |
| kpis.revenue / revenueDelta | number (XOF) / int % | delta oui | paiements `paid` en **XOF** uniquement | booking-service ; delta = (période − précédente) / précédente, `null` si précédente = 0 |
| kpis.bookings / bookingsDelta / cancelRate | int / int % / float % | delta, cancelRate oui | | réservations créées dans la fenêtre ; cancelRate = annulées / créées (1 décimale) |
| kpis.paymentRate / paymentRateDelta | float % / points | oui | payées / confirmées (hors `cancelled`) | |
| kpis.avgBasket / avgBasketDelta | int XOF / % | delta oui | panier moyen des réservations payées XOF | |
| kpis.occupancy | int % | oui | sièges pris / sièges des trajets `planned`\|`boarding` à venir | fleet-service |
| kpis.deliveryRate | int % | oui | livrés / (DELIVERED+LOST+RETURNED) | parcel-service |
| kpis.busUtilisation | int % | oui | bus `active` / total | fleet-service |
| base.kpis.mrr, mrrActiveSubscriptions | int XOF, int | non | abonnements `active` en XOF ; annuel / 12 | company-service |
| base.kpis.activeCompanies / totalCompanies | int | non | statut `active` / tous | company-service |
| base.kpis.parcelsInTransit | int | non | `IN_TRANSIT` + `AT_HUB` | |
| base.kpis.activeBuses / totalBuses / busesInMaintenance | int | non | bus `active` / total / `maintenance` | |
| base.kpis.pastDue, openIncidents, pendingKyc | int | non | abonnements `past_due` ; incidents ≠ `RESOLVED` ; documents `pending` | |
| base.attention[] | `{ key, label, count, href, tone }` | non | tone ∈ `danger`\|`warning`\|`info` ; seules entrées `count>0` | calculé API (ou BFF) |
| series[] | `{ day, bookings, paid, revenue }` | non | un point par jour de la fenêtre | |
| funnel[] | `{ label, value, ratePct }` | ratePct oui | 4 étapes fixes | |
| paretoRevenue / paretoErrors / paretoFailures | `{ items[{label,value,sharePct,cumPct,href?}], total, vitalFew, vitalShare, topShare }` | non | maxItems 10 / 8 / 8 + « Autres (n) » | tri décroissant puis libellé ; vital few = rang où cumPct ≥ 80 |
| heat[] | `{ label (compagnie), cells[{day,value,title}] }` | non | 8 premières compagnies | |
| parcels | `{ stages[{label,value}], late, total }` | non | late = `PENDING`\|`IN_TRANSIT`\|`AT_HUB` avec `expectedDeliveryAt` passé | |
| onlineExpiring | int | non | réservations en ligne `confirmed`, non payées, sans transaction `PENDING`, TTL 30 min | booking-service |
| online.stuck | int | non | transactions `PENDING` depuis > 30 min (réservations en ligne) | |
| mon.metrics[] | `{ name, status (healthy\|degraded\|down), stale, responseTimeMs, uptimePercent, states[{at,status,ms}] }` | uptime oui | 48 derniers contrôles, stale = dernier contrôle > 90 s | monitoring-service |
| mon.api.totals.availability, mon.api.byDay[].err5 | float %, float % | non | 1 − 5xx / total | monitoring-service |
| mon.incidents.open / mttrMinutes | int / int | mttr oui | MTTR = moyenne (resolvedAt − detectedAt) en minutes | |
| incidents[] (4) | `{ id, code, title, serviceName, severity (LOW\|MEDIUM\|HIGH\|CRITICAL), status (INVESTIGATING\|IDENTIFIED\|MONITORING\|RESOLVED), detectedAt }` | non | ouverts, plus récents d'abord | |
| upcomingTrips[] (5) | `{ id, label ("Ville → Ville"), companyName, departure, availableSeats, totalSeats }` | non | `planned`\|`boarding`, départ ≥ now, tri départ | fleet-service (+ noms de villes, compagnie) |
| recentBookings[] (6) | `{ id, code, passenger, companyName, amount, currency, paymentStatus (paid\|failed\|pending…), channel (counter\|online), createdAt }` | non | tri `createdAt` desc | booking-service |
| pendingKyc[] (5 / 4 affichés) | `{ id, companyId, companyName, typeName, uploadedAt }` | non | documents `pending`, plus anciens d'abord | company-service |
| dsr[] (4) | `{ id, requestType (ACCESS\|RECTIFICATION\|ERASURE\|PORTABILITY\|RESTRICTION\|OBJECTION), requesterName, dueDate, daysLeft }` | non | statuts `RECEIVED`\|`IN_PROGRESS`, tri `daysLeft` croissant ; < 0 = retard | audit-compliance-service ; `requesterName` = nom d'affichage (donnée personnelle → à discuter) |
| plansMix[] | `{ label (nom du plan), value }` | non | abonnements `active` XOF | company-service |
| activity[] (6) | `{ id, at, actor, action (texte FR), companyName? }` | companyName oui | hors entrées du journal backoffice | audit-compliance-service |

  Champs calculés par `homeData` mais **non affichés** par la page (ne pas implémenter) : `series` (14 j), `api`, `companiesByStatus`, `parcelsByStatus`, `channels`, `topCompanies`, `services`, `kpis.revenue30d/bookings30d/activeUsers/customers/apiRequests7d/apiErrorPercent`.
- **Endpoints requis** (le front appelle UNE seule fonction `dashData(days)` ; il est recommandé qu'une seule route agrégée alimente la page, composée côté serveur à partir des sources ci-dessous) :

| ID | Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|---|
| D1 | GET | `/admin/dashboard` | `days=7\|14\|30` (défaut 14) | `DashData` complet (ci-dessus) | plateforme |
| D2 | GET | `/admin/companies/stats` | — | `{ total, byStatus{draft,active,suspended,closed} }` | `COMPANY_MANAGE` + plateforme |
| D3 | GET | `/admin/subscriptions` | `status=past_due`, `page`, `size` ; réponse avec `companyName`, `price`, `currency`, `pastDueSince` | page d'abonnements toutes compagnies | `COMPANY_MANAGE` + plateforme |
| D4 | GET | `/admin/subscriptions/stats` | — | `{ mrr(XOF), activeCount, planMix[{planName,count}], pastDueCount }` | idem |
| D5 | GET | `/admin/bookings/stats` | `from,to,groupBy=day\|company`, `currency=XOF`, `companyId?` | séries `{day,bookings,paid,revenue}`, KPI (revenue, avgBasket, paymentRate, cancelRate), entonnoir (créées/confirmées/payées/billets), top compagnies | `BOOKING_MANAGE` + plateforme |
| D6 | GET | `/admin/bookings` | `sort=createdAt,desc`, `size=6`, `companyId?` ; chaque ligne : `bookingCode`, `passengerName`, `companyId`+`companyName`, `amount`, `currency`, `paymentStatus`, `channel`, `createdAt` | page | `BOOKING_MANAGE` + plateforme |
| D7 | GET | `/admin/parcels/stats` | — | `{ byStatus{}, late, total, deliveryRate }` | `PARCEL_MANAGE` + plateforme |
| D8 | GET | `/admin/fleet/stats` | — | `{ buses{total,active,maintenance}, upcoming{ seats, taken } }` | `FLEET_MANAGE` + plateforme |
| D9 | GET | `/admin/trips` | `upcoming=true`, `status=planned,boarding`, `sort=departure`, `size=5` ; ligne avec villes origine/destination et `companyName` | page | `FLEET_MANAGE` + plateforme |
| D10 | GET | `/admin/payments/failures` | `from,to,groupBy=reason` | `[{ reason, count }]` (`failureReason` null → « Motif non précisé ») | `BOOKING_MANAGE` + plateforme |
| D11 | GET | `/admin/online-bookings/watch` | — | `{ expiring[{bookingId,bookingCode,companyName,minutesLeft}], stuckPayments }` | `BOOKING_MANAGE` + plateforme |
| D12 | GET | `/usage/api` | `from,to` (ISO date-time), `companyId?`, `endpoint?`, `method?` | `[{ day, endpoint, method, statusClass, count, avgResponseMs, maxResponseMs }]` | `MONITORING_READ` + plateforme |
| D13 | GET | `/health/services` | — | `[{ serviceName, environment, status, responseTimeMs, errorRatePercent, checkedAt, stale }]` | `MONITORING_READ` |
| D14 | GET | `/health/services/history` | `hours=24`, `serviceName?` | `[{ serviceName, uptimePercent, p50, p95, checks[{checkedAt,status,responseTimeMs}] }]` (48 points) | `MONITORING_READ` |
| D15 | GET | `/incidents` | `status` (liste ou `open=true`), `severity`, `serviceName`, `page`, `size` | page de `SystemIncident` | `MONITORING_READ` + plateforme |
| D16 | GET | `/data-subject-requests` | `status` (multi : `RECEIVED,IN_PROGRESS`), `sort=dueDate`, `page`, `size` | page de DSR + `requesterName` | `COMPLIANCE_READ` + plateforme |
| D17 | GET | `/admin/kyc/documents` | `status=pending`, `sort=uploadedAt,asc`, `size` ; ligne avec `companyName`, `typeName` | page | `COMPANY_KYC_REVIEW` |
| D18 | GET | `/audit-logs` | `size=6`, `exclude sourceService=backoffice`, `from` | page de `AuditLog` | `COMPLIANCE_READ` + plateforme |

- **Règles métier** :
  - Revenu et panier moyen ne comptent que les réservations `paymentStatus = paid` en **XOF** (les autres devises sont exclues du KPI) ; l'API doit exposer la devise ou convertir.
  - Les deltas se calculent contre la fenêtre précédente de même longueur ; `null` quand la base de comparaison est nulle (affiché « — »).
  - Les services `stale` sont exclus de « disponibilité » et de la frise de santé.
  - L'activité récente exclut le journal de l'équipe backoffice (`scope = backoffice`) pour ne pas mélanger les vues (le journal d'équipe a son propre écran).
  - Aucune donnée de contact (e-mail, téléphone) n'est renvoyée ; `passengerName`/`requesterName` sont des noms d'affichage (voir Questions ouvertes).
  - Pas d'action d'écriture sur cet écran.
- **État côté API** :
  - D1 ❌ — aucune route d'agrégation ; à composer (BFF/aggregateur) à partir des sources ci-dessous.
  - D2 ⚠️ — `company-service` `GET /companies` (`controller/CompanyController.java`, `Pageable` seul, pas de filtre `status`, pas de comptage par statut) ; `CompanyResponse` contient `status`.
  - D3, D4 ❌ — les souscriptions n'existent que par compagnie : `GET /companies/{companyId}/subscriptions` (`CompanyPlanSubscriptionController`), `findByCompanyIdOrderByCreatedAtDesc` ; pas de vue plateforme, pas de MRR. Service : **company-service**.
  - D5 ❌ — **booking-service** : seuls `GET /bookings` (page, filtre `tripId` seulement) et `GET /bookings/{id}` ; aucun agrégat. Service : booking-service (fenêtre/série) ; l'entonnoir et les échecs vivent aussi ici.
  - D6 ⚠️ — `GET /bookings` (`BookingController.java`) : un appelant non restreint (sans claim, `RBAC_MANAGE`) voit toutes les compagnies et `Pageable` autorise `sort=createdAt,desc` ; `BookingResponse` n'a ni `passengerName` ni `companyName` ni `channel` (champ `typeBooking` : `counter`/`online` à confirmer).
  - D7 ❌ — **parcel-service** (`ParcelController`) : `GET /parcels` paginé, pas d'agrégat ni de filtre de retard.
  - D8 ❌ — **fleet-service** : pas de statistiques de flotte.
  - D9 ⚠️ — `GET /trips` (`TripController.java`) existe (non restreint = toutes compagnies) mais sans filtre `upcoming`/`status`, sans villes ni nom de compagnie.
  - D10, D11 ❌ — **booking-service** ; les données source existent (`Transaction.failureReason`, tentatives de paiement, expiration TTL 30 min des réservations en ligne) mais ne sont exposées par aucun endpoint plateforme.
  - D12 ✅ — **monitoring-service** `GET /usage/api` (`controller/ApiUsageController.java`, `ApiUsageLine` : day, endpoint, method, statusClass, count, avgResponseMs, maxResponseMs ; plage ≤ 93 j ; plateforme). Le backoffice calcule disponibilité et Pareto 5xx à partir de ces lignes.
  - D13 ⚠️ — `GET /health/services` (`ServiceHealthController`, `ServiceHealthCheckResponse` avec `stale`) : **dernier** contrôle seulement.
  - D14 ❌ — la frise 24 h, p50/p95, uptime % demandent l'historique des `ServiceHealthCheck` (table existe, aucun endpoint). Service : monitoring-service.
  - D15 ⚠️ — `GET /incidents` (`SystemIncidentController`) : filtre `status` à valeur unique (il faut « tous sauf `RESOLVED` »), `severity`, `serviceName`, pagination ; MTTR à calculer (`detectedAt`/`resolvedAt` présents).
  - D16 ⚠️ — `GET /data-subject-requests` (`StaffDataSubjectRequestController.java`) : filtre `status` unique, `companyId`, pagination ; pas de `requesterName` (la DSR porte `requesterUserId`), tri non paramétrable.
  - D17 ❌ — documents KYC accessibles seulement par compagnie : `GET /companies/{id}/documents` (`CompanyDocumentController`). Service : **company-service**.
  - D18 ⚠️ — `GET /audit-logs` (`AuditLogController`, filtres `companyId, entityType, entityId, actorUserId, action, from, to, sourceService`) : lignes techniques (`action` = enum `CREATE`/`UPDATE`/…, états avant/après), pas de libellé FR « Compagnie X suspendue » ni de `companyName`, pas d'exclusion de `sourceService`.

---

## Recherche globale

### Recherche — `/recherche` et palette de commandes (⌘K / Ctrl+K)

- **Fonctionnalités** :
  - **Page `/recherche?q=…&type=…`** : champ de recherche (GET), aide avec exemples (BK-…, TK-…, PCL-…, SYS-…), résultats **groupés par type** (11 groupes dans l'ordre : Compagnies, Comptes plateforme, Comptes clients, Réservations, Billets, Colis, Factures, Bus, Incidents, Campagnes, Notifications), libellé « {Groupe} · {total} », jusqu'à **25 résultats par type** (`PAGE_LIMIT`), message « N autre(s) résultat(s) : affine la recherche. » si total > affichés, filtre par type (« Tous (n) » + un onglet par groupe non vide), états : aide (pas de requête), problème de saisie (`role=alert`), « Aucun résultat pour cette recherche. », « Aucun résultat dans ce type. ».
  - **Palette ⌘K** : sections dans l'ordre Pages (navigation statique filtrée localement, tous les mots présents), Compagnies (liste complète des noms chargée à la mise en page, filtrage local), Enregistrements (appel serveur **anti-rebond 250 ms**, **hors compagnies**, **4 résultats par type**), « Voir tous les résultats » (vers `/recherche?q=`). Une réponse obsolète ne remplace pas la plus récente ; une réponse en erreur/session expirée vide les résultats.
  - Champ de recherche aussi dans la barre latérale et le tableau de bord (GET `/recherche`).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| q | string | non | trim ; 2 ≤ longueur ≤ 100 ; **e-mail (`@`) ou téléphone (≥ 7 chiffres, séparateurs `+ ( ) . - / _` et espaces, préfixe `tel:`/`phone` ≤ 5 lettres) refusés** | normalisation NFKC, zéro-width ignorés (`isContactLike`) |
| types | `SearchType[]` | oui | `company`,`user`,`customer`,`booking`,`ticket`,`parcel`,`invoice`,`bus`,`incident`,`campaign`,`notification` | défaut : tous ; palette : tous sauf `company` |
| limitPerType | int | non | 25 (page) / 4 (palette) | |
| SearchHit | `{ type, id, label, sublabel, href }` | non | `sublabel` sans donnée personnelle | |
| SearchGroup | `{ type, label, total, hits[] }` | non | groupes vides omis, ordre fixe ci-dessus | |
| SearchResult | `{ problem: string\|null, groups[] }` | problem oui | problem ∈ « Saisis au moins 2 caractères », « La recherche est trop longue (100 caractères maximum) », « La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant. » | validation à dupliquer côté API (défense en profondeur) |

  Champs interrogés par type (rien d'autre n'est cherché) et lien/sous-libellé produits :

| Type | Champs recherchés | label / sublabel | href |
|---|---|---|---|
| company | name, slug, registrationNumber, ninea | nom / libellé du statut (Brouillon, Active, Suspendue, Fermée) | `/compagnies/{id}` |
| user | username, displayName | nom affiché / `{username} · {nom du rôle}` | `/utilisateurs/{id}` |
| customer | name | nom / « Compte client » | `/clients/comptes/{id}` |
| booking | bookingCode | code / nom de la compagnie | `/ventes/reservations/{id}` |
| ticket | ticketCode | code / compagnie | `/ventes/billets/{ticketCode}` |
| parcel | parcelCode, trackingNumber | code / compagnie | `/colis/{id}` |
| invoice | number | numéro / compagnie | `/facturation/factures/{id}` |
| bus | busCode, plate | code / compagnie | `/flotte/bus/{id}` |
| incident | incidentCode, title | code / `serviceName` | `/supervision/incidents/{id}` |
| campaign | name | nom / compagnie | `/communication/campagnes/{id}` |
| notification | notificationCode | code / compagnie | `/communication/notifications/{id}` |

  Classement : par champ, rang 0 égalité exacte, 1 préfixe, 2 début de mot (précédé de espace `-` `_` `.` `/`), 3 sous-chaîne ; insensible à la casse et aux accents ; tri par rang puis libellé (locale `fr`) puis id.
- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|---|
| S1 | GET | `/admin/search` | `q`, `types?` (liste), `limitPerType` (≤ 25) | `SearchResult` | session backoffice (plateforme) ; filtrer les types selon les permissions de l'appelant |
| S2 | GET | `/admin/companies/names` | — | `[{ id, name }]` (chargé à chaque rendu du layout pour la palette) | session backoffice |

- **Règles métier** : jamais de recherche par e-mail/téléphone ni retour de contact ; un `q` rejeté ne reste ni dans l'URL (redirection `/recherche?refus=contact`) ni dans la page ; chaque type interroge uniquement des champs non personnels (noms, codes, identifiants) ; la recherche ne journalise pas de contenu (à décider : journaliser le fait de chercher un identifiant de personne ?). La palette doit rester rapide (≤ ~250 ms perçus) ; la liste des compagnies est complète côté client (volume faible attendu) — au-delà de quelques centaines, prévoir `GET /admin/companies/names?q=`.
- **État côté API** :
  - S1 ❌ — aucune recherche transverse. Sources par type : company ⚠️ (`GET /companies` sans filtre `q`), user ❌ (aucun `GET /api/users` ni recherche ; seulement `GET /api/users/{id}`, scopé), customer ⚠️/❌ (`customer-service` : `/customers/...` self-service, pas de liste staff à vérifier), booking ⚠️ (`GET /bookings`, pas de `q`), ticket ⚠️ (`GET /tickets/{code}` par code exact), parcel ⚠️ (`GET /parcels`, `/parcels/track/{n}` par numéro exact), invoice ❌ (par compagnie seulement), bus ⚠️ (`GET /buses` paginé), incident ⚠️ (`GET /incidents`, pas de `q`), campaign ⚠️ (`/marketing-campaigns` scopé), notification ⚠️ (`GET /notifications?entityType&entityId`). **Recommandation** : ajouter à chaque service un `GET /admin/{ressource}/search?q=&limit=` (index sur champs ci-dessus) et un composant d'agrégation sans base (BFF) qui fédère.
  - S2 ⚠️ — `GET /companies` paginé (taille max par défaut Spring Data) ; pas d'endpoint léger id+nom.

---

## Paramètres

### Mon profil — `/parametres/profil`

- **Fonctionnalités** :
  - Carte compte : avatar (initiales), nom affiché, identifiant, badge rôle « Administrateur », badge « 2FA activée / non enrôlée », dates : compte créé le, dernière connexion (« il y a x min/h/j »), TOTP « depuis le … » ou « Non enrôlé », nombre de codes de récupération restants.
  - **Sécurité du compte** : jauge (score % = contrôles OK / 4) et 4 contrôles : Authentification à deux facteurs (TOTP actif), Codes de récupération (TOTP actif et ≥ 3 restants), Sessions maîtrisées (aucune autre session active), Connexion récente (≤ 30 jours).
  - **Mes sessions** : cartes (appareil, IP tronquée `a.b.c.0`, état Active/Révoquée/Expirée, début, dernière activité, « Session courante » / motif de révocation / « Expire … »), bouton **Révoquer** sur chaque session active non courante (confirmation, sans motif).
  - Actions d'en-tête (`ProfileActions`) : **Modifier mon nom** (confirmation, ≤ 100 car., obligatoire), **Révoquer mes autres sessions** (visible si ≥ 1 autre session active, confirmation), **Régénérer mes codes de récupération** (visible si TOTP actif, confirmation ; les 8 nouveaux codes sont affichés **une seule fois**, format `XXXX-XXXX` hexadécimal majuscule).
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | uuid | non | | |
| identifier | string | non | `^[a-z0-9._-]{3,40}@sira\.app$` | login |
| displayName | string | non | 1–100 car. | |
| roleLabel | string | non | « Administrateur » (un seul niveau aujourd'hui) | futur : rôle réel |
| status | `active`\|`suspended`\|`invited` | non | | |
| totpEnabled | bool | non | | |
| totpEnrolledAt | datetime | oui | | |
| recoveryCodesRemaining | int | non | 0–8 | seul le compteur est conservé, jamais les codes |
| createdAt / lastLoginAt | datetime | lastLoginAt oui | | |
| otherActiveSessions | int | non | calculé | sessions actives autres que la courante |
| sessions[] | `{ id, deviceLabel, ip (tronquée), createdAt, lastSeenAt, expiresAt, state (active\|revoked\|expired), current, revokedReason }` | revokedReason oui | state calculé : révoquée si `revokedAt` ; expirée si `expiresAt` ≤ maintenant ; sinon active | tri `createdAt` desc ; **IP complète jamais envoyée au navigateur** (tronquée /24 par l'API ; non-IPv4 → « •••• ») |
| checks | `{ items[{label,ok,hint}], score }` | non | 4 items, score = round(ok/4×100) | calculable par le front ou l'API |

- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|---|
| (A5) | GET | `/admin/me` | — | profil ci-dessus (sans sessions) | session |
| P1 | GET | `/admin/me/sessions` | — | `sessions[]` | session |
| P2 | PATCH | `/admin/me` | `{ displayName }` | profil mis à jour ; `400` « Le nom est obligatoire » / « Le nom est trop long (100 caractères maximum) » | session |
| P3 | DELETE | `/admin/me/sessions/{sessionId}` | — (pas de motif) | `204` ; `404 Session introuvable` ; `409` « Utilise la déconnexion pour fermer la session courante » / « La session est déjà révoquée ou expirée » ; révocationReason = « Révoquée par le titulaire » | session |
| P4 | POST | `/admin/me/sessions/revoke-others` | — | `{ revoked: n }` ; `409 Aucune autre session active` | session |
| P5 | POST | `/admin/me/recovery-codes/regenerate` | — | `{ codes: string[8] }` (affichés une fois) ; `409 Le TOTP n'est pas activé` | session |

- **Règles métier** : la session courante ne se révoque pas ici (utiliser la déconnexion) ; régénérer invalide les anciens codes ; chaque action est journalisée (voir Journal) : « Nom affiché de {id} modifié », « Session révoquée ({appareil}) », « {n} autre(s) session(s) révoquée(s) », « Codes de récupération régénérés » ; les codes ne sont jamais stockés en clair ni journalisés ; la durée de session (8 h) est une constante affichée.
- **État côté API** :
  - A5 ⚠️ et P1 ❌ — `identity-service` : table `UserSession` (`entity/UserSession.java` : ip, userAgent, deviceName, `isActive`, `lastActivityAt`, `expiresAt`, `revokedAt`, `revokedReason`) mais **aucun endpoint** de lecture/révocation de sessions ; `GET /api/me` renvoie le profil seul. TOTP/codes de récupération absents (`MfaMethod` du dbml non implémentée).
  - P2 ❌ — pas de `PATCH /api/me`.
  - P3, P4 ❌ ; P5 ❌.
  - Service propriétaire : **identity-service** (comptes, sessions, MFA).

### Équipe d'administrateurs — `/parametres/equipe-admin`

- **Fonctionnalités** :
  - Bandeau de 4 statistiques : Administrateurs (total), Actifs (+ n suspendu(s)), Couverture 2FA (% des actifs avec TOTP, « — » si aucun actif), Sessions actives (somme).
  - Recherche (`?q=`, ≤ 80 car., insensible casse/accents sur nom et identifiant) et filtre **Statut** (`?statut=` : Tous, `active` Actifs, `suspended` Suspendus, `invited` Invités). Filtrage serveur côté Next (en mémoire sur le jeu complet) → **l'API doit offrir recherche + filtre statut** ; pas de pagination aujourd'hui (équipe de quelques personnes) ; tri `createdAt` croissant puis id.
  - Cartes : avatar, nom (+ pastille « Toi »), identifiant, badge de statut (Actif / Suspendu / Invité), puce 2FA (« 2FA · n codes » / « 2FA absente »), nombre de sessions, dernière connexion (« Jamais » si nulle ; en ambre si inactif > 30 j et actif), membre depuis, liste de **risques** (voir règles).
  - Actions par carte (selon statut) : **Suspendre** (si `active`), **Réactiver** (si `suspended`), **Réinitialiser le TOTP** (si `active` et `totpEnabled` et pas soi-même), **Révoquer les sessions** (si ≥ 1 session active, pas soi-même) — toutes avec boîte de confirmation et **motif obligatoire** (≤ 500 car.).
  - Action d'en-tête : **Inviter un administrateur** (identifiant `prenom.nom@sira.app`, nom affiché) ; aucun e-mail n'est envoyé aujourd'hui (maquette).
  - État vide : « Aucun résultat dans « Équipe » » (avec q) ou « Rien à afficher ici. ».
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | string/uuid | non | | |
| identifier | string | non | unique, `^[a-z0-9._-]{3,40}@sira\.app$` (forcé en minuscules) | |
| displayName | string | non | 1–100 | |
| status | `AdminStatus` | non | `active` \| `suspended` \| `invited` | |
| totpEnabled | bool | non | | |
| recoveryCodesRemaining | int | non | | |
| activeSessions | int | non | sessions non révoquées et non expirées | calculé API |
| lastLoginAt / createdAt | datetime | lastLoginAt oui | | |
| isSelf | bool | non | identifiant = appelant | calculé API |
| idle | bool | non | `lastLoginAt` nul ou > 30 j | calculé API (IDLE_DAYS = 30) |
| risks[] | string[] | non | voir règles | calculé API |
| posture | voir Sécurité | | | |

  Risques (libellés exacts, tableau vide pour un compte `suspended`) : `invited` → « Invitation non activée » ; sinon « TOTP non enrôlé » (si pas de TOTP) ou « Seulement {n} code(s) de récupération » (si TOTP et n < 3), plus « Aucune connexion depuis plus de 30 jours ».
- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres / corps | Réponse | Permission |
|---|---|---|---|---|---|
| P6 | GET | `/admin/admins` | `status?`, `q?`, `page`, `size` | page de comptes + compteurs agrégés (`total`, `active`, `invited`, `suspended`, `mfaCoverage`, `activeSessions`) | `BACKOFFICE_ADMIN_MANAGE` (nouvelle) |
| P7 | POST | `/admin/admins` | `{ identifier, displayName }` | `201` compte `invited` ; `400` ordre de gardes : identifiant obligatoire, format `prenom.nom@sira.app`, nom obligatoire, nom ≤ 100, identifiant libre (« Cet identifiant existe déjà ») | idem |
| P8 | POST | `/admin/admins/{id}/suspend` | `{ reason }` | compte `suspended` ; **révoque toutes les sessions actives** (motif « Compte suspendu ») ; `{ revokedSessions }` | idem |
| P9 | POST | `/admin/admins/{id}/reactivate` | `{ reason }` | compte `active` ; sessions **non restaurées** | idem |
| P10 | POST | `/admin/admins/{id}/reset-totp` | `{ reason }` | `totpEnabled=false`, `totpEnrolledAt=null`, `recoveryCodesRemaining=0`, sessions révoquées (« TOTP réinitialisé ») | idem |
| P11 | POST | `/admin/admins/{id}/revoke-sessions` | `{ reason }` | `{ revoked: n }` ; sessions révoquées avec le motif | idem |

  Ordre des gardes (à reproduire, messages exacts) : *suspend* → compte existe (« Administrateur introuvable »), motif (« Un motif est obligatoire » / « Motif invalide » / « Motif trop long (500 caractères maximum) »), pas soi-même (« Impossible de suspendre son propre compte »), statut `active` (« Le compte n'est pas actif »), pas le dernier actif (« Impossible de suspendre le dernier administrateur actif ») ; *reactivate* → existe, motif, statut `suspended` (« Le compte n'est pas suspendu ») ; *reset-totp* → existe, motif, pas soi-même (« Impossible de réinitialiser son propre TOTP »), `active`, TOTP actif (« Aucun TOTP à réinitialiser ») ; *revoke-sessions* → existe, motif, pas soi-même (« Pour tes propres sessions, utilise ton profil »), au moins une session active (« Aucune session active à révoquer »).
- **Règles métier** : machine à états `invited → active` (par enrôlement TOTP + 1ʳᵉ connexion, **non spécifiée dans l'UI**), `active ⇄ suspended` ; pas de suppression ; le dernier administrateur actif ne peut pas être suspendu ; motif conservé dans le journal ; chaque action écrit « Administrateur {id} suspendu ({n} session(s) révoquée(s)). Motif : … », « Administrateur invité : {id} », « Administrateur {id} réactivé. Motif : … », « TOTP de {id} réinitialisé ({n} session(s) révoquée(s)). Motif : … », « {n} session(s) de {id} révoquée(s). Motif : … ». Les adresses IP ne sont jamais affichées en entier.
- **État côté API** :
  - P6–P11 ❌ — **aucun concept de « compte administrateur du backoffice »** dans les services. `identity-service` a `User` (champs `status`, `lastLoginAt`, `roleId`, `isManager`), des rôles (`ADMIN`, `MANAGER`, …) et `PATCH /api/users/{id}/role` (`UserAdminController`), mais pas de liste (`GET /api/users` absent), pas de suspension, pas d'invitation, pas de TOTP, pas de révocation de sessions. Contrôleurs vérifiés : `AuthController`, `MeController`, `UserAdminController`, `RoleController`, `PermissionController`, `InternalUserController`.
  - Recommandation : porter cela dans **identity-service** (comptes de type `BACKOFFICE`, `MfaMethod`, `UserSession`, `LoginAttempt` déjà modélisés au dbml) plutôt que de créer un service ; nouvelle permission dédiée (cf. Questions ouvertes).

### Sécurité — `/parametres/securite`

- **Fonctionnalités** :
  - **Score de sécurité de l'équipe** (jauge %, légende : ≥ 80 « Posture solide », ≥ 60 « À renforcer », sinon « Action requise »).
  - **Couverture** : 6 tuiles — Couverture 2FA (% des comptes actifs), Sessions actives, Inactifs 30 j+ (comptes actifs), Actifs (sur total), Invités, Suspendus.
  - **Comptes à surveiller** : liste des administrateurs ayant ≥ 1 risque (nom + risques), lien « Gérer l'équipe ».
  - **Politiques appliquées** : 6 cartes statiques (TOTP obligatoire, sessions de 8 heures, contacts masqués avec révélation journalisée, motif obligatoire, garde-fous, journal en lecture seule) — texte statique, **doit refléter la configuration réelle** (durée de session, nombre de codes, seuil 3, inactivité 30 j).
  - Compteur rouge sur l'onglet Sécurité = nombre de comptes à risque.
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| total, active, invited, suspended | int | non | | calculé API |
| mfaCoverage | int % | oui | actifs avec TOTP / actifs, `null` si aucun actif | |
| activeSessions | int | non | sessions actives de toute l'équipe | |
| lowCodes | int | non | actifs avec TOTP et < 3 codes | |
| idle | int | non | actifs sans connexion > 30 j | |
| score | int 0–100 | non | 100 − [ (non-MFA/actifs)×50 + (lowCodes/actifs)×20 + (idle/actifs)×20 + min(10, invités×5) ], plancher 0 | formule à figer dans l'API |
| atRisk[] | `AdminCard` avec `risks[]` | non | | |

- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|---|
| P12 | GET | `/admin/admins/security-posture` | — | objet ci-dessus + `atRisk[]` | `BACKOFFICE_ADMIN_MANAGE` |

- **Règles métier** : lecture seule ; paramètres de politique (30 jours, 3 codes, 8 h) à exposer plutôt que dupliquer dans le front.
- **État côté API** : P12 ❌ (dépend de P6–P11 ; calculable à partir de la liste des comptes). Service : **identity-service**.

### Journal du backoffice — `/parametres/journal-backoffice`

- **Fonctionnalités** :
  - Bandeau de 4 statistiques : Entrées sur 7 jours, Acteurs sur 7 jours (distincts), Révélations sur 30 jours (« données personnelles »), Entrées affichées (après filtres).
  - Recherche (`?q=`, ≤ 80 car., sur acteur, action, nom de compagnie), filtres **Acteur** (`?acteur=`, liste des acteurs existants), **Période** (`?jours=` : toute la période, 7, 30, 90), **Type** (`?type=revelations` : « Révélations de données » = action contenant « révélé(e) », insensible casse).
  - Liste **chronologique inversée**, **groupée par jour** (en-tête « jour de semaine jj mois » + « n action(s) »), chaque ligne : icône par type (révélation, suspension/réactivation, invitation, sécurité TOTP/codes, session, autre), texte de l'action, « acteur · compagnie », heure `hh:mm`.
  - **Pagination côté Next** : 20 par page (`?page=`), plafond de **500** entrées chargées (`JOURNAL_LIMIT`) puis filtrage/pagination en mémoire → **l'API doit offrir filtres et pagination serveur** (le plafond de 500 est une limite de la maquette).
  - Lecture seule : aucune modification ni suppression d'entrée ; aucune donnée personnelle dans les libellés.
- **Modèle de données attendu** :

| Champ | Type | Nullable | Valeurs / format | Source / commentaire |
|---|---|---|---|---|
| id | string/uuid | non | | |
| at | datetime | non | | |
| actor | string | non | identifiant de l'administrateur (`prenom.nom@sira.app`) | acteur = compte backoffice |
| action | string (FR) | non | texte libre sans donnée personnelle | aujourd'hui du texte ; idéalement `{ actionCode, entityType, entityId, params }` + libellé calculé |
| companyName / companyId | string / uuid | oui | compagnie concernée si pertinent | |
| kind (déduit) | `reveal`\|`suspend`\|`invite`\|`security`\|`session`\|`other` | non | aujourd'hui déduit par mots-clés du texte (« révélé », « suspendu/réactivé », « invité », « totp/code », « session ») → l'API doit fournir un `kind`/`actionCode` explicite | |
| isReveal | bool | non | action de révélation de contact | filtre `type=revelations` |
| stats | `{ entries7d, actors7d, reveals30d }` | non | | calculé API |

  Actions écrites par le backoffice (à journaliser côté API, exemples exacts du code) : invitation, suspension, réactivation, réinitialisation TOTP, révocation de sessions (admin et titulaire), régénération des codes, modification du nom, ainsi que toutes les actions sensibles des autres écrans (révélation d'e-mail/téléphone, forçage d'activation, etc. — voir fichiers de périmètre des autres domaines).
- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|---|
| P13 | GET | `/admin/activity-log` | `actor?`, `days?` (7\|30\|90), `type?=reveal`, `q?`, `page`, `size` (20) ; tri fixé `at desc, id` | page d'entrées | `BACKOFFICE_ADMIN_MANAGE` ou `COMPLIANCE_READ` + plateforme |
| P14 | GET | `/admin/activity-log/stats` | — | `{ entries7d, actors7d, reveals30d }` | idem |
| P15 | GET | `/admin/activity-log/actors` | — | `string[]` triés | idem |

- **Règles métier** : journal **en ajout seul** (pas d'UPDATE/DELETE) ; toute action du backoffice produit une entrée (écrite par l'API qui exécute l'action, dans la même transaction, jamais depuis le navigateur) ; aucune donnée personnelle ; la lecture du journal est elle-même une donnée sensible (accès réservé).
- **État côté API** :
  - P13 ⚠️ — `audit-compliance-service` `GET /audit-logs` (`AuditLogController`) : lecture seule, plateforme, filtres `companyId, entityType, entityId, actorUserId, action(enum), from, to, sourceService`, page 20/100 max, tri serveur. **Manque** : recherche texte `q`, filtre par identifiant d'acteur lisible (seulement `actorUserId` UUID), libellé FR / `kind` explicite, nom de compagnie, marqueur « révélation de donnée » (les révélations relèvent de `DataAccessLog` : `GET /data-access-logs`, `DataAccessLogController`, ⚠️ à croiser). Le canal d'écriture existe : topic Kafka `audit.events` (contrat `AuditEventPayload`), mais **le backoffice n'est pas un producteur** et il n'y a pas de `sourceService="backoffice"`.
  - P14, P15 ❌ — non exposés (agrégats 7/30 j, liste d'acteurs distincts).
  - Service propriétaire recommandé : **audit-compliance-service** (journal d'audit transverse, immuable par triggers) ; les événements d'identité (suspension, TOTP, sessions) sont émis par **identity-service** sur `audit.events` (déjà producteur : `REGISTER`/`LOGIN`/`PERMISSION_CHANGE`), les actions de lecture/révélation par le service qui expose la donnée.

### Préférences — `/parametres/preferences`

- **Fonctionnalités** :
  - **Apparence** : thème Clair / Sombre / Système (`next-themes`, mémorisé dans le **navigateur** — pas d'API) ; la barre latérale mémorise son état replié dans `localStorage` (`sira-sidebar-collapsed`).
  - **Session** (lecture seule) : connecté en tant que {identifiant}, durée de session « 8 heures », authentification « Mot de passe + TOTP », environnement « Démonstration (données fictives) » (valeurs statiques à rendre dynamiques).
  - **Confidentialité** (texte statique) : contacts masqués avec révélation journalisée, IP tronquées à l'affichage, journal sans donnée personnelle, motif obligatoire sur actions sensibles.
- **Modèle de données attendu** : aucune donnée serveur aujourd'hui ; `GET /admin/me` fournit l'identifiant. Optionnel : `GET /admin/config` pour `{ sessionHours: 8, idleMinutes: 15, environment }` afin de ne pas coder ces constantes en dur.
- **Endpoints requis** :

| ID | Méthode | Chemin proposé | Paramètres | Réponse | Permission |
|---|---|---|---|---|---|
| — | — | aucun endpoint requis (thème côté navigateur) | | | |

- **Règles métier** : préférences par appareil, non synchronisées ; si l'équipe souhaite une préférence par compte (thème, langue), il faudra `GET/PATCH /admin/me/preferences` (hors besoin actuel).
- **État côté API** : sans objet (aucun endpoint requis).

---

## Navigation (`src/lib/nav.ts`, `docs/sitemap.md`)

- **Fonctionnalités** : barre latérale à 11 entrées de premier niveau, toutes `implemented: true` — Tableau de bord `/`, Compagnies `/compagnies`, Offre et facturation `/offre-facturation`, Utilisateurs et accès `/utilisateurs-acces`, Flotte `/flotte`, Ventes et paiements `/ventes`, Colis et clients `/colis-clients`, Communication `/communication`, Conformité et audit `/conformite`, Supervision `/supervision`, Paramètres `/parametres` ; pages cachées : `/recherche`, `/compagnies/kyc`. Fil d'Ariane déduit du chemin (table `SEGMENT_LABELS`), palette ⌘K listant ces pages. `isKnownPath` sert de garde de test. Sidebar repliable, bouton thème et déconnexion dans le pied de barre.
- **Modèle de données / endpoints** : aucun (statique). Le `docs/sitemap.md` (validé le 2026-11-01) décrit un découpage plus fin (`/facturation/...`, `/offre/...`, `/acces/...`) que la navigation implémentée (entrées regroupées en pages à onglets) ; il s'agit d'un écart de documentation, pas d'API.
- **Règles métier / API** : aujourd'hui **toutes les entrées sont visibles pour tout administrateur** (un seul niveau). Si des rôles/permissions de backoffice apparaissent, l'API devra fournir `permissions[]` dans `GET /admin/me` pour masquer entrées et routes et alimenter `/acces-refuse`.
- **État côté API** : sans objet (couvert par A5).

---

## Synthèse des écarts

| Endpoint ou donnée manquante | Service recommandé | Priorité | Commentaire |
|---|---|---|---|
| A2 `POST /admin/auth/mfa/verify` + A6 enrôlement TOTP (secret chiffré, 8 codes de récupération, verrouillage 5 essais) | identity-service | haute | Bloque la connexion réelle ; `MfaMethod` au dbml, non implémentée |
| A1 login en deux étapes (jeton intermédiaire 5 min), restriction aux comptes `BACKOFFICE`, verrouillage/anti-bruteforce | identity-service | haute | `/api/auth/login` existe mais sans MFA ni audience |
| A3/A4/A5 refresh/logout avec motif (`idle`), `GET /admin/me` avec `permissions[]` | identity-service | haute | JWT identity ≤ 15 min vs session 8 h |
| Notion de compte administrateur du backoffice : P6–P11 (liste, invitation, suspension, réactivation, reset TOTP, révocation de sessions) | identity-service | haute | Aucun `GET /api/users`, aucune suspension ; statuts `active`/`suspended`/`invited` à ajouter |
| P1–P5 sessions et profil de l'administrateur connecté (liste, révocation, renommage, codes de récupération) | identity-service | haute | `UserSession` existe en base, aucun endpoint |
| P12 posture de sécurité de l'équipe (score, couverture 2FA, risques) | identity-service | moyenne | Calculable depuis P6 ; formule à figer côté API |
| P13–P15 journal d'activité du backoffice (filtres acteur/période/type, q, pagination, stats, acteurs, `kind`, compagnie) + backoffice producteur `audit.events` | audit-compliance-service | haute | `GET /audit-logs` couvre la lecture brute ; manquent `q`, libellés/`kind`, révélations, nom de compagnie |
| Permissions backoffice (`BACKOFFICE_ACCESS`, `BACKOFFICE_ADMIN_MANAGE`) et `/acces-refuse` branché sur `403` | identity-service | moyenne | Aujourd'hui un seul niveau « Administrateur » |
| D1 `GET /admin/dashboard` (agrégat) | nouveau composant BFF sans base (ou gateway) | haute | Évite 18 appels navigateur ; respecte database-per-service |
| D2 `GET /admin/companies/stats` ; D17 documents KYC en attente tous tenants | company-service | haute | `GET /companies` sans filtre ni comptage ; KYC par compagnie seulement |
| D3/D4 abonnements `past_due` et MRR/mix de plans, cross-compagnie | company-service | haute | Souscriptions listées par compagnie seulement |
| D5/D6/D10/D11 statistiques de réservations, entonnoir, échecs de paiement, réservations en ligne expirantes, paiements bloqués ; `passengerName`/`companyName`/canal dans la liste | booking-service | haute | `GET /bookings` brut |
| D7 statistiques colis (statuts, retards) | parcel-service | moyenne | |
| D8/D9 statistiques de flotte, trajets à venir (filtres `upcoming`/`status`, villes, compagnie) | fleet-service | moyenne | |
| D14 historique de santé 24 h (frise, p50/p95, uptime %) | monitoring-service | moyenne | Seule la dernière ligne est exposée |
| D15 filtre multi-statut/`open=true` sur `/incidents` ; MTTR | monitoring-service | basse | |
| D16 multi-statut, tri `dueDate`, `requesterName` sur DSR | audit-compliance-service (nom via identity-service) | basse | Nom = donnée personnelle |
| D18 journal d'activité lisible (libellé, compagnie, exclusion backoffice) | audit-compliance-service | moyenne | |
| S1 recherche globale fédérée (11 types, 2–100 car., refus e-mail/téléphone, rangs 0–3) | BFF + `…/search` par service | haute | Index sur codes/noms uniquement |
| `GET /api/users` / recherche de comptes plateforme (type `user`) | identity-service | moyenne | |
| S2 `GET /admin/companies/names` | company-service | basse | |
| Configuration exposée (durée de session, inactivité, seuils) | identity-service / BFF | basse | Évite des constantes dupliquées dans le texte des politiques |

## Questions ouvertes

1. **Où vivent les comptes du backoffice ?** Recommandation : `identity-service` (rôle/type `BACKOFFICE` ou rôle `ADMIN`) ; alternative : un service dédié `backoffice-admin-service`. Le dbml (`User`, `MfaMethod`, `UserSession`, `LoginAttempt`) plaide pour identity. Faut-il isoler le domaine de connexion (realm, audience JWT distincte, durée de session 8 h) des comptes clients et du personnel de compagnie ?
2. **Identifiant de connexion** : le backoffice impose `prenom.nom@sira.app` ; identity utilise `username` + `email`. Le domaine `@sira.app` est-il contraint pour tous les admins ?
3. **Niveaux d'administration** : un seul niveau aujourd'hui (seul `admin@sira.app` peut écraser un fichier soumis, cf. `isBackofficeAdmin`). Veut-on des permissions fines (`BACKOFFICE_ACCESS`, `BACKOFFICE_ADMIN_MANAGE`, lecture seule) et un menu filtré par permissions ? Impacte l'écran `/acces-refuse`.
4. **Cycle de l'invitation** : le backoffice n'envoie aucun e-mail, n'a aucun écran d'activation (définition du mot de passe, enrôlement TOTP). Qui envoie l'invitation (notification-service ?) et quel est le lien/durée de validité ?
5. **Dashboard : BFF ou agrégats par service ?** Faut-il un composant d'agrégation (nouveau service sans base) ou chaque service expose-t-il `/admin/.../stats` et le Next.js (server actions) compose-t-il ? Impacts : latence, résilience (dégradation partielle d'un bloc), auth inter-services.
6. **Devises** : KPI de CA en **XOF uniquement** ; que faire des compagnies/abonnements en EUR/USD (conversion, ligne séparée) ? Le MRR exclut déjà les devises ≠ XOF.
7. **Données personnelles dans le dashboard** : `passengerName` (réservations récentes) et `requesterName` (RGPD) sont des noms d'affichage ; acceptable pour le backoffice ou à masquer ? Si masqué, journaliser la révélation.
8. **Journal du backoffice vs journal d'audit** : doit-il être le même stockage (`AuditLog` filtré par `sourceService`/`entityType`) ou une vue dédiée ? Les « révélations de données » sont-elles des `DataAccessLog` ou des `AuditLog` ? Quelle rétention (ligne `Company.data_retention_days` inadaptée à un journal d'équipe) ?
9. **Pagination** : l'équipe d'administrateurs est affichée sans pagination (quelques comptes) ; le journal est plafonné à 500 puis paginé en mémoire. Valider la pagination serveur (page/size, tri `at desc`) et le plafond de taille de page (20 / 100).
10. **Fenêtre de comparaison des deltas** : « période précédente » = même longueur immédiatement avant ; confirmer. Sélecteur limité à 7/14/30 j : l'API doit-elle accepter une fenêtre libre (`from`/`to`) ?
11. **Recherche** : type `user` (comptes plateforme) et `customer` (comptes clients) nécessitent des endpoints staff de liste/recherche qui n'existent pas ; la recherche doit-elle être filtrée selon les permissions de l'appelant (ex. ne pas renvoyer des factures à un admin sans droit billing) ? Journaliser les recherches sur identifiants de personnes ?
12. **Palette** : la liste complète des noms de compagnies est chargée à chaque rendu du layout ; au-delà de quelques centaines de compagnies, passer à une recherche serveur avec anti-rebond.
13. **Constantes de session** : durée 8 h, inactivité 15 min (client), seuil d'inactivité de compte 30 j, 3 codes minimum, 5 essais TOTP, 8 codes de récupération — valeurs à confirmer et à exposer par la configuration plutôt que codées en dur dans le texte des « Politiques appliquées ».
14. **Accès refusé** : la page n'est reliée à aucun refus aujourd'hui ; quel statut HTTP/redirect l'API doit-elle provoquer (403 → `/acces-refuse`, 401 → `/session-expiree`) ?
15. **Suspension d'un compte avec sessions actives** : le jeton JWT d'accès déjà émis reste valide jusqu'à 15 min (dette connue d'identity) — acceptable, ou vérification de révocation par requête pour le backoffice ?
