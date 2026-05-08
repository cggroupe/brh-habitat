/**
 * Phase 18.7 — Marketplace chantiers `/reseau/chantiers`.
 *
 * Layout : tabs (Liste / Carte) + filtres département + ranking via Haversine.
 */
import { useMemo, useState } from 'react'
import { Briefcase, PlusCircle, List as ListIcon, Map as MapIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useChantiers } from '@/hooks/queries/reseau-chantiers'
import { rankChantiersForPro, type ChantierMatchInput } from '@/lib/reseau/chantier-matching'
import ChantierCard from '@/components/reseau/ChantierCard'
import ChantiersMap from '@/components/reseau/ChantiersMap'

const BRETAGNE_DEPTS = [
  { code: '', label: 'Toute la Bretagne' },
  { code: '22', label: '22 — Côtes-d\'Armor' },
  { code: '29', label: '29 — Finistère' },
  { code: '35', label: '35 — Ille-et-Vilaine' },
  { code: '56', label: '56 — Morbihan' },
  { code: '44', label: '44 — Loire-Atlantique' },
]

type View = 'list' | 'map'

export default function ReseauChantiers() {
  const [view, setView] = useState<View>('list')
  const [dept, setDept] = useState('')

  const chantiers = useChantiers({
    status: 'open',
    departement: dept || undefined,
    limit: 100,
  })

  // Ranking V1 sans contexte pro chargé (myMetiers vide → garde tout).
  // V1.5 : enrichir avec myLat/myLng/myMetiers depuis partner_contract.
  const ranked = useMemo(() => {
    const items: ChantierMatchInput[] = (chantiers.data ?? []).map((c) => ({
      id: c.id,
      metiers_recherches: c.metiers_recherches,
      lat: c.lat,
      lng: c.lng,
      departement: c.departement,
      status: c.status,
      created_at: c.created_at,
      budget_cents: c.budget_cents,
    }))
    return rankChantiersForPro(items, {
      myLat: null,
      myLng: null,
      myDepartement: dept || null,
      myMetiers: [],
    })
  }, [chantiers.data, dept])

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display text-slate-900">Marketplace chantiers</h1>
            <p className="text-sm text-slate-500">
              Trouver un co-traitant, un sous-traitant ou apporter une affaire
            </p>
          </div>
        </div>
        <Link
          to="/reseau/chantiers/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition shadow-sm"
        >
          <PlusCircle size={16} />
          Proposer un chantier
        </Link>
      </div>

      {/* Filtres + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
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
          {ranked.length} chantier{ranked.length > 1 ? 's' : ''} ouvert{ranked.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading / empty */}
      {chantiers.isLoading && (
        <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>
      )}
      {!chantiers.isLoading && ranked.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Aucun chantier ouvert pour le moment.</p>
          <p className="text-xs text-slate-500 mt-1">
            Soyez le premier à proposer un chantier en cliquant sur "Proposer un chantier".
          </p>
        </div>
      )}

      {/* Vue liste */}
      {!chantiers.isLoading && ranked.length > 0 && view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ranked.map((r) => {
            const full = chantiers.data?.find((c) => c.id === r.chantier.id)
            if (!full) return null
            return (
              <ChantierCard
                key={full.id}
                chantier={full}
                distanceKm={r.distanceKm}
                matchedMetiers={r.matchedMetiers}
              />
            )
          })}
        </div>
      )}

      {/* Vue carte */}
      {!chantiers.isLoading && ranked.length > 0 && view === 'map' && (
        <ChantiersMap chantiers={chantiers.data ?? []} />
      )}
    </div>
  )
}
