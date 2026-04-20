"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { Search } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

type MeResponse = {
  success: boolean;
  user: {
    name: string;
    email: string;
    role: string;
  };
};

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
      router.refresh();
    }
  };

  return (
    <header className="h-16 bg-[#2F6B4A] shadow-md">
      <div className="mx-auto flex h-full items-center justify-between px-6 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <div className="flex flex-col gap-[5px]">
              <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
              <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
              <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
            </div>
          </div>
          <span className="text-sm font-extrabold tracking-[0.18em]">
            PROPERTY SEWA
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 md:flex">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              placeholder="Search"
              className="w-[180px] bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <NotificationBell
            notificationsPageHref="/buyer/notifications"
            buttonClassName="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-700 ring-1 ring-white/30 transition hover:scale-[1.02]"
          />

          <Link
            href="/buyer/profile"
            className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-700 ring-1 ring-white/30 transition hover:scale-[1.02]"
            aria-label="Buyer profile"
          >
            <span className="text-sm font-extrabold">
              {user?.name?.slice(0, 1)?.toUpperCase() || "B"}
            </span>
          </Link>

          <button
            onClick={logout}
            className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-white/30 transition hover:scale-[1.02] lg:inline-flex"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
