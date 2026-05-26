import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock sessionStorage (env node)
const memoryStore: Record<string, string> = {}
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => memoryStore[k] ?? null,
  setItem: (k: string, v: string) => {
    memoryStore[k] = v
  },
  removeItem: (k: string) => {
    delete memoryStore[k]
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) delete memoryStore[k]
  },
})

import { useNavStackStore } from './navStackStore'

describe('navStackStore', () => {
  beforeEach(() => {
    // Reset Zustand state + sessionStorage
    useNavStackStore.setState({ stack: [] })
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k])
  })

  it('push ajoute un item', () => {
    const item = {
      type: 'entreprise' as const,
      id: '918350695',
      label: 'KER GWEL VAD',
      path: '/employe/leads/entreprise/918350695',
    }
    useNavStackStore.getState().push(item)
    expect(useNavStackStore.getState().stack).toHaveLength(1)
    expect(useNavStackStore.getState().stack[0].label).toBe('KER GWEL VAD')
  })

  it('push tronque la pile si on revient sur une entité déjà visitée (anti-duplication)', () => {
    const a = {
      type: 'entreprise' as const,
      id: 'A',
      label: 'A',
      path: '/p/A',
    }
    const b = {
      type: 'personne' as const,
      id: 'B',
      label: 'B',
      path: '/p/B',
    }
    const c = {
      type: 'entreprise' as const,
      id: 'C',
      label: 'C',
      path: '/p/C',
    }
    useNavStackStore.getState().push(a)
    useNavStackStore.getState().push(b)
    useNavStackStore.getState().push(c)
    expect(useNavStackStore.getState().stack).toHaveLength(3)
    // Retour cycle sur A
    useNavStackStore.getState().push(a)
    expect(useNavStackStore.getState().stack).toHaveLength(1)
    expect(useNavStackStore.getState().stack[0].id).toBe('A')
  })

  it('respecte la profondeur max (4)', () => {
    for (let i = 0; i < 6; i++) {
      useNavStackStore.getState().push({
        type: 'entreprise',
        id: `${i}`,
        label: `Item${i}`,
        path: `/p/${i}`,
      })
    }
    const stack = useNavStackStore.getState().stack
    expect(stack).toHaveLength(4)
    // Les 2 plus anciens (0, 1) doivent être éjectés
    expect(stack[0].id).toBe('2')
    expect(stack[3].id).toBe('5')
  })

  it('pop retire le dernier et retourne le précédent', () => {
    useNavStackStore.getState().push({
      type: 'entreprise',
      id: 'A',
      label: 'A',
      path: '/p/A',
    })
    useNavStackStore.getState().push({
      type: 'personne',
      id: 'B',
      label: 'B',
      path: '/p/B',
    })
    const prev = useNavStackStore.getState().pop()
    expect(prev?.id).toBe('A')
    expect(useNavStackStore.getState().stack).toHaveLength(1)
  })

  it('pop sur pile vide retourne null', () => {
    expect(useNavStackStore.getState().pop()).toBeNull()
  })

  it("getOrigin retourne le premier item si profondeur > 1", () => {
    useNavStackStore.getState().push({
      type: 'entreprise',
      id: 'A',
      label: 'Origine A',
      path: '/p/A',
    })
    useNavStackStore.getState().push({
      type: 'personne',
      id: 'B',
      label: 'B',
      path: '/p/B',
    })
    expect(useNavStackStore.getState().getOrigin()?.label).toBe('Origine A')
  })

  it("getOrigin retourne null si profondeur ≤ 1", () => {
    useNavStackStore.getState().push({
      type: 'entreprise',
      id: 'A',
      label: 'A',
      path: '/p/A',
    })
    expect(useNavStackStore.getState().getOrigin()).toBeNull()
  })

  it('clear vide la pile', () => {
    useNavStackStore.getState().push({
      type: 'entreprise',
      id: 'A',
      label: 'A',
      path: '/p/A',
    })
    useNavStackStore.getState().clear()
    expect(useNavStackStore.getState().stack).toHaveLength(0)
  })
})
