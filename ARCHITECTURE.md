# Audit Architecture v2 — BRH Habitat

**Date** : 2026-03-24 (post-refactoring)
**Stack** : React 19 + Vite 7 + Tailwind CSS 4 + Supabase + Zustand + React Query + i18next
**Deploy** : Vercel (SPA) avec security headers (CSP, HSTS, X-Frame-Options)
**Metriques** : 74 fichiers source | 16 289 LOC TypeScript | 26 routes | 3 engines | 6 API modules | 27 hooks

---

## Resume Executif

L'architecture a fait un bond significatif depuis la v1. Les 3 failles critiques RLS sont corrigees, la couche API est centralisee avec React Query (27 hooks), les composants sont bien decomposes (DiagnosticPage passe de 987 a 165 lignes), et 3 engines metier solides (diagnostic, aides, renovation) forment le coeur fonctionnel. **Les principaux points de vigilance restants** : quelques pages admin gardent des appels Supabase directs pour des fetches secondaires, la ContactRdvModal insere dans des colonnes qui n'existent pas dans le schema SQL actuel, et la page ContactPage a un formulaire non connecte a la DB.

---

## Score de Sante

| Categorie | Score | v1 | Progression | Details |
|-----------|-------|----|-------------|---------|
| **Structure** | 8/10 | 7 | +1 | Bonne organisation, composants bien decomposes |
| **Data Flow** | 7/10 | 4 | +3 | Couche API + React Query en place, quelques residus directs |
| **Securite** | 8/10 | 5 | +3 | RLS corrigees, security headers, plus de credentials hardcodees |
| **Permissions** | 8/10 | 6 | +2 | is_admin() SECURITY DEFINER, policies separees |
| **Error Handling** | 6/10 | 5 | +1 | ErrorBoundary + React Query errors, mais pas de monitoring |
| **TypeScript** | 7/10 | 8 | -1 | 3 usages `as any` ajoutes (ContactRdvModal + DiagnosticPage) |
| **Performance** | 7/10 | 6 | +1 | React Query cache (staleTime 5min), lazy loading, code splitting |
| **DX** | 8/10 | 7 | +1 | Constantes centralisees, types complets, hooks reutilisables |

**Score global : 7.4/10** (vs 6/10 en v1) — Progression solide, pret pour une production serieuse.

---

## Phase 1 : Stack & Metriques

### Stack

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React | 19.2.0 |
| Router | react-router-dom | 6.30.3 |
| CSS | Tailwind CSS (via @tailwindcss/vite) | 4.2.1 |
| State (global) | Zustand | 5.0.11 |
| Data Fetching | @tanstack/react-query | 5.90.21 |
| Backend/BaaS | Supabase | 2.96.0 |
| Auth | Supabase Auth | integre |
| i18n | i18next + react-i18next | 25.8.13 |
| Markdown | react-markdown + remark-gfm | 10.1.0 |
| Icons | lucide-react | 0.575.0 |
| Build | Vite | 7.3.1 |
| TypeScript | typescript | 5.9.3 (strict) |
| Deploy | Vercel | SPA + security headers |

### Metriques

| Metrique | Compte |
|----------|--------|
| Fichiers source (.ts/.tsx) | 74 |
| LOC total | 16 289 |
| Pages/routes | 26 |
| Composants UI reutilisables | 12 |
| Hooks custom | 28 (1 useAuth + 27 queries) |
| Stores Zustand | 2 (appStore, diagnosticStore) |
| Modules API | 6 (diagnostics, homes, cases, appointments, profiles, articles) |
| Engines metier | 3 (diagnostic, aides, renovation-plan) |
| Tables DB | 6 |
| Migrations | 2 |
| Dependances npm | 0 vulnerabilites |

### Top 10 fichiers les plus gros

| Fichier | LOC | Status |
|---------|-----|--------|
| seo-strategy.ts | 1 243 | Donnees statiques — OK |
| ArticlePage.tsx | 969 | A decomposer (v3) |
| diagnostic-engine.ts | 803 | Engine — acceptable |
| DiagnosticResultsPage.tsx | 773 | Complex mais bien structure |
| AdminArticles.tsx | 574 | CRUD complet — acceptable |
| LogementDetail.tsx | 551 | View + Edit — acceptable |
| ProfilPage.tsx | 541 | Multi-sections — acceptable |
| HomePage.tsx | 479 | Page marketing — OK |
| MesLogements.tsx | 467 | Liste + modal — OK |
| AdminDossierDetail.tsx | 458 | Detail + edit — OK |

---

## Phase 2 : Architecture Application

### Routing (26 routes)

