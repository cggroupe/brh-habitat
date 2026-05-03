/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'
import { TenantProvider } from '@/config/TenantContext'
import { tenant } from '@/config/tenant'

// ---------------------------------------------------------------------------
// Sentry — Monitoring & Error Tracking
// ---------------------------------------------------------------------------
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Phase 23 — Release tagging pour symboliser les stack traces avec les
    // sourcemaps uploadés par le plugin Sentry (cf. SENTRY_AUTH_TOKEN en CI).
    // Format SemVer + commit court : ex `brh-habitat@0.0.0+9305b7d`.
    release: import.meta.env.VITE_SENTRY_RELEASE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    enabled: import.meta.env.PROD,
    initialScope: {
      tags: { tenantId: tenant.tenantId, tenantTier: tenant.tier },
    },
  })
}

// ---------------------------------------------------------------------------
// Error Boundary (Sentry-powered)
// ---------------------------------------------------------------------------
const SentryErrorBoundary = Sentry.ErrorBoundary

function FallbackUI({ error }: { error: Error }) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ef4444' }}>Erreur de chargement</h1>
      <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {error.message}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: 16, padding: '8px 16px', background: '#1c7d1e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        Recharger la page
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tenant — Injection des couleurs CSS custom properties
// ---------------------------------------------------------------------------
const root = document.documentElement
const { colors } = tenant.branding
root.style.setProperty('--color-primary', colors.primary)
root.style.setProperty('--color-primary-dark', colors.primaryDark)
root.style.setProperty('--color-primary-light', colors.primaryLight)
root.style.setProperty('--color-primary-green', colors.secondary)
root.style.setProperty('--color-secondary', colors.secondary)
root.style.setProperty('--color-accent', colors.accent)
root.style.setProperty('--color-background', colors.background)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary fallback={({ error }) => <FallbackUI error={error as Error} />}>
      <TenantProvider>
        <App />
      </TenantProvider>
    </SentryErrorBoundary>
  </StrictMode>,
)

// ---------------------------------------------------------------------------
// PWA — Service Worker registration
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
