/**
 * Tenant PACA — gabarit Phase 18 (multi-tenant base).
 *
 * Statut : pré-production. Les couleurs / contacts sont des placeholders
 * cohérents BRH ; à remplacer par la marque partenaire PACA avant activation.
 *
 * Activation : `VITE_TENANT=paca npm run build:tenant`.
 */
import type { TenantConfig } from '../tenant.types'
import { TENANT_REGIONS } from '../tenant.types'
import { TIER_FEATURES } from '../tier-presets'

const config: TenantConfig = {
  tenantId: 'paca',
  tier: 'pro',
  region: TENANT_REGIONS.paca,
  branding: {
    companyName: 'PACA Rénovation Habitat',
    companyShortName: 'PACA Habitat',
    tagline: 'Le réseau Sud-Est de la rénovation énergétique',
    description:
      "Plateforme de mise en relation entre propriétaires F/G et artisans RGE en Provence-Alpes-Côte d'Azur : Bouches-du-Rhône, Var, Alpes-Maritimes, Vaucluse, Hautes-Alpes, Alpes-de-Haute-Provence.",
    address: '',
    city: 'Marseille',
    postalCode: '13001',
    phone: '',
    email: 'contact@paca-habitat.example',
    website: 'paca-habitat.example',
    logoUrl: '/images/logo-brh.svg',
    faviconUrl: '/logo-brh.svg',
    colors: {
      primary: '#c2410c',
      primaryDark: '#7c2d12',
      primaryLight: '#fdba74',
      secondary: '#ea580c',
      accent: '#fed7aa',
      background: '#fff7ed',
      sidebarGradientFrom: '#c2410c',
      sidebarGradientTo: '#7c2d12',
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
    name: 'PACA Habitat',
    shortName: 'PACA',
    themeColor: '#c2410c',
    backgroundColor: '#ffffff',
  },
}

export default config
