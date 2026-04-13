import { createContext, useContext } from 'react'
import { tenant } from './tenant'
import type { TenantConfig } from './tenant.types'

const TenantContext = createContext<TenantConfig>(tenant)

export function useTenant() {
  return useContext(TenantContext)
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}
