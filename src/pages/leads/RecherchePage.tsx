/**
 * Page route /agence/recherche · /employe/recherche · /artisan/recherche
 * Entry point principal du graph navigable BRH.
 */
import { useSearchParams } from 'react-router-dom'
import RechercheView from '@/components/leads/RechercheView'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

export default function RecherchePage({ profile }: Props) {
  const [search] = useSearchParams()
  const q = search.get('q') ?? ''
  return <RechercheView profile={profile} initialQuery={q} />
}
