/**
 * Phase 16.0.3 — Page admin `/admin/score-vente`.
 *
 * Vue interne BRH du scoring vente v1 sur les 59k prospects DPE F/G.
 * Sert à valider la qualité prédictive AVANT d'ouvrir aux agences.
 *
 * Modèle Hoguet "A" (vendeur de leads scorés, pas de transaction) :
 *   - Lecture interne uniquement, pas d'export tier
 *   - Phase 16.0.6 ouvrira la lecture filtrée aux agences sous contrat
 */
import { useState } from 'react'
import {
  TrendingUp,
  Filter,
  Loader,
  Sparkles,
  Info,
} from 'lucide-react'
import { useScoreVenteList, useScoreVenteStats } from '@/hooks/queries/score-vente'
import { SCORE_VENTE_RULES_DOC, type ScoreVenteSegment } from '@/lib/dpe-engine/score-vente'

const SEGMENT_LABELS: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'Très chaud',
  chaud: 'Chaud',
  tiede: 'Tiède',
  froid: 'Froid',
}

const SEGMENT_COLORS: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'bg-red-100 text-red-800 border-red-200',
  chaud: 'bg-orange-100 text-orange-800 border-orange-200',
  tiede: 'bg-amber-100 text-amber-800 border-amber-200',
  froid: 'bg-gray-100 text-gray-700 border-gray-200',
}

const SEGMENT_BG: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'bg-gradient-to-br from-red-500 to-red-600',
  chaud: 'bg-gradient-to-br from-orange-500 to-orange-600',
  tiede: 'bg-gradient-to-br from-amber-500 to-amber-600',
  froid: 'bg-gradient-to-br from-gray-400 to-gray-500',
}

export default function AdminScoreVente() {
  const [filterSegment, setFilterSegment] = useState<ScoreVenteSegment | ''>('')
  const [filterDept, setFilterDept] = useState('')
  const [minScore, setMinScore] = useState('')
  const [showRulesPanel, setShowRulesPanel] = useState(false)

  const { data: rows = [], isLoading } = useScoreVenteList({
    segment: filterSegment || undefined,
    departement: filterDept || undefined,
    minScore: minScore ? Number(minScore) : undefined,
    limit: 300,
  })

  const { data: stats } = useScoreVenteStats()
  const totalScored = stats
    ? Object.values(stats).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <TrendingUp className="text-primary" size={24} />
            Score Vente Agences (v1)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Algo heuristique 13 règles · usage interne BRH avant ouverture agences (Phase 16).
            Modèle Hoguet "A" — leads scorés, pas de transaction.
          </p>
        </div>
        <button
          onClick={() => setShowRulesPanel((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <Info size={16} /> {showRulesPanel ? 'Masquer' : 'Voir'} les 13 règles
        </button>
      </header>

      {/* KPI cards par segment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['tres_chaud', 'chaud', 'tiede', 'froid'] as const).map((seg) => (
          <div
            key={seg}
            className={`${SEGMENT_BG[seg]} rounded-2xl p-5 text-white shadow-sm`}
          >
            <p className="text-xs uppercase tracking-wider opacity-80">
              {SEGMENT_LABELS[seg]}
            </p>
            <p className="text-3xl font-bold mt-2 tabular-nums">
              {stats?.[seg]?.toLocaleString('fr-FR') ?? '—'}
            </p>
            <p className="text-xs opacity-70 mt-1">
              {totalScored > 0 && stats
                ? `${Math.round((stats[seg] / totalScored) * 100)} % du total`
                : 'Calcul…'}
            </p>
          </div>
        ))}
      </div>

      {/* Panneau règles */}
      {showRulesPanel && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-3">
            Règles heuristiques v1.0
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {SCORE_VENTE_RULES_DOC.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <span>{r.label}</span>
                <span
                  className={`font-mono text-xs ${
                    r.max_points > 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {r.max_points > 0 ? '+' : ''}
                  {r.max_points} pts
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">
            Score plafonné à 100. Segments : ≥80 très chaud, ≥60 chaud, ≥40 tiède, &lt; 40 froid.
            Probabilités calibrées : 0.65 / 0.40 / 0.20 / 0.05.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <Filter size={18} className="text-gray-400 mt-2" />
        <select
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value as ScoreVenteSegment | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous segments</option>
          {(['tres_chaud', 'chaud', 'tiede', 'froid'] as const).map((s) => (
            <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          placeholder="Dept (29, 35…)"
          maxLength={2}
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <input
          type="number"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          placeholder="Score min."
          min={0}
          max={100}
          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <p className="text-xs text-gray-500 ml-auto self-center">
          {rows.length} résultats
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Sparkles className="mx-auto mb-3 text-gray-300" size={32} />
          <p className="text-gray-600">
            Aucun prospect scoré pour ces filtres.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Lancer le batch : <code>scripts/score-vente/batch.ts</code> (à venir Phase 16.0.x)
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr className="text-left">
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Proba 6m</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">DPE</th>
                <th className="px-4 py-3">Surface</th>
                <th className="px-4 py-3">Règles déclenchées</th>
                <th className="px-4 py-3 text-xs">Calculé</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.prospect_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold tabular-nums">
                      {r.score ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.segment ? (
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${SEGMENT_COLORS[r.segment]}`}
                      >
                        {SEGMENT_LABELS[r.segment]}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {r.proba_6m != null ? `${Math.round(r.proba_6m * 100)} %` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.prospect?.commune ? (
                      <>
                        <p className="text-sm">{r.prospect.commune}</p>
                        <p className="text-xs text-gray-500">
                          {r.prospect.code_postal} · Dept {r.prospect.departement}
                        </p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        r.prospect?.etiquette_dpe === 'F'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {r.prospect?.etiquette_dpe ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {r.prospect?.surface_habitable ? `${r.prospect.surface_habitable} m²` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(r.rules_breakdown).slice(0, 4).map((rule) => (
                        <span
                          key={rule}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono"
                          title={`+${r.rules_breakdown[rule]} pts`}
                        >
                          {rule.replace(/^r\d+_/, '')}
                        </span>
                      ))}
                      {Object.keys(r.rules_breakdown).length > 4 ? (
                        <span className="text-[10px] text-gray-400">
                          +{Object.keys(r.rules_breakdown).length - 4}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.computed_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
