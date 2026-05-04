/**
 * Phase R4 — Page `/artisan/agenda` (placeholder).
 *
 * MVP : guide vers les missions (chaque lead avec status='accepted' devient
 * un RDV à planifier). Itération future : table dédiée brh_artisan_appointments
 * + intégration calendrier (iCal export, notifications).
 */
import { Link } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'

export default function ArtisanAgenda() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <Calendar className="mx-auto mb-4 text-primary" size={48} />
        <h1 className="text-2xl font-display mb-2">Agenda</h1>
        <p className="text-gray-600 mb-6">
          La gestion d'agenda dédiée est en cours de finalisation. En attendant,
          vous pouvez planifier vos rendez-vous directement depuis chaque
          mission acceptée.
        </p>
        <Link
          to="/artisan/missions"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Voir mes missions <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
