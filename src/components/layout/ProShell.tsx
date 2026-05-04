/**
 * Phase R5 — ProShell refondu : 14 entrées flat → 8 entrées avec accordéons.
 *
 * Hiérarchie cible :
 *   🏠 Accueil
 *   🎯 Prospection      ↳ Mes prospects · Carte · Top Bretagne · Marketplace
 *   🚗 Terrain          (Phase R2)
 *   🤖 IA               ↳ Chiffrage · DTU · Courrier · Historique  (Phase R3)
 *   👥 Équipe & Réseau  ↳ Employés · Réseau parrainage · Stats équipe
 *   💰 Finance          ↳ Commissions · Mes leads artisans · Abonnement · Rapport
 *                       (groupe gated par PermissionGate canViewFinance en R6)
 *   📣 Communication    ↳ Messages · Réseaux sociaux · QR Code
 *   🏢 Mon entreprise
 */
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Euro,
  Users,
  MessageSquare,
  Building2,
  LogOut,
  Share2,
  QrCode,
  Network,
  Sparkles,
  BarChart3,
  HelpCircle,
  ChevronDown,
  Map,
  Target,
  ShoppingBag,
  ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { useTenant } from '@/config/TenantContext'
import { PermissionGate } from '@/components/auth/PermissionGate'
import type { TenantFeatures } from '@/config/tenant.types'
import type { Permission } from '@/types/permissions'

interface NavLeaf {
  to: string
  label: string
  icon: React.ElementType
  feature?: keyof TenantFeatures
  /** Si présent, l'entrée est masquée si l'user n'a pas la permission. */
  permission?: Permission
}

