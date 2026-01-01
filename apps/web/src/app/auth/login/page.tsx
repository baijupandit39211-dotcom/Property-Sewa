"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/use-auth"
import { Phone } from "lucide-react"

const getDashboardPathForRole = (role: string | undefined | null): string => {
  const r = role?.toString().toLowerCase() ?? ""

  if (r === "superadmin" || r === "admin") {
    return "/superadmin-dashboard"
  }
  if (r === "seller" || r === "agent") {
    return "/seller-dashboard"
  }
  return "/buyer-dashboard"
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const { login, googleLogin, loading, error, isAuthenticated, user } = useAuth()

  // Google official button container
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const googleRenderedRef = useRef(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      const path = getDashboardPathForRole((user as any).role)
      router.replace(path)
    }
  }, [isAuthenticated, user, router])

  // Render real Google Sign-In button (GSI)
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    const interval = setInterval(() => {
      const g = (window as any).google
      if (!g?.accounts?.id) return
      if (!googleBtnRef.current) return
      if (googleRenderedRef.current) return

      googleRenderedRef.current = true

      g.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          const ok = await googleLogin(resp.credential)
          if (ok) {
            // useAuth will update `user`, and the redirect effect above
            // will send the user to the correct dashboard based on role.
            // Optionally persist Google user token-less info in localStorage.
            if (typeof window !== "undefined") {
              const nextUser = (user as any) ?? null
              if (nextUser) {
                window.localStorage.setItem("authUser", JSON.stringify(nextUser))
              }
            }
          }
        },
      })

      g.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular", // Changed to rectangular to match typical "Sign in with..." style better, or pill.
        width: 400, // Adjusted width
        logo_alignment: "left"
      })

      clearInterval(interval)
    }, 200)

    return () => clearInterval(interval)
  }, [googleLogin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4fbf6]">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-4 py-16 md:px-12 lg:px-24">
        <div className="w-full max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* LEFT: Form */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <h1 className="mb-10 text-3xl font-bold tracking-tight text-[#0f251c] lg:text-4xl text-center lg:text-left">
                Welcome Back!
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium text-[#0f251c]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#13EC80] focus:border-[#13EC80]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium text-[#0f251c]">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#13EC80] focus:border-[#13EC80]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-[#16814C] hover:text-[#13EC80] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#13EC80] text-base font-bold text-black hover:bg-[#10c96e] transition-all shadow-sm"
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#f4fbf6] px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* REAL GOOGLE LOGIN BUTTON */}
                <div className="w-full flex justify-center">
                  {/* Container must have specific dimensions for GSI to render inside properly or just be a wrapper */}
                  <div
                    ref={googleBtnRef}
                    className="min-h-[44px] min-w-[200px]"
                  />
                </div>

                {error ? <p className="text-center text-sm text-red-600 mt-2">{error}</p> : null}

                <p className="text-center text-sm text-gray-600 mt-6">
                  Don't have an account?{" "}
                  <Link href="/auth/register" className="font-bold text-[#16814C] hover:text-[#13EC80] transition-colors">
                    Sign Up
                  </Link>
                </p>
              </form>
            </div>

            {/* RIGHT: Image (Dummy/Placeholder) */}
            <div className="hidden lg:flex lg:justify-end items-center">
              <div className="relative h-[600px] w-full max-w-[600px]">
                {/* 
                  TODO: Replace this image with your actual 3D house image.
                  Place your image at: /public/images/login-house.png
                */}
                <Image
                  src="/images/auth-house.png"
                  alt="Modern 3D House Illustration"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
