# Réseau social pro `/reseau` — Status livraison Phase 18

> **Status global** : 🟡 Étape 1/12 livrée (audit AUTAF + blueprint). Aucun code applicatif écrit à ce jour.
>
> Voir : [reseau-social-blueprint.md](reseau-social-blueprint.md) (architecture cible) · [log.md](log.md) (journal append).

---

## 1. Tableau de livraison

| # | Étape | Durée prévue | Status | Date livraison |
|---|---|---|---|---|
| 1 | Audit AUTAF + cadrage architecture | 2 j (cap) | ✅ DONE | 2026-05-06 |
| 2 | Brief légal avocat (parallèle) | 0 j (parallèle) | ⏳ PENDING (Philippe ops) | — |
| 3 | Migration SQL fondations 18.1 | 3 j | ✅ DONE (non poussée) | 2026-05-06 |
| 4 | Infrastructure UI (Guard + Shell + 8 routes squelettes) | 3 j | ✅ DONE | 2026-05-06 |
| 5 | Graphe social + endorsements + fusion messageries | 1 sem | ✅ DONE | 2026-05-06 |
| 6 | Feed MVP + composer + Canvas + algo + modération min | 1.5 sem | ✅ DONE — **MVP utilisable atteint** | 2026-05-06 |
| 7 | Marketplace chantiers (KILLER) | 2.5 sem | ⏸ PENDING | — |
| 8 | Bridge AUTAF API | 1 sem | ⏸ PENDING (dépend dispo API Genesii) | — |
| 9 | Modération avancée + DPIA | 1 sem | ⏸ PENDING | — |
| 10 | Bootstrap "anti-ville morte" (// ops dès S5) | 12 sem ops | ⏸ PENDING (Philippe) | — |
| 11 | Découverte + SEO 750 pages | 1 sem | ⏸ PENDING | — |
| 12 | Monétisation V2 (Stripe Premium 19€/mois) | 1.5 sem | ⏸ PENDING | — |

---

## 2bis. Étape 3 — Livrables (2026-05-06)

### Migration SQL créée (non poussée)
- ✅ `supabase/migrations/20260706300000_brh_phase_18_1_reseau.sql` (~830 lignes)
  - 11 tables : `brh_pro_connections`, `brh_pro_follows`, `brh_feed_posts`, `brh_feed_reactions`, `brh_feed_comments`, `brh_feed_impressions`, `brh_pro_endorsements`, `brh_chantier_offers`, `brh_chantier_applications`, `brh_autaf_link`, `brh_feed_reports`
  - 3 helpers SECURITY DEFINER : `brh_user_pro_id()`, `brh_pro_in_network(viewer, target)`, `brh_pro_can_view_post(post_id)`
  - 4 triggers : compteurs reactions/comments + commission marketplace + updated_at auto
  - RLS complète (jamais USING(true) sauf exception documentée graphe follows)
  - ALTER `brh_partner_contracts.partner_type` CHECK étendu 3→9 types
  - `tenant_id TEXT` partout (`brh`/`idf`/`paca`/`autaf`)
- ✅ FK différées correctement gérées (`brh_feed_posts ↔ brh_chantier_offers`, `brh_pro_endorsements ↔ brh_chantier_offers`)

### Conformité 14 règles anti-bug
- #2 BIGINT cents (`budget_cents`, `commission_amount_cents`, `devis_amount_cents`)
- #5 transactionnel BEGIN/COMMIT
- #8 jamais USING(true) sauf 1 exception (`brh_pro_follows` SELECT, documentée)
- #11 TIMESTAMPTZ partout
- #12 `SET search_path = ''` sur les 5 fonctions SECURITY DEFINER

### Push prod effectué 06/05/2026
- Migration appliquée via `PGPASSWORD=... psql ... -f migration.sql` après correction d'une dépendance circulaire (helper `brh_pro_in_network` déplacé après les CREATE TABLE)
- 11 tables créées en prod (count 0 partout, normal)
- Types régénérés via `supabase gen types typescript --db-url ...` → `src/types/database.ts` 7383 lignes
- Type-check `npx tsc --noEmit` exit 0

---

## 2ter. Étape 4 — Livrables (2026-05-06)

### Fichiers créés (10)
- ✅ `src/components/auth/ReseauGuard.tsx` — calque ArtisanGuard sur `brh_partner_contracts.status='active'`
- ✅ `src/components/layout/ReseauShell.tsx` — sidebar 6 entrées + accent **cyan-500/sky-600** (différencie des 3 autres portails)
- ✅ 8 skeletons `src/pages/reseau/*.tsx` :
  - `ReseauFeed`, `ReseauProfil` (`:slug`), `ReseauDecouvrir`, `ReseauChantiers`, `ReseauChantierNew`, `ReseauConnexions`, `ReseauMessages`, `ReseauParamsAutaf`

### Fichier modifié
- ✅ `src/App.tsx` (+18 lignes : 2 imports Guard/Shell + 8 imports lazy + bloc Routes complet)

### Tests
- ✅ Type-check : exit 0
- ✅ ESLint : exit 0
- ⏸ Vitest 311/311 inchangé (squelettes sans logique)
- ⏸ Playwright E2E à ajouter Étape 5 (1 smoke test login pro → /reseau visible)

### Note UX
Le squelette `/reseau/parametres/autaf` inclut une bannière explicite "AUTAF reste autonome sur WordPress OVH. Bridge optionnel" pour aligner les attentes utilisateurs avec la décision structurante du 06/05.

---

## 2. Étape 1 — Livrables (2026-05-06)

### Fichiers wiki créés
- ✅ `docs/wiki/reseau-social-blueprint.md` — architecture cible + tableau emprunts AUTAF
- ✅ `docs/wiki/reseau-social-status.md` (ce fichier)

### Décisions tranchées
- 8 décisions stratégiques actées par Philippe (cf. blueprint § 2)
- Décision AUTAF : **bridge API**, pas migration. Plan `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md` validé
- Audit AUTAF skim : 4 specs prioritaires (ENGINE_V2, SCORE_XP_COINS, NOTIFICATIONS, MESSAGERIE_PRO) → 8 concepts V1 + 6 V2 + 0 skip
- Algo feed V1 simplifié : 5/8 composantes AUTAF V2 (skip momentum + creator_trust + prediction ML)
- Notifications V1 : 12 types (réduit de 28), in-app + email seulement
- Messagerie cockpit V1 : 3 actions (Devis / RDV / Appel) au lieu de 6

### Cap respecté
2 j capés : audit fait en 1 session via agents Explore (skim spec + cartographie wiki + patterns). Aucun débordement, ADR-018 non nécessaire.

---

## 3. Métriques cibles

### Techniques (Étape 6 — MVP)
- Vitest : 311 → ~340 (au moins +30 tests pure functions sur `feed-algo`, `matching`, `blur-canvas`)
- Playwright E2E : 3 → 7 smoke tests (1 par persona + 1 cross-persona marketplace + 1 bridge AUTAF mocké)
- Type-check `npx tsc --noEmit` : exit 0 après chaque étape
- CI GitHub Actions : verte
- Score santé : 9.8/10 préservé

### Produit (Étape 12 — monétisable)
- 1 000 pros bretons actifs DAU
- 200 chantiers signés via marketplace (an 1)
- 500 abonnés Pro Premium 19€/mois
- 235 k€/an récurrents

### Bootstrap (Étape 10, S+12)
- 200 connexions actives
- 10 chantiers signés via marketplace
- 50 pilotes invités, 20 actifs/sem
- 30 contenus seed pré-postés

---

## 4. Bloquants & dépendances

| Bloquant | Impact | Action |
|---|---|---|
| Brief légal avocat (Étape 2) | Bloque ouverture publique sans chartes V1 | Philippe lance dès J-0 (mission Phase 16 étendue, +0€ vs 1500€ déjà budgété) |
| Dispo API AUTAF (Étape 8) | Bloque cross-post + recommendations | Email Genesii dès J-0 pour caler dispo S+5 |
| Régénération `types/database.ts` | Friction post-migration récurrente | Verrouiller dans CI : `supabase gen types` après chaque migration |
| RGPD floutage photos | Risque légal si feed sans modération | ✅ Décision : floutage Canvas client-side V1 + soft-delete signalements |

---

## 5. Refs

- **Plan source** : `/root/.claude/plans/c-elle-qui-te-semble-wiggly-sundae.md`
- **Blueprint** : [reseau-social-blueprint.md](reseau-social-blueprint.md)
- **Mémoire projet** : `/root/.claude/projects/-root/memory/brh-reseau-social-phase18-2026-05-06.md`
- **Phases connexes** : [agence-portal-status.md](agence-portal-status.md) (Phase 16.1) · [artisan-portal-status.md](artisan-portal-status.md) (Phase 17.1)
- **Pattern Karpathy** : [karpathy-pattern-setup.md](karpathy-pattern-setup.md)
