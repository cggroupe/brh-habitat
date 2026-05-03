/**
 * Phase R7 — Historique IA particulier (symétrique de ProIAHistorique).
 */
import ChiffragesList from '@/components/shared/ChiffragesList'

export default function PartIAHistorique() {
  return (
    <ChiffragesList partnerType="particulier" newChiffrageUrl="/particulier/ia?mode=chiffrage" />
  )
}
