"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, Settings, LifeBuoy } from "lucide-react"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth/use-auth"

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { logout, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/properties?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/auth/login")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#f4fbf6]">
        <AppSidebar />
        <main className="flex-1 w-full overflow-y-auto">
          {/* Dashboard Header */}
          <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#316249] bg-[#316249] px-4 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 text-white hover:bg-white/10 hover:text-white" />
            </div>

            <div className="flex items-center gap-4">
              {/* Search Bar - Moved to Right */}
              <form onSubmit={handleSearch} className="hidden md:flex relative w-64 lg:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#0f251c]/60" />
                <Input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg bg-[#E8F5E9] pl-9 text-[#0f251c] placeholder:text-[#0f251c]/60 border-none focus-visible:ring-[#13EC80] h-9"
                />
              </form>

              <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 hover:text-white">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#13EC80]" />
              </Button>

              {isMounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 border border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={(user as any)?.avatar || "/images/avatar-placeholder.png"} />
                      <AvatarFallback className="bg-[#13EC80] text-[#0f251c] font-bold">
                        {user?.name?.substring(0, 2).toUpperCase() || "AS"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/dashboard/seller/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/help")}>
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      <span>Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#13EC80] border border-white/10 flex items-center justify-center">
                  <span className="text-[#0f251c] font-bold text-xs">...</span>
                </div>
              )}
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
