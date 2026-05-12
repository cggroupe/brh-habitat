/**
 * Phase 13.6.4 — Dashboard artisan (vue inverse).
 *
 * L'artisan se connecte avec son compte BRH (profile_id lié à brh_artisans_rge)
 * et voit ses leads reçus + boutons accept/decline/quote/sign/complete.
 *
 * Si user pas lié à un artisan : message d'invitation (Phase 13.6.5 magic link).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Wrench,
  Loader,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  MapPin,
  Star,
  Award,
  ArrowRight,
  Euro,
} from 'lucide-react'
import {
  useMyArtisan,
  useMyLeadsReceived,
  useRespondToLead,
} from '@/hooks/queries/artisan-portal'
import { useMyCompany } from '@/hooks/queries'
import { useAuth } from '@/hooks/useAuth'
import type { LeadAction } from '@/api/artisan-portal'

const STATUS_LABELS: Record<string, string> = {
  pending: 'À traiter',
  accepted: 'Acceptée',
  declined: 'Refusée',
  quoted: 'Devis envoyé',
  signed: 'Chantier signé',
  completed: 'Chantier terminé',
  canceled: 'Annulé',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  accepted: 'bg-blue-100 text-blue-900 border-blue-300',
  declined: 'bg-red-100 text-red-900 border-red-300',
  quoted: 'bg-purple-100 text-purple-900 border-purple-300',
  signed: 'bg-green-100 text-green-900 border-green-300',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  canceled: 'bg-gray-100 text-gray-700 border-gray-300',
}

const GESTES_LABELS: Record<string, string> = {
  pac_air_eau: 'PAC air-eau',
  pac_eau_eau: 'PAC eau-eau',
  pac_air_air: 'PAC air-air',
  isolation_combles_perdus: 'Isolation combles perdus',
  isolation_combles_amenages: 'Isolation combles aménagés',
  isolation_murs_ite: 'Isolation murs ITE',
  isolation_murs_iti: 'Isolation murs ITI',
  isolation_plancher_bas: 'Isolation plancher bas',
  fenetres_double_vitrage: 'Fenêtres double vitrage',
  fenetres_triple_vitrage: 'Fenêtres triple vitrage',
  porte_isolante: 'Porte isolante',
  vmc_double_flux: 'VMC double flux',
  vmc_simple_flux: 'VMC simple flux',
  chauffage_bois_buche: 'Chauffage bois bûche',
  chauffage_bois_granules: 'Chauffage granulés',
  chauffage_solaire: 'Chauffage solaire',
  chauffe_eau_solaire: 'Chauffe-eau solaire',
  chauffe_eau_thermodynamique: 'Chauffe-eau thermo',
}

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '–'
  return `${Math.round(n).toLocaleString('fr-FR')} €`
}

function formatDate(s: string | null): string {
  if (!s) return '–'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ArtisanDashboard() {
  const { user } = useAuth()
  const { data: artisan, isLoading: aLoading } = useMyArtisan()
  const { data: leads, isLoading: lLoading } = useMyLeadsReceived()
  // Phase B 2026-05-08 — détecte si l'user a aussi un compte Pro (brh_companies)
  // pour proposer la fusion d'espaces (suggérer /pro qui contient tout).
  const { data: company } = useMyCompany(user?.id)
  const respond = useRespondToLead()
  const [actionError, setActionError] = useState<string | null>(null)
  const [signingLeadId, setSigningLeadId] = useState<string | null>(null)
  const [signAmount, setSignAmount] = useState<string>('')

  const handleAction = async (leadId: string, action: LeadAction, opts?: { reason?: string; actualChantierEur?: number }) => {
    setActionError(null)
    try {
      const res = await respond.mutateAsync({ leadId, action, ...opts })
      if (!res.success) {
        setActionError(res.message)
        toast.error('Action impossible', { description: res.message })
        return
      }
      const labels: Record<LeadAction, string> = {
        accept: 'Lead accepté',
        decline: 'Lead refusé',
        quote: 'Devis enregistré',
        sign: 'Chantier signé',
        complete: 'Chantier marqué terminé',
        cancel: 'Lead annulé',
      }
      toast.success(labels[action] ?? 'Action enregistrée')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setActionError(msg)
      toast.error('Erreur', { description: msg })
    }
  }

  // État : pas connecté ou pas d'artisan lié
  if (aLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Wrench className="h-6 w-6 text-amber-700" /> Espace artisan BRH
        </h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" /> Compte non lié à un artisan
          </div>
          <p className="text-xs leading-relaxed">
            Votre compte BRH n&apos;est pas encore lié à un profil artisan dans notre annuaire RGE.
            Si vous êtes un artisan RGE breton et avez reçu un lien d&apos;invitation, suivez les
            instructions de l&apos;email. Sinon, contactez-nous à{' '}
            <a href="mailto:contact@brh-habitat.fr" className="underline">
              contact@brh-habitat.fr
            </a>{' '}
            avec votre numéro SIRET pour être ajouté à la marketplace.
          </p>
          <div className="mt-3 text-xs italic">
            Phase 13.6.5 (à venir) : onboarding via magic link sans password.
          </div>
        </div>
      </div>
    )
  }

  const stats = leads
    ? {
        total: leads.length,
        pending: leads.filter((l) => l.status === 'pending').length,
        active: leads.filter((l) => ['accepted', 'quoted'].includes(l.status)).length,
        signed: leads.filter((l) => l.status === 'signed' || l.status === 'completed').length,
        completed: leads.filter((l) => l.status === 'completed').length,
      }
    : { total: 0, pending: 0, active: 0, signed: 0, completed: 0 }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Banner si l'user a aussi un compte Pro : on l'oriente vers le portail unique. */}
      {company && (
        <Link
          to="/pro"
          className="block rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:border-emerald-300 hover:bg-emerald-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <ArrowRight size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-900">
                Vous avez aussi accès à votre espace Professionnel
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Retrouvez la prospection DPE, le chiffrage IA, le réseau pro et le marketplace chantiers.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 underline shrink-0">
              Aller à mon espace Pro
            </span>
          </div>
        </Link>
      )}

      {/* Top nav artisan */}
      <div className="flex items-center justify-end">
        <Link
          to="/artisan/factures"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
        >
          <Euro className="h-3 w-3" /> Mes factures BRH
        </Link>
      </div>

      {/* Header artisan */}
      <div className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Wrench className="h-6 w-6 text-amber-700" />
              {artisan.nom_entreprise}
              {artisan.marketplace_premium && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  <Award className="h-3 w-3" /> Premium
                </span>
              )}
            </h1>
            <p className="mt-1 flex items-center gap-3 text-sm text-gray-600">
              {artisan.representant && <span>{artisan.representant}</span>}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {artisan.commune} ({artisan.code_postal})
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {artisan.geste_specialites.slice(0, 6).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-900"
                >
                  {GESTES_LABELS[g] ?? g}
                </span>
              ))}
              {artisan.geste_specialites.length > 6 && (
                <span className="text-[10px] text-gray-500">
                  +{artisan.geste_specialites.length - 6}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {artisan.score_qualite !== null && (
              <>
                <div className="flex items-center justify-end gap-1 text-amber-600">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-bold">{artisan.score_qualite}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
                {artisan.taux_conversion_brh !== null && (
                  <div className="mt-1 flex items-center justify-end gap-1 text-xs text-green-700">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round((artisan.taux_conversion_brh ?? 0) * 100)}% conversion
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero alert quand des leads sont à traiter — cf audit-ux-2026-05-12 #9.
         L'artisan arrive pour traiter les pending, pas pour lire les stats. */}
      {stats.pending > 0 && (
        <div className="rounded-2xl border border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/60 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="font-bold text-base text-amber-900 leading-tight">
                {stats.pending} lead{stats.pending > 1 ? 's' : ''} à traiter
              </p>
              <p className="text-[13px] text-amber-800/80 mt-0.5">
                Acceptez ou refusez rapidement — les pros RGE attendent votre retour pour engager le chantier
              </p>
            </div>
          </div>
          <a
            href="#leads-list"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 transition"
          >
            Voir mes leads ↓
          </a>
        </div>
      )}

      {/* KPI stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total leads" value={stats.total} color="gray" />
        <KpiCard label="À traiter" value={stats.pending} color="yellow" />
        <KpiCard label="Actifs" value={stats.active} color="blue" />
        <KpiCard label="Chantiers signés" value={stats.signed} color="green" />
        <KpiCard label="Terminés" value={stats.completed} color="emerald" />
      </div>

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Erreur
          </div>
          <div className="mt-1 text-xs">{actionError}</div>
        </div>
      )}

      {/* Liste leads */}
      <div id="leads-list" className="scroll-mt-6">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Leads reçus</h2>
        {lLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !leads || leads.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
            <Wrench className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <div className="font-medium">Aucun lead pour l&apos;instant</div>
            <p className="mt-1 text-xs">
              Les pros RGE BRH vous recommanderont des prospects bretons en fonction de vos
              spécialités. Vous recevrez un email à chaque nouveau lead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((l) => (
              <div
                key={l.id}
                className={`rounded-lg border-2 bg-white p-4 ${
                  l.status === 'pending' ? 'border-yellow-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[l.status] ?? STATUS_COLORS.pending
                        }`}
                      >
                        {STATUS_LABELS[l.status] ?? l.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Reçu le {formatDate(l.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-gray-900">
                      {GESTES_LABELS[l.geste] ?? l.geste}
                    </h3>
                    <p className="mt-1 text-sm text-gray-700">
                      📍 {l.prospect_adresse ?? '–'}, {l.prospect_commune ?? ''}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                      <div>
                        <div className="text-gray-500">DPE</div>
                        <div className="font-bold">
                          <span
                            className={`inline-block rounded px-1.5 text-white ${
                              l.prospect_etiquette === 'F' ? 'bg-orange-500' : 'bg-red-600'
                            }`}
                          >
                            {l.prospect_etiquette ?? '?'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Surface</div>
                        <div className="font-bold">
                          {l.prospect_surface ? `${Math.round(l.prospect_surface)} m²` : '–'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Chantier estimé</div>
                        <div className="font-bold">{formatEur(l.estimated_chantier_ttc_eur)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Recommandé par</div>
                        <div className="font-bold">{l.pro_full_name ?? 'BRH'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions selon status */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  {l.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(l.id, 'accept')}
                        disabled={respond.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3 w-3" /> Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(l.id, 'decline', { reason: 'Non disponible' })}
                        disabled={respond.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Refuser
                      </button>
                    </>
                  )}
                  {l.status === 'accepted' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(l.id, 'quote')}
                        disabled={respond.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                      >
                        <Clock className="h-3 w-3" /> Devis envoyé
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(l.id, 'cancel', { reason: 'Annulé' })}
                        disabled={respond.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Annuler
                      </button>
                    </>
                  )}
                  {l.status === 'quoted' && signingLeadId !== l.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setSigningLeadId(l.id)
                        setSignAmount(String(l.estimated_chantier_ttc_eur ?? 0))
                      }}
                      disabled={respond.isPending}
                      className="inline-flex items-center gap-1 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      <ArrowRight className="h-3 w-3" /> Marquer signé
                    </button>
                  )}
                  {l.status === 'quoted' && signingLeadId === l.id && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={signAmount}
                        onChange={(e) => setSignAmount(e.target.value)}
                        placeholder="Montant TTC"
                        className="w-32 rounded border-gray-300 text-xs"
                      />
                      <span className="text-xs text-gray-500">€</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleAction(l.id, 'sign', {
                            actualChantierEur: Number(signAmount) || undefined,
                          })
                          setSigningLeadId(null)
                        }}
                        disabled={respond.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigningLeadId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {l.status === 'signed' && (
                    <button
                      type="button"
                      onClick={() => handleAction(l.id, 'complete')}
                      disabled={respond.isPending}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" /> Marquer terminé
                    </button>
                  )}

                  {/* Contacts visibles uniquement si accepté+ */}
                  {['accepted', 'quoted', 'signed', 'completed'].includes(l.status) && (
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      <Link
                        to={`/pro/prospects/${l.prospect_id}`}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        Détail prospect →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <strong>Comment ça marche ?</strong>{' '}
        <span>
          Les pros RGE BRH vous recommandent des prospects bretons après audit énergétique. Vous
          recevez un email avec le contexte complet, vous acceptez ou refusez en 1 clic. Les
          contacts du prospect sont révélés après acceptation. BRH commission 5-10 % du chantier
          signé, payée mensuellement.
        </span>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: 'gray' | 'yellow' | 'blue' | 'green' | 'emerald' }) {
  const colors: Record<typeof color, string> = {
    gray: 'text-gray-700',
    yellow: 'text-yellow-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    emerald: 'text-emerald-700',
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${colors[color]}`}>{value}</div>
    </div>
  )
}
