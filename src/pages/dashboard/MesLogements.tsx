import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Plus,
  MapPin,
  Ruler,
  CalendarDays,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import type { BrhHomeRow, DpeRating } from '@/types/database'

// ─── DPE helpers ──────────────────────────────────────────────────────────────

const DPE_COLORS: Record<DpeRating, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-lime-100 text-lime-800',
  D: 'bg-yellow-100 text-yellow-800',
  E: 'bg-orange-100 text-orange-800',
  F: 'bg-red-100 text-red-700',
  G: 'bg-red-200 text-red-900',
}

function DpeBadge({ rating }: { rating: DpeRating | null }) {
  if (!rating) return <span className="text-xs font-body text-text-light">—</span>
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-display font-bold ${DPE_COLORS[rating]}`}>
      {rating}
    </span>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

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

// ─── Modal ────────────────────────────────────────────────────────────────────

interface AddHomeModalProps {
  onClose: () => void
  onCreated: (home: BrhHomeRow) => void
  userId: string
}

function AddHomeModal({ onClose, onCreated, userId }: AddHomeModalProps) {
  const [form, setForm] = useState<HomeFormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setError('Adresse, ville et code postal sont obligatoires.')
      return
    }
    if (!form.surface || isNaN(Number(form.surface)) || Number(form.surface) <= 0) {
      setError('La surface doit être un nombre positif.')
      return
    }
    if (!form.year_built || isNaN(Number(form.year_built))) {
      setError("L'année de construction est obligatoire.")
      return
    }

    setSaving(true)
    const { data, error: supaErr } = await supabase
      .from('brh_homes')
      .insert({
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
      })
      .select()
      .single()

    setSaving(false)

    if (supaErr || !data) {
      setError("Impossible d'enregistrer le logement. Veuillez réessayer.")
      return
    }

    onCreated(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-danger font-body">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Adresse */}
          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">
              Adresse <span className="text-danger">*</span>
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="15 rue des Lilas"
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
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
              {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as DpeRating[]).map(r => (
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
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Home card ────────────────────────────────────────────────────────────────

function HomeCard({ home, onClick }: { home: BrhHomeRow; onClick: () => void }) {
  const typeLabel: Record<string, string> = {
    maison: 'Maison',
    appartement: 'Appartement',
    immeuble: 'Immeuble',
    commerce: 'Commerce',
    autre: 'Autre',
  }

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Home size={18} />
        </div>
        <DpeBadge rating={home.dpe_rating} />
      </div>

      <h3 className="font-display text-base text-text-primary leading-tight mb-1 group-hover:text-primary transition-colors">
        {home.address}
      </h3>

      <div className="flex items-center gap-1 text-xs font-body text-text-light mb-4">
        <MapPin size={11} />
        {home.postal_code} {home.city}
      </div>

      <div className="flex items-center gap-4 text-xs font-body text-text-secondary">
        <span className="flex items-center gap-1">
          <Ruler size={11} />
          {home.surface} m²
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays size={11} />
          {home.year_built}
        </span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px]">
          {typeLabel[home.property_type] ?? home.property_type}
        </span>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MesLogements() {
  const { user } = useAppStore()
  const navigate = useNavigate()

  const [homes, setHomes] = useState<BrhHomeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!user) return

    async function fetchHomes() {
      setLoading(true)
      setError(null)
      const { data, error: supaErr } = await supabase
        .from('brh_homes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (supaErr) {
        setError('Impossible de charger vos logements. Veuillez réessayer.')
      } else {
        setHomes(data ?? [])
      }
      setLoading(false)
    }

    void fetchHomes()
  }, [user])

  function handleCreated(home: BrhHomeRow) {
    setHomes(prev => [home, ...prev])
    setShowModal(false)
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Mes logements</h1>
          <p className="font-body text-text-secondary mt-1">
            Gérez les informations de vos biens immobiliers
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && homes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 mb-4">
            <Home size={28} />
          </div>
          <h2 className="font-display text-xl text-text-primary mb-2">
            Aucun logement enregistré
          </h2>
          <p className="font-body text-text-secondary text-sm max-w-xs mb-6">
            Ajoutez votre premier logement pour commencer à suivre vos projets de rénovation.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            Ajouter un logement
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && homes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {homes.map(home => (
            <HomeCard
              key={home.id}
              home={home}
              onClick={() => navigate(`/mes-logements/${home.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && user && (
        <AddHomeModal
          userId={user.id}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
