/**
 * AuditRespondPage — Page publique de réponse à un audit agence.
 *
 * Accessible sans authentification via lien magic-link envoyé par email
 * (cf supabase/functions/monthly-audit-agencies/index.ts pour l'envoi).
 *
 * URL : /audit/respond?token=xxx (token = response_token de brh_agence_audits).
 *
 * Backend : RPC SECURITY DEFINER brh_audit_respond (migration 20260525120000)
 * qui valide le token + UPDATE atomique. Pas de fuite de données.
 *
 * UX : pattern inspiré de OptOutPage.tsx (form + success + error states).
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'
import { AUDIT_FEEDBACK_OPTIONS, type AuditFeedback } from '@/api/audit-respond'
import { useRespondAudit } from '@/hooks/queries/useRespondAudit'

const FEEDBACK_LABELS: Record<AuditFeedback, { label: string; description: string }> = {
  correct: {
    label: 'Tout s\'est bien passé',
    description: "Le contact de l'agence était professionnel et respectueux.",
  },
  interested: {
    label: 'Je suis intéressé(e)',
    description: 'Je souhaite être recontacté(e) par cette agence ou un partenaire BRH.',
  },
  not_contacted: {
    label: 'Je n\'ai jamais été contacté(e)',
    description: "Aucune agence ne m'a appelé(e) ou rendu visite récemment.",
  },
  intrusive: {
    label: 'Contact insistant ou inapproprié',
    description: 'Le contact était trop pressant ou m\'a mis(e) mal à l\'aise.',
  },
  complaint: {
    label: 'Je souhaite déposer une plainte',
    description: "Comportement inacceptable de l'agence — un responsable BRH vous recontactera.",
  },
}

const FEEDBACK_PLACEHOLDERS: Record<AuditFeedback, string> = {
  correct: 'Un commentaire à ajouter ? (optionnel)',
  interested: 'Quels travaux ou services vous intéressent ?',
  not_contacted: "Quel est votre logement concerné ? (adresse, ville…)",
  intrusive: "Décrivez le comportement qui vous a déplu (date, heure, nom de l'agent si connu)…",
  complaint: 'Détaillez les faits — date, heure, agent, ce qui a été dit/fait…',
}

export default function AuditRespondPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [feedback, setFeedback] = useState<AuditFeedback | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const respondMutation = useRespondAudit()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !feedback) return
    respondMutation.mutate({
      token,
      feedback,
      feedback_message: feedbackMessage.trim(),
    })
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="text-red-600" size={28} />
          </div>
          <h1 className="text-xl font-semibold mb-2">Lien invalide</h1>
          <p className="text-gray-600">
            Ce lien ne contient pas le jeton nécessaire pour répondre à l'audit.
            Vérifiez que vous avez bien suivi le lien complet dans l'email reçu.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Pour toute question :{' '}
            <a href="mailto:contact@contact-brh.fr" className="text-primary underline">
              contact@contact-brh.fr
            </a>
          </p>
        </div>
      </div>
    )
  }

  const success = respondMutation.data?.success === true
  const rpcMessage = respondMutation.data?.message ?? null
  const rpcError = respondMutation.error?.message ?? null
  const isRejected = respondMutation.data?.success === false

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-display tracking-tight">
            Comment s'est passé votre contact ?
          </h1>
          <p className="text-gray-600 mt-2 max-w-lg mx-auto">
            BRH effectue des audits qualité auprès des particuliers contactés
            par les agences partenaires. Votre retour nous permet d'améliorer
            la qualité du réseau.
          </p>
        </header>

        {success ? (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="text-emerald-600" size={28} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Merci pour votre réponse</h2>
            <p className="text-gray-600 mb-4">
              {rpcMessage ?? 'Votre réponse a bien été enregistrée.'}
            </p>
            <p className="text-sm text-gray-500">
              Si vous avez signalé une plainte, un responsable qualité BRH vous
              recontactera dans les prochains jours.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre retour <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {AUDIT_FEEDBACK_OPTIONS.map((option) => {
                  const { label, description } = FEEDBACK_LABELS[option]
                  const checked = feedback === option
                  return (
                    <label
                      key={option}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedback"
                        value={option}
                        checked={checked}
                        onChange={() => setFeedback(option)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageSquare size={14} className="inline mr-1 -mt-0.5" />
                Message (optionnel — 2000 caractères max)
              </label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={feedback ? FEEDBACK_PLACEHOLDERS[feedback] : 'Sélectionnez d\'abord votre retour ci-dessus…'}
                disabled={!feedback}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
              />
              <div className="text-xs text-gray-400 mt-1 text-right">
                {feedbackMessage.length}/2000
              </div>
            </div>

            {(isRejected || rpcError) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{rpcMessage ?? rpcError ?? 'Une erreur est survenue.'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!feedback || respondMutation.isPending}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {respondMutation.isPending ? 'Envoi…' : 'Envoyer ma réponse'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Votre réponse est traitée confidentiellement. Vous pouvez répondre
              une seule fois par audit. Pour toute question :{' '}
              <a href="mailto:contact@contact-brh.fr" className="text-primary underline">
                contact@contact-brh.fr
              </a>
            </p>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/" className="hover:text-gray-600">← Retour à l'accueil</a>
          <span className="mx-2">·</span>
          <a href="/politique-de-confidentialite" className="hover:text-gray-600">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  )
}
