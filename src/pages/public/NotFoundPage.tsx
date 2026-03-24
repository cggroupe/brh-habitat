import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <SearchX size={30} className="text-primary" strokeWidth={1.75} />
        </div>

        <h1 className="font-display text-5xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="font-display text-xl font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Page non trouvee
        </h2>
        <p className="font-body text-sm text-slate-500 leading-relaxed mb-8">
          La page que vous recherchez n'existe pas ou a ete deplacee.
          Verifiez l'adresse ou revenez a l'accueil.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-display font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 uppercase tracking-wide"
          >
            Retour a l'accueil
          </Link>
          <Link
            to="/diagnostic"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary font-display font-bold text-sm rounded-xl hover:bg-primary/5 transition-colors uppercase tracking-wide"
          >
            Lancer un diagnostic
          </Link>
        </div>

      </div>
    </div>
  )
}
