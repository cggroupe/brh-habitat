import * as RadixTabs from '@radix-ui/react-tabs'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * Wrapper Radix Tabs stylisé Editorial Habitat (#00600a + neutres stone)
 * avec persistence du tab actif dans l'URL via `?tab=X`.
 */
export interface TabDef {
  id: string
  label: string
  count?: number | null
  content: ReactNode
  disabled?: boolean
}

interface TabsProps {
  paramName?: string
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
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
