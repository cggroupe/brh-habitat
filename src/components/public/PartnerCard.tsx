/**
 * Carte partenaire pour l'annuaire public /partenaires.
 *
 * Affiche logo (ou initiales fallback), nom, ville, profession, level.
 * CTA : visiter le site web ou contacter via /contact?pro=<id>.
 */
import { Link } from 'react-router-dom'
import { ExternalLink, Mail, Award } from 'lucide-react'
import type { PublicPartner } from '@/api/partenaires-public'

const PROFESSION_LABEL: Record<NonNullable<PublicPartner['profession']>, string> = {
  architecte: 'Architecte',
  agent_immobilier: 'Agent immobilier',
  maitre_oeuvre: "Maître d'œuvre",
  courtier: 'Courtier',
  autre: 'Pro du bâtiment',
}

const LEVEL_BADGE: Record<NonNullable<PublicPartner['level']>, { label: string; cls: string }> = {
  bronze: { label: 'Bronze', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  silver: { label: 'Silver', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  gold: { label: 'Gold', cls: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  platinum: { label: 'Platinum', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || 'P'
}

export default function PartnerCard({ partner }: { partner: PublicPartner }) {
  const profLabel = partner.profession ? PROFESSION_LABEL[partner.profession] : 'Pro BTP'
  const levelBadge = partner.level ? LEVEL_BADGE[partner.level] : null

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all"
      itemScope
      itemType="https://schema.org/LocalBusiness"
    >
      <div className="flex items-start gap-3 mb-3">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={`Logo ${partner.name}`}
            className="w-12 h-12 rounded-xl object-cover bg-slate-50 shrink-0"
            loading="lazy"
            itemProp="logo"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
            {initials(partner.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-slate-900 text-base leading-tight truncate" itemProp="name">
            {partner.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{profLabel}</p>
        </div>
        {levelBadge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${levelBadge.cls}`}>
            <Award size={10} />
            {levelBadge.label}
          </span>
        )}
      </div>

      {(partner.city || partner.postal_code) && (
        <p
          className="text-xs text-slate-600 mb-3"
          itemProp="address"
          itemScope
          itemType="https://schema.org/PostalAddress"
        >
          {partner.city && <span itemProp="addressLocality">{partner.city}</span>}
          {partner.city && partner.postal_code && ' · '}
          {partner.postal_code && <span itemProp="postalCode">{partner.postal_code}</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {partner.website && (
          <a
            href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
            itemProp="url"
          >
            Site web <ExternalLink size={11} />
          </a>
        )}
        <Link
          to={`/contact?pro=${partner.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition"
        >
          <Mail size={11} />
          Contacter
        </Link>
      </div>
    </article>
  )
}
