import { useState } from 'react'
import { Plus, Pencil, Trash2, Calendar, Euro, X, Save, Wrench } from 'lucide-react'
import type { BrhWorkHistoryRow, HealthDomain, WorkStatus } from '@/types/database'
import {
  HEALTH_DOMAIN_LABELS,
  HEALTH_DOMAIN_COLORS,
  WORK_STATUS_LABELS,
  WORK_STATUS_COLORS,
  HEALTH_DOMAINS,
  WORK_STATUSES,
} from '@/data/constants'

interface Props {
  works: BrhWorkHistoryRow[]
  homeId: string
  userId: string
  onCreate: (work: {
    home_id: string; user_id: string; domain: HealthDomain | 'autre'; title: string;
    description: string | null; contractor: string | null; cost: number | null;
    status: WorkStatus; work_date: string | null; completed_at: string | null;
  }) => void
  onUpdate: (id: string, payload: Partial<BrhWorkHistoryRow>) => void
  onDelete: (id: string) => void
}

interface FormState {
  domain: HealthDomain | 'autre'
  title: string
  description: string
  contractor: string
  cost: string
  status: WorkStatus
  work_date: string
  completed_at: string
}

const EMPTY_FORM: FormState = {
  domain: 'autre', title: '', description: '', contractor: '',
  cost: '', status: 'planifie', work_date: '', completed_at: '',
}

export function WorkHistoryList({ works, homeId, userId, onCreate, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all')

  const filtered = statusFilter === 'all' ? works : works.filter((w) => w.status === statusFilter)

  function startEdit(work: BrhWorkHistoryRow) {
    setEditingId(work.id)
    setForm({
      domain: work.domain,
      title: work.title,
      description: work.description ?? '',
      contractor: work.contractor ?? '',
      cost: work.cost != null ? String(work.cost) : '',
      status: work.status,
      work_date: work.work_date ?? '',
      completed_at: work.completed_at ?? '',
    })
    setShowForm(false)
  }

  function handleSubmit() {
    if (!form.title.trim()) return
    const payload = {
      home_id: homeId,
      user_id: userId,
      domain: form.domain,
      title: form.title.trim(),
      description: form.description.trim() || null,
      contractor: form.contractor.trim() || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status,
      work_date: form.work_date || null,
      completed_at: form.completed_at || null,
      documents: [],
    }

    if (editingId) {
      onUpdate(editingId, payload)
      setEditingId(null)
    } else {
      onCreate(payload)
      setShowForm(false)
    }
    setForm(EMPTY_FORM)
  }

  function renderForm() {
    return (
      <div className="bg-surface rounded-2xl border border-primary/20 p-5 space-y-4 animate-fadeIn">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Domaine</label>
            <select
              value={form.domain}
              onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value as HealthDomain | 'autre' }))}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            >
              {HEALTH_DOMAINS.map((d) => <option key={d} value={d}>{HEALTH_DOMAIN_LABELS[d]}</option>)}
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Statut</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as WorkStatus }))}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            >
              {WORK_STATUSES.map((s) => <option key={s} value={s}>{WORK_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Titre *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Ex: Isolation des combles"
            className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors placeholder:text-text-light"
          />
        </div>
        <div>
          <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Details des travaux..."
            className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors resize-none placeholder:text-text-light"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Artisan</label>
            <input
              type="text"
              value={form.contractor}
              onChange={(e) => setForm((p) => ({ ...p, contractor: e.target.value }))}
              placeholder="Nom de l'entreprise"
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors placeholder:text-text-light"
            />
          </div>
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Cout (EUR)</label>
            <input
              type="number"
              value={form.cost}
              onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
              placeholder="15000"
              min="0"
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors placeholder:text-text-light"
            />
          </div>
          <div>
            <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1">Date</label>
            <input
              type="date"
              value={form.work_date}
              onChange={(e) => setForm((p) => ({ ...p, work_date: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-light rounded-xl font-body text-sm bg-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors">
            <Save size={14} /> {editingId ? 'Modifier' : 'Ajouter'}
          </button>
          <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }} className="px-4 py-2.5 border border-gray-light text-text-light font-display text-sm rounded-xl hover:bg-background transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header + filtre + bouton */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-display transition-colors ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-background text-text-light hover:bg-slate-100'}`}
          >
            Tous ({works.length})
          </button>
          {WORK_STATUSES.map((s) => {
            const count = works.filter((w) => w.status === s).length
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-display transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-background text-text-light hover:bg-slate-100'}`}
              >
                {WORK_STATUS_LABELS[s]} ({count})
              </button>
            )
          })}
        </div>
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>

      {/* Formulaire creation */}
      {showForm && renderForm()}

      {/* Liste */}
      {filtered.length === 0 && !showForm ? (
        <div className="bg-surface rounded-2xl border border-gray-light p-8 text-center">
          <Wrench size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="font-display text-sm text-text-primary">Aucun travail enregistre</p>
          <p className="font-body text-xs text-text-light mt-1">Ajoutez vos travaux passes et a venir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((work) => {
            if (editingId === work.id) return <div key={work.id}>{renderForm()}</div>

            const domainColor = work.domain !== 'autre' ? HEALTH_DOMAIN_COLORS[work.domain] : { text: 'text-slate-500', bg: 'bg-slate-50' }
            return (
              <div key={work.id} className="bg-surface rounded-2xl border border-gray-light p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-display ${domainColor.bg} ${domainColor.text}`}>
                        {work.domain === 'autre' ? 'Autre' : HEALTH_DOMAIN_LABELS[work.domain]}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-display ${WORK_STATUS_COLORS[work.status]}`}>
                        {WORK_STATUS_LABELS[work.status]}
                      </span>
                    </div>
                    <p className="font-display text-sm text-text-primary">{work.title}</p>
                    {work.description && <p className="font-body text-xs text-text-secondary mt-1">{work.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-light font-body">
                      {work.work_date && (
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(work.work_date).toLocaleDateString('fr-FR')}</span>
                      )}
                      {work.cost != null && (
                        <span className="flex items-center gap-1"><Euro size={12} /> {work.cost.toLocaleString('fr-FR')} EUR</span>
                      )}
                      {work.contractor && <span>{work.contractor}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(work)} className="p-1.5 rounded-lg hover:bg-background transition-colors" title="Modifier">
                      <Pencil size={14} className="text-text-light" />
                    </button>
                    <button type="button" onClick={() => onDelete(work.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
