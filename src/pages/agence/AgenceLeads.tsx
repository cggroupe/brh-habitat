/**
 * Phase 16.0.6 — Page `/agence/leads` : leads claim par l'agence courante.
 *
 * Liste les assignments actifs + permet de déclarer une tentative de contact
 * + libérer un lead (si pas pertinent). Affiche aussi historique contacted.
 */
import { useState } from 'react'
import {
  ClipboardList,
  Loader,
  CheckCircle2,
  XCircle,
  Phone,
  AlertTriangle,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useLeadAssignments,
  useLogAttempt,
  useReleaseLead,
} from '@/hooks/queries/lead-assignments'
import type { ContactOutcome, AssignmentStatus } from '@/api/lead-assignments'

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'Active',
  contacted: 'Contactée',
  expired: 'Expirée',
  released: 'Libérée',
  blacklisted: 'Blacklistée',
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  active: 'bg-blue-100 text-blue-800',
  contacted: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-600',
  released: 'bg-gray-100 text-gray-600',
  blacklisted: 'bg-red-100 text-red-800',
}

const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  no_answer: 'Pas de réponse',
  no_contact_info: 'Pas d\'info contact',
  interested: 'Intéressé(e) ✓',
  refused: 'Refusé',
  already_sold: 'Déjà vendu',
  wrong_address: 'Mauvaise adresse',
}

export default function AgenceLeads() {
  const { data: membership } = useMyAgenceMembership()
  const { data: leads = [], isLoading } = useLeadAssignments({
    agenceId: membership?.agenceId,
    includeReleased: true,
  })
  const logAttemptMut = useLogAttempt()
  const releaseMut = useReleaseLead()

  const [logFor, setLogFor] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ContactOutcome>('no_answer')
  const [notes, setNotes] = useState('')

  const active = leads.filter((l) => l.status === 'active' || l.status === 'contacted')
  const past = leads.filter((l) => !['active', 'contacted'].includes(l.status))

  async function handleLogAttempt(id: string) {
    await logAttemptMut.mutateAsync({ id, outcome, notes })
    setLogFor(null)
    setNotes('')
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-display flex items-center gap-2">
          <ClipboardList className="text-blue-600" size={24} />
          Mes leads
        </h1>
        <p className="text-sm text-gray-600">
          {active.length} actifs · {past.length} historique · max 2 tentatives par lead
        </p>
      </header>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-blue-600" />
        </div>
      ) : active.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <ClipboardList className="mx-auto mb-3 text-blue-400" size={32} />
          <p className="text-blue-900 font-medium">Aucun lead actif pour le moment.</p>
          <p className="text-sm text-blue-700 mt-1">
            Allez dans <a href="/agence/score-vente" className="underline">Score Vente</a> pour claim de nouvelles opportunités.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold">
            Leads actifs
          </h2>
          {active.map((lead) => {
            const expiresOn = new Date(lead.expires_at).toLocaleDateString('fr-FR')
            return (
              <article
                key={lead.id}
                className="bg-white rounded-xl border border-slate-100 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Prospect #{lead.prospect_id}</p>
                    <p className="text-xs text-gray-500">
                      Claim le {new Date(lead.claimed_at).toLocaleDateString('fr-FR')} ·
                      Expire le {expiresOn}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tentatives : {lead.contact_attempts} / 2
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>

                {lead.last_attempt_outcome ? (
                  <p className="text-xs bg-gray-50 rounded px-2 py-1">
                    Dernière tentative : <strong>{OUTCOME_LABELS[lead.last_attempt_outcome]}</strong>
                    {lead.notes ? ` · ${lead.notes}` : ''}
                  </p>
                ) : null}

                {lead.status === 'active' ? (
                  <div className="flex flex-wrap gap-2">
                    {logFor === lead.id ? (
                      <div className="flex flex-wrap gap-2 items-end w-full bg-gray-50 p-3 rounded-lg">
                        <select
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value as ContactOutcome)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Notes (optionnel)"
                          className="flex-1 min-w-[150px] px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleLogAttempt(lead.id)}
                          disabled={logAttemptMut.isPending}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setLogFor(null)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setLogFor(lead.id)}
                          disabled={lead.contact_attempts >= 2}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Phone size={12} /> Logger une tentative
                        </button>
                        <button
                          onClick={() => releaseMut.mutate(lead.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <XCircle size={12} /> Libérer
                        </button>
                      </>
                    )}
                  </div>
                ) : lead.status === 'contacted' ? (
                  <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 size={12} /> Lead transformé en contact intéressé
                  </p>
                ) : null}
              </article>
            )
          })}
        </section>
      )}

      {past.length > 0 ? (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-2">
            Historique ({past.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-100 divide-y">
            {past.slice(0, 20).map((lead) => (
              <div key={lead.id} className="p-3 text-sm flex items-center justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs mr-2 ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                  Prospect #{lead.prospect_id}
                </div>
                <span className="text-xs text-gray-500">
                  {lead.released_at
                    ? new Date(lead.released_at).toLocaleDateString('fr-FR')
                    : new Date(lead.claimed_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        Charte : maximum 2 tentatives par lead. Au-delà sans intéressement, le lead
        est blacklisté automatiquement (frequency cap RGPD).
      </div>
    </div>
  )
}
