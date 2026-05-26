/**
 * Vue fiche entreprise/SCI — drill-down depuis adresse ou dirigeant.
 * Dirigeants cliquables → fiche personne. Adresses détenues cliquables → fiche adresse.
 */
import { useEffect } from 'react'
import { Building2, AlertTriangle } from 'lucide-react'
import FicheBreadcrumb from './FicheBreadcrumb'
import FicheEntityLink from './FicheEntityLink'
import FavoriButton from './FavoriButton'
import StickyEntityHeader from './StickyEntityHeader'
import OriginBanner from './OriginBanner'
import TypedBadge from '../../ui/TypedBadge'
import { EntityLinksPanel } from '../EntityLinksPanel'
import PaginationInfo from '../../ui/PaginationInfo'
import Tabs from '../../ui/Tabs'
import KpiHero from './KpiHero'
import PatrimoineMassif from './PatrimoineMassif'
import DetailRowUi from '../../ui/DetailRow'
import { formatEurosFromCents } from '@/lib/format'
import { useFicheEntreprise } from '@/hooks/queries/useFiche'
import { canSee, type LeadProfile } from '@/lib/rgpd/lead-visibility'
import { pushNavEntity } from '@/stores/navStackStore'
import { profileBack, profileBasePath } from '@/lib/nav'
import { formatSiren, formatNumber } from '@/lib/format'

interface Props {
  siren: string
  profile: LeadProfile
}

