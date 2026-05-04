/**
 * Tenant Île-de-France — gabarit Phase 18 (multi-tenant base).
 *
 * Statut : pré-production. Les couleurs / contacts sont des placeholders
 * cohérents BRH ; à remplacer par la marque partenaire IDF avant activation.
 *
 * Activation : `VITE_TENANT=idf npm run build:tenant` (le résolveur
 * `src/config/tenant.ts` charge automatiquement le bon module).
 */
import type { TenantConfig } from '../tenant.types'
import { TENANT_REGIONS } from '../tenant.types'
import { TIER_FEATURES } from '../tier-presets'

const config: TenantConfig = {
  tenantId: 'idf',
  tier: 'pro',
  region: TENANT_REGIONS.idf,
  branding: {
    companyName: 'IDF Renovation Habitat',
    companyShortName: 'IDF Habitat',
    tagline: 'Le réseau francilien de la rénovation énergétique',
    description:
      "Plateforme de mise en relation entre propriétaires F/G et artisans RGE en Île-de-France : Paris, petite couronne, grande couronne.",
    address: '',
    city: 'Paris',
    postalCode: '75001',
    phone: '',
    email: 'contact@idf-habitat.example',
    website: 'idf-habitat.example',
    logoUrl: '/images/logo-brh.svg',
    faviconUrl: '/logo-brh.svg',
    colors: {
      primary: '#1d4ed8',
      primaryDark: '#1e3a8a',
      primaryLight: '#93c5fd',
      secondary: '#2563eb',
      accent: '#bfdbfe',
      background: '#f8fafc',
      sidebarGradientFrom: '#1d4ed8',
      sidebarGradientTo: '#1e3a8a',
    },
    fonts: {
      display: '"DM Sans", sans-serif',
      sans: '"Inter", sans-serif',
      googleFontsUrl:
        'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800&display=swap',
    },
  },
  features: { ...TIER_FEATURES.pro },
  pwa: {
    name: 'IDF Habitat',
    shortName: 'IDF',
    themeColor: '#1d4ed8',
    backgroundColor: '#ffffff',
  },
}

export default config
