import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  value: ReactNode | string | number | null | undefined
  /** Affiche toujours la ligne même si value est null/empty (avec "—"). */
  showEmpty?: boolean
}

/**
 * Ligne d'attribut clé/valeur utilisée dans les fiches BRH.
 *
 * Par défaut masque la ligne si `value` est null/undefined/"".
 * Pass `showEmpty` pour afficher "—" à la place — indispensable pour le pattern
 * Data-B "squelette unique de carte propriétaire" où chaque zone doit toujours
 * apparaître même si vide.
 */
export default function DetailRow({ label, value, showEmpty }: DetailRowProps) {
  const isEmpty = value == null || value === ''
  if (isEmpty && !showEmpty) return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{isEmpty ? '—' : value}</span>
    </div>
  )
}
