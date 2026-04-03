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
  ajustement_admin: 'bg-slate-100 text-slate-600',
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
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <History size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Historique de points
        </h1>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} className="text-primary" />
            <span className="font-body text-sm text-slate-500 uppercase tracking-wide">Solde actuel</span>
          </div>
          <p className="font-display text-4xl text-primary">{balance.toLocaleString('fr-FR')}</p>
          <p className="font-body text-sm text-slate-400 mt-1">points disponibles</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-500" />
            <span className="font-body text-sm text-slate-500 uppercase tracking-wide">Total gagné</span>
          </div>
          <p className="font-display text-4xl text-slate-900">{totalEarned.toLocaleString('fr-FR')}</p>
          <p className="font-body text-sm text-slate-400 mt-1">points cumulés depuis le début</p>
        </div>
      </div>

      {/* Transactions */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <History size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="font-display text-lg uppercase tracking-wide text-slate-400 mb-2">Aucune transaction</p>
          <p className="font-body text-sm text-slate-400">Vos points apparaitront ici après vos premiers parrainages.</p>
        </div>
      ) : (
        <>
          {/* Mobile : cartes */}
          <div className="md:hidden space-y-3">
            {transactions.map(tx => {
              const isPositive = tx.points > 0
              return (
                <div key={tx.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-body font-medium ${TYPE_COLORS[tx.type]}`}>
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </div>
                    {tx.description && (
                      <p className="font-body text-sm text-slate-500 truncate">{tx.description}</p>
                    )}
                    <p className="font-body text-xs text-slate-400 mt-1">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`font-display text-lg shrink-0 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{tx.points.toLocaleString('fr-FR')} pts
                  </span>
                </div>
              )
            })}
          </div>

          {/* Desktop : table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Date</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Type</th>
                  <th className="text-left font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Description</th>
                  <th className="text-right font-display text-xs uppercase tracking-wide text-slate-500 px-6 py-4">Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isPositive = tx.points > 0
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-body text-sm text-slate-500">{formatDate(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-body font-medium ${TYPE_COLORS[tx.type]}`}>
                          {TYPE_LABELS[tx.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-sm text-slate-600">
                        {tx.description ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-6 py-4 font-display text-base text-right ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
