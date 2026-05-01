"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { useBuyerAuth } from "@/app/buyer/BuyerAuthContext";
import { Menu, Search, X } from "lucide-react";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), {
  ssr: false,
  loading: () => (
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-700 ring-1 ring-white/30" />
  ),
});

export default function BuyerHeader({
  mobileSidebarOpen,
  onToggleSidebar,
}: {
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const { user } = useBuyerAuth();

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 bg-[#316249] shadow-md">
      <div className="mx-auto flex h-full items-center justify-between px-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/15 lg:hidden"
            aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {mobileSidebarOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
          </button>
          <PropertySewaLogoMark className="h-[31px] w-[31px] shrink-0" />
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
