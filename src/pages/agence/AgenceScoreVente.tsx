/**
 * Phase 16 — Score Vente Agence (refonte 2026-05-04).
 *
 * Layout map plein écran style "Real-Estate Tool" :
 *   - Map Leaflet full-bleed (heatmap + markers cliquables)
 *   - Sidebar filtres flottante (segment, dept, score min)
 *   - Click marker → panneau détail (adresse complète + DPE + travaux)
 *   - Header KPI (très chauds, chauds, mes claims, quota)
 *   - Tableau compact en bas (collapsible)
 */
import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Sparkles,
  Loader,
  Filter,
  X,
  Flame,
  ThermometerSun,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  CheckCircle2,
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
import type { ScoreVenteRow } from '@/api/score-vente'
import { HeatmapLayer } from '@/components/map/HeatmapLayer'
import { ProspectDetailPanel } from '@/components/agence/ProspectDetailPanel'

const SEGMENT_LABELS: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'Très chaud',
  chaud: 'Chaud',
  tiede: 'Tiède',
  froid: 'Froid',
}

const SEGMENT_BADGE: Record<ScoreVenteSegment, string> = {
  tres_chaud: 'bg-red-100 text-red-800 border-red-200',
  chaud: 'bg-orange-100 text-orange-800 border-orange-200',
  tiede: 'bg-amber-100 text-amber-800 border-amber-200',
  froid: 'bg-gray-100 text-gray-700 border-gray-200',
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
  const [scoreMin, setScoreMin] = useState<number>(60)
  const [showFilters, setShowFilters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [selectedRow, setSelectedRow] = useState<ScoreVenteRow | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  const { data: rows = [], isLoading } = useScoreVenteList({
    segment: filterSegment || undefined,
    departement: filterDept || undefined,
    minScore: scoreMin,
    limit: 500,
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
  const quotaExhausted = remaining !== null && remaining <= 0

  const heatPoints = useMemo(
    () =>
      rows
        .filter((r) => r.prospect?.latitude && r.prospect?.longitude)
        .map((r) => ({
          lat: r.prospect!.latitude!,
          lng: r.prospect!.longitude!,
          intensity: Math.max(0.2, (r.score ?? 0) / 100),
        })),
    [rows],
  )

  const markerRows = useMemo(
    () =>
      rows.filter((r) => r.prospect?.latitude && r.prospect?.longitude),
    [rows],
  )

  async function handleClaim(prospectId: number) {
    if (!membership?.agenceId) return
    setClaimError(null)
    try {
      await claimMut.mutateAsync({ prospectId, agenceId: membership.agenceId })
      setSelectedRow(null)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Erreur claim')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen">
      {/* KPI bar */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 mr-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow">
            <Flame size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-display tracking-tight">Score Vente</h1>
            <p className="text-[11px] text-slate-500">Opportunités F/G Bretagne</p>
          </div>
        </div>

        <KpiPill
          icon={<Flame size={12} />}
          label="Très chauds"
          value={stats?.tres_chaud ?? 0}
          color="bg-red-50 text-red-700"
          active={filterSegment === 'tres_chaud'}
          onClick={() =>
            setFilterSegment(filterSegment === 'tres_chaud' ? '' : 'tres_chaud')
          }
        />
        <KpiPill
          icon={<ThermometerSun size={12} />}
          label="Chauds"
          value={stats?.chaud ?? 0}
          color="bg-orange-50 text-orange-700"
          active={filterSegment === 'chaud'}
          onClick={() => setFilterSegment(filterSegment === 'chaud' ? '' : 'chaud')}
        />
        <div className="text-xs hidden md:flex items-center gap-3 ml-auto">
          {subscription ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Mes claims · {TIER_LABELS[subscription.tier]}
              </p>
              <p className="font-bold tabular-nums text-slate-800">
                {subscription.current_month_claims} / {subscription.monthly_lead_quota ?? '∞'}
                {quotaExhausted ? (
                  <span className="ml-2 text-[11px] text-red-600 font-semibold">
                    Quota atteint
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50"
          >
            <Filter size={12} />
            Filtres
          </button>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50"
          >
            {showTable ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            Tableau
          </button>
        </div>
      </div>

      {claimError ? (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} />
          {claimError}
        </div>
      ) : null}

      {/* Map zone */}
      <div className="relative flex-1 min-h-[380px]">
        {/* Filter sidebar floating */}
        {showFilters ? (
          <div className="absolute top-3 left-3 z-[1000] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Filtres
              </span>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Masquer filtres"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
                  Segment
                </span>
                <select
                  value={filterSegment}
                  onChange={(e) =>
                    setFilterSegment(e.target.value as ScoreVenteSegment | '')
                  }
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                >
                  <option value="">Tous (≥ {scoreMin})</option>
                  <option value="tres_chaud">Très chaud (≥ 80)</option>
                  <option value="chaud">Chaud (60-79)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
                  Département
                </span>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                >
                  <option value="">Toute la Bretagne</option>
                  <option value="22">22 — Côtes-d&apos;Armor</option>
                  <option value="29">29 — Finistère</option>
                  <option value="35">35 — Ille-et-Vilaine</option>
                  <option value="56">56 — Morbihan</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 block">
                  Score minimum : <span className="text-slate-800">{scoreMin}</span>
                </span>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={5}
                  value={scoreMin}
                  onChange={(e) => setScoreMin(Number(e.target.value))}
                  className="w-full"
                />
              </label>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
                  Couches
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="rounded"
                  />
                  <Layers size={12} />
                  <span className="text-xs">Heatmap densité</span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
                  Légende
                </span>
                <div className="space-y-1 text-xs">
                  <Legend color={SEGMENT_COLORS.tres_chaud} label="Très chaud" />
                  <Legend color={SEGMENT_COLORS.chaud} label="Chaud" />
                  <Legend color="#94a3b8" label="Déjà claim" />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                {markerRows.length} biens géolocalisés · {rows.length} affichés
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="absolute top-3 left-3 z-[1000] inline-flex items-center gap-1 px-3 py-2 bg-white shadow-lg rounded-md border border-slate-200 text-xs font-medium hover:bg-slate-50"
          >
            <Filter size={14} /> Filtres
          </button>
        )}

        {/* Loading overlay */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center z-[999] bg-white/40 backdrop-blur-sm">
            <Loader className="animate-spin text-orange-500" size={24} />
          </div>
        ) : null}

        {/* Map */}
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
          {showHeatmap && heatPoints.length > 0 ? <HeatmapLayer points={heatPoints} /> : null}
          {markerRows.map((r) => {
            const isClaimed = claimedIds.has(r.prospect_id)
            return (
              <CircleMarker
                key={r.prospect_id}
                center={[r.prospect!.latitude!, r.prospect!.longitude!]}
                radius={r.segment === 'tres_chaud' ? 7 : 5}
                pathOptions={{
                  color: isClaimed ? '#94a3b8' : SEGMENT_COLORS[r.segment ?? 'froid'],
                  fillColor: isClaimed
                    ? '#94a3b8'
                    : SEGMENT_COLORS[r.segment ?? 'froid'],
                  fillOpacity: 0.7,
                  weight: 1.5,
                }}
                eventHandlers={{ click: () => setSelectedRow(r) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="text-xs">
                    <p className="font-bold">
                      Score {r.score} · DPE {r.prospect?.etiquette_dpe}
                    </p>
                    <p>{r.prospect?.commune}</p>
                    {r.prospect?.surface_habitable ? (
                      <p>
                        {r.prospect.surface_habitable} m²
                        {r.prospect.annee_construction
                          ? ` · ${r.prospect.annee_construction}`
                          : null}
                      </p>
                    ) : null}
                    <p className="text-slate-500 italic">Cliquer pour voir la fiche</p>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Tableau compact (collapsible) */}
      {showTable ? (
        <div className="bg-white border-t border-slate-200 max-h-[40vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
              <tr className="text-left">
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Segment</th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2">DPE</th>
                <th className="px-4 py-2">Surface</th>
                <th className="px-4 py-2">Conso</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 100).map((r) => {
                const isClaimed = claimedIds.has(r.prospect_id)
                return (
                  <tr
                    key={r.prospect_id}
                    onClick={() => setSelectedRow(r)}
                    className="hover:bg-orange-50/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-2 font-mono font-bold tabular-nums">
                      {r.score}
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2">
                      <p className="text-xs text-slate-800 truncate max-w-xs">
                        {r.prospect?.adresse_ban ?? r.prospect?.adresse ?? '—'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {r.prospect?.code_postal} {r.prospect?.commune}
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          r.prospect?.etiquette_dpe === 'F'
                            ? 'bg-orange-500 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {r.prospect?.etiquette_dpe ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums">
                      {r.prospect?.surface_habitable
                        ? `${r.prospect.surface_habitable} m²`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums">
                      {r.prospect?.conso_m2_ep
                        ? `${Math.round(r.prospect.conso_m2_ep)} kWh/m²`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isClaimed ? (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                          <Lock size={12} /> Claim
                        </span>
                      ) : (
                        <span className="text-orange-600 text-xs font-semibold">
                          Voir →
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <Sparkles className="mx-auto mb-2 text-slate-300" size={24} />
              Aucune opportunité disponible pour ces filtres.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Détail prospect (slide-over modal) */}
      {selectedRow ? (
        <ProspectDetailPanel
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onClaim={() => handleClaim(selectedRow.prospect_id)}
          alreadyClaimed={claimedIds.has(selectedRow.prospect_id)}
          quotaExhausted={quotaExhausted}
          isClaiming={claimMut.isPending}
        />
      ) : null}
    </div>
  )
}

function KpiPill({
  icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition ${
        active
          ? 'border-orange-400 ring-2 ring-orange-200 bg-white'
          : `border-slate-200 ${color}`
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="font-bold tabular-nums ml-1">
        {value.toLocaleString('fr-FR')}
      </span>
      {active ? <CheckCircle2 size={11} className="text-orange-600 ml-1" /> : null}
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-700">
      <span
        className="w-3 h-3 rounded-full border border-slate-300"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}
