/**
 * Phase 16.0.6/8 — Page `/agence/score-vente` : opportunités à claim.
 *
 * Refonte 2026-05-04 : KPI dashboard + map Leaflet + table compacte.
 */
import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Sparkles,
  Loader,
  Filter,
  Lock,
  CheckCircle2,
  Flame,
  ThermometerSun,
  Map as MapIcon,
  AlertTriangle,
} from 'lucide-react'
import { useScoreVenteList, useScoreVenteStats } from '@/hooks/queries/score-vente'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyAgenceSubscription,
  useClaimLeadAtomic,
} from '@/hooks/queries/agence-subscriptions'
import { useLeadAssignments } from '@/hooks/queries/lead-assignments'
import { TIER_LABELS } from '@/api/agence-subscriptions'
import type { ScoreVenteSegment } from '@/lib/dpe-engine/score-vente'

const SEGMENT_BADGE: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'bg-red-100 text-red-800 border-red-200',
  chaud: 'bg-orange-100 text-orange-800 border-orange-200',
  tiede: 'bg-amber-100 text-amber-800 border-amber-200',
  froid: 'bg-gray-100 text-gray-700 border-gray-200',
}

const SEGMENT_LABELS: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'Très chaud',
  chaud: 'Chaud',
  tiede: 'Tiède',
  froid: 'Froid',
}

const SEGMENT_COLORS: Record<ScoreVenteSegment, string> = {
  tres_chaud: '#dc2626',
  chaud: '#ea580c',
  tiede: '#d97706',
  froid: '#6b7280',
}

const BZH_CENTER: [number, number] = [48.2, -3.0]
const BZH_ZOOM = 8

