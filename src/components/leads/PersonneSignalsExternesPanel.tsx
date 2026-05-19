/**
 * PersonneSignalsExternesPanel — panel lazy qui charge les signaux externes
 * d'un contact BRH (DVF mutations, SCI décès, BODACC) et les présente.
 *
 * Chargé uniquement quand l'utilisateur clique « Voir signaux externes ».
 */
import { useState } from 'react'
import { Loader2, Home, Skull, Bell, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { usePersonneSignals } from '@/hooks/queries/usePersonneSignals'

interface Props {
  personneId: string
}

export function PersonneSignalsExternesPanel({ personneId }: Props) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = usePersonneSignals(open ? personneId : null)

  const nDvf = data?.dvf_mutations?.length ?? 0
  const nDeces = data?.sci_deces_matches?.length ?? 0
  const nBodacc = data?.bodacc_alerts?.length ?? 0
  const total = nDvf + nDeces + nBodacc

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
      >
        <span className="inline-flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Signaux externes (DVF · décès · BODACC)
          {open && data && (
            <span className="text-slate-500">— {total} résultats</span>
          )}
        </span>
        {open && isLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </button>

      {open && data && total === 0 && !isLoading && (
        <div className="px-2 py-1.5 text-[11px] italic text-slate-500">
          Aucun signal externe sur cette adresse / personne.
        </div>
      )}

      {open && data && (
        <div className="space-y-2 px-2 py-1.5">
          {nDvf > 0 && (
            <DvfBlock mutations={data.dvf_mutations} />
          )}
          {nDeces > 0 && (
            <SciDecesBlock matches={data.sci_deces_matches} />
          )}
          {nBodacc > 0 && (
            <BodaccBlock alerts={data.bodacc_alerts} />
          )}
        </div>
      )}
    </div>
  )
}

function DvfBlock({ mutations }: { mutations: NonNullable<ReturnType<typeof usePersonneSignals>['data']>['dvf_mutations'] }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
        <Home className="h-3 w-3" />
        Historique foncier (DVF) — {mutations.length}
      </div>
      <ul className="space-y-1">
        {mutations.slice(0, 6).map((m) => {
          const eur = m.valeur_fonciere_cents != null ? Math.round(m.valeur_fonciere_cents / 100) : null
          return (
            <li key={m.id} className="rounded bg-white/60 px-1.5 py-1 text-[11px] text-slate-700">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-slate-500">{m.date_mutation}</span>
                <span className="font-medium">{m.nature_mutation}</span>
                {m.type_local && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-700">
                    {m.type_local}
                  </span>
                )}
                {m.is_groupee && (
                  <span
                    className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-800"
                    title="Vente groupée ou VEFA — surface non détaillée par lot"
                  >
                    groupée
                  </span>
                )}
                {m.usable_for_brh && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-800">
                    exploitable
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                {eur != null && (
                  <span><b>{eur.toLocaleString('fr-FR')} €</b></span>
                )}
                {m.surface_reelle_bati != null && m.surface_reelle_bati > 0 ? (
                  <span>{m.surface_reelle_bati} m² bâti</span>
                ) : (
                  <span className="italic text-slate-400">surface non détaillée</span>
                )}
                {m.prix_m2_calc != null && (
                  <span>{m.prix_m2_calc.toLocaleString('fr-FR')} €/m²</span>
                )}
                {m.nombre_pieces_principales != null && m.nombre_pieces_principales > 0 && (
                  <span>{m.nombre_pieces_principales} pièces</span>
                )}
                {m.surface_terrain != null && m.surface_terrain > 0 && (
                  <span>terrain {m.surface_terrain} m²</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SciDecesBlock({ matches }: { matches: NonNullable<ReturnType<typeof usePersonneSignals>['data']>['sci_deces_matches'] }) {
  return (
    <div className="rounded-md border border-rose-300 bg-rose-50/80 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-900">
        <Skull className="h-3 w-3" />
        Succession potentielle (décès dirigeant SCI) — {matches.length}
      </div>
      <ul className="space-y-1">
        {matches.map((m) => (
          <li key={m.id} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{m.prenom} {m.nom}</span>
              {m.siren && (
                <span className="font-mono text-[9px] text-slate-500">SIREN {m.siren}</span>
              )}
              {m.match_confidence != null && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-800">
                  confiance {(m.match_confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-600">
              {m.date_naissance && <span>Né(e) le {m.date_naissance}. </span>}
              {m.deces_date && (
                <span className="font-medium text-rose-800">
                  Décès le {m.deces_date}
                  {m.deces_commune && ` à ${m.deces_commune}`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BodaccBlock({ alerts }: { alerts: NonNullable<ReturnType<typeof usePersonneSignals>['data']>['bodacc_alerts'] }) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50/70 p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-900">
        <Bell className="h-3 w-3" />
        Alertes BODACC — {alerts.length}
      </div>
      <ul className="space-y-1">
        {alerts.slice(0, 5).map((a) => (
          <li key={a.id_bodacc} className="rounded bg-white/70 px-1.5 py-1 text-[11px] text-slate-700">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-slate-500">{a.date_publication}</span>
              <span className="font-medium">{a.type_avis || a.famille_avis}</span>
              {a.bodacc_url && (
                <a
                  href={a.bodacc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-indigo-700 hover:underline"
                >
                  source <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-600">
              {a.denomination && <span><b>{a.denomination}</b> </span>}
              {a.forme_juridique && <span>({a.forme_juridique}) </span>}
              {a.prix_cession_cents != null && (
                <span>· Cession {(a.prix_cession_cents / 100).toLocaleString('fr-FR')} €</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
