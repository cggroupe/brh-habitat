import ChatAI from '@/components/shared/ChatAI'

export default function AssistantPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}>
          <ChatAI mode="visiteur" />
        </div>
      </div>
    </div>
  )
}
