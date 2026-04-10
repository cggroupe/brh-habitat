import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileDown, Calculator, Sparkles, RotateCcw } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useAuth } from '@/hooks/useAuth'
import { ChiffragePDF, type ChiffrageData, type ChiffrageLineItem } from '@/lib/chiffrage-pdf'
import { formatLocalDate } from '@/lib/utils'
import { sendToAI } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

interface Message { id: string; role: 'user' | 'assistant'; content: string }

// System prompt gere cote serveur (endpoint /api/chat/chiffrage)

function extractChiffrageJSON(text: string): Partial<ChiffrageData> | null {
  const match = text.match(/```(?:chiffrage|json)\s*([\s\S]*?)```/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

export default function PartChiffrage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Bonjour ! Je vais vous aider a estimer le cout des travaux pour votre filleul.\n\nQuel type de travaux souhaitez-vous chiffrer ?' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chiffrageData, setChiffrageData] = useState<ChiffrageData | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    try {
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({ role: m.role, content: m.content }))
      const reply = await sendToAI(history, 'chiffrage')
      const chiffrage = extractChiffrageJSON(reply)
      if (chiffrage?.lignes && chiffrage.total_ttc) {
        const ref = `CHF-${Date.now().toString(36).toUpperCase()}`
        const chiffrageComplete: ChiffrageData = {
          client_name: chiffrage.client_name ?? 'Client', client_address: chiffrage.client_address, client_phone: chiffrage.client_phone,
          partner_name: user?.full_name ?? '', partner_type: 'particulier',
          projet_titre: chiffrage.projet_titre ?? 'Travaux de renovation', projet_description: chiffrage.projet_description,
          lignes: chiffrage.lignes as ChiffrageLineItem[], total_ht: chiffrage.total_ht ?? 0, tva_rate: chiffrage.tva_rate ?? 10,
          total_tva: chiffrage.total_tva ?? 0, total_ttc: chiffrage.total_ttc ?? 0, notes: chiffrage.notes,
          date: formatLocalDate(), reference: ref,
        }
        setChiffrageData(chiffrageComplete)
        supabase.from('brh_chiffrages').insert({
          user_id: user?.id, reference: ref,
          client_name: chiffrageComplete.client_name, client_address: chiffrageComplete.client_address ?? null,
          client_phone: chiffrageComplete.client_phone ?? null, projet_titre: chiffrageComplete.projet_titre,
          projet_description: chiffrageComplete.projet_description ?? null, lignes: chiffrageComplete.lignes,
          total_ht: chiffrageComplete.total_ht, tva_rate: chiffrageComplete.tva_rate,
          total_tva: chiffrageComplete.total_tva, total_ttc: chiffrageComplete.total_ttc,
          notes: chiffrageComplete.notes ?? null,
        }).then(({ error: e }) => { if (e) console.error('Erreur sauvegarde chiffrage:', e) })
      }
      const cleanReply = reply.replace(/```(?:chiffrage|json)[\s\S]*?```/g, '').trim()
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: cleanReply || 'Votre chiffrage est pret ! Telechargez le PDF ci-dessous.' }])
    } catch { setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Erreur de communication. Veuillez reessayer.' }]) }
    finally { setIsLoading(false) }
  }

  async function handleDownloadPdf() {
    if (!chiffrageData) return
    setGeneratingPdf(true)
    try {
      const blob = await pdf(<ChiffragePDF data={chiffrageData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `Chiffrage-BRH-${chiffrageData.reference}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setGeneratingPdf(false) }
  }

  return (
    <div className="p-6 lg:p-10 h-[calc(100vh-2rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
        <div className="bg-gradient-to-r from-primary-dark to-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Calculator size={20} className="text-white" /></div>
            <div>
              <h2 className="font-display text-lg text-white">Chiffrage IA</h2>
              <p className="font-body text-xs text-green-200">Estimez les travaux pour vos filleuls</p>
            </div>
          </div>
          <button onClick={() => { setMessages([{ id: 'w', role: 'assistant', content: 'Nouveau chiffrage ! Quel type de travaux ?' }]); setChiffrageData(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-body hover:bg-white/20"><RotateCcw size={13} /> Nouveau</button>
        </div>
        {chiffrageData && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-green-600" />
              <span className="font-body text-sm text-green-700 font-medium">{chiffrageData.projet_titre} — {(chiffrageData.total_ttc / 100).toLocaleString('fr-FR')} EUR TTC</span>
            </div>
            <button onClick={() => void handleDownloadPdf()} disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark uppercase tracking-wide disabled:opacity-60">
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              {generatingPdf ? 'Generation...' : 'Telecharger PDF'}
            </button>
          </div>
        )}
        <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                  </div>
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex justify-start"><div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Bot size={14} className="text-primary" /></div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="text-primary animate-spin" /><span className="font-body text-sm text-slate-500">Chiffrage en cours...</span>
              </div>
            </div></div>
          )}
        </div>
        <form onSubmit={(e) => void handleSend(e)} className="px-4 py-3 border-t border-slate-100 bg-white flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} placeholder="Decrivez les travaux..."
            className="flex-1 px-4 py-3 border border-slate-200 rounded-full font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <button type="submit" disabled={isLoading || !input.trim()} className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark disabled:opacity-40"><Send size={16} /></button>
        </form>
      </div>
    </div>
  )
}
