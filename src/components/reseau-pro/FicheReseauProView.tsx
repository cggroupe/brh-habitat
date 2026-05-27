/**
 * FicheReseauProView — fiche détaillée prospect annuaire réseau pro.
 *
 * Design : carte hero + sections (Contacts / Identité légale / Activité / RGE / Notes claim).
 * Logique claim :
 *  - Si non claim : bouton "Démarcher ce contact" → POST RPC claim → débloque édition statut.
 *  - Si claim par moi : affiche statut/notes éditables + bouton "Libérer le contact".
 *  - Si claim par autre : page bloquée, juste "Suivi par X (statut)" + retour à la liste.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Star, Award, Building2, User2,
  ExternalLink, Sparkles, Handshake, Lock, X, Check, Clock,
} from 'lucide-react'
import { useReseauProspect, useReseauClaim, useReseauUpdateClaim, useReseauUnclaim } from '@/hooks/queries/brh-reseau-pro'
import { useAuth } from '@/hooks/useAuth'
import {
  RESEAU_STATUS_LABELS, RESEAU_STATUS_COLORS, RESEAU_METHOD_LABELS,
  type ReseauClaimStatus, type ReseauContactMethod,
} from '@/api/brh-reseau-pro'
import Avatar from '@/components/ui/Avatar'

interface Props {
  prospectId: number
  /** URL retour vers la liste */
  backUrl: string
}

