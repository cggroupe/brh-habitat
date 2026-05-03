/**
 * Phase 13.6 — Page marketplace artisans RGE bretons.
 *
 * Filtres : geste + département + code postal.
 * Liste triée par premium > score qualité.
 * Cartes artisan avec score, taux de conversion, gestes, contact.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
// `Link` est utilisé pour le lien "Mes recommandations" (haut) et l'état vide (en bas)
import {
  Wrench,
  Filter,
  X,
  Star,
  Phone,
  Mail,
  Globe,
  MapPin,
  TrendingUp,
  Loader,
  Award,
} from 'lucide-react'
import { useArtisansList } from '@/hooks/queries/artisans-rge'
import { useMyMembership } from '@/hooks/queries/membership'
import { LogVisitModal } from '@/components/terrain/LogVisitModal'
import { VisitHistoryList } from '@/components/terrain/VisitHistoryList'
import { Plus, ClipboardList } from 'lucide-react'
import type { GesteId } from '@/lib/dpe-engine/marketplace'

const GESTES_LABELS: Record<GesteId, string> = {
  pac_air_eau: 'PAC air-eau',
  pac_eau_eau: 'PAC eau-eau (géothermie)',
  pac_air_air: 'PAC air-air',
  isolation_combles_perdus: 'Isolation combles perdus',
  isolation_combles_amenages: 'Isolation combles aménagés',
  isolation_murs_ite: 'Isolation murs extérieure (ITE)',
  isolation_murs_iti: 'Isolation murs intérieure (ITI)',
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
  chauffe_eau_thermodynamique: 'Chauffe-eau thermodynamique',
}

const GESTES: GesteId[] = Object.keys(GESTES_LABELS) as GesteId[]

export default function ProMarketplaceArtisans() {
  const [geste, setGeste] = useState<GesteId | ''>('')
  const [dept, setDept] = useState<'22' | '29' | '35' | '56' | ''>('')
  const [showFilters, setShowFilters] = useState(true)
  const [logVisitFor, setLogVisitFor] = useState<{ id: string; label: string; lat: number | null; lng: number | null } | null>(null)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const { data: membership } = useMyMembership()

  const { data: artisans, isLoading } = useArtisansList({
    geste: geste || undefined,
    departement: dept || undefined,
    limit: 50,
  })

  const isEmpty = !isLoading && (!artisans || artisans.length === 0)

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wrench className="h-6 w-6 text-amber-700" /> Marketplace artisans RGE
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Recommandez le bon artisan local à vos prospects audités. Commission BRH 5-10 % en
            cas de chantier signé.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pro/mes-leads-artisans"
            className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            <Wrench className="h-4 w-4" /> Mes recommandations
          </Link>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" /> Filtres
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Geste / spécialité</span>
              <select
                value={geste}
                onChange={(e) => setGeste(e.target.value as GesteId | '')}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Toutes spécialités</option>
                {GESTES.map((g) => (
                  <option key={g} value={g}>
                    {GESTES_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Département</span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value as typeof dept)}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Toute la Bretagne</option>
                <option value="22">22 — Côtes-d&apos;Armor</option>
                <option value="29">29 — Finistère</option>
                <option value="35">35 — Ille-et-Vilaine</option>
                <option value="56">56 — Morbihan</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setGeste('')
                  setDept('')
                }}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <div className="font-semibold">Aucun artisan trouvé</div>
          <p className="mt-1 text-xs leading-relaxed">
            La marketplace est en cours de constitution. Les premiers artisans bretons RGE seront
            onboardés en Phase 13.6.1 (cron import depuis annuaire RGE ADEME +
            invitations partenaires). Vérifiez à nouveau dans quelques jours.
          </p>
          <Link
            to="/pro/prospects-bretagne"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            ← Retour à la liste prospects
          </Link>
        </div>
      )}

      {artisans && artisans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {artisans.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border-2 bg-white p-4 shadow-sm ${
                a.marketplace_premium ? 'border-amber-400' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{a.nom_entreprise}</h3>
                    {a.marketplace_premium && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                        <Award className="h-3 w-3" /> Premium
                      </span>
                    )}
                  </div>
                  {a.representant && (
                    <p className="text-xs text-gray-500">{a.representant}</p>
                  )}
                </div>
                {a.score_qualite !== null && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold">{a.score_qualite}</span>
                      <span className="text-xs text-gray-500">/100</span>
                    </div>
                    {a.taux_conversion_brh !== null && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-green-700">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round((a.taux_conversion_brh ?? 0) * 100)}% conv.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Adresse */}
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="h-3 w-3" />
                {a.code_postal} {a.commune} ({a.departement})
              </div>

              {/* Spécialités */}
              {a.geste_specialites.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {a.geste_specialites.slice(0, 5).map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-900"
                    >
                      {GESTES_LABELS[g as GesteId] ?? g}
                    </span>
                  ))}
                  {a.geste_specialites.length > 5 && (
                    <span className="text-[10px] text-gray-500">
                      +{a.geste_specialites.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-2 text-xs">
                <div>
                  <div className="text-gray-500">Chantiers BRH</div>
                  <div className="font-bold tabular-nums text-gray-900">
                    {a.nombre_chantiers_brh}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Chantiers total</div>
                  <div className="font-bold tabular-nums text-gray-900">
                    {a.nombre_chantiers_lifetime ?? a.nombre_chantiers_brh}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-xs">
                {a.telephone && (
                  <a
                    href={`tel:${a.telephone}`}
                    className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-900 hover:bg-green-200"
                  >
                    <Phone className="h-3 w-3" /> {a.telephone}
                  </a>
                )}
                {a.email && (
                  <a
                    href={`mailto:${a.email}`}
                    className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-blue-900 hover:bg-blue-200"
                  >
                    <Mail className="h-3 w-3" /> Email
                  </a>
                )}
                {a.site_web && (
                  <a
                    href={a.site_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-gray-900 hover:bg-gray-200"
                  >
                    <Globe className="h-3 w-3" /> Site web
                  </a>
                )}
                {membership?.companyId ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLogVisitFor({
                          id: a.id,
                          label: `${a.nom_entreprise} (${a.code_postal ?? ''} ${a.commune ?? ''})`.trim(),
                          lat: a.latitude,
                          lng: a.longitude,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20"
                    >
                      <Plus className="h-3 w-3" /> Logger visite
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFor((id) => (id === a.id ? null : a.id))}
                      className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-gray-900 hover:bg-gray-200"
                      aria-expanded={historyFor === a.id}
                    >
                      <ClipboardList className="h-3 w-3" /> Historique
                    </button>
                  </>
                ) : null}
              </div>

              {historyFor === a.id ? (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <VisitHistoryList
                    targetType="artisan"
                    targetId={a.id}
                    companyId={membership?.companyId}
                    compact
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal "Logger visite" depuis card artisan */}
      {logVisitFor && membership?.companyId ? (
        <LogVisitModal
          open={!!logVisitFor}
          onClose={() => setLogVisitFor(null)}
          companyId={membership.companyId}
          targetType="artisan"
          targetId={logVisitFor.id}
          targetLabel={logVisitFor.label}
          defaultLat={logVisitFor.lat}
          defaultLng={logVisitFor.lng}
          onSuccess={() => setLogVisitFor(null)}
        />
      ) : null}
    </div>
  )
}
