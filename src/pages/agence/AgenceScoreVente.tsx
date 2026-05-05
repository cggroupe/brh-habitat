/**
 * Phase 16 — Score Vente Agence (clone fidèle simulateur BRH 8915).
 *
 * Layout :
 *   - Topbar : logo + barre adresse BAN + bouton menu/filtres
 *   - Map Leaflet plein écran (heatmap + markers cluster F/G)
 *   - Welcome panel modal (2 actions : étudier mon logement / voir prospects zone)
 *   - Slide-in panel droit : étude prospect (DPE strip + 3 scénarios + aides + claim)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/** Force Leaflet à recalculer sa taille après mount (sinon hauteur 0 dans flex). */
function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 0)
    const t2 = setTimeout(() => map.invalidateSize(), 200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  return null
}
import {
  Search,
  Menu,
  Loader,
  X,
  Flame,
  ThermometerSun,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { useScoreVenteList, useScoreVenteStats } from '@/hooks/queries/score-vente'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyAgenceSubscription,
  useClaimLeadAtomic,
} from '@/hooks/queries/agence-subscriptions'
import { useLeadAssignments } from '@/hooks/queries/lead-assignments'
import { TIER_LABELS } from '@/api/agence-subscriptions'
import { scoreVenteApi } from '@/api/score-vente'
import type { ScoreVenteSegment } from '@/lib/dpe-engine/score-vente'
import { HeatmapLayer } from '@/components/map/HeatmapLayer'
import { ProspectStudyPanel, type ProspectStudy } from '@/components/agence/ProspectStudyPanel'
import { virtualToProspectStudy } from '@/lib/virtual-to-study'

const BZH_CENTER: [number, number] = [48.2, -3.0]
const BZH_ZOOM = 8

const SEGMENT_COLORS: Record<ScoreVenteSegment, string> = {
  tres_chaud: '#dc2626',
  chaud: '#ea580c',
  tiede: '#d97706',
  froid: '#6b7280',
}

interface BanFeature {
  properties: {
    label: string
    context?: string
    postcode?: string
    citycode?: string
  }
  geometry: { coordinates: [number, number] }
}

function FlyTo({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.8 })
  }, [center, zoom, map])
  return null
}

