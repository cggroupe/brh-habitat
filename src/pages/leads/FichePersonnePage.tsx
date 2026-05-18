/**
 * Page route fiche personne — wrapper qui lit le nameOrId (MVP : nom URL-encoded)
 * depuis l'URL. Sera basculé vers entity_id UUID en Sprint 3.
 */
import { useParams, Navigate } from 'react-router-dom'
import FichePersonneView from '@/components/leads/fiche/FichePersonneView'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

export default function FichePersonnePage({ profile }: Props) {
  const { nameOrId } = useParams<{ nameOrId: string }>()
  if (!nameOrId || nameOrId.length < 2) {
    return <Navigate to="/" replace />
  }
  return <FichePersonneView nameOrId={nameOrId} profile={profile} />
}
