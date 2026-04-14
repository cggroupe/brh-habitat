import { Calendar, BadgeCheck, Clock, Star } from 'lucide-react'

const trustStats = [
  { icon: Calendar, value: '20+ ans', label: "d'expérience terrain" },
  { icon: BadgeCheck, value: 'Certifiés', label: 'Label RGE Qualibat' },
  { icon: Clock, value: '48h', label: 'Devis gratuit rapide' },
  { icon: Star, value: '4.8/5', label: 'Satisfaction client' },
]

export function HomeTrustBar() {
  return (
    <section className="bg-neutral-gray py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {trustStats.map(({ icon: Icon, value, label }) => (
            <div
              key={value}
              className="flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon size={22} />
              </div>
              <h3 className="font-display text-3xl font-bold text-slate-900">{value}</h3>
              <p className="text-sm font-medium text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
