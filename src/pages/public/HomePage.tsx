import { HomeHero } from './home/HomeHero'
import { HomeTrustBar } from './home/HomeTrustBar'
import { HomeServicesSection } from './home/HomeServicesSection'
import { HomeDiagCta } from './home/HomeDiagCta'
import { HomeArticlesSection } from './home/HomeArticlesSection'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomeHero />
      <HomeTrustBar />
      <HomeServicesSection />
      <HomeDiagCta />
      <HomeArticlesSection />
    </div>
  )
}
