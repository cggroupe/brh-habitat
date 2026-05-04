/**
 * Phase R2 — Page `/pro/terrain` : tracking commercial terrain.
 *
 * Vue unifiée pour les commerciaux pro (owner + member) :
 *   - Map Leaflet avec 3 couches (prospects DPE, artisans RGE, agences immo)
 *   - Pins de visites coloriés par employé (anti-doublon : "qui est passé où")
 *   - Filtres : période, employé, statut, type cible
 *   - Drawer latéral : détail pin cliqué + bouton "Logger visite" + ContactButtons
 *
 * RLS : tous les membres d'une même company voient les visites de la company.
 * Admin BRH bypass.
 */
import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Loader, MapPin, Filter, Plus, Calendar, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { useFieldVisits } from '@/hooks/queries/field-visits'
import { useAgencesImmo } from '@/hooks/queries/agences-immo'
import { useMyMembership } from '@/hooks/queries/membership'
import { LogVisitModal } from '@/components/terrain/LogVisitModal'
import { ContactButtons } from '@/components/shared/ContactButtons'
import type {
  FieldVisitWithEmployee,
  VisitStatus,
  VisitTargetType,
} from '@/api/field-visits'
import { activeRegion } from '@/lib/tenant-region'

const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  planned: '#3b82f6', // bleu
  completed: '#10b981', // vert
  no_answer: '#f59e0b', // orange
  refused: '#dc2626', // rouge
  interested: '#8b5cf6', // violet
}

const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  planned: 'Planifiée',
  completed: 'Effectuée',
  no_answer: 'Pas de réponse',
  refused: 'Refusée',
  interested: 'Intéressé(e)',
}

const TARGET_LABELS: Record<VisitTargetType, string> = {
  prospect_dpe: 'Prospect',
  artisan: 'Artisan RGE',
  agence_immo: 'Agence immo',
}

/** Couleur stable par employé (hash → palette 8 couleurs). */
const EMPLOYEE_PALETTE = [
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
]
function colorForEmployee(employeeId: string): string {
  let hash = 0
  for (let i = 0; i < employeeId.length; i++) hash = (hash * 31 + employeeId.charCodeAt(i)) >>> 0
  return EMPLOYEE_PALETTE[hash % EMPLOYEE_PALETTE.length]
}

