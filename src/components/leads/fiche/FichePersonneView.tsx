/**
 * Vue fiche personne — drill-down depuis dirigeant SCI ou propriétaire particulier.
 *
 * MVP : assemblé depuis brh_sci_companies.dirigeants JSONB + brh_dpe_prospects.particulier_name.
 * À enrichir Sprint 3 avec entity-hub (core.person, core.contact, core.event, signaux).
 */
import { useEffect } from 'react'
import FicheBreadcrumb from './FicheBreadcrumb'
import FicheEntityLink from './FicheEntityLink'
import FavoriButton from './FavoriButton'
import StickyEntityHeader from './StickyEntityHeader'
import OriginBanner from './OriginBanner'
import TypedBadge from '../../ui/TypedBadge'
import FicheEmptyState from './FicheEmptyState'
import { useFichePersonneByName } from '@/hooks/queries/useFiche'
import { canSee, type LeadProfile } from '@/lib/rgpd/lead-visibility'
import { pushNavEntity } from '@/stores/navStackStore'
import { profileBack, profileBasePath } from '@/lib/nav'
import { formatNumber } from '@/lib/format'
import Tabs from '../../ui/Tabs'
import KpiHero from './KpiHero'
import DetailRowUi from '../../ui/DetailRow'

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
        <OriginBanner />
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
        <OriginBanner />
        <FicheEmptyState
          kind="aucun-role"
          entity="personne"
          entityLabel={fullName}
          description="Aucun rôle ni patrimoine BRH n'a été trouvé. Si vous pensez que cette personne est dirigeante d'une SCI bretonne, vérifiez l'orthographe ou signalez-le pour enrichissement."
          actions={[
            {
              label: 'Retour aux leads',
              to: profileBack(profile),
              variant: 'secondary',
            },
            {
              label: 'Signaler une donnée manquante',
              href: `mailto:contact-brh@brh-habitat.fr?subject=Donn%C3%A9es%20manquantes%20personne&body=Personne%3A%20${encodeURIComponent(fullName)}`,
              variant: 'ghost',
            },
          ]}
        />
      </div>
    )
  }

  const { identity, roles, patrimoine_direct, brh_historique } = data
  const patrimoine_via_sci = data.patrimoine_via_sci ?? []
  const patrimoineTotal = data.patrimoine_via_sci_total ?? patrimoine_via_sci.length
  const isDeceased = !!identity.death_date
  const sciPatrimoniales = roles.filter((r) => !r.is_utility)
  const rolesUtility = roles.filter((r) => r.is_utility)

  // 2026-05-27 — Push pile navigation pour breadcrumb multi-niveaux.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    pushNavEntity({
      type: 'personne',
      id: identity.full_name,
      label: identity.full_name,
      path: `${profileBasePath(profile)}/personne/${encodeURIComponent(identity.full_name)}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.full_name])

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <StickyEntityHeader
        type="personne"
        title={identity.full_name}
        sublabel={
          identity.birth_date
            ? `Né(e) le ${identity.birth_date}`
            : isDeceased
              ? 'Décédé(e)'
              : undefined
        }
        badges={
          <>
            {isDeceased && (
              <TypedBadge variant="status" color="gray" label="Décédé(e)" />
            )}
            {sciPatrimoniales.length === 0 && rolesUtility.length > 0 && (
              <TypedBadge
                variant="status"
                color="amber"
                label="Aucune SCI patrimoniale"
                title="Cette personne n'a que des rôles utility (ENEDIS, ORANGE, etc.) sans patrimoine immobilier ciblable."
              />
            )}
          </>
        }
        kpis={[
          { label: 'SCI patrimoniales', value: formatNumber(sciPatrimoniales.length) },
          { label: 'rôles utility', value: formatNumber(rolesUtility.length) },
          { label: 'DPE via SCI', value: formatNumber(patrimoineTotal) },
        ]}
        actions={
          <FavoriButton
            entity_type="personne"
            entity_id={identity.full_name}
            label={identity.full_name}
          />
        }
      />
      <FicheBreadcrumb leadsBackUrl={profileBack(profile)} />
      <OriginBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* KPI Hero — distingue explicitement patrimoine vs utility */}
          <KpiHero
            items={[
              {
                label: 'SCI patrimoniales',
                value: sciPatrimoniales.length,
                color: sciPatrimoniales.length > 0 ? 'green' : 'gray',
                onClick: () => {
                  const next = new URLSearchParams(window.location.search)
                  next.set('tab', 'mandats')
                  window.history.replaceState(null, '', '?' + next.toString())
                },
              },
              {
                label: 'DPE via SCI',
                value: patrimoineTotal,
                color: patrimoineTotal > 0 ? 'green' : 'gray',
                onClick: () => {
                  const next = new URLSearchParams(window.location.search)
                  next.set('tab', 'patrimoine')
                  window.history.replaceState(null, '', '?' + next.toString())
                },
              },
              {
                label: 'Rôles utility',
                value: rolesUtility.length,
                color: rolesUtility.length > 0 ? 'amber' : 'gray',
                sublabel: rolesUtility.length > 0 ? 'non patrimonial' : undefined,
              },
              {
                label: 'Patrimoine direct',
                value: patrimoine_direct.length,
                color: patrimoine_direct.length > 0 ? 'blue' : 'gray',
              },
            ]}
          />

          {/* Tabs */}
          <Tabs
            defaultTab={sciPatrimoniales.length > 0 ? 'patrimoine' : 'mandats'}
            tabs={[
              {
                id: 'infos',
                label: 'Infos',
                content: (
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <DetailRowUi label="Nom complet" value={identity.full_name} />
                      <DetailRowUi label="Prénom" value={identity.first_name} showEmpty />
                      <DetailRowUi label="Nom" value={identity.last_name} showEmpty />
                      <DetailRowUi label="Date de naissance" value={identity.birth_date} showEmpty />
                      <DetailRowUi label="Statut" value={isDeceased ? `Décédé(e) le ${identity.death_date ?? '—'}` : 'Vivant(e)'} />
                      <DetailRowUi label="Ville" value={identity.city} showEmpty />
                    </div>
                  </div>
                ),
              },
              {
                id: 'mandats',
                label: 'Mandats',
                count: roles.length,
                content: (
                  <div className="space-y-3 p-4">
                    {roles.length === 0 ? (
                      <div className="text-sm text-slate-500">Aucun rôle entreprise connu.</div>
                    ) : (
                      <>
                        {sciPatrimoniales.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                              SCI patrimoniales ({sciPatrimoniales.length})
                            </h3>
                            <div className="space-y-1.5">
                              {sciPatrimoniales.map((r) => (
                                <FicheEntityLink
                                  key={r.siren}
                                  kind="entreprise"
                                  id={r.siren}
                                  label={r.denomination}
                                  sublabel={[
                                    r.qualite,
                                    r.is_active ? 'Société active' : 'Société radiée',
                                    r.nb_dpe ? `${formatNumber(r.nb_dpe)} DPE détenus` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                  profile={profile}
                                  variant="row"
                                />
                              ))}
                            </div>
                          </section>
                        )}
                        {rolesUtility.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
                              Rôles utility ({rolesUtility.length}) — non patrimoniaux
                            </h3>
                            <p className="mb-2 text-xs text-slate-500">
                              Mandats dans des opérateurs réseau, bailleurs sociaux ou collectivités. Les
                              adresses listées sous ces SIREN ne sont pas le patrimoine immobilier de la personne.
                            </p>
                            <div className="space-y-1.5">
                              {rolesUtility.map((r) => (
                                <FicheEntityLink
                                  key={r.siren}
                                  kind="entreprise"
                                  id={r.siren}
                                  label={r.denomination + ' (non patrimonial)'}
                                  sublabel={[r.qualite, r.is_active ? 'active' : 'radiée'].filter(Boolean).join(' · ')}
                                  profile={profile}
                                  variant="row"
                                />
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                ),
              },
              {
                id: 'patrimoine',
                label: 'Patrimoine',
                count: patrimoineTotal + patrimoine_direct.length,
                content: (
                  <div className="space-y-4 p-4">
                    {patrimoineTotal === 0 && patrimoine_direct.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        Aucun patrimoine immobilier détecté pour cette personne.
                        {rolesUtility.length > 0 && (
                          <span> Les rôles utility ne génèrent pas de patrimoine prospectable.</span>
                        )}
                      </div>
                    ) : (
                      <>
                        {patrimoine_direct.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-800">
                              Patrimoine direct ({patrimoine_direct.length})
                            </h3>
                            <div className="space-y-1.5">
                              {patrimoine_direct.map((a) => (
                                <FicheEntityLink
                                  key={a.id}
                                  kind="adresse"
                                  id={a.id}
                                  label={a.adresse ?? `DPE #${a.id}`}
                                  sublabel={`${a.code_postal ?? ''} ${a.commune ?? ''} · DPE ${a.etiquette_dpe ?? '—'}`}
                                  profile={profile}
                                  variant="row"
                                />
                              ))}
                            </div>
                          </section>
                        )}
                        {patrimoineTotal > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                              Patrimoine via SCI ({formatNumber(patrimoineTotal)} DPE)
                            </h3>
                            <div className="space-y-1.5">
                              {patrimoine_via_sci.slice(0, 100).map((a) => (
                                <FicheEntityLink
                                  key={`${a.id}-${a.via_sci_siren}`}
                                  kind="adresse"
                                  id={a.id}
                                  label={a.adresse ?? `DPE #${a.id}`}
                                  sublabel={[
                                    `${a.code_postal ?? ''} ${a.commune ?? ''}`.trim(),
                                    a.etiquette_dpe ? `DPE ${a.etiquette_dpe}` : null,
                                    a.surface_habitable ? `${a.surface_habitable} m²` : null,
                                    `via ${a.via_sci_denomination}`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                  profile={profile}
                                  variant="row"
                                />
                              ))}
                              {patrimoineTotal > patrimoine_via_sci.length && (
                                <p className="px-3 py-2 text-xs text-amber-700">
                                  {patrimoine_via_sci.length} affichés sur {formatNumber(patrimoineTotal)} —
                                  ouvrir la fiche de chaque SCI pour voir le patrimoine complet.
                                </p>
                              )}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                ),
              },
              {
                id: 'historique',
                label: 'Historique BRH',
                disabled: profile !== 'employe' || !brh_historique,
                content: (
                  <div className="space-y-3 p-4">
                    {profile !== 'employe' ? (
                      <div className="text-sm text-slate-500">
                        Historique BRH visible uniquement par le profil employé.
                      </div>
                    ) : !brh_historique ? (
                      <div className="text-sm text-slate-500">
                        Aucun historique BRH pour cette personne.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <DetailRowUi label="Statut" value={brh_historique.statut} showEmpty />
                        <DetailRowUi
                          label="CA total"
                          value={brh_historique.ca_total ? `${brh_historique.ca_total.toLocaleString('fr-FR')} €` : null}
                          showEmpty
                        />
                        <DetailRowUi label="Première facture" value={brh_historique.premiere_facture} showEmpty />
                        <DetailRowUi label="Dernière facture" value={brh_historique.derniere_facture} showEmpty />
                        <DetailRowUi label="Nombre de RDV" value={brh_historique.rdv_count} showEmpty />
                        <DetailRowUi label="Enfants" value={brh_historique.enfants} showEmpty />
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />

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

