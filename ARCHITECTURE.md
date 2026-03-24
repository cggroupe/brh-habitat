# Audit Architecture — BRH Habitat

**Date** : 2026-03-24
**Stack** : React 19 + Vite 7 + Tailwind CSS 4 + Supabase + Zustand + i18next
**Deploy** : Vercel (SPA)
**Metriques** : 60 fichiers source | 13 660 LOC TypeScript | 27 routes | 10 articles markdown | 6 tables DB

---

## Resume Executif

BRH Habitat est une application complete et fonctionnelle pour le diagnostic habitat en Bretagne. L'architecture est globalement saine pour un MVP v1.0 : lazy loading des pages, code splitting, RLS Supabase, guards d'authentification. **Cependant, plusieurs problemes structurels empecheront la montee en charge** : React Query est importe mais jamais utilise (tout passe par des useEffect manuels), les composants sont trop gros (5 pages > 500 lignes), l'absence de couche API centralisee va generer des bugs lors des evolutions, et des failles RLS permettent la creation anonyme de diagnostics sans contrainte. Le diagnostic engine (635 lignes) est un bon moteur de calcul, bien structure et testable.

---

## Score de Sante

| Categorie | Score | Details |
|-----------|-------|---------|
| **Structure** | 7/10 | Bonne organisation feature-based, mais composants monolithiques |
| **Data Flow** | 4/10 | React Query importe mais jamais utilise, fetch en useEffect sans cache/invalidation |
| **Securite** | 5/10 | RLS present mais policies permissives, credentials hardcodees en fallback |
| **Permissions** | 6/10 | AuthGuard + AdminGuard ok, mais elevation de role non protegee cote DB |
| **Error Handling** | 5/10 | ErrorBoundary global present, mais 2 catch silencieux, pas de monitoring |
| **TypeScript** | 8/10 | Strict mode, seulement 2 `as any`, types bien structures |
| **Performance** | 6/10 | Lazy loading + code splitting ok, mais pas de cache, pas de memo, images non optimisees |
| **DX** | 7/10 | Path aliases, ESLint, bonne convention de nommage, pas de tests |

**Score global : 6/10** — Solide pour un MVP, mais necessite un refactoring data layer avant d'ajouter des features.

---

## Phase 1 : Stack Detection

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React | 19.2.0 |
| Router | react-router-dom | 6.30.3 |
| CSS | Tailwind CSS (via @tailwindcss/vite) | 4.2.1 |
| State Management | Zustand | 5.0.11 |
| Data Fetching | @tanstack/react-query (**IMPORTE MAIS NON UTILISE**) | 5.90.21 |
| Backend/BaaS | Supabase | 2.96.0 |
| Auth | Supabase Auth | integre |
| i18n | i18next + react-i18next | 25.8.13 |
| Markdown | react-markdown + remark-gfm | 10.1.0 |
| Icons | lucide-react | 0.575.0 |
| Build | Vite | 7.3.1 |
| TypeScript | typescript | 5.9.3 (strict) |
| Deploy | Vercel | SPA (rewrites) |

---

## Phase 2 : Architecture Application

### 2.1 Structure des dossiers

