import type { DpeRating } from '@/types/database'
import { DPE_BADGE_COLORS } from '@/data/constants'

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
