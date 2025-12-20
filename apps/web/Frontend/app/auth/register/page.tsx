"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/types/auth"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("BUYER")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Static mock - simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("Register attempt:", { name, email, password, role })

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900">Create an account</h1>
              <p className="mt-2 text-sm text-zinc-600">Join Property Sewa to find your dream property</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I want to</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER">Buy or Rent Property</SelectItem>
                    <SelectItem value="SELLER">Sell or List Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" id="terms" className="mt-1 rounded border-zinc-300" required />
                <label htmlFor="terms" className="text-sm text-zinc-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-emerald-600 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-emerald-600 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
