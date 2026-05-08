/**
 * Phase 11.7 — Command Palette Cmd+K (refonte UX 2026-05-08).
 *
 * Standard SaaS US 2026 (Linear, Vercel, Stripe, Notion). Ouvert via Cmd+K
 * (macOS) ou Ctrl+K (Windows/Linux). Recherche fuzzy à travers toutes les
 * routes de l'agence + actions rapides.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  ClipboardList,
  Flame,
  Map,
  Star,
  Building2,
  AlertTriangle,
  Trophy,
  Network,
  Users,
  MessageCircle,
  CreditCard,
  Award,
  QrCode,
  Handshake,
  Share2,
  Globe,
  Sparkles,
  Briefcase,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  hint?: string
  to: string
  icon: LucideIcon
  keywords?: string
  group: 'Navigation' | 'Foncier' | 'Réseau pro' | 'Mon agence' | 'Actions rapides'
}

const ITEMS: CommandItem[] = [
  // Navigation
  { id: 'home', label: 'Accueil', to: '/agence', icon: LayoutDashboard, group: 'Navigation' },
  { id: 'simulateur', label: 'Simulateur énergétique', to: '/agence/simulateur', icon: Sparkles, group: 'Navigation' },
  { id: 'score', label: 'Score Vente', hint: 'Carte interactive Bretagne', to: '/agence/score-vente', icon: Flame, group: 'Navigation' },
  { id: 'leads', label: 'Mes leads actifs', to: '/agence/leads', icon: ClipboardList, group: 'Navigation' },
  { id: 'leaderboard', label: 'Classement Bretagne', hint: 'Top 50 agences', to: '/agence/leaderboard', icon: Trophy, group: 'Navigation' },

  // Foncier
  { id: 'foncier-carte', label: 'Foncier — Carte cadastre', to: '/agence/foncier/carte', icon: Map, group: 'Foncier', keywords: 'cadastre parcelle ign' },
  { id: 'foncier-prospects', label: 'Foncier — Prospects DPE', hint: '59k logements F/G', to: '/agence/foncier/prospects', icon: ClipboardList, group: 'Foncier', keywords: 'tableau filtre' },
  { id: 'foncier-favoris', label: 'Foncier — Favoris', to: '/agence/foncier/favoris', icon: Star, group: 'Foncier' },
  { id: 'foncier-sci', label: 'Foncier — SCI et personnes morales', to: '/agence/foncier/sci', icon: Building2, group: 'Foncier', keywords: 'societe immobiliere' },
  { id: 'foncier-tertiaire', label: 'Foncier — Tertiaire et permis', to: '/agence/foncier/tertiaire', icon: AlertTriangle, group: 'Foncier', keywords: 'bodacc commerce' },

  // Réseau pro
  { id: 'reseau-feed', label: 'Réseau — Fil d’actualité', to: '/reseau', icon: Globe, group: 'Réseau pro' },
  { id: 'reseau-chantiers', label: 'Réseau — Chantiers partagés', to: '/reseau/chantiers', icon: Briefcase, group: 'Réseau pro' },
  { id: 'reseau-connexions', label: 'Réseau — Mes connexions', to: '/reseau/connexions', icon: Users, group: 'Réseau pro' },
  { id: 'reseau-messages', label: 'Réseau — Messages', to: '/reseau/messages', icon: MessageCircle, group: 'Réseau pro' },

  // Mon agence
  { id: 'profil', label: 'Mon profil agence', to: '/agence/profil', icon: Building2, group: 'Mon agence' },
  { id: 'equipe', label: 'Mon équipe', to: '/agence/equipe', icon: Users, group: 'Mon agence' },
  { id: 'parrainage', label: 'Parrainage agences', hint: 'Arbre MLM 5 niveaux', to: '/agence/parrainage', icon: Network, group: 'Mon agence' },
  { id: 'social', label: 'Publications réseaux sociaux', to: '/agence/reseaux-sociaux', icon: Share2, group: 'Mon agence' },
  { id: 'qr', label: 'QR Code vitrine', to: '/agence/qr-code', icon: QrCode, group: 'Mon agence' },
  { id: 'progression', label: 'Ma progression', to: '/agence/progression', icon: Award, group: 'Mon agence' },
  { id: 'abonnement', label: 'Abonnement', to: '/agence/abonnement', icon: CreditCard, group: 'Mon agence' },
  { id: 'contributions', label: 'Apporter un prospect', to: '/agence/contributions', icon: Handshake, group: 'Mon agence' },

  // Actions rapides
  { id: 'msg-brh', label: 'Messagerie BRH', to: '/agence/messages', icon: MessageCircle, group: 'Actions rapides' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleSelect(to: string) {
    setOpen(false)
    navigate(to)
  }

  if (!open) return null

  // Group items by group
  const grouped = ITEMS.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-xl mx-4 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group-heading]]:font-semibold">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
            <Search size={15} className="text-text-subtle shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Rechercher une page, un lead, une action…"
              className="flex-1 bg-transparent border-0 outline-none text-[14px] text-text placeholder:text-text-subtle"
            />
            <kbd className="text-[10px] text-text-subtle border border-border rounded px-1.5 py-0.5 font-mono">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-text-muted">
              Aucun résultat. Essayez « foncier », « score », « parrainage »…
            </Command.Empty>
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group key={group} heading={group}>
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.hint ?? ''} ${item.keywords ?? ''}`}
                    onSelect={() => handleSelect(item.to)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-[13px] text-text data-[selected=true]:bg-surface-low data-[selected=true]:text-text"
                  >
                    <item.icon size={15} className="text-text-muted shrink-0" />
                    <span className="flex-1">
                      {item.label}
                      {item.hint && (
                        <span className="text-text-subtle ml-2 text-[12px]">{item.hint}</span>
                      )}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[10px] text-text-subtle">
            <span>Naviguer avec ↑↓ · ↵ pour ouvrir</span>
            <span>
              <kbd className="border border-border rounded px-1 py-0.5 font-mono">⌘</kbd>
              <kbd className="border border-border rounded px-1 py-0.5 font-mono ml-0.5">K</kbd>
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
