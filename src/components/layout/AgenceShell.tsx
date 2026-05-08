/**
 * Phase 11.7 — Shell unique portail agence (refonte UX 2026-05-08).
 *
 * Sidebar à 3 niveaux :
 *   1. Top-level (Accueil, Simulateur, Score Vente)
 *   2. Groupes pliables (Foncier, Réseau pro, Mon agence)
 *   3. Sous-entrées au sein des groupes
 *
 * Le réseau pro est désormais intégré dans CE shell (cohérence UX) :
 * routes /reseau/* utilisent AgenceShell + sidebar agence reste accessible.
 */
import { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Flame,
  CreditCard,
  Building2,
  LogOut,
  Handshake,
  Award,
  Sparkles,
  Share2,
  Network,
  Users,
  QrCode,
  MessageCircle,
  Map as MapIcon,
  Star,
  AlertTriangle,
  Briefcase,
  Globe,
  ChevronDown,
  ChevronRight,
  Home,
  type LucideIcon,
} from 'lucide-react'
import { Trophy, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import CommandPalette from '@/components/shared/CommandPalette'
import { supabase } from '@/lib/supabase'

interface NavLeaf {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface NavGroup {
  id: 'foncier' | 'reseau' | 'mon-agence'
  label: string
  icon: LucideIcon
  matchPaths: string[]
  items: NavLeaf[]
}

const TOP_LEVEL: NavLeaf[] = [
  { to: '/agence', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/agence/simulateur', label: 'Simulateur énergétique', icon: Sparkles },
  { to: '/agence/score-vente', label: 'Score Vente', icon: Flame },
  { to: '/agence/leads', label: 'Mes leads', icon: ClipboardList },
  { to: '/agence/leaderboard', label: 'Classement Bretagne', icon: Trophy },
]

const GROUPS: NavGroup[] = [
  {
    id: 'foncier',
    label: 'Foncier',
    icon: MapIcon,
    matchPaths: ['/agence/foncier'],
    items: [
      { to: '/agence/foncier/carte', label: 'Carte cadastre', icon: MapIcon },
      { to: '/agence/foncier/prospects', label: 'Prospects DPE', icon: ClipboardList },
      { to: '/agence/foncier/favoris', label: 'Favoris', icon: Star },
      { to: '/agence/foncier/sci', label: 'SCI et personnes morales', icon: Building2 },
      { to: '/agence/foncier/tertiaire', label: 'Tertiaire et permis', icon: AlertTriangle },
    ],
  },
  {
    id: 'reseau',
    label: 'Réseau pro',
    icon: Globe,
    matchPaths: ['/reseau'],
    items: [
      { to: '/reseau', label: 'Fil d’actualité', icon: Home, end: true },
      { to: '/reseau/connexions', label: 'Mes connexions', icon: Users },
      { to: '/reseau/chantiers', label: 'Chantiers partagés', icon: Briefcase },
      { to: '/reseau/messages', label: 'Messages', icon: MessageCircle },
      { to: '/reseau/decouvrir', label: 'Découvrir', icon: MapIcon },
    ],
  },
  {
    id: 'mon-agence',
    label: 'Mon agence',
    icon: Building2,
    matchPaths: [
      '/agence/profil',
      '/agence/equipe',
      '/agence/abonnement',
      '/agence/progression',
      '/agence/qr-code',
      '/agence/parrainage',
      '/agence/contributions',
      '/agence/reseaux-sociaux',
      '/agence/messages',
    ],
    items: [
      { to: '/agence/profil', label: 'Profil agence', icon: Building2 },
      { to: '/agence/equipe', label: 'Équipe', icon: Users },
      { to: '/agence/messages', label: 'Messagerie BRH', icon: MessageCircle },
      { to: '/agence/contributions', label: 'Apporter prospect', icon: Handshake },
      { to: '/agence/parrainage', label: 'Parrainage agences', icon: Network },
      { to: '/agence/reseaux-sociaux', label: 'Publications réseaux', icon: Share2 },
      { to: '/agence/qr-code', label: 'QR Code vitrine', icon: QrCode },
      { to: '/agence/progression', label: 'Progression', icon: Award },
      { to: '/agence/abonnement', label: 'Abonnement', icon: CreditCard },
    ],
  },
]

function isPathInGroup(pathname: string, group: NavGroup): boolean {
  return group.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function AgenceShell() {
  const { user } = useAuth()
  const location = useLocation()

  // Auto-ouvre le groupe correspondant à la route active.
  const initialOpen = useMemo(() => {
    const open: Record<NavGroup['id'], boolean> = {
      foncier: false,
      reseau: false,
      'mon-agence': false,
    }
    for (const g of GROUPS) if (isPathInGroup(location.pathname, g)) open[g.id] = true
    return open
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [groupsOpen, setGroupsOpen] = useState(initialOpen)

  // Quand l'utilisateur change de route, on ouvre automatiquement le groupe actif.
  useEffect(() => {
    setGroupsOpen((prev) => {
      const next = { ...prev }
      for (const g of GROUPS) {
        if (isPathInGroup(location.pathname, g)) next[g.id] = true
      }
      return next
    })
  }, [location.pathname])

  function toggleGroup(id: NavGroup['id']) {
    setGroupsOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Pour la nav mobile : on garde une liste plate des entrées les plus utilisées.
  const mobileNav = useMemo(
    () => [
      ...TOP_LEVEL,
      ...GROUPS.flatMap((g) => g.items),
    ].map((i) => ({ to: i.to, label: i.label, icon: i.icon })),
    [],
  )

  return (
    <div className="h-screen flex bg-canvas overflow-hidden">
      {/* Sidebar desktop — Editorial Habitat */}
      <aside
        className="hidden lg:flex flex-col w-[280px] sticky top-0 h-screen text-white py-8"
        style={{ backgroundColor: '#003404' }}
      >
        {/* Brand block */}
        <div className="px-6 mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            BRH Habitat
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight truncate">
                {user?.full_name ?? 'Agence partenaire'}
              </p>
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mt-0.5">
                Bronze Status
              </p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto">
          {/* Top-level */}
          {TOP_LEVEL.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 px-6 transition-all ${
                  isActive
                    ? 'text-white font-bold border-l-4 border-white bg-white/5'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}

          {/* Section header "OUTILS EXPERTS" */}
          <div className="mt-8 px-6 mb-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Outils Experts
            </p>
          </div>

          {/* Groupes pliables */}
          {GROUPS.map((g) => {
            const open = groupsOpen[g.id]
            const hasActive = isPathInGroup(location.pathname, g)
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`w-full flex items-center gap-3 py-3 px-6 transition-colors ${
                    hasActive
                      ? 'text-white font-bold border-l-4 border-white bg-white/5'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <g.icon size={18} />
                  <span className="flex-1 text-left text-sm">{g.label}</span>
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {open && (
                  <div className="bg-black/10">
                    {g.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 py-2 pl-12 pr-6 text-[13px] transition-colors ${
                            isActive
                              ? 'text-white font-semibold bg-white/10'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        <item.icon size={13} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer logout */}
        <div className="px-6 pt-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden bg-white border-b border-neutral-light px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
            <p className="font-display text-base font-bold text-text-primary">Espace agence</p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>

        <PortalMobileNav portalLabel="Espace agence" rootPath="/agence" navItems={mobileNav} />
      </div>
      <CommandPalette />
      {/* Hint Cmd+K (desktop, bottom-right corner) */}
      <button
        type="button"
        onClick={() => {
          const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true })
          document.dispatchEvent(e)
        }}
        className="hidden lg:flex fixed bottom-4 right-4 items-center gap-2 px-3 py-2 rounded-md bg-surface border border-border shadow-sm text-[12px] text-text-muted hover:text-text hover:border-border-strong transition-colors z-40"
      >
        <Search size={13} />
        Rechercher
        <kbd className="text-[10px] border border-border rounded px-1 py-0.5 font-mono ml-1">
          ⌘K
        </kbd>
      </button>
    </div>
  )
}
