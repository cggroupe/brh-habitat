import { Info, HeartPulse, Wrench, FileText } from 'lucide-react'

export type CarnetTab = 'infos' | 'sante' | 'travaux' | 'documents'

const TABS: { id: CarnetTab; label: string; icon: React.ElementType }[] = [
  { id: 'infos', label: 'Informations', icon: Info },
  { id: 'sante', label: 'Sante', icon: HeartPulse },
  { id: 'travaux', label: 'Travaux', icon: Wrench },
  { id: 'documents', label: 'Documents', icon: FileText },
]

interface Props {
  activeTab: CarnetTab
  onChange: (tab: CarnetTab) => void
}

export function HealthTabNavigation({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-background rounded-xl p-1 border border-gray-light">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-display text-sm transition-colors ${
              isActive
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-light hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
