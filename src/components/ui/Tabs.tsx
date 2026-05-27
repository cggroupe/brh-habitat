import * as RadixTabs from '@radix-ui/react-tabs'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * Wrapper Radix Tabs stylisé Editorial Habitat (#00600a + neutres stone)
 * avec persistence du tab actif dans l'URL via `?tab=X`.
 *
 * Sprint dette technique 27/05 PM — Option `subnav` : quand un tab contient
 * plusieurs sections, fournir une liste d'ancres rend la navigation explicite
 * au lieu d'imposer un scroll long. Cliquer une pill smooth-scroll vers
 * l'élément `id` correspondant à l'intérieur du `content` du tab.
 */
export interface TabSubnavItem {
  id: string
  label: string
  count?: number | null
}

export interface TabDef {
  id: string
  label: string
  count?: number | null
  content: ReactNode
  disabled?: boolean
  /** Ancres internes au tab — affichées en pills au-dessus du contenu. */
  subnav?: TabSubnavItem[]
}

interface TabsProps {
  paramName?: string
  defaultTab?: string
  tabs: TabDef[]
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function TabSubnav({ items }: { items: TabSubnavItem[] }) {
  if (items.length < 2) return null
  return (
    <nav
      aria-label="Sous-sections"
      className="sticky top-[42px] z-10 flex flex-wrap gap-1.5 border-b border-stone-100 bg-white/95 px-4 py-2 backdrop-blur"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => scrollToAnchor(it.id)}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-900"
        >
          {it.label}
          {typeof it.count === 'number' && (
            <span className="rounded-full bg-white px-1.5 text-[10px] tabular-nums text-stone-600">
              {it.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
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
      <RadixTabs.List className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-2">
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.id}
            value={t.id}
            disabled={t.disabled}
            className="group relative inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:text-stone-900 data-[state=active]:border-[#00600a] data-[state=active]:text-[#00600a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-stone-100 px-1.5 text-[10px] font-semibold text-stone-600 group-data-[state=active]:bg-stone-200 group-data-[state=active]:text-[#00600a]">
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
          {t.subnav && <TabSubnav items={t.subnav} />}
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
