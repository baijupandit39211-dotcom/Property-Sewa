"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { apiFetch } from "../lib/api";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");
  const [toast, setToast] = React.useState<ToastState>({ show: false, text: "" });
  const toastTimerRef = React.useRef<number | null>(null);

  const showToast = React.useCallback((text: string) => {
    setToast({ show: true, text });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 1400);
  }, []);

  React.useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      router.push("/login");
    }, 2500);
    return () => clearTimeout(timer);
  }, [done, router]);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      await apiFetch<{ ok: boolean; message?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setDone(true);
      setMsg("If an account exists for this email, we sent a reset link.");
      showToast("Reset link sent successfully");
    } catch (_err: any) {
      // Security best practice: don't reveal if email exists
      setDone(true);
      setMsg("If an account exists for this email, we sent a reset link.");
      showToast("Reset link sent successfully");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FCFA]">
      <Toast show={toast.show} text={toast.text} />

      <header
        className="sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        style={{
          background: "linear-gradient(90deg, #1F5B41 0%, #2D6A4E 55%, #5E7F70 100%)",
        }}
      >
        <div className="flex h-[68px] w-full items-center justify-between px-6 lg:px-[80px]">
          <Link
            href="/"
            className="inline-flex items-center gap-3 leading-none text-[16px] font-extrabold tracking-wide text-white"
          >
            <PropertySewaLogoMark className="h-[26px] w-[26px] shrink-0 translate-y-[0.5px]" />
            <span className="block translate-y-[0.5px]">PROPERTY SEWA</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-5 py-1.5 text-[13px] font-semibold text-white shadow-sm"
            >
              Back to Login
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-1.5 text-[13px] font-semibold text-black shadow-sm"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#13EC80] px-5 py-1.5 text-[13px] font-semibold text-[#0D1C12] shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6">
        <div
          className="grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"
          style={{ minHeight: "calc(100vh - 68px)" }}
        >
          <div className="w-full max-w-[640px]">
            <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-[#0D1C12] sm:text-[38px]">
              Forgot your password?
            </h1>
            <p className="mt-3 text-[16px] text-[#618975]">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-[16px] font-semibold text-[#0D1C12]">Email</label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#D1D5DB] bg-[#F7FCFA] px-4 shadow-[0_10px_22px_rgba(13,28,18,0.05)]">
                  <Mail className="h-5 w-5 text-[#316249]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    required
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1C12] outline-none placeholder:text-[#618975]"
                  />
                </div>
              </div>

              <button
                disabled={loading || done}
                type="submit"
                className="
                  inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px]
                  bg-[#316249]
                  text-[16px] font-semibold text-white
                  shadow-[0_16px_30px_rgba(49,98,73,0.18)]
                  transition hover:bg-[#2B5A3F]
                  disabled:cursor-not-allowed disabled:bg-[#316249] disabled:text-white disabled:opacity-85
                "
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Sending reset link...
                  </>
                ) : done ? (
                  "Sent"
                ) : (
                  "Send reset link"
                )}
              </button>

              {msg ? (
                <div className="rounded-[14px] border border-[#D1D5DB] bg-white p-4 text-[15px] text-[#0D1C12] shadow-sm">
                  {msg}
                  <div className="mt-2 text-[#618975]">Redirecting to login...</div>
                  <div className="mt-1 text-[#618975]">
                    Back to{" "}
                    <Link href="/login" className="font-semibold text-[#316249] hover:underline">
                      Login
                    </Link>
                  </div>
                </div>
              ) : null}
            </form>
          </div>

          <aside className="relative mx-auto hidden w-full max-w-[560px] md:block lg:ml-4">
            <div className="relative mx-auto aspect-[1.03/1] w-full max-w-[520px]">
              <Image
                src="/forgot-house.png"
                alt="House illustration"
                fill
                priority
                className="object-contain object-center drop-shadow-[0_24px_26px_rgba(13,28,18,0.14)]"
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
