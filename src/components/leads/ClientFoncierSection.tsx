/**
 * ClientFoncierSection — Phase 3 : section "Foncier à l'adresse" de la fiche client BRH.
 *
 * Affiche pour un client :
 *  - Adresse normalisée (clé de matching)
 *  - Badge "Locataire SCI" si DPE détenu par SCI dont le client n'est pas dirigeant (cas Bodard)
 *  - Tableau DPE F/G matchés à l'adresse (avec rôle propriétaire / dirigeant / locataire)
 *  - Mutations DVF à la voie (historique acquéreur)
 *  - Permis Sitadel (futur, table vide actuellement)
 *
 * Source : RPC brh_client_foncier_at_address (Phase 3 migration 20260521160000).
 */
import { Home, Building2, ShieldAlert, TrendingUp, Loader2, ExternalLink } from 'lucide-react'
import { useClientFoncier } from '@/hooks/queries/useClientFoncier'
import type { ClientFoncierDpeRole } from '@/api/brh-client-foncier'

interface Props {
  personneId: string
}

const ROLE_LABEL: Record<ClientFoncierDpeRole, { label: string; cls: string }> = {
  proprietaire_particulier: {
    label: 'Propriétaire (particulier)',
    cls: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  },
  dirigeant_sci: {
    label: 'Dirigeant SCI propriétaire',
    cls: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  },
  locataire_sci: {
    label: 'Locataire (SCI propriétaire)',
    cls: 'bg-amber-100 text-amber-900 ring-amber-300',
  },
}

const DPE_BADGE: Record<string, string> = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-emerald-500 text-white',
  C: 'bg-lime-500 text-white',
  D: 'bg-yellow-500 text-white',
  E: 'bg-orange-500 text-white',
  F: 'bg-orange-700 text-white',
  G: 'bg-red-700 text-white',
}

function formatEuros(cents: number | null): string {
  if (cents == null) return '—'
  const euros = cents / 100
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(euros)
}

export default function ClientFoncierSection({ personneId }: Props) {
  const { data, isLoading, error } = useClientFoncier(personneId)

  if (isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du foncier à l'adresse…
        </div>
      </section>
    )
  }

  if (error || !data) {
    return null
  }

  const { client_address, dpe_matches, dvf_matches, is_tenant_of_sci, sci_proprietaire } = data
  const hasAnything = dpe_matches.length > 0 || dvf_matches.length > 0

  if (!client_address.code_postal || !client_address.voie_norm) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
          <Home className="h-4 w-4 text-stone-500" />
          Foncier à l'adresse
        </h2>
        <p className="text-xs text-stone-500">
          Adresse client non exploitable pour le matching (code postal ou voie manquant). Compléter la fiche pour activer le cross-référencement DPE / DVF / permis.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
          <Home className="h-4 w-4 text-emerald-700" />
          Foncier à l'adresse
        </h2>
        <span className="font-mono text-[10px] text-stone-400">
          {client_address.numero_norm || '∅'} · {client_address.voie_norm} · {client_address.code_postal}
        </span>
      </div>

      {/* Badge locataire SCI (cas Bodard) */}
      {is_tenant_of_sci && sci_proprietaire && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            Locataire — SCI propriétaire
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Le DPE à cette adresse est détenu par <span className="font-semibold">{sci_proprietaire.name}</span>
            {sci_proprietaire.siren && <span className="font-mono text-[11px]"> (SIREN {sci_proprietaire.siren})</span>}.
            {' '}Le client n'est pas dirigeant de cette SCI — c'est donc l'occupant. Pour les travaux, contacter le propriétaire (SCI ou dirigeant).
          </p>
        </div>
      )}

      {/* DPE matchés */}
      {dpe_matches.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
            <Building2 className="h-3.5 w-3.5" />
            DPE à l'adresse ({dpe_matches.length})
          </h3>
          <ul className="space-y-2">
            {dpe_matches.map((dpe) => (
              <li key={dpe.dpe_id} className="rounded-md border border-stone-200 bg-stone-50/40 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {dpe.etiquette_dpe && (
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${DPE_BADGE[dpe.etiquette_dpe] ?? 'bg-stone-200'}`}>
                      {dpe.etiquette_dpe}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-stone-500">{dpe.numero_dpe}</span>
                  {dpe.surface_habitable != null && (
                    <span className="text-stone-700">{dpe.surface_habitable} m²</span>
                  )}
                  {dpe.annee_construction != null && (
                    <span className="text-stone-500">{dpe.annee_construction}</span>
                  )}
                  <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${ROLE_LABEL[dpe.role].cls}`}>
                    {ROLE_LABEL[dpe.role].label}
                  </span>
                </div>
                {dpe.owner_name && dpe.role !== 'proprietaire_particulier' && (
                  <p className="mt-1 text-[11px] text-stone-600">
                    Propriétaire : <span className="font-medium">{dpe.owner_name}</span>
                    {dpe.owner_siren && <span className="font-mono text-[10px]"> · SIREN {dpe.owner_siren}</span>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DVF mutations */}
      {dvf_matches.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Mutations DVF à la voie ({dvf_matches.length})
          </h3>
          <ul className="space-y-1">
            {dvf_matches.slice(0, 6).map((m) => (
              <li key={m.id} className="rounded-md border border-stone-100 bg-stone-50/40 p-2 text-xs">
                <span className="font-mono text-stone-500">{m.date_mutation}</span>
                {' · '}
                <span className="font-medium">{m.nature_mutation}</span>
                {m.type_local && <span className="text-stone-600"> · {m.type_local}</span>}
                {m.surface_bati != null && <span className="text-stone-600"> · {m.surface_bati} m²</span>}
                <span className="ml-2 font-semibold text-stone-800">{formatEuros(m.valeur_fonciere)}</span>
                {m.prix_m2_calc != null && !m.is_groupee && (
                  <span className="ml-1 text-[10px] text-stone-500">({m.prix_m2_calc} €/m²)</span>
                )}
                {m.is_groupee && (
                  <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[9px] uppercase text-stone-700">
                    groupée
                  </span>
                )}
              </li>
            ))}
            {dvf_matches.length > 6 && (
              <li className="text-[11px] italic text-stone-500">+ {dvf_matches.length - 6} autres mutations</li>
            )}
          </ul>
        </div>
      )}

      {/* Vide */}
      {!hasAnything && !is_tenant_of_sci && (
        <p className="text-xs text-stone-500">
          Aucun DPE F/G, mutation DVF récente ou permis à cette adresse.
          {' '}
          <a
            href={`https://www.geoportail.gouv.fr/carte?c=${client_address.voie_norm}+${client_address.code_postal}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-stone-600 hover:underline"
          >
            Vérifier sur Géoportail <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </p>
      )}
    </section>
  )
}
