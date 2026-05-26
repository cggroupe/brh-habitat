import { describe, expect, it } from 'vitest'
import {
  formatSiren,
  formatM2,
  formatEurosFromCents,
  formatDate,
  formatDateShort,
  formatNumber,
} from './format'

describe('formatSiren', () => {
  it('formate un SIREN 9 chiffres en groupes de 3', () => {
    expect(formatSiren('918350695')).toBe('918 350 695')
  })
  it('strip les caractères non numériques avant formatage', () => {
    expect(formatSiren('918-350-695')).toBe('918 350 695')
  })
  it("retourne la chaîne brute si pas 9 chiffres exactement", () => {
    expect(formatSiren('123')).toBe('123')
    expect(formatSiren('1234567890')).toBe('1234567890')
  })
  it('gère null/undefined/empty', () => {
    expect(formatSiren(null)).toBe('')
    expect(formatSiren(undefined)).toBe('')
    expect(formatSiren('')).toBe('')
  })
})

describe('formatM2', () => {
  it('formate un m² avec séparateur FR', () => {
    expect(formatM2(89)).toBe('89 m²')
    expect(formatM2(1234)).toMatch(/1\s?234 m²/)
  })
  it('retourne — si null/NaN', () => {
    expect(formatM2(null)).toBe('—')
    expect(formatM2(undefined)).toBe('—')
    expect(formatM2(Number.NaN)).toBe('—')
  })
})

describe('formatEurosFromCents', () => {
  it('convertit cents en euros avec symbole €', () => {
    const res = formatEurosFromCents(1234500)
    // Selon locale, peut être "12 345 €" ou "12 345,00 €" (mais maximumFractionDigits=0)
    expect(res).toMatch(/12\s?345/)
    expect(res).toContain('€')
  })
  it('retourne — si null', () => {
    expect(formatEurosFromCents(null)).toBe('—')
  })
})

describe('formatDate', () => {
  it("formate une date ISO en format FR long", () => {
    const res = formatDate('2024-03-15')
    expect(res).toMatch(/15.*mars.*2024/i)
  })
  it("retourne — si invalide", () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatDateShort', () => {
  it('formate en JJ/MM/AAAA', () => {
    expect(formatDateShort('2024-03-15')).toBe('15/03/2024')
  })
})

describe('formatNumber', () => {
  it('formate avec espace milliers', () => {
    expect(formatNumber(1100)).toMatch(/1\s?100/)
  })
  it('gère 0 et négatif', () => {
    expect(formatNumber(0)).toBe('0')
  })
  it('retourne — si null', () => {
    expect(formatNumber(null)).toBe('—')
  })
})
