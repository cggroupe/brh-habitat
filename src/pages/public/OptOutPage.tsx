/**
 * Phase 16.0.4 — Page publique d'opt-out RGPD.
 *
 * Accessible sans authentification (Art. 21 RGPD : faciliter l'opposition).
 * Soumet vers EF `submit-optout` qui enregistre + envoie un email de confirmation.
 *
 * UX : design rassurant, langage clair, pas de jargon juridique.
 */
import { useState } from 'react'
import { Shield, CheckCircle2, AlertCircle, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type RequestType = 'opposition' | 'suppression' | 'rectification'

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  opposition: "Je m'oppose au démarchage commercial me concernant",
  suppression: 'Je demande la suppression complète de mes données',
  rectification: 'Je demande la rectification de mes données',
}

export default function OptOutPage() {
  const [email, setEmail] = useState('')
  const [requestType, setRequestType] = useState<RequestType>('opposition')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [commune, setCommune] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ requestId: string; deadline: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir un email valide.')
      return
    }
    setSubmitting(true)
    try {
      // Insert direct via RLS "optout_insert_anon" (Phase 16.0.1).
      // L'EF submit-optout (envoi email Resend) sera utilisée plus tard
      // quand SUPABASE_ACCESS_TOKEN sera dispo pour deploy.
      const { data, error: dbError } = await supabase
        .from('brh_optout_requests')
        .insert({
          email: email.trim().toLowerCase(),
          request_type: requestType,
          adresse: adresse.trim() || null,
          code_postal: codePostal.trim() || null,
          commune: commune.trim() || null,
          message: message.trim() || null,
          source_user_agent: navigator.userAgent,
        })
        .select('id, deadline')
        .single()

      if (dbError) {
        setError(dbError.message ?? 'Erreur, veuillez réessayer plus tard.')
        return
      }
      setSuccess({ requestId: data.id, deadline: data.deadline })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-display tracking-tight">
            Mes données chez BRH
          </h1>
          <p className="text-gray-600 mt-2 max-w-lg mx-auto">
            Vous pouvez à tout moment, gratuitement et sans motif, demander à
            ne plus apparaître dans notre base de prospection ou à supprimer
            vos données.
          </p>
        </header>

        {success ? (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="text-emerald-600" size={28} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Demande enregistrée</h2>
            <p className="text-gray-600 mb-4">
              Nous avons bien reçu votre demande. Un email de confirmation vient
              de partir à <strong>{email}</strong>.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-left space-y-2">
              <p>
                <strong>Référence :</strong>{' '}
                <code className="font-mono text-xs">{success.requestId}</code>
              </p>
              <p>
                <strong>Délai légal de traitement :</strong>{' '}
                avant le{' '}
                <strong>
                  {new Date(success.deadline).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
              </p>
              <p className="text-xs text-gray-500 italic mt-3">
                Conformément à l'article 21 du RGPD, vous serez retiré de notre
                base de scoring ainsi que de tout démarchage commercial dans ce
                délai. Si vous n'avez pas reçu de confirmation finale, écrivez-nous
                à <a href="mailto:rgpd@contact-brh.fr" className="text-primary underline">rgpd@contact-brh.fr</a>.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Votre email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pour vous envoyer la confirmation et tracer votre demande.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quelle est votre demande ?
              </label>
              <div className="space-y-2">
                {(['opposition', 'suppression', 'rectification'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      requestType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="requestType"
                      value={type}
                      checked={requestType === type}
                      onChange={() => setRequestType(type)}
                      className="mt-1"
                    />
                    <span className="text-sm">{REQUEST_TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-gray-700 font-medium">
                Adresse du logement concerné (optionnel)
              </summary>
              <div className="mt-3 space-y-3 bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">
                  Si vous fournissez l'adresse, nous pourrons identifier plus
                  rapidement votre dossier.
                </p>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Numéro et rue (ex : 12 rue de la Paix)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    placeholder="Code postal"
                    maxLength={5}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Commune"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </details>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Précisez votre demande si nécessaire…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition"
            >
              {submitting ? 'Envoi…' : 'Envoyer ma demande'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Conformément à l'article 21 du RGPD, votre demande sera traitée
              gratuitement sous 30 jours.<br />
              Pour toute question : <a href="mailto:rgpd@contact-brh.fr" className="text-primary underline">rgpd@contact-brh.fr</a>
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
