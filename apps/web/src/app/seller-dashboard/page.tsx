"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface StoredUser {
  name?: string
  role?: string
}

const USER_KEY = "authUser"

export default function SellerDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null)

  const canonicalRole = (user?.role ?? "seller").toString().toLowerCase()

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(USER_KEY) : null
      if (raw) {
        setUser(JSON.parse(raw) as StoredUser)
      }
    } catch {
      setUser(null)
    }
  }, [])

  return (
    <main className="p-6 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f251c]">
            Seller Dashboard
          </h1>
          <p className="text-[#2a5c49] mt-1">
            Welcome {user?.name ?? "Guest"} ({canonicalRole || "seller"})
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/buyer-dashboard" className="text-[#16814C] hover:underline">
            Buyer
          </Link>
          <Link href="/seller-dashboard" className="underline">
            Seller
          </Link>
          <Link href="/superadmin-dashboard" className="text-[#16814C] hover:underline">
            SuperAdmin
          </Link>
        </nav>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Active listings</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">12</p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Inquiries</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">7</p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Scheduled visits</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">3</p>
        </div>
      </section>

      <section className="rounded-xl border border-[#cfe7d6] bg-white p-4">
        <h2 className="text-lg font-semibold text-[#0f251c]">
          Static seller overview
        </h2>
        <p className="mt-2 text-sm text-[#2a5c49]">
          Replace these cards with real metrics once you hook this up to your
          backend.
        </p>
      </section>
    </main>
  )
}
