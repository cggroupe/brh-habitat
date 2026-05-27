import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Database,
  ExternalLink,
  MapPin,
  Search,
  User,
  Building2,
} from 'lucide-react'

export type EmptyStateKind =
  | 'introuvable'
  | 'aucun-role'
  | 'non-catalogue'
  | 'pas-de-patrimoine'

export type EmptyStateEntity = 'adresse' | 'entreprise' | 'personne' | 'dirigeant'

export interface EmptyAction {
  label: string
  to?: string
  href?: string
  onClick?: () => void
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
}

interface FicheEmptyStateProps {
  kind: EmptyStateKind
  entity: EmptyStateEntity
  entityLabel: string
  description?: ReactNode
  actions?: EmptyAction[]
  children?: ReactNode
}

const ENTITY_ICON: Record<EmptyStateEntity, ReactNode> = {
  adresse: <MapPin className="h-10 w-10 text-stone-300" />,
  entreprise: <Building2 className="h-10 w-10 text-stone-300" />,
  personne: <User className="h-10 w-10 text-stone-300" />,
  dirigeant: <User className="h-10 w-10 text-stone-300" />,
}

const KIND_TITLE: Record<EmptyStateKind, string> = {
  introuvable: 'Introuvable',
  'aucun-role': 'Aucun rôle ou patrimoine BRH connu',
  'non-catalogue': 'Entité non encore cataloguée',
  'pas-de-patrimoine': 'Aucun patrimoine immobilier détecté',
}

/**
 * État vide enrichi — palette Editorial Habitat sobre.
 */
export default function FicheEmptyState({
  kind,
  entity,
  entityLabel,
  description,
  actions,
  children,
}: FicheEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {ENTITY_ICON[entity]}
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">
          {KIND_TITLE[kind]}
        </h2>
        <p className="mt-1 max-w-md text-sm text-stone-600">
          <span className="font-medium text-stone-900">{entityLabel}</span>
          {description ? <> — {description}</> : null}
        </p>
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map((a, i) => (
            <ActionButton key={`${a.label}-${i}`} action={a} />
          ))}
        </div>
      )}
      {children && <div className="mt-4 w-full max-w-2xl">{children}</div>}
    </div>
  )
}

function ActionButton({ action }: { action: EmptyAction }) {
  const variant = action.variant ?? 'primary'
  const baseCls =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition'
  const styleCls =
    variant === 'primary'
      ? 'bg-[#00600a] text-white hover:bg-[#004807]'
      : variant === 'secondary'
        ? 'border border-stone-300 bg-white text-stone-900 hover:bg-stone-50'
        : 'text-[#00600a] hover:bg-stone-100'
  const cls = `${baseCls} ${styleCls}`
  const icon = action.icon ?? <ArrowRight className="h-4 w-4" />

  if (action.to) {
    return (
      <Link to={action.to} className={cls}>
        {icon}
        {action.label}
      </Link>
    )
  }
  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {icon}
        {action.label}
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </a>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {icon}
      {action.label}
    </button>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function defaultActionsFor(
  kind: EmptyStateKind,
  ctx: {
    entityLabel: string
    enrichOnDemandFn?: () => void
    leadsListPath?: string
  },
): EmptyAction[] {
  switch (kind) {
    case 'non-catalogue':
      return [
        ...(ctx.enrichOnDemandFn
          ? [
              {
                label: 'Enrichir maintenant',
                onClick: ctx.enrichOnDemandFn,
                icon: <Database className="h-4 w-4" />,
                variant: 'primary' as const,
              },
            ]
          : []),
        ...(ctx.leadsListPath
          ? [
              {
                label: 'Retour aux leads',
                to: ctx.leadsListPath,
                icon: <Search className="h-4 w-4" />,
                variant: 'secondary' as const,
              },
            ]
          : []),
      ]
    case 'introuvable':
      return [
        ...(ctx.leadsListPath
          ? [
              {
                label: 'Rechercher dans les leads',
                to: ctx.leadsListPath,
                icon: <Search className="h-4 w-4" />,
                variant: 'primary' as const,
              },
            ]
          : []),
      ]
    case 'aucun-role':
      return [
        {
          label: 'Signaler une donnée manquante',
          href: 'mailto:contact-brh@brh-habitat.fr?subject=Donn%C3%A9es%20manquantes',
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'ghost' as const,
        },
        ...(ctx.leadsListPath
          ? [
              {
                label: 'Retour aux leads',
                to: ctx.leadsListPath,
                icon: <Search className="h-4 w-4" />,
                variant: 'secondary' as const,
              },
            ]
          : []),
      ]
    case 'pas-de-patrimoine':
      return [
        ...(ctx.leadsListPath
          ? [
              {
                label: 'Explorer les voisins',
                to: ctx.leadsListPath,
                icon: <MapPin className="h-4 w-4" />,
                variant: 'secondary' as const,
              },
            ]
          : []),
      ]
  }
}
