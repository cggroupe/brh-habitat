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
  sci_patrimoniale: { label: 'SCI patrimoniale', icon: null },
  utility: { label: 'Opérateur réseau', icon: null },
  bailleur_social: { label: 'Bailleur social', icon: null },
  collectivite: { label: 'Collectivité', icon: null },
  autre: { label: 'Société', icon: null },
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
    <article className="rounded-2xl bg-surface ring-1 ring-border-strong/20 p-6 transition hover:ring-text-muted/40">
      {/* Zone 1 — Identité */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted font-bold">
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-mono">{formatSiren(siren)}</span>
            {formeJuridique && <span>· {formeJuridique}</span>}
          </div>
          <h3 className="mt-1 truncate font-display text-xl font-bold text-text">
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

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {/* Zone 3 — Coordonnées */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Coordonnées</div>
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
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
            Siège de la société
            <span className="ml-1 normal-case font-normal text-text-light">(≠ adresse du bien)</span>
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
      <div className="mt-5 grid gap-3 border-t border-border-strong/20 pt-5 sm:grid-cols-2">
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
