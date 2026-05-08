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
  ShieldCheck,
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
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-screen bg-deep text-white">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
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

        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-primary-light/80 font-bold">
            Activité
          </span>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {/* Top-level */}
          {TOP_LEVEL.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-primary/30 text-white font-semibold border-l-2 border-primary-light'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}

          {/* Groupes pliables */}
          {GROUPS.map((g) => {
            const open = groupsOpen[g.id]
            const hasActive = isPathInGroup(location.pathname, g)
            return (
              <div key={g.id} className="mt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    hasActive
                      ? 'bg-primary/20 text-white font-semibold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <g.icon size={16} />
                  <span className="flex-1 text-left">{g.label}</span>
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {open && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                    {g.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] transition-colors ${
                            isActive
                              ? 'bg-primary/30 text-white font-semibold'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <item.icon size={14} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={14} className="text-primary-light" />
              <p className="text-[11px] font-bold text-primary-light">Modèle Hoguet « A »</p>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Vous recevez des fiches d’opportunité scorées (pas de transaction directe).
              Contact sous votre charte.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
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
