/**
 * Vue fiche entreprise/SCI — drill-down depuis adresse ou dirigeant.
 * Dirigeants cliquables → fiche personne. Adresses détenues cliquables → fiche adresse.
 */
import { Building2, User, Home, AlertTriangle, Skull } from 'lucide-react'
import FicheBreadcrumb from './FicheBreadcrumb'
import FicheSection from './FicheSection'
import FicheEntityLink from './FicheEntityLink'
import { useFicheEntreprise } from '@/hooks/queries/useFiche'
import { canSee, type LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  siren: string
  profile: LeadProfile
}

export default function FicheEntrepriseView({ siren, profile }: Props) {
  const { data, isLoading, error } = useFicheEntreprise(siren)

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

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <FicheBreadcrumb items={[{ label: 'Leads', to: profileBack(profile) }, { label: 'Entreprise introuvable' }]} />
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
          {error ? `Erreur : ${(error as Error).message}` : `SIREN ${siren} introuvable dans le cache BRH.`}
        </div>
      </div>
    )
  }

  const { sci, adresses, bodacc } = data
  const dirigeantsDecedes = sci.dirigeants.filter((d) => d.est_decede)

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <FicheBreadcrumb
        items={[{ label: 'Leads', to: profileBack(profile) }, { label: sci.denomination }]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          {/* Identité société */}
          <header className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  Société {sci.is_active ? 'active' : 'radiée'}
                </div>
                <h1 className="mt-1 text-lg font-semibold text-slate-900">{sci.denomination}</h1>
                <p className="text-sm text-slate-600">
                  SIREN {sci.siren}
                  {sci.forme_juridique ? ` · ${sci.forme_juridique}` : ''}
                  {sci.date_creation ? ` · créée le ${sci.date_creation}` : ''}
                </p>
              </div>
              {sci.has_deceased_dirigeant && (
                <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800">
                  <Skull className="h-3.5 w-3.5" />
                  Succession probable
                </div>
              )}
            </div>
          </header>

          {/* Identité publique */}
          <FicheSection title="Identité Sirene" icon={<Building2 className="h-4 w-4" />} defaultOpen>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <DetailRow label="Activité principale" value={sci.activite_libelle ?? sci.activite_principale} />
              <DetailRow label="Effectif" value={sci.effectif} />
              <DetailRow
                label="Capital social"
                value={sci.capital_social_cents ? `${(sci.capital_social_cents / 100).toLocaleString('fr-FR')} €` : null}
              />
              <DetailRow label="Adresse siège" value={sci.adresse_complete} />
              <DetailRow
                label="Localisation"
                value={
                  sci.commune ? `${sci.code_postal ?? ''} ${sci.commune}` : sci.departement ?? null
                }
              />
            </div>
          </FicheSection>

          {/* Dirigeants — chips cliquables */}
          {canSee(profile, 'sci_dirigeants') && (
            <FicheSection
              title="Dirigeants"
              icon={<User className="h-4 w-4" />}
              count={sci.dirigeants.length}
              defaultOpen
            >
              {sci.dirigeants.length === 0 ? (
                <div className="text-sm text-slate-500">Aucun dirigeant connu.</div>
              ) : (
                <div className="space-y-1.5">
                  {sci.dirigeants.map((d, i) => {
                    const name = [d.prenom, d.nom].filter(Boolean).join(' ').trim() || '— inconnu —'
                    return (
                      <FicheEntityLink
                        key={`${name}-${i}`}
                        kind="personne"
                        id={encodeURIComponent(name)}
                        label={name + (d.est_decede ? ' †' : '')}
                        sublabel={[d.qualite, d.date_naissance ? `né(e) ${d.date_naissance}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                        profile={profile}
                        variant="row"
                      />
                    )
                  })}
                </div>
              )}
              {dirigeantsDecedes.length > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                  {dirigeantsDecedes.length} dirigeant(s) décédé(s) — succession probable.
                </div>
              )}
            </FicheSection>
          )}

          {/* Adresses détenues — rows cliquables */}
          <FicheSection
            title="Adresses détenues"
            icon={<Home className="h-4 w-4" />}
            count={adresses.length}
            defaultOpen
          >
            {adresses.length === 0 ? (
              <div className="text-sm text-slate-500">Aucune adresse BRH liée à cette société.</div>
            ) : (
              <div className="space-y-1.5">
                {adresses.map((a) => (
                  <FicheEntityLink
                    key={a.id}
                    kind="adresse"
                    id={a.id}
                    label={a.adresse ?? `DPE #${a.id}`}
                    sublabel={`${a.code_postal ?? ''} ${a.commune ?? ''} · ${a.etiquette_dpe ?? '?'}${
                      a.surface_habitable ? ` · ${a.surface_habitable} m²` : ''
                    }${a.score_v2 != null ? ` · score ${a.score_v2}` : ''}`}
                    profile={profile}
                    variant="row"
                  />
                ))}
              </div>
            )}
          </FicheSection>

          {/* BODACC alertes (procédure collective, etc.) */}
          {bodacc.length > 0 && (
            <FicheSection
              title="Alertes BODACC"
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              count={bodacc.length}
            >
              <div className="space-y-2 text-sm">
                {bodacc.map((b) => (
                  <div key={b.id} className="rounded-md border border-amber-200 bg-amber-50 p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900">{b.type_avis ?? 'BODACC'}</span>
                      <span className="text-amber-700">{b.date_parution}</span>
                    </div>
                    <div className="mt-1 text-slate-700">{b.description}</div>
                  </div>
                ))}
              </div>
            </FicheSection>
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
