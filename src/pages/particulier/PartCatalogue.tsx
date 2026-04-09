import { useState } from 'react'
import { Gift, ShoppingBag, Tag, X, MapPin, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useRewardsCatalog, useCreateRewardClaim } from '@/hooks/queries'
import type { BrhRewardsCatalogRow } from '@/types/partner'

function formatPoints(n: number): string {
  return n.toLocaleString('fr-FR') + ' pts'
}

function formatValue(cents: number | null): string | null {
  if (!cents) return null
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

interface ExchangeModalProps {
  reward: BrhRewardsCatalogRow
  balance: number
  affiliateId: string
  onClose: () => void
  onConfirm: (shippingAddress?: string) => void
  isPending: boolean
}

function ExchangeModal({ reward, balance, affiliateId: _affiliateId, onClose, onConfirm, isPending }: ExchangeModalProps) {
  const [shippingAddress, setShippingAddress] = useState('')
  const isPhysical = reward.type === 'produit_physique'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-slate-900 pr-4">
            Confirmer l'échange
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <p className="font-display text-base text-slate-900 mb-1">{reward.name}</p>
          {reward.description && (
            <p className="font-body text-sm text-slate-500 mb-2">{reward.description}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="font-display text-lg text-primary">{formatPoints(reward.points_required)}</span>
            {reward.value_cents && (
              <span className="font-body text-sm text-slate-400">· Valeur {formatValue(reward.value_cents)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-5">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <p className="font-body text-sm text-amber-700">
            Votre solde passera de <strong>{formatPoints(balance)}</strong> à <strong>{formatPoints(balance - reward.points_required)}</strong>.
          </p>
        </div>

        {isPhysical && (
          <div className="mb-5">
            <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">
              <MapPin size={14} className="inline mr-1" />
              Adresse de livraison
            </label>
            <textarea
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
              rows={3}
              placeholder="Indiquez votre adresse complète pour la livraison..."
              className="w-full font-body text-sm px-4 py-3 border border-slate-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 font-body text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(isPhysical ? shippingAddress || undefined : undefined)}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Gift size={15} />
            )}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PartCatalogue() {
  const { user } = useAuth()
  const { data: affiliate, isLoading: loadingAffiliate } = useMyAffiliate(user?.id)
  const { data: rewards = [], isLoading: loadingRewards } = useRewardsCatalog(true)
  const createClaim = useCreateRewardClaim()

  const [selectedReward, setSelectedReward] = useState<BrhRewardsCatalogRow | null>(null)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

  const balance = affiliate?.points_balance ?? 0
  const isLoading = loadingAffiliate || loadingRewards

  async function handleConfirm(shippingAddress?: string) {
    if (!affiliate || !selectedReward || createClaim.isPending) return
    try {
      await createClaim.mutateAsync({
        affiliateId: affiliate.id,
        rewardId: selectedReward.id,
        pointsSpent: selectedReward.points_required,
        shippingAddress,
      })
      setClaimSuccess(selectedReward.name)
      setSelectedReward(null)
    } catch {
      // L'erreur est geree par React Query (createClaim.error)
    }
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Gift size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Catalogue cadeaux
          </h1>
        </div>
        {affiliate && (
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <ShoppingBag size={16} className="text-primary" />
            <span className="font-body text-sm text-slate-600">Solde :</span>
            <span className="font-display text-base text-primary">{formatPoints(balance)}</span>
          </div>
        )}
      </div>

      {/* Succès */}
      {claimSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Gift size={18} className="text-green-600" />
          <p className="font-body text-sm text-green-700">
            Votre demande pour <strong>{claimSuccess}</strong> a bien été envoyée. L'équipe BRH vous contactera prochainement.
          </p>
          <button onClick={() => setClaimSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
            <X size={16} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Gift size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="font-display text-lg uppercase tracking-wide text-slate-400">Catalogue bientôt disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map(reward => {
            const canAfford = balance >= reward.points_required
            const missing = reward.points_required - balance
            return (
              <div
                key={reward.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all ${canAfford ? 'border-slate-100 hover:shadow-md' : 'border-slate-100 opacity-75'}`}
              >
                {/* Image / placeholder */}
                <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
                  {reward.image_url ? (
                    <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift size={40} className="text-slate-300" />
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p className="font-display text-base text-slate-900 mb-1">{reward.name}</p>
                  {reward.description && (
                    <p className="font-body text-sm text-slate-500 mb-3 flex-1 line-clamp-2">{reward.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-auto mb-4">
                    <span className="font-display text-lg text-primary">{formatPoints(reward.points_required)}</span>
                    {reward.value_cents && (
                      <span className="flex items-center gap-1 font-body text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        <Tag size={11} />
                        {formatValue(reward.value_cents)}
                      </span>
                    )}
                  </div>

                  {canAfford ? (
                    <button
                      onClick={() => setSelectedReward(reward)}
                      className="w-full px-4 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
                    >
                      Echanger
                    </button>
                  ) : (
                    <div className="w-full px-4 py-2.5 bg-slate-100 text-slate-400 font-display text-sm rounded-lg text-center uppercase tracking-wide cursor-not-allowed">
                      Il vous manque {formatPoints(missing)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmation */}
      {selectedReward && affiliate && (
        <ExchangeModal
          reward={selectedReward}
          balance={balance}
          affiliateId={affiliate.id}
          onClose={() => setSelectedReward(null)}
          onConfirm={handleConfirm}
          isPending={createClaim.isPending}
        />
      )}
    </div>
  )
}