| Zone | Routes | Guard | React Query |
|------|--------|-------|-------------|
| Public (11) | /, /diagnostic, /diagnostic/resultats/:id, /articles, /articles/:slug, /contact, /connexion, /inscription, /services, /mentions-legales, /politique-confidentialite | Aucun | N/A |
| Dashboard (7) | /tableau-de-bord, /mes-logements, /mes-logements/:id, /mes-dossiers, /mes-dossiers/:id, /mes-rdv, /profil | AuthGuard | Oui (hooks) |
| Admin (8) | /admin, /admin/logements, /admin/dossiers, /admin/dossiers/:id, /admin/rdv, /admin/messages, /admin/utilisateurs, /admin/articles | AdminGuard | Oui (hooks) |
| 404 | * | Aucun | N/A |

### Data Flow

```
v2 Architecture :

UI Page
  └── useXxx() hook (React Query)  ← Cache, retry, invalidation automatique
      └── api/xxx.ts function       ← Couche API centralisee
          └── supabase.from()       ← Client Supabase type
              └── PostgreSQL + RLS  ← Securite cote serveur

Exceptions (appels directs residuels) :
  - DiagnosticPage.tsx : insert diagnostic (payload complexe)
  - ContactRdvModal.tsx : update diagnostic + insert appointment
  - AdminDashboard.tsx : stats dashboard (useQuery inline)
  - AdminUtilisateurs.tsx : counts homes/cases/diags
  - ProfilPage.tsx : supabase.auth.updateUser/signOut
  - LoginPage/RegisterPage : supabase.auth.signIn/signUp
```

### React Query — Configuration & Usage

