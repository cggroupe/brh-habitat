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
    <section className="rounded-2xl bg-surface ring-1 ring-border-strong/20">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-low rounded-2xl"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 font-display text-base font-semibold text-text">
          {icon}
          {title}
          {count != null && count > 0 && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold tabular-nums text-text-muted">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-light" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-light" />
        )}
      </button>
      {hasRendered && (
        <div className={open ? 'border-t border-border-strong/20 px-5 py-4' : 'hidden'}>
          {children}
        </div>
      )}
    </section>
  )
}
