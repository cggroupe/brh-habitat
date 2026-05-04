/**
 * Phase 16.0.6 — Page `/agence/profil` : édition fiche agence + relecture charte.
 */
import { useQuery } from '@tanstack/react-query'
import { Loader, Building2, FileText, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'

export default function AgenceProfil() {
  const { data: membership } = useMyAgenceMembership()

  const { data: agence, isLoading } = useQuery({
    queryKey: ['agence-detail', membership?.agenceId] as const,
    queryFn: async () => {
      if (!membership?.agenceId) return null
      const { data, error } = await supabase
        .from('brh_agences_immo')
        .select('*')
        .eq('id', membership.agenceId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!membership?.agenceId,
  })

  const { data: contract } = useQuery({
    queryKey: ['my-contract', membership?.contractId] as const,
    queryFn: async () => {
      if (!membership?.contractId) return null
      const { data, error } = await supabase
        .from('brh_partner_contracts')
        .select('*')
        .eq('id', membership.contractId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!membership?.contractId,
  })

  if (isLoading || !agence) {
    return (
      <div className="p-12 flex justify-center">
        <Loader className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-display flex items-center gap-2">
          <Building2 className="text-blue-600" size={24} />
          {agence.raison_sociale}
        </h1>
        <p className="text-sm text-gray-600">
          {agence.commune ? `${agence.code_postal} ${agence.commune}` : 'Localisation non renseignée'}
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Identité
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="SIRET" value={agence.siret} />
          <Row label="Représentant" value={agence.representant} />
          <Row label="Email" value={agence.email} icon={Mail} />
          <Row label="Téléphone" value={agence.telephone} />
          <Row label="Adresse" value={agence.adresse} />
          <Row
            label="Carte T"
            value={
              agence.carte_t_numero
                ? `${agence.carte_t_numero} (jusqu'au ${agence.carte_t_validite})`
                : null
            }
          />
        </dl>
        <p className="text-xs text-gray-500 italic">
          Pour modifier ces informations, contactez{' '}
          <a href="mailto:relationsclients@contact-brh.fr" className="text-blue-600 underline">
            relationsclients@contact-brh.fr
          </a>
        </p>
      </section>

      {contract ? (
        <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <FileText size={14} /> Charte signée
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Version" value={contract.template_version} />
            <Row
              label="Signée le"
              value={new Date(contract.signed_at).toLocaleString('fr-FR')}
            />
            <Row label="Signataire" value={contract.signer_full_name} />
            <Row label="Email" value={contract.signer_email} />
            <Row
              label="Statut"
              value={
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">
                  {contract.status}
                </span>
              }
            />
          </dl>
          <details className="text-sm">
            <summary className="cursor-pointer text-blue-600 hover:underline">
              Relire la charte signée
            </summary>
            <pre className="mt-3 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-xs leading-relaxed max-h-96 overflow-y-auto">
              {contract.contract_content}
            </pre>
          </details>
        </section>
      ) : null}
    </div>
  )
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm mt-0.5">
        {Icon ? <Icon size={12} className="text-gray-400" /> : null}
        {value ?? <span className="text-gray-400 italic">Non renseigné</span>}
      </dd>
    </div>
  )
}
