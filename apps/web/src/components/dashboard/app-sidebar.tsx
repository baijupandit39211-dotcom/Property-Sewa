"use client"

import * as React from "react"
import {
    Bell,
    HelpCircle,
    Home,
    LayoutDashboard,
    MessageCircle,
    Scale,
    Search,
    Bookmark,
    LogOut,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"

const navItems = [
  {
    title: "Seller Dashboard",
    url: "/dashboard/seller",
    icon: LayoutDashboard,
  },
  {
    title: "Search Properties",
    url: "/properties",
    icon: Search,
  },
  {
    title: "Wishlist / Saved Properties",
    url: "/dashboard/seller/wishlist",
    icon: Bookmark,
  },
  {
    title: "Compare Properties",
    url: "/dashboard/seller/compare",
    icon: Scale,
  },
  {
    title: "Alerts / Notifications",
    url: "/dashboard/seller/alerts",
    icon: Bell,
  },
  {
    title: "Messages / Chat",
    url: "/dashboard/seller/messages",
    icon: MessageCircle,
  },
]

const footerItems = [
    {
        title: "Help",
        url: "/help",
        icon: HelpCircle,
    },
    {
        title: "Feedback",
        url: "/feedback",
        icon: MessageCircle,
    },
]

// Custom Logo Icon Component
function PropertySewaLogo() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="20" height="4" rx="2" fill="#13EC80" />
            <rect x="6" y="14" width="20" height="4" rx="2" fill="#13EC80" />
            <rect x="6" y="20" width="20" height="4" rx="2" fill="#13EC80" />
        </svg>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" {...props} className="border-none bg-white text-[#0f251c]">
            {/* Header: Dark Green Background, White Text */}
            <SidebarHeader className="h-16 flex items-center px-4 bg-[#316249]">
                <div className="flex items-center gap-3 font-bold text-xl text-white w-full">
                    {/* Custom Stack Logo */}
                    <div className="flex h-8 w-8 items-center justify-center flex-shrink-0">
                        <PropertySewaLogo />
                    </div>
                    <span className="truncate group-data-[collapsible=icon]:hidden">PROPERTY SEWA</span>
                </div>
            </SidebarHeader>

            {/* Content: White Background, Dark Text */}
            <SidebarContent className="bg-white px-2 mt-4">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-2">
                            {navItems.map((item) => {
                                const isActive =
                                  pathname === item.url ||
                                  (item.url !== "/dashboard/seller" && pathname?.startsWith(item.url))
                                return (
                                  <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                      asChild
                                      isActive={isActive}
                                      className="h-10 text-[#0f251c] hover:bg-[#f4fbf6] hover:text-[#316249] hover:translate-x-1 data-[active=true]:bg-[#316249] data-[active=true]:text-white data-[active=true]:font-medium transition-all duration-200"
                                    >
                                      <Link href={item.url} className="flex items-center gap-3">
                                        <item.icon className={isActive ? "text-white" : "text-[#0f251c]"} />
                                        <span>{item.title}</span>
                                      </Link>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer: White Background */}
            <SidebarFooter className="bg-white border-t border-gray-100 px-2 py-4">
                <SidebarMenu className="gap-1">
                    {footerItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="text-[#0f251c] hover:bg-[#f4fbf6] h-9">
                                <Link href={item.url}>
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
