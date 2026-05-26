import { formatNumber } from '../../lib/format'

interface PaginationInfoProps {
  shown: number
  total: number
  /** Texte précisant le critère de tri/troncation (ex: "triées par score V2"). */
  sortedBy?: string
  /** Label de l'élément (ex: "adresses", "DPE", "dirigeants"). */
  itemLabel?: string
}

/**
 * Indicateur "X affichées sur N" — pattern Data-B pour les listes paginées.
 *
 * Affiche uniquement si la liste est tronquée (shown < total).
 */
export default function PaginationInfo({
  shown,
  total,
  sortedBy,
  itemLabel = 'éléments',
}: PaginationInfoProps) {
  if (shown >= total) return null
  return (
    <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
      <span className="font-medium">{formatNumber(shown)}</span>{' '}
      {itemLabel} affichés sur{' '}
      <span className="font-medium">{formatNumber(total)}</span>
      {sortedBy && <> — {sortedBy}</>}
    </div>
  )
}
