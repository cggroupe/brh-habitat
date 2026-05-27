/**
 * EmployeShell — Cockpit pour les employés BRH (commercial / opérationnel).
 *
 * Réutilise les pages existantes (foncier, prospection, simulateur, réseau pro)
 * sans le module MLM. Sidebar dédiée pour ne pas mélanger avec /admin.
 */
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  // Map as MapIcon — foncier-only + carte prospects (commenté 2026-05-18)
  Building2,
  ClipboardList,
  // Star, AlertTriangle — foncier-only (commenté 2026-05-18)
  Sparkles,
  Target,
  Globe,
  MessageSquare,
  Mail,
  Calendar,
  TrendingUp,
  Share2,
  Award,
  Search,
  Bookmark,
  Users,
  Handshake,
  LogOut,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getBrhEmployee, ACTIVITY_THRESHOLDS } from '@/lib/brh-employees'

interface NavLeaf {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: string
}

interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  children: NavLeaf[]
}

const TOP_NAV: NavLeaf[] = [
  { to: '/employe', label: 'Cockpit', icon: LayoutDashboard, end: true },
  { to: '/employe/leads', label: 'Mes leads', icon: TrendingUp },
  { to: '/employe/recherche', label: 'Recherche', icon: Search },
  { to: '/employe/favoris', label: 'Favoris', icon: Bookmark },
  { to: '/employe/clients-brh', label: 'Clients BRH', icon: Users },
  { to: '/employe/dirigeants', label: 'Dirigeants SCI', icon: Building2 },
  { to: '/employe/reseau-pro', label: 'Réseau pro', icon: Handshake },
]

const GROUPS: NavGroup[] = [
  // 2026-05-18 — Groupe Foncier masqué : filtres fusionnés dans `/employe/leads`.
  // Routes `/employe/foncier/*` toujours accessibles par URL directe (legacy non supprimé).
  // {
  //   id: 'foncier',
  //   label: 'Foncier',
  //   icon: MapIcon,
  //   children: [
  //     { to: '/employe/foncier/carte', label: 'Carte cadastre', icon: MapIcon },
  //     { to: '/employe/foncier/prospects', label: 'Prospects DPE F/G', icon: ClipboardList },
  //     { to: '/employe/foncier/favoris', label: 'Favoris', icon: Star },
  //     { to: '/employe/foncier/sci', label: 'SCI / personnes morales', icon: Building2 },
  //     { to: '/employe/foncier/tertiaire', label: 'Tertiaire & permis', icon: AlertTriangle },
  //   ],
  // },
  {
    id: 'prospection',
    label: 'Prospection',
    icon: Target,
    children: [
      { to: '/employe/prospection/bretagne', label: 'Top Bretagne F/G', icon: TrendingUp },
      // 2026-05-18 — "Carte prospects" supprimée (doublon de /employe/leads vue carte)
      // { to: '/employe/prospection/carte', label: 'Carte prospects', icon: MapIcon },
      { to: '/employe/simulateur', label: 'Simulateur énergétique', icon: Sparkles },
    ],
  },
  {
    // 2026-05-18 — Liens alignés sur la vraie UX réseau pro (Phase 18 v2 ReseauHub).
    // Plus de "Fil d'actualité" qui renvoyait à un autre dashboard cassé.
    id: 'reseau',
    label: 'Réseau pro',
    icon: Globe,
    children: [
      { to: '/reseau', label: 'Publier', icon: Globe, end: true },
      { to: '/reseau/chantiers', label: 'Chantiers publiés', icon: ClipboardList },
      { to: '/reseau/disponibilites', label: 'Pros disponibles', icon: Calendar },
      { to: '/reseau/connexions', label: 'Mes connexions', icon: Share2 },
      { to: '/reseau/messages', label: 'Messages réseau', icon: MessageSquare },
    ],
  },
  {
    id: 'recrutement',
    label: 'Recrutement partenaires',
    icon: Mail,
    children: [
      { to: '/employe/mails', label: 'Templates emails', icon: Mail },
      { to: '/employe/calendrier', label: 'Mon calendrier RDV', icon: Calendar },
      { to: '/employe/social', label: 'Mes publications', icon: Share2 },
    ],
  },
]

function isPathInGroup(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => pathname === c.to || pathname.startsWith(c.to + '/'))
}

export default function EmployeShell() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const employee = getBrhEmployee(user?.email)
  const levelCfg = employee ? ACTIVITY_THRESHOLDS[employee.activity_level] : ACTIVITY_THRESHOLDS.standard

  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {}
    for (const g of GROUPS) open[g.id] = isPathInGroup(location.pathname, g)
    return open
  })

  function toggleGroup(id: string) {
    setGroupsOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => {})
    void signOut()
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex bg-canvas overflow-hidden">
      {/* Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[280px] sticky top-0 h-screen text-white py-6"
        style={{ backgroundColor: '#003404' }}
      >
        {/* Brand */}
        <div className="px-6 mb-6">
          <h1 className="font-display text-xl font-bold tracking-tight text-white">BRH Habitat</h1>
          <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mt-1">
            Cockpit Employé
          </p>
        </div>

        {/* Profil employé + score activité */}
        {employee && (
          <div className="mx-4 mb-6 rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: levelCfg.color, color: 'white' }}
              >
                {employee.full_name
                  .split(' ')
                  .map((w) => w.charAt(0))
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{employee.full_name}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold">
                  {employee.role_label}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-white/60">Niveau {levelCfg.label}</span>
              <span className="font-bold" style={{ color: levelCfg.color }}>
                {employee.activity_score} pts
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (employee.activity_score / 350) * 100)}%`,
                  backgroundColor: levelCfg.color,
                }}
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto">
          {TOP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 px-6 transition-colors ${
                  isActive
                    ? 'text-white font-bold border-l-4 border-white bg-white/5'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <item.icon size={17} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}

          <div className="mt-6 px-6 mb-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Outils
            </p>
          </div>

          {GROUPS.map((g) => {
            const open = groupsOpen[g.id]
            const hasActive = isPathInGroup(location.pathname, g)
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`w-full flex items-center gap-3 py-2.5 px-6 transition-colors ${
                    hasActive
                      ? 'text-white font-bold border-l-4 border-white bg-white/5'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <g.icon size={17} />
                  <span className="flex-1 text-left text-sm">{g.label}</span>
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {open && (
                  <div className="bg-black/10">
                    {g.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2 py-2 pl-12 pr-6 text-[13px] transition-colors ${
                            isActive
                              ? 'text-white font-semibold bg-white/10'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`
                        }
                      >
                        <child.icon size={12} />
                        <span className="flex-1">{child.label}</span>
                        {child.badge && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded px-1.5 py-0.5">
                            {child.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 pt-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ backgroundColor: '#003404' }}
            >
              <Award size={14} className="text-white" />
            </div>
            <p className="font-display text-base font-bold text-text">Cockpit Employé</p>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
