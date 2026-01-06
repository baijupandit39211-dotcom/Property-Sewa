"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { SuperAdminSidebar } from "@/components/dashboard/superadmin-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function SuperAdminDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = () => {
		setLoggingOut(true);
		try {
			localStorage.removeItem("ps-role");
		} catch {
			// ignore
		}
		router.push("/");
	};

	return (
		<SidebarProvider>
			<div className="flex h-screen w-full overflow-hidden bg-[#f4fbf6]">
				<SuperAdminSidebar />
				<main className="w-full flex-1 overflow-y-auto">
					<header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-[#316249] border-b bg-[#316249] px-4 shadow-sm">
						<div className="flex items-center gap-4">
							<SidebarTrigger className="-ml-2 text-white hover:bg-white/10 hover:text-white" />
							<h1 className="font-semibold text-lg text-white">
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

					<div className="mx-auto w-full max-w-7xl p-6 md:p-8">{children}</div>
				</main>
			</div>
		</SidebarProvider>
	);
}
