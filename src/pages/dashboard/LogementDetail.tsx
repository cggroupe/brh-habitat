import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Home,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Thermometer,
  Layers,
  CalendarDays,
  Ruler,
  MapPin,
  ClipboardList,
  FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhHomeRow, BrhDiagnosticRow, DpeRating } from '@/types/database'

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
  if (!rating) return <span className="font-body text-text-light text-sm">Non renseigné</span>
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-display font-bold ${DPE_COLORS[rating]}`}>
      {rating}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-light last:border-0">
      <span className="font-body text-sm text-text-light shrink-0 w-40">{label}</span>
      <span className="font-body text-sm text-text-primary text-right">{value ?? '—'}</span>
    </div>
  )
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditFormValues {
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

function homeToForm(home: BrhHomeRow): EditFormValues {
  return {
    address: home.address,
    city: home.city,
    postal_code: home.postal_code,
    property_type: home.property_type,
    surface: String(home.surface),
    year_built: String(home.year_built),
    floors: String(home.floors),
    heating_type: home.heating_type ?? '',
    insulation_type: home.insulation_type ?? '',
    dpe_rating: home.dpe_rating ?? '',
    notes: home.notes ?? '',
  }
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteModal({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-danger mb-4">
          <Trash2 size={20} />
        </div>
        <h3 className="font-display text-xl text-text-primary mb-2">Supprimer ce logement ?</h3>
        <p className="font-body text-sm text-text-secondary mb-6">
          Cette action est irréversible. Le logement et toutes ses données associées seront supprimés définitivement.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-danger text-white font-display text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [home, setHome] = useState<BrhHomeRow | null>(null)
  const [diagnostics, setDiagnostics] = useState<BrhDiagnosticRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch home + related diagnostics
  useEffect(() => {
    if (!id) return

    async function fetchData() {
      setLoading(true)
      setError(null)

      const homeRes = await supabase
        .from('brh_homes')
        .select('*')
        .eq('id', id!)
        .single()

      if (homeRes.error || !homeRes.data) {
        setError('Logement introuvable.')
        setLoading(false)
        return
      }

      setHome(homeRes.data)

      // Fetch diagnostics and filter by matching address (loose match)
      const diagRes = await supabase
        .from('brh_diagnostics')
        .select('*')
        .order('created_at', { ascending: false })

      if (diagRes.data) {
        const addr = homeRes.data.address.toLowerCase()
        const matched = diagRes.data.filter(d =>
          d.property_address.toLowerCase().includes(addr.split(' ').slice(1).join(' ').substring(0, 10))
        )
        setDiagnostics(matched)
      }

      setLoading(false)
    }

    void fetchData()
  }, [id])

  function startEditing() {
    if (!home) return
    setForm(homeToForm(home))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setForm(null)
    setSaveError(null)
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm(prev => prev ? { ...prev, [e.target.name]: e.target.value } : prev)
  }

  async function handleSave() {
    if (!form || !home) return
    setSaveError(null)

    if (!form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setSaveError('Adresse, ville et code postal sont obligatoires.')
      return
    }
    if (!form.surface || isNaN(Number(form.surface)) || Number(form.surface) <= 0) {
      setSaveError('La surface doit être un nombre positif.')
      return
    }

    setSaving(true)
    const updatePayload = {
      address: form.address.trim(),
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      property_type: form.property_type,
      surface: Number(form.surface),
      year_built: Number(form.year_built),
      floors: Number(form.floors),
      heating_type: form.heating_type.trim() || null,
      insulation_type: form.insulation_type.trim() || null,
      dpe_rating: (form.dpe_rating as DpeRating) || null,
      notes: form.notes.trim() || null,
    }
    const { data, error: supaErr } = await supabase
      .from('brh_homes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updatePayload as any)
      .eq('id', home.id)
      .select()
      .single()

    setSaving(false)

    if (supaErr || !data) {
      setSaveError("Impossible de sauvegarder les modifications.")
      return
    }

    setHome(data)
    setEditing(false)
    setForm(null)
  }

  async function handleDelete() {
    if (!home) return
    setDeleting(true)
    const { error: supaErr } = await supabase.from('brh_homes').delete().eq('id', home.id)
    setDeleting(false)

    if (supaErr) {
      setShowDelete(false)
      setError('Impossible de supprimer ce logement.')
      return
    }

    navigate('/mes-logements')
  }

  const typeLabel: Record<string, string> = {
    maison: 'Maison',
    appartement: 'Appartement',
    immeuble: 'Immeuble',
    commerce: 'Commerce',
    autre: 'Autre',
  }

  const inputCls =
    'w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors'

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !home) {
    return (
      <div className="p-6 lg:p-8">
        <Link to="/mes-logements" className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6">
          <ArrowLeft size={15} /> Retour aux logements
        </Link>
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error ?? 'Logement introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Back */}
      <Link
        to="/mes-logements"
        className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> Retour aux logements
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Home size={22} />
          </div>
          <div>
            <h1 className="font-display text-3xl text-text-primary leading-tight">
              {home.address}
            </h1>
            <p className="font-body text-text-secondary mt-1 flex items-center gap-1.5">
              <MapPin size={13} />
              {home.postal_code} {home.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!editing ? (
            <>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:border-primary hover:text-primary transition-colors"
              >
                <Pencil size={14} />
                Modifier
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-danger font-display text-sm rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors"
              >
                <X size={14} />
                Annuler
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 rounded-xl text-sm text-danger font-body">
          <AlertCircle size={15} className="shrink-0" />
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Informations générales
            </h2>

            {!editing ? (
              <>
                <InfoRow label="Adresse" value={home.address} />
                <InfoRow label="Ville" value={home.city} />
                <InfoRow label="Code postal" value={home.postal_code} />
                <InfoRow label="Type de bien" value={typeLabel[home.property_type] ?? home.property_type} />
              </>
            ) : (
              form && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-display text-text-secondary mb-1.5">Adresse</label>
                    <input name="address" value={form.address} onChange={handleFormChange} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Ville</label>
                      <input name="city" value={form.city} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Code postal</label>
                      <input name="postal_code" value={form.postal_code} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-display text-text-secondary mb-1.5">Type de bien</label>
                    <select name="property_type" value={form.property_type} onChange={handleFormChange} className={inputCls}>
                      <option value="maison">Maison</option>
                      <option value="appartement">Appartement</option>
                      <option value="immeuble">Immeuble</option>
                      <option value="commerce">Commerce</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Caractéristiques */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
              <Ruler size={16} className="text-primary" />
              Caractéristiques
            </h2>

            {!editing ? (
              <>
                <InfoRow label="Surface" value={`${home.surface} m²`} />
                <InfoRow label="Année de construction" value={home.year_built} />
                <InfoRow label="Nombre d'étages" value={home.floors} />
                <InfoRow
                  label="Type de chauffage"
                  value={home.heating_type ?? <span className="text-text-light">Non renseigné</span>}
                />
                <InfoRow
                  label="Type d'isolation"
                  value={home.insulation_type ?? <span className="text-text-light">Non renseigné</span>}
                />
                <div className="flex items-start justify-between py-3">
                  <span className="font-body text-sm text-text-light shrink-0 w-40">Note DPE</span>
                  <DpeBadge rating={home.dpe_rating} />
                </div>
              </>
            ) : (
              form && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Surface (m²)</label>
                      <input name="surface" type="number" value={form.surface} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Année de construction</label>
                      <input name="year_built" type="number" value={form.year_built} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Nombre d'étages</label>
                      <input name="floors" type="number" value={form.floors} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-display text-text-secondary mb-1.5">Note DPE</label>
                      <select name="dpe_rating" value={form.dpe_rating} onChange={handleFormChange} className={inputCls}>
                        <option value="">— Non renseigné —</option>
                        {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as DpeRating[]).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1.5">
                      <Thermometer size={12} /> Type de chauffage
                    </label>
                    <input name="heating_type" value={form.heating_type} onChange={handleFormChange} placeholder="Gaz, électrique..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1.5">
                      <Layers size={12} /> Type d'isolation
                    </label>
                    <input name="insulation_type" value={form.insulation_type} onChange={handleFormChange} placeholder="Laine de verre..." className={inputCls} />
                  </div>
                </div>
              )
            )}
          </div>

          {/* Notes */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Notes
            </h2>
            {!editing ? (
              home.notes ? (
                <p className="font-body text-sm text-text-primary leading-relaxed">{home.notes}</p>
              ) : (
                <p className="font-body text-sm text-text-light italic">Aucune note.</p>
              )
            ) : (
              form && (
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="Informations complémentaires..."
                  className={`${inputCls} resize-none`}
                />
              )
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          {/* Quick info card */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-4">Résumé</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Ruler size={14} />
                </div>
                <div>
                  <p className="text-xs font-body text-text-light">Surface</p>
                  <p className="text-sm font-display text-text-primary">{home.surface} m²</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <CalendarDays size={14} />
                </div>
                <div>
                  <p className="text-xs font-body text-text-light">Année de construction</p>
                  <p className="text-sm font-display text-text-primary">{home.year_built}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Thermometer size={14} />
                </div>
                <div>
                  <p className="text-xs font-body text-text-light">Chauffage</p>
                  <p className="text-sm font-display text-text-primary">{home.heating_type ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Layers size={14} />
                </div>
                <div>
                  <p className="text-xs font-body text-text-light">Isolation</p>
                  <p className="text-sm font-display text-text-primary">{home.insulation_type ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostics liés */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-4 flex items-center gap-2">
              <ClipboardList size={15} className="text-primary" />
              Diagnostics associés
            </h2>
            {diagnostics.length === 0 ? (
              <p className="font-body text-sm text-text-light">Aucun diagnostic trouvé pour ce logement.</p>
            ) : (
              <div className="space-y-2">
                {diagnostics.slice(0, 5).map(diag => (
                  <div key={diag.id} className="p-3 bg-background rounded-xl">
                    <p className="font-body text-xs text-text-secondary">
                      {new Date(diag.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="font-display text-sm text-text-primary mt-0.5">
                      {diag.types.join(', ')}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-body ${
                      diag.status === 'analyzed' ? 'bg-green-100 text-green-800' :
                      diag.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      diag.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {diag.status === 'pending' ? 'En attente' :
                       diag.status === 'analyzed' ? 'Analysé' :
                       diag.status === 'contacted' ? 'Contacté' : 'Clôturé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date info */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-3">Historique</h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-body text-text-light">Ajouté le</p>
                <p className="text-sm font-body text-text-primary">
                  {new Date(home.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs font-body text-text-light">Dernière modification</p>
                <p className="text-sm font-body text-text-primary">
                  {new Date(home.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
