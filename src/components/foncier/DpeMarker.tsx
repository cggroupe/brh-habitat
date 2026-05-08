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
  /** Phase 11.1 — score composite v2 (Filosofi + Enedis + Géorisques + ANAH + Sit@del2 + Recensement) */
  scoreV2?: number | null
  segmentV2?: 'ultra_chaud' | 'mpr_bleu_prio' | 'premium' | 'standard' | 'cold' | null
  onClick?: () => void
  children?: React.ReactNode
}

const SEGMENT_LABELS: Record<NonNullable<DpeMarkerProps['segmentV2']>, { label: string; cls: string }> = {
  ultra_chaud: { label: '🔥 Ultra-chaud', cls: 'bg-red-100 text-red-700' },
  mpr_bleu_prio: { label: '💙 MPR Bleu', cls: 'bg-blue-100 text-blue-700' },
  premium: { label: '✨ Premium', cls: 'bg-purple-100 text-purple-700' },
  standard: { label: 'Standard', cls: 'bg-amber-100 text-amber-700' },
  cold: { label: 'Cold', cls: 'bg-slate-100 text-slate-500' },
}

export default function DpeMarker({
  lat,
  lng,
  rating,
  prospectId,
  adresse,
  surface,
  scoreV2,
  segmentV2,
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
          scoreV2={scoreV2}
          segmentV2={segmentV2}
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
  scoreV2?: number | null
  segmentV2?: DpeMarkerProps['segmentV2']
  prospectId?: string
}

function DpeMarkerDefaultPopup({ rating, adresse, surface, scoreV2, segmentV2, prospectId }: DefaultPopupProps) {
  const colors = DPE_COLORS[rating]
  const seg = segmentV2 ? SEGMENT_LABELS[segmentV2] : null
  return (
    <Popup>
      <div className="text-xs space-y-1 min-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: colors.bg, color: colors.text }}
          >
            {rating}
          </span>
          <span className="text-slate-700 font-semibold">DPE {rating}</span>
          {scoreV2 != null && (
            <span className="ml-auto text-[10px] font-bold text-slate-700 tabular-nums">
              Score {scoreV2}/100
            </span>
          )}
        </div>
        {seg && (
          <div className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${seg.cls}`}>
            {seg.label}
          </div>
        )}
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
