import { X, Send } from 'lucide-react'

interface NewThreadFormProps {
  newSubject: string
  newBody: string
  creating: boolean
  onSubjectChange: (v: string) => void
  onBodyChange: (v: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function NewThreadForm({
  newSubject,
  newBody,
  creating,
  onSubjectChange,
  onBodyChange,
  onClose,
  onSubmit,
}: NewThreadFormProps) {
  return (
    <div className="flex-1 p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Nouveau</p>
          <h2 className="font-display text-xl font-bold tracking-wide text-text-primary uppercase">Nouveau message</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-light hover:text-text-primary transition-colors rounded-xl hover:bg-background"
        >
          <X size={17} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-text-secondary mb-1.5 block">Sujet</label>
          <input
            value={newSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full px-4 py-3 border border-background hover:border-text-light/30 rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-colors"
            placeholder="Ex: Question sur mes commissions"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary mb-1.5 block">Message</label>
          <textarea
            value={newBody}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-background hover:border-text-light/30 rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
            placeholder="Ecrivez votre message a l'equipe BRH..."
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newSubject.trim() || !newBody.trim()}
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Send size={13} />
          {creating ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </div>
  )
}
