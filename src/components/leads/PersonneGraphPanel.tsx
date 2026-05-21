/**
 * PersonneGraphPanel — vue 360° d'un contact BRH via le graphe brh_entity_links.
 *
 * Charge en lazy (sur clic) brh_personne_360 et présente :
 *  - SCI dirigées (avec succession potentielle si dirigeant décédé)
 *  - Adresses DPE liées
 *  - Mutations DVF transitives (via adresses)
 *  - BODACC sur les SCI
 *  - Décès matchs (héritiers potentiels)
 *  - Résumé compteur de liens (badge avant ouverture)
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, ChevronDown, ChevronRight, ExternalLink,
  Building2, Home, AlertTriangle, Bell, Hash, MapPin,
} from 'lucide-react'
import { usePersonne360 } from '@/hooks/queries/usePersonne360'

interface Props {
  personneId: string
  profileBase: string
}

export function PersonneGraphPanel({ personneId, profileBase }: Props) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = usePersonne360(open ? personneId : null)

  const summary = data?.links_summary ?? {}
  const totalLinks = Object.values(summary).reduce((a, b) => a + b, 0)
  const n = {
    sci: data?.sci_dirigees.length ?? 0,
    adresses: data?.adresses_liees.length ?? 0,
    mutations: data?.mutations_dvf.length ?? 0,
    bodacc: data?.bodacc_alerts.length ?? 0,
    deces: data?.sci_deces_pairs.length ?? 0,
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
      >
        <span className="inline-flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Graphe 360°
          {!open && totalLinks > 0 && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px]">
              {totalLinks} liens
            </span>
          )}
          {open && data && (
            <span className="text-slate-500">
              — {n.sci} SCI · {n.adresses} adresses · {n.mutations} mutations · {n.bodacc} BODACC · {n.deces} succession
            </span>
          )}
        </span>
        {open && isLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </button>

      {open && data && (
        <div className="space-y-2 px-2 py-1.5">
          {n.sci === 0 && n.adresses === 0 && n.mutations === 0 && n.bodacc === 0 && n.deces === 0 && (
            <div className="text-[11px] italic text-slate-500">
              Aucun lien graphe trouvé pour ce contact. Lancer `brh_entity_links_recompute()` pour rafraîchir.
            </div>
          )}
          {n.sci > 0 && <SciBlock sci={data.sci_dirigees} profileBase={profileBase} />}
          {n.adresses > 0 && <AdressesBlock adresses={data.adresses_liees} profileBase={profileBase} />}
          {n.mutations > 0 && <MutationsBlock mutations={data.mutations_dvf} />}
          {n.bodacc > 0 && <BodaccBlock alerts={data.bodacc_alerts} />}
          {n.deces > 0 && <DecesBlock deces={data.sci_deces_pairs} />}
        </div>
      )}
    </div>
  )
}

function SciBlock({ sci, profileBase }: { sci: NonNullable<ReturnType<typeof usePersonne360>['data']>['sci_dirigees']; profileBase: string }) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-900">
        <Building2 className="h-3 w-3" />
        SCI / sociétés dirigées — {sci.length}
      </div>
      <ul className="space-y-1">
        {sci.map((s) => (
          <li key={s.siren} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <Link
                to={`${profileBase}/leads/entreprise/${s.siren}`}
                className="font-medium text-indigo-800 hover:underline"
              >
                {s.denomination || s.siren}
              </Link>
              <span className="font-mono text-[9px] text-slate-500">SIREN {s.siren}</span>
              {s.forme_juridique && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-700">
                  {s.forme_juridique}
                </span>
              )}
              {s.is_active === false && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-800">
                  radiée
                </span>
              )}
              {s.has_deceased_dirigeant && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-900">
                  succession
                </span>
              )}
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-800">
                conf. {(s.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
              {s.commune && <span><MapPin className="inline h-2.5 w-2.5" /> {s.commune}</span>}
              {s.activite_libelle && <span className="truncate max-w-[280px]">{s.activite_libelle}</span>}
              {s.capital_social_cents != null && (
                <span>Capital {(s.capital_social_cents / 100).toLocaleString('fr-FR')} €</span>
              )}
              {s.date_creation && <span>Créée {s.date_creation}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AdressesBlock({ adresses, profileBase }: { adresses: NonNullable<ReturnType<typeof usePersonne360>['data']>['adresses_liees']; profileBase: string }) {
  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-900">
        <Home className="h-3 w-3" />
        Adresses DPE liées — {adresses.length}
      </div>
      <ul className="space-y-1">
        {adresses.slice(0, 8).map((a) => (
          <li key={a.dpe_id} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <Link
                to={`${profileBase}/leads/adresse/${a.dpe_id}`}
                className="font-medium text-sky-800 hover:underline"
              >
                {a.adresse || `DPE ${a.dpe_id}`}
              </Link>
              {a.commune && (
                <span className="text-[10px] text-slate-500">{a.code_postal} {a.commune}</span>
              )}
              {a.etiquette_dpe && (
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  a.etiquette_dpe === 'F' || a.etiquette_dpe === 'G'
                    ? 'bg-red-200 text-red-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  DPE {a.etiquette_dpe}
                </span>
              )}
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-800">
                conf. {(a.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-slate-600">
              {a.surface_habitable != null && <span>{a.surface_habitable} m²</span>}
              {a.annee_construction != null && <span>Construction {a.annee_construction}</span>}
              {a.score_v2 != null && <span>Score {a.score_v2}</span>}
            </div>
          </li>
        ))}
        {adresses.length > 8 && (
          <li className="px-1.5 text-[10px] italic text-slate-500">
            + {adresses.length - 8} autres adresses…
          </li>
        )}
      </ul>
    </div>
  )
}

function MutationsBlock({ mutations }: { mutations: NonNullable<ReturnType<typeof usePersonne360>['data']>['mutations_dvf'] }) {
  const usable = mutations.filter((m) => m.usable_for_brh)
  const display = usable.length > 0 ? usable : mutations
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
        <Hash className="h-3 w-3" />
        Mutations DVF (via adresses) — {mutations.length}
        {usable.length > 0 && usable.length < mutations.length && (
          <span className="ml-1 text-amber-700">({usable.length} exploitables)</span>
        )}
      </div>
      <ul className="space-y-1">
        {display.slice(0, 6).map((m) => {
          const eur = m.valeur_fonciere_cents != null ? Math.round(m.valeur_fonciere_cents / 100) : null
          return (
            <li key={m.id} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-slate-500">{m.date_mutation}</span>
                <span className="font-medium">{m.nature_mutation}</span>
                {m.type_local && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px]">{m.type_local}</span>
                )}
                {m.is_groupee && (
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-800">groupée</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-slate-600">
                {eur != null && <span><b>{eur.toLocaleString('fr-FR')} €</b></span>}
                {m.surface_reelle_bati && m.surface_reelle_bati > 0 ? (
                  <span>{m.surface_reelle_bati} m²</span>
                ) : (
                  <span className="italic text-slate-400">surface non détaillée</span>
                )}
                {m.prix_m2_calc != null && <span>{m.prix_m2_calc.toLocaleString('fr-FR')} €/m²</span>}
                {m.adresse && <span className="truncate max-w-[220px]">{m.adresse}</span>}
              </div>
            </li>
          )
        })}
        {display.length > 6 && (
          <li className="px-1.5 text-[10px] italic text-slate-500">
            + {display.length - 6} autres mutations…
          </li>
        )}
      </ul>
    </div>
  )
}

function BodaccBlock({ alerts }: { alerts: NonNullable<ReturnType<typeof usePersonne360>['data']>['bodacc_alerts'] }) {
  return (
    <div className="rounded-md border border-purple-200 bg-purple-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-900">
        <Bell className="h-3 w-3" />
        BODACC sur SCI — {alerts.length}
      </div>
      <ul className="space-y-1">
        {alerts.slice(0, 5).map((a) => (
          <li key={a.id_bodacc} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-slate-500">{a.date_publication}</span>
              <span className="font-medium">{a.type_avis || a.famille_avis}</span>
              {a.denomination && <span className="text-[10px] text-slate-600">{a.denomination}</span>}
              {a.bodacc_url && (
                <a href={a.bodacc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-purple-700 hover:underline">
                  source <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {a.prix_cession_cents != null && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-900">
                  cession {(a.prix_cession_cents / 100).toLocaleString('fr-FR')} €
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DecesBlock({ deces }: { deces: NonNullable<ReturnType<typeof usePersonne360>['data']>['sci_deces_pairs'] }) {
  return (
    <div className="rounded-md border border-rose-300 bg-rose-50/80 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-900">
        <AlertTriangle className="h-3 w-3" />
        Succession potentielle — {deces.length}
      </div>
      <ul className="space-y-1">
        {deces.map((m, i) => (
          <li key={i} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{m.prenom} {m.nom}</span>
              {m.siren && <span className="font-mono text-[9px] text-slate-500">SIREN {m.siren}</span>}
              {m.match_confidence != null && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-800">
                  conf. {(m.match_confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-600">
              {m.date_naissance && <span>Né(e) {m.date_naissance}. </span>}
              {m.deces_date && (
                <span className="font-medium text-rose-800">
                  Décès {m.deces_date}{m.deces_commune && ` à ${m.deces_commune}`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
