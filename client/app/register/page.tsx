"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
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

    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed to load")));
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

type Role = "buyer" | "seller" | "agent";
type ToastState = { show: boolean; text: string };
type FieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
};

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

function FormField({
  id,
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  autoComplete,
  rightSlot,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-[15px] font-semibold text-[#0D1C12]">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          className="h-[52px] w-full rounded-[10px] border border-[#D1D5DB] bg-[#F7FCFA] px-4 pr-12 text-[16px] text-[#0D1C12] outline-none transition duration-300 placeholder:text-[#618975] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(13,28,18,0.06)] focus:border-[#316249] focus:ring-4 focus:ring-[#CFE8D6]"
        />
        {rightSlot ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div> : null}
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
  if (r === "admin" || r === "superadmin") return "/admin/overview";
  if (r === "buyer") return "/buyer/buyer-dashboard";
  if (r === "seller" || r === "agent") return "/seller/seller-dashboard";
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
  const [showPassword, setShowPassword] = React.useState(false);
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

        googleBtnRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            try {
              const data = await apiFetch<{ user: any }>("/auth/google", {
                method: "POST",
                body: JSON.stringify({
                  credential: resp.credential,
                  role,
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
      } catch {
        // ignore google script failures for UI continuity
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, role, googleBtnWidth, showToast]);

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
    <div className="relative min-h-screen overflow-hidden bg-[#F7FCFA]">
      <Toast show={toast.show} text={toast.text} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[-6rem] top-24 h-80 w-80 rounded-full bg-[#CFE8D6]/40 blur-3xl"
          animate={{ x: [0, 26, -14, 0], y: [0, 24, -8, 0], scale: [1, 1.06, 0.96, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-[-5rem] h-96 w-96 rounded-full bg-[#B9E3C5]/40 blur-3xl"
          animate={{ x: [0, -34, 12, 0], y: [0, -18, 16, 0], scale: [1, 0.94, 1.05, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header
        style={{ background: "linear-gradient(90deg, #1F5B41 0%, #2D6A4E 55%, #5E7F70 100%)" }}
      >
        <div className="flex h-[72px] w-full items-center justify-between px-4 sm:px-6 lg:px-[80px]">
          <Link href="/" className="flex items-center gap-3 text-lg font-extrabold text-white">
            <PropertySewaLogoMark className="h-[31px] w-[31px] shrink-0" />
            <span>PROPERTY SEWA</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-full bg-white/10 px-5 py-1.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg lg:inline-flex"
            >
              Back to Home
            </Link>
            <Link
              href="/login"
              className="hidden rounded-full bg-white/10 px-5 py-1.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg lg:inline-flex"
            >
              Log In
            </Link>
            <span className="rounded-full bg-[#13EC80] px-5 py-1.5 text-sm font-medium text-[#102219]">
              Sign Up
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div
          className="grid items-center gap-8 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:gap-8"
          style={{ minHeight: "calc(100vh - 72px)" }}
        >
          <motion.section
            className="mx-auto w-full max-w-[540px]"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <motion.h1
              className="text-[32px] font-semibold leading-[1.12] text-[#0D1C12] sm:text-[38px]"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.04}
            >
              Create your account
            </motion.h1>

            <motion.div className="mt-5" initial="hidden" animate="show" variants={fadeUp} custom={0.1}>
              <div className="text-[16px] font-medium text-[#0D1C12]">Account Type</div>

              <div className="mt-3 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Account type">
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === "buyer"}
                  onClick={() => setRole("buyer")}
                  className={[
                    "rounded-[10px] border px-5 py-2.5 text-[17px] font-normal transition duration-300 hover:-translate-y-0.5",
                    role === "buyer"
                      ? "border-[#316249] bg-[#316249] text-white shadow-[0_12px_24px_rgba(49,98,73,0.22)]"
                      : "border-[#D1D5DB] bg-white text-[#2C3F35] hover:bg-[#EEF8EB]",
                  ].join(" ")}
                >
                  Buyer/Renter
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={role === "seller"}
                  onClick={() => setRole("seller")}
                  className={[
                    "rounded-[10px] border px-5 py-2.5 text-[17px] font-normal transition duration-300 hover:-translate-y-0.5",
                    role === "seller"
                      ? "border-[#316249] bg-[#316249] text-white shadow-[0_12px_24px_rgba(49,98,73,0.22)]"
                      : "border-[#D1D5DB] bg-white text-[#2C3F35] hover:bg-[#EEF8EB]",
                  ].join(" ")}
                >
                  Seller/Agent
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-[10px] border border-[#D1D5DB] bg-white px-5 py-2.5 text-[17px] font-normal text-[#2C3F35] transition duration-300 hover:-translate-y-0.5 hover:bg-[#EEF8EB]"
                >
                  Admin
                </button>
              </div>
            </motion.div>

            <motion.form
              onSubmit={onSubmit}
              className="mt-5 space-y-4"
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0.16}
            >
              <FormField
                id="register-name"
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Enter your name"
                autoComplete="name"
              />

              <FormField
                id="register-email"
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="Enter your email"
                type="email"
                autoComplete="email"
              />

              <FormField
                id="register-phone"
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="Enter your phone number"
                autoComplete="tel"
              />

              <FormField
                id="register-address"
                label="Address"
                value={address}
                onChange={setAddress}
                placeholder="Enter your address"
                autoComplete="street-address"
              />

              <FormField
                id="register-password"
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-controls="register-password"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="rounded-md p-1 text-[#102219] transition hover:bg-[#EEF8EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316249]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />

              <div>
                <div className="flex items-center justify-between text-[15px] font-semibold text-[#0D1C12]">
                  <span>Password Strength</span>
                  <span className="text-[15px] font-medium text-[#618975]">{score}</span>
                </div>
                <div className="mt-3 h-[8px] w-full rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-[8px] rounded-full bg-[#316249] transition-all duration-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              <label
                htmlFor="register-terms"
                className="flex cursor-pointer items-start gap-3 rounded-lg py-1 text-[16px] text-[#2C3F35]"
              >
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-[#D1D5DB] bg-white text-[#316249] focus:ring-[#316249]"
                />
                I agree to the Terms & Conditions and Privacy Policy
              </label>

              <button
                disabled={loading}
                type="submit"
                className="h-[52px] w-full rounded-[10px] bg-[#316249] text-[16px] font-semibold leading-none text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#24472E] hover:shadow-[0_16px_28px_rgba(49,98,73,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#316249]/35 disabled:opacity-60"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </button>

              <div className="rounded-[12px] border border-[#D1D5DB] bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(13,28,18,0.05)]">
                <div ref={googleBtnRef} className="flex justify-center" />
              </div>

              <p className="text-left text-[14px] text-[#618975]">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-[#316249] hover:underline">
                  Login
                </Link>
              </p>
            </motion.form>
          </motion.section>

          <motion.aside
            className="relative mx-auto hidden w-full max-w-[560px] md:block lg:ml-2"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.18 }}
          >
            <motion.div
              className="relative mx-auto aspect-[1.02/1] w-full max-w-[510px] lg:max-w-[530px]"
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
            >
              <Image
                src="/house-3d.png"
                alt="Premium real estate illustration"
                fill
                className="object-contain object-center drop-shadow-[0_22px_24px_rgba(0,0,0,0.14)] transition duration-700"
                priority
              />
            </motion.div>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}
