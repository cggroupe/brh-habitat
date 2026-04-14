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
  onClose: () => void
  onConfirm: (shippingAddress?: string) => void
  isPending: boolean
}

function ExchangeModal({ reward, balance, onClose, onConfirm, isPending }: ExchangeModalProps) {
  const [shippingAddress, setShippingAddress] = useState('')
  const isPhysical = reward.type === 'produit_physique'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-[0_20px_60px_rgba(27,28,28,0.15)]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Catalogue cadeaux</p>
            <h3 className="font-display text-xl font-bold uppercase tracking-[0.05em] text-text-primary">
              Confirmer l'échange
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-background transition-colors text-text-light"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-background rounded-2xl p-5 mb-5">
          <p className="font-bold text-text-primary mb-1">{reward.name}</p>
          {reward.description && (
            <p className="text-sm text-text-light mb-3">{reward.description}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold text-primary">{formatPoints(reward.points_required)}</span>
            {reward.value_cents && (
              <span className="text-sm text-text-light">· Valeur {formatValue(reward.value_cents)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200 mb-5">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            Solde : <strong>{formatPoints(balance)}</strong> → <strong>{formatPoints(balance - reward.points_required)}</strong>
          </p>
        </div>

        {isPhysical && (
          <div className="mb-5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2 flex items-center gap-1.5 block">
              <MapPin size={12} />
              Adresse de livraison
            </label>
            <textarea
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
              rows={3}
              placeholder="Indiquez votre adresse complète pour la livraison..."
              className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-background placeholder:text-text-light/50 text-text-primary focus:ring-2 focus:ring-primary/30 focus:bg-white resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm font-medium text-text-secondary bg-background rounded-xl hover:bg-neutral-light transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(isPhysical ? shippingAddress || undefined : undefined)}
            disabled={isPending}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Gift size={14} />
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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Récompenses</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
            Catalogue cadeaux
          </h1>
        </div>
        {affiliate && (
          <div className="flex items-center gap-2.5 bg-white rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <ShoppingBag size={16} className="text-primary" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">Solde</p>
              <p className="font-display text-lg font-bold text-primary">{formatPoints(balance)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Succès */}
      {claimSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <Gift size={18} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700">
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
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Gift size={28} className="text-text-light" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-text-secondary">
            Catalogue bientôt disponible
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map(reward => {
            const canAfford = balance >= reward.points_required
            const missing = reward.points_required - balance
            return (
              <div
                key={reward.id}
                className={`bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden flex flex-col transition-all hover:shadow-[0_12px_40px_rgba(27,28,28,0.08)] ${!canAfford ? 'opacity-70' : ''}`}
              >
                {/* Image / placeholder */}
                <div className="h-48 bg-background flex items-center justify-center overflow-hidden relative">
                  {reward.image_url ? (
                    <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift size={40} className="text-text-light/40" />
                  )}
                  {canAfford && (
                    <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Disponible
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p className="font-bold text-text-primary mb-1.5">{reward.name}</p>
                  {reward.description && (
                    <p className="text-sm text-text-light mb-4 flex-1 line-clamp-2">{reward.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-auto mb-4">
                    <span className="font-display text-xl font-bold text-primary">{formatPoints(reward.points_required)}</span>
                    {reward.value_cents && (
                      <span className="flex items-center gap-1 text-xs text-text-light bg-background px-2.5 py-1 rounded-lg font-medium">
                        <Tag size={11} />
                        {formatValue(reward.value_cents)}
                      </span>
                    )}
                  </div>

                  {canAfford ? (
                    <button
                      onClick={() => setSelectedReward(reward)}
                      className="w-full bg-gradient-to-br from-primary to-primary-dark text-white px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Echanger
                    </button>
                  ) : (
                    <div className="w-full px-4 py-3 bg-background text-text-light text-xs rounded-xl text-center font-bold uppercase tracking-widest cursor-not-allowed">
                      Manque {formatPoints(missing)}
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
          onClose={() => setSelectedReward(null)}
          onConfirm={handleConfirm}
          isPending={createClaim.isPending}
        />
      )}
    </div>
  )
}
