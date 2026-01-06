"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface StoredUser {
	name?: string;
	role?: string;
}

const USER_KEY = "authUser";

export default function SuperAdminDashboardPage() {
	const [user, setUser] = useState<StoredUser | null>(null);

	const canonicalRole = (user?.role ?? "superadmin").toString().toLowerCase();

	useEffect(() => {
		try {
			const raw =
				typeof window !== "undefined"
					? window.localStorage.getItem(USER_KEY)
					: null;
			if (raw) {
				setUser(JSON.parse(raw) as StoredUser);
			}
		} catch {
			setUser(null);
		}
	}, []);

	return (
		<main className="space-y-8 p-6">
			<header className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-bold text-3xl text-[#0f251c] tracking-tight">
						SuperAdmin Dashboard
					</h1>
					<p className="mt-1 text-[#2a5c49]">
						Welcome {user?.name ?? "Guest"} ({canonicalRole || "superadmin"})
					</p>
				</div>
				<nav className="flex gap-3 text-sm">
					<Link
						href="/buyer-dashboard"
						className="text-[#16814C] hover:underline"
					>
						Buyer
					</Link>
					<Link
						href="/seller-dashboard"
						className="text-[#16814C] hover:underline"
					>
						Seller
					</Link>
					<Link href="/superadmin-dashboard" className="underline">
						SuperAdmin
					</Link>
				</nav>
			</header>

			<section className="grid gap-4 md:grid-cols-3">
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">Total users</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">1,248</p>
				</div>
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">Active listings</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">312</p>
				</div>
				<div className="rounded-xl border border-[#cfe7d6] bg-white p-4">
					<p className="font-medium text-[#2a5c49] text-sm">
						Pending approvals
					</p>
					<p className="mt-2 font-bold text-2xl text-[#0f251c]">18</p>
				</div>
			</section>

			<section className="rounded-xl border border-[#cfe7d6] bg-white p-4">
				<h2 className="font-semibold text-[#0f251c] text-lg">
					Static SuperAdmin panel
				</h2>
				<p className="mt-2 text-[#2a5c49] text-sm">
					This is a mock overview. When you are ready, connect it to your real
					Node/Express API and database.
				</p>
			</section>
		</main>
	);
}
