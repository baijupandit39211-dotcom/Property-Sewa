"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { apiFetch } from "../lib/api";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    // Prevent adding the script multiple times
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google script failed to load"))
      );
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google script failed to load"));
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

// ✅ remove "admin" from selectable register roles
type Role = "buyer" | "seller" | "agent";
type ToastState = { show: boolean; text: string };

function Toast({ show, text }: ToastState) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

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
  const [googleBtnWidth, setGoogleBtnWidth] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<ToastState>({ show: false, text: "" });

  const score = passwordScore(password);
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
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled) return;

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId || !googleBtnRef.current) return;
        if (!googleBtnWidth) return;

        // ✅ Clear container to avoid duplicate Google button
        googleBtnRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            try {
              const data = await apiFetch<{ user: any }>("/auth/google", {
                method: "POST",
                body: JSON.stringify({
                  credential: resp.credential,
                  role, // ✅ always latest selected role
                }),
              });

              showToast("Account created successfully");
              window.setTimeout(() => {
                router.push(routeByRole(data?.user?.role));
              }, 500);
            } catch (e: any) {
              alert(e?.message || "Google signup failed");
            }
          },
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnWidth,
          text: "signup_with",
        });
      } catch (e) {
        // optional: show a message if Google script fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, role, googleBtnWidth, showToast]); // ✅ IMPORTANT: include role

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

      showToast("Account created successfully");
      window.setTimeout(() => {
        router.push(routeByRole(data?.user?.role));
      }, 500);
    } catch (err: any) {
      alert(err?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4fbf7]">
      <Toast show={toast.show} text={toast.text} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[-6rem] top-24 h-80 w-80 rounded-full bg-emerald-200/45 blur-3xl"
          animate={{ x: [0, 26, -14, 0], y: [0, 24, -8, 0], scale: [1, 1.06, 0.96, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-[-5rem] h-96 w-96 rounded-full bg-[#bde7d0]/35 blur-3xl"
          animate={{ x: [0, -34, 12, 0], y: [0, -18, 16, 0], scale: [1, 0.94, 1.05, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="bg-[#2f5d46]">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-[80px]">
          <Link href="/" className="flex items-center gap-4 text-lg font-extrabold text-white">
            <PropertySewaLogoMark className="h-[31px] w-[31px] shrink-0" />
            <span>PROPERTY SEWA</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg lg:inline-flex"
            >
              Back to Home
            </Link>

            <Link
              href="/login"
              className="hidden rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg lg:inline-flex"
            >
              Log In
            </Link>
            <span className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-950">
              Sign Up
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            className="mx-auto w-full max-w-xl"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <motion.h1
              className="text-4xl font-extrabold text-slate-900"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.04}
            >
              Create your account
            </motion.h1>

            <motion.div
              className="mt-8"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.1}
            >
              <div className="text-sm font-semibold text-slate-700">
                Account Type
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {/* ✅ Buyer */}
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5",
                    role === "buyer"
                      ? "bg-emerald-500 text-emerald-950 shadow-[0_16px_30px_rgba(16,185,129,0.18)]"
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
                    "rounded-xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5",
                    role === "seller"
                      ? "bg-emerald-500 text-emerald-950 shadow-[0_16px_30px_rgba(16,185,129,0.18)]"
                      : "bg-white text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  Seller/Agent
                </button>

                {/* ✅ Admin → go to admin login page */}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-emerald-200 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  Admin
                </button>
              </div>
            </motion.div>

            <motion.form
              onSubmit={onSubmit}
              className="mt-8 space-y-6"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.16}
            >
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none transition duration-300 placeholder:text-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
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
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none transition duration-300 placeholder:text-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
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
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none transition duration-300 placeholder:text-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
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
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none transition duration-300 placeholder:text-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
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
                  className="mt-2 h-14 w-full rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none transition duration-300 placeholder:text-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Password Strength</span>
                  <span className="text-slate-600">{score}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-emerald-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
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
                className="h-14 w-full rounded-xl bg-emerald-500 text-sm font-extrabold text-emerald-950 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_22px_38px_rgba(16,185,129,0.20)] disabled:opacity-60"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>

              <div className="rounded-xl bg-slate-100 p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)]">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-center text-sm text-emerald-700">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold underline">
                  Login
                </Link>
              </p>
            </motion.form>
          </motion.div>

          <motion.div
            className="relative mx-auto hidden w-full max-w-xl md:block"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.18 }}
          >
            <motion.div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl"
              whileHover={{ y: -8, rotate: 1, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
            >
              <Image
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
                alt="House"
                fill
                className="object-cover transition duration-700"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.08),transparent_40%,rgba(255,255,255,0.12))]" />
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

