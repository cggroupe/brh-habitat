/**
 * Phase 11.7 (Stitch design 2026-05-08) — Leaderboard agences Bretagne.
 *
 * Layout matché au screenshot Stitch /root/.../app/.stitch/designs/leaderboard.png
 * (Editorial Habitat — banner ma position vert profond + table top 50 + tier cards bas).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Crown, Award } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { agenceLeaderboardApi, type LeaderboardWindow } from '@/api/agence-leaderboard'

const WINDOWS: { v: LeaderboardWindow; l: string }[] = [
  { v: 30, l: '30 jours' },
  { v: 90, l: '90 jours' },
  { v: 365, l: '12 mois' },
]

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  bronze: { bg: '#fef3c7', text: '#92400e' },
  silver: { bg: '#e7e5e4', text: '#44403c' },
  gold: { bg: '#fef3c7', text: '#a16207' },
  platinum: { bg: '#ede9fe', text: '#6d28d9' },
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
}

export default function AgenceLeaderboard() {
  const [windowDays, setWindowDays] = useState<LeaderboardWindow>(30)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['agence-leaderboard', windowDays] as const,
    queryFn: () => agenceLeaderboardApi.list(windowDays, 50),
    staleTime: 60_000,
  })

  const myRow = rows.find((r) => r.is_me)
  const myRank = myRow?.rank ?? null
  const totalAgences = rows.length

  // Top 4 + ma ligne (si pas dans top 4)
  const top4 = rows.slice(0, 4)
  const showMeRow = myRow && myRank && myRank > 4

  return (
    <div className="px-10 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <Trophy size={20} className="text-success" strokeWidth={1.75} />
        </div>
        <h1
          className="font-display text-[34px] font-bold tracking-[0.02em] text-text uppercase"
        >
          Classement Bretagne
        </h1>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <p className="text-[14px] text-text-muted ml-13">
          Top agences par leads claimés sur {WINDOWS.find((w) => w.v === windowDays)?.l}
        </p>
        <div className="flex items-center gap-1 bg-surface rounded-full p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.v}
              type="button"
              onClick={() => setWindowDays(w.v)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                windowDays === w.v
                  ? 'text-text'
                  : 'text-text-muted hover:text-text'
              }`}
              style={
                windowDays === w.v ? { backgroundColor: '#fbf9f8' } : undefined
              }
            >
              {w.l}
            </button>
          ))}
        </div>
      </div>

      {/* Banner #12 highlight */}
      {myRow && myRank && (
        <div
          className="rounded-2xl p-6 mb-8 text-white relative overflow-hidden flex items-center gap-6"
          style={{ backgroundColor: '#003404' }}
        >
          <div
            className="w-[88px] h-[88px] rounded-full border-2 border-white/20 flex items-center justify-center font-display font-bold text-[28px] shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            #{myRank}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold leading-tight">
              Vous êtes #{myRank} sur {totalAgences} agences
            </h2>
            <p className="text-[13px] text-white/70 mt-1">
              Top {Math.round((myRank / totalAgences) * 100)} % de votre cohorte régionale
            </p>
          </div>
          {myRank > 1 && (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">
                Prochain objectif
              </p>
              <p className="text-[14px] font-semibold leading-tight">
                Pour gagner 1 place :
                <br />
                +{(rows[myRank - 2]?.leads_claimed ?? 0) -
                  (rows[myRank - 1]?.leads_claimed ?? 0) +
                  1}{' '}
                leads
              </p>
            </div>
          )}
          <Link
            to="/agence/score-vente"
            className="inline-flex items-center px-5 py-3 rounded-full text-[12px] font-bold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: '#fbf9f8', color: '#003404' }}
          >
            Claimer des leads
          </Link>
        </div>
      )}

      {/* Tableau top 50 */}
      <div className="bg-surface rounded-2xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                <th className="px-5 py-4 text-left w-20">Rang</th>
                <th className="px-5 py-4 text-left">Agence</th>
                <th className="px-5 py-4 text-left">Commune</th>
                <th className="px-5 py-4 text-right">Leads</th>
                <th className="px-5 py-4 text-right">Chantiers</th>
                <th className="px-5 py-4 text-left w-32">Palier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-strong/20">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-4 bg-surface-low rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : top4.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                    <Trophy size={24} className="mx-auto text-text-subtle mb-2" />
                    <p className="text-sm font-medium text-text">Pas encore de classement</p>
                    <p className="text-xs">Le classement s’active avec les premiers leads claimés.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {top4.map((r) => (
                    <LeaderboardRow key={r.agence_id} row={r} />
                  ))}
                  {showMeRow && (
                    <>
                      <tr>
                        <td colSpan={6} className="text-center text-text-subtle py-2 text-[10px] tracking-widest">
                          ···
                        </td>
                      </tr>
                      <LeaderboardRow row={myRow} />
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && rows.length > 4 && (
          <div className="px-5 py-3 text-center border-t border-border-strong/20">
            <button
              type="button"
              className="text-[11px] uppercase tracking-widest text-text-muted hover:text-text font-bold"
            >
              Voir les 50 premières agences
            </button>
          </div>
        )}
      </div>

      {/* 4 tier cards bas — éducatif */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TierCard
          label="Palier actuel"
          name="BRONZE"
          color="#92400e"
          hint="Accès prioritaire à 3 leads/jour"
          isMine={currentTierMatches('bronze', myRow?.tier)}
        />
        <TierCard
          label="Objectif silver"
          name="SILVER"
          color="#44403c"
          hint="+3 leads reçus en moins"
          isMine={currentTierMatches('silver', myRow?.tier)}
        />
        <TierCard
          label="Top 10 cohorte"
          name="GOLD"
          color="#a16207"
          hint="Accompagnement marketing BRH"
          isMine={currentTierMatches('gold', myRow?.tier)}
        />
        <TierCard
          label="Le sommet"
          name="PLATINUM"
          color="#6d28d9"
          hint="Participation au Comité Bretagne"
          isMine={currentTierMatches('platinum', myRow?.tier)}
        />
      </div>
    </div>
  )
}

