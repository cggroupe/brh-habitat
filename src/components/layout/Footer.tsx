import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Home } from 'lucide-react'

export default function Footer() {
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
                BRETAGNE<br />RÉNOVATION HABITAT
              </h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Spécialiste de la rénovation énergétique en Bretagne, nous accompagnons les propriétaires dans tous leurs projets d'amélioration de l'habitat.
            </p>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Suivre BRH sur Facebook"
                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Facebook size={16} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Suivre BRH sur Instagram"
                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Suivre BRH sur LinkedIn"
                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center hover:bg-primary transition-colors"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Col 2 : Nous contacter */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display font-bold text-xl mb-2">Nous contacter</h3>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
              <span>35 rue de Kervao, 29490 Guipavas</span>
            </div>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <Phone size={16} className="text-primary shrink-0" />
              <a href="tel:0784863951" className="hover:text-primary transition-colors">
                07 84 86 39 51
              </a>
            </div>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <Mail size={16} className="text-primary shrink-0" />
              <a href="mailto:contact@contact-brh.fr" className="hover:text-primary transition-colors">
                contact@contact-brh.fr
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
          <p>&copy; {currentYear} Bretagne Rénovation Habitat. Tous droits réservés.</p>
          <div className="flex items-center gap-2">
            Fait avec ❤️ en Bretagne
          </div>
        </div>
      </div>
    </footer>
  )
}
