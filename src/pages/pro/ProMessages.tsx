import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Plus, ArrowLeft, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchMyThreads, fetchThreadMessages, createThread, sendMessage, markThreadMessagesRead } from '@/api/partner-messages'
import type { BrhMessageRow } from '@/types/partner'
import type { ThreadWithLastMessage } from '@/api/partner-messages'

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "A l'instant"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export default function ProMessages() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ThreadWithLastMessage[]>([])
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<BrhMessageRow[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchMyThreads(user.id).then(setThreads).finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!activeThread || !user?.id) return
    fetchThreadMessages(activeThread).then(setMessages)
    markThreadMessagesRead(activeThread, user.id)
  }, [activeThread, user?.id])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !activeThread || !user?.id) return
    setSending(true)
    const msg = await sendMessage(activeThread, user.id, newMsg.trim())
    setMessages((prev) => [...prev, msg])
    setNewMsg('')
    setSending(false)
    fetchMyThreads(user.id).then(setThreads)
  }

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim() || !newBody.trim() || !user?.id) return
    setCreating(true)
    const thread = await createThread({
      subject: newSubject.trim(),
      participantId: user.id,
      participantType: 'pro',
      firstMessage: newBody.trim(),
    })
    setShowNew(false)
    setNewSubject('')
    setNewBody('')
    setCreating(false)
    setActiveThread(thread.id)
    fetchMyThreads(user.id).then(setThreads)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">Messages</h1>
        </div>
        <button onClick={() => { setShowNew(true); setActiveThread(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide">
          <Plus size={16} /> Nouveau message
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex" style={{ minHeight: 480 }}>
        {/* Thread list */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
          {threads.length === 0 && !showNew ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare size={36} className="text-slate-200 mb-3" />
              <p className="font-body text-sm text-slate-400">Aucun message</p>
              <p className="font-body text-xs text-slate-300 mt-1">Contactez l'equipe BRH</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {threads.map((t) => (
                <button key={t.id} onClick={() => { setActiveThread(t.id); setShowNew(false) }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${activeThread === t.id ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-sm text-slate-800 truncate">{t.subject}</span>
                    {t.unread_count > 0 && (
                      <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">{t.unread_count}</span>
                    )}
                  </div>
                  <p className="font-body text-xs text-slate-400 truncate">{t.last_message ?? '...'}</p>
                  <p className="font-body text-[10px] text-slate-300 mt-1">{timeAgo(t.last_message_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message area */}
        <div className={`flex-1 flex flex-col ${!activeThread && !showNew ? 'hidden md:flex' : ''}`}>
          {showNew ? (
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg uppercase tracking-wide text-slate-900">Nouveau message</h2>
                <button onClick={() => setShowNew(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <form onSubmit={(e) => void handleCreateThread(e)} className="space-y-4">
                <div>
                  <label className="font-body text-sm text-slate-600 mb-1 block">Sujet</label>
                  <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex: Question sur mes commissions" />
                </div>
                <div>
                  <label className="font-body text-sm text-slate-600 mb-1 block">Message</label>
                  <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={5}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Ecrivez votre message a l'equipe BRH..." />
                </div>
                <button type="submit" disabled={creating || !newSubject.trim() || !newBody.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60">
                  <Send size={15} /> {creating ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            </div>
          ) : activeThread ? (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <button onClick={() => setActiveThread(null)} className="md:hidden p-1 text-slate-400"><ArrowLeft size={18} /></button>
                <span className="font-display text-sm uppercase tracking-wide text-slate-700">
                  {threads.find((t) => t.id === activeThread)?.subject ?? 'Conversation'}
                </span>
              </div>
              <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                        <p className="font-body text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p className={`font-body text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-slate-400'}`}>{timeAgo(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={(e) => void handleSend(e)} className="px-4 py-3 border-t border-slate-100 flex gap-2">
                <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Votre message..." />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="p-2.5 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-60">
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare size={48} className="text-slate-200 mb-3" />
              <p className="font-body text-sm text-slate-400">Selectionnez une conversation ou envoyez un nouveau message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
