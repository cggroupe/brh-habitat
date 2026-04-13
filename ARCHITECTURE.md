# Audit Architecture v4 — BRH Habitat

**Date** : 2026-04-13
**Stack** : React 19.2 + Vite 7.3 + TypeScript 5.9 strict + Tailwind CSS 4.2 + Supabase + Zustand + React Query 5 + @react-pdf/renderer
**Deploy** : Vercel (SPA) | Sentry (monitoring) | 4 Edge Functions Supabase
**Metriques** : 150 fichiers source | 30 626 LOC | 72 routes | 97 composants | 24 tables DB | 24 migrations

---

## Resume Executif

BRH Habitat est une plateforme SaaS de renovation habitat + systeme de partenariat (pro/particulier/affilie) avec IA batiment integree. L'architecture est **solide et bien structuree** avec une separation claire (API layer centralise, hooks React Query, 4 portails avec guards). La securite RLS est exhaustive (24/24 tables couvertes). Les faiblesses principales : **1 JWT hardcode dans une Edge Function**, **CORS wildcard sur les Edge Functions**, **chunk PDF de 1.5MB non lazy-load**, et **26 composants > 300 lignes**. Le projet est fonctionnel en production mais necessite des corrections de securite avant montee en charge.

---

## Score de Sante

| Categorie | Score | Details |
|-----------|-------|---------|
| Structure | 9/10 | Organisation exemplaire, naming 99% coherent, code splitting configure |
| Data Flow | 7/10 | API layer centralise mais 4 appels Supabase directs, 16 `as unknown` casts |
| Securite | 6/10 | RLS exhaustif mais JWT hardcode + CORS wildcard dans Edge Functions |
| Permissions | 9/10 | RBAC 4 roles, guards sur toutes les routes protegees, RLS SECURITY DEFINER |
| Error Handling | 8/10 | Sentry + Error Boundary + try/catch partout, 12 console.error a migrer |
| TypeScript | 8/10 | Strict mode, 0 `as any`, 16 `as unknown` (necessaires pour Supabase) |
| Performance | 7/10 | Lazy loading excellent mais chunk PDF 1.5MB non lazy-load |
| DX | 8/10 | Hooks bien organises, .env.example manquant |

**Score global : 7.8/10** (+0.3 vs v3)

---

## Findings

### CRITIQUE (bloquants)

#### C1 — JWT hardcode dans ai-proxy
**Fichier** : `supabase/functions/ai-proxy/index.ts` L14
**Description** : La cle anon BRHCRM est hardcodee en clair dans le code source. Visible dans le repo GitHub.
**Impact** : Quiconque lit le code peut interroger la DB BRHCRM.
**Fix** : Remplacer par `Deno.env.get('BRHCRM_ANON_KEY')` et configurer via `supabase secrets set`.

#### C2 — CORS wildcard sur toutes les Edge Functions
**Fichier** : `supabase/functions/_shared/cors.ts` L2
**Description** : `Access-Control-Allow-Origin: '*'` autorise n'importe quel domaine.
**Impact** : Combine avec C1, n'importe quel site peut appeler le proxy IA et la base de prix.
**Fix** : Restreindre a `https://brh-habitat.vercel.app` ou lire depuis env var.

#### C3 — brh_home_documents sans policies RLS
**Fichier** : `supabase/migrations/20260326150000_health_carnet.sql` L103
**Description** : RLS active mais aucune policy SELECT/INSERT/UPDATE/DELETE definie.
**Impact** : Table completement inaccessible pour tous les utilisateurs (meme les admins via client).
**Fix** : Ajouter les memes policies que brh_health_records (user_id = auth.uid() + admin ALL).

#### C4 — State diagnostic persiste apres logout
**Fichier** : `src/hooks/useAuth.ts` L103-107
**Description** : `signOut()` ne reset pas le diagnostic store. Le brouillon d'un utilisateur reste dans localStorage.
**Impact** : Sur appareil partage, le prochain utilisateur voit les donnees du precedent.
**Fix** : Appeler `useDiagnosticStore.getState().reset()` dans `signOut()`.

---

### HAUT (risque important)

