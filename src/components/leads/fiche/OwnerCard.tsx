import type { ReactNode } from 'react'
import { Building2, Phone, Mail, MapPin } from 'lucide-react'
import TypedBadge from '../../ui/TypedBadge'
import DetailRow from '../../ui/DetailRow'
import ClickableCounter from '../../ui/ClickableCounter'
import { formatSiren } from '../../../lib/format'
import type { EntityClass } from '@/types/fiche'

/**
 * Carte propriétaire/société à squelette unique 6 zones — pattern Data-B.
 *
 * Chaque zone est TOUJOURS rendue, même vide ("—"), pour garantir un
 * rangement visuel identique sur toutes les fiches. C'est le coeur de la
 * grammaire "rangement sémantique" qui distingue Data-B.
 *
 * Zones :
 * 1. Identité (dénomination + SIREN + forme juridique)
 * 2. Classification (badge entity_class : SCI patrimoniale / Utility / etc.)
 *    + solvabilité (badge typé)
 * 3. Coordonnées (tel + email)
 * 4. Adresse siège
 * 5. Patrimoine local (compteur cliquable "lots à cette adresse")
 * 6. Patrimoine global (compteur cliquable "N emplacements · M lots")
 */
export interface OwnerCardProps {
  siren: string
  denomination: string
  formeJuridique?: string | null
  entityClass?: EntityClass | null
  solvabilite?: string | null
  /** Téléphone, email — null si non disponibles. */
  phone?: string | null
  email?: string | null
  /** Adresse complète du siège. */
  siegeAdresse?: string | null
  /** Patrimoine à l'adresse courante (vu depuis fiche adresse). */
  lotsIci?: number | null
  /** Patrimoine total (national). */
  emplacementsGlobaux?: number | null
  lotsGlobaux?: number | null
  /** Actions cliquables : voir fiche entreprise complète, "tout son patrimoine", etc. */
  actions?: ReactNode
  /** Callback pour click sur patrimoine global (drill-down). */
  onClickPatrimoineGlobal?: () => void
  /** Callback pour click sur patrimoine local. */
  onClickPatrimoineLocal?: () => void
}

const CLASS_LABEL: Record<EntityClass, { label: string; icon: ReactNode }> = {
  sci_patrimoniale: { label: 'SCI patrimoniale', icon: <span>🏠</span> },
  utility: { label: 'Opérateur réseau', icon: <span>📡</span> },
  bailleur_social: { label: 'Bailleur social', icon: <span>🏛️</span> },
  collectivite: { label: 'Collectivité', icon: <span>⚖️</span> },
  autre: { label: 'Société', icon: <span>🏢</span> },
}

export default function OwnerCard({
  siren,
  denomination,
  formeJuridique,
  entityClass,
  solvabilite,
  phone,
  email,
  siegeAdresse,
  lotsIci,
  emplacementsGlobaux,
  lotsGlobaux,
  actions,
  onClickPatrimoineGlobal,
  onClickPatrimoineLocal,
}: OwnerCardProps) {
  const klass = entityClass ?? 'autre'
  const classMeta = CLASS_LABEL[klass]

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm">
      {/* Zone 1 — Identité */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-mono">{formatSiren(siren)}</span>
            {formeJuridique && <span>· {formeJuridique}</span>}
          </div>
          <h3 className="mt-0.5 truncate font-display text-base font-semibold text-stone-900">
            {denomination}
          </h3>
          {/* Zone 2 — Classification + solvabilité */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TypedBadge
              variant="entity-class"
              label={classMeta.label}
              icon={classMeta.icon}
            />
            {solvabilite && (
              <TypedBadge variant="solvabilite" label={solvabilite} />
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Zone 3 — Coordonnées */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-stone-400">Coordonnées</div>
          <DetailRow
            label={
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Tél.
              </span> as unknown as string
            }
            value={phone}
            showEmpty
          />
          <DetailRow
            label={
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span> as unknown as string
            }
            value={email}
            showEmpty
          />
        </div>

        {/* Zone 4 — Adresse siège SCI (différente de l'adresse du bien détenu) */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-stone-400">
            Siège de la société{' '}
            <span className="text-stone-400 normal-case">(≠ adresse du bien)</span>
          </div>
          <DetailRow
            label={
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Adresse
              </span> as unknown as string
            }
            value={siegeAdresse}
            showEmpty
          />
        </div>
      </div>

      {/* Zones 5 + 6 — Patrimoine local + global */}
      <div className="mt-3 grid gap-2 border-t border-stone-100 pt-3 sm:grid-cols-2">
        <ClickableCounter
          variant="card"
          count={lotsIci ?? 0}
          label="lots à cette adresse"
          tooltip={lotsIci ? `${lotsIci} lots détenus ici` : undefined}
          onClick={onClickPatrimoineLocal}
          icon={<MapPin className="h-4 w-4 text-[#00600a]" />}
        />
        <ClickableCounter
          variant="card"
          count={lotsGlobaux ?? emplacementsGlobaux ?? 0}
          label={
            emplacementsGlobaux
              ? `lots · ${emplacementsGlobaux} emplacements (France)`
              : 'lots détenus (France)'
          }
          tooltip={
            lotsGlobaux
              ? `${lotsGlobaux} lots / ${emplacementsGlobaux ?? '?'} emplacements détenus France entière`
              : undefined
          }
          onClick={onClickPatrimoineGlobal}
          icon={<Building2 className="h-4 w-4 text-[#00600a]" />}
        />
      </div>
    </article>
  )
}
