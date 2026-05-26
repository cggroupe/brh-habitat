/**
 * brh-fiches — API drill-down pour les pages routes fiche adresse/entreprise/personne.
 *
 * Pattern : composition côté client de queries Supabase simples
 * (au lieu d'une RPC unique qui risque des bugs typage SQL comme la migration
 * brh_foncier_prospects_unified du 17/05/2026).
 */
import { supabase } from '@/lib/supabase'
import type { LeadRow } from '@/types/lead'
import type { FicheAdresse, FicheEntreprise, FichePersonne, SciInfo, Dirigeant } from '@/types/fiche'

/**
 * Normalise un nom comme la colonne `brh_dirigeants.nom_norm` (migration 20260519240000) :
 * `lower(regexp_replace(nom, '[^a-zA-ZÀ-ÿ]', '', 'g'))` — supprime espaces, parenthèses,
 * tirets, chiffres. Conserve les lettres accentuées. Permet de matcher "AULAGNON (BADOUARD)"
 * stocké comme "aulagnonbadouard" depuis l'URL "MARIE-CHRISTINE AULAGNON (BADOUARD)".
 */
function normalizeNameDb(s: string): string {
  return s.toLowerCase().replace(/[^a-zà-ÿ]/g, '')
}

function normalizeSci(row: Record<string, unknown>): SciInfo {
  const dirigeantsRaw = row.dirigeants
  const dirigeants: Dirigeant[] = Array.isArray(dirigeantsRaw)
    ? (dirigeantsRaw as Dirigeant[])
    : []
  return {
    siren: String(row.siren),
    denomination: String(row.denomination ?? ''),
    forme_juridique: (row.forme_juridique as string) ?? null,
    date_creation: (row.date_creation as string) ?? null,
    date_radiation: (row.date_radiation as string) ?? null,
    is_active: row.is_active !== false,
    adresse_complete: (row.adresse_complete as string) ?? null,
    code_postal: (row.code_postal as string) ?? null,
    commune: (row.commune as string) ?? null,
    departement: (row.departement as string) ?? null,
    lat: (row.lat as number) ?? null,
    lng: (row.lng as number) ?? null,
    activite_principale: (row.activite_principale as string) ?? null,
    activite_libelle: (row.activite_libelle as string) ?? null,
    capital_social_cents: (row.capital_social_cents as number) ?? null,
    effectif: (row.effectif as string) ?? null,
    dirigeants,
    has_deceased_dirigeant: row.has_deceased_dirigeant === true,
    succession_probable_score: (row.succession_probable_score as number) ?? 0,
  }
}

