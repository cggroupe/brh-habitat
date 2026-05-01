/**
 * Tests Phase 11.1 — Enedis & GRDF (parsing signaux + URLs).
 */

import { describe, it, expect } from 'vitest'
import {
  parseEnedisAddrSignal,
  buildEnedisAddrUrl,
  buildEnedisIrisUrl,
} from '../enedis'
import { parseGrdfIrisSignal, buildGrdfIrisUrl, isGazDominantIris } from '../grdf'

describe('enedis — parseEnedisAddrSignal', () => {
  it('calcule kWh/logt depuis MWh + nb logements', () => {
    const r = parseEnedisAddrSignal({ conso_moyenne_mwh: 30, nb_logements: 100 })
    expect(r.kwh_par_logt).toBe(300)
  })

  it('arrondit à 0.1 kWh', () => {
    const r = parseEnedisAddrSignal({ conso_moyenne_mwh: 28.347, nb_logements: 100 })
    expect(r.kwh_par_logt).toBe(283.5)
  })

  it('null si pas de logements', () => {
    expect(parseEnedisAddrSignal({ conso_moyenne_mwh: 100, nb_logements: 0 }).kwh_par_logt).toBeNull()
  })

  it('null si conso absente', () => {
    expect(parseEnedisAddrSignal({ nb_logements: 50 }).kwh_par_logt).toBeNull()
  })

  it('null si row absente', () => {
    expect(parseEnedisAddrSignal(null).kwh_par_logt).toBeNull()
  })
})

describe('enedis — buildUrl', () => {
  it('URL adresse contient code commune et voie en lower', () => {
    const url = buildEnedisAddrUrl({
      codeCommune: '35238',
      voie: 'Rue de la Forge',
      numero: '12',
    })
    // URLSearchParams encode les espaces en '+' (form encoding)
    const decoded = decodeURIComponent(url).replace(/\+/g, ' ')
    expect(decoded).toContain('code_commune="35238"')
    expect(decoded).toContain('rue de la forge')
    expect(decoded).toContain('numero_voie="12"')
  })

  it('URL IRIS filtre par dépt', () => {
    const url = buildEnedisIrisUrl({ departement: '35' })
    const decoded = decodeURIComponent(url)
    expect(decoded).toContain('substr(code_iris,1,2)="35"')
  })
})

describe('grdf — buildGrdfIrisUrl', () => {
  it('URL filtre par dépt', () => {
    const url = buildGrdfIrisUrl({ departement: '29' })
    const decoded = decodeURIComponent(url)
    expect(decoded).toContain('substr(code_iris,1,2)="29"')
  })
})

describe('grdf — parseGrdfIrisSignal', () => {
  it('arrondit conso MWh', () => {
    const r = parseGrdfIrisSignal({ conso_totale_mwh: 4123.7, nb_pdl_residentiels: 230 })
    expect(r.conso_gaz_mwh_an).toBe(4124)
    expect(r.pdl_gaz_resid).toBe(230)
  })

  it('null si row absente', () => {
    const r = parseGrdfIrisSignal(null)
    expect(r.conso_gaz_mwh_an).toBeNull()
    expect(r.pdl_gaz_resid).toBeNull()
  })
})

describe('grdf — isGazDominantIris', () => {
  it('>50% PDL gaz résidentiel → dominant', () => {
    const sig = { conso_gaz_mwh_an: 4000, pdl_gaz_resid: 600 }
    expect(isGazDominantIris(sig, 1000)).toBe(true)
  })

  it('<50% → non dominant', () => {
    const sig = { conso_gaz_mwh_an: 2000, pdl_gaz_resid: 200 }
    expect(isGazDominantIris(sig, 1000)).toBe(false)
  })

  it('PDL null → false', () => {
    expect(isGazDominantIris({ conso_gaz_mwh_an: null, pdl_gaz_resid: null }, 100)).toBe(false)
  })
})
