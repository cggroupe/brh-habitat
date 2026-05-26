/**
 * Breadcrumb partagé pour les pages routes fiche drill-down.
 * Affiche le chemin de navigation cliquable + bouton retour.
 *
 * Mode 1 (legacy) : items passés en prop, bouton retour = navigate(-1).
 * Mode 2 (refonte Data-B) : items dérivés de useNavStackStore, bouton retour = pop().
 * Si `items` est fourni explicitement il prend priorité (backward compat).
 */
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useNavStackStore } from '../../../stores/navStackStore'

export interface FicheCrumb {
  label: string
  to?: string
}

interface Props {
  /** Items explicites (mode legacy). Si absent, dérivés du navStackStore. */
  items?: FicheCrumb[]
  onBack?: () => void
  /** Lien racine "Leads" (toujours en premier). */
  leadsBackUrl?: string
}

export default function FicheBreadcrumb({ items, onBack, leadsBackUrl }: Props) {
  const navigate = useNavigate()
  const stack = useNavStackStore((s) => s.stack)
  const pop = useNavStackStore((s) => s.pop)

  // Mode 2 (refonte) : dériver items depuis le store
  const derivedItems: FicheCrumb[] =
    items ??
    (() => {
      const root: FicheCrumb = leadsBackUrl
        ? { label: 'Leads', to: leadsBackUrl }
        : { label: 'Leads' }
      const crumbs: FicheCrumb[] = stack.map((s, idx) => ({
        label: s.label,
        // Tous sauf le dernier sont cliquables
        to: idx < stack.length - 1 ? s.path : undefined,
      }))
      return [root, ...crumbs]
    })()

  const handleBack =
    onBack ??
    (() => {
      if (items) {
        // Mode legacy : navigate(-1) historique
        navigate(-1)
        return
      }
      // Mode refonte : dépile et redirige vers le précédent
      const prev = pop()
      if (prev) {
        navigate(prev.path)
      } else if (leadsBackUrl) {
        navigate(leadsBackUrl)
      } else {
        navigate(-1)
      }
    })

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="sticky top-[var(--sticky-header-h,80px)] z-30 flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-2 text-sm"
    >
      <button
        onClick={handleBack}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Retour"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour
      </button>
      <span className="text-slate-300">·</span>
      <ol className="flex items-center gap-1.5 overflow-hidden">
        {derivedItems.map((item, idx) => {
          const isLast = idx === derivedItems.length - 1
          return (
            <li key={`${item.label}-${idx}`} className="flex min-w-0 items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="truncate text-slate-600 hover:text-slate-900 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? 'truncate font-medium text-slate-900' : 'truncate text-slate-600'
                  }
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
