import { HomeHero } from './home/HomeHero'
import { HomeTrustBar } from './home/HomeTrustBar'
import { HomeServicesSection } from './home/HomeServicesSection'
import { HomeDiagCta } from './home/HomeDiagCta'
import { HomeArticlesSection } from './home/HomeArticlesSection'
import { SEOHead } from '@/components/shared/SEOHead'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SEOHead title="BRH - Bretagne Renovation Habitat | Renovation en Bretagne" description="Expert en renovation globale de l'habitat en Bretagne. Diagnostic gratuit, toiture, isolation, electricite, menuiserie. Devis personnalise." />
      <HomeHero />
      <HomeTrustBar />
      <HomeServicesSection />
      <HomeDiagCta />
      <HomeArticlesSection />
    </div>
  )
}
