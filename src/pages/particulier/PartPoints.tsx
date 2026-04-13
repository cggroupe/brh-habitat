import { History, Award, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, usePointsHistory } from '@/hooks/queries'
import type { PointsTransactionType } from '@/types/partner'

const TYPE_LABELS: Record<PointsTransactionType, string> = {
  parrainage:       'Parrainage',
  bonus_mensuel:    'Bonus mensuel',
  bonus_annuel:     'Bonus annuel',
  echange_cadeau:   'Echange cadeau',
  ajustement_admin: 'Ajustement',
}

const TYPE_COLORS: Record<PointsTransactionType, string> = {
  parrainage:       'bg-blue-100 text-blue-700',
  bonus_mensuel:    'bg-purple-100 text-purple-700',
  bonus_annuel:     'bg-amber-100 text-amber-700',
  echange_cadeau:   'bg-orange-100 text-orange-700',
  ajustement_admin: 'bg-[#f5f3f2] text-[#707a6a]',
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PartPoints() {
  const { user } = useAuth()
  const { data: affiliate, isLoading: loadingAffiliate } = useMyAffiliate(user?.id)
  const { data: transactions = [], isLoading: loadingTx } = usePointsHistory(affiliate?.id)

  const isLoading = loadingAffiliate || loadingTx
  const balance = affiliate?.points_balance ?? 0
  const totalEarned = affiliate?.total_points_earned ?? 0

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Fidélité</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-[#1b1c1c]">
          Historique de points
        </h1>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-[#1c7b1d]/10 rounded-xl flex items-center justify-center">
              <Award size={16} className="text-[#1c7b1d]" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Solde actuel</p>
          </div>
          <p className="font-display text-4xl font-bold text-[#1c7b1d]">{balance.toLocaleString('fr-FR')}</p>
          <p className="text-sm text-[#707a6a] mt-1">points disponibles</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Total gagné</p>
          </div>
          <p className="font-display text-4xl font-bold text-[#1b1c1c]">{totalEarned.toLocaleString('fr-FR')}</p>
          <p className="text-sm text-[#707a6a] mt-1">points cumulés depuis le début</p>
        </div>
      </div>

      {/* Transactions */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#1c7b1d] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-[#f5f3f2] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <History size={28} className="text-[#707a6a]" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-[#404a3c] mb-2">
            Aucune transaction
          </p>
          <p className="text-sm text-[#707a6a]">
            Vos points apparaitront ici après vos premiers parrainages.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile : cartes */}
          <div className="md:hidden space-y-3">
            {transactions.map(tx => {
              const isPositive = tx.points > 0
              return (
                <div key={tx.id} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)] flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${TYPE_COLORS[tx.type]}`}>
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-sm text-[#404a3c] truncate">{tx.description}</p>
                    )}
                    <p className="text-xs text-[#707a6a] mt-1">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`font-display text-lg font-bold shrink-0 ${isPositive ? 'text-[#1c7b1d]' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{tx.points.toLocaleString('fr-FR')} pts
                  </span>
                </div>
              )
            })}
          </div>

          {/* Desktop : table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f3f2]">
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Date</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Type</th>
                  <th className="text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Description</th>
                  <th className="text-right text-[10px] uppercase tracking-widest font-bold text-[#707a6a] px-6 py-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isPositive = tx.points > 0
                  return (
                    <tr key={tx.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-[#707a6a]">{formatDate(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${TYPE_COLORS[tx.type]}`}>
                          {TYPE_LABELS[tx.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#404a3c]">
                        {tx.description ?? <span className="text-[#707a6a]/40">—</span>}
                      </td>
                      <td className={`px-6 py-4 font-display text-base font-bold text-right ${isPositive ? 'text-[#1c7b1d]' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{tx.points.toLocaleString('fr-FR')} pts
                      </td>
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
