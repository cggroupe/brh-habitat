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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Partenariat</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-[#1b1c1c]">
            Mes parrainages
          </h1>
        </div>
        <Link
          to="/particulier/parrainages/nouveau"
          className="flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Parrainer
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#1c7b1d] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-[#f5f3f2] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-[#707a6a]" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-[#404a3c] mb-2">
            Aucun parrainage
          </p>
          <p className="text-sm text-[#707a6a] mb-8">Parrainez vos proches pour gagner des points !</p>
          <Link
            to="/particulier/parrainages/nouveau"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
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
                <div key={prospect.id} className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-[#1b1c1c] text-base">
                        {prospect.client_first_name} {prospect.client_last_name}
                      </p>
                      {prospect.client_phone && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Phone size={12} className="text-[#707a6a]" />
                          <span className="text-sm text-[#707a6a]">{prospect.client_phone}</span>
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {prospect.client_city && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin size={12} className="text-[#707a6a]" />
                      <span className="text-sm text-[#707a6a]">{prospect.client_city}</span>
                    </div>
                  )}
                  {prospect.work_type && prospect.work_type.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {prospect.work_type.map(wt => (
                        <span key={wt} className="text-xs bg-[#f5f3f2] text-[#404a3c] px-2 py-0.5 rounded-lg font-medium">
                          {WORK_TYPE_LABELS[wt] ?? wt}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-[#707a6a]">
                    <Clock size={12} />
                    <span>{formatDate(prospect.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop : table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f3f2]">
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Client</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Téléphone</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Travaux</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Statut</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => {
                  const status = STATUS_CONFIG[prospect.status]
                  return (
                    <tr key={prospect.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#1b1c1c]">
                          {prospect.client_first_name} {prospect.client_last_name}
                        </p>
                        {prospect.client_city && (
                          <p className="text-xs text-[#707a6a] mt-0.5">{prospect.client_city}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#404a3c]">{prospect.client_phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(prospect.work_type ?? []).map(wt => (
                            <span key={wt} className="text-xs bg-[#f5f3f2] text-[#404a3c] px-2 py-0.5 rounded-lg font-medium">
                              {WORK_TYPE_LABELS[wt] ?? wt}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#707a6a]">{formatDate(prospect.created_at)}</td>
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
