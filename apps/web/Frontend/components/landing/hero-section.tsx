import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "./search-bar"

export function HeroSection() {
  const trustBadges = ["Verified Listings", "Secure Transactions", "Top Agents"]

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-500 via-emerald-400 to-emerald-300">
      <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-5">
          {/* Left Content - Takes 3/5 of space */}
          <div className="relative z-10 lg:col-span-3">
            <h1 className="text-4xl font-bold italic leading-tight text-white md:text-5xl lg:text-6xl">
              The Modern Way to Find
              <br />
              Home
            </h1>
            <p className="mt-4 max-w-lg text-lg text-white/80">
              Discover your next chapter with us. Effortless, elegant, and exclusively yours.
            </p>

            {/* Search Bar */}
            <div className="mt-8">
              <SearchBar />
            </div>

            {/* CTA Buttons - Side by side */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700" size="lg" asChild>
                <Link href="/properties">Browse Properties</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-zinc-300 bg-white px-6 text-zinc-800 hover:bg-zinc-50"
                size="lg"
                asChild
              >
                <Link href="/auth/register">List Your Property</Link>
              </Button>
            </div>

            {/* Explore Neighborhoods Link */}
            <Link
              href="/neighborhoods"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white hover:underline"
            >
              Explore Neighborhoods
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Trust Badges - Green bullet tags */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle className="h-4 w-4 text-emerald-200" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - 3D House Image - Takes 2/5 of space */}
          <div className="relative hidden lg:col-span-2 lg:block">
            <img src="/3d-isometric-modern-house-dark-base-plate-architec.jpg" alt="Modern 3D House" className="mx-auto h-auto w-full max-w-md" />
          </div>
        </div>
      </div>
    </section>
  )
}
