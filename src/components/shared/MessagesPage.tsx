import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchMyThreads,
  fetchThreadMessages,
  createThread,
  sendMessage,
  markThreadMessagesRead,
  uploadMessageAttachment,
} from '@/api/partner-messages'
import { ThreadList } from '@/components/shared/ThreadList'
import { NewThreadForm } from '@/pages/pro/pro-messages/NewThreadForm'
import { MessageThread, MessageThreadEmpty } from '@/pages/pro/pro-messages/MessageThread'
import type { BrhMessageRow } from '@/types/partner'
import type { ThreadWithLastMessage } from '@/api/partner-messages'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

interface MessagesPageProps {
  participantType: 'pro' | 'particulier'
  emptySubtext?: string
}

export default function MessagesPage({ participantType, emptySubtext = "Contactez l'equipe BRH" }: MessagesPageProps) {
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

    try {
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
      fetchMyThreads(user.id).then(setThreads)
    } catch {
      setAttachError("Echec de l'envoi du message")
    } finally {
      setSending(false)
    }
  }

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim() || !newBody.trim() || !user?.id) return
    setCreating(true)
    try {
      const thread = await createThread({
        subject: newSubject.trim(),
        participantId: user.id,
        participantType,
        firstMessage: newBody.trim(),
      })
      setShowNew(false)
      setNewSubject('')
      setNewBody('')
      setActiveThread(thread.id)
      fetchMyThreads(user.id).then(setThreads)
    } catch {
      setAttachError("Echec de la creation du message")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Communication</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">Messages</h1>
        </div>
        <button
          onClick={() => { setShowNew(true); setActiveThread(null) }}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={14} />
          Nouveau message
        </button>
      </div>

      {/* Messaging layout */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden flex" style={{ minHeight: 520 }}>
        {/* Thread list */}
        <div className={`w-full md:w-80 border-r border-background flex flex-col ${activeThread ? 'hidden md:flex' : ''}`}>
          <ThreadList
            threads={threads}
            activeThread={activeThread}
            showNew={showNew}
            emptyText="Aucun message"
            emptySubtext={emptySubtext}
            onSelectThread={(id) => { setActiveThread(id); setShowNew(false) }}
          />
        </div>

        {/* Message area */}
        <div className={`flex-1 flex flex-col ${!activeThread && !showNew ? 'hidden md:flex' : ''}`}>
          {showNew ? (
            <NewThreadForm
              newSubject={newSubject}
              newBody={newBody}
              creating={creating}
              onSubjectChange={setNewSubject}
              onBodyChange={setNewBody}
              onClose={() => setShowNew(false)}
              onSubmit={(e) => void handleCreateThread(e)}
            />
          ) : activeThread ? (
            <MessageThread
              messages={messages}
              currentUserId={user?.id}
              threadSubject={threads.find((t) => t.id === activeThread)?.subject ?? 'Conversation'}
              newMsg={newMsg}
              pendingFile={pendingFile}
              attachError={attachError}
              sending={sending}
              uploadingFile={uploadingFile}
              fileInputRef={fileInputRef}
              messagesRef={messagesRef}
              onBack={() => setActiveThread(null)}
              onNewMsgChange={setNewMsg}
              onFileChange={handleFileChange}
              onClearFile={clearFile}
              onSend={(e) => void handleSend(e)}
              onAttachClick={() => { setAttachError(null); fileInputRef.current?.click() }}
            />
          ) : (
            <MessageThreadEmpty />
          )}
        </div>
      </div>
    </div>
  )
}
