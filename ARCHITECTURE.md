# Audit Architecture v3 — BRH Habitat (Bretagne Renovation Habitat)

**Date** : 2026-04-03
**Stack** : React 19.2 + Vite 7.3 + TypeScript 5.9 + Tailwind CSS 4.2 + Supabase + Zustand + React Query 5
**Deploy** : Vercel (SPA) | Sentry (monitoring)
**Metriques** : 74 fichiers source | ~16 289 LOC | 26 routes | 12 composants reutilisables | 28 hooks | 2 stores | 10 tables DB

---

## Resume Executif

BRH Habitat est une application SaaS de diagnostic et renovation habitat ciblee sur la Bretagne. L'architecture est **solide et bien structuree** avec une separation claire des responsabilites (API layer centralise, hooks React Query, stores Zustand). La securite backend (RLS Supabase) est globalement bonne avec des fonctions `SECURITY DEFINER` pour eviter la recursion. Les principales faiblesses sont : **4 policies RLS encore vulnerables a la recursion circulaire**, une **policy INSERT trop permissive sur brh_contacts**, **5 composants trop volumineux** (>300 lignes), et des **bugs de timezone** sur les dates. Le projet est fonctionnel et deployable mais necessite des corrections critiques avant mise en production.

---

## Score de Sante

| Categorie | Score | Details |
|-----------|-------|---------|
| Structure | 8/10 | Organisation claire, lazy loading, code splitting bien configure |
| Data Flow | 7/10 | API layer centralise mais 3 hooks manquants, invalidations incompletes |
| Securite | 6/10 | RLS en place mais 4 policies circulaires + 1 policy trop permissive |
| Permissions | 8/10 | RBAC frontend + backend, role escalation impossible via RLS |
| Error Handling | 8/10 | Sentry + Error Boundary + protection double-submit sur tous les formulaires |
| TypeScript | 8/10 | Strict mode, 0 `as any`, 2 non-null assertions mineures |
| Performance | 7/10 | Lazy loading optimal, mais ArticlePage 179KB, pas de PWA/SW |
| DX | 8/10 | Hooks bien organises, types complets, bonne convention de nommage |

**Score global : 7.5/10**

---

## Findings

### CRITIQUE (bloquants)

#### C1 — Policies RLS circulaires sur 4 tables
**Fichiers** : `supabase/migrations/20260227203800_brh_full_schema.sql`
**Tables** : brh_diagnostics (L84-92), brh_cases (L158-161), brh_appointments (L189-192), brh_articles (L220-223)
**Description** : Les policies admin utilisent `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` au lieu de la fonction `public.is_admin()`. Cela declenche une evaluation RLS recursive sur la table profiles.
**Impact** : Performances degradees, risque de deadlock ou d'erreur silencieuse en cas de modification des policies profiles.
**Fix** : Remplacer par `public.is_admin()` dans les 4 tables (migration dediee).

#### C2 — Policy INSERT trop permissive sur brh_contacts
**Fichier** : `supabase/migrations/20260324180000_add_contact_columns.sql` L60-61
**Description** : `WITH CHECK (true)` autorise les INSERT sans aucune authentification. Aucun rate limiting cote DB.
**Impact** : Spam massif possible, bot abuse, pollution de la table contacts.
**Fix** : Changer en `WITH CHECK (auth.uid() IS NOT NULL)` ou ajouter un rate limiting via Edge Function.

#### C3 — Bug timezone sur les dates
**Fichiers** :
- `src/pages/dashboard/LogementDetail.tsx` L508 : `new Date().toISOString().slice(0, 10)`
- `src/components/carnet/DocumentsList.tsx` L61 : `d.toISOString().slice(0, 10)`
**Description** : `toISOString()` convertit en UTC avant le slice. Un utilisateur en UTC-5 a 23h le 15 mars obtient le 16 mars.
**Impact** : Dates incorrectes stockees en base pour les utilisateurs hors UTC.
**Fix** : Utiliser `getFullYear()/getMonth()/getDate()` avec padding (regle projet existante).

---

### HAUT (risque important)

