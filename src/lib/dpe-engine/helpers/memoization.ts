/**
 * Memoization helper inspiré de CapRénov+ CalculFraAbstract.
 *
 * Le cache est local à un appel `computeDpe`. Appeler `resetCache` entre deux
 * audits pour éviter les fuites de mémoire et les résultats croisés.
 */

const cache = new Map<string, unknown>()

export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyFn: (...args: TArgs) => string,
  fnName?: string,
): (...args: TArgs) => TResult {
  return (...args: TArgs): TResult => {
    const key = `${fnName ?? fn.name}:${keyFn(...args)}`
    if (cache.has(key)) {
      return cache.get(key) as TResult
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

export function resetCache(): void {
  cache.clear()
}

export function cacheSize(): number {
  return cache.size
}
