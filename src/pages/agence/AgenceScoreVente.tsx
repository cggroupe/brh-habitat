/**
 * Phase 16.0.6/8 — Page `/agence/score-vente` : opportunités à claim.
 *
 * Tableau filtré (très_chaud + chaud uniquement, pas froid) avec bouton
 * "Claim ce lead" qui appelle le RPC SQL atomique `brh_grant_lead_claim`
 * (vérifie quota mensuel + crée assignment exclusif 30j).
 */
import { useState } from 'react'
import {
  TrendingUp,
  Sparkles,
  Loader,
  Filter,
  Lock,
  CheckCircle2,
} from 'lucide-react'
import { useScoreVenteList } from '@/hooks/queries/score-vente'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyAgenceSubscription,
  useClaimLeadAtomic,
} from '@/hooks/queries/agence-subscriptions'
import { useLeadAssignments } from '@/hooks/queries/lead-assignments'
import { TIER_LABELS } from '@/api/agence-subscriptions'
import type { ScoreVenteSegment } from '@/lib/dpe-engine/score-vente'

const SEGMENT_BADGE: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'bg-red-100 text-red-800',
  chaud: 'bg-orange-100 text-orange-800',
  tiede: 'bg-amber-100 text-amber-800',
  froid: 'bg-gray-100 text-gray-700',
}

const SEGMENT_LABELS: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'Très chaud',
  chaud: 'Chaud',
  tiede: 'Tiède',
  froid: 'Froid',
}

export default function AgenceScoreVente() {
  const { data: membership } = useMyAgenceMembership()
  const { data: subscription } = useMyAgenceSubscription()
  const claimMut = useClaimLeadAtomic()

  const [filterSegment, setFilterSegment] = useState<ScoreVenteSegment | ''>('')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState<number | null>(null)

  const { data: rows = [], isLoading } = useScoreVenteList({
    segment: filterSegment || undefined,
    minScore: 60, // Discovery + Standard ne voient que chaud + très_chaud
    limit: 100,
  })

  // Liste des prospects DÉJÀ claim (par n'importe quelle agence) pour les marquer
  const { data: activeAssignments = [] } = useLeadAssignments({ limit: 500 })
  const claimedIds = new Set(activeAssignments.map((a) => a.prospect_id))

  const remaining =
    subscription?.monthly_lead_quota === null
      ? null
      : (subscription?.monthly_lead_quota ?? 0) -
        (subscription?.current_month_claims ?? 0)
  const quotaLow = remaining !== null && remaining <= 2

  async function handleClaim(prospectId: number) {
    if (!membership?.agenceId) return
    setClaimError(null)
    try {
      await claimMut.mutateAsync({ prospectId, agenceId: membership.agenceId })
      setJustClaimed(prospectId)
      setTimeout(() => setJustClaimed(null), 3000)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Erreur claim')
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={24} />
            Score Vente — Opportunités
          </h1>
          <p className="text-sm text-gray-600">
            Leads scorés F/G Bretagne · score ≥ 60 affiché · exclusivité 30j sur claim
          </p>
        </div>
        {subscription ? (
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Palier {TIER_LABELS[subscription.tier]} · ce mois
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {subscription.current_month_claims}
              {subscription.monthly_lead_quota !== null
                ? ` / ${subscription.monthly_lead_quota}`
                : ' / ∞'}
            </p>
            {quotaLow ? (
              <p className="text-xs text-amber-600">⚠ Quota presque atteint</p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={18} className="text-gray-400" />
        <select
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value as ScoreVenteSegment | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous segments (≥ 60)</option>
          <option value="tres_chaud">Très chaud uniquement (≥ 80)</option>
          <option value="chaud">Chaud uniquement (60-79)</option>
        </select>
        <p className="text-xs text-gray-500 ml-auto">
          {rows.length} opportunités disponibles
        </p>
      </div>

      {claimError ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {claimError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Sparkles className="mx-auto mb-3 text-gray-300" size={32} />
          <p className="text-gray-600">
            Aucune opportunité disponible pour ces filtres.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr className="text-left">
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">DPE</th>
                <th className="px-4 py-3">Surface</th>
                <th className="px-4 py-3">Proba 6m</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const alreadyClaimed = claimedIds.has(r.prospect_id)
                const justDone = justClaimed === r.prospect_id
                return (
                  <tr key={r.prospect_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold tabular-nums">
                      {r.score}
                    </td>
                    <td className="px-4 py-3">
                      {r.segment ? (
                        <span className={`px-2 py-0.5 rounded text-xs ${SEGMENT_BADGE[r.segment]}`}>
                          {SEGMENT_LABELS[r.segment]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.prospect?.commune ? (
                        <>
                          <p>{r.prospect.commune}</p>
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
                      {r.prospect?.surface_habitable
                        ? `${r.prospect.surface_habitable} m²`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {r.proba_6m != null ? `${Math.round(r.proba_6m * 100)} %` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {justDone ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={14} /> Claimé
                        </span>
                      ) : alreadyClaimed ? (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <Lock size={14} /> Déjà claim
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClaim(r.prospect_id)}
                          disabled={claimMut.isPending || quotaLow === false && remaining === 0}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                          {claimMut.isPending ? '…' : 'Claim ce lead'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
