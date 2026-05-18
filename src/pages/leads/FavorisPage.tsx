import FavorisView from '@/components/leads/FavorisView'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

export default function FavorisPage({ profile }: Props) {
  return <FavorisView profile={profile} />
}
