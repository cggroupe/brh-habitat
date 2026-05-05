/**
 * Phase 16.0.6 — Shell portail agence immobilière.
 * Refonte design 2026-05-04 : sortie du tout-bleu placeholder, accent
 * orange/rouge thématique (segments very_hot/hot du Score Vente).
 */
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Flame,
  CreditCard,
  Building2,
  LogOut,
  ShieldCheck,
  Handshake,
  Award,
  Sparkles,
  Share2,
  Network,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { supabase } from '@/lib/supabase'

const AGENCE_NAV = [
  { to: '/agence', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/agence/simulateur', label: 'Simulateur énergétique', icon: Sparkles },
  { to: '/agence/score-vente', label: 'Score Vente', icon: Flame },
  { to: '/agence/leads', label: 'Mes leads', icon: ClipboardList },
  { to: '/agence/contributions', label: 'Apporter prospect', icon: Handshake },
  { to: '/agence/reseaux-sociaux', label: 'Réseaux sociaux', icon: Share2 },
  { to: '/agence/parrainage', label: 'Mon réseau', icon: Network },
  { to: '/agence/progression', label: 'Ma progression', icon: Award },
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
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar desktop — slate dark + accent orange */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen bg-slate-900 text-white">
        {/* Brand block */}
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Flame size={16} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-orange-300/80 font-bold">
              Espace agence
            </span>
          </div>
          <p className="font-display text-base truncate text-white/95">
            {user?.full_name ?? 'Agence partenaire'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{user?.email}</p>
        </div>

        {/* Bell visible direct dans le header (mieux que tout en bas) */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Activité
          </span>
          <NotificationBell />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {AGENCE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/10 text-white font-semibold border-l-2 border-orange-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer : badge Hoguet + logout */}
        <div className="p-3 border-t border-white/5">
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <p className="text-[11px] font-semibold text-emerald-300">
                Modèle Hoguet « A »
              </p>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Vous recevez des fiches d'opportunité scorées (pas de transaction
              directe). Contact sous votre charte.
            </p>
          </div>
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
        {/* Header mobile */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
            <p className="font-display text-base">Espace agence</p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
