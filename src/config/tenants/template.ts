/**
 * TEMPLATE — Copier ce fichier pour creer un nouveau client
 * Renommer en: src/config/tenants/{client-id}.ts
 * Puis deployer avec: VITE_TENANT={client-id} npm run build
 */
import type { TenantConfig } from '../tenant.types'
import { TIER_FEATURES } from '../tier-presets'

const config: TenantConfig = {
  tenantId: 'nouveau-client',
  tier: 'pro', // 'starter' | 'pro' | 'enterprise'
  branding: {
    companyName: 'Nom de l\'Entreprise',
    companyShortName: 'NDE',
    tagline: 'Votre slogan ici',
    description: 'Description SEO de l\'entreprise pour Google.',
    address: '1 rue Exemple',
    city: 'Paris',
    postalCode: '75001',
    phone: '01 23 45 67 89',
    email: 'contact@entreprise.fr',
    website: 'www.entreprise.fr',
    logoUrl: '/images/logo-client.svg',
    faviconUrl: '/favicon-client.svg',
    parentBrand: {
      name: 'CG Groupe',
      tagline: 'Investir dans l\'avenir',
      iconUrl: '/images/cg-groupe-icon.png',
    },
    colors: {
      primary: '#2563eb',        // Couleur principale du client
      primaryDark: '#1e40af',
      primaryLight: '#93c5fd',
      secondary: '#3b82f6',
      accent: '#bfdbfe',
      background: '#f5f3f2',
      sidebarGradientFrom: '#2563eb',
      sidebarGradientTo: '#1e3a8a',
    },
    // Optionnel : polices custom
    // fonts: {
    //   display: '"Montserrat", sans-serif',
    //   sans: '"Inter", sans-serif',
    //   googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Inter:wght@400;600&display=swap',
    // },
  },
  features: {
    ...TIER_FEATURES.pro,
    // Overrides specifiques au client :
    // recruitmentPyramid: true,  // activer le MLM
    // socialMediaPosts: false,   // desactiver les posts sociaux
  },
  pwa: {
    name: 'Nom de l\'Entreprise',
    shortName: 'NDE',
    themeColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
}

export default config
