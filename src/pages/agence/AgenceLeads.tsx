/**
 * Phase 16.0.6 — Page `/agence/leads` : leads claim par l'agence courante.
 *
 * Refonte 2026-05-05 : click card → ouvre ProspectStudyPanel (DPE + scénarios
 * + aides + simulation + IRIS + artisans RGE + aides locales). Footer adapté
 * pour log tentative / libérer (pas claim, déjà claim).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Loader,
  CheckCircle2,
  XCircle,
  Phone,
  AlertTriangle,
  Flame,
  MapPin,
  ChevronRight,
  Search,
  Calculator,
  FileText,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useLeadAssignments,
  useLogAttempt,
  useReleaseLead,
} from '@/hooks/queries/lead-assignments'
import { scoreVenteApi } from '@/api/score-vente'
import type { ContactOutcome, AssignmentStatus, LeadAssignment } from '@/api/lead-assignments'
import { ProspectStudyPanel, type ProspectStudy } from '@/components/agence/ProspectStudyPanel'
import { useSimulationsForLead } from '@/hooks/queries/agence-simulations'

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'À traiter',
  contacted: 'Contactée',
  expired: 'Expirée',
  released: 'Libérée',
  blacklisted: 'Blacklistée',
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  active: 'bg-orange-100 text-orange-800 border border-orange-200',
  contacted: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  expired: 'bg-slate-100 text-slate-600 border border-slate-200',
  released: 'bg-slate-100 text-slate-600 border border-slate-200',
  blacklisted: 'bg-red-100 text-red-800 border border-red-200',
}

const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  no_answer: 'Pas de réponse',
  no_contact_info: 'Pas d\'info contact',
  interested: 'Intéressé(e) ✓',
  refused: 'Refusé',
  already_sold: 'Déjà vendu',
  wrong_address: 'Mauvaise adresse',
}

const DPE_BG: Record<string, string> = {
  F: 'bg-orange-500 text-white',
  G: 'bg-red-600 text-white',
}

export default function AgenceLeads() {
  const { data: membership } = useMyAgenceMembership()
  const { data: leads = [], isLoading } = useLeadAssignments({
    agenceId: membership?.agenceId,
    includeReleased: true,
    withProspect: true,
  })
  const logAttemptMut = useLogAttempt()
  const releaseMut = useReleaseLead()

  // Détail prospect ouvert
  const [selectedLead, setSelectedLead] = useState<LeadAssignment | null>(null)
  const [study, setStudy] = useState<ProspectStudy | null>(null)
  const [loadingStudy, setLoadingStudy] = useState(false)
  const [studyError, setStudyError] = useState<string | null>(null)

  // Form log attempt (inline dans le panel)
  const [logOpen, setLogOpen] = useState(false)
  const [outcome, setOutcome] = useState<ContactOutcome>('no_answer')
  const [notes, setNotes] = useState('')

  // Recherche locale
  const [search, setSearch] = useState('')

  // Timestamp stable pour les calculs de jours restants (évite Date.now() dans render)
  const [now] = useState(() => Date.now())

  const filteredLeads = leads.filter((l) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      l.prospect?.adresse_ban?.toLowerCase().includes(q) ||
      l.prospect?.commune?.toLowerCase().includes(q) ||
      l.prospect?.code_postal?.includes(q) ||
      String(l.prospect_id).includes(q)
    )
  })

  const active = filteredLeads.filter(
    (l) => l.status === 'active' || l.status === 'contacted',
  )
  const past = filteredLeads.filter(
    (l) => !['active', 'contacted'].includes(l.status),
  )

  async function openStudy(lead: LeadAssignment) {
    setSelectedLead(lead)
    setStudyError(null)
    setLogOpen(false)
    setNotes('')
    setLoadingStudy(true)
    try {
      const data = (await scoreVenteApi.fetchProspectStudy(lead.prospect_id)) as ProspectStudy
      const enriched: ProspectStudy = {
        ...data,
        iris_code: lead.prospect?.iris_code ?? null,
      }
      setStudy(enriched)
    } catch (err) {
      setStudyError(err instanceof Error ? err.message : 'Erreur étude')
    } finally {
      setLoadingStudy(false)
    }
  }

  function closeStudy() {
    setSelectedLead(null)
    setStudy(null)
    setStudyError(null)
    setLogOpen(false)
  }

  async function handleLogAttempt() {
    if (!selectedLead) return
    await logAttemptMut.mutateAsync({ id: selectedLead.id, outcome, notes })
    setLogOpen(false)
    setNotes('')
  }

  async function handleRelease() {
    if (!selectedLead) return
    if (!confirm('Libérer ce lead ? Il pourra être claim par une autre agence.')) return
    await releaseMut.mutateAsync(selectedLead.id)
    closeStudy()
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Mes leads</h1>
            <p className="text-sm text-slate-500">
              {active.length} actifs · {past.length} historique · max 2 tentatives par lead
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par adresse, commune, code postal…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-orange-500" />
        </div>
      ) : active.length === 0 && past.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-orange-50 flex items-center justify-center">
            <Flame size={20} className="text-orange-500" />
          </div>
          <p className="text-slate-800 font-semibold">Aucun lead actif pour le moment</p>
          <p className="text-sm text-slate-500 mt-1">
            Explorez le{' '}
            <a
              href="/agence/score-vente"
              className="text-orange-600 hover:text-orange-700 font-semibold underline"
            >
              Score Vente
            </a>{' '}
            pour claim de nouvelles opportunités.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 ? (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
                Leads actifs ({active.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => openStudy(lead)}
                    now={now}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
                Historique ({past.length})
              </h2>
              <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
                {past.slice(0, 30).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => openStudy(lead)}
                    className="w-full p-3 text-sm flex items-center justify-between hover:bg-slate-50 transition text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs shrink-0 ${STATUS_COLORS[lead.status]}`}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                      <span className="truncate text-slate-700">
                        {lead.prospect?.adresse_ban ?? `Prospect #${lead.prospect_id}`}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 ml-2">
                      {lead.released_at
                        ? new Date(lead.released_at).toLocaleDateString('fr-FR')
                        : new Date(lead.claimed_at).toLocaleDateString('fr-FR')}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 ml-1 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* Charte rappel */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        Charte : maximum 2 tentatives par lead. Au-delà sans intéressement, le lead
        est blacklisté automatiquement (frequency cap RGPD).
      </div>

      {/* Slide-in panel d'étude */}
      {loadingStudy ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-5 flex items-center gap-3">
            <Loader className="animate-spin text-orange-500" />
            <span className="text-sm font-medium text-slate-700">Chargement de l'étude…</span>
          </div>
        </div>
      ) : null}

      {studyError && selectedLead ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] max-w-md bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 shadow-md">
          {studyError}
          {' — Étude pas encore en cache (batch en cours, attendre quelques minutes).'}
          <button
            type="button"
            onClick={closeStudy}
            className="ml-2 text-red-700 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      {study && selectedLead ? (
        <ProspectStudyPanel
          study={study}
          onClose={closeStudy}
          onClaim={() => {}}
          alreadyClaimed
          quotaExhausted={false}
          isClaiming={false}
          customFooter={
            <div className="space-y-2">
              <SimulationsSection leadId={selectedLead.id} />
              <Link
                to={`/agence/simulateur?leadId=${selectedLead.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-xs font-bold rounded-lg shadow hover:shadow-md"
              >
                <Calculator size={12} />
                Faire une simulation pour ce lead
              </Link>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className={`px-2 py-1 rounded font-semibold ${STATUS_COLORS[selectedLead.status]}`}>
                  {STATUS_LABELS[selectedLead.status]}
                </span>
                <span className="text-slate-500">
                  {selectedLead.contact_attempts}/2 tentatives ·
                  Expire le {new Date(selectedLead.expires_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {selectedLead.last_attempt_outcome ? (
                <div className="bg-slate-50 rounded-md p-2 text-xs text-slate-700">
                  Dernière tentative :{' '}
                  <strong>{OUTCOME_LABELS[selectedLead.last_attempt_outcome]}</strong>
                  {selectedLead.notes ? ` · ${selectedLead.notes}` : ''}
                </div>
              ) : null}

              {selectedLead.status === 'contacted' ? (
                <div className="flex items-center gap-2 text-emerald-700 text-sm py-2">
                  <CheckCircle2 size={16} />
                  Lead transformé en contact intéressé
                </div>
              ) : selectedLead.status === 'active' ? (
                <>
                  {logOpen ? (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                      <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value as ContactOutcome)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                      >
                        {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes (optionnel)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleLogAttempt()}
                          disabled={logAttemptMut.isPending}
                          className="flex-1 px-3 py-2 bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold rounded-md hover:shadow-md disabled:opacity-50 transition"
                        >
                          {logAttemptMut.isPending ? '…' : 'Enregistrer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogOpen(false)}
                          className="px-3 py-2 border border-slate-300 text-xs rounded-md hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLogOpen(true)}
                        disabled={selectedLead.contact_attempts >= 2}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold rounded-md hover:shadow-md disabled:opacity-50 transition"
                      >
                        <Phone size={12} /> Logger une tentative
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRelease()}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        <XCircle size={12} /> Libérer le lead
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          }
        />
      ) : null}
    </div>
  )
}

function daysUntil(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / (1000 * 60 * 60 * 24))
}

function LeadCard({
  lead,
  onClick,
  now,
}: {
  lead: LeadAssignment
  onClick: () => void
  now: number
}) {
  const p = lead.prospect
  const adresse = p?.adresse_ban ?? p?.adresse ?? `Prospect #${lead.prospect_id}`
  const dpeBg = p?.etiquette_dpe ? DPE_BG[p.etiquette_dpe] : 'bg-slate-300 text-slate-700'
  const expiresIn = daysUntil(lead.expires_at, now)

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-orange-400 hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-sm flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{adresse}</span>
          </p>
          {p?.commune ? (
            <p className="text-[11px] text-slate-500 mt-0.5">
              {p.code_postal} {p.commune}
              {p.surface_habitable ? ` · ${p.surface_habitable} m²` : ''}
              {p.annee_construction ? ` · ${p.annee_construction}` : ''}
            </p>
          ) : null}
        </div>
        {p?.etiquette_dpe ? (
          <span
            className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm ${dpeBg}`}
          >
            {p.etiquette_dpe}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[lead.status]}`}>
          {STATUS_LABELS[lead.status]}
        </span>
        <span className="text-[11px] text-slate-500">
          {lead.contact_attempts}/2 tentatives · expire J+{expiresIn}
        </span>
      </div>

      {lead.last_attempt_outcome ? (
        <p className="text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1 mt-2 truncate">
          Dernière : {OUTCOME_LABELS[lead.last_attempt_outcome]}
          {lead.notes ? ` — ${lead.notes}` : ''}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100">
        <span className="text-orange-600 text-[11px] font-semibold inline-flex items-center group-hover:translate-x-0.5 transition">
          Voir l'étude
          <ChevronRight size={12} className="ml-0.5" />
        </span>
        <Link
          to={`/agence/simulateur?leadId=${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded border border-emerald-200"
        >
          <Calculator size={11} />
          Simuler
        </Link>
      </div>
    </button>
  )
}

function SimulationsSection({ leadId }: { leadId: string }) {
  const { data: sims = [] } = useSimulationsForLead(leadId)
  if (sims.length === 0) return null
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
      <p className="text-[11px] font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
        <FileText size={11} />
        Simulations sauvegardées ({sims.length})
      </p>
      <ul className="space-y-1">
        {sims.slice(0, 3).map((s) => (
          <li key={s.id}>
            <Link
              to={`/agence/simulateur?simId=${s.id}`}
              className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded border border-emerald-100 hover:border-emerald-300 transition text-xs"
            >
              <span className="truncate text-slate-800 font-medium">{s.titre}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {s.etiquette_dpe ? (
                  <span className="px-1.5 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded">
                    {s.etiquette_dpe}
                  </span>
                ) : null}
                <span className="text-[10px] text-slate-500">
                  {new Date(s.created_at).toLocaleDateString('fr-FR')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
