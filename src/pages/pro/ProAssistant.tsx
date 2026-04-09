import { useAuth } from '@/hooks/useAuth'
import ChatAI from '@/components/shared/ChatAI'

export default function ProAssistant() {
  const { user } = useAuth()

  return (
    <div className="p-6 lg:p-10 h-[calc(100vh-2rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
        <ChatAI mode="pro" userName={user?.full_name} />
      </div>
    </div>
  )
}
