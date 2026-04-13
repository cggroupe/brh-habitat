/**
 * Logger d'erreurs centralise — envoie a Sentry en prod, console.error en dev
 */
export function logError(message: string, error?: unknown): void {
  if (import.meta.env.PROD) {
    import('@sentry/react').then((Sentry) => {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: { message } })
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: { error } })
      }
    }).catch(() => {
      // Sentry non disponible
    })
  } else {
    console.error(message, error)
  }
}
