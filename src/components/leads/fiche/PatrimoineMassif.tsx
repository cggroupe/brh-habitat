import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'
import { profileBasePath } from '@/lib/nav'
import { usePagedDpeBySiren, useDpeSummary } from '@/hooks/queries/usePagedDpe'
import TypedBadge from '../../ui/TypedBadge'
import PaginationInfo from '../../ui/PaginationInfo'
import { formatNumber, formatM2 } from '@/lib/format'
import { mapDpeClass } from '@/lib/score-semantic'

interface PatrimoineMassifProps {
  siren: string
  profile: LeadProfile
  /** Si > 100 — auto-activé. */
  totalEstimate?: number
}

const DPE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

/**
 * Liste virtualisée des DPE détenus par une SCI avec :
 *  - Résumé en haut (par DPE class + top communes cliquables)
 *  - Filtres rapides (commune, DPE class, score range)
 *  - Pagination serveur via RPC brh_dpe_by_siren_paged
 *  - Virtualisation @tanstack/react-virtual pour perf 5000+ rows
 *
 * Pattern Data-B : "ne jamais paginer brutalement 1100 entrées sans résumé synthétique".
 */
export default function PatrimoineMassif({ siren, profile }: PatrimoineMassifProps) {
  // TanStack Virtual's useVirtualizer() returns functions that can't be memoized
  // safely by React Compiler. Opt out for this component only.
  'use no memo'
  const [commune, setCommune] = useState<string>('')
  const [dpeFilters, setDpeFilters] = useState<string[]>([])
  const [scoreMin, setScoreMin] = useState<number | null>(null)

  const { data: summary } = useDpeSummary(siren)
  const { data: paged, isLoading } = usePagedDpeBySiren(siren, {
    commune: commune || undefined,
    etiquette_dpe: dpeFilters.length > 0 ? dpeFilters : undefined,
    score_min: scoreMin ?? undefined,
    limit: 200,
    offset: 0,
  })

  const rows = paged?.rows ?? []
  const total = paged?.total ?? 0

  const toggleDpe = (c: string) => {
    setDpeFilters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  const topCommunes = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.by_commune)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [summary])

  // Virtualizer
  const parentRef = useRef<HTMLDivElement | null>(null)
  // TanStack Virtual's useVirtualizer() returns functions React Compiler can't
  // memoize safely. Directive `'use no memo'` above disables compiler memoization
  // for this component, but the lint rule fires regardless — silence it here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  return (
    <section className="space-y-4">
      {/* Résumé top */}
      {summary && summary.total > 0 && (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="font-display text-sm font-semibold text-stone-900">
            Résumé patrimoine — {formatNumber(summary.total)} DPE
          </h3>
          {/* Distribution DPE class */}
          <div className="flex flex-wrap gap-1.5">
            {DPE_CLASSES.map((c) => {
              const n = summary.by_dpe_class[c] ?? 0
              if (n === 0) return null
              const { color } = mapDpeClass(c)
              const isActive = dpeFilters.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleDpe(c)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    isActive ? 'ring-2 ring-emerald-700 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: 'transparent' }}
                  aria-pressed={isActive}
                >
                  <TypedBadge variant="dpe" color={color} label={`${c} · ${formatNumber(n)}`} />
                </button>
              )
            })}
          </div>
          {/* Top communes */}
          {topCommunes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-stone-500">
                Top communes (cliquez pour filtrer)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topCommunes.map(([c, n]) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCommune(commune === c ? '' : c)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1 transition ${
                      commune === c
                        ? 'bg-stone-100 text-[#00600a] ring-stone-400'
                        : 'bg-stone-50 text-slate-700 ring-slate-200 hover:bg-stone-50'
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {c} · {formatNumber(n)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtres actifs + score range */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3">
        <span className="text-xs text-stone-500">Score V2 min :</span>
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={scoreMin ?? ''}
          onChange={(e) => setScoreMin(e.target.value ? Number(e.target.value) : null)}
          className="w-20 rounded-md border border-stone-300 px-2 py-1 text-sm"
          placeholder="—"
        />
        {(commune || dpeFilters.length > 0 || scoreMin != null) && (
          <button
            type="button"
            onClick={() => {
              setCommune('')
              setDpeFilters([])
              setScoreMin(null)
            }}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-stone-100"
          >
            Réinitialiser
          </button>
        )}
        <PaginationInfo
          shown={rows.length}
          total={total}
          itemLabel="DPE"
          sortedBy="triés par score V2 décroissant"
        />
      </div>

      {/* Liste virtualisée */}
      <div
        ref={parentRef}
        className="rounded-lg border border-stone-200 bg-white"
        style={{ height: '600px', overflowY: 'auto' }}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            Aucun DPE ne correspond aux filtres actifs.
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const r = rows[vi.index]
              const { color } = mapDpeClass(r.etiquette_dpe)
              return (
                <Link
                  key={r.id}
                  to={`${profileBasePath(profile)}/adresse/${r.id}`}
                  className="absolute left-0 top-0 grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-stone-100 px-4 hover:bg-stone-50"
                  style={{
                    transform: `translateY(${vi.start}px)`,
                    height: `${vi.size}px`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-stone-900">
                      {r.adresse ?? `DPE #${r.id}`}
                    </div>
                    <div className="truncate text-xs text-stone-500">
                      {r.code_postal} {r.commune}
                      {r.surface_habitable ? ` · ${formatM2(r.surface_habitable)}` : ''}
                      {r.annee_construction ? ` · ${r.annee_construction}` : ''}
                    </div>
                  </div>
                  {r.etiquette_dpe && (
                    <TypedBadge variant="dpe" color={color} label={r.etiquette_dpe} />
                  )}
                  {r.score_v2 != null && (
                    <span className="text-xs font-medium text-slate-700">
                      {r.score_v2}/100
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