#### H1 — Chunk PDF 1.5MB non lazy-load
**Fichiers** : `src/pages/pro/ProChiffrage.tsx` L3, `src/pages/particulier/PartChiffrage.tsx` L3
**Description** : `import { pdf } from '@react-pdf/renderer'` est un import statique. Le chunk de 1.5MB est telecharge meme si l'utilisateur ne fait jamais de chiffrage.
**Impact** : +1.5MB de JS pour tous les utilisateurs des portails pro/particulier.
**Fix** : `const { pdf } = await import('@react-pdf/renderer')` dans `handleDownloadPdf()`.

#### H2 — 4 appels Supabase directs bypass API layer
**Fichiers** :
- `src/pages/pro/ProChiffrage.tsx` L86 — INSERT brh_chiffrages
- `src/pages/particulier/PartChiffrage.tsx` L56 — INSERT brh_chiffrages
- `src/pages/public/RegisterProPage.tsx` L67-106 — INSERT companies + members + SELECT profiles
- `src/pages/public/RegisterParticulierPage.tsx` L74-92 — INSERT affiliates + SELECT profiles
**Impact** : Pas de gestion de cache React Query, pas d'error handling centralise, code duplique.
**Fix** : Creer `src/api/chiffrages.ts` et `src/api/registration.ts`.

#### H3 — 16 `as unknown` type assertions dans API layer
**Fichiers** : affiliates.ts, partner-messages.ts, social-posts.ts, partner-notifications.ts, rewards.ts, company-members.ts
**Description** : Les reponses Supabase sont castees `as unknown as Type[]` pour contourner les types inferes.
**Impact** : Perte de securite TypeScript, bugs silencieux si le schema DB change.
**Fix** : Generer les types Supabase avec `supabase gen types typescript` et utiliser le generique `supabase.from<Table>()`.

#### H4 — .env.example manquant
**Impact** : Nouveau developpeur ne sait pas quelles variables configurer (12 variables requises).
**Fix** : Creer `.env.example` avec les 12 variables documentees.

#### H5 — Notification bell z-[70] au-dessus des modals z-[60]
**Fichier** : `src/components/shared/NotificationBell.tsx` L59
**Description** : Le dropdown notifications a un z-index superieur aux modals.
**Impact** : Le dropdown apparait par-dessus les modals ouvertes.
**Fix** : Fermer le dropdown quand une modal s'ouvre, ou ajuster l'echelle z-index.

---

### MOYEN (a planifier)

#### M1 — 26 composants > 300 lignes
**Top 5** : ArticlePage (969), DiagnosticResultsPage (774), LogementDetail (634), AdminArticles (574), ProfilPage (541)
**Fix** : Extraire en sous-composants par section logique.

#### M2 — queries.ts monolithique (1 117 lignes)
**Fichier** : `src/hooks/queries.ts`
**Fix** : Splitter par domaine : `queries/homes.ts`, `queries/prospects.ts`, `queries/recruitment.ts`, etc.

#### M3 — Invalidations de mutations incompletes
- `useUpdateAppointment` — pas de `setQueryData` pour la vue detail
- `useInviteMember` / `useRemoveMember` — n'invalident pas `['companies']`
- `useCreateQuote` — ne considere pas les commissions de recrutement

#### M4 — console.error en production (12 instances)
**Fix** : Remplacer par `Sentry.captureException()`.

#### M5 — Guards : ordre des checks
**Fichiers** : AdminGuard.tsx L18, ProGuard.tsx L18, ParticulierGuard.tsx L18
**Description** : Verifient `!isAuthenticated` avant `!isAdmin/!isPro`. Si loading = false et user = null temporairement, redirect vers login au lieu du dashboard.
**Impact** : Flash de redirection incorrect sur certains navigateurs.

#### M6 — Validation inputs absente dans API layer
**Fichiers** : Tous les fichiers src/api/
**Description** : Aucun ID ni parametre n'est valide avant envoi a Supabase.
**Fix** : Ajouter des checks basiques ou Zod schema validation.

---

### BAS (ameliorations)

#### B1 — `company!.id` non-null assertion
**Fichier** : `src/pages/pro/ProCommissions.tsx` L50
**Fix** : Verifier `if (!company) return` avant l'acces.

