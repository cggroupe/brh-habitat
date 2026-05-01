/**
 * Cas test fumée Phase 1 — vérifie que le pipeline tourne sans crash.
 * La précision des calculs DPE viendra en Phase 2 (tolérance ±5 % vs Open Data ADEME).
 */

import { describe, expect, it } from 'vitest'
import { computeDpe, departementFromInsee, getZoneClimatique } from '../index'
import { COEF_EP, MOTEUR_VERSION } from '../constants'
import { brest100m2 } from './fixtures/brest-100m2'

describe('DPE Engine — smoke tests Phase 1', () => {
  it('computeDpe ne crash pas sur Brest 100m²', () => {
    const result = computeDpe(brest100m2)
    expect(result).toBeDefined()
    expect(result.hypotheses.moteurVersion).toBe(MOTEUR_VERSION)
  })

  it('zone climatique Brest = H2A', () => {
    const result = computeDpe(brest100m2)
    expect(result.hypotheses.zoneClimatique).toBe('H2A')
  })

  it('département depuis INSEE — Brest', () => {
    expect(departementFromInsee('29019')).toBe('29')
  })

  it('département depuis INSEE — Corse', () => {
    expect(departementFromInsee('2A001')).toBe('2A')
    expect(departementFromInsee('2B033')).toBe('2B')
  })

  it('département depuis INSEE — DROM', () => {
    expect(departementFromInsee('97411')).toBe('974')
  })

  it('zone climatique pour les 4 départements bretons', () => {
    expect(getZoneClimatique('22001')).toBe('H2A')
    expect(getZoneClimatique('29019')).toBe('H2A')
    expect(getZoneClimatique('35238')).toBe('H2A')
    expect(getZoneClimatique('56178')).toBe('H2A')
  })

  it('coef EP électricité = 2.3 (ADR-002 — corrige bug CapRénov+ 1.9)', () => {
    expect(COEF_EP.electricite).toBe(2.3)
  })

  it('altitude bucket bornes', () => {
    const r0 = computeDpe({ ...brest100m2, geo: { codeInsee: '29019', altitude: 100 } })
    expect(r0.hypotheses.altitude).toBe(0)

    const r400 = computeDpe({ ...brest100m2, geo: { codeInsee: '38001', altitude: 500 } })
    expect(r400.hypotheses.altitude).toBe(400)

    const r800 = computeDpe({ ...brest100m2, geo: { codeInsee: '05001', altitude: 1500 } })
    expect(r800.hypotheses.altitude).toBe(800)
  })
})
