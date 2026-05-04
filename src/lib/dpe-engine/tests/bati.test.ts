/**
 * Tests Phase 2.1 — Modules bâti core.
 */

import { describe, expect, it } from 'vitest'
import {
  calcBParoi,
  calcUp,
  calcRIsolant,
  calcUw,
  calcSw,
  calcUjn,
  deperParoiOpaque,
  deperTotaleEnveloppe,
  calcQ4paSurf,
  calcN50,
  calcQvarep,
  calcDR,
  calcGvVentilRecup,
  calcNadeq,
  calcApportsInternesAnnuelsKwh,
  calcApportsSolairesAnnuelsKwh,
  calcGV,
  computeDpe,
  U_PLAFOND,
} from '../index'
import type { ParoiInput, OuvertureInput, BatiInputs } from '../types'
import { brest100m2 } from './fixtures/brest-100m2'

describe('coef-reduction-b', () => {
  it('extérieur → b = 1', () => {
    expect(calcBParoi('exterieur')).toBe(1)
  })

  it('autre logement → b = 0', () => {
    expect(calcBParoi('autre_logement')).toBe(0)
  })

  it('combles perdus → b = 0.95', () => {
    expect(calcBParoi('combles_perdus')).toBe(0.95)
  })

  it('couloir → b = 0.2', () => {
    expect(calcBParoi('couloir')).toBe(0.2)
  })

  it('valeur par défaut (undefined) → b = 1', () => {
    expect(calcBParoi(undefined)).toBe(1)
  })
})

describe('calc-up', () => {
  it('R isolant 100mm laine λ=0.04 → R = 2.5 m²·K/W', () => {
    expect(calcRIsolant(100, 0.04)).toBe(2.5)
  })

  it('R = 0 si pas d\'isolant', () => {
    expect(calcRIsolant(undefined, undefined)).toBe(0)
    expect(calcRIsolant(0, 0.04)).toBe(0)
  })

  it('mur pierre non isolé : Up plafonné à 2.5', () => {
    const paroi: ParoiInput = {
      type: 'mur',
      surface: 100,
      materiau: 'parpaing', // R faible
    }
    expect(calcUp(paroi)).toBeLessThanOrEqual(U_PLAFOND)
  })

  it('mur isolé 200mm λ=0.04 : Up < 0.3', () => {
    const paroi: ParoiInput = {
      type: 'mur',
      surface: 100,
      materiau: 'parpaing',
      isolation: { type: 'iti', epaisseur: 200, lambda: 0.04 },
    }
    expect(calcUp(paroi)).toBeLessThan(0.3)
    expect(calcUp(paroi)).toBeGreaterThan(0.15)
  })
})

describe('ouvertures', () => {
  it('fenêtre PVC double vitrage : Uw ≈ 2.6', () => {
    const o: OuvertureInput = { type: 'fenetre', surface: 1.5, menuiserie: 'pvc', vitrage: 'double' }
    expect(calcUw(o)).toBe(2.6)
  })

  it('fenêtre PVC double VIR : Uw < 2.6', () => {
    const o: OuvertureInput = { type: 'fenetre', surface: 1.5, menuiserie: 'pvc', vitrage: 'double', vir: true }
    expect(calcUw(o)).toBeLessThan(2.6)
  })

  it('porte bois : Uw = 2.5', () => {
    const o: OuvertureInput = { type: 'porte', surface: 2, menuiserie: 'bois' }
    expect(calcUw(o)).toBe(2.5)
  })

  it('volet isolant réduit Ujn vs Uw', () => {
    const o: OuvertureInput = {
      type: 'fenetre', surface: 1.5, menuiserie: 'pvc', vitrage: 'double',
      volet: 'volet_ext_isolant',
    }
    expect(calcUjn(o)).toBeLessThan(calcUw(o))
  })

  it('Sw porte = 0', () => {
    const o: OuvertureInput = { type: 'porte', surface: 2 }
    expect(calcSw(o)).toBe(0)
  })

  it('Sw double vitrage > Sw triple', () => {
    const dbl: OuvertureInput = { type: 'fenetre', surface: 1.5, vitrage: 'double' }
    const tpl: OuvertureInput = { type: 'fenetre', surface: 1.5, vitrage: 'triple' }
    expect(calcSw(dbl)).toBeGreaterThan(calcSw(tpl))
  })
})

describe('deperditions', () => {
  it('paroi b=0 → DP = 0', () => {
    const paroi: ParoiInput = { type: 'mur', surface: 100, adjacence: 'autre_logement' }
    expect(deperParoiOpaque(paroi)).toBe(0)
  })

  it('mur 100m² ext non isolé : DP > 200 W/K', () => {
    const paroi: ParoiInput = {
      type: 'mur', surface: 100, adjacence: 'exterieur', materiau: 'parpaing',
    }
    expect(deperParoiOpaque(paroi)).toBeGreaterThan(200)
  })

  it('Brest 100m² : DP enveloppe > 0', () => {
    const dep = deperTotaleEnveloppe(brest100m2.bati)
    expect(dep.parois).toBeGreaterThan(0)
    expect(dep.ouvertures).toBeGreaterThan(0)
    expect(dep.total).toBe(dep.parois + dep.ouvertures)
  })
})

