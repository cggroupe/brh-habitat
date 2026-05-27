/**
 * ReseauEmailPanel — section "Envoyer un email" sur la fiche prospect réseau pro.
 *
 * - Liste des templates filtrés sur l'audience matchée par metier_categorie
 *   (avec toggle "Voir tous les templates" pour élargir si besoin)
 * - Aperçu du template sélectionné avec variables substituées
 * - Bouton "Envoyer" : auto-claim si pas encore claim par le user courant
 *   (avec method='email' + notes auto-générées "Premier contact via {template_slug}")
 *   puis appel EF send-recruitment-email (réutilise tracking +5pts existant)
 * - Historique des emails déjà envoyés à ce prospect
 *
 * Visible uniquement si le user a accès aux contacts (= non claim, ou claim par lui,
 * ou admin) ET si le prospect a un email.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, CheckCircle2, AlertCircle, Loader2, Eye, ChevronDown, ChevronUp,
  Clock, Mouse, MessageSquare,
} from 'lucide-react'
import { emailTemplatesApi, type EmailTemplate } from '@/api/email-templates'
import {
  fetchEmailsSentTo, metierToEmailAudience,
  type ReseauProspectFull, type EmailSendHistoryItem, type EmailTargetAudience,
} from '@/api/brh-reseau-pro'
import { useReseauClaim } from '@/hooks/queries/brh-reseau-pro'
import { useAuth } from '@/hooks/useAuth'

const AUDIENCE_LABELS: Record<EmailTargetAudience, string> = {
  artisan: 'Artisan BTP',
  agence_immo: 'Agence immobilière',
  architecte: 'Architecte',
  maitre_oeuvre: "Maître d'œuvre",
  autre: 'Autre',
}

interface Props {
  prospect: ReseauProspectFull
}

export default function ReseauEmailPanel({ prospect }: Props) {
  const qc = useQueryClient()
  const { user } = useAuth()

  // Détermine l'audience cible pour ce prospect
  const targetAudience = useMemo(
    () => metierToEmailAudience(prospect.metier_categorie, prospect.secteur),
    [prospect.metier_categorie, prospect.secteur],
  )

  // Email destinataire (priorité : contact email > email_site_web)
  const recipientEmail = prospect.contacts?.email ?? prospect.contacts?.email_site_web ?? null

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [showAllAudiences, setShowAllAudiences] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null)

  // Charge tous les templates puis filtre côté front (24+ items, OK pour ça)
  const { data: allTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.list(),
    staleTime: 5 * 60_000,
  })

  const matchedTemplates = useMemo(
    () => allTemplates.filter((t) => t.target_audience === targetAudience),
    [allTemplates, targetAudience],
  )
  const visibleTemplates = showAllAudiences ? allTemplates : matchedTemplates

  // Historique des emails envoyés à ce prospect
  const { data: emailHistory = [] } = useQuery({
    queryKey: ['reseau-pro', 'email-history', recipientEmail],
    queryFn: () => fetchEmailsSentTo(recipientEmail as string),
    enabled: !!recipientEmail,
    staleTime: 30_000,
  })

  const selectedTemplate = useMemo(
    () => visibleTemplates.find((t) => t.slug === selectedSlug) ?? null,
    [visibleTemplates, selectedSlug],
  )

  // Préfill des variables (utilise les data du prospect)
  const previewVars = useMemo<Record<string, string>>(
    () => ({
      ville: prospect.ville ?? 'votre ville',
      societe: prospect.nom,
      nom_destinataire: prospect.nom_gerant
        ? `${prospect.prenom_gerant ?? ''} ${prospect.nom_gerant}`.trim()
        : 'Madame, Monsieur',
      metier: prospect.metier_categorie ?? '',
      employe_nom: '', // sera substitué côté EF avec les données du sender
      employe_signature: '',
    }),
    [prospect],
  )

  const claim = useReseauClaim()
  const isClaimedByMe = prospect.is_claimed && prospect.claim?.user_id === user?.id

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('Aucun template sélectionné')
      if (!recipientEmail) throw new Error('Aucun email destinataire')

      // 1) Auto-claim si pas encore claim par moi (et pas par autre — la page est
      // déjà bloquée si claim par autre, donc on est forcément dans le cas
      // "non claim" ou "claim par moi")
      if (!isClaimedByMe) {
        await claim.mutateAsync({
          id: prospect.id,
          method: 'email',
          notes: `Premier contact via template "${selectedTemplate.slug}"`,
        })
      }

      // 2) Envoi via EF existante (crée brh_email_sends + +5 pts employé)
      return emailTemplatesApi.send({
        template_slug: selectedTemplate.slug,
        recipient_email: recipientEmail,
        recipient_name: prospect.nom_gerant
          ? `${prospect.prenom_gerant ?? ''} ${prospect.nom_gerant}`.trim()
          : prospect.nom,
        recipient_company: prospect.nom,
        custom_variables: { ville: prospect.ville ?? '', metier: prospect.metier_categorie ?? '' },
      })
    },
    onSuccess: (result) => {
      if (result.ok) {
        setFeedback({
          type: 'ok',
          msg: `Email envoyé à ${recipientEmail} · +${result.points_earned ?? 5} pts`,
        })
        setSelectedSlug(null)
        setShowPreview(false)
        // Invalide l'historique + la fiche (le claim a peut-être bougé)
        qc.invalidateQueries({ queryKey: ['reseau-pro'] })
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Erreur inconnue' })
      }
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', msg: err.message })
    },
  })

  if (!recipientEmail) {
    return null // pas d'email → pas de section visible
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            Envoyer un email
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Templates filtrés pour <strong className="text-text">{AUDIENCE_LABELS[targetAudience]}</strong> ·
            Destinataire :{' '}
            <span className="font-mono text-text">{recipientEmail}</span>
          </p>
        </div>
        {matchedTemplates.length < allTemplates.length && (
          <button
            type="button"
            onClick={() => setShowAllAudiences((v) => !v)}
            className="text-[11px] text-[#00600a] hover:underline inline-flex items-center gap-0.5"
          >
            {showAllAudiences ? (
              <>Filtrer sur {AUDIENCE_LABELS[targetAudience]} <ChevronUp size={11} /></>
            ) : (
              <>Voir tous les templates ({allTemplates.length}) <ChevronDown size={11} /></>
            )}
          </button>
        )}
      </header>

      {loadingTemplates ? (
        <div className="text-xs text-text-muted">Chargement des templates…</div>
      ) : visibleTemplates.length === 0 ? (
        <div className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200 text-xs text-text-muted">
          Aucun template disponible pour cette audience.{' '}
          <button
            type="button"
            onClick={() => setShowAllAudiences(true)}
            className="text-[#00600a] hover:underline"
          >
            Voir tous les templates →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTemplates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              selected={selectedSlug === t.slug}
              onSelect={() => {
                setSelectedSlug(selectedSlug === t.slug ? null : t.slug)
                setShowPreview(false)
                setFeedback(null)
              }}
            />
          ))}
        </div>
      )}

      {/* Aperçu + actions */}
      {selectedTemplate && (
        <div className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Objet
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-text">
                {renderPreview(selectedTemplate.subject, previewVars)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-text ring-1 ring-stone-200 hover:bg-stone-50"
            >
              <Eye size={11} />
              {showPreview ? 'Cacher' : 'Aperçu'}
            </button>
          </div>

          {showPreview && (
            <div
              className="max-h-[400px] overflow-y-auto rounded-xl bg-white p-4 ring-1 ring-stone-200 text-sm text-text prose prose-sm prose-stone max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderPreview(selectedTemplate.body_html, previewVars),
              }}
            />
          )}

          {!isClaimedByMe && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200 text-[11px] text-amber-900">
              <strong>Note :</strong> envoyer cet email vous attribuera automatiquement ce
              contact (statut "Contacté", méthode "Email"). Les autres employés ne verront
              plus ses coordonnées.
            </div>
          )}

          {feedback && (
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
              feedback.type === 'ok'
                ? 'bg-[#00600a]/10 text-[#00600a] ring-1 ring-[#00600a]/30'
                : 'bg-red-50 text-red-800 ring-1 ring-red-200'
            }`}>
              {feedback.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setSelectedSlug(null); setShowPreview(false) }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-text ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00600a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004807] disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Historique */}
      {emailHistory.length > 0 && (
        <div className="mt-4 border-t border-stone-200 pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest font-bold text-text-muted">
            Historique ({emailHistory.length})
          </div>
          <ul className="space-y-1.5">
            {emailHistory.slice(0, 5).map((h) => (
              <EmailHistoryRow key={h.id} item={h} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function TemplateRow({
  template, selected, onSelect,
}: {
  template: EmailTemplate
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-xl px-3 py-2.5 text-left ring-1 transition ${
        selected
          ? 'bg-[#00600a]/5 ring-[#00600a]/40'
          : 'bg-white ring-stone-200 hover:bg-stone-50 hover:ring-stone-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <Mail size={13} className={selected ? 'text-[#00600a]' : 'text-text-muted'} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text">
            {template.subject}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-text-muted font-mono">
            {template.slug}
          </div>
        </div>
        {selected && <CheckCircle2 size={14} className="shrink-0 text-[#00600a]" />}
      </div>
    </button>
  )
}

function EmailHistoryRow({ item }: { item: EmailSendHistoryItem }) {
  const statusBadge =
    item.status === 'replied' ? { icon: MessageSquare, label: 'Répondu', color: 'text-[#00600a]' }
    : item.status === 'clicked' ? { icon: Mouse, label: 'Cliqué', color: 'text-amber-700' }
    : item.status === 'opened' ? { icon: Eye, label: 'Ouvert', color: 'text-blue-700' }
    : item.status === 'bounced' || item.status === 'failed' ? { icon: AlertCircle, label: 'Échec', color: 'text-red-700' }
    : { icon: Clock, label: 'Envoyé', color: 'text-text-muted' }
  const Icon = statusBadge.icon

  return (
    <li className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs ring-1 ring-stone-200">
      <Icon size={12} className={statusBadge.color} />
      <span className={`font-medium ${statusBadge.color}`}>{statusBadge.label}</span>
      <span className="opacity-50">·</span>
      <span className="min-w-0 flex-1 truncate text-text">{item.subject}</span>
      <span className="shrink-0 text-text-muted text-[10px]">
        {new Date(item.sent_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
      </span>
    </li>
  )
}

function renderPreview(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    const v = vars[k]
    if (v && v.length > 0) return v
    // Si pas de valeur fournie, laisser la balise visible mais surlignée
    return `<mark style="background:#fef08a;padding:1px 4px;border-radius:3px">${m}</mark>`
  })
}
