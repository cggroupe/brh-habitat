import { useDiagnosticStore } from '@/stores/diagnosticStore'

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

export function StepEquipment() {
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
