import ReseauPage from '@/components/shared/ReseauPage'

export default function ProVendeurs() {
  return (
    <ReseauPage
      partnerType="pro"
      subtitle="Recrutez des partenaires et touchez 2,5% a chaque niveau de la pyramide"
      recruitLinks={(userId) => [
        {
          label: 'Recruter un partenaire pro',
          url: `${window.location.origin}/inscription/pro?recruiter=${userId}`,
          shareText: 'Devenez partenaire BRH Habitat !',
        },
        {
          label: 'Recruter un affilie particulier',
          url: `${window.location.origin}/inscription/particulier?recruiter=${userId}`,
          shareText: 'Parrainez vos proches avec BRH Habitat !',
        },
      ]}
      formatCommission={(c) => `${(c.commission_amount / 100).toLocaleString('fr-FR')} EUR`}
      formatTotalCommission={(stats) => `${(stats.total_commission_earned / 100).toLocaleString('fr-FR')} EUR`}
      showSourceAmount
    />
  )
}
