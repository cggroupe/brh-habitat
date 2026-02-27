import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Home,
  FolderOpen,
  Calendar,
  MessageSquare,
  BookOpen,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface AdminNavItem {
  to: string
  label: string
  icon: React.ElementType
}

const adminNavItems: AdminNavItem[] = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/logements', label: 'Logements', icon: Home },
  { to: '/admin/dossiers', label: 'Dossiers', icon: FolderOpen },
  { to: '/admin/rdv', label: 'Rendez-vous', icon: Calendar },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/articles', label: 'Articles', icon: BookOpen },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
]

export default function AdminShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Admin sidebar */}
      <aside className="w-64 shrink-0 bg-primary-dark flex flex-col min-h-screen">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-accent text-2xl tracking-wider text-white">BRH</span>
            <span className="font-display text-xs text-primary-light uppercase tracking-widest">Admin</span>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-display text-sm shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display text-white truncate">{user.full_name}</p>
                <p className="text-xs text-primary-light font-body">Administrateur</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3">
          {adminNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-body transition-colors ${
                  isActive
                    ? 'bg-primary text-white font-semibold'
                    : 'text-green-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-50" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <NavLink
            to="/tableau-de-bord"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-green-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings size={17} />
            Espace client
          </NavLink>
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-green-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
