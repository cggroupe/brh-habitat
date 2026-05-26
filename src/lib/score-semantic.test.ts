import { describe, expect, it } from 'vitest'
import { mapScoreV2, mapDpeClass } from './score-semantic'

describe('mapScoreV2', () => {
  it('ultra_chaud → label red', () => {
    const r = mapScoreV2(95, 'ultra_chaud')
    expect(r.label).toBe('Ultra chaud')
    expect(r.color).toBe('red')
    expect(r.tooltip).toContain('95')
  })

  it('mpr_bleu_prio → orange', () => {
    expect(mapScoreV2(80, 'mpr_bleu_prio').color).toBe('orange')
  })

  it('standard → amber', () => {
    expect(mapScoreV2(50, 'standard').color).toBe('amber')
  })

  it('cold / inconnu → gray "Faible potentiel"', () => {
    expect(mapScoreV2(10, 'cold').label).toBe('Faible potentiel')
    expect(mapScoreV2(null, null).color).toBe('gray')
  })
})

describe('mapDpeClass', () => {
  it('A et B → green', () => {
    expect(mapDpeClass('A').color).toBe('green')
    expect(mapDpeClass('B').color).toBe('green')
  })
  it('F et G → red', () => {
    expect(mapDpeClass('F').color).toBe('red')
    expect(mapDpeClass('G').color).toBe('red')
  })
  it('D → amber', () => {
    expect(mapDpeClass('D').color).toBe('amber')
  })
  it('null → —/gray', () => {
    const r = mapDpeClass(null)
    expect(r.label).toBe('—')
    expect(r.color).toBe('gray')
  })
})
