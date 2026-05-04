/**
 * Régions cibles supportées (scope géographique du tenant).
 * Sert au scoring DPE, à la map prospects, et au filtrage des aides locales.
 */
export type TenantRegionCode = 'bretagne' | 'idf' | 'paca'

export interface TenantRegion {
  code: TenantRegionCode
  /** Nom affiché ("Bretagne", "Île-de-France", "Provence-Alpes-Côte d'Azur"). */
  name: string
  /**
   * Codes département INSEE inclus (2 chars, "01"–"95" + "2A"/"2B").
   * Ex Bretagne : ['22', '29', '35', '56'].
   */
  departments: string[]
  /** Centre approximatif pour centrer la map prospects (latitude WGS84). */
  centerLat: number
  /** Centre approximatif (longitude WGS84). */
  centerLng: number
  /** Zoom initial Leaflet (Bretagne 8, IDF 9, PACA 8). */
  defaultZoom: number
}

export interface TenantBranding {
  companyName: string
  companyShortName: string
  tagline: string
  description: string
  address: string
  city: string
  postalCode: string
  phone: string
  email: string
  website: string
  logoUrl: string
  faviconUrl: string
  parentBrand?: {
    name: string
    tagline: string
    iconUrl: string
  }
  colors: {
    primary: string
    primaryDark: string
    primaryLight: string
    secondary: string
    accent: string
    background: string
    sidebarGradientFrom: string
    sidebarGradientTo: string
  }
  fonts?: {
    display: string
    sans: string
    accent?: string
    googleFontsUrl: string
  }
}

export interface TenantFeatures {
  publicDiagnostic: boolean
  publicArticles: boolean
  publicAssistantAI: boolean
  portalPro: boolean
  portalParticulier: boolean
  aiChiffrage: boolean
  aiAssistantTechnique: boolean
  recruitmentPyramid: boolean
  socialMediaPosts: boolean
  badgesGamification: boolean
  catalogueCadeaux: boolean
  qrCodeGeneration: boolean
  monthlyPdfReport: boolean
  notifications: boolean
  crmWebhook: boolean
  emailNotifications: boolean
  simulationLinks: boolean
  teamStats: boolean
}

export type PricingTier = 'starter' | 'pro' | 'enterprise'

export interface TenantConfig {
  tenantId: string
  tier: PricingTier
  /**
   * Région géographique cible. Optionnel pour rétrocompat — si absent, on retombe
   * sur Bretagne (default historique BRH). Les nouveaux tenants doivent fournir
   * cette clé pour activer le scoping département + map centrée + aides locales.
   */
  region?: TenantRegion
  branding: TenantBranding
  features: TenantFeatures
  pwa: {
    name: string
    shortName: string
    themeColor: string
    backgroundColor: string
  }
}

/**
 * Catalogue des régions prêtes à l'emploi. Utilisé par les configs tenants
 * et par les helpers de scoping prospects.
 */
export const TENANT_REGIONS: Record<TenantRegionCode, TenantRegion> = {
  bretagne: {
    code: 'bretagne',
    name: 'Bretagne',
    departments: ['22', '29', '35', '56'],
    centerLat: 48.2,
    centerLng: -2.93,
    defaultZoom: 8,
  },
  idf: {
    code: 'idf',
    name: 'Île-de-France',
    departments: ['75', '77', '78', '91', '92', '93', '94', '95'],
    centerLat: 48.86,
    centerLng: 2.35,
    defaultZoom: 9,
  },
  paca: {
    code: 'paca',
    name: "Provence-Alpes-Côte d'Azur",
    departments: ['04', '05', '06', '13', '83', '84'],
    centerLat: 43.93,
    centerLng: 6.06,
    defaultZoom: 8,
  },
}
