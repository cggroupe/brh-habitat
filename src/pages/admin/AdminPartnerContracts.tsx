/**
 * Phase 16.0.7 admin — `/admin/partner-contracts`.
 *
 * Vue toutes les chartes signées (artisan + agence + company pro).
 * Permet supervision, révocation manuelle, vérification preuve eIDAS (IP/UA/timestamp).
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Loader,
  Filter,
  XCircle,
  Eye,
  Building2,
  Wrench,
  Briefcase,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PartnerType = 'agence_immo' | 'artisan_rge' | 'pro_company'
type ContractStatus = 'pending_email' | 'active' | 'revoked' | 'expired'

interface Contract {
  id: string
  partner_type: PartnerType
  agence_id: string | null
  artisan_id: string | null
  company_id: string | null
  signer_full_name: string
  signer_email: string
  signer_role: string | null
  template_version: string
  contract_content: string
  status: ContractStatus
  consent_terms: boolean
  consent_data: boolean
  consent_communications: boolean
  signed_at: string
  signature_ip: string | null
  signature_user_agent: string | null
  email_confirmed_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
}

const PARTNER_LABELS: Record<PartnerType, string> = {
  agence_immo: 'Agence immo',
  artisan_rge: 'Artisan RGE',
  pro_company: 'Pro / Company',
}

const PARTNER_ICONS: Record<PartnerType, typeof Building2> = {
  agence_immo: Building2,
  artisan_rge: Wrench,
  pro_company: Briefcase,
}

const STATUS_COLORS: Record<ContractStatus, string> = {
  pending_email: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  revoked: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  pending_email: 'Pending email',
  active: 'Active',
  revoked: 'Révoquée',
  expired: 'Expirée',
}

export default function AdminPartnerContracts() {
  const qc = useQueryClient()
  const [filterType, setFilterType] = useState<PartnerType | ''>('')
  const [filterStatus, setFilterStatus] = useState<ContractStatus | ''>('active')
  const [viewing, setViewing] = useState<Contract | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['admin-contracts', filterType, filterStatus] as const,
    queryFn: async () => {
      let q = supabase
        .from('brh_partner_contracts')
        .select('*')
        .order('signed_at', { ascending: false })
        .limit(200)
      if (filterType) q = q.eq('partner_type', filterType)
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Contract[]
    },
  })

  const revoke = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('brh_partner_contracts')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contracts'] })
      setRevokeId(null)
      setRevokeReason('')
    },
  })

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-display flex items-center gap-2">
          <FileText className="text-primary" size={24} />
          Chartes partenaires signées
        </h1>
        <p className="text-sm text-gray-600">
          Preuve eIDAS : IP + user-agent + horodatage capturés au signing
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={18} className="text-gray-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as PartnerType | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous types</option>
          {(['agence_immo', 'artisan_rge', 'pro_company'] as const).map((t) => (
            <option key={t} value={t}>
              {PARTNER_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ContractStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous statuts</option>
          {(['active', 'pending_email', 'revoked', 'expired'] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 ml-auto">
          {contracts.length} contrats
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-500">
          Aucun contrat trouvé.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr className="text-left">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Signataire</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Signée le</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contracts.map((c) => {
                const Icon = PARTNER_ICONS[c.partner_type]
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Icon size={14} className="text-gray-500" />
                        {PARTNER_LABELS[c.partner_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.signer_full_name}</p>
                      <p className="text-xs text-gray-500">{c.signer_email}</p>
                      {c.signer_role ? (
                        <p className="text-xs text-gray-400">{c.signer_role}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{c.template_version}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(c.signed_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {c.signature_ip ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setViewing(c)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        aria-label="Voir contrat"
                        title="Voir le contenu signé"
                      >
                        <Eye size={14} />
                      </button>
                      {c.status === 'active' && (
                        <button
                          onClick={() => setRevokeId(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                          aria-label="Révoquer"
                          title="Révoquer le contrat"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal vue contrat */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu contrat signé"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Contrat #{viewing.id.slice(0, 8)}</h2>
                <p className="text-xs text-gray-500">
                  Signé par {viewing.signer_full_name} le {new Date(viewing.signed_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg mb-4">
              <Field label="IP signature" value={viewing.signature_ip} mono />
              <Field label="User-agent" value={viewing.signature_user_agent} />
              <Field label="Email confirmé" value={viewing.email_confirmed_at ? new Date(viewing.email_confirmed_at).toLocaleString('fr-FR') : null} />
              <Field label="Template" value={viewing.template_version} mono />
              <Field label="Consent terms" value={viewing.consent_terms ? '✓ accepté' : '✗ refusé'} />
              <Field label="Consent données" value={viewing.consent_data ? '✓ accepté' : '✗ refusé'} />
              <Field label="Consent comm" value={viewing.consent_communications ? '✓ accepté' : '✗ refusé'} />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans">
                {viewing.contract_content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal révocation */}
      {revokeId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-contract-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 id="revoke-contract-title" className="text-lg font-semibold mb-2">Révoquer ce contrat</h2>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est irréversible. Le partenaire perdra immédiatement accès aux services
              associés (leads, factures…).
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Motif de révocation (audit défavorable, plainte propriétaire, manquement charte…)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
            <div className="flex gap-2 justify-end pt-3">
              <button
                onClick={() => setRevokeId(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => revoke.mutate({ id: revokeId, reason: revokeReason })}
                disabled={!revokeReason.trim() || revoke.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <XCircle size={14} />
                {revoke.isPending ? 'Révocation…' : 'Révoquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className={mono ? 'font-mono' : ''}>{value ?? <span className="text-gray-400 italic">—</span>}</dd>
    </div>
  )
}
