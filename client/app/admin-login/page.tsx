"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // ✅ If already logged in as admin, redirect directly to admin dashboard
  useEffect(() => {
    // Check if adminToken exists by calling admin-specific endpoint
    apiFetch<{ user: { role: string } }>("/auth/admin/me")
      .then((res) => {
        const role = (res?.user?.role || "").toLowerCase();
        if (role === "admin" || role === "superadmin") {
          router.replace("/admin/overview");
        }
      })
      .catch(() => {
        // Admin not authenticated, stay on login page
      });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch<{ user: any }>("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const role = (data?.user?.role || "").toLowerCase();

      if (role !== "admin" && role !== "superadmin") {
        alert("Access denied. This account is not an admin.");
        return;
      }

      // ✅ Redirect to admin dashboard
      router.push("/admin/overview");
    } catch (err: any) {
      alert(err?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf7]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#2f5d46]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-extrabold text-white">
            PROPERTY SEWA
          </Link>

          <div className="text-sm font-semibold text-white/90">Admin Login</div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-emerald-200">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Admin Access
          </h1>
          <p className="mt-2 text-sm text-emerald-700">
            Login to access admin dashboard
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-6">
            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                type="email"
                required
                className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                required
                className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
              />
            </div>

            {/* Login Button */}
            <button
              disabled={loading}
              type="submit"
              className="h-14 w-full rounded-xl bg-emerald-900 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to Admin Dashboard"}
            </button>

            {/* Back to user login */}
            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-emerald-700 underline"
              >
                Back to User Login
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
