import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Home,
  Lightbulb,
  Phone,
  Thermometer,
  Upload,
  Wind,
  Wrench,
  X,
  Zap,
  Square,
} from 'lucide-react'

import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { diagnosticTypes } from '@/data/diagnostic-types'
import { symptomsByType } from '@/data/symptoms'
import { analyzeDiagnostic } from '@/lib/diagnostic-engine'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Droplets,
  Thermometer,
  Wind,
  Square,
  Zap,
  Home,
  Wrench,
}

function DiagnosticIcon({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Home
  return <Icon size={size} className={className} />
}

// ---------------------------------------------------------------------------
// Horizontal stepper — full width inside the wizard column
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  'Problemes',
  'Logement',
  'Equipements',
  'Symptomes',
  'Photos',
  'Coordonnees',
]

function HorizontalStepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-4">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = step > stepNum
        const isCurrent = step === stepNum
        const isLast = idx === STEP_LABELS.length - 1

        return (
          <div key={label} className="flex flex-col items-center gap-2 flex-1 relative">
            {/* Circle */}
            {isCompleted ? (
              <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold z-10 shrink-0">
                <Check size={14} strokeWidth={3} />
              </div>
            ) : isCurrent ? (
              <div className="size-10 rounded-full border-4 border-primary/20 bg-primary text-white flex items-center justify-center text-sm font-bold z-10 shadow-lg shadow-primary/20 shrink-0">
                {stepNum}
              </div>
            ) : (
              <div className="size-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold z-10 shrink-0">
                {stepNum}
              </div>
            )}

            {/* Label */}
            <span
              className={`text-xs hidden sm:block transition-colors ${
                isCompleted
                  ? 'font-bold text-primary'
                  : isCurrent
                    ? 'font-black text-primary uppercase'
                    : 'font-medium text-slate-400'
              }`}
            >
              {label}
            </span>

            {/* Connector line to the right — drawn from center of this step */}
            {!isLast && (
              <div
                className={`absolute top-4 left-1/2 w-full h-[2px] transition-colors ${
                  isCompleted ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expert tip sidebar data
// ---------------------------------------------------------------------------

const STEP_TIPS: Record<number, string> = {
  1: "Selectionnez tous les problemes qui vous preoccupent, meme ceux qui semblent mineurs. Un diagnostic complet permet d'identifier les interactions entre les pathologies.",
  2: "L'annee de construction est particulierement importante : les batiments anterieurs a 1975 (avant le premier choc petrolier) n'ont generalement aucune isolation thermique.",
  3: "Le type de chauffage et l'etat de la ventilation sont des indicateurs cles de la qualite de l'air interieur. Une maison sans VMC presente systematiquement des risques d'humidite et de condensation.",
  4: "Notez tous les symptomes observes, meme intermittents. Les problemes qui n'apparaissent qu'en hiver ou par temps de pluie sont souvent les plus revelateurs.",
  5: "Photographiez les zones humides, les fissures et les degradations visibles. Une bonne photo est souvent aussi informative qu'une visite pour l'analyse initiale.",
  6: "Vos coordonnees sont utilisees uniquement pour vous transmettre votre diagnostic personnalise. Aucune donnee n'est partagee avec des tiers.",
}

function SidePanel({ step }: { step: number }) {
  const tip = STEP_TIPS[step]

  return (
    <aside className="w-[280px] shrink-0 space-y-6 sticky top-8">
      {/* Expert tip */}
      {tip && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Lightbulb size={18} />
            <span className="text-sm font-black uppercase tracking-wider">Conseil Expert</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {tip}
          </p>
        </div>
      )}

      {/* Help card */}
      <div className="p-6 bg-white rounded-xl border border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Besoin d'aide ?</h4>
        <a
          href="tel:+33298000000"
          className="flex items-center gap-3 text-primary hover:underline transition-all"
        >
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone size={14} className="text-primary" />
          </div>
          <span className="text-sm font-bold">02 98 00 00 00</span>
        </a>
        <p className="text-[11px] text-slate-400 mt-4 leading-snug">
          Nos experts sont disponibles du lundi au vendredi, de 9h a 18h.
        </p>
      </div>

      {/* Decorative image */}
      <div className="rounded-xl overflow-hidden relative">
        <img
          alt="Habitat sain apres renovation"
          className="w-full h-40 object-cover"
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=560&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
          <p className="text-white text-xs font-bold italic">
            "Un habitat sain commence par un bon diagnostic."
          </p>
        </div>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Navigation footer (inside the white card)
// ---------------------------------------------------------------------------

interface NavFooterProps {
  step: number
  canProceed: boolean
  onPrev: () => void
  onNext: () => void
}

function NavFooter({ step, canProceed, onPrev, onNext }: NavFooterProps) {
  if (step === 6) return null

  return (
    <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-8">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 1}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <span className="text-sm font-bold text-slate-400">
        Etape {step} sur 6
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={step !== 5 && !canProceed}
        className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
      >
        Continuer
        <ArrowRight size={16} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Type selection
// ---------------------------------------------------------------------------

function StepTypes() {
  const { selectedTypes, toggleType } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Quels problemes rencontrez-vous ?
        </h2>
        <p className="text-lg text-slate-500">
          Selectionnez un ou plusieurs domaines
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {diagnosticTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.id)
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => toggleType(type.id)}
              className={`flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group ${
                isSelected
                  ? 'border-primary bg-primary/[0.05]'
                  : 'border-slate-100 bg-white hover:border-primary/50'
              }`}
            >
              <div
                className={`size-14 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-50 text-slate-400 group-hover:text-primary'
                }`}
              >
                <DiagnosticIcon name={type.icon} size={26} />
              </div>
              <span
                className={`text-sm font-bold text-center leading-tight transition-colors ${
                  isSelected ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                {type.label}
              </span>
            </button>
          )
        })}
      </div>

      {selectedTypes.length > 0 && (
        <p className="mt-6 text-sm font-bold text-primary text-center">
          {selectedTypes.length} domaine{selectedTypes.length > 1 ? 's' : ''} selectionne{selectedTypes.length > 1 ? 's' : ''}
        </p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Property info
// ---------------------------------------------------------------------------

function StepProperty() {
  const { property, setProperty } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Parlez-nous de votre logement
        </h2>
        <p className="text-lg text-slate-500">
          Ces informations nous permettent d'affiner le diagnostic
        </p>
      </div>

      <div className="space-y-8">
        {/* Type */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Type de logement
          </label>
          <div className="flex gap-3">
            {(['Maison', 'Appartement'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProperty({ type: t })}
                className={`flex-1 py-4 px-5 rounded-xl border-2 font-bold text-base transition-all ${
                  property.type === t
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Adresse du bien
          </label>
          <input
            type="text"
            placeholder="12 rue de la Paix, 29000 Quimper"
            value={property.address ?? ''}
            onChange={(e) => setProperty({ address: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Surface + Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-bold text-slate-700 mb-3">
              Surface (m²)
            </label>
            <input
              type="number"
              min={10}
              max={2000}
              placeholder="85"
              value={property.surface ?? ''}
              onChange={(e) => setProperty({ surface: parseInt(e.target.value) || undefined })}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-base font-bold text-slate-700 mb-3">
              Annee de construction
            </label>
            <input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              placeholder="1975"
              value={property.year ?? ''}
              onChange={(e) => setProperty({ year: parseInt(e.target.value) || undefined })}
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Floors */}
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Nombre d'etages
          </label>
          <div className="relative">
            <select
              value={property.floors ?? ''}
              onChange={(e) => setProperty({ floors: parseInt(e.target.value) || undefined })}
              className="w-full appearance-none px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10"
            >
              <option value="">Selectionnez...</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} etage{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Equipment & Characteristics
// ---------------------------------------------------------------------------

interface SelectGridProps {
  label: string
  value: string | undefined
  options: string[]
  cols?: 2 | 3
  onChange: (val: string) => void
}

function SelectGrid({ label, value, options, cols = 2, onChange }: SelectGridProps) {
  return (
    <div>
      <label className="block text-base font-bold text-slate-700 mb-3">
        {label}
      </label>
      <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`py-3 px-4 rounded-xl border-2 font-bold text-sm text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-snug ${
              value === opt
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepEquipment() {
  const { equipment, setEquipment } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Vos equipements et installations
        </h2>
        <p className="text-lg text-slate-500">
          Ces informations precisent notre analyse
        </p>
      </div>

      <div className="space-y-8">
        <SelectGrid
          label="Type de chauffage"
          value={equipment.heatingType}
          cols={2}
          options={[
            'Electrique (radiateurs/convecteurs)',
            'Gaz (chaudiere gaz)',
            'Fioul (chaudiere fioul)',
            'Pompe a chaleur',
            'Bois / Granules (poele, insert)',
            'Mixte / Ne sait pas',
          ]}
          onChange={(val) => setEquipment({ heatingType: val })}
        />

        <SelectGrid
          label="Ventilation actuelle"
          value={equipment.ventilationType}
          cols={2}
          options={[
            'Aucun systeme de ventilation',
            'VMC simple flux',
            'VMC double flux',
            'VMI (Ventilation Mecanique par Insufflation)',
            'Extraction ponctuelle (salle de bain)',
            'Ne sait pas',
          ]}
          onChange={(val) => setEquipment({ ventilationType: val })}
        />

        <SelectGrid
          label="Type de fenetres"
          value={equipment.windowType}
          cols={2}
          options={[
            'Simple vitrage (ancien)',
            'Double vitrage (standard)',
            'Double vitrage (recent / argon)',
            'Triple vitrage',
            'Mixte (differents types)',
            'Ne sait pas',
          ]}
          onChange={(val) => setEquipment({ windowType: val })}
        />

        <SelectGrid
          label="Type de toiture"
          value={equipment.roofType}
          cols={3}
          options={[
            'Ardoise',
            'Tuiles',
            'Zinc / Bac acier',
            'Toiture plate / Terrasse',
            'Chaume',
            'Ne sait pas',
          ]}
          onChange={(val) => setEquipment({ roofType: val })}
        />

        <SelectGrid
          label="DPE actuel si connu"
          value={equipment.dpeRating}
          cols={2}
          options={[
            'A ou B (performant)',
            'C ou D (moyen)',
            'E (passoire)',
            'F ou G (tres mauvais)',
            'Pas de DPE / Ne sait pas',
          ]}
          onChange={(val) => setEquipment({ dpeRating: val })}
        />

        <SelectGrid
          label="Derniere renovation significative"
          value={equipment.lastRenovation}
          cols={2}
          options={[
            'Jamais / Ne sait pas',
            'Il y a moins de 5 ans',
            'Il y a 5 a 10 ans',
            'Il y a 10 a 20 ans',
            'Il y a plus de 20 ans',
          ]}
          onChange={(val) => setEquipment({ lastRenovation: val })}
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Symptoms
// ---------------------------------------------------------------------------

const URGENCY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-slate-300',
}

function StepSymptoms() {
  const { selectedTypes, symptoms, toggleSymptom } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Decrivez les symptomes observes
        </h2>
        <p className="text-lg text-slate-500">
          Cochez tout ce que vous observez dans votre logement
        </p>
      </div>

      <div className="space-y-6">
        {selectedTypes.map((typeId) => {
          const typeConfig = diagnosticTypes.find((t) => t.id === typeId)
          const typeSymptoms = symptomsByType[typeId] ?? []
          const selected = symptoms[typeId] ?? []

          if (!typeConfig) return null

          return (
            <div key={typeId} className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.bgColor}`}>
                  <DiagnosticIcon name={typeConfig.icon} size={17} className={typeConfig.color} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">{typeConfig.label}</h3>
                {selected.length > 0 && (
                  <span className="ml-auto text-xs bg-primary text-white rounded-full px-2.5 py-0.5 font-bold">
                    {selected.length}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {typeSymptoms.map((symptom) => {
                  const isChecked = selected.includes(symptom.id)
                  return (
                    <label
                      key={symptom.id}
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSymptom(typeId, symptom.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-slate-700 flex-1 leading-snug">{symptom.label}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${URGENCY_DOT[symptom.urgency]}`}
                        title={`Urgence ${symptom.urgency}`}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Urgence haute
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
          Urgence moyenne
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
          Urgence faible
        </span>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Photos
// ---------------------------------------------------------------------------

function PhotoThumbnail({ file, idx, onRemove }: { file: File; idx: number; onRemove: (idx: number) => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!url) return null

  return (
    <div className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={11} className="text-white" />
      </button>
    </div>
  )
}

function StepPhotos() {
  const { photos, addPhoto, removePhoto, nextStep } = useDiagnosticStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const MAX_PHOTOS = 5

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const remaining = MAX_PHOTOS - photos.length
      const toAdd = Array.from(files).slice(0, remaining)
      toAdd.forEach((file) => {
        if (file.type.startsWith('image/')) addPhoto(file)
      })
    },
    [photos.length, addPhoto],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Ajoutez des photos (optionnel)
        </h2>
        <p className="text-lg text-slate-500">
          Les photos aident nos experts a mieux evaluer votre situation
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => photos.length < MAX_PHOTOS && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : photos.length >= MAX_PHOTOS
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
              : 'border-slate-200 hover:border-primary hover:bg-primary/5'
        }`}
      >
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Upload size={26} className="text-slate-400" />
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">
          {isDragging ? 'Deposez vos photos ici' : 'Glissez-deposez ou cliquez pour ajouter'}
        </p>
        <p className="text-sm text-slate-400">
          JPG, PNG, WEBP — max {MAX_PHOTOS} photos
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-5 gap-3">
          {photos.map((file, idx) => (
            <PhotoThumbnail key={idx} file={file} idx={idx} onRemove={removePhoto} />
          ))}
        </div>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={nextStep}
        className="mt-6 text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600 transition-colors"
      >
        Passer cette etape
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Contact
// ---------------------------------------------------------------------------

function StepContact({ onSubmit, isSubmitting }: { onSubmit: () => void; isSubmitting: boolean }) {
  const { contact, setContact } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Vos coordonnees
        </h2>
        <p className="text-lg text-slate-500">
          Pour recevoir votre diagnostic personnalise
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Jean Dupont"
            value={contact.name ?? ''}
            onChange={(e) => setContact({ name: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Telephone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="06 12 34 56 78"
            value={contact.phone ?? ''}
            onChange={(e) => setContact({ phone: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="jean@exemple.fr"
            value={contact.email ?? ''}
            onChange={(e) => setContact({ email: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-start gap-3 p-5 bg-primary/5 rounded-xl border border-primary/10">
          <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-slate-500 leading-relaxed">
            Vos donnees sont utilisees uniquement pour vous envoyer votre diagnostic et vous recontacter.
            Aucune donnee n'est partagee avec des tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyse en cours...
            </>
          ) : (
            <>
              Obtenir mon diagnostic
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main DiagnosticPage
// ---------------------------------------------------------------------------

export default function DiagnosticPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    step,
    nextStep,
    prevStep,
    selectedTypes,
    property,
    equipment,
    symptoms,
    photos,
    contact,
    reset,
  } = useDiagnosticStore()

  // Validation per step
  const canProceed = (() => {
    if (step === 1) return selectedTypes.length > 0
    if (step === 2) return true
    if (step === 3) return true
    if (step === 4) return true
    if (step === 5) return true
    if (step === 6) {
      return (
        (contact.name?.trim().length ?? 0) > 0 &&
        (contact.phone?.trim().length ?? 0) > 0 &&
        (contact.email?.trim().length ?? 0) > 0
      )
    }
    return false
  })()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const results = analyzeDiagnostic(selectedTypes, symptoms, property.year, equipment)

      const payload = {
        user_id: null,
        types: selectedTypes as string[],
        property_type: property.type ?? '',
        property_address: property.address ?? '',
        property_surface: property.surface ?? 0,
        property_year: property.year ?? 0,
        property_floors: property.floors ?? 0,
        symptoms: symptoms as Record<string, string[]>,
        photos: photos.map((f) => f.name),
        contact_name: contact.name ?? '',
        contact_phone: contact.phone ?? '',
        contact_email: contact.email ?? '',
        results: results as unknown as Record<string, unknown>,
        status: 'pending' as const,
        admin_notes: null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('brh_diagnostics')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        console.error('Supabase error:', error)
        navigate('/diagnostic/resultats/local', { state: { results } })
        reset()
        return
      }

      navigate(`/diagnostic/resultats/${(data as { id: string }).id}`, { state: { results } })
      reset()
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitError('Une erreur est survenue. Veuillez reessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Scrollable content wrapper */}
      <div className="max-w-[1200px] mx-auto p-8 flex gap-8 items-start">

        {/* Left column: Stepper + Central card */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          {/* Horizontal stepper */}
          <HorizontalStepper step={step} />

          {/* Central question card */}
          <div className="max-w-[700px] w-full mx-auto bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
            {step === 1 && <StepTypes />}
            {step === 2 && <StepProperty />}
            {step === 3 && <StepEquipment />}
            {step === 4 && <StepSymptoms />}
            {step === 5 && <StepPhotos />}
            {step === 6 && <StepContact onSubmit={handleSubmit} isSubmitting={isSubmitting} />}

            {submitError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {submitError}
              </p>
            )}

            {/* Navigation footer */}
            <NavFooter
              step={step}
              canProceed={canProceed}
              onPrev={prevStep}
              onNext={nextStep}
            />
          </div>
        </div>

        {/* Right side panel — visible on lg and above */}
        <div className="hidden lg:block">
          <SidePanel step={step} />
        </div>
      </div>
    </div>
  )
}
