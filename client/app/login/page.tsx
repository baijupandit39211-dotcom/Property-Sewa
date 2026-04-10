"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

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
            await apiFetch<{ user: any }>("/auth/google", {
              method: "POST",
              body: JSON.stringify({ credential: resp.credential }),
            });

            router.push("/");
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
      await apiFetch<{ user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      router.push("/");
    } catch (err: any) {
      alert(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F0F4F2]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-28 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
          animate={{ x: [0, 28, -12, 0], y: [0, 18, -10, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#9fd7bc]/35 blur-3xl"
          animate={{ x: [0, -30, 10, 0], y: [0, 20, -16, 0], scale: [1, 0.94, 1.04, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

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
              href="/"
              className="rounded-full bg-white/10 px-6 py-2 text-[14px] font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg"
            >
              Back to Home
            </Link>

            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-2 text-[14px] font-semibold text-black shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Log In
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-[#1DFF91] px-6 py-2 text-[14px] font-extrabold text-[#062016] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(29,255,145,0.28)]"
            >
              Sign Up
            </Link>

            <button
              type="button"
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg"
              aria-label="Phone"
              title="Phone"
            >
              <Phone className="h-5 w-5 text-[#12392B]" />
            </button>
          </div>
        </div>
      </header>

      {/* Body (fit in one screen) */}
      <main className="relative z-10 mx-auto max-w-7xl px-6">
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
          <motion.div
            className="w-full max-w-[740px]"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <motion.h1
              className="text-[54px] font-extrabold leading-[1.05] tracking-tight text-[#0D1F18]"
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
                <label className="text-[16px] font-semibold text-[#0D1F18]">
                  Email
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] focus-within:-translate-y-0.5 focus-within:border-[#7cc8a5] focus-within:shadow-[0_18px_40px_rgba(18,57,43,0.10)]">
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
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] focus-within:-translate-y-0.5 focus-within:border-[#7cc8a5] focus-within:shadow-[0_18px_40px_rgba(18,57,43,0.10)]">
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
                    className="grid h-9 w-9 place-items-center rounded-full transition duration-300 hover:scale-105 hover:bg-black/5"
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
                  transition duration-300 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_24px_40px_rgba(29,255,145,0.20)]
                  disabled:cursor-not-allowed disabled:opacity-70
                "
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {/* Google (keep the actual GSI widget) */}
              <div className="rounded-[14px] bg-[#E9EFEA] p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-[15px] text-[#6B8D80]">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-[#18B57B]">
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
