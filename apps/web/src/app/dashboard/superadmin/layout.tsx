"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Bell, LogOut } from "lucide-react"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { SuperAdminSidebar } from "@/components/dashboard/superadmin-sidebar"
import { Button } from "@/components/ui/button"

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    setLoggingOut(true)
    try {
      localStorage.removeItem("ps-role")
    } catch {
      // ignore
    }
    router.push("/")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#f4fbf6]">
        <SuperAdminSidebar />
        <main className="flex-1 w-full overflow-y-auto">
          <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#316249] bg-[#316249] px-4 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 text-white hover:bg-white/10 hover:text-white" />
              <h1 className="text-white font-semibold text-lg">
                SuperAdmin Panel
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-white/10 hover:text-white"
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? "Leaving…" : "Exit"}
              </Button>
            </div>
          </header>

          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

