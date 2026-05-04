/**
 * Tests Phase 2.3 + 2.4 — ECS, usages mineurs, étiquettes DPE.
 */

import { describe, expect, it } from 'vitest'
import {
  calcEcs,
  calcBecsKwhAn,
  calcEclairageKwhEpAn,
  calcAuxiliairesKwhEpAn,
  calcClimatisationKwhEpAn,
  calcPhotovoltaiqueKwhEpAn,
  classifyDpe,
  classifyValue,
  getSeuils,
  dpeFinal,
  ORDER_DPE,
  calcSautClasses,
  isPassoireThermique,
  computeDpe,
} from '../index'
import type { AuditInputs } from '../types'
import { brest100m2 } from './fixtures/brest-100m2'

describe('ECS', () => {
  it('Becs Brest 100m² (Nadeq 2.75) plausible', () => {
    const becs = calcBecsKwhAn(brest100m2)
    // Becs = 1.163 × 2.75 × 56 × 40 × 365 / 1000 ≈ 2616 kWh/an
    expect(becs).toBeGreaterThan(2000)
    expect(becs).toBeLessThan(3500)
  })

  it('Becs maison 6 personnes > maison 2 personnes', () => {
    const grosse: AuditInputs = {
      ...brest100m2,
      bati: { ...brest100m2.bati, surfaceHabitable: 250 },
      foyer: { nbAdultes: 5, nbEnfants: 3 },
    }
    expect(calcBecsKwhAn(grosse)).toBeGreaterThan(calcBecsKwhAn(brest100m2))
  })

  it('CET ECS plus efficace que ballon électrique', () => {
    const ballonElec = calcEcs(brest100m2)
    const cetInputs: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        ecs: { generateur: 'cet', stockageL: 200, anneeInstallation: 2018 },
      },
    }
    const cet = calcEcs(cetInputs)
    expect(cet.cecsEfKwhAn).toBeLessThan(ballonElec.cecsEfKwhAn)
  })

  it('ECS gaz : EP = EF (coef 1.0)', () => {
    const inputs: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        ecs: { generateur: 'gaz', stockageL: 0, anneeInstallation: 2015 },
      },
    }
    const r = calcEcs(inputs)
    expect(r.energie).toBe('gaz_naturel')
    expect(r.cecsEpKwhAn).toBeCloseTo(r.cecsEfKwhAn, 5)
  })
})

describe('usages mineurs', () => {
  it('Éclairage forfait 1.4 kWh/m²/an EP', () => {
    expect(calcEclairageKwhEpAn(brest100m2)).toBe(140)
  })

  it('Auxiliaires VMC + circulateur > 0', () => {
    const aux = calcAuxiliairesKwhEpAn(brest100m2)
    expect(aux).toBeGreaterThan(0)
  })

  it('Auxiliaires double flux > simple flux', () => {
    const sf: AuditInputs = {
      ...brest100m2,
      equipements: { ...brest100m2.equipements, ventilation: 'vmc_sf_auto_apres_2000' },
    }
    const df: AuditInputs = {
      ...brest100m2,
      equipements: { ...brest100m2.equipements, ventilation: 'vmc_double_flux_avec_recup' },
    }
    expect(calcAuxiliairesKwhEpAn(df)).toBeGreaterThan(calcAuxiliairesKwhEpAn(sf))
  })

  it('Clim = 0 si pas de surface clim', () => {
    expect(calcClimatisationKwhEpAn(brest100m2)).toBe(0)
  })

  it('Clim H3 > Clim H2A', () => {
    const climInputs: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        climatisation: { surfaceClim: 50, seer: 4.5 },
      },
    }
    const h3: AuditInputs = { ...climInputs, geo: { codeInsee: '13001', altitude: 10 } }
    const h2a: AuditInputs = { ...climInputs, geo: { codeInsee: '29019', altitude: 50 } }
    expect(calcClimatisationKwhEpAn(h3)).toBeGreaterThan(calcClimatisationKwhEpAn(h2a))
  })

  it('PV = 0 si pas configuré', () => {
    expect(calcPhotovoltaiqueKwhEpAn(brest100m2)).toBe(0)
  })

  it('PV 3 kWc Brest > 0', () => {
    const inputs: AuditInputs = {
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        photovoltaique: { puissance: 3, orientation: 'sud', inclinaison: 30 },
      },
    }
    const pv = calcPhotovoltaiqueKwhEpAn(inputs)
    // 3 kWc × 1100 kWh/kWc × 1.0 facteur × 2.3 EP ≈ 7590 kWh EP
    expect(pv).toBeGreaterThan(5000)
    expect(pv).toBeLessThan(10000)
  })
})

