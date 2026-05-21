/**
 * EmployeDirigeants — liste des dirigeants SCI consolidés.
 *
 * Route : /employe/dirigeants
 * 80 844 dirigeants uniques avec patrimoine cross-SCI.
 * Filtres : recherche, dept, multi-SCI, propriétaire DPE, succession ouverte.
 */
import { useState, useDeferredValue } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Loader2, User, Building2, Home, AlertTriangle, Filter,
} from 'lucide-react'
import { useDirigeantsSearch } from '@/hooks/queries/useDirigeants'

const PAGE_SIZE = 50
const DEPTS = [
  { v: '', l: 'Tous départements' },
  { v: '22', l: '22 — Côtes-d’Armor' },
  { v: '29', l: '29 — Finistère' },
  { v: '35', l: '35 — Ille-et-Vilaine' },
  { v: '44', l: '44 — Loire-Atlantique' },
  { v: '49', l: '49 — Maine-et-Loire' },
  { v: '56', l: '56 — Morbihan' },
]

const INTERET_CLS: Record<string, string> = {
  chaud: 'bg-red-100 text-red-900 border-red-300',
  tiede: 'bg-amber-100 text-amber-900 border-amber-300',
  froid: 'bg-stone-100 text-stone-800 border-stone-300',
  a_recontacter: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  refus: 'bg-stone-200 text-stone-800 border-stone-400',
}

export default function EmployeDirigeants() {
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('')
  const [multiSci, setMultiSci] = useState(false)
  const [proprioDpe, setProprioDpe] = useState(false)
  const [succession, setSuccession] = useState(false)
  const [page, setPage] = useState(0)
  const deferredQuery = useDeferredValue(query)

  const { data, isLoading, isFetching } = useDirigeantsSearch({
    query: deferredQuery || undefined,
    dept: dept || null,
    multi_sci: multiSci,
    proprio_dpe: proprioDpe,
    succession,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const rows = data ?? []
  const total = rows[0]?.total_count ?? 0
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE))

  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Dirigeants SCI</h1>
            <p className="text-xs text-stone-600">
              80 844 dirigeants consolidés · 4 470 multi-SCI · 17 403 propriétaires DPE
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            {Number(total).toLocaleString('fr-FR')} dirigeants
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Nom, prénom, ou nom de SCI…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <select
            value={dept}
            onChange={(e) => { setDept(e.target.value); setPage(0) }}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            {DEPTS.map((d) => (<option key={d.v} value={d.v}>{d.l}</option>))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-700">
          <span className="inline-flex items-center gap-1 font-semibold text-stone-500">
            <Filter className="h-3 w-3" />
            Filtres :
          </span>
          {[
            { v: multiSci, set: setMultiSci, label: 'Multi-SCI (≥2)' },
            { v: proprioDpe, set: setProprioDpe, label: 'Propriétaire DPE BRH' },
            { v: succession, set: setSuccession, label: 'Succession ouverte' },
          ].map((f, i) => (
            <label key={i} className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={f.v}
                onChange={(e) => { f.set(e.target.checked); setPage(0) }}
                className="rounded"
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-2 p-4">
          {isLoading && rows.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
              Aucun dirigeant. Élargissez les filtres.
            </div>
          ) : (
            rows.map((d) => (
              <Link
                key={d.id}
                to={`/employe/dirigeants/${d.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-3 transition hover:border-stone-300 hover:bg-stone-50/60"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${d.est_decede ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900">
                        {d.prenom} {d.nom}
                      </span>
                      {d.date_naissance && (
                        <span className="text-[10px] text-stone-500">
                          né(e) le {new Date(d.date_naissance).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {d.succession_potentielle && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-900 ring-1 ring-rose-200">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Succession ouverte
                        </span>
                      )}
                      {d.interet_brh && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${INTERET_CLS[d.interet_brh] ?? ''}`}>
                          {d.interet_brh}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-stone-400" />
                        <b>{d.nb_sci_dirigees}</b> SCI dirigées
                        {d.nb_sci_actives !== d.nb_sci_dirigees && (
                          <span className="text-stone-500"> ({d.nb_sci_actives} actives)</span>
                        )}
                      </span>
                      {d.nb_dpe_total > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-800">
                          <Home className="h-3 w-3" />
                          <b>{d.nb_dpe_total}</b> DPE F/G détenus
                        </span>
                      )}
                      {d.sci_dirigees && d.sci_dirigees.length > 0 && (
                        <span className="truncate max-w-[400px] text-stone-500">
                          {d.sci_dirigees.slice(0, 3).map((s) => s.denomination).filter(Boolean).join(' · ')}
                          {d.sci_dirigees.length > 3 && ' …'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200 bg-white px-4 py-2 text-sm">
          <div className="text-stone-600">
            Page <b>{page + 1}</b> / {totalPages} · {Number(total).toLocaleString('fr-FR')} résultats
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-stone-300 px-3 py-1 disabled:opacity-40"
            >
              Précédente
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              className="rounded-md border border-stone-300 px-3 py-1 disabled:opacity-40"
            >
              Suivante
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
