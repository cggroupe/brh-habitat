/**
 * Lookup Supabase pour les référentiels lourds (intermittence, scop_ch, ...).
 *
 * Toutes les autres données sont bundlées en JSON statiques dans `../data/`.
 * Voir ADR-003 (mix Supabase + JSON statiques bundlés).
 */

import { supabaseTyped } from '../../supabase'

// ============================================================================
// Cache mémoire (key: serialized lookup args, value: number ou null)
// ============================================================================
const intermittenceCache = new Map<string, number>()
const scopCache = new Map<string, number>()
const seuilsCache = new Map<string, number>()

// ============================================================================
// brh_dpe_intermittence — i0 par typeChauffage × régulation × émission × inertie
// ============================================================================

export interface IntermittenceKey {
  enum_methode_application_dpe_log_id: number | string
  enum_type_chauffage_id: number
  enum_type_regulation_id: number
  enum_type_emission_distribution_id: number | string
  inertie?: 'LEGERE' | 'LOURDE' | 'légère ou moyenne' | 'lourde ou très lourde'
}

export async function getIntermittence(key: IntermittenceKey): Promise<number | null> {
  const ck = JSON.stringify(key)
  if (intermittenceCache.has(ck)) return intermittenceCache.get(ck) ?? null

  let query = supabaseTyped
    .from('brh_dpe_intermittence')
    .select('i0')
    .eq('enum_methode_application_dpe_log_id', String(key.enum_methode_application_dpe_log_id))
    .eq('enum_type_chauffage_id', key.enum_type_chauffage_id)
    .eq('enum_type_regulation_id', key.enum_type_regulation_id)
    .eq('enum_type_emission_distribution_id', String(key.enum_type_emission_distribution_id))

  if (key.inertie) {
    query = query.eq('inertie', key.inertie)
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) {
    console.warn('[supabase-lookup] getIntermittence:', error.message)
    return null
  }

  const i0 = data?.i0 ?? null
  intermittenceCache.set(ck, i0 ?? 0)
  return i0
}

// ============================================================================
// brh_dpe_scop_ch — SCOP/COP des PAC chauffage
// ============================================================================

export interface ScopKey {
  zone: string
  typeGenerateur: string
  emetteur?: string
}

export async function getScopChauffage(key: ScopKey): Promise<number | null> {
  const ck = JSON.stringify(key)
  if (scopCache.has(ck)) return scopCache.get(ck) ?? null

  let query = supabaseTyped
    .from('brh_dpe_scop_ch')
    .select('scop')
    .ilike('zone_climatique', `%${key.zone}%`)
    .ilike('type_generateur', `%${key.typeGenerateur}%`)

  if (key.emetteur) {
    query = query.ilike('type_emetteur', `%${key.emetteur}%`)
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) {
    console.warn('[supabase-lookup] getScopChauffage:', error.message)
    return null
  }

  const scop = data?.scop ?? null
  scopCache.set(ck, scop ?? 0)
  return scop
}

// ============================================================================
// brh_dpe_seuils — Étiquettes DPE A→G par surface
// ============================================================================

export interface SeuilsRow {
  surface: number | null
  cep_a: number | null
  cep_b: number | null
  cep_c: number | null
  cep_d: number | null
  cep_e: number | null
  cep_f: number | null
  ges_a: number | null
  ges_b: number | null
  ges_c: number | null
  ges_d: number | null
  ges_e: number | null
  ges_f: number | null
}

let seuilsAll: SeuilsRow[] | null = null

export async function preloadSeuils(): Promise<void> {
  if (seuilsAll) return
  const { data, error } = await supabaseTyped.from('brh_dpe_seuils').select('*').order('surface')
  if (error) {
    console.warn('[supabase-lookup] preloadSeuils:', error.message)
    return
  }
  seuilsAll = (data ?? []) as SeuilsRow[]
}

export function getSeuilsAll(): SeuilsRow[] | null {
  return seuilsAll
}

// ============================================================================
// Reset caches (entre 2 computeDpe ou 2 tests)
// ============================================================================
export function resetLookupCaches(): void {
  intermittenceCache.clear()
  scopCache.clear()
  seuilsCache.clear()
  seuilsAll = null
}
