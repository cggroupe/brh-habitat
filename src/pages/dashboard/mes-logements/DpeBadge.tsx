import type { DpeRating } from '@/types/database'

export const DPE_BADGE_COLORS: Record<DpeRating, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-lime-100 text-lime-800',
  D: 'bg-yellow-100 text-yellow-800',
  E: 'bg-orange-100 text-orange-800',
  F: 'bg-red-100 text-red-700',
  G: 'bg-red-200 text-red-900',
}

interface DpeBadgeProps {
  rating: DpeRating | null
}

export function DpeBadge({ rating }: DpeBadgeProps) {
  if (!rating) return <span className="text-xs font-body text-text-light">—</span>
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-display font-bold ${DPE_BADGE_COLORS[rating]}`}>
      {rating}
    </span>
  )
}