export default function AgenceScoreVente() {
  // Auth + state agence
  const { data: membership } = useMyAgenceMembership()
  const { data: subscription } = useMyAgenceSubscription()
  const { data: stats } = useScoreVenteStats()
  const claimMut = useClaimLeadAtomic()

  // Filtres
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterSegment, setFilterSegment] = useState<ScoreVenteSegment | ''>('')
  const [scoreMin, setScoreMin] = useState<number>(60)
  const [showHeatmap, setShowHeatmap] = useState(true)

  // Welcome — fermé par défaut, ouvre via bouton Menu (pour ne pas masquer la map)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('agence-onboarding-dismissed') === '1'
      : false,
  )

  // Search adresse
  const [addr, setAddr] = useState('')
  const [suggestions, setSuggestions] = useState<BanFeature[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingAddr, setSearchingAddr] = useState(false)
  const debounceRef = useRef<number | null>(null)

  // Détail prospect
  const [study, setStudy] = useState<ProspectStudy | null>(null)
  const [loadingStudy, setLoadingStudy] = useState(false)
  const [studyError, setStudyError] = useState<string | null>(null)

  // Map flyTo
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(
    null,
  )

  // Data
  const { data: rows = [], isLoading } = useScoreVenteList({
    segment: filterSegment || undefined,
    departement: filterDept || undefined,
    minScore: scoreMin,
    limit: 1000,
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
    () => rows.filter((r) => r.prospect?.latitude && r.prospect?.longitude),
    [rows],
  )

  // === Search adresse BAN ===
  function handleAddrInput(value: string) {
    setAddr(value)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchingAddr(false)
      return
    }
    setSearchingAddr(true)
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=8&autocomplete=1`,
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        const features = (data.features ?? []) as BanFeature[]
        setSuggestions(features)
        setShowSuggestions(true)
      } catch (err) {
        console.error('BAN autocomplete failed', err)
        setSuggestions([])
        setShowSuggestions(true)
      } finally {
        setSearchingAddr(false)
      }
    }, 200)
  }

  async function pickSuggestion(f: BanFeature) {
    setAddr(f.properties.label)
    setShowSuggestions(false)
    const [lng, lat] = f.geometry.coordinates
    setFlyTarget({ center: [lat, lng], zoom: 17 })

    // Étude virtuelle BDNB CSTB pour cette adresse (qu'elle soit ou pas dans nos 59k F/G).
    setStudyError(null)
    setLoadingStudy(true)
    try {
      const cp = f.properties.postcode ?? ''
      const dept = cp.slice(0, 2) || null
      const commune = f.properties.context?.split(',')[1]?.trim() ?? null
      const data = (await scoreVenteApi.fetchVirtualStudy({
        q: f.properties.label,
        lat,
        lng,
        cp,
        foyer: 2,
        rfr: 30000,
      })) as Parameters<typeof virtualToProspectStudy>[0]

      const study = virtualToProspectStudy(data, {
        code_postal: cp || undefined,
        commune: commune ?? undefined,
        departement: dept ?? undefined,
      })
      setStudy(study)
    } catch (err) {
      setStudyError(
        err instanceof Error
          ? `Étude virtuelle impossible : ${err.message}`
          : 'Étude virtuelle impossible pour cette adresse',
      )
    } finally {
      setLoadingStudy(false)
    }
  }

  // === Click marker → étude prospect ===
  async function openProspectStudy(prospectId: number, coords: [number, number]) {
    setStudyError(null)
    setLoadingStudy(true)
    setFlyTarget({ center: coords, zoom: 17 })
    try {
      const data = (await scoreVenteApi.fetchProspectStudy(prospectId)) as ProspectStudy
      // Merge iris_code de la row markers (le simulateur ne le renvoie pas)
      const row = markerRows.find((r) => r.prospect_id === prospectId)
      const enrichedStudy: ProspectStudy = {
        ...data,
        iris_code: row?.prospect?.iris_code ?? null,
      }
      setStudy(enrichedStudy)
    } catch (err) {
      setStudyError(err instanceof Error ? err.message : 'Erreur étude')
    } finally {
      setLoadingStudy(false)
    }
  }

  async function handleClaim() {
    if (!study || !membership?.agenceId) return
    // Mode virtuel (id négatif) : pas de claim possible — le panel affiche déjà
    // le bouton "Demander un audit Pro RGE" à la place du bouton claim.
    if (study.id < 0) return
    try {
      await claimMut.mutateAsync({
        prospectId: study.id,
        agenceId: membership.agenceId,
      })
      setStudy(null)
    } catch (err) {
      setStudyError(err instanceof Error ? err.message : 'Erreur claim')
    }
  }

  function dismissOnboarding() {
    setOnboardingDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agence-onboarding-dismissed', '1')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* === Topbar === */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shadow-sm z-[1000]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Flame size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#0a5e2a] text-sm hidden md:inline">
            BRH Score Vente
          </span>
        </div>

        {/* Search adresse BAN */}
        <div className="flex-1 max-w-2xl mx-auto relative">
          <input
            type="text"
            value={addr}
            onChange={(e) => handleAddrInput(e.target.value)}
            onFocus={() => addr.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Rechercher une adresse — ex : 12 rue de la Paix, Rennes"
            className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#0a5e2a] focus:ring-2 focus:ring-[#0a5e2a]/15"
          />
          {searchingAddr ? (
            <Loader
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0a5e2a] animate-spin"
            />
          ) : (
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0a5e2a] text-white flex items-center justify-center"
              aria-label="Rechercher"
            >
              <Search size={14} />
            </button>
          )}
          {showSuggestions ? (
            <ul className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[2000]">
              {suggestions.length > 0 ? (
                suggestions.map((f, i) => (
                  <li
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      void pickSuggestion(f)
                    }}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <p className="text-slate-800">{f.properties.label}</p>
                    {f.properties.context ? (
                      <p className="text-[11px] text-slate-500">{f.properties.context}</p>
                    ) : null}
                  </li>
                ))
              ) : !searchingAddr && addr.length >= 2 ? (
                <li className="px-4 py-2.5 text-sm text-slate-500 italic">
                  Aucune adresse trouvée
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setWelcomeOpen(true)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-full text-xs font-medium hover:bg-slate-50"
        >
          <Menu size={14} />
          <span className="hidden md:inline">Menu</span>
        </button>
      </header>

      {/* === KPI bar === */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-3 text-xs overflow-x-auto whitespace-nowrap">
        <Pill
          icon={<Flame size={11} />}
          label="Très chauds"
          value={stats?.tres_chaud ?? 0}
          color="text-red-700"
          active={filterSegment === 'tres_chaud'}
          onClick={() =>
            setFilterSegment(filterSegment === 'tres_chaud' ? '' : 'tres_chaud')
          }
        />
        <Pill
          icon={<ThermometerSun size={11} />}
          label="Chauds"
          value={stats?.chaud ?? 0}
          color="text-orange-700"
          active={filterSegment === 'chaud'}
          onClick={() => setFilterSegment(filterSegment === 'chaud' ? '' : 'chaud')}
        />
        {subscription ? (
          <span className="ml-auto text-slate-600">
            <span className="text-slate-500">
              {TIER_LABELS[subscription.tier]} · ce mois
            </span>{' '}
            <b className="text-slate-800 tabular-nums">
              {subscription.current_month_claims} / {subscription.monthly_lead_quota ?? '∞'}
            </b>
            {quotaExhausted ? (
              <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                quota atteint
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* === Map === */}
      <div className="flex-1 relative min-h-0">
        {/* Onboarding banner (3 étapes claires) — dismissible avec localStorage */}
        {!onboardingDismissed && rows.length > 0 ? (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[800] max-w-2xl bg-white rounded-xl shadow-xl border border-orange-200 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Flame size={16} className="text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 mb-1">
                Mode d'emploi en 3 étapes
              </p>
              <ol className="text-[12px] text-slate-700 space-y-0.5 leading-snug">
                <li>
                  <b className="text-orange-600">1.</b> Filtrez les biens (département, score
                  min) via le bouton <b>Menu</b> en haut à droite
                </li>
                <li>
                  <b className="text-orange-600">2.</b> <b>Cliquez un marker</b> sur la carte →
                  fiche complète (DPE, scénarios, aides, isolation, DVF)
                </li>
                <li>
                  <b className="text-orange-600">3.</b> Bouton <b>Claim ce lead</b> en bas de
                  la fiche → exclusivité 30j
                </li>
              </ol>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Fermer le mode d'emploi"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {(isLoading || loadingStudy) ? (
          <div className="absolute inset-0 flex items-center justify-center z-[999] bg-white/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-5 flex items-center gap-3">
              <Loader className="animate-spin text-[#0a5e2a]" size={20} />
              <span className="text-sm font-medium text-[#0a5e2a]">
                {loadingStudy ? 'Chargement de l\'étude...' : 'Chargement des prospects...'}
              </span>
            </div>
          </div>
        ) : null}

        {studyError ? (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center gap-2 shadow-md">
            <AlertCircle size={14} />
            {studyError}
            <button
              type="button"
              onClick={() => setStudyError(null)}
              className="text-red-700 hover:text-red-900"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <MapContainer
          center={BZH_CENTER}
          zoom={BZH_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
        >
          <MapInvalidator />
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo center={flyTarget?.center ?? null} zoom={flyTarget?.zoom ?? BZH_ZOOM} />
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
                  fillOpacity: 0.75,
                  weight: 1.5,
                }}
                eventHandlers={{
                  click: () =>
                    openProspectStudy(r.prospect_id, [
                      r.prospect!.latitude!,
                      r.prospect!.longitude!,
                    ]),
                }}
              />
            )
          })}
        </MapContainer>
      </div>

      {/* === Welcome modal === */}
      {welcomeOpen ? (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => setWelcomeOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-xl font-bold text-[#0a5e2a]">
                Bienvenue dans votre espace agence
              </h1>
              <button
                type="button"
                onClick={() => setWelcomeOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-500 hover:text-white flex items-center justify-center transition"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">Deux façons d'utiliser :</p>

            <div className="border border-slate-200 rounded-xl p-4 mb-3">
              <h2 className="text-base font-bold text-[#0a5e2a] mb-1">
                1. Analyser une adresse précise
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Tapez l'adresse en haut → on calcule DPE estimé, travaux, aides, saut de classe.
              </p>
              <button
                type="button"
                onClick={() => {
                  setWelcomeOpen(false)
                  setTimeout(() => {
                    document.querySelector<HTMLInputElement>('input[placeholder*="adresse"]')?.focus()
                  }, 100)
                }}
                className="w-full py-2 px-3 bg-slate-100 text-[#0a5e2a] font-semibold text-sm rounded-lg hover:bg-slate-200 transition"
              >
                Saisir une adresse →
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-base font-bold text-[#0a5e2a] mb-1">
                2. Voir les prospects F/G d'une zone
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Filtrez par département, segment et score min. Cliquez un marker sur la carte
                pour voir l'étude complète + claim.
              </p>

              <label className="block text-xs text-slate-600 font-semibold mb-1">
                Département
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { v: '', l: 'Tous' },
                  { v: '22', l: '22 — Côtes-d\'Armor' },
                  { v: '29', l: '29 — Finistère' },
                  { v: '35', l: '35 — Ille-et-Vilaine' },
                  { v: '56', l: '56 — Morbihan' },
                ].map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setFilterDept(d.v)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      filterDept === d.v
                        ? 'bg-[#0a5e2a] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {d.l}
                  </button>
                ))}
              </div>

              <label className="block text-xs text-slate-600 font-semibold mb-1">
                Score minimum : <b>{scoreMin}</b>
              </label>
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={scoreMin}
                onChange={(e) => setScoreMin(Number(e.target.value))}
                className="w-full mb-3"
              />

              <label className="flex items-center gap-2 text-xs text-slate-700 mb-3">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                />
                Afficher heatmap densité
              </label>

              <button
                type="button"
                onClick={() => setWelcomeOpen(false)}
                className="w-full py-2.5 px-3 bg-[#0a5e2a] text-white font-bold text-sm rounded-lg hover:bg-[#084820] transition flex items-center justify-center gap-1"
              >
                Voir les prospects sur la carte
                <ChevronRight size={14} />
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                {markerRows.length} prospect{markerRows.length > 1 ? 's' : ''} affiché
                {markerRows.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* === Slide-in panel droit === */}
      {study ? (
        <ProspectStudyPanel
          study={study}
          onClose={() => setStudy(null)}
          onClaim={() => void handleClaim()}
          alreadyClaimed={claimedIds.has(study.id)}
          quotaExhausted={quotaExhausted}
          isClaiming={claimMut.isPending}
        />
      ) : null}
    </div>
  )
}

function Pill({
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
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
        active
          ? 'border-orange-400 bg-amber-50 ring-2 ring-orange-200'
          : `border-slate-200 bg-white ${color}`
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="font-bold tabular-nums">{value.toLocaleString('fr-FR')}</span>
    </button>
  )
}
