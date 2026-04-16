import { useAuth } from '@/hooks/useAuth'
import { useMyCompany } from '@/hooks/queries'
import ChiffrageAIChat from '@/components/shared/ChiffrageAIChat'

export default function ProChiffrage() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)

  return (
    <ChiffrageAIChat
      partnerType="pro"
      userId={user?.id}
      userName={user?.full_name}
      companyId={company?.id}
      companyName={company?.name}
      welcomeMessage="Bonjour ! Je vais vous aider a creer un chiffrage estimatif pour votre client.

Quel type de travaux souhaitez-vous chiffrer ? (toiture, isolation, fenetres, electricite, plomberie, ravalement, etc.)"
      subtitle="Generez des chiffrages estimatifs pour vos clients"
    />
  )
}
