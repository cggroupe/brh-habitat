/**
 * Tests Phase 8 — Moteur aides financières (MPR + CEE + ÉcoPTZ + cumul).
 */

import { describe, expect, it } from 'vitest'
import {
  calcCouleurMpr,
  calcMprGeste,
  calcMprTotal,
  calcCeeGeste,
  calcCeeTotal,
  calcEcoPtz,
  calcCumulPlafond,
  calcAidesScenario,
  zoneClimatToCEE,
  isIdf,
} from '../index'

describe('decile MPR', () => {
  it('foyer 4p Bretagne avec RFR 25 000 € → BLEU', () => {
    const r = calcCouleurMpr({
      revenuFiscalReference: 25000,
      nbPersonnes: 4,
      zone: 'region',
    })
    expect(r.couleur).toBe('bleu')
    expect(r.niveau).toBe('tres_modeste')
  })

  it('foyer 4p Bretagne avec RFR 40 000 € → JAUNE', () => {
    const r = calcCouleurMpr({
      revenuFiscalReference: 40000,
      nbPersonnes: 4,
      zone: 'region',
    })
    expect(r.couleur).toBe('jaune')
  })

  it('foyer 4p Bretagne avec RFR 60 000 € → VIOLET', () => {
    const r = calcCouleurMpr({
      revenuFiscalReference: 60000,
      nbPersonnes: 4,
      zone: 'region',
    })
    expect(r.couleur).toBe('violet')
  })

  it('foyer 4p Bretagne avec RFR 80 000 € → ROSE', () => {
    const r = calcCouleurMpr({
      revenuFiscalReference: 80000,
      nbPersonnes: 4,
      zone: 'region',
    })
    expect(r.couleur).toBe('rose')
  })

  it('détection IDF par code INSEE', () => {
    expect(isIdf('75056')).toBe(true)
    expect(isIdf('92044')).toBe(true)
    expect(isIdf('29019')).toBe(false)
    expect(isIdf('35238')).toBe(false)
  })

  it('extrapolation > 5 personnes', () => {
    const r = calcCouleurMpr({
      revenuFiscalReference: 50000,
      nbPersonnes: 7,
      zone: 'region',
    })
    // Plafond très modeste 7p hors-IDF = 40835 + 5151*2 = 51137 → BLEU
    expect(r.plafonds.tresModeste).toBe(40835 + 5151 * 2)
    expect(r.couleur).toBe('bleu')
  })
})

describe('MPR mono-geste', () => {
  it('Bleu PAC eau/eau = 11 000 € forfait', () => {
    const r = calcMprGeste({ geste: 'pac_eau_eau', couleur: 'bleu' })
    expect(r.montantPlafonne).toBe(11000)
  })

  it('Jaune PAC eau/eau = 9 000 €', () => {
    const r = calcMprGeste({ geste: 'pac_eau_eau', couleur: 'jaune' })
    expect(r.montantPlafonne).toBe(9000)
  })

  it('Violet PAC eau/eau = 6 000 €', () => {
    const r = calcMprGeste({ geste: 'pac_eau_eau', couleur: 'violet' })
    expect(r.montantPlafonne).toBe(6000)
  })

  it('Rose PAC = 0 € (exclu mono-geste)', () => {
    const r = calcMprGeste({ geste: 'pac_eau_eau', couleur: 'rose' })
    expect(r.montantPlafonne).toBe(0)
    expect(r.motifPlafonnage).toBe('rose_exclu_mono_geste')
  })

  it('Bleu ITE 100 m² = 7 500 €', () => {
    const r = calcMprGeste({
      geste: 'isolation_murs_ite',
      couleur: 'bleu',
      surface: 100,
    })
    expect(r.montantPlafonne).toBe(75 * 100)
  })

  it('total MPR sur multi-gestes', () => {
    const t = calcMprTotal([
      { geste: 'isolation_murs_ite', couleur: 'bleu', surface: 100 },
      { geste: 'pac_eau_eau', couleur: 'bleu' },
      { geste: 'cet_thermodynamique', couleur: 'bleu' },
    ])
    expect(t.totalEuros).toBe(75 * 100 + 11000 + 1200)
  })
})

