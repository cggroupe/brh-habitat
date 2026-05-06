/**
 * Phase 18.7 — Tests unitaires matching chantiers.
 */
import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  proximityFactor,
  recencyFactor,
  matchMetiers,
  scoreChantierForPro,
  rankChantiersForPro,
  type ChantierMatchInput,
  type MatchProContext,
} from './chantier-matching'

const NOW = new Date('2026-05-06T12:00:00Z')

const baseCtx: MatchProContext = {
  myLat: 48.39,
  myLng: -4.49, // Brest
  myDepartement: '29',
  myMetiers: ['couverture', 'zinguerie'],
  now: NOW,
}

function mkChantier(overrides: Partial<ChantierMatchInput> = {}): ChantierMatchInput {
  return {
    id: 'c1',
    metiers_recherches: ['couverture'],
    lat: 48.39,
    lng: -4.49,
    departement: '29',
    status: 'open',
    created_at: NOW.toISOString(),
    budget_cents: 1_000_000,
    ...overrides,
  }
}

describe('haversineKm', () => {
  it('Brest ↔ Rennes ≈ 210 km (tolerance 5 km)', () => {
    const d = haversineKm({ lat: 48.39, lng: -4.49 }, { lat: 48.117, lng: -1.677 })
    expect(d).toBeGreaterThan(205)
    expect(d).toBeLessThan(215)
  })

  it('même point → 0 km', () => {
    const d = haversineKm({ lat: 48.39, lng: -4.49 }, { lat: 48.39, lng: -4.49 })
    expect(d).toBeCloseTo(0)
  })
})

describe('proximityFactor', () => {
  it('5 km → 1.0', () => {
    expect(proximityFactor(5, true)).toBe(1.0)
  })
  it('20 km → 0.85', () => {
    expect(proximityFactor(20, true)).toBe(0.85)
  })
  it('150 km → 0.3', () => {
    expect(proximityFactor(150, true)).toBe(0.3)
  })
  it('null + même dept → 0.6', () => {
    expect(proximityFactor(null, true)).toBe(0.6)
  })
  it('null + autre dept → 0.2', () => {
    expect(proximityFactor(null, false)).toBe(0.2)
  })
})

describe('recencyFactor', () => {
  it('offre du jour → 1.0', () => {
    expect(recencyFactor(NOW.toISOString(), NOW)).toBe(1.0)
  })
  it('offre de 30 jours → 0.3', () => {
    const old = new Date(NOW.getTime() - 30 * 86_400_000).toISOString()
    expect(recencyFactor(old, NOW)).toBeCloseTo(0.3, 2)
  })
  it('offre de 15 jours → ~0.65', () => {
    const mid = new Date(NOW.getTime() - 15 * 86_400_000).toISOString()
    const f = recencyFactor(mid, NOW)
    expect(f).toBeGreaterThan(0.6)
    expect(f).toBeLessThan(0.7)
  })
})

describe('matchMetiers', () => {
  it('intersection simple', () => {
    expect(matchMetiers(['a', 'b'], ['b', 'c'])).toEqual(['b'])
  })
  it('aucun match → []', () => {
    expect(matchMetiers(['a'], ['b'])).toEqual([])
  })
  it('multiple matches', () => {
    expect(matchMetiers(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c'])
  })
})

describe('scoreChantierForPro', () => {
  it('chantier match parfait (0 km, du jour, 1 métier match) → score haut', () => {
    const result = scoreChantierForPro(mkChantier(), baseCtx)
    expect(result).not.toBeNull()
    expect(result!.distanceKm).toBeCloseTo(0)
    expect(result!.matchedMetiers).toEqual(['couverture'])
    // 1 (matchBonus) × 1.0 (prox) × 1.0 (recency) × 100 = 100
    expect(result!.score).toBeCloseTo(100, 1)
  })

  it('chantier sans match métier (avec myMetiers défini) → null', () => {
    const result = scoreChantierForPro(mkChantier({ metiers_recherches: ['platrerie'] }), baseCtx)
    expect(result).toBeNull()
  })

  it('chantier 2 métiers match → matchBonus 2', () => {
    const result = scoreChantierForPro(
      mkChantier({ metiers_recherches: ['couverture', 'zinguerie'] }),
      baseCtx,
    )
    expect(result!.matchedMetiers).toEqual(['couverture', 'zinguerie'])
    // 2 × 1.0 × 1.0 × 100 = 200
    expect(result!.score).toBeCloseTo(200, 1)
  })

  it('chantier loin (Rennes ≈ 210 km) → score réduit', () => {
    const result = scoreChantierForPro(
      mkChantier({ lat: 48.117, lng: -1.677, departement: '35' }),
      baseCtx,
    )
    expect(result!.distanceKm).toBeGreaterThan(200)
    // 1 × 0.3 (>100km) × 1.0 × 100 = 30
    expect(result!.score).toBeCloseTo(30, 1)
  })

  it('myMetiers vide → garde tout sans bonus métier', () => {
    const ctx = { ...baseCtx, myMetiers: [] }
    const result = scoreChantierForPro(mkChantier({ metiers_recherches: ['platrerie'] }), ctx)
    expect(result).not.toBeNull()
    // matchBonus = max(1, 0) = 1 (catch-all)
  })

  it('coords null + même dept → factor 0.6', () => {
    const result = scoreChantierForPro(
      mkChantier({ lat: null, lng: null, departement: '29' }),
      baseCtx,
    )
    expect(result!.distanceKm).toBeNull()
    expect(result!.score).toBeCloseTo(60, 1) // 1 × 0.6 × 1.0 × 100
  })
})

describe('rankChantiersForPro', () => {
  it('filtre status != open', () => {
    const chantiers: ChantierMatchInput[] = [
      mkChantier({ id: 'open' }),
      mkChantier({ id: 'closed', status: 'closed' }),
      mkChantier({ id: 'draft', status: 'draft' }),
    ]
    const ranked = rankChantiersForPro(chantiers, baseCtx)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].chantier.id).toBe('open')
  })

  it('trie par score décroissant', () => {
    const chantiers: ChantierMatchInput[] = [
      mkChantier({ id: 'far', lat: 48.117, lng: -1.677, departement: '35' }), // 210 km
      mkChantier({ id: 'near' }), // 0 km
    ]
    const ranked = rankChantiersForPro(chantiers, baseCtx)
    expect(ranked[0].chantier.id).toBe('near')
    expect(ranked[1].chantier.id).toBe('far')
  })

  it('exclut les sans-match-métier', () => {
    const chantiers: ChantierMatchInput[] = [
      mkChantier({ id: 'match' }),
      mkChantier({ id: 'no-match', metiers_recherches: ['platrerie'] }),
    ]
    const ranked = rankChantiersForPro(chantiers, baseCtx)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].chantier.id).toBe('match')
  })
})
