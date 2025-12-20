"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: "/properties?purpose=buy", label: "For Sale" },
    { href: "/properties?purpose=rent", label: "For Rent" },
    { href: "/agents", label: "Agents" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-black/50 backdrop-blur-md transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''
        }`}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-wide text-white">PROPERTY SEWA</span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            className="rounded-full border-0 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            asChild
          >
            <Link href="/auth/login">Log In</Link>
          </Button>
          <Button
            className="rounded-full bg-emerald-500 px-5 text-sm font-medium text-black hover:bg-emerald-600"
            asChild
          >
            <Link href="/auth/register">Sign Up</Link>
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <Phone className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-white/20 bg-[#4A5568] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/90 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4">
              <Button className="w-full rounded-full bg-white text-zinc-900 hover:bg-zinc-100" asChild>
                <Link href="/auth/login">Log In</Link>
              </Button>
              <Button className="w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600" asChild>
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
