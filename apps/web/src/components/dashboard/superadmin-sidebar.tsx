"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  Settings,
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
    title: "SuperAdmin Dashboard",
    url: "/dashboard/superadmin",
    icon: LayoutDashboard,
  },
  {
    title: "Manage Users",
    url: "/dashboard/superadmin/users",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/dashboard/superadmin/settings",
    icon: Settings,
  },
]

export function SuperAdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props} className="border-none bg-white text-[#0f251c]">
      <SidebarHeader className="h-16 flex items-center px-4 bg-[#316249]">
        <div className="flex items-center gap-3 font-bold text-xl text-white w-full">
          <span className="h-8 w-8 rounded-lg bg-[#13EC80] flex items-center justify-center text-[#0f251c]">
            SA
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            SUPERADMIN
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white px-2 mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/dashboard/superadmin" &&
                    pathname?.startsWith(item.url))

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 text-[#0f251c] hover:bg-[#f4fbf6] hover:text-[#316249] hover:translate-x-1 data-[active=true]:bg-[#316249] data-[active=true]:text-white data-[active=true]:font-medium transition-all duration-200"
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon
                          className={isActive ? "text-white" : "text-[#0f251c]"}
                        />
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

      <SidebarFooter className="bg-white border-t border-gray-100 px-2 py-4" />
      <SidebarRail />
    </Sidebar>
  )
}

