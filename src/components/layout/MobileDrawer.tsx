import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, Home, Search, BookOpen, Phone, LayoutDashboard, LogIn, UserPlus, LogOut, User, Wrench } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useAuth } from '@/hooks/useAuth'

export default function MobileDrawer() {
  const { drawerOpen, closeDrawer } = useAppStore()
  const { user, signOut } = useAuth()
  const location = useLocation()

  useEffect(() => {
    closeDrawer()
  }, [location.pathname, closeDrawer])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  if (!drawerOpen) return null

  const publicLinks = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/services', label: 'Nos services', icon: Wrench },
    { to: '/diagnostic', label: 'Diagnostic gratuit', icon: Search },
    { to: '/articles', label: 'Guides', icon: BookOpen },
    { to: '/contact', label: 'Contact', icon: Phone },
  ]

  const authLinks = user
    ? [
        { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
        { to: '/profil', label: 'Mon profil', icon: User },
      ]
    : [
        { to: '/connexion', label: 'Connexion', icon: LogIn },
        { to: '/inscription', label: 'Inscription', icon: UserPlus },
      ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="text-primary">
              <Home size={22} strokeWidth={1.5} />
            </div>
            <span className="font-display font-bold text-base leading-tight tracking-tight text-slate-900">
              BRETAGNE<br />RÉNOVATION HABITAT
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className="px-4 mb-6">
            <p className="px-2 text-xs font-display uppercase tracking-widest text-slate-400 mb-3">Menu</p>
            {publicLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-700 hover:bg-background hover:text-primary transition-colors text-sm font-semibold"
              >
                <Icon size={18} className="shrink-0 text-slate-400" />
                {label}
              </Link>
            ))}
          </div>

          <div className="px-4">
            <p className="px-2 text-xs font-display uppercase tracking-widest text-slate-400 mb-3">Mon espace</p>
            {authLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-700 hover:bg-background hover:text-primary transition-colors text-sm font-semibold"
              >
                <Icon size={18} className="shrink-0 text-slate-400" />
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* CTA */}
        <div className="px-4 py-4 border-t border-slate-200">
          <Link
            to="/diagnostic"
            className="flex items-center justify-center w-full h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors shadow-lg shadow-primary/20"
            onClick={closeDrawer}
          >
            Diagnostic gratuit
          </Link>
        </div>

        {/* User section */}
        {user && (
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-display text-sm shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-danger hover:bg-red-50 transition-colors text-sm font-semibold"
            >
              <LogOut size={16} />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </>
  )
}
