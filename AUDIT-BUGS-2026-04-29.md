# Audit Bugs — BRH Habitat
Date : 2026-04-29
Auditeur : Claude Sonnet 4.6 (agent QA)
Base : React 19 + Vite 7 + TypeScript 5.9 strict + Supabase (lygmmvxnmvlgynmrcpny)
Wiki source de vérité : docs/wiki/ (index.md + architecture-snapshot.md lus)

---

## Résumé exécutif

- Total bugs/findings : 18 (Critique: 1, Majeur: 7, Mineur: 10)
- TypeScript : 0 erreur de compilation (tsc --noEmit clean), 0 `as any`
- ESLint : 3 erreurs (2 `no-unused-vars` dans seed, 1 setState-in-effect dans JoinCompanyPage)
- `toISOString().slice` : 0 occurrence dans le code (la mention dans utils.ts est un commentaire JSDoc)
- RLS : Toutes les récursions historiques corrigées via migrations 20260326 + 20260403

### Top 5 critiques/majeurs

1. [CRITIQUE] Supabase client non typé `createClient` sans `<Database>` — perte de type-safety totale sur toutes les queries (src/lib/supabase.ts:14)
2. [MAJEUR] `setState` synchrone dans `useEffect` dans JoinCompanyPage (lint error ESLint confirmé) — risque cascade renders (src/pages/public/JoinCompanyPage.tsx:42)
3. [MAJEUR] `useAuth` charge le profil via `onAuthStateChange` — pattern interdit par CLAUDE.md, race condition possible (src/hooks/useAuth.ts:79-95)
4. [MAJEUR] `setTimeout(() => navigate(...))` sans cleanup dans 2 composants — navigation fantôme si l'utilisateur quitte avant le délai (src/pages/public/JoinCompanyPage.tsx:111, src/pages/particulier/PartParrainageNew.tsx:102)
5. [MAJEUR] `NotificationBell` dropdown à `z-50` — écrasé par DashboardNav BottomNav également `z-50` sur mobile (src/components/shared/NotificationBell.tsx:59)

---

## Tableau global

