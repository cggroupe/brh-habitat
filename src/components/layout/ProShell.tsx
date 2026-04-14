import { NavLink, Outlet } from 'react-router-dom'
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
  Calculator,
  FileText,
  BarChart3,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/shared/NotificationBell'
import PortalMobileNav from '@/components/shared/PortalMobileNav'
import { useTenant } from '@/config/TenantContext'
import type { TenantFeatures } from '@/config/tenant.types'

interface NavItemDef {
  to: string
  label: string
  icon: React.ElementType
  feature?: keyof TenantFeatures
}

const proNavPrincipal: NavItemDef[] = [
  { to: '/pro', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/pro/prospects', label: 'Prospects', icon: UserPlus },
  { to: '/pro/commissions', label: 'Commissions', icon: Euro },
  { to: '/pro/equipe', label: 'Equipe', icon: Users },
  { to: '/pro/messages', label: 'Messages', icon: MessageSquare },
]

const proNavOutils: NavItemDef[] = [
  { to: '/pro/profil', label: 'Mon entreprise', icon: Building2 },
  { to: '/pro/chiffrage', label: 'Chiffrage IA', icon: Calculator, feature: 'aiChiffrage' },
  { to: '/pro/chiffrages', label: 'Mes chiffrages', icon: FileText, feature: 'aiChiffrage' },
  { to: '/pro/assistant', label: 'IA Batiment', icon: Sparkles, feature: 'aiAssistantTechnique' },
  { to: '/pro/vendeurs', label: 'Mon reseau', icon: Network, feature: 'recruitmentPyramid' },
  { to: '/pro/stats-equipe', label: 'Stats equipe', icon: BarChart3, feature: 'teamStats' },
  { to: '/pro/reseaux-sociaux', label: 'Reseaux sociaux', icon: Share2, feature: 'socialMediaPosts' },
  { to: '/pro/qrcode', label: 'QR Code', icon: QrCode, feature: 'qrCodeGeneration' },
  { to: '/pro/rapport', label: 'Rapport mensuel', icon: BarChart3, feature: 'monthlyPdfReport' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'flex items-center px-4 py-3 text-white font-bold bg-white/10 rounded-xl transition-all duration-200'
    : 'flex items-center px-4 py-3 text-green-100/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200'

export default function ProShell() {
  const { user, signOut } = useAuth()
  const { branding, features } = useTenant()

  const filteredOutils = proNavOutils.filter(
    (item) => !item.feature || features[item.feature]
  )

  const proNavItems = [...proNavPrincipal, ...filteredOutils]

  return (
    <div className="flex min-h-screen">
      {/* Mobile nav */}
      <PortalMobileNav portalLabel="Partenaire" navItems={proNavItems} rootPath="/pro" />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-72 flex-col overflow-y-auto z-50 py-8 px-4"
        style={{
          background: `linear-gradient(180deg, ${branding.colors.sidebarGradientFrom} 0%, ${branding.colors.sidebarGradientTo} 100%)`,
        }}
      >
        {/* Logo block */}
        <div className="mb-10 px-4">
          <div className="leading-none">
            <span className="text-xl font-bold tracking-tighter text-white uppercase">
              {branding.companyName}
            </span>
          </div>
          <p className="text-[10px] tracking-widest text-green-100/60 uppercase font-bold mt-1">
            Portail Partenaire
          </p>
        </div>

        {/* User block */}
        {user && (
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
              <p className="text-[10px] text-green-100/60 uppercase tracking-wider">Partenaire Pro</p>
            </div>
          </div>
        )}

        {/* Nav section 1 — PRINCIPAL */}
        <div className="mb-4">
          <p className="text-[10px] text-green-100/40 uppercase tracking-widest font-bold px-4 pb-2">
            Principal
          </p>
          <nav className="flex flex-col gap-0.5">
            {proNavPrincipal.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/pro'} className={navLinkClass}>
                <Icon size={18} className="mr-3 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Nav section 2 — OUTILS & GESTION */}
        <div className="mb-4">
          <p className="text-[10px] text-green-100/40 uppercase tracking-widest font-bold px-4 pb-2">
            Outils &amp; Gestion
          </p>
          <nav className="flex flex-col gap-0.5">
            {filteredOutils.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={false} className={navLinkClass}>
                <Icon size={18} className="mr-3 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-3 px-1">
          {/* Notification bell */}
          <div className="flex justify-start px-3">
            <NotificationBell />
          </div>

          {/* Aide card */}
          <div className="bg-white/10 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle size={14} className="text-green-100/70" />
              <span className="text-xs font-bold text-white">Besoin d'aide ?</span>
            </div>
            <p className="text-[10px] text-green-100/50 leading-relaxed">
              Contactez notre support partenaire disponible du lundi au vendredi.
            </p>
          </div>

          {/* Parent brand block — hidden if parentBrand is undefined */}
          {branding.parentBrand && (
            <div className="flex items-center gap-3 mt-4 px-2">
              <div className="w-10 h-10 rounded-full bg-white shadow-lg shadow-black/20 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={branding.parentBrand.iconUrl}
                  alt={branding.parentBrand.name}
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/80 tracking-wide">{branding.parentBrand.name}</p>
                <p className="text-[9px] text-green-200/50 italic">{branding.parentBrand.tagline}</p>
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-3 px-4 py-3 text-green-100/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 w-full"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Se deconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-72 flex-1 bg-background min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
