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

function routeByRole(role: string | undefined) {
  const r = (role || "").toLowerCase();
  if (r === "buyer") return "/buyer/buyer-dashboard";
  if (r === "seller" || r === "agent") return "/dashboard";
  if (r === "admin" || r === "superadmin") return "/dashboard";
  return "/buyer/buyer-dashboard";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

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
              body: JSON.stringify({ credential: resp.credential }),
            });

            router.push(routeByRole(data?.user?.role));
          } catch (e: any) {
            alert(e?.message || "Google login failed");
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 380,
        text: "signin_with",
      });
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch<{ user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      router.push(routeByRole(data?.user?.role));
    } catch (err: any) {
      alert(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf7]">
      <header className="border-b border-white/10 bg-[#2f5d46]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-extrabold text-white">
            PROPERTY SEWA
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="mx-auto w-full max-w-xl">
            <h1 className="text-4xl font-extrabold text-slate-900">
              Welcome Back!
            </h1>

            <form onSubmit={onSubmit} className="mt-10 space-y-8">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
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
                  placeholder="Password"
                  type="password"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
                <div className="mt-3">
                  <Link
                    href="#"
                    className="text-sm text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="h-14 w-full rounded-xl bg-emerald-500 text-sm font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="rounded-xl bg-slate-100 p-3">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-sm text-emerald-700">
                Don’t have an account?{" "}
                <Link href="/register" className="font-semibold underline">
                  Sign Up
                </Link>
              </p>
            </form>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
              <Image
                src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80"
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
