/**
 * ReseauHub — Page d'accueil `/reseau` refondue (Phase 18 v2, pivot 12/05/2026).
 *
 * Remplace l'ancien feed libre (`ReseauFeed`) par une UX d'action structurée :
 * 2 chemins clairs et exclusifs — publier un chantier OU signaler une dispo.
 * Cf audit-ux-2026-05-12 point #4 (« on a été trop loin sur le fil d'actu »).
 *
 * Les composants ReseauFeed/ReseauDecouvrir restent dans le repo (réversibilité)
 * mais ne sont plus exposés via le router.
 */
import { Link } from 'react-router-dom'
import { Briefcase, CalendarCheck, ArrowRight, Users, MessageSquare, Sparkles } from 'lucide-react'
import { useMyDisponibilites } from '@/hooks/queries/disponibilites'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'

export default function ReseauHub() {
  const { data: membership } = useMyAgenceMembership()
  // brh_disponibilites.pro_id référence brh_partner_contracts.id = membership.contractId
  // Si l'utilisateur n'est pas un signataire pro, on n'affiche que la grille hub.
  const proId = membership?.contractId ?? null
  const { data: myDispos = [] } = useMyDisponibilites(proId)
  const activeDisposCount = myDispos.filter((d) => d.status === 'active').length

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">
          Réseau pro BRH
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-text tracking-tight">
          Que voulez-vous publier&nbsp;?
        </h1>
        <p className="text-sm text-text-muted max-w-2xl">
          Le réseau BRH n'est pas un fil d'actualité. Il sert à <strong className="text-text">deux actions concrètes</strong> :
          déposer un chantier à confier, ou signaler vos disponibilités. Vos publications sont
          visibles par votre réseau ou par tous les partenaires BRH, selon votre choix.
        </p>
      </header>

      {/* 2 grosses cards d'action — exclusives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Publier un chantier */}
        <Link
          to="/reseau/chantiers/nouveau"
          className="group relative rounded-2xl border-2 border-slate-200 hover:border-slate-900 bg-white p-6 lg:p-8 transition-all hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase size={24} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-600 px-2 py-1 rounded">
              Action 1
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-text mb-1">
            Publier un chantier
          </h2>
          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Vous avez un chantier à confier ? Décrivez-le, choisissez les métiers recherchés,
            et le réseau ou les partenaires BRH viennent candidater.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 group-hover:gap-2 transition-all">
            Déposer un chantier <ArrowRight size={14} />
          </span>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-text-muted space-y-1">
            <p>• Commission BRH 5% HT par défaut</p>
            <p>• Visibilité au choix : réseau (connexions) ou public (tous partenaires)</p>
          </div>
        </Link>

        {/* Signaler une dispo */}
        <Link
          to="/reseau/disponibilites/nouvelle"
          className="group relative rounded-2xl border-2 border-slate-200 hover:border-emerald-700 bg-white p-6 lg:p-8 transition-all hover:shadow-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck size={24} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
              Action 2
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-text mb-1">
            Signaler ma disponibilité
          </h2>
          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Vous avez du temps libre, une équipe disponible, une zone à couvrir ?
            Signalez-le pour que les pros qui cherchent vous trouvent.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 group-hover:gap-2 transition-all">
            Déposer ma dispo <ArrowRight size={14} />
          </span>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-text-muted space-y-1">
            <p>• Période + zone + métiers + capacité chantiers</p>
            <p>• Visibilité au choix : réseau (connexions) ou public (tous partenaires)</p>
          </div>
          {activeDisposCount > 0 && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                <Sparkles size={9} />
                {activeDisposCount} dispo active{activeDisposCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Liens secondaires (consulter ce que les autres publient) */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-text uppercase tracking-wider">
          Ou consulter ce qui est publié
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/reseau/chantiers"
            className="group rounded-xl border border-slate-200 hover:border-slate-400 bg-white p-4 transition"
          >
            <Briefcase size={18} className="text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-text">Chantiers publiés</p>
            <p className="text-xs text-text-muted mt-0.5">Voir & candidater</p>
          </Link>
          <Link
            to="/reseau/disponibilites"
            className="group rounded-xl border border-slate-200 hover:border-slate-400 bg-white p-4 transition"
          >
            <CalendarCheck size={18} className="text-emerald-700 mb-2" />
            <p className="text-sm font-semibold text-text">Pros disponibles</p>
            <p className="text-xs text-text-muted mt-0.5">Trouver un sous-traitant</p>
          </Link>
          <Link
            to="/reseau/connexions"
            className="group rounded-xl border border-slate-200 hover:border-slate-400 bg-white p-4 transition"
          >
            <Users size={18} className="text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-text">Mon réseau</p>
            <p className="text-xs text-text-muted mt-0.5">Connexions & invitations</p>
          </Link>
        </div>
      </section>

      {/* Bandeau messagerie discret */}
      <Link
        to="/reseau/messages"
        className="flex items-center gap-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 transition group"
      >
        <MessageSquare size={18} className="text-slate-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text">Mes échanges avec le réseau</p>
          <p className="text-xs text-text-muted">Messagerie pro — discussions sur chantiers et dispos</p>
        </div>
        <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
