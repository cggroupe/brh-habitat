import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useDiagnosticStore } from '@/stores/diagnosticStore'

interface StepContactProps {
  onSubmit: () => void
  isSubmitting: boolean
}

export function StepContact({ onSubmit, isSubmitting }: StepContactProps) {
  const { contact, setContact } = useDiagnosticStore()

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Vos coordonnees
        </h2>
        <p className="text-lg text-slate-500">
          Pour recevoir votre diagnostic personnalise
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Jean Dupont"
            value={contact.name ?? ''}
            onChange={(e) => setContact({ name: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Telephone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="06 12 34 56 78"
            value={contact.phone ?? ''}
            onChange={(e) => setContact({ phone: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-base font-bold text-slate-700 mb-3">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="jean@exemple.fr"
            value={contact.email ?? ''}
            onChange={(e) => setContact({ email: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-start gap-3 p-5 bg-primary/5 rounded-xl border border-primary/10">
          <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-slate-500 leading-relaxed">
            Vos donnees sont utilisees uniquement pour vous envoyer votre diagnostic et vous recontacter.
            Aucune donnee n'est partagee avec des tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyse en cours...
            </>
          ) : (
            <>
              Obtenir mon diagnostic
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </>
  )
}
