import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'

const TYPE_ICONS: Record<string, string> = {
  nouveau_prospect: 'bg-blue-100 text-blue-600',
  statut_prospect: 'bg-orange-100 text-orange-600',
  devis_signe: 'bg-green-100 text-green-600',
  commission_versee: 'bg-emerald-100 text-emerald-600',
  points_gagnes: 'bg-purple-100 text-purple-600',
  nouveau_message: 'bg-sky-100 text-sky-600',
  cadeau_disponible: 'bg-amber-100 text-amber-600',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermer au clic exterieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-green-200 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-[60] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-display text-sm uppercase tracking-wide text-slate-700">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-body text-primary hover:text-primary-dark transition-colors"
              >
                <CheckCheck size={13} />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="font-body text-sm text-slate-400">Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const typeClass = TYPE_ICONS[notif.type] ?? 'bg-slate-100 text-slate-500'
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) markRead.mutate(notif.id)
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                      !notif.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeClass}`}>
                      {notif.is_read ? (
                        <Check size={14} />
                      ) : (
                        <Bell size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-body text-sm leading-tight ${notif.is_read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="font-body text-xs text-slate-400 mt-0.5 truncate">{notif.body}</p>
                      )}
                      <p className="font-body text-xs text-slate-300 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
