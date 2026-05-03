import { describe, it, expect } from 'vitest'
import {
  departementFromInsee,
  departementFromPostalCode,
  isInActiveRegion,
} from './tenant-region'

describe('departementFromInsee', () => {
  it('extrait correctement les départements métropole', () => {
    expect(departementFromInsee('29200')).toBe('29')
    expect(departementFromInsee('75001')).toBe('75')
    expect(departementFromInsee('13001')).toBe('13')
  })

  it('gère la Corse (2A/2B)', () => {
    expect(departementFromInsee('2A001')).toBe('2A')
    expect(departementFromInsee('2B042')).toBe('2B')
  })

  it('retourne null pour un format invalide', () => {
    expect(departementFromInsee(null)).toBe(null)
    expect(departementFromInsee('')).toBe(null)
    expect(departementFromInsee('123')).toBe(null)
    expect(departementFromInsee('123456')).toBe(null)
  })
})

describe('departementFromPostalCode', () => {
  it('extrait département depuis CP métropole', () => {
    expect(departementFromPostalCode('29200')).toBe('29')
    expect(departementFromPostalCode('75008')).toBe('75')
  })

  it('gère la Corse via plage CP (20000-20190 → 2A, 20200+ → 2B)', () => {
    expect(departementFromPostalCode('20000')).toBe('2A')
    expect(departementFromPostalCode('20190')).toBe('2A')
    expect(departementFromPostalCode('20200')).toBe('2B')
    expect(departementFromPostalCode('20620')).toBe('2B')
  })

  it('retourne null pour les formats invalides', () => {
    expect(departementFromPostalCode(null)).toBe(null)
    expect(departementFromPostalCode('29A00')).toBe(null)
    expect(departementFromPostalCode('1234')).toBe(null)
  })
})

describe('isInActiveRegion (tenant brh par défaut → Bretagne)', () => {
  it('reconnaît les départements bretons', () => {
    expect(isInActiveRegion('29200')).toBe(true) // Brest
    expect(isInActiveRegion('35000')).toBe(true) // Rennes
    expect(isInActiveRegion('56000')).toBe(true) // Vannes
    expect(isInActiveRegion('22000')).toBe(true) // Saint-Brieuc
  })

  it('rejette les départements hors Bretagne', () => {
    expect(isInActiveRegion('75001')).toBe(false) // Paris
    expect(isInActiveRegion('13001')).toBe(false) // Marseille
    expect(isInActiveRegion('44000')).toBe(false) // Nantes (Loire-Atlantique, hors Bretagne admin)
  })

  it('retourne false sur null/invalid', () => {
    expect(isInActiveRegion(null)).toBe(false)
    expect(isInActiveRegion('')).toBe(false)
  })
})
