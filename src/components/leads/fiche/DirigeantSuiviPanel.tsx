/**
 * DirigeantSuiviPanel — 2 colonnes "Suivi commercial / Profil psycho-IA"
 *
 * Pattern Stitch interne `.stitch/designs/fiche-client-brh.png` :
 * - Gauche : Suivi commercial (CRM-style) — statut + CA + actions à venir
 * - Droite : Profil psycho-commercial IA — résumé + motivations + accroche
 *
 * Sprint 1.7 (27/05). Le profil IA est servi depuis brh_dirigeants.psy_profile
 * (jsonb). Si absent → CTA "Générer". La génération réelle se fera via une EF
 * dédiée (placeholder visible jusqu'à câblage Claude live).
 */
import { Sparkles, MessageCircle, CalendarPlus, Phone, ExternalLink, FileText } from 'lucide-react'
import type { FichePersonne } from '@/types/fiche'

interface PsyProfile {
  version?: string
  generated_at?: string
  model?: string
  summary?: string
  motivations?: string[]
  pain_points?: string[]
  best_approach?: string
  red_flags?: string[]
}

interface Props {
  identity: FichePersonne['identity']
  brhHistorique: FichePersonne['brh_historique']
  scoreVente?: FichePersonne['score_vente_aggregate']
  rolesCount: number
  patrimoineTotal: number
  contactsPro?: FichePersonne['contacts_pro']
  /** Profil psy déjà généré (JSONB stocké) — null si pas encore. */
  psyProfile?: PsyProfile | null
  /** Action de génération IA (déclenche EF + refresh). undefined = bouton masqué. */
  onGenerateProfile?: () => void
  /** Loading state pour le bouton de génération. */
  generating?: boolean
}

