/**
 * Page Favoris — liste des favoris polymorphes du user courant.
 * 4 sections : adresses, entreprises, personnes, parcelles. Liens drill-down.
 */
import { useMemo } from 'react'
import { Bookmark, MapPin, Building2, User, Map as MapIcon, Trash2 } from 'lucide-react'
import { useFavorisList, useToggleFavorite } from '@/hooks/queries/useFavoris'
import FicheEntityLink from './fiche/FicheEntityLink'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'
import type { FavoriEntityType, FavoriRow } from '@/api/brh-favoris'

interface Props {
  profile: LeadProfile
}

const TYPE_LABEL: Record<FavoriEntityType, string> = {
  adresse: 'Adresses',
  entreprise: 'Entreprises / SCI',
  personne: 'Personnes',
  parcelle: 'Parcelles',
}

const TYPE_ICON = {
  adresse: MapPin,
  entreprise: Building2,
  personne: User,
  parcelle: MapIcon,
} as const

export default function FavorisView({ profile }: Props) {
  const { data: favoris, isLoading, error } = useFavorisList()
  const toggle = useToggleFavorite()

  const grouped = useMemo(() => {
    const acc: Record<FavoriEntityType, FavoriRow[]> = {
      adresse: [],
      entreprise: [],
      personne: [],
      parcelle: [],
    }
    for (const f of favoris ?? []) acc[f.entity_type].push(f)
    return acc
  }, [favoris])

  const totalCount = favoris?.length ?? 0

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <Bookmark className="h-5 w-5 text-amber-600" />
          <h1 className="text-lg font-semibold text-slate-900">Mes favoris</h1>
          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-700">
            {totalCount}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Tous les éléments que vous avez marqués depuis une fiche adresse, entreprise, personne ou parcelle.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {isLoading && <div className="text-sm text-slate-500">Chargement…</div>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {(error as Error).message}
            </div>
          )}

          {!isLoading && totalCount === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              <Bookmark className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <div className="font-medium text-slate-700">Aucun favori pour le moment.</div>
              <div className="mt-1 text-xs">
                Ouvrez une fiche depuis la liste leads ou la recherche, puis cliquez sur « Ajouter aux favoris ».
              </div>
            </div>
          )}

          {(['adresse', 'entreprise', 'personne', 'parcelle'] as const).map((type) => {
            const items = grouped[type]
            if (items.length === 0) return null
            const Icon = TYPE_ICON[type]
            return (
              <section key={type} className="rounded-lg border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4" />
                    {TYPE_LABEL[type]}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-1.5 p-3">
                  {items.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <FicheEntityLink
                          kind={type === 'parcelle' ? 'adresse' : type}
                          id={f.entity_id}
                          label={f.label}
                          sublabel={f.sublabel}
                          profile={profile}
                          variant="row"
                        />
                      </div>
                      <button
                        onClick={() =>
                          toggle.mutate({
                            entity_type: f.entity_type,
                            entity_id: f.entity_id,
                            label: f.label,
                            sublabel: f.sublabel,
                          })
                        }
                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Retirer des favoris"
                        aria-label="Retirer des favoris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
