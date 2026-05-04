/**
 * Phase R4 — Page `/artisan/messages` : conversations avec admin BRH + pros recommandeurs.
 *
 * Réutilise le composant générique MessagesPage (Phase 6) avec scope artisan.
 */
import MessagesPage from '@/components/shared/MessagesPage'

export default function ArtisanMessages() {
  // Les artisans sont rattachés à un profile pro (UserRole=pro), donc on utilise
  // le scope 'pro' du composant générique qui pointe sur brh_messages avec
  // participantType='pro'. Future itération : type 'artisan' dédié si besoin.
  return <MessagesPage participantType="pro" emptySubtext="Contactez l'équipe BRH ou les pros qui vous ont recommandé" />
}
