import { useEffect } from 'react'

/**
 * Verrouille le scroll du body quand un modal est ouvert.
 * Restaure automatiquement au demontage.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return

    const original = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = original
    }
  }, [active])
}
