import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Euro,
  Users,
  MessageSquare,
  Building2,
  LogOut,
  ChevronRight,
  Share2,
  QrCode,
  Network,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'

const proNavItems = [
  { to: '/pro', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/pro/prospects', label: 'Prospects', icon: UserPlus },
  { to: '/pro/commissions', label: 'Commissions', icon: Euro },
  { to: '/pro/equipe', label: 'Equipe', icon: Users },
  { to: '/pro/messages', label: 'Messages', icon: MessageSquare },
  { to: '/pro/profil', label: 'Mon entreprise', icon: Building2 },
  { to: '/pro/reseaux-sociaux', label: 'Reseaux sociaux', icon: Share2 },
  { to: '/pro/qrcode', label: 'Mon QR Code', icon: QrCode },
  { to: '/pro/vendeurs', label: 'Mon reseau', icon: Network },
  { to: '/pro/assistant', label: 'IA Batiment', icon: Sparkles },
]

export default function ProShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Mobile nav */}
      <PortalMobileNav portalLabel="Partenaire" navItems={proNavItems} rootPath="/pro" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-primary-dark flex-col min-h-screen">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-accent text-2xl tracking-wider text-white">BRH</span>
              <span className="font-display text-xs text-primary-light uppercase tracking-widest">Partenaire</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        {user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-display text-sm shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display text-white truncate">{user.full_name}</p>
                <p className="text-xs text-primary-light font-body">Partenaire Pro</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 px-3">
          {proNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/pro'}
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

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-green-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Se deconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
