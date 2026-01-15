"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { Bell, Search } from "lucide-react";

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

export default function BuyerHeader() {
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
      router.refresh(); // ✅ keep exactly
    }
  };

  return (
    <header className="sticky top-0 z-50 h-[76px] bg-[#2D5A47]">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="block h-2 w-6 rounded-full bg-[#1DBF85]" />
            <span className="block h-2 w-6 rounded-full bg-[#1DBF85] opacity-80" />
            <span className="block h-2 w-6 rounded-full bg-[#1DBF85] opacity-60" />
          </div>
          <div className="text-lg font-extrabold tracking-[0.10em] text-white">
            PROPERTY SEWA
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search (UI only) */}
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 transition focus-within:bg-white/12">
            <Search className="h-4 w-4 text-white" />
            <input
              placeholder="Search"
              className="w-[240px] bg-transparent text-sm text-white outline-none placeholder:text-white/70"
            />
          </div>

          {/* Bell */}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 transition hover:-translate-y-[1px] hover:bg-white/12 active:translate-y-0"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-white" />
          </button>

          {/* User chip (same data, UI only) */}
          {user && (
            <>
              <span className="hidden sm:inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                {user.role.toUpperCase()}
              </span>

              <div className="hidden md:block text-sm font-semibold text-white/90">
                {user.name}
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/15">
                {getInitials(user.name)}
              </div>

              <button
                onClick={logout}
                className="ml-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B1F18] transition hover:-translate-y-[1px] hover:bg-white/90 active:translate-y-0"
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
