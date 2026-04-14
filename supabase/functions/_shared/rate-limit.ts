/**
 * Rate limiter en memoire pour Edge Functions Deno.
 * Limite par IP avec fenetre glissante.
 * Note: le state est perdu au redeploy — suffisant pour protection basique.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage periodique des entrees expirees (toutes les 60s)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

export interface RateLimitOptions {
  /** Nombre max de requetes par fenetre */
  maxRequests: number
  /** Duree de la fenetre en secondes */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  headers: Record<string, string>
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export function checkRateLimit(
  req: Request,
  fnName: string,
  opts: RateLimitOptions = { maxRequests: 30, windowSeconds: 60 },
): RateLimitResult {
  const ip = getClientIp(req)
  const key = `${fnName}:${ip}`
  const now = Date.now()

  let entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + opts.windowSeconds * 1000 }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, opts.maxRequests - entry.count)
  const allowed = entry.count <= opts.maxRequests

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(opts.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
  }

  return { allowed, remaining, resetAt: entry.resetAt, headers }
}
