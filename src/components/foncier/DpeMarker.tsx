/**
 * Phase 19 Sprint F — Marker DPE coloré + lettre A-G pour Leaflet.
 *
 * Couleurs ADEME officielles 2024 (DPE rénové Loi Climat) — voir lib/foncier/dpe-colors.ts.
 */
import { Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { DPE_COLORS, getDpeIcon, type DpeRating } from '@/lib/foncier/dpe-colors'

export type { DpeRating }

interface DpeMarkerProps {
  lat: number
  lng: number
  rating: DpeRating
  prospectId?: string
  adresse?: string
  surface?: number | null
  onClick?: () => void
  children?: React.ReactNode
}

export default function DpeMarker({
  lat,
  lng,
  rating,
  prospectId,
  adresse,
  surface,
  onClick,
  children,
}: DpeMarkerProps) {
  const icon = getDpeIcon(rating)

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={onClick ? { click: () => onClick() } : undefined}
    >
      {children ?? (
        <DpeMarkerDefaultPopup
          rating={rating}
          adresse={adresse}
          surface={surface}
          prospectId={prospectId}
        />
      )}
    </Marker>
  )
}

interface DefaultPopupProps {
  rating: DpeRating
  adresse?: string
  surface?: number | null
  prospectId?: string
}

function DpeMarkerDefaultPopup({ rating, adresse, surface, prospectId }: DefaultPopupProps) {
  const colors = DPE_COLORS[rating]
  return (
    <Popup>
      <div className="text-xs space-y-1 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: colors.bg, color: colors.text }}
          >
            {rating}
          </span>
          <span className="text-slate-700 font-semibold">DPE {rating}</span>
        </div>
        {adresse && <p className="text-slate-600">{adresse}</p>}
        {surface && <p className="text-slate-500">Surface : {surface} m²</p>}
        {prospectId && (
          <Link
            to={`/pro/prospects/${prospectId}`}
            className="block mt-1 text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            Voir le prospect →
          </Link>
        )}
      </div>
    </Popup>
  )
}