describe('étiquettes DPE', () => {
  it('classifyValue : 100 < seuilA → A', () => {
    const seuils = { A: 110, B: 180, C: 250, D: 330, E: 420, F: 530 }
    expect(classifyValue(100, seuils)).toBe('A')
    expect(classifyValue(150, seuils)).toBe('B')
    expect(classifyValue(200, seuils)).toBe('C')
    expect(classifyValue(300, seuils)).toBe('D')
    expect(classifyValue(400, seuils)).toBe('E')
    expect(classifyValue(500, seuils)).toBe('F')
    expect(classifyValue(600, seuils)).toBe('G')
  })

  it('classifyValue : value === seuil → tombe dans la classe supérieure (pire)', () => {
    const seuils = { A: 110, B: 180, C: 250, D: 330, E: 420, F: 530 }
    expect(classifyValue(110, seuils)).toBe('B') // pas A
    expect(classifyValue(180, seuils)).toBe('C') // pas B
  })

  it('getSeuils Brest 100m² CEP retourne valeurs croissantes', () => {
    const s = getSeuils(100, 50, 'H2A', 'CEP')
    expect(s).not.toBeNull()
    if (!s) return
    expect(s.A).toBeLessThan(s.B)
    expect(s.B).toBeLessThan(s.C)
    expect(s.C).toBeLessThan(s.D)
    expect(s.D).toBeLessThan(s.E)
    expect(s.E).toBeLessThan(s.F)
  })

  it('Interpolation surface 100.5 entre 100 et 101', () => {
    const s100 = getSeuils(100, 50, 'H2A', 'CEP')
    const s101 = getSeuils(101, 50, 'H2A', 'CEP')
    const s100_5 = getSeuils(100.5, 50, 'H2A', 'CEP')
    expect(s100).not.toBeNull()
    expect(s101).not.toBeNull()
    expect(s100_5).not.toBeNull()
    if (!s100 || !s101 || !s100_5) return
    // Interpolation linéaire au milieu
    expect(s100_5.A).toBeCloseTo((s100.A + s101.A) / 2, 1)
  })

  it('dpeFinal : max(CEP, GES) = pire', () => {
    expect(dpeFinal('B', 'F')).toBe('F')
    expect(dpeFinal('A', 'A')).toBe('A')
    expect(dpeFinal('G', 'A')).toBe('G')
  })

  it('ORDER_DPE : A=1..G=7', () => {
    expect(ORDER_DPE.A).toBe(1)
    expect(ORDER_DPE.G).toBe(7)
  })

  it('calcSautClasses positif si amélioration', () => {
    expect(calcSautClasses('F', 'C')).toBe(3)
    expect(calcSautClasses('G', 'B')).toBe(5)
    expect(calcSautClasses('B', 'F')).toBe(-4)
  })

  it('isPassoireThermique : F et G uniquement', () => {
    expect(isPassoireThermique('F')).toBe(true)
    expect(isPassoireThermique('G')).toBe(true)
    expect(isPassoireThermique('E')).toBe(false)
    expect(isPassoireThermique('A')).toBe(false)
  })

  it('classifyDpe Brest 100m² fioul : étiquette plausible (D-G)', () => {
    const r = classifyDpe(290, 75, 100, 50, 'H2A')
    // Maison fioul 1948-1974 typique : E ou F
    expect(['D', 'E', 'F', 'G']).toContain(r.etiquetteDpe)
  })
})

describe('computeDpe — Phase 2.4 (étiquettes calculées)', () => {
  it('Brest 100m² fioul : étiquettes valides A-G', () => {
    const r = computeDpe(brest100m2)
    expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(r.etiquetteEnergie)
    expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(r.etiquetteClimat)
    expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(r.etiquetteDpe)
    // dpeFinal = max(energie, climat)
    expect(ORDER_DPE[r.etiquetteDpe]).toBeGreaterThanOrEqual(ORDER_DPE[r.etiquetteEnergie])
    expect(ORDER_DPE[r.etiquetteDpe]).toBeGreaterThanOrEqual(ORDER_DPE[r.etiquetteClimat])
  })

  it('Brest 100m² fioul 1948-1974 : DPE = E à G (passoire ou proche)', () => {
    const r = computeDpe(brest100m2)
    expect(['E', 'F', 'G']).toContain(r.etiquetteDpe)
  })

  it('Maison RT2012 PAC eau/eau : DPE = A à C', () => {
    const recente: AuditInputs = {
      ...brest100m2,
      bati: {
        ...brest100m2.bati,
        periodeConstruction: 'apres_2013',
        inertie: 'LOURDE',
        parois: brest100m2.bati.parois.map((p) =>
          p.type === 'mur' || p.type === 'plancher_haut'
            ? { ...p, isolation: { type: 'iti', epaisseur: 200, lambda: 0.030 } }
            : p,
        ),
      },
      equipements: {
        chauffage: {
          generateur: 'pac_eau_eau',
          emetteur: 'plancher_chauffant',
          anneeInstallation: 2020,
          regulation: true,
        },
        ecs: { generateur: 'cet', stockageL: 200, anneeInstallation: 2020 },
        ventilation: 'vmc_double_flux_avec_recup',
      },
    }
    const r = computeDpe(recente)
    expect(['A', 'B', 'C']).toContain(r.etiquetteDpe)
  })

  it('PV réduit le CEP', () => {
    const sansPv = computeDpe(brest100m2)
    const avecPv = computeDpe({
      ...brest100m2,
      equipements: {
        ...brest100m2.equipements,
        photovoltaique: { puissance: 4, orientation: 'sud', inclinaison: 30 },
      },
    })
    expect(avecPv.cepKwhEpM2An).toBeLessThan(sansPv.cepKwhEpM2An)
  })
})
