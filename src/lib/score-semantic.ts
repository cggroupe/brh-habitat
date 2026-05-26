/**
 * Mapping du score V2 numérique (0-100) et segment de qualification métier
 * vers une catégorie sémantique compréhensible — pattern Data-B "score = catégorie sémantique".
 *
 * Les segments BRH (cf wiki/score-vente-agences + score-v2.ts) :
 *   - ultra_chaud      : mutation DVF récente + DPE F/G + signal travaux fort
 *   - mpr_bleu_prio    : éligible MaPrimeRenov bleue (ménage modeste) + DPE F/G
 *   - standard         : passoire thermique sans signal externe fort
 *   - cold             : DPE non-prioritaire ou propriétaire utility
 */

export type ScoreSegment = 'ultra_chaud' | 'mpr_bleu_prio' | 'standard' | 'cold'

export interface ScoreSemantic {
  label: string
  color: 'green' | 'amber' | 'orange' | 'red' | 'gray'
  tooltip: string
}

export function mapScoreV2(
  score: number | null | undefined,
  segment: ScoreSegment | string | null | undefined,
): ScoreSemantic {
  const s = (segment ?? '').toLowerCase()

  if (s === 'ultra_chaud') {
    return {
      label: 'Ultra chaud',
      color: 'red',
      tooltip: `Score ${score ?? '?'}/100. Mutation DVF récente + DPE F/G + signal travaux fort.`,
    }
  }
  if (s === 'mpr_bleu_prio') {
    return {
      label: 'MPR bleu prioritaire',
      color: 'orange',
      tooltip: `Score ${score ?? '?'}/100. Ménage modeste éligible MaPrimeRenov bleue avec passoire thermique.`,
    }
  }
  if (s === 'standard') {
    return {
      label: 'Potentiel modéré',
      color: 'amber',
      tooltip: `Score ${score ?? '?'}/100. Passoire thermique (DPE F/G) sans signal externe renforçant.`,
    }
  }
  // cold ou inconnu
  return {
    label: 'Faible potentiel',
    color: 'gray',
    tooltip: `Score ${score ?? '?'}/100. Non prioritaire (DPE acceptable, propriétaire utility ou hors cible).`,
  }
}

/**
 * Mapping de la classe DPE A-G vers une couleur.
 */
export function mapDpeClass(dpe: string | null | undefined): {
  label: string
  color: 'green' | 'amber' | 'orange' | 'red' | 'gray'
} {
  if (!dpe) return { label: '—', color: 'gray' }
  const c = dpe.toUpperCase()
  switch (c) {
    case 'A':
    case 'B':
      return { label: c, color: 'green' }
    case 'C':
      return { label: c, color: 'green' }
    case 'D':
      return { label: c, color: 'amber' }
    case 'E':
      return { label: c, color: 'orange' }
    case 'F':
    case 'G':
      return { label: c, color: 'red' }
    default:
      return { label: c, color: 'gray' }
  }
}
