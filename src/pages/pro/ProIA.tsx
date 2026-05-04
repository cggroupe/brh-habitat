/**
 * Phase R3 — Page IA pro unifiée.
 *
 * Remplace les 3 entrées de menu legacy :
 *   - /pro/chiffrage     → /pro/ia?mode=chiffrage
 *   - /pro/assistant     → /pro/ia?mode=dtu
 *   - /pro/chiffrages    → /pro/ia/historique
 *
 * Une seule page, un sélecteur de mode en haut, le composant chat approprié
 * en dessous. Chaque mode a son contexte spécifique :
 *   - Chiffrage : estimer travaux + générer PDF
 *   - DTU       : conseil technique normes (réponses sourcées DTU)
 *   - Courrier  : composer un courrier prospection (depuis fiche prospect)
 */
import { useSearchParams, Link } from 'react-router-dom'
import { Calculator, BookOpen, Mail, History } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany } from '@/hooks/queries'
import ChiffrageAIChat from '@/components/shared/ChiffrageAIChat'
import ChatAI from '@/components/shared/ChatAI'

type IAMode = 'chiffrage' | 'dtu' | 'courrier'

const MODE_TABS: Array<{ id: IAMode; label: string; icon: typeof Calculator; description: string }> = [
  {
    id: 'chiffrage',
    label: 'Chiffrage',
    icon: Calculator,
    description: 'Estimer un chantier + générer un PDF chiffrage',
  },
  {
    id: 'dtu',
    label: 'Conseil DTU',
    icon: BookOpen,
    description: 'Réponses normes / techniques (DTU, RT2020, RGE)',
  },
  {
    id: 'courrier',
    label: 'Courrier prospect',
    icon: Mail,
    description: 'Générer un courrier de prospection ciblé',
  },
]

export default function ProIA() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as IAMode | null) ?? 'chiffrage'
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)

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
          to="/pro/ia/historique"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <History size={16} /> Historique
        </Link>
      </header>

      {/* Sélecteur de mode */}
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
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Contenu selon mode */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {mode === 'chiffrage' ? (
          <ChiffrageAIChat
            partnerType="pro"
            userId={user?.id}
            userName={user?.full_name}
            companyId={company?.id}
            companyName={company?.name}
            welcomeMessage="Bonjour ! Je vais vous aider à créer un chiffrage estimatif pour votre client.

Quel type de travaux souhaitez-vous chiffrer ? (toiture, isolation, fenêtres, électricité, plomberie, ravalement, etc.)"
            subtitle="Mode chiffrage — estimations + PDF"
          />
        ) : null}

        {mode === 'dtu' ? <ChatAI mode="pro" userName={user?.full_name} /> : null}

        {mode === 'courrier' ? (
          <CourrierGuide />
        ) : null}
      </div>
    </div>
  )
}

/**
 * Mode courrier : guide vers la fiche prospect (où la modal Phase 13
 * `GenerateLetterModal` est déjà câblée). On ne duplique pas ici l'IA courrier,
 * elle vit côté prospect car elle a besoin du contexte DPE / score / aides.
 */
function CourrierGuide() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <Mail className="mx-auto text-primary" size={48} />
        <h2 className="text-xl font-semibold">Générer un courrier prospect</h2>
        <p className="text-sm text-gray-600">
          La génération de courrier se fait directement depuis la fiche d'un
          prospect. L'IA s'appuie sur le DPE, le score v2 et les aides MPR
          identifiées pour proposer un texte personnalisé.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Link
            to="/pro/prospects-bretagne"
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark"
          >
            Choisir un prospect Bretagne
          </Link>
          <Link
            to="/pro/prospects-carte"
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Voir la carte
          </Link>
        </div>
      </div>
    </div>
  )
}
