/**
 * EmployeMails — Composer + envoyer des emails de recrutement (Phase V2.2).
 *
 * Étapes :
 *  1. Choix du template (4 cibles : artisan, agence immo, architecte, MOE)
 *  2. Saisie destinataire (email, nom, entreprise, ville)
 *  3. Aperçu rendu
 *  4. Envoi (EF send-recruitment-email) → +5 pts
 *  5. Historique des envois récents
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Send, Eye, CheckCircle2, AlertCircle, Loader2, Award } from 'lucide-react'
import { emailTemplatesApi, type EmailTemplate } from '@/api/email-templates'
import { useMyEmployee } from '@/hooks/queries/brh-employees'
import { EMPLOYEES_KEY } from '@/hooks/queries/brh-employees'

const AUDIENCE_LABELS = {
  artisan: { label: 'Artisans BTP', color: '#f59e0b', icon: '🔧' },
  agence_immo: { label: 'Agences immo', color: '#2563eb', icon: '🏢' },
  architecte: { label: 'Architectes', color: '#7c3aed', icon: '📐' },
  maitre_oeuvre: { label: 'Maîtres d\'œuvre', color: '#0ea5e9', icon: '🏗️' },
  autre: { label: 'Autres', color: '#71717a', icon: '✉️' },
}

function renderPreview(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? `<mark style="background:#fef08a;padding:1px 4px;border-radius:3px">${m}</mark>`)
}

export default function EmployeMails() {
  const qc = useQueryClient()
  const { data: employee } = useMyEmployee()
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list(),
    staleTime: 5 * 60_000,
  })

  const { data: recentSends = [] } = useQuery({
    queryKey: [...EMPLOYEES_KEY, 'recent-sends', employee?.id],
    queryFn: () => (employee ? emailTemplatesApi.myRecentSends(employee.id) : Promise.resolve([])),
    enabled: !!employee,
    staleTime: 30_000,
  })

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ email: '', name: '', company: '', ville: '' })
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) throw new Error('Aucun template sélectionné')
      return emailTemplatesApi.send({
        template_slug: selectedTemplate.slug,
        recipient_email: form.email,
        recipient_name: form.name || undefined,
        recipient_company: form.company || undefined,
        custom_variables: { ville: form.ville || 'votre ville' },
      })
    },
    onSuccess: (result) => {
      if (result.ok) {
        setFeedback({ type: 'ok', msg: `✅ Mail envoyé ! +${result.points_earned ?? 5} pts` })
        setForm({ email: '', name: '', company: '', ville: '' })
        // Invalide les queries pour rafraîchir score + historique
        qc.invalidateQueries({ queryKey: EMPLOYEES_KEY })
      } else {
        setFeedback({ type: 'error', msg: `❌ ${result.error ?? 'Erreur'}` })
      }
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', msg: `❌ ${err.message}` })
    },
  })

  const previewVars = useMemo(() => ({
    nom_destinataire: form.name || 'Madame, Monsieur',
    ville: form.ville || 'votre ville',
    employe_nom: employee?.full_name ?? 'Pierre Collard',
    employe_signature: employee?.signature_html
      ?? `${employee?.full_name ?? 'Pierre Collard'}<br>${employee?.role_label ?? 'Commercial BRH'}<br>BRH Habitat`,
  }), [form, employee])

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Recrutement partenaires</p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-text mt-1 tracking-tight flex items-center gap-2">
            <Mail size={24} style={{ color: '#003404' }} />
            Templates emails
          </h1>
          <p className="text-sm text-text-muted mt-1">Envoyez en 1 clic un mail de recrutement personnalisé · <strong>+5 pts</strong> par envoi</p>
        </div>
        {employee && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Score actuel</p>
            <p className="font-display text-2xl font-bold" style={{ color: '#00600a' }}>{employee.activity_score} pts</p>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates list */}
        <div className="lg:col-span-1">
          <h2 className="font-display text-base font-bold mb-3">Choisir un template</h2>
          {loadingTemplates ? (
            <Loader2 className="animate-spin text-text-muted" size={20} />
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => {
                const aud = AUDIENCE_LABELS[tpl.target_audience]
                const isSelected = selectedTemplate?.id === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(tpl)
                      setFeedback(null)
                    }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                        : 'border-border bg-surface hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{aud.icon}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: aud.color + '20', color: aud.color }}
                      >
                        {aud.label}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-text leading-snug">{tpl.subject}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Composer + Preview */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-12 text-center">
              <Mail size={36} className="mx-auto text-text-subtle mb-3" />
              <p className="text-base font-bold text-text">Sélectionnez un template à gauche</p>
              <p className="text-sm text-text-muted mt-1">Le destinataire et l'aperçu apparaîtront ici</p>
            </div>
          ) : (
            <>
              <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
                <h3 className="font-display text-base font-bold mb-3">Destinataire</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nom destinataire (Mme/M. Dupont)"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                  <input
                    type="text"
                    placeholder="Entreprise / Cabinet"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                  <input
                    type="text"
                    placeholder="Ville (Brest, Vannes, Quimper…)"
                    value={form.ville}
                    onChange={(e) => setForm({ ...form, ville: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sendMutation.mutate()}
                  disabled={!form.email || sendMutation.isPending}
                  className="mt-4 w-full sm:w-auto px-6 py-3 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#00600a' }}
                >
                  {sendMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Envoyer l'email · +5 pts
                </button>
              </div>

              <div className="bg-white border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 text-text-muted text-xs uppercase tracking-widest font-bold">
                  <Eye size={12} /> Aperçu rendu
                </div>
                <div className="bg-canvas rounded-lg p-4 text-sm border border-border">
                  <p className="font-semibold mb-2 text-text-muted text-xs">À : {form.email || '<destinataire>'}</p>
                  <p className="font-bold mb-3 text-text">{renderPreview(selectedTemplate.subject, previewVars)}</p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate.body_html, previewVars) }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Historique récent */}
      {recentSends.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
            <Award size={16} /> Historique récent ({recentSends.length})
          </h2>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {recentSends.slice(0, 10).map((send) => (
              <div key={send.id} className="p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: send.status === 'sent' ? '#dcfce7' : send.status === 'failed' ? '#fee2e2' : '#fef3c7',
                  }}
                >
                  {send.status === 'sent' ? (
                    <CheckCircle2 size={16} className="text-emerald-700" />
                  ) : send.status === 'failed' ? (
                    <AlertCircle size={16} className="text-red-700" />
                  ) : (
                    <Mail size={16} className="text-amber-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{send.recipient_email}</p>
                  <p className="text-[11px] text-text-muted truncate">{send.subject}</p>
                </div>
                <p className="text-[11px] text-text-subtle whitespace-nowrap">
                  {new Date(send.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