| ID | Sévérité | Catégorie | Fichier:Ligne | Description |
|----|----------|-----------|---------------|-------------|
| B01 | CRITIQUE | TypeScript/Sécu | [src/lib/supabase.ts:14](src/lib/supabase.ts#L14) | Client Supabase non typé — `createClient` sans `<Database>`, toutes les queries sont `any` implicitement |
| B02 | MAJEUR | Auth/React | [src/pages/public/JoinCompanyPage.tsx:42](src/pages/public/JoinCompanyPage.tsx#L42) | `setState` synchrone dans `useEffect` — lint error confirmé, cascade renders |
| B03 | MAJEUR | Auth | [src/hooks/useAuth.ts:79](src/hooks/useAuth.ts#L79) | Profil chargé dans `onAuthStateChange` — pattern interdit CLAUDE.md règle anti-bug |
| B04 | MAJEUR | Memory leak | [src/pages/public/JoinCompanyPage.tsx:111](src/pages/public/JoinCompanyPage.tsx#L111) | `setTimeout(() => navigate())` sans `clearTimeout` dans cleanup |
| B05 | MAJEUR | Memory leak | [src/pages/particulier/PartParrainageNew.tsx:102](src/pages/particulier/PartParrainageNew.tsx#L102) | `setTimeout(() => navigate())` sans `clearTimeout` dans cleanup |
| B06 | MAJEUR | PWA/z-index | [src/components/shared/NotificationBell.tsx:59](src/components/shared/NotificationBell.tsx#L59) | Dropdown `z-50` vs BottomNav `z-50` — conflit sur mobile, dropdown masqué |
| B07 | MAJEUR | Architecture | [src/lib/supabase.ts:12](src/lib/supabase.ts#L12) | Note dans le code : client non typé car `database.ts` ne couvre pas toutes les tables — dette technique documentée mais non résolue |
| B08 | MAJEUR | Dead code/Lint | [scripts/seed-realistic.ts:14](scripts/seed-realistic.ts#L14) | `randomUUID` importé mais jamais utilisé (lint error) |
| B09 | MINEUR | Dead code/Lint | [scripts/seed-realistic.ts:83](scripts/seed-realistic.ts#L83) | Variable `city` assignée mais jamais utilisée (lint error) |
| B10 | MINEUR | Architecture | src/pages/ (17 fichiers) | Queries Supabase directes (`supabase.from(...)`) dans 17 fichiers pages — bypass de l'API layer Zod centralisée |
| B11 | MINEUR | Sécurité | [src/pages/public/JoinCompanyPage.tsx:9](src/pages/public/JoinCompanyPage.tsx#L9) | `SUPABASE_ANON_KEY` lu directement dans la page (dupliqué hors lib/supabase.ts) — incohérence, risque si valeur changée |
| B12 | MINEUR | Sécurité | [src/pages/public/RegisterProPage.tsx:10](src/pages/public/RegisterProPage.tsx#L10) | Idem B11 — `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dupliqués hors lib/ |
| B13 | MINEUR | Sécurité | [src/lib/ai.ts:6](src/lib/ai.ts#L6) | Idem B11 — `VITE_SUPABASE_URL` dupliqué (pattern incohérent) |
| B14 | MINEUR | XSS | [src/pages/public/ArticlePage.tsx:138](src/pages/public/ArticlePage.tsx#L138) | `dangerouslySetInnerHTML` utilisé pour JSON-LD — usage légitime (structured data), mais `article.title` et `article.seoDescription` non sanitisés avant injection |
| B15 | MINEUR | TypeScript | [src/pages/public/DiagnosticPage.tsx:146](src/pages/public/DiagnosticPage.tsx#L146) | Double cast `as unknown as Record<string, unknown>` — anti-pattern explicitement interdit par règle wiki #4 |
| B16 | MINEUR | TypeScript | [src/pages/public/DiagnosticPage.tsx:175](src/pages/public/DiagnosticPage.tsx#L175) | Idem B15 — second cast identique dans même fichier |
| B17 | MINEUR | Console/Monitoring | src/ (2 occurrences) | Seulement 2 `console.error` (dans lib/error.ts, usage légitime dev fallback) — pas de fuite de logs en prod |
| B18 | MINEUR | Auth | [src/hooks/useAuth.ts:112](src/hooks/useAuth.ts#L112) | `loading` calculé comme `!user && !isInitialized` — si l'utilisateur est null ET isInitialized est true, loading=false correctement, mais `error: null` hardcodé en retour empêche la remontée d'erreurs auth |

---

## Détails par catégorie

### Sécurité

#### B01 — Supabase client non typé [CRITIQUE]
**Fichier** : [src/lib/supabase.ts:14](src/lib/supabase.ts#L14)
**Description** : `createClient(url, key)` sans le generic `<Database>` — toutes les queries retournent `data: unknown` et les colonnes ne sont pas vérifiées à la compilation.
**Impact** : Perte totale de type-safety sur les 120+ queries Supabase. Des renommages de colonnes en DB ne produisent aucune erreur TypeScript.
**Note** : Documenté dans le code ("Note: non typé avec <Database> car le type ne couvre pas les ~20 tables partenaires"). La génération de types est donc en attente mais la dette est active.
**Fix suggéré** : `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database.ts` puis `createClient<Database>(url, key)`.

#### B11/B12/B13 — VITE env vars dupliqués hors lib/ [MINEUR]
**Fichiers** : [src/pages/public/JoinCompanyPage.tsx:8-9](src/pages/public/JoinCompanyPage.tsx#L8), [src/pages/public/RegisterProPage.tsx:10-11](src/pages/public/RegisterProPage.tsx#L10), [src/lib/ai.ts:6-7](src/lib/ai.ts#L6)
**Description** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` accédés directement via `import.meta.env` dans 3 fichiers hors lib/supabase.ts, pour des appels `fetch()` directs aux Edge Functions.
**Impact** : Si la clé change, 3 endroits à mettre à jour. La clé anon est publique par nature (pas un secret), mais la duplication viole le principe DRY.
**Fix suggéré** : Centraliser dans `src/lib/config.ts` ou passer par un wrapper `callEdgeFunction(name, body)`.

#### B14 — `dangerouslySetInnerHTML` pour JSON-LD sans sanitisation [MINEUR]
**Fichier** : [src/pages/public/ArticlePage.tsx:138](src/pages/public/ArticlePage.tsx#L138)
**Description** : `article.title` et `article.seoDescription` sont injectés via `JSON.stringify()` dans un tag `<script type="application/ld+json">`. Si les données proviennent de la DB (admin-controlled), le risque XSS est limité mais réel si un admin malveillant insère des guillemets ou balises cassant le JSON.
**Impact** : Faible (données admin seulement), mais non zéro. Un `</script>` dans le titre briserait le DOM.
**Fix suggéré** : Utiliser `react-helmet-async` pour les scripts LD+JSON, ou sanitiser `title` et `seoDescription` avec une fonction d'échappement HTML avant `JSON.stringify`.

### Auth

#### B02 — setState synchrone dans useEffect [MAJEUR]
**Fichier** : [src/pages/public/JoinCompanyPage.tsx:42](src/pages/public/JoinCompanyPage.tsx#L42)
**Description** : ESLint error confirmée (`react-hooks/set-state-in-effect`). `setState('invalid')` et `setError(...)` sont appelés directement dans le corps du `useEffect`, pas dans un callback asynchrone.
**Impact** : Cascade renders (render → effect → setState → render) — dégradation performance, potentiellement render loop en cas de re-mount.
**Fix suggéré** : Wrapper la guard `if (!token)` dans la fonction async `void (async () => { if (!token) { ... return } ... })()` déjà présente à la ligne suivante.

#### B03 — Profil chargé dans onAuthStateChange [MAJEUR]
**Fichier** : [src/hooks/useAuth.ts:79-95](src/hooks/useAuth.ts#L79)
**Description** : Le hook charge le profil via `fetchProfile()` dans le handler `onAuthStateChange` (lignes 87-93). CLAUDE.md règle anti-bug (MEMORY.md) stipule explicitement : "Charger profil dans `signIn()` directement, pas dans `onAuthStateChange`".
**Impact** : Race condition possible — si l'événement auth se déclenche avant que le profil soit en DB (ex : trigger `handle_new_user` pas encore exécuté), le profil revient null et l'utilisateur est mis à null même s'il vient de s'inscrire.
**Note** : Le guard `if (!current || current.id !== session.user.id)` atténue partiellement le problème pour les reconnexions, mais pas pour les nouvelles inscriptions.
**Fix suggéré** : Déplacer `fetchProfile()` dans le flux de connexion explicite (LoginPage, JoinCompanyPage, RegisterPage) et laisser `onAuthStateChange` uniquement pour `SIGNED_OUT`.

#### B18 — `error: null` hardcodé dans useAuth [MINEUR]
**Fichier** : [src/hooks/useAuth.ts:117](src/hooks/useAuth.ts#L117)
**Description** : Le hook retourne toujours `error: null`. Les erreurs de `validateSession()` ou de `fetchProfile()` sont silencieusement avalées. Les guards d'auth ne peuvent pas distinguer "non connecté" de "erreur réseau".
**Impact** : Faible en production normale, mais en cas de timeout Supabase, l'utilisateur est redirigé vers `/connexion` sans message d'erreur.
**Fix suggéré** : Ajouter un state `authError: string | null` et le populer dans les catch de `validateSession()`.

### Dates

Aucun usage de `toISOString().slice(0,10)` trouvé dans le code source. La seule mention est dans `src/lib/utils.ts:17` sous forme de commentaire JSDoc explicatif. Le helper `toLocalDateString()` existe et est correctement implémenté. **Catégorie : CLEAN.**

### TypeScript

#### B01 — Client Supabase non typé (voir Sécurité ci-dessus)

#### B15/B16 — Double cast `as unknown as` [MINEUR]
**Fichier** : [src/pages/public/DiagnosticPage.tsx:146](src/pages/public/DiagnosticPage.tsx#L146) et [src/pages/public/DiagnosticPage.tsx:175](src/pages/public/DiagnosticPage.tsx#L175)
**Description** : `results as unknown as Record<string, unknown>` — le double cast contourne le type checker. Règle wiki #4 : "JAMAIS `as unknown as`".
**Impact** : Si le type de `results` change (retour de `analyzeDiagnostic`), aucune erreur de compilation.
**Fix suggéré** : Typer correctement `results` dans `src/lib/diagnostic-engine.ts` ou créer un type `DiagnosticResults` et l'utiliser en DB.

**Bilan TypeScript général** : 0 erreur `tsc --noEmit`, 0 `as any` — excellent niveau. Seuls les 2 `as unknown as` et le client non typé dégradent le score.

### Erreurs (Error handling)

Les `catch {}` silencieux recensés sont majoritairement **intentionnels et documentés** :
- `appStore.ts:37` — localStorage parse failure → retourne null (correct)
- `ProProspectNew.tsx:117`, `ProProfil.tsx:90`, `PartCatalogue.tsx:130` — erreur gérée par `React Query .error` (correct)
- `ProEquipe.tsx:44` — "silently fail — unlikely" (acceptable)
- `ProRapport.tsx:171` — "Pas de data précédente — pas bloquant" (acceptable)

Aucun catch silencieux critique identifié. **Catégorie : ACCEPTABLE.**

### PWA / z-index

#### B06 — NotificationBell dropdown z-50 vs BottomNav z-50 [MAJEUR]
**Fichier** : [src/components/shared/NotificationBell.tsx:59](src/components/shared/NotificationBell.tsx#L59) vs [src/components/layout/DashboardNav.tsx:91](src/components/layout/DashboardNav.tsx#L91)
**Description** : Le dropdown de NotificationBell utilise `z-50`. Le BottomNav dans DashboardNav utilise également `z-50`. Sur mobile (où DashboardNav est visible via `lg:hidden`), si NotificationBell est dans le header au-dessus du BottomNav, les deux sont au même niveau — comportement d'affichage indéterminé selon l'ordre DOM.
**Impact** : Le dropdown notifications peut être partiellement masqué par le BottomNav sur mobile.
**Fix suggéré** : Passer NotificationBell dropdown à `z-[60]` (cohérent avec tous les modals du projet).

**Note positive** : Tous les modals du projet utilisent correctement `z-[60]` (confirmé sur 11 modals inspectés). Les modaux sont donc conformes à la règle PWA. Seul le dropdown NotificationBell est à corriger.

**AddressAutocomplete dropdown** : `z-50` — potentiellement masqué par le BottomNav sur mobile également ([src/components/ui/AddressAutocomplete.tsx:163](src/components/ui/AddressAutocomplete.tsx#L163)).

### Performance

#### B04/B05 — `setTimeout(() => navigate())` sans cleanup [MAJEUR]
**Fichiers** : [src/pages/public/JoinCompanyPage.tsx:111](src/pages/public/JoinCompanyPage.tsx#L111), [src/pages/particulier/PartParrainageNew.tsx:102](src/pages/particulier/PartParrainageNew.tsx#L102)
**Description** : Navigation déclenchée via `setTimeout` après 1500ms/2000ms sans stocker le timer ID pour le nettoyer si le composant se démonte avant.
**Impact** : React warning "Can't perform a React state update on an unmounted component" + navigation fantôme (l'utilisateur navigue ailleurs, puis est redirigé de force).
**Fix suggéré** : `const t = setTimeout(...)` + `return () => clearTimeout(t)` dans l'effet, ou utiliser `useNavigate` dans un `useEffect` avec cleanup.

### Tailwind 4

**Résultat audit CSS** :
- `src/index.css` utilise correctement `@layer base { }` pour les styles body/headings — conforme à la règle #14
- Aucun `* { margin:0 }` global sans layer trouvé
- Variables CSS : `--font-display`, `--font-sans`, `--font-body`, `--font-accent` — syntaxe Tailwind 4 correcte (`--font-*` et non `--font-family-*`)

**Catégorie Tailwind 4 : CLEAN.**

### Dead code

#### B08/B09 — Variables inutilisées dans seed [MINEUR]
**Fichier** : [scripts/seed-realistic.ts:14](scripts/seed-realistic.ts#L14) et [scripts/seed-realistic.ts:83](scripts/seed-realistic.ts#L83)
**Description** : `randomUUID` importé mais jamais utilisé (2 lint errors ESLint). Variable `city` assignée mais jamais utilisée.
**Impact** : Lint bloquant (3 erreurs ESLint au total — `npm run lint` échoue). Le CI/CD serait bloqué si lint est une gate.
**Fix suggéré** : Supprimer l'import `randomUUID` et la variable `city` dans le fichier seed.

---

## Recommandations priorisées

### Actions immédiates (avant prochaine mise en prod)

1. **[CRITIQUE B01]** Générer les types Supabase et typer le client : `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database.ts` puis `createClient<Database>` dans `src/lib/supabase.ts`. Cette action débloquerait aussi la détection automatique des 17 pages qui bypassed l'API layer.

2. **[MAJEUR B08/B09]** Corriger les 2 erreurs lint bloquantes dans `scripts/seed-realistic.ts` (supprimer `randomUUID` et `city`). `npm run lint` doit passer à 0 erreur pour ne pas bloquer CI.

3. **[MAJEUR B02]** Refactorer le `useEffect` dans `JoinCompanyPage.tsx:41-55` — déplacer le `setState('invalid')` à l'intérieur du IIFE async.

4. **[MAJEUR B04/B05]** Ajouter `clearTimeout` cleanup dans `JoinCompanyPage.tsx:111` et `PartParrainageNew.tsx:102`.

5. **[MAJEUR B06]** Passer `NotificationBell` dropdown et `AddressAutocomplete` dropdown de `z-50` à `z-[60]`.

### Actions à planifier (sprint suivant)

6. **[MAJEUR B03]** Refactorer `useAuth.ts` : retirer `fetchProfile()` de `onAuthStateChange`, ne laisser que la gestion `SIGNED_OUT`. S'assurer que chaque flux de login (LoginPage, JoinCompanyPage, RegisterPage, RegisterProPage) charge le profil directement après `signInWithPassword/signUp`.

7. **[MINEUR B15/B16]** Corriger les `as unknown as` dans `DiagnosticPage.tsx` — typer correctement `analyzeDiagnostic()` retour.

8. **[MINEUR B11-B13]** Centraliser l'accès aux variables `VITE_SUPABASE_*` dans `src/lib/config.ts` et créer un helper `callEdgeFunction()`.

9. **[MINEUR B14]** Sanitiser `article.title` et `article.seoDescription` avant injection dans JSON-LD, ou migrer vers `react-helmet-async`.

10. **[MINEUR B18]** Ajouter `authError: string | null` dans le retour de `useAuth` pour exposer les erreurs de session.

---

## Bilan global

| Catégorie | Statut | Détail |
|-----------|--------|--------|
| TypeScript compilation | PASS | 0 erreur `tsc --noEmit` |
| ESLint | FAIL | 3 erreurs (2 seed, 1 setState-in-effect) |
| RLS sécurité DB | PASS | Récursions corrigées, SECURITY DEFINER partout |
| `toISOString().slice` | PASS | 0 occurrence |
| `as any` | PASS | 0 occurrence |
| Tailwind 4 CSS | PASS | `@layer base`, `--font-*` corrects |
| Modals z-index | PASS | Tous à `z-[60]+` sauf NotificationBell dropdown |
| Auth flow | ATTENTION | onAuthStateChange pattern + race condition potentielle |
| Client Supabase typé | FAIL | `createClient` sans `<Database>` |
| Tests automatisés | ABSENT | Aucun test unitaire/E2E (wiki/tests.md le documente) |
