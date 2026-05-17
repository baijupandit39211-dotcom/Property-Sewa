"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { apiFetch } from "../lib/api";
import { getDashboardPath } from "../lib/auth";
import { Mail, Lock, Eye, EyeOff, Phone, Menu } from "lucide-react";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

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

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  }),
};

type ToastState = { show: boolean; text: string };

function Toast({ show, text }: ToastState) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-[#316249]/95 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-[#D1D5DB]/50">
        {text}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const [googleBtnWidth, setGoogleBtnWidth] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<ToastState>({ show: false, text: "" });

  const googleBtnRef = React.useRef<HTMLDivElement | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);

  const showToast = React.useCallback((text: string) => {
    setToast({ show: true, text });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 1300);
  }, []);

  React.useEffect(() => {
    const computeWidth = () => {
      const safe = Math.min(380, Math.max(240, window.innerWidth - 48));
      setGoogleBtnWidth(safe);
    };

    computeWidth();
    window.addEventListener("resize", computeWidth);
    return () => window.removeEventListener("resize", computeWidth);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      await loadGoogleScript();

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !googleBtnRef.current) return;
      if (!googleBtnWidth) return;

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
            await apiFetch<{ user: any }>("/auth/google", {
              method: "POST",
              body: JSON.stringify({ credential: resp.credential }),
            });
            const me = await apiFetch<{ user?: { role?: string } }>("/auth/me");
            showToast("Login successful");
            window.setTimeout(() => {
              router.push(getDashboardPath(me?.user?.role));
            }, 500);
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
        width: googleBtnWidth,
        text: "signin_with",
        locale: "en", // if supported
      });
    })();
  }, [router, googleBtnWidth, showToast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch<{ user: { role?: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      showToast("Login successful");
      window.setTimeout(() => {
        router.push(getDashboardPath(data?.user?.role));
      }, 500);
    } catch (err: any) {
      alert(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7FCFA]">
      <Toast show={toast.show} text={toast.text} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-28 h-72 w-72 rounded-full bg-[#CFE8D6]/45 blur-3xl"
          animate={{ x: [0, 28, -12, 0], y: [0, 18, -10, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#B9E3C5]/35 blur-3xl"
          animate={{ x: [0, -30, 10, 0], y: [0, 20, -16, 0], scale: [1, 0.94, 1.04, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header (smaller height, exact gradient vibe) */}
      <header
        className="sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        style={{
          background:
            "linear-gradient(90deg, #1F5B41 0%, #2D6A4E 55%, #5E7F70 100%)",
        }}
      >
        <div className="flex h-[72px] w-full items-center justify-between px-4 sm:px-6 lg:px-[80px]">
          {/* Left: brand */}
          <div className="flex items-center gap-4">
            <Link prefetch={true} href="/" className="flex items-center gap-3">
              <PropertySewaLogoMark className="h-[31px] w-[31px] shrink-0" />
              <span className="text-[18px] font-extrabold tracking-wide text-white">
                PROPERTY SEWA
              </span>
            </Link>
          </div>

          {/* Center links */}
          <nav className="hidden flex-1 items-center justify-center gap-10 text-[14px] font-medium text-white/90 md:flex">
            <Link prefetch={true} href="/properties?type=sale" className="hover:text-white transition">
              For Sale
            </Link>
            <Link prefetch={true} href="/properties?type=rent" className="hover:text-white/95 transition">
              For Rent
            </Link>
            <Link prefetch={true} href="/agents" className="hover:text-white/95 transition">
              Agents
            </Link>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Link prefetch={true} href="/"
              className="hidden rounded-full bg-white/10 px-5 py-1.5 text-[14px] font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg lg:inline-flex"
            >
              Back to Home
            </Link>

            <Link prefetch={true} href="/register"
              className="hidden rounded-full bg-[#13EC80] px-5 py-1.5 text-[14px] font-semibold text-[#0D1C12] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#10DD78] hover:shadow-[0_18px_30px_rgba(19,236,128,0.24)] lg:inline-flex"
            >
              Sign Up
            </Link>

            <button
              type="button"
              className="grid h-[40px] w-[40px] place-items-center rounded-full bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg"
              aria-label="Phone"
              title="Phone"
            >
              <Phone className="h-5 w-5 text-[#316249]" />
            </button>
          </div>
        </div>
      </header>

      {/* Body (fit in one screen) */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="
            grid items-center gap-10
            py-10
            md:grid-cols-2
          "
          style={{
            // keep page compact to avoid scroll
            minHeight: "calc(100vh - 72px)",
          }}
        >
          {/* Left form */}
          <motion.div
            className="w-full max-w-[740px]"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <motion.h1
              className="text-[32px] font-semibold leading-[1.12] tracking-tight text-[#0D1C12] sm:text-[38px]"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.05}
            >
              Welcome Back!
            </motion.h1>

            <motion.form
              onSubmit={onSubmit}
              className="mt-8 space-y-5"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.12}
            >
              {/* Email */}
              <div>
                <label className="text-[16px] font-semibold text-[#0D1C12]">
                  Email
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#D1D5DB] bg-[#F7FCFA] px-4 shadow-[0_10px_22px_rgba(13,28,18,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(13,28,18,0.07)] focus-within:-translate-y-0.5 focus-within:border-[#316249] focus-within:shadow-[0_16px_34px_rgba(49,98,73,0.12)]">
                  <Mail className="h-5 w-5 text-[#316249]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1C12] outline-none placeholder:text-[#618975]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[16px] font-semibold text-[#0D1C12]">
                  Password
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#D1D5DB] bg-[#F7FCFA] px-4 shadow-[0_10px_22px_rgba(13,28,18,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(13,28,18,0.07)] focus-within:-translate-y-0.5 focus-within:border-[#316249] focus-within:shadow-[0_16px_34px_rgba(49,98,73,0.12)]">
                  <Lock className="h-5 w-5 text-[#316249]" />

                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPw ? "text" : "password"}
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1C12] outline-none placeholder:text-[#618975]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="grid h-9 w-9 place-items-center rounded-full transition duration-300 hover:scale-105 hover:bg-black/5"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    title={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="h-5 w-5 text-[#316249]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[#316249]" />
                    )}
                  </button>
                </div>

              </div>

              {/* Login button */}
              <button
                disabled={loading}
                type="submit"
                className="
                  h-[52px] w-full rounded-[10px]
                  bg-[#316249]
                  text-[16px] font-semibold text-white
                  shadow-[0_18px_35px_rgba(0,0,0,0.10)]
                  transition duration-300 hover:-translate-y-0.5 hover:bg-[#24472E] hover:shadow-[0_24px_40px_rgba(49,98,73,0.20)]
                  disabled:cursor-not-allowed disabled:opacity-70
                "
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="text-center">
                <Link prefetch={true} href="/forgot-password"
                  className="text-[15px] font-semibold text-[#316249] hover:text-[#24472E] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Google (keep the actual GSI widget) */}
              <div className="rounded-[14px] bg-[#EEF8EB] p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(13,28,18,0.06)]">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-[15px] text-[#618975]">
                Don&apos;t have an account?{" "}
                <Link prefetch={true} href="/register" className="font-semibold text-[#13EC80]">
                  Sign Up
                </Link>
              </p>
            </motion.form>
          </motion.div>

          {/* Right image (smaller + centered like figma) */}
          <motion.div
            className="relative mx-auto hidden w-full md:block"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.18 }}
          >
            <motion.div
              className="relative mx-auto aspect-[1.05/1] w-full max-w-[520px]"
              whileHover={{ y: -8, rotate: -1, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
            >
              <Image
                src="/login-house.png"
                alt="House"
                fill
                priority
                className="object-contain drop-shadow-[0_26px_26px_rgba(0,0,0,0.14)] transition duration-500"
              />
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
