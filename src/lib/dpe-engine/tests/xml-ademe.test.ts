/**
 * Tests Phase 11 — export XML ADEME (schéma audit 5.3.1).
 *
 * V1 : vérifie le bien-formé XML, la présence des balises principales
 * et le respect des conventions (booléens 0/1, encoding UTF-8, enum_*_id).
 */

import { describe, it, expect } from 'vitest'
import { brest100m2 } from './fixtures/brest-100m2'
import { computeDpe } from '../index'
import {
  buildAuditXml,
  escapeXml,
  formatNumber,
  bool01,
  suggestXmlFilename,
  extractEtiquetteFromXml,
  zoneToEnumId,
  altitudeToEnumId,
} from '../exports/xml-ademe'

describe('XML ADEME — helpers', () => {
  it('escapeXml encode les caractères spéciaux', () => {
    expect(escapeXml('Toit & cheminée')).toBe('Toit &amp; cheminée')
    expect(escapeXml('<balise>')).toBe('&lt;balise&gt;')
    expect(escapeXml('"guillemets"')).toBe('&quot;guillemets&quot;')
    expect(escapeXml(`l'apostrophe`)).toBe('l&apos;apostrophe')
    expect(escapeXml(null)).toBe('')
    expect(escapeXml(undefined)).toBe('')
    expect(escapeXml(42)).toBe('42')
  })

  it('formatNumber évite la notation scientifique', () => {
    expect(formatNumber(0.0000001)).not.toContain('e')
    expect(formatNumber(1234567.89)).not.toContain('e')
    // Convention ADEME : pas de valeur vide pour numériques → '0' fallback
    expect(formatNumber(null)).toBe('0')
    expect(formatNumber(undefined)).toBe('0')
    expect(formatNumber(Number.NaN)).toBe('0')
  })

  it('bool01 produit "0" ou "1" — jamais true/false', () => {
    expect(bool01(true)).toBe('1')
    expect(bool01(false)).toBe('0')
    expect(bool01(null)).toBe('0')
    expect(bool01(undefined)).toBe('0')
  })

  it('zoneToEnumId mappe les 8 zones climatiques (majuscules ADEME)', () => {
    expect(zoneToEnumId('H1A')).toBe(1)
    expect(zoneToEnumId('H1B')).toBe(2)
    expect(zoneToEnumId('H1C')).toBe(3)
    expect(zoneToEnumId('H2A')).toBe(4)
    expect(zoneToEnumId('H2D')).toBe(7)
    expect(zoneToEnumId('H3')).toBe(8)
  })

  it('altitudeToEnumId regroupe en buckets', () => {
    expect(altitudeToEnumId(0)).toBe(altitudeToEnumId(300))
    expect(altitudeToEnumId(0)).not.toBe(altitudeToEnumId(500))
    expect(altitudeToEnumId(800)).not.toBe(altitudeToEnumId(500))
  })
})

describe('XML ADEME — buildAuditXml', () => {
  const result = computeDpe(brest100m2)
  const audit = {
    id: '12345678-1234-1234-1234-123456789abc',
    created_at: '2026-05-01T10:00:00Z',
    finalized_at: '2026-05-01T11:00:00Z',
  }

  const xml = buildAuditXml({
    audit,
    inputs: brest100m2,
    result,
    pro: {
      fullName: 'Jean Dupont',
      rgeNumero: 'QB-12345',
      siret: '12345678900012',
      email: 'jean@brh.fr',
    },
  })

  it('produit un XML bien formé en UTF-8', () => {
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<audit version="5.3.1">')
    expect(xml).toContain('</audit>')
  })

  it('contient les sections principales du schéma 5.3.1', () => {
    expect(xml).toContain('<administratif>')
    expect(xml).toContain('</administratif>')
    expect(xml).toContain('<logement_collection>')
    expect(xml).toContain('</logement_collection>')
    expect(xml).toContain('<vue_ensemble_logement>')
    expect(xml).toContain('<expertise_auditeur>')
    expect(xml).toContain('<fiche_technique_collection/>')
    expect(xml).toContain('<justificatif_audit_collection/>')
  })

  it('contient au moins un <logement> dans la collection', () => {
    expect(xml).toMatch(/<logement>[\s\S]*<\/logement>/)
  })

  it('reporte les étiquettes calculées dans le XML', () => {
    const etiquette = extractEtiquetteFromXml(xml)
    expect(etiquette).toBeTruthy()
    if (etiquette) {
      expect(['A', 'B', 'C', 'D', 'E', 'F', 'G']).toContain(etiquette)
      expect(etiquette).toBe(result.etiquetteDpe)
    }
  })

  it('échappe les caractères spéciaux dans les champs auditeur', () => {
    const xmlSpecial = buildAuditXml({
      audit,
      inputs: brest100m2,
      result,
      pro: {
        fullName: `Dupont & Fils "Audit"`,
        rgeNumero: 'QB<12345>',
        siret: '12345678900012',
      },
    })
    expect(xmlSpecial).not.toContain('Dupont & Fils')
    expect(xmlSpecial).not.toContain('QB<12345>')
    expect(xmlSpecial).toContain('Dupont &amp; Fils &quot;Audit&quot;')
    expect(xmlSpecial).toContain('QB&lt;12345&gt;')
  })

  it('inclut les variantes comme <logement> additionnels', () => {
    const xmlVariantes = buildAuditXml({
      audit,
      inputs: brest100m2,
      result,
      variantes: [
        { inputs: brest100m2, result, scenarioId: 1 },
        { inputs: brest100m2, result, scenarioId: 2 },
      ],
    })
    const matches = xmlVariantes.match(/<logement>/g)
    expect(matches).toBeTruthy()
    if (matches) {
      // 1 existant + 2 variantes = 3
      expect(matches.length).toBe(3)
    }
  })
})

describe('XML ADEME — suggestXmlFilename', () => {
  it('génère un nom de fichier .xml avec la date', () => {
    const name = suggestXmlFilename({
      id: '12345678-abcd',
      finalized_at: '2026-05-01T10:00:00Z',
    })
    expect(name).toMatch(/^audit-energetique-ademe-\w{8}-\d{4}-\d{2}-\d{2}\.xml$/)
    expect(name).toContain('2026-05-01')
  })

  it('utilise la date courante si finalized_at est absent', () => {
    const name = suggestXmlFilename({ id: 'abcdef12' })
    const yyyy = new Date().getFullYear()
    expect(name).toContain(String(yyyy))
    expect(name.endsWith('.xml')).toBe(true)
  })
})
