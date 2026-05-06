/**
 * Phase 18.7 — Carte Leaflet des chantiers ouverts.
 *
 * Réutilise le pattern existant (ProTerrain, ProProspectsCarte, AgenceScoreVente).
 * Centre par défaut Bretagne (Pontivy ~ centre géographique régional).
 */
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import type { ChantierOffer } from '@/api/reseau-chantiers'

interface ChantiersMapProps {
  chantiers: ChantierOffer[]
  /** Centre + zoom par défaut. */
  center?: [number, number]
  zoom?: number
  height?: string | number
}

const BRETAGNE_CENTER: [number, number] = [48.0, -3.0]

export default function ChantiersMap({
  chantiers,
  center = BRETAGNE_CENTER,
  zoom = 8,
  height = 480,
}: ChantiersMapProps) {
  const positioned = chantiers.filter((c) => c.lat !== null && c.lng !== null)

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positioned.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat as number, c.lng as number]}
            radius={9}
            pathOptions={{
              color: '#0891b2',
              fillColor: '#06b6d4',
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[180px]">
                <p className="font-semibold text-slate-800 leading-tight">{c.title}</p>
                <p className="text-slate-500">
                  {c.commune}
                  {c.code_postal ? ` · ${c.code_postal}` : ''}
                </p>
                {c.metiers_recherches.length > 0 && (
                  <p className="text-cyan-700">
                    {c.metiers_recherches.slice(0, 3).map((m) => m.replace(/_/g, ' ')).join(' · ')}
                  </p>
                )}
                {c.budget_visible && c.budget_cents && (
                  <p className="font-semibold text-slate-700">
                    {(c.budget_cents / 100).toLocaleString('fr-FR')} € HT
                  </p>
                )}
                <Link
                  to={`/reseau/chantiers/${c.id}`}
                  className="block mt-1 text-cyan-700 hover:text-cyan-800 font-semibold"
                >
                  Voir l'offre →
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {positioned.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-white/90 px-4 py-2 rounded-lg text-sm text-slate-500 shadow">
            Aucun chantier géolocalisé
          </p>
        </div>
      )}
    </div>
  )
}
