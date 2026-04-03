import { MessageSquare } from 'lucide-react'

export default function PartMessages() {
  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Messages
        </h1>
      </div>

      <div className="bg-white rounded-xl p-16 shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
          <MessageSquare size={36} className="text-slate-300" />
        </div>
        <p className="font-display text-xl uppercase tracking-wide text-slate-400 mb-3">
          Messagerie en cours de developpement
        </p>
        <p className="font-body text-sm text-slate-400 max-w-sm">
          La messagerie avec l'equipe BRH sera disponible prochainement.
        </p>
      </div>
    </div>
  )
}
