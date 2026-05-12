/**
 * ReseauDisponibiliteNew — Form de dépôt d'une disponibilité (Phase 18 v2).
 *
 * cf audit-ux-2026-05-12 #4 : pivot pour publier UNIQUEMENT chantier OU dispo.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarCheck,
  ArrowLeft,
  Loader2,
  Globe2,
  Users,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { useCreateDisponibilite } from '@/hooks/queries/disponibilites'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import type {
  DisponibiliteVisibility,
  ContractModePref,
} from '@/api/disponibilites'

const DEPTS_BRETAGNE = [
  { code: '22', label: 'Côtes-d\'Armor' },
  { code: '29', label: 'Finistère' },
  { code: '35', label: 'Ille-et-Vilaine' },
  { code: '56', label: 'Morbihan' },
] as const

const METIERS = [
  'maçonnerie',
  'isolation',
  'menuiserie',
  'plomberie',
  'électricité',
  'couverture',
  'chauffage',
  'plâtrerie',
  'peinture',
  'photovoltaïque',
] as const

const VISIBILITY_OPTIONS: Array<{
  value: DisponibiliteVisibility
  label: string
  description: string
  Icon: typeof Globe2
  accent: string
}> = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible par tous les partenaires BRH, même hors de votre réseau direct.',
    Icon: Globe2,
    accent: 'border-slate-400 bg-slate-50',
  },
  {
    value: 'reseau',
    label: 'Mon réseau',
    description: 'Visible uniquement par vos connexions acceptées.',
    Icon: Users,
    accent: 'border-emerald-400 bg-emerald-50',
  },
  {
    value: 'prive',
    label: 'Brouillon',
    description: 'Non publié. Vous seul voyez cette dispo pour la modifier plus tard.',
    Icon: Lock,
    accent: 'border-slate-300 bg-slate-50',
  },
]

export default function ReseauDisponibiliteNew() {
  const navigate = useNavigate()
  const { data: membership, isLoading: loadingMembership } = useMyAgenceMembership()
  const proId = membership?.contractId ?? null

  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')
  const [metiers, setMetiers] = useState<string[]>([])
  const [departements, setDepartements] = useState<string[]>([])
  const [contractMode, setContractMode] = useState<ContractModePref>('sous_traitance')
  const [capaciteChantiers, setCapaciteChantiers] = useState<string>('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<DisponibiliteVisibility>('reseau')

  const createMut = useCreateDisponibilite()

  function toggleMetier(m: string) {
    setMetiers((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  function toggleDept(code: string) {
    setDepartements((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    )
  }

  function validate(): string | null {
    if (!proId) return 'Aucun contrat partenaire actif trouvé pour votre compte.'
    if (!periodeDebut || !periodeFin) return 'Précisez la période de disponibilité.'
    if (periodeFin < periodeDebut) return 'La fin de période doit être après le début.'
    if (metiers.length === 0) return 'Sélectionnez au moins un métier proposé.'
    if (departements.length === 0) return 'Sélectionnez au moins un département.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    try {
      const created = await createMut.mutateAsync({
        proId: proId as string,
        input: {
          periode_debut: periodeDebut,
          periode_fin: periodeFin,
          metiers_proposes: metiers,
          departements,
          contract_mode_pref: contractMode,
          capacite_chantiers: capaciteChantiers ? Number(capaciteChantiers) : null,
          description: description || null,
          visibility,
          status: visibility === 'prive' ? 'draft' : 'active',
        },
      })
      toast.success('Disponibilité publiée', {
        description:
          visibility === 'prive'
            ? 'Sauvegardée en brouillon.'
            : visibility === 'public'
              ? 'Visible par tous les partenaires BRH.'
              : 'Visible par votre réseau.',
      })
      navigate('/reseau/disponibilites')
      return created
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur de publication'
      toast.error('Publication impossible', { description: msg })
    }
  }

  if (loadingMembership) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!proId) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertCircle size={28} className="mx-auto text-amber-600 mb-2" />
          <p className="text-base font-bold text-amber-900">Contrat partenaire requis</p>
          <p className="text-sm text-amber-800 mt-1">
            Pour publier une disponibilité, vous devez avoir un contrat partenaire actif
            (signataire agence, artisan ou maître d'œuvre).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <Link
        to="/reseau"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={14} /> Retour au réseau
      </Link>

      <header className="mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center">
            <CalendarCheck size={18} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-text">
            Signaler ma disponibilité
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          Indiquez votre période libre, votre zone et les métiers que vous pouvez prendre.
          Les pros qui cherchent un sous-traitant ou un partenaire vous trouveront.
        </p>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Période */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-text">Période de disponibilité *</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 block mb-1">Du</span>
              <input
                type="date"
                required
                value={periodeDebut}
                onChange={(e) => setPeriodeDebut(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 block mb-1">Au</span>
              <input
                type="date"
                required
                value={periodeFin}
                onChange={(e) => setPeriodeFin(e.target.value)}
                min={periodeDebut || undefined}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </label>
          </div>
        </fieldset>

        {/* Métiers */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-text">Métiers proposés *</legend>
          <p className="text-xs text-text-muted">Cochez les métiers que vous pouvez prendre durant cette période.</p>
          <div className="flex flex-wrap gap-2">
            {METIERS.map((m) => {
              const sel = metiers.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMetier(m)}
                  aria-pressed={sel}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    sel
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Départements */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-text">Départements couverts *</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEPTS_BRETAGNE.map((d) => {
              const sel = departements.includes(d.code)
              return (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => toggleDept(d.code)}
                  aria-pressed={sel}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition text-left ${
                    sel
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="block">{d.code}</span>
                  <span className="block text-[10px] opacity-80">{d.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Mode contrat + capacité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold text-text block mb-1">Mode contrat préféré</span>
            <select
              value={contractMode}
              onChange={(e) => setContractMode(e.target.value as ContractModePref)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="sous_traitance">Sous-traitance</option>
              <option value="co_traitance">Co-traitance</option>
              <option value="apport">Apport d'affaires</option>
              <option value="tous">Tous modes</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-text block mb-1">Capacité chantiers (//)</span>
            <input
              type="number"
              min={0}
              max={50}
              value={capaciteChantiers}
              onChange={(e) => setCapaciteChantiers(e.target.value)}
              placeholder="Ex : 3"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <span className="text-[11px] text-text-muted block mt-0.5">Nombre de chantiers en parallèle possibles</span>
          </label>
        </div>

        {/* Description */}
        <label className="block">
          <span className="text-sm font-bold text-text block mb-1">Description (optionnelle)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Détails sur votre équipe, vos préférences, contraintes éventuelles…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </label>

        {/* Audience */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-text">Audience de cette dispo *</legend>
          <p className="text-xs text-text-muted">Qui peut voir cette publication ?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VISIBILITY_OPTIONS.map((opt) => {
              const sel = visibility === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  aria-pressed={sel}
                  className={`text-left p-3 rounded-xl border-2 transition ${
                    sel ? opt.accent + ' border-slate-900' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <opt.Icon size={16} className="mb-1.5 text-slate-700" />
                  <p className="text-sm font-bold text-text">{opt.label}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{opt.description}</p>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Link
            to="/reseau"
            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-50"
          >
            {createMut.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Publication…
              </>
            ) : (
              <>
                <CalendarCheck size={14} /> Publier
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
