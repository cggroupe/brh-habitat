/**
 * Phase 16.1 — Page /agence/parrainage : recrutement de nouvelles agences.
 *
 * Step C (2026-05-06) : cascade 5 niveaux activée. Niveau 1 = parrain direct
 * 100 € + 5 leads ; barème dégressif jusqu'à niveau 5. Onglet "Mon arbre"
 * pour voir tout son réseau.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Network,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Share2,
  Building2,
  Euro,
  TrendingUp,
  TreePine,
  HelpCircle,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyReferralCommissions,
  useMyReferred,
} from '@/hooks/queries/agence-referrals'
import ReferralTreeView from '@/components/agence/ReferralTreeView'
import MlmTreeViz from '@/components/agence/MlmTreeViz'
import { useQuery } from '@tanstack/react-query'
import { agenceLeaderboardApi } from '@/api/agence-leaderboard'

const COMMISSION_PER_REF_CENTS = 10000 // 100 € HT

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  validated: 'Validée',
  paid: 'Payée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/20',
  validated: 'bg-info/10 text-info border border-info/20',
  paid: 'bg-success/10 text-success border border-emerald-200',
  cancelled: 'bg-background text-text-secondary border border-neutral-light',
}

const AGENCE_STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  contacted: 'Contactée',
  partenaire: 'Partenaire ✓',
  refused: 'Refusée',
}

function formatEur(cents: number): string {
  return Math.round(cents / 100).toLocaleString('fr-FR') + ' €'
}

export default function AgenceParrainage() {
  const { data: membership } = useMyAgenceMembership()
  const { data: commissions = [] } = useMyReferralCommissions(membership?.agenceId)
  const { data: referred = [] } = useMyReferred(membership?.agenceId)

  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'cash' | 'tree'>('cash')

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://brh-habitat.vercel.app'
  const refLink = membership?.agenceId
    ? `${baseUrl}/inscription/agence?ref=${membership.agenceId}`
    : ''

  const shareText = `Je vous recommande BRH Habitat pour les agences immobilières : leads scorés F/G en Bretagne avec étiquette DPE estimée + scénarios chiffrés. Inscription :`

  async function handleCopy() {
    if (!refLink) return
    try {
      await navigator.clipboard.writeText(refLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  const totalEarned = commissions.reduce(
    (s, c) => (c.status !== 'cancelled' ? s + c.commission_amount_cents : s),
    0,
  )
  const totalPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((s, c) => s + c.commission_amount_cents, 0)
  const partenaires = referred.filter((a) => a.status === 'partenaire').length

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${refLink}`)}`
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    'BRH Habitat — partenaire agences immobilières',
  )}&body=${encodeURIComponent(`${shareText}\n\n${refLink}`)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md">
            <Network size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">Mon réseau d'agences</h1>
            <p className="text-sm text-text-light">
              Recrutez d'autres agences partenaires → cascade 5 niveaux (max 145 € HT + 12 leads par charte)
            </p>
          </div>
        </div>
        <Link
          to="/agence/parrainage/comment-ca-marche"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white border border-neutral-light text-text-secondary hover:border-primary/30 hover:text-primary-dark transition shrink-0"
        >
          <HelpCircle size={13} />
          Comment ça marche
        </Link>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-bold">
              Agences parrainées
            </p>
            <Building2 size={16} />
          </div>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">{referred.length}</p>
          <p className="text-[11px] opacity-90 mt-1">
            dont {partenaires} signataires de charte
          </p>
        </div>
        <div className="bg-gradient-to-br from-deep to-primary-dark rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-bold">
              Commissions gagnées
            </p>
            <Euro size={16} />
          </div>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">{formatEur(totalEarned)}</p>
          <p className="text-[11px] opacity-90 mt-1">dont {formatEur(totalPaid)} versées</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-text-light font-bold">
              Commission par parrainage
            </p>
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatEur(COMMISSION_PER_REF_CENTS)}
          </p>
          <p className="text-[11px] text-text-light mt-1">
            HT à chaque charte signée par une agence parrainée
          </p>
        </div>
      </div>

      {/* Lien parrainage + share */}
      <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
        <h2 className="font-display text-base font-bold text-text-primary mb-3 tracking-tight">Mon lien de parrainage</h2>
        <div className="flex items-center gap-2 bg-background border border-neutral-light rounded-lg p-3 mb-3">
          <code className="text-xs text-text-secondary flex-1 truncate">{refLink}</code>
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              copied
                ? 'bg-success/10 text-success'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
          <a
            href={emailUrl}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
          >
            <Mail size={14} />
            Email
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0A66C2] text-white text-xs font-bold rounded-lg hover:bg-[#084C8E]"
          >
            <Share2 size={14} />
            LinkedIn
          </a>
        </div>

        <p className="text-[11px] text-text-light mt-3">
          Partagez ce lien avec d'autres agences immobilières — quand elles signent leur
          charte, vous recevez automatiquement 100 € HT en commission + 5 leads bonus.
          La cascade s'étend sur 5 niveaux (vous touchez aussi sur les filleuls de vos
          filleuls, dégressivement).
        </p>
      </section>

      {/* Toggle Cash & Leads / Mon arbre */}
      <div className="inline-flex bg-background rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => setView('cash')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            view === 'cash'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Euro size={12} className="inline mr-1.5" />
          Cash & leads
        </button>
        <button
          type="button"
          onClick={() => setView('tree')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            view === 'tree'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <TreePine size={12} className="inline mr-1.5" />
          Mon arbre (5 niveaux)
        </button>
      </div>

      {view === 'tree' ? (
        <div className="space-y-4">
          <MlmTreeWithFallback />
          <ReferralTreeView />
        </div>
      ) : null}

      {/* Liste agences parrainées (vue cash) */}
      {view === 'cash' && <section>
        <h2 className="text-sm uppercase tracking-wider text-text-light font-bold mb-3">
          Agences parrainées ({referred.length})
        </h2>
        {referred.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6 text-center">
            <Building2 size={28} className="mx-auto mb-2 text-text-light" />
            <p className="text-text-secondary font-medium">Aucune agence parrainée pour l'instant</p>
            <p className="text-xs text-text-light mt-1">
              Partagez votre lien de parrainage ci-dessus
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referred.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-3.5 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">
                    {a.raison_sociale ?? `Agence #${a.id.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] text-text-light">
                    {a.code_postal} {a.commune}
                    {a.departement ? ` (Dept ${a.departement})` : ''} ·{' '}
                    {new Date(a.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[11px] bg-background text-text-secondary">
                  {AGENCE_STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>}

      {/* Liste commissions (vue cash) */}
      {view === 'cash' && <section>
        <h2 className="text-sm uppercase tracking-wider text-text-light font-bold mb-3">
          Mes commissions ({commissions.length})
        </h2>
        {commissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6 text-center">
            <Euro size={28} className="mx-auto mb-2 text-text-light" />
            <p className="text-text-light text-sm">
              Aucune commission encore — la 1ʳᵉ charte signée par une agence parrainée déclenchera
              automatiquement +100 € HT.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-xs uppercase tracking-wider text-text-light">
                <tr className="text-left">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Agence parrainée</th>
                  <th className="px-4 py-2.5">Niveau</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5 text-right">Cash</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-xs text-text-secondary">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-text-primary">
                        {c.recruited?.raison_sociale ??
                          `Agence #${c.recruited_agence_id.slice(0, 8)}`}
                      </p>
                      {c.recruited?.commune ? (
                        <p className="text-[11px] text-text-light">
                          {c.recruited.code_postal} {c.recruited.commune}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold bg-primary/10 text-primary-dark border border-primary/20">
                        N{c.chain_level ?? 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                      {c.paid_at ? (
                        <p className="text-[10px] text-success mt-0.5">
                          Payée le {new Date(c.paid_at).toLocaleDateString('fr-FR')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums">
                      {formatEur(c.commission_amount_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums">
                      +{c.leads_bonus_amount ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </div>
  )
}

function MlmTreeWithFallback() {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['agence-mlm-tree'] as const,
    queryFn: () => agenceLeaderboardApi.mlmTree(),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center text-[13px] text-text-muted">
        Chargement de l'arbre…
      </div>
    )
  }

  return <MlmTreeViz nodes={nodes} />
}
