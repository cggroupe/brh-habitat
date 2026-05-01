# BRH Habitat — Migrations Audit

> Source : `supabase/migrations/`.
> **Dernière mesure** : 2026-04-30 · **Total** : 40 migrations (37 historiques + 3 DPE Engine Phase 1).

## Phase DPE Engine — 2026-04-30 (portage CapRénov+)

| Migration | Rôle |
|-----------|------|
| `20260430120000_brh_dpe_referentiels` | 45 tables référentiels 3CL-DPE 2021 (`brh_dpe_*`) — coefs U, ponts thermiques, intermittence (54k rows), SCOP, seuils, zones climatiques. Source : `tv.db` CapRénov+. |
| `20260430120100_brh_audits` | 3 tables : `brh_audits` + `brh_audit_variantes` (delta JSONB ADR-004) + `brh_audit_factures`. Status workflow draft→submitted→archived. INTEGER cents partout. |
| `20260430120200_brh_dpe_solutions` | Catalogue solutions/travaux types avec prix HT + MO HT en cents. Source : `solutions.db` CapRénov+. |

Voir log d'application : [log.md](log.md) entrée 2026-04-30.

## Convention

- **Format nom** : `YYYYMMDDHHMMSS_description.sql` (UTC timestamp)
- **Ordre d'application** : tri lexical = chronologique
- **Tables** : toujours préfixées `brh_*` (sauf `profiles`)
- **Montants** : INTEGER cents (règle anti-bug #2)
- **Dates** : TIMESTAMPTZ (règle #12)
- **Fonctions SECURITY DEFINER** : `SET search_path = ''` (règle #13)
- **RLS** : activée + policies définies (règle #6-7)

## Catalog des 37 migrations

### Phase 0 — Fondations (2026-02-27)

| Migration | Rôle |
|-----------|------|
| `20260227203800_brh_full_schema` | Schéma initial complet : profiles, brh_diagnostics, brh_homes, brh_cases, brh_appointments, brh_articles, brh_contacts + RLS de base |

### Phase 1 — Sécurité & Extensions (mars 2026)

| Migration | Rôle |
|-----------|------|
| `20260324141800_fix_rls_security` | Corrections RLS initiales |
| `20260324180000_add_contact_columns` | Colonnes contact supplémentaires |
| `20260326120000_fix_profiles_rls_recursion` | Fix recursion circulaire profiles (via `SECURITY DEFINER get_my_role()`) |
| `20260326150000_health_carnet` | Tables santé habitat : `brh_health_records`, `brh_work_history`, `brh_home_documents` |
| `20260326160000_storage_documents` | Storage buckets + policies (avatars, home-documents) |
| `20260326170000_diagnostic_draft_resume` | Support reprise draft diagnostic (JSONB) |

### Phase 2 — Plateforme partenaires (avril 2026, semaine 1)

| Migration | Rôle |
|-----------|------|
| `20260403100000_fix_rls_circular_and_contacts` | Fix récursion circulaire RLS (brh_contacts) |
| `20260403100001_add_missing_indexes` | Indexes manquants |
| `20260403100002_extend_roles_partner_platform` | Extension profiles : rôles `pro`, `particulier` |
| `20260403200000_partner_platform_tables` | ⭐ Tables partenaires : `brh_companies`, `brh_company_members`, `brh_prospects`, `brh_prospect_files`, `brh_quotes` |
| `20260403200001_partner_platform_functions_triggers` | ⭐ Fonctions SECURITY DEFINER (`is_admin`, `is_pro`, `get_my_company_id`) + triggers (`calculate_commission`, `update_company_ca`) |
| `20260403200002_partner_platform_rls_indexes` | RLS policies + index partner platform |
| `20260403300000_partner_storage_buckets` | Buckets `prospect-files`, `social-screenshots`, `message-attachments` |

→ Voir [partner-platform.md](partner-platform.md) pour détails.

### Phase 2b — Viral features (2026-04-03)

| Migration | Rôle |
|-----------|------|
| `20260403400000_viral_features` | ⭐ `brh_simulation_shares`, `brh_simulation_leads`, `brh_social_posts`, `brh_badges`, `brh_user_badges`, `brh_affiliates`, `brh_points_transactions`, `brh_rewards_catalog`, `brh_reward_claims`, `brh_platform_settings` |

→ Voir [viral-features.md](viral-features.md) pour détails.

### Phase 2c — Corrections post-initial (2026-04-03)

| Migration | Rôle |
|-----------|------|
| `20260403500000_fix_handle_new_user_role` | Fix assignation role à l'inscription |
| `20260403600000_fix_affiliate_rls_and_messaging` | Fix RLS affiliates + tables messagerie (`brh_message_threads`, `brh_messages`, `brh_notifications`) |
| `20260403700000_add_referral_tracking` | Tracking parrainage (`referral_code`, `referrer_id`) |
| `20260403800000_recruitment_system` | ⭐ Système recrutement multi-niveaux : `brh_recruitment_commissions` + fonction `calculate_recruitment_commission()` (cascade levels 1/2/3) |
| `20260403900000_fix_qa_bugs` | Fix bugs QA |
| `20260403950000_perf_rpcs` | Fonctions RPC performance (agrégats dashboard, stats company) |

### Phase 3 — Recrutement multi-niveaux (2026-04-04)

| Migration | Rôle |
|-----------|------|
| `20260404000000_multilevel_recruitment` | Extension cascade recrutement — chaînage recruteurs levels 1→2→3 |

### Phase 4 — Audits cascading (2026-04-10 → 2026-04-14)

Cycles d'audit "Chaos Monkey" — chaque audit découvre des findings, la migration suivante les corrige.

| Migration | Rôle |
|-----------|------|
| `20260410000000_fix_company_insert_rls` | Fix RLS INSERT `brh_companies` |
| `20260410100000_chiffrage_history` | Table `brh_chiffrages` (historique chiffrages IA) |
| `20260413000000_fix_critical_audit_v4` | Audit v4 — fixes critiques |
| `20260413100000_improvements_batch` | Améliorations batch |
| `20260414000000_fix_missing_index` | Index manquants identifiés par audit v5 |
| `20260414100000_audit_fixes_v5` | Corrections audit v5 |
| `20260414200000_audit_v6_fixes` | Corrections audit v6 : `brh_cases.estimated_budget` → INTEGER, storage buckets scopés, rate limiting EFs |
| `20260414300000_audit_v7_security_fixes` | **Audit v7** : fixes M3 (simulation_leads INSERT), M4 (triggers search_path), M5 (commission rounding) |
| `20260414400000_audit_v8_corrections` | **Audit v8** : C1 (phone→telephone), H1 (niveau partenaire), M5 (diagnostic draft), M3 (chiffrage UPDATE), M7 (home-documents admin) |

### Phase 5 — Intégrations externes (2026-04-20 → 2026-04-23)

| Migration | Rôle |
|-----------|------|
| `20260420000000_fix_company_select_owner` | RLS : `brh_companies` SELECT accessible au `owner_id` (permet inscription pro avec `.insert().select().single()`) |
| `20260421000000_siret_verification_fields` | ⭐ Champs SIRENE officiels — stockage données INSEE (pas user input). Nécessite EF `verify-siret` |
| `20260421100000_clerk_user_id_bridge` | ⭐ `profiles.clerk_user_id` — bridge Clerk ↔ Supabase. Clerk gère l'UI auth, Supabase garde son `auth.users` |
| `20260422000000_admin_emails_list` | ⭐ Colonne `admin_emails TEXT[]` sur `brh_platform_settings` (default `['contact@contact-brh.fr']`) + fonction `is_email_admin()` + refactor `handle_new_user()`. **Pas de table dédiée `brh_admin_emails`.** |
| `20260422100000_validate_recruiter` | ⭐ Fonction `validate_recruiter(p_recruiter_id UUID, p_expected_role TEXT)` — bloque UUID en aveugle dans `updateCompanyRecruiter()` |
| `20260423000000_company_invitations` | ⭐ Table `brh_company_invitations` — flow multi-membres pour entreprise pro |

## Statistiques par phase

| Phase | Période | Migrations | Focus |
|-------|---------|------------|-------|
| 0 — Fondations | 2026-02-27 | 1 | Schéma initial |
| 1 — Sécurité & Santé | 2026-03-24 → 2026-03-26 | 6 | RLS, carnet santé, storage |
| 2 — Partenaires | 2026-04-03 | 7 | Companies, prospects, quotes, commissions |
| 2b — Viral | 2026-04-03 | 1 | Simulations, badges, affiliés, cadeaux |
| 2c — Corrections | 2026-04-03 | 6 | Bugs + messagerie + referral + recrutement |
| 3 — Multi-level | 2026-04-04 | 1 | Cascade 1→2→3 |
| 4 — Audits | 2026-04-10 → 2026-04-14 | 9 | Hardening itératif (v4→v8) |
| 5 — Intégrations | 2026-04-20 → 2026-04-23 | 7 | SIRET + Clerk + admin + invitations |
| **Total** | **2 mois** | **37** | |

## Tables créées (ordre chronologique, vérifié)

1. `profiles` (extend `auth.users`) — Phase 0
2. **Phase 0 (6)** : `brh_diagnostics`, `brh_homes`, `brh_cases`, `brh_appointments`, `brh_articles`, `brh_contacts`
3. **Phase 1 (3)** : `brh_health_records`, `brh_work_history`, `brh_home_documents`
4. **Phase 2 (5)** : `brh_companies`, `brh_company_members`, `brh_prospects`, `brh_prospect_files`, `brh_quotes`
5. **Phase 2b (10)** : `brh_simulation_shares`, `brh_simulation_leads`, `brh_social_posts`, `brh_badges`, `brh_user_badges`, `brh_affiliates`, `brh_points_transactions`, `brh_rewards_catalog`, `brh_reward_claims`, `brh_platform_settings`
6. **Phase 2c (4)** : `brh_message_threads`, `brh_messages`, `brh_notifications`, `brh_recruitment_commissions`
7. **Phase 4 (1)** : `brh_chiffrages`
8. **Phase 5 (1)** : `brh_company_invitations`

**Total** : **29 tables `brh_*` + `profiles` = 30 tables**.

> ⚠ Pas de table `brh_admin_emails` (c'est une colonne ajoutée à `brh_platform_settings` en Phase 5).

## Fonctions SQL (20 vérifiées) — ordre de création

| Ordre | Fonction | Type | Créée dans |
|-------|----------|------|------------|
| 1 | `handle_new_user()` | TRIGGER | Phase 0 |
| 2 | `update_updated_at()` | TRIGGER (générique) | Phase 0 |
| 3 | `is_admin()` | SECURITY DEFINER STABLE | Phase 1 |
| 4 | `get_my_role()` | SECURITY DEFINER STABLE | Phase 1 (fix recursion profiles) |
| 5 | `is_pro()` | SECURITY DEFINER STABLE | Phase 2 |
| 6 | `get_my_company_id()` | SECURITY DEFINER STABLE | Phase 2 |
| 7 | `find_profile_by_email()` | SECURITY DEFINER STABLE | Phase 2 (invitations) |
| 8 | `calculate_commission()` | TRIGGER | Phase 2 |
| 9 | `update_company_ca()` | TRIGGER | Phase 2 |
| 10 | `award_affiliate_points()` | TRIGGER | Phase 2c |
| 11 | `calculate_lead_score()` | TRIGGER | Phase 2c |
| 12 | `calculate_recruitment_commission()` | TRIGGER | Phase 2c |
| 13 | `get_company_commission_stats()` | RPC STABLE | Phase 2c (`perf_rpcs`) |
| 14 | `get_full_recruit_tree()` | RPC STABLE | Phase 3 |
| 15 | `get_my_threads_enriched()` | RPC STABLE | Phase 2c |
| 16 | `get_network_stats()` | RPC STABLE | Phase 3 |
| 17 | `get_recruit_stats()` | RPC STABLE | Phase 3 |
| 18 | `get_team_stats()` | RPC STABLE | Phase 2c |
| 19 | `profile_id_from_clerk()` | SECURITY DEFINER STABLE | Phase 5 (2026-04-21) |
| 20 | `is_email_admin()` | SECURITY DEFINER STABLE | Phase 5 (2026-04-22) |
| 21 | `validate_recruiter()` | SECURITY DEFINER STABLE | Phase 5 (2026-04-22) |

> ⚠ **Correction** : la fonction s'appelle `validate_recruiter` (pas `validate_recruiter_uuid`) et prend 2 paramètres (`p_recruiter_id UUID, p_expected_role TEXT`).

## Audit trail des corrections majeures

### Bugs corrigés par cascade d'audits (v4 → v8)

| Audit | Findings critiques | Fix |
|-------|-------------------|-----|
| v4 | Permissions admin trop larges | Revue policies |
| v5 | Index manquants sur jointures fréquentes | `add_missing_indexes` |
| v6 | Montants en NUMERIC (risque arrondis), storage trop permissif | INTEGER cents + storage scopé |
| v7 | crm-sync sans auth, simulation_leads INSERT trop permissif, triggers sans search_path | Auth + rate limit + `SET search_path = ''` |
| v8 | Chiffrage UPDATE incomplet, home-documents admin, diagnostic draft multi-tenant | Corrections ciblées |

## Workflow d'ajout d'une migration

### 1. Créer le fichier
```bash
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
touch supabase/migrations/${TIMESTAMP}_description.sql
```

### 2. Structure
```sql
-- Migration: {Description}
-- Date: YYYY-MM-DD
-- Contexte: {pourquoi cette migration}
-- Bug/Feature: {référence issue ou spec}

BEGIN;

-- 1. Extensions (si applicable)
-- CREATE EXTENSION IF NOT EXISTS ...;

-- 2. Tables
CREATE TABLE IF NOT EXISTS brh_xxx ( ... );

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_xxx ON brh_xxx(col);

-- 4. RLS
ALTER TABLE brh_xxx ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... ON brh_xxx FOR ALL USING (...) WITH CHECK (...);

-- 5. Functions (SECURITY DEFINER avec search_path='')
-- CREATE OR REPLACE FUNCTION ...
--   SET search_path = ''
--   LANGUAGE plpgsql
--   SECURITY DEFINER AS $$ ... $$;

-- 6. Triggers
-- CREATE TRIGGER ...

COMMIT;
```

### 3. Tester en local
```bash
supabase db reset   # applique toutes les migrations
# Tester avec des users différents (admin, pro, particulier)
```

### 4. Mettre à jour
- `types/database.ts` : `supabase gen types typescript --local > src/types/database.ts`
- Modules API concernés dans `src/api/`
- Pages wiki : [data-model.md](data-model.md), cette page, log
- `log.md` : entrée détaillée

### 5. Appliquer en prod
**JAMAIS sans accord Philippe** (hook PreToolUse actif)
```bash
supabase db push
```

## Checklist avant commit d'une migration

- [ ] RLS activée sur la nouvelle table ?
- [ ] Policies SELECT/INSERT/UPDATE/DELETE définies ?
- [ ] SECURITY DEFINER avec `SET search_path = ''` si utilisé ?
- [ ] Index sur colonnes WHERE/JOIN ?
- [ ] Foreign keys avec ON DELETE approprié ?
- [ ] Types financiers en INTEGER cents ?
- [ ] TIMESTAMPTZ (pas TIMESTAMP) ?
- [ ] Types TypeScript régénérés ?
- [ ] Testé avec user non-admin ?
- [ ] Pas de `USING (true)` sans justification ?

## Migrations à venir (roadmap identifiée)

- Optimisations index (audit v9 éventuel)
- Table matérialisée pour leaderboard (vs MATERIALIZED VIEW — cf brh-partner-v2-addendum)
- Support Stripe / GoCardless pour paiement commissions auto ?
- Extension `brh_company_invitations` : multi-role, expiration configurable

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy). Catalog complet 37 migrations en 8 phases.
