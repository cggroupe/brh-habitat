# BRH Habitat — Hooks & API Reference

> Source : `src/hooks/` + `src/api/`.
> **Dernière mesure** : 2026-04-23 · **14 hooks** + **25 API modules**.

## Conventions globales

### Architecture en couches
```
Component
   ↓ useXxx() (React Query hook)
hooks/queries/xxx.ts
   ↓ xxxApi.list() / xxxApi.create() / ...
api/xxx.ts
   ↓ supabase.from('brh_xxx').select() + .parse() Zod
schemas.ts
   ↓ Zod validation
Supabase
```

### Règles non-négociables
1. **Invalider `['dashboard', 'stats']`** sur TOUTE mutation comptée dans le dashboard (règle anti-bug #1)
2. **`if (error) throw error`** après chaque appel Supabase (règle anti-bug #5)
3. **Zod `.parse()`** sur réponses Supabase (règle anti-bug #4 — pas `as unknown as`)
4. **`logError()`** dans `onError` de chaque mutation (règle anti-bug #6)
5. **staleTime différencié** par ressource (pas 60s uniforme — règle anti-bug perf)

## Hooks généraux (4)

| Hook | Rôle | Notes |
|------|------|-------|
| `useAuth.ts` | Login, logout, session. Gère `queryClient.clear()` au logout, reset Zustand stores | **Point critique** — toute modif impacte l'app entière |
| `useFeature.ts` | Feature flag (`useFeature('aiChiffrage')`) via `TenantContext` | Retourne boolean, utilisé par `FeatureGate` |
| `useNotifications.ts` | Notifications temps réel via Supabase Realtime | Subscribe à `brh_notifications` |
| `useScrollLock.ts` | Lock du scroll body (modals) | Helper UI |

## Hooks React Query (10 — dans `src/hooks/queries/`)

### Base config
`queries.ts` exporte `queryKeys` centralisés et helpers communs.

### Catalog

| Hook | queryKey | staleTime | API module | Tables |
|------|----------|-----------|------------|--------|
| `appointments.ts` | `['appointments', ...]` | 5 min | `appointments.ts` | `brh_appointments` |
| `articles.ts` | `['articles', ...]` | **30 min** | `articles.ts` | `brh_articles` |
| `cases.ts` | `['cases', ...]` | 5 min | `cases.ts` | `brh_cases` |
| `chiffrages.ts` | `['chiffrages', ...]` | 5 min | `chiffrages.ts` | `brh_chiffrages` |
| `contacts.ts` | `['contacts', ...]` | 5 min | `contacts.ts` | `brh_contacts` |
| `dashboard.ts` | `['dashboard', 'stats']` | **2 min** | `dashboard.ts` | Aggrégé (RPC) |
| `diagnostics.ts` | `['diagnostics', ...]` | 5 min | `diagnostics.ts` | `brh_diagnostics` |
| `health.ts` | `['health', ...]` | 5 min | `health-records.ts` + `work-history.ts` + `home-documents.ts` | `brh_health_records`, `brh_work_history`, `brh_home_documents` |
| `homes.ts` | `['homes', ...]` | 5 min | `homes.ts` | `brh_homes` |
| `partners/` (dossier — 8 sous-fichiers) | `['companies', ...]`, `['prospects', ...]`, `['quotes', ...]`, `['affiliates', ...]`, `['rewards', ...]`, `['social-posts', ...]`, `['recruitment', ...]`, `['points', ...]`, `['company-members', ...]` | 5 min (2 min pour admin) | `companies.ts`, `prospects.ts`, `company-members.ts`, `quotes.ts`, `affiliates.ts`, `rewards.ts`, `social-posts.ts`, `recruitment.ts` | `brh_companies`, `brh_prospects`, `brh_company_members`, `brh_quotes`, `brh_affiliates`, `brh_points_transactions`, `brh_rewards_catalog`, `brh_reward_claims`, `brh_social_posts`, `brh_recruitment_commissions` |
| `profiles.ts` | `['profiles', ...]` | **10 min** | `profiles.ts` | `profiles` |

## API modules (25 — dans `src/api/`)

Tous les modules suivent ce pattern :
```typescript
import { supabase } from '@/lib/supabase'
import { XxxSchema } from './schemas'
import { logError } from '@/lib/error'

export const xxxApi = {
  async list(filters?: XxxFilters): Promise<Xxx[]> {
    const { data, error } = await supabase.from('brh_xxx').select('*')
    if (error) throw error
    return data.map(row => XxxSchema.parse(row))
  },
  async create(input: XxxCreateInput): Promise<Xxx> {
    const { data, error } = await supabase.from('brh_xxx').insert(input).select().single()
    if (error) throw error
    return XxxSchema.parse(data)
  },
  // update, remove...
}
```

### Par domaine

#### 🏠 Habitat utilisateur
- [`homes.ts`](../../src/api/homes.ts) — CRUD `brh_homes`
- [`cases.ts`](../../src/api/cases.ts) — CRUD `brh_cases` (montants INTEGER cents)
- [`appointments.ts`](../../src/api/appointments.ts) — CRUD `brh_appointments`
- [`diagnostics.ts`](../../src/api/diagnostics.ts) — CRUD `brh_diagnostics`
- [`health-records.ts`](../../src/api/health-records.ts) — CRUD `brh_health_records`
- [`work-history.ts`](../../src/api/work-history.ts) — CRUD `brh_work_history`
- [`home-documents.ts`](../../src/api/home-documents.ts) — CRUD `brh_home_documents` + upload Storage

#### 👔 Plateforme partenaires
- [`companies.ts`](../../src/api/companies.ts) — CRUD `brh_companies` + RPC stats (`get_company_stats`)
- [`company-members.ts`](../../src/api/company-members.ts) — CRUD `brh_company_members`
- [`invitations.ts`](../../src/api/invitations.ts) — ⭐ 2026-04-23 — CRUD `brh_company_invitations` + invoke EF `company-invite`
- [`prospects.ts`](../../src/api/prospects.ts) — CRUD `brh_prospects` + upload `prospect-files`
- [`quotes.ts`](../../src/api/quotes.ts) — CRUD `brh_quotes` (trigger calcule commission)
- [`recruitment.ts`](../../src/api/recruitment.ts) — Lit `brh_recruitment_commissions` (chaîne recruteur multi-niveaux)

#### 🎁 Gamification & affiliation
- [`affiliates.ts`](../../src/api/affiliates.ts) — CRUD `brh_affiliates` + `brh_points_transactions`
- [`badges.ts`](../../src/api/badges.ts) — Lit `brh_badges` + `brh_user_badges`
- [`rewards.ts`](../../src/api/rewards.ts) — CRUD `brh_rewards_catalog` + `brh_reward_claims`

#### 💬 Communication
- [`partner-messages.ts`](../../src/api/partner-messages.ts) — CRUD `brh_message_threads` + `brh_messages` (Realtime)
- [`partner-notifications.ts`](../../src/api/partner-notifications.ts) — CRUD `brh_notifications` (Realtime)
- [`contacts.ts`](../../src/api/contacts.ts) — CRUD `brh_contacts` (formulaire contact public)

#### 🤖 IA & chiffrage
- [`chiffrages.ts`](../../src/api/chiffrages.ts) — CRUD `brh_chiffrages` + invoke EF `ai-proxy`, `chiffrage-prices`

#### 📰 Contenu
- [`articles.ts`](../../src/api/articles.ts) — CRUD `brh_articles` (staleTime 30 min)

#### 👤 Utilisateurs
- [`profiles.ts`](../../src/api/profiles.ts) — CRUD `profiles` (staleTime 10 min)

#### 🔥 Viral
- [`social-posts.ts`](../../src/api/social-posts.ts) — CRUD `brh_social_posts` + upload `social-screenshots`

#### 📊 Dashboard
- [`dashboard.ts`](../../src/api/dashboard.ts) — Agrégats via RPC (staleTime 2 min)

#### 🛡 Schemas Zod
- [`schemas.ts`](../../src/api/schemas.ts) — Tous les schemas Zod centralisés

## Patterns à respecter

### 1. Création avec invalidation cache
```typescript
const createCase = useMutation({
  mutationFn: (input: CaseCreateInput) => casesApi.create(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['cases'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] }) // ← obligatoire
  },
  onError: (err) => {
    logError(err, { context: 'createCase' })
    // toast error géré par le composant
  },
})
```

### 2. Query avec filtre et enabled
```typescript
const homes = useQuery({
  queryKey: ['homes', userId],
  queryFn: () => homesApi.listByUser(userId!),
  enabled: !!userId, // ← pattern pour éviter non-null assertion
  staleTime: 5 * 60 * 1000,
})
```

### 3. Mutation optimiste (avec rollback)
```typescript
const toggleActive = useMutation({
  mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
    companiesApi.update(id, { is_active }),
  onMutate: async ({ id, is_active }) => {
    await queryClient.cancelQueries({ queryKey: ['companies'] })
    const previous = queryClient.getQueryData(['companies'])
    queryClient.setQueryData(['companies'], (old: Company[]) =>
      old.map(c => c.id === id ? { ...c, is_active } : c)
    )
    return { previous }
  },
  onError: (err, _vars, context) => {
    logError(err, { context: 'toggleActive' })
    queryClient.setQueryData(['companies'], context?.previous)
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
})
```

### 4. Realtime subscription (`useNotifications.ts`)
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'brh_notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [userId])
```

### 5. Invocation Edge Function
```typescript
const generateChiffrage = useMutation({
  mutationFn: async (input: ChiffrageInput) => {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { prompt: buildPrompt(input), mode: 'chiffrage' },
    })
    if (error) throw error
    return data
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chiffrages'] }),
})
```

## Points d'attention

- **Dashboard stats** : TOUJOURS invalider `['dashboard', 'stats']` après `create/update/delete` sur cases, contacts, appointments, diagnostics, homes, profiles
- **`as unknown as`** : interdits — utiliser Zod (`schemas.ts`)
- **Silent catches** : interdits — `logError()` obligatoire
- **Non-null assertions** : autorisées uniquement dans pattern `enabled: !!x` + `queryFn: fn(x!)`
- **AbortController** : sur fetchs externes (ex: `AddressAutocomplete`)
- **Dates** : JAMAIS `toISOString().slice(0,10)` — règle anti-bug #14
- **Cents** : affichage via `(cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })`

## Checklist avant de toucher un hook

- [ ] `onSuccess` invalide TOUS les caches dépendants (dont `['dashboard', 'stats']`) ?
- [ ] `onError` appelle `logError()` ?
- [ ] `staleTime` adapté à la ressource (pas 60s uniforme) ?
- [ ] Pas de `as unknown as` dans le code ?
- [ ] Zod `.parse()` sur réponses Supabase ?
- [ ] Types TypeScript à jour ?

## Pattern API ↔ Hooks (volontaire — à ne pas confondre avec doublons)

Le projet applique strictement la séparation **API layer (`src/api/X.ts`) ↔ Hooks React Query (`src/hooks/queries/X.ts`)** :

```
Component
  ↓ useXxx()
hooks/queries/xxx.ts        ← couche React Query (cache, invalidation, optimistic)
  ↓ xxxApi.list/create/...
api/xxx.ts                  ← couche Supabase pure (fetch + Zod)
  ↓
schemas.ts                  ← Zod
```

**10 paires API ↔ Hooks** (noms identiques par design) :
appointments · articles · cases · chiffrages · contacts · dashboard · diagnostics · health · homes · profiles

C'est un pattern **intentionnel**, pas un doublon. Les analyses de duplication doivent l'ignorer (cf [AUDIT-DOUBLONS-2026-04-29.md](../../AUDIT-DOUBLONS-2026-04-29.md)).

## Dette technique typage Supabase (B01 — 2026-04-29)

Le client Supabase dans [src/lib/supabase.ts](../../src/lib/supabase.ts) est **non typé avec `<Database>`** car le format `Database` manuel n'est pas reconnu par supabase-js v2.103 (`.insert/.update/.rpc` voient `never` au build). Les 20 Row interfaces des tables `brh_*` partenaires sont néanmoins disponibles dans [src/types/database.ts](../../src/types/database.ts) pour usage explicite par les modules `api/`.

**Action requise** : exécuter une fois `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database.ts` puis activer `createClient<Database>` dans `src/lib/supabase.ts`.

## Centralisation env vars (2026-04-29)

[src/lib/config.ts](../../src/lib/config.ts) est désormais la **source unique** pour `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Helper `edgeFunctionUrl(name)` pour construire les URLs des Edge Functions :

```ts
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from '@/lib/config'

const resp = await fetch(edgeFunctionUrl('company-invite-verify'), {
  method: 'POST',
  headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  body: JSON.stringify({ token }),
})
```

Tout module qui appelle directement `import.meta.env.VITE_SUPABASE_*` doit être migré vers `lib/config`.

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy). 14 hooks + 25 API modules catalogués.
- **2026-04-29** : Refactor SRP — `partners.ts` (511 L) splitté en dossier `partners/` (8 sous-fichiers + barrel). Pattern API↔Hooks documenté. Dette typage Supabase B01 explicitée. Centralisation env vars dans `lib/config.ts`.
