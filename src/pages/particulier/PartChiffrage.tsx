import { useAuth } from '@/hooks/useAuth'
import ChiffrageAIChat from '@/components/shared/ChiffrageAIChat'

export default function PartChiffrage() {
  const { user } = useAuth()

  return (
    <ChiffrageAIChat
      partnerType="particulier"
      userId={user?.id}
      userName={user?.full_name}
      welcomeMessage="Bonjour ! Je vais vous aider a estimer le cout des travaux pour votre filleul.

Quel type de travaux souhaitez-vous chiffrer ?"
      subtitle="Estimez les travaux pour vos filleuls"
    />
  )
}
