"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CallToAction() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Newsletter signup:", email)
    setEmail("")
  }

  return (
    <section
      className="relative overflow-hidden py-16 md:py-20"
      style={{
        background: 'linear-gradient(to bottom, rgba(19, 236, 128, 0.1) 0%, rgba(19, 236, 128, 1) 100%)'
      }}
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left Content - Text and Form */}
          <div>
            <h2 className="text-3xl font-bold text-black md:text-4xl">Get Property Alerts</h2>
            <p className="mt-4 text-lg text-black/80">
              Be the first to know about new listings that match your criteria.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 flex-1 rounded-lg border-0 bg-white px-4 text-zinc-900 shadow-sm placeholder:text-zinc-400"
                required
              />
              <Button type="submit" className="h-12 rounded-lg bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                Get Alerts
              </Button>
            </form>

            <p className="mt-4 text-sm text-black/70">No spam. Unsubscribe anytime.</p>
          </div>

          {/* Right - Small 3D House Illustration */}
          <div className="hidden justify-end lg:flex">
            <img src="/images/two.png" alt="Property Illustration" className="h-auto w-64" />
          </div>
        </div>
      </div>
    </section>
  )
}
