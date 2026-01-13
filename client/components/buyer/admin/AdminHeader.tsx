"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type MeResponse = {
  success: boolean;
  user: {
    name: string;
    email: string;
    role: string;
  };
};

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export default function AdminHeader() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh(); // ✅ re-check layouts
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#2f5d46] shadow">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link href="/admin/overview" className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-emerald-400" />
          <span className="text-lg font-extrabold tracking-wide text-white">
            PROPERTY SEWA
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-xl bg-white/10 px-3 py-2">
            <input
              placeholder="Search"
              className="w-56 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
            />
          </div>

          {user && (
            <>
              <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-bold text-emerald-950">
                {user.role.toUpperCase()}
              </span>

              <div className="text-sm font-semibold text-white">{user.name}</div>

              <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-900 text-sm font-bold text-white">
                {getInitials(user.name)}
              </div>

              <button
                onClick={logout}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
