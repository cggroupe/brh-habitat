import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error'

interface OAuthButtonsProps {
  /** Chemin vers lequel rediriger apres login reussi (ex: '/pro', '/particulier') */
  redirectTo?: string
  /** Providers a afficher. Par defaut : google + apple. LinkedIn en flag opt-in. */
  providers?: Array<'google' | 'apple' | 'linkedin_oidc'>
}

const PROVIDER_META = {
  google: { label: 'Continuer avec Google', bg: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700' },
  apple:  { label: 'Continuer avec Apple',  bg: 'bg-black hover:bg-black/90 text-white border border-black' },
  linkedin_oidc: { label: 'Continuer avec LinkedIn', bg: 'bg-[#0A66C2] hover:bg-[#094f9a] text-white' },
} as const

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M13.194 9.544c-.02-2.238 1.828-3.318 1.912-3.367-1.045-1.526-2.667-1.734-3.237-1.756-1.374-.139-2.682.81-3.381.81-.705 0-1.777-.793-2.926-.77C3.96 4.48 2.5 5.28 1.73 6.61c-1.522 2.634-.388 6.516 1.094 8.647.725 1.044 1.58 2.213 2.708 2.172 1.09-.043 1.501-.703 2.817-.703 1.312 0 1.686.703 2.826.682 1.167-.02 1.905-1.053 2.626-2.102.83-1.205 1.168-2.393 1.19-2.45-.03-.014-2.286-.876-2.308-3.46zM11.07 2.919c.6-.728 1.005-1.732.893-2.738-.862.035-1.91.577-2.534 1.3-.56.639-1.052 1.66-.918 2.645.96.074 1.947-.482 2.56-1.207z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M13.632 13.635h-2.37V9.921c0-.886-.018-2.025-1.234-2.025-1.235 0-1.424.964-1.424 1.961v3.778h-2.37V5.996h2.275v1.044h.032c.317-.6 1.09-1.233 2.243-1.233 2.4 0 2.848 1.58 2.848 3.635v4.193zM3.558 4.951a1.374 1.374 0 110-2.748 1.374 1.374 0 010 2.748zm1.187 8.684h-2.37V5.996h2.37v7.639zM14.816 0H1.18C.528 0 0 .516 0 1.153v13.694C0 15.484.528 16 1.18 16h13.635c.652 0 1.185-.516 1.185-1.153V1.153C16 .516 15.467 0 14.815 0h.001z" />
    </svg>
  )
}

export function OAuthButtons({ redirectTo = '/', providers = ['google', 'apple'] }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOAuth(provider: 'google' | 'apple' | 'linkedin_oidc') {
    setLoading(provider)
    setError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${origin}${redirectTo}` },
      })
      if (error) throw error
    } catch (err) {
      logError(`OAuth:${provider}`, err)
      setError('Connexion sociale indisponible, reessayez dans quelques instants.')
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => {
        const meta = PROVIDER_META[p]
        const icon = p === 'google' ? <GoogleIcon /> : p === 'apple' ? <AppleIcon /> : <LinkedInIcon />
        return (
          <button
            key={p}
            type="button"
            onClick={() => void handleOAuth(p)}
            disabled={loading !== null}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 ${meta.bg}`}
          >
            {loading === p ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
            ) : (
              icon
            )}
            <span>{meta.label}</span>
          </button>
        )
      })}
      {error && <p className="text-xs text-red-500 text-center pt-1">{error}</p>}
    </div>
  )
}
