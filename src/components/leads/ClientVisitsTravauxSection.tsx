/**
 * ClientVisitsTravauxSection — bloc additif sur la fiche client BRH.
 *
 * Reprend la structure de la maquette Stitch v3 (projet BRHCRM Direction
 * Commerciale, screen 5ac730af). 2 sous-sections :
 *  1. Marqueur "Vu" multi-employés (bouton + liste avatars chainés)
 *  2. Table des travaux réalisés par poste technique (8 postes éditables)
 *
 * Pattern Karpathy : additif, ne casse rien du composant existant.
 * Tous les libellés en français.
 */
import { useState } from 'react'
import {
  Check, Loader2, UserCheck, Pencil, Save, X, Wrench,
  Calendar, Building2,
} from 'lucide-react'
import {
  usePersonneVisits,
  useMarkSeen,
  usePersonneTravaux,
  useUpsertTravaux,
} from '@/hooks/queries/usePersonneVisitsTravaux'
import {
  POSTE_LABELS,
  ETAT_LABELS,
  VISIT_TYPE_LABELS,
  type PosteTechnique,
  type EtatTravaux,
  type PersonneTravaux,
} from '@/api/brh-personne-visits-travaux'

interface Props {
  personneId: string
  currentUserId: string | null
}

const POSTE_ORDER: PosteTechnique[] = [
  'murs', 'toiture', 'plancher_bas', 'fenetres',
  'chauffage', 'ventilation', 'eau_chaude', 'tableau_electrique',
]

const ETATS: EtatTravaux[] = [
  'non_realise', 'passoire', 'partiel', 'realise_recent', 'realise_ancien', 'inconnu',
]

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ClientVisitsTravauxSection({ personneId, currentUserId }: Props) {
  return (
    <>
      <VisitsBlock personneId={personneId} currentUserId={currentUserId} />
      <TravauxBlock personneId={personneId} />
    </>
  )
}

