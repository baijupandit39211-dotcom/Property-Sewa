"use client";

import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { apiFetch } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

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
    } catch (err: any) {
      // Security best practice: don't reveal if email exists
      setDone(true);
      setMsg("If an account exists for this email, we sent a reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F2]">
      {/* Simple top bar (same vibe) */}
      <header
        className="sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        style={{
          background:
            "linear-gradient(90deg, #012B21 0%, #1E4739 50%, #5B786A 100%)",
        }}
      >
        <div className="mx-auto flex h-[84px] max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-[18px] font-extrabold tracking-wide text-white">
            PROPERTY SEWA
          </Link>

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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6">
        <div
          className="grid items-center py-10"
          style={{ minHeight: "calc(100vh - 84px)" }}
        >
          <div className="w-full max-w-[640px]">
            <h1 className="text-[46px] font-extrabold leading-[1.05] tracking-tight text-[#0D1F18]">
              Forgot your password?
            </h1>
            <p className="mt-3 text-[16px] text-[#6B8D80]">
              Enter your email and we’ll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-[16px] font-semibold text-[#0D1F18]">
                  Email
                </label>
                <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                  <Mail className="h-5 w-5 text-[#0F5E49]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    required
                    className="h-full w-full bg-transparent text-[16px] text-[#0D1F18] outline-none placeholder:text-[#7AA694]"
                  />
                </div>
              </div>

              <button
                disabled={loading || done}
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
                {loading ? "Sending..." : done ? "Sent" : "Send reset link"}
              </button>

              {msg ? (
                <div className="rounded-[14px] border border-[#CFE3DA] bg-white p-4 text-[15px] text-[#0D1F18] shadow-sm">
                  {msg}
                  <div className="mt-2 text-[#6B8D80]">
                    Back to{" "}
                    <Link href="/login" className="font-semibold text-[#18B57B] hover:underline">
                      Login
                    </Link>
                  </div>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
