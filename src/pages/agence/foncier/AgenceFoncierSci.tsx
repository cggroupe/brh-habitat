/**
 * Phase 19 Sprint B — Page recherche SCI `/agence/foncier/sci`.
 *
 * 2 modes :
 *   1. Recherche libre (texte + filtres dept) → EF sci-search
 *   2. Recherche par SIREN précis (auto-détecté si 9 digits)
 *
 * Filtres latéraux : has_deceased_dirigeant, minSuccessionScore, dept.
 * Au clic sur un résultat → expand inline avec détail dirigeants + bouton "Vérifier décès".
 */
import { useState, useMemo } from 'react'
import { Search, Building2, Filter, AlertCircle, Loader2, FileSearch } from 'lucide-react'
import { useSearchSci } from '@/hooks/queries/foncier-sci'
import SciCard from '@/components/foncier/SciCard'
import { formatLocalDate } from '@/lib/utils'

const BRETAGNE_DEPTS = [
  { code: '', label: 'Toute la Bretagne' },
  { code: '22', label: '22 — Côtes-d\'Armor' },
  { code: '29', label: '29 — Finistère' },
  { code: '35', label: '35 — Ille-et-Vilaine' },
  { code: '56', label: '56 — Morbihan' },
  { code: '44', label: '44 — Loire-Atlantique' },
]

/** Filtre période décès : nombre de mois (ou null = pas de filtre). */
const DECES_PERIODS: Array<{ label: string; months: number | null }> = [
  { label: 'Toutes périodes', months: null },
  { label: 'Décès < 3 mois', months: 3 },
  { label: 'Décès < 6 mois', months: 6 },
  { label: 'Décès < 1 an', months: 12 },
  { label: 'Décès < 2 ans', months: 24 },
  { label: 'Décès < 5 ans', months: 60 },
]

function monthsAgoIso(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return formatLocalDate(d)
}

