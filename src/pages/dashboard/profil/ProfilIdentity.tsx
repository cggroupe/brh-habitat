import { Shield, CalendarDays } from 'lucide-react'

interface ProfilIdentityProps {
  fullName: string
  email: string
  role: string
  roleLabel: string
  memberSince: string | null
}

export function ProfilIdentity({ fullName, email, role, roleLabel, memberSince }: ProfilIdentityProps) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-light p-6 mb-6">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-display text-2xl shrink-0">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-xl text-text-primary">{fullName}</h2>
          <p className="font-body text-sm text-text-secondary">{email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${
              role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
            }`}>
              <Shield size={10} className="mr-1" />
              {roleLabel}
            </span>
            {memberSince && (
              <span className="text-xs font-body text-text-light flex items-center gap-1">
                <CalendarDays size={10} />
                Membre depuis {new Date(memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
