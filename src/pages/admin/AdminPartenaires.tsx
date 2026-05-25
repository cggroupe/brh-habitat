import { useState } from 'react'
import { Handshake, ChevronLeft, ChevronRight, AlertCircle, Pencil, X, Check } from 'lucide-react'
import { useAdminCompanies, useUpdateCompany } from '@/hooks/queries'
import { PAGE_SIZE } from '@/data/constants'
import type { BrhCompanyRow, CompanyLevel, CompanyProfession } from '@/types/partner'

const LEVEL_LABELS: Record<CompanyLevel, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

const LEVEL_COLORS: Record<CompanyLevel, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
}

const PROFESSION_LABELS: Record<CompanyProfession, string> = {
  architecte: 'Architecte',
  agent_immobilier: 'Agent immobilier',
  maitre_oeuvre: 'Maître d\'œuvre',
  courtier: 'Courtier',
  autre: 'Autre',
}

interface EditModalProps {
  company: BrhCompanyRow
  onClose: () => void
}

function EditCommissionModal({ company, onClose }: EditModalProps) {
  const [rate, setRate] = useState(String(company.commission_rate_percent))
  const updateCompany = useUpdateCompany()

  function handleSave() {
    const parsed = parseFloat(rate)
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return
    updateCompany.mutate(
      { id: company.id, payload: { commission_rate_percent: parsed } },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg uppercase tracking-wide text-slate-900">
            Modifier la commission
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="font-body text-sm text-slate-600 mb-4">
          Entreprise : <span className="font-semibold text-slate-800">{company.name}</span>
        </p>
        <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">
          Taux de commission (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-5"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 font-body text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={updateCompany.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60"
          >
            <Check size={14} />
            {updateCompany.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        {updateCompany.isError && (
          <p className="mt-2 text-xs text-red-600 font-body">Erreur lors de la mise à jour.</p>
        )}
      </div>
    </div>
  )
}

export default function AdminPartenaires() {
  const [page, setPage] = useState(0)
  const [editingCompany, setEditingCompany] = useState<BrhCompanyRow | null>(null)

  const { data, isLoading, isError } = useAdminCompanies(page)
  const companies = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Handshake size={20} className="text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
              Partenaires professionnels
            </h1>
          </div>
          <p className="font-body text-sm text-slate-500">
            {total} entreprise{total !== 1 ? 's' : ''} partenaires
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isError && (
          <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm">
            <AlertCircle size={16} /> Erreur lors du chargement.
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <Handshake size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-display text-base text-slate-700 mb-1">Aucun partenaire</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Entreprise</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Profession</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Niveau</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Commission</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">CA apporté</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-body text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                          {company.name}
                        </p>
                        {company.city && (
                          <p className="font-body text-xs text-slate-400">{company.city}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-600">
                        {company.profession ? PROFESSION_LABELS[company.profession as CompanyProfession] ?? company.profession : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${LEVEL_COLORS[(company.level ?? 'bronze') as CompanyLevel]}`}>
                          {LEVEL_LABELS[(company.level ?? 'bronze') as CompanyLevel]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-700">
                        {company.commission_rate_percent} %
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-700">
                        {((company.total_ca_apporte ?? 0) / 100).toLocaleString('fr-FR')} EUR
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${
                          company.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {company.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setEditingCompany(company)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                          title="Modifier la commission"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <p className="font-body text-sm text-slate-400">
                  Page {page + 1} sur {totalPages} — {total} résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingCompany && (
        <EditCommissionModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
        />
      )}
    </div>
  )
}
