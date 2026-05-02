/**
 * Phase 11.2 — Page Pro `/pro/prospects-bretagne`
 *
 * Liste filtrable des 59 306 prospects DPE F/G Bretagne avec scoring v2.
 * Affiche segment, score, étiquette DPE, aides MPR, statut DVF mutation 24m.
 *
 * Filtres : segment, dépt, étiquette, plage de score, MPR Bleu actif.
 * Tri : score_v2 DESC par défaut (leads chauds en haut).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader, ExternalLink, Filter, X, Sparkles, MapPin, Layers, Activity } from 'lucide-react'
import {
  useProspectsBretagne,
  useProspectsBretagneCounts,
} from '@/hooks/queries/prospects-bretagne'
import type { ScoreV2Segment } from '@/lib/dpe-engine/external/types'
import { GenerateLetterModal } from '@/components/letters/GenerateLetterModal'
import { BulkGenerateModal } from '@/components/letters/BulkGenerateModal'
import type { ProspectBretagneRow } from '@/api/prospects-bretagne'

const SEGMENT_LABELS: Record<ScoreV2Segment, string> = {
  ultra_chaud: 'Ultra-chaud (>=80)',
  mpr_bleu_prio: 'MPR Bleu prio (50-79)',
  premium: 'Premium (60-79)',
  standard: 'Standard (40-59)',
  cold: 'Froid (<40)',
}

const SEGMENT_COLORS: Record<ScoreV2Segment, string> = {
  ultra_chaud: 'bg-red-100 text-red-900 border-red-300',
  mpr_bleu_prio: 'bg-blue-100 text-blue-900 border-blue-300',
  premium: 'bg-purple-100 text-purple-900 border-purple-300',
  standard: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  cold: 'bg-gray-100 text-gray-700 border-gray-300',
}

const ETIQUETTE_BG: Record<string, string> = {
  A: 'bg-[#319834] text-white',
  B: 'bg-[#33CC33] text-white',
  C: 'bg-[#CCCC33] text-black',
  D: 'bg-[#FFCC33] text-black',
  E: 'bg-[#FF9933] text-white',
  F: 'bg-[#FF6633] text-white',
  G: 'bg-[#FF3333] text-white',
}

export default function ProProspectsBretagne() {
  const [segment, setSegment] = useState<ScoreV2Segment | ''>('')
  const [dept, setDept] = useState<'22' | '29' | '35' | '56' | ''>('')
  const [scoreMin, setScoreMin] = useState<number | ''>('')
  const [hasMprBleu, setHasMprBleu] = useState(false)
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [letterProspect, setLetterProspect] = useState<ProspectBretagneRow | null>(null)
  const [bulkProspects, setBulkProspects] = useState<ProspectBretagneRow[] | null>(null)
  const PAGE_SIZE = 50

  const filters = {
    segment: segment || undefined,
    departement: dept || undefined,
    scoreMin: scoreMin === '' ? undefined : Number(scoreMin),
    hasMprBleu: hasMprBleu || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    orderBy: 'score_v2' as const,
    orderDir: 'desc' as const,
  }

  const { data, isLoading } = useProspectsBretagne(filters)
  const { data: counts } = useProspectsBretagneCounts({ departement: dept || undefined })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 0

  const resetFilters = () => {
    setSegment('')
    setDept('')
    setScoreMin('')
    setHasMprBleu(false)
    setPage(0)
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects DPE Bretagne</h1>
          <p className="mt-1 text-sm text-gray-600">
            59 306 logements F/G — scoring composite v2 (sources externes 27)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && data.rows.length > 0 && (
            <button
              type="button"
              onClick={() => setBulkProspects(data.rows.slice(0, Math.min(50, data.rows.length)))}
              className="inline-flex items-center gap-2 rounded-md bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800"
              title={`Générer un courrier IA pour les ${Math.min(50, data.rows.length)} top prospects de la page`}
            >
              <Layers className="h-4 w-4" />
              Bulk top {Math.min(50, data.rows.length)}
            </button>
          )}
          <Link
            to="/pro/analytics"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Dashboard analytique"
          >
            <Activity className="h-4 w-4" /> Analytics
          </Link>
          <Link
            to="/pro/prospects-carte"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Carte chaleur Bretagne"
          >
            <MapPin className="h-4 w-4" /> Carte
          </Link>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filtres
          </button>
        </div>
      </div>

      {/* Cards résumé par segment */}
      {counts && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {(['ultra_chaud', 'mpr_bleu_prio', 'premium', 'standard', 'cold'] as const).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => setSegment(segment === seg ? '' : seg)}
              className={`rounded-lg border p-3 text-left transition ${
                segment === seg ? SEGMENT_COLORS[seg] : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {SEGMENT_LABELS[seg]}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {(counts[seg] ?? 0).toLocaleString('fr-FR')}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filtres avancés */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Département</span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value as typeof dept)}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Tous (22/29/35/56)</option>
                <option value="22">22 — Côtes-d'Armor</option>
                <option value="29">29 — Finistère</option>
                <option value="35">35 — Ille-et-Vilaine</option>
                <option value="56">56 — Morbihan</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Score min (0-100)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={scoreMin}
                onChange={(e) => setScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-md border-gray-300 text-sm"
                placeholder="0"
              />
            </label>
            <label className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                checked={hasMprBleu}
                onChange={(e) => setHasMprBleu(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">MPR Bleu disponible</span>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Aucun prospect trouvé avec ces filtres.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Score</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">DPE</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Adresse</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Surface</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Conso</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">MPR Bleu</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Signaux</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {p.score_v2_segment && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          SEGMENT_COLORS[p.score_v2_segment]
                        }`}
                      >
                        {p.score_v2 ?? '–'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {p.etiquette_dpe && (
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                          ETIQUETTE_BG[p.etiquette_dpe] ?? 'bg-gray-200'
                        }`}
                      >
                        {p.etiquette_dpe}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{p.adresse_ban ?? '–'}</div>
                    <div className="text-xs text-gray-500">
                      {p.code_postal} {p.commune}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{p.type_batiment ?? '–'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {p.surface_habitable ? `${Math.round(p.surface_habitable)} m²` : '–'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {p.conso_m2_ep ? `${Math.round(p.conso_m2_ep)} kWh/m²` : '–'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {p.mpr_bleu_total != null
                      ? `${Math.round(p.mpr_bleu_total).toLocaleString('fr-FR')} €`
                      : '–'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.dvf_mutation_24m && (
                        <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-900">
                          DVF 24m
                        </span>
                      )}
                      {p.abf_required && (
                        <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-900">
                          ABF
                        </span>
                      )}
                      {(p.enedis_kwh_logt ?? 0) > 250 && (
                        <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-900">
                          Enedis &gt;250
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLetterProspect(p)}
                        className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-900 hover:bg-purple-200"
                        title="Générer un courrier IA personnalisé (Claude Opus 4.7)"
                      >
                        <Sparkles className="h-3 w-3" /> Courrier IA
                      </button>
                      <Link
                        to={`/pro/prospects/${p.id}`}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                      >
                        Détail <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal courrier IA */}
      {letterProspect && (
        <GenerateLetterModal
          prospect={letterProspect}
          onClose={() => setLetterProspect(null)}
        />
      )}

      {/* Modal bulk */}
      {bulkProspects && (
        <BulkGenerateModal prospects={bulkProspects} onClose={() => setBulkProspects(null)} />
      )}

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Page {page + 1} / {totalPages} — {data.total.toLocaleString('fr-FR')} prospects
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page + 1 >= totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
