import { Lightbulb, Phone, Mail } from 'lucide-react'

const STEP_TIPS: Record<number, string> = {
  1: "Selectionnez tous les problemes qui vous preoccupent, meme ceux qui semblent mineurs. Un diagnostic complet permet d'identifier les interactions entre les pathologies.",
  2: "L'annee de construction est particulierement importante : les batiments anterieurs a 1975 (avant le premier choc petrolier) n'ont generalement aucune isolation thermique.",
  3: "Le type de chauffage et l'etat de la ventilation sont des indicateurs cles de la qualite de l'air interieur. Une maison sans VMC presente systematiquement des risques d'humidite et de condensation.",
  4: "Notez tous les symptomes observes, meme intermittents. Les problemes qui n'apparaissent qu'en hiver ou par temps de pluie sont souvent les plus revelateurs.",
  5: "Photographiez les zones humides, les fissures et les degradations visibles. Une bonne photo est souvent aussi informative qu'une visite pour l'analyse initiale.",
  6: "Vos coordonnees sont utilisees uniquement pour vous transmettre votre diagnostic personnalise. Aucune donnee n'est partagee avec des tiers.",
}

interface SidePanelProps {
  step: number
}

export function SidePanel({ step }: SidePanelProps) {
  const tip = STEP_TIPS[step]

  return (
    <aside className="w-[280px] shrink-0 space-y-6 sticky top-8">
      {/* Expert tip */}
      {tip && (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Lightbulb size={18} />
            <span className="text-sm font-black uppercase tracking-wider">Conseil Expert</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {tip}
          </p>
        </div>
      )}

      {/* Help card */}
      <div className="p-6 bg-white rounded-xl border border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Besoin d'aide ?</h4>
        <a
          href="tel:0219005305"
          className="flex items-center gap-3 text-primary hover:underline transition-all"
        >
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone size={14} className="text-primary" />
          </div>
          <span className="text-sm font-bold">02 19 00 53 05</span>
        </a>
        <a
          href="mailto:relationsclients@contact-brh.fr"
          className="flex items-center gap-3 text-primary hover:underline transition-all mt-3"
        >
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail size={14} className="text-primary" />
          </div>
          <span className="text-sm font-bold">relationsclients@contact-brh.fr</span>
        </a>
        <p className="text-[11px] text-slate-400 mt-4 leading-snug">
          Nos experts sont disponibles du lundi au vendredi, de 9h a 18h.
        </p>
      </div>

      {/* Decorative image */}
      <div className="rounded-xl overflow-hidden relative">
        <img
          alt="Habitat sain apres renovation"
          className="w-full h-40 object-cover"
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=560&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
          <p className="text-white text-xs font-bold italic">
            "Un habitat sain commence par un bon diagnostic."
          </p>
        </div>
      </div>
    </aside>
  )
}