describe('CEE', () => {
  it('CEE PAC air/eau Bretagne H2 standard', () => {
    const r = calcCeeGeste({
      geste: 'pac_air_eau',
      couleur: 'rose',
      zoneClimat: 'H2',
    })
    expect(r.cumacKwh).toBe(73000)
    expect(r.prixMwh).toBe(7.86)
    expect(r.montantEuros).toBeCloseTo(73 * 7.86, 1)
    expect(r.categorieCee).toBe('standard')
  })

  it('CEE Bleu = précaire (bonus +20%)', () => {
    const r = calcCeeGeste({
      geste: 'pac_air_eau',
      couleur: 'bleu',
      zoneClimat: 'H2',
    })
    expect(r.cumacKwh).toBe(73000 * 1.2)
    expect(r.prixMwh).toBe(8.21)
    expect(r.categorieCee).toBe('precaire')
  })

  it('CEE ITE 100 m² Bretagne H2', () => {
    const r = calcCeeGeste({
      geste: 'isolation_murs_ite',
      couleur: 'rose',
      zoneClimat: 'H2',
      surface: 100,
    })
    expect(r.cumacKwh).toBe(1300 * 100)
  })

  it('total CEE multi-gestes', () => {
    const t = calcCeeTotal([
      { geste: 'isolation_murs_ite', couleur: 'jaune', zoneClimat: 'H2', surface: 100 },
      { geste: 'pac_air_eau', couleur: 'jaune', zoneClimat: 'H2' },
    ])
    expect(t.totalEuros).toBeGreaterThan(0)
    expect(t.totalCumacKwh).toBeGreaterThan(0)
  })
})

describe('Éco-PTZ', () => {
  it('1 action vitrage seule = mode 1 / 7 000 €', () => {
    const r = calcEcoPtz({
      categories: ['menuiseries'],
      coutHtEuros: 8000,
    })
    expect(r.mode).toBe(1)
    expect(r.plafondEuros).toBe(7000)
    expect(r.montantEligibleEuros).toBe(7000)
  })

  it('1 action isolation murs = mode 2 / 15 000 €', () => {
    const r = calcEcoPtz({
      categories: ['isolation_murs'],
      coutHtEuros: 12000,
    })
    expect(r.mode).toBe(2)
    expect(r.montantEligibleEuros).toBe(12000) // < plafond
  })

  it('2 actions = mode 3 / 25 000 €', () => {
    const r = calcEcoPtz({
      categories: ['isolation_murs', 'chauffage_ecs'],
      coutHtEuros: 22000,
    })
    expect(r.mode).toBe(3)
  })

  it('3+ actions = mode 4 / 30 000 €', () => {
    const r = calcEcoPtz({
      categories: ['isolation_murs', 'isolation_toiture', 'chauffage_ecs', 'menuiseries'],
      coutHtEuros: 35000,
    })
    expect(r.mode).toBe(4)
    expect(r.plafondEuros).toBe(30000)
    expect(r.montantEligibleEuros).toBe(30000) // plafonné
  })

  it('saut DPE ≥ 2 = mode 5', () => {
    const r = calcEcoPtz({
      categories: ['isolation_murs'],
      sautClassesDpe: 3,
      coutHtEuros: 25000,
    })
    expect(r.mode).toBe(5)
  })

  it('rénovation ampleur = mode 6 / 50 000 €', () => {
    const r = calcEcoPtz({
      categories: ['isolation_murs', 'isolation_toiture', 'chauffage_ecs'],
      sautClassesDpe: 3,
      isGlobalAmpleur: true,
      coutHtEuros: 75000,
    })
    expect(r.mode).toBe(6)
    expect(r.plafondEuros).toBe(50000)
  })
})

