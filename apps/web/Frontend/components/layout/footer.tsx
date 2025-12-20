import Link from "next/link"
import { Twitter, Facebook, Instagram } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    company: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Blog", href: "/blog" },
    ],
    explore: [
      { label: "Buy", href: "/properties?purpose=buy" },
      { label: "Rent", href: "/properties?purpose=rent" },
      { label: "Sell", href: "/auth/register" },
      { label: "Agents", href: "/agents" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
    legal: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  }

  return (
    <footer className="bg-emerald-50 text-zinc-800">
      <div className="container mx-auto max-w-7xl px-4 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-zinc-900">Property Sewa</span>
            </Link>
            <p className="mt-4 text-sm text-zinc-600">The modern way to find, buy, and sell your home.</p>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 font-semibold text-zinc-900">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-600 hover:text-emerald-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-4 font-semibold text-zinc-900">Explore</h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-600 hover:text-emerald-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold text-zinc-900">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-600 hover:text-emerald-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 font-semibold text-zinc-900">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-600 hover:text-emerald-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 md:flex-row">
          <p className="text-sm text-zinc-600">© {currentYear} Property Sewa. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-zinc-500 hover:text-emerald-600">
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-zinc-500 hover:text-emerald-600">
              <Facebook className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-zinc-500 hover:text-emerald-600">
              <Instagram className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
