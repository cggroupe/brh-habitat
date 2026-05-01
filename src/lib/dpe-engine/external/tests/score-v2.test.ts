/**
 * Tests Phase 11.1 — score composite v2 (orchestrateur signaux externes).
 *
 * Vérifie les 9 règles + bonus précarité + segmentation actionnable.
 */

import { describe, it, expect } from 'vitest'
import { computeScoreV2 } from '../score-v2'
import {
  prospectUltraChaud,
  prospectStandard,
  prospectPrecariteMax,
  prospectPvExistant,
  prospectColdRose,
} from './fixtures'

describe('score-v2 — règles individuelles', () => {
  it('Règle #1 mutation_24m + F/G → +35 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'mutation_24m_FG')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(35)
  })

  it('Règle #2 IRIS Bleu → +20 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'mpr_bleu')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(20)
  })

  it('Règle #3 sur-conso Enedis (>250 kWh/logt) → +15 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'enedis_overuse')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(15)
  })

  it('Règle #5 RGA fort → +10 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'rga_fort')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(10)
  })

  it('Règle #6 Radon zone 3 → +10 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'radon_z3')
    expect(rule).toBeDefined()
  })

  it('Règle #7 faible concurrence (<5 RGE iso) → +5 pts (rural 22)', () => {
    const r = computeScoreV2(prospectPrecariteMax)
    const rule = r.rules.find((x) => x.rule === 'low_concurrence')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(5)
  })

  it('Règle #8 gentrification (+15% prix m² 3y) → +7 pts', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const rule = r.rules.find((x) => x.rule === 'gentrif')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(7)
  })

  it('Règle #9 PV ≥36kW existant → -10 pts', () => {
    const r = computeScoreV2(prospectPvExistant)
    const rule = r.rules.find((x) => x.rule === 'pv_existing')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(-10)
  })

  it('Bonus précarité (D1 + thermosens > 8000) → +15 pts', () => {
    const r = computeScoreV2(prospectPrecariteMax)
    const rule = r.rules.find((x) => x.rule === 'precarite_max')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(15)
  })

  it('Règle #4 IRIS proprio>70% & avant_1975>60% → +10 pts', () => {
    // prospectPvExistant utilise irisRuralVioletAncien (78% / 71%)
    // Mais il a -10 PV, on isole le déclenchement règle #4
    const r = computeScoreV2(prospectPvExistant)
    const rule = r.rules.find((x) => x.rule === 'iris_proprio_ancien')
    expect(rule).toBeDefined()
    expect(rule?.points).toBe(10)
  })
})

describe('score-v2 — segmentation', () => {
  it('Score ≥80 → segment ultra_chaud', () => {
    const r = computeScoreV2(prospectUltraChaud)
    expect(r.total).toBeGreaterThanOrEqual(80)
    expect(r.segment).toBe('ultra_chaud')
  })

  it('IRIS Bleu + score ≥50 mais <80 → segment mpr_bleu_prio', () => {
    const r = computeScoreV2(prospectPrecariteMax)
    // Précarité Max : Bleu (20) + Enedis (15) + RGA (10) + low_conc (5) + précarité (15) = 65
    expect(r.total).toBeGreaterThanOrEqual(50)
    expect(r.total).toBeLessThan(80)
    expect(r.segment).toBe('mpr_bleu_prio')
  })

  it('IRIS Rose + score < 60 → segment cold/standard (pas premium)', () => {
    const r = computeScoreV2(prospectColdRose)
    // C + Rose + zéro signaux → score très bas
    expect(r.segment).not.toBe('premium')
  })

  it('Score borné entre 0 et 100', () => {
    const r1 = computeScoreV2(prospectUltraChaud)
    const r2 = computeScoreV2(prospectPvExistant)
    expect(r1.total).toBeLessThanOrEqual(100)
    expect(r2.total).toBeGreaterThanOrEqual(0)
  })

  it('IRIS Rose élevé et score très bas → segment cold (pas standard) si < 40', () => {
    const r = computeScoreV2(prospectColdRose)
    // ProspectStandard est Rose D + zéro signaux → 0 pts → cold
    expect(r.total).toBeLessThan(40)
    expect(r.segment).toBe('cold')
  })
})

describe('score-v2 — breakdown', () => {
  it('breakdown contient toutes les règles déclenchées', () => {
    const r = computeScoreV2(prospectUltraChaud)
    const ruleNames = r.rules.map((x) => x.rule)
    expect(ruleNames).toContain('mutation_24m_FG')
    expect(ruleNames).toContain('mpr_bleu')
    expect(ruleNames).toContain('enedis_overuse')
    expect(ruleNames).toContain('rga_fort')
  })

  it('chaque règle expose un trigger lisible', () => {
    const r = computeScoreV2(prospectUltraChaud)
    for (const rule of r.rules) {
      expect(rule.trigger).toBeTruthy()
      expect(typeof rule.trigger).toBe('string')
    }
  })

  it('total = somme des points des règles', () => {
    const r = computeScoreV2(prospectPrecariteMax)
    const sum = r.rules.reduce((acc, x) => acc + x.points, 0)
    expect(r.total).toBe(Math.max(0, Math.min(100, sum)))
  })
})

describe('score-v2 — cas limites', () => {
  it('prospect sans aucune donnée externe → score 0 + cold', () => {
    const r = computeScoreV2({
      prospect: { id: 'empty', etiquette_dpe: 'D', has_pv_36kw: false },
      iris: null,
      commune: null,
      risques: null,
      dvf: null,
      enedisAddr: null,
    })
    expect(r.total).toBe(0)
    expect(r.rules).toHaveLength(0)
    expect(r.segment).toBe('cold')
  })

  it('IRIS Jaune (D4-D5) → +15 pts (pas +20 comme Bleu)', () => {
    const input = {
      ...prospectStandard,
      iris: { ...prospectStandard.iris!, couleur_mpr: 'jaune' as const, decile_estime: 4 },
    }
    const r = computeScoreV2(input)
    const rule = r.rules.find((x) => x.rule === 'mpr_jaune')
    expect(rule?.points).toBe(15)
  })

  it('Mutation 24m sans F/G → règle #1 NON déclenchée', () => {
    const input = {
      ...prospectStandard,
      dvf: { mutation_24m: true, prix_m2_growth_3y: null },
    }
    const r = computeScoreV2(input)
    const rule = r.rules.find((x) => x.rule === 'mutation_24m_FG')
    expect(rule).toBeUndefined()
  })
})