export default function AgenceScoreVente() {
  const { data: membership } = useMyAgenceMembership()
  const { data: subscription } = useMyAgenceSubscription()
  const { data: stats } = useScoreVenteStats()
  const claimMut = useClaimLeadAtomic()

  const [filterSegment, setFilterSegment] = useState<ScoreVenteSegment | ''>('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState<number | null>(null)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)

  const { data: rows = [], isLoading } = useScoreVenteList({
    segment: filterSegment || undefined,
    departement: filterDept || undefined,
    minScore: 60,
    limit: 200,
  })

  const { data: activeAssignments = [] } = useLeadAssignments({ limit: 500 })
  const claimedIds = useMemo(
    () => new Set(activeAssignments.map((a) => a.prospect_id)),
    [activeAssignments],
  )

  const remaining =
    subscription?.monthly_lead_quota === null
      ? null
      : (subscription?.monthly_lead_quota ?? 0) -
        (subscription?.current_month_claims ?? 0)
  const quotaLow = remaining !== null && remaining <= 2
  const quotaExhausted = remaining !== null && remaining <= 0

  const mapPoints = useMemo(
    () =>
      rows
        .filter((r) => r.prospect?.latitude && r.prospect?.longitude)
        .map((r) => ({
          id: r.prospect_id,
          lat: r.prospect!.latitude!,
          lng: r.prospect!.longitude!,
          score: r.score ?? 0,
          segment: r.segment ?? 'froid',
          commune: r.prospect?.commune,
          dpe: r.prospect?.etiquette_dpe,
          surface: r.prospect?.surface_habitable,
          claimed: claimedIds.has(r.prospect_id),
        })),
    [rows, claimedIds],
  )

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
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <Flame size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Score Vente — Opportunités</h1>
            <p className="text-sm text-gray-500">
              Propriétaires F/G Bretagne · score ≥ 60 · exclusivité 30j sur claim
            </p>
          </div>
        </div>
      </header>

      {/* KPI cards : segments + quota */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Très chaud"
          value={stats?.tres_chaud ?? 0}
          hint="Score ≥ 80"
          icon={<Flame size={18} />}
          accent="from-red-500 to-red-600"
          onClick={() => setFilterSegment(filterSegment === 'tres_chaud' ? '' : 'tres_chaud')}
          active={filterSegment === 'tres_chaud'}
        />
        <KpiCard
          label="Chaud"
          value={stats?.chaud ?? 0}
          hint="Score 60-79"
          icon={<ThermometerSun size={18} />}
          accent="from-orange-500 to-orange-600"
          onClick={() => setFilterSegment(filterSegment === 'chaud' ? '' : 'chaud')}
          active={filterSegment === 'chaud'}
        />
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Mes claims ce mois
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {subscription?.current_month_claims ?? 0}
            <span className="text-base text-slate-400 font-normal ml-1">
              / {subscription?.monthly_lead_quota ?? '∞'}
            </span>
          </p>
          {subscription ? (
            <p className="text-[11px] text-slate-500 mt-1">
              Palier {TIER_LABELS[subscription.tier]}
            </p>
          ) : null}
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            quotaExhausted
              ? 'bg-red-50 border-red-200'
              : quotaLow
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p className="text-xs uppercase tracking-wider font-semibold mb-1">
            Quota restant
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {remaining === null ? '∞' : remaining}
          </p>
          {quotaExhausted ? (
            <p className="text-[11px] text-red-700 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} /> Quota atteint
            </p>
          ) : quotaLow ? (
            <p className="text-[11px] text-amber-700 mt-1">⚠ Bientôt à zéro</p>
          ) : (
            <p className="text-[11px] text-emerald-700 mt-1">Disponible</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={18} className="text-slate-400" />
        <select
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value as ScoreVenteSegment | '')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="">Tous segments (≥ 60)</option>
          <option value="tres_chaud">Très chaud (≥ 80)</option>
          <option value="chaud">Chaud (60-79)</option>
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="">Tous départements</option>
          <option value="22">Côtes-d'Armor (22)</option>
          <option value="29">Finistère (29)</option>
          <option value="35">Ille-et-Vilaine (35)</option>
          <option value="56">Morbihan (56)</option>
        </select>
        <p className="text-xs text-slate-500 ml-auto">
          {rows.length} affichés · {mapPoints.length} géolocalisés
        </p>
      </div>

      {claimError ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {claimError}
        </div>
      ) : null}

      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Carte des opportunités</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <Legend color={SEGMENT_COLORS.tres_chaud} label="Très chaud" />
            <Legend color={SEGMENT_COLORS.chaud} label="Chaud" />
            <Legend color="#94a3b8" label="Déjà claim" />
          </div>
        </div>
        <div style={{ height: '420px', width: '100%' }}>
          <MapContainer
            center={BZH_CENTER}
            zoom={BZH_ZOOM}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapPoints.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={p.segment === 'tres_chaud' ? 7 : 5}
                pathOptions={{
                  color: p.claimed ? '#94a3b8' : SEGMENT_COLORS[p.segment as ScoreVenteSegment],
                  fillColor: p.claimed ? '#94a3b8' : SEGMENT_COLORS[p.segment as ScoreVenteSegment],
                  fillOpacity: highlightedId === p.id ? 1 : 0.7,
                  weight: highlightedId === p.id ? 3 : 1,
                }}
                eventHandlers={{ click: () => setHighlightedId(p.id) }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">
                      Score {p.score} · DPE {p.dpe}
                    </p>
                    <p>{p.commune}</p>
                    <p className="text-slate-500">{p.surface ? `${p.surface} m²` : ''}</p>
                    {!p.claimed && !quotaExhausted ? (
                      <button
                        type="button"
                        onClick={() => void handleClaim(p.id)}
                        disabled={claimMut.isPending}
                        className="mt-2 w-full px-3 py-1.5 text-[11px] font-semibold bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                      >
                        {claimMut.isPending ? '…' : 'Claim ce lead'}
                      </button>
                    ) : p.claimed ? (
                      <span className="text-slate-500">Déjà réservé</span>
                    ) : (
                      <span className="text-red-600">Quota atteint</span>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-orange-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Sparkles className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-slate-600">Aucune opportunité disponible pour ces filtres.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Liste détaillée</span>
            <span className="text-[11px] text-slate-500">
              Trié par score décroissant
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr className="text-left">
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">DPE</th>
                  <th className="px-4 py-3">Bâti</th>
                  <th className="px-4 py-3">Proba 6m</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const alreadyClaimed = claimedIds.has(r.prospect_id)
                  const justDone = justClaimed === r.prospect_id
                  const isHighlighted = highlightedId === r.prospect_id
                  return (
                    <tr
                      key={r.prospect_id}
                      onMouseEnter={() => setHighlightedId(r.prospect_id)}
                      onMouseLeave={() => setHighlightedId(null)}
                      className={`hover:bg-slate-50 transition ${
                        isHighlighted ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tabular-nums">{r.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.segment ? (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs ${SEGMENT_BADGE[r.segment]}`}
                          >
                            {SEGMENT_LABELS[r.segment]}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.prospect?.commune ? (
                          <>
                            <p className="font-medium text-slate-800">{r.prospect.commune}</p>
                            <p className="text-[11px] text-slate-500">
                              {r.prospect.code_postal} · Dept {r.prospect.departement}
                            </p>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            r.prospect?.etiquette_dpe === 'F'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.prospect?.etiquette_dpe ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.prospect?.surface_habitable ? (
                          <>
                            <p className="font-medium tabular-nums">
                              {r.prospect.surface_habitable} m²
                            </p>
                            {r.prospect.annee_construction ? (
                              <p className="text-[11px] text-slate-500">
                                {r.prospect.annee_construction}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {r.proba_6m != null ? `${Math.round(r.proba_6m * 100)} %` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {justDone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle2 size={14} /> Claimé
                          </span>
                        ) : alreadyClaimed ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Lock size={14} /> Déjà claim
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClaim(r.prospect_id)}
                            disabled={claimMut.isPending || quotaExhausted}
                            className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-md hover:shadow-md hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {claimMut.isPending ? '…' : 'Claim'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  onClick,
  active,
}: {
  label: string
  value: number
  hint: string
  icon: React.ReactNode
  accent: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative bg-white rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
        active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold tabular-nums">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
        </div>
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center text-white shrink-0`}
        >
          {icon}
        </div>
      </div>
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