```
src/
├── App.tsx                          # Router principal (27 routes)
├── main.tsx                         # Entry point + ErrorBoundary
├── index.css                        # Tailwind imports + custom styles
├── components/
│   ├── auth/
│   │   ├── AuthGuard.tsx            # Protection routes users
│   │   └── AdminGuard.tsx           # Protection routes admin
│   └── layout/
│       ├── PublicShell.tsx           # Layout public (Navbar + Footer)
│       ├── AppShell.tsx             # Layout dashboard (DashboardNav)
│       ├── AdminShell.tsx           # Layout admin (sidebar)
│       ├── Navbar.tsx               # Navigation publique
│       ├── Footer.tsx               # Footer global
│       ├── DashboardNav.tsx         # Nav dashboard user
│       └── MobileDrawer.tsx         # Menu mobile
├── pages/
│   ├── public/                      # 11 pages publiques
│   ├── dashboard/                   # 7 pages utilisateur
│   └── admin/                       # 8 pages admin
├── stores/
│   ├── appStore.ts                  # User, locale, drawer (Zustand)
│   └── diagnosticStore.ts           # State du wizard diagnostic (Zustand)
├── hooks/
│   └── useAuth.ts                   # Auth + profile fetch
├── lib/
│   ├── supabase.ts                  # Client Supabase (credentials hardcodees)
│   └── diagnostic-engine.ts         # Moteur de scoring (635 lignes)
├── data/
│   ├── diagnostic-types.ts          # Config 7 types de diagnostic
│   ├── symptoms.ts                  # 56+ symptomes avec poids/urgence
│   ├── articles.ts                  # Metadata 10 articles
│   ├── seo-strategy.ts             # 1243 lignes de contenu SEO
│   └── articles/                    # 10 fichiers markdown
├── types/
│   ├── index.ts                     # Types re-exports
│   └── database.ts                  # Types DB (User, UserRole)
└── i18n/
    ├── index.ts                     # Config i18next
    ├── fr.json                      # Traductions FR
    └── en.json                      # Traductions EN
```

**Verdict** : Organisation feature-based coherente. Convention PascalCase pour les composants, camelCase pour les utilitaires. Pas de fichiers orphelins.

### 2.2 Routing & Navigation (27 routes)

#### Routes publiques (PublicShell)
| Path | Composant | Lazy | Guard |
|------|-----------|------|-------|
| `/` | HomePage | NON (above fold) | - |
| `/diagnostic` | DiagnosticPage | OUI | - |
| `/diagnostic/resultats` | DiagnosticResultsPage | OUI | - |
| `/articles` | ArticlesPage | OUI | - |
| `/articles/:slug` | ArticlePage | OUI | - |
| `/contact` | ContactPage | OUI | - |
| `/connexion` | LoginPage | OUI | - |
| `/inscription` | RegisterPage | OUI | - |
| `/services` | ServicesPage | OUI | - |
| `/mentions-legales` | MentionsLegalesPage | OUI | - |
| `/politique-confidentialite` | PolitiqueConfidentialitePage | OUI | - |

#### Routes dashboard (AppShell + AuthGuard)
| Path | Composant | Lazy | Guard |
|------|-----------|------|-------|
| `/tableau-de-bord` | DashboardPage | OUI | AuthGuard |
| `/mes-logements` | MesLogements | OUI | AuthGuard |
| `/mes-logements/:id` | LogementDetail | OUI | AuthGuard |
| `/mes-dossiers` | MesDossiers | OUI | AuthGuard |
| `/mes-dossiers/:id` | DossierDetail | OUI | AuthGuard |
| `/mes-rdv` | MesRdv | OUI | AuthGuard |
| `/profil` | ProfilPage | OUI | AuthGuard |

#### Routes admin (AdminShell + AdminGuard)
| Path | Composant | Lazy | Guard |
|------|-----------|------|-------|
| `/admin` | AdminDashboard | OUI | AdminGuard |
| `/admin/logements` | AdminLogements | OUI | AdminGuard |
| `/admin/dossiers` | AdminDossiers | OUI | AdminGuard |
| `/admin/dossiers/:id` | AdminDossierDetail | OUI | AdminGuard |
| `/admin/rdv` | AdminRdv | OUI | AdminGuard |
| `/admin/messages` | AdminMessages | OUI | AdminGuard |
| `/admin/utilisateurs` | AdminUtilisateurs | OUI | AdminGuard |
| `/admin/articles` | AdminArticles | OUI | AdminGuard |

#### Route fallback
| Path | Action |
|------|--------|
| `*` | Navigate vers `/` |

**Problemes detectes** :
- Pas de page 404 dediee (redirection silencieuse vers `/`)
- `/diagnostic/resultats` n'est pas protege : si l'utilisateur arrive sans state dans le store, la page plante

### 2.3 Systeme de Permissions