export default function DirigeantSuiviPanel({
  identity,
  brhHistorique,
  scoreVente,
  rolesCount,
  patrimoineTotal,
  contactsPro,
  psyProfile,
  onGenerateProfile,
  generating = false,
}: Props) {
  const isClient = brhHistorique?.is_client === true
  const isProspect = brhHistorique?.is_prospect === true
  const hasContact = !!(contactsPro?.tel_pro_via_entreprise || contactsPro?.osint_telephone || contactsPro?.email_pro_via_entreprise || contactsPro?.osint_email)

  // Statut commercial heuristique
  const statutLabel = isClient
    ? 'Client BRH'
    : isProspect
      ? 'Prospect en cours'
      : hasContact
        ? 'À contacter'
        : 'À enrichir (sans contact)'
  const statutDot = isClient
    ? 'bg-[#00600a]'
    : isProspect
      ? 'bg-amber-500'
      : hasContact
        ? 'bg-blue-500'
        : 'bg-stone-400'

  // Recommandation d'action next-step
  const recommendedAction = recommendNextAction({ isClient, isProspect, hasContact, scoreVente, patrimoineTotal })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Colonne 1 — Suivi commercial */}
      <section className="rounded-2xl bg-surface ring-1 ring-border-strong/20 p-5">
        <header className="mb-4 flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-100">
            <FileText className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <h2 className="font-display text-sm font-bold text-text">
            Suivi commercial
          </h2>
        </header>

        <dl className="space-y-3 text-sm">
          <Row label="Statut">
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-text">
              <span className={`h-1.5 w-1.5 rounded-full ${statutDot}`} />
              {statutLabel}
            </span>
          </Row>
          {brhHistorique?.ca_total != null && brhHistorique.ca_total > 0 && (
            <Row label="CA cumulé">
              <span className="font-display font-bold tabular-nums text-text">
                {brhHistorique.ca_total.toLocaleString('fr-FR')} €
              </span>
            </Row>
          )}
          {brhHistorique?.premiere_facture && (
            <Row label="Première facture">
              <span className="tabular-nums">{brhHistorique.premiere_facture}</span>
            </Row>
          )}
          {brhHistorique?.derniere_facture && (
            <Row label="Dernière facture">
              <span className="tabular-nums">{brhHistorique.derniere_facture}</span>
            </Row>
          )}
          {brhHistorique?.rdv_count != null && (
            <Row label="Nombre de RDV">
              <span className="font-display font-bold tabular-nums">{brhHistorique.rdv_count}</span>
            </Row>
          )}
          <Row label="Mandats SCI">
            <span className="font-display font-bold tabular-nums">{rolesCount}</span>
          </Row>
          <Row label="DPE détenus via SCI">
            <span className="font-display font-bold tabular-nums">{patrimoineTotal.toLocaleString('fr-FR')}</span>
          </Row>
        </dl>

        {/* Recommandation next-step */}
        <div className="mt-5 rounded-2xl bg-[#00600a]/5 px-4 py-3 ring-1 ring-[#00600a]/20">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#00600a]">
            Action recommandée
          </div>
          <p className="mt-1 text-xs text-text leading-relaxed">{recommendedAction}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {contactsPro?.tel_pro_via_entreprise && (
              <a
                href={`tel:${contactsPro.tel_pro_via_entreprise.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#00600a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004807]"
              >
                <Phone className="h-3 w-3" /> Appeler
              </a>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
              disabled
              title="Module RDV à venir"
            >
              <CalendarPlus className="h-3 w-3" /> Planifier RDV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-text hover:bg-stone-200"
              disabled
              title="Module note CRM à venir"
            >
              <MessageCircle className="h-3 w-3" /> Ajouter note
            </button>
          </div>
        </div>
      </section>

      {/* Colonne 2 — Profil psycho-commercial IA */}
      <section className="rounded-2xl bg-surface ring-1 ring-border-strong/20 p-5">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-100">
              <Sparkles className="h-3.5 w-3.5 text-purple-700" />
            </div>
            <h2 className="font-display text-sm font-bold text-text">
              Profil psycho-commercial IA
            </h2>
          </div>
          {psyProfile?.model && (
            <span
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted"
              title={psyProfile.generated_at ?? undefined}
            >
              {psyProfile.model}
            </span>
          )}
        </header>

        {psyProfile && (psyProfile.summary || psyProfile.motivations) ? (
          <div className="space-y-4 text-sm">
            {psyProfile.summary && (
              <p className="text-text leading-relaxed italic">"{psyProfile.summary}"</p>
            )}
            {psyProfile.motivations && psyProfile.motivations.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Motivations probables
                </div>
                <ul className="space-y-1">
                  {psyProfile.motivations.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#00600a]" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {psyProfile.pain_points && psyProfile.pain_points.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Pain points
                </div>
                <ul className="space-y-1">
                  {psyProfile.pain_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {psyProfile.best_approach && (
              <div className="rounded-2xl bg-[#00600a]/5 px-4 py-3 ring-1 ring-[#00600a]/20">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[#00600a]">
                  Accroche recommandée
                </div>
                <p className="mt-1 text-xs text-text italic">{psyProfile.best_approach}</p>
              </div>
            )}
            {psyProfile.red_flags && psyProfile.red_flags.length > 0 && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                <div className="text-[10px] uppercase tracking-widest font-bold text-red-800">
                  Red flags
                </div>
                <ul className="mt-1 space-y-1">
                  {psyProfile.red_flags.map((f, i) => (
                    <li key={i} className="text-xs text-red-900">
                      • {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-text-muted leading-relaxed">
              Pas encore de profil psycho-commercial généré pour {identity.first_name ?? ''} {identity.last_name ?? identity.full_name}.
              Le profil sera produit par Claude depuis le patrimoine SCI, les autres
              entreprises, et les signaux OSINT disponibles.
            </p>
            {onGenerateProfile ? (
              <button
                type="button"
                onClick={onGenerateProfile}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? 'Génération…' : 'Générer le profil IA'}
              </button>
            ) : (
              <p className="rounded-2xl bg-stone-50 px-4 py-3 text-xs text-text-muted ring-1 ring-stone-200">
                <strong>Module IA en attente de câblage live Claude.</strong>{' '}
                Le schéma DB est en place ({' '}
                <code className="rounded bg-white px-1 text-[10px]">brh_dirigeants.psy_profile jsonb</code>{' '}
                ), l'EF dédiée sera livrée avec la migration{' '}
                <code className="rounded bg-white px-1 text-[10px]">20260527210000</code>.
              </p>
            )}
            {contactsPro?.osint_linkedin && (
              <a
                href={contactsPro.osint_linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-200"
              >
                <ExternalLink className="h-3 w-3" /> Vérifier le LinkedIn
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function recommendNextAction({
  isClient,
  isProspect,
  hasContact,
  scoreVente,
  patrimoineTotal,
}: {
  isClient: boolean
  isProspect: boolean
  hasContact: boolean
  scoreVente?: FichePersonne['score_vente_aggregate']
  patrimoineTotal: number
}): string {
  if (isClient) {
    return 'Client existant — proposer un renouvellement ou cross-sell (audit énergétique global SCI, prestation conseil).'
  }
  if (isProspect) {
    return 'Prospect actif — relancer avec un argumentaire personnalisé sur le patrimoine SCI.'
  }
  if (scoreVente && scoreVente.by_segment.tres_chaud > 0) {
    return `${scoreVente.by_segment.tres_chaud} bien(s) très chaud(s) (vente probable < 6m) : approche directe recommandée avec angle "anticipez la mutation".`
  }
  if (hasContact && patrimoineTotal >= 5) {
    return 'Dirigeant multi-biens contactable — proposer un audit énergétique groupé sur le patrimoine SCI (proposition de valeur volume).'
  }
  if (!hasContact && patrimoineTotal > 0) {
    return 'Pas de contact direct — enrichir via Apify (recherche tel/email pro) puis approche par courrier RGPD-safe.'
  }
  return 'Profil bas signal — attendre un signal d\'intention (vente, succession, travaux) avant approche commerciale.'
}
