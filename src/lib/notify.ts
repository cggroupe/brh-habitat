import { createNotification } from '@/api/partner-notifications'

/**
 * Helpers pour creer des notifications automatiques apres les actions cles.
 * Appeles depuis les mutations onSuccess dans les composants.
 */

export async function notifyNewProspect(params: {
  recipientId: string
  prospectName: string
  source: 'pro' | 'particulier'
}) {
  return createNotification({
    recipientId: params.recipientId,
    type: 'nouveau_prospect',
    title: `Nouveau prospect : ${params.prospectName}`,
    body: params.source === 'pro'
      ? 'Un nouveau prospect a ete soumis par votre equipe.'
      : 'Un nouveau parrainage a ete enregistre.',
    referenceType: 'prospect',
  })
}

export async function notifyProspectStatusChange(params: {
  recipientId: string
  prospectName: string
  newStatus: string
}) {
  const statusLabels: Record<string, string> = {
    nouveau: 'Nouveau',
    etude: 'En cours d\'etude',
    devis_envoye: 'Devis envoye',
    signe: 'Signe !',
    termine: 'Termine',
    perdu: 'Non retenu',
  }

  return createNotification({
    recipientId: params.recipientId,
    type: 'statut_prospect',
    title: `${params.prospectName} : ${statusLabels[params.newStatus] ?? params.newStatus}`,
    body: `Le statut de votre prospect a ete mis a jour.`,
    referenceType: 'prospect',
  })
}

export async function notifyQuoteSigned(params: {
  recipientId: string
  prospectName: string
  amountCents: number
  commissionCents?: number
  pointsAwarded?: number
}) {
  const amountEur = (params.amountCents / 100).toLocaleString('fr-FR')

  if (params.commissionCents) {
    const commissionEur = (params.commissionCents / 100).toLocaleString('fr-FR')
    return createNotification({
      recipientId: params.recipientId,
      type: 'devis_signe',
      title: `Devis signe : ${params.prospectName}`,
      body: `Montant ${amountEur} EUR. Votre commission de ${commissionEur} EUR est en cours de validation.`,
      referenceType: 'quote',
    })
  }

  if (params.pointsAwarded) {
    return createNotification({
      recipientId: params.recipientId,
      type: 'points_gagnes',
      title: `Votre filleul ${params.prospectName} a signe !`,
      body: `+${params.pointsAwarded} points credites sur votre compte.`,
      referenceType: 'quote',
    })
  }
}

export async function notifyCommissionPaid(params: {
  recipientId: string
  amountCents: number
}) {
  const amountEur = (params.amountCents / 100).toLocaleString('fr-FR')
  return createNotification({
    recipientId: params.recipientId,
    type: 'commission_versee',
    title: `Commission versee : ${amountEur} EUR`,
    body: 'Votre commission a ete viree sur votre compte.',
    referenceType: 'quote',
  })
}

export async function notifyRewardAvailable(params: {
  recipientId: string
  rewardName: string
}) {
  return createNotification({
    recipientId: params.recipientId,
    type: 'cadeau_disponible',
    title: `Votre cadeau est pret !`,
    body: `"${params.rewardName}" est en cours de preparation.`,
    referenceType: 'reward_claim',
  })
}
