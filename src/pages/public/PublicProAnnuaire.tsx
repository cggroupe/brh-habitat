/**
 * Phase 18.11 — Page publique annuaire pros par dept × métier `/pros/:dept/:metier`.
 *
 * Rendu côté client (SPA Vite, pas de SSG natif). Schema.org `LocalBusiness`
 * injecté pour indexation Google. Réutilisable comme landing SEO sur 75 combos
 * (5 dépts × 15 métiers BTP). Un sitemap.xml est généré build-time.
 */
import { useMemo, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Briefcase, MapPin, Award } from 'lucide-react'
import { useDiscoverPros } from '@/hooks/queries/reseau-discover'

const VALID_DEPTS = ['22', '29', '35', '56', '44']
const DEPT_NAMES: Record<string, string> = {
  '22': 'Côtes-d\'Armor',
  '29': 'Finistère',
  '35': 'Ille-et-Vilaine',
  '56': 'Morbihan',
  '44': 'Loire-Atlantique',
}

const VALID_METIERS = [
  'isolation_combles',
  'isolation_murs',
  'isolation_sols',
  'menuiseries',
  'pac_air_eau',
  'pac_air_air',
  'chaudiere_gaz',
  'plomberie',
  'electricite',
  'couverture',
  'zinguerie',
  'maconnerie',
  'platrerie',
  'peinture',
  'carrelage',
]

export default function PublicProAnnuaire() {
  const { dept, metier } = useParams<{ dept: string; metier: string }>()

  const isValid = !!dept && !!metier && VALID_DEPTS.includes(dept) && VALID_METIERS.includes(metier)

  const pros = useDiscoverPros(
    isValid ? { departement: dept, metier, limit: 50 } : {},
  )

  const metierLabel = useMemo(() => metier?.replace(/_/g, ' ') ?? '', [metier])
  const deptLabel = dept ? DEPT_NAMES[dept] : ''

  // Injecte Schema.org LocalBusiness JSON-LD pour indexation Google
  useEffect(() => {
    if (!isValid || !pros.data || pros.data.length === 0) return
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Pros ${metierLabel} en ${deptLabel}`,
      url: `https://www.renovation-brh.fr/pros/${dept}/${metier}`,
      itemListElement: pros.data.slice(0, 10).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'LocalBusiness',
          name: p.signer_full_name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: p.city ?? undefined,
            postalCode: p.postal_code ?? undefined,
            addressRegion: 'Bretagne',
            addressCountry: 'FR',
          },
          areaServed: deptLabel,
          knowsAbout: p.metiers,
        },
      })),
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(schema)
    script.id = 'reseau-jsonld'
    // Remove ancien si présent
    document.getElementById('reseau-jsonld')?.remove()
    document.head.appendChild(script)

    // Title + meta description
    document.title = `Pros ${metierLabel} en ${deptLabel} (${dept}) — BRH Habitat`
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = `Trouvez un pro ${metierLabel} en ${deptLabel} parmi notre réseau breton de rénovation habitat. ${pros.data.length} pros référencés.`

    return () => {
      document.getElementById('reseau-jsonld')?.remove()
    }
  }, [isValid, pros.data, dept, metier, metierLabel, deptLabel])

  if (!isValid) return <Navigate to="/" replace />

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <nav className="text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-slate-700">
          BRH Habitat
        </Link>
        {' › '}
        <Link to="/pros" className="hover:text-slate-700">
          Annuaire pros
        </Link>
        {' › '}
        <Link to={`/pros/${dept}`} className="hover:text-slate-700">
          {deptLabel}
        </Link>
        {' › '}
        <span className="text-slate-700">{metierLabel}</span>
      </nav>

      <h1 className="text-3xl font-display text-slate-800 mb-2">
        Pros {metierLabel} en {deptLabel}
      </h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Découvrez les pros référencés par BRH Habitat pour des travaux de{' '}
        <strong>{metierLabel}</strong> dans le département <strong>{dept}</strong> ({deptLabel}, Bretagne).
        Tous nos pros ont signé une charte de qualité.
      </p>

      {pros.isLoading && <p className="text-sm text-slate-400">Chargement…</p>}

      {!pros.isLoading && (pros.data ?? []).length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Aucun pro disponible pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            <Link to="/inscription/agence" className="text-cyan-700 underline">
              Inscrivez-vous
            </Link>{' '}
            pour rejoindre le réseau.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(pros.data ?? []).map((p) => (
          <li
            key={p.partner_contract_id}
            className="bg-white rounded-xl border border-slate-200/60 p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={14} className="text-cyan-600" />
              <p className="font-semibold text-slate-800">{p.signer_full_name}</p>
              {p.endorsement_count > 0 && (
                <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                  <Award size={10} /> {p.endorsement_count}
                </span>
              )}
            </div>
            <p className="text-xs text-cyan-700 mb-2">{p.partner_type.replace(/_/g, ' ')}</p>
            {(p.city || p.postal_code) && (
              <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                <MapPin size={11} />
                {[p.city, p.postal_code].filter(Boolean).join(' ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-10 prose prose-sm max-w-none">
        <h2>À propos des pros {metierLabel} en {deptLabel}</h2>
        <p>
          BRH Habitat référence des professionnels qualifiés pour vos travaux de{' '}
          <strong>{metierLabel}</strong> en {deptLabel}. Chaque pro est validé par notre équipe
          (vérification SIRET, certifications RGE pour les artisans, charte de qualité signée).
        </p>
        <p>
          Vous êtes pro {metierLabel} en {deptLabel} ? <Link to="/inscription/agence">Rejoignez le réseau</Link>{' '}
          pour proposer vos services et recevoir des leads qualifiés.
        </p>
      </section>
    </main>
  )
}