export const brhFichesApi = {
  async getFicheAdresse(dpeId: number): Promise<FicheAdresse | null> {
    const { data: dpe, error: e1 } = await supabase
      .from('brh_dpe_prospects')
      .select('*')
      .eq('id', dpeId)
      .maybeSingle()
    if (e1) throw e1
    if (!dpe) return null

    // Récupère les PII enrichies si dispo (Sprint 10) + signaux intention (Sprint 13b)
    const [{ data: pii }, { data: intent }] = await Promise.all([
      supabase
        .from('brh_lead_pii_enriched')
        .select('full_name, first_name, last_name, telephone, email, ca_total_eur, premiere_facture, derniere_facture, source')
        .eq('dpe_id', dpeId)
        .maybeSingle(),
      supabase
        .from('brh_intention_signals')
        .select('score_travaux, score_vente, score_succession, breakdown_travaux, breakdown_vente, breakdown_succession, match_confidence')
        .eq('dpe_id', dpeId)
        .maybeSingle(),
    ])
    if (pii) {
      Object.assign(dpe, {
        pii_full_name: pii.full_name,
        pii_first_name: pii.first_name,
        pii_last_name: pii.last_name,
        pii_telephone: pii.telephone,
        pii_email: pii.email,
        pii_ca_total_eur: pii.ca_total_eur,
        pii_premiere_facture: pii.premiere_facture,
        pii_derniere_facture: pii.derniere_facture,
        pii_source: pii.source,
      })
    }
    if (intent) {
      Object.assign(dpe, {
        intent_score_travaux: intent.score_travaux,
        intent_score_vente: intent.score_vente,
        intent_score_succession: intent.score_succession,
        intent_breakdown_travaux: intent.breakdown_travaux,
        intent_breakdown_vente: intent.breakdown_vente,
        intent_breakdown_succession: intent.breakdown_succession,
        intent_confidence: intent.match_confidence,
      })
    }

    let sci: SciInfo | null = null
    if (dpe.owner_siren) {
      const { data: sciRow, error: e2 } = await supabase
        .from('brh_sci_companies')
        .select('*')
        .eq('siren', dpe.owner_siren)
        .maybeSingle()
      if (e2) throw e2
      if (sciRow) sci = normalizeSci(sciRow as Record<string, unknown>)
    }

    let voisinage: FicheAdresse['voisinage'] = []
    if (dpe.code_postal) {
      const { data: vois, error: e3 } = await supabase
        .from('brh_dpe_prospects')
        .select('id, adresse, etiquette_dpe, surface_habitable, score_v2')
        .eq('code_postal', dpe.code_postal)
        .neq('id', dpeId)
        .order('score_v2', { ascending: false, nullsFirst: false })
        .limit(10)
      if (e3) throw e3
      voisinage = (vois ?? []) as FicheAdresse['voisinage']
    }

    return { dpe: dpe as unknown as LeadRow, sci, voisinage }
  },

  async getFicheEntreprise(siren: string): Promise<FicheEntreprise | null> {
    const { data: sciRow, error: e1 } = await supabase
      .from('brh_sci_companies')
      .select('*')
      .eq('siren', siren)
      .maybeSingle()
    if (e1) throw e1
    if (!sciRow) return null
    const sci = normalizeSci(sciRow as Record<string, unknown>)

    // 26/05 — Limite 500 (vs 50 avant) + count exact pour afficher total.
    // ENEDIS a 1100 DPE en DB, 50 affichés = troncation gênante audit Philippe.
    // count: 'planned' utilise les stats Postgres (rapide) au lieu de full scan.
    const { data: adr, error: e2, count: adressesTotal } = await supabase
      .from('brh_dpe_prospects')
      .select('id, adresse, code_postal, commune, etiquette_dpe, surface_habitable, annee_construction, score_v2', { count: 'exact', head: false })
      .eq('owner_siren', siren)
      .order('score_v2', { ascending: false, nullsFirst: false })
      .limit(500)
    if (e2) throw e2

    const { data: bodaccRaw, error: e3 } = await supabase
      .from('brh_bodacc_alerts')
      .select('id, type_avis, date_parution, description')
      .eq('siren', siren)
      .order('date_parution', { ascending: false })
      .limit(20)
    // Tolère l'absence de table (selon RLS profile) : on log mais on continue
    const bodacc = e3 ? [] : ((bodaccRaw ?? []) as unknown as FicheEntreprise['bodacc'])

    return {
      sci,
      is_utility: (sciRow as Record<string, unknown>).is_utility === true,
      adresses: (adr ?? []) as FicheEntreprise['adresses'],
      adresses_total: adressesTotal ?? (adr?.length ?? 0),
      bodacc,
    }
  },

  /**
   * Fiche personne — MVP : recherche par (nom + prenom) dans brh_sci_companies.dirigeants
   * JSONB + brh_dpe_prospects.particulier_name. À enrichir avec entity-hub via tunnel.
   */
  async getFichePersonneByName(fullName: string): Promise<FichePersonne | null> {
    // 26/05 — Parsing FR : URL = `prenom nom` (ex: "MARIE-CHRISTINE AULAGNON (BADOUARD)").
    // Le premier mot est toujours le prénom (joint en `${prenom} ${nom}` au build URL).
    // Le reste = nom complet, qui peut contenir espaces/parenthèses ("AULAGNON (BADOUARD)").
    // La normalisation côté DB (brh_dirigeants.nom_norm) = lower + strip non-alpha,
    // donc on compare via la même règle (cf normalizeNameDb ci-dessous).
    const parts = fullName.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return null
    const first = parts[0]
    const last = parts.length > 1 ? parts.slice(1).join(' ') : parts[0]

    // Recherche via RPC dédiée (PostgREST ne sait pas caster jsonb→text dans .ilike).
    // La RPC v3 (mig 20260526100000) normalise p_name côté SQL pour matcher nom_norm.
    const { data: sciHits, error: e1 } = await supabase.rpc('brh_sci_search_dirigeant', {
      p_name: last,
      p_limit: 30,
    })
    if (e1) throw e1

    const roles: FichePersonne['roles'] = []
    const utilitySirens = new Set<string>()
    let deathDate: string | null = null
    let birthDate: string | null = null

    for (const sciHit of sciHits ?? []) {
      // RPC v4 ajoute is_utility, pas encore dans le type généré.
      const sciRow = sciHit as typeof sciHit & { is_utility?: boolean }
      const dirs: Dirigeant[] = Array.isArray(sciRow.dirigeants)
        ? (sciRow.dirigeants as unknown as Dirigeant[])
        : []
      const me = dirs.find(
        (d) =>
          normalizeNameDb(d.nom ?? '') === normalizeNameDb(last) &&
          (!first || normalizeNameDb(d.prenom ?? '').includes(normalizeNameDb(first))),
      )
      if (!me) continue
      const siren = String(sciRow.siren)
      const isUtility = sciRow.is_utility === true
      if (isUtility) utilitySirens.add(siren)
      roles.push({
        siren,
        denomination: String(sciRow.denomination ?? ''),
        qualite: me.qualite ?? null,
        is_active: sciRow.is_active !== false,
        has_deceased_dirigeant: sciRow.has_deceased_dirigeant,
        is_utility: isUtility,
      })
      if (me.est_decede && me.deces_date) deathDate = me.deces_date
      if (me.date_naissance) birthDate = me.date_naissance
    }

    if (roles.length === 0) return null

    // 26/05 PM — Bug audit Opus : ENEDIS/ORANGE/SNCF flagués is_utility en DB.
    // Ces sociétés ne détiennent PAS de patrimoine (faux match owner_siren).
    // → patrimoine via SCI EXCLUT les utilities ; rôles les conservent (info publique vraie).
    const sirens = roles.filter((r) => !r.is_utility).map((r) => r.siren).filter(Boolean)
    let patrimoineViaSci: NonNullable<FichePersonne['patrimoine_via_sci']> = []
    const rolesNbDpe = new Map<string, number>()
    const rolesNbDpeTotal = new Map<string, number>()
    if (sirens.length > 0) {
      // Pré-comptes par SCI (total réel, non plafonné).
      const counts = await Promise.all(
        sirens.map(async (siren) => {
          const { count } = await supabase
            .from('brh_dpe_prospects')
            .select('id', { count: 'exact', head: true })
            .eq('owner_siren', siren)
          return [siren, count ?? 0] as const
        }),
      )
      for (const [siren, total] of counts) rolesNbDpeTotal.set(siren, total)

      const { data: dpeData, error: dpeErr } = await supabase
        .from('brh_dpe_prospects')
        .select('id, adresse, code_postal, commune, etiquette_dpe, surface_habitable, annee_construction, owner_siren, owner_name')
        .in('owner_siren', sirens)
        .order('etiquette_dpe', { ascending: false })
        .limit(2000)
      if (dpeErr) throw dpeErr
      const sciDenominationBySiren = new Map(roles.map((r) => [r.siren, r.denomination]))
      patrimoineViaSci = (dpeData ?? []).map((d) => ({
        id: d.id as number,
        adresse: d.adresse as string | null,
        code_postal: d.code_postal as string | null,
        commune: d.commune as string | null,
        etiquette_dpe: d.etiquette_dpe as string | null,
        surface_habitable: d.surface_habitable as number | null,
        annee_construction: d.annee_construction as number | null,
        via_sci_siren: String(d.owner_siren),
        via_sci_denomination: sciDenominationBySiren.get(String(d.owner_siren)) ?? String(d.owner_name ?? ''),
      }))
      // Compte par SCI pour annoter chaque rôle (ce qui est visible dans la liste).
      for (const p of patrimoineViaSci) {
        rolesNbDpe.set(p.via_sci_siren, (rolesNbDpe.get(p.via_sci_siren) ?? 0) + 1)
      }
    }

    return {
      identity: {
        entity_id: null,
        full_name: fullName,
        first_name: first || null,
        last_name: last,
        birth_date: birthDate,
        death_date: deathDate,
        city: null,
      },
      // nb_dpe = total réel en DB (non plafonné), pas seulement les éléments listés.
      roles: roles.map((r) => ({ ...r, nb_dpe: rolesNbDpeTotal.get(r.siren) ?? rolesNbDpe.get(r.siren) ?? 0 })),
      patrimoine_direct: [],
      patrimoine_via_sci: patrimoineViaSci,
      patrimoine_via_sci_total: Array.from(rolesNbDpeTotal.values()).reduce((a, b) => a + b, 0),
      brh_historique: null,
    }
  },
}
