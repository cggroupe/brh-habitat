/**
 * Page route fiche entreprise/SCI — wrapper qui lit le SIREN depuis l'URL.
 */
import { useParams, Navigate } from 'react-router-dom'
import FicheEntrepriseView from '@/components/leads/fiche/FicheEntrepriseView'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

export default function FicheEntreprisePage({ profile }: Props) {
  const { siren } = useParams<{ siren: string }>()
  if (!siren || siren.length !== 9 || !/^\d+$/.test(siren)) {
    return <Navigate to="/" replace />
  }
  return <FicheEntrepriseView siren={siren} profile={profile} />
}
