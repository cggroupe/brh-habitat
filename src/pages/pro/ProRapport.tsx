import { useState, useEffect } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCompanyDashboardStats } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error'
import { StatsPreviewPanel } from './pro-rapport/StatsPreviewPanel'
import { ProspectsTable } from './pro-rapport/ProspectsTable'
import type { RapportData, RapportMonthStats, RapportProspectLine } from '@/lib/rapport-pdf'

// ─── Helpers date ──────────────────────────────────────────────────────────────

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

// ─── Fetching ──────────────────────────────────────────────────────────────────

async function fetchMonthStats(
  companyId: string,
  month: number,
  year: number,
): Promise<{ stats: RapportMonthStats; prospects: RapportProspectLine[] }> {
  const { from, to } = monthRangeDates(month, year)

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

  let quoteRows: Array<{
    id: string
    prospect_id: string | null
    amount: number
    commission_amount: number | null
    commission_status: string | null
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

  const quoteByProspect = new Map<string, typeof quoteRows[number]>()
  for (const q of quoteRows) {
    if (q.prospect_id) quoteByProspect.set(q.prospect_id, q)
  }

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

// ─── Page ──────────────────────────────────────────────────────────────────────

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
      const { stats, prospects } = await fetchMonthStats(company.id, month, year)

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
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-8 lg:p-10">
        <div className="bg-white rounded-2xl p-12 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <p className="text-text-light">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const selectedPeriod = parseMonthValue(selectedValue)

  return (
    <div className="p-8 lg:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Bilan</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
          Rapport mensuel
        </h1>
        <p className="text-sm text-text-light mt-1">Telechargez votre rapport partenaire en PDF</p>
      </div>

      {/* Selecteur de mois */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] p-6 mb-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">Periode</p>
        <div className="flex gap-3 items-end">
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-background hover:border-text-light/30 text-sm text-text-primary bg-white focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Generation...
              </>
            ) : (
              <>
                <FileText size={13} />
                Generer le rapport
              </>
            )}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 rounded-2xl px-5 py-4 mb-5">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Preview des stats */}
      {pdfReady && rapportData && (
        <>
          <StatsPreviewPanel
            rapportData={rapportData}
            selectedMonth={selectedPeriod.month}
            selectedYear={selectedPeriod.year}
            onDownload={() => void downloadRapportPdf(rapportData, selectedPeriod.month, selectedPeriod.year)}
          />
          <ProspectsTable prospects={rapportData.prospects} />
        </>
      )}
    </div>
  )
}
