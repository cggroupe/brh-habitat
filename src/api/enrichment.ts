/**
 * Enrichissement contexte prospect : IRIS Filosofi + commune (Géorisques/OPAH/RGE)
 * + artisans RGE proches + aides locales Bretagne.
 *
 * Utilisé par ProspectStudyPanel pour densifier la fiche détail agence.
 */
import { supabase } from '@/lib/supabase'

export interface IrisContext {
  iris_code: string
  med21: number | null
  decile_estime: number | null
  couleur_mpr: 'bleu' | 'jaune' | 'violet' | 'rose' | null
  tx_proprio: number | null
  tx_avant_1975: number | null
  thermosens_kwh_dj: number | null
}

export interface CommuneContext {
  insee: string
  radon_categorie: number | null
  rga_alea: string | null
  ppri_present: boolean
  sismique_zone: number | null
  opah_active: boolean
  opah_type: string | null
  opah_operateur: string | null
  opah_fin_validite: string | null
  tx_vacance_struct: number | null
  nb_rge_isolation: number | null
  nb_rge_pac: number | null
}

export interface ArtisanProche {
  id: string
  nom_entreprise: string
  representant: string | null
  telephone: string | null
  email: string | null
  adresse: string | null
  code_postal: string | null
  commune: string | null
  geste_specialites: string[]
  rge_certifications: Record<string, unknown>
  distance_km: number
}

export interface AideLocale {
  id: number
  programme: string
  organisme: string
  niveau: string
  code_geo: string
  geste_id: string
  forfait_euros: number | null
  taux_pct: number | null
  plafond_euros: number | null
  url_officielle: string | null
  notes: string | null
}

export interface ProspectEnrichment {
  iris: IrisContext | null
  commune: CommuneContext | null
  artisans_proches: ArtisanProche[]
  aides_locales: AideLocale[]
}

/** Distance Haversine en km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export const enrichmentApi = {
  async fetch(input: {
    irisCode: string | null
    codePostal: string | null
    lat: number | null
    lng: number | null
    departement: string | null
    gestesPrioritaires: string[]
  }): Promise<ProspectEnrichment> {
    // 1) IRIS context
    let iris: IrisContext | null = null
    if (input.irisCode) {
      const { data } = await supabase
        .from('brh_ext_iris')
        .select('iris_code, med21, decile_estime, couleur_mpr, tx_proprio, tx_avant_1975, thermosens_kwh_dj')
        .eq('iris_code', input.irisCode)
        .maybeSingle()
      iris = (data ?? null) as IrisContext | null
    }

    // 2) Commune context (via INSEE = preferé) — fallback : on récup via le prospect
    let commune: CommuneContext | null = null
    if (input.irisCode) {
      const inseeFromIris = input.irisCode.slice(0, 5)
      const { data } = await supabase
        .from('brh_ext_commune')
        .select(
          'insee, radon_categorie, rga_alea, ppri_present, sismique_zone, opah_active, opah_type, opah_operateur, opah_fin_validite, tx_vacance_struct, nb_rge_isolation, nb_rge_pac',
        )
        .eq('insee', inseeFromIris)
        .maybeSingle()
      commune = (data ?? null) as CommuneContext | null
    }

    // 3) Artisans RGE proches (Haversine côté JS sur dept matching)
    let artisans_proches: ArtisanProche[] = []
    if (input.lat && input.lng && input.departement) {
      const { data } = await supabase
        .from('brh_artisans_rge')
        .select(
          'id, nom_entreprise, representant, telephone, email, adresse, code_postal, commune, latitude, longitude, geste_specialites, rge_certifications',
        )
        .eq('departement', input.departement)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50)

      const all = (data ?? []) as Array<{
        id: string
        nom_entreprise: string
        representant: string | null
        telephone: string | null
        email: string | null
        adresse: string | null
        code_postal: string | null
        commune: string | null
        latitude: number
        longitude: number
        geste_specialites: string[]
        rge_certifications: Record<string, unknown>
      }>

      const withDist = all.map((a) => ({
        ...a,
        distance_km: haversineKm(input.lat!, input.lng!, a.latitude, a.longitude),
      }))

      // Pondérer : matchs gestes prioritaires en premier, puis distance
      const matchedFirst = withDist.sort((x, y) => {
        const xMatch = input.gestesPrioritaires.some((g) => x.geste_specialites.includes(g))
        const yMatch = input.gestesPrioritaires.some((g) => y.geste_specialites.includes(g))
        if (xMatch !== yMatch) return xMatch ? -1 : 1
        return x.distance_km - y.distance_km
      })

      artisans_proches = matchedFirst.slice(0, 3) as ArtisanProche[]
    }

    // 4) Aides locales Bretagne (filtre niveau régional/départemental matchant)
    let aides_locales: AideLocale[] = []
    if (input.departement) {
      const codes = [
        '53', // Bretagne (régional)
        input.departement, // dept
      ]
      const { data } = await supabase
        .from('brh_aides_locales')
        .select(
          'id, programme, organisme, niveau, code_geo, geste_id, forfait_euros, taux_pct, plafond_euros, url_officielle, notes',
        )
        .in('code_geo', codes)
        .limit(20)
      aides_locales = (data ?? []) as AideLocale[]
    }

    return { iris, commune, artisans_proches, aides_locales }
  },
}
