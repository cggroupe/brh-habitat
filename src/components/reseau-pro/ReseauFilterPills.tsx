/**
 * ReseauFilterPills — barre de filtres horizontale pattern Stitch BRH.
 *
 * Filtres : département, secteur, métier, RGE, contacts dispo, claim status.
 * Application instantanée pattern Data-B #7 (pas de bouton "Appliquer").
 */
import { ChevronDown, X } from 'lucide-react'
import type { ReseauListFilters, ReseauClaimFilter } from '@/api/brh-reseau-pro'

const DEPTS: Array<{ value: '22' | '29' | '35' | '56'; label: string }> = [
  { value: '22', label: "Côtes d'Armor (22)" },
  { value: '29', label: 'Finistère (29)' },
  { value: '35', label: 'Ille-et-Vilaine (35)' },
  { value: '56', label: 'Morbihan (56)' },
]

const SECTEURS: Array<{ value: 'BTP' | 'Immo/Partenariat'; label: string }> = [
  { value: 'BTP', label: 'BTP' },
  { value: 'Immo/Partenariat', label: 'Immo / Partenariat' },
]

const METIERS = [
  'Plombier', 'Maçon', 'Couvreur', 'Agence immobilière', 'Électricien',
  "Bureau d'études", 'Architecte', 'Chauffagiste', 'Isolation', 'Terrassier',
  'Menuisier', 'Peintre', 'Plâtrier-Plaquiste', 'Courtier (fallback)',
  'Façadier-Ravalement', 'Charpentier', 'Carreleur', 'Constructeur MI',
  "Maître d'œuvre", 'Rénovation générale', 'Serrurier',
  'Entreprise générale bâtiment', 'Promoteur immobilier', 'Ramoneur',
  'Photovoltaïque / EnR', 'Vitrier', 'Climaticien', 'Pompe à chaleur',
  'Étanchéiste', 'Géomètre-expert',
]

interface Props {
  filters: ReseauListFilters
  onChange: (next: ReseauListFilters) => void
}

export default function ReseauFilterPills({ filters, onChange }: Props) {
  const set = (patch: Partial<ReseauListFilters>) => onChange({ ...filters, ...patch, offset: 0 })

  const hasActive =
    !!filters.dept || !!filters.secteur || !!filters.metier ||
    !!filters.filterRge || !!filters.filterWithEmail || !!filters.filterWithSite ||
    (filters.claimFilter && filters.claimFilter !== 'all')

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface ring-1 ring-border-strong/20 p-3">
      {/* Claim filter — 3 segments visuels */}
      <SegmentedClaimFilter
        value={filters.claimFilter ?? 'all'}
        onChange={(v) => set({ claimFilter: v })}
      />

      <span className="h-6 w-px bg-stone-200 mx-1" aria-hidden />

      {/* Dépt select */}
      <Select
        label="Département"
        value={filters.dept ?? ''}
        onChange={(v) => set({ dept: (v || null) as ReseauListFilters['dept'] })}
        options={[{ value: '', label: 'Tous départements' }, ...DEPTS.map(d => ({ value: d.value, label: d.label }))]}
      />

      {/* Secteur select */}
      <Select
        label="Secteur"
        value={filters.secteur ?? ''}
        onChange={(v) => set({ secteur: (v || null) as ReseauListFilters['secteur'] })}
        options={[{ value: '', label: 'Tous secteurs' }, ...SECTEURS.map(s => ({ value: s.value, label: s.label }))]}
      />

      {/* Métier select */}
      <Select
        label="Métier"
        value={filters.metier ?? ''}
        onChange={(v) => set({ metier: v || null })}
        options={[{ value: '', label: 'Tous métiers' }, ...METIERS.map(m => ({ value: m, label: m }))]}
      />

      <span className="h-6 w-px bg-stone-200 mx-1" aria-hidden />

      <Pill
        label="RGE"
        active={!!filters.filterRge}
        onClick={() => set({ filterRge: !filters.filterRge })}
      />
      <Pill
        label="Avec email"
        active={!!filters.filterWithEmail}
        onClick={() => set({ filterWithEmail: !filters.filterWithEmail })}
      />
      <Pill
        label="Avec site web"
        active={!!filters.filterWithSite}
        onClick={() => set({ filterWithSite: !filters.filterWithSite })}
      />

      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-stone-200"
        >
          <X size={12} />
          Réinitialiser
        </button>
      )}
    </div>
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
        active
          ? 'bg-[#00600a] text-white ring-[#00600a]'
          : 'bg-white text-text ring-border-strong/30 hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full bg-white pl-3 pr-8 py-1.5 text-xs font-medium ring-1 ring-border-strong/30 hover:bg-stone-50 ${
          value ? 'text-[#00600a] ring-[#00600a]/40' : 'text-text'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-50" />
    </div>
  )
}

function SegmentedClaimFilter({
  value,
  onChange,
}: {
  value: ReseauClaimFilter
  onChange: (v: ReseauClaimFilter) => void
}) {
  const items: Array<{ k: ReseauClaimFilter; label: string }> = [
    { k: 'all', label: 'Tous' },
    { k: 'free', label: 'Disponibles' },
    { k: 'mine', label: 'Mes contacts' },
  ]
  return (
    <div className="inline-flex rounded-full bg-stone-100 p-0.5 ring-1 ring-stone-200">
      {items.map((it) => (
        <button
          key={it.k}
          type="button"
          onClick={() => onChange(it.k)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            value === it.k
              ? 'bg-white text-[#00600a] shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export { ReseauFilterPills }
