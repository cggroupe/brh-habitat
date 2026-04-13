import { create } from 'zustand'
import type { UserRole } from '@/types/database'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
}

interface AppState {
  user: User | null
  locale: 'fr' | 'en'
  drawerOpen: boolean
  setUser: (user: User | null) => void
  setLocale: (locale: 'fr' | 'en') => void
  openDrawer: () => void
  closeDrawer: () => void
}

// Persistence localStorage — cle dynamique par tenant
import { tenant } from '@/config/tenant'
const STORAGE_KEY = `${tenant.tenantId}-user`

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage plein ou indisponible
  }
}

export const useAppStore = create<AppState>((set) => ({
  user: loadUser(),
  locale: 'fr',
  drawerOpen: false,

  setUser: (user) => {
    saveUser(user)
    set({ user })
  },

  setLocale: (locale) => set({ locale }),

  openDrawer: () => set({ drawerOpen: true }),

  closeDrawer: () => set({ drawerOpen: false }),
}))
