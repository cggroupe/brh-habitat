/**
 * EmployeDirigeantDetail — fiche détaillée 360° d'un dirigeant SCI.
 *
 * Route : /employe/dirigeants/:id
 * Affiche : identité, patrimoine SCI cross-référencé, DPE détenus, BODACC,
 * succession potentielle, édition employé terrain.
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, User, Building2, Home, ExternalLink, Save,
  Pencil, X, AlertTriangle, Briefcase, Phone, Mail,
} from 'lucide-react'
import { useState } from 'react'
import { useDirigeant360, useUpdateDirigeant } from '@/hooks/queries/useDirigeants'
import type { DirigeantEditPatch } from '@/api/brh-dirigeants'

const INTERET_OPTIONS = [
  { v: 'chaud', label: 'Chaud', cls: 'bg-red-100 text-red-900 border-red-300' },
  { v: 'tiede', label: 'Tiède', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  { v: 'froid', label: 'Froid', cls: 'bg-stone-100 text-stone-800 border-stone-300' },
  { v: 'a_recontacter', label: 'À recontacter', cls: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  { v: 'refus', label: 'Refus', cls: 'bg-stone-200 text-stone-800 border-stone-400' },
] as const

export default function EmployeDirigeantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useDirigeant360(id ?? null)
  const update = useUpdateDirigeant(id ?? '')
  const [editing, setEditing] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }
  if (!data?.identity) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-stone-50">
        <p className="text-sm text-stone-600">Dirigeant introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/employe/dirigeants')}
          className="rounded-md bg-stone-900 px-3 py-2 text-sm text-white hover:bg-stone-800"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  const d = data.identity!
  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/employe/dirigeants"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Dirigeants
            </Link>
            <span className="text-stone-300">›</span>
            <span className="truncate text-sm font-medium text-stone-800">
              {d.prenom} {d.nom}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {d.succession_potentielle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-900 ring-1 ring-rose-200">
                <AlertTriangle className="h-3 w-3" />
                Succession ouverte
              </span>
            )}
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200">
              {d.nb_sci_dirigees} SCI · {d.nb_dpe_total} DPE
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* Identité */}
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${d.est_decede ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'}`}>
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-stone-900">
                  {d.prenom} {d.nom}
                </h1>
                <p className="text-sm text-stone-600">
                  {d.date_naissance ? `Né(e) le ${new Date(d.date_naissance).toLocaleDateString('fr-FR')}` : 'Date de naissance inconnue'}
                  {d.est_decede && d.deces_date && (
                    <span className="ml-2 text-rose-800">
                      · Décès le {new Date(d.deces_date).toLocaleDateString('fr-FR')}
                      {d.deces_commune && ` à ${d.deces_commune}`}
                    </span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {d.osint_telephone && (
                    <a href={`tel:${d.osint_telephone}`} className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-stone-800 hover:bg-stone-200">
                      <Phone className="h-3 w-3" />
                      <span className="font-mono">{d.osint_telephone}</span>
                      <span className="text-[10px] text-stone-500">perso</span>
                    </a>
                  )}
                  {d.tel_pro_via_entreprise && d.tel_pro_via_entreprise !== d.osint_telephone && (
                    <a href={`tel:${d.tel_pro_via_entreprise}`} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-200">
                      <Phone className="h-3 w-3" />
                      <span className="font-mono">{d.tel_pro_via_entreprise}</span>
                      <span className="text-[10px] text-amber-700">pro (via société)</span>
                    </a>
                  )}
                  {d.osint_email && (
                    <a href={`mailto:${d.osint_email}`} className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-stone-800 hover:bg-stone-200">
                      <Mail className="h-3 w-3" />
                      {d.osint_email}
                    </a>
                  )}
                  {d.email_pro_via_entreprise && d.email_pro_via_entreprise !== d.osint_email && (
                    <a href={`mailto:${d.email_pro_via_entreprise}`} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-200">
                      <Mail className="h-3 w-3" />
                      {d.email_pro_via_entreprise}
                      <span className="text-[10px] text-amber-700">pro</span>
                    </a>
                  )}
                  {d.osint_linkedin && (
                    <a href={d.osint_linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 hover:bg-emerald-100">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {d.osint_adresse_perso && (
                  <p className="mt-2 text-xs text-stone-500">Adresse personnelle : {d.osint_adresse_perso}</p>
                )}
              </div>
            </div>
          </section>

          {/* Édition employé */}
          <EditPanel d={d} editing={editing} setEditing={setEditing} update={update} />

          {/* SCI dirigées */}
          {data.sci_details && data.sci_details.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
                <Building2 className="h-4 w-4 text-emerald-700" />
                SCI / sociétés dirigées ({data.sci_details.length})
              </h2>
              <div className="space-y-2">
                {data.sci_details.map((s) => (
                  <Link
                    key={s.siren}
                    to={`/employe/leads/entreprise/${s.siren}`}
                    className="block rounded-md border border-stone-200 bg-stone-50/40 p-3 hover:bg-stone-50 hover:border-stone-300"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-stone-900">{s.denomination ?? s.siren}</span>
                      <span className="font-mono text-[10px] text-stone-500">SIREN {s.siren}</span>
                      {s.forme_juridique && (
                        <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] text-stone-700">{s.forme_juridique}</span>
                      )}
                      {!s.is_active && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-900">Radiée</span>
                      )}
                      {s.has_deceased_dirigeant && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-900">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Décès co-dirigeant
                        </span>
                      )}
                      {s.nb_dpe_owned > 0 && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                          <Home className="h-3 w-3" />
                          {s.nb_dpe_owned} DPE
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-stone-600">
                      {s.commune && <span>{s.commune}</span>}
                      {s.date_creation && <span> · Créée {new Date(s.date_creation).toLocaleDateString('fr-FR')}</span>}
                      {s.activite_libelle && <span className="block truncate">{s.activite_libelle}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Autres entreprises (pivot rentable — hors SCI) */}
          {d.autres_entreprises && d.autres_entreprises.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50/30 p-5">
              <h2 className="mb-1 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-900">
                <Briefcase className="h-4 w-4" />
                Autres entreprises (hors SCI) — {d.autres_entreprises.length}
              </h2>
              <p className="mb-3 text-xs text-amber-800/80">
                Pivot contact pro : ces sociétés dirigées par {d.prenom} {d.nom} peuvent avoir un téléphone ou email public utilisable pour le contacter.
              </p>
              <div className="space-y-2">
                {d.autres_entreprises.map((e) => (
                  <a
                    key={e.siren}
                    href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${e.siren}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-amber-200/60 bg-white p-3 hover:bg-amber-50 hover:border-amber-300"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-stone-900">{e.denomination ?? e.siren}</span>
                      <span className="font-mono text-[10px] text-stone-500">SIREN {e.siren}</span>
                      {e.nature_juridique && (
                        <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] text-stone-700">NJ {e.nature_juridique}</span>
                      )}
                      {e.etat_administratif === 'C' && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-900">Cessée</span>
                      )}
                      <ExternalLink className="ml-auto h-3 w-3 text-stone-400" />
                    </div>
                    <div className="mt-1 text-xs text-stone-600">
                      {e.activite_principale && <span className="font-mono text-[10px] text-stone-500">{e.activite_principale}</span>}
                      {e.siege_adresse && (
                        <span className="block truncate">
                          {e.siege_adresse}
                          {e.siege_code_postal && ` · ${e.siege_code_postal} ${e.siege_commune ?? ''}`}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
              {d.autres_entreprises_enriched_at && (
                <p className="mt-3 text-[10px] italic text-amber-700/70">
                  Enrichi le {new Date(d.autres_entreprises_enriched_at).toLocaleDateString('fr-FR')} via recherche-entreprises.data.gouv.fr (gratuit)
                </p>
              )}
            </section>
          )}

          {/* DPE détenus */}
          {data.dpe_detenus && data.dpe_detenus.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
                <Home className="h-4 w-4 text-emerald-700" />
                DPE F/G détenus via les SCI ({data.dpe_detenus.length})
              </h2>
              <ul className="space-y-1">
                {data.dpe_detenus.slice(0, 12).map((dpe) => (
                  <li key={dpe.dpe_id} className="rounded-md border border-stone-100 bg-stone-50/40 p-2 text-xs">
                    <Link to={`/employe/leads/adresse/${dpe.dpe_id}`} className="font-medium text-stone-800 hover:underline">
                      {dpe.adresse}
                    </Link>
                    <span className="ml-2 text-stone-500">{dpe.code_postal} {dpe.commune}</span>
                    {dpe.etiquette_dpe && (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold ${dpe.etiquette_dpe === 'G' ? 'bg-red-200 text-red-900' : 'bg-orange-200 text-orange-900'}`}>
                        DPE {dpe.etiquette_dpe}
                      </span>
                    )}
                    {dpe.surface_habitable != null && (
                      <span className="ml-2 text-stone-600">{dpe.surface_habitable} m²</span>
                    )}
                  </li>
                ))}
                {data.dpe_detenus.length > 12 && (
                  <li className="text-xs italic text-stone-500">+ {data.dpe_detenus.length - 12} autres DPE</li>
                )}
              </ul>
            </section>
          )}

          {/* BODACC */}
          {data.bodacc_alerts && data.bodacc_alerts.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-700">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                BODACC ({data.bodacc_alerts.length})
              </h2>
              <ul className="space-y-1">
                {data.bodacc_alerts.slice(0, 8).map((b) => (
                  <li key={b.id_bodacc} className="rounded-md border border-amber-100 bg-amber-50/40 p-2 text-xs">
                    <span className="font-mono text-stone-500">{b.date_publication}</span>
                    {' · '}<span className="font-medium">{b.type_avis}</span>
                    {b.denomination && <span className="ml-2 text-stone-700">{b.denomination}</span>}
                    {b.bodacc_url && (
                      <a href={b.bodacc_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-amber-800 hover:underline">
                        source <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function EditPanel({ d, editing, setEditing, update }: {
  d: NonNullable<ReturnType<typeof useDirigeant360>['data']>['identity']
  editing: boolean
  setEditing: (b: boolean) => void
  update: ReturnType<typeof useUpdateDirigeant>
}) {
  const initial = d!
  const [form, setForm] = useState<DirigeantEditPatch>({
    osint_adresse_perso: initial.osint_adresse_perso ?? '',
    osint_telephone: initial.osint_telephone ?? '',
    osint_email: initial.osint_email ?? '',
    osint_linkedin: initial.osint_linkedin ?? '',
    employee_notes: initial.employee_notes ?? '',
    interet_brh: (initial.interet_brh as DirigeantEditPatch['interet_brh']) ?? null,
    derniere_visite_terrain: initial.derniere_visite_terrain ?? '',
  })

  function setField<K extends keyof DirigeantEditPatch>(k: K, v: DirigeantEditPatch[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save() {
    await update.mutateAsync(form)
    setEditing(false)
  }

  if (!editing) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800">Suivi commercial terrain</p>
            <p className="text-xs text-stone-500">
              {initial.interet_brh ? `Intérêt : ${initial.interet_brh}` : 'Pas encore qualifié'}
              {initial.derniere_visite_terrain && ` · dernière visite ${initial.derniere_visite_terrain}`}
            </p>
            {initial.employee_notes && (
              <p className="mt-1 line-clamp-2 text-xs italic text-stone-700">"{initial.employee_notes}"</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
          >
            <Pencil className="h-3 w-3" />
            Mettre à jour
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-emerald-300 bg-emerald-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-800">Mise à jour fiche dirigeant</p>
        <button type="button" onClick={() => setEditing(false)} className="text-stone-500 hover:text-stone-900">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Téléphone personnel">
          <input type="tel" value={form.osint_telephone ?? ''} onChange={(e) => setField('osint_telephone', e.target.value)} className="input" placeholder="06 ..." />
        </Field>
        <Field label="Email">
          <input type="email" value={form.osint_email ?? ''} onChange={(e) => setField('osint_email', e.target.value)} className="input" />
        </Field>
        <Field label="LinkedIn (URL)" full>
          <input type="url" value={form.osint_linkedin ?? ''} onChange={(e) => setField('osint_linkedin', e.target.value)} className="input" placeholder="https://linkedin.com/in/..." />
        </Field>
        <Field label="Adresse personnelle" full>
          <input type="text" value={form.osint_adresse_perso ?? ''} onChange={(e) => setField('osint_adresse_perso', e.target.value)} className="input" />
        </Field>
        <Field label="Intérêt commercial" full>
          <div className="flex flex-wrap gap-1.5">
            {INTERET_OPTIONS.map((o) => {
              const active = form.interet_brh === o.v
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setField('interet_brh', o.v)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${active ? `${o.cls} ring-2 ring-offset-1 ring-emerald-700` : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-100'}`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Dernière visite terrain">
          <input type="date" value={form.derniere_visite_terrain ?? ''} onChange={(e) => setField('derniere_visite_terrain', e.target.value)} className="input" />
        </Field>
        <Field label="Notes commerciales" full>
          <textarea value={form.employee_notes ?? ''} onChange={(e) => setField('employee_notes', e.target.value)} rows={3} className="input w-full" />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">Annuler</button>
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer
        </button>
      </div>
      <style>{`
        .input { border: 1px solid rgb(214 211 209); border-radius: 0.375rem; background: white; padding: 0.375rem 0.625rem; font-size: 0.875rem; }
        .input:focus { outline: 2px solid rgb(4 120 87); outline-offset: -1px; }
      `}</style>
    </section>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-stone-600">{label}</span>
      {children}
    </label>
  )
}
