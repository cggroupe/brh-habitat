/**
 * UnifiedLeadsMap — vue carte lazy-loaded.
 *
 * Optimisations anti-bug Leaflet :
 *   - preferCanvas:true (rendering canvas, 10x plus performant que SVG sur 1000+ pins)
 *   - MapInvalidator hook : invalidateSize au mount (sinon hauteur 0 dans flex)
 *   - Pas de heatmap simultanée (cause de bugs précédents)
 *   - Markers simples (pas de cluster pour MVP — sera ajouté si volume > 500)
 */
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
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

function dpeColor(classe: string | null | undefined): string {
  switch (classe) {
    case 'A': return '#16a34a'
    case 'B': return '#65a30d'
    case 'C': return '#ca8a04'
    case 'D': return '#ea580c'
    case 'E': return '#dc2626'
    case 'F': return '#991b1b'
    case 'G': return '#7f1d1d'
    default: return '#64748b'
  }
}

export default function UnifiedLeadsMap({ rows, profile, onSelect }: Props) {
  const withCoords = rows.filter(
    (r): r is LeadRow & { latitude: number; longitude: number } =>
      r.latitude != null && r.longitude != null,
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        preferCanvas={true} // anti-bug : canvas plus performant que SVG
        scrollWheelZoom
      >
        <MapInvalidator />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap'
        />

        {withCoords.map((row) => {
          const isPM = !!row.owner_siren
          return (
            <CircleMarker
              key={row.id}
              center={[row.latitude, row.longitude]}
              radius={6}
              pathOptions={{
                color: dpeColor(row.etiquette_dpe),
                fillColor: dpeColor(row.etiquette_dpe),
                fillOpacity: 0.7,
                weight: 1,
              }}
              eventHandlers={{
                click: () => onSelect(row),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{row.adresse}</div>
                  <div className="text-slate-600">{row.code_postal} {row.commune}</div>
                  <div className="mt-1">
                    DPE <span className="font-bold">{row.etiquette_dpe}</span>
                    {' · '}
                    {row.surface}m²
                  </div>
                  <div className="text-slate-700">
                    {displayName(profile, row.owner_name ?? null, isPM)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(row)
                    }}
                    className="mt-2 rounded bg-slate-900 px-2 py-0.5 text-white"
                  >
                    Détails →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Footer info */}
      <div className="absolute bottom-2 right-2 z-[400] rounded-md bg-white/95 px-3 py-1 text-xs text-slate-700 shadow-md">
        {withCoords.length} pin{withCoords.length > 1 ? 's' : ''} affiché{withCoords.length > 1 ? 's' : ''}
        {rows.length > withCoords.length && (
          <span className="text-slate-500"> · {rows.length - withCoords.length} sans coords</span>
        )}
      </div>
    </div>
  )
}
