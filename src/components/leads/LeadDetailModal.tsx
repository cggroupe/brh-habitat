/**
 * LeadDetailModal — slide-in panel détaillé d'un lead, RGPD-aware.
 *
 * Affiche toutes les sections accessibles selon le profil :
 *   - DPE (basic + détails techniques selon profil)
 *   - SCI / personne morale (info publique)
 *   - Succession (si profil autorisé)
 *   - DVF mutations
 *   - Scores intention (travaux / vente perso (BRH only) / succession)
 *   - Contacts (email/phone, BRH interne uniquement)
 *   - OSINT (BRH interne uniquement)
 */
import { X, Home, Building2, Skull, Phone, Wallet, FileText, Flame } from 'lucide-react'
import type { LeadRow } from '@/types/lead'
import { canSee, displayName, type LeadProfile } from '@/lib/rgpd/lead-visibility'

type Props = {
  lead: LeadRow
  profile: LeadProfile
  onClose: () => void
}

export default function LeadDetailModal({ lead, profile, onClose }: Props) {
  const isPersonneMorale = !!lead.owner_siren
  const ownerName = displayName(profile, lead.owner_name ?? null, isPersonneMorale)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {lead.adresse || 'Adresse inconnue'}
            </h2>
            <p className="text-xs text-slate-600">
              {lead.code_postal} {lead.commune} · {lead.departement}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-200"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Propriétaire */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Home className="h-4 w-4" />
              Propriétaire
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">{ownerName}</div>
              {isPersonneMorale && lead.owner_siren && (
                <div className="mt-0.5 text-xs text-slate-600">
                  SIREN {lead.owner_siren} · personne morale
                </div>
              )}
            </div>
          </section>

          {/* DPE */}
          {canSee(profile, 'dpe_basic') && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4" />
                DPE
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Classe</div>
                  <div className={`mt-0.5 inline-flex h-7 items-center rounded-md px-2 font-bold ${
                    ['F','G'].includes(String(lead.etiquette_dpe))
                      ? 'bg-red-100 text-red-800'
                      : ['D','E'].includes(String(lead.etiquette_dpe))
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-700'
                  }`}>{lead.etiquette_dpe ?? '?'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Surface</div>
                  <div className="font-medium">{lead.surface ?? '—'} m²</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Année construction</div>
                  <div className="font-medium">{lead.annee_construction ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Type bâtiment</div>
                  <div className="font-medium">{lead.type_batiment ?? '—'}</div>
                </div>
              </div>

              {/* Détails techniques (Ubat, isolation, ventilation) — selon profil */}
              {canSee(profile, 'dpe_details_techniques') && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="mb-1 font-semibold text-slate-700">Détails techniques</div>
                  <DetailRow label="Conso 5 usages /m²" value={lead.conso_m2_ep && `${lead.conso_m2_ep} kWh/m²·an`} />
                  <DetailRow label="Ubat" value={lead.ubat && `${lead.ubat} W/m²·K`} />
                  <DetailRow label="Isolation murs" value={lead.qualite_isolation_murs} />
                  <DetailRow label="Isolation menuiseries" value={lead.qualite_isolation_menuiseries} />
                  <DetailRow label="Plancher bas" value={lead.qualite_isolation_plancher_bas} />
                  <DetailRow label="Plancher haut" value={lead.qualite_isolation_plancher_haut} />
                  <DetailRow label="Ventilation" value={lead.type_ventilation} />
                  <DetailRow label="Chauffage" value={lead.description_chauffage} />
                  <DetailRow label="ECS" value={lead.description_ecs} />
                </div>
              )}
            </section>
          )}

          {/* SCI / Personne morale */}
          {canSee(profile, 'sci_info') && isPersonneMorale && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="h-4 w-4" />
                Société propriétaire
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm space-y-1">
                <DetailRow label="Dénomination" value={lead.owner_name} />
                <DetailRow label="SIREN" value={lead.owner_siren} />
                {canSee(profile, 'sci_dirigeants') && (
                  <DetailRow label="Type" value={lead.owner_type} />
                )}
              </div>
            </section>
          )}

          {/* Succession — détecté via dpe_saut_s1 (signal vente proche) */}
          {canSee(profile, 'sci_succession') && (lead.succession_active || lead.deces_date) && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
                <Skull className="h-4 w-4" />
                Succession / Vente proche probable
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <DetailRow label="Décès" value={lead.deces_date} />
                <DetailRow label="Score succession" value={lead.score_succession} />
              </div>
            </section>
          )}

          {/* Scoring */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Flame className="h-4 w-4 text-orange-500" />
              Signaux d'intention
            </div>
            <div className="space-y-2">
              {canSee(profile, 'score_intention_travaux') && lead.score_v2 != null && (
                <ScoreBar label="Travaux / rénovation" value={lead.score_v2} max={100} color="orange" />
              )}
              {canSee(profile, 'score_intention_vente_personnel') === true && lead.score_vente != null && (
                <ScoreBar label="Vente (interne BRH)" value={lead.score_vente} max={100} color="emerald" />
              )}
            </div>
          </section>

          {/* DVF historique */}
          {canSee(profile, 'dvf_mutations') && (lead.dvf_prix != null || lead.dvf_prix_m2 != null) && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wallet className="h-4 w-4" />
                DVF — Mutations
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">
                <DetailRow label="Dernière vente" value={lead.dvf_date} />
                <DetailRow label="Prix" value={lead.dvf_prix && `${lead.dvf_prix.toLocaleString('fr-FR')} €`} />
                <DetailRow label="Prix /m²" value={lead.dvf_prix_m2 && `${lead.dvf_prix_m2.toLocaleString('fr-FR')} €/m²`} />
              </div>
            </section>
          )}

          {/* Contacts (BRH interne uniquement) */}
          {(canSee(profile, 'particulier_phone') === true || canSee(profile, 'particulier_email') === true) && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Phone className="h-4 w-4" />
                Contacts (BRH interne)
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-1">
                {lead.telephone && (
                  <DetailRow label="Téléphone" value={
                    <a href={`tel:${lead.telephone}`} className="font-mono text-emerald-700 hover:underline">
                      {lead.telephone}
                    </a>
                  } />
                )}
                {lead.email && (
                  <DetailRow label="Email" value={
                    <a href={`mailto:${lead.email}`} className="text-sky-700 hover:underline">
                      {lead.email}
                    </a>
                  } />
                )}
              </div>
            </section>
          )}

          {/* Footer CTA externe — orientation vers BRH si pas d'accès aux contacts */}
          {canSee(profile, 'particulier_phone') !== true && !isPersonneMorale && (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <div className="text-sm font-medium text-slate-700">
                Vous souhaitez contacter ce propriétaire ?
              </div>
              <div className="mt-1 text-xs text-slate-600">
                BRH peut faciliter la mise en relation (conformité RGPD)
              </div>
              <button className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Demander à BRH
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  )
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: 'orange' | 'emerald' | 'red' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const bg = color === 'orange' ? 'bg-orange-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
