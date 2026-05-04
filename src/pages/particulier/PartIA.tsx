/**
 * Phase R7 — Page IA particulier unifiée (symétrique de ProIA).
 *
 * Remplace les 3 entrées de menu legacy :
 *   /particulier/chiffrage     → /particulier/ia?mode=chiffrage
 *   /particulier/assistant     → /particulier/ia?mode=dtu
 *   /particulier/chiffrages    → /particulier/ia/historique
 */
import { useSearchParams, Link } from 'react-router-dom'
import { Calculator, BookOpen, History } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ChiffrageAIChat from '@/components/shared/ChiffrageAIChat'
import ChatAI from '@/components/shared/ChatAI'

type IAMode = 'chiffrage' | 'dtu'

const MODE_TABS: Array<{ id: IAMode; label: string; icon: typeof Calculator; description: string }> = [
  {
    id: 'chiffrage',
    label: 'Chiffrage',
    icon: Calculator,
    description: 'Estimer le coût des travaux pour vous ou un filleul',
  },
  {
    id: 'dtu',
    label: 'Conseil DTU',
    icon: BookOpen,
    description: 'Réponses techniques (normes, RT2020, isolation, chauffage)',
  },
]

export default function PartIA() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as IAMode | null) ?? 'chiffrage'
  const { user } = useAuth()

  function setMode(next: IAMode) {
    setSearchParams({ mode: next }, { replace: true })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-4 lg:p-6 gap-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display tracking-tight">IA Bâtiment</h1>
          <p className="text-sm text-gray-600">
            {MODE_TABS.find((t) => t.id === mode)?.description}
          </p>
        </div>
        <Link
          to="/particulier/ia/historique"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <History size={16} /> Historique
        </Link>
      </header>

      <nav className="flex gap-2 border-b border-gray-200">
        {MODE_TABS.map((t) => {
          const active = t.id === mode
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {mode === 'chiffrage' ? (
          <ChiffrageAIChat
            partnerType="particulier"
            userId={user?.id}
            userName={user?.full_name}
            welcomeMessage="Bonjour ! Je vais vous aider à estimer le coût des travaux pour vous ou pour un filleul.

Quel type de travaux souhaitez-vous chiffrer ?"
            subtitle="Estimations + PDF"
          />
        ) : null}

        {mode === 'dtu' ? <ChatAI mode="particulier" userName={user?.full_name} /> : null}
      </div>
    </div>
  )
}
