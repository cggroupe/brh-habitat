import { List, ChevronRight } from 'lucide-react'

interface TocItem {
  id: string
  text: string
}

interface ArticleTocMobileProps {
  toc: TocItem[]
  open: boolean
  onToggle: () => void
}

export function ArticleTocMobile({ toc, open, onToggle }: ArticleTocMobileProps) {
  if (toc.length <= 2) return null

  return (
    <div className="mb-8 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 font-display text-sm uppercase tracking-widest text-primary-dark">
          <List size={16} className="text-primary" />
          Sommaire
        </span>
        <ChevronRight
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <nav className="px-6 pb-5 border-t border-slate-100" aria-label="Sommaire">
          <ol className="mt-4 space-y-2">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={onToggle}
                  className="flex items-start gap-3 group font-body text-sm text-slate-500 hover:text-primary transition-colors py-1"
                >
                  <span className="shrink-0 font-display text-xs text-primary/60 mt-0.5 w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="group-hover:underline underline-offset-2">
                    {item.text}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  )
}

interface ArticleTocDesktopProps {
  toc: TocItem[]
}

export function ArticleTocDesktop({ toc }: ArticleTocDesktopProps) {
  if (toc.length <= 2) return null

  return (
    <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <List size={15} className="text-primary" />
        <span className="font-display text-sm uppercase tracking-widest text-primary-dark">
          Sommaire
        </span>
      </div>
      <nav aria-label="Sommaire de l'article">
        <ol className="space-y-1">
          {toc.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="flex items-start gap-3 group py-1.5 font-body text-sm text-slate-500 hover:text-primary transition-colors rounded-lg"
              >
                <span className="shrink-0 font-display text-xs text-primary/50 mt-0.5 w-5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="group-hover:underline underline-offset-2 leading-snug">
                  {item.text}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
