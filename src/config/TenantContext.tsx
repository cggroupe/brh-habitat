import { createContext, useContext } from 'react'
import { tenant } from './tenant'
import type { TenantConfig } from './tenant.types'

const TenantContext = createContext<TenantConfig>(tenant)

// Hook exporte separement pour satisfaire react-refresh/only-export-components
// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => useContext(TenantContext)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}
