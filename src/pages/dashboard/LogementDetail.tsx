import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatLocalDate } from '@/lib/utils'
import { ArrowLeft, Loader2, AlertCircle, Trash2, X } from 'lucide-react'
import {
  useHomeDetail, useUpdateHome, useDeleteHome,
  useHomeHealthRecords, useUpsertHealthRecord,
  useHomeWorkHistory, useCreateWorkEntry, useUpdateWorkEntry, useDeleteWorkEntry,
  useHomeDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument,
} from '@/hooks/queries'
import { useAppStore } from '@/stores/appStore'
import type { DpeRating, HealthDomain } from '@/types/database'
import { HealthTabNavigation, type CarnetTab } from '@/components/carnet/HealthTabNavigation'
import { HealthOverview } from '@/components/carnet/HealthOverview'
import { WorkHistoryList } from '@/components/carnet/WorkHistoryList'
import { DocumentsList } from '@/components/carnet/DocumentsList'
import { getUrgencyFromScore } from '@/lib/health'
import { LogementHeader } from './logement-detail/LogementHeader'
import { LogementInfosTab, type EditFormValues } from './logement-detail/LogementInfosTab'
import { LogementSidebar } from './logement-detail/LogementSidebar'
import type { BrhHomeRow } from '@/types/database'

interface DeleteModalProps {
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}

function DeleteModal({ onConfirm, onCancel, deleting }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h2 className="font-display text-base text-text-primary">Supprimer ce logement</h2>
          </div>
          <button onClick={onCancel} className="text-text-light hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="font-body text-sm text-text-secondary mb-6">
          Cette action est irréversible. Toutes les données associées (santé, travaux, documents) seront définitivement supprimées.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-light text-sm font-body text-text-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-body hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function homeToForm(home: BrhHomeRow): EditFormValues {
  return {
    address: home.address,
    city: home.city,
    postal_code: home.postal_code,
    property_type: home.property_type,
    surface: String(home.surface),
    year_built: String(home.year_built),
    floors: String(home.floors),
    heating_type: home.heating_type ?? '',
    insulation_type: home.insulation_type ?? '',
    dpe_rating: home.dpe_rating ?? '',
    notes: home.notes ?? '',
  }
}

export default function LogementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)

  const { data: home, isLoading, error } = useHomeDetail(id)
  const updateMutation = useUpdateHome()
  const deleteMutation = useDeleteHome()

  const { data: healthRecords = [] } = useHomeHealthRecords(id)
  const upsertHealth = useUpsertHealthRecord()
  const { data: workHistory = [] } = useHomeWorkHistory(id)
  const createWork = useCreateWorkEntry()
  const updateWork = useUpdateWorkEntry()
  const deleteWork = useDeleteWorkEntry()
  const { data: documents = [] } = useHomeDocuments(id)
  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const deleteDoc = useDeleteDocument()

  const [activeTab, setActiveTab] = useState<CarnetTab>('infos')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditFormValues | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  const inputCls =
    'w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors'

  function startEditing() {
    if (!home) return
    setForm(homeToForm(home))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setForm(null)
    setSaveError(null)
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => prev ? { ...prev, [e.target.name]: e.target.value } : prev)
  }

  function handleSave() {
    if (!form || !home) return
    setSaveError(null)
    if (!form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setSaveError('Adresse, ville et code postal sont obligatoires.')
      return
    }
    if (!form.surface || isNaN(Number(form.surface)) || Number(form.surface) <= 0) {
      setSaveError('La surface doit être un nombre positif.')
      return
    }
    updateMutation.mutate(
      {
        id: home.id,
        payload: {
          address: form.address.trim(),
          city: form.city.trim(),
          postal_code: form.postal_code.trim(),
          property_type: form.property_type,
          surface: Number(form.surface),
          year_built: Number(form.year_built),
          floors: Number(form.floors),
          heating_type: form.heating_type.trim() || null,
          insulation_type: form.insulation_type.trim() || null,
          dpe_rating: (form.dpe_rating as DpeRating) || null,
          notes: form.notes.trim() || null,
        },
      },
      {
        onSuccess: () => { setEditing(false); setForm(null) },
        onError: () => setSaveError("Impossible de sauvegarder les modifications."),
      }
    )
  }

  function handleDelete() {
    if (!home) return
    deleteMutation.mutate(home.id, {
      onSuccess: () => navigate('/mes-logements'),
      onError: () => setShowDelete(false),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !home) {
    return (
      <div className="p-6 lg:p-8">
        <Link to="/mes-logements" className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6">
          <ArrowLeft size={15} /> Retour aux logements
        </Link>
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          Logement introuvable.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Back */}
      <Link
        to="/mes-logements"
        className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> Retour aux logements
      </Link>

      <LogementHeader
        address={home.address}
        postalCode={home.postal_code}
        city={home.city}
        editing={editing}
        saving={updateMutation.isPending}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSave={handleSave}
        onShowDelete={() => setShowDelete(true)}
      />

      {saveError && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 rounded-xl text-sm text-danger font-body">
          <AlertCircle size={15} className="shrink-0" />
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: tabs + content */}
        <div className="lg:col-span-2 space-y-6">
          <HealthTabNavigation activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'infos' && (
            <LogementInfosTab
              home={home}
              editing={editing}
              form={form}
              inputCls={inputCls}
              onFormChange={handleFormChange}
              onAddressChange={(val) => setForm(prev => prev ? { ...prev, address: val } : prev)}
              onAddressSelect={(s) => setForm(prev => prev ? { ...prev, address: s.address, city: s.city, postal_code: s.postalCode } : prev)}
            />
          )}

          {activeTab === 'sante' && (
            <HealthOverview
              home={home}
              records={healthRecords}
              onSaveDomain={(domain: HealthDomain, score: number, symptoms: string[], notes: string) => {
                if (!user) return
                upsertHealth.mutate({
                  home_id: home.id,
                  user_id: user.id,
                  domain,
                  score,
                  urgency: getUrgencyFromScore(score),
                  symptoms,
                  notes: notes || null,
                  assessed_at: formatLocalDate(),
                })
              }}
            />
          )}

          {activeTab === 'travaux' && user && (
            <WorkHistoryList
              works={workHistory}
              homeId={home.id}
              userId={user.id}
              onCreate={(w) => createWork.mutate({ ...w, documents: [] })}
              onUpdate={(wid, payload) => updateWork.mutate({ id: wid, payload })}
              onDelete={(wid) => deleteWork.mutate({ id: wid, homeId: home.id })}
            />
          )}

          {activeTab === 'documents' && user && (
            <DocumentsList
              documents={documents}
              homeId={home.id}
              userId={user.id}
              onCreate={(d) => createDoc.mutate(d)}
              onUpdate={(did, payload) => updateDoc.mutate({ id: did, payload })}
              onDelete={(did) => deleteDoc.mutate({ id: did, homeId: home.id })}
            />
          )}
        </div>

        {/* Right: sidebar */}
        <LogementSidebar home={home} healthRecords={healthRecords} />
      </div>

      {showDelete && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
