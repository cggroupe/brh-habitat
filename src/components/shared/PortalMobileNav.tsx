import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
}

interface PortalMobileNavProps {
  portalLabel: string
  navItems: NavItem[]
  rootPath: string
}

export default function PortalMobileNav({ portalLabel, navItems, rootPath }: PortalMobileNavProps) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Fermer au changement de route
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Bloquer le scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Top bar mobile */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-dark border-b border-white/10">
        <button onClick={() => setOpen(true)} className="p-2 text-white rounded-lg hover:bg-white/10">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-accent text-lg tracking-wider text-white">BRH</span>
          <span className="font-display text-[10px] text-primary-light uppercase tracking-widest">{portalLabel}</span>
        </div>
        <NotificationBell />
      </div>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-primary-dark z-[61] md:hidden flex flex-col transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-accent text-xl tracking-wider text-white">BRH</span>
            <span className="font-display text-xs text-primary-light uppercase tracking-widest">{portalLabel}</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-green-200 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* User */}
        {user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display text-xs shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display text-white truncate">{user.full_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === rootPath}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-body transition-colors ${
                  isActive
                    ? 'bg-primary text-white font-semibold'
                    : 'text-green-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={12} className="opacity-50" />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-green-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Se deconnecter
          </button>
        </div>
      </div>
    </>
  )
}
