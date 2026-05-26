import type { ReactNode } from 'react'
import { Building2, MapPin, User } from 'lucide-react'
import TypedBadge from '../../ui/TypedBadge'
import type { NavEntityType } from '../../../stores/navStackStore'

export interface HeaderKpi {
  label: string
  value: ReactNode
  /** Click optionnel pour scroller vers un tab/section. */
  onClick?: () => void
}

interface StickyEntityHeaderProps {
  type: NavEntityType
  title: string
  /** Texte secondaire (ex: SIREN, code postal). */
  sublabel?: ReactNode
  /** Badge classification (ex: SCI patrimoniale, Opérateur réseau). */
  entityClassBadge?: { label: string; color?: 'green' | 'gray' | 'blue' | 'purple' }
  /** Badges secondaires (succession, décès, etc.). */
  badges?: ReactNode
  /** 2-4 KPIs affichés en ligne sur desktop. */
  kpis?: HeaderKpi[]
  /** Boutons action en haut à droite (Sauvegarder, Plus d'infos, etc.). */
  actions?: ReactNode
}

const ENTITY_ICON: Record<NavEntityType, ReactNode> = {
  adresse: <MapPin className="h-5 w-5 text-emerald-700" />,
  entreprise: <Building2 className="h-5 w-5 text-emerald-700" />,
  personne: <User className="h-5 w-5 text-emerald-700" />,
  dirigeant: <User className="h-5 w-5 text-emerald-700" />,
}

/**
 * Header entité sticky au scroll — pattern Data-B "l'entité courante reste sticky pendant tout le drill-down".
 *
 * Positionné `sticky top-0 z-40` au-dessus du contenu de la fiche.
 * Sur mobile, les KPIs passent en scroll horizontal (overflow-x-auto).
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
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
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
          <h1 className="mt-1 truncate font-display text-xl font-semibold text-slate-900">
            {title}
          </h1>
          {sublabel && (
            <div className="mt-0.5 truncate text-sm text-slate-600">{sublabel}</div>
          )}
          {badges && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {kpis && kpis.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-6 py-2">
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
    'flex shrink-0 items-baseline gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs ring-1 ring-slate-200'
  const inner = (
    <>
      <span className="font-semibold text-slate-900">{kpi.value}</span>
      <span className="text-slate-500">{kpi.label}</span>
    </>
  )
  if (kpi.onClick) {
    return (
      <button type="button" onClick={kpi.onClick} className={`${cls} hover:bg-emerald-50`}>
        {inner}
      </button>
    )
  }
  return <div className={cls}>{inner}</div>
}