// ============================================================
// Bloc "Déjà visité par"
// ============================================================
function VisitsBlock({ personneId, currentUserId }: { personneId: string; currentUserId: string | null }) {
  const { data: visits = [], isLoading } = usePersonneVisits(personneId)
  const markSeen = useMarkSeen(personneId)
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)

  const seenByCurrentUser = visits.some((v) => v.employee_id === currentUserId)

  async function handleMarkSeen() {
    await markSeen.mutateAsync({ type: 'visite_terrain', note: note || null })
    setNote('')
    setOpen(false)
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
          <UserCheck className="h-4 w-4 text-emerald-700" />
          Déjà visité par
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-stone-400" />}
          {!isLoading && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">
              {visits.length}
            </span>
          )}
        </h2>
        {!seenByCurrentUser && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
          >
            <Check className="h-3 w-3" />
            Marquer comme vu
          </button>
        )}
        {seenByCurrentUser && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            <Check className="h-3 w-3" />
            Vous l'avez déjà visité
          </span>
        )}
      </div>

      {open && (
        <div className="mb-3 space-y-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
          <label className="block text-xs font-medium uppercase tracking-wider text-stone-600">
            Note de visite (optionnelle)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ex : Vu sur place. Couple retraité hésitant sur isolation. Rappeler après juin."
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-1"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setNote('') }}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleMarkSeen}
              disabled={markSeen.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {markSeen.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Confirmer la visite
            </button>
          </div>
        </div>
      )}

      {visits.length === 0 && !isLoading && (
        <p className="text-xs italic text-stone-500">
          Aucune visite enregistrée. Marquez ce client comme vu pour signaler à vos collègues que vous l'avez contacté.
        </p>
      )}

      {visits.length > 0 && (
        <ul className="space-y-1.5">
          {visits.slice(0, 5).map((v) => (
            <li key={v.id} className="flex items-start gap-2 rounded-md border border-stone-100 bg-stone-50/60 px-2.5 py-2 text-xs">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold uppercase text-emerald-800">
                {(v.employee_name || '?').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-stone-800">{v.employee_name}</span>
                  <span className="text-stone-500">· {formatDate(v.seen_at)}</span>
                  <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                    {VISIT_TYPE_LABELS[v.visit_type] ?? v.visit_type}
                  </span>
                </div>
                {v.note && <p className="mt-0.5 italic text-stone-700">« {v.note} »</p>}
              </div>
            </li>
          ))}
          {visits.length > 5 && (
            <li className="px-2 text-[11px] italic text-stone-500">+ {visits.length - 5} autres visites antérieures</li>
          )}
        </ul>
      )}
    </section>
  )
}

// ============================================================
// Bloc "Travaux réalisés par poste technique"
// ============================================================
function TravauxBlock({ personneId }: { personneId: string }) {
  const { data: travaux = [], isLoading } = usePersonneTravaux(personneId)

  // Index par poste pour récupérer rapidement
  const byPoste: Record<string, PersonneTravaux | undefined> = {}
  for (const t of travaux) byPoste[t.poste_technique] = t

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
          <Wrench className="h-4 w-4 text-emerald-700" />
          Travaux par poste technique
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-stone-400" />}
        </h2>
        <p className="text-[11px] text-stone-500">
          Cliquez sur un poste pour renseigner l'état, l'entreprise et la date.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-600">
              <th className="px-2 py-2 w-[180px]">Poste</th>
              <th className="px-2 py-2">État</th>
              <th className="px-2 py-2">Entreprise réalisatrice</th>
              <th className="px-2 py-2 w-[110px]">Date</th>
              <th className="px-2 py-2 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {POSTE_ORDER.map((poste) => (
              <TravauxRow
                key={poste}
                personneId={personneId}
                poste={poste}
                existing={byPoste[poste]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TravauxRow({
  personneId, poste, existing,
}: { personneId: string; poste: PosteTechnique; existing: PersonneTravaux | undefined }) {
  const [editing, setEditing] = useState(false)
  const [etat, setEtat] = useState<EtatTravaux>(existing?.etat ?? 'inconnu')
  const [entreprise, setEntreprise] = useState(existing?.entreprise_realisatrice ?? '')
  const [date, setDate] = useState(existing?.date_travaux ?? '')
  const upsert = useUpsertTravaux(personneId)

  async function handleSave() {
    await upsert.mutateAsync({
      poste,
      patch: { etat, entreprise_realisatrice: entreprise || null, date_travaux: date || null },
    })
    setEditing(false)
  }

  function cancel() {
    setEtat(existing?.etat ?? 'inconnu')
    setEntreprise(existing?.entreprise_realisatrice ?? '')
    setDate(existing?.date_travaux ?? '')
    setEditing(false)
  }

  const etatMeta = ETAT_LABELS[existing?.etat ?? 'inconnu']

  if (!editing) {
    return (
      <tr className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
        <td className="px-2 py-2 align-middle font-medium text-stone-800">
          {POSTE_LABELS[poste]}
        </td>
        <td className="px-2 py-2 align-middle">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${etatMeta.cls}`}>
            {etatMeta.label}
          </span>
        </td>
        <td className="px-2 py-2 align-middle text-[12px] text-stone-700">
          {existing?.entreprise_realisatrice ? (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3 text-stone-400" />
              {existing.entreprise_realisatrice}
            </span>
          ) : (
            <span className="italic text-stone-400">—</span>
          )}
        </td>
        <td className="px-2 py-2 align-middle text-[12px] text-stone-700">
          {existing?.date_travaux ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 text-stone-400" />
              {formatDate(existing.date_travaux)}
            </span>
          ) : (
            <span className="italic text-stone-400">—</span>
          )}
        </td>
        <td className="px-2 py-2 align-middle text-right">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-stone-100 last:border-0 bg-emerald-50/30">
      <td className="px-2 py-2 align-middle font-medium text-stone-800">
        {POSTE_LABELS[poste]}
      </td>
      <td className="px-2 py-2 align-middle">
        <select
          value={etat}
          onChange={(e) => setEtat(e.target.value as EtatTravaux)}
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
        >
          {ETATS.map((e) => (
            <option key={e} value={e}>{ETAT_LABELS[e].label}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 align-middle">
        <input
          type="text"
          value={entreprise}
          onChange={(e) => setEntreprise(e.target.value)}
          placeholder="Ex : Menuiseries Dubois"
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={cancel}
            className="rounded-md p-1 text-stone-500 hover:bg-stone-100"
            title="Annuler"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={upsert.isPending}
            className="rounded-md bg-emerald-700 p-1 text-white hover:bg-emerald-800 disabled:opacity-50"
            title="Enregistrer"
          >
            {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  )
}
