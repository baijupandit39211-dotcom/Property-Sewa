"use client";

import {
	Bell,
	Bookmark,
	HelpCircle,
	LayoutDashboard,
	MessageCircle,
	Scale,
	Search,
} from "lucide-react";
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
];

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
];

// Custom Logo Icon Component
function PropertySewaLogo() {
	return (
		<svg
			width="32"
			height="32"
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="6" y="8" width="20" height="4" rx="2" fill="#13EC80" />
			<rect x="6" y="14" width="20" height="4" rx="2" fill="#13EC80" />
			<rect x="6" y="20" width="20" height="4" rx="2" fill="#13EC80" />
		</svg>
	);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();

	return (
		<Sidebar
			collapsible="icon"
			{...props}
			className="border-none bg-white text-[#0f251c]"
		>
			{/* Header: Dark Green Background, White Text */}
			<SidebarHeader className="flex h-16 items-center bg-[#316249] px-4">
				<div className="flex w-full items-center gap-3 font-bold text-white text-xl">
					{/* Custom Stack Logo */}
					<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
						<PropertySewaLogo />
					</div>
					<span className="truncate group-data-[collapsible=icon]:hidden">
						PROPERTY SEWA
					</span>
				</div>
			</SidebarHeader>

			{/* Content: White Background, Dark Text */}
			<SidebarContent className="mt-4 bg-white px-2">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="gap-2">
							{navItems.map((item) => {
								const isActive =
									pathname === item.url ||
									(item.url !== "/dashboard/seller" &&
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

			{/* Footer: White Background */}
			<SidebarFooter className="border-gray-100 border-t bg-white px-2 py-4">
				<SidebarMenu className="gap-1">
					{footerItems.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								className="h-9 text-[#0f251c] hover:bg-[#f4fbf6]"
							>
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
	);
}
