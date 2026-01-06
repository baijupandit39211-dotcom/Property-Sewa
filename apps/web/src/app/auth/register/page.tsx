"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/use-auth";

type AccountType = "Buyer/Renter" | "Seller/Agent" | "Admin";

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function getPasswordStrength(pw: string) {
	let score = 0;
	if (pw.length >= 6) score += 20;
	if (pw.length >= 10) score += 20;
	if (/[A-Z]/.test(pw)) score += 15;
	if (/[0-9]/.test(pw)) score += 15;
	if (/[^A-Za-z0-9]/.test(pw)) score += 20;
	if (pw.length >= 14) score += 10;
	return clamp(score, 0, 100);
}

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

const mapAccountTypeToRole = (
	type: AccountType,
): "buyer" | "seller" | "admin" => {
	if (type === "Seller/Agent") return "seller";
	if (type === "Admin") return "admin";
	return "buyer";
};

const getDashboardPathForRole = (role: string | undefined | null): string => {
	const r = role?.toString().toLowerCase() ?? "";
	if (r === "superadmin" || r === "admin") return "/superadmin-dashboard";
	if (r === "seller" || r === "agent") return "/seller-dashboard";
	return "/buyer-dashboard";
};

export default function RegisterPage() {
	const router = useRouter();

	const [accountType, setAccountType] = useState<AccountType>("Buyer/Renter");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [agree, setAgree] = useState(false);

	// ✅ Added: isAuthenticated, user, login (optional)
	const {
		register,
		googleLogin,
		loading,
		error,
		isAuthenticated,
		user,
		login,
	} = useAuth();

	const strength = useMemo(() => getPasswordStrength(password), [password]);

	// ✅ Auto redirect when user becomes authenticated (Google login will trigger this)
	useEffect(() => {
		if (isAuthenticated && user) {
			router.replace(getDashboardPathForRole((user as any).role));
		}
	}, [isAuthenticated, user, router]);

	// Google official button container
	const googleBtnRef = useRef<HTMLDivElement | null>(null);
	const googleRenderedRef = useRef(false);

	useEffect(() => {
		const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
		if (!clientId) return;

		const interval = setInterval(() => {
			const g = (window as any).google;
			if (!g?.accounts?.id) return;
			if (!googleBtnRef.current) return;
			if (googleRenderedRef.current) return;

			googleRenderedRef.current = true;

			g.accounts.id.initialize({
				client_id: clientId,
				callback: async (resp: any) => {
					const ok = await googleLogin(resp.credential);
					// ✅ DO NOT router.push("/") — use useEffect redirect instead
					if (!ok) return;
				},
			});

			g.accounts.id.renderButton(googleBtnRef.current, {
				theme: "outline",
				size: "large",
				text: "signup_with",
				shape: "rectangular",
				width: 400,
				logo_alignment: "left",
			});

			clearInterval(interval);
		}, 200);

		return () => clearInterval(interval);
	}, [googleLogin]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const role = mapAccountTypeToRole(accountType);

		const ok = await register({
			name,
			email,
			password,
			address: "",
			phone,
			role,
		});

		if (!ok) return;

		// ✅ Option 1 (recommended for now): go to login page
		// router.push("/auth/login")

		// ✅ Option 2 (better UX): auto-login and go to dashboard immediately
		await login(email, password);
		// after login, your login page redirect logic isn't needed because
		// the useEffect above will route based on role once user is set
	};

	return (
		<div className="flex min-h-screen flex-col bg-[#f4fbf6]">
			<Navbar />

			<main className="flex flex-1 items-center justify-center px-4 py-16 md:px-12 lg:px-24">
				<div className="w-full max-w-7xl">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						{/* LEFT: Form */}
						<div className="mx-auto w-full max-w-md lg:mx-0">
							<h1 className="mb-8 text-center font-bold text-3xl text-[#0f251c] tracking-tight lg:text-left lg:text-4xl">
								Create your account
							</h1>

							<form onSubmit={handleSubmit} className="space-y-5">
								{/* Account Type */}
								<div>
									<p className="mb-3 font-semibold text-[#0f251c] text-sm">
										Account Type
									</p>
									<div className="flex flex-wrap gap-3">
										{(
											["Buyer/Renter", "Seller/Agent", "Admin"] as AccountType[]
										).map((t) => {
											const active = accountType === t;
											return (
												<button
													key={t}
													type="button"
													onClick={() => setAccountType(t)}
													className={cn(
														"rounded-xl border px-4 py-2 font-semibold text-sm transition-all duration-200",
														active
															? "border-[#13EC80] bg-white text-black shadow-md ring-1 ring-[#13EC80]"
															: "border-[#cfe7d6] bg-white/60 text-[#2a5c49] hover:border-[#13EC80] hover:bg-white",
													)}
												>
													{t}
												</button>
											);
										})}
									</div>
								</div>

								{/* Name */}
								<div className="space-y-1.5">
									<Label htmlFor="name" className="text-[#0f251c]">
										Name
									</Label>
									<Input
										id="name"
										type="text"
										placeholder="Enter your name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
										className="h-11 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus:border-[#13EC80] focus-visible:ring-1 focus-visible:ring-[#13EC80]"
									/>
								</div>

								{/* Email */}
								<div className="space-y-1.5">
									<Label htmlFor="email" className="text-[#0f251c]">
										Email
									</Label>
									<Input
										id="email"
										type="email"
										placeholder="Enter your email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										className="h-11 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus:border-[#13EC80] focus-visible:ring-1 focus-visible:ring-[#13EC80]"
									/>
								</div>

								{/* Phone */}
								<div className="space-y-1.5">
									<Label htmlFor="phone" className="text-[#0f251c]">
										Phone
									</Label>
									<Input
										id="phone"
										type="tel"
										placeholder="Enter your phone number"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										className="h-11 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus:border-[#13EC80] focus-visible:ring-1 focus-visible:ring-[#13EC80]"
									/>
								</div>

								{/* Password */}
								<div className="space-y-1.5">
									<Label htmlFor="password" className="text-[#0f251c]">
										Password
									</Label>
									<Input
										id="password"
										type="password"
										placeholder="Enter your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="h-11 rounded-xl border-[#cfe7d6] bg-white/50 placeholder:text-gray-400 focus:border-[#13EC80] focus-visible:ring-1 focus-visible:ring-[#13EC80]"
									/>
								</div>

								{/* Password Strength */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="font-medium text-[#0f251c] text-sm">
											Password Strength
										</span>
										<span className="font-bold text-[#0f251c] text-sm">
											{strength}
										</span>
									</div>

									<div className="h-2 w-full overflow-hidden rounded-full bg-[#d6eadc]">
										<div
											className="h-full rounded-full bg-[#13EC80] transition-all duration-300"
											style={{ width: `${strength}%` }}
										/>
									</div>
								</div>

								{/* Terms */}
								<div className="flex items-start gap-3 pt-2">
									<input
										type="checkbox"
										id="terms"
										className="mt-1 h-4 w-4 rounded border-[#13EC80] text-[#13EC80] focus:ring-[#13EC80]"
										checked={agree}
										onChange={(e) => setAgree(e.target.checked)}
										required
										style={{ accentColor: "#13EC80" }}
									/>
									<label htmlFor="terms" className="text-gray-600 text-sm">
										I agree to the{" "}
										<Link
											href="/terms"
											className="font-medium text-[#16814C] hover:underline"
										>
											Terms & Conditions
										</Link>{" "}
										and{" "}
										<Link
											href="/privacy"
											className="font-medium text-[#16814C] hover:underline"
										>
											Privacy Policy
										</Link>
									</label>
								</div>

								{/* Submit */}
								<Button
									type="submit"
									disabled={loading || !agree}
									className="h-12 w-full rounded-xl bg-[#13EC80] font-bold text-base text-black shadow-sm transition-all hover:bg-[#10c96e]"
								>
									{loading ? "Creating account..." : "Sign Up"}
								</Button>

								<div className="relative my-4">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-gray-200 border-t" />
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span className="bg-[#f4fbf6] px-2 text-gray-500">
											Or sign up with
										</span>
									</div>
								</div>

								{/* REAL GOOGLE SIGN-UP BUTTON */}
								<div className="flex w-full justify-center">
									<div
										ref={googleBtnRef}
										className="min-h-[44px] min-w-[200px]"
									/>
								</div>

								{error ? (
									<p className="mt-2 text-center text-red-600 text-sm">
										{error}
									</p>
								) : null}

								<p className="mt-4 text-center text-gray-600 text-sm">
									Already have an account?{" "}
									<Link
										href="/auth/login"
										className="font-bold text-[#16814C] transition-colors hover:text-[#13EC80]"
									>
										Login
									</Link>
								</p>
							</form>
						</div>

						{/* RIGHT: Illustration */}
						<div className="hidden items-center lg:flex lg:justify-end">
							<div className="relative h-[650px] w-full max-w-[650px]">
								<Image
									src="/images/auth-house.png"
									alt="Modern 3D House Illustration"
									fill
									className="object-contain drop-shadow-2xl"
									priority
									sizes="(max-width: 768px) 100vw, 50vw"
								/>
							</div>
						</div>
					</div>
				</div>
			</main>

			<Footer />
		</div>
	);
}
