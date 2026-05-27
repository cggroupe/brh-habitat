/**
 * Vue fiche personne — drill-down depuis dirigeant SCI ou propriétaire particulier.
 *
 * MVP : assemblé depuis brh_sci_companies.dirigeants JSONB + brh_dpe_prospects.particulier_name.
 * À enrichir Sprint 3 avec entity-hub (core.person, core.contact, core.event, signaux).
 */
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import PaginationInfo from '../../ui/PaginationInfo'
import Avatar from '../../ui/Avatar'
import ScoreTierBadge from '../../ui/ScoreTierBadge'
import DirigeantSuiviPanel from './DirigeantSuiviPanel'
import { generateDirigeantPsyProfile, type PsyProfile } from '@/api/dirigeant-psy-profile'

interface Props {
  /** Pour MVP : nom complet URL-encoded. Sera remplacé par entity_id en Sprint 3. */
  nameOrId: string
  profile: LeadProfile
}

export default function FichePersonneView({ nameOrId, profile }: Props) {
  const fullName = decodeURIComponent(nameOrId)
  const { data, isLoading, error } = useFichePersonneByName(fullName)
  // Pagination patrimoine SCI dirigeant (Sprint 1.5 27/05).
  // Pattern Data-B #11 — résumé + pagination intelligente, pas un slice silent.
  const [patrimoineLimit, setPatrimoineLimit] = useState(100)
  // Sprint 1.7 (27/05 PM) — Profil psy IA live. Cache local le retour de l'EF
  // entre 2 refresh de la fiche pour éviter un round-trip DB.
  const [psyProfileLocal, setPsyProfileLocal] = useState<PsyProfile | null>(null)
  const queryClient = useQueryClient()
  const psyMutation = useMutation({
    mutationFn: () => {
      const firstName = data?.identity.first_name ?? ''
      const lastName = data?.identity.last_name ?? ''
      if (!lastName) throw new Error('Nom de famille manquant')
      return generateDirigeantPsyProfile({ nom: lastName, prenom: firstName })
    },
    onSuccess: (res) => {
      setPsyProfileLocal(res.profile)
      // Invalide la fiche pour que le prochain fetch lise le psy_profile persisté.
      queryClient.invalidateQueries({ queryKey: ['brh', 'fiche', 'personne-by-name', fullName] })
    },
  })

  // 2026-05-27 — Push pile navigation. Hook AVANT les early returns (règles React).
  useEffect(() => {
    if (!data?.identity?.full_name) return
    pushNavEntity({
      type: 'personne',
      id: data.identity.full_name,
      label: data.identity.full_name,
      path: `${profileBasePath(profile)}/personne/${encodeURIComponent(data.identity.full_name)}`,
    })
  }, [data?.identity?.full_name, profile])

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
  const contactsPro = data.contacts_pro ?? null
  const autresEntreprises = data.autres_entreprises ?? []
  const autresEntreprisesActives = autresEntreprises.filter(
    (e) => (e.etat_administratif ?? 'A') === 'A',
  )
  // Tel pro prioritaire : via entreprise > OSINT
  const telPro = contactsPro?.tel_pro_via_entreprise ?? contactsPro?.osint_telephone ?? null
  const emailPro = contactsPro?.email_pro_via_entreprise ?? contactsPro?.osint_email ?? null
  // Sprint 1.4 — Score Vente Phase 16 agrégé (max sur le patrimoine du dirigeant)
  const scoreVenteAggregate = data.score_vente_aggregate ?? null
  const scoreVenteMax = scoreVenteAggregate?.max ?? null

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <StickyEntityHeader
        type="personne"
        title={identity.full_name}
        avatar={<Avatar name={identity.full_name} size={56} />}
        rightAccessory={
          scoreVenteMax != null ? (
            <ScoreTierBadge
              score={scoreVenteMax}
              label="Score Vente"
              sublabel={`Phase 16 · ${scoreVenteAggregate?.n ?? 0} bien${(scoreVenteAggregate?.n ?? 0) > 1 ? 's' : ''}`}
              compact
            />
          ) : undefined
        }
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
          ...(autresEntreprises.length > 0
            ? [{ label: 'autres entreprises', value: formatNumber(autresEntreprises.length) }]
            : []),
        ]}
        actions={
          <div className="flex items-center gap-2">
            {telPro && (
              <a
                href={`tel:${telPro.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00600a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004807]"
                title="Téléphone pro (extrait via entreprise)"
              >
                <span className="font-mono">{telPro}</span>
              </a>
            )}
            {emailPro && (
              <a
                href={`mailto:${emailPro}`}
                className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
                title="Email pro (extrait via entreprise)"
              >
                <span className="truncate">{emailPro}</span>
              </a>
            )}
            <FavoriButton
              entity_type="personne"
              entity_id={identity.full_name}
              label={identity.full_name}
            />
          </div>
        }
      />
      <FicheBreadcrumb leadsBackUrl={profileBack(profile)} />
      <OriginBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* Sprint 1.7 (27/05) — 2 colonnes Suivi commercial / Profil psycho-IA
              Pattern Stitch fiche-client-brh.png. Employé only (matrice RGPD). */}
          {profile === 'employe' && (
            <DirigeantSuiviPanel
              identity={identity}
              brhHistorique={brh_historique}
              scoreVente={data.score_vente_aggregate ?? null}
              rolesCount={sciPatrimoniales.length}
              patrimoineTotal={patrimoineTotal}
              contactsPro={contactsPro ?? undefined}
              psyProfile={psyProfileLocal}
              onGenerateProfile={() => psyMutation.mutate()}
              generating={psyMutation.isPending}
            />
          )}

          {/* Sprint 1.4 (27/05) — Score Vente Phase 16 agrégé sur patrimoine.
              Affichage hero avec tier large + breakdown segment.
              Pattern Stitch fiche-client-brh.png (Score Tier visuel proéminent). */}
          {scoreVenteAggregate && scoreVenteAggregate.n > 0 && (
            <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface ring-1 ring-border-strong/20 p-5">
              <ScoreTierBadge
                score={scoreVenteAggregate.max}
                label="Score Vente max sur patrimoine"
                sublabel={`Phase 16 · ${scoreVenteAggregate.n} bien${scoreVenteAggregate.n > 1 ? 's' : ''} scoré${scoreVenteAggregate.n > 1 ? 's' : ''}`}
              />
              <div className="flex-1 min-w-[260px]">
                <div className="mb-2 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Répartition par segment vente
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { key: 'tres_chaud' as const, l: 'Très chaud', dot: 'bg-[#00600a]', n: scoreVenteAggregate.by_segment.tres_chaud },
                    { key: 'chaud' as const, l: 'Chaud', dot: 'bg-amber-500', n: scoreVenteAggregate.by_segment.chaud },
                    { key: 'tiede' as const, l: 'Tiède', dot: 'bg-stone-500', n: scoreVenteAggregate.by_segment.tiede },
                    { key: 'froid' as const, l: 'Froid', dot: 'bg-stone-300', n: scoreVenteAggregate.by_segment.froid },
                  ].map((s) => (
                    <div key={s.key} className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.l}
                      </div>
                      <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-text">
                        {s.n}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-text-muted">
                  Score moyen patrimoine : <strong className="tabular-nums">{scoreVenteAggregate.avg}/100</strong>
                </p>
              </div>
            </section>
          )}

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
                subnav: [
                  ...(sciPatrimoniales.length > 0 ? [{ id: 'mandats-patrimoniales', label: 'SCI patrimoniales', count: sciPatrimoniales.length }] : []),
                  ...(rolesUtility.length > 0 ? [{ id: 'mandats-utility', label: 'Utility', count: rolesUtility.length }] : []),
                ],
                content: (
                  <div className="space-y-3 p-4">
                    {roles.length === 0 ? (
                      <div className="text-sm text-slate-500">Aucun rôle entreprise connu.</div>
                    ) : (
                      <>
                        {sciPatrimoniales.length > 0 && (
                          <section id="mandats-patrimoniales" className="scroll-mt-24">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#00600a]">
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
                          <section id="mandats-utility" className="scroll-mt-24">
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
                subnav: [
                  ...(patrimoine_direct.length > 0 ? [{ id: 'patrimoine-direct', label: 'Patrimoine direct', count: patrimoine_direct.length }] : []),
                  ...(patrimoineTotal > 0 ? [{ id: 'patrimoine-via-sci', label: 'Via SCI', count: patrimoineTotal }] : []),
                ],
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
                          <section id="patrimoine-direct" className="scroll-mt-24">
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
                          <section id="patrimoine-via-sci" className="scroll-mt-24">
                            <div className="mb-2 flex items-baseline justify-between gap-3">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#00600a]">
                                Patrimoine via SCI ({formatNumber(patrimoineTotal)} DPE)
                              </h3>
                              <PaginationInfo
                                shown={Math.min(patrimoineLimit, patrimoine_via_sci.length)}
                                total={patrimoineTotal}
                                itemLabel="DPE"
                                sortedBy="triés par classe DPE décroissante"
                              />
                            </div>
                            <div className="space-y-1.5">
                              {patrimoine_via_sci.slice(0, patrimoineLimit).map((a) => (
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
                            </div>
                            {patrimoine_via_sci.length > patrimoineLimit && (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-border-strong/20">
                                <p className="text-xs text-text-muted">
                                  {patrimoineLimit} affichés sur {formatNumber(patrimoine_via_sci.length)}
                                  {patrimoineTotal > patrimoine_via_sci.length && (
                                    <> · {formatNumber(patrimoineTotal - patrimoine_via_sci.length)} non chargés (ouvrir la fiche SCI)</>
                                  )}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPatrimoineLimit((n) => Math.min(n + 100, patrimoine_via_sci.length))}
                                    className="rounded-xl border border-border-strong/30 bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-low"
                                  >
                                    Voir 100 de plus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPatrimoineLimit(patrimoine_via_sci.length)}
                                    className="rounded-xl bg-[#00600a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004807]"
                                  >
                                    Tout afficher
                                  </button>
                                </div>
                              </div>
                            )}
                            {patrimoineTotal > patrimoine_via_sci.length && patrimoine_via_sci.length === patrimoineLimit && (
                              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
                                {formatNumber(patrimoine_via_sci.length)} DPE chargés sur {formatNumber(patrimoineTotal)} —
                                ouvrir la fiche de chaque SCI pour voir le patrimoine complet (pagination serveur).
                              </p>
                            )}
                          </section>
                        )}
                      </>
                    )}
                  </div>
                ),
              },
              {
                id: 'contacts-pro',
                label: 'Contacts pro',
                count: (telPro || emailPro || contactsPro?.osint_linkedin) ? 1 : 0,
                disabled: !(telPro || emailPro || contactsPro?.osint_linkedin),
                content: (
                  <div className="space-y-4 p-4">
                    {!(telPro || emailPro || contactsPro?.osint_linkedin) ? (
                      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                        Aucun contact pro extrait. Voir l'onglet "Autres entreprises" pour relancer la recherche.
                      </div>
                    ) : (
                      <section className="rounded-2xl bg-surface ring-1 ring-border-strong/20 p-5">
                        <div className="flex flex-wrap gap-2">
                          {contactsPro?.tel_pro_via_entreprise && (
                            <a
                              href={`tel:${contactsPro.tel_pro_via_entreprise.replace(/\s/g, '')}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#00600a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004807]"
                            >
                              <span className="font-mono">{contactsPro.tel_pro_via_entreprise}</span>
                              <span className="text-[10px] opacity-70">· entreprise</span>
                            </a>
                          )}
                          {contactsPro?.email_pro_via_entreprise && (
                            <a
                              href={`mailto:${contactsPro.email_pro_via_entreprise}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
                            >
                              {contactsPro.email_pro_via_entreprise}
                              <span className="text-[10px] opacity-70">· entreprise</span>
                            </a>
                          )}
                          {contactsPro?.osint_telephone && (
                            <a
                              href={`tel:${contactsPro.osint_telephone.replace(/\s/g, '')}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
                            >
                              <span className="font-mono">{contactsPro.osint_telephone}</span>
                              <span className="text-[10px] opacity-70">· OSINT</span>
                            </a>
                          )}
                          {contactsPro?.osint_email && (
                            <a
                              href={`mailto:${contactsPro.osint_email}`}
                              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
                            >
                              {contactsPro.osint_email}
                              <span className="text-[10px] opacity-70">· OSINT</span>
                            </a>
                          )}
                          {contactsPro?.osint_linkedin && (
                            <a
                              href={contactsPro.osint_linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-200"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                ),
              },
              {
                id: 'autres-entreprises',
                label: 'Autres entreprises',
                count: autresEntreprises.length,
                disabled: autresEntreprises.length === 0,
                content: (
                  <div className="space-y-4 p-4">
                    {autresEntreprises.length === 0 ? (
                      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                        Aucune autre entreprise active trouvée pour cette personne via recherche-entreprises.api.gouv.fr.
                      </div>
                    ) : (
                      <>
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                            {autresEntreprisesActives.length} entreprise{autresEntreprisesActives.length > 1 ? 's' : ''} active{autresEntreprisesActives.length > 1 ? 's' : ''}
                            {autresEntreprises.length > autresEntreprisesActives.length && (
                              <span className="ml-1 text-text-light">
                                · {autresEntreprises.length - autresEntreprisesActives.length} radiée(s)
                              </span>
                            )}
                          </h3>
                          <div className="space-y-2">
                            {autresEntreprises.map((e) => {
                              const isActive = (e.etat_administratif ?? 'A') === 'A'
                              return (
                                <article
                                  key={e.siren}
                                  className={`rounded-2xl bg-surface ring-1 p-4 transition ${
                                    isActive ? 'ring-border-strong/20' : 'ring-stone-200 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted font-bold">
                                        <span className="font-mono">{e.siren}</span>
                                        {e.nature_juridique && <span>· {e.nature_juridique}</span>}
                                        {!isActive && <span className="text-red-700">· Radiée</span>}
                                      </div>
                                      <h4 className="mt-1 font-display text-sm font-semibold text-text truncate">
                                        {e.denomination}
                                      </h4>
                                      <div className="mt-1 text-xs text-text-muted">
                                        {e.activite_principale && <span>{e.activite_principale}</span>}
                                        {e.siege_commune && (
                                          <>
                                            {e.activite_principale && ' · '}
                                            <span>
                                              {e.siege_code_postal} {e.siege_commune}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      {(e.telephone_found || e.email_found) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {e.telephone_found && (
                                            <a
                                              href={`tel:${e.telephone_found.replace(/\s/g, '')}`}
                                              className="inline-flex items-center gap-1 rounded-md bg-[#00600a]/10 px-2 py-1 text-[11px] font-mono font-medium text-[#00600a] hover:bg-[#00600a]/20"
                                            >
                                              {e.telephone_found}
                                            </a>
                                          )}
                                          {e.email_found && (
                                            <a
                                              href={`mailto:${e.email_found}`}
                                              className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[11px] font-medium text-text hover:bg-stone-200 truncate max-w-[200px]"
                                            >
                                              {e.email_found}
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        </section>
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

