/**
 * ClientsBrhView — page dédiée aux clients BRH historiques (16 607 contacts).
 *
 * Réservée aux BRH internes (admin/pro/employe) via RPC brh_personnes_search
 * SECURITY DEFINER + check role. Pas d'accès agences/artisans.
 *
 * Affiche : nom + société + tél + email + CA + RDV count + lien DPE.
 * Filtres : Client/Prospect, dept, avec tél, avec email, avec CA, avec RDV, linked DPE.
 */
import { useState, useDeferredValue, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Loader2, Phone, Mail, User, Building2,
  Calendar, FileText, MapPin, Wallet, ChevronRight, Filter,
} from 'lucide-react'
import { useClientsBrh } from '@/hooks/queries/useClientsBrh'
import type { LeadProfile } from '@/lib/rgpd/lead-visibility'

interface Props {
  profile: LeadProfile
}

const PAGE_SIZE = 50

const DEPTS = [
  { v: '', l: 'Tous départements' },
  { v: '22', l: '22 — Côtes-d’Armor' },
  { v: '29', l: '29 — Finistère' },
  { v: '35', l: '35 — Ille-et-Vilaine' },
  { v: '44', l: '44 — Loire-Atlantique' },
  { v: '56', l: '56 — Morbihan' },
]

export default function ClientsBrhView({ profile }: Props) {
  const [query, setQuery] = useState('')
  const [statut, setStatut] = useState<'Client' | 'Prospect' | ''>('')
  const [dept, setDept] = useState('')
  const [withTel, setWithTel] = useState(false)
  const [withEmail, setWithEmail] = useState(false)
  const [withCa, setWithCa] = useState(false)
  const [withRdv, setWithRdv] = useState(false)
  const [withDpeLink, setWithDpeLink] = useState(false)
  const [page, setPage] = useState(0)

  const deferredQuery = useDeferredValue(query)

  const { data, isLoading, isFetching } = useClientsBrh({
    query: deferredQuery || undefined,
    statut: statut || null,
    dept: dept || null,
    with_tel: withTel,
    with_email: withEmail,
    with_ca: withCa,
    with_rdv: withRdv,
    with_dpe_link: withDpeLink,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const rows = data ?? []
  const total = rows[0]?.total_count ?? 0
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE))

  const profileBase = useMemo(() => {
    switch (profile) {
      case 'employe': return '/employe'
      case 'agence': return '/agence'
      case 'artisan': return '/artisan'
      default: return '/employe'
    }
  }, [profile])

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Clients BRH historiques</h1>
            <p className="text-xs text-slate-600">
              Base privée BRH — clients, prospects, RDV. Réservé aux employés BRH internes.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            {Number(total).toLocaleString('fr-FR')} contacts
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nom, société, email, téléphone, ville…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <select
            value={statut}
            onChange={(e) => { setStatut(e.target.value as ''|'Client'|'Prospect'); setPage(0) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous statuts</option>
            <option value="Client">Clients</option>
            <option value="Prospect">Prospects</option>
          </select>
          <select
            value={dept}
            onChange={(e) => { setDept(e.target.value); setPage(0) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {DEPTS.map((d) => (
              <option key={d.v} value={d.v}>{d.l}</option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
            <Filter className="h-3 w-3" />
            Filtres :
          </span>
          {[
            { v: withTel, set: setWithTel, label: 'Avec téléphone' },
            { v: withEmail, set: setWithEmail, label: 'Avec email' },
            { v: withCa, set: setWithCa, label: 'Avec CA cumulé' },
            { v: withRdv, set: setWithRdv, label: 'Avec RDV historique' },
            { v: withDpeLink, set: setWithDpeLink, label: 'Lié à un DPE F/G' },
          ].map((f, i) => (
            <label key={i} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={f.v}
                onChange={(e) => { f.set(e.target.checked); setPage(0) }}
                className="rounded"
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-2 p-4">
          {isLoading && rows.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Aucun contact. Élargissez les filtres.
            </div>
          ) : (
            rows.map((c) => (
              <ContactRow key={c.id} c={c} profileBase={profileBase} />
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 text-sm">
          <div className="text-slate-600">
            Page <b>{page + 1}</b> / {totalPages} · {Number(total).toLocaleString('fr-FR')} résultats
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Précédente
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Suivante
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactRow({ c, profileBase }: { c: ReturnType<typeof useClientsBrh>['data'] extends Array<infer T> | undefined ? T : never; profileBase: string }) {
  const Icon = c.is_pro || c.societe ? Building2 : User
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">
              {c.full_name || c.societe || c.fingerprint_hash.slice(0, 8)}
            </span>
            {c.societe && c.full_name && (
              <span className="truncate text-xs text-slate-500">{c.societe}</span>
            )}
            {c.statut && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  c.statut === 'Client'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {c.statut}
              </span>
            )}
            {c.ca_total_eur != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                <Wallet className="h-3 w-3" />
                {c.ca_total_eur.toLocaleString('fr-FR')} €
              </span>
            )}
            {c.nb_rdv > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">
                <Calendar className="h-3 w-3" />
                {c.nb_rdv} RDV
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {c.adresse && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                {c.adresse} · {c.code_postal} {c.ville}
              </span>
            )}
            {c.telephone && (
              <a
                href={`tel:${c.telephone}`}
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                <Phone className="h-3 w-3" />
                <span className="font-mono">{c.telephone}</span>
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center gap-1 truncate text-sky-700 hover:underline"
                title={c.email}
              >
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[220px]">{c.email}</span>
              </a>
            )}
          </div>

          {(c.osint_linkedin || c.osint_facebook || c.enfants) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              {c.osint_linkedin && (
                <a
                  href={c.osint_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800 hover:bg-sky-100"
                >
                  LinkedIn
                </a>
              )}
              {c.osint_facebook && (
                <a
                  href={c.osint_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-800 hover:bg-blue-100"
                >
                  Facebook
                </a>
              )}
              {c.enfants && (
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                  Famille : {c.enfants}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {c.linked_dpe_id && (
            <Link
              to={`${profileBase}/leads/adresse/${c.linked_dpe_id}`}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              title="Voir le DPE lié"
            >
              <FileText className="h-3 w-3" />
              DPE F/G
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          <span className="text-[10px] text-slate-400">
            {c.source_primaire}
            {c.sources_secondaires?.length > 0 && ` +${c.sources_secondaires.length}`}
          </span>
        </div>
      </div>
    </div>
  )
}
