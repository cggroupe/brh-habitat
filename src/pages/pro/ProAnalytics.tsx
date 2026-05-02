/**
 * Phase 14 — Dashboard analytique pro BRH.
 *
 * KPIs temps réel pour démontrer le ROI du SaaS BRH :
 *   - Total prospects scorés + breakdown par segment (avec heatmap visuelle)
 *   - MPR potentiel total € (somme aides identifiées sur ultra-chauds)
 *   - Courriers IA générés + cost monitoring + cache hit rate
 *   - Top 10 ultra-chauds (cliquable → courrier IA)
 *   - Trend 7j courriers générés (LineChart recharts)
 *   - Funnel : prospects scorés → enrichis → DVF → courriers générés → envoyés
 */

import { Link } from 'react-router-dom'
import {
  TrendingUp,
  MapPin,
  Sparkles,
  Euro,
  Users,
  Activity,
  Loader,
  CreditCard,
  Wrench,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  useAnalyticsOverview,
  useAnalyticsAides,
  useAnalyticsLetters,
  useAnalyticsTopProspects,
} from '@/hooks/queries/pro-analytics'
import type { ScoreV2Segment } from '@/lib/dpe-engine/external/types'

const SEGMENT_LABELS: Record<ScoreV2Segment, string> = {
  ultra_chaud: 'Ultra-chaud',
  mpr_bleu_prio: 'MPR Bleu prio',
  premium: 'Premium',
  standard: 'Standard',
  cold: 'Froid',
}

const SEGMENT_COLORS: Record<ScoreV2Segment, string> = {
  ultra_chaud: '#dc2626',
  mpr_bleu_prio: '#2563eb',
  premium: '#9333ea',
  standard: '#ca8a04',
  cold: '#6b7280',
}

function formatEuro(n: number | undefined): string {
  if (!n || !Number.isFinite(n)) return '0 €'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M€`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`
  return `${Math.round(n).toLocaleString('fr-FR')} €`
}

function formatNumber(n: number | undefined): string {
  if (!n || !Number.isFinite(n)) return '0'
  return n.toLocaleString('fr-FR')
}

