/**
 * UnifiedLeadsMap — vue carte refonte 18/05.
 *
 * Améliorations vs V1 du 17/05 :
 *   - Tile layer CartoDB Voyager (lisible, moderne, gratuit, sans clé)
 *   - Markers DivIcon avec couleur DPE + halo score
 *   - FitBounds automatique sur les markers présents
 *   - Légende DPE flottante
 *   - Compteur + état vide cohérent
 *
 * Optimisations Leaflet :
 *   - preferCanvas:true (rendering canvas, 10x plus performant)
 *   - MapInvalidator hook : invalidateSize au mount (sinon hauteur 0 dans flex)
 */
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LeadRow } from '@/types/lead'
import { displayName, type LeadProfile } from '@/lib/rgpd/lead-visibility'

type Props = {
  rows: LeadRow[]
  profile: LeadProfile
  onSelect: (r: LeadRow) => void
}

// Centre Bretagne par défaut
const DEFAULT_CENTER: [number, number] = [48.2, -2.8]
const DEFAULT_ZOOM = 8

function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 0)
    const t2 = setTimeout(() => map.invalidateSize(), 200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  return null
}

function FitBoundsToPins({ rows }: { rows: Array<{ latitude: number; longitude: number }> }) {
  const map = useMap()
  useEffect(() => {
    if (rows.length === 0) return
    const bounds = L.latLngBounds(rows.map((r) => [r.latitude, r.longitude]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [map, rows])
  return null
}

function dpeColor(classe: string | null | undefined): string {
  switch (classe) {
    case 'A':
      return '#16a34a'
    case 'B':
      return '#65a30d'
    case 'C':
      return '#ca8a04'
    case 'D':
      return '#ea580c'
    case 'E':
      return '#dc2626'
    case 'F':
      return '#991b1b'
    case 'G':
      return '#7f1d1d'
    default:
      return '#64748b'
  }
}

function dpeIcon(classe: string | null | undefined, score: number | null | undefined): L.DivIcon {
  const color = dpeColor(classe)
  const isHot = (score ?? 0) >= 80
  const size = isHot ? 32 : 26
  const ring = isHot
    ? '<span class="absolute inset-0 rounded-full bg-orange-400 opacity-60 animate-ping"></span>'
    : ''
  const html = `
    <div class="relative" style="width:${size}px;height:${size}px;">
      ${ring}
      <div style="
        position:relative; display:flex; align-items:center; justify-content:center;
        width:${size}px; height:${size}px;
        border-radius:9999px;
        background:${color};
        color:white;
        font:600 11px/1 system-ui, sans-serif;
        border:2px solid white;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
      ">${classe ?? '?'}</div>
    </div>`
  return L.divIcon({
    html,
    className: 'brh-dpe-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function UnifiedLeadsMap({ rows, profile, onSelect }: Props) {
  const withCoords = useMemo(
    () =>
      rows.filter(
        (r): r is LeadRow & { latitude: number; longitude: number } =>
          r.latitude != null && r.longitude != null,
      ),
    [rows],
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        preferCanvas={false}
        scrollWheelZoom
        zoomControl
      >
        <MapInvalidator />
        <FitBoundsToPins rows={withCoords} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {withCoords.map((row) => {
          const isPM = !!row.owner_siren
          return (
            <Marker
              key={row.id}
              position={[row.latitude, row.longitude]}
              icon={dpeIcon(row.etiquette_dpe, row.score_v2)}
              eventHandlers={{ click: () => onSelect(row) }}
            >
              <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                <div className="text-xs">
                  <div className="font-semibold">{row.adresse}</div>
                  <div>
                    DPE <b>{row.etiquette_dpe ?? '?'}</b>
                    {row.score_v2 != null && <> · score {row.score_v2}</>}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{row.adresse}</div>
                  <div className="text-slate-600">
                    {row.code_postal} {row.commune}
                  </div>
                  <div className="mt-1">
                    DPE <span className="font-bold">{row.etiquette_dpe ?? '?'}</span>
                    {row.surface ? ` · ${row.surface}m²` : ''}
                    {row.score_v2 != null ? ` · score ${row.score_v2}` : ''}
                  </div>
                  <div className="text-slate-700">
                    {displayName(profile, row.owner_name ?? null, isPM)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(row)
                    }}
                    className="mt-2 rounded-md bg-slate-900 px-2 py-1 text-white"
                  >
                    Ouvrir la fiche →
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Légende DPE flottante */}
      <div className="absolute left-3 top-3 z-[400] rounded-lg border border-slate-200 bg-white/95 p-2.5 text-xs shadow-md backdrop-blur">
        <div className="mb-1.5 font-semibold text-slate-700">Classe DPE</div>
        <div className="flex flex-col gap-1">
          {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((c) => (
            <div key={c} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ background: dpeColor(c) }}
              />
              <span className="text-slate-700">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="absolute bottom-3 right-3 z-[400] rounded-md bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-md backdrop-blur">
        <span className="font-semibold">{withCoords.length}</span> pin{withCoords.length > 1 ? 's' : ''} affiché
        {withCoords.length > 1 ? 's' : ''}
        {rows.length > withCoords.length && (
          <span className="text-slate-500">
            {' '}
            · {rows.length - withCoords.length} sans coords
          </span>
        )}
      </div>

      {/* État vide */}
      {withCoords.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          <div className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 px-5 py-3 text-sm text-slate-600 shadow-lg backdrop-blur">
            Aucun lead géolocalisé dans la sélection actuelle. Élargissez les filtres.
          </div>
        </div>
      )}
    </div>
  )
}
