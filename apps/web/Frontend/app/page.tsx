import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/landing/hero-section"
import { ServicesSection } from "@/components/landing/services-section"
import { FeaturedProperties } from "@/components/landing/featured-properties"
import { WhyChooseUs } from "@/components/landing/why-choose-us"
import { CallToAction } from "@/components/landing/call-to-action"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ServicesSection />
        <FeaturedProperties />
        <WhyChooseUs />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
