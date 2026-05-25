import { useState } from 'react'
import { Gift, Plus, X, Check, Pencil, AlertCircle, Package, Eye, EyeOff } from 'lucide-react'
import { useRewardsCatalog, useCreateReward, useUpdateReward } from '@/hooks/queries'
import type { BrhRewardsCatalogRow, RewardType } from '@/types/partner'
import type { RewardInsert } from '@/api/rewards'

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  produit_physique: 'Produit physique',
  bon_achat: "Bon d'achat",
  reduction_travaux: 'Réduction travaux',
}

const EMPTY_FORM: Omit<RewardInsert, 'sort_order'> = {
  name: '',
  description: '',
  image_url: '',
  type: 'produit_physique',
  points_required: 0,
  value_cents: null,
  stock: null,
  is_active: true,
}

interface RewardFormProps {
  initial?: BrhRewardsCatalogRow
  onClose: () => void
  onSave: (payload: RewardInsert) => void
  isPending: boolean
  isError: boolean
}

function RewardForm({ initial, onClose, onSave, isPending, isError }: RewardFormProps) {
  const [form, setForm] = useState<Omit<RewardInsert, 'sort_order'>>(
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          image_url: initial.image_url ?? '',
          type: initial.type,
          points_required: initial.points_required,
          value_cents: initial.value_cents,
          stock: initial.stock,
          is_active: initial.is_active,
        }
      : { ...EMPTY_FORM },
  )

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!form.name.trim() || form.points_required < 0) return
    onSave({ ...form, sort_order: initial?.sort_order ?? 99 })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg uppercase tracking-wide text-slate-900">
            {initial ? 'Modifier la récompense' : 'Ajouter une récompense'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">URL image</label>
            <input
              type="url"
              value={form.image_url ?? ''}
              onChange={(e) => set('image_url', e.target.value || null)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Type</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value as RewardType)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((t) => (
                  <option key={t} value={t}>{REWARD_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Points requis *</label>
              <input
                type="number"
                min="0"
                value={form.points_required}
                onChange={(e) => set('points_required', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Valeur (centimes)</label>
              <input
                type="number"
                min="0"
                value={form.value_cents ?? ''}
                onChange={(e) => set('value_cents', e.target.value ? Number(e.target.value) : null)}
                placeholder="ex: 5000 = 50 EUR"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock ?? ''}
                onChange={(e) => set('stock', e.target.value ? Number(e.target.value) : null)}
                placeholder="Illimité si vide"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active ?? false}
              onChange={(e) => set('is_active', e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span className="font-body text-sm text-slate-700">Récompense active</span>
          </label>
        </div>

        {isError && (
          <p className="mt-3 text-xs text-red-600 font-body">Erreur lors de l'enregistrement.</p>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 font-body text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60"
          >
            <Check size={14} />
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCatalogue() {
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<BrhRewardsCatalogRow | null>(null)

  const { data: rewards, isLoading, isError } = useRewardsCatalog(false)
  const createReward = useCreateReward()
  const updateReward = useUpdateReward()

  function handleCreate(payload: RewardInsert) {
    createReward.mutate(payload, { onSuccess: () => setShowForm(false) })
  }

  function handleUpdate(payload: RewardInsert) {
    if (!editingReward) return
    updateReward.mutate(
      { id: editingReward.id, payload },
      { onSuccess: () => setEditingReward(null) },
    )
  }

  function toggleActive(reward: BrhRewardsCatalogRow) {
    updateReward.mutate({ id: reward.id, payload: { is_active: !reward.is_active } })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift size={20} className="text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
              Catalogue cadeaux
            </h1>
          </div>
          <p className="font-body text-sm text-slate-500">
            {(rewards ?? []).length} récompense{(rewards ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm bg-red-50 rounded-xl mb-4">
          <AlertCircle size={16} /> Erreur lors du chargement.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (rewards ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <Package size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-display text-base text-slate-700 mb-1">Aucune récompense</p>
          <p className="font-body text-sm text-slate-400">Ajoutez des récompenses au catalogue</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(rewards ?? []).map((reward) => (
            <div
              key={reward.id}
              className={`bg-white rounded-xl p-5 shadow-sm border transition-opacity ${
                reward.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'
              }`}
            >
              {reward.image_url ? (
                <img
                  src={reward.image_url}
                  alt={reward.name}
                  loading="lazy"
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              ) : (
                <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                  <Gift size={28} className="text-slate-300" />
                </div>
              )}

              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-display text-sm text-slate-800 leading-tight">{reward.name}</h3>
                <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-display ${
                  reward.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {reward.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <p className="font-body text-xs text-slate-500 mb-3 line-clamp-2">
                {reward.description ?? REWARD_TYPE_LABELS[(reward.type ?? 'produit_physique') as RewardType]}
              </p>

              <div className="flex items-center justify-between text-xs font-body text-slate-600 mb-3">
                <span className="font-semibold text-primary">{reward.points_required} pts</span>
                {reward.value_cents != null && (
                  <span>{(reward.value_cents / 100).toLocaleString('fr-FR')} EUR</span>
                )}
                {reward.stock != null && (
                  <span>Stock : {reward.stock}</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(reward)}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-body text-slate-600 hover:bg-slate-50 transition-colors"
                  title={reward.is_active ? 'Désactiver' : 'Activer'}
                >
                  {reward.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                  {reward.is_active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => setEditingReward(reward)}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-body text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={12} />
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RewardForm
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
          isPending={createReward.isPending}
          isError={createReward.isError}
        />
      )}

      {editingReward && (
        <RewardForm
          initial={editingReward}
          onClose={() => setEditingReward(null)}
          onSave={handleUpdate}
          isPending={updateReward.isPending}
          isError={updateReward.isError}
        />
      )}
    </div>
  )
}
