"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { logoutUser } from "@/app/lib/auth";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";

const NotificationBell = dynamic(() => import("@/components/notifications/NotificationBell"), {
  ssr: false,
  loading: () => (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30" />
  ),
});

export default function SellerHeader({
  mobileSidebarOpen,
  onToggleSidebar,
}: {
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutUser();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="flex h-14 items-center justify-between bg-[#316249] px-3 text-white shadow-md sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/15 lg:hidden"
          aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {mobileSidebarOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
        <PropertySewaLogoMark className="h-[27px] w-[27px] shrink-0" />
        <span className="text-[15px] font-bold tracking-[0.11em]">PROPERTY SEWA</span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell
          notificationsPageHref="/seller/notifications"
          buttonClassName="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30 transition hover:scale-[1.03]"
        />
        <Link
          href="/seller/profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30 transition hover:scale-[1.03]"
          aria-label="Seller profile"
        >
          <span className="text-sm font-bold">S</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-white/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </header>
  );
}