#### H1 — 3 fonctions API sans hooks React Query
**Fichier** : `src/hooks/queries.ts`
**Fonctions orphelines** :
- `fetchContacts()` (contacts.ts L28-50) — pas de `useAdminContacts()`
- `updateContactStatus()` (contacts.ts L52-72) — pas de `useUpdateContactStatus()`
- `upsertDraftDiagnostic()` (diagnostics.ts L109-156) — appele directement depuis DiagnosticPage
**Impact** : Bypass du cache React Query, donnees potentiellement stales, pas d'invalidation automatique.
**Fix** : Creer les 3 hooks manquants avec invalidation correcte.

#### H2 — Mutations delete sans hooks
**Fichier** : `src/hooks/queries.ts`
**Manquants** : `useDeleteAppointment()`, `useDeleteDiagnostic()`, `useDeleteCase()`
**Impact** : Suppression sans invalidation du cache, UI desynchronisee.
**Fix** : Creer les hooks avec `onSuccess: invalidateQueries`.

#### H3 — Invalidations de mutations incompletes
**Fichier** : `src/hooks/queries.ts`
- L234-242 : `useUpdateAppointment()` — pas de `setQueryData` pour update optimiste
- L272-279 : `useCreateDiagnostic()` — n'invalide pas `['diagnostics', 'draft']` ni `['diagnostics', 'completed']`
- L546-553 : `useDeleteWorkEntry()` — invalide `['work-history']` sans specifier `homeId`
- L503-510 : `useDeleteHealthRecord()` — meme probleme
**Impact** : Cache stale apres mutations, donnees affichees incorrectes.

#### H4 — Race condition AdminGuard
**Fichier** : `src/components/auth/AdminGuard.tsx` L8-29
**Description** : Un utilisateur non-admin avec `loading: true` reste bloque sur le spinner infini. L'ordre des checks est incorrect : `isAuthenticated && isAdmin` (L8) → `loading` (L12) → jamais `!isAdmin` (L27).
**Impact** : UX degradee — spinner infini au lieu de redirection vers dashboard.
**Fix** : Reordonner les checks : verifier `!isAuthenticated` et `!isAdmin` AVANT `loading`.

#### H5 — 5 composants trop volumineux
| Fichier | Lignes | Recommandation |
|---------|--------|----------------|
| `src/pages/public/ArticlePage.tsx` | 969 | Extraire TableOfContents, ArticleContent, RelatedArticles |
| `src/pages/public/DiagnosticResultsPage.tsx` | 773 | Extraire ResultsHeader, DomainResults, AidesSection |
| `src/pages/dashboard/LogementDetail.tsx` | 633 | Extraire CarnetSanitaire, HealthOverview, DocumentsTab |
| `src/pages/admin/AdminArticles.tsx` | 574 | Extraire ArticleForm, ArticleList, ArticlePreview |
| `src/pages/dashboard/ProfilPage.tsx` | 541 | Extraire ProfileForm, SecuritySection, PreferencesTab |