```typescript
// App.tsx — Defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**27 hooks** dans queries.ts couvrant toutes les entites. Chaque mutation invalide les queries dependantes.

---

## Phase 3 : Base de Donnees & RLS

### Schema (6 tables, 2 migrations)

Toutes les tables ont RLS active. La migration 002 a corrige les failles critiques :

| Table | Policies | Status |
|-------|----------|--------|
| profiles | SELECT own + UPDATE own (role locked) + admin SELECT/UPDATE via is_admin() | ✅ Securise |
| brh_diagnostics | SELECT own + INSERT auth required + UPDATE own + admin SELECT/UPDATE | ✅ Securise |
| brh_homes | ALL own + admin ALL via is_admin() | ✅ Securise |
| brh_cases | ALL own + admin ALL | ✅ Securise |
| brh_appointments | SELECT own + INSERT own + UPDATE own + admin ALL | ✅ Securise |
| brh_articles | SELECT published + admin ALL | ✅ Securise |

---

## Findings

### CRITIQUE (bloquants)

**Aucun finding critique.** Les 3 critiques de la v1 ont ete corriges.

### HAUT (risque important)

**1. ContactRdvModal insere des colonnes inexistantes dans brh_appointments**
- **Fichier** : `src/components/ContactRdvModal.tsx:143-154`
- **Description** : La modal insere `contact_name`, `contact_phone`, `contact_email`, `preferred_slot`, `diagnostic_id` dans `brh_appointments`, mais le schema SQL ne contient pas ces colonnes. L'insert echouera silencieusement (Supabase ignore les colonnes inconnues en INSERT mais ne les stocke pas).
- **Impact** : Les coordonnees du particulier et le lien vers le diagnostic sont PERDUS. L'admin recoit un RDV vide sans contexte.
- **Fix** : Creer une migration 003 ajoutant ces colonnes a `brh_appointments`, OU utiliser les colonnes existantes (`notes` pour le contexte, `user_id` si connecte).

**2. Page Contact (/contact) — formulaire non connecte**
- **Fichier** : `src/pages/public/ContactPage.tsx`
- **Description** : Le formulaire de contact fait un `setTimeout(1200ms)` puis affiche "Envoye !" sans aucun appel API. Les messages sont perdus.
- **Impact** : Tout message envoye via la page contact est perdu. Le user croit avoir envoye un message.
- **Fix** : Connecter a Supabase (table dediee ou email via Edge Function) ou rediriger vers la ContactRdvModal.

**3. Pas de monitoring / alerting**
- **Fichier** : Toute l'application
- **Description** : Aucun service de monitoring (Sentry, LogRocket, etc.). Les erreurs en production sont invisibles.
- **Impact** : Les bugs et les erreurs de securite en production passent inapercus.
- **Fix** : Integrer Sentry (gratuit pour les petits projets).

### MOYEN (a planifier)

**4. 3 usages `as any` dans le code**
- `DiagnosticPage.tsx:99` — insert diagnostic
- `ContactRdvModal.tsx:122` — update diagnostic
- `ContactRdvModal.tsx:143` — insert appointment
- **Fix** : Typer correctement les payloads ou ajouter les colonnes manquantes au schema Database.

**5. AdminDashboard.tsx — useQuery inline au lieu de hooks**
- Les stats dashboard utilisent `useQuery` directement avec `supabase.from()` au lieu de passer par la couche API.
- **Fix** : Creer `fetchDashboardStats()` dans api/ et un hook dedie.

**6. AdminUtilisateurs.tsx — counts en appels Supabase directs**
- Les comptages homes/cases/diagnostics par user sont faits en `Promise.all` direct.
- **Fix** : Ajouter une fonction API `fetchProfilesWithCounts()` ou une vue SQL.

**7. i18n non utilise**
- i18next est installe et configure (FR/EN) mais tout le contenu est hardcode en francais.
- **Fix** : Soit migrer le contenu vers les fichiers i18n, soit desinstaller i18next pour alleger le bundle.

### BAS (ameliorations)

**8. ArticlePage.tsx a 969 lignes** — devrait etre decompose (markdown renderer, TOC, sidebar, SEO en composants separes).

**9. Pas de tests** — aucun test unitaire, integration ou E2E.

**10. Google Fonts sans SRI** — chargees depuis CDN sans Subresource Integrity.

---

## Regles Anti-Bug

1. **TOUJOURS passer par la couche `src/api/`** pour les operations CRUD. Ne jamais appeler `supabase.from()` directement dans un composant page.
2. **TOUJOURS invalider les queries** apres une mutation. Les hooks dans `queries.ts` le font deja — les utiliser.
3. **JAMAIS de `as any`** — corriger le type a la source ou ajouter les colonnes au schema `Database`.
4. **Verifier le schema SQL** avant d'inserer des colonnes. Si la colonne n'existe pas en base, creer une migration.
5. **TOUJOURS `disabled={isPending}`** sur les boutons submit.
6. **TOUJOURS utiliser les constantes** de `src/data/constants.ts` au lieu de valeurs hardcodees.
7. **JAMAIS modifier le `role`** d'un profil depuis un composant non-admin. Utiliser `updateProfileRole()` exclusivement.
8. **Respecter l'ordre des steps** du wizard diagnostic : si on ajoute un step, mettre a jour `TOTAL_STEPS` et le stepper.
9. **Tester les formules financieres** (aides-engine.ts) avec des edge cases : surface 0, revenus null, aucun type selectionne.
10. **Ne jamais committer de .env** — les fichiers `.env.local` et `.env.vercel.local` sont dans .gitignore.

---

## Checklist Pre-Modification

### Avant de toucher au schema Supabase :
- [ ] Migration numerotee (20260325XXXXXX_xxx.sql)
- [ ] RLS active + policies pour chaque operation
- [ ] Types TypeScript mis a jour dans database.ts
- [ ] Fonctions API mises a jour dans src/api/
- [ ] Hooks React Query mis a jour si besoin
- [ ] `npm run build` passe sans erreur

### Avant de toucher au wizard diagnostic :
- [ ] Verifier `TOTAL_STEPS` dans DiagnosticPage.tsx
- [ ] Verifier les labels dans `STEP_LABELS`
- [ ] Verifier `canProceed` pour chaque step
- [ ] Tester le handleSubmit
- [ ] Verifier que le store est reset() a la fin

### Avant de toucher aux engines :
- [ ] diagnostic-engine.ts : verifier les symptomes (symptoms.ts) et les recommandations
- [ ] aides-engine.ts : verifier les baremes (aides-renov.ts) sont a jour
- [ ] renovation-plan-engine.ts : verifier l'ordonnancement ADEME

---

## Carte des Dependances Critiques

```
supabase.ts ──> TOUTES les pages (via api/ ou direct)
     │
useAuth.ts ──> appStore ──> AuthGuard / AdminGuard ──> 15 routes protegees
     │
diagnosticStore ──> DiagnosticPage ──> DiagnosticResultsPage
                                            │
                         ┌──────────────────┼──────────────────┐
                    aides-engine      renovation-plan     diagnostic-engine
                         │                  │                    │
                    aides-renov.ts    (ordonnancement)    symptoms.ts
                    (baremes MPR)                         diagnostic-types.ts
                                                         (RECOMMENDATION_MAP)
```

| Si tu modifies... | Verifie aussi... |
|-------------------|-------------------|
| `supabase.ts` | Toutes les pages et la couche API |
| `aides-renov.ts` | aides-engine.ts, DiagnosticResultsPage |
| `symptoms.ts` | diagnostic-engine.ts (RECOMMENDATION_MAP doit matcher) |
| `diagnostic-types.ts` | DiagnosticPage, DiagnosticResultsPage |
| `diagnosticStore.ts` | DiagnosticPage, tous les Step*.tsx |
| `database.ts` | Tous les fichiers dans src/api/ |
| `constants.ts` | 15+ pages qui importent les constantes |
| `queries.ts` | Toutes les pages dashboard et admin |
| Schema SQL | database.ts + api/ + queries.ts |
