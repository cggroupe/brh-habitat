/**
 * Phase 18.7 — Formulaire publication d'offre de chantier.
 *
 * Champs obligatoires : titre + métiers cherchés + ville.
 * Optionnels : description, code postal, lat/lng, budget, dates, mode, commission, visibility.
 */
import { useState } from 'react'
import { Send, Briefcase, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCreateChantier } from '@/hooks/queries/reseau-chantiers'
import type { ContractMode, ChantierVisibility } from '@/api/reseau-chantiers'

const METIERS_SUGGESTIONS = [
  'isolation_combles',
  'isolation_murs',
  'isolation_sols',
  'menuiseries',
  'pac_air_eau',
  'chaudiere_gaz',
  'plomberie',
  'electricite',
  'couverture',
  'zinguerie',
  'maconnerie',
  'platrerie',
  'peinture',
  'carrelage',
  'terrasse',
  'demolition',
]

const BRETAGNE_DEPTS = ['22', '29', '35', '56', '44']

export default function ChantierForm() {
  const navigate = useNavigate()
  const create = useCreateChantier()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [metiersInput, setMetiersInput] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [commune, setCommune] = useState('')
  const [departement, setDepartement] = useState('')
  const [budgetEuros, setBudgetEuros] = useState('')
  const [budgetVisible, setBudgetVisible] = useState(true)
  const [startDate, setStartDate] = useState('')
  // Phase 18.7 — durationWeeks réservé pour la suite (formulaire en cours de design)
  const [durationWeeks] = useState('')
  const [contractMode, setContractMode] = useState<ContractMode>('sous_traitance')
  const [commissionPct, setCommissionPct] = useState(5)
  const [visibility, setVisibility] = useState<ChantierVisibility>('public')
  const [publishImmediately, setPublishImmediately] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function autoDetectDept() {
    if (codePostal.length >= 2) {
      const prefix = codePostal.slice(0, 2)
      if (BRETAGNE_DEPTS.includes(prefix)) {
        setDepartement(prefix)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const metiers = metiersInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    if (!title.trim()) {
      setError('Le titre est obligatoire.')
      return
    }
    if (metiers.length === 0) {
      setError('Au moins un métier recherché est obligatoire.')
      return
    }
    if (!commune.trim()) {
      setError('La ville du chantier est obligatoire.')
      return
    }

    try {
      const offer = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        metiers_recherches: metiers,
        adresse: adresse.trim() || undefined,
        code_postal: codePostal.trim() || undefined,
        commune: commune.trim(),
        departement: departement.trim() || undefined,
        budget_cents: budgetEuros ? Math.round(parseFloat(budgetEuros) * 100) : undefined,
        budget_visible: budgetVisible,
        start_date: startDate || undefined,
        duration_weeks: durationWeeks ? parseInt(durationWeeks, 10) : undefined,
        contract_mode: contractMode,
        commission_offer_pct: commissionPct,
        visibility,
        publishImmediately,
      })
      navigate(`/reseau/chantiers/${offer.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Titre */}
      <div>
        <label htmlFor="ch-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Titre de l'offre <span className="text-red-500">*</span>
        </label>
        <input
          id="ch-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: « Couverture neuve maison 120m² Quimper »"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="ch-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Description du chantier
        </label>
        <textarea
          id="ch-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder="Détails du chantier, contraintes, attentes…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
        />
      </div>

      {/* Métiers */}
      <div>
        <label htmlFor="ch-metiers" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Métiers recherchés <span className="text-red-500">*</span>
          <span className="text-slate-400 font-normal ml-1">(séparés par virgules)</span>
        </label>
        <input
          id="ch-metiers"
          type="text"
          value={metiersInput}
          onChange={(e) => setMetiersInput(e.target.value)}
          placeholder="couverture, zinguerie"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {METIERS_SUGGESTIONS.slice(0, 8).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                const current = metiersInput
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                if (!current.includes(m)) {
                  setMetiersInput([...current, m].join(', '))
                }
              }}
              className="text-[10px] bg-slate-100 hover:bg-cyan-100 text-slate-600 hover:text-cyan-700 px-2 py-0.5 rounded-md transition"
            >
              + {m.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Localisation */}
      <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
        <legend className="px-2 text-xs font-semibold text-slate-700">Localisation</legend>
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Adresse (optionnel — ne sera pas affichée publiquement)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={codePostal}
              onChange={(e) => {
                setCodePostal(e.target.value)
                if (e.target.value.length === 5) autoDetectDept()
              }}
              placeholder="29000"
              maxLength={5}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              placeholder="Quimper *"
              required
              className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">— Département —</option>
            <option value="22">22 — Côtes-d'Armor</option>
            <option value="29">29 — Finistère</option>
            <option value="35">35 — Ille-et-Vilaine</option>
            <option value="56">56 — Morbihan</option>
            <option value="44">44 — Loire-Atlantique</option>
          </select>
        </div>
      </fieldset>

      {/* Budget + dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ch-budget" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Budget € HT
          </label>
          <input
            id="ch-budget"
            type="number"
            min="0"
            step="100"
            value={budgetEuros}
            onChange={(e) => setBudgetEuros(e.target.value)}
            placeholder="10000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <label className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={budgetVisible}
              onChange={(e) => setBudgetVisible(e.target.checked)}
            />
            Afficher le budget
          </label>
        </div>
        <div>
          <label htmlFor="ch-start" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Date début souhaitée
          </label>
          <input
            id="ch-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Mode + commission */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ch-mode" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mode de contrat
          </label>
          <select
            id="ch-mode"
            value={contractMode}
            onChange={(e) => setContractMode(e.target.value as ContractMode)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="sous_traitance">Sous-traitance</option>
            <option value="co_traitance">Co-traitance</option>
            <option value="apport">Apport d'affaires</option>
          </select>
        </div>
        <div>
          <label htmlFor="ch-comm" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Commission proposée %
          </label>
          <input
            id="ch-comm"
            type="number"
            min="0"
            max="30"
            value={commissionPct}
            onChange={(e) => setCommissionPct(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">Standard plateforme : 5% HT</p>
        </div>
      </div>

      {/* Visibilité */}
      <div>
        <label htmlFor="ch-vis" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Visibilité
        </label>
        <select
          id="ch-vis"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ChantierVisibility)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="public">Public — tous les pros bretons</option>
          <option value="reseau">Mon réseau seulement</option>
          <option value="prive">Privé — invitations uniquement</option>
        </select>
      </div>

      {/* Publish state */}
      <label className="flex items-start gap-3 px-4 py-3 rounded-xl bg-cyan-50/30 border border-cyan-200/60">
        <input
          type="checkbox"
          checked={publishImmediately}
          onChange={(e) => setPublishImmediately(e.target.checked)}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm font-semibold text-cyan-900">Publier immédiatement</span>
          <p className="text-xs text-cyan-700/80 mt-0.5">
            Si décoché, l'offre est sauvée en brouillon et reste invisible.
          </p>
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-semibold transition"
        >
          {create.isPending ? (
            'Publication…'
          ) : (
            <>
              {publishImmediately ? <Send size={16} /> : <Briefcase size={16} />}
              {publishImmediately ? 'Publier l\'offre' : 'Sauver en brouillon'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