#### B2 — 2 occurrences parseFloat pour argent
**Fichiers** : WorkHistoryList.tsx L74, AdminPartenaires.tsx L39
**Fix** : Convertir en centimes entiers.

#### B3 — Imports Edge Functions non pinnes
**Description** : `@supabase/supabase-js@2` au lieu de `@2.96.0`.
**Fix** : Pinner la version exacte.

#### B4 — ESLint pourrait etre plus strict
**Fix** : Passer a `tseslint.configs.strict`.

---

## Regles Anti-Bug

1. **JAMAIS de JWT/secret hardcode** dans le code source — utiliser Deno.env.get() ou VITE_ env vars.
2. **JAMAIS `Access-Control-Allow-Origin: '*'`** en production — restreindre au domaine exact.
3. **JAMAIS `toISOString().slice(0,10)`** — utiliser `formatLocalDate()` de `@/lib/utils`.
4. **JAMAIS de SELECT FROM profiles dans une policy RLS** — utiliser `is_admin()`, `is_pro()`, `get_my_company_id()`.
5. **Chaque nouvelle table DOIT avoir des policies RLS** pour SELECT, INSERT, UPDATE, DELETE.
6. **Chaque mutation React Query DOIT invalider toutes les queries dependantes**.
7. **Chaque appel Supabase DOIT passer par src/api/** — jamais d'appel direct depuis les composants.
8. **Les calculs financiers DOIVENT utiliser des entiers (centimes)** — jamais parseFloat pour de l'argent.
9. **Les composants > 300 lignes DOIVENT etre decomposes** en sous-composants.
10. **`signOut()` DOIT nettoyer tous les stores** — appStore + diagnosticStore + localStorage.
11. **Les libraries > 500KB DOIVENT etre lazy-loadees** — `await import()` dans le handler, pas en import statique.
12. **Les guards d'auth DOIVENT verifier loading AVANT role AVANT auth** — eviter les flashes de redirection.
13. **Les Edge Functions DOIVENT logger avec structured JSON** — pas de console.error avec des messages sensibles.
14. **Les z-index DOIVENT suivre l'echelle** : contenu 0, navbar 40, bottomnav 50, modals 60, dropdowns 70, toasts 80.

---

## Checklist Pre-Modification

### Avant de toucher a une PAGE :
- [ ] Le composant fait < 300 lignes ?
- [ ] Toutes les queries ont un hook dans queries.ts ?
- [ ] Les mutations invalident les bonnes query keys ?
- [ ] Les 4 etats sont geres : loading, error, empty, success ?
- [ ] Double-submit protege (isPending/disabled) ?

### Avant de toucher au SCHEMA DB :
- [ ] Types mis a jour dans src/types/database.ts ou partner.ts ?
- [ ] RLS active + 4 policies (SELECT, INSERT, UPDATE, DELETE) ?
- [ ] Policies admin utilisent `public.is_admin()` ?
- [ ] Index sur les foreign keys filtrees ?
- [ ] Migration testee en dev avant push ?

### Avant de toucher aux EDGE FUNCTIONS :
- [ ] Secrets dans Deno.env.get(), jamais hardcodes ?
- [ ] CORS restreint au domaine exact ?
- [ ] Inputs valides avant traitement ?
- [ ] Try/catch avec reponse JSON structuree ?
- [ ] Deploye via `supabase functions deploy` ?

### Avant de deployer :
- [ ] `npm run build` zero erreurs ?
- [ ] Pas de chunks > 500KB non lazy-load ?
- [ ] Variables d'environnement configurees sur Vercel ?
- [ ] Edge Functions deployees sur Supabase ?

---

## Carte des Dependances Critiques

```
Si on touche...                       Il faut verifier...
----------------------------------------------------------------------
src/lib/supabase.ts                → TOUT (client global)
src/stores/appStore.ts             → AuthGuard, AdminGuard, ProGuard, ParticulierGuard, useAuth
src/stores/diagnosticStore.ts      → DiagnosticPage, Steps, useAuth (cleanup)
src/hooks/useAuth.ts               → Tous les Guards, LoginPage, RegisterPages
src/hooks/queries.ts               → TOUTES les pages (dashboard + admin + pro + particulier)
src/types/database.ts              → Tous les fichiers src/api/*, queries.ts
src/types/partner.ts               → API partenaires, pages pro/particulier/admin
src/lib/ai.ts                      → ChatAI, ProChiffrage, PartChiffrage, AssistantPage
supabase/functions/ai-proxy/       → Toute l'IA (visiteur, pro, chiffrage)
supabase/functions/_shared/cors.ts → Toutes les Edge Functions
supabase/migrations/*              → Types TS, policies RLS, triggers
vercel.json                        → Headers securite, CSP, routing SPA
```

### Couplage fort (modifier ensemble) :
- `appStore.ts` ↔ `useAuth.ts` ↔ tous les Guards
- `diagnosticStore.ts` ↔ `DiagnosticPage.tsx` ↔ `diagnostic-engine.ts`
- `src/api/*.ts` ↔ `src/hooks/queries.ts` ↔ `src/types/*.ts`
- `ai-proxy/` ↔ `_shared/cors.ts` ↔ `src/lib/ai.ts`
- `supabase/migrations/*` ↔ `src/types/database.ts` + `partner.ts`

---

## Metriques Detaillees

### Repartition des fichiers source
| Dossier | Fichiers | LOC |
|---------|----------|-----|
| src/pages/ | 67 | 17 993 |
| src/components/ | 30 | 3 999 |
| src/api/ | 21 | 1 870 |
| src/hooks/ | 3 | 1 311 |
| src/lib/ | 8 | 1 560 |
| src/data/ | 8 | 2 829 |
| src/types/ | 3 | 452 |
| src/stores/ | 2 | 256 |
| supabase/ | 28 | 2 498 |

### Tables DB (24)
**Core** : profiles, brh_diagnostics, brh_homes, brh_cases, brh_appointments, brh_articles, brh_contacts
**Carnet** : brh_health_records, brh_work_history, brh_home_documents
**Partenaires** : brh_companies, brh_company_members, brh_affiliates, brh_prospects, brh_prospect_files, brh_quotes, brh_points_transactions, brh_rewards_catalog, brh_reward_claims
**Social** : brh_message_threads, brh_messages, brh_notifications, brh_social_posts, brh_simulation_shares, brh_simulation_leads
**Config** : brh_platform_settings, brh_recruitment_commissions, brh_chiffrages

### Edge Functions (4)
| Fonction | LOC | Role |
|----------|-----|------|
| ai-proxy | 136 | Proxy HTTPS vers VPS IA + enrichissement prix BRHCRM |
| chiffrage-prices | 82 | Recherche prix Batichiffrage dans BRHCRM |
| crm-sync | 123 | Webhook vers CRM BRH (retry 3x) |
| send-notification-email | 117 | Email transactionnel via Resend |

### SECURITY DEFINER Functions (14)
`handle_new_user`, `is_admin`, `get_my_role`, `is_pro`, `get_my_company_id`, `calculate_commission`, `update_company_ca`, `award_affiliate_points`, `calculate_lead_score`, `calculate_recruitment_commission`, `find_profile_by_email`, `get_company_commission_stats`, `get_my_threads_enriched`, `get_recruit_stats`, `get_full_recruit_tree`, `get_network_stats`

---

## Priorite d'action recommandee

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Fix JWT hardcode dans ai-proxy | 10 min | Securite critique |
| 2 | Fix CORS wildcard → domaine exact | 5 min | Securite critique |
| 3 | Ajouter policies RLS brh_home_documents | 10 min | Securite critique |
| 4 | Reset diagnostic store dans signOut | 5 min | Privacy |
| 5 | Lazy-load @react-pdf/renderer | 15 min | Performance -1.5MB |
| 6 | Creer .env.example | 10 min | DX |
| 7 | Creer src/api/chiffrages.ts (supprimer appels directs) | 30 min | Coherence |
| 8 | Fix z-index notification bell | 5 min | UI |
| 9 | Migrer console.error → Sentry | 30 min | Monitoring |
| 10 | Splitter queries.ts par domaine | 1h | Maintenabilite |
