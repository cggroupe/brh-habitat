/**
 * EntityLinksPanel — panel commun « Liens 360° » utilisable sur les 3 fiches
 * (Adresse, SCI, Personne). Charge en lazy les voisins via brh_entity_neighbors.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Loader2, User, Building2, Home, Hash } from 'lucide-react'
import { useEntityNeighbors } from '@/hooks/queries/useEntityNeighbors'
import type { EntityType, EntityNeighbor } from '@/api/brh-entity-neighbors'

interface Props {
  type: EntityType
  id: string
  profileBase: string
  defaultOpen?: boolean
}

const TYPE_META: Record<string, { Icon: typeof User; cls: string; label: string }> = {
  personne_brh: { Icon: User, cls: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900', label: 'Personne BRH' },
  sci: { Icon: Building2, cls: 'border-indigo-200 bg-indigo-50 text-indigo-900', label: 'SCI' },
  adresse_dpe: { Icon: Home, cls: 'border-sky-200 bg-sky-50 text-sky-900', label: 'Adresse' },
  mutation_dvf: { Icon: Hash, cls: 'border-amber-200 bg-amber-50 text-amber-900', label: 'Mutation' },
  permis_sitadel: { Icon: Hash, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', label: 'Permis' },
}

const LINK_META: Record<string, string> = {
  dirige: 'dirige',
  habite: 'habite',
  a_mute: 'a muté',
  a_permis: 'a déposé un permis',
  detient: 'détient',
}

function entityRoute(profileBase: string, type: EntityType, id: string): string | null {
  switch (type) {
    case 'adresse_dpe': return `${profileBase}/leads/adresse/${id}`
    case 'sci': return `${profileBase}/leads/entreprise/${id}`
    case 'personne_brh': return `${profileBase}/leads/personne/${id}`
    default: return null
  }
}

function neighborTitle(n: EntityNeighbor): string {
  const d = n.display ?? {}
  if (n.other_type === 'personne_brh') {
    return (d.full_name as string) || (d.societe as string) || `Personne ${n.other_id.slice(0, 8)}`
  }
  if (n.other_type === 'sci') return (d.denomination as string) || `SCI ${n.other_id}`
  if (n.other_type === 'adresse_dpe') return (d.adresse as string) || `DPE ${n.other_id}`
  if (n.other_type === 'mutation_dvf') {
    const date = d.date_mutation as string | undefined
    const nat = d.nature_mutation as string | undefined
    return `${nat || 'Mutation'} · ${date || ''}`
  }
  return n.other_id
}

function neighborSubtitle(n: EntityNeighbor): string {
  const d = n.display ?? {}
  if (n.other_type === 'personne_brh') {
    return [(d.ville as string) || '', (d.enrichment_tier as string) || ''].filter(Boolean).join(' · ')
  }
  if (n.other_type === 'sci') {
    return [
      (d.commune as string) || '',
      (d.forme_juridique as string) || '',
      (d.is_active as boolean) === false ? 'radiée' : '',
      (d.has_deceased_dirigeant as boolean) ? 'décès dirigeant' : '',
    ].filter(Boolean).join(' · ')
  }
  if (n.other_type === 'adresse_dpe') {
    return [
      (d.code_postal as string) || '',
      (d.commune as string) || '',
      (d.etiquette_dpe as string) ? `DPE ${d.etiquette_dpe}` : '',
      (d.surface_habitable as number) ? `${d.surface_habitable} m²` : '',
    ].filter(Boolean).join(' · ')
  }
  if (n.other_type === 'mutation_dvf') {
    const eur = (d.valeur_fonciere_cents as number | null) != null
      ? Math.round((d.valeur_fonciere_cents as number) / 100).toLocaleString('fr-FR') + ' €'
      : ''
    const surf = (d.surface_reelle_bati as number) ? `${d.surface_reelle_bati} m²` : ''
    const prixM2 = (d.prix_m2_calc as number) ? `${(d.prix_m2_calc as number).toLocaleString('fr-FR')} €/m²` : ''
    const groupee = (d.is_groupee as boolean) ? 'groupée' : ''
    return [eur, surf, prixM2, groupee].filter(Boolean).join(' · ')
  }
  return ''
}

export function EntityLinksPanel({ type, id, profileBase, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { data, isLoading } = useEntityNeighbors(open ? type : null, open ? id : null)

  const total = data?.length ?? 0
  const grouped: Record<string, EntityNeighbor[]> = {}
  for (const n of data ?? []) {
    const key = `${n.link_type}:${n.other_type}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(n)
  }
  const groupKeys = Object.keys(grouped).sort()

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Liens 360° {open && total > 0 && <span className="text-[11px] font-normal text-slate-500">— {total} voisin(s)</span>}
        </span>
        {open && isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </button>
      {open && (
        <div className="space-y-2 p-3">
          {!isLoading && total === 0 && (
            <div className="text-xs italic text-slate-500">
              Aucun voisin dans le graphe. Relancer <code>brh_entity_links_recompute()</code> côté SQL.
            </div>
          )}
          {groupKeys.map((k) => {
            const neighbors = grouped[k]
            const sample = neighbors[0]
            const meta = TYPE_META[sample.other_type] ?? TYPE_META.personne_brh
            const linkLabel = LINK_META[sample.link_type] ?? sample.link_type
            return (
              <section key={k} className={`rounded-md border p-2 ${meta.cls.replace('text-', 'text-')}`}>
                <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                  <meta.Icon className="h-3 w-3" />
                  {linkLabel} → {meta.label} ({neighbors.length})
                </div>
                <ul className="space-y-1">
                  {neighbors.slice(0, 8).map((n) => {
                    const href = entityRoute(profileBase, n.other_type, n.other_id)
                    const title = neighborTitle(n)
                    const subtitle = neighborSubtitle(n)
                    return (
                      <li key={`${n.direction}-${n.other_type}-${n.other_id}-${n.link_type}`}
                          className="rounded bg-white/80 px-1.5 py-1 text-[11px] text-slate-800">
                        <div className="flex flex-wrap items-baseline gap-2">
                          {href ? (
                            <Link to={href} className="font-medium text-slate-900 hover:underline">{title}</Link>
                          ) : (
                            <span className="font-medium">{title}</span>
                          )}
                          {n.direction === 'incoming' && (
                            <span className="rounded-full bg-slate-200 px-1 py-0.5 text-[9px] text-slate-700">↩ entrant</span>
                          )}
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-800">
                            {(n.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {subtitle && <div className="mt-0.5 text-[10px] text-slate-600">{subtitle}</div>}
                      </li>
                    )
                  })}
                  {neighbors.length > 8 && (
                    <li className="px-1.5 text-[10px] italic text-slate-500">+ {neighbors.length - 8} autres…</li>
                  )}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
