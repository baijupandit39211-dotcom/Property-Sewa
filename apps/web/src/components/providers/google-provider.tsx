"use client"

import type React from "react"
import { useEffect } from "react"

export default function GoogleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn("⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing")
      return
    }

    if (document.getElementById("google-gsi-script")) return

    const script = document.createElement("script")
    script.id = "google-gsi-script"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true

    script.onload = () => {
      const g = (window as any).google
      if (g?.accounts?.id) {
        console.log("✅ Google GSI loaded")
      }
    }

    script.onerror = () => console.error("❌ Failed to load Google GSI")

    document.body.appendChild(script)
  }, [])

  return <>{children}</>
}
