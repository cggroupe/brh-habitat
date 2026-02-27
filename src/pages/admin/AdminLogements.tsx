import { useEffect, useState, useCallback } from 'react'
import { Home, Search, ChevronLeft, ChevronRight, AlertCircle, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhHomeRow, DpeRating } from '@/types/database'

interface HomeWithProfile extends BrhHomeRow {
  user_full_name: string | null
}

const PAGE_SIZE = 20

const propertyTypeLabels: Record<string, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  villa: 'Villa',
  studio: 'Studio',
}

const dpeColors: Record<DpeRating, string> = {
  A: 'bg-green-600 text-white',
  B: 'bg-green-500 text-white',
  C: 'bg-lime-500 text-white',
  D: 'bg-yellow-500 text-white',
  E: 'bg-orange-500 text-white',
  F: 'bg-red-500 text-white',
  G: 'bg-red-700 text-white',
}

const PROPERTY_TYPES = ['maison', 'appartement', 'villa', 'studio']

export default function AdminLogements() {
  const [homes, setHomes] = useState<HomeWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const [searchCity, setSearchCity] = useState('')
  const [filterType, setFilterType] = useState('')

  const [debouncedCity, setDebouncedCity] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCity(searchCity)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchCity])

  const fetchHomes = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('brh_homes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (debouncedCity.trim()) {
      query = query.ilike('city', `%${debouncedCity.trim()}%`)
    }
    if (filterType) {
      query = query.eq('property_type', filterType)
    }

    const { data, count, error: fetchError } = await query

    if (fetchError) {
      setError('Erreur lors du chargement des logements.')
      setLoading(false)
      return
    }

    const rows = data ?? []

    // Fetch profile names for the user_ids
    const userIds = [...new Set(rows.map((h) => h.user_id))]
    let profileMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]))
      }
    }

    const enriched: HomeWithProfile[] = rows.map((h) => ({
      ...h,
      user_full_name: profileMap[h.user_id] ?? null,
    }))

    setHomes(enriched)
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, debouncedCity, filterType])

  useEffect(() => {
    void fetchHomes()
  }, [fetchHomes])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Logements</h1>
          <p className="font-body text-sm text-text-light mt-1">
            {total} logement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-gray-light p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search size={16} className="text-text-light shrink-0" />
          <input
            type="text"
            placeholder="Filtrer par ville..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="flex-1 font-body text-sm text-text-primary bg-transparent outline-none placeholder:text-text-light"
          />
        </div>
        <div className="h-5 w-px bg-gray-light" />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
          className="font-body text-sm text-text-primary bg-transparent outline-none cursor-pointer"
        >
          <option value="">Tous les types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{propertyTypeLabels[t] ?? t}</option>
          ))}
        </select>
        {(searchCity || filterType) && (
          <button
            onClick={() => { setSearchCity(''); setFilterType(''); setPage(0) }}
            className="text-xs font-body text-danger hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : homes.length === 0 ? (
          <div className="p-12 text-center">
            <Home size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary mb-1">Aucun logement trouvé</p>
            <p className="font-body text-sm text-text-light">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-light">
                  <tr>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Adresse</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Ville</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Surface</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Année</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">DPE</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Propriétaire</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Ajouté le</th>
                  </tr>
                </thead>
                <tbody>
                  {homes.map((home) => (
                    <tr key={home.id} className="border-b border-gray-light last:border-0 hover:bg-background transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-text-light shrink-0" />
                          <span className="font-body text-sm text-text-primary">{home.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {home.city} {home.postal_code}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-block px-2.5 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">
                          {propertyTypeLabels[home.property_type] ?? home.property_type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">{home.surface} m²</td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">{home.year_built}</td>
                      <td className="px-6 py-3">
                        {home.dpe_rating ? (
                          <span className={`inline-block w-7 h-7 rounded-full text-xs font-display flex items-center justify-center ${dpeColors[home.dpe_rating]}`}>
                            {home.dpe_rating}
                          </span>
                        ) : (
                          <span className="text-text-light font-body text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {home.user_full_name ?? <span className="text-text-light italic">Inconnu</span>}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                        {new Date(home.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-light">
                <p className="font-body text-sm text-text-light">
                  Page {page + 1} sur {totalPages} — {total} résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
