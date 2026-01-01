"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface StoredUser {
  name?: string
  role?: string
}

const USER_KEY = "authUser"

export default function BuyerDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null)

  const canonicalRole = (user?.role ?? "buyer").toString().toLowerCase()

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
            Buyer Dashboard
          </h1>
          <p className="text-[#2a5c49] mt-1">
            Welcome {user?.name ?? "Guest"} ({canonicalRole || "buyer"})
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/buyer-dashboard" className="underline">
            Buyer
          </Link>
          <Link href="/seller-dashboard" className="text-[#16814C] hover:underline">
            Seller
          </Link>
          <Link href="/superadmin-dashboard" className="text-[#16814C] hover:underline">
            SuperAdmin
          </Link>
        </nav>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Saved properties</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">5</p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Recent searches</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">3</p>
        </div>
        <div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
          <p className="text-sm font-medium text-[#2a5c49]">Alerts</p>
          <p className="mt-2 text-2xl font-bold text-[#0f251c]">2</p>
        </div>
      </section>

      <section className="rounded-xl border border-[#cfe7d6] bg-white p-4">
        <h2 className="text-lg font-semibold text-[#0f251c]">
          How this works
        </h2>
        <p className="mt-2 text-sm text-[#2a5c49]">
          This page is static and does not call your backend. The user info is
          read from <code>localStorage</code> after using the mock auth
          endpoints.
        </p>
      </section>
    </main>
  )
}
