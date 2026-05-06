/**
 * Phase 18.5 — Messagerie unifiée `/reseau/messages`.
 *
 * V1 : wrapper MessagesPage existant avec participantType='pro' par défaut.
 * Les threads existants pro/agence/artisan restent visibles selon RLS.
 * V2 (Étape 5b post-feed) : étendre le composant pour aggréger tous types et
 *   inférer le participant_type depuis le partner_contract du user courant.
 */
import MessagesPage from '@/components/shared/MessagesPage'

export default function ReseauMessages() {
  return (
    <MessagesPage
      participantType="pro"
      emptySubtext="Vue unifiée — tous mes échanges pros (réseau)"
    />
  )
}
