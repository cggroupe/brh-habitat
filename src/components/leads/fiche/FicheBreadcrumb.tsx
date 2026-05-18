/**
 * Breadcrumb partagé pour les pages routes fiche drill-down.
 * Affiche le chemin de navigation cliquable + bouton retour.
 */
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export interface FicheCrumb {
  label: string
  to?: string
}

interface Props {
  items: FicheCrumb[]
  onBack?: () => void
}

export default function FicheBreadcrumb({ items, onBack }: Props) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm"
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
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
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
                    isLast
                      ? 'truncate font-medium text-slate-900'
                      : 'truncate text-slate-600'
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
