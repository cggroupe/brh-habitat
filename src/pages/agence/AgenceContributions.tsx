/**
 * Phase 16.1 — Page /agence/contributions : apporter des leads travaux à BRH.
 *
 * L'agence partage des propriétaires F/G qui veulent rénover. En contrepartie :
 *   - Commission 5 % HT sur le chantier signé
 *   - Bonus leads vente débloqués (5 par chantier signé)
 *   - Progression de palier (bronze → silver → gold → platinum)
 */
import { useState } from 'react'
import {
  Handshake,
  Loader,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Zap,
  Plus,
  XCircle,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyContributions,
  useMyProgression,
  useSubmitContribution,
} from '@/hooks/queries/agence-contributions'
import {
  TIER_LABELS_FR,
  TIER_THRESHOLDS,
  type ContribStatus,
  type Urgence,
  type ContributionInsert,
} from '@/api/agence-contributions'

const STATUS_LABELS: Record<ContribStatus, string> = {
  submitted: 'Reçue',
  qualified: 'Qualifiée',
  audit_done: 'Audit fait',
  quote_signed: 'Chantier signé',
  completed: 'Chantier terminé',
  rejected: 'Refusée',
}

const STATUS_COLORS: Record<ContribStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 border border-blue-200',
  qualified: 'bg-warning/10 text-warning border border-warning/20',
  audit_done: 'bg-primary/10 text-primary-dark border border-primary/20',
  quote_signed: 'bg-purple-100 text-purple-800 border border-purple-200',
  completed: 'bg-success/10 text-success border border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border border-red-200',
}

const URGENCE_LABELS: Record<Urgence, string> = {
  immediate: 'Immédiat',
  '3mois': '< 3 mois',
  '6mois': '< 6 mois',
  '12mois': '< 12 mois',
  indecis: 'Indécis',
}

const TRAVAUX_OPTIONS = [
  { id: 'pac_air_eau', label: 'Pompe à chaleur air/eau' },
  { id: 'pac_air_air', label: 'Pompe à chaleur air/air' },
  { id: 'isolation_combles', label: 'Isolation combles' },
  { id: 'isolation_murs_ite', label: 'Isolation murs (ITE)' },
  { id: 'isolation_murs_iti', label: 'Isolation murs (ITI)' },
  { id: 'isolation_planchers_bas', label: 'Isolation plancher bas' },
  { id: 'fenetres_double_vitrage', label: 'Fenêtres double vitrage' },
  { id: 'vmc_double_flux', label: 'VMC double flux' },
  { id: 'chaudiere_gaz_thpe', label: 'Chaudière gaz THPE' },
  { id: 'poele_a_bois', label: 'Poêle à bois' },
  { id: 'solaire_thermique', label: 'Solaire thermique' },
  { id: 'autre', label: 'Autre / non identifié' },
]

function formatEur(cents: number): string {
  return Math.round(cents / 100).toLocaleString('fr-FR') + ' €'
}

