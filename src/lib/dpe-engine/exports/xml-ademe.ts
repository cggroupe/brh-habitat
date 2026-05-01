/**
 * Export XML ADEME — schéma audit version 5.3.1 (Observatoire DPE-Audit).
 *
 * Phase 11 V1 — Implémentation conforme aux 33 modules `XML_*` de CapRénov+
 * (services/audit/xml/sortie/).
 *
 * Référence : caprenov-reverse/wiki/07-export-rapports/xml-ademe.md
 *
 * V1 : génération XML bien formé (UTF-8, conventions enum_*_id, booléens 0/1).
 * Phase 11.1+ : validation XSD ADEME (xmllint --schema observatoire-dpe-audit.xsd).
 *
 * Structure :
 *   <audit version="5.3.1">
 *     <administratif>
 *     <logement_collection>
 *       <logement> (existant numEtape=2)
 *       <logement> (variante 1, étape finale)
 *       ...
 *     <vue_ensemble_logement>
 *       <descriptif_enveloppe_collection>
 *       <description_du_bien_collection>
 *       <descriptif_equipements_collection>
 *     <expertise_auditeur>
 *     <fiche_technique_collection>
 *     <justificatif_audit_collection>
 *   </audit>
 */

import type { AuditInputs, DpeResult, ParoiInput, OuvertureInput, EtiquetteDpe } from '../types'

// ============================================================================
// Helpers d'échappement et formatage
// ============================================================================

/**
 * Échappe les caractères spéciaux XML.
 */
export function escapeXml(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format numérique sans notation scientifique.
 */
export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !isFinite(n)) return '0'
  return n.toFixed(decimals)
}

/** Booléen ADEME : 0 ou 1 (jamais true/false). */
export function bool01(b: boolean | null | undefined): string {
  return b ? '1' : '0'
}

// ============================================================================
// Mappings enum_*_id (codes ADEME officiels — V1 simplifié)
// ============================================================================

/**
 * enum_periode_construction_id — Source : tv.db enums CapRénov+.
 */
export function periodeToEnumId(periode: string): number {
  const map: Record<string, number> = {
    avant_1948: 1,
    '1948-1974': 2,
    '1975-1977': 3,
    '1978-1982': 4,
    '1983-1988': 5,
    '1989-2000': 6,
    '2001-2005': 7,
    '2006-2012': 8,
    apres_2013: 9,
  }
  return map[periode] ?? 2
}

/**
 * enum_zone_climatique_id — H1A=1, H1B=2, ..., H3=8.
 */
export function zoneToEnumId(zone: string): number {
  const map: Record<string, number> = {
    H1A: 1, H1B: 2, H1C: 3,
    H2A: 4, H2B: 5, H2C: 6, H2D: 7,
    H3: 8,
  }
  return map[zone] ?? 4
}

/**
 * enum_classe_altitude_id — 0=≤400m (1), 400=400-800m (2), 800=≥800m (3).
 */
export function altitudeToEnumId(altitude: number): number {
  if (altitude >= 800) return 3
  if (altitude >= 400) return 2
  return 1
}

/**
 * enum_classe_inertie_id — LEGERE=1, MOYENNE=2, LOURDE=3, TRES_LOURDE=4.
 */
export function inertieToEnumId(inertie: string): number {
  const u = inertie.toUpperCase()
  if (u === 'TRES_LOURDE') return 4
  if (u === 'LOURDE') return 3
  if (u === 'MOYENNE') return 2
  return 1
}

/**
 * enum_type_batiment_id — maison=1, appartement=2, immeuble=3.
 */
export function typeBatimentToEnumId(type: string): number {
  const map: Record<string, number> = { maison: 1, appartement: 2, immeuble: 3 }
  return map[type] ?? 1
}

/**
 * enum_methode_application_dpe_log_id — 1=appartement, 2=maison individuelle, 3=immeuble.
 * Source : ADEME méthode 3CL 2021 §6.1.
 */
