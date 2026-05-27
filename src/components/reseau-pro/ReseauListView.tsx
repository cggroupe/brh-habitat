/**
 * ReseauListView — vue liste annuaire réseau pro (employé + admin).
 *
 * Layout : KPI Hero + barre filtres + grille de cards + pagination.
 * Cliquer sur une card → fiche détaillée (`./{id}`).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useReseauList, useReseauStats } from '@/hooks/queries/brh-reseau-pro'
import { useAuth } from '@/hooks/useAuth'
import type { ReseauListFilters } from '@/api/brh-reseau-pro'
import ReseauFilterPills from './ReseauFilterPills'
import ReseauProspectCard from './ReseauProspectCard'

const PAGE_SIZE = 30

interface Props {
  /** 'employe' (filtré sur Bretagne uniquement) ou 'admin' (vue globale + stats) */
  variant?: 'employe' | 'admin'
}

export default function ReseauListView({ variant = 'employe' }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filters, setFilters] = useState<ReseauListFilters>({ limit: PAGE_SIZE, offset: 0 })
  const [searchInput, setSearchInput] = useState('')

  const filtersWithPage = useMemo<ReseauListFilters>(
    () => ({ ...filters, limit: PAGE_SIZE }),
    [filters],
  )

  const { data: rows = [], isLoading } = useReseauList(filtersWithPage)
  const { data: stats } = useReseauStats('global')

  const total = rows[0]?.total_count ?? 0
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE))
  const currentPage = Math.floor((filters.offset ?? 0) / PAGE_SIZE)

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchInput || null, offset: 0 }))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Hero / KPIs */}
      <header className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted font-bold">
                <Sparkles size={12} className="text-[#00600a]" />
                Réseau Pro Bretagne
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-text">
                Mon réseau professionnel
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {stats ? (
                  <>
                    <strong className="text-text">{stats.total.toLocaleString('fr-FR')}</strong> entreprises bretonnes ·{' '}
                    <strong className="text-[#00600a]">{stats.free.toLocaleString('fr-FR')}</strong> disponibles ·{' '}
                    <strong className="text-amber-700">{stats.my_claims}</strong> dans mon réseau
                  </>
                ) : (
                  'Annuaire 15 021 entreprises (BTP + Immo) Bretagne — premier arrivé, premier servi.'
                )}
              </p>
            </div>

            {/* Search */}
            <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  placeholder="Nom ou ville…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-72 rounded-xl bg-stone-50 pl-9 pr-3 py-2 text-sm ring-1 ring-stone-200 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[#00600a]/30"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#00600a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004807]"
              >
                Rechercher
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-stone-50">
        <div className="mx-auto max-w-7xl space-y-4 p-6">
          {/* Filtres */}
          <ReseauFilterPills
            filters={filters}
            onChange={(next) => setFilters({ ...next, limit: PAGE_SIZE })}
          />

          {/* Compteur résultats */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div>
              {isLoading ? (
                'Chargement…'
              ) : (
                <>
                  <strong className="text-text">{total.toLocaleString('fr-FR')}</strong> résultat
                  {total > 1 ? 's' : ''}
                  {variant === 'admin' && stats && (
                    <span className="ml-3 opacity-60">
                      ({stats.claimed.toLocaleString('fr-FR')} déjà claim, {stats.free.toLocaleString('fr-FR')} libres)
                    </span>
                  )}
                </>
              )}
            </div>
            {totalPages > 1 && (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, (p.offset ?? 0) - PAGE_SIZE) }))}
                  disabled={currentPage <= 0}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-stone-200 text-text disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={12} /> Préc.
                </button>
                <span>
                  Page <strong>{currentPage + 1}</strong> / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, offset: (p.offset ?? 0) + PAGE_SIZE }))}
                  disabled={currentPage + 1 >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-stone-200 text-text disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suiv. <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Grille de cards */}
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-stone-200">
              <p className="text-sm text-text-muted">
                Aucun résultat avec ces filtres. Essayez de retirer un critère.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((p) => (
                <div key={p.id} onClick={() => !((p.is_claimed && p.claimed_by_user_id !== (user?.id ?? null))) && navigate(`./${p.id}`)}>
                  <ReseauProspectCard prospect={p} currentUserId={user?.id ?? null} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination bas */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, (p.offset ?? 0) - PAGE_SIZE) }))}
                disabled={currentPage <= 0}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-stone-200 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs text-text-muted">
                Page {currentPage + 1} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, offset: (p.offset ?? 0) + PAGE_SIZE }))}
                disabled={currentPage + 1 >= totalPages}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-stone-200 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