export default function AgenceFoncierSci() {
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [departement, setDepartement] = useState('29')
  const [hasDeceasedOnly, setHasDeceasedOnly] = useState(false)
  const [minSuccessionScore, setMinSuccessionScore] = useState(0)
  const [decesPeriodMonths, setDecesPeriodMonths] = useState<number | null>(null)
  const [expandedSiren, setExpandedSiren] = useState<string | null>(null)

  const decesSince = decesPeriodMonths !== null ? monthsAgoIso(decesPeriodMonths) : undefined

  // Active la recherche dès que activeQuery est défini
  const search = useSearchSci({
    q: activeQuery || undefined,
    departement: departement || undefined,
    limit: 30,
    hasDeceasedOnly,
    minSuccessionScore,
    decesSince,
  })

  // Cache local : SCI déjà fetched (pour navigation rapide quand activeQuery vide)
  const cacheLocal = useSearchSci({
    cacheOnly: true,
    departement: departement || undefined,
    hasDeceasedOnly,
    minSuccessionScore,
    decesSince,
    limit: 50,
  })

  const isSiren = useMemo(() => /^\d{9}$/.test(query.trim()), [query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Recherche API gouv : query >= 3 chars OU SIREN. Sinon on reset activeQuery
    // pour basculer sur le mode cacheLocal (filtre dept + decès dans cache).
    if (query.trim().length >= 3 || isSiren) {
      setActiveQuery(query.trim())
    } else {
      setActiveQuery('')
    }
  }

  // Combine cache + recherche : si query active, on affiche les resultats API,
  // sinon on affiche le cache local filtre par dept/deces/score.
  const list = activeQuery ? search.data?.sci ?? [] : cacheLocal.data?.sci ?? []
  const isLoading = activeQuery ? search.isLoading : cacheLocal.isLoading
  const isError = activeQuery ? search.isError : cacheLocal.isError

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display text-slate-900">SCI et personnes morales</h1>
          <p className="text-[12px] text-slate-500">
            Recherche enrichie avec flag succession (croisement décès INSEE) — sources publiques
          </p>
        </div>
      </div>

      {/* Form de recherche */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-12 gap-2"
      >
        <div className="md:col-span-7 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom de SCI, ville, ou SIREN — ou laissez vide pour voir tout le département"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {isSiren && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
              SIREN
            </span>
          )}
        </div>

        <select
          value={departement}
          onChange={(e) => setDepartement(e.target.value)}
          className="md:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {BRETAGNE_DEPTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="md:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
        >
          {(search.isFetching || cacheLocal.isFetching) ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSearch size={14} />
          )}
          {query.trim().length >= 3 || isSiren ? 'Rechercher API' : 'Filtrer cache'}
        </button>
      </form>

      {/* Filtres latéraux */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-4 flex-wrap text-xs">
        <div className="inline-flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="font-semibold text-slate-700">Filtres :</span>
        </div>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDeceasedOnly}
            onChange={(e) => setHasDeceasedOnly(e.target.checked)}
          />
          <AlertCircle size={12} className="text-amber-600" />
          Avec décès détecté uniquement
        </label>
        <label className="inline-flex items-center gap-1.5">
          Score succession ≥
          <select
            value={minSuccessionScore}
            onChange={(e) => setMinSuccessionScore(parseInt(e.target.value, 10))}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="0">Tous</option>
            <option value="50">50 (probable)</option>
            <option value="100">100 (certain)</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-amber-700">📅 Période décès</span>
          <select
            value={decesPeriodMonths === null ? '' : String(decesPeriodMonths)}
            onChange={(e) => setDecesPeriodMonths(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {DECES_PERIODS.map((p) => (
              <option key={String(p.months)} value={p.months === null ? '' : String(p.months)}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-slate-500">
          {list.length} résultat{list.length > 1 ? 's' : ''}
          {!activeQuery && ' (cache local)'}
          {decesPeriodMonths !== null && (
            <span className="ml-1 text-amber-700 font-semibold">· tri par décès récent ↓</span>
          )}
        </span>
      </div>

      {/* Loading / errors / empty */}
      {isLoading && (
        <p className="text-sm text-slate-400 text-center py-12 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 size={16} className="animate-spin" /> Recherche en cours…
        </p>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 inline-flex items-center gap-2">
          <AlertCircle size={14} />
          Erreur lors de la recherche. Vérifiez votre connexion ou réessayez.
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-8 text-center">
          <Building2 size={32} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {activeQuery
              ? search.data?.api_total
                ? `${search.data.api_total} entreprises trouvées dans l'API mais aucune ne correspond aux filtres SCI/personne morale`
                : 'Aucune SCI trouvée'
              : 'Lancez une recherche pour explorer les SCI'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Saisissez un nom (≥ 3 caractères) ou un SIREN précis. Le filtre département est appliqué automatiquement.
            {activeQuery && !search.data?.api_total && (
              <span className="block mt-2 text-amber-700">
                Astuce : essayez un nom plus précis (ex. « SCI dupont », « immobilier rennes ») plutôt qu'un nom de ville seul.
              </span>
            )}
          </p>
          {search.data?.upsert_error && (
            <p className="text-[10px] text-red-500 mt-3 italic">
              [Debug] Cache RLS error : {search.data.upsert_error}
            </p>
          )}
        </div>
      )}

      {/* Résultats */}
      <div className="space-y-2.5">
        {list.map((sci) => (
          <SciCard
            key={sci.siren}
            sci={sci}
            expanded={expandedSiren === sci.siren}
            onToggle={() => setExpandedSiren((prev) => (prev === sci.siren ? null : sci.siren))}
          />
        ))}
      </div>

      <div className="rounded-xl bg-emerald-50/40 border border-emerald-200/60 p-3 text-xs text-emerald-900">
        <strong>Sources :</strong> recherche-entreprises.api.gouv.fr (DataInfogreffe — cache 30j) · matching décès via api.deces.matchid.io (INSEE) · Conforme RGPD personnes morales.
      </div>
    </div>
  )
}
