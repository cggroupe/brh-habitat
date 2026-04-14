import { useState } from 'react'
import { Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { useCreateHome } from '@/hooks/queries'
import { DPE_RATINGS } from '@/data/constants'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import type { DpeRating } from '@/types/database'

interface HomeFormValues {
  address: string
  city: string
  postal_code: string
  property_type: string
  surface: string
  year_built: string
  floors: string
  heating_type: string
  insulation_type: string
  dpe_rating: string
  notes: string
}

const EMPTY_FORM: HomeFormValues = {
  address: '',
  city: '',
  postal_code: '',
  property_type: 'maison',
  surface: '',
  year_built: '',
  floors: '1',
  heating_type: '',
  insulation_type: '',
  dpe_rating: '',
  notes: '',
}

interface AddHomeModalProps {
  onClose: () => void
  userId: string
}

export function AddHomeModal({ onClose, userId }: AddHomeModalProps) {
  const [form, setForm] = useState<HomeFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useCreateHome()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setFormError('Adresse, ville et code postal sont obligatoires.')
      return
    }
    if (!form.surface || isNaN(Number(form.surface)) || Number(form.surface) <= 0) {
      setFormError('La surface doit être un nombre positif.')
      return
    }
    if (!form.year_built || isNaN(Number(form.year_built))) {
      setFormError("L'année de construction est obligatoire.")
      return
    }

    createMutation.mutate(
      {
        user_id: userId,
        address: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code.trim(),
        property_type: form.property_type,
        surface: Number(form.surface),
        year_built: Number(form.year_built),
        floors: Number(form.floors) || 1,
        heating_type: form.heating_type.trim() || null,
        insulation_type: form.insulation_type.trim() || null,
        dpe_rating: (form.dpe_rating as DpeRating) || null,
        photos: [],
        notes: form.notes.trim() || null,
        health_score: null,
      },
      {
        onSuccess: () => {
          onClose()
        },
        onError: () => {
          setFormError("Impossible d'enregistrer le logement. Veuillez réessayer.")
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-light">
          <h2 className="font-display text-xl text-text-primary">Ajouter un logement</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-background transition-colors text-text-light"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-danger font-body">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          {/* Adresse (autocomplete) */}
          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">
              Adresse <span className="text-danger">*</span>
            </label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
              onSelect={(s) => setForm((prev) => ({ ...prev, address: s.address, city: s.city, postal_code: s.postalCode }))}
              placeholder="Commencez a taper votre adresse..."
              className="w-full px-3.5 py-2.5 pr-10 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">
                Ville <span className="text-danger">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Rennes"
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">
                Code postal <span className="text-danger">*</span>
              </label>
              <input
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                placeholder="35000"
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">Type de bien</label>
              <select
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              >
                <option value="maison">Maison</option>
                <option value="appartement">Appartement</option>
                <option value="immeuble">Immeuble</option>
                <option value="commerce">Commerce</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">
                Surface (m²) <span className="text-danger">*</span>
              </label>
              <input
                name="surface"
                value={form.surface}
                onChange={handleChange}
                type="number"
                min="1"
                placeholder="85"
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">
                Année de construction <span className="text-danger">*</span>
              </label>
              <input
                name="year_built"
                value={form.year_built}
                onChange={handleChange}
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                placeholder="1985"
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">Nombre d'étages</label>
              <input
                name="floors"
                value={form.floors}
                onChange={handleChange}
                type="number"
                min="0"
                max="20"
                placeholder="1"
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">Type de chauffage</label>
              <input
                name="heating_type"
                value={form.heating_type}
                onChange={handleChange}
                placeholder="Gaz, électrique..."
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-display text-text-secondary mb-1.5">Type d'isolation</label>
              <input
                name="insulation_type"
                value={form.insulation_type}
                onChange={handleChange}
                placeholder="Laine de verre..."
                className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">Note DPE</label>
            <select
              name="dpe_rating"
              value={form.dpe_rating}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">— Non renseigné —</option>
              {DPE_RATINGS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {createMutation.isPending ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
