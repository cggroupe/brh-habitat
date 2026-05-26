import { useQuery } from '@tanstack/react-query'
import { Building2, ExternalLink, MapPin, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DgfipPivotProps {
  /** Coordonnées de l'adresse cible (sans propriétaire connu). */
  lat: number | null | undefined
  lng: number | null | undefined
}

interface DgfipCentre {
  id: string
  nom: string
  type_centre: string
  adresse: string | null
  code_postal: string | null
  commune: string | null
  telephone: string | null
  distance_km: number
}

/**
 * Pivot Data-B "trou de donnée = parcours" : quand un DPE n'a pas de propriétaire
 * connu (cas anonyme RGPD), on propose les 3 centres DGFIP les plus proches
 * pour demander un Cerfa 3233-SD (relevé de propriété parcellaire).
 *
 * Source data : RPC brh_dgfip_nearest sur table brh_ext_dgfip_centres.
 */
export default function DgfipPivot({ lat, lng }: DgfipPivotProps) {
  const { data: centres } = useQuery({
    queryKey: ['brh-dgfip-nearest', lat, lng],
    queryFn: async (): Promise<DgfipCentre[]> => {
      if (lat == null || lng == null) return []
      // RPC ajoutée mig 20260527120000 — pas encore dans database.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('brh_dgfip_nearest', {
        p_lat: lat,
        p_lng: lng,
        p_limit: 3,
      })
      if (error) throw error
      return ((data ?? []) as unknown) as DgfipCentre[]
    },
    enabled: lat != null && lng != null,
    staleTime: 24 * 60 * 60 * 1000,
  })

  if (!centres || centres.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
        Aucun centre DGFIP géolocalisé disponible pour cette adresse.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">
        Pour identifier le propriétaire personne physique de cette parcelle, le formulaire{' '}
        <a
          href="https://www.formulaires.service-public.fr/gf/cerfa_3233.do"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          Cerfa 3233-SD <ExternalLink className="ml-0.5 inline h-3 w-3" />
        </a>{' '}
        est à envoyer à l'un de ces centres DGFIP :
      </div>
      <div className="space-y-1.5">
        {centres.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-xs"
          >
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {c.type_centre}
                </span>
                <span className="font-medium text-slate-900">{c.nom}</span>
                <span className="text-slate-500">
                  · {c.distance_km.toFixed(1)} km
                </span>
              </div>
              <div className="mt-1 flex items-start gap-1 text-slate-600">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {c.adresse} {c.code_postal} {c.commune}
                </span>
              </div>
              {c.telephone && (
                <a
                  href={`tel:${c.telephone.replace(/\D/g, '')}`}
                  className="mt-0.5 inline-flex items-center gap-1 font-mono text-emerald-700 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {c.telephone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
