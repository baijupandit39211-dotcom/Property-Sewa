"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { Mail, Lock, Eye, EyeOff, Phone, Menu } from "lucide-react";

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

  // Admin goes to admin dashboard
  if (r === "admin" || r === "superadmin") return "/admin/overview";

  // Buyer goes to buyer dashboard
  if (r === "buyer") return "/buyer/buyer-dashboard";

  // Seller/Agent goes to seller dashboard
  if (r === "seller" || r === "agent") return "/seller/seller-dashboard";

  // If role is missing or invalid, redirect to login
  return "/login";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);

  const googleBtnRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    (async () => {
      await loadGoogleScript();

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !googleBtnRef.current) return;

      // ✅ Force English text (prevents Nepali label)
      // Must be set BEFORE initialize/renderButton.
      // (Google uses this to decide UI language.)
      document.documentElement.lang = "en";
      try {
        window.google?.accounts?.id?.setLanguage?.("en");
      } catch {
        // ignore if not available
      }

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

      // Clear old button (avoid duplicate renders during HMR)
      googleBtnRef.current.innerHTML = "";

      // ✅ Keep Google widget, but make it compact + English label
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 380,
        text: "signin_with",
        locale: "en", // if supported
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
    <div className="min-h-screen bg-[#F0F4F2]">
      {/* Header (smaller height, exact gradient vibe) */}
      <header
        className="sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        style={{
          background:
            "linear-gradient(90deg, #012B21 0%, #1E4739 50%, #5B786A 100%)",
        }}
      >
        <div className="mx-auto flex h-[84px] max-w-7xl items-center justify-between px-6">
          {/* Left: menu icon block + text */}
          <div className="flex items-center gap-4">
            <div className="grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              <Menu className="h-5 w-5 text-[#1DFF91]" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-[5px]">
                <span className="block h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
                <span className="block h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
                <span className="block h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
              </div>

              <Link
                href="/"
                className="text-[18px] font-extrabold tracking-wide text-white"
              >
                PROPERTY SEWA
              </Link>
            </div>
          </div>

          {/* Center links */}
          <nav className="hidden items-center gap-10 text-[14px] font-medium text-white/90 md:flex">
            <Link href="/properties?type=sale" className="hover:text-white transition">
              For Sale
            </Link>
            <Link href="/properties?type=rent" className="hover:text-white/95 transition">
              For Rent
            </Link>
            <Link href="/agents" className="hover:text-white/95 transition">
              Agents
            </Link>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-2 text-[14px] font-semibold text-black shadow-sm"
            >
              Log In
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-[#1DFF91] px-6 py-2 text-[14px] font-extrabold text-[#062016] shadow-sm"
            >
              Sign Up
            </Link>

            <button
              type="button"
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white shadow-sm"
              aria-label="Phone"
              title="Phone"
            >
              <Phone className="h-5 w-5 text-[#12392B]" />
            </button>
          </div>
        </div>
      </header>

      {/* Body (fit in one screen) */}
      <main className="mx-auto max-w-7xl px-6">
        <div
          className="
            grid items-center gap-10
            py-10
            md:grid-cols-2
          "
          style={{
            // keep page compact to avoid scroll
            minHeight: "calc(100vh - 84px)",
          }}
        >
          {/* Left form */}
          <div className="w-full max-w-[740px]">
            <h1 className="text-[54px] font-extrabold leading-[1.05] tracking-tight text-[#0D1F18]">
              Welcome Back!
            </h1>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              {/* Email */}
              <div>
                <label className="text-[16px] font-semibold text-[#0D1F18]">
                  Email
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                  <Mail className="h-5 w-5 text-[#0F5E49]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1F18] outline-none placeholder:text-[#7AA694]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[16px] font-semibold text-[#0D1F18]">
                  Password
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                  <Lock className="h-5 w-5 text-[#0F5E49]" />

                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPw ? "text" : "password"}
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1F18] outline-none placeholder:text-[#7AA694]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 transition"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    title={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="h-5 w-5 text-[#0F5E49]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[#0F5E49]" />
                    )}
                  </button>
                </div>

                <div className="mt-3">
                  <Link
  href="/forgot-password"
  className="text-[15px] font-medium text-[#18B57B] hover:underline"
>
  Forgot password?
</Link>

                </div>
              </div>

              {/* Login button */}
              <button
                disabled={loading}
                type="submit"
                className="
                  h-[64px] w-full rounded-[14px]
                  bg-[#1DFF91]
                  text-[18px] font-extrabold text-[#062016]
                  shadow-[0_18px_35px_rgba(0,0,0,0.10)]
                  hover:brightness-95 transition
                  disabled:cursor-not-allowed disabled:opacity-70
                "
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {/* Google (keep the actual GSI widget) */}
              <div className="rounded-[14px] bg-[#E9EFEA] p-4">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-[15px] text-[#6B8D80]">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-[#18B57B]">
                  Sign Up
                </Link>
              </p>
            </form>
          </div>

          {/* Right image (smaller + centered like figma) */}
          <div className="relative mx-auto hidden w-full md:block">
            <div className="relative mx-auto aspect-[1.05/1] w-full max-w-[520px]">
              <Image
                src="/login-house.png"
                alt="House"
                fill
                priority
                className="object-contain drop-shadow-[0_26px_26px_rgba(0,0,0,0.14)]"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
