/**
 * Phase 16.1 — Page /agence/parrainage : recrutement de nouvelles agences.
 *
 * Step C (2026-05-06) : cascade 5 niveaux activée. Niveau 1 = parrain direct
 * 100 € + 5 leads ; barème dégressif jusqu'à niveau 5. Onglet "Mon arbre"
 * pour voir tout son réseau.
 */
import { useState } from 'react'
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
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useMyReferralCommissions,
  useMyReferred,
} from '@/hooks/queries/agence-referrals'
import ReferralTreeView from '@/components/agence/ReferralTreeView'

const COMMISSION_PER_REF_CENTS = 10000 // 100 € HT

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  validated: 'Validée',
  paid: 'Payée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  validated: 'bg-blue-100 text-blue-800 border border-blue-200',
  paid: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
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
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Network size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Mon réseau d'agences</h1>
            <p className="text-sm text-slate-500">
              Recrutez d'autres agences partenaires → 100 € HT de commission par charte signée
            </p>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-bold">
              Agences parrainées
            </p>
            <Building2 size={16} />
          </div>
          <p className="text-3xl font-bold tabular-nums">{referred.length}</p>
          <p className="text-[11px] opacity-90 mt-1">
            dont {partenaires} signataires de charte
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-bold">
              Commissions gagnées
            </p>
            <Euro size={16} />
          </div>
          <p className="text-3xl font-bold tabular-nums">{formatEur(totalEarned)}</p>
          <p className="text-[11px] opacity-90 mt-1">dont {formatEur(totalPaid)} versées</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Commission par parrainage
            </p>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-emerald-700">
            {formatEur(COMMISSION_PER_REF_CENTS)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            HT à chaque charte signée par une agence parrainée
          </p>
        </div>
      </div>

      {/* Lien parrainage + share */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-800 mb-3">Mon lien de parrainage</h2>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
          <code className="text-xs text-slate-700 flex-1 truncate">{refLink}</code>
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              copied
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
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

        <p className="text-[11px] text-slate-500 mt-3">
          Partagez ce lien avec d'autres agences immobilières — quand elles signent leur
          charte, vous recevez automatiquement 100 € HT en commission + 5 leads bonus.
          La cascade s'étend sur 5 niveaux (vous touchez aussi sur les filleuls de vos
          filleuls, dégressivement).
        </p>
      </section>

      {/* Toggle Cash & Leads / Mon arbre */}
      <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => setView('cash')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
            view === 'cash'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
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
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <TreePine size={12} className="inline mr-1.5" />
          Mon arbre (5 niveaux)
        </button>
      </div>

      {view === 'tree' ? <ReferralTreeView /> : null}

      {/* Liste agences parrainées (vue cash) */}
      {view === 'cash' && <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
          Agences parrainées ({referred.length})
        </h2>
        {referred.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <Building2 size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-700 font-medium">Aucune agence parrainée pour l'instant</p>
            <p className="text-xs text-slate-500 mt-1">
              Partagez votre lien de parrainage ci-dessus
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referred.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {a.raison_sociale ?? `Agence #${a.id.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {a.code_postal} {a.commune}
                    {a.departement ? ` (Dept ${a.departement})` : ''} ·{' '}
                    {new Date(a.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                  {AGENCE_STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>}

      {/* Liste commissions (vue cash) */}
      {view === 'cash' && <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
          Mes commissions ({commissions.length})
        </h2>
        {commissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <Euro size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 text-sm">
              Aucune commission encore — la 1ʳᵉ charte signée par une agence parrainée déclenchera
              automatiquement +100 € HT.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr className="text-left">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Agence parrainée</th>
                  <th className="px-4 py-2.5">Niveau</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5 text-right">Cash</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">
                        {c.recruited?.raison_sociale ??
                          `Agence #${c.recruited_agence_id.slice(0, 8)}`}
                      </p>
                      {c.recruited?.commune ? (
                        <p className="text-[11px] text-slate-500">
                          {c.recruited.code_postal} {c.recruited.commune}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
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
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          Payée le {new Date(c.paid_at).toLocaleDateString('fr-FR')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatEur(c.commission_amount_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-orange-600 tabular-nums">
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
