/**
 * Phase 19 Sprint A — Mes parcelles favorites `/agence/foncier/favoris`.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, MapPin, Ruler, Hash, Trash2, ExternalLink, Filter } from 'lucide-react'
import {
  useMyFavoris,
  useUpdateFavori,
  useRemoveFavori,
} from '@/hooks/queries/foncier-favoris'
import type { FavoriStatus } from '@/api/foncier-favoris'

const STATUS_LABELS: Record<FavoriStatus, { label: string; cls: string }> = {
  a_etudier: { label: 'À étudier', cls: 'bg-slate-100 text-slate-700' },
  contact_pris: { label: 'Contact pris', cls: 'bg-cyan-100 text-cyan-700' },
  offre_faite: { label: 'Offre faite', cls: 'bg-amber-100 text-amber-700' },
  vendu: { label: 'Vendu', cls: 'bg-emerald-100 text-emerald-700' },
  abandonne: { label: 'Abandonné', cls: 'bg-slate-100 text-slate-400 line-through' },
}

const PRIORITE_DOT: Record<string, string> = {
  haute: 'bg-red-500',
  normale: 'bg-emerald-500',
  basse: 'bg-slate-300',
}

export default function AgenceFoncierFavoris() {
  const [filterStatus, setFilterStatus] = useState<FavoriStatus | 'all'>('all')
  const favoris = useMyFavoris()
  const updateMut = useUpdateFavori()
  const removeMut = useRemoveFavori()

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return favoris.data ?? []
    return (favoris.data ?? []).filter((f) => f.status === filterStatus)
  }, [favoris.data, filterStatus])

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Star size={20} className="text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-display">Mes parcelles favorites</h1>
            <p className="text-sm text-slate-500">
              {(favoris.data ?? []).length} parcelle{(favoris.data ?? []).length > 1 ? 's' : ''} suivie{(favoris.data ?? []).length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          to="/agence/foncier/carte"
          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
        >
          ← Retour à la carte
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            filterStatus === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Filter size={11} className="inline mr-1" /> Tous
        </button>
        {(Object.keys(STATUS_LABELS) as FavoriStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              filterStatus === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {favoris.isLoading && (
        <p className="text-sm text-slate-400 text-center py-12">Chargement…</p>
      )}

      {!favoris.isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-8 text-center">
          <Star size={32} className="mx-auto text-amber-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {filterStatus === 'all' ? 'Aucune parcelle favorite' : `Aucune parcelle "${STATUS_LABELS[filterStatus].label}"`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Allez sur la <Link to="/agence/foncier/carte" className="text-emerald-700 underline">carte cadastre</Link> et ajoutez des parcelles aux favoris.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((f) => {
          const status = STATUS_LABELS[f.status]
          return (
            <div
              key={f.id}
              className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-3 hover:border-emerald-300 transition"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITE_DOT[f.priorite] ?? 'bg-slate-300'}`} title={`Priorité ${f.priorite}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="font-semibold text-slate-800 truncate">
                    {f.parcelle_commune ?? '—'}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 inline-flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Hash size={10} />
                    <code className="bg-slate-100 px-1 rounded text-[10px]">{f.parcelle_idu}</code>
                  </span>
                  {f.parcelle_contenance_m2 !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler size={10} />
                      {f.parcelle_contenance_m2.toLocaleString('fr-FR')} m²
                    </span>
                  )}
                  {f.parcelle_departement && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} />
                      {f.parcelle_departement}
                    </span>
                  )}
                </p>
                {f.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {f.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {f.notes && (
                  <p className="text-xs text-slate-600 italic mt-1 line-clamp-1">"{f.notes}"</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={f.status}
                  onChange={(e) =>
                    updateMut.mutate({ id: f.id, patch: { status: e.target.value as FavoriStatus } })
                  }
                  disabled={updateMut.isPending}
                  className="text-[11px] rounded-md border border-slate-200 px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {(Object.keys(STATUS_LABELS) as FavoriStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s].label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeMut.mutate(f.id)}
                  disabled={removeMut.isPending}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  aria-label="Retirer des favoris"
                >
                  <Trash2 size={14} />
                </button>
                <Link
                  to={`/agence/foncier/parcelle/${f.parcelle_idu}`}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                  aria-label="Ouvrir la fiche complète"
                  title="Ouvrir la fiche complète (DVF + PLU + sociodémo + vision toiture)"
                >
                  <ExternalLink size={14} />
                </Link>
                <Link
                  to={`/agence/foncier/carte?focus=${f.parcelle_idu}`}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                  aria-label="Voir sur la carte"
                  title="Voir sur la carte"
                >
                  <MapPin size={14} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
