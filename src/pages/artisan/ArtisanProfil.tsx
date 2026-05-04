/**
 * Phase R4 — Page `/artisan/profil` : vue + édition du profil RGE.
 *
 * MVP : affichage en lecture des données brh_artisans_rge avec lien
 * "Mettre à jour" qui ouvre un mailto vers admin BRH (les modifs de
 * fiches RGE passent par l'admin pour validation).
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  User,
  MapPin,
  Award,
  Wrench,
  Mail,
  Phone,
  Globe,
  Loader,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ArtisanProfil() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['artisan-profile', user?.id ?? 'anon'] as const,
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('brh_artisans_rge')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader className="animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center">
        <p>Aucun profil RGE rattaché à votre compte.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <User className="text-primary" size={24} />
            {data.nom_entreprise}
          </h1>
          {data.representant ? (
            <p className="text-sm text-gray-600">{data.representant}</p>
          ) : null}
        </div>
        <Link
          to={`mailto:relationsclients@contact-brh.fr?subject=Mise à jour profil ${data.nom_entreprise}`}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Demander une mise à jour
        </Link>
      </header>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Identité</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="SIRET" value={data.siret} />
          <Row label="Email" value={data.email} icon={Mail} />
          <Row label="Téléphone" value={data.telephone} icon={Phone} />
          <Row label="Site web" value={data.site_web} icon={Globe} />
        </dl>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Localisation</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="Adresse" value={data.adresse} icon={MapPin} />
          <Row
            label="Commune"
            value={data.commune ? `${data.code_postal ?? ''} ${data.commune}` : null}
          />
          <Row label="Département" value={data.departement} />
        </dl>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <Wrench size={14} /> Spécialités
        </h2>
        <div className="flex flex-wrap gap-2">
          {(data.geste_specialites ?? []).map((g: string) => (
            <span
              key={g}
              className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary"
            >
              {g}
            </span>
          ))}
          {(!data.geste_specialites || data.geste_specialites.length === 0) ? (
            <p className="text-xs text-gray-400 italic">Aucune spécialité renseignée</p>
          ) : null}
        </div>
      </section>

      {data.rge_certifications ? (
        <section className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Award size={14} /> Certifications RGE
          </h2>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(data.rge_certifications, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  )
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ElementType
}) {
  return (
    <div>
      <dt className="text-gray-500 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="flex items-center gap-2">
        {Icon ? <Icon size={14} className="text-gray-400" /> : null}
        {value ?? <span className="text-gray-400 italic">—</span>}
      </dd>
    </div>
  )
}
