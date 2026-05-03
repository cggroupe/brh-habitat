/**
 * Phase R4 — Shell portail artisan (sidebar dédiée).
 *
 * Inspiré de ProShell mais avec un menu spécifique aux 6 entrées artisan :
 * Accueil / Missions / Agenda / Factures / Profil / Messages.
 */
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  User,
  MessageSquare,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { supabase } from '@/lib/supabase'

interface NavItemDef {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
}

const ARTISAN_NAV: NavItemDef[] = [
  { to: '/artisan', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/artisan/missions', label: 'Mes missions', icon: Briefcase },
  { to: '/artisan/agenda', label: 'Agenda', icon: Calendar },
  { to: '/artisan/factures', label: 'Factures BRH', icon: FileText },
  { to: '/artisan/messages', label: 'Messages', icon: MessageSquare },
  { to: '/artisan/profil', label: 'Mon profil RGE', icon: User },
]

export default function ArtisanShell() {
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <NavLink to="/artisan" className="block">
            <p className="text-xs uppercase text-gray-400 tracking-wide">Espace artisan</p>
            <p className="font-display text-lg text-text-primary truncate">
              {user?.full_name ?? 'Artisan RGE'}
            </p>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {ARTISAN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Header mobile + content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <p className="font-display text-lg">Espace artisan</p>
          <NotificationBell />
        </header>

        <header className="hidden lg:flex bg-white border-b border-gray-100 px-6 py-3 items-center justify-end sticky top-0 z-30">
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>

        <PortalMobileNav
          portalLabel="Espace artisan"
          rootPath="/artisan"
          navItems={ARTISAN_NAV.map((i) => ({
            to: i.to,
            label: i.label,
            icon: i.icon,
          }))}
        />
      </div>
    </div>
  )
}
