import * as RadixTabs from '@radix-ui/react-tabs'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * Wrapper Radix Tabs stylisé Editorial Habitat (vert #00600a) avec
 * persistence du tab actif dans l'URL via `?tab=X`.
 *
 * Pattern Data-B : onglets contextuels qui swappent le panneau sans changer
 * le scope entité. L'utilisateur n'est jamais désorienté.
 */
export interface TabDef {
  id: string
  label: string
  count?: number | null
  content: ReactNode
  /** Désactivé visuellement si pas de data. */
  disabled?: boolean
}

interface TabsProps {
  /** Identifiant utilisé dans l'URL search param (par défaut `tab`). */
  paramName?: string
  /** Tab par défaut si l'URL n'en spécifie pas. */
  defaultTab?: string
  tabs: TabDef[]
}

export default function Tabs({ paramName = 'tab', defaultTab, tabs }: TabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get(paramName)
  const fallback = defaultTab ?? tabs[0]?.id ?? ''
  const active = tabs.find((t) => t.id === urlTab)?.id ?? fallback

  const handleChange = (val: string) => {
    const next = new URLSearchParams(searchParams)
    next.set(paramName, val)
    setSearchParams(next, { replace: true })
  }

  return (
    <RadixTabs.Root value={active} onValueChange={handleChange}>
      <RadixTabs.List className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2">
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.id}
            value={t.id}
            disabled={t.disabled}
            className="group relative inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 data-[state=active]:border-emerald-700 data-[state=active]:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600 group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-emerald-800">
                {t.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((t) => (
        <RadixTabs.Content
          key={t.id}
          value={t.id}
          className="focus:outline-none data-[state=inactive]:hidden"
          forceMount
        >
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
