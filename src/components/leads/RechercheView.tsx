/**
 * Page recherche multi-entités — point d'entrée principal du graph BRH.
 *
 * Un seul champ recherche (adresse / SIREN / SCI / nom / ville / CP) qui
 * retourne 3 colonnes résultats groupées avec liens cliquables vers les
 * fiches drill-down. Pattern Karpathy : pivot unique.
 */
import { useState, useDeferredValue, useMemo } from 'react'
import { Search, MapPin, Building2, User, Loader2 } from 'lucide-react'
import { useRechercheMulti } from '@/hooks/queries/useRecherche'
import FicheEntityLink from './fiche/FicheEntityLink'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
  initialQuery?: string
}

export default function RechercheView({ profile, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const deferredQuery = useDeferredValue(query)
  const { data, isFetching, error } = useRechercheMulti(deferredQuery)

  const totalCount = useMemo(() => {
    if (!data) return 0
    return data.adresses.length + data.entreprises.length + data.dirigeants.length
  }, [data])

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-900">Recherche globale</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Adresse, SIREN, dénomination SCI, nom de propriétaire ou dirigeant, ville, code postal — tout est relié.
        </p>
        <div className="relative mt-4 max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tapez votre recherche…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Erreur recherche : {(error as Error).message}
            </div>
          )}

          {deferredQuery.length < 2 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Saisissez au moins 2 caractères pour lancer la recherche.
            </div>
          )}

          {deferredQuery.length >= 2 && !isFetching && totalCount === 0 && data && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Aucun résultat pour <b>{deferredQuery}</b>. Essayez un autre terme.
            </div>
          )}

          {data && totalCount > 0 && (
            <>
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{totalCount}</span> résultat
                {totalCount > 1 ? 's' : ''} pour <b>{data.query}</b>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Adresses */}
                <Column title="Adresses" icon={<MapPin className="h-4 w-4" />} count={data.adresses.length}>
                  {data.adresses.length === 0 && <Empty>Aucune adresse</Empty>}
                  {data.adresses.map((a) => (
                    <FicheEntityLink
                      key={a.id}
                      kind="adresse"
                      id={a.id}
                      label={a.adresse ?? `DPE #${a.id}`}
                      sublabel={`${a.code_postal ?? ''} ${a.commune ?? ''}${
                        a.etiquette_dpe ? ` · DPE ${a.etiquette_dpe}` : ''
                      }${a.score_v2 != null ? ` · score ${a.score_v2}` : ''}${
                        a.owner_name ? ` · ${a.owner_name}` : ''
                      }`}
                      profile={profile}
                      variant="row"
                    />
                  ))}
                </Column>

                {/* Entreprises */}
                <Column
                  title="Entreprises / SCI"
                  icon={<Building2 className="h-4 w-4" />}
                  count={data.entreprises.length}
                >
                  {data.entreprises.length === 0 && <Empty>Aucune entreprise</Empty>}
                  {data.entreprises.map((e) => (
                    <FicheEntityLink
                      key={e.siren}
                      kind="entreprise"
                      id={e.siren}
                      label={e.denomination}
                      sublabel={`SIREN ${e.siren}${e.commune ? ` · ${e.commune}` : ''}${
                        !e.is_active ? ' · radiée' : ''
                      }${e.has_deceased_dirigeant ? ' · succession probable' : ''}`}
                      profile={profile}
                      variant="row"
                    />
                  ))}
                </Column>

                {/* Dirigeants */}
                <Column title="Dirigeants / personnes" icon={<User className="h-4 w-4" />} count={data.dirigeants.length}>
                  {data.dirigeants.length === 0 && <Empty>Aucun dirigeant</Empty>}
                  {data.dirigeants.map((d, i) => (
                    <FicheEntityLink
                      key={`${d.name}-${d.siren}-${i}`}
                      kind="personne"
                      id={encodeURIComponent(d.name)}
                      label={d.name + (d.est_decede ? ' †' : '')}
                      sublabel={`${d.qualite ?? 'Dirigeant'} · ${d.denomination}`}
                      profile={profile}
                      variant="row"
                    />
                  ))}
                </Column>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Column({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{count}</span>
      </header>
      <div className="space-y-1.5 p-3">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-3 text-xs text-slate-400">{children}</div>
}
