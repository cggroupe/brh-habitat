/**
 * Chip / lien cliquable vers une autre fiche du graphe (adresse / entreprise / personne).
 * Sert d'arête visuelle dans la navigation drill-down.
 */
import { Link } from 'react-router-dom'
import { Building2, MapPin, User, ChevronRight } from 'lucide-react'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

type Kind = 'adresse' | 'entreprise' | 'personne'

interface Props {
  kind: Kind
  id: string | number
  label: string
  sublabel?: string | null
  profile: LeadProfile
  variant?: 'chip' | 'row'
}

function profileBasePath(profile: LeadProfile): string {
  switch (profile) {
    case 'employe':
      return '/employe/leads'
    case 'artisan':
      return '/artisan/leads'
    case 'notaire':
      return '/notaire/leads'
    case 'agence':
    default:
      return '/agence/leads'
  }
}

export default function FicheEntityLink({ kind, id, label, sublabel, profile, variant = 'chip' }: Props) {
  const base = profileBasePath(profile)
  const to = `${base}/${kind}/${encodeURIComponent(String(id))}`
  const Icon = kind === 'adresse' ? MapPin : kind === 'entreprise' ? Building2 : User

  if (variant === 'row') {
    return (
      <Link
        to={to}
        className="group flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-900" />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{label}</div>
            {sublabel && <div className="truncate text-xs text-slate-500">{sublabel}</div>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600" />
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
    >
      <Icon className="h-3 w-3" />
      {label}
    </Link>
  )
}
