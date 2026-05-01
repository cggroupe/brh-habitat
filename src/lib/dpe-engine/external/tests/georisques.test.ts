/**
 * Tests Phase 11.1 — Géorisques (parsing API + agrégation risques).
 */

import { describe, it, expect } from 'vitest'
import {
  buildGeorisquesUrls,
  aggregateGeorisques,
  extractRadonCategorie,
} from '../georisques'

describe('georisques — buildGeorisquesUrls', () => {
  it('génère 4 URLs pour un code INSEE', () => {
    const urls = buildGeorisquesUrls('35238')
    expect(urls.rga).toContain('code_insee=35238')
    expect(urls.radon).toContain('code_insee=35238')
    expect(urls.inondation).toContain('code_insee=35238')
    expect(urls.cavites).toContain('code_insee=35238')
    expect(urls.rga).toContain('georisques.gouv.fr')
  })
})

describe('georisques — extractRadonCategorie', () => {
  it('extrait catégorie 3 quand présente', () => {
    expect(extractRadonCategorie({ data: [{ code_insee: '29019', classe_potentiel: 3 }] })).toBe(3)
  })

  it('null si data vide', () => {
    expect(extractRadonCategorie({ data: [] })).toBeNull()
    expect(extractRadonCategorie(null)).toBeNull()
  })
})

describe('georisques — aggregateGeorisques', () => {
  it('aggrège 4 réponses en RisquesAdresse', () => {
    const r = aggregateGeorisques({
      rga: { data: [{ code_insee: '35238', alea: 'fort' }] },
      radon: { data: [{ code_insee: '35238', classe_potentiel: 1 }] },
      inondation: {
        data: [{ code_insee: '35238', libelle_risque: 'PPRi Vilaine', type_pprn: 'PPRI' }],
      },
      cavites: { data: [{ code_insee: '35238' }, { code_insee: '35238' }] },
      codeInsee: '35238',
    })

    expect(r.rga_local).toBe('fort')
    expect(r.inondation_zone).toBe('PPRI')
    expect(r.cavites_proches).toBe(2)
    expect(r.abf_zone).toBe(false) // V1 : Phase 11.2
  })

  it('null safe sur 4 endpoints absents', () => {
    const r = aggregateGeorisques({
      rga: null,
      radon: null,
      inondation: null,
      cavites: null,
      codeInsee: '35238',
    })
    expect(r.rga_local).toBeNull()
    expect(r.inondation_zone).toBeNull()
    expect(r.cavites_proches).toBe(0)
    expect(r.abf_zone).toBe(false)
  })

  it('inondation_zone fallback sur libelle_risque si type_pprn absent', () => {
    const r = aggregateGeorisques({
      rga: null,
      radon: null,
      inondation: { data: [{ libelle_risque: 'Inondation Rance' }] },
      cavites: null,
      codeInsee: '22',
    })
    expect(r.inondation_zone).toBe('Inondation Rance')
  })
})
