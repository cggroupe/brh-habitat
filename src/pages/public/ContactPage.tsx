import { ContactHero } from './contact/ContactHero'
import { ContactForm } from './contact/ContactForm'
import { ContactInfoPanel } from './contact/ContactInfoPanel'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <ContactHero />

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <ContactForm />
            <ContactInfoPanel />
          </div>
        </div>
      </section>
    </div>
  )
}