describe('Cumul + plafonds globaux', () => {
  it('Bleu : aides plafonnées à 90% HT', () => {
    const r = calcCumulPlafond({
      couleur: 'bleu',
      coutHtEuros: 30000,
      mprEuros: 20000,
      ceeEuros: 8000,
    })
    expect(r.totalAidesBrutes).toBe(28000)
    expect(r.plafondGlobalEuros).toBe(27000) // 0.9 × 30k
    expect(r.totalAidesPlafonnees).toBe(27000)
    expect(r.ratioEcretement).toBeCloseTo(27000 / 28000, 3)
    expect(r.resteAChargeEuros).toBe(3000)
  })

  it('Jaune : 75% HT max', () => {
    const r = calcCumulPlafond({
      couleur: 'jaune',
      coutHtEuros: 30000,
      mprEuros: 15000,
      ceeEuros: 8000,
    })
    expect(r.plafondGlobalEuros).toBe(22500)
    expect(r.totalAidesPlafonnees).toBe(22500)
  })

  it('Rose : 40% HT max', () => {
    const r = calcCumulPlafond({
      couleur: 'rose',
      coutHtEuros: 30000,
      mprEuros: 0,
      ceeEuros: 8000,
    })
    expect(r.plafondGlobalEuros).toBe(12000)
    expect(r.totalAidesPlafonnees).toBe(8000) // pas écrêté car total < plafond
    expect(r.ratioEcretement).toBe(1)
  })
})

describe('Scenario complet', () => {
  it('Renovation globale Bleu Bretagne (H2)', () => {
    const r = calcAidesScenario({
      couleur: 'bleu',
      zoneClimat: 'H2',
      gestes: [
        { geste: 'isolation_murs_ite', surface: 100, coutHtEuros: 12000, categorieEcoPtz: 'isolation_murs' },
        { geste: 'isolation_combles_perdus', surface: 80, coutHtEuros: 2500, categorieEcoPtz: 'isolation_toiture' },
        { geste: 'pac_air_eau', coutHtEuros: 12000, categorieEcoPtz: 'chauffage_ecs' },
        { geste: 'cet_thermodynamique', coutHtEuros: 4000, categorieEcoPtz: 'chauffage_ecs' },
      ],
      sautClassesDpe: 3,
    })
    expect(r.coutHtTotal).toBe(30500)
    expect(r.mpr.totalEuros).toBeGreaterThan(0)
    expect(r.cee.totalEuros).toBeGreaterThan(0)
    expect(r.ecoPtz.mode).toBe(5) // saut DPE 3
    expect(r.cumul.plafondGlobalEuros).toBeCloseTo(0.9 * 30500, 1)
    expect(r.aidesTotalSubventionsEuros).toBeLessThanOrEqual(r.cumul.plafondGlobalEuros)
    expect(r.resteAChargeFinal).toBeGreaterThanOrEqual(0)
  })

  it('Rose ne touche que CEE (pas MPR)', () => {
    const r = calcAidesScenario({
      couleur: 'rose',
      zoneClimat: 'H2',
      gestes: [
        { geste: 'pac_air_eau', coutHtEuros: 12000, categorieEcoPtz: 'chauffage_ecs' },
      ],
    })
    expect(r.mpr.totalEuros).toBe(0)
    expect(r.cee.totalEuros).toBeGreaterThan(0)
  })
})

describe('zoneClimatToCEE', () => {
  it('mappings H1A/H1B → H1', () => {
    expect(zoneClimatToCEE('H1A')).toBe('H1')
    expect(zoneClimatToCEE('H1B')).toBe('H1')
    expect(zoneClimatToCEE('H1C')).toBe('H1')
  })
  it('mappings H2A/H2B/H2C/H2D → H2', () => {
    expect(zoneClimatToCEE('H2A')).toBe('H2')
    expect(zoneClimatToCEE('H2B')).toBe('H2')
    expect(zoneClimatToCEE('H2D')).toBe('H2')
  })
  it('H3 → H3', () => {
    expect(zoneClimatToCEE('H3')).toBe('H3')
  })
})