export default function FicheEntrepriseView({ siren, profile }: Props) {
  const { data, isLoading, error } = useFicheEntreprise(siren)

  // 2026-05-27 — Push pile navigation. Hook AVANT les early returns (règles React).
  useEffect(() => {
    if (!data?.sci?.siren) return
    pushNavEntity({
      type: 'entreprise',
      id: data.sci.siren,
      label: data.sci.denomination,
      sublabel: `SIREN ${formatSiren(data.sci.siren)}`,
      path: `${profileBasePath(profile)}/entreprise/${data.sci.siren}`,
    })
  }, [data?.sci?.siren, data?.sci?.denomination, profile])

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
        <OriginBanner />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-600">
          <Building2 className="h-10 w-10 text-slate-300" />
          <div className="font-medium text-slate-900">SIREN {formatSiren(siren)} non catalogué</div>
          <div className="max-w-md text-center text-xs text-slate-500">
            {error
              ? `Erreur : ${(error as Error).message}`
              : `Cette société n'est pas encore dans le cache BRH. Elle peut être enrichie à la demande via l'API publique recherche-entreprises.api.gouv.fr.`}
          </div>
        </div>
      </div>
    )
  }

  const { sci, adresses, bodacc } = data
  const adressesTotal = data.adresses_total ?? adresses.length
  const isUtility = data.is_utility === true
  const dirigeantsDecedes = sci.dirigeants.filter((d) => d.est_decede)
  const entityClass = (sci.entity_class ?? (isUtility ? 'utility' : 'autre')) as
    | 'sci_patrimoniale' | 'utility' | 'bailleur_social' | 'collectivite' | 'autre'
  const entityClassLabel = {
    sci_patrimoniale: 'SCI patrimoniale',
    utility: 'Opérateur réseau',
    bailleur_social: 'Bailleur social',
    collectivite: 'Collectivité',
    autre: 'Société',
  }[entityClass]

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <StickyEntityHeader
        type="entreprise"
        title={sci.denomination}
        sublabel={
          <>
            SIREN {formatSiren(sci.siren)}
            {sci.forme_juridique ? ` · ${sci.forme_juridique}` : ''}
          </>
        }
        entityClassBadge={{ label: entityClassLabel }}
        badges={
          <>
            {sci.solvabilite_estimee && sci.solvabilite_estimee !== 'inconnu' && (
              <TypedBadge variant="solvabilite" label={
                {
                  faible: 'Risque faible',
                  modere: 'Risque modéré',
                  eleve: 'Risque élevé',
                  procedure: 'Procédure collective',
                  cessation: 'Cessée',
                }[sci.solvabilite_estimee] ?? sci.solvabilite_estimee
              } />
            )}
            {sci.has_deceased_dirigeant && (
              <TypedBadge variant="status" color="red" label="Succession probable" icon={<AlertTriangle className="h-3 w-3" />} />
            )}
            {!sci.is_active && (
              <TypedBadge variant="status" color="gray" label="Radiée" />
            )}
          </>
        }
        kpis={[
          { label: 'dirigeants', value: formatNumber(sci.dirigeants.length) },
          { label: 'adresses', value: formatNumber(adressesTotal) },
          ...(bodacc.length > 0 ? [{ label: 'alertes BODACC', value: formatNumber(bodacc.length) }] : []),
        ]}
        actions={
          <FavoriButton
            entity_type="entreprise"
            entity_id={sci.siren}
            label={sci.denomination}
            sublabel={`SIREN ${sci.siren}`}
          />
        }
      />
      <FicheBreadcrumb leadsBackUrl={profileBack(profile)} />
      <OriginBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* Banner utility — DPE listés ≠ patrimoine immobilier */}
          {isUtility && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Société utility — adresses non-représentatives du patrimoine
              </div>
              <p className="mt-1 text-amber-800">
                Cette société (distributeur énergie/télécom/eau) est listée comme owner_siren sur les DPE
                car titulaire du compteur. Les {formatNumber(adressesTotal)} adresses ne représentent
                <strong> pas un patrimoine immobilier</strong> et ne doivent pas servir de cible de prospection.
              </p>
            </div>
          )}

          {/* KPI Hero — pattern Data-B "fiche entité avec KPI qui résume en un coup d'œil" */}
          <KpiHero
            items={[
              {
                label: 'Dirigeants',
                value: sci.dirigeants.length,
                color: 'gray',
              },
              {
                label: 'Adresses détenues',
                value: adressesTotal,
                color: isUtility ? 'gray' : adressesTotal > 0 ? 'green' : 'gray',
                sublabel: isUtility ? 'non patrimonial' : undefined,
              },
              {
                label: 'Alertes BODACC',
                value: bodacc.length,
                color: bodacc.length > 0 ? 'amber' : 'gray',
              },
              {
                label: 'Succession',
                value: sci.has_deceased_dirigeant ? 'Probable' : '—',
                color: sci.has_deceased_dirigeant ? 'red' : 'gray',
              },
            ]}
          />

          {/* Tabs — onglets contextuels qui swappent le panneau (pas l'URL scope) */}
          <Tabs
            defaultTab="patrimoine"
            tabs={[
              {
                id: 'infos',
                label: 'Infos',
                content: (
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <DetailRowUi label="Activité principale" value={sci.activite_libelle ?? sci.activite_principale} showEmpty />
                      <DetailRowUi label="Forme juridique" value={sci.forme_juridique} showEmpty />
                      <DetailRowUi label="Effectif" value={sci.effectif} showEmpty />
                      <DetailRowUi label="Capital social" value={formatEurosFromCents(sci.capital_social_cents)} showEmpty />
                      <DetailRowUi label="Date de création" value={sci.date_creation} showEmpty />
                      <DetailRowUi label="Statut" value={sci.is_active ? 'Active' : 'Radiée'} />
                      <DetailRowUi label="Adresse siège" value={sci.adresse_complete} showEmpty />
                      <DetailRowUi
                        label="Localisation"
                        value={sci.commune ? `${sci.code_postal ?? ''} ${sci.commune}` : sci.departement ?? null}
                        showEmpty
                      />
                    </div>
                  </div>
                ),
              },
              {
                id: 'decideurs',
                label: 'Décideurs',
                count: sci.dirigeants.length,
                content: (
                  <div className="space-y-2 p-4">
                    {!canSee(profile, 'sci_dirigeants') ? (
                      <div className="text-sm text-slate-500">
                        Cette information n'est pas accessible avec votre profil ({profile}).
                      </div>
                    ) : sci.dirigeants.length === 0 ? (
                      <div className="text-sm text-slate-500">Aucun dirigeant connu.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {sci.dirigeants.map((d, i) => {
                          const name = [d.prenom, d.nom].filter(Boolean).join(' ').trim() || '— inconnu —'
                          return (
                            <FicheEntityLink
                              key={`${name}-${i}`}
                              kind="personne"
                              id={name}
                              label={name + (d.est_decede ? ' †' : '')}
                              sublabel={[d.qualite, d.date_naissance ? `né(e) ${d.date_naissance}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                              profile={profile}
                              variant="row"
                            />
                          )
                        })}
                        {dirigeantsDecedes.length > 0 && (
                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                            {dirigeantsDecedes.length} dirigeant(s) décédé(s) — succession probable.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'patrimoine',
                label: 'Patrimoine',
                count: adressesTotal,
                content: (
                  <div className="p-4">
                    {adressesTotal > 100 ? (
                      <PatrimoineMassif siren={siren} profile={profile} totalEstimate={adressesTotal} />
                    ) : adresses.length === 0 ? (
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
                        <PaginationInfo
                          shown={adresses.length}
                          total={adressesTotal}
                          itemLabel="adresses"
                          sortedBy="les plus pertinentes selon score V2"
                        />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'activite',
                label: 'Activité',
                count: bodacc.length,
                content: (
                  <div className="space-y-4 p-4">
                    {bodacc.length === 0 ? (
                      <div className="text-sm text-slate-500">Aucune alerte BODACC pour cette société.</div>
                    ) : (
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
                    )}
                    <EntityLinksPanel type="sci" id={siren} profileBase={`/${profile}`} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