| Couche | Implementation | Verdict |
|--------|---------------|---------|
| Frontend guards | AuthGuard (session) + AdminGuard (role === 'admin') | OK |
| RLS profiles | `id = auth.uid()` — users voient que leur profil | OK |
| RLS diagnostics | Users voient les leurs, admins voient tout | OK mais INSERT est `WITH CHECK (true)` |
| RLS homes | Users CRUD les leurs, admins SELECT + UPDATE | Admins ne peuvent PAS DELETE |
| RLS cases | Users SELECT les leurs, admins ALL | Users ne peuvent PAS creer/editer de cases |
| RLS appointments | Users SELECT + INSERT les leurs, admins ALL | OK |
| RLS articles | Anyone SELECT published, admins ALL | OK |

**CRITIQUE — INSERT policy diagnostics** : `WITH CHECK (true)` permet a N'IMPORTE QUI (meme non authentifie) de creer un diagnostic. Pas de rate limiting.

### 2.4 State Management

#### Stores Zustand
| Store | State | Probleme |
|-------|-------|----------|
| `appStore` | user, locale, drawerOpen | OK, minimal |
| `diagnosticStore` | step, selectedTypes, property, equipment, symptoms, photos, contact | OK pour le wizard, mais pas de persistance (perdu au refresh) |

#### React Query : DEPENDANCE FANTOME
`@tanstack/react-query` est :
- Installe dans package.json
- Importe dans App.tsx (QueryClient + QueryClientProvider)
- **JAMAIS utilise nulle part ailleurs**

Toutes les donnees sont fetchees via `supabase.from(...).select(...)` dans des `useEffect` ou `useCallback` manuels. Consequences :
- Pas de cache
- Pas d'invalidation automatique
- Pas de retry
- Pas de staleTime/gcTime
- Pas d'optimistic updates
- Re-fetch a chaque navigation
- Race conditions possibles sur les fetches

### 2.5 Data Flow

```
UI (composant page)
  └─ useEffect / useCallback
      └─ supabase.from('table').select(...)  <-- appel direct, PAS de hook custom
          └─ try/catch → setData() / setError()
              └─ rendu conditionnel (loading ? spinner : data ? content : error)
```

**Pas de couche API centralisee** : chaque composant construit ses propres requetes Supabase inline. Si un champ de table change, il faut modifier chaque composant individuellement.

---

## Phase 3 : Architecture Base de Donnees

### 3.1 Schema (6 tables)

| Table | Colonnes | FK | RLS | Indexes |
|-------|----------|----|-----|---------|
| `profiles` | 7 | auth.users(id) ON DELETE CASCADE | OUI | - |
| `brh_diagnostics` | 17 | auth.users(id) SET NULL | OUI | user_id, status |
| `brh_homes` | 13 | auth.users(id) CASCADE | OUI | user_id |
| `brh_cases` | 14 | users CASCADE, homes SET NULL, diagnostics SET NULL | OUI | user_id, status |
| `brh_appointments` | 12 | users SET NULL, cases SET NULL, homes SET NULL | OUI | user_id, status |
| `brh_articles` | 13 | - | OUI | slug, category, published |

### 3.2 Problemes RLS

1. **CRITIQUE** — `brh_diagnostics` INSERT : `WITH CHECK (true)` → insertion anonyme sans limite
2. **HAUT** — Policies admin utilisent `SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'` → **risque de recursion circulaire** si `profiles` a aussi une policy qui consulte `profiles`. Actuellement OK car la policy `profiles` est simple (`id = auth.uid()`), mais fragile si on ajoute des policies.
3. **MOYEN** — Pas de policy UPDATE sur `brh_diagnostics` pour les users (ils ne peuvent pas mettre a jour leurs propres diagnostics)
4. **MOYEN** — Pas de policy INSERT/UPDATE/DELETE sur `brh_cases` pour les users (seulement SELECT)
5. **BAS** — Admins ne peuvent pas DELETE `brh_homes` (seulement SELECT + UPDATE)

### 3.3 Trigger auto-admin

