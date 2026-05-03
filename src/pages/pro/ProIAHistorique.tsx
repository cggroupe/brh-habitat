/**
 * Phase R3 — Historique IA (chiffrages + futurs threads DTU/courrier).
 *
 * Pour MVP : reprend la liste des chiffrages existante (ChiffragesList).
 * Itérations futures : ajouter onglet "DTU" (conversations sauvegardées),
 * onglet "Courriers" (jointure brh_prospect_letters).
 */
import ChiffragesList from '@/components/shared/ChiffragesList'

export default function ProIAHistorique() {
  return <ChiffragesList partnerType="pro" newChiffrageUrl="/pro/ia?mode=chiffrage" />
}
