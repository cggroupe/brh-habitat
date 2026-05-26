import type { ReactNode } from 'react'
import { Building2, MapPin, User } from 'lucide-react'
import TypedBadge from '../../ui/TypedBadge'
import type { NavEntityType } from '../../../stores/navStackStore'

export interface HeaderKpi {
  label: string
  value: ReactNode
  onClick?: () => void
}

interface StickyEntityHeaderProps {
  type: NavEntityType
  title: string
  sublabel?: ReactNode
  entityClassBadge?: { label: string; color?: 'green' | 'gray' | 'blue' | 'purple' }
  badges?: ReactNode
  kpis?: HeaderKpi[]
  actions?: ReactNode
}

const ENTITY_ICON: Record<NavEntityType, ReactNode> = {
  adresse: <MapPin className="h-5 w-5 text-[#00600a]" />,
  entreprise: <Building2 className="h-5 w-5 text-[#00600a]" />,
  personne: <User className="h-5 w-5 text-[#00600a]" />,
  dirigeant: <User className="h-5 w-5 text-[#00600a]" />,
}

/**
 * Header entité sticky — palette Editorial Habitat (vert sombre #00600a + neutres).
 */
export default function StickyEntityHeader({
  type,
  title,
  sublabel,
  entityClassBadge,
  badges,
  kpis,
  actions,
}: StickyEntityHeaderProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            {ENTITY_ICON[type]}
            <span className="uppercase tracking-wider">{type}</span>
            {entityClassBadge && (
              <TypedBadge
                variant="entity-class"
                color={entityClassBadge.color}
                label={entityClassBadge.label}
              />
            )}
          </div>
          <h1 className="mt-1 truncate font-display text-xl font-semibold text-stone-900">
            {title}
          </h1>
          {sublabel && (
            <div className="mt-0.5 truncate text-sm text-stone-600">{sublabel}</div>
          )}
          {badges && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {kpis && kpis.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-stone-100 px-6 py-2">
          {kpis.map((k, i) => (
            <KpiPill key={`${k.label}-${i}`} kpi={k} />
          ))}
        </div>
      )}
    </div>
  )
}

function KpiPill({ kpi }: { kpi: HeaderKpi }) {
  const cls =
    'flex shrink-0 items-baseline gap-1.5 rounded-full bg-stone-50 px-3 py-1 text-xs ring-1 ring-stone-200'
  const inner = (
    <>
      <span className="font-semibold text-stone-900">{kpi.value}</span>
      <span className="text-stone-500">{kpi.label}</span>
    </>
  )
  if (kpi.onClick) {
    return (
      <button type="button" onClick={kpi.onClick} className={`${cls} hover:bg-stone-100`}>
        {inner}
      </button>
    )
  }
  return <div className={cls}>{inner}</div>
}
