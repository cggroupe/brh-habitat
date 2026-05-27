/**
 * LeadFilterPills — barre de filtres pills horizontale (pattern Stitch interne
 * `.stitch/designs/liste-leads-v2.png` + grammaire Data-B).
 *
 * Filtres exposés au-dessus de la TABLE leads. Chaque pill = état boolean simple
 * (sauf département = select déguisé en pill). Clic = toggle, applique
 * immédiatement (pas de bouton "Rechercher" — feedback Data-B : "trou de
 * donnée = parcours, jamais cul-de-sac").
 *
 * Designed pour l'écran agence/employé : pas de RGPD-gating ici, c'est l'écran
 * employe qui appelle, les filtres `with_phone/email` correspondent aux PII
 * enrichies (visibles employé only).
 */
import { Phone, Mail, Euro, CalendarClock, Building2, User, Flame } from 'lucide-react'
import { useId } from 'react'

export interface LeadPillsState {
  dept: string
  withPhone: boolean
  withEmail: boolean
  withCa: boolean
  withRdv: boolean
  dpeClasses: Set<string>
  filterSCI: boolean
  filterParticulier: boolean
  filterFioul: boolean
}

interface Props {
  state: LeadPillsState
  onChange: (next: LeadPillsState) => void
  /** Masque les filtres réservés employé (with_phone/email/ca/rdv) */
  hidePrivatePills?: boolean
}

const DEPTS_PILL: Array<{ v: string; l: string }> = [
  { v: '', l: 'Tous départements' },
  { v: '22', l: '22 — Côtes-d’Armor' },
  { v: '29', l: '29 — Finistère' },
  { v: '35', l: '35 — Ille-et-Vilaine' },
  { v: '56', l: '56 — Morbihan' },
]

const DPE_CLASSES = ['E', 'F', 'G'] as const

export default function LeadFilterPills({ state, onChange, hidePrivatePills = false }: Props) {
  const id = useId()

  function patch(next: Partial<LeadPillsState>) {
    onChange({ ...state, ...next })
  }
  function toggleDpe(cls: string) {
    const set = new Set(state.dpeClasses)
    if (set.has(cls)) set.delete(cls)
    else set.add(cls)
    patch({ dpeClasses: set })
  }

  const activeCount =
    (state.dept ? 1 : 0) +
    (state.withPhone ? 1 : 0) +
    (state.withEmail ? 1 : 0) +
    (state.withCa ? 1 : 0) +
    (state.withRdv ? 1 : 0) +
    (state.filterSCI ? 1 : 0) +
    (state.filterParticulier ? 1 : 0) +
    (state.filterFioul ? 1 : 0) +
    state.dpeClasses.size

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {/* Pill département : select déguisé */}
      <label htmlFor={`${id}-dept`} className="relative">
        <span className="sr-only">Département</span>
        <select
          id={`${id}-dept`}
          value={state.dept}
          onChange={(e) => patch({ dept: e.target.value })}
          className={`appearance-none cursor-pointer rounded-full border px-3.5 py-1.5 pr-7 text-xs font-medium transition ${
            state.dept
              ? 'border-[#00600a] bg-[#00600a]/5 text-[#00600a]'
              : 'border-border-strong/30 bg-surface text-text-muted hover:bg-surface-low'
          }`}
        >
          {DEPTS_PILL.map((d) => (
            <option key={d.v || 'all'} value={d.v}>
              {d.l}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </label>

      {/* Pills boolean RGPD-aware */}
      {!hidePrivatePills && (
        <>
          <Pill
            active={state.withPhone}
            label="Avec téléphone"
            icon={<Phone className="h-3 w-3" />}
            onClick={() => patch({ withPhone: !state.withPhone })}
          />
          <Pill
            active={state.withEmail}
            label="Avec email"
            icon={<Mail className="h-3 w-3" />}
            onClick={() => patch({ withEmail: !state.withEmail })}
          />
          <Pill
            active={state.withCa}
            label="Avec chiffre d'affaires"
            icon={<Euro className="h-3 w-3" />}
            onClick={() => patch({ withCa: !state.withCa })}
          />
          <Pill
            active={state.withRdv}
            label="A déjà eu un RDV"
            icon={<CalendarClock className="h-3 w-3" />}
            onClick={() => patch({ withRdv: !state.withRdv })}
          />
        </>
      )}

      {/* Pills propriétaire */}
      <Pill
        active={state.filterSCI}
        label="Détenu par SCI"
        icon={<Building2 className="h-3 w-3" />}
        onClick={() =>
          patch({
            filterSCI: !state.filterSCI,
            filterParticulier: state.filterSCI ? state.filterParticulier : false,
          })
        }
      />
      <Pill
        active={state.filterParticulier}
        label="Détenu par particulier"
        icon={<User className="h-3 w-3" />}
        onClick={() =>
          patch({
            filterParticulier: !state.filterParticulier,
            filterSCI: state.filterParticulier ? state.filterSCI : false,
          })
        }
      />
      <Pill
        active={state.filterFioul}
        label="Chauffage fioul"
        icon={<Flame className="h-3 w-3" />}
        onClick={() => patch({ filterFioul: !state.filterFioul })}
      />

      {/* DPE classes (3 mini-pills compactes) */}
      <span
        role="separator"
        aria-orientation="vertical"
        className="hidden sm:inline-block h-5 w-px bg-border-strong/30"
      />
      <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
        DPE
      </span>
      {DPE_CLASSES.map((cls) => {
        const isActive = state.dpeClasses.has(cls)
        const cssActive: Record<string, string> = {
          E: 'border-orange-600 bg-orange-500 text-white',
          F: 'border-orange-800 bg-orange-700 text-white',
          G: 'border-red-800 bg-red-700 text-white',
        }
        const tips: Record<string, string> = {
          E: 'DPE E — interdit location nue dès 2034',
          F: 'DPE F — interdit location nue depuis 2028',
          G: 'DPE G — interdit location nue depuis 2025',
        }
        return (
          <button
            key={cls}
            type="button"
            title={tips[cls]}
            onClick={() => toggleDpe(cls)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
              isActive
                ? cssActive[cls]
                : 'border-border-strong/30 bg-surface text-text-muted hover:border-text-muted'
            }`}
          >
            {cls}
          </button>
        )
      })}

      {/* Compteur filtres actifs */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() =>
            onChange({
              dept: '',
              withPhone: false,
              withEmail: false,
              withCa: false,
              withRdv: false,
              dpeClasses: new Set(),
              filterSCI: false,
              filterParticulier: false,
              filterFioul: false,
            })
          }
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border-strong/30 bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-low"
          title="Effacer tous les filtres"
        >
          <span className="tabular-nums font-bold">{activeCount}</span>
          filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
          <span className="ml-1 text-text-light">×</span>
        </button>
      )}
    </div>
  )
}

function Pill({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-[#00600a] bg-[#00600a]/5 text-[#00600a]'
          : 'border-border-strong/30 bg-surface text-text-muted hover:bg-surface-low'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
