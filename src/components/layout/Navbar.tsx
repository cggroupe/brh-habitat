import { Link, NavLink } from 'react-router-dom'
import { Menu, User, LogOut, LayoutDashboard, ChevronDown, Home } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { openDrawer } = useAppStore()
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { to: '/', label: 'Accueil', end: true },
    { to: '/services', label: 'Nos services', end: false },
    { to: '/diagnostic', label: 'Diagnostic', end: false },
    { to: '/articles', label: 'Guides', end: false },
    { to: '/contact', label: 'Contact', end: false },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="text-primary">
              <Home size={28} strokeWidth={1.5} />
            </div>
            <h1 className="font-display font-bold text-xl leading-tight tracking-tight text-slate-900">
              BRETAGNE<br />RÉNOVATION HABITAT
            </h1>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-8">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-slate-700 hover:text-primary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {user ? (
              <div ref={userMenuRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-background transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display text-sm">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700 max-w-[120px] truncate">{user.full_name}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    <Link
                      to="/tableau-de-bord"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-background hover:text-primary transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} />
                      Tableau de bord
                    </Link>
                    <Link
                      to="/profil"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-background hover:text-primary transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={15} />
                      Mon profil
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-background hover:text-primary transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Administration
                      </Link>
                    )}
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={() => { void signOut(); setUserMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/connexion"
                  className="text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/diagnostic"
                  className="flex items-center justify-center h-10 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors shadow-lg shadow-primary/20"
                >
                  Diagnostic gratuit
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={openDrawer}
              className="md:hidden p-2 rounded-md text-slate-700"
              aria-label="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}
