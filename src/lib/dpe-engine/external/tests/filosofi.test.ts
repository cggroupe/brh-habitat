/**
 * Tests Phase 11.1 — Filosofi (décile MPR auto IRIS).
 */

import { describe, it, expect } from 'vitest'
import {
  estimateDecile,
  decileToCouleurMpr,
  medianeToCouleurMpr,
} from '../filosofi'

describe('filosofi — estimateDecile', () => {
  it('médiane très basse (D1) → 1', () => {
    expect(estimateDecile(11_500)).toBe(1)
  })

  it('médiane médiane nationale (≈D5) → 5', () => {
    expect(estimateDecile(23_900)).toBe(5)
  })

  it('médiane très haute → 10', () => {
    expect(estimateDecile(80_000)).toBe(10)
  })

  it('valeur nulle/invalide → null', () => {
    expect(estimateDecile(null)).toBeNull()
    expect(estimateDecile(undefined)).toBeNull()
    expect(estimateDecile(0)).toBeNull()
    expect(estimateDecile(-100)).toBeNull()
    expect(estimateDecile(Number.NaN)).toBeNull()
  })

  it('cohérence ordinale : décile croissant avec revenu', () => {
    const d1 = estimateDecile(10_000)!
    const d5 = estimateDecile(23_000)!
    const d9 = estimateDecile(45_000)!
    expect(d1).toBeLessThan(d5)
    expect(d5).toBeLessThan(d9)
  })
})

describe('filosofi — decileToCouleurMpr', () => {
  it('D1-D3 → Bleu', () => {
    expect(decileToCouleurMpr(1)).toBe('bleu')
    expect(decileToCouleurMpr(2)).toBe('bleu')
    expect(decileToCouleurMpr(3)).toBe('bleu')
  })

  it('D4-D5 → Jaune', () => {
    expect(decileToCouleurMpr(4)).toBe('jaune')
    expect(decileToCouleurMpr(5)).toBe('jaune')
  })

  it('D6-D8 → Violet', () => {
    expect(decileToCouleurMpr(6)).toBe('violet')
    expect(decileToCouleurMpr(7)).toBe('violet')
    expect(decileToCouleurMpr(8)).toBe('violet')
  })

  it('D9-D10 → Rose', () => {
    expect(decileToCouleurMpr(9)).toBe('rose')
    expect(decileToCouleurMpr(10)).toBe('rose')
  })

  it('null → null', () => {
    expect(decileToCouleurMpr(null)).toBeNull()
    expect(decileToCouleurMpr(undefined)).toBeNull()
  })

  it('décile hors plage → null', () => {
    expect(decileToCouleurMpr(0)).toBeNull()
    expect(decileToCouleurMpr(11)).toBeNull()
  })
})

describe('filosofi — medianeToCouleurMpr', () => {
  it('combinaison directe MED21 → Couleur', () => {
    expect(medianeToCouleurMpr(11_500)).toBe('bleu')
    expect(medianeToCouleurMpr(23_000)).toBe('jaune')
    expect(medianeToCouleurMpr(35_000)).toBe('violet')
    expect(medianeToCouleurMpr(60_000)).toBe('rose')
  })

  it('null → null', () => {
    expect(medianeToCouleurMpr(null)).toBeNull()
  })
})
