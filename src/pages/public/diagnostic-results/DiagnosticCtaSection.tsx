import { Link } from 'react-router-dom'
import { CheckCircle2, Calendar, ArrowRight, FileDown, Phone, RefreshCw, Loader2 } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { DiagnosticPdfReport } from '@/components/diagnostic-pdf/DiagnosticPdfReport'
import type { DiagnosticResult } from '@/lib/diagnostic-engine'

interface DiagnosticCtaSectionProps {
  onShowContact: () => void
  /** Résultat du diagnostic — utilisé pour générer le PDF. */
  pdfResult?: DiagnosticResult
  /** Infos logement pour la page de couverture du PDF. */
  pdfProperty?: { address?: string; year?: number; surface?: number; type?: string }
}

export function DiagnosticCtaSection({ onShowContact, pdfResult, pdfProperty }: DiagnosticCtaSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary via-primary-green to-primary-light p-8 text-white text-center shadow-xl shadow-green-900/20 animate-fadeIn">
      <p className="font-body text-green-200 text-xs uppercase tracking-widest mb-2">Prochaines etapes</p>
      <h2 className="font-display text-2xl sm:text-3xl mb-3 leading-tight">
        Un expert vous accompagne
      </h2>
      <p className="font-body text-green-100 mb-8 max-w-md mx-auto text-sm leading-relaxed">
        Nos artisans certifies RGE en Bretagne analysent votre rapport et vous proposent
        un devis personnalise, aides incluses.
      </p>

      {/* Etapes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-lg mx-auto text-left">
        {[
          { icon: CheckCircle2, step: '1.', label: 'Validation expert', detail: 'Sous 24h' },
          { icon: Calendar, step: '2.', label: 'Visite sur site', detail: 'Gratuite' },
          { icon: ArrowRight, step: '3.', label: 'Devis personnalise', detail: 'Aides incluses' },
        ].map(({ icon: Icon, step, label, detail }) => (
          <div key={step} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
            <Icon size={18} className="text-green-200 shrink-0" />
            <div>
              <p className="font-display text-sm leading-tight">{step} {label}</p>
              <p className="font-body text-xs text-green-300">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Boutons — CTA principal très visible, secondaires sobres */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
        <button
          type="button"
          onClick={onShowContact}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-display text-base font-bold rounded-xl hover:bg-green-50 transition-all shadow-lg hover:scale-105"
        >
          <Calendar size={18} />
          Prendre rendez-vous
        </button>
        <a
          href="tel:+33219005305"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-white text-white font-display text-sm rounded-xl hover:bg-white/10 transition-colors"
        >
          <Phone size={16} />
          02 19 00 53 05
        </a>
        {pdfResult ? (
          <PDFDownloadLink
            document={<DiagnosticPdfReport result={pdfResult} property={pdfProperty ?? {}} />}
            fileName={`diagnostic-brh-${new Date().toISOString().slice(0, 10)}.pdf`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/30 text-white/80 font-display text-xs rounded-xl hover:bg-white/10 transition-colors"
          >
            {({ loading }) => loading ? (
              <><Loader2 size={14} className="animate-spin" /> Génération…</>
            ) : (
              <><FileDown size={14} /> Télécharger le PDF</>
            )}
          </PDFDownloadLink>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/30 text-white/40 font-display text-xs rounded-xl cursor-not-allowed">
            <FileDown size={14} />
            PDF
          </span>
        )}
        <Link
          to="/diagnostic"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/30 text-white/80 font-display text-xs rounded-xl hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={14} />
          Refaire
        </Link>
      </div>

      <p className="mt-6 font-body text-xs text-green-200/70">
        Diagnostic gratuit et sans engagement — Artisans certifiés RGE Bretagne
      </p>
    </div>
  )
}