interface NavGroup {
  id: string
  label: string
  icon: React.ElementType
  /** Si défini, le groupe entier est masqué si la permission n'est pas accordée. */
  permission?: Permission
  /** Route principale (clic sur l'entrée du groupe = navigate ici). */
  defaultTo?: string
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

function isGroup(e: NavEntry): e is NavGroup {
  return 'children' in e
}

const NAV: NavEntry[] = [
  { to: '/pro', label: 'Accueil', icon: LayoutDashboard },
  {
    id: 'prospection',
    label: 'Prospection',
    icon: Target,
    defaultTo: '/pro/prospects',
    children: [
      { to: '/pro/prospects', label: 'Mes prospects', icon: UserPlus },
      { to: '/pro/prospects-bretagne', label: 'Top Bretagne F/G', icon: BarChart3 },
      { to: '/pro/prospects-carte', label: 'Carte', icon: Map },
      { to: '/pro/marketplace-artisans', label: 'Marketplace artisans', icon: ShoppingBag },
    ],
  },
  { to: '/pro/terrain', label: 'Terrain', icon: Map },
  // IA unifiée : un seul lien — le sélecteur de mode (Chiffrage/DTU/Courrier)
  // + l'historique sont DANS la page /pro/ia (Phase R3 + correction 2026-05-04).
  { to: '/pro/ia', label: 'IA Bâtiment', icon: Sparkles, feature: 'aiChiffrage' },
  // Audits DPE 3CL : Pro RGE génère un audit officiel à partir de l'adresse + caractéristiques.
  // C'est l'équivalent BRH de "simulation Cap Rénov+".
  { to: '/pro/audits', label: 'Audits DPE', icon: ClipboardCheck },
  {
    id: 'equipe',
    label: 'Équipe & Réseau',
    icon: Users,
    defaultTo: '/pro/equipe',
    children: [
      { to: '/pro/equipe', label: 'Mes employés', icon: Users, permission: 'canManageEmployees' },
      { to: '/pro/vendeurs', label: 'Mon réseau', icon: Network, feature: 'recruitmentPyramid' },
      { to: '/pro/stats-equipe', label: 'Stats équipe', icon: BarChart3, feature: 'teamStats' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Euro,
    permission: 'canViewFinance',
    defaultTo: '/pro/commissions',
    children: [
      { to: '/pro/commissions', label: 'Commissions', icon: Euro },
      { to: '/pro/mes-leads-artisans', label: 'Mes leads artisans', icon: ShoppingBag },
      { to: '/pro/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/pro/abonnement', label: 'Abonnement', icon: Euro },
      { to: '/pro/rapport', label: 'Rapport mensuel', icon: BarChart3, feature: 'monthlyPdfReport' },
    ],
  },
  {
    id: 'comm',
    label: 'Communication',
    icon: MessageSquare,
    defaultTo: '/pro/messages',
    children: [
      { to: '/pro/messages', label: 'Messages', icon: MessageSquare },
      { to: '/pro/reseaux-sociaux', label: 'Réseaux sociaux', icon: Share2, feature: 'socialMediaPosts' },
      { to: '/pro/qrcode', label: 'QR Code', icon: QrCode, feature: 'qrCodeGeneration' },
    ],
  },
  { to: '/pro/profil', label: 'Mon entreprise', icon: Building2 },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'flex items-center px-4 py-2.5 text-white font-bold bg-white/10 rounded-xl transition'
    : 'flex items-center px-4 py-2.5 text-green-100/70 hover:text-white hover:bg-white/10 rounded-xl transition'

const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'flex items-center px-4 py-2 ml-7 text-white text-xs font-semibold bg-white/5 rounded-lg'
    : 'flex items-center px-4 py-2 ml-7 text-green-100/60 hover:text-white text-xs rounded-lg'

export default function ProShell() {
  const { user, signOut } = useAuth()
  const { branding, features } = useTenant()
  const location = useLocation()

  // Auto-expand le groupe qui contient la route active.
  const initialOpen = NAV.filter(
    (e): e is NavGroup =>
      isGroup(e) &&
      e.children.some((c) => location.pathname.startsWith(c.to.split('?')[0])),
  ).map((g) => g.id)
  const [openGroups, setOpenGroups] = useState<string[]>(initialOpen)

  function toggle(id: string) {
    setOpenGroups((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  /** Filtre features tenant (les permissions sont gérées par PermissionGate). */
  function filterByFeature<T extends { feature?: keyof TenantFeatures }>(items: T[]): T[] {
    return items.filter((i) => !i.feature || features[i.feature])
  }

  /** Liste flat utilisée par PortalMobileNav (sans groupes). */
  const flatNavForMobile = NAV.flatMap((e): NavLeaf[] => {
    if (isGroup(e)) return filterByFeature(e.children)
    return [e]
  })

  return (
    <div className="flex min-h-screen">
      <PortalMobileNav
        portalLabel="Partenaire"
        navItems={flatNavForMobile}
        rootPath="/pro"
      />

      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-72 flex-col overflow-y-auto z-50 py-8 px-4"
        style={{
          background: `linear-gradient(180deg, ${branding.colors.sidebarGradientFrom} 0%, ${branding.colors.sidebarGradientTo} 100%)`,
        }}
      >
        {/* Logo block */}
        <div className="mb-8 px-4">
          <span className="text-xl font-bold tracking-tighter text-white uppercase">
            {branding.companyName}
          </span>
          <p className="text-[10px] tracking-widest text-green-100/60 uppercase font-bold mt-1">
            Portail Partenaire
          </p>
        </div>

        {/* User block + cloche notifications visibles immédiatement */}
        {user && (
          <div className="flex items-center gap-3 px-4 mb-5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
              <p className="text-[10px] text-green-100/60 uppercase tracking-wider">
                Partenaire Pro
              </p>
            </div>
            <NotificationBell />
          </div>
        )}

        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV.map((entry) => {
            if (!isGroup(entry)) {
              return (
                <NavLink key={entry.to} to={entry.to} end={entry.to === '/pro'} className={navLinkClass}>
                  <entry.icon size={18} className="mr-3 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">{entry.label}</span>
                </NavLink>
              )
            }

            const visibleChildren = filterByFeature(entry.children)
            if (visibleChildren.length === 0) return null

            const isOpen = openGroups.includes(entry.id)
            const submenuId = `pro-submenu-${entry.id}`
            const groupBody = (
              <>
                <button
                  type="button"
                  onClick={() => toggle(entry.id)}
                  onKeyDown={(e) => {
                    // Phase R12 — A11y : Escape ferme le groupe ouvert
                    if (e.key === 'Escape' && isOpen) {
                      e.preventDefault()
                      toggle(entry.id)
                    }
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-green-100/70 hover:text-white hover:bg-white/10 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                >
                  <entry.icon size={18} className="mr-3 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider flex-1 text-left">
                    {entry.label}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div
                    id={submenuId}
                    role="group"
                    aria-label={`Sous-menu ${entry.label}`}
                    className="mt-0.5 mb-1 space-y-0.5"
                  >
                    {visibleChildren.map((child) => {
                      const link = (
                        <NavLink key={child.to} to={child.to} className={subNavLinkClass}>
                          {child.label}
                        </NavLink>
                      )
                      return child.permission ? (
                        <PermissionGate key={child.to} permission={child.permission}>
                          {link}
                        </PermissionGate>
                      ) : (
                        link
                      )
                    })}
                  </div>
                )}
              </>
            )

            const wrappedGroup = entry.permission ? (
              <PermissionGate key={entry.id} permission={entry.permission}>
                <div>{groupBody}</div>
              </PermissionGate>
            ) : (
              <div key={entry.id}>{groupBody}</div>
            )

            return wrappedGroup
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-4 flex flex-col gap-3 px-1">
          <div className="bg-white/10 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle size={14} className="text-green-100/70" />
              <span className="text-xs font-bold text-white">Besoin d'aide ?</span>
            </div>
            <p className="text-[10px] text-green-100/50 leading-relaxed">
              Support partenaire du lundi au vendredi.
            </p>
          </div>

          {branding.parentBrand && (
            <div className="flex items-center gap-3 mt-2 px-2">
              <div className="w-10 h-10 rounded-full bg-white shadow-lg shadow-black/20 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={branding.parentBrand.iconUrl}
                  alt={branding.parentBrand.name}
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/80 tracking-wide">
                  {branding.parentBrand.name}
                </p>
                <p className="text-[9px] text-green-200/50 italic">
                  {branding.parentBrand.tagline}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => void signOut()}
            className="flex items-center gap-3 px-4 py-3 text-green-100/70 hover:text-white hover:bg-white/10 rounded-xl transition w-full"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-72 flex-1 bg-background min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
