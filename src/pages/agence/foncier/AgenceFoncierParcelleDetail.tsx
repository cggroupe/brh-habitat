/**
 * Phase 19 Sprint F — Page détail parcelle complète `/agence/foncier/parcelle/:idu`.
 *
 * Combine :
 *   - Carte parcelle (polygone + WMS cadastre)
 *   - Détail parcelle + favoris
 *   - Sociodémo commune (Sprint C)
 *   - Résumé PLU IA (Sprint D)
 *   - Vision IA toiture (Sprint D)
 *   - DVF mutations historiques de la parcelle
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, WMSTileLayer, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, Loader2, Hash, AlertCircle, History } from 'lucide-react'
import { useFetchParcelle } from '@/hooks/queries/foncier-parcelles'
import { useDvfByParcelle } from '@/hooks/queries/foncier-sociodemo'
import ParcelleDetailCard from '@/components/foncier/ParcelleDetailCard'
import CommuneSociodemoCard from '@/components/foncier/CommuneSociodemoCard'
import PluSummaryCard from '@/components/foncier/PluSummaryCard'
import SatelliteAnalysisCard from '@/components/foncier/SatelliteAnalysisCard'
import type { FoncierParcelle, ParcelleGeometry } from '@/api/foncier-parcelles'

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

export default function AgenceFoncierParcelleDetail() {
  const { idu } = useParams<{ idu: string }>()
  const fetchParcelle = useFetchParcelle()
  const [parcelle, setParcelle] = useState<FoncierParcelle | null>(null)
  const dvf = useDvfByParcelle(idu)

  useEffect(() => {
    if (!idu || idu.length !== 14) return
    fetchParcelle.mutate(
      { idu },
      {
        onSuccess: (res) => {
          if (res.parcelles[0]) setParcelle(res.parcelles[0])
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idu])

  const polygons = useMemo(() => {
    if (!parcelle) return []
    return geometryToLeafletPolygons(parcelle.geometry)
  }, [parcelle])

  if (!idu || idu.length !== 14) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 inline-flex items-center gap-2">
          <AlertCircle size={16} />
          IDU invalide (14 caractères attendus).
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <Link
        to="/agence/foncier/carte"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Retour à la carte
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
          <Hash size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display text-slate-900">Détail parcelle</h1>
          <p className="text-[12px] text-slate-500 inline-flex items-center gap-1">
            <code className="bg-slate-100 px-1 rounded text-[11px]">{idu}</code>
            {parcelle?.commune && ` · ${parcelle.commune}`}
          </p>
        </div>
      </div>

      {fetchParcelle.isPending && !parcelle && (
        <p className="text-sm text-slate-400 text-center py-12 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 size={16} className="animate-spin" /> Chargement de la parcelle…
        </p>
      )}

      {fetchParcelle.isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 inline-flex items-center gap-2">
          <AlertCircle size={14} />
          Parcelle introuvable : {String(fetchParcelle.error)}
        </div>
      )}

      {parcelle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne gauche : carte + parcelle + DVF */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mini-carte */}
            {parcelle.centroid_lat !== null && parcelle.centroid_lng !== null && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 320 }}>
                <MapContainer
                  center={[parcelle.centroid_lat, parcelle.centroid_lng]}
                  zoom={18}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <WMSTileLayer
                    url="https://data.geopf.fr/wms-r/wms"
                    params={{
                      layers: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
                      format: 'image/png',
                      transparent: true,
                      version: '1.3.0',
                    }}
                    opacity={0.6}
                  />
                  {polygons.map((ring, i) => (
                    <Polygon
                      key={i}
                      positions={ring}
                      pathOptions={{
                        color: '#10b981',
                        fillColor: '#34d399',
                        fillOpacity: 0.3,
                        weight: 2.5,
                      }}
                    />
                  ))}
                </MapContainer>
              </div>
            )}

            <ParcelleDetailCard parcelle={parcelle} />

            {/* Résumé PLUi en pleine largeur principale (2/3) plutôt que sidebar
               étroite — la synthèse longue débordait visuellement (cf audit-ux-2026-05-12 bug #2). */}
            {parcelle.code_insee && (
              <PluSummaryCard codeInsee={parcelle.code_insee} />
            )}

            {/* DVF historique */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <History size={16} className="text-slate-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Historique DVF (mutations)</h2>
              </div>
              {dvf.isLoading && (
                <p className="text-xs text-slate-400">Chargement DVF…</p>
              )}
              {!dvf.isLoading && (dvf.data ?? []).length === 0 && (
                <p className="text-xs text-slate-500 italic">
                  Aucune mutation enregistrée pour cette parcelle dans l'archive DVF.
                </p>
              )}
              {(dvf.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-xs border-t border-slate-100 pt-2"
                >
                  <div>
                    <p className="font-semibold text-slate-700">
                      {m.nature_mutation}
                      {m.type_local && (
                        <span className="ml-1 text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                          {m.type_local}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(m.date_mutation).toLocaleDateString('fr-FR')}
                      {m.surface_reelle_bati && ` · ${m.surface_reelle_bati} m²`}
                      {m.nombre_pieces_principales && ` · ${m.nombre_pieces_principales} pièces`}
                    </p>
                  </div>
                  {m.valeur_fonciere_cents !== null && (
                    <p className="font-bold text-emerald-700">
                      {(m.valeur_fonciere_cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Colonne droite : enrichissements (sociodémo + IA vision toiture).
             PLUi est déplacé en colonne principale (gauche) pour laisser
             respirer la synthèse longue — cf audit-ux-2026-05-12 bug #2. */}
          <div className="space-y-4">
            {parcelle.code_insee && (
              <CommuneSociodemoCard codeInsee={parcelle.code_insee} />
            )}
            <SatelliteAnalysisCard parcelleIdu={parcelle.idu} />
          </div>
        </div>
      )}
    </div>
  )
}
