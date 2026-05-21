/**
 * Vue fiche adresse — drill-down depuis la liste leads.
 * Affiche DPE + propriétaire (cliquable) + voisinage (cliquable) + sections lazy.
 * RGPD-aware via lead-visibility.ts.
 */
import { useState, lazy, Suspense } from 'react'
import { Home, FileText, Building2, AlertTriangle, Wallet, Phone, Users, Flame, TrendingUp, Hammer, UserPlus } from 'lucide-react'

const CreateProspectFromDpeModal = lazy(() => import('../CreateProspectFromDpeModal'))
import FicheBreadcrumb from './FicheBreadcrumb'
import FicheSection from './FicheSection'
import { EntityLinksPanel } from '../EntityLinksPanel'
import { EmployeeEditPanel } from '../EmployeeEditPanel'
import FicheEntityLink from './FicheEntityLink'
import FavoriButton from './FavoriButton'
import { useFicheAdresse } from '@/hooks/queries/useFiche'
import { useUpdateDpe, useUpdateDpeOverrides } from '@/hooks/queries/useEmployeeEdit'
import { canSee, displayName, type LeadProfile } from '@/lib/rgpd/lead-visibility'
import type { Dirigeant } from '@/types/fiche'
import { DpePostesEmployeePanel } from '../DpePostesEmployeePanel'

interface Props {
  dpeId: number
  profile: LeadProfile
}

