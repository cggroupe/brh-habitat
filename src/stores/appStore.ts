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
const LOCALE_KEY = `${tenant.tenantId}-locale`

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Le role n'est pas persiste en localStorage — il sera charge depuis Supabase via validateSession
    // On retourne un user partiel pour l'affichage initial (nom, avatar)
    // 'user' est le role le plus restrictif (pas d'acces admin/pro/particulier)
    // ce qui evite un flash d'UI vers un portail incorrect avant que validateSession charge le vrai role
    return { ...parsed, role: parsed.role ?? 'user' } as User
  } catch {
    return null
  }
}

function loadLocale(): 'fr' | 'en' {
  try {
    const raw = localStorage.getItem(LOCALE_KEY)
    if (raw === 'en') return 'en'
  } catch { /* ignore */ }
  return 'fr'
}

function saveUser(user: User | null) {
  try {
    if (user) {
      // Ne PAS persister le role en localStorage (falsifiable via XSS)
      // On ne stocke que id, email, full_name, avatar_url pour le cache d'affichage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { role: _role, ...safeFields } = user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeFields))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage plein ou indisponible
  }
}

export const useAppStore = create<AppState>((set) => ({
  user: loadUser(),
  locale: loadLocale(),
  drawerOpen: false,

  setUser: (user) => {
    saveUser(user)
    set({ user })
  },

  setLocale: (locale) => {
    try { localStorage.setItem(LOCALE_KEY, locale) } catch { /* ignore */ }
    set({ locale })
  },

  openDrawer: () => set({ drawerOpen: true }),

  closeDrawer: () => set({ drawerOpen: false }),
}))
