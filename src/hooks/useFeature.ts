import { useTenant } from '@/config/TenantContext'
import type { TenantFeatures } from '@/config/tenant.types'

export function useFeature(feature: keyof TenantFeatures): boolean {
  const { features } = useTenant()
  return features[feature]
}
