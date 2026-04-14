import { MessageSquare } from 'lucide-react'
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

interface ThreadListProps {
  threads: ThreadWithLastMessage[]
  activeThread: string | null
  showNew: boolean
  emptyText?: string
  emptySubtext?: string
  onSelectThread: (id: string) => void
}

export function ThreadList({
  threads,
  activeThread,
  showNew,
  emptyText = 'Aucun message',
  emptySubtext = 'Contactez l\'equipe BRH',
  onSelectThread,
}: ThreadListProps) {
  if (threads.length === 0 && !showNew) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-3">
          <MessageSquare size={24} className="text-text-light/30" />
        </div>
        <p className="text-sm font-medium text-text-light">{emptyText}</p>
        <p className="text-xs text-text-light/60 mt-1">{emptySubtext}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectThread(t.id)}
          className={`w-full text-left px-5 py-4 hover:bg-background/60 transition-colors border-b border-background ${
            activeThread === t.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-text-primary truncate">{t.subject}</span>
            {t.unread_count > 0 && (
              <span className="w-5 h-5 bg-gradient-to-br from-primary to-primary-dark text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                {t.unread_count}
              </span>
            )}
          </div>
          <p className="text-xs text-text-light truncate">{t.last_message ?? '...'}</p>
          <p className="text-[10px] text-text-light/50 mt-1 font-bold uppercase tracking-wider">{timeAgo(t.last_message_at)}</p>
        </button>
      ))}
    </div>
  )
}
