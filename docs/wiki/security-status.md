# BRH Habitat — Security Status

> Source : `ARCHITECTURE.md` (audit v7 du 2026-04-14) + migrations audit v4→v8 + `PROHACKER_AUDIT.md` + `security-audit-report.md`.
> **Dernière mesure** : 2026-04-23.

## Score sécurité actuel : 9.8/10

Audit v7 (2026-04-14) — **aucune faiblesse critique restante**. Les 5 cycles d'audit (v4→v8) ont corrigé tous les findings bloquants.

## État des findings par catégorie

### 🔴 CRITIQUES (3) — TOUS CORRIGÉS

| # | Finding | Correction | Migration/Fichier |
|---|---------|------------|-------------------|
| C1 | Diagnostic draft localStorage global (fuite entre tenants) | Scope par tenant : `${tenantId}-diagnostic-draft` | `stores/diagnosticStore.ts` (v6) |
| C2 | `crm-sync` public sans auth (écriture externe possible) | Auth Bearer admin + rate limit 5 req/min | `supabase/functions/crm-sync/index.ts` (v7) |
| C3 | `brh_cases.estimated_budget` en NUMERIC (risque arrondis) | Migration vers INTEGER (cents) | `20260414200000_audit_v6_fixes` |

### 🟠 HAUT (4) — TOUS CORRIGÉS

| # | Finding | Correction |
|---|---------|------------|
| H1 | 8+ invalidations cache manquantes (UI stale) | Ajout `['dashboard', 'stats']` + `logError` sur toutes mutations (v7, 6 fichiers hooks) |
| H2 | 3 storage buckets trop permissifs | Policies scopées par user_id/company_id (`20260414200000`) |
| H3 | Email Edge Functions sans rate limit | `checkRateLimit` 10-30 req/min (v7) |
| H4 | 16 casts `as unknown as` (bypass types) | Schemas Zod `.parse()` dans API layer (`api/schemas.ts` + 5 api modules, v7) |

### 🟡 MOYEN (7) — CORRIGÉS (dont v8)

| # | Finding | Correction | Statut |
|---|---------|------------|--------|
| M1 | staleTime uniforme 60s | Per-resource : profils 10m, homes/cases/diag 5m, dashboard 2m | ✅ v7 |
| M3 | `simulation_leads INSERT (true)` sans protection spam | IP hash + monitoring admin | ✅ v7 |
| M3bis | Chiffrage UPDATE incomplet | Fix policy | ✅ v8 |
| M4 | Types TS mismatch | `estimated_budget: number \| null` + search_path triggers | ✅ v7/v8 |
| M5 | RPC company stats sans error check | Ajout `if (statsError) throw statsError` | ✅ v7 |
| M5bis | Diagnostic draft à l'inscription (link draft → compte) | Fix | ✅ v8 |
| M7 | Home-documents admin | Policy admin bypass | ✅ v8 |

### 🔵 BAS (5) — CORRIGÉS ou JUSTIFIÉS

| # | Finding | Correction | Statut |
|---|---------|------------|--------|
| B1 | 41 non-null assertions (!) | Valides : pattern React Query `enabled: !!x` + `queryFn: fn(x!)` | ✅ Safe |
| B2 | 7 silent `.catch()` | `logError()` ajouté sur 5 (2 restants justifiés : error.ts/sw.js) | ✅ v7 |
| B3 | Pas d'AbortController | Ajout sur `AddressAutocomplete.tsx` + cleanup useEffect | ✅ v7 |
| B4 | CSP `'unsafe-inline'` | Nécessaire pour Tailwind 4 (nonces = complexité non justifiée) | 🟡 Justifié |
| B5 | SW cache v2 non incrémenté | Incrémenté à v3 | ✅ v7 |

### ⚠ Points d'attention restants (non-bloquants)

| # | Point | Impact | Action |
|---|-------|--------|--------|
| M2/M3 | 27 pages > 300 LOC + duplication admin tables (~400 LOC) | DX uniquement, pas de bug | Refactor optionnel |
| M6 | `brh_simulation_leads INSERT (true)` | Risque spam | Monitorer via ip_hash, captcha si pic |
| — | 2 `as unknown as` dans `DiagnosticPage.tsx` | JSONB dynamique | Justifié (type le plus précis possible) |

## Fixes majeurs post-audit v7 (avril 2026)

### Migration 2026-04-20 : `fix_company_select_owner`
**Finding** : À l'inscription pro, `createCompany().insert().select().single()` retournait `null` (RLS SELECT bloquait le owner qui venait de créer la row).
**Fix** : policy SELECT ajoutée pour `owner_id = auth.uid()`.