```sql
WHEN NEW.email = 'contact@contact-brh.fr' THEN 'admin'
```
Seul `contact@contact-brh.fr` est auto-admin. Les autres admins doivent etre promus manuellement via la table `profiles.role`. Le frontend permet aux admins de changer le role d'un autre utilisateur (`AdminUtilisateurs`), mais il n'y a **pas de policy RLS empechant un admin de se retirer ses propres droits** (seulement une protection frontend).

### 3.4 Types manquants dans database.ts

Le fichier `src/types/database.ts` ne contient que `UserRole`. Il manque les types pour :
- `brh_diagnostics`
- `brh_homes`
- `brh_cases`
- `brh_appointments`
- `brh_articles`

Chaque composant definit ses propres interfaces locales → duplication et risque de desynchronisation avec le schema.

---

## Phase 4 : Edge Functions / API

**Aucune Edge Function detectee.** Tout est fait cote client via le SDK Supabase. Pas de logique serveur.

**Risques** :
- Pas de validation serveur des donnees (seules les contraintes CHECK SQL protegent)
- Pas de rate limiting
- Pas de webhook / notification email
- Le moteur de diagnostic tourne entierement cote client (manipulable)

---

## Phase 5 : Composants & UI

### 5.1 Composants trop gros (> 300 lignes)

| Fichier | LOC | Probleme |
|---------|-----|----------|
| `seo-strategy.ts` | 1243 | Donnees statiques — acceptable |
| `DiagnosticPage.tsx` | 987 | **CRITIQUE** — Wizard complet dans 1 fichier (6 steps + submission) |
| `ArticlePage.tsx` | 969 | **HAUT** — Markdown renderer + TOC + sidebar + SEO dans 1 fichier |
| `LogementDetail.tsx` | 639 | **MOYEN** — View + Edit mode + Delete modal |
| `diagnostic-engine.ts` | 635 | Acceptable — c'est un moteur de calcul, bien structure |
| `AdminArticles.tsx` | 626 | **MOYEN** — Table + Form modal + CRUD |
| `ProfilPage.tsx` | 571 | **MOYEN** — Profil + password change + delete account |
| `MesLogements.tsx` | 501 | **MOYEN** — Liste + modal creation |

### 5.2 Formulaires

| Formulaire | Validation client | Loading state | Error handling | Double submit protect |
|------------|------------------|---------------|----------------|----------------------|
| Diagnostic wizard | Basique (step validation) | OUI | OUI (try/catch) | NON |
| Contact | Champs requis HTML5 | OUI | OUI | NON |
| Login/Register | Champs requis | OUI | OUI (setError) | NON |
| Logement creation | Champs requis HTML5 | OUI | Partiel | NON |
| RDV creation | Champs requis | OUI | Partiel | NON |
| Admin case edit | Pas de validation | OUI | OUI | NON |

**Aucun formulaire ne protege contre la double soumission.**

### 5.3 Modals & Overlays

Les modals utilisent des `fixed inset-0 z-50` avec backdrop. Pas de conflit z-index detecte (pas de BottomNav dans cette app).

---

## Phase 6 : Patterns Transversaux

### 6.1 Error Handling

| Pattern | Present | Details |
|---------|---------|---------|
| ErrorBoundary global | OUI | main.tsx — affiche erreur + bouton recharger |
| Erreurs API affichees | Partiel | Certaines pages font `setError(msg)`, d'autres `console.error` silencieux |
| Monitoring (Sentry) | NON | Aucun service de monitoring |
| Catch silencieux | OUI | `useAuth.ts:31` — catch vide dans fetchProfile |
| Console en production | OUI | 2 occurrences console.error |

### 6.2 Performance

| Critere | Status | Details |
|---------|--------|---------|
| Lazy loading pages | OUI | Toutes sauf HomePage |
| Code splitting | OUI | vendor, supabase, query (3 chunks manuels) |
| React.memo / useMemo | NON | Aucune optimisation de re-render |
| Images optimisees | NON | Pas de next/image ou lazy loading d'images |
| Bundle size | OK | ~300KB gzipped estime (chunks bien split) |
| Cache donnees | NON | Pas de React Query utilise, pas de SWR, pas de cache |
| SSR/SSG | NON | SPA pure — mauvais pour SEO des articles |

