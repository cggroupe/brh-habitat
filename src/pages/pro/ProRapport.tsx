import { useState, useEffect } from 'react'
import { FileText, Download, TrendingUp, Euro, Users, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCompanyDashboardStats } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error'
import type { RapportData, RapportMonthStats, RapportProspectLine } from '@/lib/rapport-pdf'


// ============================================================
// Helpers date
// ============================================================

function monthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    options.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: `${y}-${String(m).padStart(2, '0')}`,
    })
  }
  return options
}

function parseMonthValue(value: string): { month: number; year: number } {
  const [y, m] = value.split('-').map(Number)
  return { month: m, year: y }
}

function monthRangeDates(month: number, year: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function formatEurDisplay(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR') + ' €'
}

function monthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// ============================================================
// Fetching
// ============================================================

async function fetchMonthStats(
  companyId: string,
  month: number,
  year: number,
): Promise<{ stats: RapportMonthStats; prospects: RapportProspectLine[] }> {
  const { from, to } = monthRangeDates(month, year)

  // Prospects crees ce mois
  const { data: prospectRows, error: pErr } = await supabase
    .from('brh_prospects')
    .select('id, client_first_name, client_last_name, work_type, status, created_at')
    .eq('company_id', companyId)
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })

  if (pErr) throw pErr

  const rows = prospectRows ?? []
  const prospectIds = rows.map((p) => p.id)

  // Devis signes pour ces prospects
  let quoteRows: Array<{
    id: string
    prospect_id: string | null
    amount: number
    commission_amount: number | null
    commission_status: string
    commission_rate_percent: number | null
  }> = []

  if (prospectIds.length > 0) {
    const { data: qRows, error: qErr } = await supabase
      .from('brh_quotes')
      .select('id, prospect_id, amount, commission_amount, commission_status, commission_rate_percent')
      .in('prospect_id', prospectIds)

    if (qErr) throw qErr
    quoteRows = qRows ?? []
  }

  // Indexer les quotes par prospect_id
  const quoteByProspect = new Map<string, typeof quoteRows[number]>()
  for (const q of quoteRows) {
    if (q.prospect_id) quoteByProspect.set(q.prospect_id, q)
  }

  // Calculer les stats
  const nbProspects = rows.length
  const nbSignes = rows.filter((p) => p.status === 'signe' || p.status === 'termine').length

  let caApporte = 0
  let commissionsDues = 0
  let commissionsVersees = 0

  for (const q of quoteRows) {
    caApporte += q.amount ?? 0
    const commAmount = q.commission_amount ?? 0
    commissionsDues += commAmount
    if (q.commission_status === 'versee') {
      commissionsVersees += commAmount
    }
  }

  // Construire les lignes de prospects
  const prospectLines: RapportProspectLine[] = rows.map((p) => {
    const q = quoteByProspect.get(p.id)
    return {
      client_name: `${p.client_first_name} ${p.client_last_name}`,
      work_type: Array.isArray(p.work_type) ? p.work_type.join(', ') : (p.work_type ?? '—'),
      status: p.status,
      signed_amount: q ? q.amount : null,
      commission_amount: q ? q.commission_amount : null,
      commission_status: q ? q.commission_status : null,
      created_at: p.created_at,
    }
  })

  return {
    stats: { ca_apporte: caApporte, commissions_dues: commissionsDues, commissions_versees: commissionsVersees, nb_prospects: nbProspects, nb_signes: nbSignes },
    prospects: prospectLines,
  }
}

// ============================================================
// Composant principal
// ============================================================