function currentTierMatches(target: string, current: string | undefined): boolean {
  return target === current
}

function LeaderboardRow({ row }: { row: { rank: number; raison_sociale: string; commune: string | null; leads_claimed: number; contributions_count: number; tier: string; is_me: boolean } }) {
  const tierColors = TIER_COLORS[row.tier] ?? TIER_COLORS.bronze
  const isTop3 = row.rank <= 3
  return (
    <tr
      className={`text-[14px] transition-colors ${
        row.is_me ? '' : 'hover:bg-canvas/40'
      }`}
      style={row.is_me ? { backgroundColor: '#dcfce7' } : undefined}
    >
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 font-bold ${
          isTop3 ? 'text-[#a16207]' : row.is_me ? 'text-text' : 'text-text'
        }`}>
          {isTop3 && <Crown size={14} fill="currentColor" />}
          <span className="tabular-nums">
            {String(row.rank).padStart(2, '0')}
          </span>
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text">{row.raison_sociale}</span>
          {row.is_me && (
            <span
              className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: '#003404' }}
            >
              Vous
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-4 text-text-muted">{row.commune ?? '—'}</td>
      <td className="px-5 py-4 text-right tabular-nums font-bold text-text">
        {row.leads_claimed}
      </td>
      <td className="px-5 py-4 text-right tabular-nums font-bold text-text">
        {String(row.contributions_count).padStart(2, '0')}
      </td>
      <td className="px-5 py-4">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: tierColors.bg, color: tierColors.text }}
        >
          {TIER_LABELS[row.tier] ?? row.tier.toUpperCase()}
        </span>
      </td>
    </tr>
  )
}

function TierCard({
  label,
  name,
  color,
  hint,
  isMine,
}: {
  label: string
  name: string
  color: string
  hint: string
  isMine?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${isMine ? 'ring-2 ring-offset-2' : ''}`}
      style={{
        backgroundColor: '#ffffff',
        ...(isMine && { boxShadow: `0 0 0 2px ${color}` }),
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
          {label}
        </p>
        <Award size={14} style={{ color }} strokeWidth={1.75} />
      </div>
      <p
        className="font-display text-2xl font-bold tracking-tight"
        style={{ color }}
      >
        {name}
      </p>
      <p className="text-[12px] text-text-muted mt-1 leading-snug">{hint}</p>
    </div>
  )
}
