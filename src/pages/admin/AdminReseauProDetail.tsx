/**
 * Page Admin — fiche détaillée prospect Réseau Pro (admin voit tout, peut unclaim).
 * Route : /admin/reseau-pro/:id
 */
import { useParams } from 'react-router-dom'
import FicheReseauProView from '@/components/reseau-pro/FicheReseauProView'

export default function AdminReseauProDetail() {
  const { id } = useParams<{ id: string }>()
  const prospectId = id ? parseInt(id, 10) : NaN
  if (Number.isNaN(prospectId) || prospectId <= 0) {
    return <div className="p-6 text-sm text-red-700">ID invalide</div>
  }
  return <FicheReseauProView prospectId={prospectId} backUrl="/admin/reseau-pro" />
}
