import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { logError } from '@/lib/error'
import { Building2, ArrowRight } from 'lucide-react'
import { createCompany, updateCompanyRecruiter } from '@/api/companies'
import { addCompanyMember } from '@/api/company-members'
import type { CompanyProfession } from '@/types/partner'

export default function RegisterProPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recruiter = searchParams.get('recruiter')
  const setUser = useAppStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    siret: '',
    profession: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.fullName || !form.email || !form.password || !form.companyName) {
      setError('Veuillez remplir tous les champs obligatoires.')
      setLoading(false)
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: 'pro',
          phone: form.phone || null,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Le trigger handle_new_user() cree le profil avec role='pro' automatiquement

      // Creer l'entreprise
      let company
      try {
        company = await createCompany({
          owner_id: data.user.id,
          name: form.companyName,
          siret: form.siret || null,
          profession: form.profession ? (form.profession as CompanyProfession) : null,
        })
      } catch {
        setError('Erreur lors de la creation de l\'entreprise. Veuillez reessayer.')
        setLoading(false)
        return
      }

      // Si recrute via un lien de recrutement, lier le recruteur
      if (recruiter) {
        await updateCompanyRecruiter(company.id, recruiter).catch((err) => logError('RegisterPro:recruiter', err))
      }

      // Ajouter comme owner dans company_members
      await addCompanyMember(company.id, data.user.id, 'owner').catch((err) => logError('RegisterPro:addMember', err))

      // Charger profil et naviguer
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name ?? '',
          role: profile.role,
          avatar_url: profile.avatar_url ?? undefined,
        })
        navigate('/pro')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Building2 size={26} className="text-primary" strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl text-slate-900 uppercase tracking-wide">
              Inscription Partenaire
            </h1>
            <p className="font-body text-sm text-slate-500 mt-2">
              Creez votre compte professionnel BRH
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-body">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Nom complet *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} required
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Telephone</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="06 12 34 56 78" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Email professionnel *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="contact@entreprise.fr" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Mot de passe *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required autoComplete="new-password"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="8 caracteres minimum" />
            </div>

            <hr className="border-slate-100 my-2" />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Nom de l'entreprise *</label>
              <input name="companyName" value={form.companyName} onChange={handleChange} required
                className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Mon Entreprise SAS" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">SIRET</label>
                <input name="siret" value={form.siret} onChange={handleChange}
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="123 456 789 00012" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 font-body">Profession</label>
                <select name="profession" value={form.profession} onChange={handleChange}
                  className="w-full px-3.5 py-3 border border-slate-200 rounded-xl font-body text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white">
                  <option value="">-- Choisir --</option>
                  <option value="architecte">Architecte</option>
                  <option value="agent_immobilier">Agent immobilier</option>
                  <option value="maitre_oeuvre">Maitre d'oeuvre</option>
                  <option value="courtier">Courtier en travaux</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-display text-base font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 uppercase tracking-wide mt-6">
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Creer mon compte partenaire <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm font-body text-slate-500 mt-6">
            Deja partenaire ?{' '}
            <Link to="/connexion" className="text-primary hover:text-primary-dark font-semibold">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