export default function ProRapport() {
  const { user } = useAuth()
  const { data: company, isLoading: loadingCompany } = useMyCompany(user?.id)
  const { data: dashStats } = useCompanyDashboardStats(company?.id)

  const options = monthOptions()
  const [selectedValue, setSelectedValue] = useState<string>(options[0]?.value ?? '')
  const [rapportData, setRapportData] = useState<RapportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfReady, setPdfReady] = useState(false)

  // Reset PDF quand le mois change
  useEffect(() => {
    setPdfReady(false)
    setRapportData(null)
    setError(null)
  }, [selectedValue])

  async function handleGenerate() {
    if (!company || !user) return
    setLoading(true)
    setError(null)
    setPdfReady(false)

    try {
      const { month, year } = parseMonthValue(selectedValue)

      // Mois courant
      const { stats, prospects } = await fetchMonthStats(company.id, month, year)

      // Mois precedent
      let prevStats: RapportMonthStats | null = null
      const prevDate = new Date(year, month - 2, 1)
      const prevMonth = prevDate.getMonth() + 1
      const prevYear = prevDate.getFullYear()
      try {
        const { stats: ps } = await fetchMonthStats(company.id, prevMonth, prevYear)
        prevStats = ps
      } catch {
        // Pas de data precedente — pas bloquant
      }

      const data: RapportData = {
        partner_name: user.full_name ?? 'Partenaire',
        partner_company: company.name,
        partner_level: dashStats?.level ?? company.level ?? 'bronze',
        commission_rate: dashStats?.commissionRate ?? company.commission_rate_percent ?? 0,
        month,
        year,
        stats,
        prev_stats: prevStats,
        prospects,
      }

      setRapportData(data)
      setPdfReady(true)
    } catch (err) {
      logError('ProRapport.handleGenerate', err)
      setError('Erreur lors de la generation du rapport. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingCompany) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[300px]">
        <p className="font-body text-slate-400">Chargement...</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6 lg:p-10">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="font-body text-slate-500">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const selectedPeriod = parseMonthValue(selectedValue)

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#1c7b1d]/10 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-[#1c7b1d]" />
        </div>
        <div>
          <h1 className="font-display text-xl text-slate-900">Rapport mensuel</h1>
          <p className="font-body text-sm text-slate-400">Telechargez votre rapport partenaire en PDF</p>
        </div>
      </div>

      {/* Selecteur de mois */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <label className="block font-display text-sm text-slate-800 mb-2">Periode</label>
        <div className="flex gap-3 items-end">
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-[#1c7b1d] focus:ring-2 focus:ring-[#1c7b1d]/10"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-[#1c7b1d] text-white font-display text-sm hover:bg-[#1c7b1d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generation...
              </>
            ) : (
              <>
                <FileText size={15} />
                Generer le rapport
              </>
            )}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
          <p className="font-body text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Preview des stats */}
      {pdfReady && rapportData && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
            <h2 className="font-display text-base text-slate-900 mb-4">
              Apercu — {monthLabel(selectedPeriod.month, selectedPeriod.year)}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatPreviewCard
                icon={<Euro size={16} className="text-[#1c7b1d]" />}
                label="CA apporte"
                value={formatEurDisplay(rapportData.stats.ca_apporte)}
                prev={rapportData.prev_stats ? formatEurDisplay(rapportData.prev_stats.ca_apporte) : null}
              />
              <StatPreviewCard
                icon={<TrendingUp size={16} className="text-blue-500" />}
                label="Commissions dues"
                value={formatEurDisplay(rapportData.stats.commissions_dues)}
                prev={rapportData.prev_stats ? formatEurDisplay(rapportData.prev_stats.commissions_dues) : null}
              />
              <StatPreviewCard
                icon={<CheckCircle size={16} className="text-emerald-500" />}
                label="Comm. versees"
                value={formatEurDisplay(rapportData.stats.commissions_versees)}
                prev={null}
              />
              <StatPreviewCard
                icon={<Users size={16} className="text-orange-400" />}
                label="Prospects soumis"
                value={String(rapportData.stats.nb_prospects)}
                prev={rapportData.prev_stats ? String(rapportData.prev_stats.nb_prospects) : null}
              />
              <StatPreviewCard
                icon={<CheckCircle size={16} className="text-[#1c7b1d]" />}
                label="Signes"
                value={String(rapportData.stats.nb_signes)}
                prev={rapportData.prev_stats ? String(rapportData.prev_stats.nb_signes) : null}
              />
              <StatPreviewCard
                icon={<TrendingUp size={16} className="text-purple-500" />}
                label="Taux conversion"
                value={
                  rapportData.stats.nb_prospects > 0
                    ? ((rapportData.stats.nb_signes / rapportData.stats.nb_prospects) * 100).toFixed(1) + '%'
                    : '0%'
                }
                prev={null}
              />
            </div>

            {/* Bouton de telechargement PDF */}
              <button
                onClick={() => void downloadRapportPdf(rapportData, selectedPeriod.month, selectedPeriod.year)}
                className="w-full py-3.5 rounded-xl bg-[#1c7b1d] text-white font-display text-sm flex items-center justify-center gap-2 hover:bg-[#1c7b1d]/90 transition-colors shadow-lg shadow-[#1c7b1d]/25"
              >
                <Download size={16} />
                Telecharger le rapport PDF
              </button>
          </div>

          {/* Liste des prospects */}
          {rapportData.prospects.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-display text-sm text-slate-900">
                  Prospects du mois ({rapportData.prospects.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {rapportData.prospects.map((p, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-body text-sm text-slate-900 truncate">{p.client_name}</p>
                      <p className="font-body text-xs text-slate-400 truncate">{p.work_type}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={p.status} />
                      {p.commission_amount !== null && (
                        <span className="font-body text-xs text-[#1c7b1d] font-medium">
                          {formatEurDisplay(p.commission_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// Sous-composants
// ============================================================

function StatPreviewCard({
  icon,
  label,
  value,
  prev,
}: {
  icon: React.ReactNode
  label: string
  value: string
  prev: string | null
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="font-body text-xs text-slate-500">{label}</span>
      </div>
      <p className="font-display text-base text-slate-900">{value}</p>
      {prev !== null && (
        <p className="font-body text-xs text-slate-400 mt-0.5">Prec. : {prev}</p>
      )}
    </div>
  )
}

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  etude: 'En etude',
  devis_envoye: 'Devis envoye',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const PROSPECT_STATUS_BADGE: Record<string, string> = {
  nouveau: 'bg-blue-50 text-blue-700',
  etude: 'bg-orange-50 text-orange-700',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe: 'bg-green-50 text-green-700',
  termine: 'bg-emerald-50 text-emerald-700',
  perdu: 'bg-slate-100 text-slate-500',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`font-body text-xs px-2 py-0.5 rounded-full ${PROSPECT_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {PROSPECT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// Download PDF via dynamic import (lazy load @react-pdf/renderer)
async function downloadRapportPdf(data: RapportData, month: number, year: number) {
  const { pdf } = await import('@react-pdf/renderer')
  const { RapportPDF } = await import('@/lib/rapport-pdf')
  const blob = await pdf(<RapportPDF data={data} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-brh-${year}-${String(month).padStart(2, '0')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