describe('permeabilite', () => {
  it('avant 1948 sans iso : Q4paSurf = 3.3', () => {
    const bati: BatiInputs = {
      ...brest100m2.bati,
      periodeConstruction: 'avant_1948',
      parois: brest100m2.bati.parois.map((p) => ({ ...p, isolation: { type: 'sans' } })),
      ouvertures: [{ type: 'fenetre', surface: 1, vitrage: 'simple', menuiserie: 'bois' }],
    }
    expect(calcQ4paSurf(bati)).toBe(3.3)
  })

  it('apres 2013 : Q4paSurf = 0.6 (RT2012)', () => {
    const bati: BatiInputs = {
      ...brest100m2.bati,
      periodeConstruction: 'apres_2013',
    }
    expect(calcQ4paSurf(bati)).toBe(0.6)
  })

  it('n50 maison Brest > 0', () => {
    const n = calcN50(brest100m2.bati, 'naturelle')
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(20) // sanity check
  })
})

describe('renouvellement-air', () => {
  it('Qvarep VMC double flux récup post-2013 = 0.26', () => {
    expect(calcQvarep('vmc_double_flux_avec_recup', 2018)).toBe(0.26)
  })

  it('Qvarep ventilation naturelle = 1.2', () => {
    expect(calcQvarep('naturelle', 1980)).toBe(1.2)
  })

  it('DR = Hvent + Hperm > 0', () => {
    expect(calcDR(brest100m2.bati, 'naturelle')).toBeGreaterThan(0)
  })

  it('GV récup double flux = 0 si pas double flux', () => {
    expect(calcGvVentilRecup(brest100m2.bati, 'naturelle')).toBe(0)
  })

  it('GV récup double flux > 0 avec récup', () => {
    expect(calcGvVentilRecup(brest100m2.bati, 'vmc_double_flux_avec_recup')).toBeGreaterThan(0)
  })
})

describe('apports', () => {
  it('Nadeq maison 100m² ≈ 2.75', () => {
    const n = calcNadeq(brest100m2.bati)
    expect(n).toBeCloseTo(2.75, 1)
  })

  it('Apports internes annuels > 0', () => {
    expect(calcApportsInternesAnnuelsKwh(brest100m2.bati)).toBeGreaterThan(0)
  })

  it('Apports solaires Brest H2A > 0', () => {
    expect(calcApportsSolairesAnnuelsKwh(brest100m2.bati, 'H2A')).toBeGreaterThan(0)
  })
})

describe('calc-gv-ubat', () => {
  it('GV décomposition Brest 100m² complète', () => {
    const gv = calcGV(brest100m2.bati, 'naturelle')
    expect(gv.parois).toBeGreaterThan(0)
    expect(gv.ouvertures).toBeGreaterThan(0)
    expect(gv.pontsThermiques).toBeGreaterThan(0)
    expect(gv.renouvellementAir).toBeGreaterThan(0)
    expect(gv.recupDoubleFlux).toBe(0)
    expect(gv.total).toBeGreaterThan(0)
    expect(gv.ubat).toBeGreaterThan(0)
    expect(gv.ubat).toBeLessThan(2.5) // sanity
  })

  it('Ubat plus faible avec ITE qu\'avec ITI sur même bâti', () => {
    // V1 : approche simplifiée, on vérifie juste que Ubat dépend de l'isolation
    const batiITE: BatiInputs = {
      ...brest100m2.bati,
      parois: brest100m2.bati.parois.map((p) =>
        p.type === 'mur'
          ? { ...p, isolation: { type: 'ite', epaisseur: 200, lambda: 0.04 } }
          : p,
      ),
    }
    const gvITE = calcGV(batiITE, 'naturelle')
    const gvBrest = calcGV(brest100m2.bati, 'naturelle')
    expect(gvITE.ubat).toBeLessThan(gvBrest.ubat)
  })
})

describe('computeDpe — Phase 2.1 (bâti calculé)', () => {
  it('Brest 100m² : déperditions remplies (non zéro)', () => {
    const r = computeDpe(brest100m2)
    expect(r.deperditions.total).toBeGreaterThan(0)
    expect(r.deperditions.parois).toBeGreaterThan(0)
    expect(r.deperditions.ubat).toBeGreaterThan(0)
    expect(r.hypotheses.nadeq).toBeGreaterThan(0)
  })

  it('Brest 100m² : déperdition totale plausible (300-1500 W/K)', () => {
    const r = computeDpe(brest100m2)
    // Maison 100m² 1948-1974 fioul : typiquement 400-1000 W/K avant rénovation
    expect(r.deperditions.total).toBeGreaterThan(300)
    expect(r.deperditions.total).toBeLessThan(1500)
  })
})
