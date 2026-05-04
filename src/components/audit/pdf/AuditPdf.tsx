/**
 * Document PDF audit énergétique BRH — root.
 * 4 pages : Synthèse, Bâti+Équipements, Bilan énergétique, Mentions légales.
 *
 * Phase 4 V1 : génération côté client (téléchargement direct).
 * Phase 4.1+ : EF render-audit-pdf côté Deno + Storage Supabase + URL signée.
 */

import { Document } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import type { DpeResult } from '@/lib/dpe-engine/types'
import { PageSynthese } from './pages/PageSynthese'
import { PageBatiEquip } from './pages/PageBatiEquip'
import { PageDeperditions } from './pages/PageDeperditions'
import { PageVariantes } from './pages/PageVariantes'
import { PageMentions } from './pages/PageMentions'

interface Props {
  audit: AuditRow
  result: DpeResult
}

export function AuditPdf({ audit, result }: Props) {
  return (
    <Document
      title={`Audit énergétique BRH — ${audit.id.slice(0, 8)}`}
      author="BRH Habitat"
      subject="Audit DPE 3CL 2021"
      creator="BRH Habitat — DPE Engine"
    >
      <PageSynthese audit={audit} result={result} />
      <PageBatiEquip audit={audit} />
      <PageDeperditions audit={audit} result={result} />
      <PageVariantes audit={audit} result={result} />
      <PageMentions audit={audit} result={result} />
    </Document>
  )
}