### Migration 2026-04-21 : `siret_verification_fields`
**Finding** : SIRET stocké tel que saisi → risque usurpation.
**Fix** : champs `siret_verified`, `siret_verified_at`, `official_name` etc. alimentés par EF `verify-siret` (API SIRENE INSEE).

### Migration 2026-04-21 : `clerk_user_id_bridge`
**Contexte** : Bascule de Supabase Auth vers Clerk (UX + MFA + password reset).
**Fix** : `profiles.clerk_user_id` + fonction `profile_id_from_clerk()` + EF `bridge-signin` + EF `clerk-webhook`.

### Migration 2026-04-22 : `admin_emails_list`
**Finding** : Email admin hardcodé `'contact@contact-brh.fr'` dans `handle_new_user()`. N'importe qui inscrit avec cet email devient admin.
**Fix** : Liste dynamique dans `brh_platform_settings.admin_emails TEXT[]` + fonction `is_email_admin()` + refactor `handle_new_user()`. Éditable uniquement via UI admin.

### Migration 2026-04-22 : `validate_recruiter`
**Finding** : URL `?recruiter=<uuid>` accepté en aveugle dans `updateCompanyRecruiter()`. Un user peut mettre n'importe quel UUID comme recruteur et toucher cascade commissions.
**Fix** : Fonction `validate_recruiter(p_recruiter_id UUID, p_expected_role TEXT)` vérifie que UUID existe, est actif, et a le rôle attendu.

### Migration 2026-04-23 : `company_invitations`
**Contexte** : Flow multi-membres manquait. Chaque pro créait sa propre company.
**Fix** : Table `brh_company_invitations` + 3 EFs (`company-invite`, `company-invite-verify`, `company-invite-accept`) + hook `useInvitations`.

## Checklist sécurité continue

### Avant chaque migration
- [ ] RLS activée ?
- [ ] Policies SELECT/INSERT/UPDATE/DELETE définies ?
- [ ] `SECURITY DEFINER` avec `SET search_path = ''` ?
- [ ] Pas de `USING (true)` sauf exceptions documentées ?
- [ ] Index sur colonnes WHERE/JOIN ?
- [ ] Testé avec user non-admin ?

### Avant chaque Edge Function
- [ ] Auth Bearer JWT vérifiée ?
- [ ] Rate limiting (pattern `ai-proxy`) ?
- [ ] CORS via `getCorsHeaders()` (pas `*` en prod) ?
- [ ] Inputs validés (types, bornes, sanitization) ?
- [ ] Secrets via `Deno.env.get()` ?
- [ ] Logs sans tokens/credentials ?

### Avant chaque mutation
- [ ] `assertPermission` ou Guard adéquat ?
- [ ] Invalidation `['dashboard', 'stats']` si applicable ?
- [ ] `onError` appelle `logError()` ?
- [ ] Zod `.parse()` sur response ?

## Exceptions RLS documentées (interdiction règle anti-bug #8)

| Table | Policy | Justification |
|-------|--------|---------------|
| `brh_badges` | `SELECT USING (true)` | Catalogue badges public (pas de data sensible) |
| `brh_simulation_leads` | `INSERT WITH CHECK (true)` | Visiteurs anonymes (formulaire de capture) — monitorer spam via `ip_hash` |
| `brh_articles` | `SELECT USING (published_at IS NOT NULL)` | Articles publiés accessibles à tous |
| `brh_rewards_catalog` | `SELECT USING (is_active = true)` | Catalogue visible aux particuliers |

## Monitoring sécurité

### Sentry (frontend)
- Tous les composants wrappés dans `ErrorBoundary`
- `logError()` dans toutes mutations
- Tag `tenant_id` sur chaque erreur

### Logs Supabase
- Edge Functions : logs via `supabase functions logs <name> --tail`
- Database : audit log via `brh_audit_log` (si activé — à vérifier)

### À améliorer
- 🟡 Dashboard admin "Security Events" (pic simulation_leads, erreurs auth, etc.)
- 🟡 Alerting Slack/email sur erreurs critiques
- 🟡 Penetration test externe (recommandé trimestriel)

## PROHACKER_AUDIT.md (avril 2026)

Audit externe ProHacker : voir `/Users/philippegagnon/PROHACKER_AUDIT.md` (référencé dans MEMORY.md).
Findings principaux : ✅ Tous corrigés dans la cascade v4→v8.

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy v2 — corrections audit croisé).