### 6.3 TypeScript

| Critere | Status | Details |
|---------|--------|---------|
| Strict mode | OUI | tsconfig strict: true |
| `as any` usage | 2 | LogementDetail:240, DiagnosticPage:921 |
| Types DB centralises | NON | Seul UserRole est dans database.ts |
| Types inline dupliques | OUI | Interfaces locales dans chaque composant |
| Non-null assertion `!` | 1 | main.tsx:35 — `getElementById('root')!` (acceptable) |

### 6.4 i18n

| Critere | Status | Details |
|---------|--------|---------|
| Config | OK | i18next avec FR/EN, detection navigateur |
| Utilisation | PARTIELLE | La majorite du contenu est hardcode en francais directement dans les JSX |
| Articles | Francais uniquement | Fichiers markdown en FR, pas de traduction |

---

## Phase 7 : Anti-Patterns & Bombes a Retardement

| Check | Status | Details |
|-------|--------|---------|
| Calculs financiers en flottants | ATTENTION | `estimated_budget NUMERIC` en DB (OK), mais calculs JS en float dans diagnostic-engine.ts. `Math.round()` utilise partout — acceptable pour des estimations, pas pour de la facturation |
| Suppression sans confirmation | NON | Delete logement et compte utilisateur demandent confirmation avec saisie "SUPPRIMER" |
| Race conditions | POSSIBLE | Fetch en useEffect sans abort controller. 2 navigations rapides = 2 fetches paralleles, le dernier gagne |
| Dates sans timezone | OK | `TIMESTAMPTZ` partout en DB. JS utilise `new Date()` |
| String concat dans queries | NON | SDK Supabase avec parametres, pas de SQL brut |
| Logique metier dupliquee | ATTENTION | Les status (pending/analyzed/contacted/closed, nouveau/en_cours/devis/travaux/termine) sont definis en dur dans chaque composant au lieu d'etre centralises |
| Imports circulaires | NON | Pas detecte |
| Constantes magiques | OUI | Pagination hardcodee (20, etc.) dans chaque admin page |
| Secrets hardcodes | OUI | Supabase URL + anon key en fallback dans supabase.ts |
| Fichier .env dans le zip | OUI | .env.local et .env.vercel.local inclus dans le zip |

---

## Findings

### CRITIQUE (bloquants)

1. **React Query installe mais jamais utilise** — `src/App.tsx:1-6`
   - **Impact** : Pas de cache, pas d'invalidation, pas de retry. Chaque navigation re-fetche tout. Race conditions possibles.
   - **Fix** : Migrer les `useEffect` + `supabase.from()` vers des hooks `useQuery` / `useMutation` custom.

2. **RLS INSERT diagnostics trop permissive** — `001_brh_full_schema.sql:82`
   - `WITH CHECK (true)` permet l'insertion anonyme sans limite.
   - **Impact** : Spam de diagnostics, abus de la base de donnees, cout Supabase.
   - **Fix** : `WITH CHECK (auth.uid() IS NOT NULL)` au minimum, ou rate limiting via Edge Function.

3. **DiagnosticPage.tsx monolithique (987 lignes)** — `src/pages/public/DiagnosticPage.tsx`
   - **Impact** : Impossible a maintenir, tester ou modifier sans risque de regression.
   - **Fix** : Extraire chaque step en composant : `StepTypeSelection`, `StepProperty`, `StepEquipment`, `StepSymptoms`, `StepPhotos`, `StepContact`.

### HAUT (risque important)

4. **Pas de couche API centralisee** — Toute l'app
   - Les requetes Supabase sont codees inline dans chaque composant.
   - **Impact** : Si un nom de table/colonne change, il faut modifier N fichiers. Pas de single source of truth.
   - **Fix** : Creer `src/api/` avec des fonctions par entite (`diagnostics.api.ts`, `homes.api.ts`, etc.).

