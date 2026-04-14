import { Save, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { CASE_STATUSES, CASE_STATUS_LABELS } from '@/data/constants'
import type { CaseStatus } from '@/types/database'

interface AdminEditFormProps {
  status: CaseStatus
  assignedTo: string
  adminNotes: string
  estimatedBudget: string
  startDate: string
  endDate: string
  isPending: boolean
  saveSuccess: boolean
  saveError: string | null
  onStatusChange: (v: CaseStatus) => void
  onAssignedToChange: (v: string) => void
  onAdminNotesChange: (v: string) => void
  onEstimatedBudgetChange: (v: string) => void
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onSave: () => void
}

export function AdminEditForm({
  status,
  assignedTo,
  adminNotes,
  estimatedBudget,
  startDate,
  endDate,
  isPending,
  saveSuccess,
  saveError,
  onStatusChange,
  onAssignedToChange,
  onAdminNotesChange,
  onEstimatedBudgetChange,
  onStartDateChange,
  onEndDateChange,
  onSave,
}: AdminEditFormProps) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-light p-6">
      <h2 className="font-display text-base text-text-primary mb-5 flex items-center gap-2">
        <FileText size={16} className="text-primary" /> Gestion du dossier
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
            Statut
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as CaseStatus)}
            className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
          >
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Assigned to */}
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
            Assigné à
          </label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => onAssignedToChange(e.target.value)}
            placeholder="Nom du conseiller..."
            className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-light"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
            Budget estimé (€)
          </label>
          <input
            type="number"
            value={estimatedBudget}
            onChange={(e) => onEstimatedBudgetChange(e.target.value)}
            placeholder="Ex : 15000"
            min="0"
            className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-light"
          />
        </div>

        {/* Date de début */}
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
            Date de début
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="sm:col-span-2 sm:w-1/2">
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
            Date de fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Admin notes */}
      <div className="mt-4">
        <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
          Notes administrateur
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => onAdminNotesChange(e.target.value)}
          rows={4}
          placeholder="Notes internes (non visibles par le client)..."
          className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors resize-none placeholder:text-text-light"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={15} />
          {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-success font-body text-sm">
            <CheckCircle2 size={15} /> Modifications enregistrées
          </span>
        )}
        {saveError && (
          <span className="flex items-center gap-1.5 text-danger font-body text-sm">
            <AlertCircle size={15} /> {saveError}
          </span>
        )}
      </div>
    </div>
  )
}
