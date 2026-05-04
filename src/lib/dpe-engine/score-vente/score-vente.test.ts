/**
 * Phase 16.0.2 — Tests algo Score Vente v1.
 *
 * Couvre :
 *   - les 13 règles individuellement (chacune isolée → vérifier le delta points)
 *   - les seuils de segments
 *   - le calibrage probabilité par segment
 *   - les cas limites (input vide, valeurs nulles, score plafonné à 100)
 */
import { describe, it, expect } from 'vitest'
import {
  computeScoreVente,
  segmentFromScore,
  probaFromSegment,
  SCORE_VENTE_RULES_DOC,
  type ScoreVenteInput,
} from './index'

const EMPTY: ScoreVenteInput = {}

describe('segmentFromScore', () => {
  it.each([
    [100, 'tres_chaud'],
    [80, 'tres_chaud'],
    [79, 'chaud'],
    [60, 'chaud'],
    [59, 'tiede'],
    [40, 'tiede'],
    [39, 'froid'],
    [0, 'froid'],
  ])('score=%i → segment=%s', (score, expected) => {
    expect(segmentFromScore(score)).toBe(expected)
  })
})

describe('probaFromSegment', () => {
  it('tres_chaud = 0.65', () => expect(probaFromSegment('tres_chaud')).toBe(0.65))
  it('chaud = 0.4', () => expect(probaFromSegment('chaud')).toBe(0.4))
  it('tiede = 0.2', () => expect(probaFromSegment('tiede')).toBe(0.2))
  it('froid = 0.05', () => expect(probaFromSegment('froid')).toBe(0.05))
})

describe('computeScoreVente — règles individuelles', () => {
  it('input vide → 0 pts, segment froid', () => {
    const r = computeScoreVente(EMPTY)
    expect(r.score).toBe(0)
    expect(r.segment).toBe('froid')
    expect(r.rules_breakdown).toEqual({})
  })

  it('R1 : DPE F → +10', () => {
    const r = computeScoreVente({ etiquette_dpe: 'F' })
    expect(r.rules_breakdown.r1_dpe_fg_base).toBe(10)
    expect(r.score).toBe(10)
  })

  it('R1 : DPE G → +10', () => {
    expect(computeScoreVente({ etiquette_dpe: 'G' }).score).toBe(10)
  })

  it('R1 : DPE D → 0 (pas FG)', () => {
    expect(computeScoreVente({ etiquette_dpe: 'D' }).score).toBe(0)
  })

  it('R2 : DPE ≥ 5 ans → +15', () => {
    const oldYear = new Date().getFullYear() - 6
    const r = computeScoreVente({ date_dpe: oldYear })
    expect(r.rules_breakdown.r2_dpe_ancien).toBe(15)
    expect(r.score).toBe(15)
  })

  it('R2 : DPE récent (3 ans) → 0', () => {
    const recentYear = new Date().getFullYear() - 3
    expect(computeScoreVente({ date_dpe: recentYear }).score).toBe(0)
  })

  it('R3 : mutation 24m → +25 (signal le plus fort)', () => {
    const r = computeScoreVente({ dvf_mutation_24m: true })
    expect(r.score).toBe(25)
  })

  it('R3 : pas de mutation → 0', () => {
    expect(computeScoreVente({ dvf_mutation_24m: false }).score).toBe(0)
  })

  it('R4 : propriétaire 70 ans → +20', () => {
    expect(computeScoreVente({ age_proprietaire_estime: 70 }).score).toBe(20)
  })

  it('R4 : propriétaire 64 → 0 (juste sous le seuil 65)', () => {
    expect(computeScoreVente({ age_proprietaire_estime: 64 }).score).toBe(0)
  })

  it('R5 : revenu IRIS 35k → +5', () => {
    expect(computeScoreVente({ filosofi_revenu_median: 35000 }).score).toBe(5)
  })

  it('R6 : surface 130m² → +10', () => {
    expect(computeScoreVente({ surface_habitable: 130 }).score).toBe(10)
  })

  it('R7 : construction 1990 → +5', () => {
    expect(computeScoreVente({ date_construction: 1990 }).score).toBe(5)
  })

  it('R8 : CEP 500 (passoire critique) → +10', () => {
    expect(computeScoreVente({ cep: 500 }).score).toBe(10)
  })

  it('R9 : chauffage collectif → -5 (pénalité)', () => {
    expect(computeScoreVente({ type_chauffage: 'collectif' }).score).toBe(0) // clamp à 0
    const r = computeScoreVente({
      type_chauffage: 'collectif',
      etiquette_dpe: 'F', // +10 pour annuler la pénalité
    })
    expect(r.rules_breakdown.r9_chauffage_collectif).toBe(-5)
    expect(r.score).toBe(5) // 10 - 5
  })

  it('R10 : maison individuelle → +5', () => {
    expect(computeScoreVente({ type_batiment: 'maison' }).score).toBe(5)
  })

  it('R10 : appartement → 0', () => {
    expect(computeScoreVente({ type_batiment: 'appartement' }).score).toBe(0)
  })

  it('R11 : zone active 60 mutations/12m → +15', () => {
    expect(computeScoreVente({ dvf_mutations_commune_12m: 60 }).score).toBe(15)
  })

  it('R12 : durée détention moy 7 ans → +10', () => {
    expect(computeScoreVente({ iris_duree_detention_moy: 7 }).score).toBe(10)
  })

  it('R13 : département 29 (Bretagne) → +5', () => {
    expect(computeScoreVente({ departement: '29' }).score).toBe(5)
  })

  it('R13 : département 75 (hors Bretagne) → 0', () => {
    expect(computeScoreVente({ departement: '75' }).score).toBe(0)
  })
})

