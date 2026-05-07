/**
 * Phase 19 Sprint B — Carte SCI (résultat de recherche ou détail).
 */
import { Building2, MapPin, Users, AlertCircle, Loader2, RefreshCcw, ShieldCheck, Calendar } from 'lucide-react'
import { useCheckDeces } from '@/hooks/queries/foncier-sci'
import type { SciCompany } from '@/api/foncier-sci'

interface SciCardProps {
  sci: SciCompany
  expanded?: boolean
  onToggle?: () => void
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const ageMs = Date.now() - d.getTime()
  return Math.floor(ageMs / (365.25 * 86_400_000))
}

function monthsBetween(dateIso: string): number {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return Infinity
  return Math.floor((Date.now() - d.getTime()) / (30.44 * 86_400_000))
}

function DecesBadge({ date }: { date: string }) {
  const decesDate = new Date(date)
  const monthsAgo = monthsBetween(date)
  const recentBadge =
    monthsAgo <= 6
      ? { label: 'TRÈS RÉCENT', cls: 'bg-red-600 text-white' }
      : monthsAgo <= 12
      ? { label: 'RÉCENT', cls: 'bg-orange-500 text-white' }
      : monthsAgo <= 24
      ? { label: 'RÉCENT 2 ANS', cls: 'bg-amber-500 text-white' }
      : null
  return (
    <>
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
        <Calendar size={10} />
        Décès {decesDate.toLocaleDateString('fr-FR')}
      </span>
      {recentBadge && (
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${recentBadge.cls}`}>
          {recentBadge.label}
        </span>
      )}
    </>
  )
}

export default function SciCard({ sci, expanded, onToggle }: SciCardProps) {
  const checkDeces = useCheckDeces()

  const successionBadge =
    sci.succession_probable_score >= 100
      ? { label: 'Succession quasi certaine', cls: 'bg-red-50 text-red-700 border-red-200' }
      : sci.succession_probable_score >= 50
      ? { label: 'Succession probable', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
      : sci.has_deceased_dirigeant
      ? { label: 'Décès détecté', cls: 'bg-slate-50 text-slate-700 border-slate-200' }
      : null

  const lastChecked = sci.deces_last_checked_at
    ? new Date(sci.deces_last_checked_at).toLocaleDateString('fr-FR')
    : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 transition">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-3"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white shrink-0">
            <Building2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-slate-800 truncate">{sci.denomination}</p>
              {sci.forme_juridique && (
                <span className="text-[10px] uppercase tracking-wide font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {sci.forme_juridique}
                </span>
              )}
              {!sci.is_active && (
                <span className="text-[10px] uppercase tracking-wide font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                  Radiée
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 inline-flex items-center gap-2 flex-wrap">
              <code className="bg-slate-100 px-1 rounded text-[10px]">{sci.siren}</code>
              {sci.commune && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin size={10} />
                  {sci.commune}
                  {sci.code_postal && ` · ${sci.code_postal}`}
                </span>
              )}
              {sci.dirigeants.length > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Users size={10} />
                  {sci.dirigeants.length} dirigeant{sci.dirigeants.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
            {successionBadge && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${successionBadge.cls}`}
                >
                  <AlertCircle size={10} />
                  {successionBadge.label}
                  <span className="font-mono">· {sci.succession_probable_score}/100</span>
                </span>
                {sci.latest_deces_date && <DecesBadge date={sci.latest_deces_date} />}
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-400 shrink-0">{expanded ? '▾' : '▸'}</div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/30">
          {/* Dirigeants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Dirigeants ({sci.dirigeants.length})
              </h3>
              <button
                onClick={() => checkDeces.mutate(sci.siren)}
                disabled={checkDeces.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-semibold transition disabled:opacity-50"
                title="Re-vérifier le statut de chaque dirigeant via INSEE"
              >
                {checkDeces.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <ShieldCheck size={11} />
                )}
                Vérifier statut INSEE
              </button>
            </div>
            <ul className="space-y-1.5">
              {sci.dirigeants.length === 0 && (
                <li className="text-xs text-slate-400 italic">Aucun dirigeant personne physique</li>
              )}
              {sci.dirigeants.map((d, idx) => {
                const age = ageFromDob(d.date_naissance)
                const decesDateFmt = d.deces_date
                  ? new Date(d.deces_date).toLocaleDateString('fr-FR')
                  : null
                return (
                  <li
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      d.est_decede ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">
                        {d.prenom} {d.nom}
                        {d.est_decede && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                            Décédé · confiance {d.deces_match_score}%
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {d.qualite ?? 'Dirigeant'}
                        {d.date_naissance && (
                          <>
                            {' · '}né le {new Date(d.date_naissance).toLocaleDateString('fr-FR')}
                            {age !== null && ` (${age} ans)`}
                          </>
                        )}
                      </p>
                      {d.est_decede && decesDateFmt && (
                        <p className="text-[11px] text-red-700 inline-flex items-center gap-1 mt-1">
                          <Calendar size={10} />
                          Décès le <strong>{decesDateFmt}</strong>
                          {d.deces_commune && <span className="text-red-600">— {d.deces_commune}</span>}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {lastChecked && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                Vérification décès du {lastChecked}
              </p>
            )}
          </div>

          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
            {sci.adresse_complete && (
              <p className="col-span-2 inline-flex items-start gap-1">
                <MapPin size={11} className="text-slate-400 mt-0.5 shrink-0" />
                <span>{sci.adresse_complete}</span>
              </p>
            )}
            {sci.date_creation && (
              <p>
                <strong>Créée :</strong>{' '}
                {new Date(sci.date_creation).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'short',
                })}
              </p>
            )}
            {sci.capital_social_cents !== null && (
              <p>
                <strong>Capital :</strong>{' '}
                {(sci.capital_social_cents / 100).toLocaleString('fr-FR')} €
              </p>
            )}
            {sci.activite_libelle && (
              <p className="col-span-2 text-slate-500 italic">{sci.activite_libelle}</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <RefreshCcw size={10} className="text-slate-300 mr-1 mt-0.5" />
            <p className="text-[10px] text-slate-400">
              Source : recherche-entreprises.api.gouv.fr · Cache 30j ·{' '}
              {new Date(sci.fetched_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