export default function ProTerrain() {
  const { data: membership } = useMyMembership()
  const companyId = membership?.companyId

  const [filterStatus, setFilterStatus] = useState<VisitStatus | 'all'>('all')
  const [filterEmployee, setFilterEmployee] = useState<string | 'all'>('all')
  const [filterTarget, setFilterTarget] = useState<VisitTargetType | 'all'>('all')
  const [selectedPin, setSelectedPin] = useState<FieldVisitWithEmployee | null>(null)
  const [logModalOpen, setLogModalOpen] = useState(false)

  const visitsQuery = useFieldVisits({
    companyId,
    status: filterStatus === 'all' ? undefined : filterStatus,
    employeeId: filterEmployee === 'all' ? undefined : filterEmployee,
    targetType: filterTarget === 'all' ? undefined : filterTarget,
    limit: 500,
  })
  // On charge les agences pour les afficher en arrière-plan (layer agences).
  const agencesQuery = useAgencesImmo({ limit: 500 })

  const visits = useMemo(() => visitsQuery.data ?? [], [visitsQuery.data])
  const agences = useMemo(() => agencesQuery.data ?? [], [agencesQuery.data])

  /** Liste unique d'employés vus dans les visites (pour le filtre). */
  const employeesList = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string }>()
    for (const v of visits) {
      if (v.employee?.id && !map.has(v.employee.id)) {
        map.set(v.employee.id, { id: v.employee.id, full_name: v.employee.full_name ?? '—' })
      }
    }
    return Array.from(map.values())
  }, [visits])

  if (!companyId) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <MapPin className="mx-auto mb-4 text-gray-400" size={48} />
        <h2 className="text-lg font-semibold mb-2">Aucune entreprise rattachée</h2>
        <p className="text-sm text-gray-600">
          Le tracking terrain est réservé aux pros membres d'une entreprise. Crée
          ou rejoins ta company depuis <a href="/pro/profil" className="text-primary underline">Mon entreprise</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header + filtres */}
      <header className="bg-white border-b px-4 py-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold flex items-center gap-2 mr-4">
          <MapPin size={20} className="text-primary" /> Terrain
        </h1>

        <div className="flex items-center gap-2 text-sm">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as VisitStatus | 'all')}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(VISIT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value as VisitTargetType | 'all')}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value="all">Toutes cibles</option>
            {Object.entries(TARGET_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value="all">Tous employés</option>
            {employeesList.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            {agences.length} agences
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {visits.length} visites
          </span>
        </div>
      </header>

      {/* Map + sidebar */}
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          {visitsQuery.isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/70">
              <Loader className="animate-spin text-primary" />
            </div>
          ) : null}
          <MapContainer
            center={[activeRegion.centerLat, activeRegion.centerLng]}
            zoom={activeRegion.defaultZoom}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Layer agences (pins jaunes) */}
            {agences
              .filter((a) => a.latitude && a.longitude)
              .map((a) => (
                <CircleMarker
                  key={`agence-${a.id}`}
                  center={[a.latitude!, a.longitude!]}
                  radius={6}
                  pathOptions={{
                    color: '#ca8a04',
                    fillColor: '#fbbf24',
                    fillOpacity: 0.7,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[200px]">
                      <p className="font-semibold">{a.raison_sociale}</p>
                      {a.commune ? (
                        <p className="text-gray-600">
                          {a.code_postal} {a.commune}
                        </p>
                      ) : null}
                      <ContactButtons email={a.email} phone={a.telephone} size="sm" />
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* Layer visites (pins coloriés par employé) */}
            {visits
              .filter((v) => v.lat != null && v.lng != null)
              .map((v) => {
                const color = colorForEmployee(v.employee_id)
                return (
                  <CircleMarker
                    key={`visit-${v.id}`}
                    center={[v.lat!, v.lng!]}
                    radius={8}
                    pathOptions={{
                      color,
                      fillColor: VISIT_STATUS_COLORS[v.status],
                      fillOpacity: 0.85,
                      weight: 3,
                    }}
                    eventHandlers={{
                      click: () => setSelectedPin(v),
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[180px]">
                        <p className="font-semibold">
                          {TARGET_LABELS[v.target_type]} ·{' '}
                          {VISIT_STATUS_LABELS[v.status]}
                        </p>
                        <p className="text-gray-600">
                          Par {v.employee?.full_name ?? '—'}
                        </p>
                        {v.completed_at ? (
                          <p className="text-gray-500">
                            {new Date(v.completed_at).toLocaleDateString('fr-FR')}
                          </p>
                        ) : null}
                        {v.notes ? <p className="italic">{v.notes}</p> : null}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
          </MapContainer>

          {/* FAB "Logger visite" */}
          <button
            onClick={() => setLogModalOpen(true)}
            className="absolute bottom-6 right-6 z-[400] w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark flex items-center justify-center transition"
            title="Logger une visite"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Drawer latéral détails pin sélectionné */}
        {selectedPin ? (
          <aside className="w-80 bg-white border-l overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Détails visite</h3>
              <button onClick={() => setSelectedPin(null)} aria-label="Fermer">
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <dl className="text-xs space-y-2">
              <div>
                <dt className="text-gray-500">Cible</dt>
                <dd className="font-medium">
                  {TARGET_LABELS[selectedPin.target_type]} · {selectedPin.target_id.slice(0, 8)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Employé</dt>
                <dd className="font-medium">{selectedPin.employee?.full_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Statut</dt>
                <dd>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-white text-xs"
                    style={{ background: VISIT_STATUS_COLORS[selectedPin.status] }}
                  >
                    {VISIT_STATUS_LABELS[selectedPin.status]}
                  </span>
                </dd>
              </div>
              {selectedPin.notes ? (
                <div>
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="bg-gray-50 p-2 rounded italic">{selectedPin.notes}</dd>
                </div>
              ) : null}
              {selectedPin.completed_at ? (
                <div>
                  <dt className="text-gray-500">Effectuée le</dt>
                  <dd>{new Date(selectedPin.completed_at).toLocaleString('fr-FR')}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
        ) : null}
      </div>

      <LogVisitModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        companyId={companyId}
        targetType="prospect_dpe"
        targetId="manual-entry"
        targetLabel="Saisie manuelle (depuis la carte)"
        onSuccess={() => visitsQuery.refetch()}
      />
    </div>
  )
}
