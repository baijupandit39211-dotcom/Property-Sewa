import { CallToAction } from "@/components/landing/call-to-action";
import { FeaturedProperties } from "@/components/landing/featured-properties";
import { HeroSection } from "@/components/landing/hero-section";
import { ServicesSection } from "@/components/landing/services-section";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

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
	);
}