#### H6 — Inconsistances TypeScript <-> Schema DB
**Fichier** : `src/types/database.ts` — `BrhDiagnosticRow`
**Colonnes** : `property_type`, `property_address`, `property_surface`, `property_year`, `property_floors`, `contact_name`, `contact_phone`, `contact_email`
**Probleme** : Optionnelles/nullable en TypeScript mais `NOT NULL` en DB (ou l'inverse).
**Impact** : Erreurs runtime silencieuses, insertions refusees par Supabase.
**Fix** : Aligner les types TS avec le schema reel.

---

### MOYEN (a planifier)

#### M1 — Index manquants sur foreign keys
**Tables concernees** :
- `brh_cases` : manque index sur `home_id` et `diagnostic_id`
- `brh_appointments` : manque index sur `case_id` et `home_id`
**Impact** : Requetes admin lentes avec croissance des donnees.
**Fix** :
```sql
CREATE INDEX idx_brh_cases_home ON brh_cases(home_id);
CREATE INDEX idx_brh_cases_diagnostic ON brh_cases(diagnostic_id);
CREATE INDEX idx_brh_appointments_case ON brh_appointments(case_id);
CREATE INDEX idx_brh_appointments_home ON brh_appointments(home_id);
```

#### M2 — Appels Supabase directs (bypass API layer)
**8 violations** :
- `src/components/carnet/DocumentsList.tsx` L68-95 : storage upload/download
- `src/pages/public/LoginPage.tsx` L29-33 : fetch profile
- `src/pages/public/RegisterPage.tsx` L109-113 : fetch profile
- `src/hooks/useAuth.ts` L26-30, 53, 77 : auth operations (acceptable)
**Impact** : Pas de gestion de cache centralisee, erreurs non standardisees.

#### M3 — Non-null assertions sur env vars
**Fichier** : `src/components/CalendarPicker.tsx` L179-180
**Code** : `apikey: BRHCRM_ANON_KEY!` — crash si variable non definie.
**Fix** : Utiliser `?? ''` ou early return avec message d'erreur.

#### M4 — Calculs financiers en float
**Fichiers** :
- `src/pages/admin/AdminDossierDetail.tsx` L74 : `parseFloat(estimatedBudget)`
- `src/components/carnet/WorkHistoryList.tsx` L74 : `parseFloat(form.cost)`
**Impact** : Erreurs d'arrondi sur les budgets (0.1 + 0.2 !== 0.3).
**Fix** : Stocker en centimes (entiers) et diviser par 100 pour l'affichage.

#### M5 — Policies DELETE manquantes pour admins
**Tables** : brh_diagnostics, brh_cases, brh_articles, brh_contacts, brh_appointments
**Impact** : Admins ne peuvent pas supprimer via Supabase client (seulement via service role).

#### M6 — Pas de .env.example
**Impact** : Nouveaux developpeurs ne savent pas quelles variables configurer.
**Fix** : Creer `.env.example` avec les 4 variables documentees.

#### M7 — Queries diagnostics dupliquees
**Fichier** : `src/hooks/queries.ts` L249-295
- `useUserDiagnostics()` : tous les diagnostics
- `useUserDraftDiagnostic()` : sous-ensemble (draft uniquement)
- `useUserCompletedDiagnostics()` : sous-ensemble (non-draft)
**Fix** : Utiliser `select` option de React Query pour deriver depuis une seule query.

---

### BAS (ameliorations)

#### B1 — console.error en production
12 instances de `console.error` — remplacer par Sentry.captureException().

#### B2 — Pas de PWA / Service Worker
Pas de manifest.json ni de service worker. A considerer si usage mobile intensif.

#### B3 — dns-prefetch manquant pour Supabase
**Fichier** : `index.html` — ajouter `<link rel="dns-prefetch" href="https://lygmmvxnmvlgynmrcpny.supabase.co">`.

#### B4 — ESLint pourrait etre plus strict
Utiliser `tseslint.configs.strictTypeChecked` au lieu de `recommended`.

#### B5 — ArticlePage chunk trop lourd (179 KB)
Lazy-loader le contenu markdown separement du composant page.

#### B6 — Pas d'admin override sur le storage bucket
Les admins ne peuvent pas gerer les documents utilisateurs dans le bucket `home-documents`.

---

## Regles Anti-Bug

Ces regles DOIVENT etre respectees avant chaque modification :

1. **JAMAIS `toISOString().slice(0,10)`** — Utiliser `getFullYear()/getMonth()/getDate()` avec padding pour les dates locales.

2. **JAMAIS de SELECT FROM profiles dans une policy RLS** — Utiliser `public.is_admin()` ou `public.get_my_role()` (SECURITY DEFINER).

3. **Chaque mutation React Query DOIT invalider toutes les queries dependantes** — Verifier les query keys exactes (incluant les ID specifiques).

4. **Chaque nouvelle fonction API DOIT avoir un hook React Query** — Jamais d'appel Supabase direct depuis un composant (sauf storage/auth).

5. **Chaque composant > 300 lignes DOIT etre decompose** — Extraire la logique metier dans des hooks, l'UI dans des sous-composants.

6. **Les policies RLS admin DOIVENT couvrir SELECT, INSERT, UPDATE et DELETE** — Verifier les 4 operations.

7. **Les types TypeScript DOIVENT correspondre exactement au schema DB** — Nullable en TS <-> nullable en SQL.

8. **Les calculs financiers DOIVENT utiliser des entiers (centimes)** — `parseFloat()` interdit pour les montants.

9. **Les variables d'environnement DOIVENT etre verifiees avant usage** — Early return ou throw, jamais de `!` non-null assertion.

10. **Les guards d'authentification DOIVENT verifier le role AVANT le loading** — Eviter les spinners infinis pour les utilisateurs non-autorises.

11. **Chaque formulaire DOIT gerer : vide, loading, erreur, succes, double-submit** — Utiliser `isPending` des mutations.

12. **Les index SQL DOIVENT exister sur toutes les foreign keys filtrees** — Verifier avec `EXPLAIN ANALYZE`.

13. **Les policies INSERT DOIVENT toujours verifier `auth.uid() IS NOT NULL`** — Jamais `WITH CHECK (true)` sauf raison documentee.

14. **Les z-index DOIVENT suivre l'echelle** : contenu z-0, navbar z-40, bottomnav z-50, modals z-[60]+, toasts z-[70]+.

---

## Checklist Pre-Modification

### Avant de toucher a une PAGE :
- [ ] Verifier que le composant fait < 300 lignes
- [ ] Verifier que toutes les queries utilisees ont un hook dans `queries.ts`
- [ ] Verifier que les mutations invalident les bonnes query keys
- [ ] Verifier la gestion des 4 etats : loading, error, empty, success
- [ ] Verifier la protection double-submit sur les formulaires

### Avant de toucher au SCHEMA DB :
- [ ] Verifier la coherence avec `src/types/database.ts`
- [ ] Verifier que RLS est active sur la nouvelle table
- [ ] Ajouter les 4 policies (SELECT, INSERT, UPDATE, DELETE) pour users ET admins
- [ ] Utiliser `public.is_admin()` dans les policies admin
- [ ] Ajouter les index sur les foreign keys
- [ ] Tester avec un utilisateur non-admin que les policies bloquent

### Avant de toucher a l'AUTHENTIFICATION :
- [ ] Ne JAMAIS hardcoder `loading: false` sans documenter pourquoi
- [ ] Verifier que `onAuthStateChange` gere le SIGNED_OUT
- [ ] Verifier que le profile est charge APRES confirmation de l'auth
- [ ] Tester : utilisateur non-auth -> redirection login
- [ ] Tester : utilisateur auth non-admin -> redirection dashboard (pas spinner)

### Avant de toucher aux STYLES :
- [ ] Utiliser `@layer base {}` pour les resets CSS (jamais `* { margin: 0 }` sans layer)
- [ ] Verifier les z-index (echelle documentee ci-dessus)
- [ ] Tester responsive mobile-first
- [ ] Verifier les variables CSS Tailwind 4 : `--font-*` (pas `--font-family-*`)

---

## Carte des Dependances Critiques

```
Si on touche...                    Il faut verifier...
--------------------------------------------------------------------
src/lib/supabase.ts            ->  TOUT (client global)
src/stores/appStore.ts         ->  AuthGuard, AdminGuard, useAuth, Navbar, toutes les pages
src/stores/diagnosticStore.ts  ->  DiagnosticPage, StepProperty/Types/Symptoms/Situation/Equipment
src/hooks/useAuth.ts           ->  AuthGuard, AdminGuard, LoginPage, RegisterPage, AppShell
src/hooks/queries.ts           ->  TOUTES les pages (dashboard + admin)
src/types/database.ts          ->  Tous les fichiers src/api/*, queries.ts
src/api/homes.ts               ->  MesLogements, LogementDetail, AdminLogements, DashboardPage
src/api/diagnostics.ts         ->  DiagnosticPage, DiagnosticResultsPage, DashboardPage
src/api/cases.ts               ->  MesDossiers, DossierDetail, AdminDossiers, AdminDossierDetail
src/api/appointments.ts        ->  MesRdv, AdminRdv, ContactRdvModal, CalendarPicker
src/api/contacts.ts            ->  ContactPage, AdminMessages
src/lib/diagnostic-engine.ts   ->  DiagnosticResultsPage, DiagnosticPage
src/lib/aides-engine.ts        ->  DiagnosticResultsPage, AidesCard
src/i18n/*.json                ->  Tous les composants utilisant useTranslation()
supabase/migrations/*          ->  Types TS, policies RLS, fonctions SECURITY DEFINER
vercel.json                    ->  Headers securite, CSP, routing SPA
vite.config.ts                 ->  Build output, chunks, performance
```

### Couplage fort (modifier ensemble) :
- `appStore.ts` <-> `useAuth.ts` <-> `AuthGuard.tsx` <-> `AdminGuard.tsx`
- `diagnosticStore.ts` <-> `DiagnosticPage.tsx` <-> `diagnostic-engine.ts`
- `src/api/*.ts` <-> `src/hooks/queries.ts` <-> `src/types/database.ts`
- `supabase/migrations/*` <-> `src/types/database.ts`

---

## Architecture des Tables (Schema Actuel)

```
profiles <---------------- auth.users (ON DELETE CASCADE)
    |
    +-- brh_diagnostics (user_id -> auth.users, ON DELETE SET NULL)
    |       |
    |       +-- brh_appointments (diagnostic_id -> brh_diagnostics)
    |
    +-- brh_homes (user_id -> auth.users, ON DELETE CASCADE)
    |       |
    |       +-- brh_cases (home_id -> brh_homes, ON DELETE SET NULL)
    |       |       |
    |       |       +-- brh_appointments (case_id -> brh_cases)
    |       |
    |       +-- brh_health_records (home_id -> brh_homes, ON DELETE CASCADE)
    |       +-- brh_work_history (home_id -> brh_homes, ON DELETE CASCADE)
    |       +-- brh_home_documents (home_id -> brh_homes, ON DELETE CASCADE)
    |
    +-- brh_appointments (user_id -> auth.users, ON DELETE SET NULL)

brh_articles (standalone — pas de FK utilisateur)
brh_contacts (standalone — pas de FK utilisateur)
```

### Fonctions SECURITY DEFINER :
- `public.is_admin()` — Verifie role admin sans declencher RLS
- `public.get_my_role()` — Retourne le role courant sans recursion
- `public.handle_new_user()` — Trigger creation profil auto

---

## Metriques Detaillees

### Repartition des fichiers source
| Dossier | Fichiers .ts/.tsx | LOC approximatif |
|---------|-------------------|------------------|
| src/pages/public/ | 12 | ~5 200 |
| src/pages/dashboard/ | 7 | ~3 800 |
| src/pages/admin/ | 8 | ~3 100 |
| src/components/ | 14 | ~2 400 |
| src/api/ | 11 | ~1 200 |
| src/hooks/ | 2 | ~560 |
| src/stores/ | 2 | ~130 |
| src/lib/ | 4 | ~1 800 |
| src/types/ | 2 | ~200 |
| src/data/ | 8 | ~2 000 |
| src/i18n/ | 3 | ~300 |

### Build output (dist/)
| Chunk | Taille |
|-------|--------|
| index (main bundle) | 293 KB |
| ArticlePage | 179 KB |
| supabase client | 167 KB |
| LogementDetail | 77 KB |
| DiagnosticResultsPage | 47 KB |
| CSS total | 88 KB |
| **Total** | **~1.6 MB** |

---

## Priorite d'action recommandee

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Migration RLS : remplacer 4 policies circulaires par `is_admin()` | 30 min | Securite critique |
| 2 | Migration RLS : fix policy INSERT brh_contacts | 10 min | Anti-spam critique |
| 3 | Fix bug timezone (2 fichiers) | 15 min | Donnees correctes |
| 4 | Fix AdminGuard race condition | 10 min | UX |
| 5 | Creer 6 hooks React Query manquants | 1h | Coherence data flow |
| 6 | Aligner types TS <-> schema DB | 30 min | Type safety |
| 7 | Ajouter 4 index FK manquants | 10 min | Performance |
| 8 | Migration : ajouter policies DELETE admin | 20 min | Admin fonctionnel |
| 9 | Decomposer ArticlePage (969L) | 2h | Maintenabilite |
| 10 | Creer .env.example | 5 min | DX |
