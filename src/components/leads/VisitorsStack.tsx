/**
 * VisitorsStack — avatars empilés des collègues qui ont déjà visité un client.
 * Utilisé sur la liste leads pour signaler "déjà vu par X" et éviter les doublons.
 */
import type { VisitsByPersonne } from '@/hooks/queries/useVisitsBulk'

interface Props {
  visits: VisitsByPersonne | undefined
  size?: 'sm' | 'md'
}

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function VisitorsStack({ visits, size = 'sm' }: Props) {
  if (!visits || visits.visitors.length === 0) {
    return <span className="text-[10px] italic text-stone-400">—</span>
  }
  const dim = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'
  const visible = visits.visitors.slice(0, 3)
  const extra = Math.max(0, visits.total - visible.length)
  return (
    <div className="inline-flex items-center -space-x-1.5"
         title={visits.visitors.map((v) => `${v.name} · ${formatDate(v.seen_at)}`).join('\n')}>
      {visible.map((v) => (
        <div
          key={v.id}
          className={`${dim} inline-flex items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800 ring-2 ring-white`}
        >
          {initials(v.name)}
        </div>
      ))}
      {extra > 0 && (
        <div className={`${dim} inline-flex items-center justify-center rounded-full bg-stone-200 font-semibold text-stone-700 ring-2 ring-white`}>
          +{extra}
        </div>
      )}
    </div>
  )
}
