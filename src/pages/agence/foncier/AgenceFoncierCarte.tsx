/**
 * Phase 19 Sprint A — Carte cadastre agence `/agence/foncier/carte`.
 *
 * Centre Bretagne par défaut (Pontivy). 3 features :
 *   1. Barre de recherche : adresse (BAN autocomplete) ou réf cadastrale
 *   2. Carte Leaflet + WMS cadastre IGN superposé
 *   3. Au clic carte : fetch parcelle via EF cadastre-fetch + popup détail + bouton favoris
 */
import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, WMSTileLayer, Polygon, Popup, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map as MapIcon, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import ParcelleSearchBar from '@/components/foncier/ParcelleSearchBar'
import ParcelleDetailCard from '@/components/foncier/ParcelleDetailCard'
import CommuneSociodemoCard from '@/components/foncier/CommuneSociodemoCard'
import { useFetchParcelle } from '@/hooks/queries/foncier-parcelles'
import type { FoncierParcelle, ParcelleGeometry } from '@/api/foncier-parcelles'

const BRETAGNE_CENTER: [number, number] = [48.0, -3.0]

// Fix défaut Leaflet markers (problème classique avec bundlers)
const defaultIcon = L.icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#10b981"/><circle cx="12" cy="12" r="5" fill="white"/></svg>',
    ),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
})

/** Convertit une géométrie GeoJSON Polygon/MultiPolygon en LatLngTuple[] pour react-leaflet. */
function geometryToLeafletPolygons(geom: ParcelleGeometry): [number, number][][] {
  if (geom.type === 'Polygon') {
    const ring = (geom.coordinates as number[][][])[0] ?? []
    return [ring.map(([lng, lat]) => [lat, lng] as [number, number])]
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as number[][][][]).map((poly) =>
      (poly[0] ?? []).map(([lng, lat]) => [lat, lng] as [number, number]),
    )
  }
  return []
}

interface MapClickHandlerProps {
  onClick: (latlng: { lat: number; lng: number }) => void
}

function MapClickHandler({ onClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function AgenceFoncierCarte() {
  const fetchParcelle = useFetchParcelle()
  const [selectedParcelles, setSelectedParcelles] = useState<FoncierParcelle[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>(BRETAGNE_CENTER)
  const [mapZoom, setMapZoom] = useState(8)
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; label: string } | null>(
    null,
  )

  function handleAddressSelect(point: { lat: number; lng: number; label: string }) {
    setSearchMarker(point)
    setMapCenter([point.lat, point.lng])
    setMapZoom(18)
    // Auto-fetch parcelle au point sélectionné
    fetchParcelle.mutate(
      { lat: point.lat, lng: point.lng },
      {
        onSuccess: (res) => {
          if (res.parcelles.length > 0) {
            setSelectedParcelles(res.parcelles)
          }
        },
      },
    )
  }

  function handleSearchByRef(ref: {
    code_insee: string
    section: string
    numero: string
    prefixe?: string
  }) {
    fetchParcelle.mutate(ref, {
      onSuccess: (res) => {
        if (res.parcelles.length > 0) {
          setSelectedParcelles(res.parcelles)
          const p = res.parcelles[0]
          if (p.centroid_lat !== null && p.centroid_lng !== null) {
            setMapCenter([p.centroid_lat, p.centroid_lng])
            setMapZoom(18)
          }
        }
      },
    })
  }

  function handleMapClick(latlng: { lat: number; lng: number }) {
    if (mapZoom < 17) return // évite les clics au zoom trop large
    fetchParcelle.mutate(latlng, {
      onSuccess: (res) => {
        if (res.parcelles.length > 0) {
          setSelectedParcelles(res.parcelles)
        }
      },
    })
  }

  const polygons = useMemo(() => {
    return selectedParcelles.map((p) => ({
      idu: p.idu,
      parcelle: p,
      rings: geometryToLeafletPolygons(p.geometry),
    }))
  }, [selectedParcelles])

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
            <MapIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display">Carte cadastre Foncier Pro</h1>
            <p className="text-sm text-slate-500">
              Bretagne · 22 / 29 / 35 / 56 / 44 · Cadastre IGN + parcelles
            </p>
          </div>
        </div>
        <Link
          to="/agence/foncier/favoris"
          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
        >
          ⭐ Mes favoris →
        </Link>
      </div>

      <ParcelleSearchBar onSelectAddress={handleAddressSelect} onSearchByRef={handleSearchByRef} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carte */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative" style={{ height: 600 }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Surcouche cadastre IGN (WMS gratuit) */}
            <WMSTileLayer
              url="https://data.geopf.fr/wms-r/wms"
              params={{
                layers: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
                format: 'image/png',
                transparent: true,
                version: '1.3.0',
              }}
              opacity={0.6}
              attribution='Cadastre &copy; <a href="https://www.geoportail.gouv.fr/">IGN</a>'
            />

            <MapClickHandler onClick={handleMapClick} />

            {searchMarker && (
              <Marker position={[searchMarker.lat, searchMarker.lng]} icon={defaultIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">Adresse recherchée</p>
                    <p className="text-slate-600">{searchMarker.label}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {polygons.map(({ idu, parcelle, rings }) =>
              rings.map((ring, i) => (
                <Polygon
                  key={`${idu}-${i}`}
                  positions={ring}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#34d399',
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <ParcelleDetailCard parcelle={parcelle} compact />
                  </Popup>
                </Polygon>
              )),
            )}
          </MapContainer>

          {fetchParcelle.isPending && (
            <div className="absolute top-3 right-3 bg-white rounded-lg shadow-md px-3 py-1.5 text-xs text-slate-700 inline-flex items-center gap-1.5 z-[1000]">
              <Loader2 size={12} className="animate-spin" />
              Chargement parcelle…
            </div>
          )}

          {mapZoom < 17 && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 rounded-lg shadow-md px-3 py-2 text-xs text-slate-600 z-[1000] pointer-events-none">
              💡 Zoomez (≥ niveau 17) pour cliquer sur une parcelle, ou utilisez la barre de recherche.
            </div>
          )}
        </div>

        {/* Liste latérale parcelles sélectionnées */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Parcelles sélectionnées
            {selectedParcelles.length > 0 && (
              <span className="ml-1.5 text-xs text-slate-400">({selectedParcelles.length})</span>
            )}
          </h2>

          {fetchParcelle.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              Erreur : {String(fetchParcelle.error)}
            </div>
          )}

          {selectedParcelles.length === 0 && !fetchParcelle.isPending && (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-4 text-center text-xs text-slate-500">
              Cliquez sur une parcelle (zoom ≥ 17) ou utilisez la recherche pour afficher les détails ici.
            </div>
          )}

          {selectedParcelles.map((p) => (
            <ParcelleDetailCard key={p.idu} parcelle={p} />
          ))}

          {/* Sprint C — sociodémo de la commune de la 1re parcelle sélectionnée */}
          {selectedParcelles[0]?.code_insee && (
            <CommuneSociodemoCard codeInsee={selectedParcelles[0].code_insee} compact />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-emerald-50/40 border border-emerald-200/60 p-3 text-xs text-emerald-900">
        <strong>Sprint A en place</strong> · Cadastre IGN + favoris. À venir : SCI enrichi (B), DVF + sociodémo (C), PLU IA + Vision toiture (D), BODACC (E), DPE markers colorés (F).
      </div>
    </div>
  )
}
