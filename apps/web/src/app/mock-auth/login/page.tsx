"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MockRole } from "@/app/api/auth/register/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const USER_KEY = "mockUser";
const TOKEN_KEY = "mockToken";
const ROLE_KEY = "mockRole";

const roleToDashboard: Record<MockRole, string> = {
	buyer: "/buyer-dashboard",
	seller: "/seller-dashboard",
	superadmin: "/superadmin-dashboard",
};

export default function MockLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<MockRole>("buyer");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password, role }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.message || "Login failed");
			}

			window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
			window.localStorage.setItem(TOKEN_KEY, data.token);
			window.localStorage.setItem(ROLE_KEY, data.user.role);

			router.push(roleToDashboard[data.user.role as MockRole]);
		} catch (err: any) {
			setError(err?.message ?? "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-[#f4fbf6] px-4">
			<div className="w-full max-w-md space-y-6 rounded-2xl border border-[#cfe7d6] bg-white p-6 shadow-sm">
				<header className="space-y-1">
					<h1 className="font-semibold text-2xl text-[#0f251c]">
						Mock Role Login
					</h1>
					<p className="text-[#2a5c49] text-sm">
						Choose a role and continue to its dashboard. This is frontend-only
						mock auth.
					</p>
				</header>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="role">Role</Label>
						<select
							id="role"
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							value={role}
							onChange={(e) => setRole(e.target.value as MockRole)}
						>
							<option value="buyer">Buyer</option>
							<option value="seller">Seller</option>
							<option value="superadmin">SuperAdmin</option>
						</select>
					</div>

					{error ? <p className="text-red-600 text-sm">{error}</p> : null}

					<Button
						type="submit"
						className="w-full rounded-xl bg-[#13EC80] font-semibold text-black hover:bg-[#10c96e]"
						disabled={loading}
					>
						{loading ? "Signing in..." : "Continue"}
					</Button>
				</form>

				<p className="text-[#2a5c49] text-xs">
					This flow uses <code>/api/auth/login</code> and stores a mock user,
					token, and role in <code>localStorage</code>.
				</p>
			</div>
		</main>
	);
}
