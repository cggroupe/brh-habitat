/**
 * Vue fiche personne — drill-down depuis dirigeant SCI ou propriétaire particulier.
 *
 * MVP : assemblé depuis brh_sci_companies.dirigeants JSONB + brh_dpe_prospects.particulier_name.
 * À enrichir Sprint 3 avec entity-hub (core.person, core.contact, core.event, signaux).
 */
import { User, Building2, AlertTriangle, Calendar, Briefcase } from 'lucide-react'
import FicheBreadcrumb from './FicheBreadcrumb'
import FicheSection from './FicheSection'
import FicheEntityLink from './FicheEntityLink'
import FavoriButton from './FavoriButton'
import { useFichePersonneByName } from '@/hooks/queries/useFiche'
import { canSee, type LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  /** Pour MVP : nom complet URL-encoded. Sera remplacé par entity_id en Sprint 3. */
  nameOrId: string
  profile: LeadProfile
}

export default function FichePersonneView({ nameOrId, profile }: Props) {
  const fullName = decodeURIComponent(nameOrId)
  const { data, isLoading, error } = useFichePersonneByName(fullName)

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex-1 p-6 space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <FicheBreadcrumb items={[{ label: 'Leads', to: profileBack(profile) }, { label: fullName }]} />
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
          Erreur : {(error as Error).message}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <FicheBreadcrumb items={[{ label: 'Leads', to: profileBack(profile) }, { label: fullName }]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-600">
          <User className="h-8 w-8 text-slate-300" />
          <div>Aucun rôle ou patrimoine BRH connu pour <b>{fullName}</b>.</div>
          <div className="text-xs text-slate-500">
            Enrichissement entity-hub en cours (Sprint 3).
          </div>
        </div>
      </div>
    )
  }

  const { identity, roles, patrimoine_direct, brh_historique } = data
  const isDeceased = !!identity.death_date

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <FicheBreadcrumb
        items={[{ label: 'Leads', to: profileBack(profile) }, { label: identity.full_name }]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          {/* En-tête identité */}
          <header className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  Personne {isDeceased ? '(décédée)' : ''}
                </div>
                <h1 className="mt-1 text-lg font-semibold text-slate-900">
                  {identity.full_name}
                  {isDeceased && ' †'}
                </h1>
                <p className="text-sm text-slate-600">
                  {identity.birth_date && <>Né(e) le {identity.birth_date}</>}
                  {identity.birth_date && identity.death_date && ' · '}
                  {identity.death_date && <>Décédé(e) le {identity.death_date}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <FavoriButton
                  entity_type="personne"
                  entity_id={nameOrId}
                  label={identity.full_name}
                  sublabel={identity.birth_date ? `Né(e) ${identity.birth_date}` : null}
                />
                {isDeceased && (
                  <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Succession active
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Rôles entreprises */}
          {roles.length > 0 && (
            <FicheSection
              title="Rôles entreprises"
              icon={<Briefcase className="h-4 w-4" />}
              count={roles.length}
              defaultOpen
            >
              <div className="space-y-1.5">
                {roles.map((r) => (
                  <FicheEntityLink
                    key={r.siren}
                    kind="entreprise"
                    id={r.siren}
                    label={r.denomination}
                    sublabel={[r.qualite, r.is_active ? 'Société active' : 'Société radiée']
                      .filter(Boolean)
                      .join(' · ')}
                    profile={profile}
                    variant="row"
                  />
                ))}
              </div>
            </FicheSection>
          )}

          {/* Patrimoine direct */}
          {patrimoine_direct.length > 0 && (
            <FicheSection
              title="Patrimoine direct"
              icon={<Building2 className="h-4 w-4" />}
              count={patrimoine_direct.length}
              defaultOpen
            >
              <div className="space-y-1.5">
                {patrimoine_direct.map((a) => (
                  <FicheEntityLink
                    key={a.id}
                    kind="adresse"
                    id={a.id}
                    label={a.adresse ?? `DPE #${a.id}`}
                    sublabel={`${a.code_postal ?? ''} ${a.commune ?? ''} · ${a.etiquette_dpe ?? '?'}`}
                    profile={profile}
                    variant="row"
                  />
                ))}
              </div>
            </FicheSection>
          )}

          {/* Historique BRH — visible employé uniquement */}
          {profile === 'employe' && brh_historique && (
            <FicheSection
              title="Historique BRH"
              icon={<Calendar className="h-4 w-4" />}
              defaultOpen
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DetailRow label="Statut" value={brh_historique.statut} />
                <DetailRow
                  label="CA total"
                  value={brh_historique.ca_total ? `${brh_historique.ca_total.toLocaleString('fr-FR')} €` : null}
                />
                <DetailRow label="Première facture" value={brh_historique.premiere_facture} />
                <DetailRow label="Dernière facture" value={brh_historique.derniere_facture} />
                <DetailRow label="Nombre de RDV" value={brh_historique.rdv_count} />
                <DetailRow label="Enfants" value={brh_historique.enfants} />
              </div>
            </FicheSection>
          )}

          {/* Note RGPD */}
          {!canSee(profile, 'particulier_phone') && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-600">
              Contacts particuliers visibles uniquement par BRH (RGPD).
              {profile !== 'employe' && (
                <button className="ml-2 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700">
                  Demander à BRH
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function profileBack(profile: LeadProfile): string {
  switch (profile) {
    case 'employe':
      return '/employe/leads'
    case 'artisan':
      return '/artisan/leads'
    case 'notaire':
      return '/notaire/leads'
    case 'agence':
    default:
      return '/agence/leads'
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode | string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  )
}
