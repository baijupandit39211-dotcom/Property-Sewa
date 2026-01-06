"use client";

import { LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
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
} from "@/components/ui/sidebar";

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
];

export function SuperAdminSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();

	return (
		<Sidebar
			collapsible="icon"
			{...props}
			className="border-none bg-white text-[#0f251c]"
		>
			<SidebarHeader className="flex h-16 items-center bg-[#316249] px-4">
				<div className="flex w-full items-center gap-3 font-bold text-white text-xl">
					<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#13EC80] text-[#0f251c]">
						SA
					</span>
					<span className="truncate group-data-[collapsible=icon]:hidden">
						SUPERADMIN
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent className="mt-4 bg-white px-2">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="gap-2">
							{navItems.map((item) => {
								const isActive =
									pathname === item.url ||
									(item.url !== "/dashboard/superadmin" &&
										pathname?.startsWith(item.url));

								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											className="h-10 text-[#0f251c] transition-all duration-200 hover:translate-x-1 hover:bg-[#f4fbf6] hover:text-[#316249] data-[active=true]:bg-[#316249] data-[active=true]:font-medium data-[active=true]:text-white"
										>
											<Link href={item.url} className="flex items-center gap-3">
												<item.icon
													className={isActive ? "text-white" : "text-[#0f251c]"}
												/>
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-gray-100 border-t bg-white px-2 py-4" />
			<SidebarRail />
		</Sidebar>
	);
}
