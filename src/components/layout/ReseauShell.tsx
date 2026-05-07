/**
 * Phase 18.4 (2026-05-06) — Shell portail réseau social `/reseau`.
 *
 * Sidebar 7 entrées transverse aux 4 personae (agences immo, artisans RGE,
 * architectes, apporteurs d'affaires). Accent thématique : cyan-500 (réseau)
 * pour différencier visuellement des portails persona-specific :
 *   - bleu primary  = pro
 *   - rouge/orange  = agence (Score Vente)
 *   - amber/orange  = artisan (casque BTP)
 *   - cyan/sky      = réseau (graphe + chantiers transverses)
 *
 * Routes V1 :
 *   /reseau                       — fil d'actualité
 *   /reseau/decouvrir             — carte Bretagne + filtres
 *   /reseau/chantiers             — marketplace (KILLER feature Étape 7)
 *   /reseau/connexions            — pending + suggestions
 *   /reseau/messages              — fusion messageries pro/agence/artisan
 *   /reseau/parametres/autaf      — bridge OAuth AUTAF (Étape 8)
 *   /reseau/profil/:slug          — vitrine pro polymorphe (lien public)
 *   /reseau/chantiers/nouveau     — publication d'offre (action contextuelle)
 */
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  Home,
  Map,
  Briefcase,
  Users,
  MessageSquare,
  Link2,
  Network,
  LogOut,
  ArrowLeft,
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

const RESEAU_NAV: NavItemDef[] = [
  { to: '/reseau', label: 'Fil d\'actualité', icon: Home, end: true },
  { to: '/reseau/decouvrir', label: 'Découvrir', icon: Map },
  { to: '/reseau/chantiers', label: 'Chantiers', icon: Briefcase },
  { to: '/reseau/connexions', label: 'Connexions', icon: Users },
  { to: '/reseau/messages', label: 'Messages', icon: MessageSquare },
  { to: '/reseau/parametres/autaf', label: 'Bridge AUTAF', icon: Link2 },
]

export default function ReseauShell() {
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar desktop — slate dark + accent cyan (réseau social) */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen bg-slate-900 text-white">
        <div className="px-5 py-6 border-b border-white/5">
          {/* Bouton retour vers le portail d'origine */}
          <Link
            to="/agence"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 transition mb-3"
          >
            <ArrowLeft size={11} />
            Retour mon portail
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Network size={16} className="text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold">
              Réseau pro
            </span>
          </div>
          <p className="font-display text-base truncate text-white/95">
            {user?.full_name ?? 'Membre du réseau'}
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
          {RESEAU_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/10 text-white font-semibold border-l-2 border-cyan-400'
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
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
              <Network size={14} className="text-white" />
            </div>
            <p className="font-display text-base">Réseau pro</p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>

        <PortalMobileNav
          portalLabel="Réseau pro"
          rootPath="/reseau"
          navItems={RESEAU_NAV.map((i) => ({
            to: i.to,
            label: i.label,
            icon: i.icon,
          }))}
        />
      </div>
    </div>
  )
}
