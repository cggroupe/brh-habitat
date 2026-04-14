import { Home, MapPin, Ruler, CalendarDays } from 'lucide-react'
import { DpeBadge } from './DpeBadge'
import type { BrhHomeRow } from '@/types/database'

interface HomeCardProps {
  home: BrhHomeRow
  onClick: () => void
}

const typeLabel: Record<string, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  immeuble: 'Immeuble',
  commerce: 'Commerce',
  autre: 'Autre',
}

export function HomeCard({ home, onClick }: HomeCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Home size={18} />
        </div>
        <DpeBadge rating={home.dpe_rating} />
      </div>

      <h3 className="font-display text-base text-text-primary leading-tight mb-1 group-hover:text-primary transition-colors">
        {home.address}
      </h3>

      <div className="flex items-center gap-1 text-xs font-body text-text-light mb-4">
        <MapPin size={11} />
        {home.postal_code} {home.city}
      </div>

      <div className="flex items-center gap-4 text-xs font-body text-text-secondary">
        <span className="flex items-center gap-1">
          <Ruler size={11} />
          {home.surface} m²
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={11} />
          {home.year_built}
        </span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px]">
          {typeLabel[home.property_type] ?? home.property_type}
        </span>
      </div>
    </button>
  )
}
