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
  branding: TenantBranding
  features: TenantFeatures
  pwa: {
    name: string
    shortName: string
    themeColor: string
    backgroundColor: string
  }
}