export default function AgenceContributions() {
  const { data: membership } = useMyAgenceMembership()
  const { data: progression } = useMyProgression(membership?.agenceId)
  const { data: contributions = [], isLoading } = useMyContributions(membership?.agenceId)
  const submitMut = useSubmitContribution()

  const [formOpen, setFormOpen] = useState(false)
  const [submitOK, setSubmitOK] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form state
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [commune, setCommune] = useState('')
  const [proprietaireNom, setProprietaireNom] = useState('')
  const [proprietairePrenom, setProprietairePrenom] = useState('')
  const [proprietaireTel, setProprietaireTel] = useState('')
  const [proprietaireEmail, setProprietaireEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [surfaceM2, setSurfaceM2] = useState('')
  const [dpeActuel, setDpeActuel] = useState('')
  const [travauxEnvisages, setTravauxEnvisages] = useState<string[]>([])
  const [budgetEur, setBudgetEur] = useState('')
  const [urgence, setUrgence] = useState<Urgence>('6mois')
  const [contexte, setContexte] = useState('')

  function resetForm() {
    setAdresse('')
    setCodePostal('')
    setCommune('')
    setProprietaireNom('')
    setProprietairePrenom('')
    setProprietaireTel('')
    setProprietaireEmail('')
    setConsent(false)
    setSurfaceM2('')
    setDpeActuel('')
    setTravauxEnvisages([])
    setBudgetEur('')
    setUrgence('6mois')
    setContexte('')
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membership?.agenceId) return
    setSubmitError(null)

    if (!consent) {
      setSubmitError(
        'Vous devez confirmer avoir obtenu le consentement explicite du propriétaire.',
      )
      return
    }

    try {
      const input: ContributionInsert = {
        agence_id: membership.agenceId,
        submitted_by: null,
        proprietaire_nom: proprietaireNom || null,
        proprietaire_prenom: proprietairePrenom || null,
        proprietaire_telephone: proprietaireTel || null,
        proprietaire_email: proprietaireEmail || null,
        consent_contact: consent,
        adresse,
        code_postal: codePostal || null,
        commune: commune || null,
        departement: codePostal.slice(0, 2) || null,
        type_batiment: null,
        surface_estimee_m2: surfaceM2 ? parseInt(surfaceM2) : null,
        etiquette_dpe_actuelle: dpeActuel || null,
        travaux_envisages: travauxEnvisages,
        budget_estime_eur: budgetEur ? parseInt(budgetEur) : null,
        urgence,
        contexte: contexte || null,
      }
      await submitMut.mutateAsync(input)
      setSubmitOK(true)
      setFormOpen(false)
      resetForm()
      setTimeout(() => setSubmitOK(false), 4000)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Erreur lors de la soumission',
      )
    }
  }

  function toggleGeste(g: string) {
    setTravauxEnvisages((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    )
  }

  const tierThreshold = progression
    ? TIER_THRESHOLDS[progression.tier]
    : TIER_THRESHOLDS.bronze
  const remainingForNext = tierThreshold.next_chantiers
    ? tierThreshold.next_chantiers - (progression?.chantiers_signes ?? 0)
    : null

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-deep to-primary-dark flex items-center justify-center shadow-md">
            <Handshake size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Apporter un prospect travaux</h1>
            <p className="text-sm text-text-light">
              Référez vos vendeurs intéressés par la rénovation → commission 5 % HT + débloquez leads + features
            </p>
          </div>
        </div>
      </header>

      {/* Récap progression */}
      {progression ? (
        <div className="bg-gradient-to-br from-deep via-primary-dark to-deep rounded-2xl p-5 text-white relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
          />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                Palier actuel
              </p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-2">
                <Award size={20} />
                {TIER_LABELS_FR[progression.tier]}
              </p>
              {remainingForNext != null && remainingForNext > 0 ? (
                <p className="text-[11px] text-text-light mt-1">
                  {remainingForNext} chantiers signés pour passer{' '}
                  {tierThreshold.next ? TIER_LABELS_FR[tierThreshold.next as keyof typeof TIER_LABELS_FR] : ''}
                </p>
              ) : (
                <p className="text-[11px] text-emerald-300 mt-1">Palier maximum atteint</p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-light font-bold">
                Contributions
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {progression.contributions_count}
              </p>
              <p className="text-[11px] text-text-light mt-1">
                dont {progression.contributions_qualified} qualifiées
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-light font-bold">
                Chantiers signés
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {progression.chantiers_signes}
              </p>
              <p className="text-[11px] text-text-light mt-1">
                {progression.chantiers_completes} terminés
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-light font-bold">
                Commissions
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {formatEur(progression.total_commission_due_cents)}
              </p>
              <p className="text-[11px] text-text-light mt-1">
                dont {formatEur(progression.total_commission_paid_cents)} versées
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* CTA + form */}
      {!formOpen ? (
        <button
          type="button"
          onClick={() => {
            setFormOpen(true)
            setSubmitOK(false)
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-br from-deep to-primary-dark text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
        >
          <Plus size={18} />
          Apporter un nouveau prospect travaux
        </button>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display tracking-tight">Nouveau prospect travaux</h2>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false)
                resetForm()
              }}
              className="text-text-light hover:text-text-secondary"
            >
              <XCircle size={20} />
            </button>
          </div>

          {submitError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {/* Adresse */}
          <fieldset>
            <legend className="text-xs uppercase tracking-wider font-bold text-text-light mb-2">
              Bien
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs text-text-secondary mb-1">Adresse complète *</label>
                <input
                  required
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                  placeholder="12 rue de la Paix"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Code postal</label>
                <input
                  value={codePostal}
                  onChange={(e) => setCodePostal(e.target.value)}
                  maxLength={5}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                  placeholder="35000"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Commune</label>
                <input
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                  placeholder="Rennes"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Surface m²</label>
                <input
                  type="number"
                  value={surfaceM2}
                  onChange={(e) => setSurfaceM2(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">DPE actuel</label>
                <select
                  value={dpeActuel}
                  onChange={(e) => setDpeActuel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                >
                  <option value="">—</option>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Propriétaire */}
          <fieldset>
            <legend className="text-xs uppercase tracking-wider font-bold text-text-light mb-2">
              Propriétaire
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={proprietaireNom}
                onChange={(e) => setProprietaireNom(e.target.value)}
                placeholder="Nom"
                className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
              />
              <input
                value={proprietairePrenom}
                onChange={(e) => setProprietairePrenom(e.target.value)}
                placeholder="Prénom"
                className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
              />
              <input
                type="tel"
                value={proprietaireTel}
                onChange={(e) => setProprietaireTel(e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
              />
              <input
                type="email"
                value={proprietaireEmail}
                onChange={(e) => setProprietaireEmail(e.target.value)}
                placeholder="email@example.fr"
                className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
              />
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Je certifie avoir obtenu le <strong>consentement explicite du propriétaire</strong> pour
                transmettre ses coordonnées à BRH Habitat dans le cadre d'une mise en relation
                travaux (RGPD article 6.1.a). *
              </span>
            </label>
          </fieldset>

          {/* Travaux */}
          <fieldset>
            <legend className="text-xs uppercase tracking-wider font-bold text-text-light mb-2">
              Travaux envisagés
            </legend>
            <div className="flex flex-wrap gap-2">
              {TRAVAUX_OPTIONS.map((g) => {
                const active = travauxEnvisages.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGeste(g.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      active
                        ? 'bg-emerald-600 border-emerald-700 text-white'
                        : 'bg-white border-neutral-light text-text-secondary hover:bg-background'
                    }`}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Budget estimé (€ TTC)</label>
                <input
                  type="number"
                  value={budgetEur}
                  onChange={(e) => setBudgetEur(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Urgence</label>
                <select
                  value={urgence}
                  onChange={(e) => setUrgence(e.target.value as Urgence)}
                  className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
                >
                  {Object.entries(URGENCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Contexte / notes</label>
            <textarea
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              placeholder="Vendeur intéressé par PAC après visite..."
              rows={2}
              className="w-full px-3 py-2 border border-neutral-light rounded text-sm"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2">
            <Zap size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Ce qui se passe ensuite</p>
              <ol className="space-y-0.5 list-decimal list-inside">
                <li>BRH qualifie la demande sous 48h ouvrées</li>
                <li>Un Pro RGE BRH contacte le propriétaire pour audit gratuit</li>
                <li>Si chantier signé : commission 5 % HT versée à votre agence + 5 leads vente bonus</li>
              </ol>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitMut.isPending}
            className="w-full px-4 py-3 bg-gradient-to-br from-deep to-primary-dark text-white font-bold rounded-lg shadow hover:shadow-lg disabled:opacity-50 transition"
          >
            {submitMut.isPending ? 'Envoi…' : 'Envoyer la contribution à BRH'}
          </button>
        </form>
      )}

      {submitOK ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} />
          Contribution envoyée — un conseiller BRH revient vers vous sous 48h.
        </div>
      ) : null}

      {/* Liste contributions */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-text-light font-bold mb-3">
          Mes contributions ({contributions.length})
        </h2>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader className="animate-spin text-emerald-600" />
          </div>
        ) : contributions.length === 0 ? (
          <div className="bg-white border border-neutral-light rounded-xl p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <TrendingUp size={26} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-text">Aucune contribution pour le moment</p>
            <p className="text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
              Référez un vendeur intéressé par la rénovation et faites passer votre agence
              <strong className="text-emerald-700"> Bronze → Argent</strong> (3 chantiers signés).
            </p>
            <button
              type="button"
              onClick={() => {
                setFormOpen(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
            >
              <TrendingUp size={14} />
              Apporter ma 1ère contribution
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {contributions.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-neutral-light p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary truncate">
                      {c.adresse}
                    </p>
                    <p className="text-[11px] text-text-light">
                      {c.code_postal} {c.commune}
                      {c.proprietaire_nom
                        ? ` · ${c.proprietaire_prenom ?? ''} ${c.proprietaire_nom}`
                        : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                {c.travaux_envisages.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.travaux_envisages.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] bg-background text-text-secondary px-2 py-0.5 rounded"
                      >
                        {g.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-[11px] text-text-light">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {c.urgence ? <span>· Urgence : {URGENCE_LABELS[c.urgence]}</span> : null}
                  {c.commission_amount_cents ? (
                    <span className="ml-auto font-bold text-primary">
                      Commission : {formatEur(c.commission_amount_cents)}
                    </span>
                  ) : c.status === 'rejected' ? (
                    <span className="ml-auto text-red-600 inline-flex items-center gap-1">
                      <AlertCircle size={11} />
                      {c.rejected_reason ?? 'Refusée'}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
