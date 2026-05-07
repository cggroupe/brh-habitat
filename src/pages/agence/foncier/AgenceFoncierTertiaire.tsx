/**
 * Phase 19 Sprint E — Page tertiaire `/agence/foncier/tertiaire`.
 *
 * BODACC alerts (ventes commerciales / liquidations / radiations)
 * + permis Sit@del2 par commune/dept.
 */
import { useState } from 'react'
import {
  Briefcase,
  AlertTriangle,
  TrendingDown,
  XCircle,
  ExternalLink,
  RefreshCcw,
  Loader2,
  Building,
  Calendar,
  MapPin,
  Euro,
} from 'lucide-react'
import { useBodaccCached, useRefreshBodacc, usePermis } from '@/hooks/queries/foncier-tertiaire'
import type { BodaccFamille } from '@/api/foncier-tertiaire'

const BRETAGNE_DEPTS = [
  { code: '22', label: '22 — Côtes-d\'Armor' },
  { code: '29', label: '29 — Finistère' },
  { code: '35', label: '35 — Ille-et-Vilaine' },
  { code: '56', label: '56 — Morbihan' },
  { code: '44', label: '44 — Loire-Atlantique' },
]

const FAMILLE_BADGE: Record<BodaccFamille, { label: string; cls: string; Icon: React.ElementType }> = {
  commerciales: {
    label: 'Vente commerciale',
    cls: 'bg-amber-100 text-amber-700 border-amber-200',
    Icon: Building,
  },
  collectives: {
    label: 'Procédure collective',
    cls: 'bg-red-100 text-red-700 border-red-200',
    Icon: AlertTriangle,
  },
  radiations: {
    label: 'Radiation RCS',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    Icon: XCircle,
  },
  autres: {
    label: 'Autre',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    Icon: TrendingDown,
  },
}

export default function AgenceFoncierTertiaire() {
  const [departement, setDepartement] = useState('29')
  const [famille, setFamille] = useState<BodaccFamille | 'all'>('all')
  const [tab, setTab] = useState<'bodacc' | 'permis'>('bodacc')

  const bodacc = useBodaccCached({
    departement,
    famille,
    days_back: 90,
    limit: 100,
  })
  const refreshBodacc = useRefreshBodacc()

  const permis = usePermis({
    departement,
    days_back: 365,
    limit: 100,
  })

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
          <Briefcase size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Tertiaire & permis</h1>
          <p className="text-sm text-slate-500">
            BODACC (ventes urgentes / liquidations / radiations) + permis de construire Sit@del2
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 flex-wrap">
        <select
          value={departement}
          onChange={(e) => setDepartement(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {BRETAGNE_DEPTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </select>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('bodacc')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              tab === 'bodacc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <AlertTriangle size={12} /> BODACC
            {bodacc.data && bodacc.data.length > 0 && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {bodacc.data.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('permis')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              tab === 'permis' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Calendar size={12} /> Permis
            {permis.data && permis.data.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {permis.data.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'bodacc' && (
          <>
            <select
              value={famille}
              onChange={(e) => setFamille(e.target.value as BodaccFamille | 'all')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tous types</option>
              <option value="commerciales">Ventes commerciales</option>
              <option value="collectives">Procédures collectives</option>
              <option value="radiations">Radiations</option>
            </select>
            <button
              onClick={() =>
                refreshBodacc.mutate({ departement, famille, days_back: 90, limit: 100 })
              }
              disabled={refreshBodacc.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition"
            >
              {refreshBodacc.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCcw size={12} />
              )}
              Rafraîchir BODACC
            </button>
          </>
        )}
      </div>

      {/* BODACC tab */}
      {tab === 'bodacc' && (
        <>
          {bodacc.isLoading && (
            <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>
          )}
          {!bodacc.isLoading && (bodacc.data ?? []).length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-8 text-center">
              <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Aucune alerte BODACC en cache</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Cliquez sur <strong>Rafraîchir BODACC</strong> pour interroger l'API officielle (90 derniers jours).
              </p>
            </div>
          )}

          <div className="space-y-2">
            {(bodacc.data ?? []).map((a) => {
              const badge = FAMILLE_BADGE[a.famille_avis] ?? FAMILLE_BADGE.autres
              const { Icon } = badge
              return (
                <div
                  key={a.id_bodacc}
                  className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${badge.cls}`}>
                        <Icon size={10} /> {badge.label}
                      </span>
                      {a.type_avis && (
                        <span className="text-[10px] text-slate-500">{a.type_avis}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(a.date_publication).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 mb-1">
                    {a.denomination ?? '(Entité non nommée)'}
                    {a.forme_juridique && (
                      <span className="ml-1.5 text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {a.forme_juridique}
                      </span>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {a.siren && (
                      <code className="bg-slate-100 px-1 rounded text-[10px]">{a.siren}</code>
                    )}
                    {a.commune && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin size={10} />
                        {a.commune}
                        {a.code_postal && ` · ${a.code_postal}`}
                      </span>
                    )}
                    {a.prix_cession_cents !== null && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-slate-700">
                        <Euro size={10} />
                        {(a.prix_cession_cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                      </span>
                    )}
                    {a.bodacc_url && (
                      <a
                        href={a.bodacc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-amber-600 hover:text-amber-700 inline-flex items-center gap-0.5 font-semibold"
                      >
                        Annonce BODACC <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Permis tab */}
      {tab === 'permis' && (
        <>
          {permis.isLoading && (
            <p className="text-sm text-slate-400 text-center py-8">Chargement…</p>
          )}
          {!permis.isLoading && (permis.data ?? []).length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-8 text-center">
              <Calendar size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Aucun permis en cache pour ce département</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                L'ingestion mensuelle Sit@del2 (CSV ~500 MB) sera réalisée par script standalone Sprint E.bis.
                Pour l'instant : table prête, données à charger.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {(permis.data ?? []).map((p) => (
              <div
                key={p.id_permis}
                className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-4 transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      {p.type_permis}
                    </span>
                    {p.decision && (
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                        p.decision === 'accorde' ? 'bg-emerald-50 text-emerald-700' :
                        p.decision === 'refuse' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.decision}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Dépôt : {new Date(p.date_depot).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <p className="font-semibold text-slate-800 text-sm mb-1">{p.id_permis}</p>
                {p.nature_travaux && (
                  <p className="text-xs text-slate-700 mb-1">{p.nature_travaux}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {p.commune && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={10} />
                      {p.commune}
                    </span>
                  )}
                  {p.surface_plancher_m2 !== null && (
                    <span>SP : {p.surface_plancher_m2} m²</span>
                  )}
                  {p.nombre_logements_crees !== null && p.nombre_logements_crees > 0 && (
                    <span>{p.nombre_logements_crees} logt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rounded-xl bg-amber-50/40 border border-amber-200/60 p-3 text-xs text-amber-900">
        <strong>Sources :</strong> BODACC (bodacc-datadila.opendatasoft.com — API officielle gratuite, 3 datasets) · Sit@del2 (data.gouv.fr CSV mensuel — ingestion Sprint E.bis pour V1+).
      </div>
    </div>
  )
}
