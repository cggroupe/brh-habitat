/**
 * Phase 18.6 — Helper Canvas pour floutage manuel des photos.
 *
 * Décision #4 (06/05) : floutage plaques + visages MANUEL via UI.
 *   - L'utilisateur dessine des rectangles sur l'image
 *   - On stocke 2 versions : `_original.jpg` privé + `_public.jpg` floutée
 *   - Champ `media_blur_zones JSONB` pour audit (zones rectangle x/y/w/h)
 *
 * Pas d'IA V1. Coût zéro, contrôle utilisateur, conforme RGPD.
 */

export interface BlurZone {
  /** Coordonnée X du coin top-left, en pixels image. */
  x: number
  /** Coordonnée Y du coin top-left. */
  y: number
  /** Largeur en pixels image. */
  w: number
  /** Hauteur en pixels image. */
  h: number
}

/**
 * Charge un File image dans une HTMLImageElement (promise).
 */
export function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

/**
 * Applique un blur sur les zones spécifiées d'une image source et retourne
 * un Blob JPEG de la version floutée.
 *
 * @param image     HTMLImageElement source (taille naturelle préservée)
 * @param zones     Liste des rectangles à flouter (coordonnées image native)
 * @param blurPx    Rayon du blur (par défaut 24px — suffisant pour plaques/visages)
 * @param quality   Qualité JPEG (0-1, par défaut 0.85)
 */
export async function applyBlurZonesToBlob(
  image: HTMLImageElement,
  zones: BlurZone[],
  blurPx = 24,
  quality = 0.85,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D non disponible')

  // 1) Dessiner l'image originale en pleine résolution
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  // 2) Pour chaque zone, dessiner un fragment flouté par-dessus
  // Technique : on dessine la zone source agrandie avec filter blur sur un sub-canvas,
  // puis on la recolle. CanvasRenderingContext2D.filter est supporté Chrome/Firefox.
  for (const zone of zones) {
    if (zone.w <= 0 || zone.h <= 0) continue
    const sub = document.createElement('canvas')
    sub.width = Math.max(1, Math.floor(zone.w))
    sub.height = Math.max(1, Math.floor(zone.h))
    const subCtx = sub.getContext('2d')
    if (!subCtx) continue
    subCtx.filter = `blur(${blurPx}px)`
    subCtx.drawImage(
      image,
      zone.x,
      zone.y,
      zone.w,
      zone.h, // source rect
      0,
      0,
      sub.width,
      sub.height, // dest rect
    )
    // Reset filter avant le drawImage final
    ctx.filter = 'none'
    ctx.drawImage(sub, zone.x, zone.y, zone.w, zone.h)
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob a retourné null'))
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Convertit un File/Blob en data URL pour preview rapide.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
