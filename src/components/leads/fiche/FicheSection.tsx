/**
 * Section dépliable lazy d'une fiche drill-down.
 * Par défaut fermée : le contenu n'est rendu qu'au premier déploiement
 * (pattern 1-hop direct + lazy au-delà, validé 2026-05-18).
 */
import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  title: string
  count?: number | null
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export default function FicheSection({ title, count, icon, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [hasRendered, setHasRendered] = useState(defaultOpen)

  const handleToggle = () => {
    setOpen((v) => !v)
    if (!hasRendered) setHasRendered(true)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
          {count != null && count > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {hasRendered && (
        <div className={open ? 'border-t border-slate-100 px-4 py-3' : 'hidden'}>
          {children}
        </div>
      )}
    </section>
  )
}
