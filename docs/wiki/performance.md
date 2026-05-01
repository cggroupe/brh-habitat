# BRH Habitat — Performance & Monitoring

> Source : `src/App.tsx` (lazy imports), `public/sw.js`, `src/main.tsx` (Sentry), `src/hooks/queries/*`.
> **Dernière mesure** : 2026-04-23.

## Score performance actuel : 9.5/10

Audit v7 — **65 lazy imports, SW cache v3, staleTime différencié, AbortController**. Aucun goulot critique.

## Stratégies de performance

### 1. Lazy loading toutes les pages (65 imports)

`src/App.tsx` utilise `React.lazy()` pour toutes les routes :

```typescript
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const ProDashboard = lazy(() => import('@/pages/pro/ProDashboard'))
// ... 63 autres
```

Fallback : `<Suspense fallback={<PageLoader />}>`.

**Impact** : bundle initial ~250KB gzipped (vs ~1.5MB si bundle unique).

### 2. React Query — staleTime différencié

| Ressource | staleTime | Justification |
|-----------|-----------|---------------|
| Global default | 60s (1 min) | Fallback |
| `articles` | 30 min | Statique (articles éducatifs) |
| `profiles` | 10 min | Peu volatile |
| `homes`, `cases`, `diagnostics`, `health` | 5 min | User-centric |
| `dashboard` stats | 2 min | Aggregations |

Config : `App.tsx` globale + per-hook override.

**Retry** : 1 (puis fail). **refetchOnWindowFocus** : false (évite spam API).

### 3. Service Worker — Cache v3

`public/sw.js` implémente cache strategy :
- **Assets statiques** (JS/CSS/images) : cache-first
- **Routes HTML** : network-first (avec fallback cache)
- **API Supabase** : jamais cachées (always network)
- **Version** : `v3` — **incrémenter à chaque deploy** qui change des assets (règle anti-bug #10)

```javascript
const CACHE_NAME = 'brh-habitat-v3';  // ← incrémenter ici
```

### 4. AbortController

Sur fetchs externes ou debounced (ex: `AddressAutocomplete.tsx`) :

```typescript
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
  return () => controller.abort()
}, [query])
```

Évite les race conditions et les fetchs inutiles.

### 5. Zod parse minimal

`.parse()` appelé sur response Supabase uniquement (pas à chaque re-render).

### 6. Zustand stores minimaux

- `appStore` : `{ user, locale, drawerOpen }` — 3 fields
- `diagnosticStore` : draft diagnostic (persist localStorage)

Pas de subscribe global — sélecteurs ciblés :
```typescript
const user = useAppStore(s => s.user)  // re-render seulement si user change
```

### 7. Optimisation DB

- **Indexes** : migration `20260403100001_add_missing_indexes` a ajouté les indexes manquants
- **RPC préparées** pour agrégations (`get_company_commission_stats`, etc.) — évite N+1
- **RLS SECURITY DEFINER** : évite recursion circulaire (perf + correction)

### 8. Realtime minimal

Subscribe uniquement sur 2 tables : `brh_messages`, `brh_notifications`. Filtre côté DB (`filter: user_id=eq.${userId}`) — pas de broadcast global.

## Monitoring

### Sentry (10.48)

**Config** : `src/main.tsx`
```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
})
```

**ErrorBoundary** wrappe l'App :
```tsx
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

**`logError()`** dans `src/lib/error.ts` — utilisé dans TOUS les `onError` de mutations.

### Tags contextuels
- `tenant_id` sur chaque erreur (tenant.tenantId)
- `user_id` depuis auth.uid()
- `route` depuis React Router

### Logs Supabase Edge Functions
```bash
supabase functions logs ai-proxy --tail
supabase functions logs stripe-webhook --tail  # BRHCRM, pas BRH Habitat
```

### Métriques à surveiller
| Métrique | Seuil alerte | Outil |
|----------|--------------|-------|
| Erreurs JS/min | > 5 | Sentry |
| P95 latence page | > 2s | Sentry Performance |
| EF error rate | > 1% | Sentry + Supabase logs |
| DB query > 500ms | Identifier | Supabase Dashboard |
| `simulation_leads` INSERT/min | > 10 | Alerting custom (anti-spam) |

## Audit Lighthouse (à faire)

**Objectif** : 90+ sur Performance / Accessibility / Best Practices / SEO.

Commande locale :
```bash
npm run build
npm run preview
# puis Lighthouse CI ou DevTools Lighthouse sur localhost:4173
```

**Scores attendus** (basé sur architecture) :
- Performance : ~90 (lazy loading, SW, minification Vite)
- Accessibility : ~95 (a11y travaillée dans composants shadcn-like)
- Best Practices : ~95 (CSP, HTTPS, HSTS via Vercel)
- SEO : ~90 (meta tags dynamiques, robots.txt, sitemap à vérifier)

## PWA

`public/manifest.webmanifest` + `public/sw.js` :
- **Installable** sur mobile/desktop
- **Offline** partiel (pages cachées)
- **Push notifications** (via VAPID — à activer côté EF `send-push`)

## Headers HTTP (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "..." }
      ]
    }
  ]
}
```

**HSTS** : 2 ans + preload (garantit HTTPS forever).

## Recommandations futures

### Court terme
- 🟡 **Dashboard Lighthouse CI** dans pipeline (Vercel preview)
- 🟡 **Web Vitals** via `web-vitals` lib → Sentry custom metric
- 🟡 **Bundle analyzer** (`vite-bundle-visualizer`) pour tracker la croissance

### Moyen terme
- 🟡 **Code splitting par route** (déjà via lazy, mais affiner chunk strategy)
- 🟡 **Prefetch critical routes** (`<link rel="prefetch">` pour `/tableau-de-bord`)
- 🟡 **Image optimization** (AVIF/WebP auto via `<img loading="lazy">` + CDN Vercel)
- 🟡 **DB query monitoring** (identifier les requêtes > 500ms)

### Long terme
- 🔴 **Penetration test + Lighthouse audit externe** (trimestriel)
- 🔴 **APM complet** (DataDog ou New Relic si montée en charge)
- 🔴 **CDN edge** pour assets statiques (Vercel le fait déjà par défaut)

## Règle anti-bug liée

**Règle #10** : TOUJOURS incrémenter `CACHE_NAME` dans `public/sw.js` après un deploy avec changements de cache. Sinon les users gardent l'ancienne version indéfiniment.

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy v2).