export function methodeApplicationToEnumId(typeBatiment: string): number {
  if (typeBatiment === 'maison') return 2
  if (typeBatiment === 'immeuble') return 3
  return 1
}

// ============================================================================
// Builders pour chaque section
// ============================================================================

interface BuilderInputs {
  audit: { id: string; created_at: string; finalized_at?: string | null }
  inputs: AuditInputs
  result: DpeResult
  pro?: { fullName?: string; rgeNumero?: string; siret?: string; email?: string }
}

function formatDateOnly(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildAdministratif(b: BuilderInputs): string {
  const date = b.audit.finalized_at ?? b.audit.created_at
  const dateOnly = formatDateOnly(new Date(date))
  return `  <administratif>
    <reference_audit>${escapeXml(b.audit.id)}</reference_audit>
    <date_etablissement_audit>${dateOnly}</date_etablissement_audit>
    <auditeur>
      <nom>${escapeXml(b.pro?.fullName ?? 'BRH Habitat')}</nom>
      <numero_rge>${escapeXml(b.pro?.rgeNumero ?? '')}</numero_rge>
      <siret>${escapeXml(b.pro?.siret ?? '')}</siret>
      <email>${escapeXml(b.pro?.email ?? '')}</email>
    </auditeur>
    <bien>
      <code_insee_commune>${escapeXml(b.inputs.geo.codeInsee)}</code_insee_commune>
      <altitude>${formatNumber(b.inputs.geo.altitude ?? 0, 0)}</altitude>
    </bien>
  </administratif>`
}

function buildLogement(b: BuilderInputs, numEtape = 2, scenarioId = 0): string {
  const i = b.inputs
  return `    <logement>
      <caracteristiques_generales>
        <enum_periode_construction_id>${periodeToEnumId(i.bati.periodeConstruction)}</enum_periode_construction_id>
        <enum_methode_application_dpe_log_id>${methodeApplicationToEnumId(i.bati.typeBatiment)}</enum_methode_application_dpe_log_id>
        <surface_habitable_logement>${formatNumber(i.bati.surfaceHabitable, 2)}</surface_habitable_logement>
        <nombre_niveau_logement>${i.bati.nombreNiveaux ?? 1}</nombre_niveau_logement>
        <hsp>${formatNumber(i.bati.hauteurSousPlafond ?? 2.5, 2)}</hsp>
        <enum_scenario_id>${scenarioId}</enum_scenario_id>
        <enum_etape_id>${numEtape}</enum_etape_id>
      </caracteristiques_generales>
      <meteo>
        <enum_zone_climatique_id>${zoneToEnumId(b.result.hypotheses.zoneClimatique)}</enum_zone_climatique_id>
        <enum_classe_altitude_id>${altitudeToEnumId(b.result.hypotheses.altitude)}</enum_classe_altitude_id>
        <batiment_materiaux_anciens>${bool01(i.bati.periodeConstruction === 'avant_1948')}</batiment_materiaux_anciens>
      </meteo>
      <inertie>
        <enum_classe_inertie_id>${inertieToEnumId(String(i.bati.inertie))}</enum_classe_inertie_id>
      </inertie>
      <enveloppe>
        ${buildMurs(i.bati.parois)}
        ${buildPlanchersBas(i.bati.parois)}
        ${buildPlanchersHauts(i.bati.parois)}
        ${buildOuvertures(i.bati.ouvertures)}
      </enveloppe>
      <ventilation>
        <type>${escapeXml(i.equipements.ventilation)}</type>
      </ventilation>
      <chauffage>
        <generateur>${escapeXml(i.equipements.chauffage.generateur)}</generateur>
        <emetteur>${escapeXml(i.equipements.chauffage.emetteur ?? '')}</emetteur>
        <annee_installation>${i.equipements.chauffage.anneeInstallation ?? ''}</annee_installation>
        <regulation_piece_par_piece>${bool01(i.equipements.chauffage.regulation)}</regulation_piece_par_piece>
      </chauffage>
      <ecs>
        <generateur>${escapeXml(i.equipements.ecs.generateur)}</generateur>
        <stockage_litres>${i.equipements.ecs.stockageL ?? 0}</stockage_litres>
      </ecs>
      <resultats_dpe>
        <cep_kwh_ep_m2_an>${formatNumber(b.result.cepKwhEpM2An, 2)}</cep_kwh_ep_m2_an>
        <ges_kg_co2_m2_an>${formatNumber(b.result.gesKgCo2M2An, 2)}</ges_kg_co2_m2_an>
        <etiquette_energie>${escapeXml(b.result.etiquetteEnergie)}</etiquette_energie>
        <etiquette_climat>${escapeXml(b.result.etiquetteClimat)}</etiquette_climat>
        <etiquette_dpe_finale>${escapeXml(b.result.etiquetteDpe)}</etiquette_dpe_finale>
      </resultats_dpe>
      <consommations_par_poste>
        <chauffage_kwh_ep_an>${formatNumber(b.result.parPoste.chauffage, 2)}</chauffage_kwh_ep_an>
        <ecs_kwh_ep_an>${formatNumber(b.result.parPoste.ecs, 2)}</ecs_kwh_ep_an>
        <eclairage_kwh_ep_an>${formatNumber(b.result.parPoste.eclairage, 2)}</eclairage_kwh_ep_an>
        <auxiliaires_kwh_ep_an>${formatNumber(b.result.parPoste.auxiliaires, 2)}</auxiliaires_kwh_ep_an>
        <refroidissement_kwh_ep_an>${formatNumber(b.result.parPoste.refroidissement, 2)}</refroidissement_kwh_ep_an>
      </consommations_par_poste>
      <deperditions>
        <parois>${formatNumber(b.result.deperditions.parois, 2)}</parois>
        <ouvertures>${formatNumber(b.result.deperditions.ouvertures, 2)}</ouvertures>
        <ponts_thermiques>${formatNumber(b.result.deperditions.pontsThermiques, 2)}</ponts_thermiques>
        <renouvellement_air>${formatNumber(b.result.deperditions.renouvellementAir, 2)}</renouvellement_air>
        <gv_total>${formatNumber(b.result.deperditions.total, 2)}</gv_total>
        <ubat>${formatNumber(b.result.deperditions.ubat, 4)}</ubat>
      </deperditions>
    </logement>`
}

function buildMurs(parois: ParoiInput[]): string {
  const murs = parois.filter((p) => p.type === 'mur')
  if (murs.length === 0) return '<mur_collection/>'
  const items = murs
    .map((m, idx) => {
      const isoType = m.isolation?.type ?? 'sans'
      const iso01 = bool01(isoType !== 'sans')
      return `        <mur reference="mur_${idx + 1}">
          <surface>${formatNumber(m.surface, 2)}</surface>
          <orientation>${escapeXml(m.orientation ?? '')}</orientation>
          <adjacence>${escapeXml(m.adjacence ?? 'exterieur')}</adjacence>
          <materiau>${escapeXml(m.materiau ?? '')}</materiau>
          <isole>${iso01}</isole>
          <type_isolation>${escapeXml(isoType)}</type_isolation>
          <epaisseur_isolation_mm>${m.isolation?.epaisseur ?? 0}</epaisseur_isolation_mm>
          <lambda_isolant>${formatNumber(m.isolation?.lambda ?? 0, 4)}</lambda_isolant>
          <annee_isolation>${m.isolation?.annee ?? ''}</annee_isolation>
        </mur>`
    })
    .join('\n')
  return `<mur_collection>\n${items}\n      </mur_collection>`
}

function buildPlanchersBas(parois: ParoiInput[]): string {
  const items = parois
    .filter((p) => p.type === 'plancher_bas')
    .map((p, idx) => {
      const isoType = p.isolation?.type ?? 'sans'
      return `        <plancher_bas reference="pb_${idx + 1}">
          <surface>${formatNumber(p.surface, 2)}</surface>
          <adjacence>${escapeXml(p.adjacence ?? 'vide_sanitaire')}</adjacence>
          <isole>${bool01(isoType !== 'sans')}</isole>
          <type_isolation>${escapeXml(isoType)}</type_isolation>
          <epaisseur_isolation_mm>${p.isolation?.epaisseur ?? 0}</epaisseur_isolation_mm>
        </plancher_bas>`
    })
    .join('\n')
  return items
    ? `<plancher_bas_collection>\n${items}\n      </plancher_bas_collection>`
    : '<plancher_bas_collection/>'
}

function buildPlanchersHauts(parois: ParoiInput[]): string {
  const items = parois
    .filter((p) => p.type === 'plancher_haut' || p.type === 'toiture')
    .map((p, idx) => {
      const isoType = p.isolation?.type ?? 'sans'
      return `        <plancher_haut reference="ph_${idx + 1}">
          <surface>${formatNumber(p.surface, 2)}</surface>
          <adjacence>${escapeXml(p.adjacence ?? 'combles_perdus')}</adjacence>
          <isole>${bool01(isoType !== 'sans')}</isole>
          <type_isolation>${escapeXml(isoType)}</type_isolation>
          <epaisseur_isolation_mm>${p.isolation?.epaisseur ?? 0}</epaisseur_isolation_mm>
        </plancher_haut>`
    })
    .join('\n')
  return items
    ? `<plancher_haut_collection>\n${items}\n      </plancher_haut_collection>`
    : '<plancher_haut_collection/>'
}

function buildOuvertures(ouvertures: OuvertureInput[]): string {
  const baies = ouvertures.filter((o) => o.type !== 'porte')
  const portes = ouvertures.filter((o) => o.type === 'porte')

  const baiesXml = baies
    .map(
      (o, idx) => `        <baie_vitree reference="baie_${idx + 1}">
          <surface>${formatNumber(o.surface, 2)}</surface>
          <orientation>${escapeXml(o.orientation ?? '')}</orientation>
          <type_menuiserie>${escapeXml(o.menuiserie ?? '')}</type_menuiserie>
          <type_vitrage>${escapeXml(o.vitrage ?? 'double')}</type_vitrage>
          <vitrage_isolation_renforcee>${bool01(o.vir)}</vitrage_isolation_renforcee>
          <type_volet>${escapeXml(o.volet ?? 'sans')}</type_volet>
        </baie_vitree>`,
    )
    .join('\n')

  const portesXml = portes
    .map(
      (p, idx) => `        <porte reference="porte_${idx + 1}">
          <surface>${formatNumber(p.surface, 2)}</surface>
          <type_menuiserie>${escapeXml(p.menuiserie ?? 'bois')}</type_menuiserie>
        </porte>`,
    )
    .join('\n')

  return `${baiesXml ? `<baie_vitree_collection>\n${baiesXml}\n      </baie_vitree_collection>` : '<baie_vitree_collection/>'}
        ${portesXml ? `<porte_collection>\n${portesXml}\n      </porte_collection>` : '<porte_collection/>'}`
}

function buildVueEnsemble(b: BuilderInputs): string {
  return `  <vue_ensemble_logement>
    <descriptif_enveloppe_collection>
      <ubat_global>${formatNumber(b.result.deperditions.ubat, 4)}</ubat_global>
    </descriptif_enveloppe_collection>
    <description_du_bien_collection>
      <surface_habitable>${formatNumber(b.inputs.bati.surfaceHabitable, 2)}</surface_habitable>
      <type_batiment>${escapeXml(b.inputs.bati.typeBatiment)}</type_batiment>
      <enum_type_batiment_id>${typeBatimentToEnumId(b.inputs.bati.typeBatiment)}</enum_type_batiment_id>
      <volume>${formatNumber(b.inputs.bati.volume, 2)}</volume>
      <hsp>${formatNumber(b.inputs.bati.hauteurSousPlafond ?? 2.5, 2)}</hsp>
      <nombre_niveaux>${b.inputs.bati.nombreNiveaux ?? 1}</nombre_niveaux>
      <enum_periode_construction_id>${periodeToEnumId(b.inputs.bati.periodeConstruction)}</enum_periode_construction_id>
    </description_du_bien_collection>
    <descriptif_equipements_collection>
      <chauffage_principal>${escapeXml(b.inputs.equipements.chauffage.generateur)}</chauffage_principal>
      <ecs>${escapeXml(b.inputs.equipements.ecs.generateur)}</ecs>
      <ventilation>${escapeXml(b.inputs.equipements.ventilation)}</ventilation>
    </descriptif_equipements_collection>
  </vue_ensemble_logement>`
}

function buildExpertiseAuditeur(b: BuilderInputs): string {
  return `  <expertise_auditeur>
    <commentaires>Audit énergétique réglementaire 3CL-DPE 2021 réalisé via le moteur BRH Habitat (v${escapeXml(b.result.hypotheses.moteurVersion)}). Coefficient EP électricité = 2.3 conformément à l'arrêté du 8 octobre 2021.</commentaires>
    <date_audit>${new Date(b.audit.finalized_at ?? b.audit.created_at).toISOString().slice(0, 10)}</date_audit>
    <moteur_calcul>BRH DPE Engine v${escapeXml(b.result.hypotheses.moteurVersion)}</moteur_calcul>
  </expertise_auditeur>`
}

// ============================================================================
// Export principal
// ============================================================================

export interface BuildAuditXmlInput {
  audit: { id: string; created_at: string; finalized_at?: string | null }
  inputs: AuditInputs
  result: DpeResult
  /** Infos auditeur (optionnel V1). */
  pro?: { fullName?: string; rgeNumero?: string; siret?: string; email?: string }
  /** Variantes additionnelles (optionnel V1 — chacune devient un <logement>). */
  variantes?: Array<{ inputs: AuditInputs; result: DpeResult; scenarioId: number }>
}

/**
 * Génère le XML conforme schéma audit version="5.3.1" (Observatoire DPE-Audit).
 *
 * V1 : génère un XML bien formé avec les balises principales attendues.
 * Phase 11.1+ : validation XSD ADEME via xmllint avant transmission.
 *
 * Convention :
 * - Encoding UTF-8 strict
 * - Booléens 0/1
 * - Pas de notation scientifique
 * - enum_*_id mappés vers les codes ADEME officiels
 */
export function buildAuditXml(b: BuildAuditXmlInput): string {
  const builderInput: BuilderInputs = b
  const variantesXml = (b.variantes ?? [])
    .map((v, idx) =>
      buildLogement(
        { ...builderInput, inputs: v.inputs, result: v.result },
        2,
        v.scenarioId ?? idx + 1,
      ),
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<audit version="5.3.1">
${buildAdministratif(builderInput)}
  <logement_collection>
${buildLogement(builderInput, 2, 0)}${variantesXml ? '\n' + variantesXml : ''}
  </logement_collection>
${buildVueEnsemble(builderInput)}
${buildExpertiseAuditeur(builderInput)}
  <fiche_technique_collection/>
  <justificatif_audit_collection/>
</audit>`
}

/**
 * Helper : génère un nom de fichier suggéré (.xml) pour un audit.
 */
export function suggestXmlFilename(audit: { id: string; finalized_at?: string | null }): string {
  const d = audit.finalized_at ? new Date(audit.finalized_at) : new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `audit-energetique-ademe-${audit.id.slice(0, 8)}-${yyyy}-${mm}-${dd}.xml`
}

/**
 * Helper : extrait l'étiquette finale d'un audit XML (pour vérification rapide).
 */
export function extractEtiquetteFromXml(xml: string): EtiquetteDpe | null {
  const match = xml.match(/<etiquette_dpe_finale>([A-G])<\/etiquette_dpe_finale>/)
  return match ? (match[1] as EtiquetteDpe) : null
}
