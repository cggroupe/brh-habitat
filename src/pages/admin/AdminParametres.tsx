import { useState, useEffect } from 'react'
import { SlidersHorizontal, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhPlatformSettingsRow } from '@/types/partner'

type SettingsState = Omit<BrhPlatformSettingsRow, 'key' | 'updated_at'>

const DEFAULT_SETTINGS: SettingsState = {
  points_per_signed_quote: 100,
  pro_silver_threshold: 1000000,
  pro_gold_threshold: 3000000,
  pro_platinum_threshold: 10000000,
  particulier_ambassadeur_threshold: 500,
  particulier_expert_threshold: 1500,
  particulier_vip_threshold: 5000,
  monthly_bonus_threshold: 3,
  monthly_bonus_points: 50,
}

// Fields where the DB stores centimes — display in EUR
const CENTIMES_FIELDS: Array<keyof SettingsState> = [
  'pro_silver_threshold',
  'pro_gold_threshold',
  'pro_platinum_threshold',
]

interface FieldConfig {
  key: keyof SettingsState
  label: string
  description: string
  unit: string
  isCentimes: boolean
  min: number
  step: number
}

const FIELDS: FieldConfig[] = [
  {
    key: 'points_per_signed_quote',
    label: 'Points par devis signé',
    description: 'Nombre de points attribués automatiquement à chaque devis signé',
    unit: 'pts',
    isCentimes: false,
    min: 1,
    step: 1,
  },
  {
    key: 'pro_silver_threshold',
    label: 'Seuil Silver (Pro)',
    description: 'CA apporté minimum pour atteindre le niveau Silver',
    unit: 'EUR',
    isCentimes: true,
    min: 0,
    step: 100,
  },
  {
    key: 'pro_gold_threshold',
    label: 'Seuil Gold (Pro)',
    description: 'CA apporté minimum pour atteindre le niveau Gold',
    unit: 'EUR',
    isCentimes: true,
    min: 0,
    step: 100,
  },
  {
    key: 'pro_platinum_threshold',
    label: 'Seuil Platinum (Pro)',
    description: 'CA apporté minimum pour atteindre le niveau Platinum',
    unit: 'EUR',
    isCentimes: true,
    min: 0,
    step: 100,
  },
  {
    key: 'particulier_ambassadeur_threshold',
    label: 'Seuil Ambassadeur (Particulier)',
    description: 'Points cumulés pour atteindre le niveau Ambassadeur',
    unit: 'pts',
    isCentimes: false,
    min: 0,
    step: 50,
  },
  {
    key: 'particulier_expert_threshold',
    label: 'Seuil Expert (Particulier)',
    description: 'Points cumulés pour atteindre le niveau Expert',
    unit: 'pts',
    isCentimes: false,
    min: 0,
    step: 50,
  },
  {
    key: 'particulier_vip_threshold',
    label: 'Seuil VIP (Particulier)',
    description: 'Points cumulés pour atteindre le niveau VIP',
    unit: 'pts',
    isCentimes: false,
    min: 0,
    step: 50,
  },
  {
    key: 'monthly_bonus_threshold',
    label: 'Seuil bonus mensuel (parrainages)',
    description: "Nombre de parrainages dans le mois pour déclencher le bonus",
    unit: 'parrainages',
    isCentimes: false,
    min: 1,
    step: 1,
  },
  {
    key: 'monthly_bonus_points',
    label: 'Points du bonus mensuel',
    description: 'Points offerts quand le seuil de bonus mensuel est atteint',
    unit: 'pts',
    isCentimes: false,
    min: 0,
    step: 10,
  },
]

export default function AdminParametres() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    supabase
      .from('brh_platform_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setLoadError('Impossible de charger les paramètres.')
        } else if (data) {
          const { key: _key, updated_at: _ua, ...rest } = data as BrhPlatformSettingsRow
          setSettings(rest)
        }
        setIsLoading(false)
      })
  }, [])

  function getDisplayValue(field: FieldConfig): number {
    const raw = settings[field.key]
    return field.isCentimes ? raw / 100 : raw
  }

  function handleChange(field: FieldConfig, displayValue: number) {
    const stored = field.isCentimes ? Math.round(displayValue * 100) : displayValue
    setSettings((prev) => ({ ...prev, [field.key]: stored }))
    setSaveSuccess(false)
    setSaveError(null)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    const { error } = await supabase
      .from('brh_platform_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('key', 'default')

    if (error) {
      // Try upsert if row doesn't exist yet
      const { error: upsertError } = await supabase
        .from('brh_platform_settings')
        .upsert({ key: 'default', ...settings, updated_at: new Date().toISOString() })

      if (upsertError) {
        setSaveError('Erreur lors de la sauvegarde : ' + upsertError.message)
      } else {
        setSaveSuccess(true)
      }
    } else {
      setSaveSuccess(true)
    }

    setIsSaving(false)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal size={20} className="text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
              Paramètres plateforme
            </h1>
          </div>
          <p className="font-body text-sm text-slate-500">
            Configuration globale du programme partenaires
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm bg-red-50 rounded-xl mb-4">
          <AlertCircle size={16} /> {loadError}
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 text-green-700 font-body text-sm bg-green-50 rounded-xl mb-4">
          <CheckCircle2 size={16} /> Paramètres enregistrés avec succès.
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm bg-red-50 rounded-xl mb-4">
          <AlertCircle size={16} /> {saveError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Points section */}
          <h2 className="font-display text-sm uppercase tracking-widest text-slate-400 pt-2">
            Points & Récompenses
          </h2>

          {FIELDS.filter((f) => !f.isCentimes && f.key !== 'monthly_bonus_threshold' && f.key !== 'monthly_bonus_points').map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getDisplayValue(field)}
              onChange={(v) => handleChange(field, v)}
            />
          ))}

          {/* Bonus section */}
          <h2 className="font-display text-sm uppercase tracking-widest text-slate-400 pt-4">
            Bonus mensuel
          </h2>
          {FIELDS.filter((f) => f.key === 'monthly_bonus_threshold' || f.key === 'monthly_bonus_points').map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getDisplayValue(field)}
              onChange={(v) => handleChange(field, v)}
            />
          ))}

          {/* Pro levels section */}
          <h2 className="font-display text-sm uppercase tracking-widest text-slate-400 pt-4">
            Niveaux Pro (CA apporté)
          </h2>
          {FIELDS.filter((f) => CENTIMES_FIELDS.includes(f.key)).map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getDisplayValue(field)}
              onChange={(v) => handleChange(field, v)}
            />
          ))}

          {/* Particulier levels section */}
          <h2 className="font-display text-sm uppercase tracking-widest text-slate-400 pt-4">
            Niveaux Particulier (points cumulés)
          </h2>
          {FIELDS.filter((f) =>
            f.key === 'particulier_ambassadeur_threshold' ||
            f.key === 'particulier_expert_threshold' ||
            f.key === 'particulier_vip_threshold',
          ).map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              value={getDisplayValue(field)}
              onChange={(v) => handleChange(field, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FieldRowProps {
  field: FieldConfig
  value: number
  onChange: (v: number) => void
}

function FieldRow({ field, value, onChange }: FieldRowProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm text-slate-800 mb-0.5">{field.label}</p>
        <p className="font-body text-xs text-slate-400">{field.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={field.min}
          step={field.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="font-body text-sm text-slate-500 w-20">{field.unit}</span>
      </div>
    </div>
  )
}
