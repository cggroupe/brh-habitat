/**
 * Phase 16.1 — /agence/messages : conversations agence ↔ équipe BRH.
 *
 * Réutilise le composant partagé `MessagesPage` (déjà utilisé par Pro et
 * Particulier). Le participant_type='agence' ouvre les threads dans la
 * file admin (visibles via /admin/messages côté BRH).
 */
import MessagesPage from '@/components/shared/MessagesPage'

export default function AgenceMessages() {
  return (
    <MessagesPage
      participantType="agence"
      emptySubtext="Contactez votre interlocuteur BRH"
    />
  )
}
