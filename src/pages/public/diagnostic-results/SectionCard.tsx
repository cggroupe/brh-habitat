interface SectionCardProps {
  children: React.ReactNode
  className?: string
}

export function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-fadeIn ${className}`}>
      {children}
    </div>
  )
}

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
}

export function SectionHeader({ icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
      <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-display text-lg text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="font-body text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