describe('computeScoreVente — scénarios composites', () => {
  it('cas tres_chaud : senior + mutation 24m + DPE F ancien + maison', () => {
    const r = computeScoreVente({
      etiquette_dpe: 'F',
      date_dpe: new Date().getFullYear() - 8,
      dvf_mutation_24m: true,
      age_proprietaire_estime: 72,
      type_batiment: 'maison',
      departement: '29',
    })
    // 10 + 15 + 25 + 20 + 5 + 5 = 80 → tres_chaud
    expect(r.score).toBe(80)
    expect(r.segment).toBe('tres_chaud')
    expect(r.proba_6m).toBe(0.65)
  })

  it('cas chaud : senior + DPE G + zone active', () => {
    const r = computeScoreVente({
      etiquette_dpe: 'G',
      age_proprietaire_estime: 68,
      dvf_mutations_commune_12m: 80,
      type_batiment: 'maison',
      departement: '35',
    })
    // 10 + 20 + 15 + 5 + 5 = 55 → tiede (en dessous de 60)
    expect(r.score).toBe(55)
    expect(r.segment).toBe('tiede')
  })

  it('cas froid : juste DPE F (filtre seul, signaux faibles)', () => {
    const r = computeScoreVente({ etiquette_dpe: 'F' })
    expect(r.score).toBe(10)
    expect(r.segment).toBe('froid')
  })

  it('score plafonné à 100 même si toutes règles cumulées dépassent', () => {
    const allMax: ScoreVenteInput = {
      etiquette_dpe: 'F',
      date_dpe: 2010,
      dvf_mutation_24m: true,
      age_proprietaire_estime: 75,
      filosofi_revenu_median: 40000,
      surface_habitable: 150,
      date_construction: 1995,
      cep: 500,
      type_chauffage: 'individuel',
      type_batiment: 'maison',
      dvf_mutations_commune_12m: 100,
      iris_duree_detention_moy: 6,
      departement: '29',
    }
    const r = computeScoreVente(allMax)
    // 10+15+25+20+5+10+5+10+5+15+10+5 = 135, clamped à 100
    expect(r.score).toBe(100)
    expect(r.segment).toBe('tres_chaud')
  })

  it('score plancher 0 (pas de score négatif)', () => {
    expect(computeScoreVente({ type_chauffage: 'collectif' }).score).toBe(0)
  })

  it('rules_breakdown ne contient que les règles déclenchées', () => {
    const r = computeScoreVente({ etiquette_dpe: 'F', departement: '29' })
    const keys = Object.keys(r.rules_breakdown)
    expect(keys).toHaveLength(2)
    expect(keys).toContain('r1_dpe_fg_base')
    expect(keys).toContain('r13_bretagne_bonus')
  })

  it('algo_version est figée à v1.0', () => {
    expect(computeScoreVente(EMPTY).algo_version).toBe('v1.0')
  })
})

describe('SCORE_VENTE_RULES_DOC', () => {
  it('contient exactement 13 règles', () => {
    expect(SCORE_VENTE_RULES_DOC).toHaveLength(13)
  })

  it('chaque règle a id + label + max_points', () => {
    for (const r of SCORE_VENTE_RULES_DOC) {
      expect(r.id).toMatch(/^r\d+_/)
      expect(r.label.length).toBeGreaterThan(5)
      expect(typeof r.max_points).toBe('number')
    }
  })
})
