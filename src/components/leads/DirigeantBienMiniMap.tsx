/**
 * DirigeantBienMiniMap — Phase 6B : mini-carte des biens détenus par un dirigeant SCI.
 *
 * Affiche les DPE F/G détenus sur une carte Leaflet compacte (300px de haut),
 * intégrée dans la fiche dirigeant. Marker coloré par classe DPE (F/G).
 *
 * Source : Dirigeant360.dpe_detenus[].lat/lng (RPC brh_dirigeant_360 v2,
 * migration 20260521180000).
 */
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Map as MapIcon } from 'lucide-react'

interface Dpe {
  dpe_id: number
  adresse: string | null
  code_postal: string | null
  commune: string | null
  etiquette_dpe: string | null
  surface_habitable: number | null
  lat: number | null
  lng: number | null
}

interface Props {
  dpeDetenus: Dpe[]
}

const DPE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#22c55e',
  C: '#84cc16',
  D: '#eab308',
  E: '#f97316',
  F: '#b45309',
  G: '#b91c1c',
}

function FitBoundsOnMount({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else {
      const bounds = points.reduce(
        (acc, [lat, lng]) => {
          acc.minLat = Math.min(acc.minLat, lat)
          acc.maxLat = Math.max(acc.maxLat, lat)
          acc.minLng = Math.min(acc.minLng, lng)
          acc.maxLng = Math.max(acc.maxLng, lng)
          return acc
        },
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 },
      )
      map.fitBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [30, 30], maxZoom: 14 },
      )
    }
    // Force invalidate sur un délai court (la fiche flex peut avoir hauteur 0 au mount)
    const t = [50, 300, 800].map((d) => setTimeout(() => map.invalidateSize(), d))
    return () => t.forEach(clearTimeout)
  }, [map, points])
  return null
}

export default function DirigeantBienMiniMap({ dpeDetenus }: Props) {
  const withCoords = useMemo(
    () => dpeDetenus.filter((d) => d.lat != null && d.lng != null),
    [dpeDetenus],
  )
  const points = useMemo<Array<[number, number]>>(
    () => withCoords.map((d) => [d.lat as number, d.lng as number]),
    [withCoords],
  )

  if (withCoords.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
          <MapIcon className="h-4 w-4 text-emerald-700" />
          Carte des biens ({withCoords.length} géolocalisé{withCoords.length > 1 ? 's' : ''}
          {withCoords.length < dpeDetenus.length && ` / ${dpeDetenus.length} total`})
        </h2>
        <span className="text-[10px] text-stone-400">CartoDB Voyager · OSM</span>
      </div>
      <div className="h-[300px] w-full overflow-hidden rounded-md border border-stone-200">
        <MapContainer
          center={[points[0][0], points[0][1]]}
          zoom={13}
          preferCanvas
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <FitBoundsOnMount points={points} />
          {withCoords.map((d) => {
            const color = DPE_COLORS[d.etiquette_dpe ?? 'G'] ?? '#b91c1c'
            return (
              <CircleMarker
                key={d.dpe_id}
                center={[d.lat as number, d.lng as number]}
                radius={8}
                pathOptions={{
                  color: '#fff',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <div className="text-xs">
                    <strong>{d.etiquette_dpe ?? '?'}</strong> · {d.surface_habitable ?? '?'} m²
                    <br />
                    {d.adresse}
                    <br />
                    {d.code_postal} {d.commune}
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </section>
  )
}
