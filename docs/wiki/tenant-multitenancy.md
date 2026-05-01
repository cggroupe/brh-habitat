# BRH Habitat — Multi-tenancy & Feature Flags

> Source : `src/config/` (TenantContext, tenant.types, tenants/, tier-presets).
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

BRH Habitat est conçu comme une **plateforme white-label multi-tenant**. Chaque tenant (organisation) a :
- Son **branding** (logo, couleurs, fonts, PWA)
- Son **tier** (`starter`, `pro`, `enterprise`) qui active/désactive des features
- Ses **feature flags** granulaires

Actuellement, **1 seul tenant en prod** : `brh` (enterprise). La structure est prête pour en ajouter d'autres.

## Architecture

```
src/config/
├── tenant.ts              # Fonction resolve du tenant courant
├── tenant.types.ts        # Types TenantConfig, TenantFeatures, PricingTier
├── TenantContext.tsx      # React Context + Provider
├── tenants/
│   ├── brh.ts             # Config BRH (enterprise)
│   └── template.ts        # Template pour nouveau tenant
└── tier-presets.ts        # Presets features par tier
```

## Types

### `PricingTier`
```typescript
type PricingTier = 'starter' | 'pro' | 'enterprise'
```

### `TenantFeatures`
**18 feature flags granulaires** (vérifiés dans `tier-presets.ts`) :

```typescript
type TenantFeatures = {
  // Public (3)
  publicDiagnostic: boolean
  publicArticles: boolean
  publicAssistantAI: boolean

  // Portails (2)
  portalPro: boolean
  portalParticulier: boolean

  // IA (2)
  aiChiffrage: boolean
  aiAssistantTechnique: boolean

  // Partenariat (1)
  recruitmentPyramid: boolean

  // Viral (5)
  socialMediaPosts: boolean
  badgesGamification: boolean
  catalogueCadeaux: boolean
  qrCodeGeneration: boolean
  simulationLinks: boolean

  // Reporting (2)
  monthlyPdfReport: boolean
  teamStats: boolean

  // Infra (3)
  notifications: boolean
  emailNotifications: boolean
  crmWebhook: boolean
}
```

## Gates utilisés comme routes (10 sur 18)

Toutes les 18 features ne sont PAS toutes utilisées comme gates de routes. 10 seulement sont utilisées dans `<FeatureRoute feature="...">` (vérifié via `grep feature= src/App.tsx`) :

`aiAssistantTechnique`, `aiChiffrage`, `badgesGamification`, `catalogueCadeaux`, `monthlyPdfReport`, `qrCodeGeneration`, `recruitmentPyramid`, `simulationLinks`, `socialMediaPosts`, `teamStats`.

Les 8 autres (`publicDiagnostic`, `publicArticles`, `publicAssistantAI`, `portalPro`, `portalParticulier`, `notifications`, `emailNotifications`, `crmWebhook`) sont utilisées **côté logique métier** (afficher/masquer UI, activer EFs) plutôt que comme gates de routes.

### `TenantConfig`
```typescript
type TenantConfig = {
  tenantId: string
  tier: PricingTier
  branding: {
    companyName: string
    companyShortName: string
    tagline: string
    description: string
    address, city, postalCode, phone, email, website: string
    logoUrl, faviconUrl: string
    parentBrand?: { name, tagline, iconUrl }
    colors: {
      primary, primaryDark, primaryLight, secondary, accent: string
      background: string
      sidebarGradientFrom, sidebarGradientTo: string
    }
    fonts: {
      display, sans, accent: string
      googleFontsUrl: string
    }
  }
  features: TenantFeatures
  pwa: {
    name, shortName: string
    themeColor, backgroundColor: string
  }
}
```

## Presets par tier

`src/config/tier-presets.ts` :

### Starter
Basique — publique + portail pro minimal :
```
publicDiagnostic, publicArticles ✓
portalPro ✓ (basique)
portalParticulier ❌
aiChiffrage, aiAssistantTechnique ❌
recruitmentPyramid ❌
socialMediaPosts, badgesGamification, catalogueCadeaux ❌
qrCodeGeneration ✓
monthlyPdfReport ❌
notifications, emailNotifications ✓
crmWebhook ❌
simulationLinks, teamStats ❌
publicAssistantAI ❌
```

### Pro
Complet sauf recruitmentPyramid (réservé enterprise) :
```
publicDiagnostic, publicArticles, publicAssistantAI ✓
portalPro, portalParticulier ✓
aiChiffrage, aiAssistantTechnique ✓
recruitmentPyramid ❌
socialMediaPosts, badgesGamification, catalogueCadeaux ✓
qrCodeGeneration, monthlyPdfReport ✓
notifications, emailNotifications, crmWebhook ✓
simulationLinks, teamStats ✓
```

### Enterprise (BRH actuel)
Toutes features activées :
```
... toutes les features à true
recruitmentPyramid ✓  // différence clé vs Pro
```

## Config BRH (`src/config/tenants/brh.ts`)

