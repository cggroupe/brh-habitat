/**
 * Phase 16.0.6 — Shell portail agence immobilière.
 * Refonte design 2026-05-06 : alignement palette BRH verte (primary).
 * Sidebar deep green (--color-deep #094114) cohérente avec l'identité
 * BRH "rénovation habitat / nature". Le rouge/orange reste réservé au
 * Score Vente (signaux thermiques métier).
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
  Users,
  QrCode,
  MessageCircle,
  Globe,
  Map as MapIcon,
  Star,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { supabase } from '@/lib/supabase'

const AGENCE_NAV = [
  { to: '/agence', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/reseau', label: 'Réseau pro BRH', icon: Globe },
  { to: '/agence/simulateur', label: 'Simulateur énergétique', icon: Sparkles },
  { to: '/agence/score-vente', label: 'Score Vente', icon: Flame },
  // Phase 19 Sprint A-B — Foncier Pro (carte + favoris + SCI enrichi)
  { to: '/agence/foncier/carte', label: 'Foncier — Carte', icon: MapIcon },
  { to: '/agence/foncier/favoris', label: 'Foncier — Favoris', icon: Star },
  { to: '/agence/foncier/sci', label: 'Foncier — SCI', icon: Building2 },
  { to: '/agence/leads', label: 'Mes leads', icon: ClipboardList },
  { to: '/agence/contributions', label: 'Apporter prospect', icon: Handshake },
  { to: '/agence/reseaux-sociaux', label: 'Réseaux sociaux', icon: Share2 },
  { to: '/agence/parrainage', label: 'Mon réseau', icon: Network },
  { to: '/agence/equipe', label: 'Mon équipe', icon: Users },
  { to: '/agence/qr-code', label: 'QR Code', icon: QrCode },
  { to: '/agence/messages', label: 'Messages', icon: MessageCircle },
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
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar desktop — deep green BRH */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen bg-deep text-white">
        {/* Brand block */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-green flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame size={16} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-primary-light font-bold">
              Espace agence
            </span>
          </div>
          <p className="font-display text-base font-bold truncate text-white">
            {user?.full_name ?? 'Agence partenaire'}
          </p>
          <p className="text-[11px] text-primary-light/70 mt-0.5 truncate">{user?.email}</p>
        </div>

        {/* Bell visible direct dans le header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-primary-light/80 font-bold">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-primary/30 text-white font-semibold border-l-2 border-primary-light'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer : badge Hoguet + logout */}
        <div className="p-3 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={14} className="text-primary-light" />
              <p className="text-[11px] font-bold text-primary-light">
                Modèle Hoguet « A »
              </p>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Vous recevez des fiches d'opportunité scorées (pas de transaction
              directe). Contact sous votre charte.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden bg-white border-b border-neutral-light px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary-green flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
            <p className="font-display text-base font-bold text-text-primary">Espace agence</p>
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
