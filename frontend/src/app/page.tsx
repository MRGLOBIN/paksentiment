import HeroSection from './components/HeroSection'
import StatsSection from './components/StatsSection'
import FeaturesSection from './components/FeaturesSection'
import DataSourcesSection from './components/DataSourcesSection'
import HowItWorksSection from './components/HowItWorksSection'
import PrivacySection from './components/PrivacySection'
import CTASection from './components/CTASection'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <DataSourcesSection />
      <HowItWorksSection />
      <PrivacySection />
      <CTASection />
      <Footer />
    </>
  )
}
