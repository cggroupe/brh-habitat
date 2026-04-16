import { useAuth } from '@/hooks/useAuth'
import ChatAI from '@/components/shared/ChatAI'

export default function PartAssistant() {
  const { user } = useAuth()

  return (
    <div className="p-6 lg:p-10 h-[calc(100vh-2rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
        <ChatAI mode="particulier" userName={user?.full_name} />
      </div>
    </div>
  )
}
