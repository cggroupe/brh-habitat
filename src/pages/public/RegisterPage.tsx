import { Link } from 'react-router-dom'
import { SignUp } from '@clerk/clerk-react'
import { UserPlus } from 'lucide-react'
import { useClerkSupabaseBridge } from '@/hooks/useClerkSupabaseBridge'

export default function RegisterPage() {
  useClerkSupabaseBridge()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <UserPlus size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">
              Creer un compte
            </h1>
            <p className="font-body text-sm text-slate-500 mt-2">
              Rejoignez le reseau d'affilies BRH et gagnez des recompenses
            </p>
          </div>

          <SignUp
            signInUrl="/connexion"
            unsafeMetadata={{ role: 'particulier' }}
            fallbackRedirectUrl="/particulier"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 p-0 bg-transparent',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsRoot: 'hidden',
                socialButtonsBlockButton: 'hidden',
                socialButtonsIconButton: 'hidden',
                socialButtons: 'hidden',
                dividerRow: 'hidden',
                formButtonPrimary: 'bg-primary hover:bg-primary-dark normal-case font-bold',
                footer: 'hidden',
              },
            }}
          />

          <p className="text-center mt-8 text-sm font-body text-slate-500">
            Deja un compte ?{' '}
            <Link to="/connexion" className="text-primary hover:text-primary-dark font-semibold transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
