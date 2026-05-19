/**
 * EmployeClientBrhDetail — fiche détaillée d'UN contact BRH.
 *
 * Route : /employe/clients-brh/:id
 * Réservée aux BRH internes (admin/pro/employe).
 *
 * Affiche TOUT en plein écran (pas de tooltip caché) :
 *  - Identité + tier + score
 *  - Profil psy IA complet
 *  - OSINT Apify Google détaillé (avec avertissement homonymie)
 *  - Emails actifs Holehe (liste complète)
 *  - Graphe 360° (adresses DPE, mutations DVF, BODACC, succession)
 *  - Historique BRH (RDV, CA, statut, DPE lié)
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Phone, Mail, MapPin, Wallet, Calendar,
  Building2, FileText, AlertTriangle, ExternalLink, User,
  Sparkles, Crown, Award, Sigma, Skull,
} from 'lucide-react'
import { usePersonne360 } from '@/hooks/queries/usePersonne360'
import { useUpdatePersonne } from '@/hooks/queries/useEmployeeEdit'
import { EmployeeEditPanel } from '@/components/leads/EmployeeEditPanel'
import { ClientVisitsTravauxSection } from '@/components/leads/ClientVisitsTravauxSection'
import { useAuth } from '@/hooks/useAuth'
import type { Personne360Identity } from '@/api/brh-personne-360'

const TIER_BADGE: Record<string, { cls: string; Icon: typeof Crown; label: string }> = {
  gold: { cls: 'border-amber-400 bg-amber-100 text-amber-900', Icon: Crown, label: 'Gold' },
  silver: { cls: 'border-slate-400 bg-slate-200 text-slate-800', Icon: Award, label: 'Silver' },
  bronze: { cls: 'border-orange-300 bg-orange-50 text-orange-800', Icon: Award, label: 'Bronze' },
  none: { cls: 'border-dashed border-slate-300 bg-white text-slate-400', Icon: Sigma, label: 'À enrichir' },
}

export default function EmployeClientBrhDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = usePersonne360(id ?? null)
  const updateMutation = useUpdatePersonne(id ?? '')
  const { user } = useAuth()
  const currentUserId = user?.id ?? null

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !data?.identity) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-slate-50">
        <p className="text-sm text-slate-600">Contact introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/employe/clients-brh')}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  const id360 = data.identity as Personne360Identity
  const tierKey = (id360.enrichment_tier ?? 'none') as keyof typeof TIER_BADGE
  const tierBadge = TIER_BADGE[tierKey]
  const apify = id360.osint_other?.apify_google as Record<string, unknown> | undefined
  const holehe = id360.osint_other?.holehe as { used_on?: string[]; checked_at?: string } | undefined
  const psy = id360.psy_profile as Record<string, unknown> | null

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            to="/employe/clients-brh"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Clients BRH
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tierBadge.cls}`}
              title={`Score ${id360.enrichment_score ?? 0} / 15`}
            >
              <tierBadge.Icon className="h-3 w-3" />
              {tierBadge.label}
              {id360.enrichment_score != null && id360.enrichment_score > 0 && (
                <span className="ml-0.5 font-mono opacity-70">{id360.enrichment_score}</span>
              )}
            </span>
            {id360.statut && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  id360.statut === 'Client' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                }`}
              >
                {id360.statut}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* IDENTITÉ */}
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {id360.is_pro || id360.societe ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="truncate text-xl font-semibold text-slate-900">
                  {id360.full_name || id360.societe || `Contact ${id?.slice(0, 8)}`}
                </h1>
                {id360.societe && id360.full_name && (
                  <p className="text-sm text-slate-600">{id360.societe}</p>
                )}
                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm text-slate-700 sm:grid-cols-2">
                  {id360.telephone && (
                    <a href={`tel:${id360.telephone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-mono">{id360.telephone}</span>
                    </a>
                  )}
                  {id360.email && (
                    <a href={`mailto:${id360.email}`} className="inline-flex items-center gap-1.5 truncate hover:underline">
                      <Mail className="h-3.5 w-3.5 text-sky-600" />
                      <span className="truncate">{id360.email}</span>
                    </a>
                  )}
                  {id360.adresse && (
                    <span className="inline-flex items-center gap-1.5 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">
                        {id360.adresse} · {id360.code_postal} {id360.ville}
                      </span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {id360.ca_total_eur != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                      <Wallet className="h-3 w-3" />
                      CA {id360.ca_total_eur.toLocaleString('fr-FR')} €
                    </span>
                  )}
                  {id360.nb_rdv != null && id360.nb_rdv > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                      <Calendar className="h-3 w-3" />
                      {id360.nb_rdv} RDV
                    </span>
                  )}
                  {id360.linked_dpe_id && (
                    <Link
                      to={`/employe/leads/adresse/${id360.linked_dpe_id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3 w-3" />
                      DPE F/G #{id360.linked_dpe_id}
                    </Link>
                  )}
                  {id360.enfants && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                      Famille : {id360.enfants}
                    </span>
                  )}
                  {id360.categorie && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                      {id360.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* DÉJÀ VISITÉ PAR + TRAVAUX PAR POSTE (maquette Stitch v3) */}
          {id && (
            <ClientVisitsTravauxSection personneId={id} currentUserId={currentUserId} />
          )}

          {/* SUIVI COMMERCIAL TERRAIN (édition employé BRH) */}
          <EmployeeEditPanel
            initial={{
              telephone: id360.telephone,
              email: id360.email,
              adresse: id360.adresse,
              code_postal: id360.code_postal,
              ville: id360.ville,
              employee_notes: id360.employee_notes,
              travaux_terrain_status: id360.travaux_terrain_status,
              dpe_terrain_estime: id360.dpe_terrain_estime,
              interet_brh: id360.interet_brh,
              contact_disponibilite: id360.contact_disponibilite,
              derniere_visite_terrain: id360.derniere_visite_terrain,
            }}
            showContactFields
            onSave={(patch) => updateMutation.mutateAsync(patch)}
          />

          {/* PROFIL PSY IA */}
          {psy && Object.keys(psy).length > 0 && (
            <section className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-5">
              <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-fuchsia-900">
                <Sparkles className="h-4 w-4" />
                Profil psycho-commercial (IA)
                {(psy.confidence as string) && (
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] normal-case tracking-normal">
                    confiance : {psy.confidence as string}
                  </span>
                )}
              </h2>
              {Array.isArray(psy.personality_traits) && (psy.personality_traits as unknown[]).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {(psy.personality_traits as string[]).map((t, i) => (
                    <span key={i} className="rounded-full border border-fuchsia-300 bg-white px-2 py-0.5 text-xs text-fuchsia-800">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
                {psy.communication_style as string && (
                  <div><dt className="inline font-medium">Style : </dt><dd className="inline">{psy.communication_style as string}</dd></div>
                )}
                {psy.best_contact_channel as string && (
                  <div><dt className="inline font-medium">Canal préféré : </dt><dd className="inline">{psy.best_contact_channel as string}</dd></div>
                )}
                {psy.estimated_segment as string && (
                  <div className="sm:col-span-2"><dt className="inline font-medium">Segment estimé : </dt><dd className="inline">{psy.estimated_segment as string}</dd></div>
                )}
                {Array.isArray(psy.renovation_motivators) && (psy.renovation_motivators as unknown[]).length > 0 && (
                  <div className="sm:col-span-2"><dt className="inline font-medium">Motivateurs : </dt><dd className="inline">{(psy.renovation_motivators as string[]).join(', ')}</dd></div>
                )}
                {Array.isArray(psy.renovation_barriers) && (psy.renovation_barriers as unknown[]).length > 0 && (
                  <div className="sm:col-span-2"><dt className="inline font-medium">Barrières : </dt><dd className="inline">{(psy.renovation_barriers as string[]).join(', ')}</dd></div>
                )}
              </dl>
              {psy.approach_advice as string && (
                <div className="mt-3 rounded-md bg-white p-3 text-sm italic text-slate-700">
                  <span className="mr-1 not-italic font-semibold text-fuchsia-900">Conseil commercial : </span>
                  {psy.approach_advice as string}
                </div>
              )}
            </section>
          )}

          {/* OSINT APIFY GOOGLE */}
          {apify && (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-slate-700">
                <Sparkles className="h-4 w-4" />
                OSINT Apify Google
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] normal-case tracking-normal text-amber-800">
                  <AlertTriangle className="h-3 w-3" />
                  Homonymie possible — vérifier avant action
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(id360.osint_linkedin || apify.linkedin as string) && (
                  <OsintLink label="LinkedIn" url={id360.osint_linkedin ?? (apify.linkedin as string)} cls="border-sky-300 bg-sky-50 text-sky-800" />
                )}
                {(id360.osint_facebook || apify.facebook as string) && (
                  <OsintLink label="Facebook" url={id360.osint_facebook ?? (apify.facebook as string)} cls="border-blue-300 bg-blue-50 text-blue-800" />
                )}
                {apify.instagram as string && (
                  <OsintLink label="Instagram" url={apify.instagram as string} cls="border-pink-300 bg-pink-50 text-pink-800" />
                )}
                {apify.twitter as string && (
                  <OsintLink label="Twitter / X" url={apify.twitter as string} cls="border-slate-300 bg-slate-50 text-slate-800" />
                )}
                {apify.pagesjaunes as string && (
                  <OsintLink label="PagesJaunes" url={apify.pagesjaunes as string} cls="border-yellow-300 bg-yellow-50 text-yellow-800" />
                )}
              </div>

              {Array.isArray(apify.immo_intentions) && (apify.immo_intentions as unknown[]).length > 0 && (
                <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-rose-900">
                    Annonces immobilières détectées ({(apify.immo_intentions as unknown[]).length})
                  </p>
                  <ul className="space-y-1">
                    {(apify.immo_intentions as Array<{ url: string; title: string }>).slice(0, 5).map((h, i) => (
                      <li key={i} className="truncate text-sm">
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-rose-800 hover:underline">
                          {h.title || h.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(apify.societes) && (apify.societes as unknown[]).length > 0 && (
                <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-900">
                    Mentions sociétés (Pappers / Societe.com — {(apify.societes as unknown[]).length})
                  </p>
                  <ul className="space-y-1">
                    {(apify.societes as Array<{ url: string; title: string }>).slice(0, 5).map((h, i) => (
                      <li key={i} className="truncate text-sm">
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-indigo-800 hover:underline">
                          {h.title || h.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(apify.web_hits) && (apify.web_hits as unknown[]).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-600">
                    Tous les résultats Google ({(apify.web_hits as unknown[]).length})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {(apify.web_hits as Array<{ title: string; url: string; snippet?: string }>).map((h, i) => (
                      <li key={i} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-slate-800 hover:underline">
                          {h.title || h.url}
                        </a>
                        {h.snippet && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{h.snippet}</p>}
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{h.url}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {/* EMAILS ACTIFS HOLEHE */}
          {holehe?.used_on && holehe.used_on.length > 0 && (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-900">
                <Mail className="h-4 w-4" />
                Email actif sur ({holehe.used_on.length} service{holehe.used_on.length > 1 ? 's' : ''})
              </h2>
              <p className="mb-2 text-xs text-emerald-800">
                L'adresse <code className="rounded bg-white px-1.5 py-0.5">{id360.email}</code> est enregistrée sur :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {holehe.used_on.map((s) => (
                  <span key={s} className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs text-emerald-900">
                    {s}
                  </span>
                ))}
              </div>
              {holehe.checked_at && (
                <p className="mt-2 text-[10px] text-emerald-700">Vérifié le {holehe.checked_at}</p>
              )}
            </section>
          )}

          {/* SCI DIRIGEES — supprimé (faux positifs systémiques sans date_naissance) */}
          {/* Réactivé Sprint F après matching robuste */}

          {/* GRAPHE 360° — adresses + DVF + BODACC + Succession */}
          {(data.adresses_liees.length > 0 || data.mutations_dvf.length > 0 || data.bodacc_alerts.length > 0 || data.sci_deces_pairs.length > 0) && (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                Graphe foncier 360°
              </h2>

              {data.adresses_liees.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Adresses DPE liées ({data.adresses_liees.length})
                  </p>
                  <ul className="space-y-1">
                    {data.adresses_liees.slice(0, 6).map((a) => (
                      <li key={a.dpe_id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                        <Link to={`/employe/leads/adresse/${a.dpe_id}`} className="font-medium text-slate-800 hover:underline">
                          {a.adresse}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-600">
                          <span>{a.code_postal} {a.commune}</span>
                          {a.etiquette_dpe && <span>DPE {a.etiquette_dpe}</span>}
                          {a.surface_habitable != null && <span>{a.surface_habitable} m²</span>}
                          <span className="text-emerald-700">conf. {(a.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.mutations_dvf.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Mutations DVF (via adresses, {data.mutations_dvf.filter(m => m.usable_for_brh).length} exploitables / {data.mutations_dvf.length})
                  </p>
                  <ul className="space-y-1">
                    {data.mutations_dvf.filter(m => m.usable_for_brh).slice(0, 6).map((m) => {
                      const eur = m.valeur_fonciere_cents != null ? Math.round(m.valeur_fonciere_cents / 100) : null
                      return (
                        <li key={m.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
                          <span className="font-mono text-slate-500">{m.date_mutation}</span>
                          {' · '}<span className="font-medium">{m.nature_mutation}</span>
                          {m.type_local && <span> · {m.type_local}</span>}
                          {eur != null && <span> · <b>{eur.toLocaleString('fr-FR')} €</b></span>}
                          {m.surface_reelle_bati != null && m.surface_reelle_bati > 0 && (
                            <span> · {m.surface_reelle_bati} m²</span>
                          )}
                          {m.prix_m2_calc != null && <span> · {m.prix_m2_calc.toLocaleString('fr-FR')} €/m²</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {data.sci_deces_pairs.length > 0 && (
                <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-900">
                    <Skull className="h-3 w-3" />
                    Succession potentielle ({data.sci_deces_pairs.length})
                  </p>
                  <ul className="space-y-1">
                    {data.sci_deces_pairs.map((d, i) => (
                      <li key={i} className="text-xs text-slate-700">
                        <span className="font-medium">{d.prenom} {d.nom}</span>
                        {d.siren && <span className="font-mono text-[10px] text-slate-500"> · SIREN {d.siren}</span>}
                        {d.deces_date && <span className="text-rose-800"> · Décès {d.deces_date}{d.deces_commune && ` à ${d.deces_commune}`}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.bodacc_alerts.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">BODACC ({data.bodacc_alerts.length})</p>
                  <ul className="space-y-1">
                    {data.bodacc_alerts.slice(0, 5).map((b) => (
                      <li key={b.id_bodacc} className="rounded border border-indigo-200 bg-indigo-50 p-2 text-xs">
                        <span className="font-mono text-slate-500">{b.date_publication}</span>
                        {' · '}<span className="font-medium">{b.type_avis || b.famille_avis}</span>
                        {b.denomination && <span> · {b.denomination}</span>}
                        {b.bodacc_url && (
                          <a href={b.bodacc_url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-indigo-700 hover:underline">
                            source <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  )
}

function OsintLink({ label, url, cls }: { label: string; url: string; cls: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:opacity-90 ${cls}`}
    >
      <span className="font-medium">{label}</span>
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}
