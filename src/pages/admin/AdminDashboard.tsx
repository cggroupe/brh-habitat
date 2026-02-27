import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Users,
  FolderOpen,
  Calendar,
  Home,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhDiagnosticRow, DiagnosticStatus } from '@/types/database'

interface StatCard {
  label: string
  value: number | null
  icon: React.ElementType
  iconBg: string
  iconColor: string
  to: string
}

const diagnosticStatusLabels: Record<DiagnosticStatus, string> = {
  pending: 'En attente',
  analyzed: 'Analysé',
  contacted: 'Contacté',
  closed: 'Clôturé',
}

const diagnosticStatusColors: Record<DiagnosticStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  analyzed: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    diagnostics: number | null
    users: number | null
    activeCases: number | null
    pendingRdv: number | null
  }>({ diagnostics: null, users: null, activeCases: null, pendingRdv: null })
  const [recentDiagnostics, setRecentDiagnostics] = useState<BrhDiagnosticRow[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: diagnosticsCount },
        { count: usersCount },
        { count: casesCount },
        { count: rdvCount },
      ] = await Promise.all([
        supabase.from('brh_diagnostics').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('brh_cases')
          .select('*', { count: 'exact', head: true })
          .in('status', ['nouveau', 'en_cours', 'devis', 'travaux']),
        supabase
          .from('brh_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'demande'),
      ])

      setStats({
        diagnostics: diagnosticsCount ?? 0,
        users: usersCount ?? 0,
        activeCases: casesCount ?? 0,
        pendingRdv: rdvCount ?? 0,
      })
      setLoadingStats(false)
    }

    async function fetchRecentDiagnostics() {
      const { data } = await supabase
        .from('brh_diagnostics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentDiagnostics(data ?? [])
      setLoadingRecent(false)
    }

    void fetchStats()
    void fetchRecentDiagnostics()
  }, [])

  const statCards: StatCard[] = [
    {
      label: 'Total diagnostics',
      value: stats.diagnostics,
      icon: BarChart3,
      iconBg: 'bg-green-50',
      iconColor: 'text-primary',
      to: '/admin/messages',
    },
    {
      label: 'Utilisateurs',
      value: stats.users,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      to: '/admin/utilisateurs',
    },
    {
      label: 'Dossiers actifs',
      value: stats.activeCases,
      icon: FolderOpen,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      to: '/admin/dossiers',
    },
    {
      label: 'RDV en attente',
      value: stats.pendingRdv,
      icon: Calendar,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      to: '/admin/rdv',
    },
  ]

  const quickActions = [
    { label: 'Logements', icon: Home, to: '/admin/logements', desc: 'Tous les biens enregistrés' },
    { label: 'Dossiers', icon: FolderOpen, to: '/admin/dossiers', desc: 'Dossiers de rénovation' },
    { label: 'Rendez-vous', icon: Calendar, to: '/admin/rdv', desc: 'Gérer les RDV' },
    { label: 'Messages', icon: MessageSquare, to: '/admin/messages', desc: 'Demandes en attente' },
    { label: 'Articles', icon: BookOpen, to: '/admin/articles', desc: 'Blog et publications' },
    { label: 'Utilisateurs', icon: Users, to: '/admin/utilisateurs', desc: 'Comptes clients' },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl text-text-primary">Tableau de bord</h1>
        <p className="font-body text-sm text-text-light mt-1">Vue d'ensemble de l'activité BRH Habitat</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, to }) => (
          <Link
            key={label}
            to={to}
            className="bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center mb-4`}>
              <Icon size={20} />
            </div>
            {loadingStats ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="font-display text-3xl text-text-primary mb-1">{value ?? 0}</p>
            )}
            <p className="font-body text-sm text-text-secondary">{label}</p>
            <div className="flex items-center gap-1 mt-3 text-primary text-xs font-body opacity-0 group-hover:opacity-100 transition-opacity">
              Voir <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent diagnostics */}
        <div className="xl:col-span-2 bg-surface rounded-2xl border border-gray-light">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-light" />
              <h2 className="font-display text-base text-text-primary">Diagnostics récents</h2>
            </div>
            <Link to="/admin/messages" className="text-xs font-body text-primary hover:underline">
              Voir tout
            </Link>
          </div>

          {loadingRecent ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentDiagnostics.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="font-body text-sm text-text-light">Aucun diagnostic pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="px-6 py-3 font-display text-xs text-text-light uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 font-display text-xs text-text-light uppercase tracking-wider">Types</th>
                    <th className="px-6 py-3 font-display text-xs text-text-light uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-display text-xs text-text-light uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDiagnostics.map((d) => (
                    <tr key={d.id} className="border-b border-gray-light last:border-0 hover:bg-background transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-body text-sm text-text-primary font-medium">{d.contact_name}</p>
                        <p className="font-body text-xs text-text-light">{d.contact_email}</p>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {d.types.slice(0, 2).map((t) => (
                            <span key={t} className="inline-block px-2 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">
                              {t}
                            </span>
                          ))}
                          {d.types.length > 2 && (
                            <span className="text-xs text-text-light font-body">+{d.types.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${diagnosticStatusColors[d.status]}`}>
                          {diagnosticStatusLabels[d.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-surface rounded-2xl border border-gray-light">
          <div className="px-6 py-4 border-b border-gray-light">
            <h2 className="font-display text-base text-text-primary">Actions rapides</h2>
          </div>
          <div className="p-4 space-y-2">
            {quickActions.map(({ label, icon: Icon, to, desc }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-green-50 text-primary flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm text-text-primary">{label}</p>
                  <p className="font-body text-xs text-text-light truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-text-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
