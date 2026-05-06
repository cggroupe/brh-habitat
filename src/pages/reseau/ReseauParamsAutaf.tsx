/**
 * Phase 18.8 — Page bridge AUTAF `/reseau/parametres/autaf`.
 *
 * V1 : configuration manuelle (saisie token API AUTAF).
 * V1.5 (post-Genesii) : OAuth flow vers `autaf/v1/oauth/authorize`.
 */
import { useState } from 'react'
import { Link2, ExternalLink, Check, AlertCircle, Trash2, Power } from 'lucide-react'
import {
  useMyAutafLink,
  useConfigureAutafLink,
  useDisableAutafLink,
  useDeleteAutafLink,
} from '@/hooks/queries/reseau-autaf'

const AVAILABLE_SCOPES = [
  { value: 'read_recommendations', label: 'Lire mes recommandations AUTAF', recommended: true },
  { value: 'write_posts', label: 'Cross-poster mes publications BRH sur AUTAF' },
  { value: 'write_chantiers', label: 'Cross-poster mes chantiers BRH sur AUTAF' },
  { value: 'read_profile', label: 'Lire mon profil AUTAF' },
]

export default function ReseauParamsAutaf() {
  const link = useMyAutafLink()
  const configure = useConfigureAutafLink()
  const disable = useDisableAutafLink()
  const remove = useDeleteAutafLink()

  const [editing, setEditing] = useState(false)
  const [autafUserId, setAutafUserId] = useState('')
  const [autafUsername, setAutafUsername] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read_recommendations'])
  const [error, setError] = useState<string | null>(null)

  function toggleScope(s: string) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!autafUserId.trim() || !accessToken.trim()) {
      setError("ID AUTAF et token sont obligatoires.")
      return
    }
    try {
      await configure.mutateAsync({
        autafUserId: autafUserId.trim(),
        autafUsername: autafUsername.trim() || undefined,
        accessToken: accessToken.trim(),
        scopes,
      })
      setEditing(false)
      setAccessToken('') // clear form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la configuration.')
    }
  }

  const isConfigured = link.data?.is_active

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <Link2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Bridge AUTAF</h1>
          <p className="text-sm text-slate-500">Connecter mon compte AUTAF (autaf.fr)</p>
        </div>
      </div>

      {/* Bannière info */}
      <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">À propos du bridge</p>
        <p className="text-xs leading-relaxed">
          AUTAF (WorkRepublic) reste autonome sur WordPress OVH. Le bridge est un lien
          <strong> optionnel</strong> : si activé, vos recommandations AUTAF apparaissent
          sur votre profil pro BRH, et vous pourrez cross-poster vos publications/chantiers.
          <br />
          <strong>V1 (06/05/2026)</strong> : configuration manuelle par token API.
          <strong> V1.5</strong> : OAuth flow automatique (en attente de l'API OAuth Genesii).
        </p>
      </div>

      {/* État actuel */}
      {link.isLoading ? (
        <p className="text-sm text-slate-400 text-center py-4">Chargement…</p>
      ) : isConfigured ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Bridge actif</p>
              <p className="text-xs text-slate-500">
                Compte AUTAF :{' '}
                <code className="bg-slate-100 px-1 rounded">{link.data?.autaf_user_id}</code>
                {link.data?.autaf_username && ` (@${link.data.autaf_username})`}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Permissions accordées</p>
            <div className="flex flex-wrap gap-1.5">
              {(link.data?.scopes ?? []).map((s) => (
                <span
                  key={s}
                  className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-medium"
                >
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {link.data?.last_sync_at && (
            <p className="text-[11px] text-slate-500">
              Dernière synchronisation :{' '}
              {new Date(link.data.last_sync_at).toLocaleString('fr-FR')}
            </p>
          )}

          {link.data?.last_error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs">
              <AlertCircle size={14} />
              <span>Dernière erreur : {link.data.last_error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => disable.mutate()}
              disabled={disable.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <Power size={12} /> Désactiver
            </button>
            <button
              onClick={() => {
                if (confirm('Supprimer définitivement le bridge AUTAF ? (RGPD droit à l\'oubli)')) {
                  remove.mutate()
                }
              }}
              disabled={remove.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition"
            >
              <Trash2 size={12} /> Supprimer
            </button>
            <button
              onClick={() => setEditing(true)}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 text-xs font-semibold transition"
            >
              Reconfigurer
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-cyan-300/60 p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-cyan-100 mx-auto mb-3 flex items-center justify-center">
            <Link2 size={20} className="text-cyan-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Aucun bridge AUTAF configuré</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Configurez votre token API AUTAF pour bénéficier des recommandations AUTAF
            sur votre profil pro BRH.
          </p>
          <button
            onClick={() => setEditing(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition"
          >
            <Link2 size={14} /> Configurer le bridge
          </button>
        </div>
      )}

      {/* Form configuration */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-800">
            Configuration manuelle V1
          </h2>

          <div>
            <label htmlFor="autaf-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mon ID utilisateur AUTAF <span className="text-red-500">*</span>
            </label>
            <input
              id="autaf-id"
              type="text"
              value={autafUserId}
              onChange={(e) => setAutafUserId(e.target.value)}
              placeholder="123456 ou uuid AUTAF"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Disponible dans <a href="https://www.autaf.fr/profil" target="_blank" rel="noopener noreferrer" className="text-cyan-700 inline-flex items-center gap-0.5">
                votre profil AUTAF <ExternalLink size={9} />
              </a>
            </p>
          </div>

          <div>
            <label htmlFor="autaf-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pseudo AUTAF <span className="text-slate-400">(optionnel)</span>
            </label>
            <input
              id="autaf-username"
              type="text"
              value={autafUsername}
              onChange={(e) => setAutafUsername(e.target.value)}
              placeholder="@mon-pseudo"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="autaf-token" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Token API AUTAF <span className="text-red-500">*</span>
            </label>
            <input
              id="autaf-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Personal access token AUTAF"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Token stocké côté Supabase. Chiffrement AES-GCM en V2.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Permissions à accorder</p>
            <div className="space-y-1.5">
              {AVAILABLE_SCOPES.map((s) => (
                <label
                  key={s.value}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-slate-700">{s.label}</span>
                    {s.recommended && (
                      <span className="ml-1.5 text-[10px] text-cyan-700 font-bold uppercase">recommandé</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={configure.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm font-semibold"
            >
              {configure.isPending ? 'Enregistrement…' : 'Activer le bridge'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
