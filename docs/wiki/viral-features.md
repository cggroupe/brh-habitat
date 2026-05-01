# BRH Habitat — Viral Features

> Source : migration `20260403400000_viral_features` + `PARTNER-PLATFORM-V2-ADDENDUM` (11 features A1-A11) + `src/api/` (social-posts, affiliates, rewards, badges).
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

Features virales pour maximiser l'acquisition de prospects via les partenaires pro et particuliers. Mélange de **gamification** (badges, points, leaderboard), **partage social** (simulation, QR codes, posts) et **cashback** (récompenses).

## Tables dédiées

### Simulations partagées
- `brh_simulation_shares` — Simulation chiffrée partageable par code court
- `brh_simulation_leads` — Leads capturés (INSERT public `true` — visiteurs anonymes)

### Social
- `brh_social_posts` — Posts générés pour Facebook/Instagram/LinkedIn
- Bucket `social-screenshots` pour preuves partage

### Gamification
- `brh_badges` — Catalogue badges (SELECT public `true`)
- `brh_user_badges` — Badges débloqués par user
- `brh_affiliates` — Affiliés particuliers (parrainage)
- `brh_points_transactions` — Ledger points (crédit/débit)
- `brh_rewards_catalog` — Catalogue récompenses
- `brh_reward_claims` — Réclamations de récompenses

### Config
- `brh_platform_settings` — Config viral (thresholds, pourcentages cascade, etc.)

## 11 Features A1-A11 (V2 Addendum 2026-04-03)

> Ordre d'implémentation recommandé : A2 → A11 → A1 → A5 → A7 → A6 → A3 → A4

### A1 — Simulation partagée (priorité 3)
Un particulier/pro fait une simulation (rénovation) → génère un lien court partageable → visiteur anonyme peut consulter et s'enregistrer comme lead.

**Tables** : `brh_simulation_shares`, `brh_simulation_leads`

**Flow** :
```
User → /simulation → remplit formulaire
  → POST brh_simulation_shares { owner_user_id, simulation_data JSONB, short_code }
  → URL partagée : brh.fr/s/{short_code}
  → Visiteur anonyme clique → page publique
  → Formulaire de capture lead
  → INSERT brh_simulation_leads (INSERT public true, ip_hash pour anti-spam)
  → Notif au pro owner : "Nouveau lead depuis votre simulation"
  → Points attribués au pro owner
```

**Correction appliquée (audit v7)** : `brh_simulation_leads INSERT (true)` → monitorer spam via `ip_hash` rate limit.

### A2 — Code court (priorité 1, intégré dès Phase 4) ✅ DONE
Chaque particulier a un **code court unique** (ex: `brh.fr/p/AB12CD`) qui redirige vers sa simulation/portail avec tracking.

**Table** : colonnes `referral_code` (long, `BRH-XXXXXXXX`) + `short_code` (6 chars) sur `brh_affiliates`. Génération auto à la création du profil par `handle_new_user()`.

**Flow** :
```
Visiteur → brh.fr/p/JEAN123
  → lookup affiliate/company par referral_code
  → redirect vers /simulation avec ?ref=JEAN123
  → tracking dans le storage
  → si lead créé : attribution au ref owner
```

### A3 — Leaderboard mensuel (priorité 7)
Classement mensuel des pros et particuliers par CA apporté / prospects amenés.

**Table** : `brh_monthly_leaderboard` (table, **PAS MATERIALIZED VIEW** — refresh par EF cron) — voir correction addendum

**Flow** :
```
EF leaderboard-refresh (cron nocturne) :
  - Aggrégation brh_quotes signed du mois
  - Classement par company_id
  - INSERT brh_monthly_leaderboard (month, rank, company_id, ca_cents)
Page /leaderboard : affiche top 10 + position current user
```

### A4 — Challenges par commune (priorité 8)
Challenges géographiques : "Quelle commune apporte le plus de prospects ce mois ?"

**Tables** : colonne `city` sur `brh_companies` + potentiellement `brh_commune_challenges`

### A5 — Countdown promos (priorité 4)
Affichage compte à rebours pour offres/promotions limitées dans le temps (augmente conversion).

**Tables** : `brh_platform_settings` pour config promos

### A6 — Social posts (priorité 6)
Génération auto de posts pour Facebook/Instagram/LinkedIn avec image + texte (Open Graph, tracking URL court).

**Tables** : `brh_social_posts`
**Bucket** : `social-screenshots`
**EF** : `ai-proxy` (mode `social-post`) pour génération texte par IA

### A7 — Cashback progressif (priorité 5)
Cashback sur commissions reversées au pro qui atteint certains seuils (ex: 10 prospects = +2% bonus sur 3e).

**Tables** : `brh_points_transactions` (type='cashback') + logique dans trigger `update_company_ca()`

### A8-A10 — (features additionnelles du V2 addendum)

### A11 — QR code pro (priorité 2, intégré dès Phase 4)
Chaque pro peut générer un QR code unique pointant vers sa page portail / simulation.

**Feature gate** : `qrCodeGeneration` (activé dans tier `starter`, `pro`, `enterprise`)
**Page** : `/pro/qr-code`
**Librairie** : `qrcode.react` ou équivalent (client-side)
**Composant** : `components/pro/QRCodeDownload.tsx`

## Gamification — Badges

