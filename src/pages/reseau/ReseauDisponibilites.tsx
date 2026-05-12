/**
 * ReseauDisponibilites — Liste des disponibilités publiées (Phase 18 v2).
 *
 * Public : tous les partenaires authentifiés voient les dispos `visibility=public`.
 * Réseau : voient en plus les dispos `visibility=reseau` de leurs connexions.
 * cf audit-ux-2026-05-12 #4 (pivot Phase 18).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Plus,
  MapPin,
  Briefcase,
  Filter,
  Loader2,
  Search,
} from 'lucide-react'
import { useDisponibilites } from '@/hooks/queries/disponibilites'
import type {
  DisponibiliteVisibility,
  ContractModePref,
} from '@/api/disponibilites'

const DEPTS_BRETAGNE = [
  { code: '22', label: 'Côtes-d\'Armor' },
  { code: '29', label: 'Finistère' },
  { code: '35', label: 'Ille-et-Vilaine' },
  { code: '56', label: 'Morbihan' },
] as const

const METIERS = [
  'maçonnerie',
  'isolation',
  'menuiserie',
  'plomberie',
  'électricité',
  'couverture',
  'chauffage',
  'plâtrerie',
  'peinture',
  'photovoltaïque',
] as const

const CONTRACT_LABELS: Record<ContractModePref, string> = {
  sous_traitance: 'Sous-traitance',
  co_traitance: 'Co-traitance',
  apport: 'Apport d\'affaires',
  tous: 'Tous modes',
}

const VISIBILITY_LABELS: Record<DisponibiliteVisibility, string> = {
  public: 'Public',
  reseau: 'Réseau',
  prive: 'Privé',
}

export default function ReseauDisponibilites() {
  const [visibility, setVisibility] = useState<DisponibiliteVisibility | 'all'>('all')
  const [departement, setDepartement] = useState<string>('')
  const [metier, setMetier] = useState<string>('')
  const [search, setSearch] = useState('')

  const { data: dispos = [], isLoading } = useDisponibilites({
    visibility: visibility === 'all' ? undefined : visibility,
    departement: departement || undefined,
    metier: metier || undefined,
  })

  const filteredDispos = dispos.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (d.publisher_name?.toLowerCase().includes(q) ?? false) ||
      (d.description?.toLowerCase().includes(q) ?? false) ||
      d.metiers_proposes.some((m) => m.toLowerCase().includes(q))
    )
  })

  function resetFilters() {
    setVisibility('all')
    setDepartement('')
    setMetier('')
    setSearch('')
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center">
              <CalendarCheck size={18} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-text">
              Pros disponibles
            </h1>
          </div>
          <p className="text-sm text-text-muted max-w-2xl">
            Les pros du réseau qui signalent leur disponibilité (période + zone + métiers).
            Filtrez pour trouver un sous-traitant ou un partenaire pour vos chantiers.
          </p>
        </div>
        <Link
          to="/reseau/disponibilites/nouvelle"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
        >
          <Plus size={15} />
          Déposer ma dispo
        </Link>
      </header>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
          <Filter size={12} />
          Filtres
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, métier, description…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as DisponibiliteVisibility | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="all">Toute audience</option>
            <option value="public">Public uniquement</option>
            <option value="reseau">Mon réseau uniquement</option>
          </select>
          <select
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Tous départements</option>
            {DEPTS_BRETAGNE.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.label}
              </option>
            ))}
          </select>
          <select
            value={metier}
            onChange={(e) => setMetier(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Tous métiers</option>
            {METIERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : filteredDispos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CalendarCheck size={26} className="text-emerald-700" />
          </div>
          <p className="text-base font-bold text-text">Aucune dispo ne correspond</p>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Essayez d'élargir vos filtres ou soyez le premier à publier votre disponibilité.
          </p>
          <div className="mt-4 inline-flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Réinitialiser les filtres
            </button>
            <Link
              to="/reseau/disponibilites/nouvelle"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              <Plus size={13} />
              Déposer ma dispo
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDispos.map((d) => {
            const periodeLabel = `${new Date(d.periode_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(d.periode_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
            return (
              <article
                key={d.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-sm p-5 transition"
              >
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-bold text-text">{d.publisher_name ?? 'Pro BRH'}</p>
                    <p className="text-[11px] text-text-muted">
                      {d.publisher_partner_type ?? '—'} · {CONTRACT_LABELS[d.contract_mode_pref]}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded ${
                    d.visibility === 'public'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {VISIBILITY_LABELS[d.visibility]}
                  </span>
                </header>

                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold">
                    <CalendarCheck size={11} />
                    {periodeLabel}
                  </span>
                  {d.departements.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-700 font-semibold">
                      <MapPin size={11} />
                      {d.departements.join(', ')}
                    </span>
                  )}
                  {d.capacite_chantiers !== null && d.capacite_chantiers > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-700 font-semibold">
                      <Briefcase size={11} />
                      {d.capacite_chantiers} chantier{d.capacite_chantiers > 1 ? 's' : ''} //
                    </span>
                  )}
                </div>

                {d.metiers_proposes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {d.metiers_proposes.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {d.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {d.description}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
