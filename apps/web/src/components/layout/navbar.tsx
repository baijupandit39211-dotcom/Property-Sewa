"use client";

import { LogOut, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/use-auth";

export function Navbar() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const { user, isAuthenticated, logout } = useAuth();

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const navLinks = [
		{ href: "/properties?purpose=buy", label: "For Sale" },
		{ href: "/properties?purpose=rent", label: "For Rent" },
		{ href: "/agents", label: "Agents" },
	];

	const fullName = user?.name ?? "";
	const firstName = fullName.split(" ")[0] ?? "";
	const initials = fullName
		? fullName
				.split(" ")
				.map((p) => p[0])
				.join("")
				.toUpperCase()
		: "";

	return (
		<header
			className={[
				"sticky top-0 z-50 w-full",
				"bg-[#2f6f58] text-white",
				"transition-all duration-300",
				isScrolled ? "shadow-md" : "shadow-sm",
			].join(" ")}
		>
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-3">
					<div className="grid h-9 w-9 place-items-center rounded-full bg-[#19e06f]/20">
						<svg
							className="h-5 w-5 text-[#19e06f]"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
						</svg>
					</div>
					<span className="font-semibold text-lg tracking-wide">
						PROPERTY SEWA
					</span>
				</Link>

				{/* Desktop Navigation */}
				<nav className="hidden items-center gap-10 md:flex">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="font-medium text-sm text-white/90 hover:text-white"
						>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Right Actions */}
				<div className="hidden items-center gap-3 md:flex">
					{isAuthenticated && user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button className="flex items-center gap-3 rounded-full bg-white/15 px-3 py-1.5 text-left text-sm text-white hover:bg-white/20">
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-semibold text-[#163d31] text-xs">
										{initials}
									</div>
									<div className="flex flex-col">
										<span className="font-medium text-sm">{firstName}</span>
									</div>
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end" className="min-w-[190px]">
								<DropdownMenuItem
									disabled
									className="flex flex-col items-start gap-0"
								>
									<span className="font-medium text-sm">{fullName}</span>
									<span className="text-muted-foreground text-xs">
										{user.email}
									</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									onClick={() => void logout()}
									variant="destructive"
									className="mt-1"
								>
									<LogOut className="h-4 w-4" />
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							{/* Log In (white pill) */}
							<Button
								variant="outline"
								className="rounded-full border-0 bg-white px-7 font-semibold text-[#163d31] text-sm hover:bg-white/90"
								asChild
							>
								<Link href="/auth/login">Log In</Link>
							</Button>

							{/* Sign In (green pill) */}
							<Button
								className="rounded-full bg-[#19e06f] px-7 font-semibold text-[#0c2b1f] text-sm hover:bg-[#12d765]"
								asChild
							>
								<Link href="/auth/register">Sign In</Link>
							</Button>

							{/* Phone icon (white circle) */}
							<button
								aria-label="phone"
								className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#163d31] hover:bg-white/90"
							>
								<Phone className="h-4 w-4" />
							</button>
						</>
					)}
				</div>

				{/* Mobile button */}
				<Button
					variant="ghost"
					size="icon"
					className="text-white hover:bg-white/15 md:hidden"
					onClick={() => setIsMobileMenuOpen((v) => !v)}
				>
					{isMobileMenuOpen ? (
						<X className="h-6 w-6" />
					) : (
						<Menu className="h-6 w-6" />
					)}
				</Button>
			</div>

			{/* Mobile Menu */}
			{isMobileMenuOpen && (
				<div className="border-white/15 border-t bg-[#2f6f58] px-4 py-4 md:hidden">
					<nav className="flex flex-col gap-4">
						{navLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="font-medium text-sm text-white/90 hover:text-white"
								onClick={() => setIsMobileMenuOpen(false)}
							>
								{link.label}
							</Link>
						))}

						<div className="flex flex-col gap-2 pt-4">
							{isAuthenticated && user ? (
								<>
									<div className="flex items-center justify-between gap-3 rounded-full bg-white/15 px-4 py-2">
										<div className="flex items-center gap-2">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-[#163d31] text-xs">
												{initials}
											</div>
											<span className="font-medium text-sm text-white">
												{firstName}
											</span>
										</div>
										<div className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
											<Phone className="h-4 w-4 text-white" />
										</div>
									</div>

									<Button
										className="mt-2 w-full rounded-full bg-white/15 text-sm text-white hover:bg-white/20"
										onClick={() => {
											void logout();
											setIsMobileMenuOpen(false);
										}}
									>
										<LogOut className="mr-2 h-4 w-4" />
										Log out
									</Button>
								</>
							) : (
								<>
									<Button
										className="w-full rounded-full bg-white text-[#163d31] hover:bg-white/90"
										asChild
									>
										<Link
											href="/auth/login"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											Log In
										</Link>
									</Button>

									<Button
										className="w-full rounded-full bg-[#19e06f] text-[#0c2b1f] hover:bg-[#12d765]"
										asChild
									>
										<Link
											href="/auth/register"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											Sign In
										</Link>
									</Button>

									<button
										aria-label="phone"
										className="mt-2 grid h-10 w-full place-items-center rounded-full bg-white text-[#163d31] hover:bg-white/90"
										onClick={() => setIsMobileMenuOpen(false)}
									>
										<span className="flex items-center gap-2 font-semibold text-sm">
											<Phone className="h-4 w-4" />
											Contact
										</span>
									</button>
								</>
							)}
						</div>
					</nav>
				</div>
			)}
		</header>
	);
}
