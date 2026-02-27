import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Home,
  FolderOpen,
  Calendar,
  User,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/mes-logements', label: 'Mes logements', icon: Home },
  { to: '/mes-dossiers', label: 'Mes dossiers', icon: FolderOpen },
  { to: '/mes-rdv', label: 'Mes rendez-vous', icon: Calendar },
  { to: '/profil', label: 'Mon profil', icon: User },
]

export default function DashboardNav() {
  const { user, signOut } = useAuth()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-surface border-r border-gray-light min-h-screen">
        {/* Logo */}
        <div className="p-5 border-b border-gray-light">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="font-accent text-2xl tracking-wider text-primary-dark">BRH</span>
            <span className="font-display text-xs text-primary uppercase tracking-widest">Habitat</span>
          </NavLink>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-light">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-display text-sm shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display text-text-primary truncate">{user.full_name}</p>
                <p className="text-xs text-text-light font-body truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/tableau-de-bord'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-body transition-colors ${
                  isActive
                    ? 'bg-green-50 text-primary font-semibold'
                    : 'text-text-secondary hover:bg-background hover:text-primary'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-light">
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-danger hover:bg-red-50 transition-colors"
          >
            <LogOut size={17} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-gray-light z-20 flex items-stretch">
        {navItems.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/tableau-de-bord'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-body transition-colors ${
                isActive ? 'text-primary' : 'text-text-light'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] leading-tight">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
