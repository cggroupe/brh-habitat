/**
 * Page route fiche adresse — wrapper qui lit l'ID DPE depuis l'URL.
 * Le profil est injecté via prop par App.tsx selon la route (/agence|employe|artisan|notaire/leads/adresse/:dpeId).
 */
import { useParams, Navigate } from 'react-router-dom'
import FicheAdresseView from '@/components/leads/fiche/FicheAdresseView'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

export default function FicheAdressePage({ profile }: Props) {
  const { dpeId } = useParams<{ dpeId: string }>()
  const id = Number(dpeId)
  if (!Number.isFinite(id) || id <= 0) {
    return <Navigate to="/" replace />
  }
  return <FicheAdresseView dpeId={id} profile={profile} />
}
