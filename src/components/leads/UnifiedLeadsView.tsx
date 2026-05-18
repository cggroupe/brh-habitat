/**
 * UnifiedLeadsView — écran unifié leads pour BRH Habitat.
 *
 * Remplace les 6 sous-pages cloisonnées (foncier/carte, /sci, /successions, /favoris,
 * /tertiaire, /prospects + AgenceLeads + AgenceScoreVente) par UN SEUL écran :
 *   - Colonne gauche : filtres unifiés
 *   - Colonne principale : liste (par défaut, performant) OU carte (toggle)
 *   - Modal détail RGPD-aware selon le profil
 *
 * Profils supportés : 'employe' | 'agence' | 'artisan' | 'notaire'
 * Cf. /src/lib/rgpd/lead-visibility.ts pour la matrice RGPD.
 */
import { lazy, Suspense, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, List, Map as MapIcon, ChevronRight, Loader2,
  Flame, Phone, Mail,
} from 'lucide-react'
import { useFoncierProspectsUnified } from '@/hooks/queries/foncier-prospects-unified'
import type { ScoreV2Segment } from '@/api/foncier-prospects-table'
import type { LeadRow } from '@/types/lead'
import { canSee, type LeadProfile } from '@/lib/rgpd/lead-visibility'
import LeadDetailModal from './LeadDetailModal'

function profileBasePath(profile: LeadProfile): string {
  switch (profile) {
    case 'employe': return '/employe/leads'
    case 'artisan': return '/artisan/leads'
    case 'notaire': return '/notaire/leads'
    case 'agence':
    default: return '/agence/leads'
  }
}

// Carte lazy-loaded : ne charge Leaflet que si l'utilisateur clique sur "Carte"
const UnifiedLeadsMap = lazy(() => import('./UnifiedLeadsMap'))

type Props = {
  profile: LeadProfile
  /** Titre de page (ex: "Leads Foncier", "Mes Prospects") */
  title?: string
}

const DEPTS = [
  { v: '', l: 'Tous départements' },
  { v: '22', l: '22 — Côtes-d’Armor' },
  { v: '29', l: '29 — Finistère' },
  { v: '35', l: '35 — Ille-et-Vilaine' },
  { v: '56', l: '56 — Morbihan' },
] as const

const SEGMENTS: Array<{ v: ScoreV2Segment | ''; l: string; cls: string; dot: string }> = [
  { v: '', l: 'Tous segments', cls: 'border-slate-300 text-slate-700', dot: 'bg-slate-400' },
  { v: 'ultra_chaud', l: 'Ultra-chaud', cls: 'border-red-300 text-red-800 bg-red-50', dot: 'bg-red-600' },
  { v: 'mpr_bleu_prio', l: 'MPR Bleu prio', cls: 'border-sky-300 text-sky-800 bg-sky-50', dot: 'bg-sky-600' },
  { v: 'standard', l: 'Standard', cls: 'border-amber-300 text-amber-800 bg-amber-50', dot: 'bg-amber-500' },
  { v: 'cold', l: 'Froid', cls: 'border-slate-300 text-slate-700 bg-slate-50', dot: 'bg-slate-500' },
]

const PAGE_SIZE = 50