export default function FicheAdresseView({ dpeId, profile }: Props) {
  const { data, isLoading, error } = useFicheAdresse(dpeId)
  const updateMutation = useUpdateDpe(dpeId)
  const overridesMutation = useUpdateDpeOverrides(dpeId)
  const [showCreateProspect, setShowCreateProspect] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <FicheBreadcrumb items={[{ label: 'Leads', to: profileBack(profile) }, { label: 'Adresse introuvable' }]} />
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
          {error ? `Erreur : ${(error as Error).message}` : 'Cette adresse n’a pas été trouvée.'}
        </div>
      </div>
    )
  }

  const { dpe, sci, voisinage } = data
  const isPersonneMorale = !!dpe.owner_siren
  const ownerLabel = displayName(profile, dpe.owner_name ?? null, isPersonneMorale)

  const crumbs = [
    { label: 'Leads', to: profileBack(profile) },
    { label: dpe.adresse_ban ?? dpe.adresse ?? `DPE #${dpe.id}` },
  ]

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <FicheBreadcrumb items={crumbs} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          {/* En-tête identité adresse */}
          <header className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Home className="h-3.5 w-3.5" />
                  Adresse
                </div>
                <h1 className="mt-1 text-lg font-semibold text-slate-900">
                  {dpe.adresse_ban || dpe.adresse || `DPE #${dpe.id}`}
                </h1>
                {!dpe.adresse_ban && (
                  <p className="text-sm text-slate-600">
                    {dpe.code_postal} {dpe.commune}
                    {dpe.departement ? ` · ${dpe.departement}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FavoriButton
                  entity_type="adresse"
                  entity_id={String(dpe.id)}
                  label={dpe.adresse ?? `DPE #${dpe.id}`}
                  sublabel={`${dpe.code_postal ?? ''} ${dpe.commune ?? ''}`.trim() || null}
                />
                {dpe.score_v2 != null && (
                  <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-800">
                    <Flame className="h-4 w-4" />
                    Score {dpe.score_v2}/100
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Propriétaire — chip cliquable */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4" />
              Propriétaire
            </div>
            {isPersonneMorale && dpe.owner_siren ? (
              <FicheEntityLink
                kind="entreprise"
                id={dpe.owner_siren}
                label={ownerLabel}
                sublabel={`SIREN ${dpe.owner_siren} · personne morale`}
                profile={profile}
                variant="row"
              />
            ) : dpe.pii_full_name ? (
              <div className="space-y-2">
                <FicheEntityLink
                  kind="personne"
                  id={encodeURIComponent(dpe.pii_full_name)}
                  label={dpe.pii_full_name}
                  sublabel={
                    dpe.pii_source === 'brh_clients_v2'
                      ? 'Client BRH enrichi · CA + facturation'
                      : 'Client BRH (contact connu)'
                  }
                  profile={profile}
                  variant="row"
                />
                {canSee(profile, 'particulier_phone') === true && dpe.pii_telephone && (
                  <a
                    href={`tel:${dpe.pii_telephone}`}
                    className="block rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs"
                  >
                    <span className="text-slate-500">Téléphone : </span>
                    <span className="font-mono font-semibold text-emerald-800">{dpe.pii_telephone}</span>
                  </a>
                )}
                {canSee(profile, 'particulier_email') === true && dpe.pii_email && (
                  <a
                    href={`mailto:${dpe.pii_email}`}
                    className="block rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs"
                  >
                    <span className="text-slate-500">Email : </span>
                    <span className="font-semibold text-sky-800">{dpe.pii_email}</span>
                  </a>
                )}
                {profile === 'employe' && dpe.pii_ca_total_eur != null && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs">
                    <span className="text-slate-500">CA cumulé BRH : </span>
                    <span className="font-semibold text-amber-800">
                      {dpe.pii_ca_total_eur.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
              </div>
            ) : dpe.owner_name ? (
              <FicheEntityLink
                kind="personne"
                id={encodeURIComponent(dpe.owner_name)}
                label={ownerLabel}
                sublabel="Propriétaire particulier"
                profile={profile}
                variant="row"
              />
            ) : profile === 'employe' ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm text-slate-500">Propriétaire inconnu (DPE anonyme)</div>
                <button
                  type="button"
                  onClick={() => setShowCreateProspect(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  <UserPlus className="h-3 w-3" />
                  Enregistrer le propriétaire
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Propriétaire inconnu</div>
            )}
          </div>

          {/* DPE — section toujours ouverte */}
          {canSee(profile, 'dpe_basic') && (
            <FicheSection title="DPE" icon={<FileText className="h-4 w-4" />} defaultOpen>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Classe DPE" value={dpe.etiquette_dpe} accent={['F', 'G'].includes(String(dpe.etiquette_dpe))} />
                <Stat label="Surface" value={(() => {
                  const sh = (dpe as unknown as { surface_habitable?: number | null }).surface_habitable
                  if (sh != null) return `${sh} m²`
                  if (dpe.surface != null) return `${dpe.surface} m²`
                  return null
                })()} />
                <Stat label="Année" value={dpe.annee_construction} />
                <Stat label="Type bâti" value={dpe.type_batiment} />
              </div>

              {canSee(profile, 'dpe_details_techniques') && (
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
                  <DetailRow label="Conso 5 usages" value={dpe.conso_m2_ep ? `${dpe.conso_m2_ep} kWh/m²·an` : null} />
                  <DetailRow label="Ubat" value={dpe.ubat ? `${dpe.ubat} W/m²·K` : null} />
                  <DetailRow label="Isolation murs" value={dpe.qualite_isolation_murs} />
                  <DetailRow label="Menuiseries" value={dpe.qualite_isolation_menuiseries} />
                  <DetailRow label="Plancher bas" value={dpe.qualite_isolation_plancher_bas} />
                  <DetailRow label="Plancher haut" value={dpe.qualite_isolation_plancher_haut} />
                  <DetailRow label="Ventilation" value={dpe.type_ventilation} />
                  <DetailRow label="Chauffage" value={dpe.description_chauffage} />
                </div>
              )}
            </FicheSection>
          )}

          {/* Société propriétaire (résumé local) — cliquer ouvre fiche entreprise */}
          {sci && canSee(profile, 'sci_info') && (
            <FicheSection
              title="Société propriétaire"
              icon={<Building2 className="h-4 w-4" />}
              count={sci.dirigeants.length}
              defaultOpen
            >
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <DetailRow label="Dénomination" value={sci.denomination} />
                <DetailRow label="SIREN" value={sci.siren} />
                <DetailRow label="Forme juridique" value={sci.forme_juridique} />
                <DetailRow label="Statut" value={sci.is_active ? 'Active' : `Radiée${sci.date_radiation ? ' le ' + sci.date_radiation : ''}`} />
              </div>
              {canSee(profile, 'sci_dirigeants') && sci.dirigeants.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-xs font-medium text-slate-500">Dirigeants</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sci.dirigeants.map((d: Dirigeant, i: number) => {
                      const name = [d.prenom, d.nom].filter(Boolean).join(' ').trim()
                      if (!name) return null
                      return (
                        <FicheEntityLink
                          key={`${name}-${i}`}
                          kind="personne"
                          id={encodeURIComponent(name)}
                          label={name + (d.est_decede ? ' †' : '')}
                          profile={profile}
                          variant="chip"
                        />
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <FicheEntityLink
                  kind="entreprise"
                  id={sci.siren}
                  label={`Voir fiche complète de ${sci.denomination}`}
                  profile={profile}
                  variant="row"
                />
              </div>
            </FicheSection>
          )}

          {/* Signaux d'intention (entity-hub Sprint 13b) */}
          {canSee(profile, 'score_intention_travaux') &&
            (dpe.intent_score_travaux != null || dpe.intent_score_vente != null) && (
              <FicheSection
                title="Signaux d'intention"
                icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
                defaultOpen
              >
                <div className="space-y-3">
                  {dpe.intent_score_travaux != null && (
                    <IntentBar
                      label="Travaux / rénovation"
                      icon={<Hammer className="h-3.5 w-3.5" />}
                      score={dpe.intent_score_travaux}
                      color="orange"
                      breakdown={dpe.intent_breakdown_travaux as Record<string, unknown> | null}
                    />
                  )}
                  {dpe.intent_score_vente != null && (
                    <IntentBar
                      label="Intention de vente"
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      score={dpe.intent_score_vente}
                      color="emerald"
                      breakdown={dpe.intent_breakdown_vente as Record<string, unknown> | null}
                    />
                  )}
                </div>
              </FicheSection>
            )}

          {/* Succession */}
          {canSee(profile, 'sci_succession') &&
            (sci?.has_deceased_dirigeant || dpe.succession_active || dpe.deces_date) && (
              <FicheSection
                title="Succession probable"
                icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                defaultOpen
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailRow label="Décès" value={dpe.deces_date} />
                  <DetailRow label="Score succession" value={dpe.score_succession ?? sci?.succession_probable_score} />
                  <DetailRow
                    label="Dirigeants décédés"
                    value={sci ? sci.dirigeants.filter((d) => d.est_decede).length : null}
                  />
                </div>
              </FicheSection>
            )}

          {/* DVF mutations */}
          {canSee(profile, 'dvf_mutations') && (dpe.dvf_prix != null || dpe.dvf_date) && (
            <FicheSection title="Mutations DVF" icon={<Wallet className="h-4 w-4" />} defaultOpen>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <DetailRow label="Dernière vente" value={dpe.dvf_date} />
                <DetailRow label="Prix" value={dpe.dvf_prix ? `${dpe.dvf_prix.toLocaleString('fr-FR')} €` : null} />
                <DetailRow
                  label="Prix /m²"
                  value={dpe.dvf_prix_m2 ? `${dpe.dvf_prix_m2.toLocaleString('fr-FR')} €/m²` : null}
                />
              </div>
            </FicheSection>
          )}

          {/* Contacts particulier — BRH interne uniquement */}
          {(canSee(profile, 'particulier_phone') === true || canSee(profile, 'particulier_email') === true) &&
            (dpe.telephone || dpe.email) && (
              <FicheSection title="Contacts (BRH interne)" icon={<Phone className="h-4 w-4" />} defaultOpen>
                <div className="space-y-1.5 text-sm">
                  {dpe.telephone && (
                    <DetailRow
                      label="Téléphone"
                      value={
                        <a href={`tel:${dpe.telephone}`} className="font-mono text-emerald-700 hover:underline">
                          {dpe.telephone}
                        </a>
                      }
                    />
                  )}
                  {dpe.email && (
                    <DetailRow
                      label="Email"
                      value={
                        <a href={`mailto:${dpe.email}`} className="text-sky-700 hover:underline">
                          {dpe.email}
                        </a>
                      }
                    />
                  )}
                </div>
              </FicheSection>
            )}

          {/* Voisinage (lazy) */}
          {voisinage.length > 0 && (
            <FicheSection
              title="Voisinage proche (même code postal)"
              icon={<Home className="h-4 w-4" />}
              count={voisinage.length}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {voisinage.map((v) => (
                  <FicheEntityLink
                    key={v.id}
                    kind="adresse"
                    id={v.id}
                    label={v.adresse ?? `DPE #${v.id}`}
                    sublabel={`Classe ${v.etiquette_dpe ?? '?'} · ${v.surface_habitable ?? '?'} m²${
                      v.score_v2 != null ? ` · score ${v.score_v2}` : ''
                    }`}
                    profile={profile}
                    variant="row"
                  />
                ))}
              </div>
            </FicheSection>
          )}

          {profile === 'employe' && (
            <>
              <DpePostesEmployeePanel
                dpe={dpe as unknown as Record<string, unknown>}
                onSave={(overrides) => overridesMutation.mutateAsync(overrides)}
                isSaving={overridesMutation.isPending}
              />
              <EmployeeEditPanel
                initial={{
                  employee_notes: (dpe as unknown as Record<string, string | null>).employee_notes,
                  travaux_terrain_status: (dpe as unknown as Record<string, string | null>).travaux_terrain_status,
                  dpe_terrain_estime: (dpe as unknown as Record<string, string | null>).dpe_terrain_estime,
                  interet_brh: (dpe as unknown as Record<string, string | null>).interet_brh,
                  contact_disponibilite: (dpe as unknown as Record<string, string | null>).contact_disponibilite,
                  derniere_visite_terrain: (dpe as unknown as Record<string, string | null>).derniere_visite_terrain,
                }}
                showContactFields={false}
                onSave={(patch) => updateMutation.mutateAsync(patch)}
              />
            </>
          )}

          <EntityLinksPanel
            type="adresse_dpe"
            id={String(dpeId)}
            profileBase={`/${profile}`}
          />
        </div>
      </div>

      {/* Modal création prospect — visible employé uniquement (DPE anonyme) */}
      {profile === 'employe' && showCreateProspect && (
        <Suspense fallback={null}>
          <CreateProspectFromDpeModal
            dpeId={dpeId}
            open={showCreateProspect}
            onClose={() => setShowCreateProspect(false)}
          />
        </Suspense>
      )}
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

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent ? 'text-red-700' : 'text-slate-900'}`}>
        {value ?? '—'}
      </div>
    </div>
  )
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

function IntentBar({
  label,
  icon,
  score,
  color,
  breakdown,
}: {
  label: string
  icon: React.ReactNode
  score: number
  color: 'orange' | 'emerald'
  breakdown?: Record<string, unknown> | null
}) {
  const pct = Math.max(0, Math.min(100, score))
  const bg = color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
  const txt = color === 'orange' ? 'text-orange-700' : 'text-emerald-700'
  const detail =
    breakdown && typeof breakdown === 'object'
      ? Object.entries(breakdown)
          .filter(([k]) => ['n_active', 'n_recent', 'n_permits', 'signal', 'last_autorisation'].includes(k))
          .map(([k, v]) => `${k}: ${typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v)}`)
          .join(' · ')
      : null
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${txt}`}>
          {icon}
          {label}
        </span>
        <span className="font-bold text-slate-900">{score}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {detail && <div className="mt-1 text-[10px] text-slate-500">{detail}</div>}
    </div>
  )
}
