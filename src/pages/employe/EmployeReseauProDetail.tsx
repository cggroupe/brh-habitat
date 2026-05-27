/**
 * Page Employé — fiche détaillée prospect Réseau Pro.
 * Route : /employe/reseau-pro/:id
 */
import { useParams } from 'react-router-dom'
import FicheReseauProView from '@/components/reseau-pro/FicheReseauProView'

export default function EmployeReseauProDetail() {
  const { id } = useParams<{ id: string }>()
  const prospectId = id ? parseInt(id, 10) : NaN
  if (Number.isNaN(prospectId) || prospectId <= 0) {
    return <div className="p-6 text-sm text-red-700">ID invalide</div>
  }
  return <FicheReseauProView prospectId={prospectId} backUrl="/employe/reseau-pro" />
}
