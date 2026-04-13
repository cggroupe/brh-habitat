import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Plus, ArrowLeft, X, Paperclip, CheckCheck, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchMyThreads,
  fetchThreadMessages,
  createThread,
  sendMessage,
  markThreadMessagesRead,
  uploadMessageAttachment,
} from '@/api/partner-messages'
import type { BrhMessageRow } from '@/types/partner'
import type { ThreadWithLastMessage } from '@/api/partner-messages'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "A l'instant"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

function AttachmentPreview({ url, name }: { url: string; name: string }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt={name} className="max-w-[180px] max-h-32 rounded-xl object-cover border border-white/20" />
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
    >
      <FileText size={14} className="shrink-0" />
      <span className="text-xs truncate max-w-[160px]">{name}</span>
    </a>
  )
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
  const [attachError, setAttachError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachError(null)
    if (file.size > MAX_FILE_SIZE) {
      setAttachError('Fichier trop volumineux (max 5 Mo)')
      e.target.value = ''
      return
    }
    setPendingFile(file)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMsg.trim() && !pendingFile) || !activeThread || !user?.id) return
    setSending(true)
    setUploadingFile(false)

    let attachmentUrl: string | undefined
    let attachmentName: string | undefined

    if (pendingFile) {
      setUploadingFile(true)
      try {
        const result = await uploadMessageAttachment(user.id, activeThread, pendingFile)
        attachmentUrl = result.url
        attachmentName = result.name
      } catch {
        setAttachError("Echec de l'envoi du fichier")
        setSending(false)
        setUploadingFile(false)
        return
      }
      setUploadingFile(false)
    }

    const msg = await sendMessage(
      activeThread,
      user.id,
      newMsg.trim() || (attachmentName ?? ''),
      attachmentUrl,
      attachmentName,
    )
    setMessages((prev) => [...prev, msg])
    setNewMsg('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Communication</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">Messages</h1>
        </div>
        <button
          onClick={() => { setShowNew(true); setActiveThread(null) }}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={14} />
          Nouveau message
        </button>
      </div>

      {/* Messaging layout */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden flex" style={{ minHeight: 520 }}>
        {/* Thread list */}
        <div className={`w-full md:w-80 border-r border-[#f5f3f2] flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
          {threads.length === 0 && !showNew ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={24} className="text-[#707a6a]/30" />
              </div>
              <p className="text-sm font-medium text-[#707a6a]">Aucun message</p>
              <p className="text-xs text-[#707a6a]/60 mt-1">Contactez l'equipe BRH</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveThread(t.id); setShowNew(false) }}
                  className={`w-full text-left px-5 py-4 hover:bg-[#f5f3f2]/60 transition-colors border-b border-[#f5f3f2] ${
                    activeThread === t.id ? 'bg-[#1c7b1d]/5 border-l-2 border-l-[#1c7b1d]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#1b1c1c] truncate">{t.subject}</span>
                    {t.unread_count > 0 && (
                      <span className="w-5 h-5 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {t.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#707a6a] truncate">{t.last_message ?? '...'}</p>
                  <p className="text-[10px] text-[#707a6a]/50 mt-1 font-bold uppercase tracking-wider">{timeAgo(t.last_message_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message area */}
        <div className={`flex-1 flex flex-col ${!activeThread && !showNew ? 'hidden md:flex' : ''}`}>
          {showNew ? (
            <div className="flex-1 p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Nouveau</p>
                  <h2 className="font-display text-xl font-bold tracking-wide text-[#1b1c1c] uppercase">Nouveau message</h2>
                </div>
                <button
                  onClick={() => setShowNew(false)}
                  className="p-2 text-[#707a6a] hover:text-[#1b1c1c] transition-colors rounded-xl hover:bg-[#f5f3f2]"
                >
                  <X size={17} />
                </button>
              </div>
              <form onSubmit={(e) => void handleCreateThread(e)} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#404a3c] mb-1.5 block">Sujet</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-4 py-3 border border-[#f5f3f2] hover:border-[#707a6a]/30 rounded-xl text-sm text-[#1b1c1c] focus:outline-none focus:border-[#1c7b1d]/40 focus:ring-2 focus:ring-[#1c7b1d]/20 transition-colors"
                    placeholder="Ex: Question sur mes commissions"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#404a3c] mb-1.5 block">Message</label>
                  <textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-[#f5f3f2] hover:border-[#707a6a]/30 rounded-xl text-sm text-[#1b1c1c] focus:outline-none focus:border-[#1c7b1d]/40 focus:ring-2 focus:ring-[#1c7b1d]/20 resize-none transition-colors"
                    placeholder="Ecrivez votre message a l'equipe BRH..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !newSubject.trim() || !newBody.trim()}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <Send size={13} />
                  {creating ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            </div>
          ) : activeThread ? (
            <>
              <div className="px-6 py-4 border-b border-[#f5f3f2] flex items-center gap-3 bg-[#f5f3f2]/50">
                <button onClick={() => setActiveThread(null)} className="md:hidden p-1.5 text-[#707a6a] hover:text-[#1b1c1c] rounded-lg">
                  <ArrowLeft size={17} />
                </button>
                <span className="font-bold text-sm text-[#1b1c1c] uppercase tracking-wide">
                  {threads.find((t) => t.id === activeThread)?.subject ?? 'Conversation'}
                </span>
              </div>

              <div ref={messagesRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                        isMe
                          ? 'bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white rounded-br-md'
                          : 'bg-[#f5f3f2] text-[#1b1c1c] rounded-bl-md'
                      }`}>
                        {(msg.body && msg.body !== msg.attachment_name) && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        )}
                        {msg.attachment_url && msg.attachment_name && (
                          <AttachmentPreview url={msg.attachment_url} name={msg.attachment_name} />
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-1.5 ${isMe ? 'text-white/60' : 'text-[#707a6a]'}`}>
                          <span className="text-[10px] font-medium">{timeAgo(msg.created_at)}</span>
                          {isMe && msg.is_read && (
                            <CheckCheck size={11} className="text-white/80" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pending file indicator */}
              {pendingFile && (
                <div className="mx-5 mb-1.5 flex items-center gap-2 px-4 py-2 bg-[#1c7b1d]/10 rounded-xl">
                  <Paperclip size={12} className="text-[#1c7b1d]" />
                  <span className="text-xs text-[#1c7b1d] font-medium truncate flex-1">{pendingFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-[#1c7b1d]/60 hover:text-[#1c7b1d]"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {attachError && (
                <p className="mx-5 mb-1 text-xs text-red-500 font-medium">{attachError}</p>
              )}

              <form onSubmit={(e) => void handleSend(e)} className="px-5 py-4 border-t border-[#f5f3f2] flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => { setAttachError(null); fileInputRef.current?.click() }}
                  className="p-2.5 text-[#707a6a] hover:text-[#1c7b1d] transition-colors shrink-0 rounded-xl hover:bg-[#f5f3f2]"
                  title="Joindre un fichier"
                >
                  <Paperclip size={17} />
                </button>
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-[#f5f3f2] hover:border-[#707a6a]/30 rounded-full text-sm text-[#1b1c1c] focus:outline-none focus:border-[#1c7b1d]/40 focus:ring-2 focus:ring-[#1c7b1d]/20 transition-colors"
                  placeholder="Votre message..."
                />
                <button
                  type="submit"
                  disabled={sending || (!newMsg.trim() && !pendingFile)}
                  className="p-2.5 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white rounded-full shadow-md shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {uploadingFile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-[#707a6a]/30" />
              </div>
              <p className="text-sm text-[#707a6a] font-medium">Selectionnez une conversation</p>
              <p className="text-xs text-[#707a6a]/60 mt-1">ou envoyez un nouveau message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
