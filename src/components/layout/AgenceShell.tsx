/**
 * Phase 16.0.6 — Shell portail agence immobilière.
 *
 * Sidebar dédiée 5 entrées : Accueil / Mes leads / Score Vente / Abonnement / Profil.
 * Branding distinct (gradient bleu pour différencier du vert pro classique BRH).
 */
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  CreditCard,
  Building2,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { supabase } from '@/lib/supabase'

const AGENCE_NAV = [
  { to: '/agence', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/agence/leads', label: 'Mes leads', icon: ClipboardList },
  { to: '/agence/score-vente', label: 'Score Vente', icon: TrendingUp },
  { to: '/agence/abonnement', label: 'Abonnement', icon: CreditCard },
  { to: '/agence/profil', label: 'Mon agence', icon: Building2 },
]

export default function AgenceShell() {
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop — gradient bleu pour distinguer du vert pro BRH */}
      <aside
        className="hidden lg:flex flex-col w-64 sticky top-0 h-screen text-white"
        style={{
          background: 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)',
        }}
      >
        <div className="p-6 border-b border-white/10">
          <p className="text-xs uppercase text-blue-200/70 tracking-wide">Espace agence</p>
          <p className="font-display text-lg truncate">
            {user?.full_name ?? 'Agence partenaire'}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {AGENCE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 bg-white/5">
          <p className="text-[10px] uppercase tracking-wider text-blue-200/60 px-2 mb-2">
            Modèle Hoguet "A"
          </p>
          <p className="text-[10px] text-blue-100/70 px-2 mb-3 leading-relaxed">
            Vous accédez à des fiches d'opportunité scorées, pas à des
            transactions. Contact direct sous votre responsabilité, dans le
            respect de la charte signée.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:bg-white/10"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <p className="font-display text-lg">Espace agence</p>
          <NotificationBell />
        </header>

        <header className="hidden lg:flex bg-white border-b border-gray-100 px-6 py-3 items-center justify-end sticky top-0 z-30">
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>

        <PortalMobileNav
          portalLabel="Espace agence"
          rootPath="/agence"
          navItems={AGENCE_NAV.map((i) => ({ to: i.to, label: i.label, icon: i.icon }))}
        />
      </div>
    </div>
  )
}