```typescript
{
  tenantId: 'brh',
  tier: 'enterprise',
  branding: {
    companyName: 'Bretagne Renovation Habitat',
    companyShortName: 'BRH',
    tagline: 'Le reseau breton de la renovation',
    address: '35 rue de Kervao',
    city: 'Guipavas',
    postalCode: '29490',
    phone: '02 19 00 53 05',
    email: 'relationsclients@contact-brh.fr',
    website: 'renovation-brh.fr',
    logoUrl: '/images/logo-brh.svg',
    parentBrand: { name: 'CG Groupe', tagline: 'Investir dans l\'avenir', iconUrl: '/images/cg-groupe-icon.png' },
    colors: {
      primary: '#1c7b1d',      // Vert Structure
      primaryDark: '#094114',   // Vert Profond
      primaryLight: '#81c784',  // Vert Eco
      secondary: '#359932',     // Vert Artisan
      accent: '#9fb98b',        // Vert Sauge
      background: '#f5f3f2',
      sidebarGradientFrom: '#1c7b1d',
      sidebarGradientTo: '#0a4a0b',
    },
    fonts: {
      display: '"DM Sans", sans-serif',
      sans: '"Inter", sans-serif',
      accent: '"Bebas Neue", sans-serif',
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=...',
    },
  },
  features: { ...TIER_FEATURES.enterprise },
  pwa: {
    name: 'BRH Habitat',
    shortName: 'BRH',
    themeColor: '#1c7b1d',
    backgroundColor: '#ffffff',
  },
}
```

## Utilisation

### Accéder à la config tenant
```typescript
import { useTenant } from '@/config/TenantContext'

function MyComponent() {
  const { tenant } = useTenant()
  return <h1 style={{ color: tenant.branding.colors.primary }}>
    {tenant.branding.companyName}
  </h1>
}
```

### Vérifier une feature
```typescript
import { useFeature } from '@/hooks/useFeature'

function ProDashboard() {
  const hasAIChiffrage = useFeature('aiChiffrage')
  if (!hasAIChiffrage) return null
  return <AIChiffrageWidget />
}
```

### FeatureGate (composant)
```tsx
<FeatureGate feature="aiChiffrage" fallback={<UpgradeNotice />}>
  <AIChiffrageWidget />
</FeatureGate>
```

### Route gated
```tsx
<Route path="/pro/chiffrage-ia" element={
  <ProGuard>
    <FeatureRoute feature="aiChiffrage">
      <ProChiffrageIA />
    </FeatureRoute>
  </ProGuard>
} />
```

Route inactive → redirect `/` (pas 404).

## Scope localStorage par tenant (règle anti-bug #3)

**Obligatoire** : toute clé localStorage doit être préfixée par `tenantId` :
```typescript
const KEY = `${tenantId}-diagnostic-draft`
localStorage.setItem(KEY, JSON.stringify(draft))
```

### Stores Zustand concernés
- `appStore` (user, locale, drawerOpen)
- `diagnosticStore` (draft diagnostic)

**Correction v6** : `diagnosticStore` utilisait une clé globale → conflit si 2 tenants sur la même origine. Fix migration app : scope par tenant.

## Ajouter un nouveau tenant

1. **Copier `src/config/tenants/template.ts`** en `src/config/tenants/<newname>.ts`
2. **Remplir branding** (logo, couleurs, adresse, etc.)
3. **Choisir tier** (`starter`/`pro`/`enterprise`)
4. **Override features** si besoin :
   ```typescript
   features: {
     ...TIER_FEATURES.pro,
     recruitmentPyramid: true,  // override explicite
   }
   ```
5. **Ajouter le tenant dans `tenant.ts`** (resolve function)
6. **Configurer domaine** : `Vercel` + redirect vers tenant via hostname/subdomain
7. **Logo + favicon** dans `public/images/`
8. **Google Fonts** : mettre à jour `googleFontsUrl` si fonts différentes

## Custom CSS par tenant

Les couleurs sont injectées en CSS variables depuis `TenantContext.tsx` :
```typescript
useEffect(() => {
  const root = document.documentElement
  root.style.setProperty('--color-primary', tenant.branding.colors.primary)
  root.style.setProperty('--color-primary-dark', tenant.branding.colors.primaryDark)
  // ...
}, [tenant])
```

Tailwind utilise ces CSS vars (via `tailwind.config` + `@theme` de Tailwind 4).

## PWA

`public/manifest.webmanifest` dynamique par tenant :
- `name` = `pwa.name`
- `short_name` = `pwa.shortName`
- `theme_color` = `pwa.themeColor`
- `icons` depuis `branding.faviconUrl`

## Gotchas

- **Logout** doit `queryClient.clear()` pour éviter fuite data entre tenants
- **Sentry** : tag `tenant_id` sur chaque erreur pour debug ciblé
- **Edge Functions** : pas de logique tenant — tout reste stateless
- **Resend email templates** : inclure branding dynamiquement (logo, couleurs, nom)

## Statut d'implémentation

- ✅ TenantContext + Provider
- ✅ Config BRH (enterprise) opérationnelle
- ✅ Feature gates (16 routes)
- ✅ Scope localStorage par tenant
- ✅ CSS variables par tenant
- ✅ PWA manifest dynamique
- ❌ Multi-tenant runtime par hostname (non activé, 1 seul tenant actuel)
- 🟡 Resend templates dynamiques (à vérifier)

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy).
