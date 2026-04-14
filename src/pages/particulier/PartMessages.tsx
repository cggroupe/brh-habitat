import { useState, useEffect, useRef } from 'react'
import { Plus, MessageSquare, X, Send, ArrowLeft, Paperclip, CheckCheck, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchMyThreads,
  fetchThreadMessages,
  createThread,
  sendMessage,
  markThreadMessagesRead,
  uploadMessageAttachment,
} from '@/api/partner-messages'
import { ThreadList } from '../pro/pro-messages/ThreadList'
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

export default function PartMessages() {
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

  function clearFile() {
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    clearFile()
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
      participantType: 'particulier',
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Communication</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">Messages</h1>
        </div>
        <button
          onClick={() => { setShowNew(true); setActiveThread(null) }}
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> Nouveau message
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden flex" style={{ minHeight: 480 }}>
        {/* Thread list */}
        <div className={`w-full md:w-80 border-r border-background flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
          <ThreadList
            threads={threads}
            activeThread={activeThread}
            showNew={showNew}
            emptyText="Aucun message"
            emptySubtext="Contactez votre manager BRH"
            onSelectThread={(id) => { setActiveThread(id); setShowNew(false) }}
          />
        </div>

        {/* Message area */}
        <div className={`flex-1 flex flex-col ${!activeThread && !showNew ? 'hidden md:flex' : ''}`}>
          {showNew ? (
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Messagerie</p>
                  <h2 className="font-display text-lg font-bold uppercase tracking-[0.05em] text-text-primary">
                    Nouveau message
                  </h2>
                </div>
                <button onClick={() => setShowNew(false)} className="p-2 text-text-light hover:text-text-primary rounded-xl hover:bg-background transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={(e) => void handleCreateThread(e)} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">Sujet</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-text-primary bg-background placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
                    placeholder="Ex: Question sur mon parrainage"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 block">Message</label>
                  <textarea
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl text-sm text-text-primary bg-background placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all resize-none"
                    placeholder="Ecrivez votre message a l'equipe BRH..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !newSubject.trim() || !newBody.trim()}
                  className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <Send size={14} /> {creating ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            </div>
          ) : activeThread ? (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-background flex items-center gap-3">
                <button onClick={() => setActiveThread(null)} className="md:hidden p-1.5 text-text-light hover:text-text-primary">
                  <ArrowLeft size={18} />
                </button>
                <span className="font-display text-sm font-bold uppercase tracking-[0.05em] text-text-primary">
                  {threads.find((t) => t.id === activeThread)?.subject ?? 'Conversation'}
                </span>
              </div>

              {/* Messages */}
              <div ref={messagesRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-background/30">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${isMe ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-sm' : 'bg-white text-text-primary shadow-[0_2px_8px_rgba(27,28,28,0.06)] rounded-bl-sm'}`}>
                        {(msg.body && msg.body !== msg.attachment_name) && (
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        )}
                        {msg.attachment_url && msg.attachment_name && (
                          <AttachmentPreview url={msg.attachment_url} name={msg.attachment_name} />
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/60' : 'text-text-light'}`}>
                          <span className="text-[10px]">{timeAgo(msg.created_at)}</span>
                          {isMe && msg.is_read && (
                            <CheckCheck size={12} className="text-white/80" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pending file indicator */}
              {pendingFile && (
                <div className="mx-5 mb-1 flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl">
                  <Paperclip size={12} className="text-primary" />
                  <span className="text-xs text-primary truncate flex-1">{pendingFile.name}</span>
                  <button type="button" onClick={clearFile} className="text-primary/60 hover:text-primary">
                    <X size={12} />
                  </button>
                </div>
              )}
              {attachError && (
                <p className="mx-5 mb-1 text-xs text-red-500">{attachError}</p>
              )}

              {/* Input */}
              <form onSubmit={(e) => void handleSend(e)} className="px-5 py-4 border-t border-background flex gap-2 items-center">
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
                  className="p-2.5 text-text-light hover:text-primary transition-colors shrink-0 rounded-xl hover:bg-background"
                  title="Joindre un fichier"
                >
                  <Paperclip size={17} />
                </button>
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background rounded-xl text-sm text-text-primary placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
                  placeholder="Votre message..."
                />
                <button
                  type="submit"
                  disabled={sending || (!newMsg.trim() && !pendingFile)}
                  className="p-2.5 bg-gradient-to-br from-primary to-primary-dark text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {uploadingFile ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-text-light" />
              </div>
              <p className="text-sm text-text-light">Selectionnez une conversation ou envoyez un nouveau message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
