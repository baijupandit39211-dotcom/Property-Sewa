"use client";

import { Bell, LifeBuoy, LogOut, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/use-auth";

export default function SellerDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const { logout, user } = useAuth();
	const [searchQuery, setSearchQuery] = useState("");
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/properties?search=${encodeURIComponent(searchQuery)}`);
		}
	};

	const handleLogout = async () => {
		await logout();
		router.push("/auth/login");
	};

	return (
		<SidebarProvider>
			<div className="flex h-screen w-full overflow-hidden bg-[#f4fbf6]">
				<AppSidebar />
				<main className="w-full flex-1 overflow-y-auto">
					{/* Dashboard Header */}
					<header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-[#316249] border-b bg-[#316249] px-4 shadow-sm">
						<div className="flex items-center gap-4">
							<SidebarTrigger className="-ml-2 text-white hover:bg-white/10 hover:text-white" />
						</div>

						<div className="flex items-center gap-4">
							{/* Search Bar - Moved to Right */}
							<form
								onSubmit={handleSearch}
								className="relative hidden w-64 md:flex lg:w-80"
							>
								<Search className="absolute top-2.5 left-2.5 h-4 w-4 text-[#0f251c]/60" />
								<Input
									type="search"
									placeholder="Search"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-9 rounded-lg border-none bg-[#E8F5E9] pl-9 text-[#0f251c] placeholder:text-[#0f251c]/60 focus-visible:ring-[#13EC80]"
								/>
							</form>

							<Button
								variant="ghost"
								size="icon"
								className="relative text-white hover:bg-white/10 hover:text-white"
							>
								<Bell className="h-5 w-5" />
								<span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#13EC80]" />
							</Button>

							{isMounted ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Avatar className="h-9 w-9 cursor-pointer border border-white/10 transition-opacity hover:opacity-80">
											<AvatarImage
												src={
													(user as any)?.avatar ||
													"/images/avatar-placeholder.png"
												}
											/>
											<AvatarFallback className="bg-[#13EC80] font-bold text-[#0f251c]">
												{user?.name?.substring(0, 2).toUpperCase() || "AS"}
											</AvatarFallback>
										</Avatar>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuLabel>My Account</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => router.push("/dashboard/seller/settings")}
										>
											<Settings className="mr-2 h-4 w-4" />
											<span>Settings</span>
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => router.push("/help")}>
											<LifeBuoy className="mr-2 h-4 w-4" />
											<span>Support</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={handleLogout}
											className="text-red-600 focus:text-red-600"
										>
											<LogOut className="mr-2 h-4 w-4" />
											<span>Log out</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : (
								<div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#13EC80]">
									<span className="font-bold text-[#0f251c] text-xs">...</span>
								</div>
							)}
						</div>
					</header>

					{/* Dashboard Content */}
					<div className="mx-auto w-full max-w-7xl p-6 md:p-8">{children}</div>
				</main>
			</div>
		</SidebarProvider>
	);
}