export default function UnifiedLeadsView({ profile, title = 'Leads unifiés' }: Props) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState<string>('')
  const [segment, setSegment] = useState<ScoreV2Segment | ''>('')
  const [scoreMin, setScoreMin] = useState<number>(0)
  const [filterFG, setFilterFG] = useState(true) // par défaut F/G uniquement (passoires)
  const [filterFioul, setFilterFioul] = useState(false)
  const [filterSCI, setFilterSCI] = useState(false)
  const [filterSuccession, setFilterSuccession] = useState(false)
  const [page, setPage] = useState(0)
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null)
  const navigate = useNavigate()
  const openFicheAdresse = useCallback((lead: LeadRow) => {
    navigate(`${profileBasePath(profile)}/adresse/${lead.id}`)
  }, [navigate, profile])

  // En vue carte on charge plus de pins (max 200 côté RPC) ; en liste on pagine.
  const effectiveLimit = view === 'map' ? 200 : PAGE_SIZE
  const effectiveOffset = view === 'map' ? 0 : page * PAGE_SIZE

  const { data, isLoading } = useFoncierProspectsUnified({
    dept: dept || undefined,
    segmentV2: segment || undefined,
    scoreV2Min: scoreMin || undefined,
    filterFioul: filterFioul,
    filterAvecSci: filterSCI,
    filterSuccession: filterSuccession,
    search: search || undefined,
    limit: effectiveLimit,
    offset: effectiveOffset,
  })

  // Le RPC renvoie un tableau de lignes, total_count inclus dans chaque ligne
  const rows: LeadRow[] = data ?? []
  const total = rows[0]?.total_count ?? 0

  // Filtre F/G appliqué côté client (les autres filtres sont passés au RPC)
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterFG && !['F', 'G'].includes(String(r.etiquette_dpe))) return false
      return true
    })
  }, [rows, filterFG])


  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-700">
          {total.toLocaleString('fr-FR')} résultats
        </span>

        <div className="flex-1" />

        {/* Recherche globale */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Adresse, nom, SIREN, SCI..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {/* Toggle Liste / Carte */}
        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition ${
              view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vue liste (rapide, par défaut)"
          >
            <List className="h-4 w-4" /> Liste
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition ${
              view === 'map' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Vue carte (chargement à la demande)"
          >
            <MapIcon className="h-4 w-4" /> Carte
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Colonne filtres */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="h-4 w-4" />
            Filtres
          </div>

          {/* Département */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">Département</label>
            <select
              value={dept}
              onChange={(e) => {
                setDept(e.target.value)
                setPage(0)
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {DEPTS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.l}
                </option>
              ))}
            </select>
          </div>

          {/* Segment */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">Segment</label>
            <div className="space-y-1">
              {SEGMENTS.map((s) => (
                <button
                  key={s.v || 'all'}
                  onClick={() => {
                    setSegment(s.v)
                    setPage(0)
                  }}
                  className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition ${
                    segment === s.v ? s.cls + ' border-2' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.l}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Score min */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Score minimum : <span className="font-bold text-slate-900">{scoreMin}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={scoreMin}
              onChange={(e) => {
                setScoreMin(Number(e.target.value))
                setPage(0)
              }}
              className="w-full"
            />
          </div>

          {/* Filtres checkboxes */}
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={filterFG}
                onChange={(e) => setFilterFG(e.target.checked)}
                className="rounded"
              />
              <span>DPE F/G uniquement (passoires)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={filterFioul}
                onChange={(e) => setFilterFioul(e.target.checked)}
                className="rounded"
              />
              <span>Chauffage fioul</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={filterSCI}
                onChange={(e) => setFilterSCI(e.target.checked)}
                className="rounded"
              />
              <span>Détenu par SCI</span>
            </label>
            {canSee(profile, 'sci_succession') && (
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={filterSuccession}
                  onChange={(e) => setFilterSuccession(e.target.checked)}
                  className="rounded"
                />
                <span>Succession en cours</span>
              </label>
            )}
          </div>

          {/* Profile badge */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="mb-1 font-semibold text-slate-700">Mode d'affichage</div>
            <div className="text-slate-600">
              Profil : <span className="font-mono font-bold">{profile}</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {profile === 'employe' && 'Toutes les données accessibles (BRH interne)'}
              {profile === 'agence' && 'Vue conforme RGPD — sans PII particulier'}
              {profile === 'artisan' && 'Vue technique RGE — DPE+isolation+ventilation'}
              {profile === 'notaire' && 'Vue spécialisée succession'}
            </div>
          </div>
        </aside>

        {/* Colonne principale : liste OU carte */}
        <main className="flex-1 overflow-hidden">
          {view === 'list' ? (
            <ListView
              rows={filteredRows}
              isLoading={isLoading}
              profile={profile}
              page={page}
              setPage={setPage}
              total={total}
              onSelect={openFicheAdresse}
            />
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <UnifiedLeadsMap rows={filteredRows} profile={profile} onSelect={openFicheAdresse} />
            </Suspense>
          )}
        </main>
      </div>

      {/* Modal détail */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          profile={profile}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component : ListView
// ─────────────────────────────────────────────────────────────────────────────
function ListView({
  rows, isLoading, profile, page, setPage, total, onSelect,
}: {
  rows: LeadRow[]
  isLoading: boolean
  profile: LeadProfile
  page: number
  setPage: (n: number) => void
  total: number
  onSelect: (r: LeadRow) => void
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Aucun résultat. Élargissez les filtres.
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <LeadCard
              key={row.id}
              lead={row}
              profile={profile}
              onClick={() => onSelect(row)}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="text-slate-600">
          Page {page + 1} / {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
          >
            ← Préc
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
          >
            Suiv →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component : LeadCard (carte par lead dans la liste)
// ─────────────────────────────────────────────────────────────────────────────
function LeadCard({
  lead, profile, onClick,
}: {
  lead: LeadRow
  profile: LeadProfile
  onClick: () => void
}) {
  const segCfg = SEGMENTS.find((s) => s.v === lead.score_v2_segment)
  const showPhone = canSee(profile, 'particulier_phone') === true
  const showEmail = canSee(profile, 'particulier_email') === true

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm"
    >
      {/* DPE badge */}
      <div className="flex w-10 flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold ${
            ['F', 'G'].includes(String(lead.etiquette_dpe))
              ? 'bg-red-100 text-red-800'
              : ['D', 'E'].includes(String(lead.etiquette_dpe))
                ? 'bg-orange-100 text-orange-800'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {lead.etiquette_dpe ?? '?'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">
            {lead.adresse || 'Adresse inconnue'}
          </span>
          <span className="text-xs text-slate-500">
            {lead.code_postal} {lead.commune}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {lead.surface && <span>{lead.surface}m²</span>}
          {lead.annee_construction && <span>·{lead.annee_construction}</span>}
          {lead.type_batiment && <span>·{lead.type_batiment}</span>}
          {segCfg && segCfg.v && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${segCfg.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${segCfg.dot}`} />
              {segCfg.l}
            </span>
          )}
        </div>
      </div>

      {/* Right: scores + contacts */}
      <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
        {lead.score_v2 != null && (
          <div className="flex items-center gap-1 text-slate-700">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-bold">{lead.score_v2}</span>
          </div>
        )}
        {showPhone && lead.telephone && (
          <span className="flex items-center gap-1 text-emerald-600">
            <Phone className="h-3 w-3" />
            <span className="font-mono">{lead.telephone}</span>
          </span>
        )}
        {showEmail && lead.email && (
          <span className="flex items-center gap-1 text-sky-600">
            <Mail className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{lead.email}</span>
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
      </div>
    </button>
  )
}
