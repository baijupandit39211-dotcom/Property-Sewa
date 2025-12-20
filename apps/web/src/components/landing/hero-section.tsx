import Link from "next/link"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "./search-bar"

export function HeroSection() {
  const trustBadges = ["Verified Listings", "Secure Transactions", "Top Agents"]

  return (
    <section
      className="relative -mt-16 overflow-hidden pt-16"
      style={{
        background: 'linear-gradient(to right, rgba(22,129,76,1) 0%, rgba(19,236,128,0.1) 100%)'
      }}
    >
      {/* Dotted Pattern Background */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-6">
          {/* Left Content - Takes 2/5 of space */}
          <div className="flex flex-col items-center lg:col-span-3">
            <h1 className="text-center text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              The Modern Way to
              <br />
              Find Home
            </h1>
            <p className="mt-4 max-w-lg text-center text-lg text-white/90">
              Discover your next chapter with us. Effortless, elegant, and exclusively yours.
            </p>

            {/* Search Bar */}
            <div className="mt-8 w-full max-w-xl">
              <SearchBar />
            </div>

            {/* CTA Buttons - Centered under search bar */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-3">
                <Button className="rounded-full bg-emerald-600 px-6 text-black hover:bg-emerald-700" size="lg" asChild>
                  <Link href="/properties">Browse Properties</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20"
                  size="lg"
                  asChild
                >
                  <Link href="/auth/register">List Your Property</Link>
                </Button>
              </div>

              {/* Explore Neighborhoods Link - Centered */}
              <Link
                href="/neighborhoods"
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:underline"
              >
                Explore Neighborhoods
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Trust Badges - Green bullet tags */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              {trustBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-sm text-white/90">
                  <CheckCircle className="h-4 w-4 text-white" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - 3D House Image - Takes 2/5 of space */}
          <div className="relative hidden lg:col-span-3 lg:block">
            <img src="/images/one.png" alt="Modern 3D House" className="mx-auto h-auto w-full max-w-xl drop-shadow-2xl " />
          </div>
        </div>
      </div>
    </section>
  )
}
