import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Home } from 'lucide-react'
import { useTenant } from '@/config/TenantContext'

export default function Footer() {
  const { branding } = useTenant()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-neutral-dark text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Col 1 : Brand info */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="text-primary text-4xl">
                <Home size={36} strokeWidth={1.5} />
              </span>
              <h2 className="font-display font-bold text-lg leading-tight">
                {branding.companyName}
              </h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {branding.description}
            </p>
          </div>

          {/* Col 2 : Nous contacter */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display font-bold text-xl mb-2">Nous contacter</h3>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
              <span>{branding.address}, {branding.postalCode} {branding.city}</span>
            </div>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <Phone size={16} className="text-primary shrink-0" />
              <a
                href={`tel:${branding.phone.replace(/\s/g, '')}`}
                className="hover:text-primary transition-colors"
              >
                {branding.phone}
              </a>
            </div>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <Mail size={16} className="text-primary shrink-0" />
              <a
                href={`mailto:${branding.email}`}
                className="hover:text-primary transition-colors"
              >
                {branding.email}
              </a>
            </div>
          </div>

          {/* Col 3 : Navigation */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display font-bold text-xl mb-2">Navigation</h3>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              {[
                { to: '/', label: 'Accueil' },
                { to: '/services', label: 'Nos services' },
                { to: '/diagnostic', label: 'Diagnostic gratuit' },
                { to: '/articles', label: 'Guides & Conseils' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 : Informations */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display font-bold text-xl mb-2">Informations</h3>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              {[
                { to: '/mentions-legales', label: 'Mentions légales' },
                { to: '/politique-de-confidentialite', label: 'Politique de confidentialité' },
                { to: '/connexion', label: 'Connexion' },
                { to: '/inscription', label: 'Créer un compte' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {currentYear} {branding.companyName}. Tous droits réservés.</p>
          <div className="flex items-center gap-2">
            Fait en Bretagne
          </div>
        </div>
      </div>
    </footer>
  )
}