export default function FicheReseauProView({ prospectId, backUrl }: Props) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, error } = useReseauProspect(prospectId)
  const claim = useReseauClaim()
  const updateClaim = useReseauUpdateClaim()
  const unclaim = useReseauUnclaim()

  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [claimMethod, setClaimMethod] = useState<ReseauContactMethod>('phone')
  const [claimNotes, setClaimNotes] = useState('')

  const [editingStatus, setEditingStatus] = useState<ReseauClaimStatus | null>(null)
  const [editingNotes, setEditingNotes] = useState('')

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-stone-50">
        <div className="border-b border-stone-200 bg-white px-6 py-4">
          <div className="h-5 w-64 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="flex-1 space-y-3 p-6">
          <div className="h-32 animate-pulse rounded-2xl bg-stone-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-screen flex-col bg-stone-50">
        <BackBar backUrl={backUrl} />
        <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
          Erreur : {(error as Error).message}
        </div>
      </div>
    )
  }
  if (!data) return null

  const claimedByOther = data.is_claimed && data.claim?.user_id !== user?.id
  const claimedByMe = data.is_claimed && data.claim?.user_id === user?.id

  // Page bloquée — claim par un autre (employé non-admin)
  if (claimedByOther && !isAdmin) {
    return <LockedFiche data={data} backUrl={backUrl} />
  }

  const handleClaim = async () => {
    await claim.mutateAsync({ id: prospectId, method: claimMethod, notes: claimNotes || undefined })
    setShowClaimDialog(false)
    setClaimNotes('')
  }

  const handleSaveStatus = async () => {
    if (!editingStatus) return
    await updateClaim.mutateAsync({ id: prospectId, status: editingStatus, notes: editingNotes || undefined })
    setEditingStatus(null)
    setEditingNotes('')
  }

  const handleUnclaim = async () => {
    if (!window.confirm('Libérer ce contact ? Il redeviendra disponible pour les autres employés.')) return
    await unclaim.mutateAsync(prospectId)
    navigate(backUrl)
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <BackBar backUrl={backUrl} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          {/* HERO */}
          <header className="rounded-3xl bg-white ring-1 ring-border-strong/20 p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-5">
              {data.logo_url ? (
                <img src={data.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-stone-200" />
              ) : (
                <Avatar name={data.nom} size={80} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-text-muted font-bold">
                  <Sparkles size={12} className="text-[#00600a]" />
                  Réseau Pro · {data.secteur ?? 'Bretagne'}
                </div>
                <h1 className="mt-1 font-display text-3xl font-bold text-text leading-tight">
                  {data.nom}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
                  {data.metier_categorie && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={14} className="opacity-60" />
                      <strong className="text-text">{data.metier_categorie}</strong>
                    </span>
                  )}
                  {data.ville && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="opacity-60" />
                      {data.code_postal} {data.ville} ({data.departement})
                    </span>
                  )}
                  {data.note_google != null && data.nb_avis > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <Star size={14} fill="currentColor" />
                      {data.note_google.toFixed(1)} ({data.nb_avis} avis Google)
                    </span>
                  )}
                  {data.is_rge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00600a]/10 px-2.5 py-1 text-xs font-semibold text-[#00600a]">
                      <Award size={12} />
                      RGE certifié
                    </span>
                  )}
                </div>
              </div>

              {/* Claim status / CTA */}
              {claimedByMe && data.claim ? (
                <div className="shrink-0 rounded-2xl bg-[#00600a]/5 ring-1 ring-[#00600a]/30 p-3 min-w-[180px]">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#00600a]">
                    Mon contact
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RESEAU_STATUS_COLORS[data.claim.status]}`}>
                    {RESEAU_STATUS_LABELS[data.claim.status]}
                  </div>
                  <p className="mt-1.5 text-[10px] text-text-muted">
                    Depuis le{' '}
                    {new Date(data.claim.claimed_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ) : claimedByOther && isAdmin && data.claim ? (
                <div className="shrink-0 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3 min-w-[180px]">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-amber-900">
                    Vue admin
                  </div>
                  <div className="mt-1 text-xs text-amber-900">
                    Suivi par <strong>{data.claim.user_name}</strong>
                  </div>
                  <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RESEAU_STATUS_COLORS[data.claim.status]}`}>
                    {RESEAU_STATUS_LABELS[data.claim.status]}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClaimDialog(true)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#00600a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#004807] shadow-sm"
                >
                  <Handshake size={16} />
                  Démarcher ce contact
                </button>
              )}
            </div>
          </header>

          {/* CONTACTS */}
          {data.can_see_contacts && data.contacts && (
            <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
              <h2 className="mb-3 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Contacts directs
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.contacts.telephone && (
                  <a
                    href={`tel:${data.contacts.telephone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00600a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#004807]"
                  >
                    <Phone size={14} />
                    <span className="font-mono">{data.contacts.telephone}</span>
                  </a>
                )}
                {data.contacts.email && (
                  <a
                    href={`mailto:${data.contacts.email}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-medium text-text hover:bg-stone-200"
                  >
                    <Mail size={14} />
                    {data.contacts.email}
                  </a>
                )}
                {data.contacts.email_site_web && data.contacts.email_site_web !== data.contacts.email && (
                  <a
                    href={`mailto:${data.contacts.email_site_web}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-medium text-text hover:bg-stone-200"
                  >
                    <Mail size={14} />
                    {data.contacts.email_site_web}
                    <span className="text-[10px] opacity-60">· via site web</span>
                  </a>
                )}
                {data.contacts.site_web && (
                  <a
                    href={data.contacts.site_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-medium text-text hover:bg-stone-200"
                  >
                    <Globe size={14} />
                    {data.contacts.site_web.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}
                {data.contacts.linkedin && (
                  <a
                    href={data.contacts.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-100"
                  >
                    LinkedIn
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}
                {data.contacts.facebook && (
                  <a
                    href={data.contacts.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-100"
                  >
                    Facebook
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}
                {data.contacts.instagram && (
                  <a
                    href={data.contacts.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-pink-50 px-4 py-2.5 text-sm font-medium text-pink-900 hover:bg-pink-100"
                  >
                    Instagram
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* SUIVI CLAIM (si claim par moi) */}
          {claimedByMe && data.claim && (
            <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
                  Mon suivi
                </h2>
                <button
                  type="button"
                  onClick={handleUnclaim}
                  className="text-[11px] text-red-700 hover:underline"
                >
                  Libérer le contact
                </button>
              </div>

              {editingStatus === null ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-text-muted">Statut :</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${RESEAU_STATUS_COLORS[data.claim.status]}`}>
                      {RESEAU_STATUS_LABELS[data.claim.status]}
                    </span>
                    {data.claim.contact_method && (
                      <>
                        <span className="text-text-muted">·</span>
                        <span className="text-text">
                          Contact via {RESEAU_METHOD_LABELS[data.claim.contact_method]}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStatus(data.claim?.status ?? 'contacte')
                        setEditingNotes(data.claim?.notes ?? '')
                      }}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-text hover:bg-stone-200"
                    >
                      Modifier
                    </button>
                  </div>
                  {data.claim.notes && (
                    <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200 text-sm text-text whitespace-pre-wrap">
                      {data.claim.notes}
                    </div>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Clock size={11} />
                    Dernière action :{' '}
                    {new Date(data.claim.last_action_at).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">
                      Nouveau statut
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(RESEAU_STATUS_LABELS) as ReseauClaimStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditingStatus(s)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                            editingStatus === s
                              ? RESEAU_STATUS_COLORS[s]
                              : 'bg-white text-text-muted ring-stone-200 hover:ring-stone-300'
                          }`}
                        >
                          {RESEAU_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">
                      Notes (visibles par moi et l'admin)
                    </label>
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      rows={3}
                      placeholder="Compte-rendu de l'échange, prochaines étapes…"
                      className="w-full rounded-xl bg-stone-50 px-3 py-2 text-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-[#00600a]/30"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveStatus}
                      disabled={updateClaim.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#00600a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004807] disabled:opacity-50"
                    >
                      <Check size={14} />
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStatus(null)}
                      className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-text hover:bg-stone-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* IDENTITÉ LÉGALE + ACTIVITÉ */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
              <h2 className="mb-3 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Identité légale
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="SIRET" value={data.siret} mono />
                <Row label="SIREN" value={data.siren} mono />
                <Row label="NAF" value={data.naf ? `${data.naf} — ${data.naf_libelle ?? ''}` : null} />
                <Row label="Forme juridique" value={data.forme_juridique} />
                <Row label="Effectif" value={data.tranche_effectif ?? data.effectif} />
                <Row label="Chiffre d'affaires" value={data.chiffre_affaires} />
                <Row label="Date création" value={data.date_creation} />
                <Row
                  label="Adresse siège"
                  value={data.adresse ? `${data.adresse}, ${data.code_postal ?? ''} ${data.ville ?? ''}` : null}
                />
              </dl>
            </section>

            <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
              <h2 className="mb-3 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Activité & profil
              </h2>
              {data.description ? (
                <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              ) : (
                <p className="text-sm italic text-text-muted">Aucune description disponible.</p>
              )}

              {data.nom_gerant && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <User2 size={14} className="text-text-muted" />
                  <strong className="text-text">
                    {data.prenom_gerant} {data.nom_gerant}
                  </strong>
                  {data.qualite_gerant && (
                    <span className="text-text-muted">— {data.qualite_gerant}</span>
                  )}
                </div>
              )}

              {data.page_pagesjaunes && (
                <div className="mt-4">
                  <a
                    href={data.page_pagesjaunes}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#00600a] hover:underline"
                  >
                    Voir la page PagesJaunes
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </section>
          </div>

          {/* PRESTATIONS / RGE */}
          {(data.prestations || data.is_rge) && (
            <section className="rounded-2xl bg-white ring-1 ring-border-strong/20 p-5">
              <h2 className="mb-3 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                Prestations & certifications
              </h2>
              {data.is_rge && (
                <div className="mb-3 rounded-xl bg-[#00600a]/5 ring-1 ring-[#00600a]/30 p-3 text-sm">
                  <div className="font-semibold text-[#00600a] inline-flex items-center gap-1.5">
                    <Award size={14} />
                    Certifié RGE
                  </div>
                  {data.rge_domaines && (
                    <div className="mt-1 text-text">Domaines : {data.rge_domaines}</div>
                  )}
                  {data.rge_certifications && (
                    <div className="mt-1 text-text-muted text-xs">{data.rge_certifications}</div>
                  )}
                  {data.rge_date_validite && (
                    <div className="mt-1 text-text-muted text-xs">
                      Valide jusqu'au {new Date(data.rge_date_validite).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              )}
              {data.prestations && (
                <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                  {data.prestations}
                </p>
              )}
            </section>
          )}

          {/* Sources */}
          <footer className="rounded-xl bg-stone-100 p-3 text-[11px] text-text-muted">
            Sources : {data.sources ?? 'PagesJaunes / Apify'} ·
            Scraping : {data.date_scraping ?? 'inconnu'}
          </footer>
        </div>
      </div>

      {/* Modal claim */}
      {showClaimDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-text">
                Démarcher {data.nom}
              </h3>
              <button onClick={() => setShowClaimDialog(false)} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Ce contact devient <strong>votre prospect réservé</strong>. Les autres employés ne verront
              plus ses coordonnées (uniquement "Suivi par vous").
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
                  Mode de contact prévu
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(RESEAU_METHOD_LABELS) as ReseauContactMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setClaimMethod(m)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                        claimMethod === m
                          ? 'bg-[#00600a] text-white ring-[#00600a]'
                          : 'bg-white text-text ring-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {RESEAU_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1.5">
                  Notes (optionnel)
                </label>
                <textarea
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  rows={3}
                  placeholder="Premier échange, contexte, angle d'approche…"
                  className="w-full rounded-xl bg-stone-50 px-3 py-2 text-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-[#00600a]/30"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClaimDialog(false)}
                className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-text hover:bg-stone-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claim.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00600a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004807] disabled:opacity-50"
              >
                <Handshake size={14} />
                {claim.isPending ? 'En cours…' : 'Démarcher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BackBar({ backUrl }: { backUrl: string }) {
  return (
    <div className="border-b border-stone-200 bg-white px-6 py-3">
      <Link
        to={backUrl}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft size={14} />
        Retour au réseau
      </Link>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-36 shrink-0 text-[11px] uppercase tracking-widest font-medium text-text-muted">{label}</dt>
      <dd className={`min-w-0 flex-1 text-sm text-text ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="italic text-text-muted">—</span>}
      </dd>
    </div>
  )
}

function LockedFiche({ data, backUrl }: { data: { nom: string; metier_categorie: string | null; ville: string | null; departement: string | null; claim: { user_name: string | null; status: ReseauClaimStatus; claimed_at: string } | null }; backUrl: string }) {
  return (
    <div className="flex h-screen flex-col bg-stone-50">
      <BackBar backUrl={backUrl} />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 ring-1 ring-stone-200 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <Lock size={22} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-text">{data.nom}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {data.metier_categorie} · {data.ville} ({data.departement})
          </p>
          <div className="mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <p className="text-sm text-text-muted">
              Ce contact est déjà suivi par{' '}
              <strong className="text-text">{data.claim?.user_name ?? 'un autre employé'}</strong>.
            </p>
            {data.claim && (
              <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${RESEAU_STATUS_COLORS[data.claim.status]}`}>
                {RESEAU_STATUS_LABELS[data.claim.status]}
              </div>
            )}
            <p className="mt-2 text-[11px] text-text-muted">
              Depuis le {data.claim ? new Date(data.claim.claimed_at).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
          <Link
            to={backUrl}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#00600a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004807]"
          >
            <ArrowLeft size={14} />
            Retour au réseau
          </Link>
        </div>
      </div>
    </div>
  )
}
