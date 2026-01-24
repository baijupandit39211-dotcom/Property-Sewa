"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!token) {
      setMsg("Reset token is missing. Please request a new reset link.");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ ok: boolean; message?: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setMsg("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 900);
    } catch (err: any) {
      setMsg(err?.message || "Reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F2]">
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
        <div className="grid items-center py-10" style={{ minHeight: "calc(100vh - 84px)" }}>
          <div className="w-full max-w-[640px]">
            <h1 className="text-[46px] font-extrabold leading-[1.05] tracking-tight text-[#0D1F18]">
              Reset password
            </h1>
            <p className="mt-3 text-[16px] text-[#6B8D80]">
              Choose a new password for your account.
            </p>

            {!token ? (
              <div className="mt-6 rounded-[14px] border border-[#CFE3DA] bg-white p-4 text-[15px] text-[#0D1F18] shadow-sm">
                Reset token is missing/invalid.
                <div className="mt-2 text-[#6B8D80]">
                  Please{" "}
                  <Link href="/forgot-password" className="font-semibold text-[#18B57B] hover:underline">
                    request a new reset link
                  </Link>
                  .
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="text-[16px] font-semibold text-[#0D1F18]">
                    New password
                  </label>
                  <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <Lock className="h-5 w-5 text-[#0F5E49]" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
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
                  <p className="mt-2 text-[13px] text-[#6B8D80]">
                    Must be at least 8 characters.
                  </p>
                </div>

                <div>
                  <label className="text-[16px] font-semibold text-[#0D1F18]">
                    Confirm password
                  </label>
                  <div className="mt-2 flex h-[58px] items-center gap-3 rounded-[12px] border border-[#CFE3DA] bg-[#F3FBF7] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <Lock className="h-5 w-5 text-[#0F5E49]" />
                    <input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Confirm password"
                      type={showPw ? "text" : "password"}
                      className="h-full w-full bg-transparent text-[16px] text-[#0D1F18] outline-none placeholder:text-[#7AA694]"
                    />
                  </div>
                </div>

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
                  {loading ? "Updating..." : "Update password"}
                </button>

                {msg ? (
                  <div className="rounded-[14px] border border-[#CFE3DA] bg-white p-4 text-[15px] text-[#0D1F18] shadow-sm">
                    {msg}
                  </div>
                ) : null}

                <p className="text-center text-[15px] text-[#6B8D80]">
                  Back to{" "}
                  <Link href="/login" className="font-semibold text-[#18B57B] hover:underline">
                    Login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