export default function ProAnalytics() {
  const { data: overview, isLoading: ovLoading } = useAnalyticsOverview()
  const { data: aides, isLoading: aidesLoading } = useAnalyticsAides()
  const { data: letters, isLoading: lettersLoading } = useAnalyticsLetters()
  const { data: top, isLoading: topLoading } = useAnalyticsTopProspects(10)

  const segmentChartData = overview
    ? (Object.keys(overview.segments) as ScoreV2Segment[]).map((seg) => ({
        name: SEGMENT_LABELS[seg],
        value: overview.segments[seg],
        color: SEGMENT_COLORS[seg],
      }))
    : []

  const enrichRate =
    overview && overview.totalScored > 0
      ? Math.round((overview.totalEnriched / overview.totalScored) * 100)
      : 0

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Activity className="h-6 w-6 text-blue-700" /> Dashboard analytique
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vue temps réel du moteur prospection BRH (sources externes + scoring v2 + IA)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/pro/prospects-bretagne"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Users className="h-3 w-3" /> Prospects
          </Link>
          <Link
            to="/pro/prospects-carte"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <MapPin className="h-3 w-3" /> Carte
          </Link>
          <Link
            to="/pro/marketplace-artisans"
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            <Wrench className="h-3 w-3" /> Artisans
          </Link>
          <Link
            to="/pro/abonnement"
            className="inline-flex items-center gap-1 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-800"
          >
            <CreditCard className="h-3 w-3" /> Abonnement
          </Link>
        </div>
      </div>

      {/* Cards KPI principales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Prospects scorés v2"
          value={formatNumber(overview?.totalScored)}
          sub={`sur 59 306 BZH (${overview?.totalScored ? Math.round((overview.totalScored / 59306) * 100) : 0}%)`}
          color="blue"
          loading={ovLoading}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Ultra-chauds + Bleu prio"
          value={formatNumber(
            (overview?.segments.ultra_chaud ?? 0) + (overview?.segments.mpr_bleu_prio ?? 0),
          )}
          sub="leads chauds prioritaires"
          color="red"
          loading={ovLoading}
        />
        <KpiCard
          icon={<Euro className="h-5 w-5" />}
          label="MPR potentiel total"
          value={formatEuro(aides?.grandTotalEur)}
          sub={`sur ${formatNumber(aides?.countMprBleu)} prospects MPR Bleu`}
          color="green"
          loading={aidesLoading}
        />
        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Courriers IA générés"
          value={formatNumber(letters?.total)}
          sub={`${letters?.thisWeek ?? 0} cette semaine · ${formatEuro(letters?.costEstimateEur)} cost`}
          color="purple"
          loading={lettersLoading}
        />
      </div>

      {/* Funnel */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
          Funnel d&apos;activation
        </h2>
        <div className="flex flex-col gap-2 md:flex-row">
          <FunnelStage
            label="DPE F/G BZH"
            value={59_306}
            pct={100}
            color="bg-gray-500"
          />
          <FunnelStage
            label="Scorés v2"
            value={overview?.totalScored ?? 0}
            pct={overview ? (overview.totalScored / 59_306) * 100 : 0}
            color="bg-blue-500"
          />
          <FunnelStage
            label="IRIS enrichis"
            value={overview?.totalEnriched ?? 0}
            pct={enrichRate}
            color="bg-cyan-500"
          />
          <FunnelStage
            label="DVF mutation 24m"
            value={overview?.totalDvfRecent ?? 0}
            pct={
              overview && overview.totalScored > 0
                ? (overview.totalDvfRecent / overview.totalScored) * 100
                : 0
            }
            color="bg-orange-500"
          />
          <FunnelStage
            label="Courriers générés"
            value={letters?.total ?? 0}
            pct={
              overview && overview.totalScored > 0
                ? ((letters?.total ?? 0) / overview.totalScored) * 100
                : 0
            }
            color="bg-purple-500"
          />
          <FunnelStage
            label="Envoyés"
            value={letters?.sent ?? 0}
            pct={letters?.total ? (letters.sent / letters.total) * 100 : 0}
            color="bg-green-500"
          />
        </div>
      </div>

      {/* Charts ligne 1 : segments + trend courriers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
            Distribution par segment
          </h2>
          {ovLoading ? (
            <LoaderBox />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={segmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => (typeof v === 'number' ? v.toLocaleString('fr-FR') : String(v))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {segmentChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
            Courriers IA — 7 derniers jours
          </h2>
          {lettersLoading ? (
            <LoaderBox />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={letters?.trend7d ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost monitoring + cache hit */}
      {letters && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-purple-900">
            Cost monitoring IA (Claude Opus 4.7)
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Coût cumulé" value={formatEuro(letters.costEstimateEur)} />
            <Stat
              label="Coût moyen / courrier"
              value={
                letters.total > 0
                  ? formatEuro(letters.costEstimateEur / letters.total)
                  : '—'
              }
            />
            <Stat
              label="Cache hit rate"
              value={`${Math.round(letters.cacheHitRate * 100)}%`}
              sub={letters.cacheHitRate > 0.5 ? 'optimisé ✓' : 'à améliorer'}
            />
            <Stat
              label="Statut envoi"
              value={`${letters.sent}/${letters.total}`}
              sub={`${letters.draft} draft · ${letters.edited} édités`}
            />
          </div>
        </div>
      )}

      {/* Top 10 ultra-chauds */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
          Top 10 prospects ultra-chauds
        </h2>
        {topLoading ? (
          <LoaderBox />
        ) : !top || top.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            Aucun prospect scoré pour l&apos;instant. Lancez les scripts seed + batch-score-v2.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Commune</th>
                  <th className="px-2 py-2 text-left">DPE</th>
                  <th className="px-2 py-2 text-left">Score</th>
                  <th className="px-2 py-2 text-left">Segment</th>
                  <th className="px-2 py-2 text-right">MPR Bleu</th>
                  <th className="px-2 py-2 text-right">MPR Jaune</th>
                  <th className="px-2 py-2 text-right">MPR Violet</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {top.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 font-mono text-xs text-gray-500">{p.id}</td>
                    <td className="px-2 py-2 text-gray-900">{p.commune ?? '–'}</td>
                    <td className="px-2 py-2">
                      <span className="rounded bg-red-100 px-1.5 text-xs font-bold text-red-900">
                        {p.etiquette ?? '?'}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-bold tabular-nums">{p.score}</td>
                    <td className="px-2 py-2">
                      {p.segment && (
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: `${SEGMENT_COLORS[p.segment]}22`,
                            color: SEGMENT_COLORS[p.segment],
                          }}
                        >
                          {SEGMENT_LABELS[p.segment]}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-xs">
                      {p.mpr_bleu_total ? formatEuro(p.mpr_bleu_total) : '–'}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-xs">
                      {p.mpr_jaune_total ? formatEuro(p.mpr_jaune_total) : '–'}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-xs">
                      {p.mpr_violet_total ? formatEuro(p.mpr_violet_total) : '–'}
                    </td>
                    <td className="px-2 py-2">
                      <Link
                        to={`/pro/prospects/${p.id}`}
                        className="text-xs text-blue-700 hover:text-blue-900"
                      >
                        Détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: 'blue' | 'red' | 'green' | 'purple'
  loading?: boolean
}) {
  const colors: Record<typeof color, string> = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className={`rounded-md p-1.5 ${colors[color]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
        {loading ? '…' : value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

function FunnelStage({
  label,
  value,
  pct,
  color,
}: {
  label: string
  value: number
  pct: number
  color: string
}) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold tabular-nums text-gray-900">{value.toLocaleString('fr-FR')}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-0.5 text-right text-[10px] text-gray-500">{pct.toFixed(1)}%</div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-purple-700">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-purple-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-purple-600">{sub}</div>}
    </div>
  )
}

function LoaderBox() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}

