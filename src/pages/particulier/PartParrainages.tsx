import { Users, Plus, Phone, MapPin, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useAffiliateProspects } from '@/hooks/queries'
import type { ProspectStatus } from '@/types/partner'

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
  nouveau:      { label: 'Nouveau',           color: 'text-blue-700',   bg: 'bg-blue-100' },
  etude:        { label: "En cours d'étude",  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  devis_envoye: { label: 'Devis envoyé',      color: 'text-orange-700', bg: 'bg-orange-100' },
  signe:        { label: 'Signé !',           color: 'text-green-700',  bg: 'bg-green-100' },
  termine:      { label: 'Terminé',           color: 'text-slate-700',  bg: 'bg-slate-100' },
  perdu:        { label: 'Non retenu',        color: 'text-red-700',    bg: 'bg-red-100' },
}

const WORK_TYPE_LABELS: Record<string, string> = {
  toiture:      'Toiture',
  isolation:    'Isolation',
  fenetres:     'Fenêtres',
  ravalement:   'Ravalement',
  electricite:  'Electricité',
  plomberie:    'Plomberie',
  ventilation:  'Ventilation',
  autre:        'Autre',
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PartParrainages() {
  const { user } = useAuth()
  const { data: affiliate, isLoading: loadingAffiliate } = useMyAffiliate(user?.id)
  const { data: prospects = [], isLoading: loadingProspects } = useAffiliateProspects(affiliate?.id)

  const isLoading = loadingAffiliate || loadingProspects

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mes parrainages
          </h1>
        </div>
        <Link
          to="/particulier/parrainages/nouveau"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
        >
          <Plus size={16} />
          Parrainer
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Users size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="font-display text-lg uppercase tracking-wide text-slate-400 mb-2">Aucun parrainage</p>
          <p className="font-body text-sm text-slate-400 mb-6">Parrainez vos proches pour gagner des points !</p>
          <Link
            to="/particulier/parrainages/nouveau"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
          >
            <Plus size={16} />
            Mon premier parrainage
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile : cartes */}
          <div className="md:hidden space-y-4">
            {prospects.map(prospect => {
              const status = STATUS_CONFIG[prospect.status]
              return (
                <div key={prospect.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-display text-base text-slate-900">
                        {prospect.client_first_name} {prospect.client_last_name}
                      </p>
                      {prospect.client_phone && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Phone size={12} className="text-slate-400" />
                          <span className="font-body text-sm text-slate-500">{prospect.client_phone}</span>
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-body font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {prospect.client_city && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="font-body text-sm text-slate-500">{prospect.client_city}</span>
                    </div>
                  )}
                  {prospect.work_type && prospect.work_type.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {prospect.work_type.map(wt => (
                        <span key={wt} className="font-body text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {WORK_TYPE_LABELS[wt] ?? wt}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={12} />
                    <span className="font-body">{formatDate(prospect.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop : table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Client</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Téléphone</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Travaux</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Statut</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect, i) => {
                  const status = STATUS_CONFIG[prospect.status]
                  return (
                    <tr key={prospect.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                      <td className="px-6 py-4">
                        <p className="font-body text-sm font-medium text-slate-900">
                          {prospect.client_first_name} {prospect.client_last_name}
                        </p>
                        {prospect.client_city && (
                          <p className="font-body text-xs text-slate-400">{prospect.client_city}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-body text-sm text-slate-600">{prospect.client_phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(prospect.work_type ?? []).map(wt => (
                            <span key={wt} className="font-body text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {WORK_TYPE_LABELS[wt] ?? wt}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-body font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-sm text-slate-500">{formatDate(prospect.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
