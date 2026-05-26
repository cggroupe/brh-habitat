import { create } from 'zustand'
import { tenant } from '@/config/tenant'

/**
 * Type d'entité tracée dans la pile de navigation.
 */
export type NavEntityType = 'adresse' | 'entreprise' | 'personne' | 'dirigeant'

export interface NavStackItem {
  type: NavEntityType
  /** Identifiant : SIREN (entreprise), UUID (dirigeant), nom (personne legacy), id numérique (adresse). */
  id: string
  label: string
  sublabel?: string
  /** Path complet pour navigation directe (`/employe/leads/entreprise/918350695`). */
  path: string
}

const MAX_STACK_DEPTH = 4
const STORAGE_KEY = `${tenant.tenantId}-nav-stack`

interface NavStackState {
  stack: NavStackItem[]
  /** Push une nouvelle entité dans la pile. Si l'entité existe déjà, on tronque jusqu'à elle. */
  push: (item: NavStackItem) => void
  /** Retire l'entité courante. Retourne l'item précédent (utile pour navigate). */
  pop: () => NavStackItem | null
  /** Réinitialise la pile. */
  clear: () => void
  /** Item d'origine du parcours (premier de la pile) — utilisé par OriginBanner. */
  getOrigin: () => NavStackItem | null
  /** Item précédent (avant le courant) — pour bouton retour. */
  getPrevious: () => NavStackItem | null
}

function loadStack(): NavStackItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as NavStackItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_STACK_DEPTH)
  } catch {
    return []
  }
}

function saveStack(stack: NavStackItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
  } catch {
    // sessionStorage indisponible ou plein
  }
}

function sameEntity(a: NavStackItem, b: NavStackItem) {
  return a.type === b.type && a.id === b.id
}

export const useNavStackStore = create<NavStackState>((set, get) => ({
  stack: loadStack(),

  push: (item) => {
    set((state) => {
      // Si l'item existe déjà dans la pile, on tronque jusqu'à lui (cycle = retour, pas duplication).
      const idx = state.stack.findIndex((s) => sameEntity(s, item))
      if (idx >= 0) {
        const next = state.stack.slice(0, idx + 1)
        next[idx] = item // refresh label/sublabel
        saveStack(next)
        return { stack: next }
      }
      // Sinon push et bornage à MAX_STACK_DEPTH (drop le plus ancien).
      const next = [...state.stack, item].slice(-MAX_STACK_DEPTH)
      saveStack(next)
      return { stack: next }
    })
  },

  pop: () => {
    const current = get().stack
    if (current.length === 0) return null
    const next = current.slice(0, -1)
    saveStack(next)
    set({ stack: next })
    return next.length > 0 ? next[next.length - 1] : null
  },

  clear: () => {
    saveStack([])
    set({ stack: [] })
  },

  getOrigin: () => {
    const s = get().stack
    return s.length > 1 ? s[0] : null
  },

  getPrevious: () => {
    const s = get().stack
    return s.length >= 2 ? s[s.length - 2] : null
  },
}))

/**
 * Helper React : à appeler au mount d'une page fiche pour enregistrer
 * l'entité dans la pile de navigation. Idempotent (replay safe).
 */
export function pushNavEntity(item: NavStackItem) {
  useNavStackStore.getState().push(item)
}
