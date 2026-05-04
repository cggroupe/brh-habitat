/**
 * Phase 13.5 — Carte chaleur Bretagne des prospects DPE F/G.
 *
 * Visualisation Leaflet :
 * - Heatmap pondérée par score_v2 (rouge = ultra-chaud)
 * - Markers cliquables pour les segments ultra_chaud / mpr_bleu_prio
 * - Popup avec lien direct → générer courrier
 * - Filtres : segment, dépt, score min
 *
 * Bretagne centrée : 48.2°N / -3.0°W (Pontivy approx).
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { Loader, MapPin, Filter, Sparkles, ExternalLink, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import {
  useProspectsBretagneMap,
  useProspectsBretagneCounts,
} from '@/hooks/queries/prospects-bretagne'
import { HeatmapLayer } from '@/components/map/HeatmapLayer'
import { GenerateLetterModal } from '@/components/letters/GenerateLetterModal'
import { prospectsBretagneApi, type ProspectBretagneRow } from '@/api/prospects-bretagne'
import type { ScoreV2Segment } from '@/lib/dpe-engine/external/types'

const BZH_CENTER: [number, number] = [48.2, -3.0]
const BZH_ZOOM = 8

const SEGMENT_LABELS: Record<ScoreV2Segment, string> = {
  ultra_chaud: 'Ultra-chaud',
  mpr_bleu_prio: 'MPR Bleu prio',
  premium: 'Premium',
  standard: 'Standard',
  cold: 'Froid',
}

const SEGMENT_COLORS: Record<ScoreV2Segment, string> = {
  ultra_chaud: '#dc2626',
  mpr_bleu_prio: '#2563eb',
  premium: '#9333ea',
  standard: '#ca8a04',
  cold: '#6b7280',
}

const SEGMENT_RADIUS: Record<ScoreV2Segment, number> = {
  ultra_chaud: 8,
  mpr_bleu_prio: 6,
  premium: 5,
  standard: 4,
  cold: 3,
}

function FitBretagne({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap()
  // Re-center sur la moyenne des points si on a un sous-ensemble (ex: 1 dépt)
  if (points.length > 0 && points.length < 1000) {
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [30, 30], maxZoom: 11 },
    )
  }
  return null
}

export default function ProProspectsCarte() {
  const [segment, setSegment] = useState<ScoreV2Segment | ''>('')
  const [dept, setDept] = useState<'22' | '29' | '35' | '56' | ''>('')
  const [scoreMin, setScoreMin] = useState<number>(20)
  const [showFilters, setShowFilters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [letterFor, setLetterFor] = useState<ProspectBretagneRow | null>(null)
  const [openingDetail, setOpeningDetail] = useState<number | null>(null)

  const filters = {
    segment: segment || undefined,
    departement: dept || undefined,
    scoreMin,
    limit: 5000,
  }

  const { data: points = [], isLoading } = useProspectsBretagneMap(filters)
  const { data: counts } = useProspectsBretagneCounts({ departement: dept || undefined })

  // Heatmap : intensité normalisée par score / 100
  const heatPoints = useMemo(
    () =>
      points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        intensity: Math.max(0.1, (p.score ?? 0) / 100),
      })),
    [points],
  )

  // Markers : seulement les segments les plus chauds (perf — Leaflet rame >2k markers)
  const markerPoints = useMemo(
    () =>
      points.filter(
        (p) => p.segment === 'ultra_chaud' || p.segment === 'mpr_bleu_prio' || p.segment === 'premium',
      ).slice(0, 500),
    [points],
  )

  const handleOpenLetter = async (id: number) => {
    setOpeningDetail(id)
    try {
      const detail = await prospectsBretagneApi.detail(id)
      if (detail) setLetterFor(detail)
    } finally {
      setOpeningDetail(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-blue-700" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Carte chaleur prospects Bretagne</h1>
            <p className="text-xs text-gray-500">
              {points.length.toLocaleString('fr-FR')} points affichés (max 5000) — densité par score v2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pro/prospects-bretagne"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-3 w-3" /> Vue tableau
          </Link>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-3 w-3" /> Filtres
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {/* Sidebar filtres */}
        {showFilters && (
          <div className="absolute left-3 top-3 z-[1000] w-72 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <span className="text-xs font-semibold uppercase text-gray-700">Filtres</span>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-3 p-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Segment</span>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as typeof segment)}
                  className="w-full rounded-md border-gray-300 text-xs"
                >
                  <option value="">Tous</option>
                  <option value="ultra_chaud">Ultra-chaud (≥80)</option>
                  <option value="mpr_bleu_prio">MPR Bleu prio</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="cold">Froid</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Département</span>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value as typeof dept)}
                  className="w-full rounded-md border-gray-300 text-xs"
                >
                  <option value="">Toute la Bretagne</option>
                  <option value="22">22 — Côtes-d&apos;Armor</option>
                  <option value="29">29 — Finistère</option>
                  <option value="35">35 — Ille-et-Vilaine</option>
                  <option value="56">56 — Morbihan</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Score min : {scoreMin}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={scoreMin}
                  onChange={(e) => setScoreMin(Number(e.target.value))}
                  className="w-full"
                />
              </label>

              <div className="border-t border-gray-100 pt-3">
                <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Couches</span>
                <label className="mb-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs">Heatmap (densité)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs">Markers ultra-chauds (max 500)</span>
                </label>
              </div>

              {counts && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Résumé</span>
                  {(['ultra_chaud', 'mpr_bleu_prio', 'premium', 'standard', 'cold'] as const).map((seg) => (
                    <div key={seg} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: SEGMENT_COLORS[seg] }}
                        />
                        <span className="text-gray-700">{SEGMENT_LABELS[seg]}</span>
                      </div>
                      <span className="font-mono tabular-nums text-gray-600">
                        {(counts[seg] ?? 0).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Légende heatmap */}
        <div className="absolute bottom-6 right-3 z-[1000] rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-1.5 text-xs font-semibold uppercase text-gray-700">Densité score v2</div>
          <div className="flex h-3 w-44 rounded-sm" style={{
            background: 'linear-gradient(90deg, #3b82f6 0%, #fbbf24 30%, #f97316 60%, #dc2626 100%)',
          }} />
          <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            <span>Bas</span>
            <span>Haut</span>
          </div>
        </div>

        {/* Carte */}
        <MapContainer
          center={BZH_CENTER}
          zoom={BZH_ZOOM}
          minZoom={7}
          maxZoom={17}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {showHeatmap && heatPoints.length > 0 && (
            <HeatmapLayer points={heatPoints} radius={20} blur={15} maxZoom={14} />
          )}

          {showMarkers &&
            markerPoints.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={p.segment ? SEGMENT_RADIUS[p.segment] : 4}
                pathOptions={{
                  color: p.segment ? SEGMENT_COLORS[p.segment] : '#6b7280',
                  weight: 1.5,
                  fillColor: p.segment ? SEGMENT_COLORS[p.segment] : '#6b7280',
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-gray-900">
                      Prospect #{p.id} — {p.commune}
                    </div>
                    <div className="text-gray-700">
                      DPE <span className="font-bold">{p.etiquette ?? '?'}</span> · Score{' '}
                      <span className="font-bold">{p.score ?? '?'}</span> ·{' '}
                      <span style={{ color: p.segment ? SEGMENT_COLORS[p.segment] : '#6b7280' }}>
                        {p.segment ? SEGMENT_LABELS[p.segment] : 'inconnu'}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenLetter(p.id)}
                        disabled={openingDetail === p.id}
                        className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-[11px] font-medium text-purple-900 hover:bg-purple-200 disabled:opacity-50"
                      >
                        {openingDetail === p.id ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Courrier IA
                      </button>
                      <Link
                        to={`/pro/prospects/${p.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900"
                      >
                        Détail <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {dept && <FitBretagne points={points} />}
        </MapContainer>

        {isLoading && (
          <div className="absolute right-3 top-3 z-[999] flex items-center gap-2 rounded-md bg-white/95 px-3 py-1.5 text-xs shadow">
            <Loader className="h-3 w-3 animate-spin" /> Chargement…
          </div>
        )}
      </div>

      {/* Modal courrier IA */}
      {letterFor && (
        <GenerateLetterModal prospect={letterFor} onClose={() => setLetterFor(null)} />
      )}
    </div>
  )
}
