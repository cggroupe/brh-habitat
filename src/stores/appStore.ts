import { create } from 'zustand'

export interface User {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin'
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

export const useAppStore = create<AppState>((set) => ({
  user: null,
  locale: 'fr',
  drawerOpen: false,

  setUser: (user) => set({ user }),

  setLocale: (locale) => set({ locale }),

  openDrawer: () => set({ drawerOpen: true }),

  closeDrawer: () => set({ drawerOpen: false }),
}))
