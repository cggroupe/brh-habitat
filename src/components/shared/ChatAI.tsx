import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { sendToAI, type AIMode } from '@/lib/ai'

export type ChatMode = 'visiteur' | 'pro'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatAIProps {
  mode: ChatMode
  userName?: string
}

// Les system prompts sont geres cote serveur (3 endpoints distincts)
const MODE_MAP: Record<ChatMode, AIMode> = {
  visiteur: 'visiteur',
  pro: 'pro',
}

const WELCOME_MESSAGES: Record<ChatMode, string> = {
  visiteur: 'Bonjour ! Je suis l\'assistant BRH Habitat. Posez-moi vos questions sur la renovation : prix, conseils, alertes securite... Je peux aussi vous estimer le cout de vos travaux.',
  pro: 'Bonjour ! Je suis votre assistant IA batiment. DTU, normes, estimations de prix, reglementations — posez vos questions techniques.',
}

export default function ChatAI({ mode, userName }: ChatAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGES[mode],
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const reply = await sendToAI(history, MODE_MAP[mode])

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de communication avec l\'IA.')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3 ${mode === 'pro' ? 'bg-primary-dark' : 'bg-gradient-to-r from-primary to-primary-dark'}`}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg text-white">
            {mode === 'visiteur' ? 'Assistant BRH' : 'IA Batiment BRH'}
          </h2>
          <p className="font-body text-xs text-green-200">
            {mode === 'visiteur' ? 'Conseils renovation + estimations de prix' : 'Assistant technique professionnel'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary' : 'bg-slate-100'}`}>
                  {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-primary" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${isUser ? 'bg-primary text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                  <p className="font-body text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`font-body text-[10px] mt-1.5 ${isUser ? 'text-white/50' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="text-primary animate-spin" />
                  <span className="font-body text-sm text-slate-500">Reflexion en cours...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={14} className="text-red-500" />
              <span className="font-body text-xs text-red-600">{error}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => void handleSend(e)} className="px-4 py-3 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'visiteur' ? 'Ex: Combien coute une toiture en ardoise ?' : 'Ex: DTU toiture terrasse vegetalisee ?'}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-full font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
        {userName && (
          <p className="font-body text-[10px] text-slate-300 text-center mt-1.5">
            Connecte en tant que {userName}
          </p>
        )}
      </form>
    </div>
  )
}