5. **Types DB non centralises** — `src/types/database.ts` ne contient que `UserRole`
   - **Impact** : Interfaces locales dupliquees dans 15+ composants, desynchronisation garantie.
   - **Fix** : Generer les types avec `supabase gen types typescript` ou les definir manuellement dans database.ts.

6. **Credentials Supabase hardcodees en fallback** — `src/lib/supabase.ts:2-3`
   - **Impact** : Si les env vars sont absentes, l'app fonctionne avec les credentials en clair dans le bundle JS.
   - **Fix** : Supprimer les fallbacks. L'app doit planter si les env vars manquent.

7. **Pas de protection double soumission** — Tous les formulaires
   - **Impact** : Un clic rapide cree 2 diagnostics, 2 logements, 2 RDV.
   - **Fix** : `disabled={loading}` sur les boutons submit + `setLoading(true)` au debut de chaque handler.

8. **Fichiers .env dans le zip/git** — `.env.local`, `.env.vercel.local`
   - **Impact** : Credentials exposees si le zip est partage.
   - **Fix** : Ajouter `*.local` au `.gitignore` (deja fait pour .gitignore, mais les fichiers sont dans le zip).

### MOYEN (a planifier)

9. **i18n partiellement implemente** — Tout le contenu est hardcode en francais dans les JSX malgre i18next installe.

10. **Pas de page 404** — Le fallback `*` redirige vers `/` silencieusement.

11. **ArticlePage.tsx trop gros (969 lignes)** — Melange markdown renderer, TOC, sidebar, SEO.

12. **Constantes magiques non centralisees** — Status, pagination (20), types de diagnostic, etc. dupliques dans chaque composant.

13. **Pas d'AbortController** sur les fetches — Race conditions si navigation rapide.

14. **Pas de validation serveur** — Les contraintes CHECK SQL sont la seule protection. Pas de sanitization des inputs.

15. **Users ne peuvent pas creer/editer de cases** — RLS `brh_cases` : users ont seulement SELECT. Seuls les admins ont ALL.

### BAS (ameliorations)

16. **SPA pure = mauvais SEO** pour les articles de blog — Pas de SSR/SSG (pas critique si le blog est juste complementaire).

17. **Pas de tests** — Aucun test unitaire, integration ou E2E.

18. **Pas de monitoring** — Ni Sentry, ni LogRocket, ni analytics.

19. **2 usages `as any`** — LogementDetail:240 et DiagnosticPage:921.

20. **Service Worker / PWA non implemente** — Pas de mode offline.

---

## Regles Anti-Bug

### AVANT chaque modification, verifier :

1. **TOUJOURS verifier les RLS** : Si tu ajoutes une table, active RLS + policies pour chaque operation (SELECT, INSERT, UPDATE, DELETE) SEPAREMENT.

2. **JAMAIS de fetch Supabase inline dans un composant** : Creer un hook ou une fonction API dediee dans `src/api/`.

3. **TOUJOURS ajouter `disabled={loading}`** sur les boutons de soumission pour eviter les doubles soumissions.

4. **CENTRALISER les constantes** : Status, types, paginations doivent etre definis UNE SEULE FOIS dans `src/data/constants.ts`.

5. **TOUJOURS typer les reponses Supabase** : Utiliser des types centralises dans `src/types/database.ts`, jamais d'interfaces locales.

6. **TOUJOURS nettoyer les useEffect** : Return une cleanup function avec `mounted = false` ou `AbortController`.

7. **JAMAIS de credentials en fallback** dans le code source. L'app doit echouer explicitement si les env vars manquent.

8. **TOUJOURS verifier la coherence des policies** admin : si un admin peut modifier une entite en frontend, la policy RLS doit le permettre aussi.

9. **TESTER les formulaires** avec : champs vides, valeurs extremes, double-clic rapide, perte de connexion.

10. **RESPECTER la structure existante** : public/ pour les pages non-auth, dashboard/ pour les pages user, admin/ pour les pages admin.

