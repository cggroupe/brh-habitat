/**
 * Tests Phase 9 — MPR Ampleur (parcours accompagné) + bonus.
 */

import { describe, expect, it } from 'vitest'
import {
  calcMprAmpleur,
  eligibleMprAmpleur,
  isSortiePassoire,
  isBbcAtteint,
  calcAidesScenario,
} from '../index'

describe('MPR Ampleur — éligibilité', () => {
  it('logement < 15 ans → non éligible', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'C',
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: new Date().getFullYear() - 5,
    })
    expect(r.ok).toBe(false)
    expect(r.motif).toContain('15 ans')
  })

  it('étiquette avant D → non éligible (besoin E/F/G)', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'D',
      classeApres: 'B',
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: 1990,
    })
    expect(r.ok).toBe(false)
    expect(r.motif).toContain('E/F/G')
  })

  it('saut < 2 → non éligible', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'E',
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: 1990,
    })
    expect(r.ok).toBe(false)
    expect(r.motif).toContain('< 2')
  })

  it('départ G nécessite saut ≥ 3', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'G',
      classeApres: 'E', // saut 2
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: 1990,
    })
    expect(r.ok).toBe(false)
    expect(r.motif).toContain('départ G')
  })

  it('< 2 gestes isolation → non éligible', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'C',
      travauxHt: 50000,
      nbGestesIso: 1,
      anneeLogement: 1990,
    })
    expect(r.ok).toBe(false)
    expect(r.motif).toContain('nbGestesIso')
  })

  it('cas valide complet → éligible', () => {
    const r = eligibleMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'C',
      gesAvant: 50,
      gesApres: 15,
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: 1990,
    })
    expect(r.ok).toBe(true)
    expect(r.saut).toBe(3)
  })
})

describe('Bonus Sortie de Passoire', () => {
  it('F → C → bonus actif', () => {
    expect(isSortiePassoire('F', 'C')).toBe(true)
  })
  it('G → D → bonus actif', () => {
    expect(isSortiePassoire('G', 'D')).toBe(true)
  })
  it('F → E → pas de bonus (E exclu)', () => {
    expect(isSortiePassoire('F', 'E')).toBe(false)
  })
  it('E → C → pas de bonus (E pas une passoire)', () => {
    expect(isSortiePassoire('E', 'C')).toBe(false)
  })
})

describe('Bonus BBC', () => {
  it('A → BBC', () => {
    expect(isBbcAtteint('A')).toBe(true)
  })
  it('B → BBC', () => {
    expect(isBbcAtteint('B')).toBe(true)
  })
  it('C → pas BBC', () => {
    expect(isBbcAtteint('C')).toBe(false)
  })
})

describe('MPR Ampleur — montants', () => {
  it('Bleu F→C (saut 3) 50k€ travaux', () => {
    const r = calcMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'C',
      gesAvant: 50,
      gesApres: 15,
      travauxHt: 50000,
      nbGestesIso: 3,
      anneeLogement: 1990,
    })
    expect(r.eligible).toBe(true)
    expect(r.nbSautsCalcules).toBe(3)
    // Bleu × 3 sauts : forfait 55k, plafond 55k, taux 80%
    // Min(55k, 50k×0.8=40k, 55k×0.8=44k) = 40k
    // Bonus sortie passoire +10% = 44k
    expect(r.bonusSortiePassoire).toBe(true)
    expect(r.montantSansBonus).toBe(40000)
    expect(r.montantEuros).toBe(Math.round(40000 * 1.1))
  })

  it('Bleu F→A (saut 5) 70k€ — bonus passoire + BBC', () => {
    const r = calcMprAmpleur({
      couleur: 'bleu',
      classeAvant: 'F',
      classeApres: 'A',
      gesAvant: 60,
      gesApres: 5,
      travauxHt: 70000,
      nbGestesIso: 5,
      anneeLogement: 1980,
    })
    expect(r.eligible).toBe(true)
    expect(r.nbSautsCalcules).toBe(4) // ≥ 4
    expect(r.bonusSortiePassoire).toBe(true)
    expect(r.bonusBbc).toBe(true)
    // Forfait Bleu 4+ : 70k, plafond 70k, taux 80%
    // Min(70k, 70k×0.8=56k, 70k×0.8=56k) = 56k
    // Bonus +10% +10% = 56k × 1.2 = 67.2k
    expect(r.montantSansBonus).toBe(56000)
    expect(r.montantEuros).toBe(Math.round(56000 * 1.2))
  })

  it('Rose F→C (saut 3) 80k€ — taux 25%', () => {
    const r = calcMprAmpleur({
      couleur: 'rose',
      classeAvant: 'F',
      classeApres: 'C',
      gesAvant: 50,
      gesApres: 15,
      travauxHt: 80000,
      nbGestesIso: 3,
      anneeLogement: 1980,
    })
    expect(r.eligible).toBe(true)
    expect(r.bonusSortiePassoire).toBe(true)
    // Rose × 3 sauts : forfait 40k, plafond 55k, taux 25%
    // Min(40k, 80k×0.25=20k, 55k×0.25=13.75k) = 13750
    // +10% = 15125
    expect(r.montantSansBonus).toBe(13750)
    expect(r.montantEuros).toBe(Math.round(13750 * 1.1))
  })
})

describe('Orchestrateur calcAidesScenario — Ampleur vs mono-geste', () => {
  it('Bleu F→B (saut 4 + 3 gestes iso) : ampleur > mono', () => {
    const r = calcAidesScenario({
      couleur: 'bleu',
      zoneClimat: 'H2',
      gestes: [
        { geste: 'isolation_murs_ite', surface: 100, coutHtEuros: 12000, categorieEcoPtz: 'isolation_murs' },
        { geste: 'isolation_combles_perdus', surface: 80, coutHtEuros: 2500, categorieEcoPtz: 'isolation_toiture' },
        { geste: 'isolation_plancher_bas', surface: 80, coutHtEuros: 3000, categorieEcoPtz: 'isolation_plancher_bas' },
        { geste: 'pac_eau_eau', coutHtEuros: 22000, categorieEcoPtz: 'chauffage_ecs' },
      ],
      sautClassesDpe: 4,
      ampleurContext: {
        classeAvant: 'F',
        classeApres: 'B',
        gesAvant: 50,
        gesApres: 5,
        nbGestesIso: 3,
        anneeLogement: 1980,
      },
    })

    expect(r.mprAmpleur?.eligible).toBe(true)
    // L'ampleur devrait gagner (forfait Bleu 4+ ≈ 56k vs mono ~25-30k)
    expect(r.ampleurChosen).toBe(true)
  })

  it('Bleu F→D (saut 2 + 1 geste iso) : ampleur non éligible → mono prend le dessus', () => {
    const r = calcAidesScenario({
      couleur: 'bleu',
      zoneClimat: 'H2',
      gestes: [
        { geste: 'pac_air_eau', coutHtEuros: 12000, categorieEcoPtz: 'chauffage_ecs' },
        { geste: 'isolation_combles_perdus', surface: 80, coutHtEuros: 2500, categorieEcoPtz: 'isolation_toiture' },
      ],
      sautClassesDpe: 2,
      ampleurContext: {
        classeAvant: 'F',
        classeApres: 'D',
        gesAvant: 50,
        gesApres: 25,
        nbGestesIso: 1, // 1 seul geste iso → ampleur non éligible
        anneeLogement: 1980,
      },
    })

    expect(r.mprAmpleur?.eligible).toBe(false)
    expect(r.ampleurChosen).toBe(false)
    expect(r.mpr.totalEuros).toBeGreaterThan(0)
  })
})
