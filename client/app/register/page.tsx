"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

// ✅ remove "admin" from selectable register roles
type Role = "buyer" | "seller" | "agent";

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s += 25;
  if (/[A-Z]/.test(pw)) s += 20;
  if (/[a-z]/.test(pw)) s += 15;
  if (/\d/.test(pw)) s += 20;
  if (/[^A-Za-z0-9]/.test(pw)) s += 20;
  return Math.min(100, s);
}

function routeByRole(role: string | undefined) {
  const r = (role || "").toLowerCase();

  // Admin goes to admin dashboard
  if (r === "admin" || r === "superadmin") return "/admin/overview";

  // Buyer goes to buyer dashboard
  if (r === "buyer") return "/buyer/buyer-dashboard";

  // Seller/Agent goes to seller dashboard
  if (r === "seller" || r === "agent") return "/seller/seller-dashboard";

  // If role is missing or invalid, redirect to login
  return "/login";
}

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = React.useState<Role>("buyer");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const score = passwordScore(password);
  const googleBtnRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    (async () => {
      await loadGoogleScript();

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          try {
            const data = await apiFetch<{ user: any }>("/auth/google", {
              method: "POST",
              body: JSON.stringify({ 
                credential: resp.credential,
                role, // Include selected role for Google signup
              }),
            });

            router.push(routeByRole(data?.user?.role));
          } catch (e: any) {
            alert(e?.message || "Google signup failed");
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 380,
        text: "signup_with",
      });
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return alert("Please agree to Terms & Conditions");

    setLoading(true);
    try {
      const data = await apiFetch<{ user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          password,
          role,
        }),
      });

      router.push(routeByRole(data?.user?.role));
    } catch (err: any) {
      alert(err?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf7]">
      <header className="bg-[#2f5d46]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-extrabold text-white">
            PROPERTY SEWA
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Log In
            </Link>
            <span className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950">
              Sign Up
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="mx-auto w-full max-w-xl">
            <h1 className="text-4xl font-extrabold text-slate-900">
              Create your account
            </h1>

            <div className="mt-8">
              <div className="text-sm font-semibold text-slate-700">
                Account Type
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {/* ✅ Buyer */}
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-semibold transition",
                    role === "buyer"
                      ? "bg-emerald-500 text-emerald-950"
                      : "bg-white text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  Buyer/Renter
                </button>

                {/* ✅ Seller/Agent */}
                <button
                  type="button"
                  onClick={() => setRole("seller")}
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-semibold transition",
                    role === "seller"
                      ? "bg-emerald-500 text-emerald-950"
                      : "bg-white text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  Seller/Agent
                </button>

                {/* ✅ Admin → go to admin login page */}
                <button
                  type="button"
                  onClick={() => router.push("/admin-login")}

                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                >
                  Admin
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  type="password"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Password Strength</span>
                  <span className="text-slate-600">{score}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-emerald-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-5 w-5 rounded border-emerald-300"
                />
                I agree to the Terms & Conditions and Privacy Policy
              </label>

              <button
                disabled={loading}
                type="submit"
                className="h-14 w-full rounded-xl bg-emerald-500 text-sm font-extrabold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>

              <div className="rounded-xl bg-slate-100 p-3">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-sm text-emerald-700">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold underline">
                  Login
                </Link>
              </p>
            </form>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
              <Image
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
                alt="House"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
