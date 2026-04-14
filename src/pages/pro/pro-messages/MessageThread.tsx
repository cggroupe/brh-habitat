import { ArrowLeft, Paperclip, Send, X, CheckCheck, FileText, MessageSquare } from 'lucide-react'
import type { BrhMessageRow } from '@/types/partner'

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

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "A l'instant"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

interface MessageThreadProps {
  messages: BrhMessageRow[]
  currentUserId: string | undefined
  threadSubject: string
  newMsg: string
  pendingFile: File | null
  attachError: string | null
  sending: boolean
  uploadingFile: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  messagesRef: React.RefObject<HTMLDivElement | null>
  onBack: () => void
  onNewMsgChange: (v: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onSend: (e: React.FormEvent) => void
  onAttachClick: () => void
}

export function MessageThread({
  messages,
  currentUserId,
  threadSubject,
  newMsg,
  pendingFile,
  attachError,
  sending,
  uploadingFile,
  fileInputRef,
  messagesRef,
  onBack,
  onNewMsgChange,
  onFileChange,
  onClearFile,
  onSend,
  onAttachClick,
}: MessageThreadProps) {
  return (
    <>
      <div className="px-6 py-4 border-b border-background flex items-center gap-3 bg-background/50">
        <button onClick={onBack} className="md:hidden p-1.5 text-text-light hover:text-text-primary rounded-lg">
          <ArrowLeft size={17} />
        </button>
        <span className="font-bold text-sm text-text-primary uppercase tracking-wide">
          {threadSubject}
        </span>
      </div>

      <div ref={messagesRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                isMe
                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-md'
                  : 'bg-background text-text-primary rounded-bl-md'
              }`}>
                {(msg.body && msg.body !== msg.attachment_name) && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                )}
                {msg.attachment_url && msg.attachment_name && (
                  <AttachmentPreview url={msg.attachment_url} name={msg.attachment_name} />
                )}
                <div className={`flex items-center justify-end gap-1 mt-1.5 ${isMe ? 'text-white/60' : 'text-text-light'}`}>
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
        <div className="mx-5 mb-1.5 flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl">
          <Paperclip size={12} className="text-primary" />
          <span className="text-xs text-primary font-medium truncate flex-1">{pendingFile.name}</span>
          <button
            type="button"
            onClick={onClearFile}
            className="text-primary/60 hover:text-primary"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {attachError && (
        <p className="mx-5 mb-1 text-xs text-red-500 font-medium">{attachError}</p>
      )}

      <form onSubmit={onSend} className="px-5 py-4 border-t border-background flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={onAttachClick}
          className="p-2.5 text-text-light hover:text-primary transition-colors shrink-0 rounded-xl hover:bg-background"
          title="Joindre un fichier"
        >
          <Paperclip size={17} />
        </button>
        <input
          value={newMsg}
          onChange={(e) => onNewMsgChange(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-background hover:border-text-light/30 rounded-full text-sm text-text-primary focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-colors"
          placeholder="Votre message..."
        />
        <button
          type="submit"
          disabled={sending || (!newMsg.trim() && !pendingFile)}
          className="p-2.5 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {uploadingFile ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </form>
    </>
  )
}

export function MessageThreadEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
        <MessageSquare size={28} className="text-text-light/30" />
      </div>
      <p className="text-sm text-text-light font-medium">Selectionnez une conversation</p>
      <p className="text-xs text-text-light/60 mt-1">ou envoyez un nouveau message</p>
    </div>
  )
}
