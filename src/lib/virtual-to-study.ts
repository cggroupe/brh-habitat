/**
 * Adapter : payload simulateur 8915 /api/dpe-virtuel → ProspectStudy.
 *
 * Le mode "virtuel" reconstruit le DPE via BDNB CSTB pour les adresses
 * SANS DPE en base. Le payload est différent du mode "prospect" :
 *   - Mode prospect : champs flat (etiquette_dpe, surface_habitable, ...)
 *   - Mode virtuel : nested (logement.surface_m2, dpe.actuel, dpe.scenarios, ...)
 *
 * Ce module unifie les 2 shapes pour réutiliser ProspectStudyPanel.
 */
import type { ProspectStudy } from '@/components/agence/ProspectStudyPanel'

interface VirtualPayload {
  found: boolean
  adresse: string
  lat: number
  lng: number
  batiment_groupe_id?: string
  logement: {
    type?: string | null
    surface_m2?: number | null
    annee_construction?: number | null
    nb_logements?: number | null
    type_chauffage?: string | null
    materiau_murs?: string | null
    materiau_toit?: string | null
  }
  dpe: {
    actuel: string
    ges_actuel?: string | null
    conso_ep_actuelle?: number | null
    scenarios: Record<
      's1' | 's2' | 's3',
      {
        cep_projete: number
        label: string
        gain_pct: number
        deperditions_used?: string
        gestes: string[]
      }
    >
    source?: string
  }
  travaux: {
    gestes?: string[]
    total_ttc: number
    total_ht?: number
    detail: Record<
      string,
      {
        qte: number
        unite: string
        montant_ttc: number
        prix_unitaire_ttc: number
        mot_cle_batichiffrage?: string
      }
    >
  }
  aides: {
    decile?: string
    mpr?: number
    cee: number
    mpr_par_decile: { bleu: number; jaune: number; violet: number; rose: number }
    detail_par_geste: Record<
      string,
      {
        cee?: number
        qte?: number
        mpr_bleu: number
        mpr_jaune: number
        mpr_violet: number
        mpr_rose: number
        cee_modeste?: number
      }
    >
    reste_a_charge?: number
  }
  consommation_reelle?: unknown
  risques?: unknown
}

/** Hash stable d'un string → integer (FNV-1a 32-bit) — pour pseudo-id. */
function hashStringToId(s: string): number {
  let hash = 2166136261
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  // Map vers une plage qui ne peut pas collisionner avec les vrais id BIGINT (1..59306)
  return -(Math.abs(hash) % 1_000_000_000) - 1_000_000
}

export function virtualToProspectStudy(
  v: VirtualPayload,
  meta: { code_postal?: string; commune?: string; departement?: string },
): ProspectStudy {
  const surface = v.logement.surface_m2 ?? 0
  const cep = v.dpe.conso_ep_actuelle ?? 0
  // Estimation grossière des coûts annuels (faute de mieux en mode virtuel)
  const coutTotal = cep * surface * 0.15
  const coutCh = coutTotal * 0.7
  const coutEcs = coutTotal * 0.2
  const coutEcl = coutTotal * 0.1

  // Wrap aides_detail dans la forme attendue par ProspectStudyPanel
  const aidesDetailWrapped = {
    detail: Object.fromEntries(
      Object.entries(v.aides.detail_par_geste ?? {}).map(([g, dg]) => [
        g,
        {
          cee: dg.cee ?? 0,
          qte: dg.qte ?? 0,
          mpr_bleu: dg.mpr_bleu,
          mpr_jaune: dg.mpr_jaune,
          mpr_violet: dg.mpr_violet,
          mpr_rose: dg.mpr_rose,
          cee_modeste: dg.cee_modeste ?? dg.cee ?? 0,
        },
      ]),
    ),
  }

  return {
    id: hashStringToId(v.batiment_groupe_id ?? v.adresse),
    iris_code: null,
    adresse: v.adresse,
    adresse_ban: v.adresse,
    code_postal: meta.code_postal ?? null,
    commune: meta.commune ?? null,
    departement: meta.departement ?? null,
    latitude: v.lat,
    longitude: v.lng,
    etiquette_dpe: v.dpe.actuel ?? null,
    etiquette_ges: v.dpe.ges_actuel ?? null,
    type_batiment: v.logement.type ?? null,
    periode_construction: null,
    surface_habitable: surface || null,
    annee_construction: v.logement.annee_construction ?? null,
    cout_energie_annuel: coutTotal || null,
    conso_m2_ep: cep || null,
    energie_chauffage: v.logement.type_chauffage ?? null,
    type_energie_chauffage: v.logement.type_chauffage ?? null,
    type_energie_ecs: null,
    type_ventilation: null,
    cout_chauffage: coutCh || null,
    cout_ecs: coutEcs || null,
    cout_eclairage: coutEcl || null,
    hauteur_sous_plafond: null,
    nombre_niveau: null,
    qualite_isolation_murs: null,
    qualite_isolation_plancher_haut: null,
    qualite_isolation_plancher_bas: null,
    qualite_isolation_menuiseries: null,
    isolation_toiture_detail: null,
    owner_name: null,
    owner_siren: null,
    owner_type: null,
    dvf_prix: null,
    dvf_date: null,
    dvf_prix_m2: null,
    dvf_distance_m: null,
    dvf_type: null,
    mpr_bleu_total: v.aides.mpr_par_decile.bleu,
    mpr_jaune_total: v.aides.mpr_par_decile.jaune,
    mpr_violet_total: v.aides.mpr_par_decile.violet,
    mpr_rose_total: v.aides.mpr_par_decile.rose,
    cee_total: v.aides.cee,
    aides_detail: aidesDetailWrapped,
    chiffrage_total_ttc: v.travaux.total_ttc,
    chiffrage_total_ht: v.travaux.total_ht,
    chiffrage_detail: v.travaux.detail,
    dpe_saut_s1: v.dpe.scenarios.s1,
    dpe_saut_s2: v.dpe.scenarios.s2,
    dpe_saut_s3: v.dpe.scenarios.s3,
  }
}
