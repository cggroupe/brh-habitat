/**
 * Phase 18.11 — Page découverte `/reseau/decouvrir`.
 *
 * Carte Leaflet centrée Bretagne + filtres dept/métier/search + grille listing.
 */
import { useMemo, useState } from 'react'
import { Map as MapIcon, List as ListIcon, Search } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { useDiscoverPros } from '@/hooks/queries/reseau-discover'

const BRETAGNE_DEPTS = [
  { code: '', label: 'Toute la Bretagne' },
  { code: '22', label: '22 — Côtes-d\'Armor' },
  { code: '29', label: '29 — Finistère' },
  { code: '35', label: '35 — Ille-et-Vilaine' },
  { code: '56', label: '56 — Morbihan' },
  { code: '44', label: '44 — Loire-Atlantique' },
]

const PARTNER_TYPES = [
  { value: '', label: 'Tous les pros' },
  { value: 'agence_immo', label: 'Agences immo' },
  { value: 'artisan_rge', label: 'Artisans RGE' },
  { value: 'architecte', label: 'Architectes' },
  { value: 'apporteur_affaires', label: "Apporteurs d'affaires" },
]

type View = 'list' | 'map'

export default function ReseauDecouvrir() {
  const [view, setView] = useState<View>('list')
  const [dept, setDept] = useState('')
  const [partnerType, setPartnerType] = useState('')
  const [search, setSearch] = useState('')
  const [metier, setMetier] = useState('')

  const pros = useDiscoverPros({
    departement: dept || undefined,
    partnerType: partnerType || undefined,
    search: search || undefined,
    metier: metier || undefined,
    limit: 100,
  })

  const positioned = useMemo(
    () => (pros.data ?? []).filter((p) => p.lat !== null && p.lng !== null),
    [pros.data],
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 lg:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <MapIcon size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Découvrir</h1>
          <p className="text-sm text-slate-500">
            Pros bretons par métier, ville et certifications
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, ville…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {BRETAGNE_DEPTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {PARTNER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={metier}
          onChange={(e) => setMetier(e.target.value)}
          placeholder="Filtrer par métier (ex: couverture)"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <ListIcon size={14} /> Liste
          </button>
          <button
            onClick={() => setView('map')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              view === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <MapIcon size={14} /> Carte
          </button>
        </div>

        <span className="ml-auto text-xs text-slate-500">
          {(pros.data ?? []).length} pro{(pros.data ?? []).length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading / empty */}
      {pros.isLoading && <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>}
      {!pros.isLoading && (pros.data ?? []).length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Aucun pro trouvé</p>
          <p className="text-xs text-slate-500 mt-1">Essayez d'élargir vos filtres.</p>
        </div>
      )}

      {/* List view */}
      {!pros.isLoading && view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(pros.data ?? []).map((p) => (
            <Link
              key={p.partner_contract_id}
              to={`/reseau/profil/${p.partner_contract_id}`}
              className="bg-white rounded-xl border border-slate-200/60 p-4 hover:border-cyan-300 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="font-semibold text-slate-800">{p.signer_full_name}</p>
                  <p className="text-xs text-cyan-700 mt-0.5">
                    {p.partner_type.replace(/_/g, ' ')}
                  </p>
                </div>
                {p.endorsement_count > 0 && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                    ⭐ {p.endorsement_count}
                  </span>
                )}
              </div>
              {(p.city || p.departement) && (
                <p className="text-xs text-slate-500">
                  {[p.city, p.postal_code, p.departement].filter(Boolean).join(' · ')}
                </p>
              )}
              {p.metiers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.metiers.slice(0, 4).map((m) => (
                    <span
                      key={m}
                      className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded"
                    >
                      {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Map view */}
      {!pros.isLoading && view === 'map' && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 480 }}>
          <MapContainer
            center={[48.0, -3.0]}
            zoom={8}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positioned.map((p) => (
              <CircleMarker
                key={p.partner_contract_id}
                center={[p.lat as number, p.lng as number]}
                radius={8}
                pathOptions={{
                  color: '#0891b2',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{p.signer_full_name}</p>
                    <p className="text-slate-500">{p.partner_type.replace(/_/g, ' ')}</p>
                    {p.city && <p className="text-slate-500">{p.city}</p>}
                    <Link
                      to={`/reseau/profil/${p.partner_contract_id}`}
                      className="block mt-1 text-cyan-700 font-semibold"
                    >
                      Voir le profil →
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="rounded-xl bg-cyan-50/30 border border-cyan-200/60 p-3 text-xs text-cyan-900">
        <strong>SEO :</strong> 75 pages publiques générées (5 dépts × 15 métiers) à
        l'URL <code className="bg-white px-1 rounded">/pros/:dept/:metier</code> pour
        l'indexation Google. Voir <a href="/pros/29/couverture" className="underline">/pros/29/couverture</a>.
      </div>
    </div>
  )
}
