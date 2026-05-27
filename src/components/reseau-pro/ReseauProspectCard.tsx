/**
 * ReseauProspectCard — card prospect annuaire réseau pro.
 *
 * Deux états visuels :
 *  - non claim : interactive (cliquable, contacts visibles tel/email)
 *  - claim par autre employé : grisée + overlay "Suivi par X", non-cliquable,
 *    pas d'accès aux contacts (matrice ownership progressif)
 *  - claim par moi : interactive avec badge "Mon prospect"
 */
import { Link } from 'react-router-dom'
import { Phone, Mail, Globe, ExternalLink, MapPin, Star, Award, Lock, User } from 'lucide-react'
import type { ReseauProspectListItem } from '@/api/brh-reseau-pro'
import { RESEAU_STATUS_LABELS, RESEAU_STATUS_COLORS } from '@/api/brh-reseau-pro'
import Avatar from '@/components/ui/Avatar'

interface Props {
  prospect: ReseauProspectListItem
  /** uid du user courant pour distinguer "claim par moi" vs "par autre" */
  currentUserId: string | null
}

export default function ReseauProspectCard({ prospect, currentUserId }: Props) {
  const claimedByOther = prospect.is_claimed && prospect.claimed_by_user_id !== currentUserId
  const claimedByMe = prospect.is_claimed && prospect.claimed_by_user_id === currentUserId

  if (claimedByOther) {
    return <LockedCard prospect={prospect} />
  }

  return (
    <article className={`group relative rounded-2xl bg-surface ring-1 transition ${
      claimedByMe
        ? 'ring-[#00600a]/30 hover:ring-[#00600a]/50'
        : 'ring-border-strong/20 hover:ring-border-strong/40 hover:shadow-sm'
    } overflow-hidden`}>
      <Link to={`./${prospect.id}`} className="block p-4">
        <header className="flex items-start gap-3">
          <Avatar name={prospect.nom} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-muted">
              {prospect.metier_categorie && <span>{prospect.metier_categorie}</span>}
              {prospect.departement && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{prospect.departement}</span>
                </>
              )}
            </div>
            <h3 className="mt-0.5 font-display text-sm font-semibold text-text leading-tight truncate group-hover:text-[#00600a]">
              {prospect.nom}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
              {prospect.ville && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="opacity-60" />
                  {prospect.ville}
                </span>
              )}
              {prospect.note_google != null && prospect.nb_avis > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Star size={12} fill="currentColor" />
                  {prospect.note_google.toFixed(1)} ({prospect.nb_avis})
                </span>
              )}
              {prospect.is_rge && (
                <span className="inline-flex items-center gap-1 text-[#00600a] font-medium">
                  <Award size={12} />
                  RGE
                </span>
              )}
            </div>
          </div>
          {claimedByMe && prospect.claim_status && (
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${RESEAU_STATUS_COLORS[prospect.claim_status]}`}>
              {RESEAU_STATUS_LABELS[prospect.claim_status]}
            </span>
          )}
        </header>

        {prospect.description && (
          <p className="mt-3 text-xs text-text-muted line-clamp-2 leading-relaxed">
            {prospect.description}
          </p>
        )}

        {/* Contacts inline (employé peut directement appeler/mailer) */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {prospect.telephone && (
            <a
              href={`tel:${prospect.telephone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1 rounded-md bg-[#00600a] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#004807]"
              title="Appeler"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={11} />
              <span className="font-mono">{prospect.telephone}</span>
            </a>
          )}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-text hover:bg-stone-200 truncate max-w-[200px]"
              title="Envoyer un email"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={11} />
              <span className="truncate">{prospect.email}</span>
            </a>
          )}
          {prospect.site_web && (
            <a
              href={prospect.site_web}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-text hover:bg-stone-200"
              title="Site web"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe size={11} />
              Site
              <ExternalLink size={9} className="opacity-50" />
            </a>
          )}
          {prospect.linkedin && (
            <a
              href={prospect.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-900 hover:bg-blue-100"
              title="LinkedIn"
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn
            </a>
          )}
        </div>
      </Link>
    </article>
  )
}

function LockedCard({ prospect }: { prospect: ReseauProspectListItem }) {
  return (
    <article className="relative rounded-2xl bg-stone-50 ring-1 ring-stone-200 overflow-hidden opacity-90 cursor-not-allowed select-none">
      <div className="p-4">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-500">
            <Lock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-stone-400">
              {prospect.metier_categorie && <span>{prospect.metier_categorie}</span>}
              {prospect.departement && (
                <>
                  <span className="opacity-50">·</span>
                  <span>{prospect.departement}</span>
                </>
              )}
            </div>
            <h3 className="mt-0.5 font-display text-sm font-semibold text-stone-500 leading-tight truncate">
              {prospect.nom}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400">
              {prospect.ville && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="opacity-60" />
                  {prospect.ville}
                </span>
              )}
              {prospect.is_rge && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <Award size={12} />
                  RGE
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">
          <User size={14} className="text-stone-400 shrink-0" />
          <div className="min-w-0 flex-1 text-[11px] text-stone-500">
            Suivi par{' '}
            <strong className="text-stone-700">{prospect.claimed_by_name ?? 'un autre employé'}</strong>
            {prospect.claim_status && (
              <>
                {' '}—{' '}
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${RESEAU_STATUS_COLORS[prospect.claim_status]}`}>
                  {RESEAU_STATUS_LABELS[prospect.claim_status]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
