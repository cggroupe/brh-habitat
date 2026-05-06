/**
 * Phase 18.12 — Badge Pro Premium / Featured (affiché sur profils + chantiers).
 */
import { Sparkles, Star } from 'lucide-react'
import type { ReseauTier } from '@/api/reseau-subscriptions'

interface FeaturedBadgeProps {
  tier: ReseauTier
  size?: 'sm' | 'md'
}

export default function FeaturedBadge({ tier, size = 'sm' }: FeaturedBadgeProps) {
  if (tier === 'free') return null

  const sizeCls = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  const iconSize = size === 'sm' ? 10 : 12

  if (tier === 'premium') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wide bg-gradient-to-r from-cyan-500 to-sky-600 text-white ${sizeCls}`}
      >
        <Sparkles size={iconSize} />
        Premium
      </span>
    )
  }

  if (tier === 'featured') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-orange-600 text-white ${sizeCls}`}
      >
        <Star size={iconSize} fill="currentColor" />
        Featured
      </span>
    )
  }

  return null
}
