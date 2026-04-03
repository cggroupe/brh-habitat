import { MessageSquare } from 'lucide-react'

export default function ProMessages() {
  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Messages
        </h1>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-primary" />
        </div>
        <h2 className="font-display text-lg uppercase tracking-wide text-slate-700 mb-2">
          Messagerie en cours de developpement
        </h2>
        <p className="font-body text-sm text-slate-400 max-w-sm">
          La messagerie avec l'equipe BRH sera disponible prochainement.
        </p>
      </div>
    </div>
  )
}
