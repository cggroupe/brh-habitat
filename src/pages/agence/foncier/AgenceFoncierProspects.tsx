/**
 * Phase 11.4 — Tableau Foncier Prospects.
 *
 * Vue tableau filtrable sur les 59 306 prospects DPE F/G enrichis avec
 * Filosofi + Enedis + GRDF + Géorisques + ANAH OPAH + Sit@del2 + Recensement
 * + LOVAC + TLV + audits ADEME + Mérimée + Natura 2000 + RNB.
 *
 * Filtres : département, score_v2 min, segment commercial, couleur MaPrimeRénov,
 * OPAH/PIG actif, RGA fort, zone tendue, commune dynamique audits, recherche texte.
 *
 * Pagination 50 par page, max 200/page. Export CSV de la page courante.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFoncierProspectsTable } from '@/hooks/queries/foncier-prospects-table'
import type {
  CouleurMpr,
  FoncierProspectRow,
  ScoreV2Segment,
} from '@/api/foncier-prospects-table'

const DEPTS = [
  { v: '', l: 'Tous' },
  { v: '22', l: '22 — Côtes-d’Armor' },
  { v: '29', l: '29 — Finistère' },
  { v: '35', l: '35 — Ille-et-Vilaine' },
  { v: '56', l: '56 — Morbihan' },
] as const

const SEGMENTS: ReadonlyArray<{ v: ScoreV2Segment | ''; l: string; cls: string }> = [
  { v: '', l: 'Tous', cls: 'border-slate-300 text-slate-700' },
  { v: 'ultra_chaud', l: 'Ultra-chaud', cls: 'border-red-300 text-red-800 bg-red-50' },
  { v: 'mpr_bleu_prio', l: 'MPR Bleu prioritaire', cls: 'border-sky-300 text-sky-800 bg-sky-50' },
  { v: 'standard', l: 'Standard', cls: 'border-amber-300 text-amber-800 bg-amber-50' },
]

const COULEURS_MPR: ReadonlyArray<{ v: CouleurMpr | ''; l: string }> = [
  { v: '', l: 'Toutes' },
  { v: 'bleu', l: 'Bleu (très modeste)' },
  { v: 'jaune', l: 'Jaune (modeste)' },
  { v: 'violet', l: 'Violet (intermédiaire)' },
  { v: 'rose', l: 'Rose (supérieur)' },
]

const PAGE_SIZE = 50

const SEGMENT_BADGE: Record<ScoreV2Segment, { label: string; cls: string }> = {
  ultra_chaud: { label: 'Ultra-chaud', cls: 'bg-red-50 text-red-800 border-red-200' },
  mpr_bleu_prio: { label: 'MPR Bleu prio', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  premium: { label: 'Premium', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  standard: { label: 'Standard', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  cold: { label: 'Faible potentiel', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const MPR_BADGE: Record<CouleurMpr, { label: string; cls: string }> = {
  bleu: { label: 'Bleu', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  jaune: { label: 'Jaune', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  violet: { label: 'Violet', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  rose: { label: 'Rose', cls: 'bg-pink-50 text-pink-800 border-pink-200' },
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'boolean' ? (value ? 'oui' : 'non') : String(value)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function exportCsv(rows: FoncierProspectRow[]) {
  const headers = [
    'id', 'adresse', 'commune', 'code_postal', 'departement', 'surface',
    'etiquette_dpe', 'annee_construction', 'conso_m2_ep', 'type_batiment',
    'score_v2', 'segment', 'couleur_mpr', 'decile_estime',
    'opah_active', 'opah_type', 'rga_alea', 'tlv_tendue', 'audits_ademe',
    'dvf_mutation_24m', 'dvf_prix_m2',
  ]
  const lines = [headers.join(';')]
  for (const r of rows) {
    lines.push([
      r.id, r.adresse, r.commune, r.code_postal, r.departement, r.surface,
      r.etiquette_dpe, r.annee_construction, r.conso_m2_ep, r.type_batiment,
      r.score_v2, r.score_v2_segment, r.couleur_mpr, r.decile_estime,
      r.opah_active, r.opah_type, r.rga_alea, r.tlv_tendue, r.audits_ademe_count,
      r.dvf_mutation_24m, r.dvf_prix_m2,
    ].map(escapeCsv).join(';'))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brh-foncier-prospects-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AgenceFoncierProspects() {
  const [dept, setDept] = useState<string>('')
  const [segment, setSegment] = useState<ScoreV2Segment | ''>('')
  const [scoreMin, setScoreMin] = useState(40)
  const [couleurMpr, setCouleurMpr] = useState<CouleurMpr | ''>('')
  const [opahOnly, setOpahOnly] = useState(false)
  const [rgaFortOnly, setRgaFortOnly] = useState(false)
  const [tlvTendueOnly, setTlvTendueOnly] = useState(false)
  const [auditsDynaOnly, setAuditsDynaOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filters = useMemo(
    () => ({
      dept: dept || undefined,
      segmentV2: segment || undefined,
      scoreV2Min: scoreMin > 0 ? scoreMin : undefined,
      couleurMpr: couleurMpr || undefined,
      opahOnly: opahOnly || undefined,
      rgaFortOnly: rgaFortOnly || undefined,
      tlvTendueOnly: tlvTendueOnly || undefined,
      auditsDynaOnly: auditsDynaOnly || undefined,
      search: search.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [dept, segment, scoreMin, couleurMpr, opahOnly, rgaFortOnly, tlvTendueOnly, auditsDynaOnly, search, page],
  )

  const { data: rows = [], isLoading, isFetching } = useFoncierProspectsTable(filters)
  const total = rows[0]?.total_count ?? 0
  const lastPage = Math.max(0, Math.ceil(Number(total) / PAGE_SIZE) - 1)

  function resetAndSetFilter(setter: () => void) {
    setter()
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Foncier — Prospects</h1>
        <p className="text-sm text-slate-600">
          59 306 logements DPE F/G en Bretagne, scorés Phase 11.3b sur 18 critères composites
          (Filosofi, Enedis, Géorisques, ANAH, Sit@del2, Recensement, LOVAC, TLV, audits ADEME, Mérimée).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-sm">
        {/* Ligne 1 — département + recherche */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-700">Département :</span>
          {DEPTS.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => resetAndSetFilter(() => setDept(d.v))}
              className={`px-2.5 py-1 rounded-md border font-medium text-[12px] transition ${
                dept === d.v
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {d.l}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => resetAndSetFilter(() => setSearch(e.target.value))}
              placeholder="Adresse ou commune…"
              className="px-3 py-1.5 border border-slate-200 rounded-md text-[13px] w-64 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {/* Ligne 2 — score + segment */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-700">Score v2 :</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scoreMin}
            onChange={(e) => resetAndSetFilter(() => setScoreMin(Number(e.target.value)))}
            className="w-32"
          />
          <span className="font-bold text-slate-800 tabular-nums w-10">≥ {scoreMin}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Segment :</span>
          {SEGMENTS.map((s) => (
            <button
              key={s.v}
              type="button"
              onClick={() => resetAndSetFilter(() => setSegment(segment === s.v ? '' : s.v))}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] border transition ${
                segment === s.v
                  ? `${s.cls} ring-1 ring-current`
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* Ligne 3 — couleur MPR + critères commune */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-700">Couleur MPR :</span>
          <select
            value={couleurMpr}
            onChange={(e) => resetAndSetFilter(() => setCouleurMpr(e.target.value as CouleurMpr | ''))}
            className="px-2 py-1 border border-slate-200 rounded-md text-[12px]"
          >
            {COULEURS_MPR.map((c) => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </select>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Critères commune :</span>
          {(
            [
              { k: opahOnly, set: setOpahOnly, l: 'OPAH/PIG actif' },
              { k: rgaFortOnly, set: setRgaFortOnly, l: 'Aléa argile fort' },
              { k: tlvTendueOnly, set: setTlvTendueOnly, l: 'Zone tendue' },
              { k: auditsDynaOnly, set: setAuditsDynaOnly, l: 'Commune dynamique' },
            ] as const
          ).map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => resetAndSetFilter(() => f.set(!f.k))}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] border transition ${
                f.k
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-300'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="text-sm text-slate-700">
            {isLoading ? (
              <span className="text-slate-500 italic">Chargement…</span>
            ) : (
              <>
                <span className="font-semibold tabular-nums">{Number(total).toLocaleString('fr-FR')}</span>
                <span className="text-slate-500"> prospect(s) — page {page + 1} / {lastPage + 1}</span>
              </>
            )}
            {isFetching && !isLoading && <span className="ml-2 text-slate-400 italic">↻</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCsv(rows)}
              disabled={rows.length === 0}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600 font-semibold text-left">
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Segment</th>
                <th className="px-3 py-2">Adresse</th>
                <th className="px-3 py-2">Commune</th>
                <th className="px-3 py-2">DPE</th>
                <th className="px-3 py-2">Surface</th>
                <th className="px-3 py-2">Année</th>
                <th className="px-3 py-2">Conso m²</th>
                <th className="px-3 py-2">MPR</th>
                <th className="px-3 py-2">OPAH</th>
                <th className="px-3 py-2">Risques</th>
                <th className="px-3 py-2">DVF</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const seg = r.score_v2_segment ? SEGMENT_BADGE[r.score_v2_segment] : null
                const mpr = r.couleur_mpr ? MPR_BADGE[r.couleur_mpr] : null
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold tabular-nums text-slate-900">{r.score_v2 ?? '—'}</td>
                    <td className="px-3 py-2">
                      {seg && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${seg.cls}`}>
                          {seg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate">{r.adresse ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.commune ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-[11px] ${
                          r.etiquette_dpe === 'F' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {r.etiquette_dpe}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 tabular-nums">{r.surface ? `${Math.round(r.surface)} m²` : '—'}</td>
                    <td className="px-3 py-2 text-slate-600 tabular-nums">{r.annee_construction ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600 tabular-nums">
                      {r.conso_m2_ep ? `${Math.round(r.conso_m2_ep)} kWh` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {mpr && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${mpr.cls}`}>
                          {mpr.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {r.opah_active ? (
                        <span className="text-emerald-700 font-semibold">{r.opah_type ?? 'OPAH'}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] space-x-1">
                      {r.rga_alea === 'fort' && (
                        <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px]">
                          RGA
                        </span>
                      )}
                      {r.radon_categorie === 3 && (
                        <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px]">
                          Radon 3
                        </span>
                      )}
                      {r.tlv_tendue && (
                        <span className="inline-block px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[10px]">
                          Tendue
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {r.dvf_mutation_24m ? (
                        <span className="text-rose-700 font-semibold">
                          Mutation 24m{r.dvf_prix_m2 ? ` (${r.dvf_prix_m2} €/m²)` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/agence/foncier/parcelle/${r.iris_code ?? ''}`}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px]"
                      >
                        Détail
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={13} className="px-3 py-12 text-center text-slate-500">
                    Aucun prospect ne correspond à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <span className="text-[12px] text-slate-600 tabular-nums">
            Page {page + 1} sur {lastPage + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
