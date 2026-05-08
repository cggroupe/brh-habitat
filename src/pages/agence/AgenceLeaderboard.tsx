/**
 * Phase 11.7 — Leaderboard agences Bretagne (refonte UX MLM 2026-05-08).
 *
 * Visible par toutes les agences signataires d'une charte BRH active.
 * 3 fenêtres temporelles (30j / 90j / 12 mois). Mise en évidence "vous".
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ArrowRight, Crown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { agenceLeaderboardApi, type LeaderboardWindow } from '@/api/agence-leaderboard'

const WINDOWS: { v: LeaderboardWindow; l: string }[] = [
  { v: 30, l: '30 jours' },
  { v: 90, l: '90 jours' },
  { v: 365, l: '12 mois' },
]

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-50 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-300',
  gold: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  platinum: 'bg-violet-50 text-violet-800 border-violet-300',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
}

export default function AgenceLeaderboard() {
  const [windowDays, setWindowDays] = useState<LeaderboardWindow>(30)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['agence-leaderboard', windowDays] as const,
    queryFn: () => agenceLeaderboardApi.list(windowDays, 50),
    staleTime: 60_000,
  })

  const myRank = rows.find((r) => r.is_me)?.rank ?? null
  const totalAgences = rows.length

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-deep flex items-center justify-center">
          <Trophy size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-semibold text-text">
            Classement Bretagne
          </h1>
          <p className="text-[12px] text-text-muted mt-0.5">
            Top agences par leads claimés sur {WINDOWS.find((w) => w.v === windowDays)?.l}
          </p>
        </div>
      </div>

      {/* Filtre période */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-text-muted font-medium">Période :</span>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.v}
              type="button"
              onClick={() => setWindowDays(w.v)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                windowDays === w.v
                  ? 'bg-text text-surface'
                  : 'text-text-muted hover:text-text hover:bg-surface-low'
              }`}
            >
              {w.l}
            </button>
          ))}
        </div>
      </div>

      {/* Ma position highlight (si dans le top 50) */}
      {myRank && (
        <div className="bg-brand-soft border border-brand/20 rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-display font-semibold text-[14px]">
            #{myRank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-text">
              Vous êtes #{myRank} sur {totalAgences} agences
            </p>
            <p className="text-[12px] text-text-muted">
              Top {Math.round((myRank / totalAgences) * 100)}% de votre cohorte ·{' '}
              {WINDOWS.find((w) => w.v === windowDays)?.l}
            </p>
          </div>
          {myRank > 1 && (
            <div className="text-right">
              <p className="text-[11px] text-text-muted">Pour gagner 1 place</p>
              <p className="text-[12px] font-semibold text-text">
                +{(rows[myRank - 2]?.leads_claimed ?? 0) - (rows[myRank - 1]?.leads_claimed ?? 0) + 1} lead
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tableau leaderboard */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-surface-low border-b border-border">
              <tr className="text-text-muted font-semibold text-left">
                <th className="px-3 py-2.5 w-12">Rang</th>
                <th className="px-3 py-2.5">Agence</th>
                <th className="px-3 py-2.5">Commune</th>
                <th className="px-3 py-2.5 text-right">Leads (période)</th>
                <th className="px-3 py-2.5 text-right">Chantiers</th>
                <th className="px-3 py-2.5">Palier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-3 py-3">
                      <div className="h-3 bg-surface-low rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-text-muted">
                    <Trophy size={20} className="mx-auto text-text-subtle mb-2" />
                    <p className="text-[13px] font-medium text-text mb-1">Pas encore de classement</p>
                    <p className="text-[12px]">Le classement s'active avec les premiers leads claimés.</p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.agence_id}
                    className={`transition-colors ${
                      r.is_me
                        ? 'bg-brand-soft hover:bg-brand-soft'
                        : 'hover:bg-surface-low'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[12px] font-semibold ${
                          r.rank <= 3
                            ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                            : r.is_me
                            ? 'bg-brand text-white'
                            : 'bg-surface-low text-text-muted'
                        }`}
                      >
                        {r.rank <= 3 ? <Crown size={14} /> : r.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className={`text-[13px] ${r.is_me ? 'font-semibold' : 'font-medium'} text-text`}>
                        {r.raison_sociale}
                        {r.is_me && (
                          <span className="ml-2 text-[11px] text-brand font-semibold">
                            (vous)
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-text-muted">
                      {r.commune ?? '—'}
                      {r.departement && ` (${r.departement})`}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className="font-semibold text-text">{r.leads_claimed}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-text-muted">
                      {r.contributions_count}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          TIER_COLORS[r.tier] ?? TIER_COLORS.bronze
                        }`}
                      >
                        {TIER_LABELS[r.tier] ?? r.tier}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state CTA */}
      {!isLoading && rows.length > 0 && myRank === null && (
        <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-text">
              Vous n'apparaissez pas dans le top 50
            </p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Claimez votre premier lead pour rejoindre le classement.
            </p>
          </div>
          <Link
            to="/agence/score-vente"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-text text-surface text-[12px] font-semibold hover:bg-text-muted transition-colors"
          >
            Explorer Score Vente
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}
