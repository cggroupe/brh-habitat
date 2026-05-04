/**
 * Phase R2 — Boutons de contact réutilisables (appel / email / message in-app).
 *
 * Utilisé depuis :
 *   - fiche prospect DPE
 *   - fiche artisan RGE
 *   - fiche agence immo
 *   - drawer carte terrain `/pro/terrain`
 *
 * Le bouton "Message in-app" ouvre la conversation `brh_messages` existante
 * (Phase 6) avec le destinataire pré-rempli si l'identité interne est connue,
 * sinon copie l'email au presse-papier en fallback.
 */
import { Phone, Mail, MessageSquare } from 'lucide-react'

interface ContactButtonsProps {
  email?: string | null
  phone?: string | null
  /** ID profile interne du destinataire (déclenche le routage vers /pro/messages?to=…). */
  internalProfileId?: string | null
  /** Tag affiché à côté des boutons (ex: "Patrick Le Bras"). */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function ContactButtons({
  email,
  phone,
  internalProfileId,
  label,
  size = 'md',
  className = '',
}: ContactButtonsProps) {
  const buttonClass =
    size === 'sm'
      ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition'
      : 'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition'
  const iconSize = size === 'sm' ? 14 : 16

  const hasAnyContact = !!(email || phone || internalProfileId)
  if (!hasAnyContact) {
    return (
      <span className="text-xs text-gray-400 italic">
        Aucun contact disponible
      </span>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {label ? <span className="text-sm text-gray-600 mr-1">{label}</span> : null}
      {phone ? (
        <a href={`tel:${phone}`} className={buttonClass} title={`Appeler ${phone}`}>
          <Phone size={iconSize} className="text-emerald-600" />
          <span>Appeler</span>
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={buttonClass} title={`Email ${email}`}>
          <Mail size={iconSize} className="text-blue-600" />
          <span>Email</span>
        </a>
      ) : null}
      {internalProfileId ? (
        <a
          href={`/pro/messages?to=${internalProfileId}`}
          className={buttonClass}
          title="Ouvrir une conversation in-app"
        >
          <MessageSquare size={iconSize} className="text-purple-600" />
          <span>Message</span>
        </a>
      ) : null}
    </div>
  )
}
