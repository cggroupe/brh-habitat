/**
 * Enrichissement automatique audit complet — appels EFs Supabase pour
 * pré-remplir le formulaire à partir d'une adresse.
 *
 *   1. dpe-express-lookup → fiche DPE BDNB CSTB (surface, période, étiquette, …)
 *   2. cadastre-fetch     → parcelle IDU IGN pour vision satellitaire
 *   3. satellite-vision-ai → analyse toiture Claude Sonnet vision
 *
 * Toutes les fonctions sont fail-soft : si l'API est down ou que rien n'est
 * trouvé, on retourne null sans casser l'UX.
 */
import { supabase } from '@/lib/supabase'
import type { PeriodeConstruction, TypeBatiment } from '@/lib/dpe-engine/types'

// ──────────────────────────────────────────────────────────────────────────────
// Types des réponses EF (extraits de leurs index.ts)
// ──────────────────────────────────────────────────────────────────────────────

export interface DpeLookupResult {
  found: boolean
  adresse?: string
  lat?: number
  lng?: number
  batiment_groupe_id?: string
  logement?: {
    type?: 'maison' | 'appartement' | string
    surface_m2?: number | null
    annee_construction?: number | null
    nb_logements?: number | null
    type_chauffage?: string | null
  }
  dpe?: {
    actuel?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | null
    ges_actuel?: string | null
    conso_ep_actuelle?: number | null
    source?: string
  }
}

export interface ParcelleCadastre {
  idu: string
  commune: string | null
  centroid_lat: number | null
  centroid_lng: number | null
  contenance_m2: number | null
}

export interface VisionToiture {
  type_toiture: 'tuile_mecanique' | 'ardoise' | 'tuile_canal' | 'zinc' | 'tole' | 'terrasse' | 'autre' | 'indetermine'
  nb_pans: 2 | 4 | 'monopente' | 'complexe' | null
  orientation_principale: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'plat' | null
  surface_estimee_m2: number | null
  etat_apparent: 'neuf' | 'bon' | 'a_renover' | 'degrade' | 'indetermine'
  ombre_solaire: 'aucune' | 'partielle' | 'importante' | 'indetermine'
  veluxes_visibles: number | null
  potentiel_pv: 'excellent' | 'bon' | 'moyen' | 'faible' | 'indetermine'
  commentaires?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Mappings utiles
// ──────────────────────────────────────────────────────────────────────────────

/** Convertit une année de construction en `PeriodeConstruction` du moteur. */
export function anneeToPeriode(annee: number | null | undefined): PeriodeConstruction | null {
  if (!annee || annee < 1800 || annee > new Date().getFullYear() + 1) return null
  if (annee < 1948) return 'avant_1948'
  if (annee <= 1974) return '1948-1974'
  if (annee <= 1977) return '1975-1977'
  if (annee <= 1982) return '1978-1982'
  if (annee <= 1988) return '1983-1988'
  if (annee <= 2000) return '1989-2000'
  if (annee <= 2005) return '2001-2005'
  if (annee <= 2012) return '2006-2012'
  return 'apres_2013'
}

/** Convertit le type BDNB en TypeBatiment du moteur. */
export function bdnbTypeToBatiment(t: string | null | undefined): TypeBatiment | null {
  if (!t) return null
  const low = t.toLowerCase()
  if (low.includes('maison')) return 'maison'
  if (low.includes('appartement') || low.includes('logement collectif')) return 'appartement'
  if (low.includes('immeuble')) return 'immeuble'
  return null
}

/** Convertit le type_toiture (vision IA) en toitureType du formulaire. */
export function visionTypeToToitureForm(t: VisionToiture['type_toiture']): 'combles_perdus' | 'combles_amenages' | 'toiture_terrasse' {
  if (t === 'terrasse') return 'toiture_terrasse'
  // Pas de distinction perdus/aménagés depuis la vision sat — défaut perdus.
  return 'combles_perdus'
}

// ──────────────────────────────────────────────────────────────────────────────
// EF callers (fail-soft)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Récupère la fiche DPE existante (BDNB CSTB) pour une adresse.
 * Retourne null si pas trouvé ou si l'EF échoue.
 */
export async function fetchDpeForAddress(input: {
  query: string
  lat?: number
  lng?: number
  postalCode?: string
}): Promise<DpeLookupResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke<DpeLookupResult>('dpe-express-lookup', {
      body: { q: input.query, lat: input.lat, lng: input.lng, cp: input.postalCode },
    })
    if (error) return null
    if (!data || !data.found) return null
    return data
  } catch {
    return null
  }
}

/**
 * Récupère la parcelle cadastre IGN pour une coordonnée GPS (centroïde).
 * Retourne le premier match. Null si rien trouvé.
 */
export async function fetchParcelleAt(lat: number, lng: number): Promise<ParcelleCadastre | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ parcelles: ParcelleCadastre[] }>('cadastre-fetch', {
      body: { lat, lng, radius_m: 50 },
    })
    if (error || !data || !data.parcelles || data.parcelles.length === 0) return null
    return data.parcelles[0]
  } catch {
    return null
  }
}

/**
 * Lance l'analyse vision satellitaire Claude Sonnet 4.6 pour une parcelle IDU.
 * Cache 365j côté backend (table brh_satellite_analyses). Coût ~0.02-0.04 €/analyse.
 */
export async function analyzeToitureVision(parcelleIdu: string, forceRefresh = false): Promise<VisionToiture | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      analysis: { roof_area_m2?: number | null; orientation?: string | null; ai_analysis?: VisionToiture }
      source: 'cache' | 'api'
    }>('satellite-vision-ai', {
      body: { parcelle_idu: parcelleIdu, force_refresh: forceRefresh },
    })
    if (error || !data) return null
    // L'analyse complète peut être stockée dans ai_analysis (jsonb) ou à plat
    const analysis = data.analysis as unknown as Record<string, unknown>
    if (!analysis) return null
    // Si l'EF stocke à plat, recompose un VisionToiture
    return {
      type_toiture: (analysis.type_toiture as VisionToiture['type_toiture']) ?? 'indetermine',
      nb_pans: (analysis.nb_pans as VisionToiture['nb_pans']) ?? null,
      orientation_principale:
        (analysis.orientation_principale as VisionToiture['orientation_principale']) ??
        (analysis.orientation as VisionToiture['orientation_principale']) ??
        null,
      surface_estimee_m2:
        (analysis.surface_estimee_m2 as number | null) ??
        (analysis.roof_area_m2 as number | null) ??
        null,
      etat_apparent: (analysis.etat_apparent as VisionToiture['etat_apparent']) ?? 'indetermine',
      ombre_solaire: (analysis.ombre_solaire as VisionToiture['ombre_solaire']) ?? 'indetermine',
      veluxes_visibles: (analysis.veluxes_visibles as number | null) ?? null,
      potentiel_pv: (analysis.potentiel_pv as VisionToiture['potentiel_pv']) ?? 'indetermine',
      commentaires: (analysis.commentaires as string | undefined) ?? undefined,
    }
  } catch {
    return null
  }
}
