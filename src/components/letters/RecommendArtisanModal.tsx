/**
 * Phase 13.6.2 — Modal "Recommander un artisan" pour un prospect.
 *
 * Workflow :
 *   1. Pro choisit un geste prioritaire (PAC, isolation, fenêtres, etc.)
 *   2. Modal charge le top 5 artisans matchés (Haversine + score qualité)
 *   3. Pro clique "Recommander cet artisan"
 *   4. Lead créé en DB → artisan reçoit le lead (Phase 13.6.3 : email auto)
 *
 * Cohérent avec workflow Phase 13 (post-courrier IA) ou Phase 13.5 (popup carte).
 */

import { useState } from 'react'
import {
  X,
  Loader,
  Wrench,
  Star,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Award,
  TrendingUp,
} from 'lucide-react'
import {
  useArtisanMatchForProspect,
  useCreateArtisanLead,
} from '@/hooks/queries/artisans-rge'
import type { GesteId } from '@/lib/dpe-engine/marketplace'
import type { ProspectBretagneRow } from '@/api/prospects-bretagne'

interface Props {
  prospect: ProspectBretagneRow
  onClose: () => void
  /** Si fourni, geste pré-sélectionné (ex: depuis le scénario d'audit). */
  initialGeste?: GesteId
}

const GESTES_LABELS: Record<GesteId, string> = {
  pac_air_eau: 'Pompe à chaleur air-eau',
  pac_eau_eau: 'PAC eau-eau (géothermie)',
  pac_air_air: 'PAC air-air',
  isolation_combles_perdus: 'Isolation combles perdus',
  isolation_combles_amenages: 'Isolation combles aménagés',
  isolation_murs_ite: 'Isolation murs ext. (ITE)',
  isolation_murs_iti: 'Isolation murs int. (ITI)',
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

const GESTES_PRIORITAIRES: GesteId[] = [
  'pac_air_eau',
  'isolation_combles_perdus',
  'isolation_murs_ite',
  'fenetres_double_vitrage',
  'vmc_double_flux',
  'chauffe_eau_thermodynamique',
]

export function RecommendArtisanModal({ prospect, onClose, initialGeste }: Props) {
  const [geste, setGeste] = useState<GesteId | ''>(initialGeste ?? '')
  const [recommended, setRecommended] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showAllGestes, setShowAllGestes] = useState(false)

  const dept = prospect.departement as '22' | '29' | '35' | '56' | undefined
  const matchQuery = useArtisanMatchForProspect({
    prospectLat: prospect.latitude,
    prospectLng: prospect.longitude,
    geste: geste || null,
    departement: dept,
  })

  const createLead = useCreateArtisanLead()

  const handleRecommend = async (artisanId: string) => {
    if (!geste) return
    setError(null)
    try {
      await createLead.mutateAsync({
        artisan_id: artisanId,
        prospect_id: prospect.id,
        geste,
      })
      setRecommended((prev) => new Set([...prev, artisanId]))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-700" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recommander un artisan</h2>
              <p className="text-xs text-gray-500">
                Prospect #{prospect.id} · {prospect.commune} · DPE {prospect.etiquette_dpe}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Sélecteur geste */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Geste prioritaire pour ce prospect
            </label>
            <div className="flex flex-wrap gap-2">
              {(showAllGestes ? (Object.keys(GESTES_LABELS) as GesteId[]) : GESTES_PRIORITAIRES).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGeste(g)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    geste === g
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {GESTES_LABELS[g]}
                </button>
              ))}
            </div>
            {!showAllGestes && (
              <button
                type="button"
                onClick={() => setShowAllGestes(true)}
                className="mt-2 text-xs text-blue-700 hover:text-blue-900"
              >
                Voir tous les gestes (18) →
              </button>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-semibold">Erreur</div>
                <div className="text-xs">
                  {error.includes('UNIQUE') || error.includes('duplicate')
                    ? 'Ce prospect a déjà été recommandé pour ce geste (anti-doublon).'
                    : error}
                </div>
              </div>
            </div>
          )}

          {/* Résultats matching */}
          {!geste && (
            <div className="rounded-md bg-amber-50 p-4 text-center text-sm text-amber-900">
              Sélectionnez un geste pour voir le top 5 artisans matchés (distance + score qualité).
            </div>
          )}

          {geste && matchQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {geste && matchQuery.data && matchQuery.data.length === 0 && (
            <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-900">
              <div className="font-semibold">Aucun artisan trouvé</div>
              <p className="mt-1 text-xs">
                Pas d&apos;artisan RGE matchant ce geste à proximité (rayon ~100 km Bretagne).
                Essayez un autre geste ou élargissez le département.
              </p>
            </div>
          )}

          {geste && matchQuery.data && matchQuery.data.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                <strong>{matchQuery.data.length}</strong> artisan(s) RGE matchés pour{' '}
                <strong>{GESTES_LABELS[geste]}</strong>, triés par score combiné (qualité × proximité).
              </div>
              {matchQuery.data.slice(0, 5).map((m, idx) => (
                <div
                  key={m.artisan.id}
                  className={`rounded-lg border-2 p-4 transition ${
                    m.artisan.marketplace_premium
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <h3 className="text-base font-bold text-gray-900">
                          {m.artisan.nom_entreprise}
                        </h3>
                        {m.artisan.marketplace_premium && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            <Award className="h-2.5 w-2.5" /> Premium
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {m.artisan.commune} ({m.artisan.code_postal})
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                          {m.distance_km.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold">
                          {m.artisan.score_qualite ?? 50}
                        </span>
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        score combiné <strong>{m.combined_score.toFixed(1)}</strong>
                      </div>
                      {(m.artisan.taux_conversion_brh ?? 0) > 0 && (
                        <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-green-700">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {Math.round((m.artisan.taux_conversion_brh ?? 0) * 100)}% conv.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact discret */}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {m.artisan.telephone && (
                      <a
                        href={`tel:${m.artisan.telephone}`}
                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-gray-700 hover:bg-gray-200"
                      >
                        <Phone className="h-3 w-3" /> {m.artisan.telephone}
                      </a>
                    )}
                    {m.artisan.email && (
                      <a
                        href={`mailto:${m.artisan.email}`}
                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-gray-700 hover:bg-gray-200"
                      >
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                  </div>

                  {/* Bouton recommander */}
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="text-[10px] text-gray-500">
                      Commission BRH ~5% si chantier signé
                    </div>
                    {recommended.has(m.artisan.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-900">
                        <CheckCircle className="h-3 w-3" /> Recommandé
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRecommend(m.artisan.id)}
                        disabled={createLead.isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                      >
                        {createLead.isPending ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        Recommander cet artisan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3">
          <div className="text-xs text-gray-500">
            {recommended.size > 0 && (
              <span className="text-green-700">
                ✓ {recommended.size} artisan(s) recommandé(s)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {recommended.size > 0 ? 'Terminer' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  )
}
