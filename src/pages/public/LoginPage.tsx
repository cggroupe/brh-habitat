import { Link } from 'react-router-dom'
import { SignIn } from '@clerk/clerk-react'
import { Shield } from 'lucide-react'
import { useClerkSupabaseBridge } from '@/hooks/useClerkSupabaseBridge'

export default function LoginPage() {
  // Bridge en background : des que l'user Clerk est logge, on sync la session Supabase
  useClerkSupabaseBridge()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Shield size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">Connexion</h1>
            <p className="font-body text-sm text-slate-500 mt-2">
              Acces a votre espace BRH Habitat
            </p>
          </div>

          {/* Widget Clerk — gere email, password, OAuth (Google/Apple/LinkedIn selon config Clerk) */}
          <SignIn
            routing="virtual"
            signUpUrl="/inscription"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 p-0 bg-transparent',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-slate-200 hover:bg-slate-50',
                formButtonPrimary: 'bg-primary hover:bg-primary-dark normal-case font-bold',
                footer: 'hidden',
              },
            }}
          />

          <p className="text-center mt-8 text-sm font-body text-slate-500">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary hover:text-primary-dark font-semibold transition-colors">
              Creer un compte
            </Link>
          </p>
          <p className="text-center mt-2 text-sm font-body text-slate-500">
            Professionnel partenaire ?{' '}
            <Link to="/inscription/pro" className="text-primary hover:text-primary-dark font-semibold transition-colors">
              Inscription pro
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
