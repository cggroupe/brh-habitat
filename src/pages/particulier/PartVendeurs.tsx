import ReseauPage from '@/components/shared/ReseauPage'

export default function PartVendeurs() {
  return (
    <ReseauPage
      partnerType="particulier"
      subtitle="Recrutez des affilies et touchez 2,5% sur leurs gains a chaque niveau"
      recruitLinks={(userId) => [
        {
          label: 'Lien de recrutement',
          url: `${window.location.origin}/inscription/particulier?recruiter=${userId}`,
          shareText: 'Rejoignez le reseau BRH Habitat et gagnez des points !',
        },
      ]}
      formatCommission={(c) =>
        c.source_type === 'points_particulier'
          ? `${c.commission_amount} pts`
          : `${(c.commission_amount / 100).toLocaleString('fr-FR')} EUR`
      }
      formatTotalCommission={(stats) => `${stats.total_commission_earned} pts`}
      showSourceAmount={false}
    />
  )
}