### `brh_badges` (catalogue SELECT public)
```
id                  UUID PK
code                TEXT UNIQUE (ex: 'first_prospect', 'gold_level', 'rising_star')
name                TEXT
description         TEXT
icon_url            TEXT
points_threshold    INTEGER (optionnel — unlock auto via points)
```

### `brh_user_badges`
```
user_id, badge_id, unlocked_at
UNIQUE (user_id, badge_id)
```

### Triggers unlock
- Atteinte seuil points → badge auto
- Premier prospect → badge `first_prospect`
- Level 'gold' → badge `gold_level`
- etc.

## Gamification — Points

### `brh_affiliates` (schéma vérifié)
```
id                   UUID PK = profiles.id
referral_code        TEXT UNIQUE  (ex: 'BRH-XXXXXXXX')
short_code           TEXT UNIQUE  (ex: 'AB12CD') ⭐ feature A2 intégré dès la création
points_balance       INTEGER      (solde courant)
total_points_earned  INTEGER      (cumul historique)
level                TEXT         ('standard'/'bronze'/'silver'/'gold'/'platinum')
```

> ⚠ Colonnes réelles : `points_balance` et `total_points_earned` (pas `total_points` unique). Création auto par `handle_new_user()` pour chaque particulier avec génération auto de `referral_code` + `short_code` (via `md5(random())`).

### `brh_points_transactions` (ledger)
```
id, affiliate_id, type ('earned'/'redeemed'/'expired')
points INTEGER, reason TEXT, reference_id UUID?
created_at TIMESTAMPTZ
```

### Triggers
- `award_affiliate_points()` — sur quote signée apportée par affiliate
- `calculate_total_points()` — MAJ `brh_affiliates.total_points`

## Rewards / Cashback

### `brh_rewards_catalog`
```
id, name, description, points_cost INTEGER, stock INTEGER, is_active, image_url
```

### `brh_reward_claims`
```
affiliate_id, reward_id, points_spent INTEGER, status ('pending'/'shipped'/'delivered'/'refused'), claimed_at
```

### Flow
```
Affilié → /particulier/catalogue (gated catalogueCadeaux)
  → Choisit reward
  → POST brh_reward_claims { affiliate_id, reward_id, points_spent }
  → Trigger : débite brh_points_transactions (type='redeemed', points=-points_cost)
  → Admin voit dans /admin/claims
  → Admin UPDATE status='shipped' → envoie cadeau physique
  → UPDATE status='delivered'
```

## Feature gates (config tier)

| Feature | Tier activation | Page |
|---------|-----------------|------|
| `qrCodeGeneration` | starter+ | `/pro/qr-code` |
| `simulationLinks` | pro+ | `/particulier/parrainages` |
| `socialMediaPosts` | pro+ | `/pro/social`, `/particulier/social` |
| `badgesGamification` | pro+ | `/particulier/badges` |
| `catalogueCadeaux` | pro+ | `/particulier/catalogue` |
| `recruitmentPyramid` | pro+ (restreint) | `/pro/parrainage` |

## Sécurité / anti-spam

### `brh_simulation_leads` INSERT public
- **Rate limit IP** via `ip_hash`
- **Captcha** recommandé sur formulaire public (non vérifié dans code — à ajouter ?)
- **Monitoring admin** : alerte si pic de leads d'une même IP

### Storage `social-screenshots`
- Scopé par `company_id`
- Upload limité taille (~2MB)

### Points anti-fraude
- Transactions en ledger (append-only) — jamais d'UPDATE points direct
- Triggers vérifient cohérence (pas de points négatifs)

## Statut d'implémentation (2026-04-23)

| Feature | BDD | API | UI | Statut |
|---------|-----|-----|----|---------| 
| A1 Simulation partagée | ✅ | ✅ | 🟡 | BDD prête, UI partielle |
| A2 Code court | ✅ (`referral_code`) | ✅ | 🟡 | Utilisé, page dédiée à finaliser |
| A3 Leaderboard | ❌ (table à créer) | ❌ | ❌ | À implémenter (EF cron) |
| A4 Challenges commune | 🟡 | ❌ | ❌ | Colonne `city` OK, logique à faire |
| A5 Countdown promos | ❌ | ❌ | ❌ | À implémenter |
| A6 Social posts | ✅ | ✅ (`social-posts.ts`) | ✅ | Routes `/pro/social`, `/particulier/social` |
| A7 Cashback | 🟡 | 🟡 | ❌ | Ledger prêt, logique cashback à ajouter |
| A11 QR code pro | — | — | ✅ | `/pro/qr-code` opérationnel |
| Badges | ✅ | ✅ (`badges.ts`) | 🟡 | Catalog OK, unlock auto à raffiner |
| Points ledger | ✅ | ✅ (`affiliates.ts`) | 🟡 | Transactions OK, UI partielle |
| Rewards catalog | ✅ | ✅ (`rewards.ts`) | 🟡 | Backend OK, UI catalogue à polir |

## Corrections appliquées (audit addendum V2)

| Finding | Correction |
|---------|-----------|
| Nommage tables sans préfixe | `brh_*` |
| Montants en DECIMAL | INTEGER cents |
| `settings` global | `brh_platform_settings` |
| Routes API Next.js | SPA Vite — utiliser Edge Functions |
| `MATERIALIZED VIEW` leaderboard | Table `brh_monthly_leaderboard` + refresh EF cron |

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy). Synthèse des 11 features A1-A11 + statut réel.
