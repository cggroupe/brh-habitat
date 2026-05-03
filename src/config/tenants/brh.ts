import type { TenantConfig } from '../tenant.types'
import { TENANT_REGIONS } from '../tenant.types'
import { TIER_FEATURES } from '../tier-presets'

const config: TenantConfig = {
  tenantId: 'brh',
  tier: 'enterprise',
  region: TENANT_REGIONS.bretagne,
  branding: {
    companyName: 'Bretagne Renovation Habitat',
    companyShortName: 'BRH',
    tagline: 'Le reseau breton de la renovation',
    description: 'Expert en renovation globale et multiservice de l\'habitat en Bretagne : toiture, electricite, menuiserie, isolation, second oeuvre.',
    address: '35 rue de Kervao',
    city: 'Guipavas',
    postalCode: '29490',
    phone: '02 19 00 53 05',
    email: 'relationsclients@contact-brh.fr',
    website: 'renovation-brh.fr',
    logoUrl: '/images/logo-brh.svg',
    faviconUrl: '/logo-brh.svg',
    parentBrand: {
      name: 'CG Groupe',
      tagline: 'Investir dans l\'avenir',
      iconUrl: '/images/cg-groupe-icon.png',
    },
    colors: {
      primary: '#1c7b1d',
      primaryDark: '#094114',
      primaryLight: '#81c784',
      secondary: '#359932',
      accent: '#9fb98b',
      background: '#f5f3f2',
      sidebarGradientFrom: '#1c7b1d',
      sidebarGradientTo: '#0a4a0b',
    },
    fonts: {
      display: '"DM Sans", sans-serif',
      sans: '"Inter", sans-serif',
      accent: '"Bebas Neue", sans-serif',
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@400;700;800&display=swap',
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

export default config
