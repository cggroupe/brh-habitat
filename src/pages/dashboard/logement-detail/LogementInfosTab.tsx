import { MapPin, Ruler, FileText, Thermometer, Layers } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { DPE_RATINGS, DPE_BADGE_COLORS } from '@/data/constants'
import type { BrhHomeRow, DpeRating } from '@/types/database'

// ─── Shared helpers ──────────────────────────────────────────────────────────

function DpeBadge({ rating }: { rating: DpeRating | null }) {
  if (!rating) return <span className="font-body text-text-light text-sm">Non renseigné</span>
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-display font-bold ${DPE_BADGE_COLORS[rating]}`}>
      {rating}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-light last:border-0">
      <span className="font-body text-sm text-text-light shrink-0 w-40">{label}</span>
      <span className="font-body text-sm text-text-primary text-right">{value ?? '—'}</span>
    </div>
  )
}

export interface EditFormValues {
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

interface LogementInfosTabProps {
  home: BrhHomeRow
  editing: boolean
  form: EditFormValues | null
  inputCls: string
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onAddressChange: (val: string) => void
  onAddressSelect: (s: { address: string; city: string; postalCode: string }) => void
}

const typeLabel: Record<string, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  immeuble: 'Immeuble',
  commerce: 'Commerce',
  autre: 'Autre',
}

export function LogementInfosTab({
  home,
  editing,
  form,
  inputCls,
  onFormChange,
  onAddressChange,
  onAddressSelect,
}: LogementInfosTabProps) {
  return (
    <>
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
                <AddressAutocomplete
                  value={form.address}
                  onChange={onAddressChange}
                  onSelect={onAddressSelect}
                  placeholder="Commencez a taper votre adresse..."
                  className={`${inputCls} pr-10`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">Ville</label>
                  <input name="city" value={form.city} onChange={onFormChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">Code postal</label>
                  <input name="postal_code" value={form.postal_code} onChange={onFormChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-display text-text-secondary mb-1.5">Type de bien</label>
                <select name="property_type" value={form.property_type} onChange={onFormChange} className={inputCls}>
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
            <InfoRow label="Type de chauffage" value={home.heating_type ?? <span className="text-text-light">Non renseigné</span>} />
            <InfoRow label="Type d'isolation" value={home.insulation_type ?? <span className="text-text-light">Non renseigné</span>} />
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
                  <input name="surface" type="number" value={form.surface} onChange={onFormChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">Année de construction</label>
                  <input name="year_built" type="number" value={form.year_built} onChange={onFormChange} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">Nombre d'étages</label>
                  <input name="floors" type="number" value={form.floors} onChange={onFormChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-display text-text-secondary mb-1.5">Note DPE</label>
                  <select name="dpe_rating" value={form.dpe_rating} onChange={onFormChange} className={inputCls}>
                    <option value="">— Non renseigné —</option>
                    {DPE_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Thermometer size={12} /> Type de chauffage
                </label>
                <input name="heating_type" value={form.heating_type} onChange={onFormChange} placeholder="Gaz, électrique..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-display text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Layers size={12} /> Type d'isolation
                </label>
                <input name="insulation_type" value={form.insulation_type} onChange={onFormChange} placeholder="Laine de verre..." className={inputCls} />
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
            <textarea name="notes" value={form.notes} onChange={onFormChange} rows={4} placeholder="Informations complémentaires..." className={`${inputCls} resize-none`} />
          )
        )}
      </div>
    </>
  )
}
