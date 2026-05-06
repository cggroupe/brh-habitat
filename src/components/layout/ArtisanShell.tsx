/**
 * Phase R4 + Phase 17.1 (2026-05-06) — Shell portail artisan.
 *
 * Sidebar enrichie 13 entrées (calque structurel du portail agence Phase 16.1)
 * pour permettre à l'artisan RGE BRH de :
 *  - travailler ses missions (Accueil / Mes missions / Agenda / Messages / Factures / Profil)
 *  - prospecter (Simulateur énergétique / Chiffrage travaux / Leads porte-à-porte)
 *  - développer son réseau (Mon réseau parrainage / Réseaux sociaux / QR code)
 *  - suivre sa progression (Ma progression — paliers bronze/silver/gold/platinum).
 *
 * Accent thématique : amber/orange (casque BTP) pour différencier visuellement
 * du portail agence (rouge/orange Score Vente) et du portail pro (bleu primary).
 */
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  User,
  MessageSquare,
  Sparkles,
  Calculator,
  MapPinned,
  Network,
  Share2,
  QrCode,
  Award,
  HardHat,
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
  { to: '/artisan/simulateur', label: 'Simulateur énergétique', icon: Sparkles },
  { to: '/artisan/chiffrage', label: 'Chiffrage travaux', icon: Calculator },
  { to: '/artisan/leads', label: 'Leads & porte-à-porte', icon: MapPinned },
  { to: '/artisan/reseau', label: 'Mon réseau', icon: Network },
  { to: '/artisan/reseaux-sociaux', label: 'Réseaux sociaux', icon: Share2 },
  { to: '/artisan/qr-code', label: 'QR Code', icon: QrCode },
  { to: '/artisan/progression', label: 'Ma progression', icon: Award },
  { to: '/artisan/agenda', label: 'Agenda', icon: Calendar },
  { to: '/artisan/messages', label: 'Messages', icon: MessageSquare },
  { to: '/artisan/factures', label: 'Factures BRH', icon: FileText },
  { to: '/artisan/profil', label: 'Mon profil RGE', icon: User },
]

export default function ArtisanShell() {
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar desktop — slate dark + accent amber (casque BTP) */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen bg-slate-900 text-white">
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <HardHat size={16} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold">
              Espace artisan
            </span>
          </div>
          <p className="font-display text-base truncate text-white/95">
            {user?.full_name ?? 'Artisan RGE'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{user?.email}</p>
        </div>

        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Activité
          </span>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {ARTISAN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-white font-semibold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <HardHat size={14} className="text-white" />
            </div>
            <p className="font-display text-base">Espace artisan</p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
