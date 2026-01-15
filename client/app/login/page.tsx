"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { Eye, EyeOff, Mail, Lock, PhoneCall } from "lucide-react";

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
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const googleBtnRef = React.useRef<HTMLDivElement | null>(null);
  const googleWrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    (async () => {
      await loadGoogleScript();

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          const data = await apiFetch<{ user: any }>("/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential: resp.credential }),
          });
          router.push(routeByRole(data?.user?.role));
        },
      });

      const w = googleWrapRef.current?.offsetWidth ?? 420;
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: Math.min(520, w),
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F2]">
      {/* NAVBAR — slightly smaller */}
      <header
        className="sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        style={{
          background:
            "linear-gradient(90deg, #012B21 0%, #1E4739 50%, #5B786A 100%)",
        }}
      >
        <div className="mx-auto flex h-[82px] max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="grid h-[44px] w-[44px] place-items-center rounded-[12px] bg-white/10">
              <div className="flex flex-col gap-[4px]">
                <span className="h-[5px] w-[16px] rounded-full bg-[#1DFF91]" />
                <span className="h-[5px] w-[16px] rounded-full bg-[#1DFF91]" />
                <span className="h-[5px] w-[16px] rounded-full bg-[#1DFF91]" />
              </div>
            </div>
            <span className="text-[18px] font-extrabold tracking-wide text-white">
              PROPERTY SEWA
            </span>
          </div>

          {/* Links */}
          <nav className="hidden items-center gap-10 text-[14px] font-medium text-white/90 md:flex">
            <Link href="#">For Sale</Link>
            <Link href="#">For Rent</Link>
            <Link href="#">Agents</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-2 text-[14px] font-semibold text-black"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#1DFF91] px-5 py-2 text-[14px] font-extrabold text-[#062016]"
            >
              Sign Up
            </Link>
            <button className="grid h-[40px] w-[40px] place-items-center rounded-full bg-white">
              <PhoneCall className="h-[18px] w-[18px] text-[#012B21]" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-6">
        <div className="min-h-[calc(100vh-82px)] grid items-center md:grid-cols-2 gap-10">
          {/* FORM */}
          <div className="max-w-[720px]">
            <h1 className="text-[44px] font-extrabold text-[#102219]">
              Welcome Back!
            </h1>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              {/* Email */}
              <div>
                <label className="font-semibold">Email</label>
                <div className="mt-2 flex h-[52px] items-center gap-3 rounded-[12px] bg-white px-4 shadow">
                  <Mail className="h-4 w-4 text-[#1E4739]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="font-semibold">Password</label>
                <div className="mt-2 flex h-[52px] items-center gap-3 rounded-[12px] bg-white px-4 shadow">
                  <Lock className="h-4 w-4 text-[#1E4739]" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Link
                  href="#"
                  className="mt-2 inline-block text-sm text-[#1DBF85]"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={loading}
                className="h-[58px] w-full rounded-[12px] bg-[#1DFF91] text-lg font-extrabold text-[#062016]"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {/* Google */}
              <div
                ref={googleWrapRef}
                className="rounded-[12px] bg-[#E8EFEA] p-4"
              >
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-sm text-[#6D8A7E]">
                Don’t have an account?{" "}
                <Link href="/register" className="font-bold text-[#1DBF85]">
                  Sign Up
                </Link>
              </p>
            </form>
          </div>

          {/* IMAGE */}
          <div className="hidden md:flex justify-center">
            <Image
              src="/login-house.png"
              alt="House"
              width={520}
              height={420}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </main>
    </div>
  );
}
