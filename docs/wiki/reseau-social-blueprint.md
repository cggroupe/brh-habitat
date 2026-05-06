# Réseau social pro `/reseau` — Blueprint architecture (Phase 18)

> **Status** : 📐 Blueprint cadré 2026-05-06 (Phase 18 Étape 1/12 livrée). Aucun code écrit à ce jour.
>
> Voir aussi : [reseau-social-status.md](reseau-social-status.md) (statut livraison), [log.md](log.md#2026-05-06--phase-18-étape-1--audit-autaf--blueprint), plan source `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md`.

---

## 1. Vision & objectif

Couche réseau social B2B `/reseau` transverse à 4 personae (agences immo, artisans RGE, architectes, apporteurs d'affaires) ancrée Bretagne (dépts 22/29/35/56/44 — 44 inclus par décision identitaire 06/05).

**Killer feature** : marketplace de chantiers (proposer un chantier → matching auto → candidatures → commission 5 % HT tracée). Le fil d'actualité et le graphe social sont des **vecteurs d'usage**, pas la fin.

**Différenciateur vs LinkedIn / Habitatpresto / Facebook groupes BTP / Kelvin°** : combo **vertical rénovation + ancrage breton + commission tracée** absent de la concurrence.

**Objectif** : MVP utilisable Étape 6 (4 sem), produit monétisable Étape 12 (~14-16 sem incluant bootstrap).

---

## 2. Décisions stratégiques actées (06/05/2026)

| # | Décision | Implication code |
|---|---|---|
| 1 | Portail unifié `/reseau` (pas onglet par persona) | `ReseauGuard` accepte tout `brh_partner_contracts.status='active'` |
| 2 | `partner_type` extensible | CHECK étendu : `agence_immo, artisan, architecte, maitre_oeuvre, apporteur_affaires, courtier, syndic, autre` |
| 3 | Endorsements only V1 (pas notes 1-5) | Recommandations positives uniquement, réversible plus tard |
| 4 | Floutage plaques + visages **manuel UI** | Éditeur Canvas client-side. 2 versions stockées (`_original.jpg` privé / `_public.jpg` floutée). Champ `media_blur_zones JSONB` |
| 5 | Visibilité publique par défaut | `visibility DEFAULT 'public'` — viralité maximale |
| 6 | Commission 5 % HT simple sur devis signé | Réutilise trigger `calculate_commission` + `brh_commission_invoices` existants |
| 7 | Multi-tenant ready Option B | `tenant_id UUID NOT NULL` partout V1, 1 tenant `brh` actif. Bretagne pour BRH, France pour AUTAF V2 |
| 8 | Loire-Atlantique 44 dans la Bretagne BRH | `BRETAGNE_DEPARTMENTS = ['22','29','35','56','44']` |

---

## 3. Architecture AUTAF — bridge API (pas migration)

**Décision structurante** : AUTAF (WordPress OVH 91.134.134.73, plugin `autaf-core` API `autaf/v1`) **n'est pas migré** sur Supabase. BRH reste autonome avec un bridge API.

```
profiles ────┬──── brh_partner_contracts (4 personae × 8 partner_types)
             │       └── tenant_id ('brh' V1, 'idf'/'paca' V2)
             │
             └──── brh_autaf_link
                     ├── autaf_user_id
                     ├── oauth_access_token (chiffré)
                     ├── scopes (read_recommendations, write_posts, write_chantiers)
                     └── last_sync_at

[BRH Supabase] ◄── webhook ── [AUTAF WordPress autaf/v1] ── poll/push
```

### Cas d'usage bridge V1 (Étape 8)
- Profil pro BRH affiche les **recommandations AUTAF read-only** si bridge actif
- Chantier BRH est **cross-postable sur AUTAF** (1 clic → AUTAF API)
- Connexion réseau cross-plateforme **si les 2 ont profil AUTAF connecté**
- OAuth flow vers AUTAF dans `/reseau/parametres/autaf`

### Dépendance Étape 8
Confirmer avec dev Genesii (WordPress AUTAF) la dispo des endpoints AUTAF avant Étape 8 :
- `POST /autaf/v1/oauth/authorize` + `POST /autaf/v1/oauth/token`
- `POST /autaf/v1/posts` (cross-post BRH → AUTAF)
- `POST /autaf/v1/chantiers` (cross-post chantier)
- `GET /autaf/v1/recommendations/:user_id` (read-only)

Si endpoints non dispos S+5 → reporter Étape 8 sans bloquer Étape 7 marketplace.

---

## 4. Modèle de données (11 tables nouvelles)

| Table | Rôle |
|---|---|
| `brh_pro_connections` | Graphe symétrique (requester/recipient/status accepted-pending-declined-blocked) |
| `brh_pro_follows` | Follow asymétrique style Twitter (follower/followed/created_at) |
| `brh_feed_posts` | Posts internes (8 post_type) + `tenant_id` + `visibility` + `media_urls[]` + `media_blur_zones JSONB` |
| `brh_feed_reactions` | Like / recommande / expert (PK = post_id + pro_id + type) |
| `brh_feed_comments` | Threadés via `parent_comment_id` |
| `brh_feed_impressions` | **Observabilité algo (emprunté AUTAF ENGINE V2)** — view/scroll/click event partitionné par mois |
| `brh_pro_endorsements` | Capital social mesurable (endorser, endorsed, métier_tag, optionnel chantier_offer_id comme preuve) |
| `brh_chantier_offers` | **KILLER feature marketplace** — title, métiers cherchés, lat/lng, budget_cents, contract_mode, commission_offer_pct |
| `brh_chantier_applications` | Candidatures (applicant_pro_id, message, devis_url, status) |
| `brh_autaf_link` | Bridge AUTAF (oauth_access_token chiffré, scopes, last_sync_at) |
| `brh_feed_reports` | Modération signalements (reporter_pro_id, post_id, reason, status) |

### post_type (CHECK constraint)
`photo_chantier, realisation, recommandation, question_metier, recherche_partenaire, annonce_chantier, actu, autre`

### Patterns techniques obligatoires
- INTEGER cents (règle anti-bug #2) : `budget_cents`, `commission_amount_cents`, `commission_offer_pct INTEGER`
- TIMESTAMPTZ partout (règle #11)
- 100% RLS, jamais `USING(true)` (règle #8) sauf exception documentée
- Helpers SECURITY DEFINER avec `SET search_path = ''` (règle #12) : `brh_user_pro_id()`, `brh_pro_can_view_post(post_id)`, `brh_pro_in_network(viewer, target)`
- Indexes critiques : `(tenant_id, created_at DESC)` sur `brh_feed_posts`, `(viewer_pro_id, post_id)` sur `brh_feed_impressions`

---

## 5. Algorithme feed V1 — déterministe (simplifié AUTAF V2)

Audit AUTAF (Étape 1) a livré 8 composantes scoring AUTAF V2. **Phase 18 V1 garde 5/8** (skip momentum + creator_trust + prediction ML, différés V2).

```
score = recency_decay (1/(age_h+1)^1.2) * 10
      + 30 si auteur dans mon réseau (connection accepted)
      + 15 si même département
      + 10 si métier_tag ∈ mes_metiers_complémentaires
      + 25 si post_type = 'annonce_chantier' AND je matche métiers
      + 5 par like (cap 50)
      - 50 si déjà vu (`brh_feed_impressions`)
```

**Recency curve BTP adaptée** (emprunté AUTAF V2) : demi-vies plus longues que réseaux classiques (12-120h selon `post_type`) — un chantier reste pertinent 5 jours, un like 12 h.

Code cible : `src/lib/reseau/feed-algo.ts` + `feed-algo.test.ts` (Vitest).

---

## 6. Routes V1 (8 nouvelles)

| Route | Page | Étape |
|---|---|---|
| `/reseau` | `ReseauFeed.tsx` — fil d'actualité | 6 |
| `/reseau/profil/:slug` | `ReseauProfil.tsx` — vitrine pro polymorphe (extension `AgenceVitrinePage`) | 4 (skeleton) → 5 |
| `/reseau/decouvrir` | `ReseauDecouvrir.tsx` — carte Leaflet + filtres | 11 |
| `/reseau/chantiers` | `ReseauChantiers.tsx` | 7 |
| `/reseau/chantiers/nouveau` | `ReseauChantierNew.tsx` | 7 |
| `/reseau/connexions` | `ReseauConnexions.tsx` — pending + suggestions | 5 |
| `/reseau/messages` | `ReseauMessages.tsx` — fusion messageries pro/agence/artisan | 5 |
| `/reseau/parametres/autaf` | `ReseauParamsAutaf.tsx` — OAuth bridge AUTAF | 8 |
| `/admin/reseau-moderation` | `AdminReseauModeration.tsx` | 6 (min) → 9 (avancée) |

---

## 7. Emprunts AUTAF — synthèse audit Étape 1

Sur 23 fichiers `/root/AUTAF_*.md`, le skim de 4 specs prioritaires (ENGINE_V2, SCORE_XP_COINS, NOTIFICATIONS, MESSAGERIE_PRO) donne :

| Source AUTAF | Concept | Verdict | Action Phase 18 |
|---|---|---|---|
| ENGINE V2 | Feed scoring 8 composantes | ✅ Partiel V1 | Garder 5/8 (affinity, quality, recency, diversity, network). Skip momentum + creator_trust V1 |
| ENGINE V2 | Recency curves BTP (demi-vies 12-120h) | ✅ V1 | Adapter dans `feed-algo.ts` |
| ENGINE V2 | Distribution 3 phases (Test/Expand/Full) | ⏸ V2 | Trop de complexité, garder feed simple V1 |
| ENGINE V2 | Schéma `user_events` partitionné par mois | ✅ V1 (renommé) | Cloner en `brh_feed_impressions` (subset 5-8 events au lieu de 52) |
| SCORE_XP_COINS | Système 3 piliers XP/Score/Coins | ⏸ V2 | Pas de gamification V1 |
| SCORE_XP_COINS | Score confiance 6 piliers | ⏸ V2 | Différé V2 (Profil + Réputation à 2 piliers max) |
| NOTIFICATIONS | 28 types × 4 canaux | ✅ Partiel V1 | Réduire à 12 types essentiels, in-app + email seulement (skip Push, WhatsApp) |
| NOTIFICATIONS | Regroupement window_minutes | ✅ V1 | Cloner pattern `group_or_create_notification` dans `brh_notifications` |
| NOTIFICATIONS | Anti-spam (5 emails/jour, 22h-7h silence) | ✅ V1 | Implémenter dans EF `send-notification-email` |
| MESSAGERIE_PRO | Cockpit 6 actions | ✅ Partiel V1 | V1 = 3 actions (Devis, RDV, Appel). Skip Payer + Avis V2 |
| MESSAGERIE_PRO | Statuts BTP 5 états | ✅ V1 | Réutiliser : Disponible / Sur chantier / En déplacement / Hors ligne |
| MESSAGERIE_PRO | Mini-profil tap | ✅ V1 | Cloner pattern Score + badge + avis + ville |
| MESSAGERIE_PRO | DocuSeal contrats | ⏸ V2 | Différé monétisation |
| MESSAGERIE_PRO | Stripe Connect | ⏸ V2 | Utiliser `brh_commission_invoices` existant V1 |

**Verdict global** : 8 concepts V1 (intégrés Phase 18.1 → 18.6), 6 concepts V2 (post-monétisation), 0 spécifique-AUTAF dans ces 4 specs.

---

## 8. Patterns existants à réutiliser (citations)

| Pattern | Fichier référence |
|---|---|
| Guard React Query | `src/components/auth/ArtisanGuard.tsx` |
| Shell layout sidebar | `src/components/layout/ArtisanShell.tsx` |
| API ↔ Hooks miroir | `src/api/agences-immo.ts` ↔ `src/hooks/queries/agences-immo.ts` |
| RLS + helpers SECURITY DEFINER | `supabase/migrations/20260706200000_brh_artisan_phase_17_1.sql` |
| Storage signed URL | `src/api/audits.ts:132-149` |
| Realtime channels | `src/hooks/useNotifications.ts:54-77` |
| Multi-tenant | `src/lib/tenant-region.ts` |
| Tests Vitest pure functions | `src/lib/dpe-engine/marketplace/match-artisans.test.ts` |
| Vitrine publique polymorphe | `src/pages/public/AgenceVitrinePage.tsx` (à généraliser `/reseau/profil/:slug`) |
| Trigger commission auto | `brh_commission_invoices` + trigger `calculate_commission` (Phase 13.6) |
| Code parrain | `brh_agence_referrals` (Phase 16.1) |
| Invitations magic-link | EFs `artisan-invite-{create,verify,accept}` (Phase 17.0) |

---

## 9. Risques majeurs

| Risque | Mitigation |
|---|---|
| Tunneling Étape 1 (lecture 23 specs AUTAF) | ✅ Cap 2 jours respecté, 4 specs skim livré 06/05 |
| Ville morte (réseau sans activité) | Bootstrap démarré dès Étape 5, Philippe poste 5 chantiers seed/sem × 12 sem |
| RGPD photos chantier | Floutage manuel Canvas obligatoire V1 + soft-delete + DPIA étendu Étape 9 |
| API AUTAF non disponible | Étape 8 bloquée → reporter sans bloquer Étape 7 marketplace |
| Faux comptes | SIRET via EF `verify-siret` existant + chartes signées (`brh_partner_contracts`) |
| BRH juge et partie | Charte explicite "BRH ne candidate pas en priorité sur les chantiers proposés" + transparence commissions |
| Refactor multi-tenant tardif | `tenant_id UUID NOT NULL` partout V1 même si 1 seul tenant `brh` actif |
| Concurrence Kelvin° qui ouvrirait un réseau | Lock-in via verticalisation rapide + bootstrap agressif |

---

## 10. Modèle économique cible (an 2)

| Source | Mécanique | Estimation an 2 |
|---|---|---|
| Pro Premium 19€/mois | Boost feed, stats avancées, 20 posts/jour | 500 abos × 19 × 12 = 114 k€/an |
| Commission 5% HT | Sur devis signé via marketplace | 200 chantiers × 8 k€ × 5% = 80 k€/an |
| Featured profile 49€/mois | Top des recherches `/reseau/decouvrir` | 50 × 49 × 12 = 29 k€/an |
| Marketplace data | Insights anonymisés industriels (Saint-Gobain, Knauf) | 12 k€/an V2 |
| **Total** | | **~235 k€/an** si 1 000 pros bretons actifs |

---

## 11. Estimations dev

| Étape | Durée | Cumul |
|---|---|---|
| 1. Audit AUTAF | 2 j | 2 j ✅ livré 06/05 |
| 2. Brief légal // | 0 (parallèle) | 2 j |
| 3. Migration SQL 18.1 | 3 j | 5 j |
| 4. Infra UI | 3 j | 8 j |
| 5. Graphe social | 1 sem | 13 j |
| 6. Feed MVP + modération min | 1.5 sem | 21 j ≈ **MVP utilisable** |
| 7. Marketplace chantiers | 2.5 sem | 33 j |
| 8. Bridge AUTAF | 1 sem | 38 j |
| 9. Modération avancée + DPIA | 1 sem | 43 j |
| 10. Bootstrap (// dès S5) | 12 sem ops | — |
| 11. Découverte + SEO | 1 sem | 48 j |
| 12. Monétisation V2 | 1.5 sem | 55 j ≈ 11 sem dev |

**MVP utilisable** : 4 semaines (Étapes 1-6).
**Produit monétisable** : 14-16 semaines (~fin août 2026).

---

## 12. Décisions ouvertes (non bloquantes)

- Confirmer dispo API AUTAF (endpoints OAuth + posts + chantiers + recommendations) avec dev Genesii dès J-0
- Onboarding apporteurs : URL distincte `/inscription/apporteur` (SEO) ou sélecteur `partner_type` dans `/inscription/agence` ?
- Architectes : intégration ordre des architectes (validation ordre) — différé V2 sauf si AUTAF a déjà la verification

---

## Refs

- Plan source : `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md`
- Mémoire : `/root/.claude/projects/-root/memory/brh-reseau-social-phase18-2026-05-06.md`
- Specs AUTAF (skim) : `/root/AUTAF_ALGORITHM_ENGINE_V2.md`, `AUTAF_SCORE_XP_COINS_UNIFIE.md`, `AUTAF_NOTIFICATIONS_SPEC.md`, `AUTAF_MESSAGERIE_PRO.md`
- Wiki Karpathy index : [index.md](index.md)
- Pattern wiki : [karpathy-pattern-setup.md](karpathy-pattern-setup.md)
