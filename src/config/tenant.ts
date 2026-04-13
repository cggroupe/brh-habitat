import type { TenantConfig } from './tenant.types'

// Charge tous les fichiers tenants au build time (eager = inclus dans le bundle)
const tenantModules = import.meta.glob<{ default: TenantConfig }>('./tenants/*.ts', { eager: true })

// Le tenant actif est defini par VITE_TENANT (defaut: brh)
const tenantId = import.meta.env.VITE_TENANT || 'brh'
const mod = tenantModules[`./tenants/${tenantId}.ts`]

if (!mod) {
  throw new Error(`Tenant "${tenantId}" introuvable. Fichier attendu: src/config/tenants/${tenantId}.ts`)
}

export const tenant: TenantConfig = mod.default