11. **NE PAS casser le lazy loading** : Toute nouvelle page doit etre importee avec `lazy()`.

12. **TOUJOURS utiliser TIMESTAMPTZ** (pas TIMESTAMP) pour les colonnes date en DB.

13. **NE PAS ajouter de `as any`** — corriger le type a la source.

---

## Checklist Pre-Modification

### Avant de toucher au schema Supabase :
- [ ] Migration numerotee sequentiellement (002_xxx.sql, 003_xxx.sql...)
- [ ] RLS active sur la nouvelle table
- [ ] Policies pour SELECT, INSERT, UPDATE, DELETE separement
- [ ] Indexes sur les colonnes user_id et status
- [ ] Trigger updated_at
- [ ] Types TypeScript mis a jour dans database.ts

### Avant de toucher a un composant page :
- [ ] Lire le composant entier
- [ ] Verifier les imports (pas d'import circulaire)
- [ ] Verifier le data flow (d'ou viennent les donnees ?)
- [ ] Verifier les error states (que se passe-t-il si le fetch echoue ?)
- [ ] Verifier le loading state

### Avant de toucher au diagnostic :
- [ ] Verifier diagnostic-engine.ts (scoring)
- [ ] Verifier diagnosticStore.ts (state)
- [ ] Verifier symptoms.ts (donnees)
- [ ] Verifier diagnostic-types.ts (config)
- [ ] Tester avec 0 symptomes, 1 symptome, tous les symptomes

---

## Carte des Dependances Critiques

```
useAuth.ts ──> supabase.ts ──> .env (VITE_SUPABASE_*)
     │                │
     ▼                ▼
appStore.ts    [Toutes les pages dashboard et admin]
     │
     ▼
AuthGuard.tsx ──> AdminGuard.tsx
     │                │
     ▼                ▼
AppShell.tsx    AdminShell.tsx

diagnosticStore.ts ──> DiagnosticPage.tsx ──> DiagnosticResultsPage.tsx
                              │
                              ▼
                    diagnostic-engine.ts ←── symptoms.ts
                                         ←── diagnostic-types.ts
```

### Fichiers couples (si tu touches X, verifie Y) :

| Si tu modifies... | Verifie aussi... |
|-------------------|-------------------|
| `supabase.ts` | Toutes les pages (15 fichiers) |
| `appStore.ts` | useAuth, AuthGuard, AdminGuard, toutes les pages |
| `diagnosticStore.ts` | DiagnosticPage, DiagnosticResultsPage |
| `diagnostic-engine.ts` | symptoms.ts, diagnostic-types.ts, DiagnosticResultsPage |
| `001_brh_full_schema.sql` | database.ts + tous les composants qui fetchent |
| `AuthGuard.tsx` | Toutes les pages dashboard (7) |
| `AdminGuard.tsx` | Toutes les pages admin (8) |
| `PublicShell.tsx` | Navbar.tsx, Footer.tsx |
| `AppShell.tsx` | DashboardNav.tsx, MobileDrawer.tsx |

---

## Roadmap d'amelioration suggeree

### Phase 1 — Securite (immediat)
- [ ] Corriger RLS INSERT diagnostics
- [ ] Supprimer credentials fallback de supabase.ts
- [ ] Supprimer .env.local du zip

### Phase 2 — Data Layer (avant toute nouvelle feature)
- [ ] Creer `src/api/` avec hooks React Query par entite
- [ ] Centraliser les types DB dans database.ts
- [ ] Centraliser les constantes (status, types, pagination)

### Phase 3 — Composants (refactoring progressif)
- [ ] Eclater DiagnosticPage en 6 sous-composants
- [ ] Eclater ArticlePage en composants reutilisables
- [ ] Ajouter protection double soumission sur tous les formulaires
- [ ] Ajouter AbortController sur les fetches

### Phase 4 — Production readiness
- [ ] Ajouter Sentry / monitoring
- [ ] Ajouter des tests (au moins E2E sur le parcours diagnostic)
- [ ] Page 404
- [ ] Optimisation images (WebP, lazy loading)
